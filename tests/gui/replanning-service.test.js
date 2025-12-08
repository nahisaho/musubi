/**
 * @fileoverview ReplanningService Tests
 */

const { ReplanningService } = require('../../src/gui/services/replanning-service');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

describe('ReplanningService', () => {
  let service;
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'musubi-replanning-test-'));
    service = new ReplanningService(tempDir);
    await service.initialize();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('initialization', () => {
    test('should initialize with default state', async () => {
      const state = await service.getState();
      
      expect(state).toBeDefined();
      expect(state.status).toBe('idle');
      expect(state.currentPlan).toBeNull();
      expect(state.history).toEqual([]);
      expect(state.metrics).toBeDefined();
    });

    test('should create storage directory', async () => {
      const storagePath = path.join(tempDir, 'storage', 'replanning');
      const exists = await fs.access(storagePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('getGoalProgress', () => {
    test('should return empty goals by default', async () => {
      const goals = await service.getGoalProgress();
      
      expect(goals).toBeDefined();
      expect(goals.goals).toEqual([]);
      expect(goals.overallProgress).toBe(0);
    });

    test('should return saved goals', async () => {
      const goalsData = {
        goals: [
          { id: 'G1', progress: 50 },
          { id: 'G2', progress: 100 }
        ],
        overallProgress: 75,
        activeGoals: 1,
        completedGoals: 1
      };
      
      const goalsFile = path.join(tempDir, 'storage', 'replanning', 'goals.json');
      await fs.writeFile(goalsFile, JSON.stringify(goalsData));
      
      const goals = await service.getGoalProgress();
      expect(goals.overallProgress).toBe(75);
      expect(goals.goals.length).toBe(2);
    });
  });

  describe('getPathOptimization', () => {
    test('should return idle status by default', async () => {
      const optimization = await service.getPathOptimization();
      
      expect(optimization).toBeDefined();
      expect(optimization.status).toBe('idle');
      expect(optimization.suggestions).toEqual([]);
    });
  });

  describe('getHistory', () => {
    test('should return empty history by default', async () => {
      const history = await service.getHistory();
      expect(history).toEqual([]);
    });

    test('should return limited history', async () => {
      const historyDir = path.join(tempDir, 'storage', 'replanning', 'history');
      await fs.mkdir(historyDir, { recursive: true });
      
      for (let i = 0; i < 10; i++) {
        await fs.writeFile(
          path.join(historyDir, `replan-${i}.json`),
          JSON.stringify({ id: `replan-${i}`, trigger: 'test' })
        );
      }
      
      const history = await service.getHistory(5);
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  describe('updateState', () => {
    test('should update and persist state', async () => {
      await service.updateState({ status: 'monitoring' });
      
      const state = await service.getState();
      expect(state.status).toBe('monitoring');
    });

    test('should emit state:updated event', async () => {
      const eventHandler = jest.fn();
      service.on('state:updated', eventHandler);
      
      await service.updateState({ status: 'replanning' });
      
      expect(eventHandler).toHaveBeenCalled();
      expect(eventHandler.mock.calls[0][0].status).toBe('replanning');
    });
  });

  describe('recordReplan', () => {
    test('should record replan event', async () => {
      await service.recordReplan({
        trigger: 'failure',
        reason: 'Test failure',
        success: true
      });
      
      const history = await service.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].trigger).toBe('failure');
    });

    test('should update metrics on replan', async () => {
      await service.recordReplan({ trigger: 'test', success: true });
      await service.recordReplan({ trigger: 'test', success: false });
      
      const state = await service.getState();
      expect(state.metrics.totalReplans).toBe(2);
      expect(state.metrics.successfulReplans).toBe(1);
    });

    test('should emit replan:recorded event', async () => {
      const eventHandler = jest.fn();
      service.on('replan:recorded', eventHandler);
      
      await service.recordReplan({ trigger: 'manual' });
      
      expect(eventHandler).toHaveBeenCalled();
    });
  });

  describe('getSummary', () => {
    test('should return complete summary', async () => {
      await service.recordReplan({ trigger: 'test', success: true });
      
      const summary = await service.getSummary();
      
      expect(summary).toBeDefined();
      expect(summary.status).toBe('idle');
      expect(summary.goalProgress).toBeDefined();
      expect(summary.optimization).toBeDefined();
      expect(summary.metrics).toBeDefined();
      expect(summary.recentHistory).toBeDefined();
      expect(summary.metrics.totalReplans).toBe(1);
    });

    test('should calculate success rate', async () => {
      await service.recordReplan({ trigger: 'test1', success: true });
      await service.recordReplan({ trigger: 'test2', success: true });
      await service.recordReplan({ trigger: 'test3', success: false });
      
      const summary = await service.getSummary();
      expect(summary.metrics.successRate).toBe(67); // 2/3 = 66.67 rounded
    });
  });
});
