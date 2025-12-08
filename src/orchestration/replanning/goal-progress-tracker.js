/**
 * @fileoverview Goal Progress Tracker for MUSUBI Replanning Engine
 * Tracks progress toward goals and triggers replanning when needed
 * @module orchestration/replanning/goal-progress-tracker
 * @version 1.0.0
 */

'use strict';

const EventEmitter = require('events');

/**
 * Default configuration for GoalProgressTracker
 */
const DEFAULT_CONFIG = {
  // Enable goal tracking
  enabled: true,
  
  // Minimum progress rate (percentage per time unit)
  minProgressRate: 0.05,
  
  // Time window for progress rate calculation (ms)
  progressWindow: 60000,
  
  // Threshold for goal completion (0-1)
  completionThreshold: 1.0,
  
  // Enable sub-goal decomposition
  subGoalTracking: true,
  
  // Trigger replan if progress stalls
  triggerOnStall: true,
  
  // Stall detection threshold (no progress for N consecutive checks)
  stallThreshold: 3,
  
  // Progress check interval (ms)
  checkInterval: 10000,
  
  // Enable predictive analysis
  predictiveAnalysis: true,
  
  // Confidence threshold for goal predictions
  predictionConfidence: 0.7
};

/**
 * Goal definition
 */
class Goal {
  /**
   * Create a goal
   * @param {Object} data - Goal data
   */
  constructor(data = {}) {
    this.id = data.id || `goal-${Date.now()}`;
    this.name = data.name || 'Unnamed Goal';
    this.description = data.description || '';
    this.type = data.type || 'completion'; // 'completion', 'metric', 'milestone'
    this.target = data.target; // Target value for metric goals
    this.priority = data.priority || 1;
    this.deadline = data.deadline || null;
    this.subGoals = (data.subGoals || []).map(sg => new Goal(sg));
    this.dependencies = data.dependencies || [];
    this.metrics = data.metrics || [];
    this.status = data.status || 'pending'; // 'pending', 'in-progress', 'completed', 'failed', 'blocked'
    this.progress = data.progress || 0;
    this.startedAt = data.startedAt || null;
    this.completedAt = data.completedAt || null;
    this.metadata = data.metadata || {};
  }

  /**
   * Check if goal is complete
   * @returns {boolean} Whether complete
   */
  isComplete() {
    return this.status === 'completed' || this.progress >= 1.0;
  }

  /**
   * Check if goal has sub-goals
   * @returns {boolean} Whether has sub-goals
   */
  hasSubGoals() {
    return this.subGoals.length > 0;
  }

  /**
   * Calculate overall progress including sub-goals
   * @returns {number} Progress (0-1)
   */
  calculateProgress() {
    if (!this.hasSubGoals()) {
      return this.progress;
    }

    // Weighted average of sub-goal progress
    let totalWeight = 0;
    let weightedProgress = 0;

    for (const subGoal of this.subGoals) {
      const weight = subGoal.priority || 1;
      totalWeight += weight;
      weightedProgress += subGoal.calculateProgress() * weight;
    }

    return totalWeight > 0 ? weightedProgress / totalWeight : 0;
  }

  /**
   * Get estimated time to completion
   * @param {number} currentRate - Current progress rate
   * @returns {number|null} Estimated time in ms, null if unknown
   */
  getETA(currentRate) {
    if (currentRate <= 0) return null;
    const remaining = 1.0 - this.calculateProgress();
    return remaining / currentRate;
  }

  /**
   * Check if goal is at risk of missing deadline
   * @param {number} currentRate - Current progress rate
   * @returns {boolean} Whether at risk
   */
  isAtRisk(currentRate) {
    if (!this.deadline) return false;
    
    const eta = this.getETA(currentRate);
    if (eta === null) return true;
    
    const timeRemaining = this.deadline - Date.now();
    return eta > timeRemaining;
  }

