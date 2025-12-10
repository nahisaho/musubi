/**
 * @fileoverview Cost Tracker for MUSUBI
 * @module monitoring/cost-tracker
 * @version 1.0.0
 * @description Tracks LLM API usage and costs across providers
 * 
 * Part of MUSUBI v5.0.0 - Production Readiness
 * 
 * @traceability
 * - Requirement: REQ-P5-005 (Cost Tracking)
 * - Design: docs/design/tdd-musubi-v5.0.0.md#3.5
 * - Test: tests/monitoring/cost-tracker.test.js
 */

'use strict';

const fs = require('fs-extra');
const path = require('path');
const EventEmitter = require('events');

/**
 * Default pricing per 1M tokens (as of 2024)
 * Prices in USD
 */
const DEFAULT_PRICING = {
  // OpenAI
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-4': { input: 30.00, output: 60.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'o1': { input: 15.00, output: 60.00 },
  'o1-mini': { input: 3.00, output: 12.00 },
  'o3-mini': { input: 1.10, output: 4.40 },
  
  // Anthropic Claude
  'claude-opus-4': { input: 15.00, output: 75.00 },
  'claude-sonnet-4': { input: 3.00, output: 15.00 },
  'claude-3.5-sonnet': { input: 3.00, output: 15.00 },
  'claude-3.5-haiku': { input: 0.80, output: 4.00 },
  'claude-3-opus': { input: 15.00, output: 75.00 },
  'claude-3-sonnet': { input: 3.00, output: 15.00 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  
  // Google Gemini
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  
  // GitHub Copilot (estimated based on value)
  'github-copilot': { input: 0.00, output: 0.00 }, // Subscription-based
  
  // Local models (free)
  'ollama': { input: 0.00, output: 0.00 },
  'llama3.2': { input: 0.00, output: 0.00 },
  'codellama': { input: 0.00, output: 0.00 },
  'mistral': { input: 0.00, output: 0.00 },
  'qwen2.5': { input: 0.00, output: 0.00 },
};

/**
 * Usage record structure
 * @typedef {Object} UsageRecord
 * @property {string} timestamp - ISO timestamp
 * @property {string} provider - Provider name
 * @property {string} model - Model identifier
 * @property {string} operation - Operation type (complete, embed, etc.)
 * @property {number} inputTokens - Input tokens used
 * @property {number} outputTokens - Output tokens generated
 * @property {number} cost - Estimated cost in USD
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * Cost Tracker
 * Tracks and reports LLM API usage and costs
 */
class CostTracker extends EventEmitter {
  /**
   * Create a CostTracker instance
   * @param {Object} options - Configuration options
   * @param {string} [options.storageDir] - Directory for usage logs
   * @param {Object} [options.pricing] - Custom pricing overrides
   * @param {number} [options.budgetLimit] - Budget limit in USD (0 = unlimited)
   * @param {string} [options.budgetPeriod='monthly'] - Budget period
   */
  constructor(options = {}) {
    super();
    this.storageDir = options.storageDir || path.join(process.cwd(), '.musubi', 'costs');
    this.pricing = { ...DEFAULT_PRICING, ...options.pricing };
    this.budgetLimit = options.budgetLimit || 0;
    this.budgetPeriod = options.budgetPeriod || 'monthly';
    
    // In-memory session tracking
    this.sessionUsage = [];
    this.sessionStart = new Date();
    
    // Running totals for current period
    this.periodTotals = {
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      requests: 0,
    };
  }

  /**
   * Initialize the cost tracker
   * @returns {Promise<void>}
   */
  async initialize() {
    await fs.ensureDir(this.storageDir);
    await this._loadPeriodTotals();
  }

  /**
   * Record usage from an LLM request
   * @param {Object} params - Usage parameters
   * @param {string} params.provider - Provider name
   * @param {string} params.model - Model identifier
   * @param {string} [params.operation='complete'] - Operation type
   * @param {number} params.inputTokens - Input tokens
   * @param {number} params.outputTokens - Output tokens
   * @param {Object} [params.metadata] - Additional metadata
   * @returns {UsageRecord} The recorded usage
   */
  record(params) {
    const {
      provider,
      model,
      operation = 'complete',
      inputTokens = 0,
      outputTokens = 0,
      metadata = {},
    } = params;

    // Calculate cost
    const pricing = this._getPricing(model, provider);
    const cost = this._calculateCost(inputTokens, outputTokens, pricing);

    const record = {
      timestamp: new Date().toISOString(),
      provider,
      model,
      operation,
      inputTokens,
      outputTokens,
      cost,
      metadata,
    };

    // Add to session
    this.sessionUsage.push(record);

    // Update period totals
    this.periodTotals.inputTokens += inputTokens;
    this.periodTotals.outputTokens += outputTokens;
    this.periodTotals.cost += cost;
    this.periodTotals.requests += 1;

    // Emit events
    this.emit('usage', record);

    // Check budget
    if (this.budgetLimit > 0 && this.periodTotals.cost >= this.budgetLimit) {
      this.emit('budget-exceeded', {
        limit: this.budgetLimit,
        current: this.periodTotals.cost,
        period: this.budgetPeriod,
      });
    } else if (this.budgetLimit > 0 && this.periodTotals.cost >= this.budgetLimit * 0.8) {
      this.emit('budget-warning', {
        limit: this.budgetLimit,
        current: this.periodTotals.cost,
        percentage: (this.periodTotals.cost / this.budgetLimit) * 100,
      });
    }

    return record;
  }

  /**
   * Get session summary
   * @returns {Object} Session usage summary
   */
  getSessionSummary() {
    const byProvider = {};
    const byModel = {};
    const byOperation = {};

    for (const record of this.sessionUsage) {
      // By provider
      if (!byProvider[record.provider]) {
        byProvider[record.provider] = { tokens: 0, cost: 0, requests: 0 };
      }
      byProvider[record.provider].tokens += record.inputTokens + record.outputTokens;
      byProvider[record.provider].cost += record.cost;
      byProvider[record.provider].requests += 1;

      // By model
      if (!byModel[record.model]) {
        byModel[record.model] = { tokens: 0, cost: 0, requests: 0 };
      }
      byModel[record.model].tokens += record.inputTokens + record.outputTokens;
      byModel[record.model].cost += record.cost;
      byModel[record.model].requests += 1;

      // By operation
      if (!byOperation[record.operation]) {
        byOperation[record.operation] = { tokens: 0, cost: 0, requests: 0 };
      }
      byOperation[record.operation].tokens += record.inputTokens + record.outputTokens;
      byOperation[record.operation].cost += record.cost;
      byOperation[record.operation].requests += 1;
    }

    const totalTokens = this.sessionUsage.reduce(
      (sum, r) => sum + r.inputTokens + r.outputTokens,
      0
    );
    const totalCost = this.sessionUsage.reduce((sum, r) => sum + r.cost, 0);

    return {
      sessionStart: this.sessionStart.toISOString(),
      duration: Date.now() - this.sessionStart.getTime(),
      totalRequests: this.sessionUsage.length,
      totalTokens,
      totalCost,
      byProvider,
      byModel,
      byOperation,
    };
  }

  /**
   * Get period summary (monthly/weekly/daily)
   * @returns {Object} Period usage summary
   */
  getPeriodSummary() {
    return {
      period: this.budgetPeriod,
      ...this.periodTotals,
      budgetLimit: this.budgetLimit,
      budgetRemaining: this.budgetLimit > 0 ? this.budgetLimit - this.periodTotals.cost : null,
      budgetUsedPercent: this.budgetLimit > 0
        ? (this.periodTotals.cost / this.budgetLimit) * 100
        : null,
    };
  }

  /**
   * Save session usage to disk
   * @returns {Promise<string>} Path to saved file
   */
  async saveSession() {
    const filename = `session-${this.sessionStart.toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(this.storageDir, filename);

    const data = {
      summary: this.getSessionSummary(),
      records: this.sessionUsage,
    };

    await fs.writeJSON(filepath, data, { spaces: 2 });
    return filepath;
  }

  /**
   * Generate a cost report
   * @param {Object} options - Report options
   * @param {string} [options.period='session'] - Report period
   * @param {string} [options.format='text'] - Output format
   * @returns {string} Formatted report
   */
  generateReport(options = {}) {
    const { period = 'session', format = 'text' } = options;

    const summary = period === 'session'
      ? this.getSessionSummary()
      : this.getPeriodSummary();

    if (format === 'json') {
      return JSON.stringify(summary, null, 2);
    }

    // Text format
    const lines = [];
    lines.push('═══════════════════════════════════════════════');
    lines.push('          MUSUBI Cost Report');
    lines.push('═══════════════════════════════════════════════');
    lines.push('');

    if (period === 'session') {
      lines.push(`Session Start: ${summary.sessionStart}`);
      lines.push(`Duration: ${this._formatDuration(summary.duration)}`);
      lines.push('');
      lines.push('── Summary ──────────────────────────────────');
      lines.push(`Total Requests: ${summary.totalRequests}`);
      lines.push(`Total Tokens: ${summary.totalTokens.toLocaleString()}`);
      lines.push(`Total Cost: $${summary.totalCost.toFixed(4)}`);
      lines.push('');

      if (Object.keys(summary.byProvider).length > 0) {
        lines.push('── By Provider ──────────────────────────────');
        for (const [provider, stats] of Object.entries(summary.byProvider)) {
          lines.push(`  ${provider}:`);
          lines.push(`    Requests: ${stats.requests}, Tokens: ${stats.tokens.toLocaleString()}, Cost: $${stats.cost.toFixed(4)}`);
        }
        lines.push('');
      }

      if (Object.keys(summary.byModel).length > 0) {
        lines.push('── By Model ─────────────────────────────────');
        for (const [model, stats] of Object.entries(summary.byModel)) {
          lines.push(`  ${model}:`);
          lines.push(`    Requests: ${stats.requests}, Tokens: ${stats.tokens.toLocaleString()}, Cost: $${stats.cost.toFixed(4)}`);
        }
      }
    } else {
      lines.push(`Period: ${summary.period}`);
      lines.push(`Requests: ${summary.requests}`);
      lines.push(`Input Tokens: ${summary.inputTokens.toLocaleString()}`);
      lines.push(`Output Tokens: ${summary.outputTokens.toLocaleString()}`);
      lines.push(`Total Cost: $${summary.cost.toFixed(4)}`);
      
      if (summary.budgetLimit) {
        lines.push('');
        lines.push('── Budget ───────────────────────────────────');
        lines.push(`Limit: $${summary.budgetLimit.toFixed(2)}`);
        lines.push(`Remaining: $${summary.budgetRemaining.toFixed(2)}`);
        lines.push(`Used: ${summary.budgetUsedPercent.toFixed(1)}%`);
      }
    }

    lines.push('');
    lines.push('═══════════════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Reset session usage
   */
  resetSession() {
    this.sessionUsage = [];
    this.sessionStart = new Date();
  }

  /**
   * Reset period totals
   */
  resetPeriod() {
    this.periodTotals = {
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      requests: 0,
    };
  }

  /**
   * Update pricing for a model
   * @param {string} model - Model identifier
   * @param {Object} pricing - Pricing config
   */
  setPricing(model, pricing) {
    this.pricing[model] = pricing;
  }

  /**
   * Get pricing for a model
   * @param {string} model - Model identifier
   * @returns {Object|null} Pricing config or null
   */
  getPricing(model) {
    return this._getPricing(model);
  }

  /**
   * Get all pricing
   * @returns {Object} All pricing configs
   */
  getAllPricing() {
    return { ...this.pricing };
  }

  /**
   * Set budget limit
   * @param {number} limit - Budget limit in USD
   * @param {string} [period='monthly'] - Budget period
   */
  setBudget(limit, period = 'monthly') {
    this.budgetLimit = limit;
    this.budgetPeriod = period;
  }

  /**
   * Load period totals from storage
   * @private
   */
  async _loadPeriodTotals() {
    const periodFile = path.join(this.storageDir, `period-${this.budgetPeriod}.json`);
    
    try {
      if (await fs.pathExists(periodFile)) {
        const data = await fs.readJSON(periodFile);
        
        // Check if period is still current
        const periodStart = new Date(data.periodStart);
        if (this._isCurrentPeriod(periodStart)) {
          this.periodTotals = data.totals;
        }
      }
    } catch (error) {
      // Ignore errors, start fresh
    }
  }

  /**
   * Save period totals to storage
   * @private
   */
  async _savePeriodTotals() {
    const periodFile = path.join(this.storageDir, `period-${this.budgetPeriod}.json`);
    
    const data = {
      periodStart: this._getPeriodStart().toISOString(),
      period: this.budgetPeriod,
      totals: this.periodTotals,
    };

    await fs.writeJSON(periodFile, data, { spaces: 2 });
  }

  /**
   * Check if a date is in the current period
   * @private
   */
  _isCurrentPeriod(date) {
    const _now = new Date();
    const periodStart = this._getPeriodStart();
    return date >= periodStart;
  }

  /**
   * Get the start of current period
   * @private
   */
  _getPeriodStart() {
    const now = new Date();
    
    switch (this.budgetPeriod) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'weekly': {
        const day = now.getDay();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
      }
      case 'monthly':
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  /**
   * Get pricing for a model
   * @private
   */
  _getPricing(model, provider) {
    // Try exact model match
    if (this.pricing[model]) {
      return this.pricing[model];
    }

    // Try base model name (without version)
    const baseModel = model.split(':')[0].split('-')[0];
    if (this.pricing[baseModel]) {
      return this.pricing[baseModel];
    }

    // Try provider
    if (provider && this.pricing[provider]) {
      return this.pricing[provider];
    }

    // Default to free
    return { input: 0, output: 0 };
  }

  /**
   * Calculate cost from tokens
   * @private
   */
  _calculateCost(inputTokens, outputTokens, pricing) {
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }

  /**
   * Format duration in human-readable format
   * @private
   */
  _formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
}

module.exports = { CostTracker, DEFAULT_PRICING };
