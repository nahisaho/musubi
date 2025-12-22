/**
 * Workflow Mode Manager
 *
 * Manages workflow modes (small/medium/large) based on feature size.
 * Provides mode detection, stage management, and validation.
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Default workflow modes configuration
 */
const DEFAULT_MODES = {
  small: {
    description: '1-2時間の作業（バグ修正、小機能）',
    stages: ['requirements', 'implement', 'validate'],
    coverageThreshold: 60,
    earsFormat: 'optional',
    traceability: 'relaxed',
  },
  medium: {
    description: '1-2日の作業（中規模機能）',
    stages: ['requirements', 'design', 'tasks', 'implement', 'validate'],
    coverageThreshold: 70,
    earsFormat: 'required',
    traceability: 'standard',
  },
  large: {
    description: '1週間以上（大規模機能、新モジュール）',
    stages: ['steering', 'requirements', 'design', 'tasks', 'implement', 'validate', 'review'],
    coverageThreshold: 80,
    earsFormat: 'required',
    traceability: 'strict',
    adrRequired: true,
  },
};

/**
 * Auto-detection patterns for workflow modes
 */
const AUTO_DETECTION_PATTERNS = [
  { pattern: /^(fix|bugfix|hotfix):/i, mode: 'small' },
  { pattern: /^(docs|chore|style):/i, mode: 'small' },
  { pattern: /^(feat|feature):/i, mode: 'medium' },
  { pattern: /^(refactor|perf):/i, mode: 'medium' },
  { pattern: /^(breaking|major|arch):/i, mode: 'large' },
];

/**
 * Stage transitions by mode
 */
const MODE_TRANSITIONS = {
  small: {
    requirements: ['implement'],
    implement: ['validate'],
    validate: ['implement'], // Can loop back for fixes
  },
  medium: {
    requirements: ['design'],
    design: ['tasks'],
    tasks: ['implement'],
    implement: ['validate'],
    validate: ['implement', 'requirements'], // Feedback loops
  },
  large: {
    steering: ['requirements'],
    requirements: ['design'],
    design: ['tasks'],
    tasks: ['implement'],
    implement: ['validate', 'review'],
    validate: ['review', 'implement'],
    review: ['implement', 'requirements'], // Feedback loops
  },
};