  /**
   * Serialize goal to plain object
   * @returns {Object} Serialized goal
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      target: this.target,
      priority: this.priority,
      deadline: this.deadline,
      subGoals: this.subGoals.map(sg => sg.toJSON()),
      dependencies: this.dependencies,
      metrics: this.metrics,
      status: this.status,
      progress: this.progress,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      metadata: this.metadata
    };
  }
}

/**
 * Progress snapshot for trend analysis
 */
class ProgressSnapshot {
  constructor(goalId, progress, timestamp = Date.now()) {
    this.goalId = goalId;
    this.progress = progress;
    this.timestamp = timestamp;
  }
}

/**
 * Goal Progress Tracker
 * Monitors and tracks progress toward defined goals
 */
class GoalProgressTracker extends EventEmitter {
  /**
   * Create a goal progress tracker
   * @param {Object} [options={}] - Tracker options
   */
  constructor(options = {}) {
    super();
    
    this.config = { ...DEFAULT_CONFIG, ...options.config };
    
    // Goals registry
    this.goals = new Map();
    
    // Progress history for trend analysis
    this.progressHistory = new Map(); // goalId -> ProgressSnapshot[]
    
    // Stall counters
    this.stallCounters = new Map(); // goalId -> count
    
    // Task to goal mapping
    this.taskGoalMapping = new Map(); // taskId -> goalId[]
    
    // Check interval timer
    this.checkTimer = null;
    
    // State
    this.isTracking = false;
  }

  /**
   * Register a goal
   * @param {Object|Goal} goalData - Goal data or Goal instance
   * @returns {Goal} Registered goal
   */
  registerGoal(goalData) {
    const goal = goalData instanceof Goal ? goalData : new Goal(goalData);
    
    this.goals.set(goal.id, goal);
    this.progressHistory.set(goal.id, []);
    this.stallCounters.set(goal.id, 0);
    
    // Register sub-goals
    if (goal.hasSubGoals()) {
      for (const subGoal of goal.subGoals) {
        this.registerGoal(subGoal);
      }
    }
    
    this.emit('goal:registered', { goal });
    return goal;
  }

  /**
   * Register goals from a plan
   * @param {Object} plan - Execution plan
   * @returns {Goal[]} Registered goals
   */
  registerGoalsFromPlan(plan) {
    const goals = [];
    
    // Create main goal from plan
    const mainGoal = new Goal({
      id: `plan-${plan.id}`,
      name: plan.name || 'Plan Execution',
      description: plan.description || 'Execute all tasks in the plan',
      type: 'completion',
      subGoals: (plan.tasks || []).map((task, index) => ({
        id: `task-${task.id || index}`,
        name: task.name || task.skill,
        description: task.description || `Execute ${task.skill || task.name}`,
        type: 'completion',
        priority: task.priority || 1,
        metadata: { taskId: task.id }
      }))
    });
    
    this.registerGoal(mainGoal);
    goals.push(mainGoal);
    
    // Build task-goal mapping
    for (const task of (plan.tasks || [])) {
      const goalId = `task-${task.id}`;
      if (!this.taskGoalMapping.has(task.id)) {
        this.taskGoalMapping.set(task.id, []);
      }
      this.taskGoalMapping.get(task.id).push(goalId);
    }
    
    return goals;
  }

  /**
   * Map a task to goals
   * @param {string} taskId - Task ID
   * @param {string[]} goalIds - Goal IDs
   */
  mapTaskToGoals(taskId, goalIds) {
    this.taskGoalMapping.set(taskId, goalIds);
  }

  /**
   * Start tracking
   */
  startTracking() {
    if (this.isTracking) return;
    
    this.isTracking = true;
    
    if (this.config.checkInterval > 0) {
      this.checkTimer = setInterval(() => {
        this.performCheck();
      }, this.config.checkInterval);
    }
    
    this.emit('tracking:started');
  }

