#!/usr/bin/env node

/**
 * MUSUBI Steering Sync Script
 *
 * Detects changes in codebase and synchronizes steering documentation:
 * - Compares current codebase state with steering/project.yml
 * - Detects new dependencies, frameworks, directory changes
 * - Proposes updates to steering documents
 * - Updates project.yml, structure.md, tech.md as needed
 *
 * Usage:
 *   musubi-sync
 *   musubi-sync --auto-approve
 *   musubi-sync --dry-run
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { glob } = require('glob');
const yaml = require('js-yaml');

/**
 * Main sync function
 */
async function main() {
  // Dynamic import for inquirer (ESM module)
  const inquirer = await import('inquirer');

  console.log(chalk.blue.bold('\n🔄 MUSUBI Steering Sync - Change Detection\n'));

  // Parse command line arguments
  const args = process.argv.slice(2);
  const autoApprove = args.includes('--auto-approve');
  const dryRun = args.includes('--dry-run');

  // Check if steering documents exist
  if (!(await fs.pathExists('steering/project.yml'))) {
    console.log(chalk.red('❌ steering/project.yml not found.'));
    console.log(chalk.yellow('Run `musubi-onboard` first to initialize steering.'));
    process.exit(1);
  }

  // Step 1: Load current steering configuration
  console.log(chalk.cyan('📋 Step 1: Loading current steering configuration...\n'));
  const currentConfig = await loadSteeringConfig();
  displayConfig('Current Configuration', currentConfig);

  // Step 2: Analyze current codebase
  console.log(chalk.cyan('\n🔍 Step 2: Analyzing current codebase...\n'));
  const actualState = await analyzeCodebase();
  displayConfig('Detected State', actualState);

  // Step 3: Detect differences
  console.log(chalk.cyan('\n🔎 Step 3: Detecting changes...\n'));
  const changes = detectChanges(currentConfig, actualState);

  if (changes.length === 0) {
    console.log(chalk.green('✅ No changes detected. Steering is up to date!\n'));
    process.exit(0);
  }

  displayChanges(changes);

  // Step 4: Confirm with user (unless auto-approve or dry-run)
  if (dryRun) {
    console.log(chalk.yellow('\n🏃 Dry run mode - no changes will be applied.\n'));
    process.exit(0);
  }

  if (!autoApprove) {
    const { confirmed } = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: '\nApply these changes to steering documents?',
        default: true,
      },
    ]);

    if (!confirmed) {
      console.log(chalk.yellow('\nSync cancelled.'));
      process.exit(0);
    }
  }

  // Step 5: Apply changes
  console.log(chalk.green('\n✨ Applying changes...\n'));
  await applyChanges(changes, currentConfig, actualState);

  // Step 6: Success message
  console.log(chalk.blue.bold('\n✅ Steering sync complete!\n'));
  console.log(chalk.white('Updated files:'));
  const updatedFiles = new Set(changes.map(c => c.file));
  updatedFiles.forEach(file => {
    console.log(chalk.gray(`  ${file}`));
  });

  console.log(chalk.white('\nNext steps:'));
  console.log(chalk.gray('  1. Review updated steering documents'));
  console.log(chalk.gray('  2. Commit changes if satisfied'));
  console.log(chalk.gray('  3. Run musubi-sync regularly to keep docs fresh\n'));
}

/**
 * Load current steering configuration
 */
async function loadSteeringConfig() {
  const config = {
    projectName: '',
    version: '',
    languages: [],
    frameworks: [],
    directories: [],
  };

  // Load project.yml
  if (await fs.pathExists('steering/project.yml')) {
    const yamlContent = await fs.readFile('steering/project.yml', 'utf8');
    const projectYml = yaml.load(yamlContent);

    config.projectName = projectYml.project_name || '';
    config.version = projectYml.version || '';
    config.languages = projectYml.languages || [];

    // Extract framework names from frameworks array
    if (Array.isArray(projectYml.frameworks)) {
      config.frameworks = projectYml.frameworks.map(f => (typeof f === 'string' ? f : f.name));
    }

    // Extract directories from conventions
    if (projectYml.conventions && projectYml.conventions.directory_structure) {
      const dirStruct = projectYml.conventions.directory_structure;
      if (typeof dirStruct === 'string') {
        config.directories = dirStruct.split(/[,\s]+/).filter(Boolean);
      } else if (typeof dirStruct === 'object') {
        config.directories = Object.keys(dirStruct);
      }
    }
  }

  // Load package.json for version check
  if (await fs.pathExists('package.json')) {
    const pkg = await fs.readJson('package.json');
    config.actualVersion = pkg.version;
  }

  return config;
}

