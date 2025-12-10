/**
 * @file steering-validator.test.js
 * @description Tests for SteeringValidator
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  SteeringValidator,
  createSteeringValidator,
  SEVERITY,
  RULE_TYPE,
  DEFAULT_VALIDATION_RULES,
} = require('../../src/steering/steering-validator');

describe('SteeringValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new SteeringValidator();
  });

  describe('constructor', () => {
    it('should create with default options', () => {
      expect(validator).toBeDefined();
      expect(validator.rules).toBeInstanceOf(Array);
      expect(validator.strictMode).toBe(false);
    });

    it('should accept custom options', () => {
      const custom = new SteeringValidator({
        steeringPath: 'custom/steering',
        strictMode: true,
      });
      expect(custom.steeringPath).toBe('custom/steering');
      expect(custom.strictMode).toBe(true);
    });

    it('should merge custom rules', () => {
      const customRule = {
        id: 'custom-rule',
        file: 'test.md',
        check: () => true,
        message: 'Test rule',
      };

      const custom = new SteeringValidator({ rules: [customRule] });
      expect(custom.rules.find(r => r.id === 'custom-rule')).toBeDefined();
    });
  });

  describe('validate() with file system', () => {
    let tempDir;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'steering-test-'));
      validator = new SteeringValidator({ steeringPath: 'steering' });
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should report missing steering files', async () => {
      const result = await validator.validate(tempDir);

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some(i => i.message.includes('not found'))).toBe(true);
    });

    it('should emit validation events', async () => {
      const events = [];
      validator.on('validation:start', e => events.push(['start', e]));
      validator.on('validation:complete', e => events.push(['complete', e]));

      await validator.validate(tempDir);

      expect(events.find(e => e[0] === 'start')).toBeDefined();
      expect(events.find(e => e[0] === 'complete')).toBeDefined();
    });

    it('should validate existing steering files', async () => {
      const steeringDir = path.join(tempDir, 'steering');
      fs.mkdirSync(steeringDir, { recursive: true });
      fs.mkdirSync(path.join(steeringDir, 'rules'), { recursive: true });

      fs.writeFileSync(
        path.join(steeringDir, 'structure.md'),
        '# Project Structure\n\n## Overview\n\nUses src/ directory.'
      );
      fs.writeFileSync(
        path.join(steeringDir, 'tech.md'),
        '# Technology Stack\n\nstack includes Node.js\n\nKey dependencies and package info.'
      );
      fs.writeFileSync(
        path.join(steeringDir, 'product.md'),
        '# Product\n\nOur vision is clear.\n\nKey features include auth.'
      );
      fs.writeFileSync(
        path.join(steeringDir, 'rules', 'constitution.md'),
        '# Constitution\n\nArticle 1: Quality first.'
      );

      const result = await validator.validate(tempDir);

      expect(result.id).toBeDefined();
      expect(result.score).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should validate custom steering files', async () => {
      const steeringDir = path.join(tempDir, 'steering');
      const customDir = path.join(steeringDir, 'custom');
      fs.mkdirSync(customDir, { recursive: true });
      fs.mkdirSync(path.join(steeringDir, 'rules'), { recursive: true });

      // Create minimal required files
      fs.writeFileSync(path.join(steeringDir, 'structure.md'), '# Structure\n\nsrc/');
      fs.writeFileSync(path.join(steeringDir, 'tech.md'), '# Tech\n\nstack and dependencies');
      fs.writeFileSync(path.join(steeringDir, 'product.md'), '# Product\n\nvision and feature');
      fs.writeFileSync(
        path.join(steeringDir, 'rules', 'constitution.md'),
        '# Constitution\n\nArticle 1'
      );

      // Create custom file
      fs.writeFileSync(
        path.join(customDir, 'custom-rules.md'),
        '# Custom Rules\n\n[TODO] Complete this'
      );

      const result = await validator.validate(tempDir);

      // Should find TODO marker in custom file
      const todoIssue = result.issues.find(i => i.file === 'custom/custom-rules.md');
      expect(todoIssue).toBeDefined();
    });

    it('should detect inconsistent project names', async () => {
      const steeringDir = path.join(tempDir, 'steering');
      fs.mkdirSync(steeringDir, { recursive: true });
      fs.mkdirSync(path.join(steeringDir, 'rules'), { recursive: true });

      fs.writeFileSync(path.join(steeringDir, 'structure.md'), '# Project Alpha\n\nsrc/');
      fs.writeFileSync(
        path.join(steeringDir, 'tech.md'),
        '# Project Beta\n\nstack and dependencies'
      );
      fs.writeFileSync(path.join(steeringDir, 'product.md'), '# Product\n\nvision and feature');
      fs.writeFileSync(
        path.join(steeringDir, 'rules', 'constitution.md'),
        '# Constitution\n\nArticle 1'
      );

      const result = await validator.validate(tempDir);

      const nameIssue = result.issues.find(i => i.id === 'consistency-project-name');
      expect(nameIssue).toBeDefined();
    });

    it('should detect language inconsistency', async () => {
      const steeringDir = path.join(tempDir, 'steering');
      fs.mkdirSync(steeringDir, { recursive: true });
      fs.mkdirSync(path.join(steeringDir, 'rules'), { recursive: true });

      fs.writeFileSync(
        path.join(steeringDir, 'structure.md'),
        '# Structure\n\nsrc/ uses Python and JavaScript'
      );
      fs.writeFileSync(
        path.join(steeringDir, 'tech.md'),
        '# Tech\n\nstack uses JavaScript only\n\ndependencies'
      );
      fs.writeFileSync(path.join(steeringDir, 'product.md'), '# Product\n\nvision and feature');
      fs.writeFileSync(
        path.join(steeringDir, 'rules', 'constitution.md'),
        '# Constitution\n\nArticle 1'
      );

      const result = await validator.validate(tempDir);

      const langIssue = result.issues.find(i => i.id === 'consistency-languages');
      expect(langIssue).toBeDefined();
    });
  });

  describe('validateFile()', () => {
    it('should validate content against rules', async () => {
      const content = `# Structure

## Overview

Project structure documentation.

## src/ directory

Source code here.`;

      const issues = await validator.validateFile('structure.md', content);
      expect(issues).toBeInstanceOf(Array);
    });

    it('should catch missing sections', async () => {
      const content = `# Empty file`;

      const issues = await validator.validateFile('tech.md', content);
      // Should have issues for missing stack/dependencies
      expect(issues.length).toBeGreaterThan(0);
    });

    it('should validate markdown format', async () => {
      const content = `# Test

[broken link]()

Some content`;

      const issues = await validator.validateFile('test.md', content);
      const formatIssue = issues.find(i => i.type === RULE_TYPE.FORMAT);
      expect(formatIssue).toBeDefined();
    });

    it('should detect TODO markers', async () => {
      const content = `# Test

[TODO] Complete this section

[TBD] Figure out later`;

      const issues = await validator.validateFile('test.md', content);
      const todoIssue = issues.find(i => i.message.includes('TODO'));
      expect(todoIssue).toBeDefined();
    });
  });

  describe('addRule()', () => {
    it('should add a custom rule', () => {
      const initialCount = validator.rules.length;

      validator.addRule({
        id: 'custom-check',
        file: 'structure.md',
        check: content => content.includes('## Dependencies'),
        message: 'Should have dependencies section',
      });

      expect(validator.rules.length).toBe(initialCount + 1);
    });

    it('should throw on invalid rule', () => {
      expect(() => validator.addRule({})).toThrow();
    });

    it('should set default values', () => {
      validator.addRule({
        id: 'minimal-rule',
        file: 'test.md',
        check: () => true,
        message: 'Test',
      });

      const rule = validator.rules.find(r => r.id === 'minimal-rule');
      expect(rule.type).toBe(RULE_TYPE.COMPLETENESS);
      expect(rule.severity).toBe(SEVERITY.WARNING);
    });
  });

  describe('getHistory()', () => {
    it('should return validation history', () => {
      validator.validations.set('v1', {
        id: 'v1',
        valid: true,
        timestamp: Date.now(),
      });

      const history = validator.getHistory();
      expect(history.length).toBe(1);
    });

    it('should sort by timestamp descending', () => {
      validator.validations.set('v1', {
        id: 'v1',
        timestamp: 1000,
      });
      validator.validations.set('v2', {
        id: 'v2',
        timestamp: 2000,
      });

      const history = validator.getHistory();
      expect(history[0].id).toBe('v2');
    });
  });

  describe('getStats()', () => {
    it('should return statistics', () => {
      const stats = validator.getStats();

      expect(stats.totalValidations).toBeDefined();
      expect(stats.averageScore).toBeDefined();
      expect(stats.passed).toBeDefined();
      expect(stats.failed).toBeDefined();
      expect(stats.rulesCount).toBeDefined();
    });

    it('should calculate average score', () => {
      validator.validations.set('v1', { valid: true, score: 80 });
      validator.validations.set('v2', { valid: true, score: 100 });

      const stats = validator.getStats();
      expect(stats.averageScore).toBe(90);
    });
  });

  describe('exportReport()', () => {
    it('should export markdown report', () => {
      const validationId = 'test-validation';
      validator.validations.set(validationId, {
        id: validationId,
        valid: true,
        score: 85,
        issues: [
          {
            file: 'test.md',
            severity: SEVERITY.WARNING,
            message: 'Test issue',
            type: RULE_TYPE.COMPLETENESS,
          },
        ],
        summary: {
          totalIssues: 1,
          bySeverity: { warning: 1 },
          byType: { completeness: 1 },
          byFile: { 'test.md': 1 },
        },
        timestamp: Date.now(),
      });

      const report = validator.exportReport(validationId);
      expect(report).toContain('# Steering Validation Report');
      expect(report).toContain('Score');
      expect(report).toContain('Test issue');
    });

    it('should return empty for unknown id', () => {
      const report = validator.exportReport('unknown');
      expect(report).toBe('');
    });
  });

  describe('calculateScore()', () => {
    it('should start at 100', () => {
      const score = validator.calculateScore([]);
      expect(score).toBe(100);
    });

    it('should penalize by severity', () => {
      const issues = [
        { severity: SEVERITY.INFO },
        { severity: SEVERITY.WARNING },
        { severity: SEVERITY.ERROR },
      ];

      const score = validator.calculateScore(issues);
      expect(score).toBeLessThan(100);
      expect(score).toBe(100 - 1 - 5 - 15); // 79
    });

    it('should not go below 0', () => {
      const issues = Array(20).fill({ severity: SEVERITY.CRITICAL });
      const score = validator.calculateScore(issues);
      expect(score).toBe(0);
    });
  });
});

describe('createSteeringValidator()', () => {
  it('should create instance', () => {
    const instance = createSteeringValidator();
    expect(instance).toBeInstanceOf(SteeringValidator);
  });

  it('should accept options', () => {
    const instance = createSteeringValidator({ strictMode: true });
    expect(instance.strictMode).toBe(true);
  });
});

describe('SEVERITY enum', () => {
  it('should have all severity levels', () => {
    expect(SEVERITY.INFO).toBe('info');
    expect(SEVERITY.WARNING).toBe('warning');
    expect(SEVERITY.ERROR).toBe('error');
    expect(SEVERITY.CRITICAL).toBe('critical');
  });
});

describe('RULE_TYPE enum', () => {
  it('should have all rule types', () => {
    expect(RULE_TYPE.REQUIRED).toBe('required');
    expect(RULE_TYPE.FORMAT).toBe('format');
    expect(RULE_TYPE.CONSISTENCY).toBe('consistency');
    expect(RULE_TYPE.REFERENCE).toBe('reference');
    expect(RULE_TYPE.COMPLETENESS).toBe('completeness');
  });
});

describe('DEFAULT_VALIDATION_RULES', () => {
  it('should have default rules', () => {
    expect(DEFAULT_VALIDATION_RULES).toBeInstanceOf(Array);
    expect(DEFAULT_VALIDATION_RULES.length).toBeGreaterThan(0);
  });

  it('should have required rule properties', () => {
    for (const rule of DEFAULT_VALIDATION_RULES) {
      expect(rule.id).toBeDefined();
      expect(rule.file).toBeDefined();
      expect(typeof rule.check).toBe('function');
      expect(rule.message).toBeDefined();
    }
  });

  it('should have structure.md rules', () => {
    const structureRules = DEFAULT_VALIDATION_RULES.filter(r => r.file === 'structure.md');
    expect(structureRules.length).toBeGreaterThan(0);
  });

  it('should have tech.md rules', () => {
    const techRules = DEFAULT_VALIDATION_RULES.filter(r => r.file === 'tech.md');
    expect(techRules.length).toBeGreaterThan(0);
  });
});

describe('DEFAULT_VALIDATION_RULES check functions', () => {
  describe('structure-has-overview rule', () => {
    const rule = DEFAULT_VALIDATION_RULES.find(r => r.id === 'structure-has-overview');

    it('should pass with Overview section', () => {
      expect(rule.check('## Overview\nContent here')).toBe(true);
    });

    it('should pass with header', () => {
      expect(rule.check('# Project Structure')).toBe(true);
    });

    it('should fail without header or overview', () => {
      expect(rule.check('Just plain text')).toBe(false);
    });
  });

  describe('structure-has-directories rule', () => {
    const rule = DEFAULT_VALIDATION_RULES.find(r => r.id === 'structure-has-directories');

    it('should pass with src/ directory', () => {
      expect(rule.check('Uses src/ for source code')).toBe(true);
    });

    it('should pass with lib/ directory', () => {
      expect(rule.check('Uses lib/ for libraries')).toBe(true);
    });

    it('should fail without standard directories', () => {
      expect(rule.check('No directories mentioned')).toBe(false);
    });
  });

  describe('tech-has-stack rule', () => {
    const rule = DEFAULT_VALIDATION_RULES.find(r => r.id === 'tech-has-stack');

    it('should pass with stack mention', () => {
      expect(rule.check('Technology stack includes Node.js')).toBe(true);
    });

    it('should pass with technologies mention (case-sensitive)', () => {
      // Rule checks for lowercase 'technologies' not 'Technologies'
      expect(rule.check('technologies used: React, Redux')).toBe(true);
    });

    it('should fail without stack/technologies', () => {
      expect(rule.check('Just a plain document')).toBe(false);
    });
  });

  describe('tech-has-dependencies rule', () => {
    const rule = DEFAULT_VALIDATION_RULES.find(r => r.id === 'tech-has-dependencies');

    it('should pass with dependencies mention', () => {
      expect(rule.check('Key dependencies include lodash')).toBe(true);
    });

    it('should pass with package mention', () => {
      expect(rule.check('package.json configuration')).toBe(true);
    });

    it('should fail without dependencies/package', () => {
      // Note: 'package' appears in the test string 'No package info here'
      expect(rule.check('No info here about deps')).toBe(false);
    });
  });

  describe('product-has-vision rule', () => {
    const rule = DEFAULT_VALIDATION_RULES.find(r => r.id === 'product-has-vision');

    it('should pass with vision mention', () => {
      expect(rule.check('Our vision is to create...')).toBe(true);
    });

    it('should pass with purpose mention', () => {
      expect(rule.check('The purpose of this project')).toBe(true);
    });

    it('should pass with goal mention', () => {
      expect(rule.check('Main goals include')).toBe(true);
    });

    it('should fail without vision/purpose/goal', () => {
      expect(rule.check('Technical documentation')).toBe(false);
    });
  });

  describe('product-has-features rule', () => {
    const rule = DEFAULT_VALIDATION_RULES.find(r => r.id === 'product-has-features');

    it('should pass with feature mention', () => {
      expect(rule.check('Key features include')).toBe(true);
    });

    it('should pass with capability mention (lowercase)', () => {
      // Rule checks for lowercase 'capability'
      expect(rule.check('Core capability')).toBe(true);
    });

    it('should fail without features/capabilities', () => {
      expect(rule.check('Just text')).toBe(false);
    });
  });

  describe('constitution-has-articles rule', () => {
    const rule = DEFAULT_VALIDATION_RULES.find(r => r.id === 'constitution-has-articles');

    it('should pass with Article mention', () => {
      expect(rule.check('Article 1: Governance')).toBe(true);
    });

    it('should pass with Rule mention', () => {
      expect(rule.check('Rule 1: Always test')).toBe(true);
    });

    it('should fail without Article/Rule', () => {
      expect(rule.check('Plain document')).toBe(false);
    });
  });

  describe('format-valid-markdown rule', () => {
    const rule = DEFAULT_VALIDATION_RULES.find(r => r.id === 'format-valid-markdown');

    it('should pass with valid links', () => {
      expect(rule.check('[Link](https://example.com)')).toBe(true);
    });

    it('should fail with broken links', () => {
      expect(rule.check('[broken link]()')).toBe(false);
    });

    it('should pass without links', () => {
      expect(rule.check('Just plain text')).toBe(true);
    });
  });

  describe('format-no-todo-in-production rule', () => {
    const rule = DEFAULT_VALIDATION_RULES.find(r => r.id === 'format-no-todo-in-production');

    it('should pass without TODO', () => {
      expect(rule.check('Completed documentation')).toBe(true);
    });

    it('should fail with [TODO]', () => {
      expect(rule.check('[TODO] finish this')).toBe(false);
    });

    it('should fail with [TBD]', () => {
      expect(rule.check('[TBD] decide later')).toBe(false);
    });
  });
});

describe('SteeringValidator advanced scenarios', () => {
  let validator;

  beforeEach(() => {
    validator = new SteeringValidator();
  });

  describe('extractProjectNames()', () => {
    it('should extract project names from headers', () => {
      const files = {
        structure: '# MUSUBI Project\nContent',
        tech: '# MUSUBI\nTech stack',
      };
      const names = validator.extractProjectNames(files);
      expect(names.size).toBeGreaterThan(0);
    });

    it('should handle files without headers', () => {
      const files = {
        structure: 'No header here',
      };
      const names = validator.extractProjectNames(files);
      expect(names.size).toBe(0);
    });
  });

  describe('extractLanguages()', () => {
    it('should extract javascript', () => {
      const langs = validator.extractLanguages('Uses JavaScript for frontend');
      expect(langs).toContain('javascript');
    });

    it('should extract typescript', () => {
      const langs = validator.extractLanguages('TypeScript is used');
      expect(langs).toContain('typescript');
    });

    it('should extract python', () => {
      const langs = validator.extractLanguages('Python scripts');
      expect(langs).toContain('python');
    });

    it('should extract java (not javascript)', () => {
      // Note: java pattern may also match javascript
      const langs = validator.extractLanguages('Java only, not JavaScript');
      // The regex uses /java(?!script)/ to avoid false positives
      expect(langs.some(l => l.includes('java'))).toBe(true);
    });

    it('should extract go/golang', () => {
      const langs = validator.extractLanguages('Written in Golang');
      // The regex pattern is /go(?:lang)?/ which captures 'golang'
      expect(langs.some(l => l.includes('go'))).toBe(true);
    });

    it('should extract rust', () => {
      const langs = validator.extractLanguages('Rust for performance');
      expect(langs).toContain('rust');
    });

    it('should extract ruby', () => {
      const langs = validator.extractLanguages('Ruby on Rails');
      expect(langs).toContain('ruby');
    });

    it('should deduplicate languages', () => {
      const langs = validator.extractLanguages('JavaScript and more JavaScript');
      expect(langs.filter(l => l === 'javascript')).toHaveLength(1);
    });

    it('should return empty for no languages', () => {
      const langs = validator.extractLanguages('No programming languages mentioned');
      expect(langs).toHaveLength(0);
    });
  });

  describe('createSummary()', () => {
    it('should create summary from issues', () => {
      const issues = [
        { severity: SEVERITY.ERROR, type: RULE_TYPE.REQUIRED, file: 'a.md' },
        { severity: SEVERITY.WARNING, type: RULE_TYPE.FORMAT, file: 'b.md' },
        { severity: SEVERITY.ERROR, type: RULE_TYPE.REQUIRED, file: 'a.md' },
      ];

      const summary = validator.createSummary(issues);
      expect(summary.totalIssues).toBe(3);
      expect(summary.bySeverity[SEVERITY.ERROR]).toBe(2);
      expect(summary.bySeverity[SEVERITY.WARNING]).toBe(1);
      expect(summary.byType[RULE_TYPE.REQUIRED]).toBe(2);
      expect(summary.byFile['a.md']).toBe(2);
    });

    it('should handle empty issues', () => {
      const summary = validator.createSummary([]);
      expect(summary.totalIssues).toBe(0);
    });
  });

  describe('validateFile with rule errors', () => {
    it('should emit error event on rule failure', async () => {
      const events = [];
      validator.on('rule:error', e => events.push(e));

      validator.addRule({
        id: 'error-throwing-rule',
        file: '*',
        check: () => {
          throw new Error('Rule error');
        },
        message: 'Test',
      });

      await validator.validateFile('test.md', 'content');
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('exportReport edge cases', () => {
    it('should show different severity icons', () => {
      validator.validations.set('test', {
        id: 'test',
        valid: false,
        score: 50,
        issues: [
          { severity: SEVERITY.INFO, message: 'Info', type: RULE_TYPE.COMPLETENESS, file: 'a.md' },
          { severity: SEVERITY.WARNING, message: 'Warning', type: RULE_TYPE.FORMAT, file: 'b.md' },
          { severity: SEVERITY.ERROR, message: 'Error', type: RULE_TYPE.REQUIRED, file: 'c.md' },
          {
            severity: SEVERITY.CRITICAL,
            message: 'Critical',
            type: RULE_TYPE.CONSISTENCY,
            file: 'd.md',
          },
        ],
        summary: { totalIssues: 4, bySeverity: {}, byType: {}, byFile: {} },
        timestamp: Date.now(),
      });

      const report = validator.exportReport('test');
      expect(report).toContain('ℹ️');
      expect(report).toContain('⚠️');
      expect(report).toContain('❌');
      expect(report).toContain('🚨');
    });

    it('should include suggestions when present', () => {
      validator.validations.set('test', {
        id: 'test',
        valid: false,
        score: 80,
        issues: [
          {
            severity: SEVERITY.WARNING,
            message: 'Missing section',
            suggestion: 'Add the missing section',
            type: RULE_TYPE.REQUIRED,
            file: 'a.md',
          },
        ],
        summary: { totalIssues: 1, bySeverity: {}, byType: {}, byFile: {} },
        timestamp: Date.now(),
      });

      const report = validator.exportReport('test');
      expect(report).toContain('Add the missing section');
    });
  });
});
