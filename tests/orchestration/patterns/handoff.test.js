/**
 * Tests for HandoffPattern
 * 
 * @module tests/orchestration/patterns/handoff.test
 */

const {
  HandoffPattern,
  HandoffPatternType,
  HandoffStrategy,
  HandoffFilters,
  HandoffConfig,
  EscalationData,
  handoff
} = require('../../../src/orchestration/patterns/handoff');

const { ExecutionContext, PatternType } = require('../../../src/orchestration/orchestration-engine');
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

describe('HandoffPattern', () => {
  let pattern;
  let engine;

  beforeEach(() => {
    pattern = new HandoffPattern();
    engine = createMockEngine({
      'billing-agent': { name: 'billing-agent' },
      'support-agent': { name: 'support-agent' },
      'refund-agent': { name: 'refund-agent' }
    });
  });

  afterEach(() => {
    pattern.resetChain();
  });

  describe('constructor', () => {
    test('should create pattern with default options', () => {
      expect(pattern.metadata.name).toBe(HandoffPatternType.HANDOFF);
      expect(pattern.metadata.type).toBe(HandoffPatternType.HANDOFF);
      expect(pattern.options.strategy).toBe(HandoffStrategy.FIRST_MATCH);
      expect(pattern.options.maxHandoffs).toBe(10);
      expect(pattern.options.preserveHistory).toBe(true);
    });

    test('should accept custom options', () => {
      const customPattern = new HandoffPattern({
        strategy: HandoffStrategy.BEST_MATCH,
        maxHandoffs: 5,
        timeout: 60000
      });

      expect(customPattern.options.strategy).toBe(HandoffStrategy.BEST_MATCH);
      expect(customPattern.options.maxHandoffs).toBe(5);
      expect(customPattern.options.timeout).toBe(60000);
    });

    test('should extend BasePattern', () => {
      expect(pattern).toBeInstanceOf(BasePattern);
    });
  });

  describe('validate', () => {
    test('should validate valid context', () => {
      const context = new ExecutionContext({
        input: {
          sourceAgent: 'triage-agent',
          targetAgents: [{ agent: 'billing-agent' }],
          message: 'I need help with billing'
        }
      });

      const result = pattern.validate(context, engine);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject missing sourceAgent', () => {
      const context = new ExecutionContext({
        input: {
          targetAgents: [{ agent: 'billing-agent' }]
        }
      });

      const result = pattern.validate(context, engine);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Handoff pattern requires input.sourceAgent');
    });

    test('should reject missing targetAgents', () => {
      const context = new ExecutionContext({
        input: {
          sourceAgent: 'triage-agent'
        }
      });

      const result = pattern.validate(context, engine);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Handoff pattern requires input.targetAgents array');
    });

    test('should reject empty targetAgents', () => {
      const context = new ExecutionContext({
        input: {
          sourceAgent: 'triage-agent',
          targetAgents: []
        }
      });

      const result = pattern.validate(context, engine);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Handoff pattern requires at least one target agent');
    });

    test('should reject unknown skill references', () => {
      const context = new ExecutionContext({
        input: {
          sourceAgent: 'triage-agent',
          targetAgents: ['unknown-agent']
        }
      });

      const result = pattern.validate(context, engine);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unknown agent/skill: unknown-agent');
    });
  });

  describe('execute', () => {
    test('should perform handoff to target agent', async () => {
      const targetAgent = createMockAgent('billing-agent');
      
      const context = new ExecutionContext({
        input: {
          sourceAgent: 'triage-agent',
          targetAgents: [targetAgent],
          message: 'I need help with billing'
        }
      });

      const result = await pattern.execute(context, engine);

      expect(result.success).toBe(true);
      expect(result.sourceAgent).toBe('triage-agent');
      expect(result.targetAgent).toBe('billing-agent');
      expect(targetAgent.execute).toHaveBeenCalled();
    });

    test('should emit handoff events', async () => {
      const targetAgent = createMockAgent('billing-agent');
      
      const context = new ExecutionContext({
        input: {
          sourceAgent: 'triage-agent',
          targetAgents: [targetAgent],
          message: 'Test message'
        }
      });

      await pattern.execute(context, engine);

      expect(engine.emit).toHaveBeenCalledWith('handoff:started', expect.any(Object));
      expect(engine.emit).toHaveBeenCalledWith('handoff:selecting', expect.any(Object));
      expect(engine.emit).toHaveBeenCalledWith('handoff:completed', expect.any(Object));
    });

    test('should record handoff in chain', async () => {
      const targetAgent = createMockAgent('billing-agent');
      
      const context = new ExecutionContext({
        input: {
          sourceAgent: 'triage-agent',
          targetAgents: [targetAgent],
          message: 'Test message'
        }
      });

      const result = await pattern.execute(context, engine);

      expect(result.handoffChain).toHaveLength(1);
      expect(result.handoffChain[0].from).toBe('triage-agent');
      expect(result.handoffChain[0].to).toBe('billing-agent');
    });

    test('should pass filtered history to target', async () => {
      const targetAgent = createMockAgent('billing-agent');
      const targetConfig = handoff({
        agent: targetAgent,
        inputFilter: HandoffFilters.userMessagesOnly
      });

      const history = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
        { role: 'user', content: 'I need billing help' }
      ];
      
      const context = new ExecutionContext({
        input: {
          sourceAgent: 'triage-agent',
          targetAgents: [targetConfig],
          message: 'Test',
          history
        }
      });

      await pattern.execute(context, engine);

      const call = targetAgent.execute.mock.calls[0][0];
      expect(call.input.history).toHaveLength(2);
      expect(call.input.history.every(msg => msg.role === 'user')).toBe(true);
    });

    test('should pass escalation data to target', async () => {
      const targetAgent = createMockAgent('billing-agent');
      const escalation = new EscalationData({
        reason: 'Customer wants refund',
        priority: 'high'
      });
      
      const context = new ExecutionContext({
        input: {
          sourceAgent: 'triage-agent',
          targetAgents: [targetAgent],
          message: 'Refund request',
          escalationData: escalation
        }
      });

      await pattern.execute(context, engine);

      const call = targetAgent.execute.mock.calls[0][0];
      expect(call.input.escalation.reason).toBe('Customer wants refund');
      expect(call.input.escalation.priority).toBe('high');
    });

    test('should call onHandoff callback', async () => {
      const onHandoff = jest.fn();
      const customPattern = new HandoffPattern({ onHandoff });
      const targetAgent = createMockAgent('billing-agent');
      
      const context = new ExecutionContext({
        input: {
          sourceAgent: 'triage-agent',
          targetAgents: [targetAgent],
          message: 'Test'
        }
      });

      await customPattern.execute(context, engine);

      expect(onHandoff).toHaveBeenCalled();
    });

    test('should emit failed event on error', async () => {
      const targetAgent = createMockAgent('billing-agent');
      targetAgent.execute.mockRejectedValue(new Error('Agent failed'));
      
      const context = new ExecutionContext({
        input: {
          sourceAgent: 'triage-agent',
          targetAgents: [targetAgent],
          message: 'Test'
        }
      });

      await expect(pattern.execute(context, engine)).rejects.toThrow('Agent failed');
      expect(engine.emit).toHaveBeenCalledWith('handoff:failed', expect.any(Object));
    });
  });

  describe('selectTargetAgent', () => {
    test('should select first matching agent with FIRST_MATCH strategy', async () => {
      const agents = [
        handoff({ agent: createMockAgent('agent1'), condition: () => false }),
        handoff({ agent: createMockAgent('agent2'), condition: () => true }),
        handoff({ agent: createMockAgent('agent3'), condition: () => true })
      ];

      const context = new ExecutionContext({ input: { message: 'test' } });
      const selected = await pattern.selectTargetAgent(context, agents, engine);

      expect(selected.agent.name).toBe('agent2');
    });

    test('should select best matching agent with BEST_MATCH strategy', async () => {
      const customPattern = new HandoffPattern({ strategy: HandoffStrategy.BEST_MATCH });
      const agents = [
        handoff({ agent: createMockAgent('agent1'), priority: 5 }),
        handoff({ agent: createMockAgent('agent2'), priority: 10 }),
        handoff({ agent: createMockAgent('agent3'), priority: 3 })
      ];

      const context = new ExecutionContext({ input: { message: 'test' } });
      const selected = await customPattern.selectTargetAgent(context, agents, engine);

      expect(selected.agent.name).toBe('agent2');
    });

    test('should use round-robin with ROUND_ROBIN strategy', async () => {
      const customPattern = new HandoffPattern({ strategy: HandoffStrategy.ROUND_ROBIN });
      const agents = [
        createMockAgent('agent1'),
        createMockAgent('agent2'),
        createMockAgent('agent3')
      ];

      const context = new ExecutionContext({ input: { message: 'test' } });
      
      // First selection
      const selected1 = await customPattern.selectTargetAgent(context, agents, engine);
      expect(selected1.agent.name).toBe('agent1');

      // Simulate handoff recorded
      customPattern.handoffChain.push({ from: 'source', to: 'agent1' });

      // Second selection
      const selected2 = await customPattern.selectTargetAgent(context, agents, engine);
      expect(selected2.agent.name).toBe('agent2');
    });
  });
});

