#!/usr/bin/env node

/**
 * MUSUBI Share Script
 *
 * Share and merge project memories across team members and AI platforms:
 * - Export project memories to shareable format
 * - Import memories from other team members
 * - Merge memories with conflict resolution
 * - Sync across different AI platforms (Claude Code, Copilot, Cursor, etc.)
 *
 * Usage:
 *   musubi-share export [--output <file>]
 *   musubi-share import <file> [--strategy <strategy>]
 *   musubi-share sync [--platform <platform>]
 *   musubi-share status
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { glob } = require('glob');
const yaml = require('js-yaml');
const { program } = require('commander');

// Configuration
const CONFIG = {
  steeringDir: 'steering',
  memoriesDir: 'steering/memories',
  agentDirs: ['.claude', '.github/copilot', '.cursor', '.windsurf'],
  exportFormats: ['json', 'yaml'],
  mergeStrategies: ['ours', 'theirs', 'merge', 'interactive'],
};

/**
 * Export project memories to shareable format
 */
async function exportMemories(options = {}) {
  console.log(chalk.blue.bold('\n📤 MUSUBI Memory Export\n'));

  const outputFile = options.output || `musubi-memories-${Date.now()}.json`;
  const format = path.extname(outputFile).slice(1) || 'json';

  if (!CONFIG.exportFormats.includes(format)) {
    console.error(chalk.red(`❌ Unsupported format: ${format}`));
    console.log(chalk.gray(`Supported formats: ${CONFIG.exportFormats.join(', ')}`));
    process.exit(1);
  }

  console.log(chalk.cyan('📋 Step 1: Collecting project memories...\n'));

  const memories = {
    metadata: {
      exportedAt: new Date().toISOString(),
      exportedBy: process.env.USER || 'unknown',
      musubiVersion: require('../package.json').version,
    },
    project: {},
    memories: {},
    agents: {},
  };

  // Load project configuration
  if (await fs.pathExists('steering/project.yml')) {
    const projectYml = await fs.readFile('steering/project.yml', 'utf8');
    memories.project = yaml.load(projectYml);
    console.log(chalk.gray('  ✓ Loaded project.yml'));
  }

  // Load steering documents
  const steeringFiles = ['product.md', 'structure.md', 'tech.md'];
  for (const file of steeringFiles) {
    const filePath = `steering/${file}`;
    if (await fs.pathExists(filePath)) {
      memories.project[file] = await fs.readFile(filePath, 'utf8');
      console.log(chalk.gray(`  ✓ Loaded ${file}`));
    }
  }

  // Load memory files
  if (await fs.pathExists(CONFIG.memoriesDir)) {
    const memoryFiles = await glob('*.md', { cwd: CONFIG.memoriesDir });
    const memoryArray = Array.isArray(memoryFiles) ? memoryFiles : [];
    for (const file of memoryArray) {
      const filePath = path.join(CONFIG.memoriesDir, file);
      memories.memories[file] = await fs.readFile(filePath, 'utf8');
      console.log(chalk.gray(`  ✓ Loaded memory: ${file}`));
    }
  }

  // Load agent configurations
  for (const agentDir of CONFIG.agentDirs) {
    if (await fs.pathExists(agentDir)) {
      const agentName = path.basename(agentDir);
      memories.agents[agentName] = {};

      const agentFiles = await glob('**/*.md', { cwd: agentDir });
      const agentArray = Array.isArray(agentFiles) ? agentFiles : [];
      for (const file of agentArray) {
        const filePath = path.join(agentDir, file);
        memories.agents[agentName][file] = await fs.readFile(filePath, 'utf8');
      }
      console.log(chalk.gray(`  ✓ Loaded agent config: ${agentName} (${agentArray.length} files)`));
    }
  }

  console.log(chalk.cyan('\n📋 Step 2: Writing export file...\n'));

  // Write export file
  let exportContent;
  if (format === 'json') {
    exportContent = JSON.stringify(memories, null, 2);
  } else if (format === 'yaml') {
    exportContent = yaml.dump(memories, { indent: 2, lineWidth: 100 });
  }

  await fs.writeFile(outputFile, exportContent);

  const stats = await fs.stat(outputFile);
  const fileSizeKB = (stats.size / 1024).toFixed(2);

  console.log(chalk.green.bold('✅ Export complete!\n'));
  console.log(chalk.white('Export Summary:'));
  console.log(chalk.gray(`  File: ${outputFile}`));
  console.log(chalk.gray(`  Format: ${format}`));
  console.log(chalk.gray(`  Size: ${fileSizeKB} KB`));
  console.log(chalk.gray(`  Memories: ${Object.keys(memories.memories).length} files`));
  console.log(chalk.gray(`  Agents: ${Object.keys(memories.agents).length} platforms`));
  console.log(chalk.white('\nShare this file with your team:\n'));
  console.log(chalk.cyan(`  scp ${outputFile} teammate@host:/path/`));
  console.log(chalk.cyan('  # or commit to shared repository\n'));
}

