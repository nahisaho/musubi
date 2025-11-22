#!/usr/bin/env node

/**
 * MUSUBI Onboarding Script
 *
 * Analyzes an existing codebase and generates MUSUBI steering context:
 * - Detects technology stack from package.json, requirements.txt, etc.
 * - Analyzes directory structure and architecture patterns
 * - Generates steering/project.yml
 * - Generates steering/*.md documents (structure, tech, product)
 * - Initializes steering/memories/ with initial content
 *
 * Usage:
 *   musubi-onboard [directory]
 *   musubi-onboard --auto-approve
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { glob } = require('glob');

/**
 * Analyze codebase and generate steering context
 */
async function main() {
  // Dynamic import for inquirer (ESM module)
  const inquirer = await import('inquirer');

  console.log(chalk.blue.bold('\n🔍 MUSUBI Onboarding - Codebase Analysis\n'));

  // Parse command line arguments
  const args = process.argv.slice(2);
  const targetDir = args.find(arg => !arg.startsWith('--')) || process.cwd();
  const autoApprove = args.includes('--auto-approve');
  const skipMemories = args.includes('--skip-memories');

  // Change to target directory
  process.chdir(targetDir);
  console.log(chalk.gray(`Analyzing: ${targetDir}\n`));

  // Step 1: Detect package managers and configuration files
  console.log(chalk.cyan('📦 Step 1: Detecting project configuration...\n'));
  const projectConfig = await detectProjectConfig();
  displayProjectConfig(projectConfig);

  // Step 2: Analyze directory structure
  console.log(chalk.cyan('\n📁 Step 2: Analyzing directory structure...\n'));
  const directoryAnalysis = await analyzeDirectoryStructure();
  displayDirectoryAnalysis(directoryAnalysis);

  // Step 3: Detect technology stack
  console.log(chalk.cyan('\n🔧 Step 3: Detecting technology stack...\n'));
  const techStack = await detectTechnologyStack(projectConfig);
  displayTechStack(techStack);

  // Step 4: Extract business context
  console.log(chalk.cyan('\n🎯 Step 4: Extracting business context...\n'));
  const businessContext = await extractBusinessContext(projectConfig);
  displayBusinessContext(businessContext);

  // Step 5: Confirm with user
  if (!autoApprove) {
    const answers = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: '\nAnalysis complete. Generate steering documents?',
        default: true,
      },
    ]);

    if (!answers.confirmed) {
      console.log(chalk.yellow('\nOnboarding cancelled.'));
      process.exit(0);
    }
  }

  // Step 6: Generate steering documents
  console.log(chalk.green('\n✨ Generating steering documents...\n'));

  await fs.ensureDir('steering');
  await fs.ensureDir('steering/rules');

  // Generate project.yml
  await generateProjectYml(projectConfig, techStack, directoryAnalysis);
  console.log(chalk.gray('  Created steering/project.yml'));

  // Generate structure.md (English and Japanese)
  await generateStructureMd(directoryAnalysis);
  console.log(chalk.gray('  Created steering/structure.md'));
  console.log(chalk.gray('  Created steering/structure.ja.md'));

  // Generate tech.md (English and Japanese)
  await generateTechMd(techStack);
  console.log(chalk.gray('  Created steering/tech.md'));
  console.log(chalk.gray('  Created steering/tech.ja.md'));

  // Generate product.md (English and Japanese)
  await generateProductMd(businessContext);
  console.log(chalk.gray('  Created steering/product.md'));
  console.log(chalk.gray('  Created steering/product.ja.md'));

  // Step 7: Initialize memories (if not skipped)
  if (!skipMemories) {
    console.log(chalk.green('\n📝 Initializing memory system...\n'));
    await initializeMemories(projectConfig, techStack, directoryAnalysis);
    console.log(chalk.gray('  Created steering/memories/README.md'));
    console.log(chalk.gray('  Created steering/memories/architecture_decisions.md'));
    console.log(chalk.gray('  Created steering/memories/development_workflow.md'));
    console.log(chalk.gray('  Created steering/memories/domain_knowledge.md'));
    console.log(chalk.gray('  Created steering/memories/suggested_commands.md'));
    console.log(chalk.gray('  Created steering/memories/lessons_learned.md'));
  }

  // Step 8: Success message
  console.log(chalk.blue.bold('\n✅ MUSUBI onboarding complete!\n'));
  console.log(chalk.white('Generated files:'));
  console.log(chalk.gray('  steering/project.yml - Project configuration'));
  console.log(chalk.gray('  steering/structure.md (.ja.md) - Architecture patterns'));
  console.log(chalk.gray('  steering/tech.md (.ja.md) - Technology stack'));
  console.log(chalk.gray('  steering/product.md (.ja.md) - Business context'));
  if (!skipMemories) {
    console.log(chalk.gray('  steering/memories/ - Memory system (6 files)'));
  }

  console.log(chalk.white('\nNext steps:'));
  console.log(chalk.gray('  1. Review generated steering documents'));
  console.log(chalk.gray('  2. Customize as needed'));
  console.log(chalk.gray('  3. Run musubi-init to set up agent integration'));
  console.log(chalk.gray('  4. Start using MUSUBI agents\n'));
}

