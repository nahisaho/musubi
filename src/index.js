/**
 * MUSUBI SDD - Main Export Module
 *
 * This file exports all public modules for use as a library.
 */

// Helper for optional requires
function tryRequire(modulePath) {
  try {
    return require(modulePath);
  } catch (e) {
    // Return null if module has missing optional dependencies
    return null;
  }
}

// Analyzers
const {
  LargeProjectAnalyzer,
  THRESHOLDS: LARGE_PROJECT_THRESHOLDS,
  CHUNK_SIZE,
} = require('./analyzers/large-project-analyzer');
const {
  ComplexityAnalyzer,
  THRESHOLDS: COMPLEXITY_THRESHOLDS,
} = require('./analyzers/complexity-analyzer');
const { AstExtractor } = require('./analyzers/ast-extractor');
const { GapDetector } = require('./analyzers/gap-detector');
const { ImpactAnalyzer } = require('./analyzers/impact-analyzer');
const { RepositoryMap } = require('./analyzers/repository-map');
const { SecurityAnalyzer } = require('./analyzers/security-analyzer');
const { StuckDetector } = require('./analyzers/stuck-detector');
const { createTraceabilityMatrix } = require('./analyzers/traceability');

// Generators
const {
  RustMigrationGenerator,
  UNSAFE_PATTERNS,
  SECURITY_COMPONENTS,
} = require('./generators/rust-migration-generator');
const { DesignGenerator } = require('./generators/design');
const { RequirementsGenerator } = require('./generators/requirements');
const { TaskGenerator } = require('./generators/tasks');

// Integrations (some have optional dependencies)
const codegraphModule = tryRequire('./integrations/codegraph-mcp');
const CodeGraphMCP = codegraphModule ? codegraphModule.CodeGraphMCP : null;

const { CICDIntegration } = require('./integrations/cicd');
const { GitHubClient } = require('./integrations/github-client');
const { MCPConnector } = require('./integrations/mcp-connector');

// Reporters
const { HierarchicalReporter } = require('./reporters/hierarchical-reporter');
const { CoverageReporter } = require('./reporters/coverage-report');
const { TraceabilityMatrixReporter } = require('./reporters/traceability-matrix-report');

// Validators
const { ConstitutionalValidator } = require('./validators/constitutional-validator');
const { Constitution } = require('./validators/constitution');
const { DeltaFormatValidator } = require('./validators/delta-format');
const { TraceabilityValidator } = require('./validators/traceability-validator');

// Orchestration
const { OrchestrationEngine } = require('./orchestration/orchestration-engine');
const { SkillExecutor } = require('./orchestration/skill-executor');
const { SkillRegistry } = require('./orchestration/skill-registry');
const { WorkflowOrchestrator } = require('./orchestration/workflow-orchestrator');

// Managers
const { AgentMemory } = require('./managers/agent-memory');
const { ChangeManager } = require('./managers/change');
const { CheckpointManager } = require('./managers/checkpoint-manager');
const { DeltaSpecManager } = require('./managers/delta-spec');
const { MemoryCondenser } = require('./managers/memory-condenser');
const { SkillLoader } = require('./managers/skill-loader');

// Monitoring
const { CostTracker } = require('./monitoring/cost-tracker');
const { IncidentManager } = require('./monitoring/incident-manager');
const { QualityDashboard } = require('./monitoring/quality-dashboard');
const { ReleaseManager } = require('./monitoring/release-manager');

// Steering
const { SteeringValidator } = require('./steering/steering-validator');
const { SteeringAutoUpdate } = require('./steering/steering-auto-update');

// Performance (Phase 6)
const performance = require('./performance');

module.exports = {
  // Analyzers
  LargeProjectAnalyzer,
  LARGE_PROJECT_THRESHOLDS,
  CHUNK_SIZE,
  ComplexityAnalyzer,
  COMPLEXITY_THRESHOLDS,
  AstExtractor,
  GapDetector,
  ImpactAnalyzer,
  RepositoryMap,
  SecurityAnalyzer,
  StuckDetector,
  createTraceabilityMatrix,

  // Generators
  RustMigrationGenerator,
  UNSAFE_PATTERNS,
  SECURITY_COMPONENTS,
  DesignGenerator,
  RequirementsGenerator,
  TaskGenerator,

  // Integrations
  CodeGraphMCP,
  CICDIntegration,
  GitHubClient,
  MCPConnector,

  // Reporters
  HierarchicalReporter,
  CoverageReporter,
  TraceabilityMatrixReporter,

  // Validators
  ConstitutionalValidator,
  Constitution,
  DeltaFormatValidator,
  TraceabilityValidator,

  // Orchestration
  OrchestrationEngine,
  SkillExecutor,
  SkillRegistry,
  WorkflowOrchestrator,

  // Managers
  AgentMemory,
  ChangeManager,
  CheckpointManager,
  DeltaSpecManager,
  MemoryCondenser,
  SkillLoader,

  // Monitoring
  CostTracker,
  IncidentManager,
  QualityDashboard,
  ReleaseManager,

  // Steering
  SteeringValidator,
  SteeringAutoUpdate,

  // Performance (Phase 6)
  performance,
};