  /**
   * Stop tracking
   */
  stopTracking() {
    if (!this.isTracking) return;
    
    this.isTracking = false;
    
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    
    this.emit('tracking:stopped');
  }

  /**
   * Update progress for a goal
   * @param {string} goalId - Goal ID
   * @param {number} progress - New progress (0-1)
   * @param {Object} [metadata={}] - Additional metadata
   */
  updateProgress(goalId, progress, metadata = {}) {
    const goal = this.goals.get(goalId);
    if (!goal) return;
    
    const previousProgress = goal.progress;
    goal.progress = Math.max(0, Math.min(1, progress));
    
    // Update status
    if (goal.progress >= this.config.completionThreshold) {
      goal.status = 'completed';
      goal.completedAt = Date.now();
    } else if (goal.progress > 0 && goal.status === 'pending') {
      goal.status = 'in-progress';
      goal.startedAt = goal.startedAt || Date.now();
    }
    
    // Record snapshot
    this.recordSnapshot(goalId, goal.progress);
    
    // Check for stall
    if (progress === previousProgress) {
      const count = this.stallCounters.get(goalId) + 1;
      this.stallCounters.set(goalId, count);
    } else {
      this.stallCounters.set(goalId, 0);
    }
    
    // Emit progress event
    this.emit('progress:updated', {
      goalId,
      previousProgress,
      newProgress: goal.progress,
      delta: goal.progress - previousProgress,
      metadata
    });
    
    // Check for completion
    if (goal.status === 'completed') {
      this.emit('goal:completed', { goal });
    }
    
    // Update parent goals
    this.updateParentGoals(goalId);
  }

  /**
   * Update parent goals after child progress change
   * @param {string} childGoalId - Child goal ID
   */
  updateParentGoals(childGoalId) {
    for (const [, goal] of this.goals) {
      if (goal.subGoals.some(sg => sg.id === childGoalId)) {
        const newProgress = goal.calculateProgress();
        if (newProgress !== goal.progress) {
          this.updateProgress(goal.id, newProgress);
        }
      }
    }
  }

  /**
   * Mark a task as complete and update related goals
   * @param {string} taskId - Task ID
   * @param {Object} [result={}] - Task result
   */
  onTaskComplete(taskId, result = {}) {
    const goalIds = this.taskGoalMapping.get(taskId) || [];
    
    for (const goalId of goalIds) {
      this.updateProgress(goalId, 1.0, { taskResult: result });
    }
  }

  /**
   * Mark a task as failed
   * @param {string} taskId - Task ID
   * @param {Error} [error] - Error
   */
  onTaskFailed(taskId, error) {
    const goalIds = this.taskGoalMapping.get(taskId) || [];
    
    for (const goalId of goalIds) {
      const goal = this.goals.get(goalId);
      if (goal) {
        goal.status = 'failed';
        goal.metadata.error = error?.message;
        this.emit('goal:failed', { goal, error });
      }
    }
  }

  /**
   * Record a progress snapshot
   * @param {string} goalId - Goal ID
   * @param {number} progress - Progress value
   */
  recordSnapshot(goalId, progress) {
    const snapshots = this.progressHistory.get(goalId);
    if (!snapshots) return;
    
    snapshots.push(new ProgressSnapshot(goalId, progress));
    
    // Keep only snapshots within the progress window
    const cutoff = Date.now() - this.config.progressWindow * 2;
    while (snapshots.length > 0 && snapshots[0].timestamp < cutoff) {
      snapshots.shift();
    }
  }

  /**
   * Calculate current progress rate for a goal
   * @param {string} goalId - Goal ID
   * @returns {number} Progress rate (progress per ms)
   */
  calculateProgressRate(goalId) {
    const snapshots = this.progressHistory.get(goalId);
    if (!snapshots || snapshots.length < 2) return 0;
    
    const cutoff = Date.now() - this.config.progressWindow;
    const recent = snapshots.filter(s => s.timestamp >= cutoff);
    
    if (recent.length < 2) return 0;
    
    const first = recent[0];
    const last = recent[recent.length - 1];
    const progressDelta = last.progress - first.progress;
    const timeDelta = last.timestamp - first.timestamp;
    
    return timeDelta > 0 ? progressDelta / timeDelta : 0;
  }

