/**
 * Embedding Configuration Service
 * Feature 4: Semantic Job Search (RAG)
 *
 * Uses @xenova/transformers with the 'all-MiniLM-L6-v2' model
 * - 384-dimensional embeddings
 * - Runs 100% locally — no API key, no cost
 * - First call downloads ~25MB model, then caches it locally
 * - Optimized for semantic similarity tasks
 */

const { aiConfig } = require('../../config/ai');

let pipelineInstance = null;
let isLoading = false;
let loadPromise = null;

/**
 * Get or initialize the embedding pipeline (singleton)
 * @returns {Promise<Function>} The feature-extraction pipeline
 */
const getEmbeddingPipeline = async () => {
  if (pipelineInstance) return pipelineInstance;

  // Prevent duplicate initialization
  if (isLoading) {
    return loadPromise;
  }

  isLoading = true;
  loadPromise = (async () => {
    try {
      // Dynamic import required for ESM-based @xenova/transformers in CommonJS
      const { pipeline, env } = await import('@xenova/transformers');

      // Cache models locally in the project directory
      env.cacheDir = './.model-cache';
      env.allowRemoteModels = true;

      const modelName = process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';

      console.log(`🔢 Loading embedding model: ${modelName}...`);
      pipelineInstance = await pipeline('feature-extraction', modelName, {
        quantized: true, // Use quantized model for faster loading (smaller file)
      });
      console.log(`✅ Embedding model loaded: ${modelName} (${aiConfig.embedding.dimensions} dimensions)`);
      return pipelineInstance;
    } catch (err) {
      isLoading = false;
      loadPromise = null;
      throw new Error(`Failed to load embedding model: ${err.message}`);
    }
  })();

  return loadPromise;
};

/**
 * Generate an embedding vector for a text string
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} 384-dimensional embedding vector
 */
const embedText = async (text) => {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('embedText requires a non-empty string');
  }

  const embedder = await getEmbeddingPipeline();

  // Truncate very long texts to avoid memory issues (model has 512 token limit)
  const truncated = text.slice(0, 2000);

  // Run the model — output shape: [1, tokens, 384]
  const output = await embedder(truncated, { pooling: 'mean', normalize: true });

  // Convert to plain JavaScript array
  return Array.from(output.data);
};

/**
 * Build a rich text document from a Job record for embedding
 * This concatenation is what gets embedded — design it carefully
 * @param {Object} job - MongoDB job document
 * @returns {string}
 */
const buildJobEmbeddingText = (job) => {
  const parts = [];

  if (job.title) parts.push(`Job Title: ${job.title}`);
  if (job.specialization) parts.push(`Specialization: ${job.specialization}`);
  if (job.organizationName) parts.push(`Organization: ${job.organizationName}`);

  if (job.location) {
    const loc = [job.location.city, job.location.state, job.location.country]
      .filter(Boolean)
      .join(', ');
    if (loc) parts.push(`Location: ${loc}`);
  }

  if (job.jobType) parts.push(`Job Type: ${job.jobType}`);
  if (job.shift) parts.push(`Shift: ${job.shift}`);

  if (job.experienceRequired) {
    const exp = job.experienceRequired;
    if (exp.minYears != null && exp.maxYears != null) {
      parts.push(`Experience Required: ${exp.minYears} to ${exp.maxYears} years`);
    } else if (exp.minYears != null) {
      parts.push(`Experience Required: ${exp.minYears}+ years`);
    }
  }

  if (job.isRemote) parts.push('Work Mode: Remote');
  if (!job.isRemote) parts.push('Work Mode: On-site');

  if (job.description) parts.push(`Description: ${job.description.slice(0, 800)}`);

  if (job.responsibilities && job.responsibilities.length > 0) {
    parts.push(`Responsibilities: ${job.responsibilities.slice(0, 5).join('. ')}`);
  }

  if (job.requirements && job.requirements.length > 0) {
    parts.push(`Requirements: ${job.requirements.slice(0, 8).join('. ')}`);
  }

  if (job.benefits && job.benefits.length > 0) {
    parts.push(`Benefits: ${job.benefits.slice(0, 5).join('. ')}`);
  }

  if (job.salary) {
    const sal = job.salary;
    if (sal.min || sal.max) {
      const range = sal.min && sal.max
        ? `${sal.currency} ${sal.min} to ${sal.max}`
        : sal.min
          ? `${sal.currency} ${sal.min}+`
          : `Up to ${sal.currency} ${sal.max}`;
      parts.push(`Salary: ${range} (${sal.period})`);
    }
  }

  return parts.join('\n');
};

/**
 * Warm up the embedding model on server start (optional)
 * Call this early to avoid cold-start delay on first user request
 */
const warmupEmbeddingModel = async () => {
  try {
    await embedText('warmup healthcare job search');
    console.log('🔥 Embedding model warmed up');
  } catch (err) {
    console.warn(`⚠️  Embedding model warmup failed: ${err.message}`);
  }
};

module.exports = {
  getEmbeddingPipeline,
  embedText,
  buildJobEmbeddingText,
  warmupEmbeddingModel,
};
