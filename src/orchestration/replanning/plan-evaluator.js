/**
 * @fileoverview Plan Evaluator for MUSUBI Replanning Engine
 * Evaluates plan progress and compares alternative paths
 * @module orchestration/replanning/plan-evaluator
 * @version 1.0.0
 */

'use strict';

/**
 * Plan Evaluator - Assesses plan progress and alternative efficiency
 */
class PlanEvaluator {
  /**
   * Create a plan evaluator
   * @param {Object} options - Evaluator options
   * @param {Object} [options.config] - Evaluation configuration
   * @param {Object} [options.historyStore] - Historical data store
   */
  constructor(options = {}) {
    this.config = options.config || {
      llmWeight: 0.4,
      historyWeight: 0.3,
      resourceWeight: 0.2,
      complexityWeight: 0.1
    };
    this.historyStore = options.historyStore || new Map();
    this.metrics = new Map();
  }

  /**
   * Evaluate current plan progress
   * @param {Object} plan - Current plan
   * @param {Object} currentState - Current execution state
   * @returns {PlanEvaluation} Evaluation result
   */
  evaluate(plan, currentState) {
    const completedTasks = currentState.completed || [];
    const pendingTasks = currentState.pending || [];
    const failedTasks = currentState.failed || [];
    const totalTasks = plan.tasks?.length || 0;

    // Calculate progress
    const progress = this.calculateProgress(completedTasks.length, totalTasks);

    // Calculate efficiency
    const efficiency = this.calculateEfficiency(currentState);

    // Estimate remaining effort
    const remaining = this.estimateRemaining(plan, currentState);

    // Calculate health score
    const health = this.calculateHealthScore({
      progress,
      efficiency,
      failureRate: totalTasks > 0 ? failedTasks.length / totalTasks : 0
    });

    const evaluation = {
      timestamp: Date.now(),
      planId: plan.id,
      progress: {
        percentage: progress,
        completed: completedTasks.length,
        pending: pendingTasks.length,
        failed: failedTasks.length,
        total: totalTasks
      },
      efficiency,
      remaining,
      health,
      recommendations: this.generateRecommendations({ progress, efficiency, health, failedTasks })
    };

    // Store metrics
    this.metrics.set(plan.id, evaluation);

    return evaluation;
  }

  /**
   * Calculate progress percentage
   * @param {number} completed - Number of completed tasks
   * @param {number} total - Total number of tasks
   * @returns {number} Progress percentage (0-100)
   */
  calculateProgress(completed, total) {
    if (total === 0) return 100;
    return Math.round((completed / total) * 100);
  }

  /**
   * Calculate execution efficiency
   * @param {Object} state - Current execution state
   * @returns {EfficiencyMetrics} Efficiency metrics
   */
  calculateEfficiency(state) {
    const startTime = state.startTime || Date.now();
    const elapsed = Date.now() - startTime;
    const completedTasks = state.completed || [];
    
    // Tasks per minute
    const tasksPerMinute = elapsed > 0 
      ? (completedTasks.length / (elapsed / 60000)) 
      : 0;

    // Average task duration
    const taskDurations = completedTasks
      .filter(t => t.duration)
      .map(t => t.duration);
    const avgDuration = taskDurations.length > 0
      ? taskDurations.reduce((a, b) => a + b, 0) / taskDurations.length
      : 0;

    // Retry ratio
    const retryCount = state.retries || 0;
    const retryRatio = completedTasks.length > 0
      ? retryCount / completedTasks.length
      : 0;

    return {
      tasksPerMinute: Math.round(tasksPerMinute * 100) / 100,
      avgTaskDuration: Math.round(avgDuration),
      retryRatio: Math.round(retryRatio * 100) / 100,
      elapsedTime: elapsed
    };
  }

  /**
   * Estimate remaining effort
   * @param {Object} plan - Current plan
   * @param {Object} currentState - Current execution state
   * @returns {RemainingEstimate} Remaining effort estimate
   */
  estimateRemaining(plan, currentState) {
    const pendingTasks = currentState.pending || [];
    const efficiency = this.calculateEfficiency(currentState);
    
    // Use average duration to estimate remaining time
    let estimatedTime = 0;
    if (efficiency.avgTaskDuration > 0 && pendingTasks.length > 0) {
      estimatedTime = efficiency.avgTaskDuration * pendingTasks.length;
    }

    // Calculate confidence in estimate
    const completedTasks = currentState.completed || [];
    const sampleSize = completedTasks.length;
    const confidence = Math.min(1, sampleSize / 5); // Full confidence after 5 tasks

    return {
      taskCount: pendingTasks.length,
      estimatedTime,
      estimatedTimeFormatted: this.formatDuration(estimatedTime),
      confidence: Math.round(confidence * 100) / 100
    };
  }

