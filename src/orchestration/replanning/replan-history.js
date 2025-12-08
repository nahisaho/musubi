/**
 * @fileoverview Replan History for MUSUBI Replanning Engine
 * Tracks replanning events for audit and learning
 * @module orchestration/replanning/replan-history
 * @version 1.0.0
 */

'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * Replan History - Tracks and persists replanning events
 */
class ReplanHistory {
  /**
   * Create a replan history tracker
   * @param {Object} [options={}] - History options
   */
  constructor(options = {}) {
    this.config = {
      enabled: true,
      maxEvents: 1000,
      persist: false,
      filePath: 'storage/replanning-history.json',
      ...options.config
    };
    this.events = [];
    this.snapshots = new Map();
    this.metrics = {
      totalReplans: 0,
      successfulReplans: 0,
      failedReplans: 0,
      byTrigger: {},
      byDecision: {}
    };
  }

  /**
   * Record a replanning event
   * @param {ReplanEvent} event - Event to record
   */
  record(event) {
    if (!this.config.enabled) return;

    const enrichedEvent = {
      ...event,
      id: event.id || this.generateEventId(),
      timestamp: event.timestamp || Date.now(),
      version: 1
    };

    // Add to events list
    this.events.push(enrichedEvent);

    // Trim if over max
    if (this.events.length > this.config.maxEvents) {
      this.events = this.events.slice(-this.config.maxEvents);
    }

    // Update metrics
    this.updateMetrics(enrichedEvent);

    // Persist if configured
    if (this.config.persist) {
      this.persistAsync();
    }

    return enrichedEvent;
  }

  /**
   * Record a plan snapshot
   * @param {string} planId - Plan identifier
   * @param {Object} plan - Plan state
   * @param {string} reason - Reason for snapshot
   */
  recordSnapshot(planId, plan, reason) {
    const snapshots = this.snapshots.get(planId) || [];
    snapshots.push({
      timestamp: Date.now(),
      reason,
      plan: JSON.parse(JSON.stringify(plan)), // Deep clone
      version: snapshots.length + 1
    });
    this.snapshots.set(planId, snapshots);
  }

  /**
   * Get events with optional filtering
   * @param {Object} [filter={}] - Filter options
   * @returns {ReplanEvent[]} Filtered events
   */
  getEvents(filter = {}) {
    let result = [...this.events];

    // Filter by trigger type
    if (filter.trigger) {
      result = result.filter(e => e.trigger === filter.trigger);
    }

    // Filter by decision type
    if (filter.decision) {
      result = result.filter(e => e.decision === filter.decision);
    }

    // Filter by plan ID
    if (filter.planId) {
      result = result.filter(e => e.planId === filter.planId);
    }

    // Filter by time range
    if (filter.startTime) {
      result = result.filter(e => e.timestamp >= filter.startTime);
    }
    if (filter.endTime) {
      result = result.filter(e => e.timestamp <= filter.endTime);
    }

    // Filter by success
    if (filter.success !== undefined) {
      result = result.filter(e => e.outcome?.success === filter.success);
    }

    // Sort
    if (filter.sort === 'desc') {
      result.sort((a, b) => b.timestamp - a.timestamp);
    } else {
      result.sort((a, b) => a.timestamp - b.timestamp);
    }

    // Limit
    if (filter.limit) {
      result = result.slice(0, filter.limit);
    }

    return result;
  }

  /**
   * Get plan snapshots
   * @param {string} planId - Plan identifier
   * @returns {Object[]} Plan snapshots
   */
  getSnapshots(planId) {
    return this.snapshots.get(planId) || [];
  }

  /**
   * Get metrics summary
   * @returns {Object} Metrics summary
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalReplans > 0
        ? this.metrics.successfulReplans / this.metrics.totalReplans
        : 0,
      eventCount: this.events.length
    };
  }

  /**
   * Export history to Markdown format
   * @param {Object} [options={}] - Export options
   * @returns {string} Markdown content
   */
  exportMarkdown(options = {}) {
    const events = this.getEvents(options.filter || {});
    const metrics = this.getMetrics();

    let md = `# Replanning History Report

Generated: ${new Date().toISOString()}

## Summary

| Metric | Value |
|--------|-------|
| Total Replans | ${metrics.totalReplans} |
| Successful | ${metrics.successfulReplans} |
| Failed | ${metrics.failedReplans} |
| Success Rate | ${(metrics.successRate * 100).toFixed(1)}% |

## Triggers Distribution

| Trigger | Count |
|---------|-------|
${Object.entries(metrics.byTrigger).map(([k, v]) => `| ${k} | ${v} |`).join('\n')}

## Decisions Distribution

| Decision | Count |
|----------|-------|
${Object.entries(metrics.byDecision).map(([k, v]) => `| ${k} | ${v} |`).join('\n')}

## Events

`;

    for (const event of events) {
      md += `### ${event.id}

- **Timestamp**: ${new Date(event.timestamp).toISOString()}
- **Trigger**: ${event.trigger}
- **Decision**: ${event.decision}
- **Plan ID**: ${event.planId || 'N/A'}
- **Success**: ${event.outcome?.success ? '✅' : '❌'}

`;

      if (event.failedTask) {
        md += `**Failed Task**: ${event.failedTask.name || event.failedTask.skill}

`;
      }

      if (event.selectedAlternative) {
        md += `**Selected Alternative**: ${event.selectedAlternative.description}
- Confidence: ${event.selectedAlternative.confidence}
- Reasoning: ${event.selectedAlternative.reasoning}

`;
      }

      if (event.outcome?.error) {
        md += `**Error**: ${event.outcome.error}

`;
      }

      md += `---

`;
    }

    return md;
  }

