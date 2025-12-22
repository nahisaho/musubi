/**
 * Workflow Engine for MUSUBI SDD
 *
 * Manages workflow state, stage transitions, and metrics collection.
 * Supports workflow modes (small/medium/large) for flexible development.
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const { WorkflowModeManager } = require('./workflow-mode-manager');

/**
 * Workflow stages with their valid transitions (full mode - large)
 */
const WORKFLOW_STAGES = {
  spike: { next: ['requirements'], optional: true },
  research: { next: ['requirements'], optional: true },
  steering: { next: ['requirements'], optional: true },
  requirements: { next: ['design', 'implement'] }, // Can skip design in small mode
  design: { next: ['tasks'] },
  tasks: { next: ['implement'] },
  implement: { next: ['validate', 'review'] },
  validate: { next: ['review', 'implement'] },
  review: { next: ['testing', 'implement'] }, // Can go back to implement
  testing: { next: ['deployment', 'implement', 'requirements'] }, // Feedback loops
  deployment: { next: ['monitoring'] },
  monitoring: { next: ['retrospective'] },
  retrospective: { next: ['requirements'] }, // New iteration
};

/**
 * Stage alias mapping (implementation -> implement for backwards compatibility)
 */
const STAGE_ALIASES = {
  implementation: 'implement',
  validation: 'validate',
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
    this.modeManager = new WorkflowModeManager(projectRoot);
  }

  /**
   * Initialize workflow for a new feature/iteration
   * @param {string} featureName - Name of the feature
   * @param {object} options - Options including mode (small/medium/large)
   */
  async initWorkflow(featureName, options = {}) {
    // Auto-detect or use provided mode
    const mode = options.mode || (await this.modeManager.detectMode(featureName));
    const startStage = options.startStage || (await this.modeManager.getFirstStage(mode));

    const state = {
      feature: featureName,
      mode: mode,
      currentStage: startStage,
      startedAt: new Date().toISOString(),
      stages: {},
      history: [],
      config: {
        coverageThreshold: await this.modeManager.getCoverageThreshold(mode),
        earsRequired: await this.modeManager.isEarsRequired(mode),
        adrRequired: await this.modeManager.isAdrRequired(mode),
        skippedArtifacts: await this.modeManager.getSkippedArtifacts(mode),
      },
    };

    // Record initial stage
    state.stages[state.currentStage] = {
      enteredAt: new Date().toISOString(),
      status: 'in-progress',
    };

    state.history.push({
      timestamp: new Date().toISOString(),
      action: 'workflow-started',
      stage: state.currentStage,
      feature: featureName,
      mode: mode,
    });

    await this.saveState(state);
    await this.recordMetric('workflow_started', { feature: featureName });

    return state;
  }

  /**
   * Get current workflow state
   */
  async getState() {
    if (!(await fs.pathExists(this.stateFile))) {
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

    // Normalize stage name (handle aliases)
    const normalizedTarget = STAGE_ALIASES[targetStage] || targetStage;
    const currentStage = state.currentStage;

    // Get valid transitions based on mode
    let validTransitions;
    if (state.mode) {
      validTransitions = await this.modeManager.getValidTransitions(state.mode, currentStage);
    }

    // Fall back to full transitions if mode-specific not available
    if (!validTransitions || validTransitions.length === 0) {
      validTransitions = WORKFLOW_STAGES[currentStage]?.next || [];
    }

    if (!validTransitions.includes(normalizedTarget)) {
      throw new Error(
        `Invalid transition: ${currentStage} → ${normalizedTarget}. ` +
          `Valid transitions for ${state.mode || 'default'} mode: ${validTransitions.join(', ')}`
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
      notes,
    });

    await this.saveState(state);
    await this.recordMetric('stage_transition', {
      from: currentStage,
      to: targetStage,
      feature: state.feature,
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
      reason,
    });

    await this.saveState(state);
    await this.recordMetric('feedback_loop', {
      from: fromStage,
      to: toStage,
      reason,
      feature: state.feature,
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
      notes,
    });

    await this.saveState(state);
    await this.recordMetric('workflow_completed', {
      feature: state.feature,
      totalDuration: state.totalDuration,
      stageCount: Object.keys(state.stages).length,
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
      data,
    });

    await fs.ensureDir(path.dirname(this.metricsFile));
    await fs.writeFile(this.metricsFile, yaml.dump(metrics, { indent: 2 }));
  }

  /**
   * Get workflow metrics summary
   */
  async getMetricsSummary() {
    if (!(await fs.pathExists(this.metricsFile))) {
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
      stageStats: {},
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
      attempts: data.attempts || 1,
    }));

    const feedbackLoops = state.history.filter(h => h.action === 'feedback-loop');

    return {
      feature: state.feature,
      totalDuration: state.totalDuration,
      stages,
      feedbackLoops: feedbackLoops.length,
      feedbackDetails: feedbackLoops,
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
        case 'd':
          ms += value * 24 * 60 * 60 * 1000;
          break;
        case 'h':
          ms += value * 60 * 60 * 1000;
          break;
        case 'm':
          ms += value * 60 * 1000;
          break;
        case 's':
          ms += value * 1000;
          break;
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

    // Use mode-specific transitions if available
    if (state.mode) {
      const modeTransitions = await this.modeManager.getValidTransitions(
        state.mode,
        state.currentStage
      );
      if (modeTransitions && modeTransitions.length > 0) {
        return modeTransitions;
      }
    }

    return WORKFLOW_STAGES[state.currentStage]?.next || [];
  }

  /**
   * Get current workflow mode
   * @returns {Promise<string|null>} Current mode or null
   */
  async getCurrentMode() {
    const state = await this.getState();
    return state?.mode || null;
  }

  /**
   * Get mode configuration for current workflow
   * @returns {Promise<object|null>} Mode config or null
   */
  async getModeConfig() {
    const state = await this.getState();
    if (!state) return null;
    return state.config || null;
  }

  /**
   * Check if an artifact should be skipped in current mode
   * @param {string} artifact - Artifact name (e.g., 'design.md')
   * @returns {Promise<boolean>} True if should be skipped
   */
  async shouldSkipArtifact(artifact) {
    const config = await this.getModeConfig();
    if (!config || !config.skippedArtifacts) return false;
    return config.skippedArtifacts.includes(artifact);
  }

  /**
   * Get coverage threshold for current workflow
   * @returns {Promise<number>} Coverage threshold percentage
   */
  async getCoverageThreshold() {
    const config = await this.getModeConfig();
    return config?.coverageThreshold || 80;
  }

  /**
   * Get workflow mode manager instance
   * @returns {WorkflowModeManager} Mode manager
   */
  getModeManager() {
    return this.modeManager;
  }
}

module.exports = { WorkflowEngine, WORKFLOW_STAGES, STAGE_ALIASES };
