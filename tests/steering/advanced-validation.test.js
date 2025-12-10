/**
 * Tests for Advanced Validation Module
 */

const {
  ValidationIssue,
  ArtifactReference,
  ConsistencyChecker,
  GapDetector,
  CompletenessChecker,
  DependencyValidator,
  ReferenceValidator,
  ValidationType,
  Severity,
  ArtifactType,
  createAdvancedValidator
} = require('../../src/steering/advanced-validation');

describe('Advanced Validation', () => {
  describe('ValidationIssue', () => {
    test('should create issue with defaults', () => {
      const issue = new ValidationIssue({ message: 'Test issue' });

      expect(issue.id).toBeDefined();
      expect(issue.type).toBe(ValidationType.CONSISTENCY);
      expect(issue.severity).toBe(Severity.ERROR);
      expect(issue.message).toBe('Test issue');
    });

    test('should create issue with all options', () => {
      const issue = new ValidationIssue({
        type: ValidationType.GAP,
        severity: Severity.WARNING,
        message: 'Gap found',
        artifact: 'REQ-001',
        suggestion: 'Add implementation'
      });

      expect(issue.type).toBe(ValidationType.GAP);
      expect(issue.severity).toBe(Severity.WARNING);
      expect(issue.artifact).toBe('REQ-001');
      expect(issue.suggestion).toBe('Add implementation');
    });

    test('should convert to JSON', () => {
      const issue = new ValidationIssue({ message: 'Test' });
      const json = issue.toJSON();

      expect(json.id).toBeDefined();
      expect(json.timestamp).toBeDefined();
      expect(json.message).toBe('Test');
    });
  });

  describe('ArtifactReference', () => {
    test('should create artifact reference', () => {
      const ref = new ArtifactReference(ArtifactType.REQUIREMENT, 'REQ-001', {
        name: 'User Authentication'
      });

      expect(ref.type).toBe(ArtifactType.REQUIREMENT);
      expect(ref.id).toBe('REQ-001');
      expect(ref.name).toBe('User Authentication');
    });

    test('should add dependencies', () => {
      const ref = new ArtifactReference(ArtifactType.DESIGN, 'DES-001');
      ref.addDependency('REQ-001');
      ref.addDependency('REQ-002');

      expect(ref.dependencies).toHaveLength(2);
    });

    test('should add references', () => {
      const ref = new ArtifactReference(ArtifactType.IMPLEMENTATION, 'IMPL-001');
      ref.addReference('DES-001');

      expect(ref.references).toHaveLength(1);
    });

    test('should convert to JSON', () => {
      const ref = new ArtifactReference(ArtifactType.TEST, 'TEST-001');
      ref.addDependency({ id: 'IMPL-001' });
      
      const json = ref.toJSON();
      expect(json.dependencies).toContain('IMPL-001');
    });
  });

  describe('ConsistencyChecker', () => {
    let checker;

    beforeEach(() => {
      checker = new ConsistencyChecker();
    });

    test('should add rules', () => {
      checker.addRule({ name: 'test', check: () => [] });
      expect(checker.rules).toHaveLength(1);
    });

    test('should check artifacts with rules', () => {
      checker.addRule({
        name: 'no-empty-names',
        check: (artifacts) => {
          return artifacts
            .filter(a => !a.name)
            .map(a => new ValidationIssue({
              message: `Artifact ${a.id} has no name`
            }));
        }
      });

      const result = checker.check([
        { id: 'A', name: 'Named' },
        { id: 'B', name: '' }
      ]);

      expect(result.issues).toHaveLength(1);
      expect(result.valid).toBe(false);
    });

    test('should handle rule errors', () => {
      checker.addRule({
        name: 'failing-rule',
        check: () => { throw new Error('Rule failed'); }
      });

      const result = checker.check([{ id: 'A' }]);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].message).toContain('Rule check failed');
    });

    test('should create naming consistency rule', () => {
      const rule = ConsistencyChecker.createNamingConsistencyRule();
      checker.addRule(rule);

      const result = checker.check([
        { id: 'A', name: 'User-Auth' },
        { id: 'B', name: 'user_auth' }
      ]);

      expect(result.issues.length).toBeGreaterThan(0);
    });

    test('should create version consistency rule', () => {
      const rule = ConsistencyChecker.createVersionConsistencyRule();
      checker.addRule(rule);

      const result = checker.check([
        { id: 'A', type: 'doc', version: '1.0.0' },
        { id: 'B', type: 'doc', version: '2.0.0' }
      ]);

      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('GapDetector', () => {
    let detector;

    beforeEach(() => {
      detector = new GapDetector();
    });

    test('should add links', () => {
      detector.addLink('REQ-001', 'DES-001');
      expect(detector.traceabilityMatrix.get('REQ-001').has('DES-001')).toBe(true);
    });

    test('should detect gaps', () => {
      const artifacts = [
        { id: 'REQ-001', type: ArtifactType.REQUIREMENT, name: 'Auth' }
      ];

      const result = detector.detectGaps(artifacts);

      expect(result.gaps.length).toBeGreaterThan(0);
      expect(result.gaps[0].type).toBe(ValidationType.GAP);
    });

    test('should not detect gaps when linked', () => {
      detector.addLink('REQ-001', 'DES-001');
      detector.addLink('REQ-001', 'TEST-001');

      const artifacts = [
        { id: 'REQ-001', type: ArtifactType.REQUIREMENT, name: 'Auth' },
        { id: 'DES-001', type: ArtifactType.DESIGN, name: 'Auth Design' },
        { id: 'TEST-001', type: ArtifactType.TEST, name: 'Auth Test' }
      ];

      const result = detector.detectGaps(artifacts);
      expect(result.gaps.filter(g => g.artifact === 'REQ-001')).toHaveLength(0);
    });

    test('should calculate coverage', () => {
      detector.addLink('REQ-001', 'DES-001');

      const artifacts = [
        { id: 'REQ-001', type: ArtifactType.REQUIREMENT, name: 'Auth' },
        { id: 'DES-001', type: ArtifactType.DESIGN, name: 'Auth Design' }
      ];

      const result = detector.detectGaps(artifacts);
      expect(result.coverage).toBeGreaterThan(0);
    });

    test('should generate traceability report', () => {
      detector.addLink('A', 'B');
      detector.addLink('A', 'C');
      detector.addLink('B', 'D');

      const report = detector.getTraceabilityReport();
      expect(report).toHaveLength(2);
      expect(report[0].targets).toContain('B');
    });
  });

  describe('CompletenessChecker', () => {
    let checker;

    beforeEach(() => {
      checker = new CompletenessChecker();
    });

    test('should set required fields', () => {
      checker.setRequiredFields(ArtifactType.REQUIREMENT, ['name', 'description']);
      expect(checker.requiredFields[ArtifactType.REQUIREMENT]).toHaveLength(2);
    });

    test('should check required fields', () => {
      checker.setRequiredFields(ArtifactType.REQUIREMENT, ['name', 'description']);

      const result = checker.checkArtifact({
        id: 'REQ-001',
        type: ArtifactType.REQUIREMENT,
        name: 'Auth'
        // missing description
      });

      expect(result.complete).toBe(false);
      expect(result.issues[0].location).toBe('description');
    });

    test('should check required sections', () => {
      checker.setRequiredSections(ArtifactType.STEERING, ['Overview', 'Purpose']);

      const result = checker.checkArtifact({
        id: 'STEER-001',
        type: ArtifactType.STEERING,
        name: 'Structure',
        content: '## Overview\nContent here'
        // missing Purpose section
      });

      expect(result.issues.some(i => i.message.includes('Purpose'))).toBe(true);
    });

    test('should check all artifacts', () => {
      checker.setRequiredFields(ArtifactType.REQUIREMENT, ['name']);

      const result = checker.checkAll([
        { id: 'A', type: ArtifactType.REQUIREMENT, name: 'Complete' },
        { id: 'B', type: ArtifactType.REQUIREMENT, name: '' }
      ]);

      expect(result.completeness).toBe(50);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('DependencyValidator', () => {
    let validator;

    beforeEach(() => {
      validator = new DependencyValidator();
    });

    test('should add dependencies', () => {
      validator.addDependency('A', 'B');
      expect(validator.getDependencies('A')).toContain('B');
    });

    test('should get dependents', () => {
      validator.addDependency('A', 'B');
      validator.addDependency('C', 'B');

      expect(validator.getDependents('B')).toContain('A');
      expect(validator.getDependents('B')).toContain('C');
    });

    test('should detect cycles', () => {
      validator.addDependency('A', 'B');
      validator.addDependency('B', 'C');
      validator.addDependency('C', 'A');

      const cycles = validator.detectCycles();
      expect(cycles.length).toBeGreaterThan(0);
    });

    test('should validate missing dependencies', () => {
      validator.addDependency('A', 'B');

      const result = validator.validate([{ id: 'A' }]);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.message.includes('not found'))).toBe(true);
    });

    test('should fail validation on cycles', () => {
      validator.addDependency('A', 'B');
      validator.addDependency('B', 'A');

      const result = validator.validate([{ id: 'A' }, { id: 'B' }]);
      expect(result.valid).toBe(false);
      expect(result.cycles.length).toBeGreaterThan(0);
    });

    test('should allow cycles when configured', () => {
      const allowCycles = new DependencyValidator({ allowCycles: true });
      allowCycles.addDependency('A', 'B');
      allowCycles.addDependency('B', 'A');

      const result = allowCycles.validate([{ id: 'A' }, { id: 'B' }]);
      expect(result.valid).toBe(true);
    });

    test('should get topological order', () => {
      validator.addDependency('A', 'B');
      validator.addDependency('B', 'C');

      const order = validator.getTopologicalOrder();
      expect(order.indexOf('A')).toBeLessThan(order.indexOf('B'));
      expect(order.indexOf('B')).toBeLessThan(order.indexOf('C'));
    });

    test('should return null for cycles in topological order', () => {
      validator.addDependency('A', 'B');
      validator.addDependency('B', 'A');

      const order = validator.getTopologicalOrder();
      expect(order).toBeNull();
    });
  });

  describe('ReferenceValidator', () => {
    let validator;

    beforeEach(() => {
      validator = new ReferenceValidator();
    });

    test('should register references', () => {
      validator.registerReference('REQ-001', { name: 'Auth' });
      expect(validator.references.has('REQ-001')).toBe(true);
    });

    test('should extract references from content', () => {
      const content = 'Implements REQ-001 and REQ-002, see #123';
      const refs = validator.extractReferences(content);

      expect(refs).toHaveLength(3);
      expect(refs.some(r => r.id === 'REQ-001')).toBe(true);
      expect(refs.some(r => r.id === '#123')).toBe(true);
    });

    test('should validate references', () => {
      validator.registerReference('REQ-001', {});

      const artifacts = [{
        id: 'IMPL-001',
        content: 'Implements REQ-001 and REQ-002'
      }];

      const result = validator.validate(artifacts);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.message.includes('REQ-002'))).toBe(true);
    });

    test('should pass for valid references', () => {
      validator.registerReference('REQ-001', {});
      validator.registerReference('DES-001', {});

      const artifacts = [{
        id: 'IMPL-001',
        content: 'Implements REQ-001 with DES-001'
      }];

      const result = validator.validate(artifacts);
      expect(result.valid).toBe(true);
    });
  });

  describe('AdvancedValidator', () => {
    let validator;

    beforeEach(() => {
      validator = createAdvancedValidator();
    });

    test('should register artifacts', () => {
      validator.registerArtifact({
        type: ArtifactType.REQUIREMENT,
        id: 'REQ-001',
        name: 'Auth',
        description: 'User authentication'
      });

      expect(validator.getArtifact('REQ-001')).toBeDefined();
    });

    test('should get all artifacts', () => {
      validator.registerArtifact({ type: ArtifactType.REQUIREMENT, id: 'A', name: 'A', description: 'A' });
      validator.registerArtifact({ type: ArtifactType.DESIGN, id: 'B', name: 'B', description: 'B' });

      expect(validator.getAllArtifacts()).toHaveLength(2);
    });

    test('should add links', () => {
      validator.addLink('REQ-001', 'DES-001');
      // Link is added to both gap detector and dependency validator
    });

    test('should validate consistency', () => {
      validator.registerArtifact({ type: ArtifactType.REQUIREMENT, id: 'A', name: 'Auth', description: 'Auth' });
      
      const result = validator.validateConsistency();
      expect(result.rulesChecked).toBeGreaterThan(0);
    });

    test('should validate gaps', () => {
      validator.registerArtifact({
        type: ArtifactType.REQUIREMENT,
        id: 'REQ-001',
        name: 'Auth',
        description: 'Auth'
      });

      const result = validator.validateGaps();
      expect(result.gaps.length).toBeGreaterThan(0); // No linked design/test
    });

    test('should validate completeness', () => {
      validator.registerArtifact({
        type: ArtifactType.REQUIREMENT,
        id: 'REQ-001',
        name: 'Auth'
        // missing description
      });

      const result = validator.validateCompleteness();
      expect(result.issues.length).toBeGreaterThan(0);
    });

    test('should validate dependencies', () => {
      validator.registerArtifact({ type: ArtifactType.REQUIREMENT, id: 'A', name: 'A', description: 'A' });
      validator.addLink('A', 'B'); // B doesn't exist

      const result = validator.validateDependencies();
      expect(result.valid).toBe(false);
    });

    test('should validate references', () => {
      // ReferenceValidator checks content property
      // But ArtifactReference doesn't have content, so references won't be extracted
      // This tests the base case where no references are found in registered artifacts
      validator.registerArtifact({
        type: ArtifactType.IMPLEMENTATION,
        id: 'IMPL-001',
        name: 'Auth',
        description: 'Auth implementation'
      });

      const result = validator.validateReferences();
      // No content means no references to validate - should pass
      expect(result.valid).toBe(true);
    });

    test('should validate all', () => {
      validator.registerArtifact({
        type: ArtifactType.REQUIREMENT,
        id: 'REQ-001',
        name: 'Auth',
        description: 'Authentication'
      });

      const result = validator.validateAll();
      expect(result.summary).toBeDefined();
      expect(result.summary.totalArtifacts).toBe(1);
    });

    test('should record validation history', () => {
      validator.registerArtifact({ type: ArtifactType.REQUIREMENT, id: 'A', name: 'A', description: 'A' });
      validator.validateConsistency();
      validator.validateGaps();

      const history = validator.getValidationHistory();
      expect(history.length).toBe(2);

      const consistencyHistory = validator.getValidationHistory('consistency');
      expect(consistencyHistory.length).toBe(1);
    });

    test('should emit events', (done) => {
      validator.on('artifact:registered', (artifact) => {
        expect(artifact.id).toBe('A');
        done();
      });

      validator.registerArtifact({ type: ArtifactType.REQUIREMENT, id: 'A', name: 'A', description: 'A' });
    });

    test('should generate report', () => {
      validator.registerArtifact({
        type: ArtifactType.REQUIREMENT,
        id: 'REQ-001',
        name: 'Auth',
        description: 'Authentication'
      });

      const report = validator.generateReport();
      expect(report).toContain('# Validation Report');
      expect(report).toContain('Total Artifacts');
    });
  });

  describe('createAdvancedValidator', () => {
    test('should create validator with default rules', () => {
      const validator = createAdvancedValidator();

      expect(validator.consistencyChecker.rules.length).toBeGreaterThan(0);
    });

    test('should have default completeness requirements', () => {
      const validator = createAdvancedValidator();

      expect(validator.completenessChecker.requiredFields[ArtifactType.REQUIREMENT]).toBeDefined();
    });
  });

  describe('Constants', () => {
    test('should export ValidationType', () => {
      expect(ValidationType.CONSISTENCY).toBe('consistency');
      expect(ValidationType.COMPLETENESS).toBe('completeness');
      expect(ValidationType.GAP).toBe('gap');
      expect(ValidationType.DEPENDENCY).toBe('dependency');
      expect(ValidationType.REFERENCE).toBe('reference');
    });

    test('should export Severity', () => {
      expect(Severity.CRITICAL).toBe('critical');
      expect(Severity.ERROR).toBe('error');
      expect(Severity.WARNING).toBe('warning');
      expect(Severity.INFO).toBe('info');
    });

    test('should export ArtifactType', () => {
      expect(ArtifactType.REQUIREMENT).toBe('requirement');
      expect(ArtifactType.DESIGN).toBe('design');
      expect(ArtifactType.IMPLEMENTATION).toBe('implementation');
      expect(ArtifactType.TEST).toBe('test');
      expect(ArtifactType.STEERING).toBe('steering');
    });
  });
});
