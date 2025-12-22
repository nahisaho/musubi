#!/usr/bin/env node

/**
 * MUSUBI Release CLI
 *
 * Automate release process including:
 * - Version bumping
 * - CHANGELOG generation
 * - Git tagging
 * - npm publishing
 *
 * Usage:
 *   musubi-release patch|minor|major [options]
 *   musubi-release changelog
 *   musubi-release notes
 */

const { program } = require('commander');
const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { ChangelogGenerator } = require('../src/generators/changelog-generator');

const projectRoot = process.cwd();

/**
 * Read package.json
 */
async function readPackageJson() {
  const packagePath = path.join(projectRoot, 'package.json');
  if (await fs.pathExists(packagePath)) {
    return JSON.parse(await fs.readFile(packagePath, 'utf8'));
  }
  return null;
}

/**
 * Write package.json
 */
async function writePackageJson(pkg) {
  const packagePath = path.join(projectRoot, 'package.json');
  await fs.writeFile(packagePath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

/**
 * Get current version
 */
async function getCurrentVersion() {
  const pkg = await readPackageJson();
  return pkg?.version || '0.0.0';
}

/**
 * Bump version
 */
function bumpVersion(version, type) {
  const parts = version.split('.').map(Number);

  switch (type) {
    case 'major':
      return `${parts[0] + 1}.0.0`;
    case 'minor':
      return `${parts[0]}.${parts[1] + 1}.0`;
    case 'patch':
      return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
    default:
      // If type is a specific version, return it
      if (/^\d+\.\d+\.\d+/.test(type)) {
        return type;
      }
      throw new Error(`Invalid version type: ${type}`);
  }
}

/**
 * Run pre-release checks
 */
async function preReleaseChecks(options) {
  const checks = [];

  // Check for uncommitted changes
  if (!options.skipGitCheck) {
    try {
      const status = execSync('git status --porcelain', {
        cwd: projectRoot,
        encoding: 'utf8',
      });
      if (status.trim()) {
        checks.push({
          name: 'Uncommitted changes',
          passed: false,
          message: 'You have uncommitted changes',
        });
      } else {
        checks.push({ name: 'Git status', passed: true });
      }
    } catch {
      checks.push({ name: 'Git status', passed: false, message: 'Git not available' });
    }
  }

  // Run tests
  if (!options.skipTests) {
    try {
      console.log(chalk.gray('  Running tests...'));
      execSync('npm test', { cwd: projectRoot, stdio: 'pipe' });
      checks.push({ name: 'Tests', passed: true });
    } catch {
      checks.push({ name: 'Tests', passed: false, message: 'Tests failed' });
    }
  }

  // Check coverage (if available)
  if (!options.skipCoverage) {
    try {
      const coveragePath = path.join(projectRoot, 'coverage/coverage-summary.json');
      if (await fs.pathExists(coveragePath)) {
        const coverage = JSON.parse(await fs.readFile(coveragePath, 'utf8'));
        const totalCoverage = coverage.total?.lines?.pct || 0;
        const threshold = options.coverageThreshold || 70;

        if (totalCoverage >= threshold) {
          checks.push({
            name: 'Coverage',
            passed: true,
            message: `${totalCoverage}% >= ${threshold}%`,
          });
        } else {
          checks.push({
            name: 'Coverage',
            passed: false,
            message: `${totalCoverage}% < ${threshold}%`,
          });
        }
      }
    } catch {
      // Coverage check optional
    }
  }

  return checks;
}

/**
 * Create git tag
 */
function createGitTag(version, message) {
  try {
    execSync(`git tag -a v${version} -m "${message}"`, {
      cwd: projectRoot,
      encoding: 'utf8',
    });
    return true;
  } catch (error) {
    console.error(chalk.yellow(`Warning: Could not create tag: ${error.message}`));
    return false;
  }
}

/**
 * Push to remote
 */
function pushToRemote(includeTags = true) {
  try {
    if (includeTags) {
      execSync('git push --follow-tags', { cwd: projectRoot, encoding: 'utf8' });
    } else {
      execSync('git push', { cwd: projectRoot, encoding: 'utf8' });
    }
    return true;
  } catch (error) {
    console.error(chalk.yellow(`Warning: Could not push: ${error.message}`));
    return false;
  }
}

/**
 * Publish to npm
 */
function publishToNpm(options = {}) {
  try {
    let cmd = 'npm publish';
    if (options.access) cmd += ` --access ${options.access}`;
    if (options.tag) cmd += ` --tag ${options.tag}`;
    if (options.dryRun) cmd += ' --dry-run';

    execSync(cmd, { cwd: projectRoot, stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(chalk.red(`Error publishing: ${error.message}`));
    return false;
  }
}

// CLI Commands
program
  .name('musubi-release')
  .description('MUSUBI Release Manager - Automate release process')
  .version('1.0.0');

program
  .command('bump <type>')
  .description('Bump version and prepare release (type: patch, minor, major, or specific version)')
  .option('--skip-tests', 'Skip running tests')
  .option('--skip-coverage', 'Skip coverage check')
  .option('--skip-git-check', 'Skip git status check')
  .option('--skip-changelog', 'Skip CHANGELOG update')
  .option('--no-tag', 'Skip git tag creation')
  .option('--no-push', 'Skip pushing to remote')
  .option('--dry-run', 'Show what would be done without making changes')
  .action(async (type, options) => {
    try {
      console.log(chalk.bold('\n🚀 MUSUBI Release Manager\n'));

      // Get current version
      const currentVersion = await getCurrentVersion();
      const newVersion = bumpVersion(currentVersion, type);

      console.log(chalk.white(`  Current version: ${chalk.gray(currentVersion)}`));
      console.log(chalk.white(`  New version:     ${chalk.cyan(newVersion)}`));
      console.log();

      // Pre-release checks
      console.log(chalk.bold('📋 Pre-release checks:\n'));
      const checks = await preReleaseChecks(options);

      let allPassed = true;
      for (const check of checks) {
        if (check.passed) {
          console.log(
            chalk.green(`  ✅ ${check.name}${check.message ? `: ${check.message}` : ''}`)
          );
        } else {
          console.log(chalk.red(`  ❌ ${check.name}: ${check.message}`));
          allPassed = false;
        }
      }

      if (!allPassed && !options.dryRun) {
        console.log(chalk.red('\n❌ Pre-release checks failed. Use --skip-* options to bypass.'));
        process.exit(1);
      }

      if (options.dryRun) {
        console.log(chalk.yellow('\n🔍 Dry run - no changes made'));
        return;
      }

      console.log();

      // Update package.json
      console.log(chalk.white('  📦 Updating package.json...'));
      const pkg = await readPackageJson();
      if (pkg) {
        pkg.version = newVersion;
        await writePackageJson(pkg);
        console.log(chalk.green('     Done'));
      }

      // Update CHANGELOG
      if (!options.skipChangelog) {
        console.log(chalk.white('  📝 Updating CHANGELOG...'));
        const generator = new ChangelogGenerator(projectRoot);
        const result = await generator.update(newVersion);
        console.log(chalk.green(`     Added ${result.commitCount} commits`));
      }

      // Git commit
      console.log(chalk.white('  💾 Committing changes...'));
      execSync(`git add -A && git commit -m "chore(release): v${newVersion}"`, {
        cwd: projectRoot,
        encoding: 'utf8',
      });
      console.log(chalk.green('     Done'));

      // Create tag
      if (options.tag !== false) {
        console.log(chalk.white('  🏷️  Creating git tag...'));
        createGitTag(newVersion, `Release v${newVersion}`);
        console.log(chalk.green('     Done'));
      }

      // Push
      if (options.push !== false) {
        console.log(chalk.white('  ⬆️  Pushing to remote...'));
        pushToRemote(options.tag !== false);
        console.log(chalk.green('     Done'));
      }

      console.log(chalk.green(`\n✅ Released v${newVersion}!\n`));
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('publish')
  .description('Publish to npm')
  .option('--access <access>', 'Package access level (public/restricted)')
  .option('--tag <tag>', 'npm dist-tag')
  .option('--dry-run', 'Run npm publish --dry-run')
  .action(async options => {
    console.log(chalk.bold('\n📦 Publishing to npm...\n'));

    const success = publishToNpm(options);
    if (success) {
      console.log(chalk.green('\n✅ Published successfully!'));
    } else {
      process.exit(1);
    }
  });

program
  .command('changelog')
  .description('Generate or update CHANGELOG')
  .option('-v, --version <version>', 'Version for the changelog entry')
  .option('-f, --from <tag>', 'Starting tag for commit range')
  .action(async options => {
    try {
      console.log(chalk.bold('\n📝 Generating CHANGELOG...\n'));

      const generator = new ChangelogGenerator(projectRoot);
      const version = options.version || (await getCurrentVersion());
      const result = await generator.update(version, options.from);

      console.log(chalk.white(`  Version: ${result.version}`));
      console.log(chalk.white(`  Commits: ${result.commitCount}`));
      console.log();

      // Show category breakdown
      for (const [category, commits] of Object.entries(result.categories)) {
        if (commits.length > 0) {
          console.log(chalk.gray(`  ${category}: ${commits.length}`));
        }
      }

      console.log(chalk.green('\n✅ CHANGELOG updated!'));
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('notes')
  .description('Generate release notes')
  .option('-v, --version <version>', 'Version for the release notes')
  .option('-f, --from <tag>', 'Starting tag for commit range')
  .option('-o, --output <file>', 'Output file (default: stdout)')
  .action(async options => {
    try {
      const generator = new ChangelogGenerator(projectRoot);
      const version = options.version || (await getCurrentVersion());
      const notes = generator.generateReleaseNotes(version, options.from);

      if (options.output) {
        await fs.writeFile(options.output, notes, 'utf8');
        console.log(chalk.green(`✅ Release notes written to ${options.output}`));
      } else {
        console.log(notes);
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show release status')
  .action(async () => {
    try {
      console.log(chalk.bold('\n📊 Release Status\n'));

      const currentVersion = await getCurrentVersion();
      console.log(chalk.white(`  Current version: ${chalk.cyan(currentVersion)}`));

      // Get last tag
      try {
        const lastTag = execSync('git describe --tags --abbrev=0', {
          cwd: projectRoot,
          encoding: 'utf8',
        }).trim();
        console.log(chalk.white(`  Last tag: ${chalk.gray(lastTag)}`));

        // Count commits since last tag
        const commitCount = execSync(`git rev-list ${lastTag}..HEAD --count`, {
          cwd: projectRoot,
          encoding: 'utf8',
        }).trim();
        console.log(chalk.white(`  Commits since tag: ${chalk.yellow(commitCount)}`));
      } catch {
        console.log(chalk.gray('  No tags found'));
      }

      // Check for uncommitted changes
      const status = execSync('git status --porcelain', {
        cwd: projectRoot,
        encoding: 'utf8',
      });
      if (status.trim()) {
        console.log(chalk.yellow('  Uncommitted changes: Yes'));
      } else {
        console.log(chalk.green('  Uncommitted changes: No'));
      }

      console.log();
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

program.parse();
