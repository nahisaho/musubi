#!/usr/bin/env node

/**
 * MUSUBI CLI - Main Entry Point
 *
 * Provides commands for managing MUSUBI SDD projects:
 * - musubi init       - Initialize project with MUSUBI
 * - musubi status     - Show MUSUBI project status
 * - musubi validate   - Validate constitutional compliance
 * - musubi version    - Show version information
 */

const path = require('path');
const { spawnSync } = require('child_process');

// ============================================================================
// Dependency Auto-Installation
// ============================================================================

/**
 * Check if a module is installed and install dependencies if needed
 */
function ensureDependencies() {
  const packageDir = path.join(__dirname, '..');

  // Check if node_modules exists and has required packages
  const requiredModules = ['commander', 'chalk', 'fs-extra', 'inquirer'];
  let needsInstall = false;

  for (const mod of requiredModules) {
    try {
      require.resolve(mod, { paths: [packageDir] });
    } catch {
      needsInstall = true;
      break;
    }
  }

  if (needsInstall) {
    console.log('\n📦 Installing MUSUBI dependencies...\n');

    try {
      // Run npm install in the package directory
      const result = spawnSync('npm', ['install', '--omit=dev'], {
        cwd: packageDir,
        stdio: 'inherit',
        shell: process.platform === 'win32',
      });

      if (result.status !== 0) {
        console.error('\n❌ Failed to install dependencies.');
        console.error('Please run manually: cd ' + packageDir + ' && npm install\n');
        process.exit(1);
      }

      console.log('\n✅ Dependencies installed successfully!\n');
    } catch (err) {
      console.error('\n❌ Failed to install dependencies:', err.message);
      console.error('Please run manually: cd ' + packageDir + ' && npm install\n');
      process.exit(1);
    }
  }
}

// Ensure dependencies are installed before requiring them
ensureDependencies();

const { Command } = require('commander');
const chalk = require('chalk');
const fs = require('fs-extra');
const {
  detectAgentFromFlags,
  getAgentDefinition,
  getAllAliasFlags,
} = require('../src/agents/registry');

const program = new Command();

// Package info
const packageJson = require('../package.json');

program
  .name('musubi')
  .description('MUSUBI - Ultimate Specification Driven Development Tool')
  .version(packageJson.version, '-v, --version', 'Output the current version');

// ============================================================================
// Command: init
// ============================================================================
const initCommand = program.command('init').description('Initialize MUSUBI in current project');

// Add all agent selection flags dynamically
const aliasFlags = getAllAliasFlags();
aliasFlags.forEach(flag => {
  initCommand.option(`--${flag}`, `Select agent: ${flag}`);
});

// Add spec option for external specification reference
initCommand.option(
  '--spec <source>',
  'Reference external specification (URL, file path, or git repo)'
);

// Add reference option for GitHub repository references (can be specified multiple times)
initCommand.option(
  '--reference <repo>',
  'Reference GitHub repository for improvements (can be specified multiple times)',
  (value, previous) => (previous ? [...previous, value] : [value]),
  []
);

// Shorthand aliases for reference
initCommand.option(
  '-r, --ref <repo>',
  'Alias for --reference',
  (value, previous) => (previous ? [...previous, value] : [value]),
  []
);

// Add workspace/monorepo option
initCommand.option('--workspace', 'Initialize as workspace/monorepo project');
initCommand.option('--template <name>', 'Use project template (e.g., microservices, clean-arch)');

initCommand.action(async options => {
  const agentKey = detectAgentFromFlags(options);
  const agent = getAgentDefinition(agentKey);

  console.log(chalk.blue(`Initializing MUSUBI for ${chalk.bold(agent.label)}...`));
  console.log(chalk.gray(`Description: ${agent.description}\n`));

  // Merge --reference and --ref options
  const references = [...(options.reference || []), ...(options.ref || [])];

  // Extract init-specific options
  const initOptions = {
    spec: options.spec,
    workspace: options.workspace,
    template: options.template,
    references: references.length > 0 ? references : undefined,
  };

  // Delegate to musubi-init.js with agent info and options
  const initMain = require('./musubi-init.js');
  await initMain(agent, agentKey, initOptions);
});

