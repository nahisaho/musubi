/**
 * @file code-generator.js
 * @description Autonomous code generation engine for agentic coding
 * @version 1.0.0
 */

'use strict';

const { EventEmitter } = require('events');
const path = require('path');

/**
 * Generation mode types
 * @enum {string}
 */
const GEN_MODE = {
  CREATE: 'create',
  MODIFY: 'modify',
  EXTEND: 'extend',
  REFACTOR: 'refactor'
};

/**
 * Language types
 * @enum {string}
 */
const LANGUAGE = {
  JAVASCRIPT: 'javascript',
  TYPESCRIPT: 'typescript',
  PYTHON: 'python',
  JSON: 'json',
  MARKDOWN: 'markdown',
  YAML: 'yaml'
};

/**
 * @typedef {Object} GenerationRequest
 * @property {string} description - What to generate
 * @property {string} [mode=GEN_MODE.CREATE] - Generation mode
 * @property {string} [language] - Target language
 * @property {string} [filePath] - Target file path
 * @property {Object} [context] - Additional context
 * @property {Object} [constraints] - Generation constraints
 */

/**
 * @typedef {Object} GenerationResult
 * @property {string} id - Result identifier
 * @property {boolean} success - Whether generation succeeded
 * @property {string} code - Generated code
 * @property {string} language - Code language
 * @property {string} [filePath] - Target file path
 * @property {Object} metadata - Generation metadata
 * @property {string[]} [warnings] - Generation warnings
 */

/**
 * @typedef {Object} CodeGeneratorOptions
 * @property {Object} [templates={}] - Code templates
 * @property {boolean} [addComments=true] - Add documentation comments
 * @property {boolean} [addTyping=true] - Add type annotations where applicable
 * @property {string} [style='standard'] - Code style
 * @property {number} [indentSize=2] - Indentation size
 * @property {boolean} [useTabs=false] - Use tabs for indentation
 */

/**
 * Code templates for various patterns
 */
const TEMPLATES = {
  javascript: {
    class: `/**
 * @class {name}
 * @description {description}
 */
class {name} {
  /**
   * Create {name}
   * @param {Object} options - Options
   */
  constructor(options = {}) {
    {properties}
  }
  
  {methods}
}

module.exports = { {name} };`,

    function: `/**
 * {description}
 * @param {params}
 * @returns {returns}
 */
function {name}({paramNames}) {
  {body}
}`,

    asyncFunction: `/**
 * {description}
 * @param {params}
 * @returns {Promise<{returns}>}
 */
async function {name}({paramNames}) {
  {body}
}`,

    module: `/**
 * @file {filename}
 * @description {description}
 * @version 1.0.0
 */

'use strict';

{imports}

{body}

module.exports = {
  {exports}
};`,

    test: `/**
 * @file {filename}
 * @description Tests for {testSubject}
 */

'use strict';

const { {imports} } = require('{importPath}');

describe('{testSubject}', () => {
  {beforeEach}
  
  {testCases}
});`
  },
  
  typescript: {
    interface: `/**
 * {description}
 */
export interface {name} {
  {properties}
}`,

    class: `/**
 * @class {name}
 * @description {description}
 */
export class {name} {
  {properties}
  
  /**
   * Create {name}
   */
  constructor({constructorParams}) {
    {constructorBody}
  }
  
  {methods}
}`,

    function: `/**
 * {description}
 * @param {params}
 * @returns {returns}
 */
export function {name}({paramNames}): {returnType} {
  {body}
}`
  },
  
  python: {
    class: `"""
{description}
"""

class {name}:
    """
    {classDoc}
    """
    
    def __init__(self{initParams}):
        """Initialize {name}."""
        {initBody}
    
    {methods}`,

    function: `def {name}({paramNames}){returnType}:
    """
    {description}
    
    Args:
        {argDocs}
    
    Returns:
        {returnDoc}
    """
    {body}`,

    asyncFunction: `async def {name}({paramNames}){returnType}:
    """
    {description}
    
    Args:
        {argDocs}
    
    Returns:
        {returnDoc}
    """
    {body}`
  }
};

/**
 * Code Generator class for autonomous code generation
 * @extends EventEmitter
 */
class CodeGenerator extends EventEmitter {
  /**
   * Create code generator
   * @param {CodeGeneratorOptions} [options={}] - Generator options
   */
  constructor(options = {}) {
    super();
    
    this.templates = { ...TEMPLATES, ...(options.templates || {}) };
    this.addComments = options.addComments ?? true;
    this.addTyping = options.addTyping ?? true;
    this.style = options.style || 'standard';
    this.indentSize = options.indentSize ?? 2;
    this.useTabs = options.useTabs ?? false;
    
    // State
    this.history = [];
    this.generationCounter = 0;
  }
  