/**
 * Detect project configuration files
 */
async function detectProjectConfig() {
  const config = {
    projectName: path.basename(process.cwd()),
    packageManager: null,
    configFiles: [],
    hasGit: false,
    hasTests: false,
    hasLint: false,
  };

  // Detect package.json (Node.js)
  if (await fs.pathExists('package.json')) {
    const pkg = await fs.readJson('package.json');
    config.projectName = pkg.name || config.projectName;
    config.description = pkg.description || '';
    config.version = pkg.version || '0.1.0';
    config.packageManager = 'npm';
    config.packageJson = pkg;
    config.configFiles.push('package.json');
  }

  // Detect pyproject.toml (Python)
  if (await fs.pathExists('pyproject.toml')) {
    config.packageManager = config.packageManager || 'poetry';
    config.configFiles.push('pyproject.toml');
  }

  // Detect requirements.txt (Python)
  if (await fs.pathExists('requirements.txt')) {
    config.packageManager = config.packageManager || 'pip';
    config.configFiles.push('requirements.txt');
  }

  // Detect Cargo.toml (Rust)
  if (await fs.pathExists('Cargo.toml')) {
    config.packageManager = 'cargo';
    config.configFiles.push('Cargo.toml');
  }

  // Detect go.mod (Go)
  if (await fs.pathExists('go.mod')) {
    config.packageManager = 'go';
    config.configFiles.push('go.mod');
  }

  // Detect .git
  config.hasGit = await fs.pathExists('.git');

  // Detect testing frameworks
  if (config.packageJson) {
    const devDeps = config.packageJson.devDependencies || {};
    config.hasTests =
      'jest' in devDeps || 'mocha' in devDeps || 'vitest' in devDeps || 'pytest' in devDeps;
    config.hasLint = 'eslint' in devDeps || 'prettier' in devDeps || 'pylint' in devDeps;
  }

  return config;
}

/**
 * Analyze directory structure
 */
