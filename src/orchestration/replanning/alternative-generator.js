/**
 * @fileoverview Alternative Generator for MUSUBI Replanning Engine
 * Generates alternative execution paths using LLM
 * @module orchestration/replanning/alternative-generator
 * @version 1.0.0
 */

'use strict';

/**
 * Alternative Generator - Creates alternative execution paths using LLM
 */
class AlternativeGenerator {
  /**
   * Create an alternative generator
   * @param {Object} llmProvider - LLM provider instance
   * @param {Object} [options={}] - Generator options
   */
  constructor(llmProvider, options = {}) {
    this.llm = llmProvider;
    this.config = options.config || {
      maxAlternatives: 3,
      minConfidence: 0.5,
      includeRetryOption: true,
      respectDependencies: true
    };
    this.contextAnalyzer = new ContextAnalyzer();
    this.confidenceScorer = new ConfidenceScorer(options.scorerConfig);
  }

  /**
   * Generate alternative execution paths for a failed task
   * @param {Object} failedTask - The task that failed
   * @param {Object} context - Execution context
   * @param {Object} [options={}] - Generation options
   * @returns {Promise<Alternative[]>} Ranked alternatives
   */
  async generateAlternatives(failedTask, context, _options = {}) {
    // Analyze context to understand the situation
    const analysis = await this.analyzeContext(failedTask, context);

    // Extract the goal from the failed task
    const goal = this.extractGoal(failedTask, context);

    // Generate prompt for LLM
    const prompt = this.buildPrompt(failedTask, context, analysis, goal);

    // Get alternatives from LLM
    const llmResponse = await this.llm.completeJSON(prompt, this.getResponseSchema());

    // Process and validate alternatives
    const alternatives = this.processLLMResponse(llmResponse, failedTask, context);

    // Add retry option if configured
    if (this.config.includeRetryOption) {
      alternatives.push(this.createRetryOption(failedTask));
    }

    // Score and rank alternatives
    const scoredAlternatives = await this.scoreAlternatives(alternatives, context);

    // Filter by minimum confidence
    const filtered = scoredAlternatives.filter(
      alt => alt.confidence >= this.config.minConfidence
    );

    // Limit to max alternatives
    const limited = filtered.slice(0, this.config.maxAlternatives);

    return limited;
  }

  /**
   * Analyze context for alternative generation
   * @param {Object} failedTask - Failed task
   * @param {Object} context - Execution context
   * @returns {Promise<ContextAnalysis>} Analysis result
   */
  async analyzeContext(failedTask, context) {
    return this.contextAnalyzer.analyze(failedTask, context);
  }

  /**
   * Extract the goal from a task
   * @param {Object} task - Task object
   * @param {Object} context - Execution context
   * @returns {string} Goal description
   */
  extractGoal(task, _context) {
    // Try to get goal from task metadata
    if (task.goal) return task.goal;
    if (task.description) return task.description;

    // Try to infer from skill name and parameters
    const skillName = task.skill || task.name;
    const params = task.parameters || {};

    let goal = `Execute ${skillName}`;
    if (params.feature) goal += ` for feature "${params.feature}"`;
    if (params.target) goal += ` on ${params.target}`;

    return goal;
  }

  /**
   * Build prompt for LLM
   * @param {Object} failedTask - Failed task
   * @param {Object} context - Execution context
   * @param {Object} analysis - Context analysis
   * @param {string} goal - Extracted goal
   * @returns {string} LLM prompt
   * @private
   */
  buildPrompt(failedTask, context, analysis, goal) {
    const errorInfo = failedTask.error 
      ? `Error: ${failedTask.error.message || failedTask.error}`
      : 'Unknown error';

    return `You are helping replan a failed task in a software development workflow.

## Failed Task
- Name: ${failedTask.name || failedTask.skill}
- Skill: ${failedTask.skill || 'unknown'}
- Goal: ${goal}
- ${errorInfo}

## Context
- Available Skills: ${analysis.availableSkills.join(', ')}
- Completed Tasks: ${analysis.completedTasks.length}
- Pending Tasks: ${analysis.pendingTasks.length}
- Dependencies: ${JSON.stringify(analysis.dependencies)}

## Constraints
- Respect dependencies: ${this.config.respectDependencies}
- Available resources: ${JSON.stringify(analysis.resources)}

## Instructions
Generate ${this.config.maxAlternatives} alternative approaches to achieve the goal.
Consider:
1. Different skills that could achieve the same goal
2. Breaking the task into smaller sub-tasks
3. Alternative parameters or configurations
4. Workarounds for the specific error

Provide your confidence (0.0-1.0) for each alternative based on likelihood of success.`;
  }

