/**
 * MUSUBI Orchestration Module
 *
 * Multi-skill orchestration with ag2-inspired patterns:
 * - Auto: Automatic skill selection based on task
 * - Sequential: Linear skill execution
 * - Nested: Hierarchical skill delegation
 * - GroupChat: Multi-skill collaborative discussion
 * - Swarm: Parallel skill execution
 * - HumanInLoop: Validation gates
 * - Handoff: Explicit agent-to-agent delegation (OpenAI Agents SDK inspired)
 * - Triage: Request classification and routing (OpenAI Agents SDK inspired)
 */

const {
  OrchestrationEngine,
  ExecutionContext,
  PatternType,
  ExecutionStatus,
  Priority,
} = require('./orchestration-engine');

const {
  PatternRegistry,
  PatternMetadata,
  BasePattern,
  createDefaultRegistry,
} = require('./pattern-registry');

const {
  SequentialPattern,
  SequentialOptions,
  createSequentialPattern,
} = require('./patterns/sequential');

const { AutoPattern, ConfidenceLevel, createAutoPattern } = require('./patterns/auto');

const { NestedPattern, createNestedPattern } = require('./patterns/nested');

const {
  GroupChatPattern,
  DiscussionMode,
  ConsensusType,
  createGroupChatPattern,
} = require('./patterns/group-chat');

const {
  HumanInLoopPattern,
  GateType,
  GateResult,
  createHumanInLoopPattern,
} = require('./patterns/human-in-loop');

const { SwarmPattern, PLabel, SwarmStrategy, createSwarmPattern } = require('./patterns/swarm');

const {
  HandoffPattern,
  HandoffFilters,
  EscalationData,
  HandoffConfig,
  handoff,
  createHandoffPattern,
} = require('./patterns/handoff');

const {
  TriagePattern,
  TriageCategory,
  TriageStrategy,
  AgentCapability,
  TriageResult,
  DEFAULT_KEYWORD_MAPPINGS,
  createTriagePattern,
} = require('./patterns/triage');

const {
  WorkflowOrchestrator,
  StepType,
  WorkflowState,
  SDDWorkflowTemplates,
  createWorkflowOrchestrator,
} = require('./workflow-orchestrator');

const {
  ReplanningEngine,
  PlanMonitor,
  PlanEvaluator,
  AlternativeGenerator,
  ReplanHistory,
  ReplanTrigger,
  ReplanDecision,
  defaultReplanningConfig,
  mergeConfig: mergeReplanningConfig,
  validateConfig: validateReplanningConfig,
} = require('./replanning');

const {
  BaseGuardrail,
  GuardrailChain,
  GuardrailTripwireException,
  InputGuardrail,
  createInputGuardrail,
  OutputGuardrail,
  createOutputGuardrail,
  SecretPatterns,
  SafetyCheckGuardrail,
  createSafetyCheckGuardrail,
  SafetyLevel,
  ConstitutionalMapping,
  RuleType,
  SecurityPatterns,
  RuleBuilder,
  RuleRegistry,
  rules,
  CommonRuleSets,
  globalRuleRegistry,
} = require('./guardrails');

// Sprint 3.5: Advanced Workflows
const {
  WorkflowExecutor,
  WorkflowDefinition,
  ExecutionContext: WorkflowExecutionContext,
  StepResult,
  StepType: WorkflowStepType,
  ExecutionState,
  RecoveryStrategy,
} = require('./workflow-executor');

const {
  ErrorHandler,
  ErrorClassifier,
  ErrorAggregator,
  CircuitBreaker,
  GracefulDegradation,
  WorkflowError,
  ErrorSeverity,
  ErrorCategory,
  CircuitState,
} = require('./error-handler');

const {
  featureDevelopmentWorkflow,
  cicdPipelineWorkflow,
  codeReviewWorkflow,
  incidentResponseWorkflow,
  dataPipelineWorkflow,
  createWorkflowFromTemplate,
} = require('./workflow-examples');

// Sprint 3.1-3.3: Skill System Architecture
const { SkillRegistry, SkillDefinition, SkillHealth, SkillCategory } = require('./skill-registry');

const {
  SkillExecutor,
  ExecutionPriority,
  ParallelExecutor,
  ValidationError,
  GuardrailError,
} = require('./skill-executor');

const {
  AgentSkillBinding,
  AgentDefinition,
  BindingRecord,
  AgentStatus,
  CapabilityMatcher,
} = require('./agent-skill-binding');

const {
  MCPTransport,
  AdapterDirection,
  MCPToolDefinition,
  SchemaTranslator,
  MCPToSkillAdapter,
  SkillToMCPAdapter,
  MCPAdapterManager,
} = require('./mcp-tool-adapters');