async function analyzeDirectoryStructure() {
  const analysis = {
    architecture: 'unknown',
    directories: [],
    patterns: [],
  };

  // Glob for main directories (exclude node_modules, .git, etc.)
  const dirsResult = await glob('*/', {
    ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '.vscode/**', '.idea/**'],
  });

  const dirs = Array.isArray(dirsResult) ? dirsResult : [];
  analysis.directories = dirs.map(d => d.replace(/\/$/, ''));

  // Detect architecture patterns
  if (dirs.includes('src/')) {
    analysis.patterns.push('src-based');
    
    // Check sub-patterns within src
    const srcDirsResult = await glob('src/*/', { ignore: ['node_modules/**'] });
    const srcDirs = Array.isArray(srcDirsResult) ? srcDirsResult : [];
    
    if (srcDirs.includes('src/features/')) analysis.architecture = 'feature-first';
    else if (srcDirs.includes('src/components/')) analysis.architecture = 'component-based';
    else if (srcDirs.includes('src/domain/')) analysis.architecture = 'domain-driven-design';
    else if (srcDirs.includes('src/services/')) analysis.architecture = 'service-layer';
    else if (srcDirs.includes('src/app/')) analysis.architecture = 'app-router';
    else if (srcDirs.includes('src/pages/')) analysis.architecture = 'pages-router';
  }

  if (dirs.includes('lib/')) analysis.patterns.push('lib-directory');
  if (dirs.includes('tests/') || dirs.includes('test/')) analysis.patterns.push('test-directory');
  if (dirs.includes('docs/')) analysis.patterns.push('docs-directory');
  if (dirs.includes('bin/')) analysis.patterns.push('cli-tool');
  if (dirs.includes('scripts/')) analysis.patterns.push('scripts-directory');

  return analysis;
}

/**
 * Detect technology stack
 */
async function detectTechnologyStack(projectConfig) {
  const stack = {
    languages: [],
    frameworks: [],
    tools: [],
  };

  // Detect languages from file extensions
  const filesResult = await glob('**/*', {
    ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
    nodir: true,
  });

  const files = Array.isArray(filesResult) ? filesResult : [];
  const extensions = new Set(files.map(f => path.extname(f)).filter(Boolean));

  if (extensions.has('.js')) stack.languages.push('javascript');
  if (extensions.has('.ts')) stack.languages.push('typescript');
  if (extensions.has('.py')) stack.languages.push('python');
  if (extensions.has('.rs')) stack.languages.push('rust');
  if (extensions.has('.go')) stack.languages.push('go');
  if (extensions.has('.java')) stack.languages.push('java');
  if (extensions.has('.rb')) stack.languages.push('ruby');
  if (extensions.has('.md')) stack.languages.push('markdown');
  if (extensions.has('.yml') || extensions.has('.yaml')) stack.languages.push('yaml');
  if (extensions.has('.json')) stack.languages.push('json');

  // Detect frameworks from package.json
  if (projectConfig.packageJson) {
    const allDeps = {
      ...projectConfig.packageJson.dependencies,
      ...projectConfig.packageJson.devDependencies,
    };

    // Frontend frameworks
    if ('react' in allDeps) stack.frameworks.push({ name: 'React', version: allDeps.react });
    if ('vue' in allDeps) stack.frameworks.push({ name: 'Vue', version: allDeps.vue });
    if ('angular' in allDeps) stack.frameworks.push({ name: 'Angular', version: allDeps.angular });
    if ('next' in allDeps) stack.frameworks.push({ name: 'Next.js', version: allDeps.next });
    if ('nuxt' in allDeps) stack.frameworks.push({ name: 'Nuxt', version: allDeps.nuxt });

    // Testing
    if ('jest' in allDeps) stack.frameworks.push({ name: 'Jest', version: allDeps.jest, purpose: 'testing' });
    if ('vitest' in allDeps) stack.frameworks.push({ name: 'Vitest', version: allDeps.vitest, purpose: 'testing' });
    if ('mocha' in allDeps) stack.frameworks.push({ name: 'Mocha', version: allDeps.mocha, purpose: 'testing' });

    // Linting/Formatting
    if ('eslint' in allDeps) stack.tools.push({ name: 'ESLint', version: allDeps.eslint, purpose: 'linting' });
    if ('prettier' in allDeps) stack.tools.push({ name: 'Prettier', version: allDeps.prettier, purpose: 'formatting' });

    // Build tools
    if ('webpack' in allDeps) stack.tools.push({ name: 'Webpack', version: allDeps.webpack, purpose: 'bundler' });
    if ('vite' in allDeps) stack.tools.push({ name: 'Vite', version: allDeps.vite, purpose: 'bundler' });
    if ('rollup' in allDeps) stack.tools.push({ name: 'Rollup', version: allDeps.rollup, purpose: 'bundler' });
  }

  return stack;
}

