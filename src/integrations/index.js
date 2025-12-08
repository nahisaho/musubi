/**
 * MUSUBI SDD - Integrations Index
 * Phase 6: Ecosystem Integration
 */

const platforms = require('./platforms');
const cicd = require('./cicd');
const documentation = require('./documentation');
const examples = require('./examples');

module.exports = {
  // Multi-Platform Support
  ...platforms,
  
  // CI/CD Integration
  ...cicd,
  
  // Documentation Generator
  ...documentation,
  
  // Example Projects & Launch
  ...examples
};
