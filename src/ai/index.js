/**
 * AI Module - MUSUBI SDD
 *
 * Phase 6: Advanced AI Capabilities
 *
 * @module ai
 */

'use strict';

const {
  AIProvider,
  TaskType,
  ModelCapability,
  ModelConfig,
  ModelRegistry,
  ModelRouter,
  ContextWindowManager,
  CodeVectorStore,
  RAGPipeline,
  AISessionManager,
  defaultModelRegistry,
  defaultModelRouter,
  defaultContextManager,
  defaultVectorStore,
  defaultRAGPipeline,
  defaultSessionManager,
} = require('./advanced-ai');

module.exports = {
  // Constants
  AIProvider,
  TaskType,
  ModelCapability,

  // Classes
  ModelConfig,
  ModelRegistry,
  ModelRouter,
  ContextWindowManager,
  CodeVectorStore,
  RAGPipeline,
  AISessionManager,

  // Default instances
  defaultModelRegistry,
  defaultModelRouter,
  defaultContextManager,
  defaultVectorStore,
  defaultRAGPipeline,
  defaultSessionManager,
};
