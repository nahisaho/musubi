/**
 * Function Tool Tests
 * Tests for function tool decorator and schema generation
 */

const {
  functionTool,
  functionTools,
  asTool,
  withJSDoc,
  parseJSDoc,
  paramsToSchema,
  SchemaBuilder,
  validateArgs
} = require('../../src/agents/function-tool');

describe('functionTool', () => {
  describe('basic functionality', () => {
    test('should create tool from simple function', () => {
      function greet(name) {
        return `Hello, ${name}!`;
      }

      const tool = functionTool(greet);

      expect(tool.name).toBe('greet');
      expect(tool.description).toContain('greet');
      expect(tool.parameters).toBeDefined();
    });

    test('should create tool with custom options', () => {
      const tool = functionTool(
        (x) => x * 2,
        {
          name: 'double',
          description: 'Doubles a number',
          parameters: {
            type: 'object',
            properties: { x: { type: 'number' } }
          }
        }
      );

      expect(tool.name).toBe('double');
      expect(tool.description).toBe('Doubles a number');
    });

    test('should execute handler with arguments', async () => {
      const tool = functionTool(
        (a, b) => a + b,
        {
          name: 'add',
          parameters: {
            type: 'object',
            properties: {
              a: { type: 'number' },
              b: { type: 'number' }
            }
          }
        }
      );

      const result = await tool.handler({ a: 3, b: 5 });
      expect(result).toBe(8);
    });

    test('should handle async functions', async () => {
      async function fetchData(id) {
        return { id, data: 'fetched' };
      }

      const tool = functionTool(fetchData, {
        parameters: {
          type: 'object',
          properties: { id: { type: 'string' } }
        }
      });

      const result = await tool.handler({ id: '123' });
      expect(result).toEqual({ id: '123', data: 'fetched' });
    });
  });

  describe('JSDoc parsing', () => {
    test('should parse function with __jsdoc property', () => {
      function calculate(x, y) {
        return x + y;
      }
      
      calculate.__jsdoc = `
        /**
         * Calculate the sum of two numbers
         * @param {number} x - First number
         * @param {number} y - Second number
         * @returns {number} The sum
         */
      `;

      const tool = functionTool(calculate);

      expect(tool.description).toContain('sum');
      expect(tool.parameters.properties.x.type).toBe('number');
      expect(tool.parameters.properties.y.type).toBe('number');
    });
  });

  describe('parameter inference', () => {
    test('should infer parameters from function signature', () => {
      function process(input, options, callback) {
        // Parameters are used for inference only
        void input; void options; void callback;
        return 'processed';
      }

      const tool = functionTool(process);

      expect(tool.parameters.properties).toHaveProperty('input');
      expect(tool.parameters.properties).toHaveProperty('options');
      expect(tool.parameters.properties).toHaveProperty('callback');
    });
  });
});

describe('functionTools', () => {
  test('should create multiple tools from object', () => {
    const tools = functionTools({
      add: (a, b) => a + b,
      subtract: (a, b) => a - b,
      multiply: (a, b) => a * b
    });

    expect(tools).toHaveLength(3);
    expect(tools.map(t => t.name)).toEqual(['add', 'subtract', 'multiply']);
  });

  test('should apply per-function options', () => {
    const tools = functionTools(
      {
        search: (_query) => [],
        fetch: (_url) => ''
      },
      {
        search: { description: 'Search for items' },
        fetch: { description: 'Fetch a URL' }
      }
    );

    expect(tools[0].description).toBe('Search for items');
    expect(tools[1].description).toBe('Fetch a URL');
  });
});

describe('asTool decorator', () => {
  test('should work as decorator-style wrapper', () => {
    const greet = asTool({ description: 'Greets a person' })(
      function(name) { return `Hello, ${name}!`; }
    );

    expect(greet.description).toBe('Greets a person');
    expect(typeof greet.handler).toBe('function');
  });
});

