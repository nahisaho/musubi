/**
 * SprintPlanner Implementation
 * 
 * Generates sprint planning templates based on tasks.
 * 
 * Requirement: IMP-6.2-003-03
 * Design: Section 4.3
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  storageDir: 'storage/sprints',
  defaultSprintDuration: 14, // days
  defaultVelocity: 20 // story points
};

/**
 * Task priority levels
 */
const PRIORITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

/**
 * SprintPlanner
 * 
 * Creates and manages sprint plans.
 */
class SprintPlanner {
  /**
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Create a new sprint plan
   * @param {Object} options - Sprint options
   * @returns {Promise<Object>} Created sprint plan
   */
  async createSprint(options) {
    const sprintId = options.sprintId || `SPRINT-${Date.now()}`;
    
    const sprint = {
      id: sprintId,
      name: options.name || `Sprint ${sprintId}`,
      featureId: options.featureId,
      goal: options.goal || '',
      startDate: options.startDate || new Date().toISOString().slice(0, 10),
      endDate: options.endDate || this.calculateEndDate(options.startDate),
      duration: options.duration || this.config.defaultSprintDuration,
      velocity: options.velocity || this.config.defaultVelocity,
      tasks: [],
      status: 'planning',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.saveSprint(sprint);

    return sprint;
  }

  /**
   * Add tasks to sprint
   * @param {string} sprintId - Sprint ID
   * @param {Array} tasks - Tasks to add
   * @returns {Promise<Object>} Updated sprint
   */
  async addTasks(sprintId, tasks) {
    const sprint = await this.loadSprint(sprintId);
    if (!sprint) {
      throw new Error(`Sprint not found: ${sprintId}`);
    }

    for (const task of tasks) {
      const sprintTask = {
        id: task.id || `T-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: task.title,
        description: task.description || '',
        requirementId: task.requirementId || null,
        storyPoints: task.storyPoints || 1,
        priority: task.priority || PRIORITY.MEDIUM,
        assignee: task.assignee || null,
        status: 'todo',
        dependencies: task.dependencies || [],
        acceptanceCriteria: task.acceptanceCriteria || [],
        addedAt: new Date().toISOString()
      };

      sprint.tasks.push(sprintTask);
    }

    sprint.updatedAt = new Date().toISOString();
    await this.saveSprint(sprint);

    return sprint;
  }

  /**
   * Update task status
   * @param {string} sprintId - Sprint ID
   * @param {string} taskId - Task ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated sprint
   */
  async updateTaskStatus(sprintId, taskId, status) {
    const sprint = await this.loadSprint(sprintId);
    if (!sprint) {
      throw new Error(`Sprint not found: ${sprintId}`);
    }

    const task = sprint.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = status;
    if (status === 'done') {
      task.completedAt = new Date().toISOString();
    }

    sprint.updatedAt = new Date().toISOString();
    await this.saveSprint(sprint);

    return sprint;
  }

  /**
   * Start sprint
   * @param {string} sprintId - Sprint ID
   * @returns {Promise<Object>} Updated sprint
   */
  async startSprint(sprintId) {
    const sprint = await this.loadSprint(sprintId);
    if (!sprint) {
      throw new Error(`Sprint not found: ${sprintId}`);
    }

    sprint.status = 'active';
    sprint.startedAt = new Date().toISOString();
    sprint.updatedAt = new Date().toISOString();

    await this.saveSprint(sprint);

    return sprint;
  }

  /**
   * Complete sprint
   * @param {string} sprintId - Sprint ID
   * @returns {Promise<Object>} Updated sprint
   */
  async completeSprint(sprintId) {
    const sprint = await this.loadSprint(sprintId);
    if (!sprint) {
      throw new Error(`Sprint not found: ${sprintId}`);
    }

    sprint.status = 'completed';
    sprint.completedAt = new Date().toISOString();
    sprint.updatedAt = new Date().toISOString();

    await this.saveSprint(sprint);

    return sprint;
  }

  /**
   * Get sprint by ID
   * @param {string} sprintId - Sprint ID
   * @returns {Promise<Object|null>} Sprint
   */
  async getSprint(sprintId) {
    return await this.loadSprint(sprintId);
  }

  /**
   * Calculate sprint metrics
   * @param {string} sprintId - Sprint ID
   * @returns {Promise<Object>} Sprint metrics
   */
  async getMetrics(sprintId) {
    const sprint = await this.loadSprint(sprintId);
    if (!sprint) {
      throw new Error(`Sprint not found: ${sprintId}`);
    }

    const tasks = sprint.tasks;
    const totalPoints = tasks.reduce((sum, t) => sum + t.storyPoints, 0);
    const completedPoints = tasks
      .filter(t => t.status === 'done')
      .reduce((sum, t) => sum + t.storyPoints, 0);
    const inProgressPoints = tasks
      .filter(t => t.status === 'in-progress')
      .reduce((sum, t) => sum + t.storyPoints, 0);

    const todoTasks = tasks.filter(t => t.status === 'todo').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
    const doneTasks = tasks.filter(t => t.status === 'done').length;

    return {
      sprintId,
      totalTasks: tasks.length,
      todoTasks,
      inProgressTasks,
      doneTasks,
      totalPoints,
      completedPoints,
      inProgressPoints,
      remainingPoints: totalPoints - completedPoints,
      completionPercentage: totalPoints > 0 
        ? Math.round((completedPoints / totalPoints) * 100) 
        : 0,
      velocity: sprint.velocity,
      overCapacity: totalPoints > sprint.velocity
    };
  }

  /**
   * Generate sprint backlog template
   * @param {string} sprintId - Sprint ID
   * @returns {Promise<string>} Markdown template
   */
  async generateBacklogTemplate(sprintId) {
    const sprint = await this.loadSprint(sprintId);
    if (!sprint) {
      throw new Error(`Sprint not found: ${sprintId}`);
    }

    const metrics = await this.getMetrics(sprintId);
    const lines = [];

    lines.push(`# ${sprint.name}`);
    lines.push('');
    lines.push(`**Feature:** ${sprint.featureId || 'N/A'}`);
    lines.push(`**Goal:** ${sprint.goal || 'N/A'}`);
    lines.push(`**Period:** ${sprint.startDate} - ${sprint.endDate}`);
    lines.push(`**Velocity:** ${sprint.velocity} points`);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Total Tasks | ${metrics.totalTasks} |`);
    lines.push(`| Total Points | ${metrics.totalPoints} |`);
    lines.push(`| Completed Points | ${metrics.completedPoints} |`);
    lines.push(`| Completion | ${metrics.completionPercentage}% |`);
    lines.push('');

    // Tasks by priority
    lines.push('## Tasks');
    lines.push('');

    const priorityOrder = ['critical', 'high', 'medium', 'low'];
    
    for (const priority of priorityOrder) {
      const priorityTasks = sprint.tasks.filter(t => t.priority === priority);
      if (priorityTasks.length > 0) {
        lines.push(`### ${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority`);
        lines.push('');
        
        for (const task of priorityTasks) {
          const status = task.status === 'done' ? '✅' : 
                        task.status === 'in-progress' ? '🔄' : '⬜';
          lines.push(`- ${status} **${task.id}**: ${task.title} (${task.storyPoints}pt)`);
          if (task.requirementId) {
            lines.push(`  - Requirement: ${task.requirementId}`);
          }
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Prioritize tasks by dependencies and priority
   * @param {Array} tasks - Tasks to prioritize
   * @returns {Array} Prioritized tasks
   */
  prioritizeTasks(tasks) {
    const priorityWeight = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1
    };

    // Sort by priority weight (descending) then by dependency count (ascending)
    return [...tasks].sort((a, b) => {
      const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return (a.dependencies?.length || 0) - (b.dependencies?.length || 0);
    });
  }

  /**
   * Calculate end date based on duration
   * @param {string} startDate - Start date
   * @returns {string} End date
   */
  calculateEndDate(startDate) {
    const start = startDate ? new Date(startDate) : new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + this.config.defaultSprintDuration);
    return end.toISOString().slice(0, 10);
  }

  /**
   * Save sprint to storage
   * @param {Object} sprint - Sprint to save
   */
  async saveSprint(sprint) {
    await this.ensureStorageDir();
    
    const filePath = path.join(this.config.storageDir, `${sprint.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(sprint, null, 2), 'utf-8');
  }

  /**
   * Load sprint from storage
   * @param {string} sprintId - Sprint ID
   * @returns {Promise<Object|null>} Sprint
   */
  async loadSprint(sprintId) {
    try {
      const filePath = path.join(this.config.storageDir, `${sprintId}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Ensure storage directory exists
   */
  async ensureStorageDir() {
    try {
      await fs.access(this.config.storageDir);
    } catch {
      await fs.mkdir(this.config.storageDir, { recursive: true });
    }
  }
}

module.exports = { SprintPlanner, PRIORITY };
