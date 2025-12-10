/**
 * Tests for WorkflowOrchestrator
 */

const {
  OrchestrationEngine,
  _ExecutionContext,
  PatternType,
  ExecutionStatus,
  WorkflowOrchestrator,
  StepType,
  WorkflowState,
  SDDWorkflowTemplates,
  createWorkflowOrchestrator,
  createSwarmPattern,
  createSequentialPattern,
  createAutoPattern
} = require('../../src/orchestration');

describe('WorkflowOrchestrator', () => {
  let engine;
  let orchestrator;

  beforeEach(() => {
    engine = new OrchestrationEngine({ 
      enableHumanValidation: false 
    });

    // Register patterns
    engine.registerPattern(PatternType.SWARM, createSwarmPattern());
    engine.registerPattern(PatternType.SEQUENTIAL, createSequentialPattern());
    engine.registerPattern(PatternType.AUTO, createAutoPattern());

    // Register test skills
    engine.registerSkill('requirements-analyst', async (input) => ({
      requirements: [`REQ-001: ${input.feature || input.task || 'feature'}`],
      analyzed: true
    }));

    engine.registerSkill('software-architect', async (_input) => ({
      design: 'C4 Model Design',
      components: ['frontend', 'backend', 'database']
    }));

    engine.registerSkill('task-planner', async (_input) => ({
      tasks: ['Task 1', 'Task 2', 'Task 3'],
      estimated: '5 days'
    }));

    engine.registerSkill('code-generator', async (_input) => ({
      code: '// Generated code',
      files: ['index.js', 'utils.js']
    }));

    engine.registerSkill('test-engineer', async (_input) => ({
      tests: ['test1.js', 'test2.js'],
      coverage: '85%'
    }));

    engine.registerSkill('code-reviewer', async (_input) => ({
      review: 'Code looks good',
      issues: [],
      approved: true
    }));

    engine.registerSkill('documentation-writer', async (_input) => ({
      docs: 'Documentation generated',
      summary: 'Consolidated review summary'
    }));

    orchestrator = createWorkflowOrchestrator(engine);
  });

  afterEach(() => {
    if (engine) {
      engine.cancelAll();
    }
  });

  describe('Creation', () => {
    test('should create orchestrator', () => {
      const orch = createWorkflowOrchestrator(engine);
      expect(orch).toBeInstanceOf(WorkflowOrchestrator);
    });

    test('should create orchestrator with options', () => {
      const orch = createWorkflowOrchestrator(engine, {
        saveCheckpoints: true,
        maxRetries: 5
      });
      expect(orch.options.saveCheckpoints).toBe(true);
      expect(orch.options.maxRetries).toBe(5);
    });
  });

  describe('Workflow Registration', () => {
    test('should register a workflow', () => {
      orchestrator.registerWorkflow('test-workflow', {
        steps: [
          { type: StepType.SKILL, skill: 'requirements-analyst' }
        ]
      });

      expect(orchestrator.getWorkflow('test-workflow')).toBeDefined();
    });

    test('should fail without steps', () => {
      expect(() => {
        orchestrator.registerWorkflow('invalid', {});
      }).toThrow('Workflow must have steps array');
    });

    test('should list workflows', () => {
      orchestrator.registerWorkflow('wf1', { steps: [{ type: StepType.SKILL, skill: 'code-generator' }] });
      orchestrator.registerWorkflow('wf2', { steps: [{ type: StepType.SKILL, skill: 'test-engineer' }] });

      expect(orchestrator.listWorkflows()).toContain('wf1');
      expect(orchestrator.listWorkflows()).toContain('wf2');
    });

    test('should allow chaining', () => {
      const result = orchestrator
        .registerWorkflow('wf1', { steps: [{ type: StepType.SKILL, skill: 'code-generator' }] })
        .registerWorkflow('wf2', { steps: [{ type: StepType.SKILL, skill: 'test-engineer' }] });

      expect(result).toBe(orchestrator);
    });
  });

  describe('Skill Step Execution', () => {
    test('should execute single skill step', async () => {
      orchestrator.registerWorkflow('simple', {
        steps: [
          { type: StepType.SKILL, skill: 'requirements-analyst', input: { feature: 'Login' } }
        ]
      });

      const result = await orchestrator.execute('simple', {});

      expect(result.state).toBe(WorkflowState.COMPLETED);
      expect(result.stepResults).toHaveLength(1);
      expect(result.stepResults[0].status).toBe(ExecutionStatus.COMPLETED);
    });

    test('should execute multiple skill steps', async () => {
      orchestrator.registerWorkflow('multi-step', {
        steps: [
          { type: StepType.SKILL, skill: 'requirements-analyst' },
          { type: StepType.SKILL, skill: 'software-architect' },
          { type: StepType.SKILL, skill: 'task-planner' }
        ]
      });

      const result = await orchestrator.execute('multi-step', { feature: 'Login' });

      expect(result.state).toBe(WorkflowState.COMPLETED);
      expect(result.stepResults).toHaveLength(3);
    });

    test('should pass context between steps', async () => {
      let receivedInput = null;
      engine.registerSkill('receiver', async (input) => {
        receivedInput = input;
        return { received: true };
      });

      orchestrator.registerWorkflow('context-test', {
        steps: [
          { type: StepType.SKILL, skill: 'requirements-analyst' },
          { type: StepType.SKILL, skill: 'receiver' }
        ]
      });

      await orchestrator.execute('context-test', { feature: 'Test' });

      expect(receivedInput.step_0_result).toBeDefined();
      expect(receivedInput.step_0_result.requirements).toBeDefined();
    });
  });

  describe('Pattern Step Execution', () => {
    test('should execute pattern step', async () => {
      orchestrator.registerWorkflow('pattern-wf', {
        steps: [
          {
            type: StepType.PATTERN,
            pattern: PatternType.SEQUENTIAL,
            config: {
              skills: ['requirements-analyst', 'software-architect']
            }
          }
        ]
      });

      const result = await orchestrator.execute('pattern-wf', {});

      expect(result.state).toBe(WorkflowState.COMPLETED);
    });
  });

  describe('Parallel Step Execution', () => {
    test('should execute parallel steps', async () => {
      orchestrator.registerWorkflow('parallel-wf', {
        steps: [
          {
            type: StepType.PARALLEL,
            steps: [
              { type: StepType.SKILL, skill: 'code-generator' },
              { type: StepType.SKILL, skill: 'test-engineer' }
            ]
          }
        ]
      });

      const result = await orchestrator.execute('parallel-wf', {});

      expect(result.state).toBe(WorkflowState.COMPLETED);
      expect(result.stepResults[0].output.parallelResults).toHaveLength(2);
    });
  });

  describe('Conditional Step Execution', () => {
    test('should execute then branch when condition is true', async () => {
      let executed = null;
      engine.registerSkill('then-skill', async () => {
        executed = 'then';
        return { branch: 'then' };
      });
      engine.registerSkill('else-skill', async () => {
        executed = 'else';
        return { branch: 'else' };
      });

      orchestrator.registerWorkflow('conditional-wf', {
        steps: [
          {
            type: StepType.CONDITIONAL,
            condition: (ctx) => ctx.shouldExecuteThen === true,
            then: [{ type: StepType.SKILL, skill: 'then-skill' }],
            else: [{ type: StepType.SKILL, skill: 'else-skill' }]
          }
        ]
      });

      await orchestrator.execute('conditional-wf', { shouldExecuteThen: true });

      expect(executed).toBe('then');
    });

    test('should execute else branch when condition is false', async () => {
      let executed = null;
      engine.registerSkill('then-skill', async () => {
        executed = 'then';
        return {};
      });
      engine.registerSkill('else-skill', async () => {
        executed = 'else';
        return {};
      });

      orchestrator.registerWorkflow('conditional-wf', {
        steps: [
          {
            type: StepType.CONDITIONAL,
            condition: (ctx) => ctx.shouldExecuteThen === true,
            then: [{ type: StepType.SKILL, skill: 'then-skill' }],
            else: [{ type: StepType.SKILL, skill: 'else-skill' }]
          }
        ]
      });

      await orchestrator.execute('conditional-wf', { shouldExecuteThen: false });

      expect(executed).toBe('else');
    });
  });

  describe('Checkpoint Step', () => {
    test('should create checkpoint', async () => {
      const checkpointStorage = new Map();
      const orch = createWorkflowOrchestrator(engine, {
        saveCheckpoints: true,
        checkpointStorage
      });

      orch.registerWorkflow('checkpoint-wf', {
        steps: [
          { type: StepType.SKILL, skill: 'requirements-analyst' },
          { type: StepType.CHECKPOINT, name: 'after-requirements' },
          { type: StepType.SKILL, skill: 'software-architect' }
        ]
      });

      const result = await orch.execute('checkpoint-wf', {});

      expect(result.summary.checkpoints).toBe(1);
      expect(checkpointStorage.size).toBe(1);
    });
  });

  describe('Human Gate Step', () => {
    test('should auto-approve without human gate', async () => {
      orchestrator.registerWorkflow('gate-wf', {
        steps: [
          { type: StepType.HUMAN_GATE, question: 'Approve?' }
        ]
      });

      const result = await orchestrator.execute('gate-wf', {});

      expect(result.state).toBe(WorkflowState.COMPLETED);
      expect(result.stepResults[0].output.autoApproved).toBe(true);
    });

    test('should use human gate when provided', async () => {
      orchestrator.registerWorkflow('gate-wf', {
        steps: [
          { type: StepType.HUMAN_GATE, question: 'Approve ${featureName}?' }
        ]
      });

      const result = await orchestrator.execute('gate-wf', { featureName: 'Login' }, {
        humanGate: {
          request: async (question, _context) => {
            expect(question).toContain('Login');
            return { approved: true, feedback: 'Looks good' };
          }
        }
      });

      expect(result.state).toBe(WorkflowState.COMPLETED);
    });

    test('should fail on human rejection', async () => {
      orchestrator.registerWorkflow('reject-wf', {
        steps: [
          { type: StepType.HUMAN_GATE, question: 'Approve?' }
        ]
      });

      await expect(orchestrator.execute('reject-wf', {}, {
        humanGate: {
          request: async () => ({ approved: false, feedback: 'Not ready' })
        }
      })).rejects.toThrow('Human gate rejected');
    });
  });

  describe('Error Handling', () => {
    test('should fail on unknown workflow', async () => {
      await expect(orchestrator.execute('unknown'))
        .rejects.toThrow('Unknown workflow');
    });

    test('should fail on unknown skill', async () => {
      orchestrator.registerWorkflow('bad-skill', {
        steps: [
          { type: StepType.SKILL, skill: 'nonexistent' }
        ]
      });

      await expect(orchestrator.execute('bad-skill'))
        .rejects.toThrow('Unknown skill');
    });

    test('should stop on error by default', async () => {
      engine.registerSkill('failing', async () => {
        throw new Error('Skill failed');
      });

      orchestrator.registerWorkflow('fail-wf', {
        steps: [
          { type: StepType.SKILL, skill: 'failing' },
          { type: StepType.SKILL, skill: 'code-generator' }
        ],
        onError: 'stop'
      });

      await expect(orchestrator.execute('fail-wf'))
        .rejects.toThrow();
    });
  });

  describe('Events', () => {
    test('should emit workflow events', async () => {
      const events = [];
      engine.on('workflowStarted', (data) => events.push({ type: 'started', data }));
      engine.on('workflowStepStarted', (data) => events.push({ type: 'stepStarted', data }));
      engine.on('workflowStepCompleted', (data) => events.push({ type: 'stepCompleted', data }));
      engine.on('workflowCompleted', (data) => events.push({ type: 'completed', data }));

      orchestrator.registerWorkflow('event-wf', {
        steps: [
          { type: StepType.SKILL, skill: 'requirements-analyst' }
        ]
      });

      await orchestrator.execute('event-wf', {});

      expect(events.some(e => e.type === 'started')).toBe(true);
      expect(events.some(e => e.type === 'stepStarted')).toBe(true);
      expect(events.some(e => e.type === 'stepCompleted')).toBe(true);
      expect(events.some(e => e.type === 'completed')).toBe(true);
    });
  });

  describe('Summary', () => {
    test('should generate execution summary', async () => {
      orchestrator.registerWorkflow('summary-wf', {
        steps: [
          { type: StepType.SKILL, skill: 'requirements-analyst' },
          { type: StepType.SKILL, skill: 'software-architect' }
        ]
      });

      const result = await orchestrator.execute('summary-wf', {});

      expect(result.summary).toBeDefined();
      expect(result.summary.totalSteps).toBe(2);
      expect(result.summary.completedSteps).toBe(2);
      expect(result.summary.successRate).toBe('100.0%');
    });
  });

  describe('SDD Workflow Templates', () => {
    test('should have SIMPLE_FEATURE template', () => {
      expect(SDDWorkflowTemplates.SIMPLE_FEATURE).toBeDefined();
      expect(SDDWorkflowTemplates.SIMPLE_FEATURE.steps).toHaveLength(3);
    });

    test('should have FULL_SDD template', () => {
      expect(SDDWorkflowTemplates.FULL_SDD).toBeDefined();
      expect(SDDWorkflowTemplates.FULL_SDD.steps.length).toBeGreaterThan(0);
    });

    test('should have CODE_REVIEW template', () => {
      expect(SDDWorkflowTemplates.CODE_REVIEW).toBeDefined();
      expect(SDDWorkflowTemplates.CODE_REVIEW.steps.length).toBeGreaterThan(0);
    });

    test('should execute SIMPLE_FEATURE template', async () => {
      orchestrator.registerWorkflow('simple-feature', SDDWorkflowTemplates.SIMPLE_FEATURE);

      const result = await orchestrator.execute('simple-feature', { featureName: 'Login' });

      expect(result.state).toBe(WorkflowState.COMPLETED);
      expect(result.stepResults).toHaveLength(3);
    });
  });

  describe('Pause and Resume', () => {
    test('should track active executions', async () => {
      orchestrator.registerWorkflow('track-wf', {
        steps: [
          { type: StepType.SKILL, skill: 'requirements-analyst' }
        ]
      });

      // Execute should complete and remove from active
      await orchestrator.execute('track-wf', {});

      expect(orchestrator.activeExecutions.size).toBe(0);
    });
  });

  describe('Constants', () => {
    test('should have all step types', () => {
      expect(StepType.SKILL).toBe('skill');
      expect(StepType.PATTERN).toBe('pattern');
      expect(StepType.CONDITIONAL).toBe('conditional');
      expect(StepType.PARALLEL).toBe('parallel');
      expect(StepType.CHECKPOINT).toBe('checkpoint');
      expect(StepType.HUMAN_GATE).toBe('human-gate');
    });

    test('should have all workflow states', () => {
      expect(WorkflowState.PENDING).toBe('pending');
      expect(WorkflowState.RUNNING).toBe('running');
      expect(WorkflowState.PAUSED).toBe('paused');
      expect(WorkflowState.COMPLETED).toBe('completed');
      expect(WorkflowState.FAILED).toBe('failed');
      expect(WorkflowState.CANCELLED).toBe('cancelled');
    });
  });
});
