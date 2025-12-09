/**
 * MUSUBI Function Tool
 * 
 * Provides decorator-style function registration and automatic
 * schema generation from JSDoc comments. Inspired by OpenAI
 * Agents SDK function tool patterns.
 * 
 * @module agents/function-tool
 */

/**
 * @typedef {Object} FunctionToolOptions
 * @property {string} [name] - Override function name
 * @property {string} [description] - Tool description
 * @property {Object} [parameters] - Override parameter schema
 * @property {boolean} [strict=false] - Enable strict mode
 */

/**
 * @typedef {Object} ParameterSchema
 * @property {string} type - JSON Schema type
 * @property {string} [description] - Parameter description
 * @property {boolean} [required] - Whether required
 * @property {*} [default] - Default value
 * @property {Array} [enum] - Allowed values
 */

/**
 * Map JavaScript types to JSON Schema types
 */
const TYPE_MAP = {
  'string': 'string',
  'number': 'number',
  'integer': 'integer',
  'boolean': 'boolean',
  'object': 'object',
  'array': 'array',
  'any': 'object',
  'null': 'null',
  'undefined': 'null',
  'function': 'object',
  'symbol': 'string',
  'bigint': 'integer'
};

/**
 * Parse JSDoc comment to extract parameter information
 * @param {string} jsdoc - JSDoc comment string
 * @returns {Object} Parsed JSDoc info
 */
function parseJSDoc(jsdoc) {
  if (!jsdoc) {
    return { description: '', params: [], returns: null };
  }
  
  const lines = jsdoc.split('\n').map(l => l.replace(/^\s*\*\s?/, '').trim());
  const result = {
    description: '',
    params: [],
    returns: null,
    example: null
  };
  
  let currentSection = 'description';
  let descriptionLines = [];
  
  for (const line of lines) {
    if (line.startsWith('@param')) {
      currentSection = 'param';
      const match = line.match(/@param\s+\{([^}]+)\}\s+(\[)?(\w+)(?:\])?(?:\s*-?\s*(.*))?/);
      if (match) {
        const [, type, optional, name, description] = match;
        result.params.push({
          name,
          type: type.toLowerCase(),
          required: !optional,
          description: description || ''
        });
      }
    } else if (line.startsWith('@returns') || line.startsWith('@return')) {
      currentSection = 'returns';
      const match = line.match(/@returns?\s+\{([^}]+)\}\s*(.*)/);
      if (match) {
        result.returns = {
          type: match[1].toLowerCase(),
          description: match[2] || ''
        };
      }
    } else if (line.startsWith('@example')) {
      currentSection = 'example';
      result.example = '';
    } else if (line.startsWith('@')) {
      currentSection = 'other';
    } else if (currentSection === 'description' && line && !line.startsWith('/')) {
      descriptionLines.push(line);
    } else if (currentSection === 'example' && !line.startsWith('@')) {
      result.example += (result.example ? '\n' : '') + line;
    }
  }
  
  result.description = descriptionLines.join(' ').trim();
  return result;
}

/**
 * Convert parsed JSDoc to JSON Schema parameters
 * @param {Array} params - Parsed param array
 * @returns {Object} JSON Schema
 */
function paramsToSchema(params) {
  const properties = {};
  const required = [];
  
  for (const param of params) {
    const schemaType = TYPE_MAP[param.type] || 'string';
    
    properties[param.name] = {
      type: schemaType,
      description: param.description || `Parameter: ${param.name}`
    };
    
    // Handle union types (e.g., "string|number")
    if (param.type.includes('|')) {
      const types = param.type.split('|').map(t => TYPE_MAP[t.trim()] || 'string');
      properties[param.name] = {
        anyOf: types.map(t => ({ type: t })),
        description: param.description
      };
    }
    
    // Handle array types (e.g., "string[]")
    if (param.type.endsWith('[]')) {
      const itemType = TYPE_MAP[param.type.slice(0, -2)] || 'string';
      properties[param.name] = {
        type: 'array',
        items: { type: itemType },
        description: param.description
      };
    }
    
    if (param.required) {
      required.push(param.name);
    }
  }
  
  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
    additionalProperties: false
  };
}

/**
 * Create a function tool from a function with JSDoc
 * @param {Function} fn - The function to wrap
 * @param {FunctionToolOptions} [options] - Override options
 * @returns {Object} Tool definition
 */
function functionTool(fn, options = {}) {
  const fnStr = fn.toString();
  const name = options.name || fn.name || 'anonymous_tool';
  
  // Try to extract JSDoc comment
  let jsdocInfo = { description: '', params: [], returns: null };
  
  // Check if function has __jsdoc property (from decorator)
  if (fn.__jsdoc) {
    jsdocInfo = parseJSDoc(fn.__jsdoc);
  } else {
    // Try to parse from function string (limited support)
    const jsdocMatch = fnStr.match(/\/\*\*[\s\S]*?\*\//);
    if (jsdocMatch) {
      jsdocInfo = parseJSDoc(jsdocMatch[0]);
    }
  }
  
  // Build parameter schema
  let parameters = options.parameters;
  
  if (!parameters && jsdocInfo.params.length > 0) {
    parameters = paramsToSchema(jsdocInfo.params);
  }
  
  if (!parameters) {
    // Try to infer from function parameters
    const paramMatch = fnStr.match(/\(([^)]*)\)/);
    if (paramMatch) {
      const paramNames = paramMatch[1]
        .split(',')
        .map(p => p.trim().replace(/=.*$/, '').replace(/\{.*\}/, '').trim())
        .filter(p => p && p !== '');
      
      if (paramNames.length > 0) {
        parameters = {
          type: 'object',
          properties: Object.fromEntries(
            paramNames.map(name => [name, { type: 'string', description: `Parameter: ${name}` }])
          ),
          required: paramNames
        };
      }
    }
  }
  
  // Default empty schema
  parameters = parameters || { type: 'object', properties: {} };
  
  return {
    name,
    description: options.description || jsdocInfo.description || `Function: ${name}`,
    parameters,
    handler: async (args) => {
      // Call the original function with arguments
      if (typeof args === 'object' && !Array.isArray(args)) {
        // Pass as keyword arguments if possible
        const paramNames = Object.keys(parameters.properties || {});
        if (paramNames.length > 0) {
          const orderedArgs = paramNames.map(name => args[name]);
          return await fn(...orderedArgs);
        }
      }
      return await fn(args);
    },
    __original: fn,
    __jsdocInfo: jsdocInfo
  };
}

