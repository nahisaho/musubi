/**
 * GroupChatPattern - Multi-skill collaborative discussion pattern
 * 
 * Enables multiple skills to collaborate on a task through
 * iterative discussion and consensus building.
 */

const { BasePattern } = require('../pattern-registry');
const { PatternType, ExecutionContext, ExecutionStatus } = require('../orchestration-engine');

/**
 * Discussion mode
 */
const DiscussionMode = {
  ROUND_ROBIN: 'round-robin',   // Each skill speaks in turn
  OPEN_FLOOR: 'open-floor',     // Skills speak based on relevance
  MODERATED: 'moderated'        // Moderator skill controls discussion
};

/**
 * Consensus type
 */
const ConsensusType = {
  UNANIMOUS: 'unanimous',       // All must agree
  MAJORITY: 'majority',         // 50%+ must agree
  FIRST_AGREEMENT: 'first'      // First agreement wins
};

/**
 * GroupChatPattern - Multi-skill collaboration
 */
class GroupChatPattern extends BasePattern {
  constructor(options = {}) {
    super({
      name: PatternType.GROUP_CHAT,
      type: PatternType.GROUP_CHAT,
      description: 'Enable multi-skill collaborative discussion and consensus',
      version: '1.0.0',
      tags: ['collaboration', 'discussion', 'consensus', 'multi-agent'],
      useCases: [
        'Design reviews',
        'Code reviews',
        'Decision making',
        'Brainstorming'
      ],
      complexity: 'high',
      supportsParallel: false,
      requiresHuman: false
    });

    this.options = {
      mode: options.mode || DiscussionMode.ROUND_ROBIN,
      consensusType: options.consensusType || ConsensusType.MAJORITY,
      maxRounds: options.maxRounds || 5,
      moderator: options.moderator || null,
      convergenceThreshold: options.convergenceThreshold || 0.8,
      ...options
    };
  }

