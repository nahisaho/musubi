/**
 * AdaptiveGoalModifier Tests
 * 
 * Tests for adaptive goal modification functionality
 */

'use strict';

const {
  AdaptiveGoalModifier,
  ImpactAnalyzer,
  ModificationStrategy,
  ModificationHistoryManager,
  ModificationReason,
  ModificationType
} = require('../../../src/orchestration/replanning/adaptive-goal-modifier');

describe('AdaptiveGoalModifier', () => {
  let modifier;

  beforeEach(() => {
    modifier = new AdaptiveGoalModifier({ requireApproval: false });
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const mod = new AdaptiveGoalModifier();
      expect(mod).toBeInstanceOf(AdaptiveGoalModifier);
      expect(mod.config.requireApproval).toBe(true);
    });

    it('should accept custom config', () => {
      const custom = new AdaptiveGoalModifier({
        requireApproval: false,
        autoModifyThreshold: 0.5
      });
      expect(custom.config.requireApproval).toBe(false);
      expect(custom.config.autoModifyThreshold).toBe(0.5);
    });
  });

  describe('registerGoal', () => {
    it('should register a new goal', () => {
      const goal = {
        id: 'goal-1',
        name: 'Test Goal',
        priority: 'high',
        targetDate: '2025-12-31'
      };

      const result = modifier.registerGoal(goal);
      expect(result.id).toBe('goal-1');
      expect(result.status).toBe('active');
      expect(modifier.getGoal('goal-1')).toBeDefined();
    });

    it('should auto-generate ID if not provided', () => {
      const goal = { name: 'Auto Goal' };
      const result = modifier.registerGoal(goal);
      expect(result.id).toMatch(/^goal-\d+$/);
    });

    it('should set default values', () => {
      const goal = { id: 'default-goal', name: 'Default Test' };
      const result = modifier.registerGoal(goal);
      expect(result.priority).toBe('normal');
      expect(result.dependencies).toEqual([]);
      expect(result.deliverables).toEqual([]);
    });
  });

  describe('triggerModification', () => {
    beforeEach(() => {
      modifier.registerGoal({
        id: 'mod-goal',
        name: 'Modification Test Goal',
        priority: 'high',
        targetDate: new Date(Date.now() + 86400000 * 14).toISOString()
      });
    });

    it('should trigger timeline extension modification', async () => {
      const result = await modifier.triggerModification('mod-goal', {
        reason: ModificationReason.TIME_CONSTRAINT,
        gap: 0.3
      });

      expect(result.status).toBe('applied');
      expect(result.modification).toBeDefined();
    });

    it('should trigger scope reduction modification', async () => {
      modifier.registerGoal({
        id: 'scope-goal',
        name: 'Scope Test',
        deliverables: [
          { id: 'd1', name: 'Core Feature', priority: 'critical' },
          { id: 'd2', name: 'Nice to Have', priority: 'low' }
        ]
      });

      const result = await modifier.triggerModification('scope-goal', {
        reason: ModificationReason.RESOURCE_CONSTRAINT
      });

      expect(result.status).toBe('applied');
    });

    it('should throw error for non-existent goal', async () => {
      await expect(modifier.triggerModification('non-existent', {}))
        .rejects.toThrow('Goal not found');
    });
  });

  describe('approval workflow', () => {
    let approvalModifier;

    beforeEach(() => {
      approvalModifier = new AdaptiveGoalModifier({ 
        requireApproval: true,
        autoModifyThreshold: 0 // Force approval for all
      });

      approvalModifier.registerGoal({
        id: 'approval-goal',
        name: 'Approval Test Goal',
        priority: 'critical'
      });
    });

    it('should create pending modification when approval required', async () => {
      const result = await approvalModifier.triggerModification('approval-goal', {
        reason: ModificationReason.TIME_CONSTRAINT
      });

      expect(result.status).toBe('pending_approval');
      expect(approvalModifier.getPendingModifications()).toHaveLength(1);
    });

    it('should approve pending modification', async () => {
      const pending = await approvalModifier.triggerModification('approval-goal', {
        reason: ModificationReason.TIME_CONSTRAINT
      });

      const result = approvalModifier.approveModification(pending.modification.id);
      expect(result.status).toBe('applied');
    });

    it('should reject pending modification', async () => {
      const pending = await approvalModifier.triggerModification('approval-goal', {
        reason: ModificationReason.TIME_CONSTRAINT
      });

      const result = approvalModifier.rejectModification(
        pending.modification.id,
        'Not acceptable'
      );
      expect(result.status).toBe('rejected');
      expect(result.modification.rejectionReason).toBe('Not acceptable');
    });
  });

  describe('getGoalHistory', () => {
    it('should return history for modified goal', async () => {
      modifier.registerGoal({ id: 'hist-goal', name: 'History Goal' });

      await modifier.triggerModification('hist-goal', {
        reason: ModificationReason.TIME_CONSTRAINT
      });

      const history = modifier.getGoalHistory('hist-goal');
      expect(history.history).toHaveLength(1);
      expect(history.patterns).toBeDefined();
    });
  });

  describe('generateSuggestions', () => {
    it('should generate suggestions based on state', () => {
      modifier.registerGoal({
        id: 'suggest-goal',
        name: 'Suggestion Goal',
        targetDate: new Date(Date.now() + 86400000 * 7).toISOString()
      });

      const suggestions = modifier.generateSuggestions('suggest-goal', {
        progress: 0.2,
        timeElapsed: 0.7,
        resourceUtilization: 0.5
      });

      expect(suggestions.goalId).toBe('suggest-goal');
      expect(suggestions.suggestions).toBeInstanceOf(Array);
      expect(suggestions.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('event handling', () => {
    it('should emit event on modification applied', async () => {
      const handler = jest.fn();
      modifier.on('modification_applied', handler);

      modifier.registerGoal({ id: 'event-goal', name: 'Event Goal' });
      await modifier.triggerModification('event-goal', {
        reason: ModificationReason.PRIORITY_SHIFT
      });

      expect(handler).toHaveBeenCalled();
    });
  });
});

describe('ImpactAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new ImpactAnalyzer();
  });

  describe('analyzeImpact', () => {
    it('should analyze impact of timeline extension', () => {
      const goal = { id: 'impact-goal', priority: 'high' };
      const modification = { type: ModificationType.TIMELINE_EXTENSION };
      const context = { goals: [], milestones: [] };

      const impact = analyzer.analyzeImpact(goal, modification, context);

      expect(impact.goalId).toBe('impact-goal');
      expect(impact.totalScore).toBeGreaterThan(0);
      expect(impact.totalScore).toBeLessThanOrEqual(1);
      expect(impact.riskLevel).toBeDefined();
    });

    it('should identify high impact for goal cancellation', () => {
      const goal = { id: 'cancel-goal', priority: 'critical' };
      const modification = { type: ModificationType.GOAL_CANCELLATION };
      const context = { goals: [] };

      const impact = analyzer.analyzeImpact(goal, modification, context);

      // Goal cancellation has base impact of 1.0, but total score is weighted
      expect(impact.directImpact.score).toBe(1.0);
    });

    it('should analyze cascade impact on dependent goals', () => {
      const goal = { id: 'parent-goal' };
      const modification = { type: ModificationType.TIMELINE_EXTENSION };
      const context = {
        goals: [
          { id: 'child-goal', dependencies: ['parent-goal'], dependencyStrength: 0.8 }
        ]
      };

      const impact = analyzer.analyzeImpact(goal, modification, context);

      expect(impact.cascadeImpact).toBeDefined();
      expect(impact.cascadeImpact.affectedGoals.length).toBeGreaterThan(0);
    });
  });
});

