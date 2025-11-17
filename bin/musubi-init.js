#!/usr/bin/env node

/**
 * MUSUBI Initialization Script
 *
 * Initializes a new project with MUSUBI SDD tools for various AI coding agents:
 * - Claude Code: .claude/skills/ (25 skills) + .claude/commands/
 * - GitHub Copilot: .github/prompts/
 * - Cursor: .cursor/commands/
 * - Gemini CLI: .gemini/commands/
 * - Codex CLI: .codex/prompts/
 * - Qwen Code: .qwen/commands/
 * - Windsurf: .windsurf/workflows/
 *
 * All agents get:
 * - steering/ directory with project memory
 * - templates/ for documents
 * - Constitutional governance
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

const TEMPLATE_DIR = path.join(__dirname, '..', 'src', 'templates');
const SHARED_TEMPLATE_DIR = path.join(TEMPLATE_DIR, 'shared');
const AGENTS_TEMPLATE_DIR = path.join(TEMPLATE_DIR, 'agents');

/**
 * Main initialization function
 * @param {object} agent - Agent definition from registry
 * @param {string} agentKey - Agent key (e.g., 'claude-code', 'cursor')
 */
async function main(agent, agentKey) {
  // Dynamic import for inquirer (ESM module)
  const inquirer = await import('inquirer');

  // If called directly without agent parameter, default to Claude Code
  if (!agent) {
    const { getAgentDefinition } = require('../src/agents/registry');
    agent = getAgentDefinition('claude-code');
    agentKey = 'claude-code';
  }

  console.log(chalk.blue.bold('\n🎯 MUSUBI - Ultimate Specification Driven Development\n'));
  console.log(chalk.white(`Initializing for: ${chalk.bold(agent.label)}\n`));

  // Check if already initialized for this agent
  const agentDir = agent.layout.agentDir;
  if (fs.existsSync(agentDir)) {
    const { overwrite } = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `MUSUBI for ${agent.label} is already initialized. Overwrite?`,
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('Initialization cancelled.'));
      process.exit(0);
    }
  }

  // Collect project information
  const prompts = [
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: path.basename(process.cwd()),
    },
    {
      type: 'input',
      name: 'description',
      message: 'Project description:',
      default: 'A software project using MUSUBI SDD',
    },
    {
      type: 'list',
      name: 'projectType',
      message: 'Project type:',
      choices: ['Greenfield (0→1)', 'Brownfield (1→n)', 'Both'],
    },
  ];

  // Skills selection is only for Claude Code (Skills API exclusive)
  if (agentKey === 'claude-code' && agent.layout.skillsDir) {
    prompts.push({
      type: 'checkbox',
      name: 'skills',
      message: 'Select skills to install (all recommended):',
      choices: [
        {
          name: 'Core (orchestrator, steering, constitution-enforcer)',
          value: 'core',
          checked: true,
        },
        {
          name: 'Requirements & Planning (requirements-analyst, project-manager, change-impact-analyzer)',
          value: 'requirements',
          checked: true,
        },
        {
          name: 'Architecture & Design (system-architect, api-designer, database-schema-designer, ui-ux-designer)',
          value: 'architecture',
          checked: true,
        },
        { name: 'Development (software-developer)', value: 'development', checked: true },
        {
          name: 'Quality & Review (test-engineer, code-reviewer, bug-hunter, quality-assurance, traceability-auditor)',
          value: 'quality',
          checked: true,
        },
        {
          name: 'Security & Performance (security-auditor, performance-optimizer)',
          value: 'security',
          checked: true,
        },
        {
          name: 'Infrastructure (devops-engineer, cloud-architect, database-administrator, site-reliability-engineer, release-coordinator)',
          value: 'infrastructure',
          checked: true,
        },
        {
          name: 'Documentation (technical-writer, ai-ml-engineer)',
          value: 'documentation',
          checked: true,
        },
      ],
    });
  }

  prompts.push(
    {
      type: 'confirm',
      name: 'createSteering',
      message: 'Generate initial steering context?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'createConstitution',
      message: 'Create constitutional governance?',
      default: true,
    }
  );

  const answers = await inquirer.default.prompt(prompts);

  console.log(chalk.green('\n✨ Initializing MUSUBI...\n'));

  // Create directory structure (agent-specific + shared)
  const dirs = [
    'steering',
    'steering/rules',
    'templates',
    'storage/specs',
    'storage/changes',
    'storage/features',
  ];

  // Add agent-specific directories
  if (agent.layout.skillsDir) {
    dirs.unshift(agent.layout.skillsDir);
  }
  if (agent.layout.commandsDir) {
    dirs.unshift(agent.layout.commandsDir);
  }
  if (agent.layout.agentDir && !dirs.includes(agent.layout.agentDir)) {
    dirs.unshift(agent.layout.agentDir);
  }

  for (const dir of dirs) {
    await fs.ensureDir(dir);
    console.log(chalk.gray(`  Created ${dir}/`));
  }

  // Install skills (Claude Code only - Skills API)
  if (agentKey === 'claude-code' && agent.layout.skillsDir && answers.skills) {
    const skillGroups = {
      core: ['orchestrator', 'steering', 'constitution-enforcer'],
      requirements: ['requirements-analyst', 'project-manager', 'change-impact-analyzer'],
      architecture: [
        'system-architect',
        'api-designer',
        'database-schema-designer',
        'ui-ux-designer',
      ],
      development: ['software-developer'],
      quality: [
        'test-engineer',
        'code-reviewer',
        'bug-hunter',
        'quality-assurance',
        'traceability-auditor',
      ],
      security: ['security-auditor', 'performance-optimizer'],
      infrastructure: [
        'devops-engineer',
        'cloud-architect',
        'database-administrator',
        'site-reliability-engineer',
        'release-coordinator',
      ],
      documentation: ['technical-writer', 'ai-ml-engineer'],
    };

    let skillCount = 0;
    for (const group of answers.skills) {
      for (const skill of skillGroups[group]) {
        await copySkill(skill, agent);
        skillCount++;
      }
    }

    console.log(chalk.green(`\n  Installed ${skillCount} skills`));
  }

  // Install commands/prompts/workflows
  if (agent.features.hasCommands) {
    await copyCommands(agent, agentKey);
    const commandType =
      agentKey === 'github-copilot' || agentKey === 'codex'
        ? 'prompts'
        : agentKey === 'windsurf'
          ? 'workflows'
          : 'commands';
    console.log(chalk.green(`  Installed ${commandType}`));
  }

  // Install AGENTS.md (all platforms get 25 agent definitions)
  if (agent.layout.agentsFile) {
    await copyAgentsFile(agent);
    console.log(chalk.green('  Installed 25 agent definitions (AGENTS.md)'));
  }

  // Generate steering context
  if (answers.createSteering) {
    await generateSteering(answers);
    console.log(chalk.green('  Generated steering context'));
  }

  // Create constitution
  if (answers.createConstitution) {
    await createConstitution();
    console.log(chalk.green('  Created constitutional governance'));
  }

  // Create README
  await createReadme(answers, agent, agentKey);
  console.log(chalk.green(`  Created ${agent.layout.docFile || 'MUSUBI.md'} guide`));

  // Success message
  console.log(chalk.blue.bold(`\n✅ MUSUBI initialization complete for ${agent.label}!\n`));
  console.log(chalk.white('Next steps:'));
  console.log(chalk.gray('  1. Review steering/ context files'));
  console.log(chalk.gray('  2. Review steering/rules/constitution.md'));

  if (agent.features.hasSkills) {
    console.log(chalk.gray(`  3. Start using ${agent.label} with MUSUBI skills`));
  } else {
    console.log(chalk.gray(`  3. Start using ${agent.label} with MUSUBI`));
  }

  const cmdExample = agent.commands.requirements.replace(' <feature>', ' authentication');
  console.log(chalk.gray(`  4. Try commands: ${cmdExample}\n`));
  console.log(chalk.cyan('Learn more: https://github.com/your-org/musubi\n'));
}

