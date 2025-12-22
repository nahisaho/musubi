#!/usr/bin/env node

/**
 * musubi-config CLI
 *
 * Manage project configuration (project.yml)
 * - validate: Validate project.yml against schema
 * - migrate: Migrate v1.0 to v2.0
 * - show: Display effective configuration
 */

const { Command } = require('commander');
const { ProjectValidator } = require('../src/validators/project-validator');
const chalk = require('chalk');

const program = new Command();

program
  .name('musubi-config')
  .description('MUSUBI Project Configuration Manager')
  .version('1.0.0');

program
  .command('validate')
  .description('Validate project.yml against schema')
  .option('-d, --dir <path>', 'Project directory', process.cwd())
  .option('--strict', 'Treat warnings as errors')
  .action(async options => {
    try {
      const validator = new ProjectValidator(options.dir);
      const result = await validator.validateConfig();

      console.log('\n📋 Project Configuration Validation\n');
      console.log(`Schema Version: ${result.schemaVersion}`);
      console.log(`Valid: ${result.valid ? chalk.green('✓ Yes') : chalk.red('✗ No')}`);

      if (result.needsMigration) {
        console.log(chalk.yellow('\n⚠️  Migration recommended: v1.0 → v2.0'));
        console.log('   Run: musubi-config migrate');
      }

      if (result.errors.length > 0) {
        console.log(chalk.red('\n❌ Errors:'));
        result.errors.forEach(err => {
          console.log(`  • ${err.path}: ${err.message}`);
        });
      }

      if (result.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:'));
        result.warnings.forEach(warn => {
          console.log(`  • ${warn.path}: ${warn.message}`);
        });
      }

      if (result.valid && result.errors.length === 0) {
        console.log(chalk.green('\n✅ Configuration is valid'));
      }

      const exitCode = result.errors.length > 0 || (options.strict && result.warnings.length > 0) ? 1 : 0;
      process.exit(exitCode);
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('migrate')
  .description('Migrate project.yml from v1.0 to v2.0')
  .option('-d, --dir <path>', 'Project directory', process.cwd())
  .option('--dry-run', 'Show changes without saving')
  .action(async options => {
    try {
      const validator = new ProjectValidator(options.dir);
      const result = await validator.migrateToV2();

      console.log('\n📦 Project Configuration Migration\n');

      if (!result.migrated) {
        console.log(chalk.green(result.message));
        return;
      }

      console.log(chalk.cyan('Migration changes:'));
      console.log(`  • schema_version: 1.0 → 2.0`);
      console.log(`  • package_type: ${result.config.package_type}`);
      console.log(`  • workflow.mode: ${result.config.workflow?.mode}`);
      console.log(`  • workflow.auto_detect_mode: ${result.config.workflow?.auto_detect_mode}`);
      console.log(`  • constitution section added`);

      if (options.dryRun) {
        console.log(chalk.yellow('\n[Dry run] No changes saved'));
      } else {
        await validator.saveConfig(result.config);
        console.log(chalk.green('\n✅ Migration complete'));
        console.log(`   Backup saved to: steering/project.yml.backup`);
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('show')
  .description('Display effective configuration')
  .option('-d, --dir <path>', 'Project directory', process.cwd())
  .option('--json', 'Output as JSON')
  .action(async options => {
    try {
      const validator = new ProjectValidator(options.dir);
      const report = await validator.generateReport();

      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      console.log('\n📊 Effective Project Configuration\n');
      console.log(`Project: ${report.projectRoot}`);
      console.log(`Schema Version: ${report.effective.schema_version}`);
      console.log(`Package Type: ${report.effective.package_type}`);
      console.log(`Workflow Mode: ${report.effective.workflow_mode}`);
      console.log(`Coverage Threshold: ${report.effective.coverage_threshold || 80}%`);

      if (report.effective.constitution_overrides) {
        console.log('\nConstitution Overrides:');
        Object.entries(report.effective.constitution_overrides).forEach(([key, value]) => {
          console.log(`  • ${key}: ${JSON.stringify(value)}`);
        });
      }

      console.log('\nValidation:');
      console.log(`  Valid: ${report.validation.valid ? 'Yes' : 'No'}`);
      console.log(`  Errors: ${report.validation.errors.length}`);
      console.log(`  Warnings: ${report.validation.warnings.length}`);
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Create a new project.yml with v2.0 schema')
  .option('-d, --dir <path>', 'Project directory', process.cwd())
  .option('-n, --name <name>', 'Project name')
  .option('-t, --type <type>', 'Package type', 'application')
  .action(async options => {
    try {
      const fs = require('fs-extra');
      const path = require('path');
      const yaml = require('js-yaml');

      const projectRoot = options.dir;
      const configPath = path.join(projectRoot, 'steering/project.yml');

      if (await fs.pathExists(configPath)) {
        console.log(chalk.yellow('project.yml already exists. Use "migrate" to upgrade.'));
        return;
      }

      await fs.ensureDir(path.join(projectRoot, 'steering'));

      const projectName = options.name || path.basename(projectRoot);
      const config = {
        schema_version: '2.0',
        project_name: projectName,
        description: `${projectName} project`,
        version: '0.1.0',
        package_type: options.type,
        languages: ['javascript'],
        frameworks: [],
        conventions: {
          architecture_pattern: 'unknown',
          directory_structure: {},
        },
        steering: {
          auto_update: { enabled: false, frequency: 'on-demand' },
          excluded_paths: ['node_modules/**', 'dist/**', '.git/**'],
          memories: {
            enabled: true,
            path: 'steering/memories/',
            max_file_size_kb: 500,
            retention_days: 365,
          },
        },
        agents: {
          default_language: 'en',
          bilingual_output: { enabled: false, languages: ['en'] },
          output: {
            gradual_generation: true,
            progress_indicators: true,
            large_file_splitting: false,
            split_threshold_lines: 300,
          },
        },
        workflow: {
          mode: 'medium',
          auto_detect_mode: true,
          testing: {
            required: true,
            coverage_threshold: 80,
          },
          quality_gates: [],
        },
        constitution: {
          level_config: 'steering/rules/constitution-levels.yml',
          overrides: {},
        },
        custom_rules: [],
        metadata: {
          created_at: new Date().toISOString(),
          musubi_version: require('../package.json').version,
        },
      };

      await fs.writeFile(configPath, yaml.dump(config, { indent: 2 }), 'utf8');

      console.log(chalk.green('\n✅ Created steering/project.yml (v2.0 schema)'));
      console.log(`   Project: ${projectName}`);
      console.log(`   Type: ${options.type}`);
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program.parse();
