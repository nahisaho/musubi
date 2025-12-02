/**
 * Tests for MUSUBI Tasks Generator
 */

const fs = require('fs-extra');
const path = require('path');
const TasksGenerator = require('../../src/generators/tasks');

describe('TasksGenerator', () => {
  let generator;
  let testDir;

  beforeEach(async () => {
    testDir = path.join(__dirname, '../test-output/tasks');
    await fs.ensureDir(testDir);
    generator = new TasksGenerator(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('init', () => {
    test('should create task breakdown document', async () => {
      const result = await generator.init('User Authentication', {
        author: 'Test Author',
        project: 'Test Project',
      });

      expect(result.feature).toBe('User Authentication');
      expect(result.path).toContain('user-authentication.md');

      const exists = await fs.pathExists(result.path);
      expect(exists).toBe(true);

      const content = await fs.readFile(result.path, 'utf-8');
      expect(content).toContain('User Authentication');
      expect(content).toContain('Test Author');
      expect(content).toContain('Test Project');
    });

    test('should slugify feature name', async () => {
      const result = await generator.init('Payment & Checkout System', {
        author: 'Test',
      });

      expect(result.path).toContain('payment-checkout-system.md');
    });
  });

  describe('generateTaskId', () => {
    test('should generate TASK-001 for first task', () => {
      const content = '## P0 Tasks\n\n<!-- No tasks yet -->';
      const taskId = generator.generateTaskId(content);
      expect(taskId).toBe('001');
    });

    test('should increment task numbers', () => {
      const content = `
### TASK-001: First Task
### TASK-002: Second Task
### TASK-003: Third Task
      `;
      const taskId = generator.generateTaskId(content);
      expect(taskId).toBe('004');
    });

    test('should handle non-sequential task IDs', () => {
      const content = `
### TASK-001: First Task
### TASK-005: Fifth Task
### TASK-003: Third Task
      `;
      const taskId = generator.generateTaskId(content);
      expect(taskId).toBe('006');
    });
  });

  describe('formatTaskSection', () => {
    test('should format task with all fields', () => {
      const task = {
        title: 'Database Schema',
        priority: 'P0',
        storyPoints: 3,
        estimatedHours: 8,
        assignee: 'Developer',
        status: 'Not Started',
        description: 'Design database schema',
        requirements: ['REQ-001'],
        acceptance: ['Schema created', 'Tests passing'],
        dependencies: ['TASK-000'],
      };

      const section = generator.formatTaskSection('001', task);

      expect(section).toContain('### TASK-001: Database Schema');
      expect(section).toContain('**Priority**: P0');
      expect(section).toContain('**Story Points**: 3');
      expect(section).toContain('**Estimated Hours**: 8');
      expect(section).toContain('**Assignee**: Developer');
      expect(section).toContain('**Status**: Not Started');
      expect(section).toContain('Design database schema');
      expect(section).toContain('- REQ-001');
      expect(section).toContain('- [ ] Schema created');
      expect(section).toContain('- TASK-000');
      expect(section).toContain('**Test-First Checklist** (Article III)');
    });

    test('should format task without optional fields', () => {
      const task = {
        title: 'Simple Task',
        priority: 'P1',
        storyPoints: 2,
        estimatedHours: 4,
        assignee: 'Dev',
        status: 'Not Started',
        description: 'A simple task',
      };

      const section = generator.formatTaskSection('002', task);

      expect(section).toContain('### TASK-002: Simple Task');
      expect(section).not.toContain('**Requirements Coverage**:');
      expect(section).not.toContain('**Dependencies**:');
      expect(section).toContain('**Test-First Checklist** (Article III)');
    });
  });

  describe('parseTasks', () => {
    test('should parse tasks from content', () => {
      const content = `
### TASK-001: First Task

**Priority**: P0
**Story Points**: 3
**Estimated Hours**: 8
**Assignee**: Developer A
**Status**: In Progress

### TASK-002: Second Task

**Priority**: P1
**Story Points**: 5
**Estimated Hours**: 12
**Assignee**: Developer B
**Status**: Not Started
      `;

      const tasks = generator.parseTasks(content);

      expect(tasks).toHaveLength(2);
      expect(tasks[0].id).toBe('001');
      expect(tasks[0].title).toBe('First Task');
      expect(tasks[0].priority).toBe('P0');
      expect(tasks[0].storyPoints).toBe(3);
      expect(tasks[0].estimatedHours).toBe(8);
      expect(tasks[1].id).toBe('002');
      expect(tasks[1].title).toBe('Second Task');
    });
  });

  describe('validate', () => {
    test('should pass validation for valid tasks', async () => {
      const { path: filePath } = await generator.init('Test Feature');

      // Add a valid task
      await generator.addTask(filePath, {
        title: 'Valid Task',
        priority: 'P0',
        storyPoints: 3,
        estimatedHours: 8,
        assignee: 'Developer',
        status: 'Not Started',
        description: 'A valid task',
      });

      const content = await fs.readFile(filePath, 'utf-8');
      const tasks = generator.parseTasks(content);

      // Template has existing tasks, we added 1 more
      expect(tasks.length).toBeGreaterThan(0);
    });
  });

  describe('generateMermaidGraph', () => {
    test('should generate Mermaid dependency graph', () => {
      const tasks = [
        { id: '001', title: 'Setup', dependencies: [] },
        { id: '002', title: 'Database', dependencies: ['001'] },
        { id: '003', title: 'API', dependencies: ['002'] },
      ];
      const dependencies = new Map([
        ['001', []],
        ['002', ['001']],
        ['003', ['002']],
      ]);

      const graph = generator.generateMermaidGraph(tasks, dependencies);

      expect(graph).toContain('graph TD');
      expect(graph).toContain('TASK001["TASK-001: Setup"]');
      expect(graph).toContain('TASK002["TASK-002: Database"]');
      expect(graph).toContain('TASK001 --> TASK002');
      expect(graph).toContain('TASK002 --> TASK003');
    });
  });

  describe('generateDotGraph', () => {
    test('should generate DOT dependency graph', () => {
      const tasks = [
        { id: '001', title: 'Setup', dependencies: [] },
        { id: '002', title: 'Database', dependencies: ['001'] },
      ];
      const dependencies = new Map([
        ['001', []],
        ['002', ['001']],
      ]);

      const graph = generator.generateDotGraph(tasks, dependencies);

      expect(graph).toContain('digraph Tasks {');
      expect(graph).toContain('TASK001 [label="TASK-001\\nSetup"]');
      expect(graph).toContain('TASK002 [label="TASK-002\\nDatabase"]');
      expect(graph).toContain('TASK001 -> TASK002');
    });
  });

  describe('calculateParallelGroups', () => {
    test('should calculate parallel execution groups', () => {
      const tasks = [
        { id: '001', title: 'Setup', dependencies: [] },
        { id: '002', title: 'Database', dependencies: ['001'] },
        { id: '003', title: 'Cache', dependencies: ['001'] },
        { id: '004', title: 'API', dependencies: ['002', '003'] },
      ];
      const dependencies = new Map([
        ['001', []],
        ['002', ['001']],
        ['003', ['001']],
        ['004', ['002', '003']],
      ]);

      const groups = generator.calculateParallelGroups(tasks, dependencies);

      expect(groups).toHaveLength(3);
      expect(groups[0]).toContain('TASK-001');
      expect(groups[1]).toContain('TASK-002');
      expect(groups[1]).toContain('TASK-003');
      expect(groups[2]).toContain('TASK-004');
    });

    test('should detect circular dependencies', () => {
      const tasks = [
        { id: '001', title: 'A', dependencies: ['002'] },
        { id: '002', title: 'B', dependencies: ['001'] },
      ];
      const dependencies = new Map([
        ['001', ['002']],
        ['002', ['001']],
      ]);

      const groups = generator.calculateParallelGroups(tasks, dependencies);

      expect(groups.some(group => group.some(task => task.includes('circular')))).toBe(true);
    });
  });

  describe('slugify', () => {
    test('should convert to lowercase', () => {
      expect(generator.slugify('User Authentication')).toBe('user-authentication');
    });

    test('should replace special characters with dashes', () => {
      expect(generator.slugify('Payment & Checkout System')).toBe('payment-checkout-system');
    });

    test('should remove leading/trailing dashes', () => {
      expect(generator.slugify('  Test Feature  ')).toBe('test-feature');
    });

    test('should handle multiple consecutive spaces', () => {
      expect(generator.slugify('Multi   Space   Test')).toBe('multi-space-test');
    });
  });

  describe('parseTasksWithDependencies', () => {
    test('should parse tasks with dependencies', () => {
      const content = `
### TASK-001: Setup

**Dependencies**:
- None

### TASK-002: Database

**Dependencies**:
- TASK-001: Setup complete

### TASK-003: API

**Dependencies**:
- TASK-002: Database ready
      `;

      const tasks = generator.parseTasksWithDependencies(content);

      expect(tasks).toHaveLength(3);
      expect(tasks[0].id).toBe('001');
      expect(tasks[0].dependencies).toHaveLength(0);
      expect(tasks[1].id).toBe('002');
      expect(tasks[1].dependencies).toContain('001');
      expect(tasks[2].id).toBe('003');
      expect(tasks[2].dependencies).toContain('002');
    });
  });

  describe('integration', () => {
    test('should create task breakdown and add tasks', async () => {
      const { path: filePath } = await generator.init('Payment System');

      const task1Id = await generator.addTask(filePath, {
        title: 'Database Schema',
        priority: 'P0',
        storyPoints: 3,
        estimatedHours: 8,
        assignee: 'Dev A',
        status: 'Not Started',
        description: 'Design database schema',
      });

      const task2Id = await generator.addTask(filePath, {
        title: 'API Implementation',
        priority: 'P1',
        storyPoints: 5,
        estimatedHours: 16,
        assignee: 'Dev B',
        status: 'Not Started',
        description: 'Implement REST API',
        dependencies: [`TASK-${task1Id.id}`],
      });

      const content = await fs.readFile(filePath, 'utf-8');

      expect(content).toContain(`TASK-${task1Id.id}: Database Schema`);
      expect(content).toContain(`TASK-${task2Id.id}: API Implementation`);
      expect(content).toContain(`TASK-${task1Id.id}`);

      const validation = await generator.validate(filePath);
      expect(validation.total).toBeGreaterThan(0);
    });
  });
});
