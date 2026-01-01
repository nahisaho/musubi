#!/usr/bin/env node

/**
 * MUSUBI Upgrade Script
 *
 * Upgrades existing MUSUBI projects to newer versions:
 * - Updates steering files
 * - Adds new prompts/skills
 * - Migrates configuration
 * - Preserves user customizations
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { Command } = require('commander');

const program = new Command();
const packageJson = require('../package.json');

// Version migration definitions
const MIGRATIONS = {
  '6.2.0': {
    description: 'Review Gate Engine, Dashboard, Traceability',
    changes: [
      'Add Review Gate prompts to AGENTS.md',
      'Create storage/reviews/, storage/dashboard/, storage/traceability/ directories',
      'Update steering/project.yml with reviewGate settings',
    ],
    migrate: migrateToV620,
  },
  '6.2.1': {
    description: 'Bug fixes and improvements',
    changes: ['Minor fixes'],
    migrate: migrateToV621,
  },
};

// ============================================================================
// Migration Functions
// ============================================================================

async function migrateToV620(projectDir, _options) {
  const results = { success: [], failed: [], skipped: [] };

  // 1. Create new storage directories
  const newDirs = [
    'storage/reviews',
    'storage/dashboard',
    'storage/traceability',
    'storage/transitions',
  ];

  for (const dir of newDirs) {
    const dirPath = path.join(projectDir, dir);
    try {
      if (!fs.existsSync(dirPath)) {
        await fs.ensureDir(dirPath);
        await fs.writeFile(path.join(dirPath, '.gitkeep'), '');
        results.success.push(`Created ${dir}/`);
      } else {
        results.skipped.push(`${dir}/ already exists`);
      }
    } catch (err) {
      results.failed.push(`Failed to create ${dir}/: ${err.message}`);
    }
  }

  // 2. Update AGENTS.md with new review prompts
  const agentsPath = path.join(projectDir, 'AGENTS.md');
  if (fs.existsSync(agentsPath)) {
    try {
      let content = await fs.readFile(agentsPath, 'utf8');

      const reviewPrompts = `
### Review Gate Prompts (v6.2.0)

- \`#sdd-review-requirements <feature>\` - Review requirements (EARS, stakeholders, acceptance criteria)
- \`#sdd-review-design <feature>\` - Review design (C4, ADR, Constitutional Articles)
- \`#sdd-review-implementation <feature>\` - Review implementation (coverage, lint, traceability)
- \`#sdd-review-all <feature>\` - Full review cycle for all phases
`;

      if (!content.includes('#sdd-review-requirements')) {
        // Find a good insertion point (after existing prompts section)
        const promptsIndex = content.indexOf('### Prompts');
        if (promptsIndex !== -1) {
          const nextSectionIndex = content.indexOf('###', promptsIndex + 10);
          if (nextSectionIndex !== -1) {
            content =
              content.slice(0, nextSectionIndex) + reviewPrompts + '\n' + content.slice(nextSectionIndex);
          } else {
            content += '\n' + reviewPrompts;
          }
        } else {
          content += '\n' + reviewPrompts;
        }

        await fs.writeFile(agentsPath, content);
        results.success.push('Added Review Gate prompts to AGENTS.md');
      } else {
        results.skipped.push('Review Gate prompts already in AGENTS.md');
      }
    } catch (err) {
      results.failed.push(`Failed to update AGENTS.md: ${err.message}`);
    }
  } else {
    results.skipped.push('AGENTS.md not found (not a MUSUBI project?)');
  }

  // 3. Update steering/project.yml with reviewGate settings
  const projectYmlPath = path.join(projectDir, 'steering', 'project.yml');
  if (fs.existsSync(projectYmlPath)) {
    try {
      let content = await fs.readFile(projectYmlPath, 'utf8');

      const reviewGateConfig = `
# Review Gate Settings (v6.2.0)
reviewGate:
  requirements:
    earsCheck: true
    stakeholderCoverage: true
    acceptanceCriteriaRequired: true
  design:
    c4Required: ['context', 'container', 'component']
    adrRequired: true
    constitutionalArticles: [1, 2, 7, 8]
  implementation:
    minCoverage: 80
    coverageType: 'line'
    lintStrict: true

# Traceability Settings (v6.2.0)
traceability:
  patterns:
    - 'REQ-[A-Z0-9]+-\\\\d{3}'
    - 'IMP-\\\\d+\\\\.\\\\d+-\\\\d{3}(?:-\\\\d{2})?'
  extractFrom:
    - 'src/**/*.{ts,js}'
    - 'tests/**/*.test.{ts,js}'
  outputPath: 'storage/traceability/matrix.yml'