// ============================================================================
// Command: status
// ============================================================================
program
  .command('status')
  .description('Show MUSUBI project status')
  .action(async () => {
    console.log(chalk.blue.bold('\n📊 MUSUBI Project Status\n'));

    const cwd = process.cwd();

    // Check if MUSUBI is initialized
    const skillsDir = path.join(cwd, '.claude', 'skills');
    const steeringDir = path.join(cwd, 'steering');

    if (!fs.existsSync(skillsDir) && !fs.existsSync(steeringDir)) {
      console.log(chalk.yellow('⚠️  MUSUBI is not initialized in this project.'));
      console.log(chalk.gray('\nRun: musubi init\n'));
      process.exit(1);
    }

    console.log(chalk.green('✅ MUSUBI is initialized\n'));

    // Count skills
    if (fs.existsSync(skillsDir)) {
      const skills = fs.readdirSync(skillsDir);
      console.log(chalk.white(`📁 Claude Code Skills: ${skills.length} installed`));
      console.log(chalk.gray('   Location: .claude/skills/\n'));
    }

    // Check steering files
    console.log(chalk.white('🧭 Steering Context:'));
    const steeringFiles = ['structure.md', 'tech.md', 'product.md'];
    let steeringComplete = true;

    for (const file of steeringFiles) {
      const filePath = path.join(steeringDir, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const lastModified = stats.mtime.toISOString().split('T')[0];
        console.log(chalk.green(`   ✅ ${file} (updated: ${lastModified})`));
      } else {
        console.log(chalk.red(`   ❌ ${file} (missing)`));
        steeringComplete = false;
      }
    }

    if (!steeringComplete) {
      console.log(chalk.yellow('\n⚠️  Steering files incomplete. Run: /sdd-steering'));
    }

    // Check constitutional governance
    const constitutionPath = path.join(steeringDir, 'rules', 'constitution.md');
    if (fs.existsSync(constitutionPath)) {
      console.log(chalk.green('\n✅ Constitutional Governance: Enabled'));
    } else {
      console.log(chalk.yellow('\n⚠️  Constitutional Governance: Not found'));
    }

    // Check for specifications
    const specsDir = path.join(cwd, 'storage', 'specs');
    if (fs.existsSync(specsDir)) {
      const specs = fs.readdirSync(specsDir).filter(f => f.endsWith('.md'));
      console.log(chalk.white(`\n📄 Specifications: ${specs.length} documents`));
      if (specs.length > 0) {
        console.log(chalk.gray('   Latest specs:'));
        specs.slice(0, 5).forEach(spec => {
          console.log(chalk.gray(`   - ${spec}`));
        });
      }
    }

    console.log(chalk.blue('\n💡 Next steps:'));
    console.log(chalk.gray('   - Review steering files in steering/'));
    console.log(chalk.gray('   - Create requirements: /sdd-requirements [feature]'));
    console.log(chalk.gray('   - Validate compliance: musubi validate\n'));
  });

