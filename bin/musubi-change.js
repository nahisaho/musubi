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
 */

const { Command } = require('commander');
const chalk = require('chalk');
const ChangeManager = require('../src/managers/change.js');

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
        template: options.template
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
        force: options.force
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
  .action(async (changeId, options) => {
    try {
      const workspaceRoot = process.cwd();
      const manager = new ChangeManager(workspaceRoot);

      console.log(chalk.blue('📦 Archiving change...'));

      const result = await manager.archiveChange(changeId, {
        changesDir: options.changes,
        specsDir: options.specs
      });

      console.log(chalk.green('✓ Change archived successfully'));
      console.log(chalk.dim(`Source: ${result.source}`));
      console.log(chalk.dim(`Archive: ${result.archive}`));
      console.log();
      console.log(chalk.yellow('Delta merged to canonical specification'));
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
  .action(async (options) => {
    try {
      const workspaceRoot = process.cwd();
      const manager = new ChangeManager(workspaceRoot);

      const changes = await manager.listChanges({
        changesDir: options.changes,
        status: options.status
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
        const statusColor = {
          pending: chalk.yellow,
          applied: chalk.blue,
          archived: chalk.green
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
        verbose: options.verbose
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

program.parse();
