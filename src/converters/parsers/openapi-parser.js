/**
 * OpenAPI Parser
 * 
 * Convert OpenAPI/Swagger specifications to MUSUBI requirements
 */

'use strict';

const fs = require('fs-extra');
const _path = require('path');
const yaml = require('js-yaml');
const { createEmptyProjectIR, createEmptyFeatureIR } = require('../ir/types');

/**
 * Parse OpenAPI specification and convert to MUSUBI IR
 * @param {string} specPath - Path to OpenAPI spec (JSON or YAML)
 * @returns {Promise<Object>} Project IR
 */
async function parseOpenAPISpec(specPath) {
  const content = await fs.readFile(specPath, 'utf-8');
  
  let spec;
  if (specPath.endsWith('.yaml') || specPath.endsWith('.yml')) {
    spec = yaml.load(content);
  } else {
    spec = JSON.parse(content);
  }
  
  // Detect OpenAPI version
  const version = spec.openapi || spec.swagger;
  if (!version) {
    throw new Error('Not a valid OpenAPI/Swagger specification');
  }
  
  const ir = createEmptyProjectIR();
  ir.metadata.name = spec.info?.title || 'API Project';
  ir.metadata.description = spec.info?.description || '';
  ir.metadata.version = spec.info?.version || '1.0.0';
  ir.metadata.sourceFormat = 'openapi';
  
  // Group paths by tags
  const tagGroups = groupPathsByTag(spec.paths, spec.tags);
  
  // Convert each tag group to a feature
  for (const [tag, endpoints] of Object.entries(tagGroups)) {
    const feature = await createFeatureFromEndpoints(tag, endpoints, spec);
    ir.features.push(feature);
  }
  
  // If no tags, create a single feature
  if (ir.features.length === 0) {
    const feature = await createFeatureFromEndpoints('api', spec.paths, spec);
    ir.features.push(feature);
  }
  
  // Add security requirements
  if (spec.security || spec.securityDefinitions || spec.components?.securitySchemes) {
    const securityFeature = createSecurityFeature(spec);
    ir.features.push(securityFeature);
  }
  
  return ir;
}

/**
 * Group paths by their tags
 * @param {Object} paths - OpenAPI paths object
 * @param {Array} tags - OpenAPI tags array
 * @returns {Object} Grouped paths
 */
function groupPathsByTag(paths, _tags = []) {
  const groups = {};
  
  for (const [pathUrl, pathItem] of Object.entries(paths || {})) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) {
        const operationTags = operation.tags || ['default'];
        
        for (const tag of operationTags) {
          if (!groups[tag]) {
            groups[tag] = {};
          }
          if (!groups[tag][pathUrl]) {
            groups[tag][pathUrl] = {};
          }
          groups[tag][pathUrl][method] = operation;
        }
      }
    }
  }
  
  return groups;
}

/**
 * Create a feature from API endpoints
 * @param {string} tag - Tag name
 * @param {Object} endpoints - Endpoints for this tag
 * @param {Object} spec - Full OpenAPI spec
 * @returns {Object} Feature IR
 */
async function createFeatureFromEndpoints(tag, endpoints, spec) {
  const featureId = tag.toLowerCase().replace(/\s+/g, '-');
  const feature = createEmptyFeatureIR(featureId, tag);
  
  feature.specification.description = getTagDescription(spec.tags, tag);
  feature.design = [];
  feature.tests = [];
  
  let reqIndex = 1;
  
  for (const [pathUrl, pathItem] of Object.entries(endpoints)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) {
        // Create requirement from operation
        const requirement = createRequirementFromOperation(
          `REQ-${featureId.toUpperCase()}-${String(reqIndex).padStart(3, '0')}`,
          method,
          pathUrl,
          operation
        );
        feature.specification.requirements.push(requirement);
        reqIndex++;
        
        // Create design decision for each operation
        const decision = createDesignFromOperation(
          `ADR-${featureId.toUpperCase()}-${String(feature.design.length + 1).padStart(3, '0')}`,
          method,
          pathUrl,
          operation
        );
        feature.design.push(decision);
        
        // Create test case
        const testCase = createTestFromOperation(method, pathUrl, operation);
        feature.tests.push(testCase);
      }
    }
  }
  
  return feature;
}

/**
 * Get tag description from tags array
 * @param {Array} tags - Tags array
 * @param {string} tagName - Tag name to find
 * @returns {string} Tag description
 */
function getTagDescription(tags, tagName) {
  const tag = (tags || []).find(t => t.name === tagName);
  return tag?.description || '';
}

/**
 * Create EARS requirement from API operation
 * @param {string} id - Requirement ID
 * @param {string} method - HTTP method
 * @param {string} path - API path
 * @param {Object} operation - OpenAPI operation
 * @returns {Object} Requirement object
 */