describe('ModificationStrategy', () => {
  let strategy;

  beforeEach(() => {
    strategy = new ModificationStrategy();
  });

  describe('determineStrategy', () => {
    it('should recommend strategy for time constraint', () => {
      const goal = { id: 'time-goal', priority: 'high' };
      const trigger = { reason: ModificationReason.TIME_CONSTRAINT };
      const context = {};

      const result = strategy.determineStrategy(goal, trigger, context);

      expect(result.recommended).toBeDefined();
      expect(result.recommended.type).toBeDefined();
      expect(result.alternatives).toBeInstanceOf(Array);
    });

    it('should recommend decomposition for dependency failure', () => {
      const goal = { id: 'dep-goal' };
      const trigger = { reason: ModificationReason.DEPENDENCY_FAILURE };
      const context = {};

      const result = strategy.determineStrategy(goal, trigger, context);

      const types = [result.recommended.type, ...result.alternatives.map(a => a.type)];
      expect(types).toContain(ModificationType.GOAL_DECOMPOSITION);
    });

    it('should prefer conservative strategies in conservative mode', () => {
      const conservativeStrategy = new ModificationStrategy({ conservativeMode: true });
      const goal = { id: 'cons-goal' };
      const trigger = { reason: ModificationReason.SCOPE_CREEP };
      const context = {};

      const result = conservativeStrategy.determineStrategy(goal, trigger, context);

      expect(result.recommended.conservative).toBe(true);
    });
  });
});

