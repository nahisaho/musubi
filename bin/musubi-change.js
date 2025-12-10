#!/usr/bin/env node

/**
 * MUSUBI Change Management CLI
 *
 * Manages delta specifications for brownfield projects
 * Implements ADDED/MODIFIED/REMOVED/RENAMED change tracking
 *
 * Usage:
 *   musubi-change init <change-id>       # Create change proposal
 *   musubi-change apply <change-id>      # Apply change to codebase
 *   musubi-change archive <change-id>    # Archive completed change
 *   musubi-change list                   # List all changes
 *   musubi-change validate <change-id>   # Validate delta format
 *   musubi-change show <change-id>       # Show change details
 *   musubi-change impact <change-id>     # Show impact analysis
 *   musubi-change approve <change-id>    # Approve change proposal
 *   musubi-change reject <change-id>     # Reject change proposal
 */

const { Command } = require('commander');
const chalk = require('chalk');
const ChangeManager = require('../src/managers/change.js');
const { DeltaSpecManager } = require('../src/managers/delta-spec.js');
const { DeltaFormatValidator } = require('../src/validators/delta-format.js');
const { ImpactAnalyzer } = require('../src/analyzers/impact-analyzer.js');

const program = new Command();

program
  .name('musubi-change')
  .description('MUSUBI Change Management - Delta specifications for brownfield projects')
  .version('0.8.6');

// Initialize change proposal
program
  .command('init <change-id>')
  .description('Create new change proposal with delta specification')
  .option('-t, --title <title>', 'Change title')
  .option('-d, --description <description>', 'Change description')
  .option('--changes <dir>', 'Changes directory', 'storage/changes')
  .option('--template <path>', 'Custom delta template')
  .action(async (changeId, options) => {
    try {
      const workspaceRoot = process.cwd();
      const manager = new ChangeManager(workspaceRoot);

      console.log(chalk.blue('📝 Creating change proposal...'));
      console.log(chalk.dim(`Change ID: ${changeId}`));

      const result = await manager.initChange(changeId, {
        title: options.title,
        description: options.description,
        changesDir: options.changes,
        template: options.template,
      });

      console.log(chalk.green('✓ Change proposal created successfully'));
      console.log(chalk.dim(`Location: ${result.file}`));
      console.log();
      console.log(chalk.yellow('Next steps:'));
      console.log(chalk.dim('1. Edit the delta specification'));
      console.log(chalk.dim(`2. Run: musubi-change validate ${changeId}`));
      console.log(chalk.dim(`3. Run: musubi-change apply ${changeId}`));
    } catch (error) {
      console.error(chalk.red('✗ Failed to create change proposal'));
      console.error(chalk.dim(error.message));
      process.exit(1);
    }
  });

// Apply change to codebase
program
  .command('apply <change-id>')
  .description('Apply change proposal to codebase')
  .option('--changes <dir>', 'Changes directory', 'storage/changes')
  .option('--dry-run', 'Preview changes without applying')
  .option('--force', 'Force apply even with validation errors')
  .action(async (changeId, options) => {
    try {
      const workspaceRoot = process.cwd();
      const manager = new ChangeManager(workspaceRoot);

      if (options.dryRun) {
        console.log(chalk.blue('🔍 Previewing changes (dry run)...'));
      } else {
        console.log(chalk.blue('⚙️  Applying changes...'));
      }

      const result = await manager.applyChange(changeId, {
        changesDir: options.changes,
        dryRun: options.dryRun,
        force: options.force,
      });

      if (options.dryRun) {
        console.log(chalk.yellow('\nPreview (no changes applied):'));
        console.log(chalk.green(`  ${result.stats.added} files to be added`));
        console.log(chalk.blue(`  ${result.stats.modified} files to be modified`));
        console.log(chalk.red(`  ${result.stats.removed} files to be removed`));
        console.log(chalk.yellow(`  ${result.stats.renamed} files to be renamed`));
      } else {
        console.log(chalk.green('\n✓ Changes applied successfully'));
        console.log(chalk.green(`  ${result.stats.added} files added`));
        console.log(chalk.blue(`  ${result.stats.modified} files modified`));
        console.log(chalk.red(`  ${result.stats.removed} files removed`));
        console.log(chalk.yellow(`  ${result.stats.renamed} files renamed`));

        console.log();
        console.log(chalk.yellow('Next steps:'));
        console.log(chalk.dim('1. Test the changes'));
        console.log(chalk.dim(`2. Run: musubi-change archive ${changeId}`));
      }
    } catch (error) {
      console.error(chalk.red('✗ Failed to apply changes'));
      console.error(chalk.dim(error.message));
      process.exit(1);
    }
  });