// ============================================================================
// Command: validate
// ============================================================================
program
  .command('validate [feature]')
  .description('Validate constitutional compliance')
  .option('-a, --all', 'Validate all features')
  .option('-v, --verbose', 'Verbose output')
  .action(async (feature, options) => {
    console.log(chalk.blue.bold('\n🔍 MUSUBI Validation\n'));

    const cwd = process.cwd();
    const steeringDir = path.join(cwd, 'steering');
    const constitutionPath = path.join(steeringDir, 'rules', 'constitution.md');

    // Check if MUSUBI is initialized
    if (!fs.existsSync(constitutionPath)) {
      console.log(chalk.red('❌ MUSUBI not initialized or constitution.md missing'));
      console.log(chalk.gray('\nRun: musubi init\n'));
      process.exit(1);
    }

    console.log(chalk.white('📋 Validation Checklist:\n'));

    // Article I: Library-First
    console.log(chalk.white('Article I: Library-First Principle'));
    const libDir = path.join(cwd, 'lib');
    if (fs.existsSync(libDir)) {
      const libraries = fs.readdirSync(libDir).filter(f => {
        return fs.statSync(path.join(libDir, f)).isDirectory();
      });
      if (libraries.length > 0) {
        console.log(chalk.green(`   ✅ ${libraries.length} libraries found in lib/`));
        if (options.verbose) {
          libraries.forEach(lib => console.log(chalk.gray(`      - ${lib}`)));
        }
      } else {
        console.log(chalk.yellow('   ⚠️  No libraries found in lib/'));
      }
    } else {
      console.log(chalk.yellow('   ⚠️  lib/ directory not found'));
    }

    // Article II: CLI Interface
    console.log(chalk.white('\nArticle II: CLI Interface Mandate'));
    if (fs.existsSync(libDir)) {
      const libraries = fs.readdirSync(libDir).filter(f => {
        return fs.statSync(path.join(libDir, f)).isDirectory();
      });
      let cliCount = 0;
      libraries.forEach(lib => {
        const cliPath = path.join(libDir, lib, 'cli.ts');
        const cliJsPath = path.join(libDir, lib, 'cli.js');
        if (fs.existsSync(cliPath) || fs.existsSync(cliJsPath)) {
          cliCount++;
          if (options.verbose) {
            console.log(chalk.green(`   ✅ ${lib}/cli.ts`));
          }
        } else if (options.verbose) {
          console.log(chalk.red(`   ❌ ${lib}/cli.ts (missing)`));
        }
      });
      if (cliCount === libraries.length && libraries.length > 0) {
        console.log(chalk.green(`   ✅ All ${libraries.length} libraries have CLI interfaces`));
      } else {
        console.log(chalk.yellow(`   ⚠️  ${cliCount}/${libraries.length} libraries have CLI`));
      }
    }

    // Article IV: EARS Format
    console.log(chalk.white('\nArticle IV: EARS Requirements Format'));
    const specsDir = path.join(cwd, 'storage', 'specs');
    if (fs.existsSync(specsDir)) {
      const requirementFiles = fs
        .readdirSync(specsDir)
        .filter(f => f.includes('requirements') && f.endsWith('.md'));

      if (requirementFiles.length > 0) {
        console.log(chalk.green(`   ✅ ${requirementFiles.length} requirements documents found`));

        // Basic EARS pattern check
        let earsCompliant = 0;
        requirementFiles.forEach(file => {
          const content = fs.readFileSync(path.join(specsDir, file), 'utf8');
          const hasEarsPatterns = /\b(WHEN|WHILE|IF|WHERE|SHALL)\b/.test(content);
          if (hasEarsPatterns) {
            earsCompliant++;
            if (options.verbose) {
              console.log(chalk.green(`      ✅ ${file}`));
            }
          } else if (options.verbose) {
            console.log(chalk.yellow(`      ⚠️  ${file} (no EARS patterns detected)`));
          }
        });

        if (earsCompliant === requirementFiles.length) {
          console.log(chalk.green('   ✅ All requirements use EARS format'));
        } else {
          console.log(
            chalk.yellow(
              `   ⚠️  ${earsCompliant}/${requirementFiles.length} documents have EARS patterns`
            )
          );
        }
      } else {
        console.log(chalk.gray('   ℹ️  No requirements documents found'));
      }
    } else {
      console.log(chalk.gray('   ℹ️  storage/specs/ not found'));
    }

    // Article VI: Project Memory
    console.log(chalk.white('\nArticle VI: Project Memory (Steering System)'));
    const steeringFiles = ['structure.md', 'tech.md', 'product.md'];
    let steeringCount = 0;
    steeringFiles.forEach(file => {
      const filePath = path.join(steeringDir, file);
      if (fs.existsSync(filePath)) {
        steeringCount++;
        if (options.verbose) {
          console.log(chalk.green(`   ✅ steering/${file}`));
        }
      } else if (options.verbose) {
        console.log(chalk.red(`   ❌ steering/${file} (missing)`));
      }
    });

    if (steeringCount === 3) {
      console.log(chalk.green('   ✅ All steering files present'));
    } else {
      console.log(chalk.yellow(`   ⚠️  ${steeringCount}/3 steering files present`));
    }

    // Summary
    console.log(chalk.blue('\n📊 Validation Summary:'));
    console.log(chalk.white('   For comprehensive validation, use Claude Code:'));
    console.log(chalk.gray('   /sdd-validate [feature-name]\n'));
    console.log(chalk.white('   Or invoke skills directly:'));
    console.log(chalk.gray('   @constitution-enforcer validate [path]'));
    console.log(chalk.gray('   @traceability-auditor validate requirements.md\n'));
  });