async function copySkill(skillName, agent) {
  // Only Claude Code has skillsDir (Skills API)
  if (!agent.layout.skillsDir) {
    return; // Skip for agents without Skills API support
  }

  const srcDir = path.join(AGENTS_TEMPLATE_DIR, 'claude-code', 'skills', skillName);
  const destDir = path.join(agent.layout.skillsDir, skillName);
  await fs.copy(srcDir, destDir);
}

async function copyCommands(agent, agentKey) {
  const srcDir = path.join(AGENTS_TEMPLATE_DIR, agentKey, 'commands');
  const destDir = agent.layout.commandsDir;

  // If agent-specific templates don't exist yet, fall back to Claude Code templates
  if (!fs.existsSync(srcDir)) {
    const fallbackSrc = path.join(AGENTS_TEMPLATE_DIR, 'claude-code', 'commands');
    await fs.copy(fallbackSrc, destDir);
  } else {
    await fs.copy(srcDir, destDir);
  }
}

async function copyAgentsFile(agent) {
  const sharedAgentsFile = path.join(AGENTS_TEMPLATE_DIR, 'shared', 'AGENTS.md');
  const destFile = agent.layout.agentsFile;

  // For Gemini CLI, AGENTS.md is embedded in GEMINI.md
  if (destFile === 'GEMINI.md') {
    // Read shared AGENTS.md
    const agentsContent = await fs.readFile(sharedAgentsFile, 'utf8');

    // Read existing GEMINI.md template if exists
    const geminiTemplate = path.join(AGENTS_TEMPLATE_DIR, 'gemini-cli', 'GEMINI.md');
    let geminiContent = '';
    if (fs.existsSync(geminiTemplate)) {
      geminiContent = await fs.readFile(geminiTemplate, 'utf8');
    } else {
      geminiContent =
        '# Gemini CLI - MUSUBI Configuration\n\n' +
        'This file configures Gemini CLI for MUSUBI SDD.\n\n' +
        '---\n\n';
    }

    // Append AGENTS.md content
    geminiContent += agentsContent;
    await fs.writeFile(destFile, geminiContent);
  } else {
    // For other platforms, copy AGENTS.md as-is
    await fs.copy(sharedAgentsFile, destFile);
  }
}