  /**
   * Generate code from request
   * @param {GenerationRequest} request - Generation request
   * @returns {Promise<GenerationResult>}
   */
  async generate(request) {
    const id = this.generateId();
    const startTime = Date.now();
    
    this.emit('generation:start', { id, request });
    
    try {
      // Determine language
      const language = request.language || this.detectLanguage(request);
      
      // Select generation strategy
      let code;
      switch (request.mode || GEN_MODE.CREATE) {
        case GEN_MODE.CREATE:
          code = await this.generateNew(request, language);
          break;
        case GEN_MODE.MODIFY:
          code = await this.generateModification(request, language);
          break;
        case GEN_MODE.EXTEND:
          code = await this.generateExtension(request, language);
          break;
        case GEN_MODE.REFACTOR:
          code = await this.generateRefactoring(request, language);
          break;
        default:
          code = await this.generateNew(request, language);
      }
      
      // Apply formatting
      code = this.format(code, language);
      
      const result = {
        id,
        success: true,
        code,
        language,
        filePath: request.filePath,
        metadata: {
          mode: request.mode || GEN_MODE.CREATE,
          duration: Date.now() - startTime,
          linesOfCode: code.split('\n').length
        },
        warnings: []
      };
      
      // Store in history
      this.history.push(result);
      
      this.emit('generation:complete', { result });
      
      return result;
      
    } catch (error) {
      const result = {
        id,
        success: false,
        code: '',
        language: request.language || 'unknown',
        filePath: request.filePath,
        metadata: {
          mode: request.mode || GEN_MODE.CREATE,
          duration: Date.now() - startTime,
          error: error.message
        },
        warnings: [error.message]
      };
      
      this.emit('generation:error', { id, error: error.message });
      
      return result;
    }
  }
  
  /**
   * Generate new code
   * @private
   */
  async generateNew(request, language) {
    const description = request.description.toLowerCase();
    
    // Detect what to generate
    if (description.includes('class')) {
      return this.generateClass(request, language);
    } else if (description.includes('function') || description.includes('method')) {
      return this.generateFunction(request, language);
    } else if (description.includes('interface') && language === LANGUAGE.TYPESCRIPT) {
      return this.generateInterface(request, language);
    } else if (description.includes('test')) {
      return this.generateTest(request, language);
    } else if (description.includes('module') || description.includes('file')) {
      return this.generateModule(request, language);
    } else {
      // Default to function
      return this.generateFunction(request, language);
    }
  }
  
  /**
   * Generate modification code
   * @private
   */
  async generateModification(request, language) {
    const { context } = request;
    
    if (!context || !context.existingCode) {
      throw new Error('Modification requires existing code in context');
    }
    
    // Simple modification: add or update based on description
    let modified = context.existingCode;
    
    // Add comments if requested
    if (this.addComments && request.description.includes('document')) {
      modified = this.addDocumentation(modified, language);
    }
    
    return modified;
  }
  
  /**
   * Generate extension code
   * @private
   */
  async generateExtension(request, language) {
    const { context } = request;
    
    if (!context || !context.existingCode) {
      throw new Error('Extension requires existing code in context');
    }
    
    const existing = context.existingCode;
    const extension = await this.generateNew(request, language);
    
    return `${existing}\n\n${extension}`;
  }
  
  /**
   * Generate refactoring
   * @private
   */
  async generateRefactoring(request, language) {
    const { context } = request;
    
    if (!context || !context.existingCode) {
      throw new Error('Refactoring requires existing code in context');
    }
    
    // Simple refactoring: improve structure
    let refactored = context.existingCode;
    
    // Add proper indentation
    refactored = this.format(refactored, language);
    
    return refactored;
  }
  
  /**
   * Generate a class
   * @private
   */
  generateClass(request, language) {
    const className = this.extractName(request.description, 'Class');
    const template = this.templates[language]?.class || this.templates.javascript.class;
    
    let code = template
      .replace(/{name}/g, className)
      .replace(/{description}/g, request.description)
      .replace(/{properties}/g, this.generateProperties(request, language))
      .replace(/{methods}/g, this.generateMethods(request, language));
    
    if (language === LANGUAGE.TYPESCRIPT) {
      code = code
        .replace(/{constructorParams}/g, '')
        .replace(/{constructorBody}/g, '');
    }
    
    return code;
  }
  