// Built-in Skills (Phase 1-4 Features)
const {
  releaseSkill,
  workflowModeSkill,
  packageManagerSkill,
  constitutionLevelSkill,
  projectConfigSkill,
  registerBuiltInSkills,
  getBuiltInSkills,
} = require('./builtin-skills');

// Phase 4: Agent Loop & Agentic Features
const phase4 = require('../phase4-integration');
const {
  createIntegratedAgent,
  // Sprint 4.2: Codebase Intelligence
  RepositoryMap,
  ASTExtractor,
  ContextOptimizer,
  createRepositoryMap,
  createASTExtractor,
  createContextOptimizer,
  // Sprint 4.3: Agentic Reasoning
  ReasoningEngine,
  PlanningEngine,
  SelfCorrection,
  createReasoningEngine,
  createPlanningEngine,
  createSelfCorrection,
  // Sprint 4.4: Agentic Features
  CodeGenerator,
  CodeReviewer,
  createCodeGenerator,
  createCodeReviewer,
} = phase4;

// Phase 5: Advanced Features
const {
  Phase5Integration,
  createPhase5Integration,
  INTEGRATION_STATUS,
  // Sprint 5.1
  SteeringAutoUpdate,
  SteeringValidator,
  createSteeringAutoUpdate,
  createSteeringValidator,
  TRIGGER,
  STEERING_TYPE,
  SEVERITY,
  RULE_TYPE,
  // Sprint 5.2
  TemplateConstraints,
  ThinkingChecklist,
  createTemplateConstraints,
  createThinkingChecklist,
  CONSTRAINT_TYPE,
  UNCERTAINTY,
  MARKER_TYPE,
  // Sprint 5.3
  QualityDashboard,
  createQualityDashboard,
  METRIC_CATEGORY,
  HEALTH_STATUS,
  CONSTITUTIONAL_ARTICLES,
  // Sprint 5.4
  AdvancedValidation,
  createAdvancedValidation,
  VALIDATION_TYPE,
  ARTIFACT_TYPE,
  GAP_SEVERITY,
} = require('../phase5-integration');

/**
 * Create a fully configured orchestration engine
 * with default patterns registered
 *
 * @param {object} options - Engine options
 * @returns {OrchestrationEngine} Configured engine
 */
function createOrchestrationEngine(options = {}) {
  const engine = new OrchestrationEngine(options);
  const registry = createDefaultRegistry();

  // Register built-in patterns
  registry.register(PatternType.SEQUENTIAL, createSequentialPattern());
  registry.register(PatternType.AUTO, createAutoPattern());
  registry.register(PatternType.NESTED, createNestedPattern());
  registry.register(PatternType.GROUP_CHAT, createGroupChatPattern());
  registry.register(PatternType.HUMAN_IN_LOOP, createHumanInLoopPattern());
  registry.register(PatternType.SWARM, createSwarmPattern());
  registry.register(PatternType.HANDOFF, createHandoffPattern());
  registry.register(PatternType.TRIAGE, createTriagePattern());

  // Register patterns with engine
  registry.registerWithEngine(engine);

  return engine;
}

/**
 * Create an orchestration engine with custom patterns
 *
 * @param {object} options - Engine options
 * @param {object[]} patterns - Custom patterns to register
 * @returns {OrchestrationEngine} Configured engine
 */
function createCustomOrchestrationEngine(options = {}, patterns = []) {
  const engine = new OrchestrationEngine(options);

  // Register custom patterns
  for (const { name, pattern } of patterns) {
    engine.registerPattern(name, pattern);
  }

  return engine;
}

