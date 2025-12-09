/**
 * @file Agentic Features Module - Index
 * @description Export all agentic coding features
 * @version 1.0.0
 */

'use strict';

const {
  CodeGenerator,
  createCodeGenerator,
  generateCode,
  GEN_MODE,
  LANGUAGE,
  TEMPLATES
} = require('./code-generator');

const {
  CodeReviewer,
  createCodeReviewer,
  reviewCode,
  SEVERITY,
  CATEGORY,
  DEFAULT_RULES
} = require('./code-reviewer');

module.exports = {
  // Code Generator
  CodeGenerator,
  createCodeGenerator,
  generateCode,
  GEN_MODE,
  LANGUAGE,
  TEMPLATES,
  
  // Code Reviewer
  CodeReviewer,
  createCodeReviewer,
  reviewCode,
  SEVERITY,
  CATEGORY,
  DEFAULT_RULES
};
