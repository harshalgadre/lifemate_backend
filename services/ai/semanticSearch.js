/**
 * Semantic Search Chain
 * Feature 4: Semantic Job Search (RAG)
 *
 * Full RAG pipeline:
 * 1. Embed user query → vector
 * 2. MongoDB Atlas Vector Search → top-K relevant jobs
 * 3. LLM re-ranks + generates explanation for why each job matches
 *
 * MongoDB Atlas Vector Search index must be created in Atlas UI first.
 * See: /docs/genai_progress.md → Feature 4 for setup instructions.
 */

const mongoose = require('mongoose');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { getLLM } = require('./llmConfig');
const { embedText } = require('./embeddingConfig');
const { aiConfig } = require('../../config/ai');

/**
 * Run a MongoDB Atlas Vector Search against the jobs collection
 *
 * @param {number[]} queryVector - 384-dimensional query embedding
 * @param {number} limit - Max results to return
 * @param {Object} preFilter - Optional MongoDB $match filter (specialization, jobType, etc.)
 * @returns {Promise<Array>} Matched job documents with similarity scores
 */
const runVectorSearch = async (queryVector, limit = 10, preFilter = {}) => {
  const collection = mongoose.connection.collection('jobs');

  // Build the Atlas Vector Search aggregation pipeline
  // NOTE: index name must match what you created in Atlas UI
  const vectorSearchStage = {
    $vectorSearch: {
      index: process.env.MONGODB_VECTOR_INDEX_NAME || 'job_vector_index',
      path: 'embedding',
      queryVector,
      numCandidates: limit * 10, // Search wider, return narrower
      limit,
    },
  };

  // Add pre-filters if provided (narrow search before vector scoring)
  if (Object.keys(preFilter).length > 0) {
    vectorSearchStage.$vectorSearch.filter = preFilter;
  }

  const pipeline = [
    vectorSearchStage,
    {
      $project: {
        _id: 1,
        title: 1,
        organizationName: 1,
        location: 1,
        specialization: 1,
        jobType: 1,
        shift: 1,
        isRemote: 1,
        experienceRequired: 1,
        salary: 1,
        description: 1,
        requirements: 1,
        responsibilities: 1,
        benefits: 1,
        status: 1,
        postedAt: 1,
        isFeatured: 1,
        stats: 1,
        // Atlas Vector Search injects this score field
        score: { $meta: 'vectorSearchScore' },
      },
    },
    // Only return Active, non-expired jobs
    {
      $match: {
        status: 'Active',
      },
    },
  ];

  return collection.aggregate(pipeline).toArray();
};

/**
 * Fallback: MongoDB text search when Atlas Vector Search index is not yet set up
 * Uses the existing text index on title + description + organizationName
 *
 * @param {string} queryText - User's search query
 * @param {number} limit - Max results
 * @param {Object} extraFilter - Additional filters
 * @returns {Promise<Array>}
 */
const runTextSearchFallback = async (queryText, limit = 10, extraFilter = {}) => {
  const collection = mongoose.connection.collection('jobs');

  const pipeline = [
    {
      $match: {
        $text: { $search: queryText },
        status: 'Active',
        ...extraFilter,
      },
    },
    {
      $addFields: {
        score: { $meta: 'textScore' },
      },
    },
    { $sort: { score: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        title: 1,
        organizationName: 1,
        location: 1,
        specialization: 1,
        jobType: 1,
        shift: 1,
        isRemote: 1,
        experienceRequired: 1,
        salary: 1,
        description: 1,
        requirements: 1,
        responsibilities: 1,
        benefits: 1,
        status: 1,
        postedAt: 1,
        isFeatured: 1,
        stats: 1,
        score: 1,
      },
    },
  ];

  return collection.aggregate(pipeline).toArray();
};

/**
 * Format a job document into a concise summary for the LLM re-ranker
 * Escapes curly braces to prevent LangChain template injection errors
 * @param {Object} job
 * @param {number} idx - 1-based index
 * @returns {string}
 */
