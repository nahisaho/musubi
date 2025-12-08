/**
 * Steering Module - Main Entry Point
 * 
 * Provides comprehensive steering file management:
 * - Auto-Update: Automatic steering file updates
 * - Template Constraints: LLM-constraining syntax
 * - Quality Metrics: Dashboard and analytics
 * - Advanced Validation: Cross-artifact consistency
 */

// Auto-Update Module
const {
  ChangeDetector,
  SteeringUpdater,
  ProjectYmlSync,
  CustomSteeringRules,
  SteeringAutoUpdater,
  SteeringFileType,
  UpdateTrigger,
  createSteeringAutoUpdater
} = require('./auto-updater');

// Template Constraints Module
const {
  Constraint,
  ChecklistItem,
  Checklist,
  UncertaintyParser,
  TemplateSection,
  TemplateDefinition,
  TemplateConstraintEngine,
  ConstraintType,
  UncertaintyMarker,
  Severity: ConstraintSeverity,
  createTemplateConstraintEngine
} = require('./template-constraints');

// Quality Metrics Module
const {
  Metric,
  CoverageMetric,
  ComplianceMetric,
  HealthIndicator,
  TrendAnalyzer,
  QualityScoreCalculator,
  QualityMetricsDashboard,
  MetricCategory,
  HealthStatus,
  TrendDirection,
  createQualityDashboard
} = require('./quality-metrics');

// Advanced Validation Module
const {
  ValidationIssue,
  ArtifactReference,
  ConsistencyChecker,
  GapDetector,
  CompletenessChecker,
  DependencyValidator,
  ReferenceValidator,
  AdvancedValidator,
  ValidationType,
  Severity: ValidationSeverity,
  ArtifactType,
  createAdvancedValidator
} = require('./advanced-validation');

module.exports = {
  // Auto-Update
  ChangeDetector,
  SteeringUpdater,
  ProjectYmlSync,
  CustomSteeringRules,
  SteeringAutoUpdater,
  SteeringFileType,
  UpdateTrigger,
  createSteeringAutoUpdater,

  // Template Constraints
  Constraint,
  ChecklistItem,
  Checklist,
  UncertaintyParser,
  TemplateSection,
  TemplateDefinition,
  TemplateConstraintEngine,
  ConstraintType,
  UncertaintyMarker,
  ConstraintSeverity,
  createTemplateConstraintEngine,

  // Quality Metrics
  Metric,
  CoverageMetric,
  ComplianceMetric,
  HealthIndicator,
  TrendAnalyzer,
  QualityScoreCalculator,
  QualityMetricsDashboard,
  MetricCategory,
  HealthStatus,
  TrendDirection,
  createQualityDashboard,

  // Advanced Validation
  ValidationIssue,
  ArtifactReference,
  ConsistencyChecker,
  GapDetector,
  CompletenessChecker,
  DependencyValidator,
  ReferenceValidator,
  AdvancedValidator,
  ValidationType,
  ValidationSeverity,
  ArtifactType,
  createAdvancedValidator
};
