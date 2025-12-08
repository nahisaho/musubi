/**
 * @fileoverview Proactive Path Optimizer for MUSUBI Replanning Engine
 * Continuously evaluates and optimizes execution paths, even on success
 * @module orchestration/replanning/proactive-path-optimizer
 * @version 1.0.0
 */

'use strict';

const EventEmitter = require('events');

/**
 * Default configuration for ProactivePathOptimizer
 */
const DEFAULT_CONFIG = {
  // Enable proactive optimization
  enabled: true,
  
  // Evaluation frequency (every N successful tasks)
  evaluateEvery: 3,
  
  // Minimum improvement threshold to trigger re-routing (percentage)
  minImprovementThreshold: 0.15,
  
  // Maximum time to spend on optimization (ms)
  optimizationTimeout: 5000,
  
  // Consider parallel execution opportunities
  considerParallelization: true,
  
  // Consider task merging opportunities
  considerMerging: true,
  
  // Consider task reordering for better dependency resolution
  considerReordering: true,
  
  // Consider skipping optional tasks when ahead of schedule
  considerSkipping: false,
  
  // Learning from past executions
  learningEnabled: true,
  
  // Maximum optimization history to keep
  maxHistorySize: 100
};

/**
 * Path metrics for comparison
 */
class PathMetrics {
  constructor(data = {}) {
    this.estimatedTime = data.estimatedTime || 0;
    this.estimatedCost = data.estimatedCost || 0;
    this.parallelizationFactor = data.parallelizationFactor || 1.0;
    this.riskScore = data.riskScore || 0;
    this.dependencyComplexity = data.dependencyComplexity || 0;
    this.resourceUtilization = data.resourceUtilization || 0;
  }

  /**
   * Calculate overall score (lower is better)
   * @returns {number} Overall score
   */
  getScore() {
    return (
      this.estimatedTime * 0.4 +
      this.estimatedCost * 0.2 +
      (1 - this.parallelizationFactor) * 0.15 +
      this.riskScore * 0.15 +
      this.dependencyComplexity * 0.1
    );
  }

  /**
   * Compare with another metrics object
   * @param {PathMetrics} other - Other metrics
   * @returns {number} Improvement ratio (positive = better)
   */
  compareWith(other) {
    const thisScore = this.getScore();
    const otherScore = other.getScore();
    
    if (otherScore === 0) return 0;
    return (otherScore - thisScore) / otherScore;
  }
}

/**
 * Optimization opportunity
 */
class OptimizationOpportunity {
  constructor(data = {}) {
    this.type = data.type; // 'parallelize', 'merge', 'reorder', 'skip', 'substitute'
    this.description = data.description || '';
    this.affectedTasks = data.affectedTasks || [];
    this.estimatedImprovement = data.estimatedImprovement || 0;
    this.confidence = data.confidence || 0.5;
    this.newPath = data.newPath || null;
    this.reasoning = data.reasoning || '';
  }

  /**
   * Get weighted score for ranking
   * @returns {number} Weighted score
   */
  getWeightedScore() {
    return this.estimatedImprovement * this.confidence;
  }
}

/**
 * Proactive Path Optimizer
 * Continuously analyzes and optimizes execution paths
 */
class ProactivePathOptimizer extends EventEmitter {
  /**
   * Create a proactive path optimizer
   * @param {Object} llmProvider - LLM provider for intelligent optimization
   * @param {Object} [options={}] - Optimizer options
   */
  constructor(llmProvider, options = {}) {
    super();
    
    this.llm = llmProvider;
    this.config = { ...DEFAULT_CONFIG, ...options.config };
    
    // State
    this.successCount = 0;
    this.optimizationHistory = [];
    this.learningData = new Map(); // Task patterns -> performance data
    this.currentMetrics = null;
    
    // Analyzers
    this.parallelizationAnalyzer = new ParallelizationAnalyzer();
    this.mergingAnalyzer = new MergingAnalyzer();
    this.reorderingAnalyzer = new ReorderingAnalyzer();
  }

  /**
   * Notify optimizer of successful task completion
   * @param {Object} task - Completed task
   * @param {Object} context - Execution context
   * @param {Object} result - Task result
   * @returns {Promise<OptimizationResult|null>} Optimization result if triggered
   */
  async onTaskSuccess(task, context, result) {
    if (!this.config.enabled) return null;
    
    this.successCount++;
    
    // Record performance data for learning
    if (this.config.learningEnabled) {
      this.recordPerformance(task, result);
    }
    
    // Check if we should evaluate
    if (this.successCount % this.config.evaluateEvery !== 0) {
      return null;
    }
    
    // Perform proactive optimization
    return this.optimize(context);
  }