describe('HandoffFilters', () => {
  test('removeAllTools should filter tool messages', () => {
    const history = [
      { role: 'user', content: 'Hello' },
      { type: 'tool_call', content: 'Calling tool' },
      { type: 'tool_result', content: 'Tool result' },
      { role: 'assistant', content: 'Response' }
    ];

    const filtered = HandoffFilters.removeAllTools(history);

    expect(filtered).toHaveLength(2);
    expect(filtered.every(msg => msg.type !== 'tool_call' && msg.type !== 'tool_result')).toBe(true);
  });

  test('userMessagesOnly should keep only user messages', () => {
    const history = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' },
      { role: 'user', content: 'Help' },
      { role: 'system', content: 'System' }
    ];

    const filtered = HandoffFilters.userMessagesOnly(history);

    expect(filtered).toHaveLength(2);
    expect(filtered.every(msg => msg.role === 'user')).toBe(true);
  });

  test('lastN should keep last N messages', () => {
    const history = [
      { role: 'user', content: '1' },
      { role: 'user', content: '2' },
      { role: 'user', content: '3' },
      { role: 'user', content: '4' },
      { role: 'user', content: '5' }
    ];

    const filterLast3 = HandoffFilters.lastN(3);
    const filtered = filterLast3(history);

    expect(filtered).toHaveLength(3);
    expect(filtered[0].content).toBe('3');
    expect(filtered[2].content).toBe('5');
  });

  test('summarize should create summary message', () => {
    const history = [
      { role: 'user', content: 'Hello world' },
      { role: 'assistant', content: 'Hi there' }
    ];

    const filtered = HandoffFilters.summarize(history);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].role).toBe('system');
    expect(filtered[0].content).toContain('Previous conversation summary');
  });

  test('keepAll should return original history', () => {
    const history = [{ role: 'user', content: 'Test' }];
    const filtered = HandoffFilters.keepAll(history);

    expect(filtered).toBe(history);
  });
});

