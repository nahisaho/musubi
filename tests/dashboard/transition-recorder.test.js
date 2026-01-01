/**
 * TransitionRecorder Tests
 *
 * Requirement: IMP-6.2-003-02
 * Constitutional: Article III - Test-First
 */

const { TransitionRecorder } = require('../../src/dashboard/transition-recorder');

// Mock fs module
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    access: jest.fn(),
  },
}));

const fs = require('fs');
const mockFs = fs.promises;

describe('TransitionRecorder', () => {
  let recorder;

  beforeEach(() => {
    recorder = new TransitionRecorder({ storageDir: 'test-storage' });
    jest.clearAllMocks();
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.access.mockRejectedValue(new Error('ENOENT'));
    mockFs.writeFile.mockResolvedValue(undefined);
  });

  describe('recordTransition()', () => {
    it('should record a stage transition', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));

      const record = await recorder.recordTransition('FEAT-001', {
        fromStage: 'steering',
        toStage: 'requirements',
        status: 'completed',
      });

      expect(record.id).toBeDefined();
      expect(record.fromStage).toBe('steering');
      expect(record.toStage).toBe('requirements');
      expect(record.timestamp).toBeDefined();
    });

    it('should add transition to existing history', async () => {
      const existingHistory = {
        featureId: 'FEAT-002',
        transitions: [{ id: 'TR-1', fromStage: 'steering', toStage: 'requirements' }],
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(existingHistory));

      await recorder.recordTransition('FEAT-002', {
        fromStage: 'requirements',
        toStage: 'design',
      });

      expect(mockFs.writeFile).toHaveBeenCalled();
      const savedData = JSON.parse(mockFs.writeFile.mock.calls[0][1]);
      expect(savedData.transitions).toHaveLength(2);
    });

    it('should include optional fields', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));

      const record = await recorder.recordTransition('FEAT-003', {
        fromStage: 'design',
        toStage: 'implementation',
        reviewer: 'reviewer@example.com',
        reviewResult: 'approved',
        notes: 'Good design',
      });

      expect(record.reviewer).toBe('reviewer@example.com');
      expect(record.reviewResult).toBe('approved');
      expect(record.notes).toBe('Good design');
    });
  });

  describe('getHistory()', () => {
    it('should return transition history', async () => {
      const history = {
        featureId: 'FEAT-004',
        transitions: [{ id: 'TR-1', fromStage: 'steering', toStage: 'requirements' }],
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(history));

      const result = await recorder.getHistory('FEAT-004');

      expect(result).toBeDefined();
      expect(result.transitions).toHaveLength(1);
    });

    it('should return null for non-existent history', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));

      const result = await recorder.getHistory('NON-EXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('getLastTransition()', () => {
    it('should return last transition', async () => {
      const history = {
        featureId: 'FEAT-005',
        transitions: [
          { id: 'TR-1', fromStage: 'steering', toStage: 'requirements' },
          { id: 'TR-2', fromStage: 'requirements', toStage: 'design' },
        ],
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(history));

      const last = await recorder.getLastTransition('FEAT-005');

      expect(last.id).toBe('TR-2');
      expect(last.toStage).toBe('design');
    });

    it('should return null for empty history', async () => {
      const history = {
        featureId: 'FEAT-006',
        transitions: [],
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(history));

      const last = await recorder.getLastTransition('FEAT-006');

      expect(last).toBeNull();
    });
  });

  describe('getTransitionsByStage()', () => {
    it('should return transitions to specific stage', async () => {
      const history = {
        featureId: 'FEAT-007',
        transitions: [
          { id: 'TR-1', fromStage: 'steering', toStage: 'requirements' },
          { id: 'TR-2', fromStage: 'requirements', toStage: 'design' },
          { id: 'TR-3', fromStage: 'design', toStage: 'requirements' },
        ],
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(history));

      const transitions = await recorder.getTransitionsByStage('FEAT-007', 'requirements');

      expect(transitions).toHaveLength(2);
    });

    it('should return empty array for no matches', async () => {
      const history = {
        featureId: 'FEAT-008',
        transitions: [{ id: 'TR-1', fromStage: 'steering', toStage: 'requirements' }],
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(history));

      const transitions = await recorder.getTransitionsByStage('FEAT-008', 'validation');

      expect(transitions).toHaveLength(0);
    });
  });

  describe('calculateAverageTransitionTime()', () => {
    it('should calculate average time between transitions', async () => {
      const history = {
        featureId: 'FEAT-009',
        transitions: [
          { id: 'TR-1', timestamp: '2025-12-31T10:00:00Z' },
          { id: 'TR-2', timestamp: '2025-12-31T11:00:00Z' },
          { id: 'TR-3', timestamp: '2025-12-31T12:00:00Z' },
        ],
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(history));

      const avgTime = await recorder.calculateAverageTransitionTime('FEAT-009');

      expect(avgTime).toBe(3600000); // 1 hour in ms
    });

    it('should return 0 for single transition', async () => {
      const history = {
        featureId: 'FEAT-010',
        transitions: [{ id: 'TR-1', timestamp: '2025-12-31T10:00:00Z' }],
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(history));

      const avgTime = await recorder.calculateAverageTransitionTime('FEAT-010');

      expect(avgTime).toBe(0);
    });
  });

  describe('getTransitionStats()', () => {
    it('should return transition statistics', async () => {
      const history = {
        featureId: 'FEAT-011',
        transitions: [
          {
            id: 'TR-1',
            fromStage: 'steering',
            toStage: 'requirements',
            status: 'completed',
            timestamp: '2025-12-31T10:00:00Z',
          },
          {
            id: 'TR-2',
            fromStage: 'requirements',
            toStage: 'design',
            status: 'completed',
            timestamp: '2025-12-31T11:00:00Z',
          },
          {
            id: 'TR-3',
            fromStage: 'design',
            toStage: 'implementation',
            status: 'failed',
            timestamp: '2025-12-31T12:00:00Z',
          },
        ],
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(history));

      const stats = await recorder.getTransitionStats('FEAT-011');

      expect(stats.totalTransitions).toBe(3);
      expect(stats.successfulTransitions).toBe(2);
      expect(stats.failedTransitions).toBe(1);
      expect(stats.stageTransitions['steering->requirements']).toBe(1);
    });

    it('should return default stats for non-existent history', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));

      const stats = await recorder.getTransitionStats('NON-EXISTENT');

      expect(stats.totalTransitions).toBe(0);
      expect(stats.successfulTransitions).toBe(0);
    });
  });
});
