#!/usr/bin/env node

/**
 * @fileoverview MUSUBI Checkpoint CLI
 * @description Manage development checkpoints
 */

'use strict';

const { Command } = require('commander');
const chalk = require('chalk');
const _path = require('path');
const { CheckpointManager, CheckpointState } = require('../src/managers/checkpoint-manager');

const program = new Command();

// Initialize checkpoint manager
function getManager(options = {}) {
  return new CheckpointManager({
    workspaceDir: options.workspace || process.cwd(),
    maxCheckpoints: options.maxCheckpoints || 50,
  });
}

program
  .name('musubi-checkpoint')
  .description('Manage development state checkpoints')
  .version('1.0.0');

// Create checkpoint
program
  .command('create')
  .alias('save')
  .description('Create a new checkpoint')
  .option('-n, --name <name>', 'Checkpoint name')
  .option('-d, --description <description>', 'Checkpoint description')
  .option('-t, --tags <tags>', 'Comma-separated tags')
  .option('-w, --workspace <dir>', 'Workspace directory')
  .action(async (options) => {
    try {
      const manager = getManager(options);
      await manager.initialize();

      const checkpoint = await manager.create({
        name: options.name,
        description: options.description,
        tags: options.tags ? options.tags.split(',').map(t => t.trim()) : [],
      });

      console.log(chalk.green('✓ Checkpoint created successfully'));
      console.log();
      console.log(chalk.bold('ID:'), checkpoint.id);
      console.log(chalk.bold('Name:'), checkpoint.name);
      console.log(chalk.bold('Files:'), checkpoint.stats.filesCount);
      console.log(chalk.bold('Size:'), formatSize(checkpoint.stats.totalSize));
      console.log(chalk.bold('Timestamp:'), new Date(checkpoint.timestamp).toLocaleString());

      manager.stopAutoCheckpoint();
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// List checkpoints
program
  .command('list')
  .alias('ls')
  .description('List all checkpoints')
  .option('-t, --tags <tags>', 'Filter by tags (comma-separated)')
  .option('-s, --state <state>', 'Filter by state')
  .option('-l, --limit <n>', 'Maximum results', parseInt)
  .option('-w, --workspace <dir>', 'Workspace directory')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const manager = getManager(options);
      await manager.initialize();

      const checkpoints = manager.list({
        tags: options.tags ? options.tags.split(',').map(t => t.trim()) : undefined,
        state: options.state,
        limit: options.limit,
      });

      if (options.json) {
        console.log(JSON.stringify(checkpoints, null, 2));
        manager.stopAutoCheckpoint();
        return;
      }

      if (checkpoints.length === 0) {
        console.log(chalk.yellow('No checkpoints found'));
        manager.stopAutoCheckpoint();
        return;
      }

      console.log(chalk.bold(`Checkpoints (${checkpoints.length}):`));
      console.log();

      for (const cp of checkpoints) {
        const stateColor = getStateColor(cp.state);
        const current = cp.id === manager.currentCheckpoint ? chalk.cyan(' [current]') : '';

        console.log(`${chalk.bold(cp.id)}${current}`);
        console.log(`  Name: ${cp.name}`);
        console.log(`  State: ${stateColor(cp.state)}`);
        console.log(`  Files: ${cp.stats.filesCount} | Size: ${formatSize(cp.stats.totalSize)}`);
        console.log(`  Time: ${new Date(cp.timestamp).toLocaleString()}`);
        if (cp.tags.length > 0) {
          console.log(`  Tags: ${cp.tags.map(t => chalk.blue(`#${t}`)).join(' ')}`);
        }
        console.log();
      }

      manager.stopAutoCheckpoint();
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Show checkpoint details
program
  .command('show <id>')
  .description('Show checkpoint details')
  .option('-w, --workspace <dir>', 'Workspace directory')
  .option('--json', 'Output as JSON')
  .action(async (id, options) => {
    try {
      const manager = getManager(options);
      await manager.initialize();

      const checkpoint = manager.get(id);
      if (!checkpoint) {
        console.error(chalk.red('Checkpoint not found:'), id);
        process.exit(1);
      }

      if (options.json) {
        console.log(JSON.stringify(checkpoint, null, 2));
        manager.stopAutoCheckpoint();
        return;
      }

      console.log(chalk.bold('Checkpoint Details:'));
      console.log();
      console.log(chalk.bold('ID:'), checkpoint.id);
      console.log(chalk.bold('Name:'), checkpoint.name);
      console.log(chalk.bold('Description:'), checkpoint.description || '(none)');
      console.log(chalk.bold('State:'), getStateColor(checkpoint.state)(checkpoint.state));
      console.log(chalk.bold('Files:'), checkpoint.stats.filesCount);
      console.log(chalk.bold('Size:'), formatSize(checkpoint.stats.totalSize));
      console.log(chalk.bold('Created:'), new Date(checkpoint.timestamp).toLocaleString());
      console.log(chalk.bold('Tags:'), checkpoint.tags.length > 0
        ? checkpoint.tags.map(t => chalk.blue(`#${t}`)).join(' ')
        : '(none)');

      if (Object.keys(checkpoint.context).length > 0) {
        console.log(chalk.bold('Context:'));
        console.log(JSON.stringify(checkpoint.context, null, 2));
      }

      manager.stopAutoCheckpoint();
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Restore checkpoint
program
  .command('restore <id>')
  .description('Restore a checkpoint')
  .option('--no-backup', 'Skip creating backup before restore')
  .option('-w, --workspace <dir>', 'Workspace directory')
  .action(async (id, options) => {
    try {
      const manager = getManager(options);
      await manager.initialize();

      console.log(chalk.yellow('⚠ Restoring checkpoint will overwrite current files'));

      const checkpoint = await manager.restore(id, {
        backup: options.backup !== false,
      });

      console.log(chalk.green('✓ Checkpoint restored successfully'));
      console.log();
      console.log(chalk.bold('ID:'), checkpoint.id);
      console.log(chalk.bold('Name:'), checkpoint.name);
      console.log(chalk.bold('Files restored:'), checkpoint.stats.filesCount);

      if (options.backup !== false) {
        console.log(chalk.cyan('ℹ Backup checkpoint created before restore'));
      }

      manager.stopAutoCheckpoint();
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Delete checkpoint
program
  .command('delete <id>')
  .alias('rm')
  .description('Delete a checkpoint')
  .option('-w, --workspace <dir>', 'Workspace directory')
  .action(async (id, options) => {
    try {
      const manager = getManager(options);
      await manager.initialize();

      const deleted = await manager.delete(id);
      if (deleted) {
        console.log(chalk.green('✓ Checkpoint deleted:'), id);
      } else {
        console.error(chalk.red('Checkpoint not found:'), id);
        process.exit(1);
      }

      manager.stopAutoCheckpoint();
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Archive checkpoint
program
  .command('archive <id>')
  .description('Archive a checkpoint')
  .option('-w, --workspace <dir>', 'Workspace directory')
  .action(async (id, options) => {
    try {
      const manager = getManager(options);
      await manager.initialize();

      const checkpoint = await manager.archive(id);
      console.log(chalk.green('✓ Checkpoint archived:'), checkpoint.name);

      manager.stopAutoCheckpoint();
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Compare checkpoints
program
  .command('compare <id1> <id2>')
  .alias('diff')
  .description('Compare two checkpoints')
  .option('-w, --workspace <dir>', 'Workspace directory')
  .option('--json', 'Output as JSON')
  .action(async (id1, id2, options) => {
    try {
      const manager = getManager(options);
      await manager.initialize();

      const comparison = await manager.compare(id1, id2);

      if (options.json) {
        console.log(JSON.stringify(comparison, null, 2));
        manager.stopAutoCheckpoint();
        return;
      }

      console.log(chalk.bold('Checkpoint Comparison:'));
      console.log();
      console.log(chalk.bold('Checkpoint 1:'), comparison.checkpoint1.name);
      console.log(`  ID: ${comparison.checkpoint1.id}`);
      console.log(`  Time: ${new Date(comparison.checkpoint1.timestamp).toLocaleString()}`);
      console.log();
      console.log(chalk.bold('Checkpoint 2:'), comparison.checkpoint2.name);
      console.log(`  ID: ${comparison.checkpoint2.id}`);
      console.log(`  Time: ${new Date(comparison.checkpoint2.timestamp).toLocaleString()}`);
      console.log();

      console.log(chalk.bold('Changes:'));
      console.log(`  ${chalk.green('Added:')} ${comparison.changes.added} files`);
      console.log(`  ${chalk.red('Removed:')} ${comparison.changes.removed} files`);
      console.log(`  ${chalk.yellow('Modified:')} ${comparison.changes.modified} files`);
      console.log(`  ${chalk.gray('Unchanged:')} ${comparison.changes.unchanged} files`);

      if (comparison.files.added.length > 0) {
        console.log();
        console.log(chalk.green('Added files:'));
        comparison.files.added.forEach(f => console.log(`  + ${f}`));
      }

      if (comparison.files.removed.length > 0) {
        console.log();
        console.log(chalk.red('Removed files:'));
        comparison.files.removed.forEach(f => console.log(`  - ${f}`));
      }

      if (comparison.files.modified.length > 0) {
        console.log();
        console.log(chalk.yellow('Modified files:'));
        comparison.files.modified.forEach(f => console.log(`  ~ ${f}`));
      }

      manager.stopAutoCheckpoint();
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Tag checkpoint
program
  .command('tag <id> <tags...>')
  .description('Add tags to a checkpoint')
  .option('-w, --workspace <dir>', 'Workspace directory')
  .action(async (id, tags, options) => {
    try {
      const manager = getManager(options);
      await manager.initialize();

      const checkpoint = await manager.addTags(id, tags);
      console.log(chalk.green('✓ Tags added to checkpoint:'), checkpoint.name);
      console.log(chalk.bold('Tags:'), checkpoint.tags.map(t => chalk.blue(`#${t}`)).join(' '));

      manager.stopAutoCheckpoint();
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Current checkpoint
program
  .command('current')
  .description('Show current checkpoint')
  .option('-w, --workspace <dir>', 'Workspace directory')
  .action(async (options) => {
    try {
      const manager = getManager(options);
      await manager.initialize();

      const current = manager.getCurrent();
      if (!current) {
        console.log(chalk.yellow('No current checkpoint'));
        manager.stopAutoCheckpoint();
        return;
      }

      console.log(chalk.bold('Current Checkpoint:'));
      console.log(chalk.bold('ID:'), current.id);
      console.log(chalk.bold('Name:'), current.name);
      console.log(chalk.bold('Created:'), new Date(current.timestamp).toLocaleString());

      manager.stopAutoCheckpoint();
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Helper functions
function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(2)} ${units[i]}`;
}

function getStateColor(state) {
  switch (state) {
    case CheckpointState.CREATED:
      return chalk.green;
    case CheckpointState.ACTIVE:
      return chalk.cyan;
    case CheckpointState.RESTORED:
      return chalk.yellow;
    case CheckpointState.ARCHIVED:
      return chalk.gray;
    default:
      return chalk.white;
  }
}

// Parse and execute
program.parse(process.argv);

// Show help if no command
if (process.argv.length <= 2) {
  program.help();
}