  /**
   * Validate the execution context
   * @param {ExecutionContext} context - Execution context
   * @param {OrchestrationEngine} engine - Orchestration engine
   * @returns {object} Validation result
   */
  validate(context, engine) {
    const errors = [];
    const input = context.input;

    // Check for participants
    if (!input.participants || !Array.isArray(input.participants)) {
      errors.push('GroupChat pattern requires input.participants array');
    } else if (input.participants.length < 2) {
      errors.push('GroupChat pattern requires at least 2 participants');
    } else {
      // Validate each participant exists
      for (const skillName of input.participants) {
        if (!engine.getSkill(skillName)) {
          errors.push(`Unknown participant skill: ${skillName}`);
        }
      }
    }

    // Check topic
    if (!input.topic) {
      errors.push('GroupChat pattern requires input.topic');
    }

    // Check moderator if mode is moderated
    if (this.options.mode === DiscussionMode.MODERATED) {
      const moderator = this.options.moderator || input.moderator;
      if (!moderator) {
        errors.push('Moderated mode requires a moderator skill');
      } else if (!engine.getSkill(moderator)) {
        errors.push(`Unknown moderator skill: ${moderator}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Execute group chat pattern
   * @param {ExecutionContext} context - Execution context
   * @param {OrchestrationEngine} engine - Orchestration engine
   * @returns {Promise<object>} Execution result
   */
  async execute(context, engine) {
    const validation = this.validate(context, engine);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const { participants, topic, initialContext = {} } = context.input;
    const transcript = [];
    let consensusReached = false;
    let finalDecision = null;
    let round = 0;

    engine.emit('groupChatStarted', {
      context,
      participants,
      topic,
      mode: this.options.mode
    });

    try {
      while (round < this.options.maxRounds && !consensusReached) {
        round++;

        engine.emit('groupChatRoundStarted', {
          context,
          round,
          maxRounds: this.options.maxRounds
        });

        const roundResponses = await this._executeRound(
          participants,
          topic,
          transcript,
          initialContext,
          context,
          engine,
          round
        );

        transcript.push({
          round,
          responses: roundResponses
        });

        // Check for consensus
        const consensusResult = this._checkConsensus(roundResponses);
        consensusReached = consensusResult.reached;
        
        if (consensusReached) {
          finalDecision = consensusResult.decision;
        }

        engine.emit('groupChatRoundCompleted', {
          context,
          round,
          responses: roundResponses,
          consensusReached
        });
      }

      const summary = this._createSummary(transcript, consensusReached, round);

      engine.emit('groupChatCompleted', {
        context,
        transcript,
        consensusReached,
        finalDecision,
        summary
      });

      return {
        transcript,
        rounds: round,
        consensusReached,
        finalDecision,
        summary
      };

    } catch (error) {
      engine.emit('groupChatFailed', {
        context,
        transcript,
        round,
        error
      });
      throw error;
    }
  }

  /**
   * Execute a single round of discussion
   * @private
   */
  async _executeRound(participants, topic, transcript, initialContext, parentContext, engine, round) {
    const responses = [];
    const discussionContext = {
      topic,
      round,
      previousRounds: transcript,
      ...initialContext
    };

    for (const participant of participants) {
      const stepContext = new ExecutionContext({
        task: `GroupChat round ${round}: ${participant}`,
        skill: participant,
        input: {
          ...discussionContext,
          previousResponses: responses,
          role: 'participant'
        },
        parentId: parentContext.id,
        metadata: {
          pattern: PatternType.GROUP_CHAT,
          round,
          participant
        }
      });

      parentContext.children.push(stepContext);

      try {
        stepContext.start();
        
        const response = await engine.executeSkill(
          participant,
          stepContext.input,
          parentContext
        );

        stepContext.complete(response);

        responses.push({
          participant,
          response,
          status: ExecutionStatus.COMPLETED
        });

        engine.emit('groupChatResponse', {
          participant,
          round,
          response
        });

      } catch (error) {
        stepContext.fail(error);
        
        responses.push({
          participant,
          error: error.message,
          status: ExecutionStatus.FAILED
        });
      }
    }

    return responses;
  }

  /**
   * Check for consensus among responses
   * @private
   */
  _checkConsensus(responses) {
    const validResponses = responses.filter(r => 
      r.status === ExecutionStatus.COMPLETED
    );

    if (validResponses.length === 0) {
      return { reached: false, decision: null };
    }

    // Extract decisions from responses
    const decisions = validResponses.map(r => {
      if (r.response && typeof r.response === 'object') {
        return r.response.decision || r.response.recommendation || r.response.answer;
      }
      return r.response;
    }).filter(d => d !== undefined && d !== null);

    if (decisions.length === 0) {
      return { reached: false, decision: null };
    }

    // Count votes for each decision
    const votes = {};
    for (const decision of decisions) {
      const key = typeof decision === 'object' 
        ? JSON.stringify(decision) 
        : String(decision);
      votes[key] = (votes[key] || 0) + 1;
    }

    // Find most common decision
    let maxVotes = 0;
    let winningDecision = null;
    for (const [decision, count] of Object.entries(votes)) {
      if (count > maxVotes) {
        maxVotes = count;
        try {
          winningDecision = JSON.parse(decision);
        } catch {
          winningDecision = decision;
        }
      }
    }

    // Check consensus based on type
    const total = validResponses.length;
    
    switch (this.options.consensusType) {
      case ConsensusType.UNANIMOUS:
        return {
          reached: maxVotes === total,
          decision: maxVotes === total ? winningDecision : null
        };
        
      case ConsensusType.MAJORITY:
        return {
          reached: maxVotes > total / 2,
          decision: maxVotes > total / 2 ? winningDecision : null
        };
        
      case ConsensusType.FIRST_AGREEMENT:
        return {
          reached: maxVotes >= 2,
          decision: maxVotes >= 2 ? winningDecision : null
        };
        
      default:
        return {
          reached: maxVotes >= total * this.options.convergenceThreshold,
          decision: winningDecision
        };
    }
  }

  /**
   * Create execution summary
   * @private
   */
  _createSummary(transcript, consensusReached, totalRounds) {
    let totalResponses = 0;
    let successfulResponses = 0;
    let failedResponses = 0;

    for (const round of transcript) {
      for (const response of round.responses) {
        totalResponses++;
        if (response.status === ExecutionStatus.COMPLETED) {
          successfulResponses++;
        } else {
          failedResponses++;
        }
      }
    }

    return {
      totalRounds,
      totalResponses,
      successfulResponses,
      failedResponses,
      consensusReached,
      successRate: totalResponses > 0 
        ? (successfulResponses / totalResponses * 100).toFixed(1) + '%' 
        : '0%'
    };
  }
}

/**
 * Create a group chat pattern with custom options
 * @param {object} options - Pattern options
 * @returns {GroupChatPattern} GroupChat pattern instance
 */
function createGroupChatPattern(options = {}) {
  return new GroupChatPattern(options);
}

module.exports = {
  GroupChatPattern,
  DiscussionMode,
  ConsensusType,
  createGroupChatPattern
};
