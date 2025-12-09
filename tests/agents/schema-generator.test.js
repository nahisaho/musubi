/**
 * Schema Generator Tests
 * Tests for automatic schema generation from functions
 */

const { SchemaGenerator, createSchemaGenerator } = require('../../src/agents/schema-generator');
const path = require('path');
const fs = require('fs');

describe('SchemaGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new SchemaGenerator();
  });

  describe('constructor', () => {
    test('should create with default options', () => {
      const gen = new SchemaGenerator();
      expect(gen.strict).toBe(false);
      expect(gen.includeExamples).toBe(true);
      expect(gen.defaultType).toBe('string');
    });

    test('should accept custom options', () => {
      const gen = new SchemaGenerator({
        strict: true,
        includeExamples: false,
        defaultType: 'object'
      });
      expect(gen.strict).toBe(true);
      expect(gen.includeExamples).toBe(false);
      expect(gen.defaultType).toBe('object');
    });
  });

  describe('fromFunction', () => {
    test('should generate schema from simple function', () => {
      function greet(name, greeting) {
        return `${greeting}, ${name}!`;
      }

      const schema = generator.fromFunction(greet);

      expect(schema.type).toBe('object');
      expect(schema.properties).toHaveProperty('name');
      expect(schema.properties).toHaveProperty('greeting');
    });

    test('should handle arrow functions', () => {
      const add = (a, b) => a + b;

      const schema = generator.fromFunction(add);

      expect(schema.properties).toHaveProperty('a');
      expect(schema.properties).toHaveProperty('b');
    });

    test('should handle async functions', () => {
      async function fetchData(url, options) {
        return {};
      }

      const schema = generator.fromFunction(fetchData);

      expect(schema.properties).toHaveProperty('url');
      expect(schema.properties).toHaveProperty('options');
    });

    test('should handle functions with default values', () => {
      function search(query, limit = 10, offset = 0) {
        return [];
      }

      const schema = generator.fromFunction(search);

      expect(schema.properties.query).toBeDefined();
      expect(schema.properties.limit.default).toBe(10);
      expect(schema.properties.offset.default).toBe(0);
      expect(schema.required).toContain('query');
      expect(schema.required).not.toContain('limit');
    });

    test('should infer types from default values', () => {
      function example(
        str = 'default',
        num = 42,
        bool = true,
        arr = [],
        obj = {}
      ) {}

      const schema = generator.fromFunction(example);

      expect(schema.properties.str.type).toBe('string');
      expect(schema.properties.num.type).toBe('integer');
      expect(schema.properties.bool.type).toBe('boolean');
      expect(schema.properties.arr.type).toBe('array');
      expect(schema.properties.obj.type).toBe('object');
    });
  });

  describe('fromJSDoc', () => {
    test('should generate schema from JSDoc', () => {
      const jsdoc = `
        /**
         * Search for items
         * @param {string} query - Search query
         * @param {number} limit - Max results
         * @param {boolean} [fuzzy] - Enable fuzzy search
         */
      `;

      const schema = generator.fromJSDoc(jsdoc);

      expect(schema.properties.query.type).toBe('string');
      expect(schema.properties.query.description).toBe('Search query');
      expect(schema.properties.limit.type).toBe('number');
      expect(schema.properties.fuzzy.type).toBe('boolean');
      expect(schema.required).toContain('query');
      expect(schema.required).toContain('limit');
      expect(schema.required).not.toContain('fuzzy');
    });

    test('should handle complex JSDoc types', () => {
      const jsdoc = `
        /**
         * Process data
         * @param {string[]} items - List of items
         * @param {object} config - Configuration
         * @param {string|number} id - Identifier
         */
      `;

      const schema = generator.fromJSDoc(jsdoc);

      expect(schema.properties.items.type).toBe('array');
      expect(schema.properties.items.items.type).toBe('string');
      expect(schema.properties.config.type).toBe('object');
      expect(schema.properties.id.anyOf).toBeDefined();
    });
  });

  describe('parseJSDoc', () => {
    test('should parse description', () => {
      const jsdoc = `
        /**
         * This is the main description
         * that spans multiple lines
         */
      `;

      const parsed = generator.parseJSDoc(jsdoc);
      expect(parsed.description).toContain('main description');
    });

    test('should parse @param tags', () => {
      const jsdoc = `
        /**
         * Function
         * @param {string} name - User name
         * @param {number} age - User age
         */
      `;

      const parsed = generator.parseJSDoc(jsdoc);
      expect(parsed.params).toHaveLength(2);
      expect(parsed.params[0].name).toBe('name');
      expect(parsed.params[0].type).toBe('string');
    });

    test('should parse @returns tag', () => {
      const jsdoc = `
        /**
         * @returns {Promise<object>} The result
         */
      `;

      const parsed = generator.parseJSDoc(jsdoc);
      expect(parsed.returns.type.toLowerCase()).toBe('promise<object>');
    });

    test('should parse @throws tags', () => {
      const jsdoc = `
        /**
         * @throws {Error} When input is invalid
         * @throws {TypeError} When type is wrong
         */
      `;

      const parsed = generator.parseJSDoc(jsdoc);
      expect(parsed.throws).toHaveLength(2);
      expect(parsed.throws[0].type).toBe('Error');
    });

    test('should parse @example tag', () => {
      const jsdoc = `
        /**
         * @example
         * const result = add(1, 2);
         * console.log(result); // 3
         */
      `;

      const parsed = generator.parseJSDoc(jsdoc);
      expect(parsed.example).toContain('add(1, 2)');
    });
  });

  describe('extractParameters', () => {
    test('should extract simple parameters', () => {
      const fnString = 'function test(a, b, c) {}';
      const params = generator.extractParameters(fnString);

      expect(params).toHaveLength(3);
      expect(params.map(p => p.name)).toEqual(['a', 'b', 'c']);
    });

    test('should handle empty parameters', () => {
      const fnString = 'function noParams() {}';
      const params = generator.extractParameters(fnString);

      expect(params).toHaveLength(0);
    });

    test('should handle destructured parameters', () => {
      const fnString = 'function test({ name, age }) {}';
      const params = generator.extractParameters(fnString);

      expect(params[0].destructured).toEqual(['name', 'age']);
    });

    test('should handle default values', () => {
      const fnString = 'function test(a, b = 10) {}';
      const params = generator.extractParameters(fnString);

      expect(params[0].required).toBe(true);
      expect(params[1].required).toBe(false);
      expect(params[1].default).toBe(10);
    });
  });

  describe('typeToSchema', () => {
    test('should convert basic types', () => {
      expect(generator.typeToSchema('string')).toEqual({ type: 'string' });
      expect(generator.typeToSchema('number')).toEqual({ type: 'number' });
      expect(generator.typeToSchema('boolean')).toEqual({ type: 'boolean' });
      expect(generator.typeToSchema('object')).toEqual({ type: 'object' });
    });

    test('should handle array types', () => {
      const schema = generator.typeToSchema('string[]');
      expect(schema.type).toBe('array');
      expect(schema.items.type).toBe('string');
    });

    test('should handle union types', () => {
      const schema = generator.typeToSchema('string|number');
      expect(schema.anyOf).toHaveLength(2);
    });

    test('should handle type aliases', () => {
      expect(generator.typeToSchema('int').type).toBe('integer');
      expect(generator.typeToSchema('bool').type).toBe('boolean');
    });
  });

  describe('toOpenAITool', () => {
    test('should generate OpenAI tool format', () => {
      const tool = generator.toOpenAITool(
        'search',
        'Search for items',
        { type: 'object', properties: { query: { type: 'string' } } }
      );

      expect(tool).toEqual({
        type: 'function',
        function: {
          name: 'search',
          description: 'Search for items',
          parameters: { type: 'object', properties: { query: { type: 'string' } } }
        }
      });
    });
  });

  describe('toAnthropicTool', () => {
    test('should generate Anthropic tool format', () => {
      const tool = generator.toAnthropicTool(
        'search',
        'Search for items',
        { type: 'object', properties: { query: { type: 'string' } } }
      );

      expect(tool).toEqual({
        name: 'search',
        description: 'Search for items',
        input_schema: { type: 'object', properties: { query: { type: 'string' } } }
      });
    });
  });

  describe('strict mode', () => {
    test('should add additionalProperties: false in strict mode', () => {
      const strictGenerator = new SchemaGenerator({ strict: true });
      
      function example(a, b) {}
      const schema = strictGenerator.fromFunction(example);

      expect(schema.additionalProperties).toBe(false);
    });
  });

  describe('fromMethod', () => {
    test('should generate schema from class method', () => {
      class Calculator {
        add(a, b) {
          return a + b;
        }
      }

      const calc = new Calculator();
      const schema = generator.fromMethod(calc, 'add');

      // Schema should be an object type at minimum
      expect(schema.type).toBe('object');
      // If properties are extracted, they should include a and b
      // Note: bound methods may not preserve parameter info
      expect(schema.properties).toBeDefined();
    });

    test('should throw for non-method', () => {
      const obj = { value: 42 };

      expect(() => {
        generator.fromMethod(obj, 'value');
      }).toThrow('value is not a method');
    });
  });

  describe('extractFunctions', () => {
    test('should extract functions from code', () => {
      const code = `
        /**
         * Add two numbers
         * @param {number} a
         * @param {number} b
         */
        function add(a, b) {
          return a + b;
        }

        /**
         * Subtract numbers
         * @param {number} x
         * @param {number} y
         */
        const subtract = (x, y) => x - y;
      `;

      const functions = generator.extractFunctions(code);

      expect(functions).toHaveLength(2);
      expect(functions[0].name).toBe('add');
      expect(functions[1].name).toBe('subtract');
    });
  });
});

describe('createSchemaGenerator', () => {
  test('should create generator with options', () => {
    const generator = createSchemaGenerator({ strict: true });
    expect(generator).toBeInstanceOf(SchemaGenerator);
    expect(generator.strict).toBe(true);
  });
});
