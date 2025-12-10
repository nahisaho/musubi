/**
 * Advanced Validation Engine
 * クロスアーティファクト一貫性検証と仕様ギャップ検出
 * 
 * @module validators/advanced-validation
 */

const EventEmitter = require('events');

/**
 * Validation types
 */
const VALIDATION_TYPE = {
  CROSS_ARTIFACT: 'cross-artifact',
  GAP_DETECTION: 'gap-detection',
  TRACEABILITY: 'traceability',
  CONSISTENCY: 'consistency',
  COMPLETENESS: 'completeness'
};

/**
 * Artifact types
 */
const ARTIFACT_TYPE = {
  REQUIREMENT: 'requirement',
  DESIGN: 'design',
  IMPLEMENTATION: 'implementation',
  TEST: 'test',
  STEERING: 'steering',
  DOCUMENTATION: 'documentation'
};

/**
 * Gap severity levels
 */
const GAP_SEVERITY = {
  CRITICAL: 'critical',
  MAJOR: 'major',
  MINOR: 'minor',
  INFO: 'info'
};

/**
 * Advanced Validation Engine
 */
class AdvancedValidation extends EventEmitter {
  /**
   * @param {Object} options
   * @param {boolean} options.strict - Strict mode
   * @param {Object} options.rules - Custom validation rules
   */
  constructor(options = {}) {
    super();
    
    this.strict = options.strict ?? false;
    this.customRules = new Map();
    this.artifacts = new Map();
    this.validationHistory = [];
    this.traceabilityMatrix = new Map();

    // Load custom rules
    if (options.rules) {
      for (const [name, rule] of Object.entries(options.rules)) {
        this.addRule(name, rule);
      }
    }
  }

  /**
   * Register an artifact for validation
   * @param {string} id - Artifact identifier
   * @param {Object} artifact - Artifact data
   */
  registerArtifact(id, artifact) {
    if (!artifact.type || !Object.values(ARTIFACT_TYPE).includes(artifact.type)) {
      throw new Error(`Invalid artifact type: ${artifact.type}`);
    }

    this.artifacts.set(id, {
      id,
      ...artifact,
      registeredAt: new Date().toISOString()
    });

    this.emit('artifact-registered', { id, artifact });
  }

  /**
   * Unregister an artifact
   * @param {string} id
   */
  unregisterArtifact(id) {
    this.artifacts.delete(id);
    this.traceabilityMatrix.delete(id);
  }

  /**
   * Add a traceability link
   * @param {string} sourceId - Source artifact ID
   * @param {string} targetId - Target artifact ID
   * @param {string} linkType - Type of link
   */
  addTraceLink(sourceId, targetId, linkType = 'implements') {
    if (!this.artifacts.has(sourceId)) {
      throw new Error(`Source artifact not found: ${sourceId}`);
    }
    if (!this.artifacts.has(targetId)) {
      throw new Error(`Target artifact not found: ${targetId}`);
    }

    if (!this.traceabilityMatrix.has(sourceId)) {
      this.traceabilityMatrix.set(sourceId, []);
    }

    this.traceabilityMatrix.get(sourceId).push({
      target: targetId,
      type: linkType,
      createdAt: new Date().toISOString()
    });
  }

  /**
   * Validate cross-artifact consistency
   * @param {Object} options
   * @returns {Object}
   */
  validateCrossArtifact(_options = {}) {
    const issues = [];
    const validated = [];

    // Check for orphaned artifacts (no trace links)
    for (const [id, artifact] of this.artifacts) {
      const hasIncoming = this.hasIncomingLinks(id);
      const hasOutgoing = this.traceabilityMatrix.has(id);

      if (!hasIncoming && !hasOutgoing && artifact.type !== ARTIFACT_TYPE.REQUIREMENT) {
        issues.push({
          type: 'orphaned',
          artifactId: id,
          artifactType: artifact.type,
          severity: GAP_SEVERITY.MAJOR,
          message: `Artifact "${id}" has no traceability links`
        });
      }

      validated.push(id);
    }

    // Check for broken links
    for (const [sourceId, links] of this.traceabilityMatrix) {
      for (const link of links) {
        if (!this.artifacts.has(link.target)) {
          issues.push({
            type: 'broken-link',
            sourceId,
            targetId: link.target,
            severity: GAP_SEVERITY.CRITICAL,
            message: `Broken link: ${sourceId} -> ${link.target}`
          });
        }
      }
    }

    // Check artifact type consistency
    for (const [sourceId, links] of this.traceabilityMatrix) {
      const sourceArtifact = this.artifacts.get(sourceId);
      for (const link of links) {
        const targetArtifact = this.artifacts.get(link.target);
        if (targetArtifact) {
          const valid = this.validateLinkTypes(sourceArtifact.type, targetArtifact.type, link.type);
          if (!valid) {
            issues.push({
              type: 'invalid-link-type',
              sourceId,
              targetId: link.target,
              linkType: link.type,
              severity: GAP_SEVERITY.MINOR,
              message: `Unusual link: ${sourceArtifact.type} -[${link.type}]-> ${targetArtifact.type}`
            });
          }
        }
      }
    }

    const result = {
      type: VALIDATION_TYPE.CROSS_ARTIFACT,
      valid: issues.filter(i => i.severity === GAP_SEVERITY.CRITICAL).length === 0,
      issues,
      validated,
      timestamp: new Date().toISOString()
    };

    this.validationHistory.push(result);
    this.emit('validated', result);

    return result;
  }