/**
 * Analyze current codebase state
 */
async function analyzeCodebase() {
  const state = {
    projectName: '',
    version: '',
    languages: [],
    frameworks: [],
    directories: [],
  };

  // Detect from package.json
  if (await fs.pathExists('package.json')) {
    const pkg = await fs.readJson('package.json');
    state.projectName = pkg.name || path.basename(process.cwd());
    state.version = pkg.version || '0.1.0';

    // Detect frameworks from dependencies
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    // Common frameworks
    const frameworkMap = {
      react: 'React',
      vue: 'Vue',
      angular: 'Angular',
      next: 'Next.js',
      nuxt: 'Nuxt',
      express: 'Express',
      fastify: 'Fastify',
      nest: 'NestJS',
      jest: 'Jest',
      vitest: 'Vitest',
      mocha: 'Mocha',
      eslint: 'ESLint',
      prettier: 'Prettier',
      webpack: 'Webpack',
      vite: 'Vite',
      rollup: 'Rollup',
    };

    for (const [key, name] of Object.entries(frameworkMap)) {
      if (key in allDeps) {
        state.frameworks.push(name);
      }
    }
  }

  // Detect languages from file extensions
  const files = await glob('**/*', {
    ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
    nodir: true,
  });

  const fileArray = Array.isArray(files) ? files : [];
  const extensions = new Set(fileArray.map(f => path.extname(f)).filter(Boolean));
  const langMap = {
    '.js': 'javascript',
    '.ts': 'typescript',
    '.py': 'python',
    '.rs': 'rust',
    '.go': 'go',
    '.java': 'java',
    '.rb': 'ruby',
  };

  for (const [ext, lang] of Object.entries(langMap)) {
    if (extensions.has(ext)) {
      state.languages.push(lang);
    }
  }

  // Detect main directories
  const dirs = await glob('*/', {
    ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '.vscode/**'],
  });
  const dirArray = Array.isArray(dirs) ? dirs : [];
  state.directories = dirArray.map(d => d.replace(/\/$/, '')).slice(0, 10);

  return state;
}

/**
 * Detect changes between config and actual state
 */
function detectChanges(config, actual) {
  const changes = [];

  // Version mismatch
  if (config.actualVersion && config.version !== config.actualVersion) {
    changes.push({
      type: 'version_mismatch',
      field: 'version',
      file: 'steering/project.yml',
      old: config.version,
      new: config.actualVersion,
      description: `Version in project.yml (${config.version}) differs from package.json (${config.actualVersion})`,
    });
  }

  // New languages detected
  const newLanguages = actual.languages.filter(lang => !config.languages.includes(lang));
  if (newLanguages.length > 0) {
    changes.push({
      type: 'new_languages',
      field: 'languages',
      file: 'steering/project.yml',
      old: config.languages,
      new: [...config.languages, ...newLanguages],
      added: newLanguages,
      description: `New languages detected: ${newLanguages.join(', ')}`,
    });
  }

  // Removed languages
  const removedLanguages = config.languages.filter(lang => !actual.languages.includes(lang));
  if (removedLanguages.length > 0) {
    changes.push({
      type: 'removed_languages',
      field: 'languages',
      file: 'steering/project.yml',
      old: config.languages,
      new: config.languages.filter(lang => !removedLanguages.includes(lang)),
      removed: removedLanguages,
      description: `Languages no longer used: ${removedLanguages.join(', ')}`,
    });
  }

  // New frameworks detected
  const newFrameworks = actual.frameworks.filter(fw => !config.frameworks.includes(fw));
  if (newFrameworks.length > 0) {
    changes.push({
      type: 'new_frameworks',
      field: 'frameworks',
      file: 'steering/project.yml',
      old: config.frameworks,
      new: [...config.frameworks, ...newFrameworks],
      added: newFrameworks,
      description: `New frameworks detected: ${newFrameworks.join(', ')}`,
    });

    // Also update tech.md
    changes.push({
      type: 'new_frameworks',
      field: 'frameworks',
      file: 'steering/tech.md',
      added: newFrameworks,
      description: `Update tech.md with new frameworks: ${newFrameworks.join(', ')}`,
    });
  }

  // Removed frameworks
  const removedFrameworks = config.frameworks.filter(fw => !actual.frameworks.includes(fw));
  if (removedFrameworks.length > 0) {
    changes.push({
      type: 'removed_frameworks',
      field: 'frameworks',
      file: 'steering/project.yml',
      old: config.frameworks,
      new: config.frameworks.filter(fw => !removedFrameworks.includes(fw)),
      removed: removedFrameworks,
      description: `Frameworks no longer used: ${removedFrameworks.join(', ')}`,
    });
  }

  // New directories
  const newDirs = actual.directories.filter(dir => !config.directories.includes(dir));
  if (newDirs.length > 0) {
    changes.push({
      type: 'new_directories',
      field: 'directories',
      file: 'steering/structure.md',
      added: newDirs,
      description: `New directories detected: ${newDirs.join(', ')}`,
    });
  }

  return changes;
}

