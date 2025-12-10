/**
 * Phase 5 Integration Module
 * Advanced Features統合エンジン
 * 
 * @module phase5-integration
 */

const EventEmitter = require('events');

// Phase 5 modules
const { SteeringAutoUpdate, createSteeringAutoUpdate, TRIGGER, STEERING_TYPE } = require('./steering/steering-auto-update');
const { SteeringValidator, createSteeringValidator, SEVERITY, RULE_TYPE } = require('./steering/steering-validator');
const { TemplateConstraints, ThinkingChecklist, createTemplateConstraints, createThinkingChecklist, CONSTRAINT_TYPE, UNCERTAINTY, MARKER_TYPE } = require('./templates/template-constraints');
const { QualityDashboard, createQualityDashboard, METRIC_CATEGORY, HEALTH_STATUS, CONSTITUTIONAL_ARTICLES } = require('./monitoring/quality-dashboard');
const { AdvancedValidation, createAdvancedValidation, VALIDATION_TYPE, ARTIFACT_TYPE, GAP_SEVERITY } = require('./validators/advanced-validation');
const { CodeGraphAutoUpdate, createCodeGraphAutoUpdate, TRIGGER: CODEGRAPH_TRIGGER, TARGET: CODEGRAPH_TARGET } = require('./analyzers/codegraph-auto-update');

/**
 * Phase 5 integration status
 */
const INTEGRATION_STATUS = {
  INITIALIZED: 'initialized',
  READY: 'ready',
  RUNNING: 'running',
  STOPPED: 'stopped',
  ERROR: 'error'
};

/**
 * Phase 5 Integration Engine
 * Combines all advanced features for comprehensive project management
 */
class Phase5Integration extends EventEmitter {
  /**
   * @param {Object} options
   * @param {Object} options.steering - Steering auto-update options
   * @param {Object} options.validator - Steering validator options
   * @param {Object} options.templates - Template constraints options
   * @param {Object} options.dashboard - Quality dashboard options
   * @param {Object} options.validation - Advanced validation options
   * @param {Object} options.codegraph - CodeGraph auto-update options
   */
  constructor(options = {}) {
    super();

    this.status = INTEGRATION_STATUS.INITIALIZED;
    this.options = options;

    // Initialize components
    this.steeringAutoUpdate = createSteeringAutoUpdate(options.steering || {});
    this.steeringValidator = createSteeringValidator(options.validator || {});
    this.templateConstraints = createTemplateConstraints(options.templates || {});
    this.qualityDashboard = createQualityDashboard(options.dashboard || {});
    this.advancedValidation = createAdvancedValidation(options.validation || {});
    this.codeGraphAutoUpdate = createCodeGraphAutoUpdate(options.codegraph || {});

    // Thinking checklist
    this.thinkingChecklist = createThinkingChecklist();

    // Wire up event handlers
    this.setupEventHandlers();

    this.status = INTEGRATION_STATUS.READY;
    this.emit('ready');
  }

  /**
   * Setup cross-component event handlers
   */
  setupEventHandlers() {
    // When steering is updated, validate it
    this.steeringAutoUpdate.on('update-applied', (update) => {
      this.emit('steering-updated', update);
    });

    // When quality is collected, check thresholds
    this.qualityDashboard.on('collected', (snapshot) => {
      const health = this.qualityDashboard.getHealthSummary();
      if (health.status === HEALTH_STATUS.CRITICAL || health.status === HEALTH_STATUS.FAILING) {
        this.emit('health-alert', { status: health.status, snapshot });
      }
    });

    // When validation finds issues, emit alerts
    this.advancedValidation.on('validated', (result) => {
      if (!result.valid) {
        this.emit('validation-alert', result);
      }
    });

    // When gaps are detected, emit alerts
    this.advancedValidation.on('gaps-detected', (result) => {
      if (result.criticalGaps > 0) {
        this.emit('gap-alert', result);
      }
    });

    // When codegraph is updated, emit events
    this.codeGraphAutoUpdate.on('update-complete', (result) => {
      this.emit('codegraph-updated', result);
    });

    // When codegraph has errors, emit alerts
    this.codeGraphAutoUpdate.on('update-error', (error) => {
      this.emit('codegraph-error', error);
    });
  }