// ============================================================================
// Command: sync
// ============================================================================
program
  .command('sync')
  .description('Sync steering documents with codebase changes')
  .option('--auto-approve', 'Auto-approve all changes')
  .option('--dry-run', 'Show changes without applying them')
  .action(async options => {
    // Delegate to musubi-sync.js
    const syncMain = require('./musubi-sync.js');

    // Pass options as command line arguments
    const args = [];
    if (options.autoApprove) args.push('--auto-approve');
    if (options.dryRun) args.push('--dry-run');

    // Temporarily set process.argv for musubi-sync.js
    const originalArgv = process.argv;
    process.argv = ['node', 'musubi-sync', ...args];

    try {
      await syncMain();
    } finally {
      process.argv = originalArgv;
    }
  });

// ============================================================================
// Command: upgrade
// ============================================================================
program
  .command('upgrade')
  .description('Upgrade MUSUBI project to a newer version')
  .option('--to <version>', 'Target version to upgrade to', 'latest')
  .option('--dry-run', 'Preview changes without applying')
  .option('--force', 'Force upgrade even if already at target version')
  .action(async _options => {
    // Delegate to musubi-upgrade.js
    process.argv = ['node', 'musubi-upgrade', ...process.argv.slice(3)];
    require('./musubi-upgrade.js');
  });

// ============================================================================
// Command: info
// ============================================================================
program
  .command('info')
  .description('Show MUSUBI version and environment info')
  .action(() => {
    const { getAgentList } = require('../src/agents/registry');

    console.log(chalk.blue.bold('\n🎯 MUSUBI Information\n'));
    console.log(chalk.white(`Version: ${packageJson.version}`));
    console.log(chalk.white(`Description: ${packageJson.description}`));
    console.log(chalk.white(`License: ${packageJson.license}\n`));

    console.log(chalk.white('Environment:'));
    console.log(chalk.gray(`   Node.js: ${process.version}`));
    console.log(chalk.gray(`   npm: ${process.env.npm_config_user_agent?.split(' ')[0] || 'N/A'}`));
    console.log(chalk.gray(`   Platform: ${process.platform}`));
    console.log(chalk.gray(`   CWD: ${process.cwd()}\n`));

    console.log(chalk.white('Supported AI Coding Agents (7):'));
    const agents = getAgentList();
    agents.forEach(agentKey => {
      const agent = getAgentDefinition(agentKey);
      const flags = agent.aliasFlags.join(', ');
      console.log(chalk.gray(`   ${agent.label} - ${flags}`));
    });
    console.log('');

    console.log(chalk.white('Documentation:'));
    console.log(chalk.gray('   https://github.com/nahisaho/MUSUBI\n'));

    console.log(chalk.white('27 Claude Code Skills:'));
    console.log(chalk.gray('   Orchestration: orchestrator, steering, constitution-enforcer'));
    console.log(
      chalk.gray('   Requirements: requirements-analyst, project-manager, change-impact-analyzer')
    );
    console.log(
      chalk.gray(
        '   Architecture: system-architect, api-designer, database-schema-designer, ui-ux-designer'
      )
    );
    console.log(chalk.gray('   Development: software-developer, issue-resolver'));
    console.log(
      chalk.gray(
        '   Quality: test-engineer, code-reviewer, bug-hunter, quality-assurance, traceability-auditor'
      )
    );
    console.log(chalk.gray('   Security: security-auditor, performance-optimizer'));
    console.log(
      chalk.gray(
        '   Infrastructure: devops-engineer, cloud-architect, database-administrator, site-reliability-engineer, release-coordinator'
      )
    );
    console.log(chalk.gray('   Documentation: technical-writer, ai-ml-engineer'));
    console.log(chalk.gray('   Agent Support: agent-assistant (v3.0.0 NEW)\n'));

    console.log(chalk.white('Advanced CLI Commands (standalone):'));
    console.log(chalk.gray('   musubi-requirements  # EARS requirements generator'));
    console.log(chalk.gray('   musubi-design        # Technical design generator (C4, ADR)'));
    console.log(chalk.gray('   musubi-tasks         # Task breakdown generator'));
    console.log(chalk.gray('   musubi-trace         # Traceability matrix analyzer'));
    console.log(chalk.gray('   musubi-analyze       # Gap detection and analysis'));
    console.log(chalk.gray('   musubi-onboard       # Team onboarding assistant'));
    console.log(chalk.gray('   musubi-share         # Knowledge sharing tools'));
    console.log(chalk.gray('   musubi-change        # Change impact analysis'));
    console.log(chalk.gray('   musubi-gaps          # Requirements gap detector\n'));

    console.log(chalk.gray('Run any command with --help for detailed usage information.\n'));
  });

