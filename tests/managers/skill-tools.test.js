/**
 * @fileoverview Tests for Skill Tools Manager
 */

'use strict';

const {
  SkillToolsManager,
  SkillToolConfig,
  RestrictionLevel,
  DEFAULT_TOOL_SETS
} = require('../../src/managers/skill-tools');

describe('SkillToolsManager', () => {
  describe('SkillToolConfig', () => {
    it('should create config with default values', () => {
      const config = new SkillToolConfig('test-skill');

      expect(config.skillName).toBe('test-skill');
      expect(config.allowedTools).toEqual([]);
      expect(config.deniedTools).toEqual([]);
      expect(config.restrictionLevel).toBe(RestrictionLevel.STANDARD);
    });

    it('should create config with custom values', () => {
      const config = new SkillToolConfig('test-skill', {
        allowedTools: ['tool1', 'tool2'],
        deniedTools: ['tool3'],
        restrictionLevel: RestrictionLevel.STRICT
      });

      expect(config.allowedTools).toContain('tool1');
      expect(config.deniedTools).toContain('tool3');
      expect(config.restrictionLevel).toBe(RestrictionLevel.STRICT);
    });

    describe('isToolAllowed', () => {
      it('should deny explicitly denied tools', () => {
        const config = new SkillToolConfig('skill', {
          allowedTools: ['tool1'],
          deniedTools: ['tool1']
        });

        expect(config.isToolAllowed('tool1')).toBe(false);
      });

      it('should allow all tools with NONE restriction', () => {
        const config = new SkillToolConfig('skill', {
          restrictionLevel: RestrictionLevel.NONE
        });

        expect(config.isToolAllowed('any_tool')).toBe(true);
      });

      it('should allow explicitly allowed tools', () => {
        const config = new SkillToolConfig('skill', {
          allowedTools: ['tool1', 'tool2']
        });

        expect(config.isToolAllowed('tool1')).toBe(true);
        expect(config.isToolAllowed('tool3')).toBe(false);
      });

      it('should allow common tools in STANDARD mode', () => {
        const config = new SkillToolConfig('skill', {
          restrictionLevel: RestrictionLevel.STANDARD
        });

        expect(config.isToolAllowed('common_tool')).toBe(true);
      });
    });

    describe('getEffectiveTools', () => {
      it('should return allowed tools', () => {
        const config = new SkillToolConfig('skill', {
          allowedTools: ['tool1', 'tool2']
        });

        const tools = config.getEffectiveTools();

        expect(tools).toContain('tool1');
        expect(tools).toContain('tool2');
      });

      it('should include dependencies', () => {
        const config = new SkillToolConfig('skill', {
          allowedTools: ['tool1'],
          toolDependencies: { tool1: ['dep1', 'dep2'] }
        });

        const tools = config.getEffectiveTools();

        expect(tools).toContain('tool1');
        expect(tools).toContain('dep1');
        expect(tools).toContain('dep2');
      });

      it('should exclude denied tools', () => {
        const config = new SkillToolConfig('skill', {
          allowedTools: ['tool1', 'tool2'],
          deniedTools: ['tool2']
        });

        const tools = config.getEffectiveTools();

        expect(tools).toContain('tool1');
        expect(tools).not.toContain('tool2');
      });

      it('should use external dependency map', () => {
        const config = new SkillToolConfig('skill', {
          allowedTools: ['tool1']
        });

        const depMap = new Map([['tool1', ['ext_dep']]]);
        const tools = config.getEffectiveTools(depMap);

        expect(tools).toContain('ext_dep');
      });
    });

    it('should convert to JSON', () => {
      const config = new SkillToolConfig('skill', {
        allowedTools: ['tool1'],
        restrictionLevel: RestrictionLevel.STRICT
      });

      const json = config.toJSON();

      expect(json.skillName).toBe('skill');
      expect(json.allowedTools).toContain('tool1');
    });
  });

  describe('SkillToolsManager', () => {
    let manager;

    beforeEach(() => {
      manager = new SkillToolsManager();
    });

    describe('setSkillConfig', () => {
      it('should set and get skill configuration', () => {
        manager.setSkillConfig('test-skill', {
          allowedTools: ['tool1', 'tool2']
        });

        const config = manager.getSkillConfig('test-skill');

        expect(config).not.toBeNull();
        expect(config.allowedTools).toContain('tool1');
      });

      it('should emit event on config set', () => {
        const onSet = jest.fn();
        manager.on('skillConfigSet', onSet);

        manager.setSkillConfig('test-skill', {});

        expect(onSet).toHaveBeenCalledWith('test-skill', expect.any(SkillToolConfig));
      });

      it('should handle inheritance', () => {
        manager.setSkillConfig('parent', {
          allowedTools: ['tool1', 'tool2']
        });
        manager.setSkillConfig('child', {
          allowedTools: ['tool3'],
          inheritFrom: 'parent'
        });

        const childConfig = manager.getSkillConfig('child');

        expect(childConfig.allowedTools).toContain('tool1');
        expect(childConfig.allowedTools).toContain('tool3');
      });
    });

    describe('getAllowedTools', () => {
      it('should return allowed tools for configured skill', () => {
        manager.setSkillConfig('skill1', {
          allowedTools: ['tool1', 'tool2']
        });

        const tools = manager.getAllowedTools('skill1');

        expect(tools).toContain('tool1');
        expect(tools).toContain('tool2');
      });

      it('should return default tools for unconfigured skill', () => {
        const tools = manager.getAllowedTools('requirements-skill');

        expect(tools.length).toBeGreaterThan(0);
      });

      it('should filter by available tools when specified', () => {
        manager.setSkillConfig('skill1', {
          allowedTools: ['tool1', 'tool2', 'tool3']
        });
        manager.setAvailableTools(['tool1', 'tool3']);

        const tools = manager.getAllowedTools('skill1', { filterByAvailable: true });

        expect(tools).toContain('tool1');
        expect(tools).toContain('tool3');
        expect(tools).not.toContain('tool2');
      });
    });

    describe('_getDefaultToolsForSkill', () => {
      it('should return requirements tools', () => {
        const tools = manager._getDefaultToolsForSkill('requirements-generator');
        expect(tools).toEqual(DEFAULT_TOOL_SETS.requirements);
      });

      it('should return implementation tools', () => {
        const tools = manager._getDefaultToolsForSkill('code-implementation');
        expect(tools).toContain('run_command');
      });

      it('should return minimal tools for unknown skills', () => {
        const tools = manager._getDefaultToolsForSkill('unknown-xyz');
        expect(tools).toContain('file_read');
      });
    });

    describe('setAvailableTools', () => {
      it('should set available tools', () => {
        manager.setAvailableTools(['tool1', 'tool2']);

        expect(manager.availableTools.has('tool1')).toBe(true);
      });

      it('should emit event', () => {
        const onUpdate = jest.fn();
        manager.on('availableToolsUpdated', onUpdate);

        manager.setAvailableTools(['tool1']);

        expect(onUpdate).toHaveBeenCalled();
      });
    });

    describe('validateToolAvailability', () => {
      beforeEach(() => {
        manager.setSkillConfig('skill1', {
          allowedTools: ['tool1', 'tool2', 'tool3']
        });
        manager.setAvailableTools(['tool1', 'tool3']);
      });

      it('should validate tool availability', () => {
        const result = manager.validateToolAvailability('skill1');

        expect(result.valid).toBe(false);
        expect(result.available).toContain('tool1');
        expect(result.available).toContain('tool3');
        expect(result.missing).toContain('tool2');
      });

      it('should calculate coverage', () => {
        const result = manager.validateToolAvailability('skill1');

        expect(result.coverage).toBeCloseTo(2/3, 2);
      });
    });

    describe('generateOptimizedConfig', () => {
      beforeEach(() => {
        manager.setSkillConfig('skill1', {
          allowedTools: ['file_read', 'file_write', 'http_request', 'delete_file']
        });
        manager.setAvailableTools(['file_read', 'file_write', 'http_request', 'delete_file']);
      });

      it('should generate basic config', () => {
        const config = manager.generateOptimizedConfig('skill1');

        expect(config.skillName).toBe('skill1');
        expect(config.allowedTools.length).toBeGreaterThan(0);
      });

      it('should remove write operations in readOnly mode', () => {
        const config = manager.generateOptimizedConfig('skill1', { readOnly: true });

        expect(config.allowedTools).toContain('file_read');
        expect(config.allowedTools).not.toContain('file_write');
        expect(config.allowedTools).not.toContain('delete_file');
      });

      it('should remove network operations in noNetwork mode', () => {
        const config = manager.generateOptimizedConfig('skill1', { noNetwork: true });

        expect(config.allowedTools).not.toContain('http_request');
      });

      it('should keep only read operations in minimalPermissions mode', () => {
        const config = manager.generateOptimizedConfig('skill1', { minimalPermissions: true });

        expect(config.allowedTools).toContain('file_read');
        expect(config.allowedTools).not.toContain('file_write');
      });
    });

    describe('autoConfigureSkills', () => {
      it('should auto-configure skills based on definitions', () => {
        const skills = [
          { name: 'requirements-gen', description: 'Generate requirements' },
          { name: 'code-tester', description: 'Run tests' }
        ];

        const configs = manager.autoConfigureSkills(skills);

        expect(configs.size).toBe(2);
        expect(manager.getSkillConfig('requirements-gen')).not.toBeNull();
        expect(manager.getSkillConfig('code-tester')).not.toBeNull();
      });

      it('should include explicit allowed tools', () => {
        const skills = [
          { name: 'custom', description: 'Custom', allowedTools: ['special_tool'] }
        ];

        manager.autoConfigureSkills(skills);
        const config = manager.getSkillConfig('custom');

        expect(config.allowedTools).toContain('special_tool');
      });
    });

    describe('_detectSkillCategory', () => {
      it('should detect requirements category', () => {
        const category = manager._detectSkillCategory({
          name: 'ears-gen',
          description: 'Generate EARS requirements specification'
        });
        expect(category).toBe('requirements');
      });

      it('should detect testing category', () => {
        const category = manager._detectSkillCategory({
          name: 'unit-tester',
          description: 'Run test coverage'
        });
        expect(category).toBe('testing');
      });

      it('should default to validation', () => {
        const category = manager._detectSkillCategory({
          name: 'xyz',
          description: 'Unknown skill'
        });
        expect(category).toBe('validation');
      });
    });

    describe('loadConfigFromString', () => {
      it('should load YAML config', () => {
        const yaml = `
skills:
  skill1:
    allowedTools:
      - tool1
      - tool2
toolDependencies:
  tool1:
    - dep1
`;

        manager.loadConfigFromString(yaml, 'yaml');

        expect(manager.getSkillConfig('skill1')).not.toBeNull();
        expect(manager.toolDependencies.has('tool1')).toBe(true);
      });

      it('should load JSON config', () => {
        const json = JSON.stringify({
          skills: {
            skill1: { allowedTools: ['tool1'] }
          }
        });

        manager.loadConfigFromString(json, 'json');

        expect(manager.getSkillConfig('skill1')).not.toBeNull();
      });
    });

    describe('exportConfig', () => {
      it('should export all configurations', () => {
        manager.setSkillConfig('skill1', { allowedTools: ['tool1'] });
        manager.setSkillConfig('skill2', { allowedTools: ['tool2'] });
        manager.toolDependencies.set('tool1', ['dep1']);

        const exported = manager.exportConfig();

        expect(exported.version).toBe('1.0.0');
        expect(exported.skills.skill1).toBeDefined();
        expect(exported.skills.skill2).toBeDefined();
        expect(exported.toolDependencies.tool1).toContain('dep1');
      });
    });

    describe('clear', () => {
      it('should clear all data', () => {
        manager.setSkillConfig('skill1', { allowedTools: ['tool1'] });
        manager.setAvailableTools(['tool1']);

        manager.clear();

        expect(manager.skillConfigs.size).toBe(0);
        expect(manager.availableTools.size).toBe(0);
      });
    });

    describe('getStats', () => {
      it('should return statistics', () => {
        manager.setSkillConfig('skill1', {
          allowedTools: ['tool1', 'tool2'],
          restrictionLevel: RestrictionLevel.STANDARD
        });
        manager.setSkillConfig('skill2', {
          allowedTools: ['tool2', 'tool3'],
          restrictionLevel: RestrictionLevel.STRICT
        });

        const stats = manager.getStats();

        expect(stats.totalSkills).toBe(2);
        expect(stats.totalUniqueTools).toBe(3);
        expect(stats.byRestrictionLevel[RestrictionLevel.STANDARD]).toBe(1);
        expect(stats.byRestrictionLevel[RestrictionLevel.STRICT]).toBe(1);
      });
    });
  });

  describe('Constants', () => {
    it('should have restriction levels', () => {
      expect(RestrictionLevel.NONE).toBe('none');
      expect(RestrictionLevel.STANDARD).toBe('standard');
      expect(RestrictionLevel.STRICT).toBe('strict');
      expect(RestrictionLevel.CUSTOM).toBe('custom');
    });

    it('should have default tool sets', () => {
      expect(DEFAULT_TOOL_SETS.requirements).toContain('file_read');
      expect(DEFAULT_TOOL_SETS.implementation).toContain('run_command');
      expect(DEFAULT_TOOL_SETS.testing).toContain('test_runner');
    });
  });
});
