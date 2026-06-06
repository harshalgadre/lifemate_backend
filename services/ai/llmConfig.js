/**
 * LLM Configuration Service
 * Sets up and exports the LangChain.js LLM instance using Groq
 * This is the shared LLM client used by all AI features
 * 
 * Groq provides ultra-fast inference with Llama 3 models
 */

const { ChatGroq } = require('@langchain/groq');
const { aiConfig } = require('../../config/ai');

/**
 * Create and configure the LLM instance
 * Uses Groq via LangChain.js
 */
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
 * Reset the LLM instance (useful for testing or config changes)
 */
const resetLLM = () => {
  llmInstance = null;
};

module.exports = { getLLM, resetLLM };