  /**
   * Perform periodic check
   */
  performCheck() {
    for (const [goalId, goal] of this.goals) {
      if (goal.status === 'completed' || goal.status === 'failed') continue;
      
      const rate = this.calculateProgressRate(goalId);
      const stallCount = this.stallCounters.get(goalId);
      
      // Check for stall
      if (this.config.triggerOnStall && stallCount >= this.config.stallThreshold) {
        this.emit('goal:stalled', {
          goal,
          stallCount,
          currentProgress: goal.progress,
          progressRate: rate
        });
      }
      
      // Check progress rate
      if (rate < this.config.minProgressRate && goal.progress > 0 && goal.progress < 0.9) {
        this.emit('goal:slow-progress', {
          goal,
          currentRate: rate,
          minRate: this.config.minProgressRate
        });
      }
      
      // Check deadline risk
      if (goal.isAtRisk(rate)) {
        this.emit('goal:at-risk', {
          goal,
          eta: goal.getETA(rate),
          deadline: goal.deadline,
          currentProgress: goal.progress
        });
      }
    }
  }

  /**
   * Get goal status summary
   * @returns {Object} Status summary
   */
  getStatusSummary() {
    const summary = {
      total: this.goals.size,
      byStatus: {
        pending: 0,
        'in-progress': 0,
        completed: 0,
        failed: 0,
        blocked: 0
      },
      overallProgress: 0,
      atRiskCount: 0,
      stalledCount: 0
    };
    
    let totalProgress = 0;
    
    for (const [goalId, goal] of this.goals) {
      summary.byStatus[goal.status] = (summary.byStatus[goal.status] || 0) + 1;
      totalProgress += goal.calculateProgress();
      
      const rate = this.calculateProgressRate(goalId);
      if (goal.isAtRisk(rate)) summary.atRiskCount++;
      
      const stallCount = this.stallCounters.get(goalId);
      if (stallCount >= this.config.stallThreshold) summary.stalledCount++;
    }
    
    summary.overallProgress = this.goals.size > 0 
      ? totalProgress / this.goals.size 
      : 0;
    
    return summary;
  }

  /**
   * Get detailed goal report
   * @param {string} goalId - Goal ID
   * @returns {Object|null} Goal report
   */
  getGoalReport(goalId) {
    const goal = this.goals.get(goalId);
    if (!goal) return null;
    
    const rate = this.calculateProgressRate(goalId);
    const stallCount = this.stallCounters.get(goalId);
    const snapshots = this.progressHistory.get(goalId) || [];
    
    return {
      goal: goal.toJSON(),
      metrics: {
        currentProgress: goal.calculateProgress(),
        progressRate: rate,
        stallCount,
        eta: goal.getETA(rate),
        isAtRisk: goal.isAtRisk(rate),
        isStalled: stallCount >= this.config.stallThreshold
      },
      history: snapshots.slice(-20).map(s => ({
        progress: s.progress,
        timestamp: s.timestamp
      })),
      subGoalProgress: goal.subGoals.map(sg => ({
        id: sg.id,
        name: sg.name,
        progress: sg.calculateProgress(),
        status: sg.status
      }))
    };
  }

