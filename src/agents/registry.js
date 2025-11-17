/**
 * MUSUBI Agent Registry
 *
 * Defines supported AI coding agents and their installation configurations.
 * Inspired by cc-sdd multi-agent architecture.
 */

const agentDefinitions = {
  'claude-code': {
    label: 'Claude Code',
    description:
      'Installs MUSUBI skills in `.claude/skills/`, commands in `.claude/commands/`, agents in `CLAUDE.md`, and steering in `steering/`',
    aliasFlags: ['--claude-code', '--claude'],
    recommendedModels: ['Claude Sonnet 4.5 or newer'],
    layout: {
      skillsDir: '.claude/skills', // MUSUBI-specific: 25 skills (Skills API)
      commandsDir: '.claude/commands',
      agentDir: '.claude',
      docFile: 'CLAUDE.md',
      agentsFile: '.claude/AGENTS.md', // 25 agents definition (shared format)
    },
    commands: {
      steering: '/sdd-steering',
      requirements: '/sdd-requirements <feature>',
      design: '/sdd-design <feature>',
      tasks: '/sdd-tasks <feature>',
      implement: '/sdd-implement <feature>',
      validate: '/sdd-validate <feature>',
    },
    features: {
      hasSkills: true, // Claude Code supports Skills API
      hasCommands: true,
      commandPrefix: '/',
    },
  },
  'github-copilot': {
    label: 'GitHub Copilot',
    description:
      'Installs MUSUBI prompts in `.github/prompts/`, agents in `.github/AGENTS.md`, and steering in `steering/`',
    aliasFlags: ['--copilot', '--github-copilot'],
    recommendedModels: ['Claude Sonnet 4.5 or newer', 'GPT-4'],
    layout: {
      commandsDir: '.github/prompts',
      agentDir: '.github',
      docFile: 'AGENTS.md', // Main doc file
      agentsFile: '.github/AGENTS.md', // 25 agents definition
    },
    commands: {
      steering: '#sdd-steering',
      requirements: '#sdd-requirements <feature>',
      design: '#sdd-design <feature>',
      tasks: '#sdd-tasks <feature>',
      implement: '#sdd-implement <feature>',
      validate: '#sdd-validate <feature>',
    },
    features: {
      hasSkills: true, // AGENTS.md provides 25 agents
      hasCommands: true,
      commandPrefix: '#',
    },
  },
  cursor: {
    label: 'Cursor IDE',
    description:
      'Installs MUSUBI commands in `.cursor/commands/`, agents in `.cursor/AGENTS.md`, and steering in `steering/`',
    aliasFlags: ['--cursor'],
    recommendedModels: ['Claude Sonnet 4.5 or newer', 'GPT-4'],
    layout: {
      commandsDir: '.cursor/commands',
      agentDir: '.cursor',
      docFile: 'AGENTS.md', // Main doc file
      agentsFile: '.cursor/AGENTS.md', // 25 agents definition
    },
    commands: {
      steering: '/sdd-steering',
      requirements: '/sdd-requirements <feature>',
      design: '/sdd-design <feature>',
      tasks: '/sdd-tasks <feature>',
      implement: '/sdd-implement <feature>',
      validate: '/sdd-validate <feature>',
    },
    features: {
      hasSkills: true, // AGENTS.md provides 25 agents
      hasCommands: true,
      commandPrefix: '/',
    },
  },
  'gemini-cli': {
    label: 'Gemini CLI',
    description:
      'Installs MUSUBI commands in `.gemini/commands/` (TOML format), agents in `GEMINI.md`, and steering in `steering/`',
    aliasFlags: ['--gemini-cli', '--gemini'],
    recommendedModels: ['Gemini 2.0 Flash or newer'],
    layout: {
      commandsDir: '.gemini/commands',
      agentDir: '.gemini',
      docFile: 'GEMINI.md',
      agentsFile: 'GEMINI.md', // Agents embedded in GEMINI.md
    },
    commands: {
      steering: '/sdd-steering',
      requirements: '/sdd-requirements <feature>',
      design: '/sdd-design <feature>',
      tasks: '/sdd-tasks <feature>',
      implement: '/sdd-implement <feature>',
      validate: '/sdd-validate <feature>',
    },
    features: {
      hasSkills: true, // GEMINI.md provides 25 agents
      hasCommands: true,
      commandPrefix: '/',
      commandFormat: 'toml', // Unique: Gemini uses TOML instead of Markdown
    },
  },
  codex: {
    label: 'Codex CLI',
    description:
      'Installs MUSUBI prompts in `.codex/prompts/`, agents in `.codex/AGENTS.md`, and steering in `steering/`',
    aliasFlags: ['--codex', '--codex-cli'],
    recommendedModels: ['GPT-4 or newer'],
    layout: {
      commandsDir: '.codex/prompts',
      agentDir: '.codex',
      docFile: 'AGENTS.md', // Main doc file
      agentsFile: '.codex/AGENTS.md', // 25 agents definition
    },
    commands: {
      steering: '/prompts:sdd-steering',
      requirements: '/prompts:sdd-requirements <feature>',
      design: '/prompts:sdd-design <feature>',
      tasks: '/prompts:sdd-tasks <feature>',
      implement: '/prompts:sdd-implement <feature>',
      validate: '/prompts:sdd-validate <feature>',
    },
    features: {
      hasSkills: true, // AGENTS.md provides 25 agents
      hasCommands: true,
      commandPrefix: '/prompts:',
    },
  },
  'qwen-code': {
    label: 'Qwen Code',
    description:
      'Installs MUSUBI commands in `.qwen/commands/`, agents in `.qwen/AGENTS.md`, and steering in `steering/`',
    aliasFlags: ['--qwen-code', '--qwen'],
    recommendedModels: ['Qwen 2.5 Coder or newer'],
    layout: {
      commandsDir: '.qwen/commands',
      agentDir: '.qwen',
      docFile: 'QWEN.md',
      agentsFile: '.qwen/AGENTS.md', // 25 agents definition
    },
    commands: {
      steering: '/sdd-steering',
      requirements: '/sdd-requirements <feature>',
      design: '/sdd-design <feature>',
      tasks: '/sdd-tasks <feature>',
      implement: '/sdd-implement <feature>',
      validate: '/sdd-validate <feature>',
    },
    features: {
      hasSkills: true, // AGENTS.md provides 25 agents
      hasCommands: true,
      commandPrefix: '/',
    },
  },
  windsurf: {
    label: 'Windsurf IDE',
    description:
      'Installs MUSUBI workflows in `.windsurf/workflows/`, agents in `.windsurf/AGENTS.md`, and steering in `steering/`',
    aliasFlags: ['--windsurf'],
    recommendedModels: ['Claude Sonnet 4.5 or newer', 'GPT-4'],
    layout: {
      commandsDir: '.windsurf/workflows',
      agentDir: '.windsurf',
      docFile: 'AGENTS.md', // Main doc file
      agentsFile: '.windsurf/AGENTS.md', // 25 agents definition
    },
    commands: {
      steering: '/sdd-steering',
      requirements: '/sdd-requirements <feature>',
      design: '/sdd-design <feature>',
      tasks: '/sdd-tasks <feature>',
      implement: '/sdd-implement <feature>',
      validate: '/sdd-validate <feature>',
    },
    features: {
      hasSkills: true, // AGENTS.md provides 25 agents
      hasCommands: true,
      commandPrefix: '/',
    },
  },
};

