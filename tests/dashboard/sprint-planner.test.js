/**
 * SprintPlanner Tests
 */

const { SprintPlanner, PRIORITY } = require('../../src/dashboard/sprint-planner');
const fs = require('fs').promises;
const path = require('path');

describe('SprintPlanner', () => {
  let planner;
  const testStorageDir = 'storage/test-sprints';

  beforeEach(() => {
    planner = new SprintPlanner({ storageDir: testStorageDir });
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

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const defaultPlanner = new SprintPlanner();
      expect(defaultPlanner.config.storageDir).toBe('storage/sprints');
      expect(defaultPlanner.config.defaultSprintDuration).toBe(14);
      expect(defaultPlanner.config.defaultVelocity).toBe(20);
    });

    it('should accept custom config', () => {
      const customPlanner = new SprintPlanner({ 
        storageDir: 'custom/path',
        defaultVelocity: 30 
      });
      expect(customPlanner.config.storageDir).toBe('custom/path');
      expect(customPlanner.config.defaultVelocity).toBe(30);
    });
  });

  describe('createSprint', () => {
    it('should create sprint with required fields', async () => {
      const sprint = await planner.createSprint({
        name: 'Sprint 1',
        featureId: 'FEAT-001',
        goal: 'Implement feature X'
      });

      expect(sprint.id).toBeDefined();
      expect(sprint.name).toBe('Sprint 1');
      expect(sprint.featureId).toBe('FEAT-001');
      expect(sprint.goal).toBe('Implement feature X');
      expect(sprint.status).toBe('planning');
      expect(sprint.tasks).toEqual([]);
    });

    it('should use custom sprint ID if provided', async () => {
      const sprint = await planner.createSprint({
        sprintId: 'SPRINT-CUSTOM',
        name: 'Custom Sprint'
      });

      expect(sprint.id).toBe('SPRINT-CUSTOM');
    });

    it('should calculate end date from duration', async () => {
      const sprint = await planner.createSprint({
        name: 'Test Sprint',
        startDate: '2024-01-01'
      });

      expect(sprint.startDate).toBe('2024-01-01');
      expect(sprint.endDate).toBe('2024-01-15'); // 14 days later
    });

    it('should persist sprint to storage', async () => {
      const sprint = await planner.createSprint({
        sprintId: 'PERSIST-TEST',
        name: 'Persist Test'
      });

      const loaded = await planner.loadSprint('PERSIST-TEST');
      expect(loaded).toEqual(sprint);
    });
  });

  describe('addTasks', () => {
    it('should add tasks to sprint', async () => {
      await planner.createSprint({
        sprintId: 'SPRINT-TASKS',
        name: 'Tasks Sprint'
      });

      const updated = await planner.addTasks('SPRINT-TASKS', [
        { title: 'Task 1', storyPoints: 3 },
        { title: 'Task 2', storyPoints: 5 }
      ]);

      expect(updated.tasks).toHaveLength(2);
      expect(updated.tasks[0].title).toBe('Task 1');
      expect(updated.tasks[0].storyPoints).toBe(3);
      expect(updated.tasks[0].status).toBe('todo');
    });

    it('should add task with requirement ID', async () => {
      await planner.createSprint({
        sprintId: 'SPRINT-REQ',
        name: 'Req Sprint'
      });

      const updated = await planner.addTasks('SPRINT-REQ', [
        { 
          title: 'Implement REQ-001', 
          requirementId: 'REQ-001',
          priority: PRIORITY.HIGH
        }
      ]);

      expect(updated.tasks[0].requirementId).toBe('REQ-001');
      expect(updated.tasks[0].priority).toBe('high');
    });

    it('should throw error for non-existent sprint', async () => {
      await expect(planner.addTasks('NON-EXISTENT', []))
        .rejects.toThrow('Sprint not found');
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status', async () => {
      await planner.createSprint({
        sprintId: 'SPRINT-STATUS',
        name: 'Status Sprint'
      });

      await planner.addTasks('SPRINT-STATUS', [
        { id: 'T-001', title: 'Task 1' }
      ]);

      const updated = await planner.updateTaskStatus('SPRINT-STATUS', 'T-001', 'in-progress');
      expect(updated.tasks[0].status).toBe('in-progress');
    });

    it('should set completedAt when status is done', async () => {
      await planner.createSprint({
        sprintId: 'SPRINT-DONE',
        name: 'Done Sprint'
      });

      await planner.addTasks('SPRINT-DONE', [
        { id: 'T-002', title: 'Task 2' }
      ]);

      const updated = await planner.updateTaskStatus('SPRINT-DONE', 'T-002', 'done');
      expect(updated.tasks[0].completedAt).toBeDefined();
    });

    it('should throw error for non-existent task', async () => {
      await planner.createSprint({
        sprintId: 'SPRINT-NOTASK',
        name: 'No Task Sprint'
      });

      await expect(planner.updateTaskStatus('SPRINT-NOTASK', 'FAKE', 'done'))
        .rejects.toThrow('Task not found');
    });
  });

  describe('startSprint', () => {
    it('should start sprint and update status', async () => {
      await planner.createSprint({
        sprintId: 'SPRINT-START',
        name: 'Start Sprint'
      });

      const started = await planner.startSprint('SPRINT-START');
      expect(started.status).toBe('active');
      expect(started.startedAt).toBeDefined();
    });
  });

  describe('completeSprint', () => {
    it('should complete sprint and update status', async () => {
      await planner.createSprint({
        sprintId: 'SPRINT-COMPLETE',
        name: 'Complete Sprint'
      });

      const completed = await planner.completeSprint('SPRINT-COMPLETE');
      expect(completed.status).toBe('completed');
      expect(completed.completedAt).toBeDefined();
    });
  });

  describe('getMetrics', () => {
    it('should calculate sprint metrics', async () => {
      await planner.createSprint({
        sprintId: 'SPRINT-METRICS',
        name: 'Metrics Sprint',
        velocity: 20
      });

      await planner.addTasks('SPRINT-METRICS', [
        { id: 'T-1', title: 'Task 1', storyPoints: 5 },
        { id: 'T-2', title: 'Task 2', storyPoints: 8 },
        { id: 'T-3', title: 'Task 3', storyPoints: 3 }
      ]);

      await planner.updateTaskStatus('SPRINT-METRICS', 'T-1', 'done');
      await planner.updateTaskStatus('SPRINT-METRICS', 'T-2', 'in-progress');

      const metrics = await planner.getMetrics('SPRINT-METRICS');

      expect(metrics.totalTasks).toBe(3);
      expect(metrics.doneTasks).toBe(1);
      expect(metrics.inProgressTasks).toBe(1);
      expect(metrics.todoTasks).toBe(1);
      expect(metrics.totalPoints).toBe(16);
      expect(metrics.completedPoints).toBe(5);
      expect(metrics.remainingPoints).toBe(11);
      expect(metrics.completionPercentage).toBe(31);
    });

    it('should detect over capacity', async () => {
      await planner.createSprint({
        sprintId: 'SPRINT-OVERCAP',
        name: 'Over Capacity Sprint',
        velocity: 10
      });

      await planner.addTasks('SPRINT-OVERCAP', [
        { title: 'Task 1', storyPoints: 15 }
      ]);

      const metrics = await planner.getMetrics('SPRINT-OVERCAP');
      expect(metrics.overCapacity).toBe(true);
    });
  });

  describe('generateBacklogTemplate', () => {
    it('should generate markdown template', async () => {
      await planner.createSprint({
        sprintId: 'SPRINT-TEMPLATE',
        name: 'Template Sprint',
        featureId: 'FEAT-001',
        goal: 'Test template generation',
        velocity: 20
      });

      await planner.addTasks('SPRINT-TEMPLATE', [
        { id: 'T-1', title: 'Critical Task', priority: PRIORITY.CRITICAL, storyPoints: 5 },
        { id: 'T-2', title: 'High Task', priority: PRIORITY.HIGH, storyPoints: 3 }
      ]);

      const template = await planner.generateBacklogTemplate('SPRINT-TEMPLATE');

      expect(template).toContain('# Template Sprint');
      expect(template).toContain('**Feature:** FEAT-001');
      expect(template).toContain('**Goal:** Test template generation');
      expect(template).toContain('Critical Priority');
      expect(template).toContain('High Priority');
      expect(template).toContain('T-1');
    });
  });

  describe('prioritizeTasks', () => {
    it('should prioritize by priority level', () => {
      const tasks = [
        { id: 'T-1', priority: 'low' },
        { id: 'T-2', priority: 'critical' },
        { id: 'T-3', priority: 'medium' },
        { id: 'T-4', priority: 'high' }
      ];

      const prioritized = planner.prioritizeTasks(tasks);

      expect(prioritized[0].id).toBe('T-2'); // critical
      expect(prioritized[1].id).toBe('T-4'); // high
      expect(prioritized[2].id).toBe('T-3'); // medium
      expect(prioritized[3].id).toBe('T-1'); // low
    });

    it('should consider dependencies for same priority', () => {
      const tasks = [
        { id: 'T-1', priority: 'high', dependencies: ['T-2', 'T-3'] },
        { id: 'T-2', priority: 'high', dependencies: [] },
        { id: 'T-3', priority: 'high', dependencies: ['T-2'] }
      ];

      const prioritized = planner.prioritizeTasks(tasks);

      expect(prioritized[0].id).toBe('T-2'); // no dependencies
      expect(prioritized[1].id).toBe('T-3'); // 1 dependency
      expect(prioritized[2].id).toBe('T-1'); // 2 dependencies
    });
  });

  describe('getSprint', () => {
    it('should return sprint by ID', async () => {
      await planner.createSprint({
        sprintId: 'SPRINT-GET',
        name: 'Get Sprint'
      });

      const sprint = await planner.getSprint('SPRINT-GET');
      expect(sprint.name).toBe('Get Sprint');
    });

    it('should return null for non-existent sprint', async () => {
      const sprint = await planner.getSprint('NON-EXISTENT');
      expect(sprint).toBeNull();
    });
  });

  describe('PRIORITY constants', () => {
    it('should export priority constants', () => {
      expect(PRIORITY.CRITICAL).toBe('critical');
      expect(PRIORITY.HIGH).toBe('high');
      expect(PRIORITY.MEDIUM).toBe('medium');
      expect(PRIORITY.LOW).toBe('low');
    });
  });
});
