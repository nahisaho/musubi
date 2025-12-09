/**
 * Agent-Skill Binding Tests
 * Tests for Sprint 3.3: Agent-Skill Dynamic Binding
 */

const {
  AgentSkillBinding,
  AgentDefinition,
  BindingRecord,
  AgentStatus,
  CapabilityMatcher
} = require('../../src/orchestration/agent-skill-binding');

// Mock dependencies
const createMockRegistry = () => ({
  skills: new Map(),
  listeners: {},
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  },
  emit(event, data) {
    const callbacks = this.listeners[event] || [];
    callbacks.forEach(cb => cb(data));
  },
  register(skill) {
    this.skills.set(skill.id, skill);
    return { success: true };
  },
  getSkill(id) {
    return this.skills.get(id) || null;
  },
  hasSkill(id) {
    return this.skills.has(id);
  },
  getAllSkills() {
    return Array.from(this.skills.values());
  },
  findByCategory(category) {
    const result = [];
    for (const skill of this.skills.values()) {
      if (skill.category === category) {
        result.push(skill);
      }
    }
    return result;
  }
});

describe('AgentSkillBinding', () => {
  let binder;
  let mockRegistry;

  beforeEach(() => {
    mockRegistry = createMockRegistry();
    binder = new AgentSkillBinding(mockRegistry);

    // Add test skills
    mockRegistry.register({
      id: 'analysis-skill',
      name: 'Analysis Skill',
      category: 'analysis',
      tags: ['data-analysis', 'statistics'],
      requiredCapabilities: ['data-analysis', 'statistics']
    });

    mockRegistry.register({
      id: 'generation-skill',
      name: 'Generation Skill',
      category: 'generation',
      tags: ['text-generation'],
      requiredCapabilities: ['text-generation']
    });

    mockRegistry.register({
      id: 'validation-skill',
      name: 'Validation Skill',
      category: 'validation',
      tags: ['validation', 'testing'],
      requiredCapabilities: ['validation', 'testing']
    });
  });

  describe('Agent Registration', () => {
    test('should register a valid agent', () => {
      const agent = new AgentDefinition({
        id: 'agent-1',
        name: 'Test Agent',
        description: 'A test agent',
        capabilities: ['data-analysis', 'statistics'],
        permissions: ['read', 'write']
      });

      const result = binder.registerAgent(agent);
      expect(result).toBeDefined();
      expect(result.id).toBe('agent-1');
      expect(binder.getAgent('agent-1')).not.toBeNull();
    });

    test('should reject invalid agent definition', () => {
      const agent = new AgentDefinition({
        // Missing required fields
      });

      expect(() => binder.registerAgent(agent)).toThrow();
    });

    test('should emit agent-registered event', () => {
      const listener = jest.fn();
      binder.on('agent-registered', listener);

      const agent = new AgentDefinition({
        id: 'event-agent',
        name: 'Event Agent',
        capabilities: ['test']
      });

      binder.registerAgent(agent);
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('Skill Binding', () => {
    beforeEach(() => {
      binder.registerAgent(new AgentDefinition({
        id: 'capable-agent',
        name: 'Capable Agent',
        capabilities: ['data-analysis', 'statistics', 'text-generation'],
        permissions: ['read', 'write', 'execute']
      }));

      binder.registerAgent(new AgentDefinition({
        id: 'limited-agent',
        name: 'Limited Agent',
        capabilities: ['data-analysis'],
        permissions: ['read']
      }));
    });

    test('should bind skill to capable agent', () => {
      const result = binder.bind('capable-agent', 'analysis-skill');
      expect(result).toBeDefined();
      expect(result.agentId).toBe('capable-agent');
    });

    test('should reject binding for skill not found', () => {
      expect(() => binder.bind('capable-agent', 'non-existent-skill')).toThrow();
    });

    test('should track active bindings', () => {
      binder.bind('capable-agent', 'analysis-skill');
      binder.bind('capable-agent', 'generation-skill');

      const bindings = binder.getAgentBindings('capable-agent');
      expect(bindings.length).toBe(2);
    });

    test('should emit skill-bound event', () => {
      const listener = jest.fn();
      binder.on('skill-bound', listener);

      binder.bind('capable-agent', 'analysis-skill');
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'capable-agent',
          skillId: 'analysis-skill'
        })
      );
    });
  });

  describe('Skill Unbinding', () => {
    beforeEach(() => {
      binder.registerAgent(new AgentDefinition({
        id: 'test-agent',
        name: 'Test Agent',
        capabilities: ['data-analysis', 'statistics']
      }));

      binder.bind('test-agent', 'analysis-skill');
    });

    test('should unbind skill from agent', () => {
      const result = binder.unbind('test-agent', 'analysis-skill');
      expect(result).toBe(true);

      const bindings = binder.getAgentBindings('test-agent');
      expect(bindings.length).toBe(0);
    });

    test('should emit skill-unbound event', () => {
      const listener = jest.fn();
      binder.on('skill-unbound', listener);

      binder.unbind('test-agent', 'analysis-skill');
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('Best Agent Selection', () => {
    beforeEach(() => {
      binder.registerAgent(new AgentDefinition({
        id: 'perfect-match',
        name: 'Perfect Match',
        capabilities: ['data-analysis', 'statistics', 'machine-learning'],
        priority: 'high'
      }));

      binder.registerAgent(new AgentDefinition({
        id: 'partial-match',
        name: 'Partial Match',
        capabilities: ['data-analysis'],
        priority: 'normal'
      }));

      binder.registerAgent(new AgentDefinition({
        id: 'no-match',
        name: 'No Match',
        capabilities: ['text-generation'],
        priority: 'normal'
      }));
    });

    test('should find best agent for skill', () => {
      const result = binder.findBestAgentForSkill('analysis-skill');
      expect(result).not.toBeNull();
      expect(result.agent.id).toBe('perfect-match');
    });

    test('should return null when no capable agent exists', () => {
      const result = binder.findBestAgentForSkill('validation-skill');
      expect(result).toBeNull();
    });

    test('should consider agent availability', () => {
      binder.setAgentStatus('perfect-match', AgentStatus.BUSY);
      
      const result = binder.findBestAgentForSkill('analysis-skill');
      
      expect(result).not.toBeNull();
      expect(result.agent.id).not.toBe('perfect-match');
    });
  });

  describe('Agent Status Management', () => {
    beforeEach(() => {
      binder.registerAgent(new AgentDefinition({
        id: 'status-agent',
        name: 'Status Agent',
        capabilities: ['test']
      }));
    });

    test('should update agent status', () => {
      binder.setAgentStatus('status-agent', AgentStatus.BUSY);
      const status = binder.getAgentStatus('status-agent');
      expect(status).toBe(AgentStatus.BUSY);
    });

    test('should emit status-changed event', () => {
      const listener = jest.fn();
      binder.on('agent-status-changed', listener);

      binder.setAgentStatus('status-agent', AgentStatus.MAINTENANCE);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'status-agent',
          newStatus: AgentStatus.MAINTENANCE
        })
      );
    });

    test('should get available agents', () => {
      binder.registerAgent(new AgentDefinition({
        id: 'busy-agent',
        name: 'Busy Agent',
        capabilities: ['test']
      }));

      binder.setAgentStatus('busy-agent', AgentStatus.BUSY);

      const available = binder.getAvailableAgents();
      expect(available.length).toBe(1);
      expect(available[0].id).toBe('status-agent');
    });
  });

  describe('Capability Scoring', () => {
    test('should calculate capability score', () => {
      binder.registerAgent(new AgentDefinition({
        id: 'scored-agent',
        name: 'Scored Agent',
        capabilities: ['data-analysis', 'statistics', 'visualization']
      }));

      const matcher = binder.getMatcher();
      const score = matcher.calculateScore(
        ['data-analysis', 'statistics', 'visualization'],
        ['data-analysis', 'statistics']
      );

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('should return 0 for no matching capabilities', () => {
      binder.registerAgent(new AgentDefinition({
        id: 'mismatched-agent',
        name: 'Mismatched Agent',
        capabilities: ['text-generation']
      }));

      const matcher = binder.getMatcher();
      const score = matcher.calculateScore(
        ['text-generation'],
        ['validation', 'testing']
      );

      expect(score).toBe(0);
    });
  });

  describe('Load Balancing', () => {
    beforeEach(() => {
      // Register multiple capable agents
      for (let i = 1; i <= 3; i++) {
        binder.registerAgent(new AgentDefinition({
          id: `lb-agent-${i}`,
          name: `LB Agent ${i}`,
          capabilities: ['data-analysis', 'statistics'],
          maxConcurrentTasks: 5
        }));
      }
    });

    test('should track load for agents', () => {
      binder.acquireAgent('lb-agent-1');
      binder.acquireAgent('lb-agent-1');

      const load = binder.getAgentLoad('lb-agent-1');
      expect(load).toBe(2);
    });

    test('should respect max concurrent tasks', () => {
      // Max out agent 1
      for (let i = 0; i < 5; i++) {
        binder.acquireAgent('lb-agent-1');
      }

      // Agent 1 should now be busy
      const status = binder.getAgentStatus('lb-agent-1');
      expect(status).toBe(AgentStatus.BUSY);
    });
  });

  describe('Agent Unregistration', () => {
    test('should unregister agent and clean up bindings', () => {
      binder.registerAgent(new AgentDefinition({
        id: 'removable-agent',
        name: 'Removable Agent',
        capabilities: ['data-analysis', 'statistics']
      }));

      binder.bind('removable-agent', 'analysis-skill');

      const result = binder.unregisterAgent('removable-agent');
      expect(result).toBe(true);
      expect(binder.getAgent('removable-agent')).toBeNull();
    });
  });
});

describe('AgentDefinition', () => {
  test('should create valid agent definition', () => {
    const agent = new AgentDefinition({
      id: 'test-agent',
      name: 'Test Agent',
      description: 'A test agent',
      capabilities: ['cap1', 'cap2'],
      permissions: ['perm1'],
      maxConcurrentTasks: 10
    });

    const validation = agent.validate();
    expect(validation.valid).toBe(true);
  });

  test('should detect invalid agent definition', () => {
    const agent = new AgentDefinition({
      id: '',
      name: ''
    });

    const validation = agent.validate();
    expect(validation.valid).toBe(false);
  });
});

describe('BindingRecord', () => {
  test('should create binding record', () => {
    const binding = new BindingRecord('agent-1', 'skill-1', {
      score: 80
    });

    expect(binding.agentId).toBe('agent-1');
    expect(binding.skillId).toBe('skill-1');
    expect(binding.createdAt).toBeDefined();
  });

  test('should update stats', () => {
    const binding = new BindingRecord('agent-1', 'skill-1');
    
    binding.updateStats(true, 100);
    binding.updateStats(true, 200);
    
    expect(binding.executionCount).toBe(2);
    expect(binding.successRate).toBe(1.0);
  });
});

describe('CapabilityMatcher', () => {
  let matcher;
  
  beforeEach(() => {
    matcher = new CapabilityMatcher();
  });

  test('should match exact capabilities', () => {
    const score = matcher.calculateScore(
      ['data-analysis', 'statistics'],
      ['data-analysis', 'statistics']
    );

    expect(score).toBe(100);
  });

  test('should handle partial matches', () => {
    const score = matcher.calculateScore(
      ['data-analysis'],
      ['data-analysis', 'statistics']
    );

    expect(score).toBe(50);
  });

  test('should handle no match', () => {
    const score = matcher.calculateScore(
      ['text-generation'],
      ['data-analysis', 'statistics']
    );

    expect(score).toBe(0);
  });
});

describe('AgentStatus', () => {
  test('should have correct status values', () => {
    expect(AgentStatus.AVAILABLE).toBe('available');
    expect(AgentStatus.BUSY).toBe('busy');
    expect(AgentStatus.OFFLINE).toBe('offline');
    expect(AgentStatus.MAINTENANCE).toBe('maintenance');
  });
});
