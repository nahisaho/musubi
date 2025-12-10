/**
 * Intermediate Representation (IR) Types for Cross-Format Conversion
 * 
 * Enables bidirectional conversion between MUSUBI and Spec Kit formats
 * with minimal information loss.
 */

'use strict';

/**
 * EARS Requirement Patterns
 * @typedef {'ubiquitous' | 'event-driven' | 'state-driven' | 'optional' | 'complex'} EARSPattern
 */

/**
 * Priority levels
 * @typedef {'P0' | 'P1' | 'P2' | 'P3'} Priority
 */

/**
 * Feature status
 * @typedef {'draft' | 'in-progress' | 'completed'} FeatureStatus
 */

/**
 * Source format
 * @typedef {'musubi' | 'speckit'} SourceFormat
 */

/**
 * Project Metadata
 * @typedef {Object} ProjectMetadata
 * @property {string} name - Project name
 * @property {string} version - Project version
 * @property {SourceFormat} sourceFormat - Original format
 * @property {string} sourceVersion - Original format version
 * @property {Date} convertedAt - Conversion timestamp
 * @property {Object} preservedFields - Format-specific fields preserved
 */

/**
 * Constitution Article (MUSUBI 9 Articles)
 * @typedef {Object} ArticleIR
 * @property {number} number - Article number (1-9)
 * @property {string} name - Article name
 * @property {string} description - Article description
 * @property {string[]} rules - Article rules
 * @property {string} [mappedFrom] - Original section if converted
 */

/**
 * Spec Kit Principle
 * @typedef {Object} PrincipleIR
 * @property {string} name - Principle name
 * @property {string} description - Principle description
 * @property {number} [mappedToArticle] - Mapped MUSUBI article number
 */

/**
 * Governance information
 * @typedef {Object} GovernanceIR
 * @property {string} version - Governance version
 * @property {Date} [ratified] - Ratification date
 * @property {Date} [lastAmended] - Last amendment date
 * @property {string[]} rules - Governance rules
 */

/**
 * Constitution IR
 * @typedef {Object} ConstitutionIR
 * @property {ArticleIR[]} articles - MUSUBI articles
 * @property {PrincipleIR[]} corePrinciples - Spec Kit principles
 * @property {GovernanceIR} governance - Governance info
 * @property {string} [rawContent] - Original raw content
 */

/**
 * Acceptance Criterion
 * @typedef {Object} AcceptanceCriterionIR
 * @property {string} id - Criterion ID
 * @property {string} description - Criterion description
 * @property {boolean} testable - Whether testable
 */

/**
 * User Scenario (Spec Kit style)
 * @typedef {Object} UserScenarioIR
 * @property {string} id - Scenario ID
 * @property {string} title - Scenario title
 * @property {string} actor - Who performs the action
 * @property {string} action - What action is performed
 * @property {string} benefit - Expected benefit
 * @property {Priority} priority - Priority level
 * @property {AcceptanceCriterionIR[]} acceptanceCriteria - Acceptance criteria
 */

/**
 * Requirement (EARS format)
 * @typedef {Object} RequirementIR
 * @property {string} id - Requirement ID (e.g., "REQ-001")
 * @property {string} title - Requirement title
 * @property {EARSPattern} pattern - EARS pattern type
 * @property {Priority} priority - Priority level
 * @property {string} [trigger] - WHEN clause
 * @property {string} [condition] - WHILE/WHERE clause
 * @property {string} action - SHALL clause
 * @property {string} statement - Full EARS statement
 * @property {AcceptanceCriterionIR[]} acceptanceCriteria - Acceptance criteria
 * @property {string} [traceability] - Traceability info
 * @property {string} [mappedFromUserStory] - Original user story if converted
 */

/**
 * Specification IR
 * @typedef {Object} SpecificationIR
 * @property {string} title - Specification title
 * @property {string} description - Specification description
 * @property {UserScenarioIR[]} userScenarios - User scenarios
 * @property {RequirementIR[]} requirements - EARS requirements
 * @property {string[]} successCriteria - Success criteria
 * @property {string} [rawContent] - Original raw content
 */

/**
 * Technical Context
 * @typedef {Object} TechnicalContextIR
 * @property {string} language - Primary language
 * @property {string} version - Language version
 * @property {string} framework - Primary framework
 * @property {string[]} dependencies - Dependencies
 * @property {string} [storage] - Storage solution
 * @property {string} testing - Testing framework
 * @property {string} targetPlatform - Target platform
 * @property {string} [performanceGoals] - Performance goals
 * @property {string} [constraints] - Constraints
 * @property {string} [scale] - Scale requirements
 */

/**
 * Constitution Check
 * @typedef {Object} ConstitutionCheckIR
 * @property {string} principle - Principle name
 * @property {'pass' | 'fail' | 'needs-justification'} status - Check status
 * @property {string} [notes] - Additional notes
 */

/**
 * Directory structure
 * @typedef {Object} DirectoryIR
 * @property {string} path - Directory path
 * @property {string} purpose - Directory purpose
 * @property {DirectoryIR[]} [children] - Child directories
 */

