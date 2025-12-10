/**
 * @file steering-auto-update.test.js
 * @description Tests for SteeringAutoUpdate
 */

'use strict';

const {
  SteeringAutoUpdate,
  createSteeringAutoUpdate,
  TRIGGER,
  STEERING_TYPE,
  DEFAULT_RULES,
} = require('../../src/steering/steering-auto-update');

describe('SteeringAutoUpdate', () => {
  let autoUpdate;

  beforeEach(() => {
    autoUpdate = new SteeringAutoUpdate();
  });

  describe('constructor', () => {
    it('should create with default options', () => {
      expect(autoUpdate).toBeDefined();
      expect(autoUpdate.rules).toBeInstanceOf(Array);
      expect(autoUpdate.autoSave).toBe(true);
      expect(autoUpdate.backup).toBe(true);
    });

    it('should accept custom options', () => {
      const custom = new SteeringAutoUpdate({
        steeringPath: 'custom/steering',
        autoSave: false,
        backup: false,
      });
      expect(custom.steeringPath).toBe('custom/steering');
      expect(custom.autoSave).toBe(false);
      expect(custom.backup).toBe(false);
    });

    it('should merge custom rules', () => {
      const customRule = {
        id: 'custom-rule',
        trigger: TRIGGER.MANUAL,
        target: STEERING_TYPE.CUSTOM,
        condition: () => true,
        update: async () => ({ changes: ['test'] }),
      };

      const custom = new SteeringAutoUpdate({ rules: [customRule] });
      expect(custom.rules.find(r => r.id === 'custom-rule')).toBeDefined();
    });
  });

  describe('processTrigger()', () => {
    it('should process trigger without matching rules', async () => {
      const results = await autoUpdate.processTrigger(TRIGGER.MANUAL, {});
      expect(results).toBeInstanceOf(Array);
    });

    it('should process trigger with matching rules', async () => {
      // Add a simple rule
      autoUpdate.addRule({
        id: 'test-rule',
        trigger: TRIGGER.MANUAL,
        target: STEERING_TYPE.STRUCTURE,
        priority: 100,
        condition: ctx => ctx.testFlag === true,
        update: async () => ({ section: 'test', changes: ['Test change'] }),
      });

      // Set up mock steering
      autoUpdate.steering.set(STEERING_TYPE.STRUCTURE, {
        path: 'steering/structure.md',
        content: '# Structure',
        parsed: new Map(),
      });

      const results = await autoUpdate.processTrigger(TRIGGER.MANUAL, { testFlag: true });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].success).toBe(true);
      expect(results[0].changes).toContain('Test change');
    });

    it('should emit trigger events', async () => {
      const events = [];
      autoUpdate.on('trigger:received', e => events.push(['received', e]));
      autoUpdate.on('trigger:processed', e => events.push(['processed', e]));

      await autoUpdate.processTrigger(TRIGGER.MANUAL, {});

      expect(events.find(e => e[0] === 'received')).toBeDefined();
      expect(events.find(e => e[0] === 'processed')).toBeDefined();
    });

    it('should handle rule errors gracefully', async () => {
      autoUpdate.addRule({
        id: 'error-rule',
        trigger: TRIGGER.MANUAL,
        target: STEERING_TYPE.STRUCTURE,
        condition: () => {
          throw new Error('Condition error');
        },
        update: async () => ({ changes: [] }),
      });

      // Should not throw
      const results = await autoUpdate.processTrigger(TRIGGER.MANUAL, {});
      expect(results).toBeInstanceOf(Array);
    });
  });

  describe('addRule()', () => {
    it('should add a rule', () => {
      const initialCount = autoUpdate.rules.length;

      autoUpdate.addRule({
        id: 'new-rule',
        trigger: TRIGGER.MANUAL,
        target: STEERING_TYPE.TECH,
        condition: () => true,
        update: async () => ({ changes: [] }),
      });

      expect(autoUpdate.rules.length).toBe(initialCount + 1);
    });

    it('should throw on invalid rule', () => {
      expect(() => autoUpdate.addRule({})).toThrow();
    });

    it('should sort rules by priority', () => {
      autoUpdate.addRule({
        id: 'high-priority',
        trigger: TRIGGER.MANUAL,
        target: STEERING_TYPE.TECH,
        priority: 100,
        condition: () => true,
        update: async () => ({ changes: [] }),
      });

      autoUpdate.addRule({
        id: 'low-priority',
        trigger: TRIGGER.MANUAL,
        target: STEERING_TYPE.TECH,
        priority: 1,
        condition: () => true,
        update: async () => ({ changes: [] }),
      });

      const highIndex = autoUpdate.rules.findIndex(r => r.id === 'high-priority');
      const lowIndex = autoUpdate.rules.findIndex(r => r.id === 'low-priority');

      expect(highIndex).toBeLessThan(lowIndex);
    });
  });

  describe('removeRule()', () => {
    it('should remove a rule', () => {
      autoUpdate.addRule({
        id: 'removable',
        trigger: TRIGGER.MANUAL,
        target: STEERING_TYPE.TECH,
        condition: () => true,
        update: async () => ({ changes: [] }),
      });

      const initialCount = autoUpdate.rules.length;
      autoUpdate.removeRule('removable');

      expect(autoUpdate.rules.length).toBe(initialCount - 1);
      expect(autoUpdate.rules.find(r => r.id === 'removable')).toBeUndefined();
    });
  });

  describe('getHistory()', () => {
    it('should return update history', async () => {
      // Manually add some updates
      autoUpdate.updates.set('update-1', {
        id: 'update-1',
        success: true,
        trigger: TRIGGER.MANUAL,
        timestamp: Date.now(),
      });

      const history = autoUpdate.getHistory();
      expect(history.length).toBe(1);
    });

    it('should filter by trigger', () => {
      autoUpdate.updates.set('update-1', {
        id: 'update-1',
        trigger: TRIGGER.MANUAL,
        timestamp: Date.now(),
      });
      autoUpdate.updates.set('update-2', {
        id: 'update-2',
        trigger: TRIGGER.CODE_CHANGE,
        timestamp: Date.now(),
      });

      const manualHistory = autoUpdate.getHistory({ trigger: TRIGGER.MANUAL });
      expect(manualHistory.length).toBe(1);
      expect(manualHistory[0].trigger).toBe(TRIGGER.MANUAL);
    });
  });

  describe('getStats()', () => {
    it('should return statistics', () => {
      const stats = autoUpdate.getStats();

      expect(stats.totalUpdates).toBeDefined();
      expect(stats.successful).toBeDefined();
      expect(stats.failed).toBeDefined();
      expect(stats.rulesCount).toBeDefined();
      expect(stats.steeringFilesLoaded).toBeDefined();
    });
  });

  describe('clearHistory()', () => {
    it('should clear history', () => {
      autoUpdate.updates.set('test', { id: 'test' });
      autoUpdate.clearHistory();

      expect(autoUpdate.updates.size).toBe(0);
    });
  });

  describe('validateConsistency()', () => {
    it('should validate with empty steering', () => {
      const result = autoUpdate.validateConsistency();
      expect(result.valid).toBe(true);
      expect(result.issues).toBeInstanceOf(Array);
    });
  });

  describe('parseMarkdown()', () => {
    it('should parse markdown into sections', () => {
      const content = `# Header

Some content

## Section 1

Section 1 content

## Section 2

Section 2 content`;

      const parsed = autoUpdate.parseMarkdown(content);
      expect(parsed.size).toBeGreaterThan(0);
    });
  });
});