/**
 * Extract business context from README, etc.
 */
async function extractBusinessContext(projectConfig) {
  const context = {
    description: projectConfig.description || '',
    purpose: '',
    targetUsers: '',
  };

  // Try to read README
  const readmeFiles = ['README.md', 'README.txt', 'readme.md'];
  for (const file of readmeFiles) {
    if (await fs.pathExists(file)) {
      const content = await fs.readFile(file, 'utf8');
      
      // Extract first paragraph as purpose
      const lines = content.split('\n').filter(l => l.trim());
      context.purpose = lines.slice(1, 4).join(' ').substring(0, 200);
      
      break;
    }
  }

  return context;
}

/**
 * Display detected project configuration
 */
function displayProjectConfig(config) {
  console.log(chalk.white(`Project Name: ${chalk.bold(config.projectName)}`));
  console.log(chalk.white(`Version: ${config.version || 'N/A'}`));
  console.log(chalk.white(`Package Manager: ${config.packageManager || 'None detected'}`));
  console.log(chalk.white(`Config Files: ${config.configFiles.join(', ') || 'None'}`));
  console.log(chalk.white(`Git: ${config.hasGit ? '✓' : '✗'}`));
  console.log(chalk.white(`Tests: ${config.hasTests ? '✓' : '✗'}`));
  console.log(chalk.white(`Linting: ${config.hasLint ? '✓' : '✗'}`));
}

/**
 * Display directory analysis
 */
function displayDirectoryAnalysis(analysis) {
  console.log(chalk.white(`Architecture: ${chalk.bold(analysis.architecture)}`));
  console.log(chalk.white(`Patterns: ${analysis.patterns.join(', ') || 'None detected'}`));
  console.log(chalk.white(`Main Directories: ${analysis.directories.slice(0, 10).join(', ')}`));
  if (analysis.directories.length > 10) {
    console.log(chalk.gray(`  ... and ${analysis.directories.length - 10} more`));
  }
}

/**
 * Display technology stack
 */
function displayTechStack(stack) {
  console.log(chalk.white(`Languages: ${stack.languages.join(', ') || 'None detected'}`));
  if (stack.frameworks.length > 0) {
    console.log(chalk.white('Frameworks:'));
    stack.frameworks.forEach(f => {
      console.log(chalk.gray(`  - ${f.name} ${f.version}${f.purpose ? ` (${f.purpose})` : ''}`));
    });
  }
  if (stack.tools.length > 0) {
    console.log(chalk.white('Tools:'));
    stack.tools.forEach(t => {
      console.log(chalk.gray(`  - ${t.name} ${t.version}${t.purpose ? ` (${t.purpose})` : ''}`));
    });
  }
}

/**
 * Display business context
 */
function displayBusinessContext(context) {
  console.log(chalk.white(`Description: ${context.description || 'N/A'}`));
  if (context.purpose) {
    console.log(chalk.white(`Purpose: ${context.purpose.substring(0, 150)}...`));
  }
}

/**
 * Generate project.yml
 */
