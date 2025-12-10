/**
 * @fileoverview Ollama LLM Provider for MUSUBI
 * @module llm-providers/ollama-provider
 * @version 1.0.0
 * @description Provides integration with Ollama for local LLM inference
 */

'use strict';

const { LLMProvider } = require('./base-provider');

/**
 * Default Ollama configuration
 */
const OLLAMA_DEFAULTS = {
  baseUrl: 'http://localhost:11434',
  model: 'llama3.2',
  maxTokens: 2048,
  temperature: 0.7,
  timeout: 120000, // Longer timeout for local inference
  keepAlive: '5m',
};

/**
 * Popular models with their recommended settings
 */
const MODEL_PRESETS = {
  'llama3.2': { contextLength: 128000, parameters: '1B/3B' },
  'llama3.1': { contextLength: 128000, parameters: '8B/70B/405B' },
  'llama3': { contextLength: 8192, parameters: '8B/70B' },
  'codellama': { contextLength: 16384, parameters: '7B/13B/34B' },
  'deepseek-coder': { contextLength: 16384, parameters: '1.3B/6.7B/33B' },
  'deepseek-coder-v2': { contextLength: 128000, parameters: '16B/236B' },
  'mistral': { contextLength: 32768, parameters: '7B' },
  'mixtral': { contextLength: 32768, parameters: '8x7B' },
  'phi3': { contextLength: 4096, parameters: '3.8B' },
  'gemma2': { contextLength: 8192, parameters: '2B/9B/27B' },
  'qwen2.5': { contextLength: 128000, parameters: '0.5B-72B' },
  'qwen2.5-coder': { contextLength: 128000, parameters: '1.5B-32B' },
  'starcoder2': { contextLength: 16384, parameters: '3B/7B/15B' },
};

/**
 * Ollama LLM Provider
 * Connects to local Ollama instance for inference
 */
class OllamaProvider extends LLMProvider {
  /**
   * Create an Ollama provider instance
   * @param {Object} config - Provider configuration
   * @param {string} [config.baseUrl='http://localhost:11434'] - Ollama API URL
   * @param {string} [config.model='llama3.2'] - Model to use
   * @param {number} [config.maxTokens=2048] - Maximum tokens
   * @param {number} [config.temperature=0.7] - Temperature
   * @param {number} [config.timeout=120000] - Request timeout
   * @param {string} [config.keepAlive='5m'] - Keep model loaded duration
   */
  constructor(config = {}) {
    super({
      ...OLLAMA_DEFAULTS,
      ...config,
    });
    this.name = 'ollama';
    this.baseUrl = this.config.baseUrl;
    this.availableModels = [];
  }

  /**
   * Initialize the provider
   * Verifies Ollama is running and lists available models
   * @returns {Promise<void>}
   */
  async initialize() {
    await this.refreshModels();
    await super.initialize();
  }

  /**
   * Refresh the list of available models
   * @returns {Promise<string[]>} List of model names
   */
  async refreshModels() {
    try {
      const response = await this._fetch('/api/tags', { method: 'GET' });
      const data = await response.json();
      this.availableModels = (data.models || []).map((m) => m.name);
      return this.availableModels;
    } catch (error) {
      this.availableModels = [];
      throw new Error(`Failed to connect to Ollama: ${error.message}`);
    }
  }

