/**
 * Advanced Validation Module
 * 
 * Provides:
 * - Cross-artifact consistency validation
 * - Gap detection between requirements and implementation
 * - Completeness checks
 * - Dependency validation
 */

const EventEmitter = require('events');
const path = require('path');

// Validation Types
const ValidationType = {
  CONSISTENCY: 'consistency',
  COMPLETENESS: 'completeness',
  GAP: 'gap',
  DEPENDENCY: 'dependency',
  REFERENCE: 'reference',
  CUSTOM: 'custom'
};

// Severity Levels
const Severity = {
  CRITICAL: 'critical',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Artifact Types
const ArtifactType = {
  REQUIREMENT: 'requirement',
  DESIGN: 'design',
  IMPLEMENTATION: 'implementation',
  TEST: 'test',
  DOCUMENTATION: 'documentation',
  STEERING: 'steering'
};

/**
 * Validation Issue
 */
class ValidationIssue {
  constructor(options = {}) {
    this.id = options.id || `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.type = options.type || ValidationType.CONSISTENCY;
    this.severity = options.severity || Severity.ERROR;
    this.message = options.message || 'Validation issue';
    this.artifact = options.artifact || null;
    this.location = options.location || null;
    this.suggestion = options.suggestion || null;
    this.relatedArtifacts = options.relatedArtifacts || [];
    this.metadata = options.metadata || {};
    this.timestamp = new Date();
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      severity: this.severity,
      message: this.message,
      artifact: this.artifact,
      location: this.location,
      suggestion: this.suggestion,
      relatedArtifacts: this.relatedArtifacts,
      timestamp: this.timestamp.toISOString()
    };
  }
}

/**
 * Artifact Reference
 */
class ArtifactReference {
  constructor(type, id, options = {}) {
    this.type = type;
    this.id = id;
    this.name = options.name || id;
    this.path = options.path || null;
    this.version = options.version || null;
    this.dependencies = options.dependencies || [];
    this.references = options.references || [];
  }

  addDependency(ref) {
    this.dependencies.push(ref);
    return this;
  }

  addReference(ref) {
    this.references.push(ref);
    return this;
  }

  toJSON() {
    return {
      type: this.type,
      id: this.id,
      name: this.name,
      path: this.path,
      version: this.version,
      dependencies: this.dependencies.map(d => typeof d === 'string' ? d : d.id),
      references: this.references.map(r => typeof r === 'string' ? r : r.id)
    };
  }
}

/**
 * Consistency Checker
 */
class ConsistencyChecker {
  constructor(options = {}) {
    this.rules = [];
    this.strictMode = options.strict || false;
  }

  addRule(rule) {
    this.rules.push(rule);
    return this;
  }

  check(artifacts) {
    const issues = [];

    for (const rule of this.rules) {
      try {
        const ruleIssues = rule.check(artifacts);
        issues.push(...ruleIssues);
      } catch (error) {
        issues.push(new ValidationIssue({
          type: ValidationType.CONSISTENCY,
          severity: Severity.ERROR,
          message: `Rule check failed: ${error.message}`,
          metadata: { rule: rule.name, error: error.message }
        }));
      }
    }

    return {
      valid: !issues.some(i => i.severity === Severity.CRITICAL || i.severity === Severity.ERROR),
      issues,
      rulesChecked: this.rules.length
    };
  }

  // Built-in rules
  static createNamingConsistencyRule() {
    return {
      name: 'naming-consistency',
      check: (artifacts) => {
        const issues = [];
        const names = new Map();

        for (const artifact of artifacts) {
          const normalized = artifact.name?.toLowerCase().replace(/[-_\s]/g, '');
          if (normalized && names.has(normalized)) {
            const existing = names.get(normalized);
            issues.push(new ValidationIssue({
              type: ValidationType.CONSISTENCY,
              severity: Severity.WARNING,
              message: `Similar names detected: "${artifact.name}" and "${existing.name}"`,
              artifact: artifact.id,
              relatedArtifacts: [existing.id]
            }));
          }
          if (normalized) {
            names.set(normalized, artifact);
          }
        }

        return issues;
      }
    };
  }

  static createVersionConsistencyRule() {
    return {
      name: 'version-consistency',
      check: (artifacts) => {
        const issues = [];
        const versions = new Map();

        for (const artifact of artifacts) {
          if (artifact.version) {
            if (!versions.has(artifact.type)) {
              versions.set(artifact.type, []);
            }
            versions.get(artifact.type).push(artifact);
          }
        }

        for (const [type, typeArtifacts] of versions) {
          const uniqueVersions = new Set(typeArtifacts.map(a => a.version));
          if (uniqueVersions.size > 1) {
            issues.push(new ValidationIssue({
              type: ValidationType.CONSISTENCY,
              severity: Severity.WARNING,
              message: `Multiple versions found for ${type}: ${[...uniqueVersions].join(', ')}`,
              metadata: { type, versions: [...uniqueVersions] }
            }));
          }
        }

        return issues;
      }
    };
  }
}

/**
 * Gap Detector
 */
class GapDetector {
  constructor(options = {}) {
    this.traceabilityMatrix = new Map();
    this.requiredLinks = options.requiredLinks || {
      [ArtifactType.REQUIREMENT]: [ArtifactType.DESIGN, ArtifactType.TEST],
      [ArtifactType.DESIGN]: [ArtifactType.IMPLEMENTATION],
      [ArtifactType.IMPLEMENTATION]: [ArtifactType.TEST]
    };
  }

  addLink(source, target) {
    if (!this.traceabilityMatrix.has(source)) {
      this.traceabilityMatrix.set(source, new Set());
    }
    this.traceabilityMatrix.get(source).add(target);
    return this;
  }

  detectGaps(artifacts) {
    const issues = [];
    const artifactMap = new Map(artifacts.map(a => [a.id, a]));

    for (const artifact of artifacts) {
      const requiredTargets = this.requiredLinks[artifact.type] || [];
      const actualLinks = this.traceabilityMatrix.get(artifact.id) || new Set();

      for (const requiredType of requiredTargets) {
        const hasLink = [...actualLinks].some(linkId => {
          const linked = artifactMap.get(linkId);
          return linked && linked.type === requiredType;
        });

        if (!hasLink) {
          issues.push(new ValidationIssue({
            type: ValidationType.GAP,
            severity: Severity.WARNING,
            message: `${artifact.type} "${artifact.name}" has no linked ${requiredType}`,
            artifact: artifact.id,
            suggestion: `Create or link a ${requiredType} for this ${artifact.type}`
          }));
        }
      }
    }

    return {
      gaps: issues,
      coverage: this.calculateCoverage(artifacts, issues)
    };
  }

  calculateCoverage(artifacts, gaps) {
    const totalRequired = artifacts.reduce((acc, a) => {
      return acc + (this.requiredLinks[a.type]?.length || 0);
    }, 0);

    if (totalRequired === 0) return 100;
    
    const gapCount = gaps.length;
    return ((totalRequired - gapCount) / totalRequired) * 100;
  }

  getTraceabilityReport() {
    const report = [];
    
    for (const [source, targets] of this.traceabilityMatrix) {
      report.push({
        source,
        targets: [...targets],
        count: targets.size
      });
    }

    return report;
  }
}

/**
 * Completeness Checker
 */
class CompletenessChecker {
  constructor(options = {}) {
    this.requiredFields = options.requiredFields || {};
    this.requiredSections = options.requiredSections || {};
  }

  setRequiredFields(type, fields) {
    this.requiredFields[type] = fields;
    return this;
  }

  setRequiredSections(type, sections) {
    this.requiredSections[type] = sections;
    return this;
  }

  checkArtifact(artifact) {
    const issues = [];

    // Check required fields
    const requiredFields = this.requiredFields[artifact.type] || [];
    for (const field of requiredFields) {
      const value = artifact[field] || artifact.metadata?.[field];
      if (value === undefined || value === null || value === '') {
        issues.push(new ValidationIssue({
          type: ValidationType.COMPLETENESS,
          severity: Severity.ERROR,
          message: `Missing required field "${field}" in ${artifact.type} "${artifact.name}"`,
          artifact: artifact.id,
          location: field
        }));
      }
    }

    // Check required sections (for document-like artifacts)
    const requiredSections = this.requiredSections[artifact.type] || [];
    const content = artifact.content || '';
    
    for (const section of requiredSections) {
      const sectionPattern = new RegExp(`^##?\\s+${section}`, 'im');
      if (!sectionPattern.test(content)) {
        issues.push(new ValidationIssue({
          type: ValidationType.COMPLETENESS,
          severity: Severity.WARNING,
          message: `Missing section "${section}" in ${artifact.type} "${artifact.name}"`,
          artifact: artifact.id,
          suggestion: `Add a "## ${section}" section`
        }));
      }
    }

    return {
      complete: issues.filter(i => i.severity === Severity.ERROR).length === 0,
      issues,
      artifact: artifact.id
    };
  }

  checkAll(artifacts) {
    const results = [];
    
    for (const artifact of artifacts) {
      results.push(this.checkArtifact(artifact));
    }

    const allIssues = results.flatMap(r => r.issues);
    const completeCount = results.filter(r => r.complete).length;

    return {
      valid: allIssues.filter(i => i.severity === Severity.ERROR).length === 0,
      completeness: (completeCount / artifacts.length) * 100,
      results,
      issues: allIssues
    };
  }
}

