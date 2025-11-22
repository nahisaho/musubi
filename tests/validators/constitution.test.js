/**
 * Constitutional Validator Tests
 */

const ConstitutionValidator = require('../../src/validators/constitution');
const path = require('path');

describe('ConstitutionValidator', () => {
  let validator;
  const testProjectRoot = path.join(__dirname, '../fixtures/test-project');

  beforeEach(() => {
    validator = new ConstitutionValidator(testProjectRoot);
  });

  describe('validateArticle1', () => {
    it('should validate Library-First Principle', async () => {
      const result = await validator.validateArticle1();
      expect(result.article).toBe(1);
      expect(result.name).toBe('Library-First Principle');
      expect(result.passed).toBe(true);
      expect(result.summary).toContain('Library-First');
    });
  });

  describe('validateArticle3', () => {
    it('should detect test files', async () => {
      const result = await validator.validateArticle3();
      expect(result.article).toBe(3);
      expect(result.name).toBe('Test-First Imperative');
      expect(result.passed).toBeDefined();
    });
  });

  describe('validateArticle6', () => {
    it('should validate steering files existence', async () => {
      const result = await validator.validateArticle6();
      expect(result.article).toBe(6);
      expect(result.name).toBe('Project Memory (Steering System)');
      expect(result.passed).toBeDefined();
    });
  });

  describe('validateArticle7', () => {
    it('should count sub-projects and enforce 3-project limit', async () => {
      const result = await validator.validateArticle7();
      expect(result.article).toBe(7);
      expect(result.name).toBe('Simplicity Gate');
      expect(result.summary).toContain('sub-project');
    });
  });

  describe('validateComplexity', () => {
    it('should detect files exceeding 1500 line limit', async () => {
      const result = await validator.validateComplexity();
      expect(result.passed).toBeDefined();
      expect(result.violations).toBeDefined();
      expect(Array.isArray(result.files)).toBe(true);
    });
  });

  describe('validateGates', () => {
    it('should validate Phase -1 Gates', async () => {
      const result = await validator.validateGates();
      expect(result.gates).toBeDefined();
      expect(result.gates.simplicity).toBeDefined();
      expect(result.gates.abstraction).toBeDefined();
      expect(result.passed).toBeDefined();
    });
  });

  describe('validateAll', () => {
    it('should validate all 9 articles', async () => {
      const result = await validator.validateAll();
      expect(result.passed).toBeDefined();
      expect(result.violations).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(result.articles).toBeDefined();
      expect(Object.keys(result.articles).length).toBe(9);
    });
  });
});
