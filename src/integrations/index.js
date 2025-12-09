/**
 * MUSUBI SDD - Integrations Index
 * Phase 6: Ecosystem Integration
 */

const platforms = require('./platforms');
const cicd = require('./cicd');
const documentation = require('./documentation');
const examples = require('./examples');
const mcpConnector = require('./mcp-connector');
const toolDiscovery = require('./tool-discovery');

module.exports = {
  // Multi-Platform Support
  ...platforms,
  
  // CI/CD Integration
  ...cicd,
  
  // Documentation Generator
  ...documentation,
  
  // Example Projects & Launch
  ...examples,
  
  // MCP Integration (Sprint 3.4)
  ...mcpConnector,
  ...toolDiscovery
};
