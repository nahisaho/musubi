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
  .version('1.0.0');

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
  .action(async options => {
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
      console.log(
        chalk.dim(`  With Design: ${matrix.summary.withDesign} (${matrix.summary.designCoverage}%)`)
      );
      console.log(
        chalk.dim(`  With Tasks: ${matrix.summary.withTasks} (${matrix.summary.tasksCoverage}%)`)
      );
      console.log(
        chalk.dim(`  With Code: ${matrix.summary.withCode} (${matrix.summary.codeCoverage}%)`)
      );
      console.log(
        chalk.dim(`  With Tests: ${matrix.summary.withTests} (${matrix.summary.testsCoverage}%)`)
      );
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
  .action(async options => {
    try {
      console.log(chalk.bold('\n📈 Calculating Coverage\n'));

      const analyzer = new TraceabilityAnalyzer(process.cwd());
      const coverage = await analyzer.calculateCoverage(options);

      const minCoverage = parseInt(options.minCoverage);

      console.log(chalk.bold('Coverage Report:'));
      console.log();

      const stages = [
        {
          name: 'Requirements → Design',
          value: coverage.designCoverage,
          color: coverage.designCoverage >= minCoverage ? chalk.green : chalk.red,
        },
        {
          name: 'Requirements → Tasks',
          value: coverage.tasksCoverage,
          color: coverage.tasksCoverage >= minCoverage ? chalk.green : chalk.red,
        },
        {
          name: 'Requirements → Code',
          value: coverage.codeCoverage,
          color: coverage.codeCoverage >= minCoverage ? chalk.green : chalk.red,
        },
        {
          name: 'Requirements → Tests',
          value: coverage.testsCoverage,
          color: coverage.testsCoverage >= minCoverage ? chalk.green : chalk.red,
        },
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
  .action(async options => {
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
        tests: trace.tests.length > 0,
      };

      const coveragePercent = Object.values(coverage).filter(Boolean).length * 25;
      const coverageColor =
        coveragePercent === 100 ? chalk.green : coveragePercent >= 75 ? chalk.yellow : chalk.red;

      console.log(chalk.bold('Coverage:'));
      console.log(
        coverageColor(
          `  ${coveragePercent}% (${Object.values(coverage).filter(Boolean).length}/4 stages)`
        )
      );
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
  .action(async options => {
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
          console.log(
            chalk.red(`  Orphaned Requirements: ${validation.gaps.orphanedRequirements.length}`)
          );
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

// Bidirectional traceability analysis
program
  .command('bidirectional')
  .description('Analyze bidirectional traceability (forward and backward)')
  .option('--requirements <path>', 'Requirements directory', 'docs/requirements')
  .option('--design <path>', 'Design directory', 'docs/design')
  .option('--tasks <path>', 'Tasks directory', 'docs/tasks')
  .option('--code <path>', 'Source code directory', 'src')
  .option('--tests <path>', 'Tests directory', 'tests')
  .option('-f, --format <type>', 'Output format (table|json)', 'table')
  .option('-o, --output <path>', 'Output file path')
  .action(async options => {
    try {
      console.log(chalk.bold('\n🔄 Bidirectional Traceability Analysis\n'));

      const analyzer = new TraceabilityAnalyzer(process.cwd());
      const result = await analyzer.analyzeBidirectional(options);

      console.log(chalk.bold('Forward Traceability (Requirements → Tests):'));
      console.log(
        chalk.dim(
          `  Complete: ${result.completeness.forwardComplete}/${result.completeness.forwardTotal} (${result.completeness.forwardPercentage}%)`
        )
      );
      console.log();

      console.log(chalk.bold('Backward Traceability (Tests → Requirements):'));
      console.log(
        chalk.dim(
          `  Complete: ${result.completeness.backwardComplete}/${result.completeness.backwardTotal} (${result.completeness.backwardPercentage}%)`
        )
      );
      console.log();

      console.log(chalk.bold('Orphaned Items:'));
      console.log(chalk.dim(`  Requirements: ${result.orphaned.requirements.length}`));
      console.log(chalk.dim(`  Design: ${result.orphaned.design.length}`));
      console.log(chalk.dim(`  Tasks: ${result.orphaned.tasks.length}`));
      console.log(chalk.dim(`  Code: ${result.orphaned.code.length}`));
      console.log(chalk.dim(`  Tests: ${result.orphaned.tests.length}`));
      console.log();

      if (options.format === 'json') {
        const output = JSON.stringify(result, null, 2);
        if (options.output) {
          const fs = require('fs-extra');
          await fs.writeFile(options.output, output, 'utf-8');
          console.log(chalk.green(`✓ Report saved to ${options.output}\n`));
        } else {
          console.log(output);
        }
      }

      const allComplete =
        result.completeness.forwardPercentage === 100 &&
        result.completeness.backwardPercentage === 100;

      if (allComplete) {
        console.log(chalk.green('✓ 100% bidirectional traceability achieved!\n'));
        process.exit(0);
      } else {
        console.log(chalk.yellow('⚠ Incomplete bidirectional traceability\n'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

// Impact analysis
program
  .command('impact <requirementId>')
  .description('Analyze impact of requirement changes')
  .option('--design <path>', 'Design directory', 'docs/design')
  .option('--tasks <path>', 'Tasks directory', 'docs/tasks')
  .option('--code <path>', 'Source code directory', 'src')
  .option('--tests <path>', 'Tests directory', 'tests')
  .option('-f, --format <type>', 'Output format (table|json)', 'table')
  .option('-o, --output <path>', 'Output file path')
  .action(async (requirementId, options) => {
    try {
      console.log(chalk.bold(`\n💥 Impact Analysis: ${requirementId}\n`));

      const analyzer = new TraceabilityAnalyzer(process.cwd());
      const impact = await analyzer.analyzeImpact(requirementId, options);

      console.log(chalk.bold('Impacted Items:'));
      console.log(chalk.dim(`  Design Documents: ${impact.counts.design}`));
      console.log(chalk.dim(`  Tasks: ${impact.counts.tasks}`));
      console.log(chalk.dim(`  Code Files: ${impact.counts.code}`));
      console.log(chalk.dim(`  Test Files: ${impact.counts.tests}`));
      console.log(chalk.dim(`  Total: ${impact.counts.total}`));
      console.log();

      console.log(chalk.bold('Estimated Effort:'));
      console.log(chalk.dim(`  Design: ${impact.effort.design} hours`));
      console.log(chalk.dim(`  Tasks: ${impact.effort.tasks} hours`));
      console.log(chalk.dim(`  Code: ${impact.effort.code} hours`));
      console.log(chalk.dim(`  Tests: ${impact.effort.tests} hours`));
      console.log(
        chalk.yellow(`  Total: ${impact.effort.total} hours (${impact.effort.estimate})`)
      );
      console.log();

      if (options.format === 'json') {
        const output = JSON.stringify(impact, null, 2);
        if (options.output) {
          const fs = require('fs-extra');
          await fs.writeFile(options.output, output, 'utf-8');
          console.log(chalk.green(`✓ Impact analysis saved to ${options.output}\n`));
        } else {
          console.log(output);
        }
      }

      if (impact.counts.total === 0) {
        console.log(chalk.green('✓ No impact - requirement is not implemented\n'));
      } else if (impact.counts.total <= 5) {
        console.log(chalk.green('✓ Low impact - minimal changes required\n'));
      } else if (impact.counts.total <= 15) {
        console.log(chalk.yellow('⚠ Medium impact - moderate changes required\n'));
      } else {
        console.log(chalk.red('⚠ High impact - significant changes required\n'));
      }

      process.exit(0);
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

// Statistics
program
  .command('statistics')
  .description('Generate comprehensive traceability statistics')
  .option('--requirements <path>', 'Requirements directory', 'docs/requirements')
  .option('--design <path>', 'Design directory', 'docs/design')
  .option('--tasks <path>', 'Tasks directory', 'docs/tasks')
  .option('--code <path>', 'Source code directory', 'src')
  .option('--tests <path>', 'Tests directory', 'tests')
  .option('-f, --format <type>', 'Output format (table|json)', 'table')
  .option('-o, --output <path>', 'Output file path')
  .action(async options => {
    try {
      console.log(chalk.bold('\n📊 Traceability Statistics\n'));

      const analyzer = new TraceabilityAnalyzer(process.cwd());
      const stats = await analyzer.generateStatistics(options);

      console.log(chalk.bold('Document Counts:'));
      console.log(chalk.dim(`  Requirements: ${stats.counts.requirements}`));
      console.log(chalk.dim(`  Design Documents: ${stats.counts.design}`));
      console.log(chalk.dim(`  Tasks: ${stats.counts.tasks}`));
      console.log(chalk.dim(`  Code Files: ${stats.counts.code}`));
      console.log(chalk.dim(`  Test Files: ${stats.counts.tests}`));
      console.log();

      console.log(chalk.bold('Coverage Statistics:'));
      console.log(
        chalk.dim(
          `  Requirements with Design: ${stats.coverage.requirementsWithDesign}/${stats.counts.requirements} (${stats.percentages.designCoverage}%)`
        )
      );
      console.log(
        chalk.dim(
          `  Requirements with Tasks: ${stats.coverage.requirementsWithTasks}/${stats.counts.requirements} (${stats.percentages.tasksCoverage}%)`
        )
      );
      console.log(
        chalk.dim(
          `  Requirements with Code: ${stats.coverage.requirementsWithCode}/${stats.counts.requirements} (${stats.percentages.codeCoverage}%)`
        )
      );
      console.log(
        chalk.dim(
          `  Requirements with Tests: ${stats.coverage.requirementsWithTests}/${stats.counts.requirements} (${stats.percentages.testCoverage}%)`
        )
      );
      console.log(
        chalk.dim(
          `  Code with Tests: ${stats.coverage.codeWithTests}/${stats.counts.code} (${stats.percentages.codeTestCoverage}%)`
        )
      );
      console.log(
        chalk.dim(
          `  Tasks Completed: ${stats.coverage.tasksCompleted}/${stats.counts.tasks} (${stats.percentages.taskCompletion}%)`
        )
      );
      console.log();

      const gradeColor =
        stats.health.grade === 'A'
          ? chalk.green
          : stats.health.grade === 'B'
            ? chalk.green
            : stats.health.grade === 'C'
              ? chalk.yellow
              : chalk.red;

      console.log(chalk.bold('Project Health:'));
      console.log(gradeColor(`  Grade: ${stats.health.grade}`));
      console.log(gradeColor(`  Status: ${stats.health.status}`));
      console.log();

      if (options.format === 'json') {
        const output = JSON.stringify(stats, null, 2);
        if (options.output) {
          const fs = require('fs-extra');
          await fs.writeFile(options.output, output, 'utf-8');
          console.log(chalk.green(`✓ Statistics saved to ${options.output}\n`));
        } else {
          console.log(output);
        }
      }

      process.exit(0);
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
