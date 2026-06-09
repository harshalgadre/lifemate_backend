/**
 * AI Configuration
 * Centralized configuration for AI/GenAI services
 * Reads and validates AI-related environment variables
 * 
 * Provider: Groq (fast inference with Llama 3 models)
 * Embeddings: @xenova/transformers — all-MiniLM-L6-v2 (local, free)
 */

const aiConfig = {
  // LLM Provider Configuration
  provider: 'groq',
  apiKey: process.env.GROQ_API_KEY,
  modelName: process.env.AI_MODEL_NAME || 'llama-3.3-70b-versatile',
  temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7,
  maxOutputTokens: parseInt(process.env.AI_MAX_TOKENS) || 2000,

  // Feature flags
  features: {
    resumeSummary: true,
    matchScorer: true,     // Feature 2 — implemented
    semanticSearch: true,  // Feature 4 — implemented
    screeningAgent: false, // Feature 6 — not yet implemented
  },

  // Rate limiting for AI endpoints (per user)
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 20,           // 20 AI requests per window
  },

  // Summary generation config (Feature 1)
  summary: {
    maxLength: 1000, // matches Resume schema maxlength
    defaultTone: 'professional',
    allowedTones: ['professional', 'creative', 'concise'],
  },

  // Vector embedding config (Feature 4)
  embedding: {
    model: process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2',
    dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS) || 384,
    vectorIndexName: process.env.MONGODB_VECTOR_INDEX_NAME || 'job_vector_index',
    batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE) || 5,
  },
};

/**
 * Validate AI configuration on startup
 * @returns {{ valid: boolean, warnings: string[] }}
 */
const validateAiConfig = () => {
  const warnings = [];

  if (!aiConfig.apiKey) {
    warnings.push('⚠️  GROQ_API_KEY is not set. AI features will not work.');
  }

  if (aiConfig.temperature < 0 || aiConfig.temperature > 2) {
    warnings.push(`⚠️  AI_TEMPERATURE (${aiConfig.temperature}) is out of range [0, 2]. Using 0.7.`);
    aiConfig.temperature = 0.7;
  }

  if (aiConfig.maxOutputTokens < 100 || aiConfig.maxOutputTokens > 8000) {
    warnings.push(`⚠️  AI_MAX_TOKENS (${aiConfig.maxOutputTokens}) is out of range [100, 8000]. Using 2000.`);
    aiConfig.maxOutputTokens = 2000;
  }

  if (aiConfig.features.semanticSearch && !process.env.MONGODB_VECTOR_INDEX_NAME) {
    warnings.push('⚠️  MONGODB_VECTOR_INDEX_NAME not set. Using default: "job_vector_index". Create this index in MongoDB Atlas UI.');
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
};

module.exports = { aiConfig, validateAiConfig };