module.exports = {
  // Core engine
  OrchestrationEngine,
  ExecutionContext,
  createOrchestrationEngine,
  createCustomOrchestrationEngine,

  // Registry
  PatternRegistry,
  PatternMetadata,
  BasePattern,
  createDefaultRegistry,

  // Patterns
  SequentialPattern,
  SequentialOptions,
  createSequentialPattern,

  AutoPattern,
  ConfidenceLevel,
  createAutoPattern,

  NestedPattern,
  createNestedPattern,

  GroupChatPattern,
  DiscussionMode,
  ConsensusType,
  createGroupChatPattern,

  HumanInLoopPattern,
  GateType,
  GateResult,
  createHumanInLoopPattern,

  SwarmPattern,
  PLabel,
  SwarmStrategy,
  createSwarmPattern,

  HandoffPattern,
  HandoffFilters,
  EscalationData,
  HandoffConfig,
  handoff,
  createHandoffPattern,

  TriagePattern,
  TriageCategory,
  TriageStrategy,
  AgentCapability,
  TriageResult,
  DEFAULT_KEYWORD_MAPPINGS,
  createTriagePattern,

  // Workflow Orchestrator
  WorkflowOrchestrator,
  StepType,
  WorkflowState,
  SDDWorkflowTemplates,
  createWorkflowOrchestrator,

  // Replanning Engine
  ReplanningEngine,
  PlanMonitor,
  PlanEvaluator,
  AlternativeGenerator,
  ReplanHistory,
  ReplanTrigger,
  ReplanDecision,
  defaultReplanningConfig,
  mergeReplanningConfig,
  validateReplanningConfig,

  // Guardrails System
  BaseGuardrail,
  GuardrailChain,
  GuardrailTripwireException,
  InputGuardrail,
  createInputGuardrail,
  OutputGuardrail,
  createOutputGuardrail,
  SecretPatterns,
  SafetyCheckGuardrail,
  createSafetyCheckGuardrail,
  SafetyLevel,
  ConstitutionalMapping,
  RuleType,
  SecurityPatterns,
  RuleBuilder,
  RuleRegistry,
  rules,
  CommonRuleSets,
  globalRuleRegistry,

  // Constants
  PatternType,
  ExecutionStatus,
  Priority,

  // Workflow Executor (Sprint 3.5)
  WorkflowExecutor,
  WorkflowDefinition,
  WorkflowExecutionContext,
  StepResult,
  WorkflowStepType,
  ExecutionState,
  RecoveryStrategy,

  // Error Handler (Sprint 3.5)
  ErrorHandler,
  ErrorClassifier,
  ErrorAggregator,
  CircuitBreaker,
  GracefulDegradation,
  WorkflowError,
  ErrorSeverity,
  ErrorCategory,
  CircuitState,

  // Workflow Examples (Sprint 3.5)
  featureDevelopmentWorkflow,
  cicdPipelineWorkflow,
  codeReviewWorkflow,
  incidentResponseWorkflow,
  dataPipelineWorkflow,
  createWorkflowFromTemplate,

  // Skill Registry (Sprint 3.1)
  SkillRegistry,
  SkillDefinition,
  SkillHealth,
  SkillCategory,

  // Skill Executor (Sprint 3.2)
  SkillExecutor,
  ExecutionPriority,
  ParallelExecutor,
  ValidationError,
  GuardrailError,

  // Agent-Skill Binding (Sprint 3.3)
  AgentSkillBinding,
  AgentDefinition,
  BindingRecord,
  AgentStatus,
  CapabilityMatcher,

  // MCP Tool Adapters (Sprint 3.3.5)
  MCPTransport,
  AdapterDirection,
  MCPToolDefinition,
  SchemaTranslator,
  MCPToSkillAdapter,
  SkillToMCPAdapter,
  MCPAdapterManager,

  // Built-in Skills (Phase 1-4 Features)
  releaseSkill,
  workflowModeSkill,
  packageManagerSkill,
  constitutionLevelSkill,
  projectConfigSkill,
  registerBuiltInSkills,
  getBuiltInSkills,

  // Phase 4: Agent Loop & Agentic Features
  phase4,
  createIntegratedAgent,
  RepositoryMap,
  ASTExtractor,
  ContextOptimizer,
  createRepositoryMap,
  createASTExtractor,
  createContextOptimizer,
  ReasoningEngine,
  PlanningEngine,
  SelfCorrection,
  createReasoningEngine,
  createPlanningEngine,
  createSelfCorrection,
  CodeGenerator,
  CodeReviewer,
  createCodeGenerator,
  createCodeReviewer,

  // Phase 5: Advanced Features
  Phase5Integration,
  createPhase5Integration,
  INTEGRATION_STATUS,
  SteeringAutoUpdate,
  SteeringValidator,
  createSteeringAutoUpdate,
  createSteeringValidator,
  TRIGGER,
  STEERING_TYPE,
  SEVERITY,
  RULE_TYPE,
  TemplateConstraints,
  ThinkingChecklist,
  createTemplateConstraints,
  createThinkingChecklist,
  CONSTRAINT_TYPE,
  UNCERTAINTY,
  MARKER_TYPE,
  QualityDashboard,
  createQualityDashboard,
  METRIC_CATEGORY,
  HEALTH_STATUS,
  CONSTITUTIONAL_ARTICLES,
  AdvancedValidation,
  createAdvancedValidation,
  VALIDATION_TYPE,
  ARTIFACT_TYPE,
  GAP_SEVERITY,
};