describe('createSteeringAutoUpdate()', () => {
  it('should create instance', () => {
    const instance = createSteeringAutoUpdate();
    expect(instance).toBeInstanceOf(SteeringAutoUpdate);
  });

  it('should accept options', () => {
    const instance = createSteeringAutoUpdate({ autoSave: false });
    expect(instance.autoSave).toBe(false);
  });
});

describe('TRIGGER enum', () => {
  it('should have all trigger types', () => {
    expect(TRIGGER.AGENT_WORK).toBe('agent-work');
    expect(TRIGGER.CODE_CHANGE).toBe('code-change');
    expect(TRIGGER.DEPENDENCY_UPDATE).toBe('dependency-update');
    expect(TRIGGER.CONFIG_CHANGE).toBe('config-change');
    expect(TRIGGER.MANUAL).toBe('manual');
    expect(TRIGGER.SCHEDULED).toBe('scheduled');
  });
});

describe('STEERING_TYPE enum', () => {
  it('should have all steering types', () => {
    expect(STEERING_TYPE.STRUCTURE).toBe('structure');
    expect(STEERING_TYPE.TECH).toBe('tech');
    expect(STEERING_TYPE.PRODUCT).toBe('product');
    expect(STEERING_TYPE.RULES).toBe('rules');
    expect(STEERING_TYPE.CUSTOM).toBe('custom');
  });
});

describe('DEFAULT_RULES', () => {
  it('should have default rules', () => {
    expect(DEFAULT_RULES).toBeInstanceOf(Array);
    expect(DEFAULT_RULES.length).toBeGreaterThan(0);
  });

  it('should have required rule properties', () => {
    for (const rule of DEFAULT_RULES) {
      expect(rule.id).toBeDefined();
      expect(rule.trigger).toBeDefined();
      expect(rule.target).toBeDefined();
      expect(typeof rule.condition).toBe('function');
      expect(typeof rule.update).toBe('function');
    }
  });
});

