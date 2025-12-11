/**
 * Advanced AI Capabilities Module
 *
 * Phase 6 P1: Multi-Model Orchestration, Context Management, RAG Integration
 *
 * @module ai
 */

'use strict';

// ============================================================
// Model Configuration
// ============================================================

/**
 * Supported AI providers
 */
const AIProvider = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  AZURE_OPENAI: 'azure-openai',
  GOOGLE: 'google',
  LOCAL: 'local',
  CUSTOM: 'custom',
};

/**
 * Task types for model routing
 */
const TaskType = {
  CODE_GENERATION: 'code_generation',
  CODE_REVIEW: 'code_review',
  CODE_EXPLANATION: 'code_explanation',
  REQUIREMENTS_ANALYSIS: 'requirements_analysis',
  DESIGN_GENERATION: 'design_generation',
  TEST_GENERATION: 'test_generation',
  DOCUMENTATION: 'documentation',
  REFACTORING: 'refactoring',
  DEBUGGING: 'debugging',
  CHAT: 'chat',
};

/**
 * Model capability levels
 */
const ModelCapability = {
  BASIC: 'basic',
  STANDARD: 'standard',
  ADVANCED: 'advanced',
  EXPERT: 'expert',
};

// ============================================================
// Model Registry
// ============================================================

/**
 * Configuration for a single model
 */
class ModelConfig {
  constructor(options = {}) {
    this.id = options.id || `model_${Date.now()}`;
    this.name = options.name || 'Unknown Model';
    this.provider = options.provider || AIProvider.OPENAI;
    this.modelId = options.modelId || 'gpt-4';
    this.capability = options.capability || ModelCapability.STANDARD;
    this.maxTokens = options.maxTokens || 4096;
    this.contextWindow = options.contextWindow || 8192;
    this.costPerInputToken = options.costPerInputToken || 0.00003;
    this.costPerOutputToken = options.costPerOutputToken || 0.00006;
    this.supportedTasks = options.supportedTasks || Object.values(TaskType);
    this.metadata = options.metadata || {};
  }

  /**
   * Check if model supports a task
   */
  supportsTask(taskType) {
    return this.supportedTasks.includes(taskType);
  }

  /**
   * Calculate estimated cost for tokens
   */
  estimateCost(inputTokens, outputTokens) {
    return inputTokens * this.costPerInputToken + outputTokens * this.costPerOutputToken;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      provider: this.provider,
      modelId: this.modelId,
      capability: this.capability,
      maxTokens: this.maxTokens,
      contextWindow: this.contextWindow,
      costPerInputToken: this.costPerInputToken,
      costPerOutputToken: this.costPerOutputToken,
      supportedTasks: this.supportedTasks,
    };
  }
}

/**
 * Registry of available models
 */
class ModelRegistry {
  constructor() {
    this.models = new Map();
    this.defaultModels = new Map();
    this._initializeDefaults();
  }

  _initializeDefaults() {
    // OpenAI models
    this.register(
      new ModelConfig({
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: AIProvider.OPENAI,
        modelId: 'gpt-4o',
        capability: ModelCapability.EXPERT,
        contextWindow: 128000,
        maxTokens: 4096,
        costPerInputToken: 0.000005,
        costPerOutputToken: 0.000015,
      })
    );

    this.register(
      new ModelConfig({
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: AIProvider.OPENAI,
        modelId: 'gpt-4o-mini',
        capability: ModelCapability.STANDARD,
        contextWindow: 128000,
        maxTokens: 16384,
        costPerInputToken: 0.00000015,
        costPerOutputToken: 0.0000006,
      })
    );

    // Anthropic models
    this.register(
      new ModelConfig({
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: AIProvider.ANTHROPIC,
        modelId: 'claude-3-5-sonnet-20241022',
        capability: ModelCapability.EXPERT,
        contextWindow: 200000,
        maxTokens: 8192,
        costPerInputToken: 0.000003,
        costPerOutputToken: 0.000015,
      })
    );

    this.register(
      new ModelConfig({
        id: 'claude-3-haiku',
        name: 'Claude 3 Haiku',
        provider: AIProvider.ANTHROPIC,
        modelId: 'claude-3-haiku-20240307',
        capability: ModelCapability.BASIC,
        contextWindow: 200000,
        maxTokens: 4096,
        costPerInputToken: 0.00000025,
        costPerOutputToken: 0.00000125,
      })
    );

    // Set defaults per task
    this.setDefaultForTask(TaskType.CODE_GENERATION, 'claude-3-5-sonnet');
    this.setDefaultForTask(TaskType.CODE_REVIEW, 'gpt-4o');
    this.setDefaultForTask(TaskType.CHAT, 'gpt-4o-mini');
    this.setDefaultForTask(TaskType.DOCUMENTATION, 'claude-3-haiku');
  }

