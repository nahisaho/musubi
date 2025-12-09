/**
 * Skill Registry Tests
 * Tests for Sprint 3.1: Skill System Architecture
 */

const {
  SkillRegistry,
  SkillMetadata,
  SkillHealth,
  SkillCategory,
  SkillPriority
} = require('../../src/orchestration/skill-registry');

describe('SkillMetadata', () => {
  test('should create valid skill metadata', () => {
    const metadata = new SkillMetadata({
      id: 'test-skill',
      name: 'Test Skill',
      description: 'A test skill',
      category: SkillCategory.ANALYSIS,
      version: '1.0.0',
      inputs: [{ name: 'input', type: 'string' }],
      outputs: [{ name: 'output', type: 'string' }]
    });

    const validation = metadata.validate();
    expect(validation.valid).toBe(true);
  });

  test('should detect missing id', () => {
    const metadata = new SkillMetadata({
      name: 'Test Skill'
    });

    const validation = metadata.validate();
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.toLowerCase().includes('id'))).toBe(true);
  });

  test('should detect missing name', () => {
    const metadata = new SkillMetadata({
      id: 'test-skill'
    });

    const validation = metadata.validate();
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('Skill name is required');
  });

  test('should detect invalid id format', () => {
    const metadata = new SkillMetadata({
      id: 'Test Skill Invalid',
      name: 'Test Skill'
    });

    const validation = metadata.validate();
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.toLowerCase().includes('lowercase') || e.toLowerCase().includes('alphanumeric'))).toBe(true);
  });

  test('should detect invalid priority', () => {
    const metadata = new SkillMetadata({
      id: 'test-skill',
      name: 'Test Skill',
      priority: 'INVALID'
    });

    const validation = metadata.validate();
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('P0') || e.includes('P1'))).toBe(true);
  });

  test('should detect input without name', () => {
    const metadata = new SkillMetadata({
      id: 'test-skill',
      name: 'Test Skill',
      inputs: [{ type: 'string' }]
    });

    const validation = metadata.validate();
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('Input') && e.includes('name'))).toBe(true);
  });

  test('should serialize to JSON', () => {
    const metadata = new SkillMetadata({
      id: 'test-skill',
      name: 'Test Skill',
      description: 'A test skill',
      version: '1.0.0',
      category: SkillCategory.ANALYSIS
    });

    const json = metadata.toJSON();
    expect(json.id).toBe('test-skill');
    expect(json.name).toBe('Test Skill');
    expect(json.version).toBe('1.0.0');
  });
});

