/**
 * @fileoverview Base LLM Provider class for MUSUBI Replanning Engine
 * @module llm-providers/base-provider
 * @version 1.0.0
 */

'use strict';

/**
 * Abstract base class for LLM providers
 * Provides a unified interface for different LLM APIs
 */
class LLMProvider {
  /**
   * Create an LLM provider instance
   * @param {Object} config - Provider configuration
   * @param {string} [config.model] - Model identifier
   * @param {number} [config.maxTokens=1024] - Maximum tokens for completion
   * @param {number} [config.temperature=0.7] - Sampling temperature
   * @param {number} [config.timeout=30000] - Request timeout in milliseconds
   */
  constructor(config = {}) {
    this.config = {
      maxTokens: 1024,
      temperature: 0.7,
      timeout: 30000,
      ...config
    };
    this.name = 'base';
    this.isInitialized = false;
  }

  /**
   * Initialize the provider
   * @returns {Promise<void>}
   */
  async initialize() {
    this.isInitialized = true;
  }

  /**
   * Complete a prompt with the LLM
   * @param {string} prompt - The prompt to complete
   * @param {Object} [options={}] - Completion options
   * @param {number} [options.maxTokens] - Override max tokens
   * @param {number} [options.temperature] - Override temperature
   * @param {string} [options.systemPrompt] - System prompt
   * @returns {Promise<LLMCompletionResult>} Completion result
   * @abstract
   */
  async complete(prompt, _options = {}) {
    throw new Error('LLMProvider.complete() must be implemented by subclass');
  }

  /**
   * Complete a structured prompt with JSON output
   * @param {string} prompt - The prompt
   * @param {Object} schema - JSON schema for expected output
   * @param {Object} [options={}] - Completion options
   * @returns {Promise<Object>} Parsed JSON result
   */
  async completeJSON(prompt, schema, options = {}) {
    const jsonPrompt = `${prompt}

Respond with valid JSON matching this schema:
${JSON.stringify(schema, null, 2)}

Output only the JSON, no explanation.`;

    const result = await this.complete(jsonPrompt, {
      ...options,
      temperature: 0.3 // Lower temperature for structured output
    });

    try {
      // Extract JSON from the response
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for text
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} Embedding vector
   * @abstract
   */
  async embed(_text) {
    throw new Error('LLMProvider.embed() must be implemented by subclass');
  }

  /**
   * Check if the provider is available and properly configured
   * @returns {Promise<boolean>} Availability status
   * @abstract
   */
  async isAvailable() {
    throw new Error('LLMProvider.isAvailable() must be implemented by subclass');
  }

  /**
   * Get provider information
   * @returns {ProviderInfo} Provider information
   */
  getInfo() {
    return {
      name: this.name,
      model: this.config.model,
      isInitialized: this.isInitialized,
      capabilities: {
        completion: true,
        embedding: false,
        streaming: false,
        functionCalling: false
      }
    };
  }

  /**
   * Format messages for chat completion
   * @param {string} systemPrompt - System prompt
   * @param {string} userPrompt - User prompt
   * @returns {Array<Message>} Formatted messages
   * @protected
   */
  formatMessages(systemPrompt, userPrompt) {
    const messages = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: userPrompt });
    
    return messages;
  }

  /**
   * Create a rate limiter for API calls
   * @param {number} requestsPerMinute - Rate limit
   * @returns {Function} Rate limited function wrapper
   * @protected
   */
  createRateLimiter(requestsPerMinute) {
    const minInterval = 60000 / requestsPerMinute;
    let lastCall = 0;

    return async (fn) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCall;
      
      if (timeSinceLastCall < minInterval) {
        await new Promise(resolve => 
          setTimeout(resolve, minInterval - timeSinceLastCall)
        );
      }
      
      lastCall = Date.now();
      return fn();
    };
  }

  /**
   * Retry a function with exponential backoff
   * @param {Function} fn - Function to retry
   * @param {number} [maxRetries=3] - Maximum retry attempts
   * @param {number} [baseDelay=1000] - Base delay in milliseconds
   * @returns {Promise<*>} Function result
   * @protected
   */
  async retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
}

/**
 * @typedef {Object} LLMCompletionResult
 * @property {string} content - Completion content
 * @property {string} model - Model used
 * @property {Object} usage - Token usage
 * @property {number} usage.promptTokens - Prompt tokens
 * @property {number} usage.completionTokens - Completion tokens
 * @property {number} usage.totalTokens - Total tokens
 * @property {string} [finishReason] - Reason for completion finish
 */

/**
 * @typedef {Object} ProviderInfo
 * @property {string} name - Provider name
 * @property {string} model - Model identifier
 * @property {boolean} isInitialized - Initialization status
 * @property {Object} capabilities - Provider capabilities
 */

/**
 * @typedef {Object} Message
 * @property {string} role - Message role (system, user, assistant)
 * @property {string} content - Message content
 */

module.exports = { LLMProvider };
