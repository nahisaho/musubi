#!/usr/bin/env node

/**
 * MUSUBI Gap Detection CLI
 * Identifies orphaned requirements, untested code, and missing traceability
 */

const { Command } = require('commander');
const chalk = require('chalk');
const GapDetector = require('../src/analyzers/gap-detector');

const program = new Command();

program
  .name('musubi-gaps')
  .description('Detect gaps in requirements, code, and test coverage')
  .version('0.8.7');

program
  .command('detect')
  .description('Detect all gaps (requirements, code, tests)')
  .option('--requirements <dir>', 'Requirements directory', 'docs/requirements')
  .option('--design <dir>', 'Design directory', 'docs/design')
  .option('--tasks <dir>', 'Tasks directory', 'docs/tasks')
  .option('--src <dir>', 'Source code directory', 'src')
  .option('--tests <dir>', 'Test directory', 'tests')
  .option('--format <format>', 'Output format (table|json|markdown)', 'table')
  .option('--verbose', 'Show detailed gap information')
  .action(async options => {
    try {
      console.log(chalk.blue('\n🔍 Detecting gaps in traceability...\n'));

      const detector = new GapDetector({
        requirementsDir: options.requirements,
        designDir: options.design,
        tasksDir: options.tasks,
        srcDir: options.src,
        testsDir: options.tests,
      });

      const gaps = await detector.detectAllGaps();

      if (options.format === 'json') {
        console.log(JSON.stringify(gaps, null, 2));
      } else if (options.format === 'markdown') {
        console.log(detector.formatMarkdown(gaps));
      } else {
        detector.displayTable(gaps, options.verbose);
      }

      const totalGaps =
        gaps.orphanedRequirements.length +
        gaps.unimplementedRequirements.length +
        gaps.untestedCode.length +
        gaps.missingTests.length;

      if (totalGaps === 0) {
        console.log(chalk.green('\n✓ No gaps detected! 100% traceability achieved.\n'));
        process.exit(0);
      } else {
        console.log(chalk.yellow(`\n⚠ Found ${totalGaps} gap(s). See details above.\n`));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

program
  .command('requirements')
  .description('Detect orphaned requirements (no design/code)')
  .option('--requirements <dir>', 'Requirements directory', 'docs/requirements')
  .option('--design <dir>', 'Design directory', 'docs/design')
  .option('--tasks <dir>', 'Tasks directory', 'docs/tasks')
  .option('--format <format>', 'Output format (table|json|markdown)', 'table')
  .action(async options => {
    try {
      console.log(chalk.blue('\n🔍 Detecting orphaned requirements...\n'));

      const detector = new GapDetector({
        requirementsDir: options.requirements,
        designDir: options.design,
        tasksDir: options.tasks,
      });

      const orphaned = await detector.detectOrphanedRequirements();

      if (options.format === 'json') {
        console.log(JSON.stringify(orphaned, null, 2));
      } else if (options.format === 'markdown') {
        console.log(detector.formatRequirementsMarkdown(orphaned));
      } else {
        detector.displayRequirementsTable(orphaned);
      }

      if (orphaned.length === 0) {
        console.log(chalk.green('\n✓ No orphaned requirements detected.\n'));
        process.exit(0);
      } else {
        console.log(chalk.yellow(`\n⚠ Found ${orphaned.length} orphaned requirement(s).\n`));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

program
  .command('code')
  .description('Detect untested code')
  .option('--src <dir>', 'Source code directory', 'src')
  .option('--tests <dir>', 'Test directory', 'tests')
  .option('--format <format>', 'Output format (table|json|markdown)', 'table')
  .action(async options => {
    try {
      console.log(chalk.blue('\n🔍 Detecting untested code...\n'));

      const detector = new GapDetector({
        srcDir: options.src,
        testsDir: options.tests,
      });

      const untested = await detector.detectUntestedCode();

      if (options.format === 'json') {
        console.log(JSON.stringify(untested, null, 2));
      } else if (options.format === 'markdown') {
        console.log(detector.formatCodeMarkdown(untested));
      } else {
        detector.displayCodeTable(untested);
      }

      if (untested.length === 0) {
        console.log(chalk.green('\n✓ All code is tested.\n'));
        process.exit(0);
      } else {
        console.log(chalk.yellow(`\n⚠ Found ${untested.length} untested file(s).\n`));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

program
  .command('coverage')
  .description('Calculate coverage statistics')
  .option('--requirements <dir>', 'Requirements directory', 'docs/requirements')
  .option('--design <dir>', 'Design directory', 'docs/design')
  .option('--tasks <dir>', 'Tasks directory', 'docs/tasks')
  .option('--src <dir>', 'Source code directory', 'src')
  .option('--tests <dir>', 'Test directory', 'tests')
  .option('--min-coverage <percent>', 'Minimum required coverage', '100')
  .option('--format <format>', 'Output format (table|json|markdown)', 'table')
  .action(async options => {
    try {
      console.log(chalk.blue('\n📊 Calculating coverage statistics...\n'));

      const detector = new GapDetector({
        requirementsDir: options.requirements,
        designDir: options.design,
        tasksDir: options.tasks,
        srcDir: options.src,
        testsDir: options.tests,
      });

      const coverage = await detector.calculateCoverage();
      const minCoverage = parseFloat(options.minCoverage);

      if (options.format === 'json') {
        console.log(JSON.stringify(coverage, null, 2));
      } else if (options.format === 'markdown') {
        console.log(detector.formatCoverageMarkdown(coverage));
      } else {
        detector.displayCoverageTable(coverage);
      }

      const avgCoverage =
        (coverage.requirements.implementationCoverage +
          coverage.requirements.testCoverage +
          coverage.code.testCoverage) /
        3;

      if (avgCoverage >= minCoverage) {
        console.log(
          chalk.green(`\n✓ Coverage ${avgCoverage.toFixed(1)}% meets minimum ${minCoverage}%\n`)
        );
        process.exit(0);
      } else {
        console.log(
          chalk.red(`\n✗ Coverage ${avgCoverage.toFixed(1)}% below minimum ${minCoverage}%\n`)
        );
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

program.parse(process.argv);