  /**
   * Check if Ollama is available
   * @returns {Promise<boolean>} Availability status
   */
  async isAvailable() {
    try {
      const response = await this._fetch('/api/tags', {
        method: 'GET',
        timeout: 5000,
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Complete a prompt
   * @param {string} prompt - The prompt
   * @param {Object} [options={}] - Completion options
   * @returns {Promise<LLMCompletionResult>} Completion result
   */
  async complete(prompt, options = {}) {
    const model = options.model || this.config.model;
    const messages = this.formatMessages(options.systemPrompt, prompt);

    const requestBody = {
      model,
      messages,
      stream: false,
      options: {
        temperature: options.temperature ?? this.config.temperature,
        num_predict: options.maxTokens ?? this.config.maxTokens,
      },
    };

    if (this.config.keepAlive) {
      requestBody.keep_alive = this.config.keepAlive;
    }

    const startTime = Date.now();
    const response = await this._fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;

    return {
      content: data.message?.content || '',
      model: data.model || model,
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
      finishReason: data.done ? 'stop' : 'unknown',
      metadata: {
        provider: 'ollama',
        duration,
        evalDuration: data.eval_duration,
        loadDuration: data.load_duration,
      },
    };
  }

  /**
   * Stream a completion
   * @param {string} prompt - The prompt
   * @param {Object} [options={}] - Completion options
   * @returns {AsyncGenerator<string>} Stream of tokens
   */
  async *stream(prompt, options = {}) {
    const model = options.model || this.config.model;
    const messages = this.formatMessages(options.systemPrompt, prompt);

    const requestBody = {
      model,
      messages,
      stream: true,
      options: {
        temperature: options.temperature ?? this.config.temperature,
        num_predict: options.maxTokens ?? this.config.maxTokens,
      },
    };

    const response = await this._fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${error}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter((line) => line.trim());

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.message?.content) {
            yield data.message.content;
          }
        } catch {
          // Ignore JSON parse errors for incomplete chunks
        }
      }
    }
  }

  /**
   * Generate embeddings
   * @param {string} text - Text to embed
   * @param {Object} [options={}] - Embedding options
   * @returns {Promise<number[]>} Embedding vector
   */
  async embed(text, options = {}) {
    const model = options.model || 'nomic-embed-text';

    const response = await this._fetch('/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: text }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama embedding error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.embedding;
  }

  /**
   * Pull a model from Ollama registry
   * @param {string} modelName - Model to pull
   * @param {Function} [onProgress] - Progress callback
   * @returns {Promise<void>}
   */
  async pullModel(modelName, onProgress) {
    const response = await this._fetch('/api/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to pull model: ${error}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter((line) => line.trim());

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (onProgress) {
            onProgress({
              status: data.status,
              total: data.total,
              completed: data.completed,
            });
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    await this.refreshModels();
  }

  /**
   * Get information about a model
   * @param {string} modelName - Model name
   * @returns {Promise<Object>} Model information
   */
  async getModelInfo(modelName) {
    const response = await this._fetch('/api/show', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
    });

    if (!response.ok) {
      throw new Error(`Model not found: ${modelName}`);
    }

    const data = await response.json();
    const preset = MODEL_PRESETS[modelName.split(':')[0]] || {};

    return {
      name: modelName,
      license: data.license,
      modelfile: data.modelfile,
      parameters: data.parameters,
      template: data.template,
      details: data.details,
      ...preset,
    };
  }

  /**
   * Delete a model
   * @param {string} modelName - Model to delete
   * @returns {Promise<void>}
   */
  async deleteModel(modelName) {
    const response = await this._fetch('/api/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete model: ${error}`);
    }

    await this.refreshModels();
  }

  /**
   * Get list of available models
   * @returns {string[]} Model names
   */
  getAvailableModels() {
    return [...this.availableModels];
  }

  /**
   * Get model presets
   * @returns {Object} Model presets
   */
  getModelPresets() {
    return { ...MODEL_PRESETS };
  }

  /**
   * Get provider information
   * @returns {Object} Provider info
   */
  getInfo() {
    return {
      ...super.getInfo(),
      name: 'ollama',
      baseUrl: this.baseUrl,
      availableModels: this.availableModels,
      capabilities: {
        completion: true,
        embedding: true,
        streaming: true,
        functionCalling: false,
        localOnly: true,
      },
    };
  }

  /**
   * Internal fetch wrapper
   * @private
   */
  async _fetch(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const timeout = options.timeout || this.config.timeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

module.exports = { OllamaProvider, MODEL_PRESETS, OLLAMA_DEFAULTS };