  /**
   * Generate a function
   * @private
   */
  generateFunction(request, language) {
    const funcName = this.extractName(request.description, 'function');
    const isAsync = request.description.toLowerCase().includes('async');
    
    const templateKey = isAsync ? 'asyncFunction' : 'function';
    const template = this.templates[language]?.[templateKey] || this.templates.javascript[templateKey];
    
    const params = this.extractParams(request.description);
    
    let code = template
      .replace(/{name}/g, funcName)
      .replace(/{description}/g, request.description)
      .replace(/{params}/g, params.map(p => `@param {${p.type}} ${p.name}`).join('\n * '))
      .replace(/{paramNames}/g, params.map(p => p.name).join(', '))
      .replace(/{returns}/g, 'any')
      .replace(/{returnType}/g, ': any')
      .replace(/{body}/g, '// TODO: Implement')
      .replace(/{argDocs}/g, params.map(p => `${p.name}: ${p.type}`).join('\n        '))
      .replace(/{returnDoc}/g, 'Result');
    
    return code;
  }
  
  /**
   * Generate an interface (TypeScript)
   * @private
   */
  generateInterface(request, language) {
    if (language !== LANGUAGE.TYPESCRIPT) {
      throw new Error('Interfaces are only supported in TypeScript');
    }
    
    const interfaceName = this.extractName(request.description, 'Interface');
    const template = this.templates.typescript.interface;
    
    return template
      .replace(/{name}/g, interfaceName)
      .replace(/{description}/g, request.description)
      .replace(/{properties}/g, '  // TODO: Add properties');
  }
  
  /**
   * Generate test code
   * @private
   */
  generateTest(request, language) {
    const template = this.templates.javascript.test;
    const testSubject = this.extractName(request.description, 'Subject');
    const fileName = request.filePath ? path.basename(request.filePath) : 'test.test.js';
    
    return template
      .replace(/{filename}/g, fileName)
      .replace(/{testSubject}/g, testSubject)
      .replace(/{imports}/g, testSubject)
      .replace(/{importPath}/g, `./${testSubject.toLowerCase()}`)
      .replace(/{beforeEach}/g, `let instance;\n  \n  beforeEach(() => {\n    instance = new ${testSubject}();\n  });`)
      .replace(/{testCases}/g, this.generateTestCases(testSubject));
  }
  
  /**
   * Generate module code
   * @private
   */
  generateModule(request, language) {
    const template = this.templates.javascript.module;
    const fileName = request.filePath ? path.basename(request.filePath) : 'module.js';
    
    return template
      .replace(/{filename}/g, fileName)
      .replace(/{description}/g, request.description)
      .replace(/{imports}/g, '')
      .replace(/{body}/g, '// TODO: Implement module')
      .replace(/{exports}/g, '');
  }
  
  /**
   * Generate class properties
   * @private
   */
  generateProperties(request, language) {
    const constraints = request.constraints || {};
    const props = constraints.properties || [];
    
    if (props.length === 0) {
      return 'this.options = options;';
    }
    
    return props.map(p => `this.${p} = options.${p};`).join('\n    ');
  }
  
  /**
   * Generate class methods
   * @private
   */
  generateMethods(request, language) {
    const constraints = request.constraints || {};
    const methods = constraints.methods || [];
    
    if (methods.length === 0) {
      return `/**
   * Main method
   */
  execute() {
    // TODO: Implement
  }`;
    }
    
    return methods.map(m => `/**
   * ${m.description || m.name}
   */
  ${m.name}() {
    // TODO: Implement
  }`).join('\n  \n  ');
  }
  
  /**
   * Generate test cases
   * @private
   */
  generateTestCases(subject) {
    return `describe('constructor', () => {
    it('should create instance', () => {
      expect(instance).toBeDefined();
    });
  });
  
  describe('methods', () => {
    it('should have required methods', () => {
      // TODO: Add method tests
    });
  });`;
  }
  
