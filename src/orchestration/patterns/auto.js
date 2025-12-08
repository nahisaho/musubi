/**
 * AutoPattern - Automatic skill selection pattern
 * 
 * Analyzes the task and automatically selects the most appropriate
 * skill to execute. Uses skill metadata and keywords for matching.
 */

const { BasePattern } = require('../pattern-registry');
const { PatternType, ExecutionContext, ExecutionStatus } = require('../orchestration-engine');

/**
 * Skill match confidence levels
 */
const ConfidenceLevel = {
  HIGH: 'high',     // >= 0.8
  MEDIUM: 'medium', // >= 0.5
  LOW: 'low',       // >= 0.3
  NONE: 'none'      // < 0.3
};

/**
 * AutoPattern - Automatic skill selection and execution
 */
class AutoPattern extends BasePattern {
  constructor(options = {}) {
    super({
      name: PatternType.AUTO,
      type: PatternType.AUTO,
      description: 'Automatically select and execute the best skill for a task',
      version: '1.0.0',
      tags: ['intelligent', 'automatic', 'routing'],
      useCases: [
        'Dynamic task routing',
        'Intelligent skill selection',
        'Natural language task processing'
      ],
      complexity: 'medium',
      supportsParallel: false,
      requiresHuman: false
    });

    this.options = {
      minConfidence: options.minConfidence || 0.3,
      fallbackSkill: options.fallbackSkill || null,
      multiMatch: options.multiMatch || false, // Execute multiple matching skills
      maxMatches: options.maxMatches || 3,
      ...options
    };

    // Skill category keywords for classification
    this.categoryKeywords = {
      requirements: ['requirement', 'need', 'user story', 'feature', 'specification', 'ears'],
      design: ['design', 'architecture', 'component', 'diagram', 'c4', 'uml'],
      implementation: ['implement', 'code', 'develop', 'build', 'create', 'programming'],
      testing: ['test', 'qa', 'quality', 'verify', 'validate', 'bug'],
      documentation: ['document', 'doc', 'readme', 'guide', 'tutorial'],
      devops: ['deploy', 'ci', 'cd', 'pipeline', 'infrastructure', 'kubernetes'],
      security: ['security', 'vulnerability', 'authentication', 'authorization'],
      performance: ['performance', 'optimize', 'benchmark', 'profiling'],
      analysis: ['analyze', 'review', 'assess', 'evaluate', 'audit'],
      research: ['research', 'investigate', 'explore', 'study']
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

    if (!context.task && !context.input?.task) {
      errors.push('Auto pattern requires a task description');
    }

    if (engine.listSkills().length === 0) {
      errors.push('No skills registered with engine');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Execute auto pattern - select and run best skill
   * @param {ExecutionContext} context - Execution context
   * @param {OrchestrationEngine} engine - Orchestration engine
   * @returns {Promise<object>} Execution result
   */
  async execute(context, engine) {
    const validation = this.validate(context, engine);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const task = context.task || context.input?.task || '';
    const input = context.input?.skillInput || context.input || {};

    engine.emit('autoPatternStarted', {
      context,
      task
    });

    // Find matching skills
    const matches = this._findMatchingSkills(task, engine);
    
    engine.emit('autoPatternMatched', {
      context,
      task,
      matches: matches.map(m => ({ skill: m.skill, confidence: m.confidence }))
    });

    if (matches.length === 0) {
      // No matches found
      if (this.options.fallbackSkill && engine.getSkill(this.options.fallbackSkill)) {
        engine.emit('autoPatternFallback', {
          context,
          fallbackSkill: this.options.fallbackSkill
        });
        
        return this._executeSingleSkill(
          this.options.fallbackSkill, 
          input, 
          context, 
          engine,
          { confidence: 0, reason: 'fallback' }
        );
      }
      
      throw new Error(`No matching skill found for task: ${task}`);
    }

    // Execute based on configuration
    if (this.options.multiMatch && matches.length > 1) {
      return this._executeMultipleSkills(matches, input, context, engine);
    }

    // Execute best match
    const bestMatch = matches[0];
    return this._executeSingleSkill(
      bestMatch.skill,
      input,
      context,
      engine,
      bestMatch
    );
  }

  /**
   * Find matching skills for a task
   * @private
   */
  _findMatchingSkills(task, engine) {
    const taskLower = task.toLowerCase();
    const words = this._tokenize(taskLower);
    const matches = [];

    for (const skillName of engine.listSkills()) {
      const skill = engine.getSkill(skillName);
      const score = this._calculateMatchScore(taskLower, words, skillName, skill);
      
      if (score >= this.options.minConfidence) {
        matches.push({
          skill: skillName,
          confidence: score,
          confidenceLevel: this._getConfidenceLevel(score),
          matchedKeywords: this._getMatchedKeywords(taskLower, skill)
        });
      }
    }

    // Sort by confidence descending
    matches.sort((a, b) => b.confidence - a.confidence);

    // Limit matches
    return matches.slice(0, this.options.maxMatches);
  }

  /**
   * Calculate match score for a skill
   * @private
   */
  _calculateMatchScore(taskLower, words, skillName, skill) {
    let score = 0;
    let maxScore = 0;

    // Skill name match
    maxScore += 0.3;
    const skillNameLower = skillName.toLowerCase().replace(/-/g, ' ');
    if (taskLower.includes(skillNameLower)) {
      score += 0.3;
    } else {
      // Partial name match
      const nameWords = skillNameLower.split(' ');
      const matchedNameWords = nameWords.filter(w => taskLower.includes(w));
      score += 0.3 * (matchedNameWords.length / nameWords.length);
    }

    // Keywords match
    const keywords = skill?.keywords || [];
    if (keywords.length > 0) {
      maxScore += 0.4;
      const matchedKeywords = keywords.filter(k => 
        taskLower.includes(k.toLowerCase())
      );
      score += 0.4 * (matchedKeywords.length / keywords.length);
    }

    // Category match
    maxScore += 0.2;
    const categories = skill?.categories || [];
    for (const category of categories) {
      const categoryKw = this.categoryKeywords[category] || [];
      if (categoryKw.some(kw => taskLower.includes(kw))) {
        score += 0.2;
        break;
      }
    }

    // Description match
    const description = skill?.description || '';
    if (description) {
      maxScore += 0.1;
      const descWords = this._tokenize(description.toLowerCase());
      const commonWords = words.filter(w => descWords.includes(w));
      score += 0.1 * Math.min(1, commonWords.length / 3);
    }

    // Normalize score
    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Get confidence level from score
   * @private
   */
  _getConfidenceLevel(score) {
    if (score >= 0.8) return ConfidenceLevel.HIGH;
    if (score >= 0.5) return ConfidenceLevel.MEDIUM;
    if (score >= 0.3) return ConfidenceLevel.LOW;
    return ConfidenceLevel.NONE;
  }

  /**
   * Get matched keywords
   * @private
   */
  _getMatchedKeywords(taskLower, skill) {
    const keywords = skill?.keywords || [];
    return keywords.filter(k => taskLower.includes(k.toLowerCase()));
  }

  /**
   * Tokenize text into words
   * @private
   */
  _tokenize(text) {
    return text
      .split(/\s+/)
      .map(w => w.replace(/[^\w]/g, ''))
      .filter(w => w.length > 2);
  }

  /**
   * Execute a single skill
   * @private
   */
  async _executeSingleSkill(skillName, input, context, engine, matchInfo) {
    const stepContext = new ExecutionContext({
      task: `Auto-selected: ${skillName}`,
      skill: skillName,
      input,
      parentId: context.id,
      metadata: {
        pattern: PatternType.AUTO,
        confidence: matchInfo.confidence,
        confidenceLevel: matchInfo.confidenceLevel,
        matchedKeywords: matchInfo.matchedKeywords
      }
    });

    context.children.push(stepContext);

    try {
      stepContext.start();
      const output = await engine.executeSkill(skillName, input, context);
      stepContext.complete(output);

      engine.emit('autoPatternCompleted', {
        context,
        selectedSkill: skillName,
        confidence: matchInfo.confidence,
        output
      });

      return {
        selectedSkill: skillName,
        confidence: matchInfo.confidence,
        confidenceLevel: matchInfo.confidenceLevel,
        output,
        multiMatch: false
      };

    } catch (error) {
      stepContext.fail(error);
      throw error;
    }
  }

  /**
   * Execute multiple matching skills
   * @private
   */
  async _executeMultipleSkills(matches, input, context, engine) {
    const results = [];

    for (const match of matches) {
      const stepContext = new ExecutionContext({
        task: `Auto-selected (multi): ${match.skill}`,
        skill: match.skill,
        input,
        parentId: context.id,
        metadata: {
          pattern: PatternType.AUTO,
          confidence: match.confidence,
          multiMatch: true
        }
      });

      context.children.push(stepContext);

      try {
        stepContext.start();
        const output = await engine.executeSkill(match.skill, input, context);
        stepContext.complete(output);

        results.push({
          skill: match.skill,
          confidence: match.confidence,
          status: ExecutionStatus.COMPLETED,
          output
        });

      } catch (error) {
        stepContext.fail(error);
        results.push({
          skill: match.skill,
          confidence: match.confidence,
          status: ExecutionStatus.FAILED,
          error: error.message
        });
      }
    }

    engine.emit('autoPatternCompleted', {
      context,
      results,
      multiMatch: true
    });

    return {
      selectedSkills: matches.map(m => m.skill),
      results,
      multiMatch: true
    };
  }
}

/**
 * Create an auto pattern with custom options
 * @param {object} options - Pattern options
 * @returns {AutoPattern} Auto pattern instance
 */
function createAutoPattern(options = {}) {
  return new AutoPattern(options);
}

module.exports = {
  AutoPattern,
  ConfidenceLevel,
  createAutoPattern
};