describe('withJSDoc', () => {
  test('should add JSDoc to function', () => {
    const fn = withJSDoc(`
      /**
       * A documented function
       * @param {string} input - The input
       */
    `)(function(input) { return input; });

    expect(fn.__jsdoc).toContain('documented function');
  });
});

describe('parseJSDoc', () => {
  test('should parse description', () => {
    const jsdoc = `
      /**
       * This is a description
       * that spans multiple lines
       */
    `;

    const parsed = parseJSDoc(jsdoc);
    expect(parsed.description).toContain('description');
    expect(parsed.description).toContain('multiple lines');
  });

  test('should parse @param tags', () => {
    const jsdoc = `
      /**
       * Function description
       * @param {string} name - The user name
       * @param {number} age - The user age
       * @param {boolean} [active] - Optional active flag
       */
    `;

    const parsed = parseJSDoc(jsdoc);

    expect(parsed.params).toHaveLength(3);
    expect(parsed.params[0]).toEqual({
      name: 'name',
      type: 'string',
      required: true,
      description: 'The user name'
    });
    expect(parsed.params[1].type).toBe('number');
    expect(parsed.params[2].required).toBe(false);
  });

  test('should parse @returns tag', () => {
    const jsdoc = `
      /**
       * Get user
       * @returns {object} The user object
       */
    `;

    const parsed = parseJSDoc(jsdoc);
    expect(parsed.returns).toEqual({
      type: 'object',
      description: 'The user object'
    });
  });

  test('should parse @example tag', () => {
    const jsdoc = `
      /**
       * Add numbers
       * @example
       * add(1, 2) // returns 3
       */
    `;

    const parsed = parseJSDoc(jsdoc);
    expect(parsed.example).toContain('add(1, 2)');
  });

  test('should handle empty jsdoc', () => {
    const parsed = parseJSDoc('');
    expect(parsed.description).toBe('');
    expect(parsed.params).toEqual([]);
  });

  test('should handle null jsdoc', () => {
    const parsed = parseJSDoc(null);
    expect(parsed.description).toBe('');
  });
});

describe('paramsToSchema', () => {
  test('should convert params to JSON Schema', () => {
    const params = [
      { name: 'query', type: 'string', required: true, description: 'Search query' },
      { name: 'limit', type: 'number', required: false, description: 'Max results' }
    ];

    const schema = paramsToSchema(params);

    expect(schema.type).toBe('object');
    expect(schema.properties.query).toEqual({
      type: 'string',
      description: 'Search query'
    });
    expect(schema.properties.limit.type).toBe('number');
    expect(schema.required).toEqual(['query']);
  });

  test('should handle union types', () => {
    const params = [
      { name: 'id', type: 'string|number', required: true, description: 'ID' }
    ];

    const schema = paramsToSchema(params);
    expect(schema.properties.id.anyOf).toBeDefined();
  });

  test('should handle array types', () => {
    const params = [
      { name: 'items', type: 'string[]', required: true, description: 'Items' }
    ];

    const schema = paramsToSchema(params);
    expect(schema.properties.items.type).toBe('array');
    expect(schema.properties.items.items.type).toBe('string');
  });
});

