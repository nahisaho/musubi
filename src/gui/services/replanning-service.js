/**
 * @fileoverview Replanning Service for MUSUBI Web GUI
 * Provides replanning state management and monitoring
 * @module gui/services/replanning-service
 * @version 1.0.0
 */

'use strict';

const path = require('path');
const fs = require('fs').promises;
const EventEmitter = require('events');

/**
 * @typedef {Object} ReplanningState
 * @property {string} status - Current status: 'idle', 'monitoring', 'evaluating', 'replanning', 'optimizing'
 * @property {Object|null} currentPlan - Current execution plan
 * @property {Object|null} goalProgress - Goal progress information
 * @property {Object|null} pathOptimization - Path optimization status
 * @property {Object|null} lastReplan - Last replan event
 * @property {Array} history - Recent replan history
 * @property {Object} metrics - Current metrics
 */

/**
 * Replanning Service for Web GUI
 * Monitors and reports replanning state
 */
class ReplanningService extends EventEmitter {
  /**
   * Create a replanning service
   * @param {string} projectPath - Project path
   */
  constructor(projectPath) {
    super();
    this.projectPath = projectPath;
    this.storagePath = path.join(projectPath, 'storage', 'replanning');
    
    // In-memory state (will be populated from storage or engine)
    this.state = {
      status: 'idle',
      currentPlan: null,
      goalProgress: null,
      pathOptimization: null,
      lastReplan: null,
      history: [],
      metrics: {
        totalReplans: 0,
        successfulReplans: 0,
        averageConfidence: 0,
        goalCompletionRate: 0,
        optimizationsApplied: 0
      }
    };
  }

  /**
   * Initialize the service
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });
      await this.loadState();
    } catch (error) {
      console.error('Failed to initialize replanning service:', error);
    }
  }

  /**
   * Load state from storage
   * @returns {Promise<void>}
   */
  async loadState() {
    try {
      const stateFile = path.join(this.storagePath, 'state.json');
      const data = await fs.readFile(stateFile, 'utf-8');
      const savedState = JSON.parse(data);
      this.state = { ...this.state, ...savedState };
    } catch (error) {
      // No saved state, use defaults
    }

    // Load history
    await this.loadHistory();
  }

  /**
   * Save state to storage
   * @returns {Promise<void>}
   */
  async saveState() {
    try {
      const stateFile = path.join(this.storagePath, 'state.json');
      await fs.writeFile(stateFile, JSON.stringify(this.state, null, 2));
    } catch (error) {
      console.error('Failed to save replanning state:', error);
    }
  }

  /**
   * Load replan history
   * @returns {Promise<void>}
   */
  async loadHistory() {
    try {
      const historyDir = path.join(this.storagePath, 'history');
      await fs.mkdir(historyDir, { recursive: true });
      
      const files = await fs.readdir(historyDir);
      const jsonFiles = files.filter(f => f.endsWith('.json')).sort().reverse();
      
      this.state.history = [];
      for (const file of jsonFiles.slice(0, 50)) {
        try {
          const data = await fs.readFile(path.join(historyDir, file), 'utf-8');
          this.state.history.push(JSON.parse(data));
        } catch (e) {
          // Skip invalid files
        }
      }
    } catch (error) {
      // No history yet
    }
  }

  /**
   * Get current replanning state
   * @returns {Promise<ReplanningState>}
   */
  async getState() {
    await this.loadState();
    return this.state;
  }

  /**
   * Get goal progress
   * @returns {Promise<Object>}
   */
  async getGoalProgress() {
    try {
      const goalsFile = path.join(this.storagePath, 'goals.json');
      const data = await fs.readFile(goalsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return {
        goals: [],
        overallProgress: 0,
        activeGoals: 0,
        completedGoals: 0,
        milestones: []
      };
    }
  }

  /**
   * Get path optimization status
   * @returns {Promise<Object>}
   */
  async getPathOptimization() {
    try {
      const optimizationFile = path.join(this.storagePath, 'optimization.json');
      const data = await fs.readFile(optimizationFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return {
        status: 'idle',
        currentPath: null,
        optimizedPath: null,
        potentialSavings: 0,
        suggestions: []
      };
    }
  }

  /**
   * Get replan history
   * @param {number} [limit=20] - Maximum number of entries
   * @returns {Promise<Array>}
   */
  async getHistory(limit = 20) {
    await this.loadHistory();
    return this.state.history.slice(0, limit);
  }

  /**
   * Get replanning metrics
   * @returns {Promise<Object>}
   */
  async getMetrics() {
    try {
      const metricsFile = path.join(this.storagePath, 'metrics.json');
      const data = await fs.readFile(metricsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return this.state.metrics;
    }
  }

  /**
   * Update replanning state
   * @param {Partial<ReplanningState>} updates - State updates
   */
  async updateState(updates) {
    this.state = { ...this.state, ...updates };
    await this.saveState();
    this.emit('state:updated', this.state);
  }

  /**
   * Record a replan event
   * @param {Object} event - Replan event
   */
  async recordReplan(event) {
    const historyDir = path.join(this.storagePath, 'history');
    await fs.mkdir(historyDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `replan-${timestamp}.json`;
    
    const entry = {
      id: `replan-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...event
    };
    
    await fs.writeFile(path.join(historyDir, filename), JSON.stringify(entry, null, 2));
    
    this.state.history.unshift(entry);
    this.state.lastReplan = entry;
    this.state.metrics.totalReplans++;
    
    if (event.success) {
      this.state.metrics.successfulReplans++;
    }
    
    await this.saveState();
    this.emit('replan:recorded', entry);
  }

  /**
   * Get summary for dashboard
   * @returns {Promise<Object>}
   */
  async getSummary() {
    const [state, goalProgress, pathOptimization, metrics] = await Promise.all([
      this.getState(),
      this.getGoalProgress(),
      this.getPathOptimization(),
      this.getMetrics()
    ]);

    return {
      status: state.status,
      goalProgress: {
        overall: goalProgress.overallProgress || 0,
        active: goalProgress.activeGoals || 0,
        completed: goalProgress.completedGoals || 0
      },
      optimization: {
        status: pathOptimization.status,
        suggestions: pathOptimization.suggestions?.length || 0
      },
      metrics: {
        totalReplans: metrics.totalReplans || 0,
        successRate: metrics.totalReplans > 0 
          ? Math.round((metrics.successfulReplans / metrics.totalReplans) * 100) 
          : 100,
        optimizationsApplied: metrics.optimizationsApplied || 0
      },
      recentHistory: state.history.slice(0, 5)
    };
  }
}

module.exports = { ReplanningService };