  /**
   * Export history to JSON format
   * @param {Object} [options={}] - Export options
   * @returns {string} JSON string
   */
  exportJSON(options = {}) {
    const events = this.getEvents(options.filter || {});
    const metrics = this.getMetrics();

    return JSON.stringify({
      exportTime: Date.now(),
      metrics,
      events,
      snapshots: Object.fromEntries(this.snapshots)
    }, null, 2);
  }

  /**
   * Import history from JSON
   * @param {string} json - JSON string
   */
  importJSON(json) {
    try {
      const data = JSON.parse(json);
      
      if (data.events) {
        this.events = data.events;
      }
      
      if (data.snapshots) {
        this.snapshots = new Map(Object.entries(data.snapshots));
      }

      // Recalculate metrics
      this.recalculateMetrics();
    } catch (error) {
      throw new Error(`Failed to import history: ${error.message}`);
    }
  }

  /**
   * Clear all history
   */
  clear() {
    this.events = [];
    this.snapshots.clear();
    this.metrics = {
      totalReplans: 0,
      successfulReplans: 0,
      failedReplans: 0,
      byTrigger: {},
      byDecision: {}
    };
  }

  /**
   * Update metrics based on event
   * @param {ReplanEvent} event - Event
   * @private
   */
  updateMetrics(event) {
    this.metrics.totalReplans++;

    if (event.outcome?.success) {
      this.metrics.successfulReplans++;
    } else if (event.outcome?.success === false) {
      this.metrics.failedReplans++;
    }

    // Track by trigger
    if (event.trigger) {
      this.metrics.byTrigger[event.trigger] = 
        (this.metrics.byTrigger[event.trigger] || 0) + 1;
    }

    // Track by decision
    if (event.decision) {
      this.metrics.byDecision[event.decision] = 
        (this.metrics.byDecision[event.decision] || 0) + 1;
    }
  }

  /**
   * Recalculate metrics from events
   * @private
   */
  recalculateMetrics() {
    this.metrics = {
      totalReplans: 0,
      successfulReplans: 0,
      failedReplans: 0,
      byTrigger: {},
      byDecision: {}
    };

    for (const event of this.events) {
      this.updateMetrics(event);
    }
  }

  /**
   * Generate unique event ID
   * @returns {string} Event ID
   * @private
   */
  generateEventId() {
    return `replan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Persist history to file asynchronously
   * @private
   */
  async persistAsync() {
    try {
      const filePath = path.resolve(this.config.filePath);
      const dir = path.dirname(filePath);
      
      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true });
      
      // Write history
      await fs.writeFile(filePath, this.exportJSON(), 'utf8');
    } catch (error) {
      console.error('Failed to persist replan history:', error.message);
    }
  }

  /**
   * Load history from file
   * @returns {Promise<void>}
   */
  async load() {
    try {
      const filePath = path.resolve(this.config.filePath);
      const data = await fs.readFile(filePath, 'utf8');
      this.importJSON(data);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Failed to load replan history:', error.message);
      }
    }
  }
}

/**
 * @typedef {Object} ReplanEvent
 * @property {string} id - Event identifier
 * @property {number} timestamp - Event timestamp
 * @property {string} trigger - Trigger type
 * @property {string} decision - Decision made
 * @property {string} [planId] - Plan identifier
 * @property {Object} [failedTask] - Failed task details
 * @property {Object[]} [alternatives] - Generated alternatives
 * @property {Object} [selectedAlternative] - Selected alternative
 * @property {Object} [outcome] - Outcome of replanning
 * @property {boolean} [outcome.success] - Whether replanning succeeded
 * @property {string} [outcome.error] - Error message if failed
 * @property {Object} [context] - Additional context
 */

module.exports = { ReplanHistory };