/**
 * Display configuration
 */
function displayConfig(title, config) {
  console.log(chalk.white.bold(title + ':'));
  console.log(chalk.gray(`  Project: ${config.projectName}`));
  console.log(chalk.gray(`  Version: ${config.version}`));
  console.log(chalk.gray(`  Languages: ${config.languages.join(', ') || 'None'}`));
  console.log(chalk.gray(`  Frameworks: ${config.frameworks.join(', ') || 'None'}`));
  console.log(chalk.gray(`  Directories: ${config.directories.slice(0, 5).join(', ') || 'None'}`));
}

/**
 * Display detected changes
 */
function displayChanges(changes) {
  console.log(chalk.yellow.bold(`Found ${changes.length} change(s):\n`));

  changes.forEach((change, idx) => {
    console.log(chalk.white(`${idx + 1}. ${change.description}`));
    console.log(chalk.gray(`   File: ${change.file}`));

    if (change.added) {
      console.log(chalk.green(`   Added: ${change.added.join(', ')}`));
    }
    if (change.removed) {
      console.log(chalk.red(`   Removed: ${change.removed.join(', ')}`));
    }
    if (change.old && change.new && !change.added && !change.removed) {
      console.log(chalk.gray(`   Old: ${change.old}`));
      console.log(chalk.gray(`   New: ${change.new}`));
    }
    console.log();
  });
}

/**
 * Apply changes to steering documents
 */
async function applyChanges(changes, currentConfig, actualState) {
  const fileChanges = {};

  // Group changes by file
  for (const change of changes) {
    if (!fileChanges[change.file]) {
      fileChanges[change.file] = [];
    }
    fileChanges[change.file].push(change);
  }

  // Apply changes to each file
  for (const [file, changeList] of Object.entries(fileChanges)) {
    if (file === 'steering/project.yml') {
      await updateProjectYml(changeList, actualState);
      console.log(chalk.gray(`  Updated ${file}`));
    } else if (file === 'steering/tech.md') {
      await updateTechMd(changeList, actualState);
      console.log(chalk.gray(`  Updated ${file} and tech.ja.md`));
    } else if (file === 'steering/structure.md') {
      await updateStructureMd(changeList, actualState);
      console.log(chalk.gray(`  Updated ${file} and structure.ja.md`));
    }
  }

  // Record change in memories
  await recordChangeInMemory(changes);
  console.log(chalk.gray('  Updated steering/memories/architecture_decisions.md'));
}

/**
 * Update project.yml with changes
 */
async function updateProjectYml(changes, actualState) {
  const yamlPath = 'steering/project.yml';
  const content = await fs.readFile(yamlPath, 'utf8');
  const config = yaml.load(content);

  for (const change of changes) {
    if (change.type === 'version_mismatch') {
      config.version = change.new;
    } else if (change.type === 'new_languages' || change.type === 'removed_languages') {
      config.languages = actualState.languages;
    } else if (change.type === 'new_frameworks' || change.type === 'removed_frameworks') {
      // Update frameworks array
      config.frameworks = actualState.frameworks.map(name => ({
        name,
        version: 'detected',
        purpose: 'framework',
      }));
    }
  }

  // Write updated YAML
  const updatedYaml = yaml.dump(config, {
    indent: 2,
    lineWidth: 100,
  });

  await fs.writeFile(yamlPath, updatedYaml);
}