// Archive completed change
program
  .command('archive <change-id>')
  .description('Archive completed change to specs/')
  .option('--changes <dir>', 'Changes directory', 'storage/changes')
  .option('--specs <dir>', 'Specs archive directory', 'specs')
  .option('--force', 'Force archive even if not in implemented status')
  .action(async (changeId, options) => {
    try {
      const workspaceRoot = process.cwd();
      const deltaManager = new DeltaSpecManager(workspaceRoot);
      const changeManager = new ChangeManager(workspaceRoot);

      console.log(chalk.blue('📦 Archiving change...'));

      // Try DeltaSpecManager first (new workflow)
      const delta = deltaManager.load(changeId);
      
      if (delta) {
        // Check status
        if (delta.status !== 'implemented' && !options.force) {
          console.log(chalk.yellow(`⚠ Change ${changeId} is in "${delta.status}" status.`));
          console.log(chalk.dim('Use --force to archive anyway, or update status first:'));
          console.log(chalk.dim(`  musubi-change approve ${changeId}`));
          console.log(chalk.dim(`  # implement the change`));
          console.log(chalk.dim(`  musubi-change apply ${changeId}`));
          process.exit(1);
        }

        const result = deltaManager.archive(changeId);
        
        console.log(chalk.green('✓ Change archived successfully'));
        console.log(chalk.dim(`Merged to: ${result.mergedTo}`));
        console.log(chalk.dim(`Archive: ${result.archivePath}`));
        console.log();
        console.log(chalk.yellow('Delta merged to canonical specification'));
      } else {
        // Fall back to ChangeManager (legacy workflow)
        const result = await changeManager.archiveChange(changeId, {
          changesDir: options.changes,
          specsDir: options.specs,
        });

        console.log(chalk.green('✓ Change archived successfully'));
        console.log(chalk.dim(`Source: ${result.source}`));
        console.log(chalk.dim(`Archive: ${result.archive}`));
        console.log();
        console.log(chalk.yellow('Delta merged to canonical specification'));
      }
    } catch (error) {
      console.error(chalk.red('✗ Failed to archive change'));
      console.error(chalk.dim(error.message));
      process.exit(1);
    }
  });

// List all changes
program
  .command('list')
  .description('List all change proposals')
  .option('--changes <dir>', 'Changes directory', 'storage/changes')
  .option('--status <status>', 'Filter by status (pending|applied|archived)')
  .option('--format <format>', 'Output format (table|json)', 'table')
  .action(async options => {
    try {
      const workspaceRoot = process.cwd();
      const manager = new ChangeManager(workspaceRoot);

      const changes = await manager.listChanges({
        changesDir: options.changes,
        status: options.status,
      });

      if (options.format === 'json') {
        console.log(JSON.stringify(changes, null, 2));
        return;
      }

      // Table format
      console.log(chalk.bold('\nChange Proposals:\n'));

      if (changes.length === 0) {
        console.log(chalk.dim('No changes found'));
        return;
      }

      console.log(chalk.dim('ID'.padEnd(20) + 'Title'.padEnd(40) + 'Status'.padEnd(15) + 'Date'));
      console.log(chalk.dim('-'.repeat(90)));

      changes.forEach(change => {
        const statusColor =
          {
            pending: chalk.yellow,
            applied: chalk.blue,
            archived: chalk.green,
          }[change.status] || chalk.white;

        console.log(
          change.id.padEnd(20) +
            change.title.padEnd(40) +
            statusColor(change.status.padEnd(15)) +
            change.date
        );
      });

      console.log();
      console.log(chalk.dim(`Total: ${changes.length} change(s)`));
    } catch (error) {
      console.error(chalk.red('✗ Failed to list changes'));
      console.error(chalk.dim(error.message));
      process.exit(1);
    }
  });

