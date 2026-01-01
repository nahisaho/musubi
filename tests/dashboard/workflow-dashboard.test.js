/**
 * WorkflowDashboard Tests
 *
 * Requirement: IMP-6.2-003-01
 * Constitutional: Article III - Test-First
 */

const { WorkflowDashboard, STAGE_STATUS } = require('../../src/dashboard/workflow-dashboard');

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

describe('WorkflowDashboard', () => {
  let dashboard;

  beforeEach(() => {
    dashboard = new WorkflowDashboard({ storageDir: 'test-storage' });
    jest.clearAllMocks();
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.access.mockRejectedValue(new Error('ENOENT'));
    mockFs.writeFile.mockResolvedValue(undefined);
  });

  describe('createWorkflow()', () => {
    it('should create a new workflow with default stages', async () => {
      const workflow = await dashboard.createWorkflow('FEAT-001', {
        title: 'Test Feature',
      });

      expect(workflow.featureId).toBe('FEAT-001');
      expect(workflow.title).toBe('Test Feature');
      expect(Object.keys(workflow.stages)).toHaveLength(5);
    });

    it('should initialize first stage as in-progress', async () => {
      const workflow = await dashboard.createWorkflow('FEAT-002');

      expect(workflow.stages.steering.status).toBe(STAGE_STATUS.IN_PROGRESS);
      expect(workflow.stages.steering.startedAt).toBeDefined();
    });

    it('should set currentStage to steering', async () => {
      const workflow = await dashboard.createWorkflow('FEAT-003');

      expect(workflow.currentStage).toBe('steering');
    });

    it('should save workflow to storage', async () => {
      await dashboard.createWorkflow('FEAT-004');

      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });

  describe('getWorkflow()', () => {
    it('should return cached workflow', async () => {
      await dashboard.createWorkflow('FEAT-005');
      const workflow = await dashboard.getWorkflow('FEAT-005');

      expect(workflow).toBeDefined();
      expect(workflow.featureId).toBe('FEAT-005');
    });

    it('should load workflow from storage if not cached', async () => {
      const savedWorkflow = {
        featureId: 'FEAT-006',
        title: 'Loaded Feature',
        stages: {},
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(savedWorkflow));

      const workflow = await dashboard.getWorkflow('FEAT-006');

      expect(workflow.featureId).toBe('FEAT-006');
    });

    it('should return null for non-existent workflow', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));

      const workflow = await dashboard.getWorkflow('NON-EXISTENT');

      expect(workflow).toBeNull();
    });
  });

  describe('updateStage()', () => {
    it('should update stage status', async () => {
      await dashboard.createWorkflow('FEAT-007');
      const workflow = await dashboard.updateStage('FEAT-007', 'steering', STAGE_STATUS.COMPLETED);

      expect(workflow.stages.steering.status).toBe(STAGE_STATUS.COMPLETED);
      expect(workflow.stages.steering.completedAt).toBeDefined();
    });

    it('should throw error for invalid stage', async () => {
      await dashboard.createWorkflow('FEAT-008');

      await expect(
        dashboard.updateStage('FEAT-008', 'invalid-stage', STAGE_STATUS.COMPLETED)
      ).rejects.toThrow('Invalid stage');
    });

    it('should add artifacts when provided', async () => {
      await dashboard.createWorkflow('FEAT-009');
      const workflow = await dashboard.updateStage('FEAT-009', 'steering', STAGE_STATUS.COMPLETED, {
        artifacts: ['structure.md', 'tech.md'],
      });

      expect(workflow.stages.steering.artifacts).toContain('structure.md');
      expect(workflow.stages.steering.artifacts).toContain('tech.md');
    });
  });

  describe('addBlocker()', () => {
    it('should add blocker to workflow', async () => {
      await dashboard.createWorkflow('FEAT-010');
      const workflow = await dashboard.addBlocker('FEAT-010', {
        stage: 'requirements',
        description: 'Missing stakeholder approval',
        severity: 'high',
      });

      expect(workflow.blockers).toHaveLength(1);
      expect(workflow.blockers[0].description).toBe('Missing stakeholder approval');
    });

    it('should mark stage as blocked', async () => {
      await dashboard.createWorkflow('FEAT-011');
      const workflow = await dashboard.addBlocker('FEAT-011', {
        stage: 'steering',
        description: 'Test blocker',
      });

      expect(workflow.stages.steering.status).toBe(STAGE_STATUS.BLOCKED);
    });
  });

  describe('resolveBlocker()', () => {
    it('should resolve blocker', async () => {
      await dashboard.createWorkflow('FEAT-012');
      let workflow = await dashboard.addBlocker('FEAT-012', {
        stage: 'steering',
        description: 'Test blocker',
      });

      const blockerId = workflow.blockers[0].id;
      workflow = await dashboard.resolveBlocker('FEAT-012', blockerId, 'Stakeholder approved');

      expect(workflow.blockers[0].resolvedAt).toBeDefined();
      expect(workflow.blockers[0].resolution).toBe('Stakeholder approved');
    });

    it('should unblock stage when all blockers resolved', async () => {
      await dashboard.createWorkflow('FEAT-013');
      let workflow = await dashboard.addBlocker('FEAT-013', {
        stage: 'steering',
        description: 'Test blocker',
      });

      const blockerId = workflow.blockers[0].id;
      workflow = await dashboard.resolveBlocker('FEAT-013', blockerId, 'Fixed');

      expect(workflow.stages.steering.status).toBe(STAGE_STATUS.IN_PROGRESS);
    });
  });

  describe('suggestNextActions()', () => {
    it('should suggest resolving blockers first', async () => {
      await dashboard.createWorkflow('FEAT-014');
      await dashboard.addBlocker('FEAT-014', {
        stage: 'steering',
        description: 'Test blocker',
      });

      const actions = await dashboard.suggestNextActions('FEAT-014');

      expect(actions[0].type).toBe('resolve-blocker');
      expect(actions[0].priority).toBe('high');
    });

    it('should suggest stage-specific actions', async () => {
      await dashboard.createWorkflow('FEAT-015');

      const actions = await dashboard.suggestNextActions('FEAT-015');

      expect(actions.some(a => a.type === 'create-artifact')).toBe(true);
    });
  });

  describe('calculateCompletion()', () => {
    it('should return 0% for new workflow', async () => {
      await dashboard.createWorkflow('FEAT-016');

      const completion = await dashboard.calculateCompletion('FEAT-016');

      expect(completion).toBe(0);
    });

    it('should calculate percentage based on completed stages', async () => {
      await dashboard.createWorkflow('FEAT-017');
      await dashboard.updateStage('FEAT-017', 'steering', STAGE_STATUS.COMPLETED);

      const completion = await dashboard.calculateCompletion('FEAT-017');

      expect(completion).toBe(20); // 1/5 = 20%
    });
  });

  describe('getSummary()', () => {
    it('should return workflow summary', async () => {
      await dashboard.createWorkflow('FEAT-018', {
        title: 'Summary Test Feature',
      });

      const summary = await dashboard.getSummary('FEAT-018');

      expect(summary.featureId).toBe('FEAT-018');
      expect(summary.title).toBe('Summary Test Feature');
      expect(summary.currentStage).toBe('steering');
      expect(summary.completion).toBe(0);
      expect(summary.stages).toHaveLength(5);
    });

    it('should include blocker count', async () => {
      await dashboard.createWorkflow('FEAT-019');
      await dashboard.addBlocker('FEAT-019', {
        stage: 'steering',
        description: 'Test blocker',
      });

      const summary = await dashboard.getSummary('FEAT-019');

      expect(summary.blockerCount).toBe(1);
    });
  });
});