  /**
   * Register a model
   */
  register(model) {
    this.models.set(model.id, model);
  }

  /**
   * Get a model by ID
   */
  get(modelId) {
    return this.models.get(modelId);
  }

  /**
   * List all registered models
   */
  list() {
    return Array.from(this.models.values());
  }

  /**
   * Set default model for a task type
   */
  setDefaultForTask(taskType, modelId) {
    this.defaultModels.set(taskType, modelId);
  }

  /**
   * Get default model for a task
   */
  getDefaultForTask(taskType) {
    const modelId = this.defaultModels.get(taskType);
    return modelId ? this.get(modelId) : this.list()[0];
  }

  /**
   * Find models by capability
   */
  findByCapability(capability) {
    return this.list().filter(m => m.capability === capability);
  }

  /**
   * Find models supporting a task
   */
  findByTask(taskType) {
    return this.list().filter(m => m.supportsTask(taskType));
  }
}

// ============================================================
// Model Router
// ============================================================

/**
 * Routes tasks to appropriate models
 */
class ModelRouter {
  constructor(options = {}) {
    this.registry = options.registry || new ModelRegistry();
    this.routingRules = new Map();
    this.fallbackModel = options.fallbackModel || 'gpt-4o-mini';
    this.costOptimize = options.costOptimize !== false;
  }

  /**
   * Add a custom routing rule
   */
  addRule(condition, modelId) {
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.routingRules.set(ruleId, { condition, modelId });
    return ruleId;
  }

  /**
   * Remove a routing rule
   */
  removeRule(ruleId) {
    return this.routingRules.delete(ruleId);
  }

  /**
   * Route a task to the best model
   */
  route(task) {
    const { taskType, complexity, tokens, preferences } = task;

    // Check custom rules first
    for (const [, rule] of this.routingRules) {
      if (rule.condition(task)) {
        const model = this.registry.get(rule.modelId);
        if (model) return model;
      }
    }

    // Check preferences
    if (preferences?.modelId) {
      const model = this.registry.get(preferences.modelId);
      if (model && model.supportsTask(taskType)) {
        return model;
      }
    }

    // Find suitable models
    const candidates = this.registry.findByTask(taskType);
    if (candidates.length === 0) {
      return this.registry.get(this.fallbackModel);
    }

    // Filter by context window
    const filtered = tokens ? candidates.filter(m => m.contextWindow >= tokens) : candidates;

    if (filtered.length === 0) {
      // Return largest context window if none fit
      return candidates.sort((a, b) => b.contextWindow - a.contextWindow)[0];
    }

    // Sort by capability/cost
    const sorted = filtered.sort((a, b) => {
      // Match complexity to capability
      const complexityOrder = { low: 0, medium: 1, high: 2, expert: 3 };
      const capabilityOrder = {
        [ModelCapability.BASIC]: 0,
        [ModelCapability.STANDARD]: 1,
        [ModelCapability.ADVANCED]: 2,
        [ModelCapability.EXPERT]: 3,
      };

      const targetLevel = complexityOrder[complexity] ?? 1;
      const aLevel = capabilityOrder[a.capability];
      const bLevel = capabilityOrder[b.capability];

      // Prefer closest match
      const aDist = Math.abs(aLevel - targetLevel);
      const bDist = Math.abs(bLevel - targetLevel);

      if (aDist !== bDist) return aDist - bDist;

      // If equal, prefer cheaper
      if (this.costOptimize) {
        return a.costPerInputToken - b.costPerInputToken;
      }

      return 0;
    });

    return sorted[0];
  }