/**
 * Project Structure
 * @typedef {Object} ProjectStructureIR
 * @property {'single' | 'web' | 'mobile' | 'monorepo'} type - Project type
 * @property {DirectoryIR[]} directories - Directory structure
 */

/**
 * Task Reference
 * @typedef {Object} TaskReferenceIR
 * @property {string} taskId - Task ID
 * @property {number} order - Execution order
 */

/**
 * Phase
 * @typedef {Object} PhaseIR
 * @property {number} number - Phase number
 * @property {string} name - Phase name
 * @property {string} purpose - Phase purpose
 * @property {string[]} [prerequisites] - Prerequisites
 * @property {string[]} outputs - Phase outputs
 * @property {TaskReferenceIR[]} tasks - Tasks in this phase
 */

/**
 * Plan IR
 * @typedef {Object} PlanIR
 * @property {string} summary - Plan summary
 * @property {TechnicalContextIR} technicalContext - Technical context
 * @property {ConstitutionCheckIR[]} constitutionCheck - Constitution checks
 * @property {ProjectStructureIR} projectStructure - Project structure
 * @property {PhaseIR[]} phases - Implementation phases
 * @property {string} [rawContent] - Original raw content
 */

/**
 * Task IR
 * @typedef {Object} TaskIR
 * @property {string} id - Task ID (e.g., "T001")
 * @property {string} description - Task description
 * @property {number} phase - Phase number
 * @property {string} [userStory] - Related user story
 * @property {boolean} parallel - Can run in parallel
 * @property {string} [filePath] - Related file path
 * @property {boolean} completed - Completion status
 * @property {string[]} [dependencies] - Task dependencies
 */

/**
 * Decision
 * @typedef {Object} DecisionIR
 * @property {string} topic - Decision topic
 * @property {string} decision - Decision made
 * @property {string} rationale - Decision rationale
 */

/**
 * Alternative
 * @typedef {Object} AlternativeIR
 * @property {string} name - Alternative name
 * @property {string[]} pros - Pros
 * @property {string[]} cons - Cons
 * @property {boolean} rejected - Whether rejected
 * @property {string} [reason] - Rejection reason
 */

/**
 * Research IR
 * @typedef {Object} ResearchIR
 * @property {DecisionIR[]} decisions - Decisions made
 * @property {AlternativeIR[]} alternatives - Alternatives considered
 * @property {string} [rawContent] - Original raw content
 */

/**
 * Entity
 * @typedef {Object} EntityIR
 * @property {string} name - Entity name
 * @property {string} description - Entity description
 * @property {Object[]} fields - Entity fields
 */

/**
 * Relationship
 * @typedef {Object} RelationshipIR
 * @property {string} from - Source entity
 * @property {string} to - Target entity
 * @property {string} type - Relationship type
 * @property {string} [cardinality] - Cardinality
 */

/**
 * Data Model IR
 * @typedef {Object} DataModelIR
 * @property {EntityIR[]} entities - Entities
 * @property {RelationshipIR[]} relationships - Relationships
 * @property {string} [rawContent] - Original raw content
 */

/**
 * Contract IR
 * @typedef {Object} ContractIR
 * @property {string} type - Contract type (REST, GraphQL, etc.)
 * @property {string} name - Contract name
 * @property {Object} definition - Contract definition
 * @property {string} [rawContent] - Original raw content
 */

/**
 * Quickstart IR
 * @typedef {Object} QuickstartIR
 * @property {Object[]} steps - Setup steps
 * @property {string} [rawContent] - Original raw content
 */

/**
 * Feature IR
 * @typedef {Object} FeatureIR
 * @property {string} id - Feature ID (e.g., "001-photo-albums")
 * @property {string} name - Feature name
 * @property {string} [branch] - Feature branch
 * @property {FeatureStatus} status - Feature status
 * @property {Date} createdAt - Creation date
 * @property {SpecificationIR} specification - Specification
 * @property {PlanIR} [plan] - Implementation plan
 * @property {TaskIR[]} [tasks] - Tasks
 * @property {ResearchIR} [research] - Research
 * @property {DataModelIR} [dataModel] - Data model
 * @property {ContractIR[]} [contracts] - API contracts
 * @property {QuickstartIR} [quickstart] - Quickstart guide
 */

/**
 * Template IR
 * @typedef {Object} TemplateIR
 * @property {string} name - Template name
 * @property {string} type - Template type
 * @property {string} content - Template content
 */

/**
 * Memory IR
 * @typedef {Object} MemoryIR
 * @property {string} category - Memory category
 * @property {Object[]} entries - Memory entries
 */

/**
 * Project IR - Root structure
 * @typedef {Object} ProjectIR
 * @property {ProjectMetadata} metadata - Project metadata
 * @property {ConstitutionIR} constitution - Constitution
 * @property {FeatureIR[]} features - Features
 * @property {TemplateIR[]} templates - Templates
 * @property {MemoryIR[]} memories - Memories
 */

/**
 * Create empty Project IR
 * @returns {ProjectIR}
 */
