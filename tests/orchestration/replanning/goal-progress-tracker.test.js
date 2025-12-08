/**
 * GoalProgressTracker Tests
 * 
 * Tests for goal progress tracking functionality
 */

'use strict';

const {
  GoalProgressTracker,
  Goal,
  ProgressSnapshot
} = require('../../../src/orchestration/replanning/goal-progress-tracker');

describe('GoalProgressTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new GoalProgressTracker();
  });

  afterEach(() => {
    tracker.stopTracking();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      expect(tracker).toBeInstanceOf(GoalProgressTracker);
      expect(tracker.config.enabled).toBe(true);
    });

    it('should accept custom config', () => {
      const custom = new GoalProgressTracker({
        config: {
          minProgressRate: 0.1,
          stallThreshold: 5
        }
      });
      expect(custom.config.minProgressRate).toBe(0.1);
      expect(custom.config.stallThreshold).toBe(5);
    });
  });

  describe('registerGoal', () => {
    it('should register a new goal', () => {
      const goal = tracker.registerGoal({
        id: 'goal-1',
        name: 'Test Goal'
      });

      expect(goal).toBeInstanceOf(Goal);
      expect(goal.id).toBe('goal-1');
      expect(tracker.goals.get('goal-1')).toBeDefined();
    });

    it('should auto-generate ID if not provided', () => {
      const goal = tracker.registerGoal({ name: 'Auto Goal' });
      expect(goal.id).toMatch(/^goal-\d+$/);
    });

    it('should register sub-goals', () => {
      tracker.registerGoal({
        id: 'parent',
        name: 'Parent Goal',
        subGoals: [
          { id: 'child-1', name: 'Child 1' },
          { id: 'child-2', name: 'Child 2' }
        ]
      });

      expect(tracker.goals.has('child-1')).toBe(true);
      expect(tracker.goals.has('child-2')).toBe(true);
    });
  });

  describe('updateProgress', () => {
    beforeEach(() => {
      tracker.registerGoal({ id: 'prog-goal', name: 'Progress Goal' });
    });

    it('should update goal progress', () => {
      tracker.updateProgress('prog-goal', 0.5);
      const goal = tracker.goals.get('prog-goal');
      expect(goal.progress).toBe(0.5);
    });

    it('should clamp progress between 0 and 1', () => {
      tracker.updateProgress('prog-goal', 1.5);
      expect(tracker.goals.get('prog-goal').progress).toBe(1);

      tracker.updateProgress('prog-goal', -0.5);
      expect(tracker.goals.get('prog-goal').progress).toBe(0);
    });

    it('should update status to in-progress', () => {
      tracker.updateProgress('prog-goal', 0.3);
      expect(tracker.goals.get('prog-goal').status).toBe('in-progress');
    });

    it('should update status to completed at threshold', () => {
      tracker.updateProgress('prog-goal', 1.0);
      expect(tracker.goals.get('prog-goal').status).toBe('completed');
    });

    it('should record progress history', () => {
      tracker.updateProgress('prog-goal', 0.2);
      tracker.updateProgress('prog-goal', 0.4);
      tracker.updateProgress('prog-goal', 0.6);

      const history = tracker.progressHistory.get('prog-goal');
      expect(history.length).toBe(3);
    });
  });

  describe('tracking', () => {
    it('should start and stop tracking', () => {
      expect(tracker.isTracking).toBe(false);
      
      tracker.startTracking();
      expect(tracker.isTracking).toBe(true);
      
      tracker.stopTracking();
      expect(tracker.isTracking).toBe(false);
    });

    it('should emit events on start/stop', () => {
      const startHandler = jest.fn();
      const stopHandler = jest.fn();

      tracker.on('tracking:started', startHandler);
      tracker.on('tracking:stopped', stopHandler);

      tracker.startTracking();
      expect(startHandler).toHaveBeenCalled();

      tracker.stopTracking();
      expect(stopHandler).toHaveBeenCalled();
    });
  });

  describe('event handling', () => {
    it('should emit event on goal registration', () => {
      const handler = jest.fn();
      tracker.on('goal:registered', handler);

      tracker.registerGoal({ id: 'event-goal', name: 'Event Goal' });

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].goal.id).toBe('event-goal');
    });

    it('should emit event on progress update', () => {
      const handler = jest.fn();
      tracker.on('progress:updated', handler);

      tracker.registerGoal({ id: 'prog-event-goal', name: 'Progress Event Goal' });
      tracker.updateProgress('prog-event-goal', 0.5);

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].goalId).toBe('prog-event-goal');
    });
  });
});