  /**
   * Perform proactive path optimization
   * @param {Object} context - Execution context
   * @returns {Promise<OptimizationResult>} Optimization result
   */
  async optimize(context) {
    const startTime = Date.now();
    
    // Calculate current path metrics
    this.currentMetrics = this.calculatePathMetrics(context);
    
    // Find optimization opportunities
    const opportunities = await this.findOpportunities(context);
    
    if (opportunities.length === 0) {
      return {
        optimized: false,
        reason: 'No optimization opportunities found',
        currentMetrics: this.currentMetrics
      };
    }
    
    // Rank opportunities
    const ranked = this.rankOpportunities(opportunities);
    const best = ranked[0];
    
    // Check if improvement meets threshold
    if (best.estimatedImprovement < this.config.minImprovementThreshold) {
      return {
        optimized: false,
        reason: `Best improvement (${(best.estimatedImprovement * 100).toFixed(1)}%) below threshold`,
        opportunities: ranked.slice(0, 3),
        currentMetrics: this.currentMetrics
      };
    }
    
    // Validate the optimization
    const validation = await this.validateOptimization(best, context);
    
    if (!validation.valid) {
      return {
        optimized: false,
        reason: validation.reason,
        opportunities: ranked.slice(0, 3),
        currentMetrics: this.currentMetrics
      };
    }
    
    // Record optimization
    this.recordOptimization(best, context);
    
    // Emit optimization event
    this.emit('optimization', {
      type: best.type,
      improvement: best.estimatedImprovement,
      affectedTasks: best.affectedTasks,
      newPath: best.newPath
    });
    
    return {
      optimized: true,
      optimization: best,
      newPath: best.newPath,
      estimatedImprovement: best.estimatedImprovement,
      newMetrics: this.calculatePathMetrics({ ...context, pending: best.newPath }),
      duration: Date.now() - startTime
    };
  }

  /**
   * Calculate metrics for current execution path
   * @param {Object} context - Execution context
   * @returns {PathMetrics} Path metrics
   */
  calculatePathMetrics(context) {
    const pending = context.pending || [];
    
    // Estimate total time
    let estimatedTime = 0;
    pending.forEach(task => {
      const historical = this.getHistoricalDuration(task);
      estimatedTime += historical || task.estimatedDuration || 30000;
    });
    
    // Calculate parallelization factor
    const parallelizable = this.countParallelizable(pending);
    const parallelizationFactor = pending.length > 0 
      ? parallelizable / pending.length 
      : 1.0;
    
    // Calculate risk score
    const riskScore = this.calculateRiskScore(pending, context);
    
    // Calculate dependency complexity
    const dependencyComplexity = this.calculateDependencyComplexity(pending);
    
    return new PathMetrics({
      estimatedTime,
      parallelizationFactor,
      riskScore,
      dependencyComplexity
    });
  }

  /**
   * Find optimization opportunities
   * @param {Object} context - Execution context
   * @returns {Promise<OptimizationOpportunity[]>} Found opportunities
   */
  async findOpportunities(context) {
    const opportunities = [];
    const pending = context.pending || [];
    
    if (pending.length < 2) return opportunities;
    
    // Check parallelization opportunities
    if (this.config.considerParallelization) {
      const parallelOps = this.parallelizationAnalyzer.analyze(pending, context);
      opportunities.push(...parallelOps);
    }
    
    // Check merging opportunities
    if (this.config.considerMerging) {
      const mergeOps = this.mergingAnalyzer.analyze(pending, context);
      opportunities.push(...mergeOps);
    }
    
    // Check reordering opportunities
    if (this.config.considerReordering) {
      const reorderOps = this.reorderingAnalyzer.analyze(pending, context);
      opportunities.push(...reorderOps);
    }
    
    // Use LLM for additional insights if available
    if (this.llm && pending.length >= 3) {
      const llmOps = await this.getLLMOptimizations(pending, context);
      opportunities.push(...llmOps);
    }
    
    return opportunities;
  }