const formatJobSummaryForLLM = (job, idx) => {
  const loc = job.location
    ? [job.location.city, job.location.state].filter(Boolean).join(', ')
    : 'Location not specified';

  const exp = job.experienceRequired
    ? (job.experienceRequired.minYears != null && job.experienceRequired.maxYears != null)
      ? `${job.experienceRequired.minYears}-${job.experienceRequired.maxYears} yrs`
      : `${job.experienceRequired.minYears}+ yrs`
    : 'Not specified';

  const salary = job.salary && (job.salary.min || job.salary.max)
    ? `${job.salary.currency} ${job.salary.min || '?'}-${job.salary.max || '?'} (${job.salary.period})`
    : 'Not disclosed';

  // Truncate description and sanitize curly braces (LangChain template safety)
  const rawDesc = job.description ? job.description.slice(0, 300) : '';
  const desc = rawDesc.replace(/{/g, '(').replace(/}/g, ')');

  const reqStr = (job.requirements || []).slice(0, 5).join('; ')
    .replace(/{/g, '(').replace(/}/g, ')');

  return `[JOB ${idx}]
Title: ${job.title}
Organization: ${job.organizationName || 'N/A'}
Specialization: ${job.specialization}
Location: ${loc} | ${job.isRemote ? 'Remote' : 'On-site'}
Type: ${job.jobType} | Shift: ${job.shift || 'N/A'}
Experience: ${exp}
Salary: ${salary}
Description: ${desc}
Requirements: ${reqStr}`;
};

/**
 * Escape curly braces in a string so LangChain templates don't misinterpret them
 * LangChain uses {{ and }} for literal braces in templates
 * @param {string} str
 * @returns {string}
 */
const escapeLangChain = (str) => String(str).replace(/{/g, '{{').replace(/}/g, '}}');

/**
 * Parse and extract pre-filters from a natural language query using the LLM
 * This enables hybrid search: vector similarity + structured filters
 *
 * @param {string} query - User's natural language query
 * @returns {Promise<Object>} MongoDB filter conditions
 */
const extractFiltersFromQuery = async (query) => {
  const llm = getLLM();
  const outputParser = new StringOutputParser();

  const safeQueryForFilter = escapeLangChain(query);

  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      `You are a search filter extractor for a healthcare job platform. 
Extract structured filters from the user's job search query.

Respond with ONLY a JSON object with these possible fields (omit if not mentioned):
{{
  "specialization": "<one of the medical specializations if mentioned>",
  "jobType": "<Full-time|Part-time|Contract|Freelance|Internship|Volunteer>",
  "shift": "<Day|Night|Rotating|Flexible>",
  "isRemote": <true|false>,
  "city": "<city name>",
  "state": "<state name>"
}}

Medical specializations: General Medicine, Cardiology, Neurology, Orthopedics, Pediatrics, Gynecology, Dermatology, Psychiatry, Radiology, Anesthesiology, Emergency Medicine, Surgery, Oncology, Nursing, Pharmacy, Physical Therapy

Rules:
- If the user mentions night shift, extract shift: "Night"
- If the user mentions remote/work from home/WFH, extract isRemote: true
- Only extract fields that are clearly mentioned
- If unsure, omit the field
- Return {{}} if no structured filters found`,
    ],
    ['human', `Query: ${safeQueryForFilter}`],
  ]);

  const chain = prompt.pipe(llm).pipe(outputParser);
  const raw = await chain.invoke({});

  try {
    // Clean markdown fences
    const cleaned = raw.trim().replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    const parsed = JSON.parse(cleaned);

    // Build MongoDB filter
    const filter = {};

    if (parsed.specialization) {
      filter.specialization = { $eq: parsed.specialization };
    }
    if (parsed.jobType) {
      filter.jobType = { $eq: parsed.jobType };
    }
    if (parsed.shift) {
      filter.shift = { $eq: parsed.shift };
    }
    if (parsed.isRemote === true || parsed.isRemote === false) {
      filter.isRemote = { $eq: parsed.isRemote };
    }
    if (parsed.city) {
      filter['location.city'] = { $eq: parsed.city };
    }
    if (parsed.state) {
      filter['location.state'] = { $eq: parsed.state };
    }

    return filter;
  } catch {
    return {}; // Gracefully fall back to no filter
  }
};

/**
 * Main semantic search function — full RAG pipeline
 *
 * @param {string} query - Natural language search query from user
 * @param {Object} options
 * @param {number} [options.limit=8] - Number of results to return
 * @param {boolean} [options.useVectorSearch=true] - Use Atlas Vector Search (false = text fallback)
 * @param {boolean} [options.generateExplanations=true] - Use LLM to generate relevance explanations
 * @returns {Promise<Object>} Search results with explanations
 */
