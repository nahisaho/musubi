/**
 * MUSUBI Schema Generator
 * 
 * Generates JSON Schema from various sources including
 * JavaScript functions, TypeScript types, and JSDoc comments.
 * 
 * @module agents/schema-generator
 */

const fs = require('fs');
const _path = require('path');

/**
 * @typedef {Object} SchemaGeneratorOptions
 * @property {boolean} [strict=false] - Enable strict mode
 * @property {boolean} [includeExamples=true] - Include examples in schema
 * @property {string} [defaultType='string'] - Default type for unknown
 */

/**
 * Schema Generator for function tools
 */
class SchemaGenerator {
  /**
   * @param {SchemaGeneratorOptions} options
   */
  constructor(options = {}) {
    this.strict = options.strict ?? false;
    this.includeExamples = options.includeExamples ?? true;
    this.defaultType = options.defaultType ?? 'string';
  }
  
  /**
   * Generate schema from a function
   * @param {Function} fn
   * @returns {Object} JSON Schema
   */
  fromFunction(fn) {
    const fnString = fn.toString();
    const params = this.extractParameters(fnString);
    const jsdoc = this.extractJSDoc(fnString);
    
    return this.buildSchema(params, jsdoc);
  }
  
  /**
   * Generate schema from JSDoc comment
   * @param {string} jsdoc
   * @returns {Object} JSON Schema
   */
  fromJSDoc(jsdoc) {
    const parsed = this.parseJSDoc(jsdoc);
    return this.buildSchemaFromParsed(parsed);
  }
  
  /**
   * Generate schema from a class method
   * @param {Object} instance - Class instance
   * @param {string} methodName - Method name
   * @returns {Object} JSON Schema
   */
  fromMethod(instance, methodName) {
    const method = instance[methodName];
    if (typeof method !== 'function') {
      throw new Error(`${methodName} is not a method`);
    }
    return this.fromFunction(method.bind(instance));
  }
  
  /**
   * Generate schema from file (extracts functions)
   * @param {string} filePath
   * @returns {Object<string, Object>} Map of function names to schemas
   */
  fromFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const functions = this.extractFunctions(content);
    const schemas = {};
    
    for (const fn of functions) {
      schemas[fn.name] = this.buildSchema(fn.params, fn.jsdoc);
    }
    