describe('EscalationData', () => {
  test('should create with default values', () => {
    const data = new EscalationData();

    expect(data.reason).toBe('');
    expect(data.priority).toBe('normal');
    expect(data.sourceAgent).toBeNull();
    expect(data.timestamp).toBeInstanceOf(Date);
  });

  test('should accept custom values', () => {
    const data = new EscalationData({
      reason: 'Customer upset',
      priority: 'urgent',
      sourceAgent: 'triage-agent',
      context: { customerId: '123' }
    });

    expect(data.reason).toBe('Customer upset');
    expect(data.priority).toBe('urgent');
    expect(data.sourceAgent).toBe('triage-agent');
    expect(data.context.customerId).toBe('123');
  });

  test('should serialize to JSON', () => {
    const data = new EscalationData({
      reason: 'Test reason',
      priority: 'high'
    });

    const json = data.toJSON();

    expect(json.reason).toBe('Test reason');
    expect(json.priority).toBe('high');
    expect(typeof json.timestamp).toBe('string');
  });
});

describe('handoff helper function', () => {
  test('should create HandoffConfig from agent', () => {
    const agent = createMockAgent('test-agent');
    const config = handoff(agent);

    expect(config).toBeInstanceOf(HandoffConfig);
    expect(config.agent.name).toBe('test-agent');
  });

  test('should create HandoffConfig from options', () => {
    const agent = createMockAgent('test-agent');
    const onHandoff = jest.fn();
    
    const config = handoff({
      agent,
      onHandoff,
      priority: 10,
      inputFilter: HandoffFilters.userMessagesOnly
    });

    expect(config).toBeInstanceOf(HandoffConfig);
    expect(config.agent.name).toBe('test-agent');
    expect(config.onHandoff).toBe(onHandoff);
    expect(config.priority).toBe(10);
    expect(config.inputFilter).toBe(HandoffFilters.userMessagesOnly);
  });
});

describe('HandoffConfig', () => {
  test('should create with defaults', () => {
    const agent = createMockAgent('test-agent');
    const config = new HandoffConfig({ agent });

    expect(config.agent).toBe(agent);
    expect(config.toolNameOverride).toBeNull();
    expect(config.inputType).toBe(EscalationData);
    expect(config.inputFilter).toBe(HandoffFilters.keepAll);
    expect(config.onHandoff).toBeNull();
    expect(config.condition).toBeNull();
    expect(config.priority).toBe(0);
  });

  test('should accept all options', () => {
    const agent = createMockAgent('test-agent');
    const condition = () => true;
    const inputFilter = HandoffFilters.userMessagesOnly;
    
    const config = new HandoffConfig({
      agent,
      toolNameOverride: 'custom_handoff',
      condition,
      inputFilter,
      priority: 5
    });

    expect(config.toolNameOverride).toBe('custom_handoff');
    expect(config.condition).toBe(condition);
    expect(config.inputFilter).toBe(inputFilter);
    expect(config.priority).toBe(5);
  });
});