/**
 * Dependency Validator
 */
class DependencyValidator {
  constructor(options = {}) {
    this.dependencies = new Map();
    this.allowCycles = options.allowCycles || false;
  }

  addDependency(from, to) {
    if (!this.dependencies.has(from)) {
      this.dependencies.set(from, new Set());
    }
    this.dependencies.get(from).add(to);
    return this;
  }

  removeDependency(from, to) {
    const deps = this.dependencies.get(from);
    if (deps) {
      deps.delete(to);
    }
    return this;
  }

  getDependencies(id) {
    return [...(this.dependencies.get(id) || [])];
  }

  getDependents(id) {
    const dependents = [];
    for (const [from, tos] of this.dependencies) {
      if (tos.has(id)) {
        dependents.push(from);
      }
    }
    return dependents;
  }

  detectCycles() {
    const cycles = [];
    const visited = new Set();
    const stack = new Set();

    const dfs = (node, path = []) => {
      if (stack.has(node)) {
        const cycleStart = path.indexOf(node);
        cycles.push(path.slice(cycleStart).concat(node));
        return;
      }

      if (visited.has(node)) return;

      visited.add(node);
      stack.add(node);
      path.push(node);

      const deps = this.dependencies.get(node) || new Set();
      for (const dep of deps) {
        dfs(dep, [...path]);
      }

      stack.delete(node);
    };

    for (const node of this.dependencies.keys()) {
      dfs(node);
    }

    return cycles;
  }

