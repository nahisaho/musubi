/**
 * Agent Loop Tests
 * Tests for the Agent Loop implementation
 */

const { AgentLoop, createMockLLMProvider } = require('../../src/agents/agent-loop');

describe('AgentLoop', () => {
  let agentLoop;

  beforeEach(() => {
    agentLoop = new AgentLoop({
      maxIterations: 5,
      timeout: 10000,
      iterationTimeout: 5000
    });
  });

  afterEach(() => {
    agentLoop.removeAllListeners();
    if (agentLoop.isRunning) {
      agentLoop.abort();
    }
  });

  describe('constructor', () => {
    test('should create with default config', () => {
      const loop = new AgentLoop();
      expect(loop.maxIterations).toBe(10);
      expect(loop.timeout).toBe(60000);
      expect(loop.iterationTimeout).toBe(30000);
      expect(loop.continueOnError).toBe(false);
    });

    test('should accept custom config', () => {
      const loop = new AgentLoop({
        maxIterations: 20,
        timeout: 120000,
        continueOnError: true
      });
      expect(loop.maxIterations).toBe(20);
      expect(loop.timeout).toBe(120000);
      expect(loop.continueOnError).toBe(true);
    });
  });

  describe('tool registration', () => {
    test('should register a tool', () => {
      agentLoop.registerTool({
        name: 'test_tool',
        description: 'A test tool',
        handler: async () => 'result'
      });

      expect(agentLoop.tools.has('test_tool')).toBe(true);
    });

    test('should register multiple tools', () => {
      agentLoop.registerTools([
        { name: 'tool_1', handler: async () => 'a' },
        { name: 'tool_2', handler: async () => 'b' }
      ]);

      expect(agentLoop.tools.size).toBe(2);
    });

    test('should unregister a tool', () => {
      agentLoop.registerTool({ name: 'temp_tool', handler: async () => {} });
      expect(agentLoop.tools.has('temp_tool')).toBe(true);
      
      agentLoop.unregisterTool('temp_tool');
      expect(agentLoop.tools.has('temp_tool')).toBe(false);
    });

    test('should throw on invalid tool', () => {
      expect(() => {
        agentLoop.registerTool({ name: 'no_handler' });
      }).toThrow('Tool must have name and handler function');
    });

    test('should emit tool:registered event', () => {
      const eventHandler = jest.fn();
      agentLoop.on('tool:registered', eventHandler);

      agentLoop.registerTool({ name: 'event_tool', handler: async () => {} });

      expect(eventHandler).toHaveBeenCalledWith({ name: 'event_tool' });
    });
  });

  describe('getToolSchemas', () => {
    test('should return OpenAI-formatted tool schemas', () => {
      agentLoop.registerTool({
        name: 'search',
        description: 'Search the web',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' }
          },
          required: ['query']
        },
        handler: async () => {}
      });

      const schemas = agentLoop.getToolSchemas();

      expect(schemas).toHaveLength(1);
      expect(schemas[0]).toEqual({
        type: 'function',
        function: {
          name: 'search',
          description: 'Search the web',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' }
            },
            required: ['query']
          }
        }
      });
    });
  });

  describe('run', () => {
    test('should complete with final response', async () => {
      const mockLLM = createMockLLMProvider([
        { content: 'Hello, I completed the task!' }
      ]);

      const result = await agentLoop.run({
        llmProvider: mockLLM,
        systemPrompt: 'You are a helpful assistant',
        userMessage: 'Say hello'
      });

      expect(result.status).toBe('completed');
      expect(result.finalOutput).toBe('Hello, I completed the task!');
      expect(result.metrics.iterations).toBe(1);
    });

    test('should execute tool calls', async () => {
      agentLoop.registerTool({
        name: 'get_weather',
        description: 'Get weather',
        handler: async (args) => ({ temperature: 72, city: args.city })
      });

      const mockLLM = createMockLLMProvider([
        {
          content: null,
          toolCalls: [{ id: 'call_1', tool: 'get_weather', arguments: { city: 'Tokyo' } }]
        },
        { content: 'The weather in Tokyo is 72°F' }
      ]);

      const result = await agentLoop.run({
        llmProvider: mockLLM,
        systemPrompt: 'You are a weather assistant',
        userMessage: 'What is the weather in Tokyo?'
      });

      expect(result.status).toBe('completed');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].tool).toBe('get_weather');
      expect(result.toolCalls[0].output).toEqual({ temperature: 72, city: 'Tokyo' });
    });

    test('should handle multiple tool calls', async () => {
      agentLoop.registerTools([
        { name: 'tool_a', handler: async () => 'result_a' },
        { name: 'tool_b', handler: async () => 'result_b' }
      ]);

      const mockLLM = createMockLLMProvider([
        {
          toolCalls: [
            { id: 'call_1', tool: 'tool_a', arguments: {} },
            { id: 'call_2', tool: 'tool_b', arguments: {} }
          ]
        },
        { content: 'Both tools executed' }
      ]);

      const result = await agentLoop.run({
        llmProvider: mockLLM,
        systemPrompt: 'Assistant',
        userMessage: 'Run both tools'
      });

      expect(result.toolCalls).toHaveLength(2);
      expect(result.metrics.toolCallCount).toBe(2);
    });

    test('should stop at max iterations', async () => {
      agentLoop.maxIterations = 3;
      
      agentLoop.registerTool({
        name: 'loop_tool',
        handler: async () => 'continue'
      });

      // LLM always requests tool calls
      const mockLLM = {
        async chat() {
          return {
            toolCalls: [{ id: `call_${Date.now()}`, tool: 'loop_tool', arguments: {} }]
          };
        }
      };

      const result = await agentLoop.run({
        llmProvider: mockLLM,
        systemPrompt: 'Assistant',
        userMessage: 'Keep looping'
      });

      expect(result.status).toBe('max_iterations');
      expect(result.metrics.iterations).toBe(3);
    });

    test('should handle tool errors with continueOnError=true', async () => {
      agentLoop.continueOnError = true;
      
      agentLoop.registerTool({
        name: 'failing_tool',
        handler: async () => { throw new Error('Tool failed'); }
      });

      const mockLLM = createMockLLMProvider([
        {
          toolCalls: [{ id: 'call_1', tool: 'failing_tool', arguments: {} }]
        },
        { content: 'Handled the error' }
      ]);

      const result = await agentLoop.run({
        llmProvider: mockLLM,
        systemPrompt: 'Assistant',
        userMessage: 'Try the tool'
      });

      expect(result.status).toBe('completed');
      expect(result.toolCalls[0].status).toBe('error');
    });

    test('should fail on tool error with continueOnError=false', async () => {
      agentLoop.continueOnError = false;
      
      agentLoop.registerTool({
        name: 'failing_tool',
        handler: async () => { throw new Error('Tool failed'); }
      });

      const mockLLM = createMockLLMProvider([
        {
          toolCalls: [{ id: 'call_1', tool: 'failing_tool', arguments: {} }]
        }
      ]);

      // The run method should catch errors and return error status
      let result;
      try {
        result = await agentLoop.run({
          llmProvider: mockLLM,
          systemPrompt: 'Assistant',
          userMessage: 'Try the tool'
        });
      } catch (e) {
        // If it throws, that's also acceptable behavior
        expect(e.message).toContain('Tool failed');
        return;
      }

      expect(result.status).toBe('error');
      expect(result.error).toContain('Tool failed');
    });

    test('should prevent concurrent runs', async () => {
      const mockLLM = createMockLLMProvider([
        { content: 'Done' }
      ]);

      const promise1 = agentLoop.run({
        llmProvider: mockLLM,
        systemPrompt: 'Assistant',
        userMessage: 'Task 1'
      });

      await expect(agentLoop.run({
        llmProvider: mockLLM,
        systemPrompt: 'Assistant',
        userMessage: 'Task 2'
      })).rejects.toThrow('Agent loop is already running');

      await promise1;
    });

    test('should emit iteration events', async () => {
      const iterationStart = jest.fn();
      const iterationComplete = jest.fn();
      
      agentLoop.on('iteration:start', iterationStart);
      agentLoop.on('iteration:complete', iterationComplete);

      const mockLLM = createMockLLMProvider([
        { content: 'Done' }
      ]);

      await agentLoop.run({
        llmProvider: mockLLM,
        systemPrompt: 'Assistant',
        userMessage: 'Hello'
      });

      expect(iterationStart).toHaveBeenCalledWith({
        iteration: 1,
        maxIterations: 5
      });
      expect(iterationComplete).toHaveBeenCalled();
    });
  });

  describe('abort', () => {
    test('should abort running loop', async () => {
      agentLoop.registerTool({
        name: 'slow_tool',
        handler: async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return 'done';
        }
      });

      const mockLLM = {
        async chat() {
          return {
            toolCalls: [{ id: 'call_1', tool: 'slow_tool', arguments: {} }]
          };
        }
      };

      const promise = agentLoop.run({
        llmProvider: mockLLM,
        systemPrompt: 'Assistant',
        userMessage: 'Run slow tool'
      });

      // Abort after short delay
      setTimeout(() => agentLoop.abort('user_cancel'), 100);

      const result = await promise;
      expect(['aborted', 'error']).toContain(result.status);
    });
  });

  describe('getState', () => {
    test('should return current state', () => {
      agentLoop.registerTool({ name: 'tool1', handler: async () => {} });
      agentLoop.registerTool({ name: 'tool2', handler: async () => {} });

      const state = agentLoop.getState();

      expect(state.isRunning).toBe(false);
      expect(state.registeredTools).toContain('tool1');
      expect(state.registeredTools).toContain('tool2');
    });
  });

  describe('reset', () => {
    test('should reset loop state', async () => {
      const mockLLM = createMockLLMProvider([{ content: 'Done' }]);

      await agentLoop.run({
        llmProvider: mockLLM,
        systemPrompt: 'Assistant',
        userMessage: 'Hello'
      });

      expect(agentLoop.messages.length).toBeGreaterThan(0);

      agentLoop.reset();

      expect(agentLoop.messages).toHaveLength(0);
      expect(agentLoop.toolCallHistory).toHaveLength(0);
    });

    test('should throw if running', async () => {
      const mockLLM = {
        async chat() {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return { content: 'Done' };
        }
      };

      const promise = agentLoop.run({
        llmProvider: mockLLM,
        systemPrompt: 'Assistant',
        userMessage: 'Hello'
      });

      expect(() => agentLoop.reset()).toThrow('Cannot reset while loop is running');
      agentLoop.abort();
      await promise.catch(() => {}); // Ignore abort error
    });
  });

  describe('guardrails', () => {
    test('should apply input guardrails', async () => {
      const loop = new AgentLoop({
        guardrails: {
          input: {
            async validate(input) {
              if (input.includes('forbidden')) {
                return { valid: false, reason: 'Forbidden content' };
              }
              return { valid: true, transformed: input.toUpperCase() };
            }
          }
        }
      });

      const mockLLM = createMockLLMProvider([{ content: 'Done' }]);

      const result = await loop.run({
        llmProvider: mockLLM,
        systemPrompt: 'Assistant',
        userMessage: 'hello'
      });

      expect(result.status).toBe('completed');
      expect(result.messages[1].content).toBe('HELLO');
    });

    test('should block forbidden input', async () => {
      const loop = new AgentLoop({
        guardrails: {
          input: {
            async validate(input) {
              if (input.includes('forbidden')) {
                return { valid: false, reason: 'Forbidden content' };
              }
              return { valid: true };
            }
          }
        }
      });

      const mockLLM = createMockLLMProvider([{ content: 'Done' }]);

      let result;
      try {
        result = await loop.run({
          llmProvider: mockLLM,
          systemPrompt: 'Assistant',
          userMessage: 'This is forbidden content'
        });
      } catch (e) {
        // If it throws, that's also acceptable behavior
        expect(e.message).toContain('guardrail');
        return;
      }

      expect(result.status).toBe('error');
      expect(result.error).toContain('guardrail');
    });

    test('should apply output guardrails', async () => {
      const loop = new AgentLoop({
        guardrails: {
          output: {
            async validate(output) {
              if (output.includes('secret')) {
                return { valid: false, reason: 'Contains secret', fallback: '[REDACTED]' };
              }
              return { valid: true };
            }
          }
        }
      });

      const mockLLM = createMockLLMProvider([{ content: 'The secret is 123' }]);

      const result = await loop.run({
        llmProvider: mockLLM,
        systemPrompt: 'Assistant',
        userMessage: 'Tell me the secret'
      });

      expect(result.finalOutput).toBe('[REDACTED]');
    });
  });

  describe('metrics', () => {
    test('should track execution metrics', async () => {
      agentLoop.registerTool({
        name: 'counter',
        handler: async () => ({ count: 1 })
      });

      const mockLLM = createMockLLMProvider([
        { toolCalls: [{ id: '1', tool: 'counter', arguments: {} }], usage: { total_tokens: 50 } },
        { toolCalls: [{ id: '2', tool: 'counter', arguments: {} }], usage: { total_tokens: 50 } },
        { content: 'Done', usage: { total_tokens: 30 } }
      ]);

      const result = await agentLoop.run({
        llmProvider: mockLLM,
        systemPrompt: 'Counter',
        userMessage: 'Count twice'
      });

      expect(result.metrics.iterations).toBe(3);
      expect(result.metrics.toolCallCount).toBe(2);
      expect(result.metrics.successfulCalls).toBe(2);
      expect(result.metrics.failedCalls).toBe(0);
      expect(result.metrics.tokensUsed).toBe(130);
      expect(result.metrics.duration).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('createMockLLMProvider', () => {
  test('should create mock provider with responses', async () => {
    const mock = createMockLLMProvider([
      { content: 'Response 1' },
      { content: 'Response 2' }
    ]);

    const r1 = await mock.chat({});
    const r2 = await mock.chat({});
    const r3 = await mock.chat({});

    expect(r1.content).toBe('Response 1');
    expect(r2.content).toBe('Response 2');
    expect(r3.content).toBe('Done'); // Default when exhausted
  });
});