  /**
   * Get component by name
   * @param {string} name
   * @returns {Object|null}
   */
  getComponent(name) {
    const components = {
      steeringAutoUpdate: this.steeringAutoUpdate,
      steeringValidator: this.steeringValidator,
      templateConstraints: this.templateConstraints,
      qualityDashboard: this.qualityDashboard,
      advancedValidation: this.advancedValidation,
      thinkingChecklist: this.thinkingChecklist,
      codeGraphAutoUpdate: this.codeGraphAutoUpdate
    };
    return components[name] || null;
  }

  /**
   * Run comprehensive project analysis
   * @param {Object} context - Project context
   * @returns {Object}
   */
  async analyzeProject(context = {}) {
    const timestamp = new Date().toISOString();
    this.status = INTEGRATION_STATUS.RUNNING;

    try {
      // Collect quality metrics
      const metrics = await this.qualityDashboard.collect(context);

      // Run advanced validations
      const validation = this.advancedValidation.runAllValidations();

      // Get health summary
      const health = this.qualityDashboard.getHealthSummary();

      // Calculate overall score
      const overallScore = this.calculateOverallScore(metrics, validation);

      const result = {
        timestamp,
        status: this.status,
        health,
        metrics,
        validation,
        overallScore,
        recommendations: this.generateRecommendations(health, validation)
      };

      this.status = INTEGRATION_STATUS.READY;
      this.emit('analysis-complete', result);

      return result;
    } catch (error) {
      this.status = INTEGRATION_STATUS.ERROR;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Calculate overall project score
   */
  calculateOverallScore(metrics, validation) {
    const healthScore = metrics.health?.overall ?? 0;
    const validationScore = validation.valid ? 100 : 
      Math.max(0, 100 - (validation.criticalIssues * 20) - (validation.totalIssues * 5));

    return Math.round((healthScore + validationScore) / 2);
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(health, validation) {
    const recommendations = [];

    // Health-based recommendations
    if (health.breakdown.coverage.status !== HEALTH_STATUS.HEALTHY) {
      recommendations.push({
        type: 'coverage',
        priority: 'high',
        message: 'Increase test coverage to improve project health',
        currentScore: health.breakdown.coverage.score
      });
    }

    if (health.breakdown.constitutional.status !== HEALTH_STATUS.HEALTHY) {
      recommendations.push({
        type: 'constitutional',
        priority: 'high',
        message: 'Review constitutional compliance for all articles',
        currentScore: health.breakdown.constitutional.score
      });
    }

    // Validation-based recommendations
    if (validation.gaps.gapCount > 0) {
      recommendations.push({
        type: 'gaps',
        priority: validation.gaps.criticalGaps > 0 ? 'critical' : 'medium',
        message: `Address ${validation.gaps.gapCount} specification gaps`,
        details: validation.gaps.gaps.slice(0, 5)
      });
    }

    if (validation.traceability.coverage < 80) {
      recommendations.push({
        type: 'traceability',
        priority: 'medium',
        message: 'Improve traceability coverage between artifacts',
        currentCoverage: validation.traceability.coverage
      });
    }

    return recommendations;
  }

  /**
   * Validate steering files
   * @param {Object} files - Map of file name to content
   * @returns {Object}
   */
  validateSteering(files) {
    const results = {};

    for (const [name, content] of Object.entries(files)) {
      results[name] = this.steeringValidator.validateFile(content, name);
    }

    const overallValid = Object.values(results).every(r => r.valid);
    const avgScore = Object.values(results).reduce((sum, r) => sum + r.score, 0) / Object.keys(results).length;

    return {
      valid: overallValid,
      files: results,
      avgScore: Math.round(avgScore),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate template content
   * @param {string} content
   * @param {string} templateId
   * @returns {Object}
   */
  validateTemplate(content, templateId) {
    return this.templateConstraints.validate(content, templateId);
  }

  /**
   * Get comprehensive status
   * @returns {Object}
   */
  getStatus() {
    return {
      status: this.status,
      components: {
        steeringAutoUpdate: {
          rules: this.steeringAutoUpdate.rules?.length ?? 0,
          history: this.steeringAutoUpdate.updateHistory?.length ?? 0
        },
        steeringValidator: {
          rules: this.steeringValidator.rules?.size ?? 0,
          history: this.steeringValidator.history?.length ?? 0
        },
        templateConstraints: {
          templates: Object.keys(this.templateConstraints.templates).length,
          history: this.templateConstraints.validationHistory?.length ?? 0
        },
        qualityDashboard: {
          metrics: this.qualityDashboard.metrics?.size ?? 0,
          history: this.qualityDashboard.history?.length ?? 0
        },
        advancedValidation: {
          artifacts: this.advancedValidation.artifacts?.size ?? 0,
          links: this.advancedValidation.countLinks?.() ?? 0
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate comprehensive report
   * @returns {string}
   */
  generateReport() {
    const status = this.getStatus();
    const health = this.qualityDashboard.getHealthSummary();

    let report = `# Phase 5 Integration Report\n\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;

    // Status
    report += `## Status\n\n`;
    report += `Integration Status: **${status.status}**\n\n`;

    // Health Summary
    report += `## Project Health\n\n`;
    report += `| Metric | Score | Status |\n`;
    report += `|--------|-------|--------|\n`;
    report += `| Overall | ${health.overall.toFixed(1)}% | ${health.status} |\n`;
    report += `| Coverage | ${health.breakdown.coverage.score.toFixed(1)}% | ${health.breakdown.coverage.status} |\n`;
    report += `| Constitutional | ${health.breakdown.constitutional.score.toFixed(1)}% | ${health.breakdown.constitutional.status} |\n`;
    report += `| Quality | ${health.breakdown.quality.score.toFixed(1)}% | ${health.breakdown.quality.status} |\n\n`;

    // Component Summary
    report += `## Components\n\n`;
    report += `| Component | Metric | Value |\n`;
    report += `|-----------|--------|-------|\n`;
    report += `| Steering Auto-Update | Rules | ${status.components.steeringAutoUpdate.rules} |\n`;
    report += `| Steering Validator | Rules | ${status.components.steeringValidator.rules} |\n`;
    report += `| Template Constraints | Templates | ${status.components.templateConstraints.templates} |\n`;
    report += `| Quality Dashboard | Metrics | ${status.components.qualityDashboard.metrics} |\n`;
    report += `| Advanced Validation | Artifacts | ${status.components.advancedValidation.artifacts} |\n\n`;

    // Traceability
    const traceReport = this.advancedValidation.exportMatrix();
    report += traceReport;

    return report;
  }

  /**
   * Reset all components
   */
  reset() {
    this.steeringAutoUpdate.clearHistory?.();
    this.steeringValidator.history = [];
    this.templateConstraints.clearHistory();
    this.qualityDashboard.clear();
    this.advancedValidation.clear();
    this.thinkingChecklist.reset();
    
    this.status = INTEGRATION_STATUS.READY;
    this.emit('reset');
  }

  /**
   * Start monitoring
   */
  start() {
    this.qualityDashboard.startAutoCollection();
    this.codeGraphAutoUpdate.start();
    this.status = INTEGRATION_STATUS.RUNNING;
    this.emit('started');
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.qualityDashboard.stopAutoCollection();
    this.codeGraphAutoUpdate.stop();
    this.status = INTEGRATION_STATUS.STOPPED;
    this.emit('stopped');
  }
}

/**
 * Factory function
 */
function createPhase5Integration(options = {}) {
  return new Phase5Integration(options);
}

module.exports = {
  // Main integration
  Phase5Integration,
  createPhase5Integration,
  INTEGRATION_STATUS,

  // Re-export Sprint 5.1
  SteeringAutoUpdate,
  createSteeringAutoUpdate,
  TRIGGER,
  STEERING_TYPE,

  // Re-export Sprint 5.1 validator
  SteeringValidator,
  createSteeringValidator,
  SEVERITY,
  RULE_TYPE,

  // Re-export Sprint 5.2
  TemplateConstraints,
  ThinkingChecklist,
  createTemplateConstraints,
  createThinkingChecklist,
  CONSTRAINT_TYPE,
  UNCERTAINTY,
  MARKER_TYPE,

  // Re-export Sprint 5.3
  QualityDashboard,
  createQualityDashboard,
  METRIC_CATEGORY,
  HEALTH_STATUS,
  CONSTITUTIONAL_ARTICLES,

  // Re-export Sprint 5.4
  AdvancedValidation,
  createAdvancedValidation,
  VALIDATION_TYPE,
  ARTIFACT_TYPE,
  GAP_SEVERITY,

  // Re-export Sprint 5.5: CodeGraph Auto-Update
  CodeGraphAutoUpdate,
  createCodeGraphAutoUpdate,
  CODEGRAPH_TRIGGER,
  CODEGRAPH_TARGET
};