const semanticJobSearch = async (query, options = {}) => {
  const {
    limit = 8,
    useVectorSearch = true,
    generateExplanations = true,
  } = options;

  if (!query || query.trim().length < 2) {
    throw new Error('Search query must be at least 2 characters long');
  }

  const trimmedQuery = query.trim();
  let jobs = [];
  let searchMode = 'vector';

  if (useVectorSearch) {
    try {
      // Step 1: Extract structured filters from query (hybrid search)
      let preFilter = {};
      try {
        preFilter = await extractFiltersFromQuery(trimmedQuery);
      } catch {
        // Non-fatal — proceed without filters
      }

      // Step 2: Embed the query
      const queryVector = await embedText(trimmedQuery);

      // Step 3: Atlas Vector Search
      jobs = await runVectorSearch(queryVector, limit * 2, preFilter);
      searchMode = 'vector';

      // If vector search returns nothing (e.g., no matching active jobs after filter), relax filter
      if (jobs.length === 0 && Object.keys(preFilter).length > 0) {
        jobs = await runVectorSearch(queryVector, limit * 2, {});
      }
    } catch (vectorErr) {
      // Atlas Vector Search may not be configured yet — fall back to text search
      console.warn(`⚠️  Vector search failed, using text fallback: ${vectorErr.message}`);
      try {
        jobs = await runTextSearchFallback(trimmedQuery, limit * 2);
        searchMode = 'text_fallback';
      } catch (textErr) {
        throw new Error(`Search failed: ${textErr.message}`);
      }
    }
  } else {
    jobs = await runTextSearchFallback(trimmedQuery, limit * 2);
    searchMode = 'text_fallback';
  }

  // Slice to requested limit
  const topJobs = jobs.slice(0, limit);

  if (topJobs.length === 0) {
    return {
      query: trimmedQuery,
      searchMode,
      results: [],
      totalFound: 0,
      aiSummary: 'No jobs found matching your search. Try a different query or broaden your filters.',
    };
  }

  // Step 4: LLM re-ranking and explanation generation (optional)
  let results = topJobs;
  let aiSummary = '';

  if (generateExplanations && topJobs.length > 0) {
    try {
      const jobListText = topJobs
        .map((job, idx) => formatJobSummaryForLLM(job, idx + 1))
        .join('\n\n---\n\n');

      const llm = getLLM();
      const outputParser = new StringOutputParser();

      // Escape curly braces in dynamic content to prevent LangChain template errors
      // (job descriptions/requirements may contain { } which LangChain treats as variables)
      const safeJobList = escapeLangChain(jobListText);
      const safeQuery = escapeLangChain(trimmedQuery);

      const rerankerPrompt = ChatPromptTemplate.fromMessages([
        [
          'system',
          `You are a smart healthcare recruitment assistant. A job seeker searched for jobs using natural language.

Your tasks:
1. Write a 1-2 sentence SUMMARY of what you found for them (friendly, helpful tone).
2. For each job, write a SHORT (1 sentence) relevance explanation of why it matches their query.

RULES:
- Be concise and helpful
- Do NOT make up information
- Focus on what specifically matches their search intent
- Respond with ONLY valid JSON in this exact format (no extra text):

{{
  "summary": "<1-2 sentence overview of results>",
  "explanations": {{
    "1": "<why Job 1 matches>",
    "2": "<why Job 2 matches>"
  }}
}}`,
        ],
        [
          'human',
          `User searched for: "${safeQuery}"

Jobs found:
${safeJobList}

Provide summary and per-job explanations as JSON.`,
        ],
      ]);

      const chain = rerankerPrompt.pipe(llm).pipe(outputParser);
      const raw = await chain.invoke({});

      // Parse LLM response
      const cleaned = raw.trim().replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      const parsed = JSON.parse(cleaned);

      aiSummary = parsed.summary || '';
      const explanations = parsed.explanations || {};

      // Attach explanations to jobs
      results = topJobs.map((job, idx) => ({
        ...job,
        _id: job._id.toString(),
        aiExplanation: explanations[String(idx + 1)] || 'Matches your search criteria',
        relevanceScore: job.score ? Math.round(job.score * 100) / 100 : null,
      }));
    } catch (llmErr) {
      // Non-fatal — return results without AI explanations
      console.warn(`⚠️  LLM re-ranking failed: ${llmErr.message}`);
      results = topJobs.map((job) => ({
        ...job,
        _id: job._id.toString(),
        aiExplanation: null,
        relevanceScore: job.score ? Math.round(job.score * 100) / 100 : null,
      }));
      aiSummary = `Found ${topJobs.length} jobs matching your search.`;
    }
  } else {
    results = topJobs.map((job) => ({
      ...job,
      _id: job._id.toString(),
      relevanceScore: job.score ? Math.round(job.score * 100) / 100 : null,
    }));
  }

  return {
    query: trimmedQuery,
    searchMode,
    results,
    totalFound: results.length,
    aiSummary,
  };
};

module.exports = { semanticJobSearch };
