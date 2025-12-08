/**
 * MUSUBI Orchestration Module
 * 
 * Multi-skill orchestration with ag2-inspired patterns:
 * - Auto: Automatic skill selection based on task
 * - Sequential: Linear skill execution
 * - Nested: Hierarchical skill delegation (coming soon)
 * - GroupChat: Multi-skill collaborative discussion (coming soon)
 * - Swarm: Parallel skill execution (coming soon)
 * - HumanInLoop: Validation gates (coming soon)
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

  // Constants
  PatternType,
  ExecutionStatus,
  Priority
};
