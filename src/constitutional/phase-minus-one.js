/**
 * Phase -1 Gate
 * 
 * Triggers Phase -1 Gate review for Article VII/VIII violations.
 * 
 * Requirement: IMP-6.2-005-02
 * Design: Section 5.2
 */

const fs = require('fs').promises;
const path = require('path');
const { ConstitutionalChecker } = require('./checker');

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  storageDir: 'storage/phase-minus-one',
  requiredReviewers: ['system-architect'],
  optionalReviewers: ['project-manager'],
  autoNotify: true
};

/**
 * Gate status
 */
const GATE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WAIVED: 'waived'
};

/**
 * PhaseMinusOneGate
 * 
 * Manages Phase -1 Gate review process.
 */
class PhaseMinusOneGate {
  /**
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.checker = new ConstitutionalChecker(config.checkerConfig);
  }

  /**
   * Trigger Phase -1 Gate
   * @param {Object} options - Trigger options
   * @returns {Promise<Object>} Gate record
   */
  async trigger(options) {
    const gateId = `GATE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const gate = {
      id: gateId,
      featureId: options.featureId,
      triggeredBy: options.triggeredBy || 'system',
      triggeredAt: new Date().toISOString(),
      violations: options.violations || [],
      affectedFiles: options.affectedFiles || [],
      status: GATE_STATUS.PENDING,
      requiredReviewers: this.config.requiredReviewers,
      optionalReviewers: this.config.optionalReviewers,
      reviews: [],
      resolution: null,
      resolvedAt: null
    };

    await this.saveGate(gate);

    // Generate notification if auto-notify is enabled
    if (this.config.autoNotify) {
      gate.notifications = await this.generateNotifications(gate);
    }

    return gate;
  }

  /**
   * Analyze files and trigger gate if needed
   * @param {Array} filePaths - Files to analyze
   * @param {Object} options - Options
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeAndTrigger(filePaths, options = {}) {
    const checkResults = await this.checker.checkFiles(filePaths);
    const blockDecision = this.checker.shouldBlockMerge(checkResults);

    if (blockDecision.requiresPhaseMinusOne) {
      const violations = checkResults.results
        .flatMap(r => r.violations)
        .filter(v => v.article === 'VII' || v.article === 'VIII');

      const gate = await this.trigger({
        featureId: options.featureId,
        triggeredBy: options.triggeredBy || 'auto-analysis',
        violations,
        affectedFiles: filePaths
      });

      return {
        triggered: true,
        gate,
        checkResults,
        blockDecision
      };
    }

    return {
      triggered: false,
      gate: null,
      checkResults,
      blockDecision
    };
  }

  /**
   * Submit review for gate
   * @param {string} gateId - Gate ID
   * @param {Object} review - Review data
   * @returns {Promise<Object>} Updated gate
   */
  async submitReview(gateId, review) {
    const gate = await this.loadGate(gateId);
    if (!gate) {
      throw new Error(`Gate not found: ${gateId}`);
    }

    const reviewEntry = {
      id: `REV-${Date.now()}`,
      reviewer: review.reviewer,
      decision: review.decision, // 'approve', 'reject', 'request-changes'
      comments: review.comments || '',
      submittedAt: new Date().toISOString()
    };

    gate.reviews.push(reviewEntry);

    // Check if all required reviewers have approved
    const approvedReviewers = gate.reviews
      .filter(r => r.decision === 'approve')
      .map(r => r.reviewer);

    const allRequiredApproved = gate.requiredReviewers.every(
      r => approvedReviewers.includes(r)
    );

    const hasRejection = gate.reviews.some(r => r.decision === 'reject');

    if (hasRejection) {
      gate.status = GATE_STATUS.REJECTED;
      gate.resolution = 'rejected';
      gate.resolvedAt = new Date().toISOString();
    } else if (allRequiredApproved) {
      gate.status = GATE_STATUS.APPROVED;
      gate.resolution = 'approved';
      gate.resolvedAt = new Date().toISOString();
    }

    await this.saveGate(gate);

    return gate;
  }

  /**
   * Waive gate (with justification)
   * @param {string} gateId - Gate ID
   * @param {Object} waiver - Waiver data
   * @returns {Promise<Object>} Updated gate
   */
  async waiveGate(gateId, waiver) {
    const gate = await this.loadGate(gateId);
    if (!gate) {
      throw new Error(`Gate not found: ${gateId}`);
    }

    gate.status = GATE_STATUS.WAIVED;
    gate.resolution = 'waived';
    gate.waiver = {
      waivedBy: waiver.waivedBy,
      justification: waiver.justification,
      waivedAt: new Date().toISOString()
    };
    gate.resolvedAt = new Date().toISOString();

    await this.saveGate(gate);

    return gate;
  }

  /**
   * Get gate by ID
   * @param {string} gateId - Gate ID
   * @returns {Promise<Object|null>} Gate
   */
  async getGate(gateId) {
    return await this.loadGate(gateId);
  }

  /**
   * List gates by status
   * @param {string} status - Status filter (optional)
   * @returns {Promise<Array>} Gates
   */
  async listGates(status = null) {
    try {
      await this.ensureStorageDir();
      const files = await fs.readdir(this.config.storageDir);
      const gates = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const gate = await this.loadGate(file.replace('.json', ''));
          if (gate && (!status || gate.status === status)) {
            gates.push(gate);
          }
        }
      }

      return gates;
    } catch {
      return [];
    }
  }

  /**
   * Get pending gates for reviewer
   * @param {string} reviewer - Reviewer name
   * @returns {Promise<Array>} Pending gates
   */
  async getPendingForReviewer(reviewer) {
    const pendingGates = await this.listGates(GATE_STATUS.PENDING);
    
    return pendingGates.filter(gate => {
      const hasReviewed = gate.reviews.some(r => r.reviewer === reviewer);
      const isRequired = gate.requiredReviewers.includes(reviewer);
      const isOptional = gate.optionalReviewers.includes(reviewer);
      
      return !hasReviewed && (isRequired || isOptional);
    });
  }

  /**
   * Generate notifications for gate
   * @param {Object} gate - Gate data
   * @returns {Promise<Array>} Notifications
   */
  async generateNotifications(gate) {
    const notifications = [];

    // Notify required reviewers
    for (const reviewer of gate.requiredReviewers) {
      notifications.push({
        type: 'required-review',
        recipient: reviewer,
        gateId: gate.id,
        message: `Phase -1 Gate review required for ${gate.featureId || 'unknown feature'}`,
        violations: gate.violations.length,
        createdAt: new Date().toISOString()
      });
    }

    // Notify optional reviewers
    for (const reviewer of gate.optionalReviewers) {
      notifications.push({
        type: 'optional-review',
        recipient: reviewer,
        gateId: gate.id,
        message: `Phase -1 Gate review available for ${gate.featureId || 'unknown feature'}`,
        violations: gate.violations.length,
        createdAt: new Date().toISOString()
      });
    }

    return notifications;
  }

  /**
   * Generate gate report
   * @param {string} gateId - Gate ID
   * @returns {Promise<string>} Markdown report
   */
  async generateReport(gateId) {
    const gate = await this.loadGate(gateId);
    if (!gate) {
      throw new Error(`Gate not found: ${gateId}`);
    }

    const lines = [];

    lines.push('# Phase -1 Gate Report');
    lines.push('');
    lines.push(`**Gate ID:** ${gate.id}`);
    lines.push(`**Feature:** ${gate.featureId || 'N/A'}`);
    lines.push(`**Status:** ${this.getStatusEmoji(gate.status)} ${gate.status}`);
    lines.push(`**Triggered:** ${gate.triggeredAt}`);
    if (gate.resolvedAt) {
      lines.push(`**Resolved:** ${gate.resolvedAt}`);
    }
    lines.push('');

    // Violations
    lines.push('## Violations');
    lines.push('');
    if (gate.violations.length === 0) {
      lines.push('No violations recorded.');
    } else {
      for (const v of gate.violations) {
        lines.push(`### Article ${v.article}: ${v.articleName}`);
        lines.push(`- **Severity:** ${v.severity}`);
        lines.push(`- **File:** ${v.filePath}`);
        lines.push(`- **Message:** ${v.message}`);
        lines.push(`- **Suggestion:** ${v.suggestion}`);
        lines.push('');
      }
    }

    // Reviews
    lines.push('## Reviews');
    lines.push('');
    if (gate.reviews.length === 0) {
      lines.push('No reviews submitted yet.');
    } else {
      lines.push('| Reviewer | Decision | Date |');
      lines.push('|----------|----------|------|');
      for (const r of gate.reviews) {
        const emoji = r.decision === 'approve' ? '✅' : 
                     r.decision === 'reject' ? '❌' : '🔄';
        lines.push(`| ${r.reviewer} | ${emoji} ${r.decision} | ${r.submittedAt} |`);
      }
      lines.push('');
    }

    // Waiver info if applicable
    if (gate.waiver) {
      lines.push('## Waiver');
      lines.push('');
      lines.push(`**Waived By:** ${gate.waiver.waivedBy}`);
      lines.push(`**Justification:** ${gate.waiver.justification}`);
      lines.push(`**Waived At:** ${gate.waiver.waivedAt}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get status emoji
   * @param {string} status - Gate status
   * @returns {string} Emoji
   */
  getStatusEmoji(status) {
    const emojis = {
      [GATE_STATUS.PENDING]: '⏳',
      [GATE_STATUS.APPROVED]: '✅',
      [GATE_STATUS.REJECTED]: '❌',
      [GATE_STATUS.WAIVED]: '⚠️'
    };
    return emojis[status] || '❓';
  }

  /**
   * Save gate to storage
   * @param {Object} gate - Gate to save
   */
  async saveGate(gate) {
    await this.ensureStorageDir();
    const filePath = path.join(this.config.storageDir, `${gate.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(gate, null, 2), 'utf-8');
  }

  /**
   * Load gate from storage
   * @param {string} gateId - Gate ID
   * @returns {Promise<Object|null>} Gate
   */
  async loadGate(gateId) {
    try {
      const filePath = path.join(this.config.storageDir, `${gateId}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
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

module.exports = { 
  PhaseMinusOneGate, 
  GATE_STATUS 
};
