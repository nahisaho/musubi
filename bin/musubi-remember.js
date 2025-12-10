#!/usr/bin/env node

/**
 * MUSUBI Remember - Agent Memory Management CLI
 *
 * Manages persistent agent memory for long-running conversations:
 * - Store important context and decisions
 * - Condense conversation history
 * - Retrieve relevant memories
 *
 * Usage:
 *   musubi-remember add "key insight"     # Add a memory entry
 *   musubi-remember list                  # List all memories
 *   musubi-remember condense              # Condense memory bank
 *   musubi-remember search <query>        # Search memories
 *   musubi-remember clear                 # Clear all memories
 */

const { Command } = require('commander');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

// Import memory management modules (for future use)
let _AgentMemoryManager, _MemoryCondenser;
try {
  _AgentMemoryManager = require('../src/managers/agent-memory-manager');
  _MemoryCondenser = require('../src/managers/memory-condenser');
} catch {
  // Modules may not exist yet
}

const program = new Command();

program
  .name('musubi-remember')
  .description('Agent Memory Management - Persist and recall context across sessions')
  .version('0.7.0');

// Memory storage location
const MEMORY_DIR = path.join(process.cwd(), 'steering', 'memories');
const MEMORY_FILE = path.join(MEMORY_DIR, 'agent-memories.json');

/**
 * Load memories from file
 */
async function loadMemories() {
  try {
    await fs.ensureDir(MEMORY_DIR);
    if (await fs.pathExists(MEMORY_FILE)) {
      return await fs.readJson(MEMORY_FILE);
    }
  } catch {
    // Ignore errors
  }
  return { entries: [], condensed: [], lastCondensed: null };
}

/**
 * Save memories to file
 */
async function saveMemories(memories) {
  await fs.ensureDir(MEMORY_DIR);
  await fs.writeJson(MEMORY_FILE, memories, { spaces: 2 });
}

// Add memory command
program
  .command('add <memory>')
  .description('Add a new memory entry')
  .option('-t, --type <type>', 'Memory type: decision, insight, context, todo', 'context')
  .option('-p, --priority <priority>', 'Priority: low, medium, high, critical', 'medium')
  .action(async (memory, options) => {
    try {
      const memories = await loadMemories();
      
      const entry = {
        id: `mem_${Date.now()}`,
        content: memory,
        type: options.type,
        priority: options.priority,
        timestamp: new Date().toISOString(),
        session: process.env.SESSION_ID || 'cli'
      };
      
      memories.entries.push(entry);
      await saveMemories(memories);
      
      console.log(chalk.green('✓ Memory added:'), memory);
      console.log(chalk.dim(`  ID: ${entry.id}`));
      console.log(chalk.dim(`  Type: ${entry.type} | Priority: ${entry.priority}`));
    } catch (error) {
      console.error(chalk.red('✗ Failed to add memory:'), error.message);
      process.exit(1);
    }
  });

// List memories command
program
  .command('list')
  .description('List all stored memories')
  .option('-t, --type <type>', 'Filter by type')
  .option('-n, --limit <number>', 'Limit number of entries', '20')
  .option('-f, --format <format>', 'Output format: console, json, markdown', 'console')
  .action(async options => {
    try {
      const memories = await loadMemories();
      let entries = memories.entries;
      
      // Filter by type
      if (options.type) {
        entries = entries.filter(e => e.type === options.type);
      }
      
      // Sort by timestamp (newest first)
      entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Limit entries
      const limit = parseInt(options.limit) || 20;
      entries = entries.slice(0, limit);
      
      if (options.format === 'json') {
        console.log(JSON.stringify(entries, null, 2));
        return;
      }
      
      if (options.format === 'markdown') {
        console.log('# Agent Memories\n');
        entries.forEach(entry => {
          console.log(`## ${entry.type.toUpperCase()} (${entry.priority})`);
          console.log(`> ${entry.content}\n`);
          console.log(`_ID: ${entry.id} | ${entry.timestamp}_\n`);
        });
        return;
      }
      
      // Console format
      console.log(chalk.bold('\n📝 Agent Memories\n'));
      console.log(chalk.bold('━'.repeat(70)));
      
      if (entries.length === 0) {
        console.log(chalk.dim('\n  No memories found.\n'));
        return;
      }
      
      entries.forEach((entry, _i) => {
        const typeColors = {
          decision: chalk.blue,
          insight: chalk.green,
          context: chalk.cyan,
          todo: chalk.yellow
        };
        const color = typeColors[entry.type] || chalk.white;
        
        const priorityIcons = {
          critical: '🔴',
          high: '🟠',
          medium: '🟡',
          low: '🟢'
        };
        const icon = priorityIcons[entry.priority] || '⚪';
        
        console.log(`\n${icon} ${color(`[${entry.type.toUpperCase()}]`)} ${entry.content}`);
        console.log(chalk.dim(`   ID: ${entry.id} | ${new Date(entry.timestamp).toLocaleString()}`));
      });
      
      console.log('\n' + chalk.bold('━'.repeat(70)));
      console.log(chalk.dim(`\nTotal: ${memories.entries.length} memories | Showing: ${entries.length}`));
      console.log();
    } catch (error) {
      console.error(chalk.red('✗ Failed to list memories:'), error.message);
      process.exit(1);
    }
  });