    return schemas;
  }
  
  /**
   * Extract function parameters from function string
   * @param {string} fnString
   * @returns {Array}
   */
  extractParameters(fnString) {
    // Match function parameters
    const paramMatch = fnString.match(/\(([^)]*)\)/);
    if (!paramMatch) return [];
    
    const paramString = paramMatch[1];
    if (!paramString.trim()) return [];
    
    return this.parseParameterString(paramString);
  }
  
  /**
   * Parse parameter string into structured format
   * @param {string} paramString
   * @returns {Array}
   */
  parseParameterString(paramString) {
    const params = [];
    let depth = 0;
    let current = '';
    let _inDefault = false;
    
    for (const char of paramString) {
      if (char === '{' || char === '[' || char === '(') depth++;
      if (char === '}' || char === ']' || char === ')') depth--;
      
      if (char === '=' && depth === 0) {
        _inDefault = true;
      }
      
      if (char === ',' && depth === 0) {
        if (current.trim()) {
          params.push(this.parseParameter(current.trim()));
        }
        current = '';
        _inDefault = false;
        continue;
      }
      
      current += char;
    }
    
    if (current.trim()) {
      params.push(this.parseParameter(current.trim()));
    }
    
    return params;
  }
  
  /**
   * Parse a single parameter
   * @param {string} param
   * @returns {Object}
   */
  parseParameter(param) {
    // Handle destructuring
    if (param.startsWith('{')) {
      const match = param.match(/\{([^}]+)\}/);
      if (match) {
        const destructured = match[1].split(',').map(p => p.trim().split(':')[0].split('=')[0].trim());
        return {
          name: 'options',
          type: 'object',
          destructured,
          required: !param.includes('=')
        };
      }
    }
    
    // Handle default values
    const [nameWithType, defaultValue] = param.split('=').map(p => p.trim());
    const name = nameWithType.replace(/:\s*\w+$/, '').trim();
    
    // Try to infer type from default value
    let type = this.defaultType;
    if (defaultValue !== undefined) {
      type = this.inferTypeFromValue(defaultValue);
    }
    
    return {
      name,
      type,
      required: defaultValue === undefined,
      default: defaultValue ? this.parseDefaultValue(defaultValue) : undefined
    };
  }
  
  /**
   * Infer type from a default value string
   * @param {string} valueStr
   * @returns {string}
   */
  inferTypeFromValue(valueStr) {
    valueStr = valueStr.trim();
    
    if (valueStr === 'true' || valueStr === 'false') return 'boolean';
    if (valueStr === 'null') return 'null';
    if (valueStr === '[]' || valueStr.startsWith('[')) return 'array';
    if (valueStr === '{}' || valueStr.startsWith('{')) return 'object';
    if (/^['"`]/.test(valueStr)) return 'string';
    if (/^-?\d+$/.test(valueStr)) return 'integer';
    if (/^-?\d+\.\d+$/.test(valueStr)) return 'number';
    
    return this.defaultType;
  }
  
  /**
   * Parse default value string to actual value
   * @param {string} valueStr
   * @returns {*}
   */
  parseDefaultValue(valueStr) {
    try {
      // Handle string literals
      if (/^['"`]/.test(valueStr)) {
        return valueStr.slice(1, -1);
      }
      return JSON.parse(valueStr);
    } catch {
      return valueStr;
    }
  }
  
  /**
   * Extract JSDoc comment from function string
   * @param {string} fnString
   * @returns {Object|null}
   */
  extractJSDoc(fnString) {
    const match = fnString.match(/\/\*\*[\s\S]*?\*\//);
    if (!match) return null;
    return this.parseJSDoc(match[0]);
  }
  
  /**
   * Parse JSDoc comment
   * @param {string} jsdoc
   * @returns {Object}
   */
  parseJSDoc(jsdoc) {
    const result = {
      description: '',
      params: [],
      returns: null,
      example: null,
      throws: []
    };
    
    const lines = jsdoc.split('\n')
      .map(l => l.replace(/^\s*\*\s?/, '').trim())
      .filter(l => l && !l.startsWith('/'));
    
    let currentTag = null;
    let buffer = [];
    
    for (const line of lines) {
      if (line.startsWith('@')) {
        // Process previous buffer
        if (currentTag === null && buffer.length) {
          result.description = buffer.join(' ');
        }
        buffer = [];
        
        if (line.startsWith('@param')) {
          currentTag = 'param';
          const parsed = this.parseParamTag(line);
          if (parsed) result.params.push(parsed);
        } else if (line.startsWith('@returns') || line.startsWith('@return')) {
          currentTag = 'returns';
          const match = line.match(/@returns?\s+\{([^}]+)\}\s*(.*)/);
          if (match) {
            result.returns = { type: match[1], description: match[2] || '' };
          }
        } else if (line.startsWith('@example')) {
          currentTag = 'example';
          result.example = '';
        } else if (line.startsWith('@throws')) {
          currentTag = 'throws';
          const match = line.match(/@throws\s+\{([^}]+)\}\s*(.*)/);
          if (match) {
            result.throws.push({ type: match[1], description: match[2] || '' });
          }
        } else {
          currentTag = 'other';
        }
      } else {
        buffer.push(line);
        if (currentTag === 'example') {
          result.example += (result.example ? '\n' : '') + line;
        }
      }
    }
    
    if (currentTag === null && buffer.length) {
      result.description = buffer.join(' ');
    }
    
    return result;
  }
  
  /**
   * Parse @param tag
   * @param {string} line
   * @returns {Object|null}
   */
  parseParamTag(line) {
    const match = line.match(/@param\s+\{([^}]+)\}\s+(\[)?(\w+)(?:\])?(?:\s*-?\s*(.*))?/);
    if (!match) return null;
    
    const [, type, optional, name, description] = match;
    return {
      name,
      type: type.toLowerCase(),
      required: !optional,
      description: description || ''
    };
  }
  
  /**
   * Build schema from extracted params and JSDoc
   * @param {Array} params
   * @param {Object|null} jsdoc
   * @returns {Object}
   */
  buildSchema(params, jsdoc) {
    const properties = {};
    const required = [];
    
    // Merge param info from function signature and JSDoc
    const paramMap = new Map();
    
    for (const param of params) {
      paramMap.set(param.name, { ...param });
    }
    
    if (jsdoc?.params) {
      for (const docParam of jsdoc.params) {
        const existing = paramMap.get(docParam.name);
        if (existing) {
          Object.assign(existing, {
            type: docParam.type || existing.type,
            description: docParam.description || existing.description,
            required: docParam.required ?? existing.required
          });
        } else {
          paramMap.set(docParam.name, docParam);
        }
      }
    }
    
    // Build properties
    for (const [name, param] of paramMap) {
      if (param.destructured) {
        // Expand destructured object
        for (const prop of param.destructured) {
          properties[prop] = {
            type: 'string',
            description: `Property: ${prop}`
          };
        }
      } else {
        properties[name] = this.typeToSchema(param.type, param);
        if (param.description) {
          properties[name].description = param.description;
        }
        if (param.default !== undefined) {
          properties[name].default = param.default;
        }
      }
      
      if (param.required && !param.destructured) {
        required.push(name);
      }
    }
    
    const schema = {
      type: 'object',
      properties
    };
    
    if (required.length > 0) {
      schema.required = required;
    }
    
    if (this.strict) {
      schema.additionalProperties = false;
    }
    
    return schema;
  }
  
  /**
   * Build schema from parsed JSDoc
   * @param {Object} parsed
   * @returns {Object}
   */
  buildSchemaFromParsed(parsed) {
    return this.buildSchema([], parsed);
  }
  
  /**
   * Convert type string to JSON Schema
   * @param {string} typeStr
   * @param {Object} [param]
   * @returns {Object}
   */
  typeToSchema(typeStr, _param = {}) {
    const type = typeStr.toLowerCase();
    
    // Handle array types
    if (type.endsWith('[]')) {
      const itemType = type.slice(0, -2);
      return {
        type: 'array',
        items: this.typeToSchema(itemType)
      };
    }
    
    // Handle union types
    if (type.includes('|')) {
      const types = type.split('|').map(t => this.typeToSchema(t.trim()));
      return { anyOf: types };
    }
    
    // Handle common types
    const typeMap = {
      'string': { type: 'string' },
      'number': { type: 'number' },
      'integer': { type: 'integer' },
      'int': { type: 'integer' },
      'boolean': { type: 'boolean' },
      'bool': { type: 'boolean' },
      'object': { type: 'object' },
      'array': { type: 'array' },
      'any': { type: 'object' },
      'null': { type: 'null' },
      '*': { type: 'object' }
    };
    
    return typeMap[type] || { type: 'string' };
  }
  
  /**
   * Extract all functions from file content
   * @param {string} content
   * @returns {Array}
   */
  extractFunctions(content) {
    const functions = [];
    
    // Match function declarations with JSDoc
    const regex = /(\/\*\*[\s\S]*?\*\/)\s*(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const [, jsdoc, name, params] = match;
      functions.push({
        name,
        params: this.parseParameterString(params),
        jsdoc: this.parseJSDoc(jsdoc)
      });
    }
    
    // Match arrow functions with JSDoc
    const arrowRegex = /(\/\*\*[\s\S]*?\*\/)\s*(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/g;
    
    while ((match = arrowRegex.exec(content)) !== null) {
      const [, jsdoc, name, params] = match;
      functions.push({
        name,
        params: this.parseParameterString(params),
        jsdoc: this.parseJSDoc(jsdoc)
      });
    }
    
    return functions;
  }
  
  /**
   * Generate OpenAI function tool schema
   * @param {string} name
   * @param {string} description
   * @param {Object} parameters
   * @returns {Object}
   */
  toOpenAITool(name, description, parameters) {
    return {
      type: 'function',
      function: {
        name,
        description,
        parameters
      }
    };
  }
  
  /**
   * Generate Anthropic tool schema
   * @param {string} name
   * @param {string} description
   * @param {Object} parameters
   * @returns {Object}
   */
  toAnthropicTool(name, description, parameters) {
    return {
      name,
      description,
      input_schema: parameters
    };
  }
}

/**
 * Create a schema generator with default options
 */
function createSchemaGenerator(options = {}) {
  return new SchemaGenerator(options);
}

module.exports = {
  SchemaGenerator,
  createSchemaGenerator
};