async function generateProjectYml(projectConfig, techStack, directoryAnalysis) {
  const content = `# MUSUBI Project Configuration
# Auto-generated by musubi-onboard on ${new Date().toISOString().split('T')[0]}

project_name: "${projectConfig.projectName}"
description: "${projectConfig.description || 'Project onboarded to MUSUBI SDD'}"
version: "${projectConfig.version || '0.1.0'}"

# Detected languages
languages:
${techStack.languages.map(lang => `  - ${lang}`).join('\n') || '  - javascript'}

# Detected frameworks
frameworks:
${techStack.frameworks.map(f => `  - name: "${f.name}"\n    version: "${f.version}"\n    purpose: "${f.purpose || 'framework'}"`).join('\n') || '  - name: "Unknown"\n    version: "0.0.0"'}

# Project structure
conventions:
  architecture_pattern: "${directoryAnalysis.architecture}"
  directory_structure:
${directoryAnalysis.directories.slice(0, 5).map(d => `    ${d.replace(/\//g, '')}: "${d}"`).join('\n') || '    src: "src/"'}

# Steering configuration
steering:
  auto_update:
    enabled: false
    frequency: "on-demand"
  
  excluded_paths:
    - "node_modules/**"
    - "dist/**"
    - "build/**"
    - ".git/**"
    - "*.log"
  
  memories:
    enabled: true
    path: "steering/memories/"
    max_file_size_kb: 500
    retention_days: 365

# Agent configuration
agents:
  default_language: "ja"
  bilingual_output:
    enabled: true
    languages: ["en", "ja"]
  
  output:
    gradual_generation: true
    progress_indicators: true
    large_file_splitting: true
    split_threshold_lines: 300

# Development workflow
workflow:
  testing:
    required: ${projectConfig.hasTests}
    coverage_threshold: 80
  
  quality_gates:
    - name: "lint"
      command: "${projectConfig.packageManager === 'npm' ? 'npm run lint' : 'make lint'}"
      required: ${projectConfig.hasLint}

# Custom rules (adjust as needed)
custom_rules:
  - "All development shall follow specification-first approach"
  - "All code shall maintain high quality standards"
  - "Documentation shall be kept up to date"

# Generated by musubi-onboard
# Review and customize as needed
`;

  await fs.writeFile('steering/project.yml', content);
}

/**
 * Generate structure.md and structure.ja.md
 */
async function generateStructureMd(directoryAnalysis) {
  const contentEn = `# Project Structure

## Architecture Pattern

**Pattern**: ${directoryAnalysis.architecture}

## Directory Structure

\`\`\`
${directoryAnalysis.directories.map(d => `${d}/`).join('\n')}
\`\`\`

## Key Patterns

${directoryAnalysis.patterns.map(p => `- ${p}`).join('\n')}

## Conventions

- File naming: kebab-case
- Directory organization: ${directoryAnalysis.architecture}

---

*Auto-generated by MUSUBI onboarding. Customize as needed.*
`;

  const contentJa = `# プロジェクト構造

## アーキテクチャパターン

**パターン**: ${directoryAnalysis.architecture}

## ディレクトリ構造

\`\`\`
${directoryAnalysis.directories.map(d => `${d}/`).join('\n')}
\`\`\`

## 主要パターン

${directoryAnalysis.patterns.map(p => `- ${p}`).join('\n')}

## 規約

- ファイル命名: kebab-case
- ディレクトリ構成: ${directoryAnalysis.architecture}

---

*MUSUBIオンボーディングにより自動生成。必要に応じてカスタマイズしてください。*
`;

  await fs.writeFile('steering/structure.md', contentEn);
  await fs.writeFile('steering/structure.ja.md', contentJa);
}

/**
 * Generate tech.md and tech.ja.md
 */
async function generateTechMd(techStack) {
  const contentEn = `# Technology Stack

## Languages

${techStack.languages.map(lang => `- ${lang}`).join('\n')}

## Frameworks

${techStack.frameworks.map(f => `- **${f.name}** (${f.version})${f.purpose ? ` - ${f.purpose}` : ''}`).join('\n') || '- None detected'}

## Tools

${techStack.tools.map(t => `- **${t.name}** (${t.version})${t.purpose ? ` - ${t.purpose}` : ''}`).join('\n') || '- None detected'}

---

*Auto-generated by MUSUBI onboarding. Customize as needed.*
`;

  const contentJa = `# 技術スタック

## 言語

${techStack.languages.map(lang => `- ${lang}`).join('\n')}

## フレームワーク

${techStack.frameworks.map(f => `- **${f.name}** (${f.version})${f.purpose ? ` - ${f.purpose}` : ''}`).join('\n') || '- 検出されませんでした'}

## ツール

${techStack.tools.map(t => `- **${t.name}** (${t.version})${t.purpose ? ` - ${t.purpose}` : ''}`).join('\n') || '- 検出されませんでした'}

---

*MUSUBIオンボーディングにより自動生成。必要に応じてカスタマイズしてください。*
`;

  await fs.writeFile('steering/tech.md', contentEn);
  await fs.writeFile('steering/tech.ja.md', contentJa);
}

/**
 * Generate product.md and product.ja.md
 */
async function generateProductMd(businessContext) {
  const contentEn = `# Product Context

## Description

${businessContext.description || 'Project description not available'}

## Purpose

${businessContext.purpose || 'Purpose extracted from codebase analysis'}

## Target Users

${businessContext.targetUsers || 'To be defined'}

---

*Auto-generated by MUSUBI onboarding. Customize with your product vision.*
`;

  const contentJa = `# プロダクトコンテキスト

## 説明

${businessContext.description || 'プロジェクトの説明がありません'}

## 目的

${businessContext.purpose || 'コードベース分析から抽出された目的'}

## 対象ユーザー

${businessContext.targetUsers || '定義が必要'}

---

*MUSUBIオンボーディングにより自動生成。プロダクトビジョンでカスタマイズしてください。*
`;

  await fs.writeFile('steering/product.md', contentEn);
  await fs.writeFile('steering/product.ja.md', contentJa);
}

/**
 * Initialize memory system
 */
async function initializeMemories(projectConfig, techStack, directoryAnalysis) {
  await fs.ensureDir('steering/memories');

  const TEMPLATE_DIR = path.join(__dirname, '..', 'src', 'templates', 'memories');
  
  const today = new Date().toISOString().split('T')[0];
  const replacements = {
    '{{PROJECT_NAME}}': projectConfig.projectName,
    '{{DATE}}': today,
    '{{PACKAGE_MANAGER}}': projectConfig.packageManager || 'npm',
  };

  // Copy memory templates with variable replacement
  if (await fs.pathExists(TEMPLATE_DIR)) {
    const files = await fs.readdir(TEMPLATE_DIR);
    
    for (const file of files) {
      const templatePath = path.join(TEMPLATE_DIR, file);
      const destPath = path.join('steering/memories', file);
      
      let content = await fs.readFile(templatePath, 'utf8');
      
      // Replace all placeholders
      for (const [placeholder, value] of Object.entries(replacements)) {
        content = content.replaceAll(placeholder, value);
      }
      
      await fs.writeFile(destPath, content);
    }
  } else {
    // Fallback: Create minimal memory files
    const files = {
      'README.md': `# Memory System\n\nPersistent knowledge for MUSUBI project.\n\nInitialized: ${today}\n`,
      'architecture_decisions.md': `# Architecture Decisions\n\n## [${today}] Initial Project Analysis\n\n**Decision**: Onboarded to MUSUBI SDD\n\n**Context**: Analyzed existing codebase with ${techStack.languages.length} languages, ${directoryAnalysis.architecture} architecture.\n`,
      'development_workflow.md': `# Development Workflow\n\nPackage Manager: ${projectConfig.packageManager || 'Unknown'}\n`,
      'domain_knowledge.md': `# Domain Knowledge\n\nProject: ${projectConfig.projectName}\n`,
      'suggested_commands.md': `# Suggested Commands\n\n## Package Management\n\n\`\`\`bash\n${projectConfig.packageManager === 'npm' ? 'npm install\nnpm test\nnpm run lint' : 'See package manager documentation'}\n\`\`\`\n`,
      'lessons_learned.md': `# Lessons Learned\n\n## [${today}] MUSUBI Onboarding\n\nProject successfully onboarded to MUSUBI SDD system.\n`,
    };

    for (const [filename, content] of Object.entries(files)) {
      await fs.writeFile(path.join('steering/memories', filename), content);
    }
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error(chalk.red('\n❌ Onboarding failed:'), err.message);
    console.error(err.stack);
    process.exit(1);
  });
}

module.exports = main;
