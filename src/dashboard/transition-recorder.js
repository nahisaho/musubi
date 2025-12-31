/**
 * TransitionRecorder Implementation
 * 
 * Records stage transitions with timestamps and reviewers.
 * 
 * Requirement: IMP-6.2-003-02
 * Design: Section 4.2
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  storageDir: 'storage/transitions'
};

/**
 * TransitionRecorder
 * 
 * Records and manages workflow stage transitions.
 */
class TransitionRecorder {
  /**
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Record a stage transition
   * @param {string} featureId - Feature ID
   * @param {Object} transition - Transition data
   * @returns {Promise<Object>} Created transition record
   */
  async recordTransition(featureId, transition) {
    const history = await this.getHistory(featureId) || {
      featureId,
      transitions: [],
      createdAt: new Date().toISOString()
    };

    const record = {
      id: `TR-${Date.now()}`,
      fromStage: transition.fromStage,
      toStage: transition.toStage,
      status: transition.status || 'completed',
      reviewer: transition.reviewer || null,
      reviewResult: transition.reviewResult || null,
      artifacts: transition.artifacts || [],
      notes: transition.notes || null,
      timestamp: new Date().toISOString()
    };

    history.transitions.push(record);
    history.updatedAt = new Date().toISOString();

    await this.saveHistory(featureId, history);

    return record;
  }

  /**
   * Get transition history for feature
   * @param {string} featureId - Feature ID
   * @returns {Promise<Object|null>} Transition history
   */
  async getHistory(featureId) {
    try {
      const filePath = path.join(
        this.config.storageDir,
        `${featureId}-transitions.json`
      );
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Get last transition for feature
   * @param {string} featureId - Feature ID
   * @returns {Promise<Object|null>} Last transition record
   */
  async getLastTransition(featureId) {
    const history = await this.getHistory(featureId);
    if (!history || history.transitions.length === 0) {
      return null;
    }
    return history.transitions[history.transitions.length - 1];
  }

  /**
   * Get transitions to a specific stage
   * @param {string} featureId - Feature ID
   * @param {string} targetStage - Target stage
   * @returns {Promise<Array>} Transitions to stage
   */
  async getTransitionsByStage(featureId, targetStage) {
    const history = await this.getHistory(featureId);
    if (!history) {
      return [];
    }
    return history.transitions.filter(t => t.toStage === targetStage);
  }

  /**
   * Calculate average transition time between stages
   * @param {string} featureId - Feature ID
   * @returns {Promise<number>} Average time in milliseconds
   */
  async calculateAverageTransitionTime(featureId) {
    const history = await this.getHistory(featureId);
    if (!history || history.transitions.length < 2) {
      return 0;
    }

    const transitions = history.transitions;
    let totalTime = 0;
    let count = 0;

    for (let i = 1; i < transitions.length; i++) {
      const prev = new Date(transitions[i - 1].timestamp).getTime();
      const curr = new Date(transitions[i].timestamp).getTime();
      totalTime += curr - prev;
      count++;
    }

    return count > 0 ? Math.round(totalTime / count) : 0;
  }

  /**
   * Get transition statistics
   * @param {string} featureId - Feature ID
   * @returns {Promise<Object>} Transition statistics
   */
  async getTransitionStats(featureId) {
    const history = await this.getHistory(featureId);
    if (!history) {
      return {
        totalTransitions: 0,
        successfulTransitions: 0,
        failedTransitions: 0,
        averageTime: 0,
        stageTransitions: {}
      };
    }

    const transitions = history.transitions;
    const stageTransitions = {};

    let successful = 0;
    let failed = 0;

    for (const t of transitions) {
      if (t.status === 'completed') {
        successful++;
      } else if (t.status === 'failed' || t.status === 'rejected') {
        failed++;
      }

      const key = `${t.fromStage}->${t.toStage}`;
      stageTransitions[key] = (stageTransitions[key] || 0) + 1;
    }

    const averageTime = await this.calculateAverageTransitionTime(featureId);

    return {
      totalTransitions: transitions.length,
      successfulTransitions: successful,
      failedTransitions: failed,
      averageTime,
      stageTransitions
    };
  }

  /**
   * Save transition history
   * @param {string} featureId - Feature ID
   * @param {Object} history - History to save
   */
  async saveHistory(featureId, history) {
    await this.ensureStorageDir();
    
    const filePath = path.join(
      this.config.storageDir,
      `${featureId}-transitions.json`
    );

    await fs.writeFile(filePath, JSON.stringify(history, null, 2), 'utf-8');
  }

  /**
   * Ensure storage directory exists
   */
  async ensureStorageDir() {
    try {
      await fs.access(this.config.storageDir);
    } catch {
      await fs.mkdir(this.config.storageDir, { recursive: true });
    }
  }
}

module.exports = { TransitionRecorder };