describe('ModificationHistoryManager', () => {
  let manager;

  beforeEach(() => {
    manager = new ModificationHistoryManager();
  });

  describe('recordModification', () => {
    it('should record modification to history', () => {
      manager.recordModification('goal-1', {
        type: ModificationType.TIMELINE_EXTENSION
      }, { totalScore: 0.4 });

      const history = manager.getHistory('goal-1');
      expect(history).toHaveLength(1);
    });

    it('should limit history size', () => {
      const limitedManager = new ModificationHistoryManager({ maxHistoryPerGoal: 3 });

      for (let i = 0; i < 5; i++) {
        limitedManager.recordModification('goal-1', {
          type: ModificationType.PRIORITY_ADJUSTMENT
        }, {});
      }

      expect(limitedManager.getHistory('goal-1')).toHaveLength(3);
    });
  });

  describe('analyzePatterns', () => {
    it('should analyze modification patterns', () => {
      // Record multiple modifications
      manager.recordModification('pattern-goal', {
        type: ModificationType.TIMELINE_EXTENSION,
        reason: ModificationReason.TIME_CONSTRAINT
      }, {});
      manager.recordModification('pattern-goal', {
        type: ModificationType.TIMELINE_EXTENSION,
        reason: ModificationReason.TIME_CONSTRAINT
      }, {});
      manager.recordModification('pattern-goal', {
        type: ModificationType.SCOPE_REDUCTION,
        reason: ModificationReason.RESOURCE_CONSTRAINT
      }, {});

      const patterns = manager.analyzePatterns('pattern-goal');

      expect(patterns.totalModifications).toBe(3);
      expect(patterns.dominantType).toBe(ModificationType.TIMELINE_EXTENSION);
    });

    it('should generate insights for volatile goals', () => {
      for (let i = 0; i < 6; i++) {
        manager.recordModification('volatile-goal', {
          type: ModificationType.PRIORITY_ADJUSTMENT
        }, {});
      }

      const patterns = manager.analyzePatterns('volatile-goal');

      expect(patterns.insights.some(i => i.type === 'volatility')).toBe(true);
    });
  });

  describe('rollback', () => {
    it('should rollback modification', () => {
      manager.recordModification('rollback-goal', {
        type: ModificationType.SCOPE_REDUCTION
      }, {});

      const history = manager.getHistory('rollback-goal');
      const result = manager.rollback('rollback-goal', history[0].id);

      expect(result.status).toBe('rolled_back');
      expect(result.rolledBackAt).toBeDefined();
    });

    it('should return null for non-existent modification', () => {
      const result = manager.rollback('goal', 'non-existent');
      expect(result).toBeNull();
    });
  });
});

describe('ModificationReason constants', () => {
  it('should have all expected reasons', () => {
    expect(ModificationReason.TIME_CONSTRAINT).toBe('time_constraint');
    expect(ModificationReason.RESOURCE_CONSTRAINT).toBe('resource_constraint');
    expect(ModificationReason.DEPENDENCY_FAILURE).toBe('dependency_failure');
    expect(ModificationReason.PRIORITY_SHIFT).toBe('priority_shift');
    expect(ModificationReason.SCOPE_CREEP).toBe('scope_creep');
  });
});

describe('ModificationType constants', () => {
  it('should have all expected types', () => {
    expect(ModificationType.TIMELINE_EXTENSION).toBe('timeline_extension');
    expect(ModificationType.SCOPE_REDUCTION).toBe('scope_reduction');
    expect(ModificationType.GOAL_DECOMPOSITION).toBe('goal_decomposition');
    expect(ModificationType.GOAL_CANCELLATION).toBe('goal_cancellation');
  });
});