function createRequirementFromOperation(id, method, path, operation) {
  const methodVerb = {
    get: 'retrieves',
    post: 'creates',
    put: 'updates',
    patch: 'partially updates',
    delete: 'deletes',
    head: 'checks',
    options: 'returns options for',
  }[method.toLowerCase()] || method;
  
  const summary = operation.summary || operation.operationId || `${method.toUpperCase()} ${path}`;
  
  // Generate EARS pattern based on method
  let earsStatement;
  if (operation.security?.length > 0) {
    // Event-driven with auth
    earsStatement = `When an authenticated user sends a ${method.toUpperCase()} request to ${path}, the system shall ${methodVerb} the resource and return the appropriate response.`;
  } else {
    // Ubiquitous
    earsStatement = `The system shall provide a ${method.toUpperCase()} ${path} endpoint that ${methodVerb} ${getResourceFromPath(path)}.`;
  }
  
  return {
    id,
    type: 'functional',
    priority: method === 'get' ? 'must' : 'should',
    statement: earsStatement,
    description: operation.description || summary,
    rationale: `API endpoint for ${operation.operationId || summary}`,
    source: 'openapi',
    metadata: {
      method: method.toUpperCase(),
      path,
      operationId: operation.operationId,
      tags: operation.tags,
      parameters: operation.parameters?.length || 0,
      responses: Object.keys(operation.responses || {}).join(', '),
    },
    acceptanceCriteria: generateAcceptanceCriteria(method, path, operation),
  };
}

/**
 * Extract resource name from path
 * @param {string} path - API path
 * @returns {string} Resource name
 */
function getResourceFromPath(path) {
  const parts = path.split('/').filter(p => p && !p.startsWith('{'));
  return parts[parts.length - 1] || 'resource';
}

/**
 * Generate acceptance criteria from operation
 * @param {string} method - HTTP method
 * @param {string} path - API path
 * @param {Object} operation - OpenAPI operation
 * @returns {Array} Acceptance criteria
 */
function generateAcceptanceCriteria(method, path, operation) {
  const criteria = [];
  
  // Add response status criteria
  for (const [status, response] of Object.entries(operation.responses || {})) {
    if (status === '200' || status === '201') {
      criteria.push(`Given valid request, When ${method.toUpperCase()} ${path}, Then return ${status} with ${response.description || 'success response'}`);
    } else if (status.startsWith('4')) {
      criteria.push(`Given invalid request, When ${method.toUpperCase()} ${path}, Then return ${status} with error details`);
    }
  }
  
  // Add parameter validation criteria
  if (operation.parameters?.some(p => p.required)) {
    criteria.push(`Given missing required parameters, When ${method.toUpperCase()} ${path}, Then return 400 Bad Request`);
  }
  
  // Add security criteria
  if (operation.security?.length > 0) {
    criteria.push(`Given unauthenticated request, When ${method.toUpperCase()} ${path}, Then return 401 Unauthorized`);
  }
  
  return criteria;
}

/**
 * Create design decision from operation
 * @param {string} id - Decision ID
 * @param {string} method - HTTP method
 * @param {string} path - API path
 * @param {Object} operation - OpenAPI operation
 * @returns {Object} Design decision
 */
function createDesignFromOperation(id, method, path, operation) {
  return {
    id,
    title: `${method.toUpperCase()} ${path} Endpoint Design`,
    status: 'accepted',
    context: `The API needs to support ${method.toUpperCase()} ${path} for ${operation.summary || operation.operationId}`,
    decision: `Implement RESTful endpoint following OpenAPI specification`,
    consequences: [
      `Endpoint available at ${path}`,
      `Supports ${method.toUpperCase()} method`,
      ...(operation.parameters?.map(p => `Accepts ${p.name} parameter (${p.in})`) || []),
    ],
    metadata: {
      operationId: operation.operationId,
      requestBody: operation.requestBody ? 'required' : 'none',
      security: operation.security?.length > 0 ? 'required' : 'none',
    },
  };
}

/**
 * Create test case from operation
 * @param {string} method - HTTP method
 * @param {string} path - API path
 * @param {Object} operation - OpenAPI operation
 * @returns {Object} Test case
 */
function createTestFromOperation(method, path, operation) {
  return {
    id: `TEST-${method.toUpperCase()}-${path.replace(/[^a-zA-Z0-9]/g, '-')}`,
    name: `Test ${method.toUpperCase()} ${path}`,
    type: 'api',
    endpoint: path,
    method: method.toUpperCase(),
    scenarios: [
      {
        name: 'Success case',
        status: Object.keys(operation.responses || {})[0] || '200',
        description: operation.responses?.['200']?.description || 'Should succeed',
      },
      ...(operation.responses?.['400'] ? [{
        name: 'Invalid request',
        status: '400',
        description: operation.responses['400'].description,
      }] : []),
      ...(operation.security?.length > 0 ? [{
        name: 'Unauthorized',
        status: '401',
        description: 'Should reject unauthenticated request',
      }] : []),
    ],
  };
}

/**
 * Create security feature from spec
 * @param {Object} spec - OpenAPI spec
 * @returns {Object} Security feature
 */
function createSecurityFeature(spec) {
  const feature = createEmptyFeatureIR('security', 'Security');
  feature.specification.description = 'API Security Requirements';
  
  const schemes = spec.components?.securitySchemes || spec.securityDefinitions || {};
  
  let reqIndex = 1;
  for (const [name, scheme] of Object.entries(schemes)) {
    const requirement = {
      id: `REQ-SECURITY-${String(reqIndex).padStart(3, '0')}`,
      type: 'non-functional',
      priority: 'must',
      statement: `The system shall support ${scheme.type} authentication using ${name}.`,
      description: scheme.description || `${scheme.type} authentication scheme`,
      rationale: 'API security requirement',
      source: 'openapi',
      metadata: {
        scheme: name,
        type: scheme.type,
        ...scheme,
      },
    };
    feature.specification.requirements.push(requirement);
    reqIndex++;
  }
  
  return feature;
}

module.exports = {
  parseOpenAPISpec,
  groupPathsByTag,
  createFeatureFromEndpoints,
  createRequirementFromOperation,
  generateAcceptanceCriteria,
};
