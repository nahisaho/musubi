/**
 * @fileoverview Index file for managers module
 */

'use strict';

const { CheckpointManager, CheckpointState, DEFAULT_CONFIG: CheckpointConfig } = require('./checkpoint-manager');
const AgentMemory = require('./agent-memory');
const ChangeManager = require('./change');
const DeltaSpecManager = require('./delta-spec');
const MemoryCondenser = require('./memory-condenser');
const RepoSkillManager = require('./repo-skill-manager');
const SkillLoader = require('./skill-loader');
const WorkflowManager = require('./workflow');
const { SkillToolsManager, SkillToolConfig, RestrictionLevel, DEFAULT_TOOL_SETS } = require('./skill-tools');

module.exports = {
  // Checkpoint
  CheckpointManager,
  CheckpointState,
  CheckpointConfig,
  
  // Skill Tools (Sprint 3.4)
  SkillToolsManager,
  SkillToolConfig,
  RestrictionLevel,
  DEFAULT_TOOL_SETS,
  
  // Other managers
  AgentMemory,
  ChangeManager,
  DeltaSpecManager,
  MemoryCondenser,
  RepoSkillManager,
  SkillLoader,
  WorkflowManager,
};