// Validate delta format
program
  .command('validate <change-id>')
  .description('Validate delta specification format')
  .option('--changes <dir>', 'Changes directory', 'storage/changes')
  .option('-v, --verbose', 'Show detailed validation results')
  .action(async (changeId, options) => {
    try {
      const workspaceRoot = process.cwd();
      const manager = new ChangeManager(workspaceRoot);

      console.log(chalk.blue('🔍 Validating delta specification...'));

      const result = await manager.validateChange(changeId, {
        changesDir: options.changes,
        verbose: options.verbose,
      });

      if (result.valid) {
        console.log(chalk.green('✓ Delta specification is valid'));

        if (options.verbose) {
          console.log();
          console.log(chalk.bold('Summary:'));
          console.log(chalk.green(`  ${result.stats.added} ADDED items`));
          console.log(chalk.blue(`  ${result.stats.modified} MODIFIED items`));
          console.log(chalk.red(`  ${result.stats.removed} REMOVED items`));
          console.log(chalk.yellow(`  ${result.stats.renamed} RENAMED items`));
        }
      } else {
        console.log(chalk.red('✗ Validation failed'));
        console.log();

        result.errors.forEach(error => {
          console.log(chalk.red(`  • ${error.message}`));
          if (error.line) {
            console.log(chalk.dim(`    Line ${error.line}`));
          }
        });

        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('✗ Failed to validate change'));
      console.error(chalk.dim(error.message));
      process.exit(1);
    }
  });

// Show change details
program
  .command('show <change-id>')
  .description('Show detailed information about a change')
  .option('--changes <dir>', 'Changes directory', 'storage/changes')
  .option('--format <format>', 'Output format (text|json)', 'text')
  .action(async (changeId, options) => {
    try {
      const workspaceRoot = process.cwd();
      const deltaManager = new DeltaSpecManager(workspaceRoot);

      const delta = deltaManager.load(changeId);
      if (!delta) {
        console.error(chalk.red(`✗ Change not found: ${changeId}`));
        process.exit(1);
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(delta, null, 2));
        return;
      }

      // Text format
      console.log();
      console.log(chalk.bold.blue(`Delta Specification: ${delta.id}`));
      console.log(chalk.dim('─'.repeat(50)));
      console.log();
      
      const typeColors = {
        ADDED: chalk.green,
        MODIFIED: chalk.blue,
        REMOVED: chalk.red,
        RENAMED: chalk.yellow
      };
      const typeColor = typeColors[delta.type] || chalk.white;
      
      console.log(`${chalk.bold('Type:')}        ${typeColor(delta.type)}`);
      console.log(`${chalk.bold('Target:')}      ${delta.target}`);
      console.log(`${chalk.bold('Status:')}      ${delta.status}`);
      console.log(`${chalk.bold('Created:')}     ${delta.createdAt}`);
      console.log(`${chalk.bold('Updated:')}     ${delta.updatedAt}`);
      console.log();
      console.log(chalk.bold('Description:'));
      console.log(chalk.dim(delta.description));
      
      if (delta.rationale) {
        console.log();
        console.log(chalk.bold('Rationale:'));
        console.log(chalk.dim(delta.rationale));
      }
      
      if (delta.impactedAreas && delta.impactedAreas.length > 0) {
        console.log();
        console.log(chalk.bold('Impacted Areas:'));
        delta.impactedAreas.forEach(area => {
          console.log(chalk.dim(`  • ${area}`));
        });
      }
      
      if (delta.before) {
        console.log();
        console.log(chalk.bold('Before State:'));
        console.log(chalk.dim(typeof delta.before === 'object' 
          ? JSON.stringify(delta.before, null, 2) 
          : delta.before));
      }
      
      if (delta.after) {
        console.log();
        console.log(chalk.bold('After State:'));
        console.log(chalk.dim(typeof delta.after === 'object' 
          ? JSON.stringify(delta.after, null, 2) 
          : delta.after));
      }
      
      console.log();
    } catch (error) {
      console.error(chalk.red('✗ Failed to show change'));
      console.error(chalk.dim(error.message));
      process.exit(1);
    }
  });