  /**
   * Get JSON schema for LLM response
   * @returns {Object} JSON schema
   * @private
   */
  getResponseSchema() {
    return {
      type: 'object',
      properties: {
        analysis: { type: 'string', description: 'Brief analysis of the failure' },
        goal: { type: 'string', description: 'Understood goal' },
        alternatives: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              description: { type: 'string' },
              task: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  skill: { type: 'string' },
                  parameters: { type: 'object' }
                }
              },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              reasoning: { type: 'string' },
              risks: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    };
  }

  /**
   * Process LLM response into alternatives
   * @param {Object} response - LLM response
   * @param {Object} failedTask - Original failed task
   * @param {Object} context - Execution context
   * @returns {Alternative[]} Processed alternatives
   * @private
   */
  processLLMResponse(response, failedTask, _context) {
    if (!response || !response.alternatives) {
      return [];
    }

    return response.alternatives.map((alt, index) => ({
      id: alt.id || `alt-${index + 1}`,
      description: alt.description,
      task: {
        id: `${failedTask.id || 'task'}-alt-${index + 1}`,
        name: alt.task?.name || failedTask.name,
        skill: alt.task?.skill || failedTask.skill,
        parameters: alt.task?.parameters || failedTask.parameters,
        originalTaskId: failedTask.id
      },
      confidence: alt.confidence || 0.5,
      llmConfidence: alt.confidence || 0.5,
      reasoning: alt.reasoning || '',
      risks: alt.risks || [],
      source: 'llm',
      analysisContext: response.analysis
    }));
  }

  /**
   * Create retry option for failed task
   * @param {Object} failedTask - Failed task
   * @returns {Alternative} Retry alternative
   * @private
   */
  createRetryOption(failedTask) {
    return {
      id: 'retry',
      description: 'Retry the original task',
      task: {
        ...failedTask,
        id: `${failedTask.id || 'task'}-retry`,
        retryOf: failedTask.id
      },
      confidence: 0.3, // Low initial confidence for retries
      llmConfidence: 0.3,
      reasoning: 'Retry the failed task - may succeed on transient errors',
      risks: ['May fail with same error', 'Time cost if error persists'],
      source: 'system'
    };
  }

  /**
   * Score and rank alternatives
   * @param {Alternative[]} alternatives - Alternatives to score
   * @param {Object} context - Execution context
   * @returns {Promise<Alternative[]>} Scored and ranked alternatives
   * @private
   */
  async scoreAlternatives(alternatives, context) {
    const scored = await Promise.all(
      alternatives.map(async (alt) => {
        const score = await this.confidenceScorer.score(alt, context);
        return {
          ...alt,
          confidence: score.overall,
          confidenceBreakdown: score
        };
      })
    );

    // Sort by confidence descending
    return scored.sort((a, b) => b.confidence - a.confidence);
  }
}

/**
 * Context Analyzer - Analyzes execution context for replanning
 */
class ContextAnalyzer {
  /**
   * Analyze execution context
   * @param {Object} failedTask - Failed task
   * @param {Object} context - Execution context
   * @returns {ContextAnalysis} Analysis result
   */
  analyze(failedTask, context) {
    const completedTasks = context.completed || [];
    const pendingTasks = context.pending || [];
    const availableSkills = this.extractAvailableSkills(context);
    const dependencies = this.extractDependencies(failedTask, context);
    const resources = this.extractResources(context);

    return {
      completedTasks,
      pendingTasks,
      availableSkills,
      dependencies,
      resources,
      failureContext: {
        error: failedTask.error,
        attemptCount: failedTask.attempts || 1,
        lastAttemptTime: failedTask.lastAttemptTime || Date.now()
      }
    };
  }

  /**
   * Extract available skills from context
   * @param {Object} context - Execution context
   * @returns {string[]} Available skill names
   * @private
   */
  extractAvailableSkills(context) {
    if (context.skills) return Object.keys(context.skills);
    if (context.registry) return context.registry.getSkillNames();
    return [
      'analyze', 'generate', 'validate', 'implement',
      'test', 'review', 'document', 'deploy'
    ];
  }

  /**
   * Extract dependencies for a task
   * @param {Object} task - Task object
   * @param {Object} context - Execution context
   * @returns {Object} Dependencies
   * @private
   */
  extractDependencies(task, context) {
    const taskDeps = task.dependencies || [];
    const completedIds = (context.completed || []).map(t => t.id);
    
    return {
      required: taskDeps,
      satisfied: taskDeps.filter(d => completedIds.includes(d)),
      unsatisfied: taskDeps.filter(d => !completedIds.includes(d))
    };
  }

  /**
   * Extract available resources
   * @param {Object} context - Execution context
   * @returns {Object} Resources
   * @private
   */
  extractResources(context) {
    return {
      concurrency: context.maxConcurrency || 5,
      timeRemaining: context.timeout 
        ? context.timeout - (Date.now() - (context.startTime || Date.now()))
        : null,
      memoryAvailable: true
    };
  }
}

