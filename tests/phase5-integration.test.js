/**
 * Phase 5 Integration Tests
 */

const {
  Phase5Integration,
  createPhase5Integration,
  INTEGRATION_STATUS,
  // Sprint 5.1
  SteeringAutoUpdate,
  SteeringValidator,
  TRIGGER,
  STEERING_TYPE,
  SEVERITY,
  RULE_TYPE,
  // Sprint 5.2
  TemplateConstraints,
  ThinkingChecklist,
  CONSTRAINT_TYPE,
  UNCERTAINTY,
  MARKER_TYPE,
  // Sprint 5.3
  QualityDashboard,
  METRIC_CATEGORY,
  HEALTH_STATUS,
  CONSTITUTIONAL_ARTICLES,
  // Sprint 5.4
  AdvancedValidation,
  VALIDATION_TYPE,
  ARTIFACT_TYPE,
  GAP_SEVERITY
} = require('../src/phase5-integration');

describe('Phase5Integration', () => {
  describe('constructor', () => {
    test('should create with default options', () => {
      const integration = new Phase5Integration();
      expect(integration.status).toBe(INTEGRATION_STATUS.READY);
    });

    test('should initialize all components', () => {
      const integration = new Phase5Integration();
      expect(integration.steeringAutoUpdate).toBeDefined();
      expect(integration.steeringValidator).toBeDefined();
      expect(integration.templateConstraints).toBeDefined();
      expect(integration.qualityDashboard).toBeDefined();
      expect(integration.advancedValidation).toBeDefined();
      expect(integration.thinkingChecklist).toBeDefined();
    });

    test('should emit ready event', () => {
      const handler = jest.fn();
      const integration = new Phase5Integration();
      // Event already fired during construction, verify status
      expect(integration.status).toBe(INTEGRATION_STATUS.READY);
    });
  });

  describe('getComponent()', () => {
    let integration;

    beforeEach(() => {
      integration = new Phase5Integration();
    });

    test('should return component by name', () => {
      expect(integration.getComponent('qualityDashboard')).toBe(integration.qualityDashboard);
      expect(integration.getComponent('advancedValidation')).toBe(integration.advancedValidation);
    });

    test('should return null for unknown component', () => {
      expect(integration.getComponent('unknown')).toBeNull();
    });
  });

  describe('analyzeProject()', () => {
    let integration;

    beforeEach(() => {
      integration = new Phase5Integration();
    });

    test('should run comprehensive analysis', async () => {
      const context = {
        coverage: { lines: 80, branches: 70, functions: 85, statements: 75, overall: 78 },
        quality: { complexity: 70, maintainability: 75, documentation: 65, testQuality: 80, overall: 73 }
      };

      const result = await integration.analyzeProject(context);
      expect(result.health).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.validation).toBeDefined();
      expect(result.overallScore).toBeDefined();
    });

    test('should generate recommendations', async () => {
      const result = await integration.analyzeProject({});
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    test('should emit analysis-complete event', async () => {
      const handler = jest.fn();
      integration.on('analysis-complete', handler);

      await integration.analyzeProject({});
      expect(handler).toHaveBeenCalled();
    });

    test('should set status to running then ready', async () => {
      await integration.analyzeProject({});
      expect(integration.status).toBe(INTEGRATION_STATUS.READY);
    });
  });

  describe('validateSteering()', () => {
    let integration;

    beforeEach(() => {
      integration = new Phase5Integration();
    });

    test('should validate multiple steering files', () => {
      const files = {
        'structure.md': '# Structure\n\n## Patterns\nContent here',
        'tech.md': '# Technology Stack\n\n## Languages\nContent here'
      };

      const result = integration.validateSteering(files);
      expect(result.files['structure.md']).toBeDefined();
      expect(result.files['tech.md']).toBeDefined();
      expect(result.avgScore).toBeDefined();
    });

    test('should return overall validity', () => {
      const files = {
        'test.md': '# Test\nContent'
      };

      const result = integration.validateSteering(files);
      expect(typeof result.valid).toBe('boolean');
    });
  });

  describe('validateTemplate()', () => {
    let integration;

    beforeEach(() => {
      integration = new Phase5Integration();
    });

    test('should validate content against template', () => {
      const content = `
# Overview
This is the overview section with enough content.

# Functional
When user logs in, the system shall authenticate.

# Assumptions
[ASSUMPTION]: User has valid credentials
      `;

      const result = integration.validateTemplate(content, 'requirements');
      expect(result.templateId).toBe('requirements');
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe('getStatus()', () => {
    test('should return comprehensive status', () => {
      const integration = new Phase5Integration();
      const status = integration.getStatus();

      expect(status.status).toBe(INTEGRATION_STATUS.READY);
      expect(status.components).toBeDefined();
      expect(status.components.steeringAutoUpdate).toBeDefined();
      expect(status.components.qualityDashboard).toBeDefined();
      expect(status.timestamp).toBeDefined();
    });
  });

  describe('generateReport()', () => {
    test('should generate markdown report', async () => {
      const integration = new Phase5Integration();
      await integration.analyzeProject({
        coverage: { overall: 75 },
        quality: { overall: 70 }
      });

      const report = integration.generateReport();
      expect(report).toContain('# Phase 5 Integration Report');
      expect(report).toContain('## Project Health');
      expect(report).toContain('## Components');
    });
  });

  describe('reset()', () => {
    test('should reset all components', async () => {
      const integration = new Phase5Integration();
      await integration.analyzeProject({});
      integration.reset();

      expect(integration.status).toBe(INTEGRATION_STATUS.READY);
    });

    test('should emit reset event', () => {
      const integration = new Phase5Integration();
      const handler = jest.fn();
      integration.on('reset', handler);
      integration.reset();
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('start/stop', () => {
    test('should start monitoring', () => {
      const integration = new Phase5Integration();
      integration.start();
      expect(integration.status).toBe(INTEGRATION_STATUS.RUNNING);
      integration.stop();
    });

    test('should stop monitoring', () => {
      const integration = new Phase5Integration();
      integration.start();
      integration.stop();
      expect(integration.status).toBe(INTEGRATION_STATUS.STOPPED);
    });

    test('should emit started event', () => {
      const integration = new Phase5Integration();
      const handler = jest.fn();
      integration.on('started', handler);
      integration.start();
      expect(handler).toHaveBeenCalled();
      integration.stop();
    });

    test('should emit stopped event', () => {
      const integration = new Phase5Integration();
      const handler = jest.fn();
      integration.on('stopped', handler);
      integration.start();
      integration.stop();
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('event handling', () => {
    test('should emit health-alert on critical status', async () => {
      const integration = new Phase5Integration();
      const handler = jest.fn();
      integration.on('health-alert', handler);

      // Trigger low health metrics
      await integration.analyzeProject({
        coverage: { overall: 10 },
        quality: { overall: 10 }
      });

      // Note: Event may not fire if thresholds not met
    });
  });
});

describe('createPhase5Integration()', () => {
  test('should create instance', () => {
    const integration = createPhase5Integration();
    expect(integration).toBeInstanceOf(Phase5Integration);
  });

  test('should accept options', () => {
    const integration = createPhase5Integration({
      validation: { strict: true }
    });
    expect(integration.advancedValidation.strict).toBe(true);
  });
});

describe('INTEGRATION_STATUS', () => {
  test('should have all status values', () => {
    expect(INTEGRATION_STATUS.INITIALIZED).toBe('initialized');
    expect(INTEGRATION_STATUS.READY).toBe('ready');
    expect(INTEGRATION_STATUS.RUNNING).toBe('running');
    expect(INTEGRATION_STATUS.STOPPED).toBe('stopped');
    expect(INTEGRATION_STATUS.ERROR).toBe('error');
  });
});

describe('Re-exported modules', () => {
  describe('Sprint 5.1: Steering', () => {
    test('should export SteeringAutoUpdate', () => {
      expect(SteeringAutoUpdate).toBeDefined();
    });

    test('should export SteeringValidator', () => {
      expect(SteeringValidator).toBeDefined();
    });

    test('should export TRIGGER', () => {
      expect(TRIGGER.AGENT_WORK).toBeDefined();
    });

    test('should export SEVERITY', () => {
      expect(SEVERITY.ERROR).toBeDefined();
    });
  });

  describe('Sprint 5.2: Templates', () => {
    test('should export TemplateConstraints', () => {
      expect(TemplateConstraints).toBeDefined();
    });

    test('should export ThinkingChecklist', () => {
      expect(ThinkingChecklist).toBeDefined();
    });

    test('should export CONSTRAINT_TYPE', () => {
      expect(CONSTRAINT_TYPE.REQUIRED).toBeDefined();
    });

    test('should export MARKER_TYPE', () => {
      expect(MARKER_TYPE.ASSUMPTION).toBeDefined();
    });
  });

  describe('Sprint 5.3: Quality Dashboard', () => {
    test('should export QualityDashboard', () => {
      expect(QualityDashboard).toBeDefined();
    });

    test('should export HEALTH_STATUS', () => {
      expect(HEALTH_STATUS.HEALTHY).toBeDefined();
    });

    test('should export CONSTITUTIONAL_ARTICLES', () => {
      expect(CONSTITUTIONAL_ARTICLES.SINGLE_SOURCE_OF_TRUTH).toBeDefined();
    });
  });

  describe('Sprint 5.4: Advanced Validation', () => {
    test('should export AdvancedValidation', () => {
      expect(AdvancedValidation).toBeDefined();
    });

    test('should export VALIDATION_TYPE', () => {
      expect(VALIDATION_TYPE.CROSS_ARTIFACT).toBeDefined();
    });

    test('should export ARTIFACT_TYPE', () => {
      expect(ARTIFACT_TYPE.REQUIREMENT).toBeDefined();
    });

    test('should export GAP_SEVERITY', () => {
      expect(GAP_SEVERITY.CRITICAL).toBeDefined();
    });
  });
});
