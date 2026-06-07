/**
 * Match Scorer Chain
 * Feature 2: Smart Job-Resume Match Scorer
 * 
 * Compares a resume against a job posting and returns a structured
 * match score with category breakdowns and improvement suggestions.
 * Uses LangChain.js with Groq (Llama 3.3) for analysis.
 */

const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { getLLM } = require('./llmConfig');

/**
 * Format resume data into a concise text block for the LLM
 * @param {Object} resume - Plain resume object from MongoDB
 * @returns {string}
 */
const formatResumeForMatching = (resume) => {
  const sections = [];

  // Personal info
  if (resume.personalInfo?.fullName) {
    sections.push(`CANDIDATE: ${resume.personalInfo.fullName}`);
  }

  // Summary
  if (resume.summary) {
    sections.push(`SUMMARY: ${resume.summary}`);
  }

  // Work experience
  if (resume.workExperience && resume.workExperience.length > 0) {
    const expLines = resume.workExperience
      .filter((exp) => exp.isVisible !== false)
      .map((exp) => {
        const duration = exp.isCurrent
          ? `${new Date(exp.startDate).getFullYear()} – Present`
          : `${new Date(exp.startDate).getFullYear()} – ${new Date(exp.endDate).getFullYear()}`;
        let line = `• ${exp.position} at ${exp.company} (${duration})`;
        if (exp.description) line += ` — ${exp.description}`;
        if (exp.achievements && exp.achievements.length > 0) {
          line += ` | Achievements: ${exp.achievements.join('; ')}`;
        }
        return line;
      });
    sections.push(`WORK EXPERIENCE:\n${expLines.join('\n')}`);
  }

  // Education
  if (resume.education && resume.education.length > 0) {
    const eduLines = resume.education
      .filter((edu) => edu.isVisible !== false)
      .map((edu) => `• ${edu.degree} in ${edu.field} — ${edu.institution} (${edu.yearOfCompletion})`);
    sections.push(`EDUCATION:\n${eduLines.join('\n')}`);
  }

  // Skills
  if (resume.skills && resume.skills.length > 0) {
    const skillList = resume.skills
      .filter((s) => s.isVisible !== false)
      .map((s) => (s.proficiency ? `${s.name} (${s.proficiency})` : s.name));
    sections.push(`SKILLS: ${skillList.join(', ')}`);
  }

  // Certifications
  if (resume.certifications && resume.certifications.length > 0) {
    const certLines = resume.certifications
      .filter((c) => c.isVisible !== false)
      .map((c) => `• ${c.name} — ${c.issuingOrganization}`);
    sections.push(`CERTIFICATIONS:\n${certLines.join('\n')}`);
  }

  // Projects
  if (resume.projects && resume.projects.length > 0) {
    const projLines = resume.projects
      .filter((p) => p.isVisible !== false)
      .map((p) => {
        let line = `• ${p.title}`;
        if (p.description) line += `: ${p.description}`;
        if (p.technologies && p.technologies.length > 0) {
          line += ` [${p.technologies.join(', ')}]`;
        }
        return line;
      });
    sections.push(`PROJECTS:\n${projLines.join('\n')}`);
  }

  return sections.join('\n\n');
};

/**
 * Format job posting data into a concise text block for the LLM
 * @param {Object} job - Plain job object from MongoDB
 * @returns {string}
 */
const formatJobForMatching = (job) => {
  const sections = [];

  sections.push(`JOB TITLE: ${job.title}`);
  
  if (job.organizationName) {
    sections.push(`ORGANIZATION: ${job.organizationName}`);
  }

  if (job.location) {
    const loc = [job.location.city, job.location.state, job.location.country].filter(Boolean).join(', ');
    sections.push(`LOCATION: ${loc}`);
  }

  if (job.specialization) {
    sections.push(`SPECIALIZATION: ${job.specialization}`);
  }

  if (job.jobType) {
    sections.push(`JOB TYPE: ${job.jobType}`);
  }

  if (job.experienceRequired) {
    const exp = job.experienceRequired;
    if (exp.minYears != null && exp.maxYears != null) {
      sections.push(`EXPERIENCE REQUIRED: ${exp.minYears} – ${exp.maxYears} years`);
    } else if (exp.minYears != null) {
      sections.push(`EXPERIENCE REQUIRED: ${exp.minYears}+ years`);
    }
  }

  if (job.description) {
    sections.push(`DESCRIPTION: ${job.description}`);
  }

  if (job.responsibilities && job.responsibilities.length > 0) {
    sections.push(`RESPONSIBILITIES:\n${job.responsibilities.map((r) => `• ${r}`).join('\n')}`);
  }

  if (job.requirements && job.requirements.length > 0) {
    sections.push(`REQUIREMENTS:\n${job.requirements.map((r) => `• ${r}`).join('\n')}`);
  }

  if (job.benefits && job.benefits.length > 0) {
    sections.push(`BENEFITS:\n${job.benefits.map((b) => `• ${b}`).join('\n')}`);
  }

  if (job.salary && (job.salary.min || job.salary.max)) {
    const sal = job.salary;
    const range = sal.min && sal.max
      ? `${sal.currency} ${sal.min.toLocaleString()} – ${sal.max.toLocaleString()}`
      : sal.min
        ? `${sal.currency} ${sal.min.toLocaleString()}+`
        : `Up to ${sal.currency} ${sal.max.toLocaleString()}`;
    sections.push(`SALARY: ${range} (${sal.period})`);
  }

  return sections.join('\n');
};

