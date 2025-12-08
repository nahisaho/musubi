/**
 * Tests for Steering Module Index
 */

const steering = require('../../src/steering');

describe('Steering Module Index', () => {
  describe('Auto-Update exports', () => {
    test('should export ChangeDetector', () => {
      expect(steering.ChangeDetector).toBeDefined();
    });

    test('should export SteeringUpdater', () => {
      expect(steering.SteeringUpdater).toBeDefined();
    });

    test('should export ProjectYmlSync', () => {
      expect(steering.ProjectYmlSync).toBeDefined();
    });

    test('should export CustomSteeringRules', () => {
      expect(steering.CustomSteeringRules).toBeDefined();
    });

    test('should export SteeringAutoUpdater', () => {
      expect(steering.SteeringAutoUpdater).toBeDefined();
    });

    test('should export SteeringFileType', () => {
      expect(steering.SteeringFileType).toBeDefined();
      expect(steering.SteeringFileType.STRUCTURE).toBe('structure');
    });

    test('should export UpdateTrigger', () => {
      expect(steering.UpdateTrigger).toBeDefined();
    });

    test('should export createSteeringAutoUpdater', () => {
      expect(steering.createSteeringAutoUpdater).toBeInstanceOf(Function);
    });
  });

  describe('Template Constraints exports', () => {
    test('should export Constraint', () => {
      expect(steering.Constraint).toBeDefined();
    });

    test('should export Checklist', () => {
      expect(steering.Checklist).toBeDefined();
    });

    test('should export ChecklistItem', () => {
      expect(steering.ChecklistItem).toBeDefined();
    });

    test('should export UncertaintyParser', () => {
      expect(steering.UncertaintyParser).toBeDefined();
    });

    test('should export TemplateSection', () => {
      expect(steering.TemplateSection).toBeDefined();
    });

    test('should export TemplateDefinition', () => {
      expect(steering.TemplateDefinition).toBeDefined();
    });

    test('should export TemplateConstraintEngine', () => {
      expect(steering.TemplateConstraintEngine).toBeDefined();
    });

    test('should export ConstraintType', () => {
      expect(steering.ConstraintType).toBeDefined();
      expect(steering.ConstraintType.REQUIRED).toBe('required');
    });

    test('should export UncertaintyMarker', () => {
      expect(steering.UncertaintyMarker).toBeDefined();
    });

    test('should export createTemplateConstraintEngine', () => {
      expect(steering.createTemplateConstraintEngine).toBeInstanceOf(Function);
    });
  });

  describe('Quality Metrics exports', () => {
    test('should export Metric', () => {
      expect(steering.Metric).toBeDefined();
    });

    test('should export CoverageMetric', () => {
      expect(steering.CoverageMetric).toBeDefined();
    });

    test('should export ComplianceMetric', () => {
      expect(steering.ComplianceMetric).toBeDefined();
    });

    test('should export HealthIndicator', () => {
      expect(steering.HealthIndicator).toBeDefined();
    });

    test('should export TrendAnalyzer', () => {
      expect(steering.TrendAnalyzer).toBeDefined();
    });

    test('should export QualityScoreCalculator', () => {
      expect(steering.QualityScoreCalculator).toBeDefined();
    });

    test('should export QualityMetricsDashboard', () => {
      expect(steering.QualityMetricsDashboard).toBeDefined();
    });

    test('should export MetricCategory', () => {
      expect(steering.MetricCategory).toBeDefined();
      expect(steering.MetricCategory.COVERAGE).toBe('coverage');
    });

    test('should export HealthStatus', () => {
      expect(steering.HealthStatus).toBeDefined();
    });

    test('should export TrendDirection', () => {
      expect(steering.TrendDirection).toBeDefined();
    });

    test('should export createQualityDashboard', () => {
      expect(steering.createQualityDashboard).toBeInstanceOf(Function);
    });
  });

  describe('Advanced Validation exports', () => {
    test('should export ValidationIssue', () => {
      expect(steering.ValidationIssue).toBeDefined();
    });

    test('should export ArtifactReference', () => {
      expect(steering.ArtifactReference).toBeDefined();
    });

    test('should export ConsistencyChecker', () => {
      expect(steering.ConsistencyChecker).toBeDefined();
    });

    test('should export GapDetector', () => {
      expect(steering.GapDetector).toBeDefined();
    });

    test('should export CompletenessChecker', () => {
      expect(steering.CompletenessChecker).toBeDefined();
    });

    test('should export DependencyValidator', () => {
      expect(steering.DependencyValidator).toBeDefined();
    });

    test('should export ReferenceValidator', () => {
      expect(steering.ReferenceValidator).toBeDefined();
    });

    test('should export AdvancedValidator', () => {
      expect(steering.AdvancedValidator).toBeDefined();
    });

    test('should export ValidationType', () => {
      expect(steering.ValidationType).toBeDefined();
      expect(steering.ValidationType.CONSISTENCY).toBe('consistency');
    });

    test('should export ArtifactType', () => {
      expect(steering.ArtifactType).toBeDefined();
    });

    test('should export createAdvancedValidator', () => {
      expect(steering.createAdvancedValidator).toBeInstanceOf(Function);
    });
  });

  describe('Integration', () => {
    test('should create auto-updater', () => {
      const updater = steering.createSteeringAutoUpdater();
      expect(updater).toBeInstanceOf(steering.SteeringAutoUpdater);
    });

    test('should create template engine', () => {
      const engine = steering.createTemplateConstraintEngine();
      expect(engine).toBeInstanceOf(steering.TemplateConstraintEngine);
    });

    test('should create quality dashboard', () => {
      const dashboard = steering.createQualityDashboard();
      expect(dashboard).toBeInstanceOf(steering.QualityMetricsDashboard);
    });

    test('should create advanced validator', () => {
      const validator = steering.createAdvancedValidator();
      expect(validator).toBeInstanceOf(steering.AdvancedValidator);
    });
  });
});