// Impact analysis
program
  .command('impact <change-id>')
  .description('Show detailed impact analysis for a change')
  .option('--changes <dir>', 'Changes directory', 'storage/changes')
  .option('--full', 'Show full impact report with affected files')
  .option('--format <format>', 'Output format (text|json|markdown)', 'text')
  .action(async (changeId, options) => {
    try {
      const workspaceRoot = process.cwd();
      const deltaManager = new DeltaSpecManager(workspaceRoot);
      const impactAnalyzer = new ImpactAnalyzer(workspaceRoot);

      console.log(chalk.blue('🔍 Analyzing impact...'));
      console.log();

      // Load delta
      const delta = deltaManager.load(changeId);
      if (!delta) {
        console.error(chalk.red(`✗ Change not found: ${changeId}`));
        process.exit(1);
      }

      // Run full impact analysis
      const report = await impactAnalyzer.analyzeImpact(delta);

      if (options.format === 'json') {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      if (options.format === 'markdown') {
        console.log(impactAnalyzer.generateSummary(report));
        return;
      }

      // Text format
      console.log(chalk.bold.blue(`Impact Report: ${report.id}`));
      console.log(chalk.dim('─'.repeat(50)));
      console.log();
      
      console.log(`${chalk.bold('Type:')}        ${report.type}`);
      console.log(`${chalk.bold('Target:')}      ${report.target}`);
      console.log(`${chalk.bold('Analyzed:')}    ${report.timestamp}`);
      console.log();

      // Summary
      console.log(chalk.bold('Summary:'));
      console.log(`  Total Affected: ${report.summary.totalAffected}`);
      console.log();

      // Impact by level
      const levelColors = {
        critical: chalk.red,
        high: chalk.yellow,
        medium: chalk.blue,
        low: chalk.green,
        info: chalk.dim
      };

      console.log(chalk.bold('Impact Levels:'));
      Object.entries(report.summary.byLevel).forEach(([level, count]) => {
        if (count > 0) {
          const color = levelColors[level] || chalk.white;
          console.log(`  ${color(`${level}: ${count}`)}`);
        }
      });
      console.log();

      // Impact by category
      console.log(chalk.bold('Categories:'));
      Object.entries(report.summary.byCategory).forEach(([category, count]) => {
        if (count > 0) {
          console.log(`  ${category}: ${count}`);
        }
      });
      console.log();

      // Show affected items if --full
      if (options.full && report.affectedItems.length > 0) {
        console.log(chalk.bold('Affected Items:'));
        report.affectedItems.slice(0, 20).forEach(item => {
          const levelColor = levelColors[item.level] || chalk.white;
          console.log(`  ${levelColor('●')} ${item.path}`);
          console.log(chalk.dim(`    ${item.reason}`));
        });
        if (report.affectedItems.length > 20) {
          console.log(chalk.dim(`  ... and ${report.affectedItems.length - 20} more`));
        }
        console.log();
      }

      // Risks
      if (report.risks.length > 0) {
        console.log(chalk.bold.red('Risks:'));
        report.risks.forEach(risk => {
          const riskColor = risk.level === 'high' ? chalk.red : chalk.yellow;
          console.log(riskColor(`  ⚠ ${risk.description}`));
          console.log(chalk.dim(`    Mitigation: ${risk.mitigation}`));
        });
        console.log();
      }

      // Recommendations
      if (report.recommendations.length > 0) {
        console.log(chalk.bold('Recommendations:'));
        report.recommendations.forEach(rec => {
          const emoji = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            info: 'ℹ️'
          }[rec.priority] || '•';
          console.log(`  ${emoji} ${rec.message}`);
        });
        console.log();
      }
    } catch (error) {
      console.error(chalk.red('✗ Failed to analyze impact'));
      console.error(chalk.dim(error.message));
      process.exit(1);
    }
  });