describe('DEFAULT_RULES conditions and updates', () => {
  describe('tech-deps-update rule', () => {
    const rule = DEFAULT_RULES.find(r => r.id === 'tech-deps-update');

    it('should trigger on packageJsonChanged', () => {
      expect(rule.condition({ packageJsonChanged: true })).toBe(true);
      expect(rule.condition({ packageJsonChanged: false })).toBe(false);
    });

    it('should handle new dependencies', async () => {
      const result = await rule.update({}, { newDependencies: ['lodash', 'express'] });
      expect(result.changes).toContain('Added dependencies: lodash, express');
    });

    it('should handle removed dependencies', async () => {
      const result = await rule.update({}, { removedDependencies: ['moment'] });
      expect(result.changes).toContain('Removed dependencies: moment');
    });

    it('should handle updated dependencies', async () => {
      const result = await rule.update({}, { updatedDependencies: ['jest'] });
      expect(result.changes).toContain('Updated dependencies: jest');
    });

    it('should handle empty context', async () => {
      const result = await rule.update({}, {});
      expect(result.changes).toEqual([]);
    });
  });

  describe('structure-dirs-update rule', () => {
    const rule = DEFAULT_RULES.find(r => r.id === 'structure-dirs-update');

    it('should trigger on new directories', () => {
      expect(rule.condition({ newDirectories: ['src/utils'] })).toBe(true);
      expect(rule.condition({ newDirectories: [] })).toBe(false);
      expect(rule.condition({})).toBe(false);
    });

    it('should generate changes for new directories', async () => {
      const result = await rule.update({}, { newDirectories: ['src/utils', 'lib/helpers'] });
      expect(result.section).toBe('directories');
      expect(result.changes).toHaveLength(2);
      expect(result.changes[0]).toContain('Added directory: src/utils');
    });
  });

  describe('structure-files-update rule', () => {
    const rule = DEFAULT_RULES.find(r => r.id === 'structure-files-update');

    it('should trigger on significant file changes', () => {
      expect(rule.condition({ significantFileChanges: true })).toBe(true);
      expect(rule.condition({ significantFileChanges: false })).toBe(false);
    });

    it('should handle new entry points', async () => {
      const result = await rule.update({}, { newEntryPoints: ['src/main.js'] });
      expect(result.changes).toContain('New entry points: src/main.js');
    });

    it('should handle new modules', async () => {
      const result = await rule.update({}, { newModules: ['utils', 'helpers'] });
      expect(result.changes).toContain('New modules: utils, helpers');
    });
  });

  describe('product-features-update rule', () => {
    const rule = DEFAULT_RULES.find(r => r.id === 'product-features-update');

    it('should trigger on feature completion', () => {
      expect(rule.condition({ featureCompleted: true })).toBe(true);
      expect(rule.condition({ featureCompleted: false })).toBe(false);
    });

    it('should generate changes for completed features', async () => {
      const result = await rule.update({}, { 
        featureName: 'User Auth',
        featureDescription: 'JWT-based authentication'
      });
      expect(result.section).toBe('features');
      expect(result.changes).toContain('Completed feature: User Auth');
      expect(result.changes).toContain('Description: JWT-based authentication');
    });

    it('should handle feature without description', async () => {
      const result = await rule.update({}, { featureName: 'Basic Feature' });
      expect(result.changes).toHaveLength(1);
    });
  });

  describe('rules-patterns-update rule', () => {
    const rule = DEFAULT_RULES.find(r => r.id === 'rules-patterns-update');

    it('should trigger on new patterns', () => {
      expect(rule.condition({ newPatterns: ['singleton'] })).toBe(true);
      expect(rule.condition({ newPatterns: [] })).toBe(false);
      expect(rule.condition({})).toBe(false);
    });

    it('should generate changes for patterns', async () => {
      const result = await rule.update({}, { newPatterns: ['factory', 'observer'] });
      expect(result.section).toBe('patterns');
      expect(result.changes).toContain('New pattern: factory');
      expect(result.changes).toContain('New pattern: observer');
    });
  });
});

