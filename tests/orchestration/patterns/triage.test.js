/**
 * Tests for TriagePattern
 * 
 * @module tests/orchestration/patterns/triage.test
 */

const {
  TriagePattern,
  TriageCategory,
  TriageStrategy,
  AgentCapability,
  TriageResult,
  DEFAULT_KEYWORD_MAPPINGS
} = require('../../../src/orchestration/patterns/triage');

const {
  HandoffPatternType,
  EscalationData
} = require('../../../src/orchestration/patterns/handoff');

const { ExecutionContext } = require('../../../src/orchestration/orchestration-engine');
const { BasePattern } = require('../../../src/orchestration/pattern-registry');

// Mock engine
const createMockEngine = (skills = {}) => ({
  skills: new Map(Object.entries(skills)),
  getSkill: jest.fn((name) => skills[name]),
  executeSkill: jest.fn(async (name, context) => ({
    skill: name,
    result: `Result from ${name}`,
    context: context.input
  })),
  emit: jest.fn()
});

// Mock agents
const createMockAgent = (name, executeResult = null) => ({
  name,
  execute: jest.fn(async (context) => executeResult || {
    agent: name,
    result: `Executed by ${name}`,
    input: context.input
  })
});

describe('TriagePattern', () => {
  let pattern;
  let engine;

  beforeEach(() => {
    pattern = new TriagePattern();
    engine = createMockEngine();
  });

  afterEach(() => {
    pattern.clearHistory();
  });

  describe('constructor', () => {
    test('should create pattern with default options', () => {
      expect(pattern.metadata.name).toBe(HandoffPatternType.TRIAGE);
      expect(pattern.metadata.type).toBe(HandoffPatternType.TRIAGE);
      expect(pattern.options.strategy).toBe(TriageStrategy.HYBRID);
      expect(pattern.options.defaultCategory).toBe(TriageCategory.GENERAL);
      expect(pattern.options.enableHandoff).toBe(true);
    });

    test('should accept custom options', () => {
      const customPattern = new TriagePattern({
        strategy: TriageStrategy.KEYWORD,
        defaultCategory: TriageCategory.SUPPORT,
        confidenceThreshold: 0.5
      });

      expect(customPattern.options.strategy).toBe(TriageStrategy.KEYWORD);
      expect(customPattern.options.defaultCategory).toBe(TriageCategory.SUPPORT);
      expect(customPattern.options.confidenceThreshold).toBe(0.5);
    });

    test('should extend BasePattern', () => {
      expect(pattern).toBeInstanceOf(BasePattern);
    });
  });

  describe('registerAgent', () => {
    test('should register agent with capabilities', () => {
      const agent = createMockAgent('billing-agent');
      
      pattern.registerAgent(agent, {
        categories: [TriageCategory.BILLING],
        keywords: ['invoice', 'payment']
      });

      expect(pattern.getRegisteredAgents().size).toBe(1);
      expect(pattern.getRegisteredAgents().has('billing-agent')).toBe(true);
    });

    test('should support chaining', () => {
      const agent1 = createMockAgent('agent1');
      const agent2 = createMockAgent('agent2');

      pattern
        .registerAgent(agent1, { categories: [TriageCategory.BILLING] })
        .registerAgent(agent2, { categories: [TriageCategory.SUPPORT] });

      expect(pattern.getRegisteredAgents().size).toBe(2);
    });

    test('should unregister agent', () => {
      const agent = createMockAgent('test-agent');
      pattern.registerAgent(agent, { categories: [TriageCategory.GENERAL] });
      
      expect(pattern.unregisterAgent(agent)).toBe(true);
      expect(pattern.getRegisteredAgents().size).toBe(0);
    });
  });

  describe('validate', () => {
    test('should validate valid context with registered agents', () => {
      const agent = createMockAgent('test-agent');
      pattern.registerAgent(agent, { categories: [TriageCategory.GENERAL] });

      const context = new ExecutionContext({
        input: {
          message: 'I need help'
        }
      });

      const result = pattern.validate(context, engine);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate valid context with provided agents', () => {
      const context = new ExecutionContext({
        input: {
          message: 'I need help',
          agents: [createMockAgent('test-agent')]
        }
      });

      const result = pattern.validate(context, engine);
      expect(result.valid).toBe(true);
    });

    test('should reject missing message', () => {
      const agent = createMockAgent('test-agent');
      pattern.registerAgent(agent, { categories: [TriageCategory.GENERAL] });

      const context = new ExecutionContext({
        input: {}
      });

      const result = pattern.validate(context, engine);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Triage pattern requires input.message, input.text, or input.query');
    });

    test('should reject missing agents', () => {
      const context = new ExecutionContext({
        input: {
          message: 'I need help'
        }
      });

      const result = pattern.validate(context, engine);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Triage pattern requires registered agents or input.agents');
    });

    test('should accept text or query as alternative to message', () => {
      const agent = createMockAgent('test-agent');
      pattern.registerAgent(agent, { categories: [TriageCategory.GENERAL] });

      const context1 = new ExecutionContext({ input: { text: 'Help' } });
      const context2 = new ExecutionContext({ input: { query: 'Help' } });

      expect(pattern.validate(context1, engine).valid).toBe(true);
      expect(pattern.validate(context2, engine).valid).toBe(true);
    });
  });

  describe('classifyRequest', () => {
    describe('KEYWORD strategy', () => {
      test('should classify billing keywords', async () => {
        const keywordPattern = new TriagePattern({ strategy: TriageStrategy.KEYWORD });
        
        const result = await keywordPattern.classifyRequest(
          'I have a question about my invoice',
          new ExecutionContext({ input: {} })
        );

        expect(result.category).toBe(TriageCategory.BILLING);
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.keywords.length).toBeGreaterThan(0);
      });

      test('should classify refund keywords', async () => {
        const keywordPattern = new TriagePattern({ strategy: TriageStrategy.KEYWORD });
        
        const result = await keywordPattern.classifyRequest(
          'I want a refund for my order',
          new ExecutionContext({ input: {} })
        );

        expect(result.category).toBe(TriageCategory.REFUND);
      });

      test('should classify support keywords', async () => {
        const keywordPattern = new TriagePattern({ strategy: TriageStrategy.KEYWORD });
        
        const result = await keywordPattern.classifyRequest(
          'I have a problem with my account not working',
          new ExecutionContext({ input: {} })
        );

        expect(result.category).toBe(TriageCategory.SUPPORT);
      });

      test('should return default category when no matches', async () => {
        const keywordPattern = new TriagePattern({ 
          strategy: TriageStrategy.KEYWORD,
          defaultCategory: TriageCategory.GENERAL
        });
        
        const result = await keywordPattern.classifyRequest(
          'Hello there',
          new ExecutionContext({ input: {} })
        );

        expect(result.category).toBe(TriageCategory.GENERAL);
        expect(result.confidence).toBe(0);
      });
    });

    describe('INTENT strategy', () => {
      test('should detect refund intent', async () => {
        const intentPattern = new TriagePattern({ strategy: TriageStrategy.INTENT });
        
        const result = await intentPattern.classifyRequest(
          'I want to get a refund',
          new ExecutionContext({ input: {} })
        );

        expect(result.intents.some(i => i.intent === 'request_refund')).toBe(true);
        expect(result.category).toBe(TriageCategory.REFUND);
      });

      test('should detect issue reporting intent', async () => {
        const intentPattern = new TriagePattern({ strategy: TriageStrategy.INTENT });
        
        const result = await intentPattern.classifyRequest(
          'The app is broken and not working',
          new ExecutionContext({ input: {} })
        );

        expect(result.intents.some(i => i.intent === 'report_issue')).toBe(true);
      });

      test('should detect purchase intent', async () => {
        const intentPattern = new TriagePattern({ strategy: TriageStrategy.INTENT });
        
        const result = await intentPattern.classifyRequest(
          'I want to buy a subscription',
          new ExecutionContext({ input: {} })
        );

        expect(result.intents.some(i => i.intent === 'purchase')).toBe(true);
        expect(result.category).toBe(TriageCategory.SALES);
      });
    });

    describe('CAPABILITY strategy', () => {
      test('should match agent capabilities', async () => {
        const capPattern = new TriagePattern({ strategy: TriageStrategy.CAPABILITY });
        const billingAgent = createMockAgent('billing-agent');
        
        capPattern.registerAgent(billingAgent, {
          categories: [TriageCategory.BILLING],
          keywords: ['invoice', 'payment', 'subscription']
        });

        const result = await capPattern.classifyRequest(
          'I have a question about my invoice payment',
          new ExecutionContext({ input: {} })
        );

        expect(result.selectedAgent.name).toBe('billing-agent');
        expect(result.category).toBe(TriageCategory.BILLING);
      });
    });

    describe('HYBRID strategy', () => {
      test('should combine multiple classification methods', async () => {
        const hybridPattern = new TriagePattern({ strategy: TriageStrategy.HYBRID });
        const refundAgent = createMockAgent('refund-agent');
        
        hybridPattern.registerAgent(refundAgent, {
          categories: [TriageCategory.REFUND],
          keywords: ['refund', 'money back']
        });

        const result = await hybridPattern.classifyRequest(
          'I need to get a refund for my purchase',
          new ExecutionContext({ input: {} })
        );

        expect(result.category).toBe(TriageCategory.REFUND);
        expect(result.reasoning).toContain('Hybrid classification');
      });
    });
  });

  describe('selectAgent', () => {
    test('should select agent matching category', async () => {
      const billingAgent = createMockAgent('billing-agent');
      const supportAgent = createMockAgent('support-agent');

      pattern.registerAgent(billingAgent, {
        categories: [TriageCategory.BILLING],
        keywords: ['invoice']
      });
      pattern.registerAgent(supportAgent, {
        categories: [TriageCategory.SUPPORT],
        keywords: ['help']
      });

      const classification = new TriageResult({
        category: TriageCategory.BILLING,
        confidence: 0.8
      });

      const context = new ExecutionContext({ input: { message: 'invoice question' } });
      const selected = await pattern.selectAgent(classification, 'invoice question', context, engine);

      expect(selected.name).toBe('billing-agent');
    });

    test('should select highest scoring agent', async () => {
      const agent1 = createMockAgent('agent1');
      const agent2 = createMockAgent('agent2');

      pattern.registerAgent(agent1, {
        categories: [TriageCategory.BILLING],
        keywords: ['invoice'],
        priority: 5
      });
      pattern.registerAgent(agent2, {
        categories: [TriageCategory.BILLING],
        keywords: ['invoice', 'payment', 'charge'],
        priority: 10
      });

      const classification = new TriageResult({
        category: TriageCategory.BILLING,
        confidence: 0.8
      });

      const context = new ExecutionContext({ input: { message: 'invoice payment' } });
      const selected = await pattern.selectAgent(classification, 'invoice payment', context, engine);

      expect(selected.name).toBe('agent2');
    });

    test('should return null when no matching agents', async () => {
      const supportAgent = createMockAgent('support-agent');
      pattern.registerAgent(supportAgent, {
        categories: [TriageCategory.SUPPORT],
        keywords: ['help']
      });

      const classification = new TriageResult({
        category: TriageCategory.BILLING,
        confidence: 0.8
      });

      const context = new ExecutionContext({ input: { message: 'billing' } });
      const selected = await pattern.selectAgent(classification, 'billing', context, engine);

      expect(selected).toBeNull();
    });

    test('should use pre-selected agent from classification', async () => {
      const preselected = createMockAgent('preselected-agent');
      
      const classification = new TriageResult({
        category: TriageCategory.BILLING,
        confidence: 0.8,
        selectedAgent: preselected
      });

      const context = new ExecutionContext({ input: { message: 'test' } });
      const selected = await pattern.selectAgent(classification, 'test', context, engine);

      expect(selected.name).toBe('preselected-agent');
    });
  });

  describe('execute', () => {
    test('should classify and route to agent', async () => {
      const billingAgent = createMockAgent('billing-agent');
      
      pattern.registerAgent(billingAgent, {
        categories: [TriageCategory.BILLING],
        keywords: ['invoice', 'payment']
      });

      const context = new ExecutionContext({
        input: {
          message: 'I have a question about my invoice'
        }
      });

      const result = await pattern.execute(context, engine);

      expect(result.success).toBe(true);
      expect(result.classification.category).toBe(TriageCategory.BILLING);
      expect(billingAgent.execute).toHaveBeenCalled();
    });

    test('should emit triage events', async () => {
      const agent = createMockAgent('test-agent');
      pattern.registerAgent(agent, {
        categories: [TriageCategory.GENERAL],
        keywords: ['help']
      });

      const context = new ExecutionContext({
        input: { message: 'I need help' }
      });

      await pattern.execute(context, engine);

      expect(engine.emit).toHaveBeenCalledWith('triage:started', expect.any(Object));
      expect(engine.emit).toHaveBeenCalledWith('triage:classifying', expect.any(Object));
      expect(engine.emit).toHaveBeenCalledWith('triage:classified', expect.any(Object));
      expect(engine.emit).toHaveBeenCalledWith('triage:routing', expect.any(Object));
      expect(engine.emit).toHaveBeenCalledWith('triage:completed', expect.any(Object));
    });

    test('should use fallback agent when no match found', async () => {
      const fallbackAgent = createMockAgent('fallback-agent');
      const customPattern = new TriagePattern({
        fallbackAgent
      });

      customPattern.registerAgent(createMockAgent('billing-agent'), {
        categories: [TriageCategory.BILLING],
        keywords: ['invoice']
      });

      const context = new ExecutionContext({
        input: { message: 'random unrelated message xyz' }
      });

      const result = await customPattern.execute(context, engine);

      expect(result.success).toBe(true);
      expect(fallbackAgent.execute).toHaveBeenCalled();
    });

    test('should record classification in history', async () => {
      const agent = createMockAgent('test-agent');
      pattern.registerAgent(agent, {
        categories: [TriageCategory.SUPPORT],
        keywords: ['help']
      });

      const context = new ExecutionContext({
        input: { message: 'I need help' }
      });

      await pattern.execute(context, engine);

      const stats = pattern.getStats();
      expect(stats.totalClassifications).toBe(1);
    });

    test('should skip handoff when disabled', async () => {
      const noHandoffPattern = new TriagePattern({ enableHandoff: false });
      const agent = createMockAgent('test-agent');
      
      noHandoffPattern.registerAgent(agent, {
        categories: [TriageCategory.GENERAL],
        keywords: ['test']
      });

      const context = new ExecutionContext({
        input: { message: 'test message' }
      });

      const result = await noHandoffPattern.execute(context, engine);

      expect(result.success).toBe(true);
      expect(result.result.action).toBe('classified');
      expect(agent.execute).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    test('should return classification statistics', async () => {
      const agent = createMockAgent('test-agent');
      pattern.registerAgent(agent, {
        categories: [TriageCategory.BILLING, TriageCategory.SUPPORT],
        keywords: ['invoice', 'help']
      });

      // Run some classifications
      await pattern.execute(
        new ExecutionContext({ input: { message: 'invoice question' } }),
        engine
      );
      await pattern.execute(
        new ExecutionContext({ input: { message: 'help me please' } }),
        engine
      );

      const stats = pattern.getStats();

      expect(stats.totalClassifications).toBe(2);
      expect(stats.registeredAgents).toBe(1);
      expect(stats.averageConfidence).toBeGreaterThan(0);
    });

    test('should clear history', () => {
      pattern.classificationHistory.push({ timestamp: new Date(), input: 'test', classification: {} });
      expect(pattern.getStats().totalClassifications).toBe(1);

      pattern.clearHistory();
      expect(pattern.getStats().totalClassifications).toBe(0);
    });
  });
});

describe('AgentCapability', () => {
  test('should create with defaults', () => {
    const cap = new AgentCapability({ agent: 'test-agent' });

    expect(cap.agent).toBe('test-agent');
    expect(cap.categories).toEqual([]);
    expect(cap.keywords).toEqual([]);
    expect(cap.priority).toBe(0);
  });

  test('should check category handling', () => {
    const cap = new AgentCapability({
      agent: 'billing-agent',
      categories: [TriageCategory.BILLING, TriageCategory.REFUND]
    });

    expect(cap.canHandle(TriageCategory.BILLING)).toBe(true);
    expect(cap.canHandle(TriageCategory.REFUND)).toBe(true);
    expect(cap.canHandle(TriageCategory.SUPPORT)).toBe(false);
  });

  test('should check GENERAL category as catch-all', () => {
    const cap = new AgentCapability({
      agent: 'general-agent',
      categories: [TriageCategory.GENERAL]
    });

    expect(cap.canHandle(TriageCategory.BILLING)).toBe(true);
    expect(cap.canHandle(TriageCategory.SUPPORT)).toBe(true);
  });

  test('should match keywords case-insensitively', () => {
    const cap = new AgentCapability({
      agent: 'test-agent',
      keywords: ['Invoice', 'Payment']
    });

    expect(cap.matchesKeywords('I have an INVOICE question')).toBe(true);
    expect(cap.matchesKeywords('payment issue')).toBe(true);
    expect(cap.matchesKeywords('random text')).toBe(false);
  });

  test('should calculate match score', () => {
    const cap = new AgentCapability({
      agent: 'test-agent',
      categories: [TriageCategory.BILLING],
      keywords: ['invoice', 'payment', 'charge'],
      priority: 5
    });

    const score1 = cap.calculateScore('invoice payment', TriageCategory.BILLING);
    const score2 = cap.calculateScore('random text', TriageCategory.BILLING);

    expect(score1).toBeGreaterThan(score2);
  });

  test('should apply load penalty', () => {
    const cap = new AgentCapability({
      agent: 'test-agent',
      categories: [TriageCategory.BILLING],
      maxConcurrent: 5
    });

    const scoreUnloaded = cap.calculateScore('test', TriageCategory.BILLING);
    
    cap.currentLoad = 5; // At max capacity
    const scoreLoaded = cap.calculateScore('test', TriageCategory.BILLING);

    expect(scoreLoaded).toBeLessThan(scoreUnloaded);
  });

  test('should serialize to JSON', () => {
    const cap = new AgentCapability({
      agent: createMockAgent('test-agent'),
      categories: [TriageCategory.BILLING],
      keywords: ['invoice'],
      priority: 5
    });

    const json = cap.toJSON();

    expect(json.agent).toBe('test-agent');
    expect(json.categories).toContain(TriageCategory.BILLING);
    expect(json.priority).toBe(5);
  });
});

describe('TriageResult', () => {
  test('should create with defaults', () => {
    const result = new TriageResult();

    expect(result.category).toBe(TriageCategory.UNKNOWN);
    expect(result.confidence).toBe(0);
    expect(result.keywords).toEqual([]);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  test('should accept custom values', () => {
    const agent = createMockAgent('test-agent');
    const result = new TriageResult({
      category: TriageCategory.BILLING,
      confidence: 0.9,
      keywords: [{ category: 'billing', keyword: 'invoice' }],
      selectedAgent: agent,
      reasoning: 'Keyword match'
    });

    expect(result.category).toBe(TriageCategory.BILLING);
    expect(result.confidence).toBe(0.9);
    expect(result.selectedAgent.name).toBe('test-agent');
  });

  test('should serialize to JSON', () => {
    const result = new TriageResult({
      category: TriageCategory.SUPPORT,
      confidence: 0.75,
      reasoning: 'Test'
    });

    const json = result.toJSON();

    expect(json.category).toBe(TriageCategory.SUPPORT);
    expect(json.confidence).toBe(0.75);
    expect(typeof json.timestamp).toBe('string');
  });
});

describe('DEFAULT_KEYWORD_MAPPINGS', () => {
  test('should have all triage categories', () => {
    expect(DEFAULT_KEYWORD_MAPPINGS[TriageCategory.BILLING]).toBeDefined();
    expect(DEFAULT_KEYWORD_MAPPINGS[TriageCategory.REFUND]).toBeDefined();
    expect(DEFAULT_KEYWORD_MAPPINGS[TriageCategory.SUPPORT]).toBeDefined();
    expect(DEFAULT_KEYWORD_MAPPINGS[TriageCategory.TECHNICAL]).toBeDefined();
    expect(DEFAULT_KEYWORD_MAPPINGS[TriageCategory.SALES]).toBeDefined();
    expect(DEFAULT_KEYWORD_MAPPINGS[TriageCategory.ESCALATION]).toBeDefined();
  });

  test('should have relevant keywords for each category', () => {
    expect(DEFAULT_KEYWORD_MAPPINGS[TriageCategory.BILLING]).toContain('invoice');
    expect(DEFAULT_KEYWORD_MAPPINGS[TriageCategory.REFUND]).toContain('refund');
    expect(DEFAULT_KEYWORD_MAPPINGS[TriageCategory.SUPPORT]).toContain('help');
    expect(DEFAULT_KEYWORD_MAPPINGS[TriageCategory.TECHNICAL]).toContain('api');
  });
});
