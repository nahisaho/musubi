/**
 * Tests for HumanInLoopPattern
 */

const {
  OrchestrationEngine,
  ExecutionContext,
  PatternType,
  ExecutionStatus,
  HumanInLoopPattern,
  GateType,
  GateResult,
  createHumanInLoopPattern
} = require('../../src/orchestration');

describe('HumanInLoopPattern', () => {
  let engine;
  let pattern;
  let humanGateResponse;

  beforeEach(() => {
    humanGateResponse = { approved: true };
    
    engine = new OrchestrationEngine({ 
      enableHumanValidation: true,
      humanGate: {
        request: async () => humanGateResponse
      }
    });

    pattern = createHumanInLoopPattern({ timeout: 1000 });
    engine.registerPattern(PatternType.HUMAN_IN_LOOP, pattern);

    // Register test skills
    engine.registerSkill('generate', async (input) => ({
      generated: true,
      content: `Generated content for: ${input.topic || 'default'}`,
      needsReview: true
    }));

    engine.registerSkill('process', async (input) => ({
      processed: true,
      input: input.content || input.topic,
      result: 'Processed successfully'
    }));

    engine.registerSkill('deploy', async (input) => ({
      deployed: true,
      target: input.target || 'production',
      status: 'success'
    }));

    engine.registerSkill('analyze', async (input) => ({
      analyzed: true,
      metrics: { quality: 0.9, coverage: 0.85 }
    }));
  });

  afterEach(() => {
    if (engine) {
      engine.cancelAll();
    }
  });

  describe('Pattern Creation', () => {
    test('should create pattern with default options', () => {
      const p = createHumanInLoopPattern();
      expect(p).toBeInstanceOf(HumanInLoopPattern);
      expect(p.metadata.name).toBe(PatternType.HUMAN_IN_LOOP);
    });

    test('should create pattern with custom options', () => {
      const p = createHumanInLoopPattern({
        timeout: 60000,
        autoApproveOnTimeout: true,
        collectFeedback: true
      });
      expect(p.options.timeout).toBe(60000);
      expect(p.options.autoApproveOnTimeout).toBe(true);
      expect(p.options.collectFeedback).toBe(true);
    });

    test('should have correct metadata', () => {
      expect(pattern.metadata.type).toBe(PatternType.HUMAN_IN_LOOP);
      expect(pattern.metadata.tags).toContain('validation');
      expect(pattern.metadata.tags).toContain('human');
      expect(pattern.metadata.requiresHuman).toBe(true);
    });
  });

  describe('Validation', () => {
    test('should fail without workflow', () => {
      const context = new ExecutionContext({
        task: 'Test task',
        input: {}
      });

      const result = pattern.validate(context, engine);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('HumanInLoop pattern requires input.workflow array');
    });

    test('should fail with empty workflow', () => {
      const context = new ExecutionContext({
        task: 'Test task',
        input: {
          workflow: []
        }
      });

      const result = pattern.validate(context, engine);
      expect(result.valid).toBe(false);
    });

    test('should pass with valid workflow', () => {
      const context = new ExecutionContext({
        task: 'Test task',
        input: {
          workflow: [
            { skill: 'generate' },
            { gate: GateType.APPROVAL },
            { skill: 'deploy' }
          ]
        }
      });

      const result = pattern.validate(context, engine);
      expect(result.valid).toBe(true);
    });

    test('should fail with invalid step', () => {
      const context = new ExecutionContext({
        task: 'Test task',
        input: {
          workflow: [
            { invalid: 'step' }
          ]
        }
      });

      const result = pattern.validate(context, engine);
      expect(result.valid).toBe(false);
    });

    test('should fail with unknown skill', () => {
      const context = new ExecutionContext({
        task: 'Test task',
        input: {
          workflow: [
            { skill: 'unknown_skill' }
          ]
        }
      });

      const result = pattern.validate(context, engine);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Unknown skill'))).toBe(true);
    });

    test('should fail with invalid gate type', () => {
      const context = new ExecutionContext({
        task: 'Test task',
        input: {
          workflow: [
            { gate: 'invalid_gate' }
          ]
        }
      });

      const result = pattern.validate(context, engine);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid gate type'))).toBe(true);
    });
  });

  describe('Gate Types', () => {
    test('should have all gate types defined', () => {
      expect(GateType.APPROVAL).toBe('approval');
      expect(GateType.REVIEW).toBe('review');
      expect(GateType.DECISION).toBe('decision');
      expect(GateType.CONFIRMATION).toBe('confirmation');
    });

    test('should have all gate results defined', () => {
      expect(GateResult.APPROVED).toBe('approved');
      expect(GateResult.REJECTED).toBe('rejected');
      expect(GateResult.NEEDS_CHANGES).toBe('needs-changes');
      expect(GateResult.TIMEOUT).toBe('timeout');
      expect(GateResult.SKIPPED).toBe('skipped');
    });
  });

  describe('Simple Workflow Execution', () => {
    test('should execute skill-only workflow', async () => {
      const context = await engine.execute(PatternType.HUMAN_IN_LOOP, {
        
        input: {
          workflow: [
            { skill: 'generate' },
            { skill: 'process' }
          ],
          initialInput: { topic: 'test' }
        }
      });

      expect(context.output.results.length).toBe(2);
      expect(context.output.results[0].type).toBe('skill');
      expect(context.output.results[1].type).toBe('skill');
      expect(context.output.aborted).toBe(false);
    });

    test('should pass output between steps', async () => {
      const outputs = [];
      engine.registerSkill('tracker', async (input) => {
        outputs.push(input);
        return { tracked: true, value: input.value || 0 };
      });

      await engine.execute(PatternType.HUMAN_IN_LOOP, {
        
        input: {
          workflow: [
            { skill: 'generate' },
            { skill: 'tracker' }
          ],
          initialInput: { topic: 'test' }
        }
      });

      expect(outputs.length).toBeGreaterThan(0);
      expect(outputs[0].generated).toBe(true);
    });
  });

  describe('Approval Gates', () => {
    test('should execute approval gate', async () => {
      // Set up auto-approval
      humanGateResponse = { approved: true };

      const context = await engine.execute(PatternType.HUMAN_IN_LOOP, {
        
        input: {
          workflow: [
            { skill: 'generate' },
            { gate: GateType.APPROVAL },
            { skill: 'deploy' }
          ],
          initialInput: { topic: 'test' }
        }
      });

      expect(context.output.results.length).toBe(3);
      expect(context.output.results[1].type).toBe('gate');
    });

    test('should abort on rejection', async () => {
      humanGateResponse = { approved: false };

      const context = await engine.execute(PatternType.HUMAN_IN_LOOP, {
        
        input: {
          workflow: [
            { skill: 'generate' },
            { gate: GateType.APPROVAL },
            { skill: 'deploy' }
          ],
          initialInput: { topic: 'test' }
        }
      });

      expect(context.output.aborted).toBe(true);
      expect(context.output.results.length).toBe(2); // Only generate + gate
    });

    test('should emit gate events', async () => {
      const events = [];
      engine.on('humanInLoopGateReached', (data) => events.push(data));
      humanGateResponse = { approved: true };

      await engine.execute(PatternType.HUMAN_IN_LOOP, {
        
        input: {
          workflow: [
            { skill: 'generate' },
            { gate: GateType.APPROVAL }
          ],
          initialInput: {}
        }
      });

      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('Review Gates', () => {
    test('should handle review with feedback', async () => {
      humanGateResponse = { 
        approved: true, 
        feedback: 'Looks good!' 
      };

      const context = await engine.execute(PatternType.HUMAN_IN_LOOP, {
        
        input: {
          workflow: [
            { skill: 'generate' },
            { gate: GateType.REVIEW, prompt: 'Please review the generated content' }
          ],
          initialInput: { topic: 'Review test' }
        }
      });

      expect(context.output.results[1].result.feedback).toBe('Looks good!');
    });

    test('should handle needs-changes result', async () => {
      humanGateResponse = { 
        approved: false, 
        needsChanges: true,
        feedback: 'Please revise section 2' 
      };

      const context = await engine.execute(PatternType.HUMAN_IN_LOOP, {
        
        input: {
          workflow: [
            { skill: 'generate' },
            { gate: GateType.REVIEW }
          ],
          initialInput: {}
        }
      });

      expect(context.output.results[1].result.result).toBe(GateResult.NEEDS_CHANGES);
    });
  });

  describe('Confirmation Gates', () => {
    test('should handle confirmation gate', async () => {
      humanGateResponse = { confirmed: true };

      const context = await engine.execute(PatternType.HUMAN_IN_LOOP, {
        
        input: {
          workflow: [
            { skill: 'analyze' },
            { gate: GateType.CONFIRMATION, prompt: 'Confirm deployment?' },
            { skill: 'deploy' }
          ],
          initialInput: {}
        }
      });

      expect(context.output.results[1].result.result).toBe(GateResult.APPROVED);
      expect(context.output.results.length).toBe(3);
    });
  });

  describe('Timeout Handling', () => {
    test('should handle timeout with auto-approve', async () => {
      const autoApprovePattern = createHumanInLoopPattern({
        timeout: 50,
        autoApproveOnTimeout: true
      });
      engine.registerPattern(PatternType.HUMAN_IN_LOOP, autoApprovePattern);
      
      // Gate that never resolves - override humanGate for this test
      engine.humanGate = { request: () => new Promise(() => {}) };

      const context = await engine.execute(PatternType.HUMAN_IN_LOOP, {
        
        input: {
          workflow: [
            { skill: 'generate' },
            { gate: GateType.APPROVAL }
          ],
          initialInput: {}
        }
      });

      expect(context.output.results[1].result.result).toBe(GateResult.APPROVED);
    });

    test('should handle timeout with rejection', async () => {
      const rejectOnTimeoutPattern = createHumanInLoopPattern({
        timeout: 50,
        autoApproveOnTimeout: false
      });
      engine.registerPattern(PatternType.HUMAN_IN_LOOP, rejectOnTimeoutPattern);
      
      // Gate that never resolves
      engine.humanGate = { request: () => new Promise(() => {}) };

      const context = await engine.execute(PatternType.HUMAN_IN_LOOP, {
        
        input: {
          workflow: [
            { skill: 'generate' },
            { gate: GateType.APPROVAL }
          ],
          initialInput: {}
        }
      });

      expect(context.output.results[1].result.result).toBe(GateResult.TIMEOUT);
    });
  });

  describe('Complex Workflows', () => {
    test('should execute multi-gate workflow', async () => {
      humanGateResponse = { approved: true };

      const context = await engine.execute(PatternType.HUMAN_IN_LOOP, {
        
        input: {
          workflow: [
            { skill: 'generate' },
            { gate: GateType.REVIEW },
            { skill: 'process' },
            { gate: GateType.APPROVAL },
            { skill: 'deploy' }
          ],
          initialInput: { topic: 'Multi-gate workflow' }
        }
      });

      expect(context.output.results.length).toBe(5);
      expect(context.output.summary.gateSteps).toBe(2);
      expect(context.output.summary.skillSteps).toBe(3);
    });

    test('should track gate approval rate', async () => {
      let callCount = 0;
      engine.humanGate = {
        request: async () => {
          callCount++;
          return { approved: callCount <= 1 }; // First approved, rest rejected
        }
      };

      const context = await engine.execute(PatternType.HUMAN_IN_LOOP, {
        
        input: {
          workflow: [
            { skill: 'generate' },
            { gate: GateType.APPROVAL },
            { skill: 'process' },
            { gate: GateType.APPROVAL }
          ],
          initialInput: {}
        }
      });

      expect(context.output.summary.gateSteps).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      engine.registerSkill('failing', async () => {
        throw new Error('Skill execution failed');
      });
    });

    test('should handle skill errors', async () => {
      const context = await engine.execute(PatternType.HUMAN_IN_LOOP, {
        
        input: {
          workflow: [
            { skill: 'failing' }
          ],
          initialInput: {}
        }
      });

      expect(context.output.results[0].status).toBe(ExecutionStatus.FAILED);
      expect(context.output.aborted).toBe(true);
    });

    test('should continue on error when configured', async () => {
      humanGateResponse = { approved: true };

      const context = await engine.execute(PatternType.HUMAN_IN_LOOP, {
        
        input: {
          workflow: [
            { skill: 'failing', continueOnError: true },
            { skill: 'generate' }
          ],
          initialInput: {}
        }
      });

      expect(context.output.results.length).toBe(2);
    });

    test('should emit step failure events', async () => {
      const events = [];
      engine.on('humanInLoopStepFailed', (data) => events.push(data));

      await engine.execute(PatternType.HUMAN_IN_LOOP, {
        
        input: {
          workflow: [
            { skill: 'failing' }
          ],
          initialInput: {}
        }
      });

      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('Summary Generation', () => {
    test('should generate comprehensive summary', async () => {
      humanGateResponse = { approved: true };

      const context = await engine.execute(PatternType.HUMAN_IN_LOOP, {
        
        input: {
          workflow: [
            { skill: 'generate' },
            { gate: GateType.APPROVAL },
            { skill: 'deploy' }
          ],
          initialInput: {}
        }
      });

      expect(context.output.summary.totalSteps).toBe(3);
      expect(context.output.summary.skillSteps).toBe(2);
      expect(context.output.summary.gateSteps).toBe(1);
      expect(context.output.summary.approvedGates).toBe(1);
      expect(context.output.summary.completed).toBe(true);
    });

    test('should track rejection counts', async () => {
      humanGateResponse = { approved: false };

      const context = await engine.execute(PatternType.HUMAN_IN_LOOP, {
        
        input: {
          workflow: [
            { skill: 'generate' },
            { gate: GateType.APPROVAL }
          ],
          initialInput: {}
        }
      });

      expect(context.output.summary.rejectedGates).toBe(1);
      expect(context.output.summary.approvedGates).toBe(0);
    });
  });

  describe('Events', () => {
    test('should emit lifecycle events', async () => {
      const events = [];
      engine.on('humanInLoopStarted', (data) => events.push({ type: 'started', data }));
      engine.on('humanInLoopStepStarted', (data) => events.push({ type: 'stepStarted', data }));
      engine.on('humanInLoopStepCompleted', (data) => events.push({ type: 'stepCompleted', data }));
      engine.on('humanInLoopCompleted', (data) => events.push({ type: 'completed', data }));
      
      humanGateResponse = { approved: true };

      await engine.execute(PatternType.HUMAN_IN_LOOP, {
        
        input: {
          workflow: [
            { skill: 'generate' },
            { gate: GateType.APPROVAL }
          ],
          initialInput: {}
        }
      });

      expect(events.some(e => e.type === 'started')).toBe(true);
      expect(events.some(e => e.type === 'stepStarted')).toBe(true);
      expect(events.some(e => e.type === 'stepCompleted')).toBe(true);
      expect(events.some(e => e.type === 'completed')).toBe(true);
    });

    test('should emit abort event on rejection', async () => {
      const events = [];
      engine.on('humanInLoopAborted', (data) => events.push(data));
      humanGateResponse = { approved: false };

      await engine.execute(PatternType.HUMAN_IN_LOOP, {
        
        input: {
          workflow: [
            { skill: 'generate' },
            { gate: GateType.APPROVAL },
            { skill: 'deploy' }
          ],
          initialInput: {}
        }
      });

      expect(events.length).toBe(1);
      expect(events[0].reason).toContain('rejected');
    });
  });

  describe('Integration', () => {
    test('should work with OrchestrationEngine execute', async () => {
      humanGateResponse = { approved: true };

      const context = await engine.execute(PatternType.HUMAN_IN_LOOP, {
        
        input: {
          workflow: [
            { skill: 'generate' },
            { gate: GateType.APPROVAL }
          ],
          initialInput: { topic: 'Integration test' }
        }
      });

      expect(context).toBeDefined();
      expect(context.output.results).toBeDefined();
      expect(context.output.summary).toBeDefined();
    });

    test('should provide final output', async () => {
      humanGateResponse = { approved: true };

      const context = await engine.execute(PatternType.HUMAN_IN_LOOP, {
        
        input: {
          workflow: [
            { skill: 'generate' },
            { gate: GateType.APPROVAL },
            { skill: 'process' }
          ],
          initialInput: { topic: 'Output test' }
        }
      });

      expect(context.output.finalOutput).toBeDefined();
      expect(context.output.finalOutput.processed).toBe(true);
    });
  });
});
