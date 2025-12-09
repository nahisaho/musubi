/**
 * @file index.test.js
 * @description Tests for agentic module exports
 */

'use strict';

const agentic = require('../../../src/agents/agentic');

describe('Agentic Module Exports', () => {
  describe('Code Generator exports', () => {
    it('should export CodeGenerator class', () => {
      expect(agentic.CodeGenerator).toBeDefined();
      expect(typeof agentic.CodeGenerator).toBe('function');
    });
    
    it('should export createCodeGenerator function', () => {
      expect(agentic.createCodeGenerator).toBeDefined();
      expect(typeof agentic.createCodeGenerator).toBe('function');
    });
    
    it('should export generateCode function', () => {
      expect(agentic.generateCode).toBeDefined();
      expect(typeof agentic.generateCode).toBe('function');
    });
    
    it('should export GEN_MODE enum', () => {
      expect(agentic.GEN_MODE).toBeDefined();
      expect(agentic.GEN_MODE.CREATE).toBe('create');
      expect(agentic.GEN_MODE.MODIFY).toBe('modify');
    });
    
    it('should export LANGUAGE enum', () => {
      expect(agentic.LANGUAGE).toBeDefined();
      expect(agentic.LANGUAGE.JAVASCRIPT).toBe('javascript');
      expect(agentic.LANGUAGE.PYTHON).toBe('python');
    });
    
    it('should export TEMPLATES', () => {
      expect(agentic.TEMPLATES).toBeDefined();
      expect(agentic.TEMPLATES.javascript).toBeDefined();
    });
  });
  
  describe('Code Reviewer exports', () => {
    it('should export CodeReviewer class', () => {
      expect(agentic.CodeReviewer).toBeDefined();
      expect(typeof agentic.CodeReviewer).toBe('function');
    });
    
    it('should export createCodeReviewer function', () => {
      expect(agentic.createCodeReviewer).toBeDefined();
      expect(typeof agentic.createCodeReviewer).toBe('function');
    });
    
    it('should export reviewCode function', () => {
      expect(agentic.reviewCode).toBeDefined();
      expect(typeof agentic.reviewCode).toBe('function');
    });
    
    it('should export SEVERITY enum', () => {
      expect(agentic.SEVERITY).toBeDefined();
      expect(agentic.SEVERITY.INFO).toBe('info');
      expect(agentic.SEVERITY.WARNING).toBe('warning');
      expect(agentic.SEVERITY.ERROR).toBe('error');
      expect(agentic.SEVERITY.CRITICAL).toBe('critical');
    });
    
    it('should export CATEGORY enum', () => {
      expect(agentic.CATEGORY).toBeDefined();
      expect(agentic.CATEGORY.STYLE).toBe('style');
      expect(agentic.CATEGORY.SECURITY).toBe('security');
    });
    
    it('should export DEFAULT_RULES', () => {
      expect(agentic.DEFAULT_RULES).toBeDefined();
      expect(agentic.DEFAULT_RULES.javascript).toBeDefined();
      expect(agentic.DEFAULT_RULES.python).toBeDefined();
    });
  });
  
  describe('Integration', () => {
    it('should be able to create CodeGenerator instance', () => {
      const generator = new agentic.CodeGenerator();
      expect(generator).toBeInstanceOf(agentic.CodeGenerator);
    });
    
    it('should be able to create CodeReviewer instance', () => {
      const reviewer = new agentic.CodeReviewer();
      expect(reviewer).toBeInstanceOf(agentic.CodeReviewer);
    });
    
    it('should generate and review code', async () => {
      // Generate code
      const generated = await agentic.generateCode('A simple utility function', {
        language: 'javascript'
      });
      
      expect(generated.code).toBeDefined();
      
      // Review generated code
      const review = agentic.reviewCode(generated.code, {
        language: 'javascript'
      });
      
      expect(review.score).toBeDefined();
      expect(review.issues).toBeInstanceOf(Array);
    });
  });
});