  /**
   * Get LLM-based optimization suggestions
   * @param {Object[]} pending - Pending tasks
   * @param {Object} context - Execution context
   * @returns {Promise<OptimizationOpportunity[]>} LLM suggestions
   */
  async getLLMOptimizations(pending, context) {
    try {
      const prompt = this.buildOptimizationPrompt(pending, context);
      
      const response = await Promise.race([
        this.llm.completeJSON(prompt, this.getOptimizationSchema()),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), this.config.optimizationTimeout)
        )
      ]);
      
      return this.processLLMResponse(response, pending);
    } catch (error) {
      // LLM optimization is optional, don't fail on error
      return [];
    }
  }

  /**
   * Build optimization prompt for LLM
   * @param {Object[]} pending - Pending tasks
   * @param {Object} context - Execution context
   * @returns {string} Prompt
   */
  buildOptimizationPrompt(pending, context) {
    const completedSummary = (context.completed || []).map(t => ({
      name: t.name || t.skill,
      duration: t.duration
    }));
    
    const pendingSummary = pending.map(t => ({
      id: t.id,
      name: t.name || t.skill,
      dependencies: t.dependencies || [],
      estimatedDuration: t.estimatedDuration
    }));
    
    return `Analyze this execution plan and suggest optimizations:

COMPLETED TASKS:
${JSON.stringify(completedSummary, null, 2)}

PENDING TASKS:
${JSON.stringify(pendingSummary, null, 2)}

Consider:
1. Tasks that can run in parallel (no dependencies between them)
2. Tasks that could be merged into one
3. Better ordering based on dependencies
4. Tasks that could be skipped or simplified

Return optimization suggestions with estimated improvement percentages.`;
  }

  /**
   * Get JSON schema for LLM response
   * @returns {Object} JSON schema
   */
  getOptimizationSchema() {
    return {
      type: 'object',
      properties: {
        optimizations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['parallelize', 'merge', 'reorder', 'skip', 'substitute'] },
              description: { type: 'string' },
              affectedTaskIds: { type: 'array', items: { type: 'string' } },
              estimatedImprovement: { type: 'number' },
              newOrder: { type: 'array', items: { type: 'string' } },
              reasoning: { type: 'string' }
            }
          }
        }
      }
    };
  }

  /**
   * Process LLM response into optimization opportunities
   * @param {Object} response - LLM response
   * @param {Object[]} pending - Pending tasks
   * @returns {OptimizationOpportunity[]} Processed opportunities
   */
  processLLMResponse(response, pending) {
    if (!response || !response.optimizations) return [];
    
    return response.optimizations.map(opt => {
      const affectedTasks = (opt.affectedTaskIds || [])
        .map(id => pending.find(t => t.id === id))
        .filter(Boolean);
      
      let newPath = null;
      if (opt.newOrder) {
        newPath = opt.newOrder
          .map(id => pending.find(t => t.id === id))
          .filter(Boolean);
        
        // Add any tasks not in newOrder at the end
        const inOrder = new Set(opt.newOrder);
        pending.forEach(t => {
          if (!inOrder.has(t.id)) {
            newPath.push(t);
          }
        });
      }
      
      return new OptimizationOpportunity({
        type: opt.type,
        description: opt.description,
        affectedTasks,
        estimatedImprovement: opt.estimatedImprovement || 0.1,
        confidence: 0.6, // LLM suggestions get moderate confidence
        newPath,
        reasoning: opt.reasoning
      });
    });
  }

  /**
   * Rank opportunities by weighted score
   * @param {OptimizationOpportunity[]} opportunities - Opportunities
   * @returns {OptimizationOpportunity[]} Ranked opportunities
   */
  rankOpportunities(opportunities) {
    return [...opportunities].sort((a, b) => 
      b.getWeightedScore() - a.getWeightedScore()
    );
  }

  /**
   * Validate an optimization before applying
   * @param {OptimizationOpportunity} optimization - Optimization to validate
   * @param {Object} context - Execution context
   * @returns {Promise<{valid: boolean, reason?: string}>} Validation result
   */
  async validateOptimization(optimization, context) {
    // Check dependency constraints
    if (optimization.newPath) {
      const valid = this.validateDependencies(optimization.newPath);
      if (!valid) {
        return { valid: false, reason: 'New path violates dependency constraints' };
      }
    }
    
    // Check resource constraints
    if (optimization.type === 'parallelize') {
      const canParallelize = this.checkResourceCapacity(
        optimization.affectedTasks.length
      );
      if (!canParallelize) {
        return { valid: false, reason: 'Insufficient resources for parallelization' };
      }
    }
    
    return { valid: true };
  }

  /**
   * Validate dependencies in a path
   * @param {Object[]} path - Task path
   * @returns {boolean} Whether dependencies are satisfied
   */
  validateDependencies(path) {
    const completed = new Set();
    
    for (const task of path) {
      const deps = task.dependencies || [];
      for (const dep of deps) {
        if (!completed.has(dep)) {
          // Check if dependency is in remaining path
          const depIndex = path.findIndex(t => t.id === dep);
          const taskIndex = path.indexOf(task);
          if (depIndex === -1 || depIndex > taskIndex) {
            return false;
          }
        }
      }
      completed.add(task.id);
    }
    
    return true;
  }

  /**
   * Check if resources allow parallelization
   * @param {number} parallelCount - Number of parallel tasks
   * @returns {boolean} Whether resources are available
   */
  checkResourceCapacity(parallelCount) {
    // Default implementation assumes we can handle up to 4 parallel tasks
    return parallelCount <= 4;
  }

  /**
   * Record performance data for learning
   * @param {Object} task - Completed task
   * @param {Object} result - Task result
   */
  recordPerformance(task, result) {
    const key = task.skill || task.name;
    
    if (!this.learningData.has(key)) {
      this.learningData.set(key, {
        durations: [],
        successRate: 0,
        totalCount: 0
      });
    }
    
    const data = this.learningData.get(key);
    data.durations.push(result.duration || 0);
    data.totalCount++;
    data.successRate = (data.successRate * (data.totalCount - 1) + 1) / data.totalCount;
    
    // Keep only last 50 durations
    if (data.durations.length > 50) {
      data.durations.shift();
    }
  }

  /**
   * Get historical duration for a task type
   * @param {Object} task - Task
   * @returns {number|null} Historical average duration or null
   */
  getHistoricalDuration(task) {
    const key = task.skill || task.name;
    const data = this.learningData.get(key);
    
    if (!data || data.durations.length === 0) return null;
    
    return data.durations.reduce((a, b) => a + b, 0) / data.durations.length;
  }

  /**
   * Count parallelizable tasks
   * @param {Object[]} tasks - Tasks
   * @returns {number} Count of parallelizable tasks
   */
  countParallelizable(tasks) {
    let count = 0;
    const completed = new Set();
    
    for (const task of tasks) {
      const deps = task.dependencies || [];
      if (deps.length === 0 || deps.every(d => completed.has(d))) {
        count++;
      }
      completed.add(task.id);
    }
    
    return count;
  }

  /**
   * Calculate risk score for pending tasks
   * @param {Object[]} pending - Pending tasks
   * @param {Object} context - Execution context
   * @returns {number} Risk score (0-1)
   */
  calculateRiskScore(pending, context) {
    if (pending.length === 0) return 0;
    
    let riskSum = 0;
    
    for (const task of pending) {
      const key = task.skill || task.name;
      const data = this.learningData.get(key);
      
      if (data) {
        // Use failure rate as risk indicator
        riskSum += (1 - data.successRate);
      } else {
        // Unknown tasks get moderate risk
        riskSum += 0.3;
      }
    }
    
    return riskSum / pending.length;
  }

  /**
   * Calculate dependency complexity
   * @param {Object[]} tasks - Tasks
   * @returns {number} Complexity score (0-1)
   */
  calculateDependencyComplexity(tasks) {
    if (tasks.length === 0) return 0;
    
    let totalDeps = 0;
    let maxDeps = 0;
    
    for (const task of tasks) {
      const deps = (task.dependencies || []).length;
      totalDeps += deps;
      maxDeps = Math.max(maxDeps, deps);
    }
    
    // Normalize: average deps / max possible deps
    const avgDeps = totalDeps / tasks.length;
    const normalized = Math.min(avgDeps / 5, 1); // Assume 5+ deps is max complexity
    
    return normalized;
  }

  /**
   * Record optimization for history
   * @param {OptimizationOpportunity} optimization - Applied optimization
   * @param {Object} context - Execution context
   */
  recordOptimization(optimization, context) {
    this.optimizationHistory.push({
      timestamp: Date.now(),
      type: optimization.type,
      improvement: optimization.estimatedImprovement,
      tasksAffected: optimization.affectedTasks.length,
      contextSnapshot: {
        completedCount: context.completed?.length || 0,
        pendingCount: context.pending?.length || 0
      }
    });
    
    // Limit history size
    while (this.optimizationHistory.length > this.config.maxHistorySize) {
      this.optimizationHistory.shift();
    }
  }

  /**
   * Get optimization statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    const history = this.optimizationHistory;
    
    if (history.length === 0) {
      return {
        totalOptimizations: 0,
        averageImprovement: 0,
        byType: {}
      };
    }
    
    const byType = {};
    let totalImprovement = 0;
    
    for (const opt of history) {
      byType[opt.type] = (byType[opt.type] || 0) + 1;
      totalImprovement += opt.improvement;
    }
    
    return {
      totalOptimizations: history.length,
      averageImprovement: totalImprovement / history.length,
      byType,
      learningDataSize: this.learningData.size
    };
  }

  /**
   * Reset optimizer state
   */
  reset() {
    this.successCount = 0;
    this.currentMetrics = null;
  }

  /**
   * Clear all learning data
   */
  clearLearningData() {
    this.learningData.clear();
    this.optimizationHistory = [];
  }
}