function createEmptyProjectIR() {
  return {
    metadata: {
      name: '',
      version: '1.0.0',
      sourceFormat: 'musubi',
      sourceVersion: '2.2.0',
      convertedAt: new Date(),
      preservedFields: {},
    },
    constitution: {
      articles: [],
      corePrinciples: [],
      governance: {
        version: '1.0',
        rules: [],
      },
    },
    features: [],
    templates: [],
    memories: [],
  };
}

/**
 * Create empty Feature IR
 * @param {string} id - Feature ID
 * @param {string} name - Feature name
 * @returns {FeatureIR}
 */
function createEmptyFeatureIR(id, name) {
  return {
    id,
    name,
    status: 'draft',
    createdAt: new Date(),
    specification: {
      title: name,
      description: '',
      userScenarios: [],
      requirements: [],
      successCriteria: [],
    },
  };
}

/**
 * Create Requirement IR from EARS statement
 * @param {string} id - Requirement ID
 * @param {string} statement - EARS statement
 * @returns {RequirementIR}
 */
function createRequirementFromEARS(id, statement) {
  const pattern = detectEARSPattern(statement);
  const parsed = parseEARSStatement(statement, pattern);
  
  return {
    id,
    title: '',
    pattern,
    priority: 'P1',
    trigger: parsed.trigger,
    condition: parsed.condition,
    action: parsed.action,
    statement,
    acceptanceCriteria: [],
  };
}

/**
 * Detect EARS pattern from statement
 * @param {string} statement - EARS statement
 * @returns {EARSPattern}
 */
function detectEARSPattern(statement) {
  const upper = statement.toUpperCase();
  
  if (upper.includes('WHILE') && upper.includes('WHEN')) {
    return 'complex';
  }
  if (upper.includes('WHEN')) {
    return 'event-driven';
  }
  if (upper.includes('WHILE')) {
    return 'state-driven';
  }
  if (upper.includes('WHERE')) {
    return 'optional';
  }
  return 'ubiquitous';
}

/**
 * Parse EARS statement into components
 * @param {string} statement - EARS statement
 * @param {EARSPattern} pattern - EARS pattern
 * @returns {{trigger?: string, condition?: string, action: string}}
 */
function parseEARSStatement(statement, _pattern) {
  const result = { action: '' };
  
  // Extract SHALL clause
  const shallMatch = statement.match(/SHALL\s+(.+?)(?:\.|$)/i);
  if (shallMatch) {
    result.action = shallMatch[1].trim();
  }
  
  // Extract WHEN clause
  const whenMatch = statement.match(/WHEN\s+(.+?),/i);
  if (whenMatch) {
    result.trigger = whenMatch[1].trim();
  }
  
  // Extract WHILE clause
  const whileMatch = statement.match(/WHILE\s+(.+?),/i);
  if (whileMatch) {
    result.condition = whileMatch[1].trim();
  }
  
  // Extract WHERE clause
  const whereMatch = statement.match(/WHERE\s+(.+?),/i);
  if (whereMatch) {
    result.condition = whereMatch[1].trim();
  }
  
  return result;
}

/**
 * Convert User Story to EARS Requirement
 * @param {UserScenarioIR} userScenario - User scenario
 * @param {string} reqId - Requirement ID
 * @returns {RequirementIR}
 */
function userScenarioToRequirement(userScenario, reqId) {
  // Convert "As a [actor], I want [action] so that [benefit]"
  // to "WHEN the [actor] [action], the system SHALL [provide benefit]"
  const statement = `WHEN the ${userScenario.actor} ${userScenario.action}, the system SHALL ${userScenario.benefit}.`;
  
  return {
    id: reqId,
    title: userScenario.title,
    pattern: 'event-driven',
    priority: userScenario.priority,
    trigger: `the ${userScenario.actor} ${userScenario.action}`,
    action: userScenario.benefit,
    statement,
    acceptanceCriteria: userScenario.acceptanceCriteria,
    mappedFromUserStory: userScenario.id,
  };
}

/**
 * Convert EARS Requirement to User Story
 * @param {RequirementIR} requirement - Requirement
 * @param {string} storyId - Story ID
 * @returns {UserScenarioIR}
 */
function requirementToUserScenario(requirement, storyId) {
  // Convert EARS to User Story format
  let actor = 'user';
  let action = requirement.trigger || 'performs an action';
  let benefit = requirement.action;
  
  // Try to extract actor from trigger
  if (requirement.trigger) {
    const actorMatch = requirement.trigger.match(/the\s+(\w+)/i);
    if (actorMatch) {
      actor = actorMatch[1];
    }
  }
  
  return {
    id: storyId,
    title: requirement.title || `Story for ${requirement.id}`,
    actor,
    action,
    benefit,
    priority: requirement.priority,
    acceptanceCriteria: requirement.acceptanceCriteria,
  };
}

module.exports = {
  createEmptyProjectIR,
  createEmptyFeatureIR,
  createRequirementFromEARS,
  detectEARSPattern,
  parseEARSStatement,
  userScenarioToRequirement,
  requirementToUserScenario,
};