  /**
   * Compare efficiency of two paths
   * @param {Object} currentPath - Current execution path
   * @param {Object} alternativePath - Alternative path to compare
   * @returns {PathComparison} Comparison result
   */
  compareEfficiency(currentPath, alternativePath) {
    // Estimate current path remaining effort
    const currentRemaining = this.estimatePathEffort(currentPath);
    
    // Estimate alternative path effort
    const alternativeEffort = this.estimatePathEffort(alternativePath);

    // Calculate improvement
    const improvement = currentRemaining.estimatedTime > 0
      ? ((currentRemaining.estimatedTime - alternativeEffort.estimatedTime) / currentRemaining.estimatedTime) * 100
      : 0;

    // Factor in switching cost
    const switchingCost = this.estimateSwitchingCost(currentPath, alternativePath);

    return {
      currentPath: currentRemaining,
      alternativePath: alternativeEffort,
      improvement: Math.round(improvement * 100) / 100,
      switchingCost,
      netBenefit: improvement - switchingCost.percentage,
      recommendation: this.getPathRecommendation(improvement, switchingCost)
    };
  }

  /**
   * Estimate effort for a path
   * @param {Object} path - Execution path
   * @returns {PathEffort} Effort estimate
   * @private
   */
  estimatePathEffort(path) {
    const tasks = path.tasks || [];
    let totalEstimate = 0;
    
    for (const task of tasks) {
      const historicalData = this.getHistoricalData(task.skill || task.name);
      if (historicalData) {
        totalEstimate += historicalData.avgDuration;
      } else {
        // Default estimate based on complexity
        totalEstimate += this.estimateTaskComplexity(task) * 30000; // 30s per complexity unit
      }
    }

    return {
      taskCount: tasks.length,
      estimatedTime: totalEstimate,
      estimatedTimeFormatted: this.formatDuration(totalEstimate)
    };
  }

  /**
   * Estimate switching cost between paths
   * @param {Object} currentPath - Current path
   * @param {Object} alternativePath - Alternative path
   * @returns {SwitchingCost} Switching cost estimate
   * @private
   */
  estimateSwitchingCost(currentPath, alternativePath) {
    // Calculate overlap between paths
    const currentTaskIds = new Set((currentPath.tasks || []).map(t => t.id));
    const altTaskIds = new Set((alternativePath.tasks || []).map(t => t.id));
    
    const overlap = [...currentTaskIds].filter(id => altTaskIds.has(id)).length;
    const divergence = altTaskIds.size - overlap;
    
    // Switching cost increases with divergence
    const baseCost = divergence * 5000; // 5s per divergent task
    const contextCost = currentPath.contextSize ? currentPath.contextSize * 1000 : 0;
    
    const totalCost = baseCost + contextCost;
    const percentage = totalCost > 0 && alternativePath.estimatedTime
      ? (totalCost / alternativePath.estimatedTime) * 100
      : 0;

    return {
      time: totalCost,
      percentage: Math.round(percentage * 100) / 100,
      overlap,
      divergence
    };
  }

  /**
   * Get path recommendation
   * @param {number} improvement - Improvement percentage
   * @param {Object} switchingCost - Switching cost
   * @returns {string} Recommendation
   * @private
   */
  getPathRecommendation(improvement, switchingCost) {
    const netBenefit = improvement - switchingCost.percentage;
    
    if (netBenefit > 20) return 'strongly-recommended';
    if (netBenefit > 10) return 'recommended';
    if (netBenefit > 0) return 'marginally-better';
    if (netBenefit > -10) return 'equivalent';
    return 'not-recommended';
  }

  /**
   * Calculate health score
   * @param {Object} metrics - Health metrics
   * @returns {HealthScore} Health assessment
   * @private
   */
  calculateHealthScore(metrics) {
    const { progress, efficiency, failureRate } = metrics;
    
    // Calculate component scores
    const progressScore = progress / 100;
    const efficiencyScore = Math.min(1, efficiency.tasksPerMinute / 2); // Normalize to 2 tasks/min
    const reliabilityScore = 1 - Math.min(1, failureRate * 5); // 20% failure = 0 score
    
    // Weighted average
    const overall = (
      progressScore * 0.3 +
      efficiencyScore * 0.3 +
      reliabilityScore * 0.4
    );

    return {
      overall: Math.round(overall * 100) / 100,
      components: {
        progress: Math.round(progressScore * 100) / 100,
        efficiency: Math.round(efficiencyScore * 100) / 100,
        reliability: Math.round(reliabilityScore * 100) / 100
      },
      status: this.getHealthStatus(overall)
    };
  }