  validate(artifacts) {
    const issues = [];
    const artifactIds = new Set(artifacts.map(a => a.id));

    // Check for missing dependencies
    for (const [from, tos] of this.dependencies) {
      if (!artifactIds.has(from)) {
        issues.push(new ValidationIssue({
          type: ValidationType.DEPENDENCY,
          severity: Severity.ERROR,
          message: `Dependency source "${from}" not found in artifacts`,
          artifact: from
        }));
      }

      for (const to of tos) {
        if (!artifactIds.has(to)) {
          issues.push(new ValidationIssue({
            type: ValidationType.DEPENDENCY,
            severity: Severity.ERROR,
            message: `Dependency target "${to}" not found (required by "${from}")`,
            artifact: from,
            relatedArtifacts: [to]
          }));
        }
      }
    }

    // Check for cycles
    if (!this.allowCycles) {
      const cycles = this.detectCycles();
      for (const cycle of cycles) {
        issues.push(new ValidationIssue({
          type: ValidationType.DEPENDENCY,
          severity: Severity.ERROR,
          message: `Circular dependency detected: ${cycle.join(' → ')}`,
          metadata: { cycle }
        }));
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      cycles: this.detectCycles()
    };
  }

  getTopologicalOrder() {
    const sorted = [];
    const visited = new Set();
    const temp = new Set();

    const visit = (node) => {
      if (temp.has(node)) return false; // cycle
      if (visited.has(node)) return true;

      temp.add(node);
      const deps = this.dependencies.get(node) || new Set();
      
      for (const dep of deps) {
        if (!visit(dep)) return false;
      }

      temp.delete(node);
      visited.add(node);
      sorted.unshift(node);
      return true;
    };

    for (const node of this.dependencies.keys()) {
      if (!visit(node)) return null; // cycle detected
    }

    return sorted;
  }
}

/**
 * Reference Validator
 */
class ReferenceValidator {
  constructor(options = {}) {
    this.references = new Map();
    this.patterns = options.patterns || {
      requirement: /REQ-\d+/g,
      design: /DES-\d+/g,
      test: /TEST-\d+/g,
      issue: /#\d+/g
    };
  }