/**
 * Decorator-style wrapper for creating function tools
 * Use with: const tool = asTool(myFunction, { description: '...' })
 * 
 * @param {FunctionToolOptions} [options]
 * @returns {Function} Decorator function
 */
function asTool(options = {}) {
  return function(fn) {
    return functionTool(fn, options);
  };
}

/**
 * Create multiple function tools from an object of functions
 * @param {Object<string, Function>} functions - Object with named functions
 * @param {Object<string, FunctionToolOptions>} [options] - Per-function options
 * @returns {Object[]} Array of tool definitions
 */
function functionTools(functions, options = {}) {
  return Object.entries(functions).map(([name, fn]) => {
    const fnOptions = options[name] || {};
    return functionTool(fn, { name, ...fnOptions });
  });
}

/**
 * Add JSDoc metadata to a function (for runtime access)
 * @param {string} jsdoc - JSDoc comment
 * @returns {Function} Decorator
 */
function withJSDoc(jsdoc) {
  return function(fn) {
    fn.__jsdoc = jsdoc;
    return fn;
  };
}

/**
 * Schema builder for complex parameter types
 */
const SchemaBuilder = {
  /**
   * Create a string schema
   * @param {Object} [options]
   */
  string(options = {}) {
    return { type: 'string', ...options };
  },
  
  /**
   * Create a number schema
   * @param {Object} [options]
   */
  number(options = {}) {
    return { type: 'number', ...options };
  },
  
  /**
   * Create an integer schema
   * @param {Object} [options]
   */
  integer(options = {}) {
    return { type: 'integer', ...options };
  },
  
  /**
   * Create a boolean schema
   * @param {Object} [options]
   */
  boolean(options = {}) {
    return { type: 'boolean', ...options };
  },
  
  /**
   * Create an array schema
   * @param {Object} itemSchema - Schema for array items
   * @param {Object} [options]
   */
  array(itemSchema, options = {}) {
    return { type: 'array', items: itemSchema, ...options };
  },
  
  /**
   * Create an object schema
   * @param {Object} properties - Property schemas
   * @param {string[]} [required] - Required properties
   * @param {Object} [options]
   */
  object(properties, required = [], options = {}) {
    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
      additionalProperties: options.additionalProperties ?? false,
      ...options
    };
  },
  
  /**
   * Create an enum schema
   * @param {Array} values - Allowed values
   * @param {Object} [options]
   */
  enum(values, options = {}) {
    return { type: 'string', enum: values, ...options };
  },
  
  /**
   * Create a oneOf schema
   * @param {Array} schemas - Possible schemas
   */
  oneOf(schemas) {
    return { oneOf: schemas };
  },
  
  /**
   * Create an anyOf schema
   * @param {Array} schemas - Possible schemas
   */
  anyOf(schemas) {
    return { anyOf: schemas };
  }
};

/**
 * Validate arguments against a schema
 * @param {Object} args - Arguments to validate
 * @param {Object} schema - JSON Schema
 * @returns {Object} Validation result
 */
function validateArgs(args, schema) {
  const errors = [];
  
  if (schema.type === 'object' && schema.properties) {
    // Check required properties
    if (schema.required) {
      for (const prop of schema.required) {
        if (args[prop] === undefined) {
          errors.push(`Missing required parameter: ${prop}`);
        }
      }
    }
    
    // Type check each property
    for (const [name, value] of Object.entries(args)) {
      const propSchema = schema.properties[name];
      if (!propSchema && schema.additionalProperties === false) {
        errors.push(`Unknown parameter: ${name}`);
        continue;
      }
      
      if (propSchema) {
        const typeError = validateType(value, propSchema, name);
        if (typeError) {
          errors.push(typeError);
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a value against a type schema
 * @param {*} value
 * @param {Object} schema
 * @param {string} name
 * @returns {string|null} Error message or null
 */
function validateType(value, schema, name) {
  const expectedType = schema.type;
  const actualType = Array.isArray(value) ? 'array' : typeof value;
  
  if (expectedType && actualType !== expectedType) {
    // Allow number for integer
    if (expectedType === 'integer' && typeof value === 'number' && Number.isInteger(value)) {
      return null;
    }
    return `Parameter '${name}' expected ${expectedType}, got ${actualType}`;
  }
  
  if (schema.enum && !schema.enum.includes(value)) {
    return `Parameter '${name}' must be one of: ${schema.enum.join(', ')}`;
  }
  
  return null;
}

module.exports = {
  functionTool,
  functionTools,
  asTool,
  withJSDoc,
  parseJSDoc,
  paramsToSchema,
  SchemaBuilder,
  validateArgs
};
