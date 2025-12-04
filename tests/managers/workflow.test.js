/**
 * Workflow Engine Tests
 */

const { WorkflowEngine, WORKFLOW_STAGES } = require('../../src/managers/workflow');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

describe('WorkflowEngine', () => {
  let engine;
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'musubi-workflow-test-'));
    engine = new WorkflowEngine(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('initWorkflow', () => {
    it('should initialize workflow with default stage', async () => {
      const state = await engine.initWorkflow('test-feature');
      
      expect(state.feature).toBe('test-feature');
      expect(state.currentStage).toBe('requirements');
      expect(state.stages.requirements.status).toBe('in-progress');
      expect(state.history).toHaveLength(1);
      expect(state.history[0].action).toBe('workflow-started');
    });

    it('should initialize workflow with custom start stage', async () => {
      const state = await engine.initWorkflow('test-feature', { startStage: 'spike' });
      
      expect(state.currentStage).toBe('spike');
      expect(state.stages.spike.status).toBe('in-progress');
    });
  });

  describe('transitionTo', () => {
    it('should allow valid transitions', async () => {
      await engine.initWorkflow('test-feature');
      
      const state = await engine.transitionTo('design');
      
      expect(state.currentStage).toBe('design');
      expect(state.stages.requirements.status).toBe('completed');
      expect(state.stages.design.status).toBe('in-progress');
    });

    it('should reject invalid transitions', async () => {
      await engine.initWorkflow('test-feature');
      
      await expect(engine.transitionTo('deployment'))
        .rejects.toThrow('Invalid transition');
    });

    it('should track stage attempts on re-entry', async () => {
      await engine.initWorkflow('test-feature');
      await engine.transitionTo('design');
      await engine.transitionTo('tasks');
      await engine.transitionTo('implementation');
      await engine.transitionTo('review');
      // Go back to implementation (feedback loop)
      await engine.transitionTo('implementation');
      
      const state = await engine.getState();
      expect(state.stages.implementation.attempts).toBe(2);
    });
  });

  describe('recordFeedbackLoop', () => {
    it('should record feedback loop in history', async () => {
      await engine.initWorkflow('test-feature');
      await engine.transitionTo('design');
      await engine.transitionTo('tasks');
      await engine.transitionTo('implementation');
      await engine.transitionTo('review');
      
      await engine.recordFeedbackLoop('review', 'implementation', 'Code needs refactoring');
      
      const state = await engine.getState();
      const feedbackEvent = state.history.find(h => h.action === 'feedback-loop');
      
      expect(feedbackEvent).toBeDefined();
      expect(feedbackEvent.from).toBe('review');
      expect(feedbackEvent.to).toBe('implementation');
      expect(feedbackEvent.reason).toBe('Code needs refactoring');
    });
  });

  describe('completeWorkflow', () => {
    it('should complete workflow and generate summary', async () => {
      await engine.initWorkflow('test-feature');
      await engine.transitionTo('design');
      await engine.transitionTo('tasks');
      
      const summary = await engine.completeWorkflow('All done!');
      
      expect(summary.feature).toBe('test-feature');
      expect(summary.stages).toHaveLength(3);
      expect(summary.feedbackLoops).toBe(0);
      
      const state = await engine.getState();
      expect(state.status).toBe('completed');
    });
  });

  describe('getMetricsSummary', () => {
    it('should return message when no metrics', async () => {
      const summary = await engine.getMetricsSummary();
      expect(summary.message).toBe('No metrics recorded yet.');
    });

    it('should calculate metrics from recorded data', async () => {
      await engine.initWorkflow('feature-1');
      await engine.transitionTo('design');
      await engine.transitionTo('tasks');
      await engine.completeWorkflow();
      
      const summary = await engine.getMetricsSummary();
      
      expect(summary.totalWorkflows).toBe(1);
      expect(summary.completedWorkflows).toBe(1);
      expect(summary.stageTransitions).toBe(2);
      expect(summary.feedbackLoops).toBe(0);
    });
  });

  describe('getValidTransitions', () => {
    it('should return valid transitions for current stage', async () => {
      await engine.initWorkflow('test-feature');
      
      const transitions = await engine.getValidTransitions();
      expect(transitions).toContain('design');
    });

    it('should return empty array when no state', async () => {
      const transitions = await engine.getValidTransitions();
      expect(transitions).toEqual([]);
    });
  });
});

describe('WORKFLOW_STAGES', () => {
  it('should define valid transitions for all stages', () => {
    expect(WORKFLOW_STAGES.requirements.next).toContain('design');
    expect(WORKFLOW_STAGES.design.next).toContain('tasks');
    expect(WORKFLOW_STAGES.tasks.next).toContain('implementation');
    expect(WORKFLOW_STAGES.implementation.next).toContain('review');
    expect(WORKFLOW_STAGES.review.next).toContain('testing');
    expect(WORKFLOW_STAGES.review.next).toContain('implementation'); // Feedback loop
    expect(WORKFLOW_STAGES.testing.next).toContain('deployment');
    expect(WORKFLOW_STAGES.testing.next).toContain('implementation'); // Feedback loop
  });

  it('should mark optional stages', () => {
    expect(WORKFLOW_STAGES.spike.optional).toBe(true);
    expect(WORKFLOW_STAGES.research.optional).toBe(true);
  });
});