/**
 * Get agent definition by key
 * @param {string} agentKey - Agent key (e.g., 'claude-code', 'cursor')
 * @returns {object} Agent definition
 */
function getAgentDefinition(agentKey) {
  const definition = agentDefinitions[agentKey];
  if (!definition) {
    throw new Error(`Unknown agent: ${agentKey}`);
  }
  return definition;
}

/**
 * Detect agent from CLI flags
 * @param {object} options - CLI options object
 * @returns {string} Agent key
 */
function detectAgentFromFlags(options) {
  // Check each agent's alias flags
  for (const [agentKey, definition] of Object.entries(agentDefinitions)) {
    for (const flag of definition.aliasFlags) {
      const flagName = flag.replace(/^--/, '');
      // Convert kebab-case to camelCase for commander compatibility
      const camelCaseFlagName = flagName.replace(/-([a-z])/g, g => g[1].toUpperCase());
      if (options[flagName] || options[camelCaseFlagName]) {
        return agentKey;
      }
    }
  }

  // Default to Claude Code
  return 'claude-code';
}

/**
 * Get list of all supported agents
 * @returns {string[]} Array of agent keys
 */
function getAgentList() {
  return Object.keys(agentDefinitions);
}

/**
 * Get all alias flags for CLI option parsing
 * @returns {string[]} Array of flag names (without --)
 */
function getAllAliasFlags() {
  const flags = new Set();
  for (const definition of Object.values(agentDefinitions)) {
    for (const flag of definition.aliasFlags) {
      flags.add(flag.replace(/^--/, ''));
    }
  }
  return Array.from(flags);
}

module.exports = {
  agentDefinitions,
  getAgentDefinition,
  detectAgentFromFlags,
  getAgentList,
  getAllAliasFlags,
};
