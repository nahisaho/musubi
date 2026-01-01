/**
 * MUSUBI Tasks Generator
 *
 * Generates task breakdown documents with P0-P3 priority labels
 * Supports dependency graphs and parallel execution planning
 */

const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');

class TasksGenerator {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
    this.templatePath = path.join(__dirname, '../templates/shared/documents/tasks.md');
  }

  /**
   * Initialize task breakdown document
   */
  async init(feature, options = {}) {
    const outputDir = path.join(this.workspaceRoot, options.output || 'storage/tasks');
    await fs.ensureDir(outputDir);

    const fileName = this.slugify(feature) + '.md';
    const filePath = path.join(outputDir, fileName);

    // Read template
    const template = await fs.readFile(this.templatePath, 'utf-8');

    // Replace template variables
    const content = template
      .replace(/\{\{FEATURE_NAME\}\}/g, feature)
      .replace(/\{\{PROJECT_NAME\}\}/g, options.project || '[Project Name]')
      .replace(/\{\{DATE\}\}/g, new Date().toISOString().split('T')[0])
      .replace(/\{\{AUTHOR\}\}/g, options.author || '[Author]')
      .replace(/\{\{COMPONENT\}\}/g, this.slugify(feature));

    await fs.writeFile(filePath, content, 'utf-8');

    return { path: filePath, feature };
  }

  /**
   * Find all task breakdown files
   */
  async findTaskFiles() {
    const patterns = ['storage/tasks/**/*.md', 'tasks/**/*.md'];

    const files = [];
    for (const pattern of patterns) {
      const matches = glob.sync(pattern, { cwd: this.workspaceRoot, absolute: true });
      files.push(...matches);
    }

    return [...new Set(files)];
  }

  /**
   * Add task to breakdown document
   */
  async addTask(filePath, task) {
    const content = await fs.readFile(filePath, 'utf-8');

    // Generate task ID
    const taskId = this.generateTaskId(content);

    // Format task section
    const taskSection = this.formatTaskSection(taskId, task);

    // Find insertion point based on priority
    const insertionPoint = this.findTaskInsertionPoint(content, task.priority);
    const updatedContent =
      content.slice(0, insertionPoint) + '\n' + taskSection + '\n' + content.slice(insertionPoint);

    await fs.writeFile(filePath, updatedContent, 'utf-8');

    return { id: taskId, ...task };
  }

  /**
   * Generate next task ID
   */
  generateTaskId(content) {
    const taskIds = [];
    const regex = /### TASK-(\d{3}):/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      taskIds.push(parseInt(match[1]));
    }

    if (taskIds.length === 0) {
      return '001';
    }

    const maxId = Math.max(...taskIds);
    return String(maxId + 1).padStart(3, '0');
  }

  /**
   * Format task section
   */
  formatTaskSection(taskId, task) {
    let section = `### TASK-${taskId}: ${task.title}\n\n`;
    section += `**Priority**: ${task.priority}\n`;
    section += `**Story Points**: ${task.storyPoints}\n`;
    section += `**Estimated Hours**: ${task.estimatedHours}\n`;
    section += `**Assignee**: ${task.assignee}\n`;
    section += `**Status**: ${task.status}\n\n`;
    section += `**Description**:\n${task.description}\n\n`;

    if (task.requirements && task.requirements.length > 0) {
      section += '**Requirements Coverage**:\n';
      task.requirements.forEach(req => {
        section += `- ${req}\n`;
      });
      section += '\n';
    }

    if (task.acceptance && task.acceptance.length > 0) {
      section += '**Acceptance Criteria**:\n';
      task.acceptance.forEach(criterion => {
        section += `- [ ] ${criterion}\n`;
      });
      section += '\n';
    }

    if (task.dependencies && task.dependencies.length > 0) {
      section += '**Dependencies**:\n';
      task.dependencies.forEach(dep => {
        section += `- ${dep}\n`;
      });
      section += '\n';
    }

    section += '**Test-First Checklist** (Article III):\n';
    section += '- [ ] Tests written BEFORE implementation\n';
    section += '- [ ] Red: Failing test committed\n';
    section += '- [ ] Green: Minimal implementation passes test\n';
    section += '- [ ] Blue: Refactored with confidence\n\n';

    section += '**Validation**:\n';
    section += '```bash\n';
    section += '# Verify task completion\n';
    section += 'npm test\n';
    section += 'npm run lint\n';
    section += '```\n';

    return section;
  }

  /**
   * Find insertion point for task based on priority
   */
  findTaskInsertionPoint(content, priority) {
    const priorityHeaders = {
      P0: '## P0 Tasks',
      P1: '## P1 Tasks',
      P2: '## P2 Tasks',
      P3: '## P2 Tasks',
    };

    const headerPattern = priorityHeaders[priority];
    if (!headerPattern) {
      return content.length;
    }

    const headerIndex = content.indexOf(headerPattern);
    if (headerIndex === -1) {
      // Priority section doesn't exist, add at end
      return content.length;
    }

    // Find end of section (before next ## header or end of document)
    const nextHeaderRegex = /\n## /g;
    nextHeaderRegex.lastIndex = headerIndex + headerPattern.length;
    const nextMatch = nextHeaderRegex.exec(content);

    if (nextMatch) {
      return nextMatch.index + 1; // Include the newline
    }

    return content.length;
  }

  /**
   * List all tasks
   */
  async list(options = {}) {
    const files = options.file ? [options.file] : await this.findTaskFiles();
    const allTasks = [];

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const tasks = this.parseTasks(content);
      allTasks.push(...tasks);
    }

    // Filter by priority
    let filtered = allTasks;
    if (options.priority) {
      filtered = filtered.filter(t => t.priority === options.priority);
    }
    if (options.status) {
      filtered = filtered.filter(t => t.status === options.status);
    }

    // Calculate summary
    const summary = {
      total: filtered.length,
      p0: filtered.filter(t => t.priority === 'P0').length,
      p1: filtered.filter(t => t.priority === 'P1').length,
      p2: filtered.filter(t => t.priority === 'P2').length,
      p3: filtered.filter(t => t.priority === 'P3').length,
      totalPoints: filtered.reduce((sum, t) => sum + (t.storyPoints || 0), 0),
      totalHours: filtered.reduce((sum, t) => sum + (t.estimatedHours || 0), 0),
    };

    return { tasks: filtered, summary };
  }

  /**
   * Parse tasks from content
   */
  parseTasks(content) {
    const tasks = [];
    const taskRegex =
      /### TASK-(\d{3}): (.+?)\n\n\*\*Priority\*\*: (P[0-3])\n\*\*Story Points\*\*: (\d+)\n\*\*Estimated Hours\*\*: ([\d.]+)\n\*\*Assignee\*\*: (.+?)\n\*\*Status\*\*: (.+?)\n/g;
    let match;

    while ((match = taskRegex.exec(content)) !== null) {
      tasks.push({
        id: match[1],
        title: match[2],
        priority: match[3],
        storyPoints: parseInt(match[4]),
        estimatedHours: parseFloat(match[5]),
        assignee: match[6],
        status: match[7],
      });
    }

    return tasks;
  }

  /**
   * Update task status
   */
  async updateStatus(taskId, newStatus, filePath = null) {
    const files = filePath ? [filePath] : await this.findTaskFiles();

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const taskPattern = new RegExp(
        `(### TASK-${taskId}: .+?\\n\\n\\*\\*Priority\\*\\*: .+?\\n\\*\\*Story Points\\*\\*: .+?\\n\\*\\*Estimated Hours\\*\\*: .+?\\n\\*\\*Assignee\\*\\*: .+?\\n\\*\\*Status\\*\\*: )(.+?)(\\n)`,
        'g'
      );

      const match = taskPattern.exec(content);
      if (match) {
        const oldStatus = match[2];
        const updatedContent = content.replace(taskPattern, `$1${newStatus}$3`);
        await fs.writeFile(file, updatedContent, 'utf-8');

        // Extract task title
        const titleMatch = content.match(new RegExp(`### TASK-${taskId}: (.+?)\\n`));
        const title = titleMatch ? titleMatch[1] : 'Unknown';

        return { id: taskId, title, oldStatus, newStatus };
      }
    }

    throw new Error(`Task TASK-${taskId} not found`);
  }

  /**
   * Validate task breakdown
   */
  async validate(filePath = null) {
    const files = filePath ? [filePath] : await this.findTaskFiles();
    const violations = [];
    let total = 0;
    let valid = 0;

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const tasks = this.parseTasks(content);
      total += tasks.length;

      tasks.forEach(task => {
        let isValid = true;

        // Validate required fields
        if (!task.title || task.title.length === 0) {
          violations.push(`TASK-${task.id}: Missing title`);
          isValid = false;
        }
        if (!['P0', 'P1', 'P2', 'P3'].includes(task.priority)) {
          violations.push(`TASK-${task.id}: Invalid priority ${task.priority}`);
          isValid = false;
        }
        if (!task.storyPoints || task.storyPoints <= 0) {
          violations.push(`TASK-${task.id}: Invalid story points`);
          isValid = false;
        }
        if (!task.estimatedHours || task.estimatedHours <= 0) {
          violations.push(`TASK-${task.id}: Invalid estimated hours`);
          isValid = false;
        }

        if (isValid) {
          valid++;
        }
      });
    }

    return {
      passed: violations.length === 0,
      total,
      valid,
      invalid: total - valid,
      violations,
    };
  }

  /**
   * Generate dependency graph
   */
  async generateGraph(options = {}) {
    const files = options.file ? [options.file] : await this.findTaskFiles();
    const tasks = [];
    const dependencies = new Map();

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const fileTasks = this.parseTasksWithDependencies(content);
      tasks.push(...fileTasks);
    }

    // Build dependency map
    tasks.forEach(task => {
      dependencies.set(task.id, task.dependencies || []);
    });

    // Generate graph based on format
    let graph = '';
    if (options.format === 'dot') {
      graph = this.generateDotGraph(tasks, dependencies);
    } else {
      graph = this.generateMermaidGraph(tasks, dependencies);
    }

    // Calculate parallel execution groups
    const parallelGroups = this.calculateParallelGroups(tasks, dependencies);

    return { graph, parallelGroups };
  }

  /**
   * Parse tasks with dependencies
   */
  parseTasksWithDependencies(content) {
    const tasks = [];
    const taskSections = content.split(/### TASK-(\d{3}):/);

    for (let i = 1; i < taskSections.length; i += 2) {
      const id = taskSections[i];
      const section = taskSections[i + 1];

      const titleMatch = section.match(/^(.+?)\n/);
      const title = titleMatch ? titleMatch[1].trim() : 'Unknown';

      const depsMatch = section.match(/\*\*Dependencies\*\*:\n((?:- TASK-\d{3}.+?\n)+)/);
      const dependencies = [];
      if (depsMatch) {
        const depLines = depsMatch[1].match(/TASK-(\d{3})/g);
        if (depLines) {
          dependencies.push(...depLines.map(d => d.replace('TASK-', '')));
        }
      }

      tasks.push({ id, title, dependencies });
    }

    return tasks;
  }

  /**
   * Generate Mermaid graph
   */
  generateMermaidGraph(tasks, dependencies) {
    let graph = 'graph TD\n';

    tasks.forEach(task => {
      graph += `  TASK${task.id}["TASK-${task.id}: ${task.title}"]\n`;
    });

    dependencies.forEach((deps, taskId) => {
      deps.forEach(depId => {
        graph += `  TASK${depId} --> TASK${taskId}\n`;
      });
    });

    return graph;
  }

  /**
   * Generate DOT graph
   */
  generateDotGraph(tasks, dependencies) {
    let graph = 'digraph Tasks {\n';
    graph += '  rankdir=TB;\n';
    graph += '  node [shape=box];\n\n';

    tasks.forEach(task => {
      graph += `  TASK${task.id} [label="TASK-${task.id}\\n${task.title}"];\n`;
    });

    dependencies.forEach((deps, taskId) => {
      deps.forEach(depId => {
        graph += `  TASK${depId} -> TASK${taskId};\n`;
      });
    });

    graph += '}';
    return graph;
  }

  /**
   * Calculate parallel execution groups
   */
  calculateParallelGroups(tasks, dependencies) {
    const groups = [];
    const processed = new Set();
    const iterations = tasks.length + 1; // Prevent infinite loop
    let iteration = 0;

    while (processed.size < tasks.length && iteration < iterations) {
      iteration++;
      const group = [];

      tasks.forEach(task => {
        if (processed.has(task.id)) return;

        // Check if all dependencies are processed
        const deps = dependencies.get(task.id) || [];
        const allDepsProcessed = deps.every(depId => processed.has(depId) || depId === task.id);

        if (allDepsProcessed) {
          group.push(`TASK-${task.id}`);
        }
      });

      if (group.length === 0 && processed.size < tasks.length) {
        // Circular dependency detected
        const remaining = tasks.filter(t => !processed.has(t.id));
        group.push(...remaining.map(t => `TASK-${t.id} (circular)`));
        remaining.forEach(t => processed.add(t.id));
      } else {
        // Mark this group as processed
        group.forEach(taskId => {
          const id = taskId.replace('TASK-', '').replace(' (circular)', '');
          processed.add(id);
        });
      }

      if (group.length > 0) {
        groups.push(group);
      }
    }

    return groups;
  }

  /**
   * Slugify feature name
   */
  slugify(str) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

module.exports = TasksGenerator;