// Condense memories command
program
  .command('condense')
  .description('Condense and summarize memory bank')
  .option('--dry-run', 'Show what would be condensed without saving')
  .action(async options => {
    try {
      const memories = await loadMemories();
      
      if (memories.entries.length < 10) {
        console.log(chalk.yellow('⚠ Not enough memories to condense (need at least 10)'));
        console.log(chalk.dim(`  Current count: ${memories.entries.length}`));
        return;
      }
      
      console.log(chalk.dim('🔄 Condensing memory bank...\n'));
      
      // Group entries by type
      const grouped = {};
      memories.entries.forEach(entry => {
        if (!grouped[entry.type]) grouped[entry.type] = [];
        grouped[entry.type].push(entry);
      });
      
      // Create condensed summaries
      const condensedEntries = [];
      for (const [type, entries] of Object.entries(grouped)) {
        if (entries.length >= 3) {
          const summary = {
            id: `condensed_${type}_${Date.now()}`,
            type: 'condensed',
            originalType: type,
            content: `Summary of ${entries.length} ${type} entries:\n` +
              entries.slice(0, 5).map(e => `• ${e.content}`).join('\n') +
              (entries.length > 5 ? `\n• ... and ${entries.length - 5} more` : ''),
            count: entries.length,
            timestamp: new Date().toISOString(),
            originalIds: entries.map(e => e.id)
          };
          condensedEntries.push(summary);
        }
      }
      
      console.log(chalk.bold('Condensation Summary:'));
      console.log(chalk.dim('━'.repeat(50)));
      condensedEntries.forEach(c => {
        console.log(`  ${c.originalType}: ${c.count} entries → 1 summary`);
      });
      
      if (options.dryRun) {
        console.log(chalk.yellow('\n[DRY RUN] No changes saved.'));
        return;
      }
      
      // Keep only high-priority individual entries
      const keepEntries = memories.entries.filter(e => 
        e.priority === 'critical' || e.priority === 'high'
      );
      
      memories.condensed.push(...condensedEntries);
      memories.entries = keepEntries;
      memories.lastCondensed = new Date().toISOString();
      
      await saveMemories(memories);
      
      console.log(chalk.green('\n✓ Memory bank condensed'));
      console.log(chalk.dim(`  Kept: ${keepEntries.length} high-priority entries`));
      console.log(chalk.dim(`  Created: ${condensedEntries.length} summaries`));
    } catch (error) {
      console.error(chalk.red('✗ Failed to condense memories:'), error.message);
      process.exit(1);
    }
  });

// Search memories command
program
  .command('search <query>')
  .description('Search memories by keyword')
  .option('-f, --format <format>', 'Output format: console, json', 'console')
  .action(async (query, options) => {
    try {
      const memories = await loadMemories();
      
      const queryLower = query.toLowerCase();
      const results = memories.entries.filter(entry => 
        entry.content.toLowerCase().includes(queryLower) ||
        entry.type.toLowerCase().includes(queryLower)
      );
      
      // Also search condensed
      const condensedResults = memories.condensed.filter(entry =>
        entry.content.toLowerCase().includes(queryLower)
      );
      
      if (options.format === 'json') {
        console.log(JSON.stringify({ entries: results, condensed: condensedResults }, null, 2));
        return;
      }
      
      console.log(chalk.bold(`\n🔍 Search Results for "${query}"\n`));
      
      if (results.length === 0 && condensedResults.length === 0) {
        console.log(chalk.dim('  No matching memories found.\n'));
        return;
      }
      
      results.forEach(entry => {
        console.log(chalk.cyan(`[${entry.type}]`), entry.content);
        console.log(chalk.dim(`  ${entry.id} | ${entry.timestamp}\n`));
      });
      
      if (condensedResults.length > 0) {
        console.log(chalk.bold('\nFrom Condensed Summaries:'));
        condensedResults.forEach(entry => {
          console.log(chalk.yellow(`[${entry.originalType}]`), entry.content.split('\n')[0]);
        });
      }
      
      console.log(chalk.dim(`\nFound: ${results.length} entries, ${condensedResults.length} condensed`));
    } catch (error) {
      console.error(chalk.red('✗ Search failed:'), error.message);
      process.exit(1);
    }
  });

// Clear memories command
program
  .command('clear')
  .description('Clear all stored memories')
  .option('--force', 'Skip confirmation')
  .option('--keep-condensed', 'Keep condensed summaries')
  .action(async options => {
    try {
      if (!options.force) {
        console.log(chalk.yellow('⚠ This will delete all agent memories.'));
        console.log(chalk.dim('  Use --force to confirm, or --keep-condensed to preserve summaries.\n'));
        return;
      }
      
      const memories = await loadMemories();
      const oldCount = memories.entries.length;
      
      memories.entries = [];
      if (!options.keepCondensed) {
        memories.condensed = [];
      }
      
      await saveMemories(memories);
      
      console.log(chalk.green('✓ Memories cleared'));
      console.log(chalk.dim(`  Deleted: ${oldCount} entries`));
      if (options.keepCondensed) {
        console.log(chalk.dim(`  Kept: ${memories.condensed.length} condensed summaries`));
      }
    } catch (error) {
      console.error(chalk.red('✗ Failed to clear memories:'), error.message);
      process.exit(1);
    }
  });

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
