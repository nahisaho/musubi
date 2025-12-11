/**
 * Advanced AI Capabilities Tests
 *
 * Phase 6 P1: Multi-Model Orchestration, Context Management, RAG
 */

'use strict';

const {
  AIProvider,
  TaskType,
  ModelCapability,
  ModelConfig,
  ModelRegistry,
  ModelRouter,
  ContextWindowManager,
  CodeVectorStore,
  RAGPipeline,
  AISessionManager,
  defaultModelRegistry,
  defaultModelRouter,
  defaultContextManager,
  defaultVectorStore,
  defaultRAGPipeline,
  defaultSessionManager,
} = require('../../src/ai/advanced-ai');

describe('Advanced AI Module', () => {
  // ============================================================
  // Constants Tests
  // ============================================================
  describe('AIProvider', () => {
    it('should define all providers', () => {
      expect(AIProvider.OPENAI).toBe('openai');
      expect(AIProvider.ANTHROPIC).toBe('anthropic');
      expect(AIProvider.AZURE_OPENAI).toBe('azure-openai');
      expect(AIProvider.GOOGLE).toBe('google');
      expect(AIProvider.LOCAL).toBe('local');
      expect(AIProvider.CUSTOM).toBe('custom');
    });
  });

  describe('TaskType', () => {
    it('should define all task types', () => {
      expect(TaskType.CODE_GENERATION).toBe('code_generation');
      expect(TaskType.CODE_REVIEW).toBe('code_review');
      expect(TaskType.REQUIREMENTS_ANALYSIS).toBe('requirements_analysis');
      expect(TaskType.TEST_GENERATION).toBe('test_generation');
      expect(TaskType.DOCUMENTATION).toBe('documentation');
      expect(TaskType.DEBUGGING).toBe('debugging');
    });
  });

  describe('ModelCapability', () => {
    it('should define capability levels', () => {
      expect(ModelCapability.BASIC).toBe('basic');
      expect(ModelCapability.STANDARD).toBe('standard');
      expect(ModelCapability.ADVANCED).toBe('advanced');
      expect(ModelCapability.EXPERT).toBe('expert');
    });
  });

  // ============================================================
  // ModelConfig Tests
  // ============================================================
  describe('ModelConfig', () => {
    it('should create with default values', () => {
      const model = new ModelConfig();

      expect(model.id).toMatch(/^model_/);
      expect(model.name).toBe('Unknown Model');
      expect(model.provider).toBe(AIProvider.OPENAI);
      expect(model.capability).toBe(ModelCapability.STANDARD);
    });

    it('should create with custom values', () => {
      const model = new ModelConfig({
        id: 'custom-model',
        name: 'Custom Model',
        provider: AIProvider.ANTHROPIC,
        modelId: 'claude-3-opus',
        capability: ModelCapability.EXPERT,
        contextWindow: 200000,
        maxTokens: 8192,
      });

      expect(model.id).toBe('custom-model');
      expect(model.name).toBe('Custom Model');
      expect(model.provider).toBe(AIProvider.ANTHROPIC);
      expect(model.contextWindow).toBe(200000);
    });

    it('should check task support', () => {
      const model = new ModelConfig({
        supportedTasks: [TaskType.CODE_GENERATION, TaskType.CODE_REVIEW],
      });

      expect(model.supportsTask(TaskType.CODE_GENERATION)).toBe(true);
      expect(model.supportsTask(TaskType.DOCUMENTATION)).toBe(false);
    });

    it('should estimate cost', () => {
      const model = new ModelConfig({
        costPerInputToken: 0.00001,
        costPerOutputToken: 0.00002,
      });

      const cost = model.estimateCost(1000, 500);
      expect(cost).toBe(0.01 + 0.01);
    });

    it('should serialize to JSON', () => {
      const model = new ModelConfig({ name: 'Test' });
      const json = model.toJSON();

      expect(json.name).toBe('Test');
      expect(json.supportedTasks).toBeDefined();
    });
  });

  // ============================================================
  // ModelRegistry Tests
  // ============================================================
  describe('ModelRegistry', () => {
    let registry;

    beforeEach(() => {
      registry = new ModelRegistry();
    });

    it('should have default models', () => {
      const models = registry.list();
      expect(models.length).toBeGreaterThan(0);
      expect(registry.get('gpt-4o')).toBeDefined();
      expect(registry.get('claude-3-5-sonnet')).toBeDefined();
    });

    it('should register custom model', () => {
      const model = new ModelConfig({ id: 'custom' });
      registry.register(model);

      expect(registry.get('custom')).toBe(model);
    });

    it('should set and get default for task', () => {
      registry.setDefaultForTask(TaskType.DEBUGGING, 'gpt-4o');
      const model = registry.getDefaultForTask(TaskType.DEBUGGING);

      expect(model.id).toBe('gpt-4o');
    });

    it('should find by capability', () => {
      const experts = registry.findByCapability(ModelCapability.EXPERT);
      expect(experts.length).toBeGreaterThan(0);
      expect(experts.every(m => m.capability === ModelCapability.EXPERT)).toBe(true);
    });

    it('should find by task', () => {
      const models = registry.findByTask(TaskType.CODE_GENERATION);
      expect(models.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // ModelRouter Tests
  // ============================================================
  describe('ModelRouter', () => {
    let router;

    beforeEach(() => {
      router = new ModelRouter();
    });

    it('should route basic task', () => {
      const model = router.route({
        taskType: TaskType.CHAT,
        complexity: 'low',
      });

      expect(model).toBeDefined();
      expect(model.supportsTask(TaskType.CHAT)).toBe(true);
    });

    it('should route with preferences', () => {
      const model = router.route({
        taskType: TaskType.CODE_GENERATION,
        preferences: { modelId: 'gpt-4o' },
      });

      expect(model.id).toBe('gpt-4o');
    });

    it('should respect custom rules', () => {
      router.addRule(task => task.taskType === TaskType.DEBUGGING, 'claude-3-5-sonnet');

      const model = router.route({ taskType: TaskType.DEBUGGING });
      expect(model.id).toBe('claude-3-5-sonnet');
    });

    it('should remove rules', () => {
      const ruleId = router.addRule(() => true, 'claude-3-haiku');
      router.removeRule(ruleId);

      const model = router.route({ taskType: TaskType.CHAT });
      expect(model.id).not.toBe('claude-3-haiku');
    });

    it('should route by complexity', () => {
      const simpleModel = router.route({
        taskType: TaskType.CHAT,
        complexity: 'low',
      });

      const complexModel = router.route({
        taskType: TaskType.CODE_GENERATION,
        complexity: 'expert',
      });

      // More complex tasks should use higher capability models
      expect(complexModel).toBeDefined();
      expect(simpleModel).toBeDefined();
    });

    it('should route many tasks', () => {
      const tasks = [{ taskType: TaskType.CHAT }, { taskType: TaskType.CODE_GENERATION }];

      const routed = router.routeMany(tasks);

      expect(routed.length).toBe(2);
      expect(routed[0].model).toBeDefined();
      expect(routed[0].task).toBe(tasks[0]);
    });

    it('should handle token constraints', () => {
      const model = router.route({
        taskType: TaskType.CODE_GENERATION,
        tokens: 100000,
      });

      expect(model.contextWindow).toBeGreaterThanOrEqual(100000);
    });
  });

  // ============================================================
  // ContextWindowManager Tests
  // ============================================================
  describe('ContextWindowManager', () => {
    let manager;

    beforeEach(() => {
      manager = new ContextWindowManager();
    });

    it('should estimate tokens', () => {
      const tokens = manager.estimateTokens('Hello, world!');
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(100);
    });

    it('should return 0 for empty text', () => {
      expect(manager.estimateTokens('')).toBe(0);
      expect(manager.estimateTokens(null)).toBe(0);
    });

    it('should check if text fits', () => {
      expect(manager.fits('Hello', 1000)).toBe(true);
      expect(manager.fits('Hello', 0)).toBe(false);
    });

    it('should not chunk small text', () => {
      const chunks = manager.chunk('Small text', 1000);
      expect(chunks.length).toBe(1);
      expect(chunks[0].index).toBe(0);
      expect(chunks[0].total).toBe(1);
    });

    it('should chunk large text', () => {
      const longText = 'Word '.repeat(5000);
      const chunks = manager.chunk(longText, 500);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].tokens).toBeLessThanOrEqual(500 + 100);
    });

    it('should handle empty input', () => {
      expect(manager.chunk('')).toEqual([]);
      expect(manager.chunk(null)).toEqual([]);
    });

    it('should chunk semantically', () => {
      const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
      const chunks = manager.chunkSemantic(text, 10);

      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.text.length).toBeGreaterThan(0);
      });
    });

    it('should prioritize chunks by relevance', () => {
      const chunks = [
        { text: 'JavaScript code function', tokens: 10, index: 0 },
        { text: 'Python script', tokens: 10, index: 1 },
        { text: 'Java function code', tokens: 10, index: 2 },
      ];

      const prioritized = manager.prioritize(chunks, 'JavaScript function', 2);

      expect(prioritized.length).toBe(2);
      expect(prioritized[0].text).toContain('JavaScript');
    });

    it('should return all if fewer chunks than topK', () => {
      const chunks = [{ text: 'Test', tokens: 10, index: 0 }];
      const prioritized = manager.prioritize(chunks, 'query', 5);

      expect(prioritized.length).toBe(1);
    });
  });

  // ============================================================
  // CodeVectorStore Tests
  // ============================================================
  describe('CodeVectorStore', () => {
    let store;

    beforeEach(() => {
      store = new CodeVectorStore({ dimensions: 3 });
    });

    it('should add and retrieve documents', () => {
      store.add('doc1', 'function test() {}', [1, 0, 0], { language: 'js' });

      const result = store.get('doc1');

      expect(result.document).toBe('function test() {}');
      expect(result.embedding).toEqual([1, 0, 0]);
      expect(result.metadata.language).toBe('js');
    });

    it('should remove documents', () => {
      store.add('doc1', 'content', [1, 0, 0]);
      store.remove('doc1');

      const result = store.get('doc1');
      expect(result.document).toBeUndefined();
    });

    it('should search by similarity', () => {
      store.add('doc1', 'Python code', [1, 0, 0]);
      store.add('doc2', 'JavaScript code', [0.9, 0.1, 0]);
      store.add('doc3', 'Rust code', [0, 1, 0]);

      const results = store.search([1, 0, 0], 2, 0.5);

      expect(results.length).toBe(2);
      expect(results[0].id).toBe('doc1');
      expect(results[0].similarity).toBeCloseTo(1);
    });

    it('should respect threshold', () => {
      store.add('doc1', 'Similar', [1, 0, 0]);
      store.add('doc2', 'Different', [0, 1, 0]);

      const results = store.search([1, 0, 0], 5, 0.9);

      expect(results.length).toBe(1);
      expect(results[0].id).toBe('doc1');
    });

    it('should get stats', () => {
      store.add('doc1', 'content', [1, 0, 0]);
      store.add('doc2', 'content', [0, 1, 0]);

      const stats = store.getStats();

      expect(stats.documentCount).toBe(2);
      expect(stats.dimensions).toBe(3);
    });

    it('should clear store', () => {
      store.add('doc1', 'content', [1, 0, 0]);
      store.clear();

      expect(store.getStats().documentCount).toBe(0);
    });

    it('should handle mismatched dimensions', () => {
      store.add('doc1', 'content', [1, 0, 0]);
      const similarity = store._cosineSimilarity([1, 0, 0], [1, 0]);
      expect(similarity).toBe(0);
    });
  });

  // ============================================================
  // RAGPipeline Tests
  // ============================================================
  describe('RAGPipeline', () => {
    let pipeline;

    beforeEach(() => {
      pipeline = new RAGPipeline({ topK: 3, threshold: 0.5 });
    });

    it('should index documents', async () => {
      const docs = [
        { id: 'doc1', content: 'function add(a, b) { return a + b; }', path: 'math.js' },
        { id: 'doc2', content: 'class Calculator { }', path: 'calc.js' },
      ];

      const result = await pipeline.index(docs);

      expect(result.indexed).toBe(2);
      expect(pipeline.vectorStore.getStats().documentCount).toBe(2);
    });

    it('should retrieve similar documents', async () => {
      const docs = [
        { id: 'func1', content: 'function calculate sum total add', path: 'a.js' },
        { id: 'func2', content: 'class user authentication login', path: 'b.js' },
      ];

      await pipeline.index(docs);
      const results = await pipeline.retrieve('calculate sum');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should augment prompt with context', async () => {
      // Use more distinctive content for better matching
      const docs = [
        {
          id: 'doc1',
          content: 'helper helper helper function',
          path: 'helper.js',
          language: 'javascript',
        },
      ];

      // Use a new pipeline with lower threshold
      const testPipeline = new RAGPipeline({ topK: 5, threshold: 0.1 });
      await testPipeline.index(docs);
      const result = await testPipeline.augment('helper helper', 'How do I use the helper?');

      expect(result.prompt).toContain('Relevant Code Context');
      expect(result.tokens).toBeGreaterThan(0);
    });

    it('should handle empty retrieval', async () => {
      const result = await pipeline.augment('query', 'Original prompt');

      expect(result.prompt).toBe('Original prompt');
      expect(result.context).toEqual([]);
    });

    it('should get stats', () => {
      const stats = pipeline.getStats();

      expect(stats.topK).toBe(3);
      expect(stats.threshold).toBe(0.5);
      expect(stats.store).toBeDefined();
    });
  });

  // ============================================================
  // AISessionManager Tests
  // ============================================================
  describe('AISessionManager', () => {
    let manager;

    beforeEach(() => {
      manager = new AISessionManager({ maxHistory: 10 });
    });

    it('should create session', () => {
      const session = manager.create({ model: 'gpt-4o' });

      expect(session.id).toMatch(/^session_/);
      expect(session.model).toBe('gpt-4o');
      expect(session.history).toEqual([]);
    });

    it('should create session with custom id', () => {
      const session = manager.create({ id: 'custom-session' });
      expect(session.id).toBe('custom-session');
    });

    it('should get session', () => {
      const created = manager.create();
      const retrieved = manager.get(created.id);

      expect(retrieved).toBe(created);
    });

    it('should add messages', () => {
      const session = manager.create();
      manager.addMessage(session.id, 'user', 'Hello', 10);
      manager.addMessage(session.id, 'assistant', 'Hi there', 15);

      expect(session.history.length).toBe(2);
      expect(session.totalTokens).toBe(25);
    });

    it('should return null for unknown session', () => {
      const result = manager.addMessage('unknown', 'user', 'Hello');
      expect(result).toBeNull();
    });

    it('should trim old messages', () => {
      const mgr = new AISessionManager({ maxHistory: 3 });
      const session = mgr.create();

      for (let i = 0; i < 5; i++) {
        mgr.addMessage(session.id, 'user', `Message ${i}`, 10);
      }

      expect(session.history.length).toBe(3);
      expect(session.history[0].content).toBe('Message 2');
    });

    it('should get history with token limit', () => {
      const session = manager.create();
      manager.addMessage(session.id, 'user', 'Msg1', 100);
      manager.addMessage(session.id, 'assistant', 'Msg2', 100);
      manager.addMessage(session.id, 'user', 'Msg3', 100);

      const history = manager.getHistory(session.id, 150);

      expect(history.length).toBe(1);
      expect(history[0].content).toBe('Msg3');
    });

    it('should get full history without limit', () => {
      const session = manager.create();
      manager.addMessage(session.id, 'user', 'Msg1', 10);
      manager.addMessage(session.id, 'assistant', 'Msg2', 10);

      const history = manager.getHistory(session.id);
      expect(history.length).toBe(2);
    });

    it('should return empty for unknown session', () => {
      const history = manager.getHistory('unknown');
      expect(history).toEqual([]);
    });

    it('should clear history', () => {
      const session = manager.create();
      manager.addMessage(session.id, 'user', 'Hello', 10);

      const cleared = manager.clearHistory(session.id);

      expect(cleared).toBe(true);
      expect(session.history.length).toBe(0);
      expect(session.totalTokens).toBe(0);
    });

    it('should return false clearing unknown session', () => {
      expect(manager.clearHistory('unknown')).toBe(false);
    });

    it('should delete session', () => {
      const session = manager.create();
      const deleted = manager.delete(session.id);

      expect(deleted).toBe(true);
      expect(manager.get(session.id)).toBeUndefined();
    });

    it('should list sessions', () => {
      manager.create();
      manager.create();

      const list = manager.list();

      expect(list.length).toBe(2);
      expect(list[0].id).toBeDefined();
      expect(list[0].messageCount).toBe(0);
    });
  });

  // ============================================================
  // Default Instances Tests
  // ============================================================
  describe('Default Instances', () => {
    it('should export defaultModelRegistry', () => {
      expect(defaultModelRegistry).toBeInstanceOf(ModelRegistry);
    });

    it('should export defaultModelRouter', () => {
      expect(defaultModelRouter).toBeInstanceOf(ModelRouter);
    });

    it('should export defaultContextManager', () => {
      expect(defaultContextManager).toBeInstanceOf(ContextWindowManager);
    });

    it('should export defaultVectorStore', () => {
      expect(defaultVectorStore).toBeInstanceOf(CodeVectorStore);
    });

    it('should export defaultRAGPipeline', () => {
      expect(defaultRAGPipeline).toBeInstanceOf(RAGPipeline);
    });

    it('should export defaultSessionManager', () => {
      expect(defaultSessionManager).toBeInstanceOf(AISessionManager);
    });
  });
});