  /**
   * Check if artifact has incoming links
   */
  hasIncomingLinks(targetId) {
    for (const [, links] of this.traceabilityMatrix) {
      if (links.some(l => l.target === targetId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Validate link type combinations
   */
  validateLinkTypes(sourceType, targetType, linkType) {
    const validCombinations = {
      'requirement-design': ['implements', 'addresses', 'derives'],
      'design-implementation': ['implements', 'realizes'],
      'implementation-test': ['tests', 'verifies'],
      'requirement-test': ['verifies', 'validates']
    };

    const key = `${sourceType}-${targetType}`;
    const reverseKey = `${targetType}-${sourceType}`;

    const valid = validCombinations[key] || validCombinations[reverseKey];
    return !valid || valid.includes(linkType);
  }

  /**
   * Detect specification gaps
   * @param {Object} options
   * @returns {Object}
   */
  detectGaps(_options = {}) {
    const gaps = [];

    // Requirements without design
    const requirements = this.getArtifactsByType(ARTIFACT_TYPE.REQUIREMENT);
    const designs = this.getArtifactsByType(ARTIFACT_TYPE.DESIGN);
    const implementations = this.getArtifactsByType(ARTIFACT_TYPE.IMPLEMENTATION);
    const tests = this.getArtifactsByType(ARTIFACT_TYPE.TEST);

    for (const req of requirements) {
      const hasDesign = this.hasLinkToType(req.id, ARTIFACT_TYPE.DESIGN);
      if (!hasDesign) {
        gaps.push({
          type: 'missing-design',
          artifactId: req.id,
          severity: GAP_SEVERITY.MAJOR,
          message: `Requirement "${req.id}" has no associated design`
        });
      }
    }

    // Designs without implementation
    for (const design of designs) {
      const hasImpl = this.hasLinkToType(design.id, ARTIFACT_TYPE.IMPLEMENTATION);
      if (!hasImpl) {
        gaps.push({
          type: 'missing-implementation',
          artifactId: design.id,
          severity: GAP_SEVERITY.MAJOR,
          message: `Design "${design.id}" has no associated implementation`
        });
      }
    }

    // Implementations without tests
    for (const impl of implementations) {
      const hasTest = this.hasLinkToType(impl.id, ARTIFACT_TYPE.TEST);
      if (!hasTest) {
        gaps.push({
          type: 'missing-test',
          artifactId: impl.id,
          severity: GAP_SEVERITY.MINOR,
          message: `Implementation "${impl.id}" has no associated tests`
        });
      }
    }

    // Check completeness
    const completeness = {
      requirements: requirements.length,
      designs: designs.length,
      implementations: implementations.length,
      tests: tests.length,
      coverage: this.calculateCoverage()
    };

    const result = {
      type: VALIDATION_TYPE.GAP_DETECTION,
      gaps,
      completeness,
      gapCount: gaps.length,
      criticalGaps: gaps.filter(g => g.severity === GAP_SEVERITY.CRITICAL).length,
      timestamp: new Date().toISOString()
    };

    this.validationHistory.push(result);
    this.emit('gaps-detected', result);

    return result;
  }

  /**
   * Get artifacts by type
   */
  getArtifactsByType(type) {
    return Array.from(this.artifacts.values()).filter(a => a.type === type);
  }

  /**
   * Check if artifact has link to specific type
   */
  hasLinkToType(artifactId, targetType) {
    const links = this.traceabilityMatrix.get(artifactId) || [];
    for (const link of links) {
      const target = this.artifacts.get(link.target);
      if (target && target.type === targetType) {
        return true;
      }
    }
    return false;
  }

  /**
   * Calculate traceability coverage
   */
  calculateCoverage() {
    const total = this.artifacts.size;
    if (total === 0) return 100;

    let linked = 0;
    for (const [id] of this.artifacts) {
      if (this.traceabilityMatrix.has(id) || this.hasIncomingLinks(id)) {
        linked++;
      }
    }

    return Math.round((linked / total) * 100);
  }

  /**
   * Validate traceability
   * @returns {Object}
   */
  validateTraceability() {
    const issues = [];
    const matrix = {};

    // Build traceability matrix view
    for (const [sourceId, links] of this.traceabilityMatrix) {
      const source = this.artifacts.get(sourceId);
      if (!matrix[source?.type]) {
        matrix[source?.type] = {};
      }

      for (const link of links) {
        const target = this.artifacts.get(link.target);
        if (!matrix[source?.type][target?.type]) {
          matrix[source?.type][target?.type] = 0;
        }
        matrix[source?.type][target?.type]++;
      }
    }

    // Check for bidirectional traceability
    for (const [sourceId, links] of this.traceabilityMatrix) {
      for (const link of links) {
        const reverseLinks = this.traceabilityMatrix.get(link.target) || [];
        const hasReverse = reverseLinks.some(l => l.target === sourceId);
        if (!hasReverse && this.strict) {
          issues.push({
            type: 'unidirectional',
            sourceId,
            targetId: link.target,
            severity: GAP_SEVERITY.INFO,
            message: `Unidirectional link: ${sourceId} -> ${link.target}`
          });
        }
      }
    }

    const coverage = this.calculateCoverage();

    const result = {
      type: VALIDATION_TYPE.TRACEABILITY,
      valid: issues.length === 0,
      issues,
      matrix,
      coverage,
      artifactCount: this.artifacts.size,
      linkCount: this.countLinks(),
      timestamp: new Date().toISOString()
    };

    this.validationHistory.push(result);
    return result;
  }

  /**
   * Count total links
   */
  countLinks() {
    let count = 0;
    for (const [, links] of this.traceabilityMatrix) {
      count += links.length;
    }
    return count;
  }

  /**
   * Add a custom validation rule
   * @param {string} name
   * @param {Object} rule
   */
  addRule(name, rule) {
    if (!rule.validate || typeof rule.validate !== 'function') {
      throw new Error('Rule must have a validate function');
    }
    this.customRules.set(name, {
      severity: GAP_SEVERITY.MINOR,
      ...rule
    });
  }

  /**
   * Run all validations
   * @returns {Object}
   */
  runAllValidations() {
    const crossArtifact = this.validateCrossArtifact();
    const gaps = this.detectGaps();
    const traceability = this.validateTraceability();

    // Run custom rules
    const customResults = [];
    for (const [name, rule] of this.customRules) {
      try {
        const result = rule.validate(this.artifacts, this.traceabilityMatrix);
        customResults.push({
          name,
          ...result
        });
      } catch (error) {
        customResults.push({
          name,
          error: error.message
        });
      }
    }

    const allIssues = [
      ...crossArtifact.issues,
      ...gaps.gaps,
      ...traceability.issues
    ];

    const overallValid = allIssues.filter(i => 
      i.severity === GAP_SEVERITY.CRITICAL
    ).length === 0;

    return {
      valid: overallValid,
      summary: {
        crossArtifact: crossArtifact.valid,
        gaps: gaps.gapCount === 0,
        traceability: traceability.valid
      },
      crossArtifact,
      gaps,
      traceability,
      customRules: customResults,
      totalIssues: allIssues.length,
      criticalIssues: allIssues.filter(i => i.severity === GAP_SEVERITY.CRITICAL).length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get validation history
   * @param {Object} filter
   * @returns {Array}
   */
  getHistory(filter = {}) {
    let history = [...this.validationHistory];

    if (filter.type) {
      history = history.filter(h => h.type === filter.type);
    }

    if (filter.valid !== undefined) {
      history = history.filter(h => h.valid === filter.valid);
    }

    if (filter.limit) {
      history = history.slice(-filter.limit);
    }

    return history;
  }

  /**
   * Export traceability matrix as markdown
   * @returns {string}
   */
  exportMatrix() {
    let md = `# Traceability Matrix\n\n`;
    md += `Generated: ${new Date().toISOString()}\n\n`;

    // Artifact summary
    md += `## Artifacts\n\n`;
    md += `| Type | Count |\n`;
    md += `|------|-------|\n`;

    const typeCounts = {};
    for (const [, artifact] of this.artifacts) {
      typeCounts[artifact.type] = (typeCounts[artifact.type] || 0) + 1;
    }

    for (const [type, count] of Object.entries(typeCounts)) {
      md += `| ${type} | ${count} |\n`;
    }

    md += `\n## Links\n\n`;
    md += `| Source | Link Type | Target |\n`;
    md += `|--------|-----------|--------|\n`;

    for (const [sourceId, links] of this.traceabilityMatrix) {
      for (const link of links) {
        md += `| ${sourceId} | ${link.type} | ${link.target} |\n`;
      }
    }

    md += `\n---\n`;
    md += `Coverage: ${this.calculateCoverage()}%\n`;
    md += `Total Links: ${this.countLinks()}\n`;

    return md;
  }

  /**
   * Get stats
   * @returns {Object}
   */
  getStats() {
    return {
      artifactCount: this.artifacts.size,
      linkCount: this.countLinks(),
      ruleCount: this.customRules.size,
      historyCount: this.validationHistory.length,
      coverage: this.calculateCoverage()
    };
  }

  /**
   * Clear all data
   */
  clear() {
    this.artifacts.clear();
    this.traceabilityMatrix.clear();
    this.validationHistory = [];
    this.emit('cleared');
  }
}

/**
 * Factory function
 */
function createAdvancedValidation(options = {}) {
  return new AdvancedValidation(options);
}

module.exports = {
  AdvancedValidation,
  createAdvancedValidation,
  VALIDATION_TYPE,
  ARTIFACT_TYPE,
  GAP_SEVERITY
};