`;

      if (!content.includes('reviewGate:')) {
        content += '\n' + reviewGateConfig;
        await fs.writeFile(projectYmlPath, content);
        results.success.push('Added reviewGate settings to steering/project.yml');
      } else {
        results.skipped.push('reviewGate settings already in steering/project.yml');
      }
    } catch (err) {
      results.failed.push(`Failed to update steering/project.yml: ${err.message}`);
    }
  } else {
    results.skipped.push('steering/project.yml not found');
  }

  // 4. Create version marker
  const versionPath = path.join(projectDir, 'steering', '.musubi-version');
  try {
    await fs.writeFile(versionPath, '6.2.0\n');
    results.success.push('Created version marker');
  } catch (err) {
    results.failed.push(`Failed to create version marker: ${err.message}`);
  }

  return results;
}

async function migrateToV621(projectDir, _options) {
  const results = { success: [], failed: [], skipped: [] };

  // v6.2.1 is mainly bug fixes, just update version marker
  const versionPath = path.join(projectDir, 'steering', '.musubi-version');
  try {
    await fs.writeFile(versionPath, '6.2.1\n');
    results.success.push('Updated version marker to 6.2.1');
  } catch (err) {
    results.failed.push(`Failed to update version marker: ${err.message}`);
  }

  return results;
}

// ============================================================================
// Utility Functions
// ============================================================================

function getCurrentVersion(projectDir) {
  const versionPath = path.join(projectDir, 'steering', '.musubi-version');
  if (fs.existsSync(versionPath)) {
    return fs.readFileSync(versionPath, 'utf8').trim();
  }

  // Fallback: check if MUSUBI is initialized
  const steeringDir = path.join(projectDir, 'steering');
  if (fs.existsSync(steeringDir)) {
    return '6.0.0'; // Assume pre-version-tracking
  }

  return null;
}

function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (parts1[i] > parts2[i]) return 1;
    if (parts1[i] < parts2[i]) return -1;
  }
  return 0;
}

function getMigrationPath(fromVersion, toVersion) {
  const versions = Object.keys(MIGRATIONS).sort(compareVersions);
  const path = [];

  for (const version of versions) {
    if (compareVersions(version, fromVersion) > 0 && compareVersions(version, toVersion) <= 0) {
      path.push(version);
    }
  }

  return path;
}

// ============================================================================
// CLI Commands
// ============================================================================

program
  .name('musubi-upgrade')
  .description('Upgrade MUSUBI project to a newer version')
  .version(packageJson.version)
  .option('--to <version>', 'Target version to upgrade to', 'latest')
  .option('--dry-run', 'Preview changes without applying')
  .option('--force', 'Force upgrade even if already at target version')
  .action(async options => {
    const projectDir = process.cwd();

    console.log(chalk.blue.bold('\n🔄 MUSUBI Upgrade\n'));

    // Check if MUSUBI is initialized
    const currentVersion = getCurrentVersion(projectDir);
    if (!currentVersion) {
      console.log(chalk.red('❌ MUSUBI is not initialized in this directory.'));
      console.log(chalk.gray('\nRun: npx musubi-sdd init\n'));
      process.exit(1);
    }

    // Determine target version
    let targetVersion = options.to;
    if (targetVersion === 'latest') {
      targetVersion = packageJson.version;
    }

    // Validate target version
    const availableVersions = Object.keys(MIGRATIONS);
    if (!availableVersions.includes(targetVersion) && targetVersion !== packageJson.version) {
      console.log(chalk.red(`❌ Unknown target version: ${targetVersion}`));
      console.log(chalk.gray(`\nAvailable versions: ${availableVersions.join(', ')}\n`));
      process.exit(1);
    }

    console.log(chalk.white(`Current version: ${chalk.yellow(currentVersion)}`));
    console.log(chalk.white(`Target version:  ${chalk.green(targetVersion)}`));

    // Check if upgrade is needed
    const comparison = compareVersions(currentVersion, targetVersion);
    if (comparison >= 0 && !options.force) {
      console.log(chalk.green('\n✅ Already at target version or newer.\n'));
      console.log(chalk.gray('Use --force to re-run migrations.\n'));
      process.exit(0);
    }

    // Get migration path
    const migrationPath = getMigrationPath(currentVersion, targetVersion);

    if (migrationPath.length === 0) {
      console.log(chalk.yellow('\n⚠️  No migrations needed.\n'));
      process.exit(0);
    }

    console.log(chalk.white(`\nMigrations to apply: ${migrationPath.join(' → ')}\n`));

    // Show migration details
    for (const version of migrationPath) {
      const migration = MIGRATIONS[version];
      console.log(chalk.cyan(`📦 v${version}: ${migration.description}`));
      for (const change of migration.changes) {
        console.log(chalk.gray(`   - ${change}`));
      }
    }

    if (options.dryRun) {
      console.log(chalk.yellow('\n🔍 Dry run mode - no changes applied.\n'));
      process.exit(0);
    }

    // Confirm upgrade
    console.log('');

    // Apply migrations
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    for (const version of migrationPath) {
      console.log(chalk.blue(`\n📦 Applying migration to v${version}...\n`));

      const migration = MIGRATIONS[version];
      const results = await migration.migrate(projectDir, options);

      for (const msg of results.success) {
        console.log(chalk.green(`   ✅ ${msg}`));
        totalSuccess++;
      }
      for (const msg of results.skipped) {
        console.log(chalk.yellow(`   ⏭️  ${msg}`));
        totalSkipped++;
      }
      for (const msg of results.failed) {
        console.log(chalk.red(`   ❌ ${msg}`));
        totalFailed++;
      }
    }

    // Summary
    console.log(chalk.blue.bold('\n📊 Upgrade Summary\n'));
    console.log(chalk.green(`   ✅ Success: ${totalSuccess}`));
    console.log(chalk.yellow(`   ⏭️  Skipped: ${totalSkipped}`));
    console.log(chalk.red(`   ❌ Failed: ${totalFailed}`));

    if (totalFailed > 0) {
      console.log(chalk.red('\n⚠️  Some migrations failed. Please check the errors above.\n'));
      process.exit(1);
    }

    console.log(chalk.green(`\n✅ Successfully upgraded to v${targetVersion}!\n`));
  });

// List available migrations
program
  .command('list')
  .description('List available migrations')
  .action(() => {
    console.log(chalk.blue.bold('\n📋 Available MUSUBI Migrations\n'));

    const versions = Object.keys(MIGRATIONS).sort(compareVersions);
    for (const version of versions) {
      const migration = MIGRATIONS[version];
      console.log(chalk.cyan(`v${version}: ${migration.description}`));
      for (const change of migration.changes) {
        console.log(chalk.gray(`   - ${change}`));
      }
      console.log('');
    }

    console.log(chalk.white(`Current package version: ${packageJson.version}\n`));
  });

// Check current version
program
  .command('check')
  .description('Check current project version')
  .action(() => {
    const projectDir = process.cwd();
    const currentVersion = getCurrentVersion(projectDir);

    console.log(chalk.blue.bold('\n🔍 MUSUBI Version Check\n'));

    if (!currentVersion) {
      console.log(chalk.red('❌ MUSUBI is not initialized in this directory.\n'));
      process.exit(1);
    }

    console.log(chalk.white(`Project version: ${chalk.yellow(currentVersion)}`));
    console.log(chalk.white(`Package version: ${chalk.green(packageJson.version)}`));

    const comparison = compareVersions(currentVersion, packageJson.version);
    if (comparison < 0) {
      console.log(chalk.yellow(`\n⚠️  Upgrade available: ${currentVersion} → ${packageJson.version}`));
      console.log(chalk.gray('\nRun: npx musubi-sdd upgrade\n'));
    } else {
      console.log(chalk.green('\n✅ Project is up to date.\n'));
    }
  });

program.parse(process.argv);

// Show help if no arguments
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
