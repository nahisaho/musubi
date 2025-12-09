/**
 * MUSUBI Agents Module
 * 
 * Exports agent-related functionality including Agent Loop,
 * Function Tools, Schema Generation, and Agent Registry.
 * 
 * @module agents
 */

const { AgentLoop, createMockLLMProvider } = require('./agent-loop');
const {
  functionTool,
  functionTools,
  asTool,
  withJSDoc,
  parseJSDoc,
  paramsToSchema,
  SchemaBuilder,
  validateArgs
} = require('./function-tool');
const { SchemaGenerator, createSchemaGenerator } = require('./schema-generator');
const agentDefinitions = require('./registry');

module.exports = {
  // Agent Loop
  AgentLoop,
  createMockLLMProvider,
  
  // Function Tools
  functionTool,
  functionTools,
  asTool,
  withJSDoc,
  parseJSDoc,
  paramsToSchema,
  SchemaBuilder,
  validateArgs,
  
  // Schema Generator
  SchemaGenerator,
  createSchemaGenerator,
  
  // Agent Registry
  agentDefinitions
};
