/**
 * MUSUBI Agent Loop
 * 
 * Implements agentic tool-calling loop inspired by OpenAI Agents SDK
 * and AutoGen patterns. Executes tool calls, processes results, and
 * continues until completion or limit is reached.
 * 
 * @module agents/agent-loop
 */

const EventEmitter = require('events');

/**
 * @typedef {Object} AgentLoopConfig
 * @property {number} [maxIterations=10] - Maximum tool calling iterations
 * @property {number} [timeout=60000] - Total timeout in milliseconds
 * @property {number} [iterationTimeout=30000] - Per-iteration timeout
 * @property {boolean} [continueOnError=false] - Continue on tool errors
 * @property {Function} [completionCheck] - Custom completion checker
 * @property {Object} [guardrails] - Input/output guardrails
 */

/**
 * @typedef {Object} ToolDefinition
 * @property {string} name - Tool name
 * @property {string} description - Tool description
 * @property {Object} parameters - JSON Schema for parameters
 * @property {Function} handler - Async function to execute
 */

/**
 * @typedef {Object} ToolCall
 * @property {string} id - Unique call ID
 * @property {string} tool - Tool name
 * @property {Object} arguments - Tool arguments
 */

/**
 * @typedef {Object} LoopResult
 * @property {string} status - 'completed' | 'max_iterations' | 'timeout' | 'error'
 * @property {Array} messages - Conversation history
 * @property {Array} toolCalls - All tool calls made
 * @property {*} finalOutput - Final result
 * @property {Object} metrics - Execution metrics
 */

/**
 * AgentLoop class for managing tool-calling agentic workflows
 */
class AgentLoop extends EventEmitter {
  /**
   * @param {AgentLoopConfig} config
   */
  constructor(config = {}) {
    super();
    
    this.maxIterations = config.maxIterations ?? 10;
    this.timeout = config.timeout ?? 60000;
    this.iterationTimeout = config.iterationTimeout ?? 30000;
    this.continueOnError = config.continueOnError ?? false;
    this.completionCheck = config.completionCheck ?? this.defaultCompletionCheck.bind(this);
    this.guardrails = config.guardrails ?? null;
    
    /** @type {Map<string, ToolDefinition>} */
    this.tools = new Map();
    
    /** @type {Array} */
    this.messages = [];
    
    /** @type {Array<ToolCall>} */
    this.toolCallHistory = [];
    
    /** @type {boolean} */
    this.isRunning = false;
    
    /** @type {AbortController|null} */
    this.abortController = null;
  }
  
  /**
   * Register a tool for the agent to use
   * @param {ToolDefinition} tool
   */
  registerTool(tool) {
    if (!tool.name || typeof tool.handler !== 'function') {
      throw new Error('Tool must have name and handler function');
    }
    
    this.tools.set(tool.name, {
      name: tool.name,
      description: tool.description || '',
      parameters: tool.parameters || { type: 'object', properties: {} },
      handler: tool.handler
    });
    
    this.emit('tool:registered', { name: tool.name });
    return this;
  }
  
  /**
   * Register multiple tools at once
   * @param {ToolDefinition[]} tools
   */
  registerTools(tools) {
    for (const tool of tools) {
      this.registerTool(tool);
    }
    return this;
  }
  
  /**
   * Unregister a tool
   * @param {string} name
   */
  unregisterTool(name) {
    const deleted = this.tools.delete(name);
    if (deleted) {
      this.emit('tool:unregistered', { name });
    }
    return deleted;
  }
  
  /**
   * Get all registered tools in OpenAI function format
   * @returns {Array}
   */
  getToolSchemas() {
    return Array.from(this.tools.values()).map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }
  
