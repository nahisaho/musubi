/**
 * @fileoverview OpenAI GPT API Provider for MUSUBI Replanning Engine
 * @module llm-providers/openai-provider
 * @version 1.0.0
 */

'use strict';

const { LLMProvider } = require('./base-provider');

/**
 * OpenAI GPT API Provider
 * Fallback provider with embedding support
 */
class OpenAILMProvider extends LLMProvider {
  /**
   * Create an OpenAI provider
   * @param {Object} config - Provider configuration
   * @param {string} [config.apiKey] - OpenAI API key
   * @param {string} [config.model='gpt-4o'] - Model to use for completion
   * @param {string} [config.embeddingModel='text-embedding-3-small'] - Model for embeddings
   */
  constructor(config = {}) {
    super(config);
    this.name = 'openai';
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.config.model = config.model || 'gpt-4o';
    this.config.embeddingModel = config.embeddingModel || 'text-embedding-3-small';
    this.endpoint = config.endpoint || 'https://api.openai.com/v1';
    this.rateLimiter = this.createRateLimiter(60); // 60 RPM default
  }

  /**
   * Initialize the OpenAI provider
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not found. Set OPENAI_API_KEY environment variable.');
    }
    this.isInitialized = true;
  }

  /**
   * Complete a prompt using OpenAI GPT API
   * @param {string} prompt - The prompt to complete
   * @param {Object} [options={}] - Completion options
   * @returns {Promise<LLMCompletionResult>} Completion result
   */
  async complete(prompt, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const systemPrompt = options.systemPrompt || this.getDefaultSystemPrompt();
    const messages = this.formatMessages(systemPrompt, prompt);

    return this.rateLimiter(async () => {
      return this.retryWithBackoff(async () => {
        const response = await fetch(`${this.endpoint}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: this.config.model,
            messages,
            max_tokens: options.maxTokens || this.config.maxTokens,
            temperature: options.temperature || this.config.temperature,
            response_format: options.jsonMode ? { type: 'json_object' } : undefined
          }),
          signal: AbortSignal.timeout(this.config.timeout)
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`OpenAI API error: ${response.status} - ${error}`);
        }

        const data = await response.json();

        return {
          content: data.choices[0].message.content,
          model: data.model,
          usage: {
            promptTokens: data.usage?.prompt_tokens || 0,
            completionTokens: data.usage?.completion_tokens || 0,
            totalTokens: data.usage?.total_tokens || 0
          },
          finishReason: data.choices[0].finish_reason
        };
      });
    });
  }

  /**
   * Generate embeddings using OpenAI Embedding API
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} Embedding vector
   */
  async embed(text) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return this.rateLimiter(async () => {
      return this.retryWithBackoff(async () => {
        const response = await fetch(`${this.endpoint}/embeddings`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: this.config.embeddingModel,
            input: text
          }),
          signal: AbortSignal.timeout(this.config.timeout)
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`OpenAI Embedding API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return data.data[0].embedding;
      });
    });
  }

  /**
   * Check if the provider is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    if (!this.apiKey) {
      return false;
    }

    try {
      // Simple validation - check if API key format is valid
      // OpenAI API keys start with 'sk-'
      return this.apiKey.startsWith('sk-') && this.apiKey.length > 20;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get provider information
   * @returns {ProviderInfo}
   */
  getInfo() {
    return {
      name: this.name,
      model: this.config.model,
      embeddingModel: this.config.embeddingModel,
      isInitialized: this.isInitialized,
      capabilities: {
        completion: true,
        embedding: true,
        streaming: true,
        functionCalling: true,
        jsonMode: true
      }
    };
  }

  /**
   * Get default system prompt for replanning
   * @returns {string}
   * @private
   */
  getDefaultSystemPrompt() {
    return `You are an AI assistant helping with task replanning in a software development workflow.
Your role is to analyze failed tasks, understand the goal, and generate alternative approaches.

Guidelines:
1. Be concise and specific in your recommendations
2. Prioritize practical, actionable alternatives
3. Consider resource constraints and dependencies
4. Provide confidence scores for each alternative (0.0 to 1.0)
5. Explain the reasoning behind each suggestion

When generating alternatives, output valid JSON with this structure:
{
  "analysis": "Brief analysis of the failure",
  "goal": "Extracted goal from the task",
  "alternatives": [
    {
      "id": "alt-1",
      "description": "Alternative approach",
      "task": { "name": "task-name", "skill": "skill-name", "parameters": {} },
      "confidence": 0.8,
      "reasoning": "Why this might work",
      "risks": ["potential risk"]
    }
  ]
}`;
  }
}

module.exports = { OpenAILMProvider };