class WorkflowModeManager {
  /**
   * Create a new WorkflowModeManager
   * @param {string} projectRoot - Project root directory
   */
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.configPath = path.join(projectRoot, 'steering/rules/workflow-modes.yml');
    this._config = null;
  }

  /**
   * Load configuration from file
   * @returns {Promise<object>} Configuration object
   */
  async loadConfig() {
    if (this._config) return this._config;

    try {
      if (await fs.pathExists(this.configPath)) {
        const content = await fs.readFile(this.configPath, 'utf8');
        this._config = yaml.load(content);
        return this._config;
      }
    } catch (error) {
      console.warn(`Warning: Could not load workflow modes config: ${error.message}`);
    }

    // Return default configuration
    return {
      modes: DEFAULT_MODES,
      auto_detection: { enabled: true, rules: AUTO_DETECTION_PATTERNS },
    };
  }

  /**
   * Get available workflow modes
   * @returns {Promise<string[]>} List of mode names
   */
  async getModes() {
    const config = await this.loadConfig();
    return Object.keys(config.modes || DEFAULT_MODES);
  }

  /**
   * Get mode configuration
   * @param {string} modeName - Mode name (small/medium/large)
   * @returns {Promise<object|null>} Mode configuration
   */
  async getMode(modeName) {
    const config = await this.loadConfig();
    const modes = config.modes || DEFAULT_MODES;
    return modes[modeName] || null;
  }

  /**
   * Get stages for a specific mode
   * @param {string} modeName - Mode name
   * @returns {Promise<string[]>} List of stages
   */
  async getStages(modeName) {
    const mode = await this.getMode(modeName);
    if (!mode) return [];
    return mode.stages || [];
  }

  /**
   * Get valid transitions for a mode and stage
   * @param {string} modeName - Mode name
   * @param {string} currentStage - Current stage
   * @returns {Promise<string[]>} Valid next stages
   */
  async getValidTransitions(modeName, currentStage) {
    const transitions = MODE_TRANSITIONS[modeName];
    if (!transitions) return [];
    return transitions[currentStage] || [];
  }

  /**
   * Auto-detect workflow mode from feature name
   * @param {string} featureName - Feature or branch name
   * @returns {Promise<string>} Detected mode (defaults to 'medium')
   */
  async detectMode(featureName) {
    const config = await this.loadConfig();

    if (!config.auto_detection?.enabled) {
      return 'medium';
    }

    // Check against patterns
    for (const rule of AUTO_DETECTION_PATTERNS) {
      if (rule.pattern.test(featureName)) {
        return rule.mode;
      }
    }

    // Default to medium
    return 'medium';
  }

  /**
   * Validate if a stage is valid for a mode
   * @param {string} modeName - Mode name
   * @param {string} stage - Stage to validate
   * @returns {Promise<boolean>} True if valid
   */
  async isValidStage(modeName, stage) {
    const stages = await this.getStages(modeName);
    return stages.includes(stage);
  }

  /**
   * Get coverage threshold for a mode
   * @param {string} modeName - Mode name
   * @returns {Promise<number>} Coverage threshold percentage
   */
  async getCoverageThreshold(modeName) {
    const mode = await this.getMode(modeName);
    if (!mode) return 80; // Default
    return mode.coverageThreshold || mode.requirements?.coverage_threshold || 80;
  }

  /**
   * Get first stage for a mode
   * @param {string} modeName - Mode name
   * @returns {Promise<string>} First stage
   */
  async getFirstStage(modeName) {
    const stages = await this.getStages(modeName);
    return stages[0] || 'requirements';
  }

  /**
   * Get last stage for a mode
   * @param {string} modeName - Mode name
   * @returns {Promise<string>} Last stage
   */
  async getLastStage(modeName) {
    const stages = await this.getStages(modeName);
    return stages[stages.length - 1] || 'validate';
  }

  /**
   * Check if EARS format is required for a mode
   * @param {string} modeName - Mode name
   * @returns {Promise<boolean>} True if required
   */
  async isEarsRequired(modeName) {
    const mode = await this.getMode(modeName);
    if (!mode) return true;
    return mode.earsFormat === 'required' || mode.requirements?.ears_format === 'required';
  }

  /**
   * Check if ADR is required for a mode
   * @param {string} modeName - Mode name
   * @returns {Promise<boolean>} True if required
   */
  async isAdrRequired(modeName) {
    const mode = await this.getMode(modeName);
    if (!mode) return false;
    return mode.adrRequired || mode.requirements?.adr_required || false;
  }

  /**
   * Get skipped artifacts for a mode
   * @param {string} modeName - Mode name
   * @returns {Promise<string[]>} List of artifacts to skip
   */
  async getSkippedArtifacts(modeName) {
    const mode = await this.getMode(modeName);
    if (!mode) return [];
    return mode.skip_artifacts || mode.skipArtifacts || [];
  }

  /**
   * Get mode summary for display
   * @param {string} modeName - Mode name
   * @returns {Promise<object>} Mode summary
   */
  async getModeSummary(modeName) {
    const mode = await this.getMode(modeName);
    if (!mode) return null;

    return {
      name: modeName,
      description: mode.description,
      stageCount: (mode.stages || []).length,
      stages: mode.stages || [],
      coverageThreshold: await this.getCoverageThreshold(modeName),
      earsRequired: await this.isEarsRequired(modeName),
      adrRequired: await this.isAdrRequired(modeName),
    };
  }

  /**
   * Compare modes for selection guidance
   * @returns {Promise<object[]>} Mode comparison
   */
  async compareModes() {
    const modes = await this.getModes();
    const comparison = [];

    for (const modeName of modes) {
      comparison.push(await this.getModeSummary(modeName));
    }

    return comparison;
  }
}

module.exports = { WorkflowModeManager, DEFAULT_MODES, AUTO_DETECTION_PATTERNS, MODE_TRANSITIONS };