  /**
   * Run the agent loop with an LLM provider
   * @param {Object} options
   * @param {Object} options.llmProvider - LLM provider with chat() method
   * @param {string} options.systemPrompt - System prompt for the agent
   * @param {string} options.userMessage - Initial user message
   * @param {Object} [options.context] - Additional context
   * @returns {Promise<LoopResult>}
   */
  async run({ llmProvider, systemPrompt, userMessage, context = {} }) {
    if (this.isRunning) {
      throw new Error('Agent loop is already running');
    }
    
    this.isRunning = true;
    this.abortController = new AbortController();
    this.messages = [];
    this.toolCallHistory = [];
    
    const startTime = Date.now();
    const timeoutId = setTimeout(() => this.abort('timeout'), this.timeout);
    
    const metrics = {
      iterations: 0,
      toolCalls: 0,
      startTime,
      endTime: null,
      duration: null,
      tokensUsed: 0
    };
    
    try {
      // Initialize messages
      this.messages.push({ role: 'system', content: systemPrompt });
      
      // Apply input guardrails if configured
      const processedInput = await this.applyInputGuardrails(userMessage, context);
      this.messages.push({ role: 'user', content: processedInput });
      
      let iteration = 0;
      let completed = false;
      let finalOutput = null;
      
      while (iteration < this.maxIterations && !completed) {
        if (this.abortController.signal.aborted) {
          return this.createResult('aborted', finalOutput, metrics);
        }
        
        iteration++;
        metrics.iterations = iteration;
        this.emit('iteration:start', { iteration, maxIterations: this.maxIterations });
        
        // Call LLM
        const response = await this.callLLMWithTimeout(llmProvider, {
          messages: this.messages,
          tools: this.getToolSchemas(),
          context
        });
        
        if (response.usage) {
          metrics.tokensUsed += response.usage.total_tokens || 0;
        }
        
        // Check for tool calls
        if (response.toolCalls && response.toolCalls.length > 0) {
          // Execute tool calls
          const toolResults = await this.executeToolCalls(response.toolCalls);
          metrics.toolCalls += response.toolCalls.length;
          
          // Add assistant message with tool calls
          this.messages.push({
            role: 'assistant',
            content: response.content || null,
            tool_calls: response.toolCalls.map(tc => ({
              id: tc.id,
              type: 'function',
              function: {
                name: tc.tool || tc.name,
                arguments: JSON.stringify(tc.arguments)
              }
            }))
          });
          
          // Add tool results
          for (const result of toolResults) {
            this.messages.push({
              role: 'tool',
              tool_call_id: result.callId,
              content: JSON.stringify(result.output)
            });
          }
          
          this.emit('iteration:complete', {
            iteration,
            toolCalls: response.toolCalls.length,
            hasMore: true
          });
        } else {
          // No tool calls - LLM response is final
          finalOutput = response.content;
          
          // Apply output guardrails
          finalOutput = await this.applyOutputGuardrails(finalOutput, context);
          
          // Add final assistant message
          this.messages.push({
            role: 'assistant',
            content: finalOutput
          });
          
          // Check completion
          completed = await this.completionCheck(finalOutput, this.messages, context);
          
          this.emit('iteration:complete', {
            iteration,
            toolCalls: 0,
            hasMore: !completed
          });
        }
      }
      
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - startTime;
      
      if (iteration >= this.maxIterations && !completed) {
        return this.createResult('max_iterations', finalOutput, metrics);
      }
      
      return this.createResult('completed', finalOutput, metrics);
      
    } catch (error) {
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - startTime;
      
      this.emit('error', error);
      
      if (error.message === 'timeout') {
        return this.createResult('timeout', null, metrics);
      }
      
      return this.createResult('error', null, metrics, error);
    } finally {
      clearTimeout(timeoutId);
      this.isRunning = false;
      this.abortController = null;
    }
  }
  
  /**
   * Call LLM with per-iteration timeout
   * @param {Object} llmProvider
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async callLLMWithTimeout(llmProvider, options) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Iteration timeout'));
      }, this.iterationTimeout);
      
      llmProvider.chat(options)
        .then(response => {
          clearTimeout(timeoutId);
          resolve(response);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }
  
  /**
   * Execute tool calls and collect results
   * @param {ToolCall[]} toolCalls
   * @returns {Promise<Array>}
   */
  async executeToolCalls(toolCalls) {
    const results = [];
    
    for (const call of toolCalls) {
      const toolName = call.tool || call.name;
      const callId = call.id || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.emit('tool:call', { name: toolName, arguments: call.arguments, id: callId });
      
      try {
        const tool = this.tools.get(toolName);
        
        if (!tool) {
          throw new Error(`Unknown tool: ${toolName}`);
        }
        
        const output = await tool.handler(call.arguments);
        
        this.toolCallHistory.push({
          id: callId,
          tool: toolName,
          arguments: call.arguments,
          output,
          status: 'success'
        });
        
        results.push({
          callId,
          tool: toolName,
          output,
          status: 'success'
        });
        
        this.emit('tool:result', { name: toolName, output, id: callId, status: 'success' });
        
      } catch (error) {
        const _errorResult = {
          callId,
          tool: toolName,
          error: error.message,
          status: 'error'
        };
        
        this.toolCallHistory.push({
          id: callId,
          tool: toolName,
          arguments: call.arguments,
          error: error.message,
          status: 'error'
        });
        
        this.emit('tool:error', { name: toolName, error: error.message, id: callId });
        
        if (this.continueOnError) {
          results.push({
            callId,
            tool: toolName,
            output: { error: error.message },
            status: 'error'
          });
        } else {
          throw error;
        }
      }
    }
    
    return results;
  }
  