/**
 * Import and merge memories from file
 */
async function importMemories(importFile, options = {}) {
  console.log(chalk.blue.bold('\n📥 MUSUBI Memory Import\n'));

  if (!(await fs.pathExists(importFile))) {
    console.error(chalk.red(`❌ Import file not found: ${importFile}`));
    process.exit(1);
  }

  const strategy = options.strategy || 'interactive';
  if (!CONFIG.mergeStrategies.includes(strategy)) {
    console.error(chalk.red(`❌ Invalid merge strategy: ${strategy}`));
    console.log(chalk.gray(`Supported strategies: ${CONFIG.mergeStrategies.join(', ')}`));
    process.exit(1);
  }

  console.log(chalk.cyan('📋 Step 1: Loading import file...\n'));

  const importContent = await fs.readFile(importFile, 'utf8');
  const format = path.extname(importFile).slice(1);

  let importedMemories;
  try {
    if (format === 'json') {
      importedMemories = JSON.parse(importContent);
    } else if (format === 'yaml' || format === 'yml') {
      importedMemories = yaml.load(importContent);
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }
  } catch (error) {
    console.error(chalk.red(`❌ Failed to parse import file: ${error.message}`));
    process.exit(1);
  }

  console.log(chalk.gray(`  Exported by: ${importedMemories.metadata.exportedBy}`));
  console.log(chalk.gray(`  Exported at: ${importedMemories.metadata.exportedAt}`));
  console.log(chalk.gray(`  MUSUBI version: ${importedMemories.metadata.musubiVersion}`));

  console.log(chalk.cyan('\n📋 Step 2: Detecting conflicts...\n'));

  const conflicts = [];
  const currentVersion = require('../package.json').version;

  // Check version compatibility
  if (importedMemories.metadata.musubiVersion !== currentVersion) {
    console.log(
      chalk.yellow(
        `  ⚠️  Version mismatch: ${importedMemories.metadata.musubiVersion} → ${currentVersion}`
      )
    );
  }

  // Detect memory conflicts
  for (const [file, content] of Object.entries(importedMemories.memories)) {
    const localPath = path.join(CONFIG.memoriesDir, file);
    if (await fs.pathExists(localPath)) {
      const localContent = await fs.readFile(localPath, 'utf8');
      if (localContent !== content) {
        conflicts.push({
          type: 'memory',
          file,
          localPath,
          importedContent: content,
          localContent,
        });
        console.log(chalk.yellow(`  ⚠️  Conflict: ${file}`));
      }
    }
  }

  if (conflicts.length === 0) {
    console.log(chalk.green('  ✓ No conflicts detected'));
  } else {
    console.log(chalk.yellow(`\n  Found ${conflicts.length} conflict(s)`));
  }

  console.log(chalk.cyan('\n📋 Step 3: Merging memories...\n'));

  let mergeCount = 0;

  // Apply merge strategy
  if (strategy === 'ours') {
    console.log(chalk.gray('  Strategy: Keep local changes (ours)'));
    console.log(chalk.gray('  Skipping conflicted files...\n'));
  } else if (strategy === 'theirs') {
    console.log(chalk.gray('  Strategy: Accept imported changes (theirs)'));

    for (const conflict of conflicts) {
      await fs.writeFile(conflict.localPath, conflict.importedContent);
      console.log(chalk.gray(`  ✓ Updated: ${conflict.file}`));
      mergeCount++;
    }
  } else if (strategy === 'merge') {
    console.log(chalk.gray('  Strategy: Auto-merge with markers'));

    for (const conflict of conflicts) {
      const mergedContent = `${conflict.localContent}\n\n<<<<<<< LOCAL\n${conflict.localContent}\n=======\n${conflict.importedContent}\n>>>>>>> IMPORTED\n`;
      await fs.writeFile(conflict.localPath, mergedContent);
      console.log(chalk.gray(`  ✓ Merged with markers: ${conflict.file}`));
      mergeCount++;
    }
  } else if (strategy === 'interactive') {
    console.log(chalk.gray('  Strategy: Interactive resolution'));
    console.log(chalk.yellow('\n  ⚠️  Interactive mode requires manual review'));
    console.log(chalk.gray('  Re-run with --strategy=theirs to auto-accept\n'));
  }

  // Import new memories (no conflicts)
  for (const [file, content] of Object.entries(importedMemories.memories)) {
    const localPath = path.join(CONFIG.memoriesDir, file);
    if (!(await fs.pathExists(localPath))) {
      await fs.ensureDir(CONFIG.memoriesDir);
      await fs.writeFile(localPath, content);
      console.log(chalk.gray(`  ✓ Added new memory: ${file}`));
      mergeCount++;
    }
  }

  console.log(chalk.green.bold('\n✅ Import complete!\n'));
  console.log(chalk.white('Import Summary:'));
  console.log(chalk.gray(`  Strategy: ${strategy}`));
  console.log(chalk.gray(`  Conflicts: ${conflicts.length}`));
  console.log(chalk.gray(`  Merged: ${mergeCount} files`));

  if (conflicts.length > 0 && strategy === 'interactive') {
    console.log(chalk.yellow('\nNext steps:'));
    console.log(chalk.gray('  1. Review conflicted files manually'));
    console.log(chalk.gray('  2. Re-run with --strategy=theirs to accept all'));
    console.log(chalk.gray('  3. Or edit files individually\n'));
  }
}

