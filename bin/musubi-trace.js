#!/usr/bin/env node

/**
 * MUSUBI Traceability System CLI
 * 
 * Provides end-to-end traceability from requirements to code to tests
 * Ensures 100% coverage and detects gaps
 * 
 * Usage:
 *   musubi-trace matrix                      # Generate full traceability matrix
 *   musubi-trace coverage                    # Calculate requirement coverage
 *   musubi-trace gaps                        # Detect orphaned requirements/code
 *   musubi-trace requirement <id>            # Trace specific requirement
 *   musubi-trace validate                    # Validate 100% coverage
 */

const { Command } = require('commander');
const chalk = require('chalk');
const TraceabilityAnalyzer = require('../src/analyzers/traceability');

const program = new Command();

program
  .name('musubi-trace')
  .description('MUSUBI Traceability System - End-to-end requirement traceability')
  .version('0.8.5');

// Generate traceability matrix
program
  .command('matrix')
  .description('Generate full traceability matrix')
  .option('-f, --format <type>', 'Output format (table|markdown|json|html)', 'table')
  .option('-o, --output <path>', 'Output file path')
  .option('--requirements <path>', 'Requirements directory', 'docs/requirements')
  .option('--design <path>', 'Design directory', 'docs/design')
  .option('--tasks <path>', 'Tasks directory', 'docs/tasks')
  .option('--code <path>', 'Source code directory', 'src')
  .option('--tests <path>', 'Tests directory', 'tests')
  .action(async (options) => {
    try {
      console.log(chalk.bold('\n📊 Generating Traceability Matrix\n'));
      
      const analyzer = new TraceabilityAnalyzer(process.cwd());
      const matrix = await analyzer.generateMatrix(options);
      
      if (options.output) {
        const fs = require('fs-extra');
        await fs.writeFile(options.output, analyzer.formatMatrix(matrix, options.format), 'utf-8');
        console.log(chalk.green(`✓ Matrix saved to ${options.output}`));
      } else {
        console.log(analyzer.formatMatrix(matrix, options.format));
      }
      
      console.log();
      console.log(chalk.bold('Summary:'));
      console.log(chalk.dim(`  Requirements: ${matrix.summary.totalRequirements}`));
      console.log(chalk.dim(`  With Design: ${matrix.summary.withDesign} (${matrix.summary.designCoverage}%)`));
      console.log(chalk.dim(`  With Tasks: ${matrix.summary.withTasks} (${matrix.summary.tasksCoverage}%)`));
      console.log(chalk.dim(`  With Code: ${matrix.summary.withCode} (${matrix.summary.codeCoverage}%)`));
      console.log(chalk.dim(`  With Tests: ${matrix.summary.withTests} (${matrix.summary.testsCoverage}%)`));
      console.log();
      
      process.exit(0);
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

// Calculate coverage
program
  .command('coverage')
  .description('Calculate requirement coverage statistics')
  .option('--requirements <path>', 'Requirements directory', 'docs/requirements')
  .option('--design <path>', 'Design directory', 'docs/design')
  .option('--tasks <path>', 'Tasks directory', 'docs/tasks')
  .option('--code <path>', 'Source code directory', 'src')
  .option('--tests <path>', 'Tests directory', 'tests')
  .option('--min-coverage <percent>', 'Minimum required coverage', '100')
  .action(async (options) => {
    try {
      console.log(chalk.bold('\n📈 Calculating Coverage\n'));
      
      const analyzer = new TraceabilityAnalyzer(process.cwd());
      const coverage = await analyzer.calculateCoverage(options);
      
      const minCoverage = parseInt(options.minCoverage);
      
      console.log(chalk.bold('Coverage Report:'));
      console.log();
      
      const stages = [
        { name: 'Requirements → Design', value: coverage.designCoverage, color: coverage.designCoverage >= minCoverage ? chalk.green : chalk.red },
        { name: 'Requirements → Tasks', value: coverage.tasksCoverage, color: coverage.tasksCoverage >= minCoverage ? chalk.green : chalk.red },
        { name: 'Requirements → Code', value: coverage.codeCoverage, color: coverage.codeCoverage >= minCoverage ? chalk.green : chalk.red },
        { name: 'Requirements → Tests', value: coverage.testsCoverage, color: coverage.testsCoverage >= minCoverage ? chalk.green : chalk.red }
      ];
      
      stages.forEach(stage => {
        const bar = '█'.repeat(Math.floor(stage.value / 2));
        console.log(stage.color(`  ${stage.name.padEnd(25)} ${bar} ${stage.value}%`));
      });
      
      console.log();
      console.log(chalk.bold('Overall Coverage:'));
      const overallColor = coverage.overall >= minCoverage ? chalk.green : chalk.red;
      console.log(overallColor(`  ${coverage.overall}% (min: ${minCoverage}%)`));
      console.log();
      
      if (coverage.overall >= minCoverage) {
        console.log(chalk.green('✓ Coverage meets requirements\n'));
        process.exit(0);
      } else {
        console.log(chalk.red('✗ Coverage below minimum threshold\n'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

// Detect gaps
program
  .command('gaps')
  .description('Detect orphaned requirements, design, tasks, and untested code')
  .option('--requirements <path>', 'Requirements directory', 'docs/requirements')
  .option('--design <path>', 'Design directory', 'docs/design')
  .option('--tasks <path>', 'Tasks directory', 'docs/tasks')
  .option('--code <path>', 'Source code directory', 'src')
  .option('--tests <path>', 'Tests directory', 'tests')
  .option('-v, --verbose', 'Show detailed gap information')
  .action(async (options) => {
    try {
      console.log(chalk.bold('\n🔍 Detecting Gaps\n'));
      
      const analyzer = new TraceabilityAnalyzer(process.cwd());
      const gaps = await analyzer.detectGaps(options);
      
      let hasGaps = false;
      
      if (gaps.orphanedRequirements.length > 0) {
        hasGaps = true;
        console.log(chalk.red.bold('Orphaned Requirements (no design/tasks):'));
        gaps.orphanedRequirements.forEach(req => {
          console.log(chalk.red(`  • ${req.id}: ${req.title}`));
          if (options.verbose && req.file) {
            console.log(chalk.dim(`    ${req.file}`));
          }
        });
        console.log();
      }
      
      if (gaps.orphanedDesign.length > 0) {
        hasGaps = true;
        console.log(chalk.yellow.bold('Orphaned Design (no requirements):'));
        gaps.orphanedDesign.forEach(design => {
          console.log(chalk.yellow(`  • ${design.id}: ${design.title}`));
          if (options.verbose && design.file) {
            console.log(chalk.dim(`    ${design.file}`));
          }
        });
        console.log();
      }
      
      if (gaps.orphanedTasks.length > 0) {
        hasGaps = true;
        console.log(chalk.yellow.bold('Orphaned Tasks (no requirements):'));
        gaps.orphanedTasks.forEach(task => {
          console.log(chalk.yellow(`  • ${task.id}: ${task.title}`));
          if (options.verbose && task.file) {
            console.log(chalk.dim(`    ${task.file}`));
          }
        });
        console.log();
      }
      
      if (gaps.untestedCode.length > 0) {
        hasGaps = true;
        console.log(chalk.red.bold('Untested Code (no test coverage):'));
        gaps.untestedCode.forEach(code => {
          console.log(chalk.red(`  • ${code.file}:${code.function || code.class}`));
          if (options.verbose && code.lines) {
            console.log(chalk.dim(`    Lines: ${code.lines}`));
          }
        });
        console.log();
      }
      
      if (gaps.missingTests.length > 0) {
        hasGaps = true;
        console.log(chalk.red.bold('Missing Tests (requirements not tested):'));
        gaps.missingTests.forEach(req => {
          console.log(chalk.red(`  • ${req.id}: ${req.title}`));
        });
        console.log();
      }
      
      if (!hasGaps) {
        console.log(chalk.green('✓ No gaps detected - 100% traceability!\n'));
        process.exit(0);
      } else {
        console.log(chalk.bold('Gap Summary:'));
        console.log(chalk.dim(`  Orphaned Requirements: ${gaps.orphanedRequirements.length}`));
        console.log(chalk.dim(`  Orphaned Design: ${gaps.orphanedDesign.length}`));
        console.log(chalk.dim(`  Orphaned Tasks: ${gaps.orphanedTasks.length}`));
        console.log(chalk.dim(`  Untested Code: ${gaps.untestedCode.length}`));
        console.log(chalk.dim(`  Missing Tests: ${gaps.missingTests.length}`));
        console.log();
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

// Trace specific requirement
program
  .command('requirement <id>')
  .description('Trace specific requirement through design, tasks, code, and tests')
  .option('--requirements <path>', 'Requirements directory', 'docs/requirements')
  .option('--design <path>', 'Design directory', 'docs/design')
  .option('--tasks <path>', 'Tasks directory', 'docs/tasks')
  .option('--code <path>', 'Source code directory', 'src')
  .option('--tests <path>', 'Tests directory', 'tests')
  .action(async (id, options) => {
    try {
      console.log(chalk.bold(`\n🔗 Tracing Requirement: ${id}\n`));
      
      const analyzer = new TraceabilityAnalyzer(process.cwd());
      const trace = await analyzer.traceRequirement(id, options);
      
      if (!trace.requirement) {
        console.log(chalk.red(`✗ Requirement ${id} not found\n`));
        process.exit(1);
      }
      
      console.log(chalk.bold('Requirement:'));
      console.log(chalk.cyan(`  ${trace.requirement.id}: ${trace.requirement.title}`));
      console.log(chalk.dim(`  ${trace.requirement.file}`));
      console.log();
      
      if (trace.design.length > 0) {
        console.log(chalk.bold('Design:'));
        trace.design.forEach(d => {
          console.log(chalk.green(`  ✓ ${d.id}: ${d.title}`));
          console.log(chalk.dim(`    ${d.file}`));
        });
        console.log();
      } else {
        console.log(chalk.yellow('⚠ No design found\n'));
      }
      
      if (trace.tasks.length > 0) {
        console.log(chalk.bold('Tasks:'));
        trace.tasks.forEach(t => {
          console.log(chalk.green(`  ✓ ${t.id}: ${t.title} (${t.status})`));
          console.log(chalk.dim(`    ${t.file}`));
        });
        console.log();
      } else {
        console.log(chalk.yellow('⚠ No tasks found\n'));
      }
      
      if (trace.code.length > 0) {
        console.log(chalk.bold('Code:'));
        trace.code.forEach(c => {
          console.log(chalk.green(`  ✓ ${c.file}:${c.function || c.class}`));
          console.log(chalk.dim(`    Lines: ${c.lines}`));
        });
        console.log();
      } else {
        console.log(chalk.yellow('⚠ No code implementation found\n'));
      }
      
      if (trace.tests.length > 0) {
        console.log(chalk.bold('Tests:'));
        trace.tests.forEach(t => {
          console.log(chalk.green(`  ✓ ${t.file}:${t.test}`));
          console.log(chalk.dim(`    Status: ${t.status || 'passing'}`));
        });
        console.log();
      } else {
        console.log(chalk.red('✗ No tests found\n'));
      }
      
      const coverage = {
        design: trace.design.length > 0,
        tasks: trace.tasks.length > 0,
        code: trace.code.length > 0,
        tests: trace.tests.length > 0
      };
      
      const coveragePercent = Object.values(coverage).filter(Boolean).length * 25;
      const coverageColor = coveragePercent === 100 ? chalk.green : coveragePercent >= 75 ? chalk.yellow : chalk.red;
      
      console.log(chalk.bold('Coverage:'));
      console.log(coverageColor(`  ${coveragePercent}% (${Object.values(coverage).filter(Boolean).length}/4 stages)`));
      console.log();
      
      process.exit(coveragePercent === 100 ? 0 : 1);
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

// Validate 100% coverage
program
  .command('validate')
  .description('Validate 100% traceability coverage (Constitutional Article V)')
  .option('--requirements <path>', 'Requirements directory', 'docs/requirements')
  .option('--design <path>', 'Design directory', 'docs/design')
  .option('--tasks <path>', 'Tasks directory', 'docs/tasks')
  .option('--code <path>', 'Source code directory', 'src')
  .option('--tests <path>', 'Tests directory', 'tests')
  .option('--strict', 'Fail on any gaps (default: true)', true)
  .action(async (options) => {
    try {
      console.log(chalk.bold('\n🔍 Validating Traceability (Article V)\n'));
      
      const analyzer = new TraceabilityAnalyzer(process.cwd());
      const validation = await analyzer.validate(options);
      
      console.log(chalk.bold('Article V: Complete Traceability'));
      console.log();
      
      if (validation.passed) {
        console.log(chalk.green('✓ 100% traceability achieved'));
        console.log(chalk.dim(`  Requirements: ${validation.coverage.totalRequirements}`));
        console.log(chalk.dim(`  Design Coverage: ${validation.coverage.designCoverage}%`));
        console.log(chalk.dim(`  Tasks Coverage: ${validation.coverage.tasksCoverage}%`));
        console.log(chalk.dim(`  Code Coverage: ${validation.coverage.codeCoverage}%`));
        console.log(chalk.dim(`  Test Coverage: ${validation.coverage.testsCoverage}%`));
        console.log();
        process.exit(0);
      } else {
        console.log(chalk.red('✗ Traceability gaps detected'));
        console.log();
        
        if (validation.gaps.orphanedRequirements.length > 0) {
          console.log(chalk.red(`  Orphaned Requirements: ${validation.gaps.orphanedRequirements.length}`));
        }
        if (validation.gaps.untestedCode.length > 0) {
          console.log(chalk.red(`  Untested Code: ${validation.gaps.untestedCode.length}`));
        }
        if (validation.gaps.missingTests.length > 0) {
          console.log(chalk.red(`  Missing Tests: ${validation.gaps.missingTests.length}`));
        }
        
        console.log();
        console.log(chalk.dim('Run `musubi-trace gaps` for detailed gap analysis'));
        console.log();
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