describe('SchemaBuilder', () => {
  test('should build string schema', () => {
    const schema = SchemaBuilder.string({ description: 'Name' });
    expect(schema).toEqual({ type: 'string', description: 'Name' });
  });

  test('should build number schema', () => {
    const schema = SchemaBuilder.number({ minimum: 0 });
    expect(schema.type).toBe('number');
    expect(schema.minimum).toBe(0);
  });

  test('should build array schema', () => {
    const schema = SchemaBuilder.array(
      { type: 'string' },
      { description: 'List of names' }
    );
    expect(schema.type).toBe('array');
    expect(schema.items).toEqual({ type: 'string' });
  });

  test('should build object schema', () => {
    const schema = SchemaBuilder.object(
      {
        name: { type: 'string' },
        age: { type: 'integer' }
      },
      ['name']
    );

    expect(schema.type).toBe('object');
    expect(schema.properties.name.type).toBe('string');
    expect(schema.required).toEqual(['name']);
  });

  test('should build enum schema', () => {
    const schema = SchemaBuilder.enum(['red', 'green', 'blue']);
    expect(schema.type).toBe('string');
    expect(schema.enum).toEqual(['red', 'green', 'blue']);
  });

  test('should build oneOf schema', () => {
    const schema = SchemaBuilder.oneOf([
      { type: 'string' },
      { type: 'number' }
    ]);
    expect(schema.oneOf).toHaveLength(2);
  });

  test('should build complex nested schema', () => {
    const schema = SchemaBuilder.object({
      user: SchemaBuilder.object({
        name: SchemaBuilder.string({ description: 'User name' }),
        email: SchemaBuilder.string({ format: 'email' })
      }, ['name', 'email']),
      tags: SchemaBuilder.array(SchemaBuilder.string()),
      status: SchemaBuilder.enum(['active', 'inactive'])
    }, ['user']);

    expect(schema.properties.user.type).toBe('object');
    expect(schema.properties.tags.type).toBe('array');
    expect(schema.properties.status.enum).toBeDefined();
  });
});

describe('validateArgs', () => {
  const schema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'integer' },
      active: { type: 'boolean' }
    },
    required: ['name'],
    additionalProperties: false
  };

  test('should validate valid args', () => {
    const result = validateArgs(
      { name: 'John', age: 30, active: true },
      schema
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should detect missing required properties', () => {
    const result = validateArgs({ age: 30 }, schema);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required parameter: name');
  });

  test('should detect type mismatches', () => {
    const result = validateArgs(
      { name: 123, age: 'thirty' },
      schema
    );

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('name'))).toBe(true);
    expect(result.errors.some(e => e.includes('age'))).toBe(true);
  });

  test('should detect unknown properties with additionalProperties=false', () => {
    const result = validateArgs(
      { name: 'John', unknown: 'value' },
      schema
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Unknown parameter: unknown');
  });

  test('should validate enum values', () => {
    const enumSchema = {
      type: 'object',
      properties: {
        color: { type: 'string', enum: ['red', 'green', 'blue'] }
      }
    };

    const valid = validateArgs({ color: 'red' }, enumSchema);
    const invalid = validateArgs({ color: 'yellow' }, enumSchema);

    expect(valid.valid).toBe(true);
    expect(invalid.valid).toBe(false);
    expect(invalid.errors[0]).toContain('must be one of');
  });

  test('should accept integers for integer type', () => {
    const result = validateArgs({ name: 'John', age: 30 }, schema);
    expect(result.valid).toBe(true);
  });
});

describe('integration', () => {
  test('should work with AgentLoop', async () => {
    // Create tools using functionTool
    const tools = functionTools({
      add: (a, b) => Number(a) + Number(b),
      multiply: (a, b) => Number(a) * Number(b)
    }, {
      add: {
        description: 'Add two numbers',
        parameters: SchemaBuilder.object({
          a: SchemaBuilder.number({ description: 'First number' }),
          b: SchemaBuilder.number({ description: 'Second number' })
        }, ['a', 'b'])
      },
      multiply: {
        description: 'Multiply two numbers',
        parameters: SchemaBuilder.object({
          a: SchemaBuilder.number({ description: 'First number' }),
          b: SchemaBuilder.number({ description: 'Second number' })
        }, ['a', 'b'])
      }
    });

    // Verify tools are properly structured
    expect(tools[0].name).toBe('add');
    expect(tools[0].parameters.properties.a.type).toBe('number');
    
    // Execute tool handlers
    const addResult = await tools[0].handler({ a: 3, b: 5 });
    const multiplyResult = await tools[1].handler({ a: 4, b: 7 });
    
    expect(addResult).toBe(8);
    expect(multiplyResult).toBe(28);
  });
});