  /**
   * Extract name from description
   * @private
   */
  extractName(description, defaultName) {
    // Look for quoted names
    const quotedMatch = description.match(/['"]([^'"]+)['"]/);
    if (quotedMatch) return quotedMatch[1];
    
    // Look for "called X" or "named X"
    const namedMatch = description.match(/(?:called|named)\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
    if (namedMatch) return namedMatch[1];
    
    // Look for capitalized word after "a" or "an"
    const articleMatch = description.match(/(?:a|an)\s+([A-Z][a-zA-Z0-9_]*)/);
    if (articleMatch) return articleMatch[1];
    
    return defaultName;
  }
  
  /**
   * Extract parameters from description
   * @private
   */
  extractParams(description) {
    const params = [];
    
    // Look for "with parameters X, Y, Z"
    const paramMatch = description.match(/(?:with\s+)?param(?:eter)?s?\s+([^.]+)/i);
    if (paramMatch) {
      const paramList = paramMatch[1].split(/[,\s]+/).filter(p => p && !['and', 'or'].includes(p));
      params.push(...paramList.map(name => ({ name, type: 'any' })));
    }
    
    // Look for "takes X and Y"
    const takesMatch = description.match(/takes\s+([^.]+)/i);
    if (takesMatch && params.length === 0) {
      const paramList = takesMatch[1].split(/[,\s]+/).filter(p => p && !['and', 'or', 'a', 'an'].includes(p));
      params.push(...paramList.map(name => ({ name, type: 'any' })));
    }
    
    return params;
  }
  
  /**
   * Detect language from request
   * @private
   */
  detectLanguage(request) {
    if (request.filePath) {
      const ext = path.extname(request.filePath);
      const langMap = {
        '.js': LANGUAGE.JAVASCRIPT,
        '.ts': LANGUAGE.TYPESCRIPT,
        '.py': LANGUAGE.PYTHON,
        '.json': LANGUAGE.JSON,
        '.md': LANGUAGE.MARKDOWN,
        '.yaml': LANGUAGE.YAML,
        '.yml': LANGUAGE.YAML
      };
      return langMap[ext] || LANGUAGE.JAVASCRIPT;
    }
    
    // Check description for language hints
    const desc = request.description.toLowerCase();
    if (desc.includes('typescript') || desc.includes('ts')) return LANGUAGE.TYPESCRIPT;
    if (desc.includes('python') || desc.includes('py')) return LANGUAGE.PYTHON;
    
    return LANGUAGE.JAVASCRIPT;
  }
  
  /**
   * Format code
   * @private
   */
  format(code, language) {
    const indent = this.useTabs ? '\t' : ' '.repeat(this.indentSize);
    
    // Normalize line endings
    code = code.replace(/\r\n/g, '\n');
    
    // Remove trailing whitespace
    code = code.split('\n').map(line => line.trimEnd()).join('\n');
    
    // Ensure single newline at end
    code = code.trimEnd() + '\n';
    
    return code;
  }
  
  /**
   * Add documentation to code
   * @private
   */
  addDocumentation(code, language) {
    // Simple documentation addition
    if (language === LANGUAGE.JAVASCRIPT || language === LANGUAGE.TYPESCRIPT) {
      if (!code.startsWith('/**') && !code.startsWith('//')) {
        code = '// Auto-documented code\n' + code;
      }
    } else if (language === LANGUAGE.PYTHON) {
      if (!code.startsWith('"""') && !code.startsWith('#')) {
        code = '# Auto-documented code\n' + code;
      }
    }
    
    return code;
  }
  
  /**
   * Generate unique ID
   * @private
   */
  generateId() {
    return `gen-${++this.generationCounter}-${Date.now().toString(36)}`;
  }
  
  /**
   * Get generation history
   * @param {number} [count] - Number of items to return
   * @returns {GenerationResult[]}
   */
  getHistory(count) {
    if (count) {
      return this.history.slice(-count);
    }
    return [...this.history];
  }
  
  /**
   * Clear history
   */
  clearHistory() {
    this.history = [];
  }
  
  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    const successful = this.history.filter(r => r.success).length;
    const byLanguage = {};
    const byMode = {};
    let totalLines = 0;
    
    for (const result of this.history) {
      byLanguage[result.language] = (byLanguage[result.language] || 0) + 1;
      byMode[result.metadata.mode] = (byMode[result.metadata.mode] || 0) + 1;
      totalLines += result.metadata.linesOfCode || 0;
    }
    
    return {
      totalGenerations: this.history.length,
      successful,
      failed: this.history.length - successful,
      successRate: this.history.length > 0 ? successful / this.history.length : 0,
      byLanguage,
      byMode,
      totalLinesGenerated: totalLines
    };
  }
  
  /**
   * Add custom template
   * @param {string} language - Language
   * @param {string} name - Template name
   * @param {string} template - Template content
   */
  addTemplate(language, name, template) {
    if (!this.templates[language]) {
      this.templates[language] = {};
    }
    this.templates[language][name] = template;
  }
}

/**
 * Create code generator
 * @param {CodeGeneratorOptions} [options={}] - Generator options
 * @returns {CodeGenerator}
 */
function createCodeGenerator(options = {}) {
  return new CodeGenerator(options);
}

/**
 * Generate code from description
 * @param {string} description - What to generate
 * @param {Object} [options={}] - Generation options
 * @returns {Promise<GenerationResult>}
 */
async function generateCode(description, options = {}) {
  const generator = createCodeGenerator(options);
  return generator.generate({ description, ...options });
}

module.exports = {
  CodeGenerator,
  createCodeGenerator,
  generateCode,
  GEN_MODE,
  LANGUAGE,
  TEMPLATES
};
