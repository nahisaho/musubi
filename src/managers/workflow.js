/**
 * Workflow Engine for MUSUBI SDD
 * 
 * Manages workflow state, stage transitions, and metrics collection.
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Workflow stages with their valid transitions
 */
const WORKFLOW_STAGES = {
  spike: { next: ['requirements'], optional: true },
  research: { next: ['requirements'], optional: true },
  requirements: { next: ['design'] },
  design: { next: ['tasks'] },
  tasks: { next: ['implementation'] },
  implementation: { next: ['review'] },
  review: { next: ['testing', 'implementation'] }, // Can go back to implementation
  testing: { next: ['deployment', 'implementation', 'requirements'] }, // Feedback loops
  deployment: { next: ['monitoring'] },
  monitoring: { next: ['retrospective'] },
  retrospective: { next: ['requirements'] } // New iteration
};

/**
 * Workflow state file path
 */
const WORKFLOW_STATE_FILE = 'storage/workflow-state.yml';

/**
 * Metrics file path
 */
const METRICS_FILE = 'storage/workflow-metrics.yml';

class WorkflowEngine {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.stateFile = path.join(projectRoot, WORKFLOW_STATE_FILE);
    this.metricsFile = path.join(projectRoot, METRICS_FILE);
  }

  /**
   * Initialize workflow for a new feature/iteration
   */
  async initWorkflow(featureName, options = {}) {
    const state = {
      feature: featureName,
      currentStage: options.startStage || 'requirements',
      startedAt: new Date().toISOString(),
      stages: {},
      history: []
    };

    // Record initial stage
    state.stages[state.currentStage] = {
      enteredAt: new Date().toISOString(),
      status: 'in-progress'
    };

    state.history.push({
      timestamp: new Date().toISOString(),
      action: 'workflow-started',
      stage: state.currentStage,
      feature: featureName
    });

    await this.saveState(state);
    await this.recordMetric('workflow_started', { feature: featureName });

    return state;
  }

  /**
   * Get current workflow state
   */
  async getState() {
    if (!await fs.pathExists(this.stateFile)) {
      return null;
    }
    const content = await fs.readFile(this.stateFile, 'utf8');
    return yaml.load(content);
  }

  /**
   * Save workflow state
   */
  async saveState(state) {
    await fs.ensureDir(path.dirname(this.stateFile));
    await fs.writeFile(this.stateFile, yaml.dump(state, { indent: 2 }));
  }

  /**
   * Transition to the next stage
   */
  async transitionTo(targetStage, notes = '') {
    const state = await this.getState();
    if (!state) {
      throw new Error('No active workflow. Run initWorkflow first.');
    }

    const currentStage = state.currentStage;
    const validTransitions = WORKFLOW_STAGES[currentStage]?.next || [];

    if (!validTransitions.includes(targetStage)) {
      throw new Error(
        `Invalid transition: ${currentStage} → ${targetStage}. ` +
        `Valid transitions: ${validTransitions.join(', ')}`
      );
    }

    // Complete current stage
    if (state.stages[currentStage]) {
      state.stages[currentStage].completedAt = new Date().toISOString();
      state.stages[currentStage].status = 'completed';
      state.stages[currentStage].duration = this.calculateDuration(
        state.stages[currentStage].enteredAt,
        state.stages[currentStage].completedAt
      );
    }

    // Enter new stage
    state.stages[targetStage] = state.stages[targetStage] || {};
    state.stages[targetStage].enteredAt = new Date().toISOString();
    state.stages[targetStage].status = 'in-progress';
    state.stages[targetStage].attempts = (state.stages[targetStage].attempts || 0) + 1;

    state.currentStage = targetStage;

    // Record history
    state.history.push({
      timestamp: new Date().toISOString(),
      action: 'stage-transition',
      from: currentStage,
      to: targetStage,
      notes
    });

    await this.saveState(state);
    await this.recordMetric('stage_transition', {
      from: currentStage,
      to: targetStage,
      feature: state.feature
    });

    return state;
  }

  /**
   * Record a feedback loop (going back to a previous stage)
   */
  async recordFeedbackLoop(fromStage, toStage, reason) {
    const state = await this.getState();
    if (!state) return;

    state.history.push({
      timestamp: new Date().toISOString(),
      action: 'feedback-loop',
      from: fromStage,
      to: toStage,
      reason
    });

    await this.saveState(state);
    await this.recordMetric('feedback_loop', {
      from: fromStage,
      to: toStage,
      reason,
      feature: state.feature
    });
  }

  /**
   * Complete the workflow
   */
  async completeWorkflow(notes = '') {
    const state = await this.getState();
    if (!state) {
      throw new Error('No active workflow.');
    }

    state.completedAt = new Date().toISOString();
    state.totalDuration = this.calculateDuration(state.startedAt, state.completedAt);
    state.status = 'completed';

    // Complete current stage
    if (state.stages[state.currentStage]) {
      state.stages[state.currentStage].completedAt = new Date().toISOString();
      state.stages[state.currentStage].status = 'completed';
    }

    state.history.push({
      timestamp: new Date().toISOString(),
      action: 'workflow-completed',
      notes
    });

    await this.saveState(state);
    await this.recordMetric('workflow_completed', {
      feature: state.feature,
      totalDuration: state.totalDuration,
      stageCount: Object.keys(state.stages).length
    });

    // Generate summary
    return this.generateSummary(state);
  }

  /**
   * Record a metric
   */
  async recordMetric(name, data) {
    let metrics = [];
    if (await fs.pathExists(this.metricsFile)) {
      const content = await fs.readFile(this.metricsFile, 'utf8');
      metrics = yaml.load(content) || [];
    }

    metrics.push({
      timestamp: new Date().toISOString(),
      name,
      data
    });

    await fs.ensureDir(path.dirname(this.metricsFile));
    await fs.writeFile(this.metricsFile, yaml.dump(metrics, { indent: 2 }));
  }

  /**
   * Get workflow metrics summary
   */
  async getMetricsSummary() {
    if (!await fs.pathExists(this.metricsFile)) {
      return { message: 'No metrics recorded yet.' };
    }

    const content = await fs.readFile(this.metricsFile, 'utf8');
    const metrics = yaml.load(content) || [];

    const summary = {
      totalWorkflows: 0,
      completedWorkflows: 0,
      feedbackLoops: 0,
      stageTransitions: 0,
      averageDuration: null,
      stageStats: {}
    };

    const durations = [];

    metrics.forEach(m => {
      switch (m.name) {
        case 'workflow_started':
          summary.totalWorkflows++;
          break;
        case 'workflow_completed':
          summary.completedWorkflows++;
          if (m.data.totalDuration) {
            durations.push(this.parseDuration(m.data.totalDuration));
          }
          break;
        case 'feedback_loop':
          summary.feedbackLoops++;
          break;
        case 'stage_transition': {
          summary.stageTransitions++;
          const to = m.data.to;
          summary.stageStats[to] = summary.stageStats[to] || { visits: 0 };
          summary.stageStats[to].visits++;
          break;
        }
      }
    });

    if (durations.length > 0) {
      const avgMs = durations.reduce((a, b) => a + b, 0) / durations.length;
      summary.averageDuration = this.formatDuration(avgMs);
    }

    return summary;
  }

  /**
   * Generate workflow summary
   */
  generateSummary(state) {
    const stages = Object.entries(state.stages).map(([name, data]) => ({
      name,
      duration: data.duration || 'N/A',
      attempts: data.attempts || 1
    }));

    const feedbackLoops = state.history.filter(h => h.action === 'feedback-loop');

    return {
      feature: state.feature,
      totalDuration: state.totalDuration,
      stages,
      feedbackLoops: feedbackLoops.length,
      feedbackDetails: feedbackLoops
    };
  }

  /**
   * Calculate duration between two ISO timestamps
   */
  calculateDuration(start, end) {
    const ms = new Date(end) - new Date(start);
    return this.formatDuration(ms);
  }

  /**
   * Format milliseconds to human readable duration
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }

  /**
   * Parse duration string to milliseconds
   */
  parseDuration(duration) {
    const match = duration.match(/(\d+)([dhms])/g);
    if (!match) return 0;

    let ms = 0;
    match.forEach(part => {
      const value = parseInt(part);
      const unit = part.slice(-1);
      switch (unit) {
        case 'd': ms += value * 24 * 60 * 60 * 1000; break;
        case 'h': ms += value * 60 * 60 * 1000; break;
        case 'm': ms += value * 60 * 1000; break;
        case 's': ms += value * 1000; break;
      }
    });
    return ms;
  }

  /**
   * Get valid next stages from current state
   */
  async getValidTransitions() {
    const state = await this.getState();
    if (!state) return [];
    return WORKFLOW_STAGES[state.currentStage]?.next || [];
  }
}

module.exports = { WorkflowEngine, WORKFLOW_STAGES };