/**
 * Parallelization Analyzer
 * Finds opportunities to run tasks in parallel
 */
class ParallelizationAnalyzer {
  /**
   * Analyze tasks for parallelization opportunities
   * @param {Object[]} tasks - Tasks
   * @param {Object} context - Context
   * @returns {OptimizationOpportunity[]} Opportunities
   */
  analyze(tasks, context) {
    const opportunities = [];
    const groups = this.findParallelGroups(tasks);
    
    for (const group of groups) {
      if (group.length >= 2) {
        const sequentialTime = group.reduce((sum, t) => 
          sum + (t.estimatedDuration || 30000), 0
        );
        const parallelTime = Math.max(...group.map(t => 
          t.estimatedDuration || 30000
        ));
        const improvement = (sequentialTime - parallelTime) / sequentialTime;
        
        if (improvement > 0.1) {
          opportunities.push(new OptimizationOpportunity({
            type: 'parallelize',
            description: `Run ${group.length} tasks in parallel`,
            affectedTasks: group,
            estimatedImprovement: improvement,
            confidence: 0.8,
            reasoning: 'Tasks have no interdependencies'
          }));
        }
      }
    }
    
    return opportunities;
  }

  /**
   * Find groups of tasks that can run in parallel
   * @param {Object[]} tasks - Tasks
   * @returns {Object[][]} Groups
   */
  findParallelGroups(tasks) {
    const groups = [];
    const used = new Set();
    const completed = new Set();
    
    for (let i = 0; i < tasks.length; i++) {
      if (used.has(i)) continue;
      
      const task = tasks[i];
      const deps = task.dependencies || [];
      
      // Check if dependencies are satisfied
      if (!deps.every(d => completed.has(d))) continue;
      
      // Find other tasks that can run in parallel
      const group = [task];
      used.add(i);
      
      for (let j = i + 1; j < tasks.length; j++) {
        if (used.has(j)) continue;
        
        const other = tasks[j];
        const otherDeps = other.dependencies || [];
        
        // Can run in parallel if:
        // 1. Its dependencies are satisfied
        // 2. It doesn't depend on any task in the current group
        if (otherDeps.every(d => completed.has(d)) &&
            !otherDeps.some(d => group.some(g => g.id === d))) {
          group.push(other);
          used.add(j);
        }
      }
      
      groups.push(group);
      group.forEach(t => completed.add(t.id));
    }
    
    return groups;
  }
}