  /**
   * Get health status label
   * @param {number} score - Health score (0-1)
   * @returns {string} Status label
   * @private
   */
  getHealthStatus(score) {
    if (score >= 0.8) return 'healthy';
    if (score >= 0.6) return 'good';
    if (score >= 0.4) return 'degraded';
    if (score >= 0.2) return 'critical';
    return 'failed';
  }

  /**
   * Generate recommendations based on evaluation
   * @param {Object} data - Evaluation data
   * @returns {string[]} List of recommendations
   * @private
   */
  generateRecommendations(data) {
    const recommendations = [];
    const { progress, efficiency, health, failedTasks } = data;

    if (health.components?.reliability < 0.5) {
      recommendations.push('High failure rate detected. Consider reviewing failed task configurations.');
    }

    if (health.components?.efficiency < 0.3) {
      recommendations.push('Low efficiency detected. Consider parallelizing tasks or optimizing task parameters.');
    }

    if (failedTasks && failedTasks.length > 2) {
      recommendations.push(`${failedTasks.length} tasks failed. Replanning may be beneficial.`);
    }

    if (efficiency.retryRatio > 0.5) {
      recommendations.push('High retry ratio. Consider investigating root causes of failures.');
    }

    return recommendations;
  }

  /**
   * Estimate task complexity
   * @param {Object} task - Task object
   * @returns {number} Complexity score (1-5)
   * @private
   */
  estimateTaskComplexity(task) {
    let complexity = 1;
    
    if (task.dependencies?.length > 0) complexity += 0.5;
    if (task.parameters && Object.keys(task.parameters).length > 3) complexity += 0.5;
    if (task.skill?.includes('analysis') || task.skill?.includes('generate')) complexity += 1;
    if (task.retryable === false) complexity += 0.5;
    
    return Math.min(5, complexity);
  }

  /**
   * Get historical data for a skill
   * @param {string} skillName - Skill name
   * @returns {Object|null} Historical data
   * @private
   */
  getHistoricalData(skillName) {
    return this.historyStore.get(skillName) || null;
  }

  /**
   * Record task execution for historical data
   * @param {string} skillName - Skill name
   * @param {Object} result - Execution result
   */
  recordExecution(skillName, result) {
    const existing = this.historyStore.get(skillName) || {
      executions: 0,
      successCount: 0,
      totalDuration: 0
    };

    existing.executions++;
    if (result.success) existing.successCount++;
    if (result.duration) existing.totalDuration += result.duration;
    existing.avgDuration = existing.totalDuration / existing.executions;
    existing.successRate = existing.successCount / existing.executions;

    this.historyStore.set(skillName, existing);
  }

  /**
   * Format duration for display
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Formatted duration
   * @private
   */
  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${Math.round(ms / 3600000)}h`;
  }

  /**
   * Get stored metrics
   * @param {string} [planId] - Optional plan ID filter
   * @returns {Object} Metrics
   */
  getMetrics(planId) {
    if (planId) {
      return this.metrics.get(planId);
    }
    return Object.fromEntries(this.metrics);
  }

  /**
   * Clear stored metrics
   */
  clearMetrics() {
    this.metrics.clear();
  }
}

/**
 * @typedef {Object} PlanEvaluation
 * @property {number} timestamp - Evaluation timestamp
 * @property {string} planId - Plan identifier
 * @property {Object} progress - Progress metrics
 * @property {EfficiencyMetrics} efficiency - Efficiency metrics
 * @property {RemainingEstimate} remaining - Remaining effort estimate
 * @property {HealthScore} health - Health assessment
 * @property {string[]} recommendations - Recommendations
 */

/**
 * @typedef {Object} EfficiencyMetrics
 * @property {number} tasksPerMinute - Tasks completed per minute
 * @property {number} avgTaskDuration - Average task duration in ms
 * @property {number} retryRatio - Retry to completion ratio
 * @property {number} elapsedTime - Total elapsed time in ms
 */

/**
 * @typedef {Object} RemainingEstimate
 * @property {number} taskCount - Remaining task count
 * @property {number} estimatedTime - Estimated time in ms
 * @property {string} estimatedTimeFormatted - Formatted time string
 * @property {number} confidence - Estimate confidence (0-1)
 */

/**
 * @typedef {Object} HealthScore
 * @property {number} overall - Overall health score (0-1)
 * @property {Object} components - Component scores
 * @property {string} status - Status label
 */

module.exports = { PlanEvaluator };