// ============================================================================
// Command: help (custom formatting)
// ============================================================================
program.on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('  $ musubi init                    # Initialize MUSUBI (Claude Code, default)');
  console.log('  $ musubi init --cursor           # Initialize for Cursor IDE');
  console.log('  $ musubi init --copilot          # Initialize for GitHub Copilot');
  console.log('  $ musubi init --gemini           # Initialize for Gemini CLI');
  console.log('  $ musubi init --codex            # Initialize for Codex CLI');
  console.log('  $ musubi init --qwen             # Initialize for Qwen Code');
  console.log('  $ musubi init --windsurf         # Initialize for Windsurf IDE');
  console.log('  $ musubi status                  # Show project status');
  console.log('  $ musubi sync                    # Sync steering with codebase changes');
  console.log('  $ musubi sync --dry-run          # Preview changes without applying');
  console.log('  $ musubi validate                # Quick validation check');
  console.log('  $ musubi info                    # Show version and supported agents');
  console.log('');
  console.log('Agent Selection Flags:');
  console.log('  --claude, --claude-code          # Claude Code (default)');
  console.log('  --copilot, --github-copilot      # GitHub Copilot');
  console.log('  --cursor                         # Cursor IDE');
  console.log('  --gemini, --gemini-cli           # Gemini CLI');
  console.log('  --codex, --codex-cli             # Codex CLI');
  console.log('  --qwen, --qwen-code              # Qwen Code');
  console.log('  --windsurf                       # Windsurf IDE');
  console.log('');
  console.log('Claude Code Usage (default):');
  console.log('  /sdd-steering                    # Generate project memory');
  console.log('  /sdd-requirements [feature]      # Create EARS requirements');
  console.log('  /sdd-design [feature]            # Generate technical design');
  console.log('  /sdd-tasks [feature]             # Break down into tasks');
  console.log('  /sdd-implement [feature]         # Execute implementation');
  console.log('  /sdd-validate [feature]          # Validate compliance');
  console.log('');
  console.log('Claude Code Skills (25 specialized skills):');
  console.log('  @orchestrator, @steering, @requirements-analyst, @system-architect,');
  console.log('  @software-developer, @test-engineer, @code-reviewer, and 18 more...');
  console.log('');
  console.log('Note: Skills API is Claude Code exclusive. Other agents use commands/prompts.');
  console.log('');
  console.log('Advanced CLI Commands (standalone):');
  console.log('  musubi-requirements  # EARS requirements generator');
  console.log('  musubi-design        # Technical design generator (C4, ADR)');
  console.log('  musubi-tasks         # Task breakdown generator');
  console.log('  musubi-trace         # Traceability matrix analyzer');
  console.log('  musubi-analyze       # Gap detection and analysis');
  console.log('  musubi-onboard       # Team onboarding assistant');
  console.log('  musubi-share         # Knowledge sharing tools');
  console.log('  musubi-change        # Change impact analysis');
  console.log('  musubi-gaps          # Requirements gap detector');
  console.log('');
  console.log('Run any command with --help for detailed usage information.');
  console.log('');
});

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