/**
 * Parse the LLM's JSON response, handling markdown code fences
 * @param {string} rawOutput - Raw LLM output string
 * @returns {Object} Parsed JSON object
 */
const parseLLMJson = (rawOutput) => {
  let cleaned = rawOutput.trim();

  // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Try to extract JSON from the output using regex as a fallback
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error(`Failed to parse AI response as JSON: ${e.message}`);
  }
};

/**
 * Calculate the match score between a resume and a job posting using AI
 * 
 * @param {Object} resume - Plain resume object from MongoDB
 * @param {Object} job - Plain job object from MongoDB
 * @returns {Promise<Object>} Match result with score, breakdown, and suggestions
 */
const calculateMatchScore = async (resume, job) => {
  const resumeText = formatResumeForMatching(resume);
  const jobText = formatJobForMatching(job);

  const promptTemplate = ChatPromptTemplate.fromMessages([
    [
      'system',
      `You are an expert healthcare recruitment analyst. Your task is to analyze how well a candidate's resume matches a specific job posting.

You MUST respond with ONLY a valid JSON object (no markdown, no explanation, no text before or after). The JSON must follow this exact structure:

{{
  "overallScore": <number 0-100>,
  "breakdown": {{
    "skills": {{
      "score": <number 0-100>,
      "matched": [<list of candidate skills that match job requirements>],
      "missing": [<list of required skills the candidate lacks>]
    }},
    "experience": {{
      "score": <number 0-100>,
      "assessment": "<1-2 sentence assessment of experience relevance and level>"
    }},
    "education": {{
      "score": <number 0-100>,
      "assessment": "<1-2 sentence assessment of educational fit>"
    }},
    "specialization": {{
      "score": <number 0-100>,
      "assessment": "<1-2 sentence assessment of domain/specialization alignment>"
    }}
  }},
  "strengths": [<top 3 strengths of this candidate for this role>],
  "improvements": [<top 3 actionable suggestions to improve match>],
  "verdictSummary": "<2-3 sentence overall verdict about the match quality>"
}}

SCORING GUIDELINES:
- 90-100: Exceptional match — candidate exceeds most requirements
- 75-89: Strong match — candidate meets most requirements with minor gaps
- 60-74: Moderate match — candidate meets some requirements, notable gaps exist
- 40-59: Weak match — significant gaps between candidate profile and requirements
- 0-39: Poor match — candidate's profile does not align with this role

Be fair, objective, and base scores ONLY on the data provided. Do NOT fabricate skills or experience.`
    ],
    [
      'human',
      `Analyze the match between this resume and job posting:

--- RESUME ---
{resumeText}

--- JOB POSTING ---
{jobText}

Return ONLY the JSON object with the match analysis.`
    ],
  ]);

  const llm = getLLM();
  const outputParser = new StringOutputParser();
  const chain = promptTemplate.pipe(llm).pipe(outputParser);

  const rawOutput = await chain.invoke({
    resumeText,
    jobText,
  });

  // Parse the structured output
  const result = parseLLMJson(rawOutput);

  // Validate required fields
  if (typeof result.overallScore !== 'number' || result.overallScore < 0 || result.overallScore > 100) {
    throw new Error('AI returned an invalid overall score');
  }

  // Ensure all expected fields exist with defaults
  return {
    overallScore: Math.round(result.overallScore),
    breakdown: {
      skills: {
        score: Math.round(result.breakdown?.skills?.score || 0),
        matched: result.breakdown?.skills?.matched || [],
        missing: result.breakdown?.skills?.missing || [],
      },
      experience: {
        score: Math.round(result.breakdown?.experience?.score || 0),
        assessment: result.breakdown?.experience?.assessment || 'No assessment available',
      },
      education: {
        score: Math.round(result.breakdown?.education?.score || 0),
        assessment: result.breakdown?.education?.assessment || 'No assessment available',
      },
      specialization: {
        score: Math.round(result.breakdown?.specialization?.score || 0),
        assessment: result.breakdown?.specialization?.assessment || 'No assessment available',
      },
    },
    strengths: result.strengths || [],
    improvements: result.improvements || [],
    verdictSummary: result.verdictSummary || 'No verdict available',
  };
};

module.exports = { calculateMatchScore };