  /**
   * Default completion check - returns true when LLM provides final response
   * @param {*} output
   * @param {Array} messages
   * @param {Object} context
   * @returns {Promise<boolean>}
   */
  async defaultCompletionCheck(_output, _messages, _context) {
    // By default, if we reach here (no tool calls), we're done
    return true;
  }
  
  /**
   * Apply input guardrails if configured
   * @param {string} input
   * @param {Object} context
   * @returns {Promise<string>}
   */
  async applyInputGuardrails(input, context) {
    if (!this.guardrails?.input) {
      return input;
    }
    
    try {
      const result = await this.guardrails.input.validate(input, context);
      if (!result.valid) {
        throw new Error(`Input guardrail violation: ${result.reason}`);
      }
      return result.transformed || input;
    } catch (error) {
      this.emit('guardrail:input:error', error);
      throw error;
    }
  }
  
  /**
   * Apply output guardrails if configured
   * @param {string} output
   * @param {Object} context
   * @returns {Promise<string>}
   */
  async applyOutputGuardrails(output, context) {
    if (!this.guardrails?.output) {
      return output;
    }
    
    try {
      const result = await this.guardrails.output.validate(output, context);
      if (!result.valid) {
        this.emit('guardrail:output:violation', { output, reason: result.reason });
        return result.fallback || '[Output blocked by guardrails]';
      }
      return result.transformed || output;
    } catch (error) {
      this.emit('guardrail:output:error', error);
      return output;
    }
  }
  
  /**
   * Create standardized result object
   * @param {string} status
   * @param {*} finalOutput
   * @param {Object} metrics
   * @param {Error} [error]
   * @returns {LoopResult}
   */
  createResult(status, finalOutput, metrics, error = null) {
    return {
      status,
      messages: this.messages,
      toolCalls: this.toolCallHistory,
      finalOutput,
      metrics: {
        ...metrics,
        toolCallCount: this.toolCallHistory.length,
        successfulCalls: this.toolCallHistory.filter(tc => tc.status === 'success').length,
        failedCalls: this.toolCallHistory.filter(tc => tc.status === 'error').length
      },
      ...(error && { error: error.message })
    };
  }
  
  /**
   * Abort the running loop
   * @param {string} [reason='aborted']
   */
  abort(reason = 'aborted') {
    if (this.abortController) {
      this.abortController.abort();
      this.emit('abort', { reason });
    }
  }
  
  /**
   * Get current loop state
   * @returns {Object}
   */
  getState() {
    return {
      isRunning: this.isRunning,
      messageCount: this.messages.length,
      toolCallCount: this.toolCallHistory.length,
      registeredTools: Array.from(this.tools.keys())
    };
  }
  
  /**
   * Reset the loop state
   */
  reset() {
    if (this.isRunning) {
      throw new Error('Cannot reset while loop is running');
    }
    
    this.messages = [];
    this.toolCallHistory = [];
    this.emit('reset');
  }
}

/**
 * Create a simple mock LLM provider for testing
 * @param {Array} responses - Pre-defined responses
 * @returns {Object}
 */
function createMockLLMProvider(responses) {
  let callIndex = 0;
  
  return {
    async chat(_options) {
      if (callIndex >= responses.length) {
        return { content: 'Done', toolCalls: [] };
      }
      
      const response = responses[callIndex++];
      return {
        content: response.content || null,
        toolCalls: response.toolCalls || [],
        usage: response.usage || { total_tokens: 100 }
      };
    }
  };
}

module.exports = {
  AgentLoop,
  createMockLLMProvider
};