describe('SteeringAutoUpdate advanced scenarios', () => {
  let autoUpdate;

  beforeEach(() => {
    autoUpdate = new SteeringAutoUpdate({ autoSave: false, backup: false });
  });

  describe('generateChangelog()', () => {
    it('should generate changelog with date header', () => {
      const changes = [
        { changes: ['Added feature A', 'Fixed bug B'] },
        { changes: ['Updated docs'] }
      ];
      
      const changelog = autoUpdate.generateChangelog(changes);
      expect(changelog).toContain('###');
      expect(changelog).toContain('- Added feature A');
      expect(changelog).toContain('- Fixed bug B');
      expect(changelog).toContain('- Updated docs');
    });
  });

  describe('extractDirectories()', () => {
    it('should extract directories from content', () => {
      const content = 'Project uses `src/` and `lib/` directories with `tests/` for testing.';
      const dirs = autoUpdate.extractDirectories(content);
      expect(dirs).toContain('src/');
      expect(dirs).toContain('lib/');
      expect(dirs).toContain('tests/');
    });

    it('should return empty array for no directories', () => {
      const content = 'No directories here.';
      const dirs = autoUpdate.extractDirectories(content);
      expect(dirs).toEqual([]);
    });
  });

  describe('validateConsistency() with content', () => {
    it('should detect mismatches between structure and tech', () => {
      autoUpdate.steering.set(STEERING_TYPE.STRUCTURE, {
        content: 'Uses `src/` directory',
      });
      autoUpdate.steering.set(STEERING_TYPE.TECH, {
        content: 'References `lib/` directory',
      });

      const result = autoUpdate.validateConsistency();
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].type).toBe('mismatch');
    });
  });

  describe('applyPendingChanges()', () => {
    it('should return empty when no pending changes', async () => {
      const result = await autoUpdate.applyPendingChanges();
      expect(result.applied).toEqual([]);
    });
  });

  describe('getHistory() with filters', () => {
    beforeEach(() => {
      autoUpdate.updates.set('u1', { id: 'u1', trigger: TRIGGER.MANUAL, file: 'a.md', success: true, timestamp: 1000 });
      autoUpdate.updates.set('u2', { id: 'u2', trigger: TRIGGER.CODE_CHANGE, file: 'b.md', success: false, timestamp: 2000 });
      autoUpdate.updates.set('u3', { id: 'u3', trigger: TRIGGER.MANUAL, file: 'a.md', success: true, timestamp: 3000 });
    });

    it('should filter by file', () => {
      const history = autoUpdate.getHistory({ file: 'a.md' });
      expect(history).toHaveLength(2);
    });

    it('should filter by success status', () => {
      const successHistory = autoUpdate.getHistory({ success: true });
      expect(successHistory).toHaveLength(2);
      
      const failHistory = autoUpdate.getHistory({ success: false });
      expect(failHistory).toHaveLength(1);
    });

    it('should combine multiple filters', () => {
      const history = autoUpdate.getHistory({ trigger: TRIGGER.MANUAL, file: 'a.md' });
      expect(history).toHaveLength(2);
    });
  });

  describe('processTrigger with rule failures', () => {
    it('should record failed updates when update throws', async () => {
      autoUpdate.addRule({
        id: 'failing-rule',
        trigger: TRIGGER.MANUAL,
        target: STEERING_TYPE.STRUCTURE,
        priority: 100,
        condition: () => true,
        update: async () => { throw new Error('Update failed'); },
      });

      autoUpdate.steering.set(STEERING_TYPE.STRUCTURE, {
        path: 'steering/structure.md',
        content: '# Structure',
        parsed: new Map(),
      });

      const results = await autoUpdate.processTrigger(TRIGGER.MANUAL, {});
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Update failed');
    });

    it('should skip when target not found', async () => {
      const events = [];
      autoUpdate.on('rule:skipped', e => events.push(e));

      autoUpdate.addRule({
        id: 'orphan-rule',
        trigger: TRIGGER.MANUAL,
        target: STEERING_TYPE.CUSTOM,
        condition: () => true,
        update: async () => ({ changes: ['test'] }),
      });

      await autoUpdate.processTrigger(TRIGGER.MANUAL, {});
      expect(events.find(e => e.reason === 'target not found')).toBeDefined();
    });
  });

  describe('event emissions', () => {
    it('should emit rule:added on addRule', () => {
      const events = [];
      autoUpdate.on('rule:added', e => events.push(e));

      autoUpdate.addRule({
        id: 'event-test',
        trigger: TRIGGER.MANUAL,
        target: STEERING_TYPE.TECH,
        condition: () => true,
        update: async () => ({ changes: [] }),
      });

      expect(events).toHaveLength(1);
      expect(events[0].ruleId).toBe('event-test');
    });

    it('should emit rule:removed on removeRule', () => {
      const events = [];
      autoUpdate.on('rule:removed', e => events.push(e));

      autoUpdate.addRule({
        id: 'to-remove',
        trigger: TRIGGER.MANUAL,
        target: STEERING_TYPE.TECH,
        condition: () => true,
        update: async () => ({ changes: [] }),
      });

      autoUpdate.removeRule('to-remove');
      expect(events).toHaveLength(1);
      expect(events[0].ruleId).toBe('to-remove');
    });
  });

  describe('generateId()', () => {
    it('should generate unique IDs', () => {
      const id1 = autoUpdate.generateId();
      const id2 = autoUpdate.generateId();
      expect(id1).not.toBe(id2);
      expect(id1).toContain('trigger-');
    });
  });
});