/**
 * Sync memories across AI platforms
 */
async function syncPlatforms(options = {}) {
  console.log(chalk.blue.bold('\n🔄 MUSUBI Platform Sync\n'));

  const targetPlatform = options.platform;
  const availablePlatforms = [
    'claude-code',
    'github-copilot',
    'cursor',
    'windsurf',
    'codex',
    'qwen-code',
    'gemini-cli',
  ];

  if (targetPlatform && !availablePlatforms.includes(targetPlatform)) {
    console.error(chalk.red(`❌ Unknown platform: ${targetPlatform}`));
    console.log(chalk.gray(`Available: ${availablePlatforms.join(', ')}`));
    process.exit(1);
  }

  console.log(chalk.cyan('📋 Step 1: Detecting installed platforms...\n'));

  const installedPlatforms = [];
  const platformDirs = {
    'claude-code': '.claude',
    'github-copilot': '.github/copilot',
    cursor: '.cursor',
    windsurf: '.windsurf',
  };

  for (const [platform, dir] of Object.entries(platformDirs)) {
    if (await fs.pathExists(dir)) {
      installedPlatforms.push(platform);
      console.log(chalk.gray(`  ✓ Found: ${platform} (${dir})`));
    }
  }

  if (installedPlatforms.length === 0) {
    console.log(chalk.yellow('  ⚠️  No AI platforms detected'));
    console.log(chalk.gray('  Run musubi-init to set up an AI platform\n'));
    return;
  }

  console.log(chalk.cyan('\n📋 Step 2: Syncing shared memories...\n'));

  // Sync steering documents to all platforms
  let syncCount = 0;

  for (const platform of installedPlatforms) {
    if (targetPlatform && platform !== targetPlatform) continue;

    const platformDir = platformDirs[platform];

    // Sync AGENTS.md
    const agentsSource = 'AGENTS.md';
    const agentsTarget = path.join(platformDir, 'AGENTS.md');

    if (await fs.pathExists(agentsSource)) {
      await fs.copy(agentsSource, agentsTarget);
      console.log(chalk.gray(`  ✓ ${platform}: Synced AGENTS.md`));
      syncCount++;
    }
  }

  console.log(chalk.green.bold('\n✅ Sync complete!\n'));
  console.log(chalk.white('Sync Summary:'));
  console.log(chalk.gray(`  Platforms: ${installedPlatforms.length}`));
  console.log(chalk.gray(`  Synced files: ${syncCount}`));
  console.log(chalk.white('\nAll platforms now have consistent memories\n'));
}