describe('SkillRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new SkillRegistry({ enableHealthMonitoring: false });
  });

  afterEach(() => {
    if (registry) {
      registry.destroy();
    }
  });

  describe('Skill Registration', () => {
    test('should register a valid skill', () => {
      const skill = {
        id: 'test-skill',
        name: 'Test Skill',
        description: 'A test skill',
        category: SkillCategory.ANALYSIS,
        version: '1.0.0',
        inputs: [{ name: 'input', type: 'string' }],
        outputs: [{ name: 'output', type: 'string' }]
      };

      const result = registry.registerSkill(skill);
      expect(result).toBeDefined();
      expect(result.id).toBe('test-skill');
      expect(registry.hasSkill('test-skill')).toBe(true);
    });

    test('should register skill with handler', () => {
      const skill = {
        id: 'handler-skill',
        name: 'Handler Skill',
        description: 'Skill with handler',
        version: '1.0.0',
        inputs: [],
        outputs: []
      };
      const handler = jest.fn();

      const result = registry.registerSkill(skill, handler);
      expect(result).toBeDefined();
      
      const entry = registry.getSkillEntry('handler-skill');
      expect(entry.handler).toBe(handler);
    });

    test('should throw for skill with missing required fields', () => {
      const skill = {
        name: 'Test Skill'
        // Missing id
      };

      expect(() => {
        registry.registerSkill(skill);
      }).toThrow();
    });

    test('should throw for duplicate skill registration', () => {
      const skill = {
        id: 'duplicate-skill',
        name: 'Duplicate Skill',
        description: 'Test',
        version: '1.0.0',
        inputs: [],
        outputs: []
      };

      registry.registerSkill(skill);
      expect(() => {
        registry.registerSkill(skill);
      }).toThrow(/already exists/);
    });

    test('should throw when max skills limit reached', () => {
      const limitedRegistry = new SkillRegistry({ 
        maxSkills: 2,
        enableHealthMonitoring: false 
      });

      limitedRegistry.registerSkill({
        id: 'skill-1',
        name: 'Skill 1',
        inputs: [],
        outputs: []
      });
      limitedRegistry.registerSkill({
        id: 'skill-2',
        name: 'Skill 2',
        inputs: [],
        outputs: []
      });
      
      expect(() => {
        limitedRegistry.registerSkill({
          id: 'skill-3',
          name: 'Skill 3',
          inputs: [],
          outputs: []
        });
      }).toThrow(/[Mm]aximum/);
      
      limitedRegistry.destroy();
    });

    test('should emit skill-registered event', () => {
      const listener = jest.fn();
      registry.on('skill-registered', listener);

      const skill = {
        id: 'event-skill',
        name: 'Event Skill',
        description: 'Test',
        version: '1.0.0',
        inputs: [],
        outputs: []
      };

      registry.registerSkill(skill);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        skillId: 'event-skill'
      }));
    });
  });

  describe('Skill Retrieval', () => {
    beforeEach(() => {
      registry.registerSkill({
        id: 'skill-1',
        name: 'Skill 1',
        description: 'First skill',
        category: SkillCategory.ANALYSIS,
        version: '1.0.0',
        tags: ['tag1', 'common'],
        inputs: [],
        outputs: []
      });

      registry.registerSkill({
        id: 'skill-2',
        name: 'Skill 2',
        description: 'Second skill',
        category: SkillCategory.DESIGN,
        version: '2.0.0',
        tags: ['tag2', 'common'],
        inputs: [],
        outputs: []
      });
    });

    test('should get skill metadata by ID', () => {
      const skill = registry.getSkill('skill-1');
      expect(skill).toBeDefined();
      expect(skill.name).toBe('Skill 1');
    });

    test('should get full skill entry by ID', () => {
      const entry = registry.getSkillEntry('skill-1');
      expect(entry).toBeDefined();
      expect(entry.metadata).toBeDefined();
    });

    test('should return null for non-existent skill', () => {
      const skill = registry.getSkill('non-existent');
      expect(skill).toBeNull();
    });

    test('should check skill existence', () => {
      expect(registry.hasSkill('skill-1')).toBe(true);
      expect(registry.hasSkill('non-existent')).toBe(false);
    });

    test('should find skills by category', () => {
      const skills = registry.findByCategory(SkillCategory.ANALYSIS);
      expect(skills.length).toBe(1);
      expect(skills[0].id).toBe('skill-1');
    });

    test('should find skills by tags (any match)', () => {
      const skills = registry.findByTags(['common']);
      expect(skills.length).toBe(2);
    });

    test('should find skills by tags (all match)', () => {
      const skills = registry.findByTags(['tag1', 'common'], true);
      expect(skills.length).toBe(1);
      expect(skills[0].id).toBe('skill-1');
    });

    test('should search skills by query', () => {
      const skills = registry.search('first');
      expect(skills.length).toBe(1);
      expect(skills[0].id).toBe('skill-1');
    });

    test('should get all skills', () => {
      const skills = registry.getAllSkills();
      expect(skills.length).toBe(2);
    });
  });

  describe('Skill Unregistration', () => {
    beforeEach(() => {
      registry.registerSkill({
        id: 'removable',
        name: 'Removable',
        description: 'Can be removed',
        version: '1.0.0',
        inputs: [],
        outputs: []
      });
    });

    test('should unregister a skill', () => {
      const result = registry.unregisterSkill('removable');
      expect(result).toBe(true);
      expect(registry.hasSkill('removable')).toBe(false);
    });

    test('should return false for non-existent skill', () => {
      const result = registry.unregisterSkill('non-existent');
      expect(result).toBe(false);
    });

    test('should emit skill-unregistered event', () => {
      const listener = jest.fn();
      registry.on('skill-unregistered', listener);

      registry.unregisterSkill('removable');
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        skillId: 'removable'
      }));
    });
  });

  describe('Dependency Resolution', () => {
    beforeEach(() => {
      registry.registerSkill({
        id: 'base-skill',
        name: 'Base Skill',
        description: 'Base',
        version: '1.0.0',
        dependencies: [],
        inputs: [],
        outputs: []
      });

      registry.registerSkill({
        id: 'dependent-skill',
        name: 'Dependent Skill',
        description: 'Depends on base',
        version: '1.0.0',
        dependencies: ['base-skill'],
        inputs: [],
        outputs: []
      });

      registry.registerSkill({
        id: 'chain-skill',
        name: 'Chain Skill',
        description: 'Depends on dependent',
        version: '1.0.0',
        dependencies: ['dependent-skill'],
        inputs: [],
        outputs: []
      });
    });

    test('should resolve skill dependencies in order', () => {
      const order = registry.resolveDependencies('chain-skill');
      expect(order).toContain('base-skill');
      expect(order).toContain('dependent-skill');
      expect(order.indexOf('base-skill')).toBeLessThan(order.indexOf('dependent-skill'));
    });

    test('should return skill itself at the end', () => {
      const order = registry.resolveDependencies('chain-skill');
      expect(order[order.length - 1]).toBe('chain-skill');
    });

    test('should throw for missing dependencies', () => {
      // Register skill with non-existent dependency will throw
      expect(() => {
        registry.registerSkill({
          id: 'broken-skill',
          name: 'Broken',
          description: 'Missing dep',
          version: '1.0.0',
          dependencies: ['non-existent'],
          inputs: [],
          outputs: []
        });
      }).toThrow();
    });

    test('should detect circular dependencies', () => {
      // Create skills without dependencies first
      registry.registerSkill({
        id: 'circular-a',
        name: 'Circular A',
        version: '1.0.0',
        dependencies: [],
        inputs: [],
        outputs: []
      });

      registry.registerSkill({
        id: 'circular-b',
        name: 'Circular B',
        version: '1.0.0',
        dependencies: ['circular-a'],
        inputs: [],
        outputs: []
      });

      // Manually update to create circular dependency (if possible)
      // This tests the detection during resolution
      const entryA = registry.getSkillEntry('circular-a');
      entryA.metadata.dependencies = ['circular-b'];

      expect(() => {
        registry.resolveDependencies('circular-a');
      }).toThrow(/[Cc]ircular/);
    });
  });

  describe('Health Management', () => {
    beforeEach(() => {
      registry.registerSkill({
        id: 'health-skill',
        name: 'Health Skill',
        version: '1.0.0',
        inputs: [],
        outputs: []
      });
    });

    test('should update skill health', () => {
      registry.updateHealth('health-skill', SkillHealth.DEGRADED, 'Test reason');
      
      const health = registry.getHealth('health-skill');
      // getHealth returns status string directly
      expect(health).toBe(SkillHealth.DEGRADED);
    });

    test('should emit health-changed event', () => {
      const listener = jest.fn();
      registry.on('health-changed', listener);

      registry.updateHealth('health-skill', SkillHealth.UNHEALTHY);
      expect(listener).toHaveBeenCalled();
    });

    test('should get healthy skills only', () => {
      registry.registerSkill({
        id: 'unhealthy-skill',
        name: 'Unhealthy Skill',
        version: '1.0.0',
        inputs: [],
        outputs: []
      });

      registry.updateHealth('unhealthy-skill', SkillHealth.UNHEALTHY);

      const healthySkills = registry.getHealthySkills();
      expect(healthySkills.some(s => s.id === 'health-skill')).toBe(true);
      expect(healthySkills.some(s => s.id === 'unhealthy-skill')).toBe(false);
    });
  });

  describe('Execution Statistics', () => {
    beforeEach(() => {
      registry.registerSkill({
        id: 'stats-skill',
        name: 'Stats Skill',
        version: '1.0.0',
        inputs: [],
        outputs: []
      });
    });

    test('should record successful execution', () => {
      registry.recordExecution('stats-skill', true, 100);
      
      const stats = registry.getStats('stats-skill');
      expect(stats.totalExecutions).toBe(1);
      expect(stats.successCount).toBe(1);
      expect(stats.failureCount).toBe(0);
    });

    test('should record failed execution', () => {
      registry.recordExecution('stats-skill', false, 50);
      
      const stats = registry.getStats('stats-skill');
      expect(stats.totalExecutions).toBe(1);
      expect(stats.successCount).toBe(0);
      expect(stats.failureCount).toBe(1);
    });

    test('should calculate average execution time', () => {
      registry.recordExecution('stats-skill', true, 100);
      registry.recordExecution('stats-skill', true, 200);
      registry.recordExecution('stats-skill', true, 150);
      
      const stats = registry.getStats('stats-skill');
      expect(stats.averageExecutionTime).toBe(150);
    });

    test('should get all stats', () => {
      registry.recordExecution('stats-skill', true, 100);
      
      const allStats = registry.getAllStats();
      // getAllStats returns an object from Object.fromEntries
      expect(typeof allStats).toBe('object');
      expect(allStats['stats-skill']).toBeDefined();
    });
  });

  describe('Validators and Hooks', () => {
    test('should apply custom validator', () => {
      registry.addValidator((metadata) => {
        if (metadata.name.length < 5) {
          return { valid: false, error: 'Name too short' };
        }
        return { valid: true };
      });

      expect(() => {
        registry.registerSkill({
          id: 'abc',
          name: 'ABC',
          inputs: [],
          outputs: []
        });
      }).toThrow(/[Ss]hort/);
    });

    test('should call beforeRegister hook', () => {
      const hook = jest.fn();
      registry.addHook('beforeRegister', hook);

      registry.registerSkill({
        id: 'hook-skill',
        name: 'Hook Skill',
        inputs: [],
        outputs: []
      });

      expect(hook).toHaveBeenCalled();
    });

    test('should call afterRegister hook', () => {
      const hook = jest.fn();
      registry.addHook('afterRegister', hook);

      registry.registerSkill({
        id: 'hook-skill',
        name: 'Hook Skill',
        inputs: [],
        outputs: []
      });

      expect(hook).toHaveBeenCalled();
    });
  });

  describe('Registry Summary', () => {
    test('should return registry summary', () => {
      registry.registerSkill({
        id: 'summary-skill-1',
        name: 'Summary Skill 1',
        category: SkillCategory.ANALYSIS,
        version: '1.0.0',
        inputs: [],
        outputs: []
      });

      registry.registerSkill({
        id: 'summary-skill-2',
        name: 'Summary Skill 2',
        category: SkillCategory.ANALYSIS,
        version: '1.0.0',
        inputs: [],
        outputs: []
      });

      const summary = registry.getSummary();
      expect(summary.totalSkills).toBe(2);
      expect(summary.categories[SkillCategory.ANALYSIS]).toBe(2);
    });
  });

  describe('Import/Export', () => {
    test('should export registry to JSON', () => {
      registry.registerSkill({
        id: 'export-skill',
        name: 'Export Skill',
        version: '1.0.0',
        inputs: [],
        outputs: []
      });

      const json = registry.exportToJSON();
      expect(json.skills).toHaveLength(1);
      expect(json.skills[0].id).toBe('export-skill');
    });

    test('should import registry from JSON', () => {
      const data = {
        skills: [
          {
            id: 'import-skill',
            name: 'Import Skill',
            version: '1.0.0',
            inputs: [],
            outputs: []
          }
        ]
      };

      const result = registry.importFromJSON(data);
      // importFromJSON returns { imported: [], errors: [] }
      expect(result.imported.length).toBe(1);
      expect(registry.hasSkill('import-skill')).toBe(true);
    });
  });

  describe('Clear and Destroy', () => {
    test('should clear all skills', () => {
      registry.registerSkill({
        id: 'clear-skill',
        name: 'Clear Skill',
        inputs: [],
        outputs: []
      });

      registry.clear();
      expect(registry.getAllSkills().length).toBe(0);
    });
  });
});

describe('SkillHealth enum', () => {
  test('should have correct health statuses', () => {
    expect(SkillHealth.HEALTHY).toBe('healthy');
    expect(SkillHealth.DEGRADED).toBe('degraded');
    expect(SkillHealth.UNHEALTHY).toBe('unhealthy');
    expect(SkillHealth.UNKNOWN).toBe('unknown');
  });
});

describe('SkillCategory enum', () => {
  test('should have correct categories', () => {
    expect(SkillCategory.ANALYSIS).toBe('analysis');
    expect(SkillCategory.DESIGN).toBe('design');
    expect(SkillCategory.IMPLEMENTATION).toBe('implementation');
    expect(SkillCategory.TESTING).toBe('testing');
    expect(SkillCategory.DOCUMENTATION).toBe('documentation');
  });
});

describe('SkillPriority enum', () => {
  test('should have correct priorities', () => {
    expect(SkillPriority.P0).toBe('P0');
    expect(SkillPriority.P1).toBe('P1');
    expect(SkillPriority.P2).toBe('P2');
    expect(SkillPriority.P3).toBe('P3');
  });
});