  /**
   * Predict goal completion
   * @param {string} goalId - Goal ID
   * @returns {Object} Prediction
   */
  predictCompletion(goalId) {
    const goal = this.goals.get(goalId);
    if (!goal) return null;
    
    const rate = this.calculateProgressRate(goalId);
    const currentProgress = goal.calculateProgress();
    
    if (rate <= 0) {
      return {
        willComplete: false,
        confidence: 0.5,
        reason: 'No positive progress rate detected'
      };
    }
    
    const remaining = 1.0 - currentProgress;
    const eta = remaining / rate;
    const predictedCompletion = Date.now() + eta;
    
    // Check deadline
    if (goal.deadline && predictedCompletion > goal.deadline) {
      return {
        willComplete: false,
        predictedCompletion,
        deadline: goal.deadline,
        confidence: this.config.predictionConfidence,
        reason: 'Current pace will miss deadline'
      };
    }
    
    return {
      willComplete: true,
      predictedCompletion,
      eta,
      confidence: this.calculatePredictionConfidence(goalId, rate),
      reason: 'On track for completion'
    };
  }

  /**
   * Calculate prediction confidence based on historical data
   * @param {string} goalId - Goal ID
   * @param {number} currentRate - Current progress rate
   * @returns {number} Confidence (0-1)
   */
  calculatePredictionConfidence(goalId, currentRate) {
    const snapshots = this.progressHistory.get(goalId) || [];
    
    if (snapshots.length < 5) return 0.5; // Low confidence with little data
    
    // Calculate variance in progress rate
    const rates = [];
    for (let i = 1; i < snapshots.length; i++) {
      const dt = snapshots[i].timestamp - snapshots[i-1].timestamp;
      const dp = snapshots[i].progress - snapshots[i-1].progress;
      if (dt > 0) rates.push(dp / dt);
    }
    
    if (rates.length < 2) return 0.5;
    
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    const variance = rates.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / rates.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower variance = higher confidence
    const coefficientOfVariation = mean !== 0 ? stdDev / Math.abs(mean) : 1;
    const confidence = Math.max(0.3, Math.min(0.95, 1 - coefficientOfVariation));
    
    return confidence;
  }

  /**
   * Get all goals
   * @returns {Goal[]} All goals
   */
  getAllGoals() {
    return Array.from(this.goals.values());
  }

  /**
   * Get goal by ID
   * @param {string} goalId - Goal ID
   * @returns {Goal|undefined} Goal
   */
  getGoal(goalId) {
    return this.goals.get(goalId);
  }

  /**
   * Reset tracker
   */
  reset() {
    this.stopTracking();
    this.goals.clear();
    this.progressHistory.clear();
    this.stallCounters.clear();
    this.taskGoalMapping.clear();
  }

  /**
   * Export tracker state
   * @returns {Object} Exported state
   */
  exportState() {
    return {
      goals: Array.from(this.goals.values()).map(g => g.toJSON()),
      progressHistory: Object.fromEntries(
        Array.from(this.progressHistory.entries()).map(([k, v]) => [
          k,
          v.map(s => ({ progress: s.progress, timestamp: s.timestamp }))
        ])
      ),
      stallCounters: Object.fromEntries(this.stallCounters),
      taskGoalMapping: Object.fromEntries(this.taskGoalMapping),
      summary: this.getStatusSummary()
    };
  }

  /**
   * Import tracker state
   * @param {Object} state - State to import
   */
  importState(state) {
    this.reset();
    
    if (state.goals) {
      for (const goalData of state.goals) {
        this.registerGoal(goalData);
      }
    }
    
    if (state.progressHistory) {
      for (const [goalId, snapshots] of Object.entries(state.progressHistory)) {
        this.progressHistory.set(
          goalId,
          snapshots.map(s => new ProgressSnapshot(goalId, s.progress, s.timestamp))
        );
      }
    }
    
    if (state.stallCounters) {
      for (const [goalId, count] of Object.entries(state.stallCounters)) {
        this.stallCounters.set(goalId, count);
      }
    }
    
    if (state.taskGoalMapping) {
      for (const [taskId, goalIds] of Object.entries(state.taskGoalMapping)) {
        this.taskGoalMapping.set(taskId, goalIds);
      }
    }
  }
}

module.exports = {
  GoalProgressTracker,
  Goal,
  ProgressSnapshot,
  DEFAULT_CONFIG
};