// Approve change
program
  .command('approve <change-id>')
  .description('Approve a change proposal')
  .option('--changes <dir>', 'Changes directory', 'storage/changes')
  .action(async (changeId, _options) => {
    try {
      const workspaceRoot = process.cwd();
      const deltaManager = new DeltaSpecManager(workspaceRoot);

      deltaManager.updateStatus(changeId, 'approved');
      
      console.log(chalk.green(`✓ Change ${changeId} approved`));
      console.log(chalk.dim(`Status updated to: approved`));
      console.log();
      console.log(chalk.yellow('Next steps:'));
      console.log(chalk.dim(`1. Implement the change`));
      console.log(chalk.dim(`2. Run: musubi-change apply ${changeId}`));
    } catch (error) {
      console.error(chalk.red('✗ Failed to approve change'));
      console.error(chalk.dim(error.message));
      process.exit(1);
    }
  });

// Reject change
program
  .command('reject <change-id>')
  .description('Reject a change proposal')
  .option('--reason <reason>', 'Rejection reason')
  .option('--changes <dir>', 'Changes directory', 'storage/changes')
  .action(async (changeId, options) => {
    try {
      const workspaceRoot = process.cwd();
      const deltaManager = new DeltaSpecManager(workspaceRoot);

      deltaManager.updateStatus(changeId, 'rejected');
      
      console.log(chalk.red(`✗ Change ${changeId} rejected`));
      if (options.reason) {
        console.log(chalk.dim(`Reason: ${options.reason}`));
      }
      console.log(chalk.dim(`Status updated to: rejected`));
    } catch (error) {
      console.error(chalk.red('✗ Failed to reject change'));
      console.error(chalk.dim(error.message));
      process.exit(1);
    }
  });

// Create delta (new, using DeltaSpecManager)
program
  .command('create')
  .description('Create a new delta specification interactively')
  .option('-i, --id <id>', 'Delta ID (e.g., DELTA-AUTH-001)')
  .option('-t, --type <type>', 'Delta type (ADDED, MODIFIED, REMOVED, RENAMED)')
  .option('--target <target>', 'Target requirement or component')
  .option('-d, --description <description>', 'Change description')
  .option('-r, --rationale <rationale>', 'Reason for change')
  .option('--impact <areas>', 'Comma-separated impacted areas')
  .action(async (options) => {
    try {
      const workspaceRoot = process.cwd();
      const deltaManager = new DeltaSpecManager(workspaceRoot);
      const validator = new DeltaFormatValidator();

      // Validate inputs
      if (!options.id) {
        console.error(chalk.red('✗ Delta ID is required (--id)'));
        process.exit(1);
      }
      if (!options.type) {
        console.error(chalk.red('✗ Delta type is required (--type)'));
        console.log(chalk.dim('Valid types: ADDED, MODIFIED, REMOVED, RENAMED'));
        process.exit(1);
      }
      if (!options.target) {
        console.error(chalk.red('✗ Target is required (--target)'));
        process.exit(1);
      }
      if (!options.description) {
        console.error(chalk.red('✗ Description is required (--description)'));
        process.exit(1);
      }

      const impactedAreas = options.impact 
        ? options.impact.split(',').map(a => a.trim())
        : [];

      const delta = deltaManager.create({
        id: options.id,
        type: options.type.toUpperCase(),
        target: options.target,
        description: options.description,
        rationale: options.rationale || '',
        impactedAreas
      });

      // Validate the created delta
      const validation = validator.validate(delta);

      console.log(chalk.green(`✓ Delta specification created: ${delta.id}`));
      console.log(chalk.dim(`Location: storage/changes/${delta.id}/`));
      
      if (validation.warnings.length > 0) {
        console.log();
        console.log(chalk.yellow('Warnings:'));
        validation.warnings.forEach(w => {
          console.log(chalk.dim(`  • ${w.message}`));
        });
      }
      
      console.log();
      console.log(chalk.yellow('Next steps:'));
      console.log(chalk.dim(`1. Review: musubi-change show ${delta.id}`));
      console.log(chalk.dim(`2. Approve: musubi-change approve ${delta.id}`));
      console.log(chalk.dim(`3. Apply:   musubi-change apply ${delta.id}`));
    } catch (error) {
      console.error(chalk.red('✗ Failed to create delta'));
      console.error(chalk.dim(error.message));
      process.exit(1);
    }
  });