async function generateSteering(answers) {
  const steeringTemplates = path.join(SHARED_TEMPLATE_DIR, 'steering');

  // Copy and customize steering files
  const files = ['structure.md', 'tech.md', 'product.md'];
  for (const file of files) {
    let content = await fs.readFile(path.join(steeringTemplates, file), 'utf8');

    // Replace placeholders
    content = content.replace(/\{\{PROJECT_NAME\}\}/g, answers.projectName);
    content = content.replace(/\{\{DESCRIPTION\}\}/g, answers.description);
    content = content.replace(/\{\{DATE\}\}/g, new Date().toISOString().split('T')[0]);

    await fs.writeFile(path.join('steering', file), content);
  }
}

async function createConstitution() {
  const constitutionTemplate = path.join(SHARED_TEMPLATE_DIR, 'constitution', 'constitution.md');
  await fs.copy(constitutionTemplate, 'steering/rules/constitution.md');
}

async function createReadme(answers, agent, agentKey) {
  const skillsSection =
    agent.features.hasSkills && answers.skills
      ? `This project uses **MUSUBI** (Ultimate Specification Driven Development) with ${answers.skills.length} skill groups.

### Available Skills

Check \`${agent.layout.skillsDir}/\` directory for all installed skills.

`
      : `This project uses **MUSUBI** (Ultimate Specification Driven Development).

`;

  const commandType =
    agentKey === 'github-copilot' || agentKey === 'codex'
      ? 'Prompts'
      : agentKey === 'windsurf'
        ? 'Workflows'
        : 'Commands';

  const readme = `# MUSUBI - ${answers.projectName}

${answers.description}

## Initialized with MUSUBI SDD for ${agent.label}

${skillsSection}
### ${commandType}

- \`${agent.commands.steering}\` - Generate/update project memory
- \`${agent.commands.requirements}\` - Create EARS requirements
- \`${agent.commands.design}\` - Generate C4 + ADR design
- \`${agent.commands.tasks}\` - Break down into tasks
- \`${agent.commands.implement}\` - Execute implementation
- \`${agent.commands.validate}\` - Validate constitutional compliance

### Project Memory

- \`steering/structure.md\` - Architecture patterns
- \`steering/tech.md\` - Technology stack
- \`steering/product.md\` - Product context
- \`steering/rules/constitution.md\` - 9 Constitutional Articles

### Learn More

- [MUSUBI Documentation](https://github.com/your-org/musubi)
- [Constitutional Governance](steering/rules/constitution.md)
- [8-Stage SDD Workflow](steering/rules/workflow.md)

---

**Agent**: ${agent.label}
**Initialized**: ${new Date().toISOString().split('T')[0]}
**MUSUBI Version**: 0.1.0
`;

  const filename = agent.layout.docFile || 'MUSUBI.md';
  await fs.writeFile(filename, readme);
}

// Export for use from musubi.js
module.exports = main;

// Allow direct execution for backward compatibility
if (require.main === module) {
  main().catch(err => {
    console.error(chalk.red('\n❌ Initialization failed:'), err.message);
    process.exit(1);
  });
}
