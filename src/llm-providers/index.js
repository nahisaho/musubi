/**
 * @fileoverview LLM Provider Factory and Exports for MUSUBI Replanning Engine
 * @module llm-providers
 * @version 1.0.0
 */

'use strict';

const { LLMProvider } = require('./base-provider');
const { CopilotLMProvider } = require('./copilot-provider');
const { AnthropicLMProvider } = require('./anthropic-provider');
const { OpenAILMProvider } = require('./openai-provider');

/**
 * Provider priority order for auto-selection
 * GitHub Copilot is preferred when available (in VS Code)
 */
const PROVIDER_PRIORITY = ['github-copilot', 'anthropic', 'openai'];

/**
 * Create an LLM provider instance
 * @param {string} [provider='auto'] - Provider name or 'auto' for automatic selection
 * @param {Object} [config={}] - Provider configuration
 * @returns {LLMProvider} Configured provider instance
 * @throws {Error} If no provider is available
 */
function createLLMProvider(provider = 'auto', config = {}) {
  if (provider === 'auto') {
    return createAutoProvider(config);
  }

  return createNamedProvider(provider, config);
}

/**
 * Automatically select the best available provider
 * @param {Object} config - Provider configuration
 * @returns {LLMProvider} Best available provider
 * @private
 */
function createAutoProvider(config) {
  // Try providers in priority order
  for (const providerName of PROVIDER_PRIORITY) {
    try {
      const provider = createNamedProvider(providerName, config);
      
      // Check if provider can be used
      if (providerName === 'github-copilot') {
        // Copilot is available in VS Code context or with token
        try {
          require('vscode');
          return provider;
        } catch (e) {
          if (process.env.GITHUB_COPILOT_TOKEN) {
            return provider;
          }
        }
      } else if (providerName === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
        return provider;
      } else if (providerName === 'openai' && process.env.OPENAI_API_KEY) {
        return provider;
      }
    } catch (e) {
      // Continue to next provider
    }
  }

  throw new Error(
    'No LLM provider available. Please configure one of:\n' +
    '  - Run inside VS Code with GitHub Copilot extension\n' +
    '  - Set GITHUB_COPILOT_TOKEN environment variable\n' +
    '  - Set ANTHROPIC_API_KEY environment variable\n' +
    '  - Set OPENAI_API_KEY environment variable'
  );
}

/**
 * Create a specific named provider
 * @param {string} name - Provider name
 * @param {Object} config - Provider configuration
 * @returns {LLMProvider} Provider instance
 * @private
 */
function createNamedProvider(name, config) {
  switch (name.toLowerCase()) {
    case 'github-copilot':
    case 'copilot':
      return new CopilotLMProvider(config);
    
    case 'anthropic':
    case 'claude':
      return new AnthropicLMProvider(config);
    
    case 'openai':
    case 'gpt':
      return new OpenAILMProvider(config);
    
    default:
      throw new Error(`Unknown LLM provider: ${name}`);
  }
}

/**
 * Get list of available providers based on current environment
 * @returns {Promise<Array<{name: string, available: boolean, info: Object}>>}
 */
async function getAvailableProviders() {
  const results = [];

  const providers = [
    { name: 'github-copilot', class: CopilotLMProvider },
    { name: 'anthropic', class: AnthropicLMProvider },
    { name: 'openai', class: OpenAILMProvider }
  ];

  for (const { name, class: ProviderClass } of providers) {
    try {
      const provider = new ProviderClass();
      const available = await provider.isAvailable();
      results.push({
        name,
        available,
        info: provider.getInfo()
      });
    } catch (e) {
      results.push({
        name,
        available: false,
        error: e.message
      });
    }
  }

  return results;
}

/**
 * Mock LLM Provider for testing
 * Returns predefined responses
 */
class MockLLMProvider extends LLMProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'mock';
    this.responses = config.responses || [];
    this.responseIndex = 0;
  }

  async initialize() {
    this.isInitialized = true;
  }

  async complete(prompt, options = {}) {
    const response = this.responses[this.responseIndex] || {
      content: JSON.stringify({
        analysis: 'Mock analysis',
        goal: 'Mock goal',
        alternatives: [
          {
            id: 'mock-alt-1',
            description: 'Mock alternative',
            task: { name: 'mock-task', skill: 'mock-skill', parameters: {} },
            confidence: 0.85,
            reasoning: 'Mock reasoning',
            risks: []
          }
        ]
      })
    };

    this.responseIndex = (this.responseIndex + 1) % Math.max(1, this.responses.length);

    return {
      content: typeof response.content === 'string' ? response.content : JSON.stringify(response.content),
      model: 'mock-model',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      finishReason: 'stop'
    };
  }

  async embed(text) {
    // Return a fixed-dimension embedding
    return new Array(1536).fill(0).map(() => Math.random());
  }

  async isAvailable() {
    return true;
  }

  /**
   * Set mock responses
   * @param {Array<Object>} responses - Array of mock responses
   */
  setResponses(responses) {
    this.responses = responses;
    this.responseIndex = 0;
  }
}

module.exports = {
  // Factory function
  createLLMProvider,
  getAvailableProviders,
  
  // Provider classes
  LLMProvider,
  CopilotLMProvider,
  AnthropicLMProvider,
  OpenAILMProvider,
  MockLLMProvider,
  
  // Constants
  PROVIDER_PRIORITY
};