/**
 * Confidence Scorer - Scores alternative confidence
 */
class ConfidenceScorer {
  /**
   * Create a confidence scorer
   * @param {Object} [config] - Scorer configuration
   */
  constructor(config = {}) {
    this.weights = {
      llm: config.llmWeight || 0.4,
      history: config.historyWeight || 0.3,
      resource: config.resourceWeight || 0.2,
      complexity: config.complexityWeight || 0.1
    };
    this.history = new Map();
  }

  /**
   * Score an alternative
   * @param {Alternative} alternative - Alternative to score
   * @param {Object} context - Execution context
   * @returns {Promise<ConfidenceScore>} Confidence score
   */
  async score(alternative, context) {
    // LLM self-assessment
    const llmScore = alternative.llmConfidence || 0.5;

    // Historical success rate
    const historyScore = this.getHistoricalScore(alternative.task.skill);

    // Resource availability
    const resourceScore = this.getResourceScore(alternative, context);

    // Complexity score
    const complexityScore = this.getComplexityScore(alternative);

    // Weighted combination
    const overall = 
      llmScore * this.weights.llm +
      historyScore * this.weights.history +
      resourceScore * this.weights.resource +
      complexityScore * this.weights.complexity;

    return {
      overall: Math.round(overall * 100) / 100,
      components: {
        llm: Math.round(llmScore * 100) / 100,
        history: Math.round(historyScore * 100) / 100,
        resource: Math.round(resourceScore * 100) / 100,
        complexity: Math.round(complexityScore * 100) / 100
      }
    };
  }

  /**
   * Get historical success score for a skill
   * @param {string} skillName - Skill name
   * @returns {number} Historical score (0-1)
   * @private
   */
  getHistoricalScore(skillName) {
    const data = this.history.get(skillName);
    if (!data) return 0.5; // Neutral score for unknown skills
    return data.successRate || 0.5;
  }

  /**
   * Get resource availability score
   * @param {Alternative} alternative - Alternative
   * @param {Object} context - Context
   * @returns {number} Resource score (0-1)
   * @private
   */
  getResourceScore(alternative, context) {
    let score = 1.0;
    
    // Check time constraints
    if (context.resources?.timeRemaining != null) {
      const estimatedTime = alternative.estimatedTime || 30000;
      if (estimatedTime > context.resources.timeRemaining) {
        score -= 0.5;
      }
    }

    // Check dependency satisfaction
    const deps = alternative.task.dependencies || [];
    const completedIds = new Set((context.completed || []).map(t => t.id));
    const unsatisfied = deps.filter(d => !completedIds.has(d));
    if (unsatisfied.length > 0) {
      score -= 0.3;
    }

    return Math.max(0, score);
  }

  /**
   * Get complexity score (inverse - lower complexity = higher score)
   * @param {Alternative} alternative - Alternative
   * @returns {number} Complexity score (0-1)
   * @private
   */
  getComplexityScore(alternative) {
    let complexity = 0;
    
    // More risks = lower score
    if (alternative.risks) {
      complexity += alternative.risks.length * 0.1;
    }
    
    // More parameters = slightly lower score
    const params = alternative.task.parameters || {};
    complexity += Object.keys(params).length * 0.02;

    return Math.max(0, 1 - complexity);
  }

  /**
   * Record execution result for history
   * @param {string} skillName - Skill name
   * @param {boolean} success - Whether execution succeeded
   */
  recordResult(skillName, success) {
    const data = this.history.get(skillName) || { total: 0, success: 0 };
    data.total++;
    if (success) data.success++;
    data.successRate = data.success / data.total;
    this.history.set(skillName, data);
  }
}

/**
 * @typedef {Object} Alternative
 * @property {string} id - Alternative identifier
 * @property {string} description - Alternative description
 * @property {Object} task - Task to execute
 * @property {number} confidence - Overall confidence (0-1)
 * @property {number} llmConfidence - LLM self-assessed confidence
 * @property {string} reasoning - Reasoning for this alternative
 * @property {string[]} risks - Potential risks
 * @property {string} source - Source of alternative ('llm', 'system')
 * @property {Object} [confidenceBreakdown] - Detailed confidence scores
 */

/**
 * @typedef {Object} ContextAnalysis
 * @property {Array} completedTasks - Completed tasks
 * @property {Array} pendingTasks - Pending tasks
 * @property {string[]} availableSkills - Available skill names
 * @property {Object} dependencies - Dependency information
 * @property {Object} resources - Available resources
 * @property {Object} failureContext - Failure details
 */

/**
 * @typedef {Object} ConfidenceScore
 * @property {number} overall - Overall confidence (0-1)
 * @property {Object} components - Component scores
 */

module.exports = { 
  AlternativeGenerator, 
  ContextAnalyzer, 
  ConfidenceScorer 
};