  registerReference(id, artifact) {
    this.references.set(id, artifact);
    return this;
  }

  extractReferences(content) {
    const refs = [];

    for (const [type, pattern] of Object.entries(this.patterns)) {
      const matches = content.match(pattern) || [];
      for (const match of matches) {
        refs.push({ type, id: match });
      }
    }

    return refs;
  }

  validate(artifacts) {
    const issues = [];

    for (const artifact of artifacts) {
      const content = artifact.content || '';
      const refs = this.extractReferences(content);

      for (const ref of refs) {
        if (!this.references.has(ref.id)) {
          issues.push(new ValidationIssue({
            type: ValidationType.REFERENCE,
            severity: Severity.WARNING,
            message: `Reference "${ref.id}" not found`,
            artifact: artifact.id,
            metadata: { referenceType: ref.type, referenceId: ref.id }
          }));
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      totalReferences: this.references.size
    };
  }
}

/**
 * Advanced Validator (Main Class)
 */
class AdvancedValidator extends EventEmitter {
  constructor(options = {}) {
    super();
    this.consistencyChecker = new ConsistencyChecker(options.consistency);
    this.gapDetector = new GapDetector(options.gaps);
    this.completenessChecker = new CompletenessChecker(options.completeness);
    this.dependencyValidator = new DependencyValidator(options.dependencies);
    this.referenceValidator = new ReferenceValidator(options.references);
    this.artifacts = new Map();
    this.validationHistory = [];
  }

  // Artifact Management
  registerArtifact(artifact) {
    if (!(artifact instanceof ArtifactReference)) {
      artifact = new ArtifactReference(
        artifact.type,
        artifact.id,
        artifact
      );
    }
    this.artifacts.set(artifact.id, artifact);
    this.referenceValidator.registerReference(artifact.id, artifact);
    this.emit('artifact:registered', artifact);
    return this;
  }

  getArtifact(id) {
    return this.artifacts.get(id);
  }

  getAllArtifacts() {
    return [...this.artifacts.values()];
  }

  // Link Management
  addLink(sourceId, targetId) {
    this.gapDetector.addLink(sourceId, targetId);
    this.dependencyValidator.addDependency(sourceId, targetId);
    return this;
  }

  // Validation Methods
  validateConsistency() {
    const artifacts = this.getAllArtifacts();
    const result = this.consistencyChecker.check(artifacts);
    this.recordValidation('consistency', result);
    return result;
  }

  validateGaps() {
    const artifacts = this.getAllArtifacts();
    const result = this.gapDetector.detectGaps(artifacts);
    this.recordValidation('gaps', result);
    return result;
  }

  validateCompleteness() {
    const artifacts = this.getAllArtifacts();
    const result = this.completenessChecker.checkAll(artifacts);
    this.recordValidation('completeness', result);
    return result;
  }

  validateDependencies() {
    const artifacts = this.getAllArtifacts();
    const result = this.dependencyValidator.validate(artifacts);
    this.recordValidation('dependencies', result);
    return result;
  }

  validateReferences() {
    const artifacts = this.getAllArtifacts();
    const result = this.referenceValidator.validate(artifacts);
    this.recordValidation('references', result);
    return result;
  }

  validateAll() {
    const results = {
      consistency: this.validateConsistency(),
      gaps: this.validateGaps(),
      completeness: this.validateCompleteness(),
      dependencies: this.validateDependencies(),
      references: this.validateReferences()
    };

    const allIssues = [
      ...results.consistency.issues,
      ...results.gaps.gaps,
      ...results.completeness.issues,
      ...results.dependencies.issues,
      ...results.references.issues
    ];

    const valid = !allIssues.some(i => 
      i.severity === Severity.CRITICAL || i.severity === Severity.ERROR
    );

    this.emit('validation:complete', { results, valid, issues: allIssues });

    return {
      valid,
      results,
      issues: allIssues,
      summary: {
        totalArtifacts: this.artifacts.size,
        totalIssues: allIssues.length,
        criticalIssues: allIssues.filter(i => i.severity === Severity.CRITICAL).length,
        errorIssues: allIssues.filter(i => i.severity === Severity.ERROR).length,
        warningIssues: allIssues.filter(i => i.severity === Severity.WARNING).length,
        gapCoverage: results.gaps.coverage,
        completeness: results.completeness.completeness
      }
    };
  }

  recordValidation(type, result) {
    this.validationHistory.push({
      type,
      result,
      timestamp: new Date()
    });

    // Keep last 100 validations
    if (this.validationHistory.length > 100) {
      this.validationHistory = this.validationHistory.slice(-100);
    }
  }

  getValidationHistory(type = null) {
    if (type) {
      return this.validationHistory.filter(v => v.type === type);
    }
    return this.validationHistory;
  }

  // Report Generation
  generateReport() {
    const validation = this.validateAll();
    const lines = [
      '# Validation Report',
      '',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Summary',
      '',
      `- **Status**: ${validation.valid ? '✅ Valid' : '❌ Invalid'}`,
      `- **Total Artifacts**: ${validation.summary.totalArtifacts}`,
      `- **Total Issues**: ${validation.summary.totalIssues}`,
      `- **Gap Coverage**: ${validation.summary.gapCoverage.toFixed(1)}%`,
      `- **Completeness**: ${validation.summary.completeness.toFixed(1)}%`,
      '',
      '## Issues by Severity',
      '',
      `- Critical: ${validation.summary.criticalIssues}`,
      `- Error: ${validation.summary.errorIssues}`,
      `- Warning: ${validation.summary.warningIssues}`,
      ''
    ];

    if (validation.issues.length > 0) {
      lines.push('## Issues', '');

      for (const issue of validation.issues) {
        const icon = issue.severity === 'critical' ? '🔴' : 
                    issue.severity === 'error' ? '🟠' : '🟡';
        lines.push(`### ${icon} ${issue.message}`);
        lines.push('');
        lines.push(`- Type: ${issue.type}`);
        lines.push(`- Severity: ${issue.severity}`);
        if (issue.artifact) lines.push(`- Artifact: ${issue.artifact}`);
        if (issue.suggestion) lines.push(`- Suggestion: ${issue.suggestion}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}

/**
 * Factory function
 */
function createAdvancedValidator(options = {}) {
  const validator = new AdvancedValidator(options);

  // Add default consistency rules
  validator.consistencyChecker.addRule(
    ConsistencyChecker.createNamingConsistencyRule()
  );
  validator.consistencyChecker.addRule(
    ConsistencyChecker.createVersionConsistencyRule()
  );

  // Set default completeness requirements
  validator.completenessChecker.setRequiredFields(ArtifactType.REQUIREMENT, [
    'name', 'description'
  ]);
  validator.completenessChecker.setRequiredFields(ArtifactType.DESIGN, [
    'name', 'description'
  ]);
  validator.completenessChecker.setRequiredSections(ArtifactType.STEERING, [
    'Overview', 'Purpose'
  ]);

  return validator;
}

module.exports = {
  // Constants
  ValidationType,
  Severity,
  ArtifactType,
  
  // Classes
  ValidationIssue,
  ArtifactReference,
  ConsistencyChecker,
  GapDetector,
  CompletenessChecker,
  DependencyValidator,
  ReferenceValidator,
  AdvancedValidator,
  
  // Factory
  createAdvancedValidator
};