describe('Goal', () => {
  describe('constructor', () => {
    it('should create with defaults', () => {
      const goal = new Goal();
      expect(goal.id).toMatch(/^goal-\d+$/);
      expect(goal.name).toBe('Unnamed Goal');
      expect(goal.progress).toBe(0);
      expect(goal.status).toBe('pending');
    });

    it('should accept data', () => {
      const goal = new Goal({
        id: 'custom-goal',
        name: 'Custom Goal',
        priority: 5
      });
      expect(goal.id).toBe('custom-goal');
      expect(goal.name).toBe('Custom Goal');
      expect(goal.priority).toBe(5);
    });
  });

  describe('isComplete', () => {
    it('should return true when completed', () => {
      const goal = new Goal({ status: 'completed' });
      expect(goal.isComplete()).toBe(true);
    });

    it('should return true when progress is 1', () => {
      const goal = new Goal({ progress: 1.0 });
      expect(goal.isComplete()).toBe(true);
    });

    it('should return false when not complete', () => {
      const goal = new Goal({ progress: 0.5 });
      expect(goal.isComplete()).toBe(false);
    });
  });

  describe('hasSubGoals', () => {
    it('should return true when has sub-goals', () => {
      const goal = new Goal({
        subGoals: [{ name: 'Sub 1' }]
      });
      expect(goal.hasSubGoals()).toBe(true);
    });

    it('should return false when no sub-goals', () => {
      const goal = new Goal();
      expect(goal.hasSubGoals()).toBe(false);
    });
  });

  describe('calculateProgress', () => {
    it('should return direct progress when no sub-goals', () => {
      const goal = new Goal({ progress: 0.7 });
      expect(goal.calculateProgress()).toBe(0.7);
    });

    it('should calculate weighted average of sub-goals', () => {
      const goal = new Goal({
        subGoals: [
          { progress: 0.5, priority: 1 },
          { progress: 1.0, priority: 1 }
        ]
      });
      expect(goal.calculateProgress()).toBe(0.75);
    });

    it('should respect priority weights', () => {
      const goal = new Goal({
        subGoals: [
          { progress: 0.0, priority: 1 },  // weight 1
          { progress: 1.0, priority: 3 }   // weight 3
        ]
      });
      expect(goal.calculateProgress()).toBe(0.75); // (0*1 + 1*3) / 4
    });
  });

  describe('getETA', () => {
    it('should calculate ETA based on rate', () => {
      const goal = new Goal({ progress: 0.5 });
      const eta = goal.getETA(0.1); // 10% per time unit
      expect(eta).toBe(5); // 50% remaining / 10% rate = 5 time units
    });

    it('should return null for zero rate', () => {
      const goal = new Goal({ progress: 0.5 });
      expect(goal.getETA(0)).toBeNull();
    });
  });

  describe('isAtRisk', () => {
    it('should return false when no deadline', () => {
      const goal = new Goal();
      expect(goal.isAtRisk(0.1)).toBe(false);
    });

    it('should return true when ETA exceeds deadline', () => {
      const goal = new Goal({
        progress: 0.1,
        deadline: Date.now() + 1000 // 1 second from now
      });
      expect(goal.isAtRisk(0.0001)).toBe(true); // Very slow rate
    });
  });

  describe('toJSON', () => {
    it('should serialize goal', () => {
      const goal = new Goal({
        id: 'json-goal',
        name: 'JSON Goal',
        progress: 0.5
      });

      const json = goal.toJSON();
      expect(json.id).toBe('json-goal');
      expect(json.name).toBe('JSON Goal');
      expect(json.progress).toBe(0.5);
    });
  });
});

describe('ProgressSnapshot', () => {
  describe('constructor', () => {
    it('should create snapshot with values', () => {
      const snapshot = new ProgressSnapshot('goal-1', 0.5, 12345);
      expect(snapshot.goalId).toBe('goal-1');
      expect(snapshot.progress).toBe(0.5);
      expect(snapshot.timestamp).toBe(12345);
    });

    it('should use current time if not provided', () => {
      const before = Date.now();
      const snapshot = new ProgressSnapshot('goal-1', 0.5);
      const after = Date.now();

      expect(snapshot.timestamp).toBeGreaterThanOrEqual(before);
      expect(snapshot.timestamp).toBeLessThanOrEqual(after);
    });
  });
});