/**
 * Merging Analyzer
 * Finds opportunities to merge similar tasks
 */
class MergingAnalyzer {
  /**
   * Analyze tasks for merging opportunities
   * @param {Object[]} tasks - Tasks
   * @param {Object} context - Context
   * @returns {OptimizationOpportunity[]} Opportunities
   */
  analyze(tasks, context) {
    const opportunities = [];
    const groups = this.findMergeableGroups(tasks);
    
    for (const group of groups) {
      if (group.length >= 2) {
        const overhead = 5000; // Assumed overhead per task
        const savingsTime = overhead * (group.length - 1);
        const totalTime = group.reduce((sum, t) => 
          sum + (t.estimatedDuration || 30000), 0
        );
        const improvement = savingsTime / totalTime;
        
        if (improvement > 0.05) {
          opportunities.push(new OptimizationOpportunity({
            type: 'merge',
            description: `Merge ${group.length} similar ${group[0].skill || group[0].name} tasks`,
            affectedTasks: group,
            estimatedImprovement: improvement,
            confidence: 0.7,
            reasoning: 'Tasks operate on similar targets'
          }));
        }
      }
    }
    
    return opportunities;
  }

  /**
   * Find groups of tasks that could be merged
   * @param {Object[]} tasks - Tasks
   * @returns {Object[][]} Mergeable groups
   */
  findMergeableGroups(tasks) {
    const bySkill = new Map();
    
    for (const task of tasks) {
      const skill = task.skill || task.name;
      if (!bySkill.has(skill)) {
        bySkill.set(skill, []);
      }
      bySkill.get(skill).push(task);
    }
    
    // Return groups with 2+ tasks of the same skill
    return Array.from(bySkill.values()).filter(g => g.length >= 2);
  }
}