  /**
   * Route multiple tasks
   */
  routeMany(tasks) {
    return tasks.map(task => ({
      task,
      model: this.route(task),
    }));
  }
}

// ============================================================
// Context Window Manager
// ============================================================

/**
 * Manages context window for large inputs
 */
class ContextWindowManager {
  constructor(options = {}) {
    this.defaultChunkSize = options.chunkSize || 4000;
    this.overlapTokens = options.overlap || 200;
    this.tokensPerChar = options.tokensPerChar || 0.25;
  }

  /**
   * Estimate tokens for text
   */
  estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length * this.tokensPerChar);
  }

  /**
   * Check if text fits in context window
   */
  fits(text, contextWindow) {
    return this.estimateTokens(text) <= contextWindow;
  }

  /**
   * Chunk text for processing
   */
  chunk(text, maxTokens = this.defaultChunkSize) {
    if (!text) return [];

    const tokens = this.estimateTokens(text);
    if (tokens <= maxTokens) {
      return [{ text, tokens, index: 0, total: 1 }];
    }

    const chunks = [];
    const charsPerChunk = Math.floor(maxTokens / this.tokensPerChar);
    const overlapChars = Math.floor(this.overlapTokens / this.tokensPerChar);

    let start = 0;
    let index = 0;

    while (start < text.length) {
      const end = Math.min(start + charsPerChunk, text.length);
      const chunkText = text.slice(start, end);

      chunks.push({
        text: chunkText,
        tokens: this.estimateTokens(chunkText),
        index,
        startOffset: start,
        endOffset: end,
      });

      start = end - overlapChars;
      if (start >= text.length - overlapChars) break;
      index++;
    }

    // Update total count
    chunks.forEach(c => (c.total = chunks.length));

    return chunks;
  }

  /**
   * Smart chunk by semantic boundaries
   */
  chunkSemantic(text, maxTokens = this.defaultChunkSize) {
    if (!text) return [];

    const tokens = this.estimateTokens(text);
    if (tokens <= maxTokens) {
      return [{ text, tokens, index: 0, total: 1 }];
    }

    const chunks = [];
    const separators = ['\n\n', '\n', '. ', '; ', ', ', ' '];

    let remaining = text;
    let index = 0;
    let offset = 0;

    while (remaining.length > 0) {
      const targetChars = Math.floor(maxTokens / this.tokensPerChar);

      if (this.estimateTokens(remaining) <= maxTokens) {
        chunks.push({
          text: remaining,
          tokens: this.estimateTokens(remaining),
          index,
          startOffset: offset,
          endOffset: offset + remaining.length,
        });
        break;
      }

      // Find best split point
      let splitIndex = targetChars;
      for (const sep of separators) {
        const lastSep = remaining.lastIndexOf(sep, targetChars);
        if (lastSep > targetChars * 0.5) {
          splitIndex = lastSep + sep.length;
          break;
        }
      }

      const chunkText = remaining.slice(0, splitIndex);
      chunks.push({
        text: chunkText,
        tokens: this.estimateTokens(chunkText),
        index,
        startOffset: offset,
        endOffset: offset + splitIndex,
      });

      offset += splitIndex;
      remaining = remaining.slice(splitIndex);
      index++;
    }

    chunks.forEach(c => (c.total = chunks.length));
    return chunks;
  }

  /**
   * Prioritize chunks by relevance
   */
  prioritize(chunks, query, topK = 5) {
    if (!query || chunks.length <= topK) return chunks;

    const queryWords = new Set(query.toLowerCase().split(/\s+/));

    const scored = chunks.map(chunk => {
      const words = chunk.text.toLowerCase().split(/\s+/);
      const matches = words.filter(w => queryWords.has(w)).length;
      return { ...chunk, relevance: matches / words.length };
    });

    return scored.sort((a, b) => b.relevance - a.relevance).slice(0, topK);
  }
}

