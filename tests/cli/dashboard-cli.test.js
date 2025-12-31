/**
 * DashboardCLI Tests
 */

const { DashboardCLI } = require('../../src/cli/dashboard-cli');
const fs = require('fs').promises;
const path = require('path');

describe('DashboardCLI', () => {
  let cli;
  const testConfig = {
    dashboardConfig: { storageDir: 'storage/test-cli-workflows' },
    recorderConfig: { storageDir: 'storage/test-cli-transitions' },
    plannerConfig: { storageDir: 'storage/test-cli-sprints' },
    reporterConfig: { storageDir: 'storage/test-cli-reports' },
    matrixConfig: { storageDir: 'storage/test-cli-matrices' }
  };

  beforeEach(() => {
    cli = new DashboardCLI(testConfig);
  });

  afterEach(async () => {
    // Cleanup test directories
    const dirs = [
      testConfig.dashboardConfig.storageDir,
      testConfig.recorderConfig.storageDir,
      testConfig.plannerConfig.storageDir,
      testConfig.reporterConfig.storageDir,
      testConfig.matrixConfig.storageDir
    ];
    
    for (const dir of dirs) {
      try {
        const files = await fs.readdir(dir);
        for (const file of files) {
          await fs.unlink(path.join(dir, file));
        }
        await fs.rmdir(dir);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe('constructor', () => {
    it('should initialize all components', () => {
      expect(cli.dashboard).toBeDefined();
      expect(cli.recorder).toBeDefined();
      expect(cli.planner).toBeDefined();
      expect(cli.reporter).toBeDefined();
      expect(cli.extractor).toBeDefined();
      expect(cli.gapDetector).toBeDefined();
      expect(cli.matrixStorage).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should throw error for unknown command', async () => {
      await expect(cli.execute('unknown:command'))
        .rejects.toThrow('Unknown command');
    });

    it('should show help', async () => {
      const result = await cli.execute('help');
      expect(result.success).toBe(true);
      expect(result.commands).toBeDefined();
    });
  });

  describe('workflow commands', () => {
    it('should create workflow', async () => {
      const result = await cli.execute('workflow:create', ['FEAT-001'], { name: 'Test Feature' });

      expect(result.success).toBe(true);
      expect(result.workflow).toBeDefined();
      expect(result.workflow.featureId).toBe('FEAT-001');
    });

    it('should throw error if featureId not provided', async () => {
      await expect(cli.execute('workflow:create', []))
        .rejects.toThrow('Feature ID is required');
    });

    it('should get workflow status', async () => {
      const created = await cli.execute('workflow:create', ['FEAT-002']);
      const result = await cli.execute('workflow:status', [created.workflow.featureId]);

      expect(result.success).toBe(true);
      expect(result.workflow).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should throw error for non-existent workflow', async () => {
      await expect(cli.execute('workflow:status', ['NON-EXISTENT']))
        .rejects.toThrow('Workflow not found');
    });

    it('should list workflows', async () => {
      await cli.execute('workflow:create', ['FEAT-003']);
      await cli.execute('workflow:create', ['FEAT-004']);

      const result = await cli.execute('workflow:list');

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.workflows).toHaveLength(2);
    });

    it('should advance workflow', async () => {
      const created = await cli.execute('workflow:create', ['FEAT-005']);
      const result = await cli.execute('workflow:advance', [created.workflow.featureId]);

      expect(result.success).toBe(true);
      expect(result.workflow.currentStage).toBe('requirements');
    });
  });

  describe('sprint commands', () => {
    it('should create sprint', async () => {
      const result = await cli.execute('sprint:create', [], {
        name: 'Sprint 1',
        featureId: 'FEAT-001',
        goal: 'Implement feature'
      });

      expect(result.success).toBe(true);
      expect(result.sprint).toBeDefined();
      expect(result.sprint.name).toBe('Sprint 1');
    });

    it('should start sprint', async () => {
      const created = await cli.execute('sprint:create', [], { name: 'Start Test' });
      const result = await cli.execute('sprint:start', [created.sprint.id]);

      expect(result.success).toBe(true);
      expect(result.sprint.status).toBe('active');
    });

    it('should complete sprint', async () => {
      const created = await cli.execute('sprint:create', [], { name: 'Complete Test' });
      const result = await cli.execute('sprint:complete', [created.sprint.id]);

      expect(result.success).toBe(true);
      expect(result.sprint.status).toBe('completed');
    });

    it('should get sprint status', async () => {
      const created = await cli.execute('sprint:create', [], { name: 'Status Test' });
      const result = await cli.execute('sprint:status', [created.sprint.id]);

      expect(result.success).toBe(true);
      expect(result.sprint).toBeDefined();
      expect(result.metrics).toBeDefined();
    });

    it('should add task to sprint', async () => {
      const created = await cli.execute('sprint:create', [], { name: 'Task Test' });
      const result = await cli.execute('sprint:add-task', [created.sprint.id], {
        title: 'Test Task',
        points: '5',
        priority: 'high'
      });

      expect(result.success).toBe(true);
      expect(result.sprint.tasks).toHaveLength(1);
      expect(result.sprint.tasks[0].title).toBe('Test Task');
    });

    it('should throw error if task title not provided', async () => {
      const created = await cli.execute('sprint:create', [], { name: 'No Title Test' });
      await expect(cli.execute('sprint:add-task', [created.sprint.id], {}))
        .rejects.toThrow('Task title is required');
    });

    it('should generate sprint report', async () => {
      const created = await cli.execute('sprint:create', [], { name: 'Report Test' });
      await cli.execute('sprint:add-task', [created.sprint.id], {
        title: 'Task 1',
        points: '3'
      });

      const result = await cli.execute('sprint:report', [created.sprint.id]);

      expect(result.success).toBe(true);
      expect(result.report).toContain('Sprint Report');
    });
  });

  describe('traceability commands', () => {
    it('should scan for traceability', async () => {
      const result = await cli.execute('trace:scan', ['.']);

      expect(result.success).toBe(true);
      expect(result.directory).toBe('.');
      expect(result.artifacts).toBeDefined();
    });

    it('should detect gaps', async () => {
      const result = await cli.execute('trace:gaps', ['.']);

      expect(result.success).toBe(true);
      expect(result.requirements).toBeDefined();
      expect(result.gaps).toBeDefined();
      expect(result.report).toBeDefined();
    });

    it('should list matrices when no ID provided', async () => {
      const result = await cli.execute('trace:matrix');

      expect(result.success).toBe(true);
      expect(result.matrices).toBeDefined();
    });

    it('should save matrix', async () => {
      const result = await cli.execute('trace:save', ['.'], {
        name: 'Test Matrix'
      });

      expect(result.success).toBe(true);
      expect(result.path).toBeDefined();
    });
  });

  describe('summary command', () => {
    it('should get summary', async () => {
      await cli.execute('workflow:create', ['FEAT-SUM-001']);
      
      const result = await cli.execute('summary');

      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary.workflows.total).toBeGreaterThanOrEqual(1);
    });

    it('should filter summary by feature', async () => {
      await cli.execute('workflow:create', ['FEAT-SUM-002']);
      await cli.execute('workflow:create', ['FEAT-SUM-003']);
      
      const result = await cli.execute('summary', ['FEAT-SUM-002']);

      expect(result.success).toBe(true);
      expect(result.summary.workflows.total).toBe(1);
    });
  });

  describe('getNextStage', () => {
    it('should return next stage', () => {
      expect(cli.getNextStage('steering')).toBe('requirements');
      expect(cli.getNextStage('requirements')).toBe('design');
      expect(cli.getNextStage('design')).toBe('implementation');
      expect(cli.getNextStage('implementation')).toBe('validation');
    });

    it('should return same stage if at end', () => {
      expect(cli.getNextStage('validation')).toBe('validation');
    });

    it('should return same stage for unknown stage', () => {
      expect(cli.getNextStage('unknown')).toBe('unknown');
    });
  });

  describe('error handling', () => {
    it('should throw error for sprint:start without ID', async () => {
      await expect(cli.execute('sprint:start', []))
        .rejects.toThrow('Sprint ID is required');
    });

    it('should throw error for sprint:complete without ID', async () => {
      await expect(cli.execute('sprint:complete', []))
        .rejects.toThrow('Sprint ID is required');
    });

    it('should throw error for sprint:status without ID', async () => {
      await expect(cli.execute('sprint:status', []))
        .rejects.toThrow('Sprint ID is required');
    });

    it('should throw error for workflow:advance without ID', async () => {
      await expect(cli.execute('workflow:advance', []))
        .rejects.toThrow('Workflow ID is required');
    });

    it('should throw error for sprint:report without ID', async () => {
      await expect(cli.execute('sprint:report', []))
        .rejects.toThrow('Sprint ID is required');
    });
  });
});