/**
 * Show sharing status
 */
async function showStatus() {
  console.log(chalk.blue.bold('\n📊 MUSUBI Sharing Status\n'));

  // Check project setup
  console.log(chalk.white('Project Setup:'));
  const hasProject = await fs.pathExists('steering/project.yml');
  console.log(chalk.gray(`  project.yml: ${hasProject ? '✓' : '✗'}`));

  // Check memories
  if (await fs.pathExists(CONFIG.memoriesDir)) {
    const memoryFiles = await glob('*.md', { cwd: CONFIG.memoriesDir });
    const memoryArray = Array.isArray(memoryFiles) ? memoryFiles : [];
    console.log(chalk.gray(`  Memories: ${memoryArray.length} files`));
  } else {
    console.log(chalk.gray('  Memories: 0 files'));
  }

  // Check platforms
  console.log(chalk.white('\nInstalled Platforms:'));
  const platformDirs = {
    'Claude Code': '.claude',
    'GitHub Copilot': '.github/copilot',
    Cursor: '.cursor',
    Windsurf: '.windsurf',
    Codex: '.codex',
    'Qwen Code': '.qwen',
  };

  let installedCount = 0;
  for (const [name, dir] of Object.entries(platformDirs)) {
    const exists = await fs.pathExists(dir);
    if (exists) {
      console.log(chalk.green(`  ✓ ${name}`));
      installedCount++;
    } else {
      console.log(chalk.gray(`  ✗ ${name}`));
    }
  }

  console.log(chalk.white(`\nTotal: ${installedCount} platform(s) configured\n`));

  // Export recommendation
  if (hasProject) {
    console.log(chalk.cyan('Ready to share:'));
    console.log(chalk.gray('  Run: musubi-share export'));
    console.log(chalk.gray('  Then share the generated file with your team\n'));
  }
}

/**
 * Main function
 */
async function main() {
  program
    .name('musubi-share')
    .description('Share and merge project memories across team members and AI platforms')
    .version(require('../package.json').version);

  program
    .command('export')
    .description('Export project memories to shareable format')
    .option('-o, --output <file>', 'Output file path', `musubi-memories-${Date.now()}.json`)
    .action(exportMemories);

  program
    .command('import <file>')
    .description('Import and merge memories from file')
    .option(
      '-s, --strategy <strategy>',
      'Merge strategy: ours, theirs, merge, interactive',
      'interactive'
    )
    .action(importMemories);

  program
    .command('sync')
    .description('Sync memories across AI platforms')
    .option('-p, --platform <platform>', 'Target platform to sync')
    .action(syncPlatforms);

  program.command('status').description('Show sharing status').action(showStatus);

  program.parse();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red(`\n❌ Share failed: ${error.message}\n`));
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  });
}

module.exports = main;