// ============================================================
// RAG (Retrieval Augmented Generation) Support
// ============================================================

/**
 * Simple in-memory vector store for code embeddings
 */
class CodeVectorStore {
  constructor(options = {}) {
    this.dimensions = options.dimensions || 1536;
    this.documents = new Map();
    this.embeddings = new Map();
    this.metadata = new Map();
  }

  /**
   * Add a document with embedding
   */
  add(id, document, embedding, meta = {}) {
    this.documents.set(id, document);
    this.embeddings.set(id, embedding);
    this.metadata.set(id, {
      ...meta,
      addedAt: new Date().toISOString(),
    });
  }

  /**
   * Remove a document
   */
  remove(id) {
    this.documents.delete(id);
    this.embeddings.delete(id);
    this.metadata.delete(id);
  }

  /**
   * Get a document by ID
   */
  get(id) {
    return {
      document: this.documents.get(id),
      embedding: this.embeddings.get(id),
      metadata: this.metadata.get(id),
    };
  }

  /**
   * Calculate cosine similarity
   */
  _cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Search for similar documents
   */
  search(queryEmbedding, topK = 5, threshold = 0.7) {
    const results = [];

    for (const [id, embedding] of this.embeddings) {
      const similarity = this._cosineSimilarity(queryEmbedding, embedding);
      if (similarity >= threshold) {
        results.push({
          id,
          document: this.documents.get(id),
          metadata: this.metadata.get(id),
          similarity,
        });
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  }

  /**
   * Get store statistics
   */
  getStats() {
    return {
      documentCount: this.documents.size,
      dimensions: this.dimensions,
    };
  }

  /**
   * Clear the store
   */
  clear() {
    this.documents.clear();
    this.embeddings.clear();
    this.metadata.clear();
  }
}

/**
 * RAG Pipeline for code knowledge retrieval
 */
class RAGPipeline {
  constructor(options = {}) {
    this.vectorStore = options.vectorStore || new CodeVectorStore();
    this.contextManager = options.contextManager || new ContextWindowManager();
    this.embeddingProvider = options.embeddingProvider || null;
    this.topK = options.topK || 5;
    this.threshold = options.threshold || 0.7;
  }

  /**
   * Index code documents
   */
  async index(documents, embeddingFn) {
    const indexed = [];

    for (const doc of documents) {
      const embedding = embeddingFn
        ? await embeddingFn(doc.content)
        : this._mockEmbedding(doc.content);

      this.vectorStore.add(doc.id, doc.content, embedding, {
        path: doc.path,
        type: doc.type,
        language: doc.language,
      });

      indexed.push(doc.id);
    }

    return { indexed: indexed.length };
  }

  /**
   * Generate mock embedding (for testing)
   */
  _mockEmbedding(text) {
    const embedding = new Array(this.vectorStore.dimensions).fill(0);
    const words = text.toLowerCase().split(/\s+/);

    for (let i = 0; i < words.length; i++) {
      const hash = this._simpleHash(words[i]);
      const idx = Math.abs(hash) % this.vectorStore.dimensions;
      embedding[idx] += 1;
    }

    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= norm;
      }
    }

    return embedding;
  }

  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  /**
   * Retrieve relevant context for a query
   */
  async retrieve(query, embeddingFn) {
    const queryEmbedding = embeddingFn ? await embeddingFn(query) : this._mockEmbedding(query);

    return this.vectorStore.search(queryEmbedding, this.topK, this.threshold);
  }