/**
 * Reordering Analyzer
 * Finds better task orderings based on dependencies
 */
class ReorderingAnalyzer {
  /**
   * Analyze tasks for reordering opportunities
   * @param {Object[]} tasks - Tasks
   * @param {Object} context - Context
   * @returns {OptimizationOpportunity[]} Opportunities
   */
  analyze(tasks, context) {
    const opportunities = [];
    
    // Check for dependency-based improvements
    const optimalOrder = this.topologicalSort(tasks);
    
    if (!this.arraysEqual(tasks, optimalOrder)) {
      const improvement = this.estimateReorderImprovement(tasks, optimalOrder);
      
      if (improvement > 0.05) {
        opportunities.push(new OptimizationOpportunity({
          type: 'reorder',
          description: 'Optimize task order for better dependency resolution',
          affectedTasks: tasks,
          estimatedImprovement: improvement,
          confidence: 0.9,
          newPath: optimalOrder,
          reasoning: 'Current order causes unnecessary waiting'
        }));
      }
    }
    
    return opportunities;
  }

  /**
   * Topological sort of tasks based on dependencies
   * @param {Object[]} tasks - Tasks
   * @returns {Object[]} Sorted tasks
   */
  topologicalSort(tasks) {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const inDegree = new Map();
    const result = [];
    
    // Initialize in-degrees
    for (const task of tasks) {
      inDegree.set(task.id, 0);
    }
    
    // Calculate in-degrees
    for (const task of tasks) {
      for (const dep of (task.dependencies || [])) {
        if (taskMap.has(dep)) {
          inDegree.set(task.id, inDegree.get(task.id) + 1);
        }
      }
    }
    
    // Queue tasks with no dependencies
    const queue = tasks.filter(t => inDegree.get(t.id) === 0);
    
    while (queue.length > 0) {
      const task = queue.shift();
      result.push(task);
      
      // Reduce in-degree for dependent tasks
      for (const other of tasks) {
        if ((other.dependencies || []).includes(task.id)) {
          const newDegree = inDegree.get(other.id) - 1;
          inDegree.set(other.id, newDegree);
          if (newDegree === 0) {
            queue.push(other);
          }
        }
      }
    }
    
    // Add remaining tasks (circular dependencies)
    for (const task of tasks) {
      if (!result.includes(task)) {
        result.push(task);
      }
    }
    
    return result;
  }

  /**
   * Check if two arrays have same elements in same order
   * @param {Object[]} a - First array
   * @param {Object[]} b - Second array
   * @returns {boolean} Whether equal
   */
  arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i].id !== b[i].id) return false;
    }
    return true;
  }

  /**
   * Estimate improvement from reordering
   * @param {Object[]} current - Current order
   * @param {Object[]} optimal - Optimal order
   * @returns {number} Estimated improvement (0-1)
   */
  estimateReorderImprovement(current, optimal) {
    // Simple heuristic: count how many tasks are out of place
    let outOfPlace = 0;
    for (let i = 0; i < current.length; i++) {
      if (current[i].id !== optimal[i].id) {
        outOfPlace++;
      }
    }
    
    // More out of place = more potential improvement
    return (outOfPlace / current.length) * 0.3;
  }
}

module.exports = {
  ProactivePathOptimizer,
  PathMetrics,
  OptimizationOpportunity,
  ParallelizationAnalyzer,
  MergingAnalyzer,
  ReorderingAnalyzer,
  DEFAULT_CONFIG
};
