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
  Priority 
} = require('./orchestration-engine');

const { 
  PatternRegistry, 
  PatternMetadata, 
  BasePattern, 
  createDefaultRegistry 
} = require('./pattern-registry');

const { 
  SequentialPattern, 
  SequentialOptions, 
  createSequentialPattern 
} = require('./patterns/sequential');

const { 
  AutoPattern, 
  ConfidenceLevel, 
  createAutoPattern 
} = require('./patterns/auto');

const {
  NestedPattern,
  createNestedPattern
} = require('./patterns/nested');

const {
  GroupChatPattern,
  DiscussionMode,
  ConsensusType,
  createGroupChatPattern
} = require('./patterns/group-chat');

const {
  HumanInLoopPattern,
  GateType,
  GateResult,
  createHumanInLoopPattern
} = require('./patterns/human-in-loop');

const {
  SwarmPattern,
  PLabel,
  SwarmStrategy,
  createSwarmPattern
} = require('./patterns/swarm');

const {
  HandoffPattern,
  HandoffFilters,
  EscalationData,
  HandoffConfig,
  handoff,
  createHandoffPattern
} = require('./patterns/handoff');

const {
  TriagePattern,
  TriageCategory,
  TriageStrategy,
  AgentCapability,
  TriageResult,
  DEFAULT_KEYWORD_MAPPINGS,
  createTriagePattern
} = require('./patterns/triage');

const {
  WorkflowOrchestrator,
  StepType,
  WorkflowState,
  SDDWorkflowTemplates,
  createWorkflowOrchestrator
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
  validateConfig: validateReplanningConfig
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
  globalRuleRegistry
} = require('./guardrails');

// Sprint 3.5: Advanced Workflows
const {
  WorkflowExecutor,
  WorkflowDefinition,
  ExecutionContext: WorkflowExecutionContext,
  StepResult,
  StepType: WorkflowStepType,
  ExecutionState,
  RecoveryStrategy
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
  CircuitState
} = require('./error-handler');

const {
  featureDevelopmentWorkflow,
  cicdPipelineWorkflow,
  codeReviewWorkflow,
  incidentResponseWorkflow,
  dataPipelineWorkflow,
  createWorkflowFromTemplate
} = require('./workflow-examples');

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
  createWorkflowFromTemplate
};
