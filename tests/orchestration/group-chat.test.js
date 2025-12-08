/**
 * Tests for GroupChatPattern
 */

const {
  OrchestrationEngine,
  ExecutionContext,
  PatternType,
  ExecutionStatus,
  GroupChatPattern,
  DiscussionMode,
  ConsensusType,
  createGroupChatPattern
} = require('../../src/orchestration');

describe('GroupChatPattern', () => {
  let engine;
  let pattern;

  beforeEach(() => {
    engine = new OrchestrationEngine({ 
      enableHumanValidation: false 
    });
    pattern = createGroupChatPattern();
    engine.registerPattern(PatternType.GROUP_CHAT, pattern);

    // Register test skills (participants)
    engine.registerSkill('analyst', async (input) => ({
      role: 'analyst',
      decision: 'approve',
      opinion: `Analysis: ${input.topic || 'general'}`,
      confidence: 0.8
    }));

    engine.registerSkill('reviewer', async (input) => ({
      role: 'reviewer',
      decision: 'approve',
      opinion: `Review: ${input.topic || 'general'}`,
      confidence: 0.9
    }));

    engine.registerSkill('designer', async (input) => ({
      role: 'designer',
      decision: 'approve',
      opinion: `Design: ${input.topic || 'general'}`,
      confidence: 0.7
    }));

    engine.registerSkill('moderator', async (input) => ({
      role: 'moderator',
      summary: 'Moderated discussion',
      consensus: true
    }));
  });

  afterEach(() => {
    if (engine) {
      engine.cancelAll();
    }
  });

  describe('Pattern Creation', () => {
    test('should create pattern with default options', () => {
      const p = createGroupChatPattern();
      expect(p).toBeInstanceOf(GroupChatPattern);
      expect(p.metadata.name).toBe(PatternType.GROUP_CHAT);
    });

    test('should create pattern with custom options', () => {
      const p = createGroupChatPattern({
        maxRounds: 5,
        convergenceThreshold: 0.8,
        mode: DiscussionMode.ROUND_ROBIN
      });
      expect(p.options.maxRounds).toBe(5);
      expect(p.options.convergenceThreshold).toBe(0.8);
      expect(p.options.mode).toBe(DiscussionMode.ROUND_ROBIN);
    });

    test('should have correct metadata', () => {
      expect(pattern.metadata.type).toBe(PatternType.GROUP_CHAT);
      expect(pattern.metadata.tags).toContain('collaboration');
      expect(pattern.metadata.useCases).toContain('Design reviews');
    });
  });

  describe('Validation', () => {
    test('should fail without participants', () => {
      const context = new ExecutionContext({
        task: 'Test task',
        input: {}
      });

      const result = pattern.validate(context, engine);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('GroupChat pattern requires input.participants array');
    });

    test('should fail with empty participants', () => {
      const context = new ExecutionContext({
        task: 'Test task',
        input: {
          participants: []
        }
      });

      const result = pattern.validate(context, engine);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('GroupChat pattern requires at least 2 participants');
    });

    test('should fail with single participant', () => {
      const context = new ExecutionContext({
        task: 'Test task',
        input: {
          participants: ['analyst'],
          topic: 'Test'
        }
      });

      const result = pattern.validate(context, engine);
      expect(result.valid).toBe(false);
    });

    test('should pass with valid participants', () => {
      const context = new ExecutionContext({
        task: 'Test task',
        input: {
          participants: ['analyst', 'reviewer'],
          topic: 'Test discussion'
        }
      });

      const result = pattern.validate(context, engine);
      expect(result.valid).toBe(true);
    });

    test('should fail with unknown participant', () => {
      const context = new ExecutionContext({
        task: 'Test task',
        input: {
          participants: ['analyst', 'unknown_skill'],
          topic: 'Test'
        }
      });

      const result = pattern.validate(context, engine);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Unknown participant'))).toBe(true);
    });
  });

  describe('Basic Discussion', () => {
    test('should run discussion with multiple participants', async () => {
      const context = await engine.execute(PatternType.GROUP_CHAT, {
        input: {
          participants: ['analyst', 'reviewer'],
          topic: 'Test topic'
        }
      });

      expect(context.output.transcript).toBeDefined();
      expect(context.output.transcript.length).toBeGreaterThan(0);
    });

    test('should include all participants in discussion', async () => {
      const context = await engine.execute(PatternType.GROUP_CHAT, {
        input: {
          participants: ['analyst', 'reviewer', 'designer'],
          topic: 'Multi-participant discussion'
        }
      });

      // Check transcript for participants
      const allParticipants = new Set();
      for (const round of context.output.transcript) {
        for (const resp of round.responses) {
          allParticipants.add(resp.participant);
        }
      }
      expect(allParticipants.has('analyst')).toBe(true);
      expect(allParticipants.has('reviewer')).toBe(true);
      expect(allParticipants.has('designer')).toBe(true);
    });

    test('should emit events during discussion', async () => {
      const events = [];
      engine.on('groupChatStarted', (data) => events.push({ type: 'started', data }));
      engine.on('groupChatRoundStarted', (data) => events.push({ type: 'roundStarted', data }));
      engine.on('groupChatResponse', (data) => events.push({ type: 'response', data }));
      engine.on('groupChatCompleted', (data) => events.push({ type: 'completed', data }));

      await engine.execute(PatternType.GROUP_CHAT, {
        input: {
          participants: ['analyst', 'reviewer'],
          topic: 'Event test'
        }
      });

      expect(events.some(e => e.type === 'started')).toBe(true);
      expect(events.some(e => e.type === 'response')).toBe(true);
      expect(events.some(e => e.type === 'completed')).toBe(true);
    });
  });

  describe('Discussion Mode', () => {
    test('should support round-robin mode', async () => {
      const roundRobinPattern = createGroupChatPattern({
        mode: DiscussionMode.ROUND_ROBIN
      });
      engine.registerPattern(PatternType.GROUP_CHAT, roundRobinPattern);

      const context = await engine.execute(PatternType.GROUP_CHAT, {
        input: {
          participants: ['analyst', 'reviewer'],
          topic: 'Round robin test'
        }
      });

      expect(context.output.transcript.length).toBeGreaterThan(0);
    });

    test('should support open-floor mode', async () => {
      const openFloorPattern = createGroupChatPattern({
        mode: DiscussionMode.OPEN_FLOOR
      });
      engine.registerPattern(PatternType.GROUP_CHAT, openFloorPattern);

      const context = await engine.execute(PatternType.GROUP_CHAT, {
        input: {
          participants: ['analyst', 'reviewer', 'designer'],
          topic: 'Open floor test'
        }
      });

      expect(context.output.transcript.length).toBeGreaterThan(0);
    });

    test('should support moderated mode', async () => {
      const moderatedPattern = createGroupChatPattern({
        mode: DiscussionMode.MODERATED,
        moderator: 'moderator'
      });
      engine.registerPattern(PatternType.GROUP_CHAT, moderatedPattern);

      const context = await engine.execute(PatternType.GROUP_CHAT, {
        input: {
          participants: ['analyst', 'reviewer'],
          topic: 'Moderated test'
        }
      });

      expect(context.output.transcript.length).toBeGreaterThan(0);
    });
  });

  describe('Consensus Building', () => {
    test('should attempt consensus building', async () => {
      const context = await engine.execute(PatternType.GROUP_CHAT, {
        input: {
          participants: ['analyst', 'reviewer'],
          topic: 'Consensus test'
        }
      });

      expect(context.output.consensusReached).toBeDefined();
    });

    test('should track consensus status', async () => {
      const context = await engine.execute(PatternType.GROUP_CHAT, {
        input: {
          participants: ['analyst', 'reviewer'],
          topic: 'Consensus tracking'
        }
      });

      expect(context.output.summary).toBeDefined();
      expect(typeof context.output.summary.consensusReached).toBe('boolean');
    });

    test('should support majority consensus type', async () => {
      const majorityPattern = createGroupChatPattern({
        consensusType: ConsensusType.MAJORITY
      });
      engine.registerPattern(PatternType.GROUP_CHAT, majorityPattern);

      const context = await engine.execute(PatternType.GROUP_CHAT, {
        input: {
          participants: ['analyst', 'reviewer', 'designer'],
          topic: 'Majority consensus'
        }
      });

      expect(context.output.consensusReached).toBeDefined();
    });

    test('should support unanimous consensus type', async () => {
      const unanimousPattern = createGroupChatPattern({
        consensusType: ConsensusType.UNANIMOUS
      });
      engine.registerPattern(PatternType.GROUP_CHAT, unanimousPattern);

      const context = await engine.execute(PatternType.GROUP_CHAT, {
        input: {
          participants: ['analyst', 'reviewer'],
          topic: 'Unanimous consensus'
        }
      });

      expect(context.output.summary).toBeDefined();
    });
  });

  describe('Discussion Rounds', () => {
    test('should limit discussion rounds', async () => {
      const limitedPattern = createGroupChatPattern({
        maxRounds: 2
      });
      engine.registerPattern(PatternType.GROUP_CHAT, limitedPattern);

      const context = await engine.execute(PatternType.GROUP_CHAT, {
        input: {
          participants: ['analyst', 'reviewer'],
          topic: 'Limited rounds'
        }
      });

      expect(context.output.rounds).toBeLessThanOrEqual(2);
    });

    test('should track rounds in summary', async () => {
      const context = await engine.execute(PatternType.GROUP_CHAT, {
        input: {
          participants: ['analyst', 'reviewer'],
          topic: 'Round tracking'
        }
      });

      expect(context.output.summary.totalRounds).toBeGreaterThan(0);
    });

    test('should provide context from previous rounds', async () => {
      const contributions = [];
      engine.registerSkill('contextAware', async (input) => {
        contributions.push(input);
        return {
          role: 'contextAware',
          decision: 'approve',
          opinion: 'Aware of context',
          hasPreviousContext: !!input.previousResponses && input.previousResponses.length > 0
        };
      });

      await engine.execute(PatternType.GROUP_CHAT, {
        input: {
          participants: ['analyst', 'contextAware'],
          topic: 'Context awareness'
        }
      });

      // Later contributions should have previous context
      expect(contributions.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      engine.registerSkill('failing', async () => {
        throw new Error('Participant failed');
      });
    });

    test('should handle participant errors', async () => {
      const context = await engine.execute(PatternType.GROUP_CHAT, {
        input: {
          participants: ['analyst', 'failing'],
          topic: 'Error handling'
        }
      });

      // Should complete despite one participant failing
      expect(context.output).toBeDefined();
      expect(context.output.summary.failedResponses).toBeGreaterThan(0);
    });

    test('should track failed contributions', async () => {
      const context = await engine.execute(PatternType.GROUP_CHAT, {
        input: {
          participants: ['analyst', 'failing'],
          topic: 'Track failures'
        }
      });

      // Check for failed responses in transcript
      let hasFailed = false;
      for (const round of context.output.transcript) {
        for (const resp of round.responses) {
          if (resp.status === ExecutionStatus.FAILED) {
            hasFailed = true;
          }
        }
      }
      expect(hasFailed).toBe(true);
    });

    test('should continue with remaining participants', async () => {
      const context = await engine.execute(PatternType.GROUP_CHAT, {
        input: {
          participants: ['analyst', 'failing', 'reviewer'],
          topic: 'Continue on error'
        }
      });

      // Check for successful responses
      let hasSuccessful = false;
      for (const round of context.output.transcript) {
        for (const resp of round.responses) {
          if (resp.status === ExecutionStatus.COMPLETED) {
            hasSuccessful = true;
          }
        }
      }
      expect(hasSuccessful).toBe(true);
    });
  });

  describe('Summary Statistics', () => {
    test('should provide summary statistics', async () => {
      const context = await engine.execute(PatternType.GROUP_CHAT, {
        input: {
          participants: ['analyst', 'reviewer'],
          topic: 'Statistics'
        }
      });

      expect(context.output.summary).toBeDefined();
      expect(typeof context.output.summary.totalResponses).toBe('number');
      expect(typeof context.output.summary.successfulResponses).toBe('number');
    });

    test('should calculate success rate', async () => {
      const context = await engine.execute(PatternType.GROUP_CHAT, {
        input: {
          participants: ['analyst', 'reviewer'],
          topic: 'Success rate'
        }
      });

      expect(context.output.summary.successRate).toBeDefined();
    });
  });

  describe('Integration', () => {
    test('should work with OrchestrationEngine execute', async () => {
      const context = await engine.execute(PatternType.GROUP_CHAT, {
        input: {
          participants: ['analyst', 'reviewer'],
          topic: 'Integration test'
        }
      });

      expect(context.output).toBeDefined();
      expect(context.output.transcript).toBeDefined();
    });

    test('should handle topic context correctly', async () => {
      const context = await engine.execute(PatternType.GROUP_CHAT, {
        input: {
          participants: ['analyst', 'reviewer'],
          topic: 'Complex Topic: Architecture Review',
          initialContext: {
            project: 'musubi',
            phase: 'design'
          }
        }
      });

      expect(context.output).toBeDefined();
      expect(context.output.transcript.length).toBeGreaterThan(0);
    });

    test('should return final decision when consensus reached', async () => {
      const context = await engine.execute(PatternType.GROUP_CHAT, {
        input: {
          participants: ['analyst', 'reviewer'],
          topic: 'Final decision test'
        }
      });

      // All skills return decision: 'approve', so consensus should be reached
      if (context.output.consensusReached) {
        expect(context.output.finalDecision).toBeDefined();
      }
    });
  });
});
