/**
 * SprintReporter Tests
 */

const { SprintReporter } = require('../../src/dashboard/sprint-reporter');
const fs = require('fs').promises;
const path = require('path');

describe('SprintReporter', () => {
  let reporter;
  const testStorageDir = 'storage/test-reports';

  beforeEach(() => {
    reporter = new SprintReporter({ storageDir: testStorageDir });
  });

  afterEach(async () => {
    // Cleanup test files
    try {
      const files = await fs.readdir(testStorageDir);
      for (const file of files) {
        await fs.unlink(path.join(testStorageDir, file));
      }
      await fs.rmdir(testStorageDir);
    } catch {
      // Ignore cleanup errors
    }
  });

  const createTestSprint = (overrides = {}) => ({
    id: 'SPRINT-001',
    name: 'Test Sprint',
    featureId: 'FEAT-001',
    startDate: '2024-01-01',
    endDate: '2024-01-15',
    startedAt: '2024-01-01T09:00:00Z',
    completedAt: '2024-01-15T18:00:00Z',
    velocity: 20,
    tasks: [
      { id: 'T-1', title: 'Task 1', priority: 'critical', storyPoints: 5, status: 'done' },
      { id: 'T-2', title: 'Task 2', priority: 'high', storyPoints: 8, status: 'done' },
      { id: 'T-3', title: 'Task 3', priority: 'medium', storyPoints: 3, status: 'in-progress' },
      { id: 'T-4', title: 'Task 4', priority: 'low', storyPoints: 2, status: 'todo' },
    ],
    ...overrides,
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const defaultReporter = new SprintReporter();
      expect(defaultReporter.config.storageDir).toBe('storage/reports');
    });

    it('should accept custom config', () => {
      const customReporter = new SprintReporter({ storageDir: 'custom/reports' });
      expect(customReporter.config.storageDir).toBe('custom/reports');
    });
  });

  describe('generateReport', () => {
    it('should generate report with all fields', async () => {
      const sprint = createTestSprint();
      const report = await reporter.generateReport(sprint);

      expect(report.id).toMatch(/^RPT-SPRINT-001-/);
      expect(report.sprintId).toBe('SPRINT-001');
      expect(report.sprintName).toBe('Test Sprint');
      expect(report.featureId).toBe('FEAT-001');
      expect(report.generatedAt).toBeDefined();
      expect(report.period).toBeDefined();
      expect(report.metrics).toBeDefined();
      expect(report.taskSummary).toBeDefined();
      expect(report.velocityAnalysis).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it('should persist report to storage', async () => {
      const sprint = createTestSprint();
      const report = await reporter.generateReport(sprint);

      const loaded = await reporter.loadReport(report.id);
      expect(loaded).toEqual(report);
    });
  });

  describe('calculateMetrics', () => {
    it('should calculate task metrics', () => {
      const sprint = createTestSprint();
      const metrics = reporter.calculateMetrics(sprint);

      expect(metrics.totalTasks).toBe(4);
      expect(metrics.completedTasks).toBe(2);
      expect(metrics.incompleteTasks).toBe(2);
      expect(metrics.completionRate).toBe(50);
    });

    it('should calculate point metrics', () => {
      const sprint = createTestSprint();
      const metrics = reporter.calculateMetrics(sprint);

      expect(metrics.totalPoints).toBe(18);
      expect(metrics.completedPoints).toBe(13);
      expect(metrics.remainingPoints).toBe(5);
      expect(metrics.pointsCompletionRate).toBe(72);
    });

    it('should calculate velocity metrics', () => {
      const sprint = createTestSprint();
      const metrics = reporter.calculateMetrics(sprint);

      expect(metrics.plannedVelocity).toBe(20);
      expect(metrics.actualVelocity).toBe(13);
      expect(metrics.velocityDiff).toBe(-7);
      expect(metrics.velocityAccuracy).toBe(65);
    });

    it('should handle empty tasks', () => {
      const sprint = createTestSprint({ tasks: [] });
      const metrics = reporter.calculateMetrics(sprint);

      expect(metrics.totalTasks).toBe(0);
      expect(metrics.completionRate).toBe(0);
      expect(metrics.pointsCompletionRate).toBe(0);
    });
  });

  describe('summarizeTasks', () => {
    it('should summarize by status', () => {
      const sprint = createTestSprint();
      const summary = reporter.summarizeTasks(sprint);

      expect(summary.byStatus.todo).toBe(1);
      expect(summary.byStatus.inProgress).toBe(1);
      expect(summary.byStatus.done).toBe(2);
    });

    it('should summarize by priority', () => {
      const sprint = createTestSprint();
      const summary = reporter.summarizeTasks(sprint);

      expect(summary.byPriority.critical).toBe(1);
      expect(summary.byPriority.high).toBe(1);
      expect(summary.byPriority.medium).toBe(1);
      expect(summary.byPriority.low).toBe(1);
    });

    it('should track completed by priority', () => {
      const sprint = createTestSprint();
      const summary = reporter.summarizeTasks(sprint);

      expect(summary.completedByPriority.critical).toBe(1);
      expect(summary.completedByPriority.high).toBe(1);
      expect(summary.completedByPriority.medium).toBe(0);
      expect(summary.completedByPriority.low).toBe(0);
    });

    it('should list incomplete tasks', () => {
      const sprint = createTestSprint();
      const summary = reporter.summarizeTasks(sprint);

      expect(summary.incompleteTasks).toHaveLength(2);
      expect(summary.incompleteTasks.map(t => t.id)).toContain('T-3');
      expect(summary.incompleteTasks.map(t => t.id)).toContain('T-4');
    });
  });

  describe('analyzeVelocity', () => {
    it('should detect on-target velocity', () => {
      const sprint = createTestSprint({
        velocity: 13, // actual is 13
        tasks: [
          { id: 'T-1', storyPoints: 8, status: 'done' },
          { id: 'T-2', storyPoints: 5, status: 'done' },
        ],
      });
      const analysis = reporter.analyzeVelocity(sprint);

      expect(analysis.status).toBe('on-target');
      expect(analysis.accuracy).toBe(100);
    });

    it('should detect over-performing velocity', () => {
      const sprint = createTestSprint({
        velocity: 10,
        tasks: [{ id: 'T-1', storyPoints: 12, status: 'done' }],
      });
      const analysis = reporter.analyzeVelocity(sprint);

      expect(analysis.status).toBe('over-performing');
      expect(analysis.accuracy).toBe(120);
    });

    it('should detect slightly-under velocity', () => {
      const sprint = createTestSprint({
        velocity: 20,
        tasks: [{ id: 'T-1', storyPoints: 15, status: 'done' }],
      });
      const analysis = reporter.analyzeVelocity(sprint);

      expect(analysis.status).toBe('slightly-under');
      expect(analysis.accuracy).toBe(75);
    });

    it('should detect under-performing velocity', () => {
      const sprint = createTestSprint({
        velocity: 20,
        tasks: [{ id: 'T-1', storyPoints: 10, status: 'done' }],
      });
      const analysis = reporter.analyzeVelocity(sprint);

      expect(analysis.status).toBe('under-performing');
      expect(analysis.accuracy).toBe(50);
    });
  });

  describe('generateRecommendations', () => {
    it('should recommend velocity reduction for under-performance', () => {
      const sprint = createTestSprint({
        velocity: 30,
        tasks: [{ id: 'T-1', storyPoints: 10, status: 'done', priority: 'medium' }],
      });
      const recommendations = reporter.generateRecommendations(sprint);

      const velocityRec = recommendations.find(r => r.type === 'velocity');
      expect(velocityRec).toBeDefined();
      expect(velocityRec.severity).toBe('high');
    });

    it('should recommend velocity increase for over-performance', () => {
      const sprint = createTestSprint({
        velocity: 10,
        tasks: [{ id: 'T-1', storyPoints: 15, status: 'done', priority: 'medium' }],
      });
      const recommendations = reporter.generateRecommendations(sprint);

      const velocityRec = recommendations.find(r => r.type === 'velocity');
      expect(velocityRec).toBeDefined();
      expect(velocityRec.severity).toBe('medium');
    });

    it('should alert for incomplete critical tasks', () => {
      const sprint = createTestSprint({
        tasks: [{ id: 'T-1', storyPoints: 5, status: 'todo', priority: 'critical' }],
      });
      const recommendations = reporter.generateRecommendations(sprint);

      const priorityRec = recommendations.find(r => r.type === 'priority');
      expect(priorityRec).toBeDefined();
      expect(priorityRec.severity).toBe('critical');
    });

    it('should recommend planning improvement for low completion rate', () => {
      const sprint = createTestSprint({
        tasks: [
          { id: 'T-1', storyPoints: 5, status: 'todo', priority: 'medium' },
          { id: 'T-2', storyPoints: 5, status: 'todo', priority: 'medium' },
          { id: 'T-3', storyPoints: 5, status: 'todo', priority: 'medium' },
        ],
      });
      const recommendations = reporter.generateRecommendations(sprint);

      const planningRec = recommendations.find(r => r.type === 'planning');
      expect(planningRec).toBeDefined();
    });

    it('should recommend WIP limit for many in-progress tasks', () => {
      const sprint = createTestSprint({
        velocity: 50,
        tasks: [
          { id: 'T-1', storyPoints: 5, status: 'in-progress', priority: 'medium' },
          { id: 'T-2', storyPoints: 5, status: 'in-progress', priority: 'medium' },
          { id: 'T-3', storyPoints: 5, status: 'in-progress', priority: 'medium' },
          { id: 'T-4', storyPoints: 5, status: 'in-progress', priority: 'medium' },
        ],
      });
      const recommendations = reporter.generateRecommendations(sprint);

      const wipRec = recommendations.find(r => r.type === 'wip');
      expect(wipRec).toBeDefined();
    });
  });

  describe('generateMarkdownReport', () => {
    it('should generate markdown report', async () => {
      const sprint = createTestSprint();
      const markdown = await reporter.generateMarkdownReport(sprint);

      expect(markdown).toContain('# Sprint Report: Test Sprint');
      expect(markdown).toContain('**Feature:** FEAT-001');
      expect(markdown).toContain('## Metrics');
      expect(markdown).toContain('## Velocity Analysis');
      expect(markdown).toContain('## Task Summary');
    });

    it('should include task status summary', async () => {
      const sprint = createTestSprint();
      const markdown = await reporter.generateMarkdownReport(sprint);

      expect(markdown).toContain('⬜ Todo:');
      expect(markdown).toContain('🔄 In Progress:');
      expect(markdown).toContain('✅ Done:');
    });

    it('should include priority breakdown', async () => {
      const sprint = createTestSprint();
      const markdown = await reporter.generateMarkdownReport(sprint);

      expect(markdown).toContain('🔴 Critical:');
      expect(markdown).toContain('🟠 High:');
      expect(markdown).toContain('🟡 Medium:');
      expect(markdown).toContain('🟢 Low:');
    });

    it('should list incomplete tasks', async () => {
      const sprint = createTestSprint();
      const markdown = await reporter.generateMarkdownReport(sprint);

      expect(markdown).toContain('### Incomplete Tasks');
      expect(markdown).toContain('T-3');
      expect(markdown).toContain('T-4');
    });
  });

  describe('listReports', () => {
    it('should list reports for sprint', async () => {
      const sprint = createTestSprint();
      await reporter.generateReport(sprint);
      await reporter.generateReport(sprint);

      const reports = await reporter.listReports('SPRINT-001');
      expect(reports).toHaveLength(2);
    });

    it('should return empty array for non-existent sprint', async () => {
      const reports = await reporter.listReports('NON-EXISTENT');
      expect(reports).toEqual([]);
    });
  });

  describe('loadReport', () => {
    it('should return null for non-existent report', async () => {
      const report = await reporter.loadReport('NON-EXISTENT');
      expect(report).toBeNull();
    });
  });
});