/**
 * Update tech.md with new frameworks
 */
async function updateTechMd(changes, _actualState) {
  const newFrameworks = changes.filter(c => c.type === 'new_frameworks').flatMap(c => c.added);

  if (newFrameworks.length === 0) return;

  // Update English version
  const techMdPath = 'steering/tech.md';
  if (await fs.pathExists(techMdPath)) {
    let content = await fs.readFile(techMdPath, 'utf8');

    // Find frameworks section and append
    const frameworkSection = '## Frameworks';
    if (content.includes(frameworkSection)) {
      const newEntries = newFrameworks
        .map(fw => `- **${fw}** (detected) - Auto-detected framework`)
        .join('\n');
      content = content.replace(frameworkSection, `${frameworkSection}\n\n${newEntries}\n`);
    }

    await fs.writeFile(techMdPath, content);
  }

  // Update Japanese version
  const techMdJaPath = 'steering/tech.ja.md';
  if (await fs.pathExists(techMdJaPath)) {
    let content = await fs.readFile(techMdJaPath, 'utf8');

    const frameworkSection = '## フレームワーク';
    if (content.includes(frameworkSection)) {
      const newEntries = newFrameworks
        .map(fw => `- **${fw}** (detected) - 自動検出されたフレームワーク`)
        .join('\n');
      content = content.replace(frameworkSection, `${frameworkSection}\n\n${newEntries}\n`);
    }

    await fs.writeFile(techMdJaPath, content);
  }
}

/**
 * Update structure.md with new directories
 */
async function updateStructureMd(changes, _actualState) {
  const newDirs = changes.filter(c => c.type === 'new_directories').flatMap(c => c.added);

  if (newDirs.length === 0) return;

  // Update English version
  const structureMdPath = 'steering/structure.md';
  if (await fs.pathExists(structureMdPath)) {
    let content = await fs.readFile(structureMdPath, 'utf8');

    // Append new directories to the directory structure section
    const dirList = newDirs.map(dir => `${dir}/`).join('\n');
    content += `\n\n## New Directories (Detected ${new Date().toISOString().split('T')[0]})\n\n\`\`\`\n${dirList}\n\`\`\`\n`;

    await fs.writeFile(structureMdPath, content);
  }

  // Update Japanese version
  const structureMdJaPath = 'steering/structure.ja.md';
  if (await fs.pathExists(structureMdJaPath)) {
    let content = await fs.readFile(structureMdJaPath, 'utf8');

    const dirList = newDirs.map(dir => `${dir}/`).join('\n');
    content += `\n\n## 新規ディレクトリ (検出日: ${new Date().toISOString().split('T')[0]})\n\n\`\`\`\n${dirList}\n\`\`\`\n`;

    await fs.writeFile(structureMdJaPath, content);
  }
}

/**
 * Record sync event in memory
 */
async function recordChangeInMemory(changes) {
  const memoryPath = 'steering/memories/architecture_decisions.md';
  if (!(await fs.pathExists(memoryPath))) return;

  let content = await fs.readFile(memoryPath, 'utf8');

  const today = new Date().toISOString().split('T')[0];
  const changeDescriptions = changes.map(c => `- ${c.description}`).join('\n');

  const entry = `\n## [${today}] Steering Sync - Automatic Update\n\n**Decision**: Synchronized steering documents with codebase changes\n\n**Changes Detected**:\n${changeDescriptions}\n\n**Action**: Automatically updated steering documents via \`musubi-sync\`\n\n---\n`;

  // Insert after the heading
  const insertAfter = '# Architecture Decisions\n';
  content = content.replace(insertAfter, insertAfter + entry);

  await fs.writeFile(memoryPath, content);
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error(chalk.red('\n❌ Sync failed:'), err.message);
    console.error(err.stack);
    process.exit(1);
  });
}

module.exports = main;
