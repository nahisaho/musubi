/**
 * @fileoverview GitHub Copilot LM API Provider for MUSUBI Replanning Engine
 * @module llm-providers/copilot-provider
 * @version 1.0.0
 */

'use strict';

const { LLMProvider } = require('./base-provider');

/**
 * GitHub Copilot Language Model API Provider
 * Primary provider for MUSUBI when running in VS Code with GitHub Copilot
 */
class CopilotLMProvider extends LLMProvider {
  /**
   * Create a GitHub Copilot LM provider
   * @param {Object} config - Provider configuration
   * @param {Object} [config.vscode] - VS Code API reference
   * @param {string} [config.model='claude-sonnet-4'] - Model to use
   */
  constructor(config = {}) {
    super(config);
    this.name = 'github-copilot';
    this.vscode = config.vscode || null;
    this.config.model = config.model || 'claude-sonnet-4';
    this.languageModelAPI = null;
  }

  /**
   * Initialize the Copilot provider
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.vscode) {
      // When running in VS Code extension context
      this.languageModelAPI = this.vscode.lm;
    } else {
      // Try to get vscode module dynamically (for VS Code extension context)
      try {
        // This will only work when running inside VS Code
        const vscode = require('vscode');
        this.vscode = vscode;
        this.languageModelAPI = vscode.lm;
      } catch (e) {
        // Not running in VS Code context - use fallback or mock
        this.languageModelAPI = null;
      }
    }
    
    this.isInitialized = true;
  }

  /**
   * Complete a prompt using GitHub Copilot LM API
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

    // Use VS Code Language Model API if available
    if (this.languageModelAPI) {
      return this.completeWithVSCodeAPI(messages, options);
    }

    // Fallback: Use REST API if token is available
    if (process.env.GITHUB_COPILOT_TOKEN) {
      return this.completeWithRestAPI(messages, options);
    }

    throw new Error('GitHub Copilot LM API not available. Run inside VS Code with Copilot extension or provide GITHUB_COPILOT_TOKEN.');
  }

  /**
   * Complete using VS Code Language Model API
   * @param {Array<Message>} messages - Chat messages
   * @param {Object} options - Completion options
   * @returns {Promise<LLMCompletionResult>}
   * @private
   */
  async completeWithVSCodeAPI(messages, _options) {
    const vscode = this.vscode;
    
    // Select the appropriate model
    const models = await vscode.lm.selectChatModels({
      vendor: 'copilot',
      family: this.config.model
    });

    if (models.length === 0) {
      throw new Error(`No Copilot model found matching: ${this.config.model}`);
    }

    const model = models[0];

    // Convert messages to VS Code format
    const chatMessages = messages.map(msg => {
      if (msg.role === 'system') {
        return vscode.LanguageModelChatMessage.User(msg.content);
      } else if (msg.role === 'user') {
        return vscode.LanguageModelChatMessage.User(msg.content);
      } else {
        return vscode.LanguageModelChatMessage.Assistant(msg.content);
      }
    });

    // Create request options
    const requestOptions = {
      justification: 'MUSUBI Replanning Engine alternative path generation'
    };

    // Send request
    const response = await model.sendRequest(
      chatMessages,
      requestOptions,
      new vscode.CancellationTokenSource().token
    );

    // Collect response
    let content = '';
    for await (const fragment of response.text) {
      content += fragment;
    }

    return {
      content,
      model: model.id,
      usage: {
        promptTokens: 0, // VS Code API doesn't expose token counts
        completionTokens: 0,
        totalTokens: 0
      },
      finishReason: 'stop'
    };
  }

  /**
   * Complete using REST API (fallback)
   * @param {Array<Message>} messages - Chat messages
   * @param {Object} options - Completion options
   * @returns {Promise<LLMCompletionResult>}
   * @private
   */
  async completeWithRestAPI(messages, options) {
    const endpoint = process.env.GITHUB_COPILOT_ENDPOINT || 'https://api.githubcopilot.com/chat/completions';
    const token = process.env.GITHUB_COPILOT_TOKEN;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Editor-Version': 'MUSUBI/1.0.0',
        'Editor-Plugin-Version': 'MUSUBI/1.0.0'
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        max_tokens: options.maxTokens || this.config.maxTokens,
        temperature: options.temperature || this.config.temperature
      }),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub Copilot API error: ${response.status} - ${error}`);
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
  }

  /**
   * Generate embeddings (not supported by Copilot LM API)
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>}
   */
  async embed(_text) {
    throw new Error('Embedding not supported by GitHub Copilot LM API');
  }

  /**
   * Check if the provider is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Check VS Code LM API
      if (this.languageModelAPI) {
        const models = await this.vscode.lm.selectChatModels({
          vendor: 'copilot'
        });
        return models.length > 0;
      }

      // Check REST API token
      return !!process.env.GITHUB_COPILOT_TOKEN;
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
        functionCalling: false
      },
      context: this.languageModelAPI ? 'vscode' : 'rest'
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
4. Provide confidence scores for each alternative
5. Explain the reasoning behind each suggestion`;
  }
}

module.exports = { CopilotLMProvider };
