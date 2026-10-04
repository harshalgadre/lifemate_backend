/**
 * LLM Configuration Service
 * Sets up and exports the LangChain.js LLM instance using Groq
 * This is the shared LLM client used by all AI features
 * 
 * Groq provides ultra-fast inference with GPT OSS and Llama models.
 * Model list: https://console.groq.com/docs/models
 */

const { ChatGroq } = require('@langchain/groq');
const { aiConfig } = require('../../config/ai');

let llmInstance = null;

const getLLM = () => {
  if (llmInstance) {
    return llmInstance;
  }

  if (!aiConfig.apiKey) {
    throw new Error(
      'GROQ_API_KEY is not configured. ' +
      'Please add it to your .env file. ' +
      'Get a free key at: https://console.groq.com/keys'
    );
  }

  llmInstance = new ChatGroq({
    apiKey: aiConfig.apiKey,
    model: aiConfig.modelName,
    temperature: aiConfig.temperature,
    maxTokens: aiConfig.maxOutputTokens,
  });

  console.log(`🤖 LLM initialized: Groq/${aiConfig.modelName} (temp: ${aiConfig.temperature})`);
  return llmInstance;
};

/**
 * Create an LLM instance for a specific model name.
 * Used internally by withModelFallback.
 */
const createLLM = (modelName) => new ChatGroq({
  apiKey: aiConfig.apiKey,
  model: modelName,
  temperature: aiConfig.temperature,
  maxTokens: aiConfig.maxOutputTokens,
});

/**
 * Run a LangChain chain with automatic model fallback.
 * If the primary model returns a model_not_found / model_decommissioned error,
 * it automatically retries with the next model in aiConfig.fallbackModels.
 *
 * @param {Function} buildChain - (llm) => chain  — receives an LLM instance, returns a runnable chain
 * @param {Object} input - Input object to invoke the chain with
 * @returns {Promise<string>} Raw output from the first successful model
 */
const withModelFallback = async (buildChain, input) => {
  const models = aiConfig.fallbackModels && aiConfig.fallbackModels.length > 0
    ? aiConfig.fallbackModels
    : [aiConfig.modelName];

  let lastError;
  for (const modelName of models) {
    try {
      const llm = createLLM(modelName);
      const chain = buildChain(llm);
      const result = await chain.invoke(input);
      if (modelName !== aiConfig.modelName) {
        console.log(`✅ Succeeded with fallback model: ${modelName}`);
      }
      return result;
    } catch (err) {
      const msg = err?.message || String(err);
      // Only continue to next model on decommission / not found errors
      if (msg.includes('model_not_found') || msg.includes('decommissioned') || msg.includes('does not exist')) {
        console.warn(`⚠️  Model "${modelName}" unavailable: ${msg}. Trying next...`);
        lastError = err;
        continue;
      }
      // All other errors (rate limit, auth, etc.) — rethrow immediately
      throw err;
    }
  }
  throw new Error(`All Groq models failed. Last error: ${lastError?.message}`);
};

/**
 * Reset the LLM instance (useful for testing or config changes)
 */
const resetLLM = () => {
  llmInstance = null;
};

module.exports = { getLLM, resetLLM, withModelFallback };