// Validate all changes
program
  .command('validate-all')
  .description('Validate all delta specifications in the changes directory')
  .option('--changes <dir>', 'Changes directory', 'storage/changes')
  .option('--strict', 'Enable strict validation mode')
  .action(async (options) => {
    try {
      const workspaceRoot = process.cwd();
      const path = require('path');
      const changesDir = path.join(workspaceRoot, options.changes);
      const validator = new DeltaFormatValidator({ strict: options.strict });

      console.log(chalk.blue('🔍 Validating all delta specifications...'));
      console.log();

      const result = validator.validateDirectory(changesDir);

      if (result.summary.total === 0) {
        console.log(chalk.dim('No delta specifications found.'));
        return;
      }

      result.results.forEach(r => {
        if (r.valid) {
          console.log(chalk.green(`✓ ${r.id}`));
        } else {
          console.log(chalk.red(`✗ ${r.id}`));
          r.errors.forEach(e => {
            console.log(chalk.dim(`    ${e.message}`));
          });
        }
      });

      console.log();
      console.log(chalk.bold('Summary:'));
      console.log(`  Total:   ${result.summary.total}`);
      console.log(chalk.green(`  Valid:   ${result.summary.valid}`));
      console.log(chalk.red(`  Invalid: ${result.summary.invalid}`));

      if (!result.valid) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('✗ Failed to validate'));
      console.error(chalk.dim(error.message));
      process.exit(1);
    }
  });

// Diff command - show before/after comparison
program
  .command('diff <change-id>')
  .description('Show before/after diff for a change')
  .option('--changes <dir>', 'Changes directory', 'storage/changes')
  .option('--context <lines>', 'Lines of context to show', '3')
  .action(async (changeId, _options) => {
    try {
      const workspaceRoot = process.cwd();
      const deltaManager = new DeltaSpecManager(workspaceRoot);

      const delta = deltaManager.load(changeId);
      if (!delta) {
        console.error(chalk.red(`✗ Change not found: ${changeId}`));
        process.exit(1);
      }

      console.log();
      console.log(chalk.bold.blue(`Diff: ${delta.id}`));
      console.log(chalk.dim('─'.repeat(50)));
      console.log();

      const typeColors = {
        ADDED: chalk.green,
        MODIFIED: chalk.yellow,
        REMOVED: chalk.red,
        RENAMED: chalk.cyan
      };
      const typeColor = typeColors[delta.type] || chalk.white;

      console.log(`${chalk.bold('Type:')} ${typeColor(delta.type)}`);
      console.log(`${chalk.bold('Target:')} ${delta.target}`);
      console.log();

      switch (delta.type) {
        case 'ADDED':
          console.log(chalk.green('+ New Component'));
          console.log(chalk.dim('─'.repeat(40)));
          if (delta.after) {
            if (typeof delta.after === 'object') {
              console.log(chalk.green(JSON.stringify(delta.after, null, 2)));
            } else {
              console.log(chalk.green(delta.after));
            }
          } else {
            console.log(chalk.green(delta.description));
          }
          break;

        case 'REMOVED':
          console.log(chalk.red('- Removed Component'));
          console.log(chalk.dim('─'.repeat(40)));
          if (delta.before) {
            if (typeof delta.before === 'object') {
              console.log(chalk.red(JSON.stringify(delta.before, null, 2)));
            } else {
              console.log(chalk.red(delta.before));
            }
          } else {
            console.log(chalk.red(`Removing: ${delta.target}`));
          }
          break;

        case 'MODIFIED':
          console.log(chalk.yellow('~ Modified Component'));
          console.log(chalk.dim('─'.repeat(40)));
          console.log();
          console.log(chalk.red.bold('BEFORE:'));
          if (delta.before) {
            if (typeof delta.before === 'object') {
              Object.entries(delta.before).forEach(([key, value]) => {
                console.log(chalk.red(`- ${key}: ${JSON.stringify(value)}`));
              });
            } else {
              console.log(chalk.red(`- ${delta.before}`));
            }
          }
          console.log();
          console.log(chalk.green.bold('AFTER:'));
          if (delta.after) {
            if (typeof delta.after === 'object') {
              Object.entries(delta.after).forEach(([key, value]) => {
                console.log(chalk.green(`+ ${key}: ${JSON.stringify(value)}`));
              });
            } else {
              console.log(chalk.green(`+ ${delta.after}`));
            }
          }
          break;

        case 'RENAMED':
          console.log(chalk.cyan('⇒ Renamed Component'));
          console.log(chalk.dim('─'.repeat(40)));
          console.log(chalk.red(`- ${delta.before || delta.target}`));
          console.log(chalk.green(`+ ${delta.after || 'new name'}`));
          break;

        default:
          console.log(chalk.dim('No diff information available.'));
      }

      console.log();
      console.log(chalk.bold('Description:'));
      console.log(chalk.dim(delta.description));
      
      if (delta.rationale) {
        console.log();
        console.log(chalk.bold('Rationale:'));
        console.log(chalk.dim(delta.rationale));
      }

      console.log();
    } catch (error) {
      console.error(chalk.red('✗ Failed to show diff'));
      console.error(chalk.dim(error.message));
      process.exit(1);
    }
  });