  /**
   * Augment prompt with retrieved context
   */
  async augment(query, prompt, embeddingFn) {
    const retrieved = await this.retrieve(query, embeddingFn);

    if (retrieved.length === 0) {
      return { prompt, context: [] };
    }

    const contextParts = retrieved.map(
      r =>
        `### ${r.metadata?.path || r.id}\n\`\`\`${r.metadata?.language || ''}\n${r.document}\n\`\`\``
    );

    const augmentedPrompt = `## Relevant Code Context\n\n${contextParts.join('\n\n')}\n\n---\n\n${prompt}`;

    return {
      prompt: augmentedPrompt,
      context: retrieved,
      tokens: this.contextManager.estimateTokens(augmentedPrompt),
    };
  }

  /**
   * Get pipeline stats
   */
  getStats() {
    return {
      store: this.vectorStore.getStats(),
      topK: this.topK,
      threshold: this.threshold,
    };
  }
}

// ============================================================
// AI Session Manager
// ============================================================

/**
 * Manages AI interaction sessions
 */
class AISessionManager {
  constructor(options = {}) {
    this.sessions = new Map();
    this.maxHistory = options.maxHistory || 50;
    this.contextManager = options.contextManager || new ContextWindowManager();
  }

  /**
   * Create a new session
   */
  create(options = {}) {
    const id = options.id || `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const session = {
      id,
      model: options.model || null,
      history: [],
      context: options.context || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalTokens: 0,
    };

    this.sessions.set(id, session);
    return session;
  }

  /**
   * Get a session
   */
  get(sessionId) {
    return this.sessions.get(sessionId);
  }

  /**
   * Add message to session history
   */
  addMessage(sessionId, role, content, tokens = 0) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.history.push({
      role,
      content,
      tokens,
      timestamp: new Date().toISOString(),
    });

    session.totalTokens += tokens;
    session.updatedAt = new Date().toISOString();

    // Trim history if needed
    while (session.history.length > this.maxHistory) {
      const removed = session.history.shift();
      session.totalTokens -= removed.tokens;
    }

    return session;
  }

  /**
   * Get session history formatted for API
   */
  getHistory(sessionId, maxTokens) {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    if (!maxTokens) return session.history;

    // Return as many recent messages as fit
    const messages = [];
    let tokens = 0;

    for (let i = session.history.length - 1; i >= 0; i--) {
      const msg = session.history[i];
      if (tokens + msg.tokens > maxTokens) break;
      messages.unshift(msg);
      tokens += msg.tokens;
    }

    return messages;
  }

  /**
   * Clear session history
   */
  clearHistory(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.history = [];
    session.totalTokens = 0;
    session.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Delete a session
   */
  delete(sessionId) {
    return this.sessions.delete(sessionId);
  }

  /**
   * List all sessions
   */
  list() {
    return Array.from(this.sessions.values()).map(s => ({
      id: s.id,
      messageCount: s.history.length,
      totalTokens: s.totalTokens,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }
}

// ============================================================
// Default Instances
// ============================================================

const defaultModelRegistry = new ModelRegistry();
const defaultModelRouter = new ModelRouter({ registry: defaultModelRegistry });
const defaultContextManager = new ContextWindowManager();
const defaultVectorStore = new CodeVectorStore();
const defaultRAGPipeline = new RAGPipeline({
  vectorStore: defaultVectorStore,
  contextManager: defaultContextManager,
});
const defaultSessionManager = new AISessionManager({
  contextManager: defaultContextManager,
});

// ============================================================
// Exports
// ============================================================

module.exports = {
  // Constants
  AIProvider,
  TaskType,
  ModelCapability,

  // Classes
  ModelConfig,
  ModelRegistry,
  ModelRouter,
  ContextWindowManager,
  CodeVectorStore,
  RAGPipeline,
  AISessionManager,

  // Default instances
  defaultModelRegistry,
  defaultModelRouter,
  defaultContextManager,
  defaultVectorStore,
  defaultRAGPipeline,
  defaultSessionManager,
};
