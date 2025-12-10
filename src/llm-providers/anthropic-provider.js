/**
 * @fileoverview Anthropic Claude API Provider for MUSUBI Replanning Engine
 * @module llm-providers/anthropic-provider
 * @version 1.0.0
 */

'use strict';

const { LLMProvider } = require('./base-provider');

/**
 * Anthropic Claude API Provider
 * Used when running outside VS Code or when Claude is preferred
 */
class AnthropicLMProvider extends LLMProvider {
  /**
   * Create an Anthropic provider
   * @param {Object} config - Provider configuration
   * @param {string} [config.apiKey] - Anthropic API key
   * @param {string} [config.model='claude-sonnet-4-20250514'] - Model to use
   */
  constructor(config = {}) {
    super(config);
    this.name = 'anthropic';
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    this.config.model = config.model || 'claude-sonnet-4-20250514';
    this.endpoint = config.endpoint || 'https://api.anthropic.com/v1/messages';
    this.rateLimiter = this.createRateLimiter(60); // 60 RPM
  }

  /**
   * Initialize the Anthropic provider
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not found. Set ANTHROPIC_API_KEY environment variable.');
    }
    this.isInitialized = true;
  }

  /**
   * Complete a prompt using Anthropic Claude API
   * @param {string} prompt - The prompt to complete
   * @param {Object} [options={}] - Completion options
   * @returns {Promise<LLMCompletionResult>} Completion result
   */
  async complete(prompt, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const systemPrompt = options.systemPrompt || this.getDefaultSystemPrompt();

    return this.rateLimiter(async () => {
      return this.retryWithBackoff(async () => {
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: this.config.model,
            max_tokens: options.maxTokens || this.config.maxTokens,
            system: systemPrompt,
            messages: [
              { role: 'user', content: prompt }
            ]
          }),
          signal: AbortSignal.timeout(this.config.timeout)
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Anthropic API error: ${response.status} - ${error}`);
        }

        const data = await response.json();

        return {
          content: data.content[0].text,
          model: data.model,
          usage: {
            promptTokens: data.usage?.input_tokens || 0,
            completionTokens: data.usage?.output_tokens || 0,
            totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
          },
          finishReason: data.stop_reason
        };
      });
    });
  }

  /**
   * Generate embeddings (not natively supported by Anthropic)
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>}
   */
  async embed(_text) {
    throw new Error('Embedding not supported by Anthropic Claude API. Use OpenAI or a dedicated embedding service.');
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
      // Anthropic API keys start with 'sk-ant-'
      return this.apiKey.startsWith('sk-ant-') || this.apiKey.length > 20;
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
      isInitialized: this.isInitialized,
      capabilities: {
        completion: true,
        embedding: false,
        streaming: true,
        functionCalling: true
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

module.exports = { AnthropicLMProvider };