// Status command - show workflow status summary
program
  .command('status')
  .description('Show status summary of all changes')
  .option('--changes <dir>', 'Changes directory', 'storage/changes')
  .action(async (_options) => {
    try {
      const workspaceRoot = process.cwd();
      const deltaManager = new DeltaSpecManager(workspaceRoot);

      const deltas = deltaManager.list();

      if (deltas.length === 0) {
        console.log(chalk.dim('No delta specifications found.'));
        return;
      }

      const statusCounts = {
        proposed: 0,
        approved: 0,
        rejected: 0,
        implemented: 0,
        archived: 0
      };

      const typeCounts = {
        ADDED: 0,
        MODIFIED: 0,
        REMOVED: 0,
        RENAMED: 0
      };

      deltas.forEach(d => {
        statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
        typeCounts[d.type] = (typeCounts[d.type] || 0) + 1;
      });

      console.log();
      console.log(chalk.bold.blue('Change Status Summary'));
      console.log(chalk.dim('─'.repeat(40)));
      console.log();

      console.log(chalk.bold('By Status:'));
      console.log(`  ${chalk.yellow('●')} Proposed:    ${statusCounts.proposed}`);
      console.log(`  ${chalk.blue('●')} Approved:    ${statusCounts.approved}`);
      console.log(`  ${chalk.red('●')} Rejected:    ${statusCounts.rejected}`);
      console.log(`  ${chalk.cyan('●')} Implemented: ${statusCounts.implemented}`);
      console.log(`  ${chalk.green('●')} Archived:    ${statusCounts.archived}`);
      console.log();

      console.log(chalk.bold('By Type:'));
      console.log(`  ${chalk.green('+')} ADDED:    ${typeCounts.ADDED}`);
      console.log(`  ${chalk.yellow('~')} MODIFIED: ${typeCounts.MODIFIED}`);
      console.log(`  ${chalk.red('-')} REMOVED:  ${typeCounts.REMOVED}`);
      console.log(`  ${chalk.cyan('⇒')} RENAMED:  ${typeCounts.RENAMED}`);
      console.log();

      console.log(`${chalk.bold('Total:')} ${deltas.length} delta(s)`);
      console.log();

      // Show pending items
      const pending = deltas.filter(d => 
        d.status === 'proposed' || d.status === 'approved'
      );

      if (pending.length > 0) {
        console.log(chalk.bold('Pending Actions:'));
        pending.forEach(d => {
          const statusColor = d.status === 'proposed' ? chalk.yellow : chalk.blue;
          console.log(`  ${statusColor('●')} ${d.id} (${d.status})`);
        });
        console.log();
      }
    } catch (error) {
      console.error(chalk.red('✗ Failed to get status'));
      console.error(chalk.dim(error.message));
      process.exit(1);
    }
  });

program.parse();
