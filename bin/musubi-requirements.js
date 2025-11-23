#!/usr/bin/env node

/**
 * MUSUBI Requirements Generator CLI
 * 
 * Generates EARS (Easy Approach to Requirements Syntax) formatted requirements
 * Supports 5 EARS patterns for unambiguous specification
 * 
 * Usage:
 *   musubi-requirements init <feature>          # Initialize requirements document
 *   musubi-requirements add <pattern> <title>   # Add requirement with EARS pattern
 *   musubi-requirements list                    # List all requirements
 *   musubi-requirements validate                # Validate EARS format compliance
 *   musubi-requirements trace                   # Show traceability matrix
 */

const { Command } = require('commander');
const chalk = require('chalk');
const inquirer = require('inquirer');
const RequirementsGenerator = require('../src/generators/requirements');

const program = new Command();

program
  .name('musubi-requirements')
  .description('EARS Requirements Generator - Create unambiguous specifications')
  .version('0.9.4');

// Initialize requirements document
program
  .command('init <feature>')
  .description('Initialize requirements document for a feature')
  .option('-o, --output <path>', 'Output directory', 'docs/requirements')
  .option('-a, --author <name>', 'Author name')
  .option('--project <name>', 'Project name')
  .option('--dry-run', 'Show what would be created without writing files')
  .option('--verbose', 'Show detailed output')
  .option('--json', 'Output result as JSON')
  .action(async (feature, options) => {
    try {
      if (!options.json && !options.dryRun) {
        console.log(chalk.bold(`\n📋 Initializing requirements for: ${feature}\n`));
      }
      
      if (options.verbose && !options.json) {
        console.log(chalk.dim('Options:'));
        console.log(chalk.dim(`  Output: ${options.output}`));
        console.log(chalk.dim(`  Author: ${options.author || 'Not specified'}`));
        console.log(chalk.dim(`  Project: ${options.project || 'Not specified'}`));
        console.log(chalk.dim(`  Dry run: ${options.dryRun || false}`));
        console.log();
      }
      
      const generator = new RequirementsGenerator(process.cwd());
      const result = await generator.init(feature, options);
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else if (options.dryRun) {
        console.log(chalk.yellow('🔍 Dry run - No files created'));
        console.log(chalk.dim(`\n  Would create: ${result.path}`));
        console.log(chalk.dim('  Template: EARS requirements document'));
        console.log(chalk.dim(`  Feature: ${feature}`));
        console.log();
      } else {
        console.log(chalk.green('✓ Requirements document created'));
        console.log(chalk.dim(`  ${result.path}`));
        console.log();
        console.log(chalk.bold('Next steps:'));
        console.log(chalk.dim(`  1. Edit ${result.path}`));
        console.log(chalk.dim('  2. Add requirements: musubi-requirements add <pattern> <title>'));
        console.log(chalk.dim('  3. Validate: musubi-requirements validate'));
        console.log();
      }
      
      process.exit(0);
    } catch (error) {
      if (options.json) {
        console.error(JSON.stringify({ error: error.message, stack: error.stack }, null, 2));
      } else {
        console.error(chalk.red('✗ Error:'), error.message);
        if (options.verbose) {
          console.error(chalk.dim(error.stack));
        }
      }
      process.exit(1);
    }
  });

// Add requirement with EARS pattern
program
  .command('add')
  .description('Add requirement with EARS pattern (interactive)')
  .option('-f, --file <path>', 'Requirements file path')
  .option('-p, --pattern <type>', 'EARS pattern (ubiquitous|event|state|unwanted|optional)')
  .option('-t, --title <text>', 'Requirement title')
  .action(async (options) => {
    try {
      console.log(chalk.bold('\n📝 Add EARS Requirement\n'));
      
      const generator = new RequirementsGenerator(process.cwd());
      
      // Find requirements file
      let reqFile = options.file;
      if (!reqFile) {
        const files = await generator.findRequirementsFiles();
        if (files.length === 0) {
          console.error(chalk.red('✗ No requirements files found'));
          console.log(chalk.dim('  Run: musubi-requirements init <feature>'));
          process.exit(1);
        }
        
        if (files.length === 1) {
          reqFile = files[0];
        } else {
          const answer = await inquirer.prompt([{
            type: 'list',
            name: 'file',
            message: 'Select requirements file:',
            choices: files
          }]);
          reqFile = answer.file;
        }
      }
      
      // Interactive prompts if not provided
      let pattern = options.pattern;
      let title = options.title;
      
      if (!pattern || !title) {
        const answers = await inquirer.prompt([
          {
            type: 'list',
            name: 'pattern',
            message: 'Select EARS pattern:',
            choices: [
              { name: 'Ubiquitous - The [system] SHALL [requirement]', value: 'ubiquitous' },
              { name: 'Event-Driven - WHEN [event], THEN [system] SHALL [response]', value: 'event' },
              { name: 'State-Driven - WHILE [state], [system] SHALL [response]', value: 'state' },
              { name: 'Unwanted Behavior - IF [error], THEN [system] SHALL [response]', value: 'unwanted' },
              { name: 'Optional Feature - WHERE [feature], [system] SHALL [response]', value: 'optional' }
            ],
            when: () => !pattern
          },
          {
            type: 'input',
            name: 'title',
            message: 'Requirement title:',
            when: () => !title,
            validate: (input) => input.length > 0 || 'Title is required'
          },
          {
            type: 'input',
            name: 'system',
            message: 'System/component name:',
            default: 'system'
          },
          {
            type: 'input',
            name: 'statement',
            message: (answers) => {
              const prompts = {
                ubiquitous: 'What SHALL the system do?',
                event: 'What event triggers this? (WHEN...)',
                state: 'What state/condition? (WHILE...)',
                unwanted: 'What error/unwanted condition? (IF...)',
                optional: 'What optional feature? (WHERE...)'
              };
              return prompts[answers.pattern || pattern];
            },
            validate: (input) => input.length > 0 || 'Statement is required'
          },
          {
            type: 'input',
            name: 'response',
            message: 'What SHALL the system do? (response)',
            validate: (input) => input.length > 0 || 'Response is required'
          },
          {
            type: 'input',
            name: 'criteria',
            message: 'Acceptance criteria (comma-separated):',
            filter: (input) => input.split(',').map(s => s.trim()).filter(s => s.length > 0)
          }
        ]);
        
        pattern = pattern || answers.pattern;
        title = title || answers.title;
        
        const requirement = {
          pattern,
          title,
          system: answers.system,
          statement: answers.statement,
          response: answers.response,
          criteria: answers.criteria
        };
        
        const result = await generator.addRequirement(reqFile, requirement);
        
        console.log(chalk.green('\n✓ Requirement added:'));
        console.log(chalk.dim(`  ${result.id}: ${title}`));
        console.log(chalk.bold('\n📄 EARS Statement:'));
        console.log(chalk.cyan(result.statement));
        console.log();
        
        process.exit(0);
      }
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

// List all requirements
program
  .command('list')
  .description('List all requirements in the project')
  .option('-f, --file <path>', 'Specific requirements file')
  .option('--format <type>', 'Output format (table|json|markdown)', 'table')
  .action(async (options) => {
    try {
      const generator = new RequirementsGenerator(process.cwd());
      const requirements = await generator.listRequirements(options.file);
      
      if (requirements.length === 0) {
        console.log(chalk.yellow('No requirements found'));
        process.exit(0);
      }
      
      console.log(chalk.bold(`\n📋 Requirements (${requirements.length} total)\n`));
      
      if (options.format === 'json') {
        console.log(JSON.stringify(requirements, null, 2));
      } else if (options.format === 'markdown') {
        requirements.forEach(req => {
          console.log(`## ${req.id}: ${req.title}`);
          console.log();
          console.log(`**Pattern**: ${req.pattern}`);
          console.log();
          console.log(req.statement);
          console.log();
        });
      } else {
        // Table format
        requirements.forEach(req => {
          console.log(chalk.bold(`${req.id}: ${req.title}`));
          console.log(chalk.dim(`  Pattern: ${req.pattern}`));
          console.log(chalk.cyan(`  ${req.statement.substring(0, 100)}...`));
          console.log();
        });
      }
      
      process.exit(0);
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

// Validate EARS format compliance
program
  .command('validate')
  .description('Validate requirements against EARS format')
  .option('-f, --file <path>', 'Specific requirements file')
  .option('-v, --verbose', 'Show detailed validation results')
  .action(async (options) => {
    try {
      console.log(chalk.bold('\n🔍 Validating EARS Requirements\n'));
      
      const generator = new RequirementsGenerator(process.cwd());
      const results = await generator.validate(options.file);
      
      if (results.passed) {
        console.log(chalk.green('✓ All requirements valid\n'));
      } else {
        console.log(chalk.red('✗ Validation failed\n'));
      }
      
      console.log(chalk.bold('Summary:'));
      console.log(chalk.dim(`  Total: ${results.total}`));
      console.log(chalk.green(`  Valid: ${results.valid}`));
      console.log(chalk.red(`  Invalid: ${results.invalid}`));
      console.log();
      
      if (results.violations.length > 0) {
        console.log(chalk.bold.red('Violations:'));
        results.violations.forEach(v => {
          console.log(chalk.red(`  • ${v}`));
        });
        console.log();
      }
      
      if (options.verbose && results.details) {
        console.log(chalk.bold('Details:'));
        results.details.forEach(d => {
          const icon = d.valid ? chalk.green('✓') : chalk.red('✗');
          console.log(`  ${icon} ${d.id}: ${d.message}`);
        });
        console.log();
      }
      
      process.exit(results.passed ? 0 : 1);
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

// Show quality metrics
program
  .command('metrics')
  .description('Calculate and display quality metrics for requirements')
  .option('-f, --file <path>', 'Specific requirements file')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const generator = new RequirementsGenerator(process.cwd());
      const metrics = await generator.calculateQualityMetrics(options.file);
      
      if (options.json) {
        console.log(JSON.stringify(metrics, null, 2));
      } else {
        console.log(chalk.bold('\n📊 Requirements Quality Metrics\n'));
        
        console.log(chalk.bold('Overview:'));
        console.log(chalk.dim(`  Total Requirements: ${metrics.total}`));
        console.log(chalk.green(`  Valid: ${metrics.valid}`));
        console.log(chalk.red(`  Invalid: ${metrics.invalid}`));
        console.log();
        
        console.log(chalk.bold('Pattern Distribution:'));
        console.log(chalk.dim(`  Ubiquitous: ${metrics.patterns.ubiquitous}`));
        console.log(chalk.dim(`  Event-driven: ${metrics.patterns.event}`));
        console.log(chalk.dim(`  State-driven: ${metrics.patterns.state}`));
        console.log(chalk.dim(`  Unwanted behavior: ${metrics.patterns.unwanted}`));
        console.log(chalk.dim(`  Optional: ${metrics.patterns.optional}`));
        if (metrics.patterns.unknown > 0) {
          console.log(chalk.red(`  Unknown: ${metrics.patterns.unknown}`));
        }
        console.log();
        
        console.log(chalk.bold('Quality Indicators:'));
        console.log(chalk.dim(`  Average words per requirement: ${metrics.avgWords}`));
        console.log(chalk.dim(`  Requirements with ambiguous words: ${metrics.ambiguousCount}`));
        console.log(chalk.dim(`  Requirements with vague terms: ${metrics.vagueCount}`));
        console.log(chalk.dim(`  Too short (<5 words): ${metrics.tooShort}`));
        console.log(chalk.dim(`  Too long (>50 words): ${metrics.tooLong}`));
        console.log();
        
        const gradeColor = metrics.qualityScore >= 80 ? 'green' : metrics.qualityScore >= 60 ? 'yellow' : 'red';
        console.log(chalk.bold('Quality Score:'));
        console.log(chalk[gradeColor](`  ${metrics.qualityScore}% (Grade ${metrics.grade})`));
        console.log();
        
        if (metrics.qualityScore < 80) {
          console.log(chalk.bold.yellow('Recommendations:'));
          if (metrics.ambiguousCount > 0) {
            console.log(chalk.yellow('  • Replace ambiguous words (should, could, might, may) with SHALL'));
          }
          if (metrics.vagueCount > 0) {
            console.log(chalk.yellow('  • Remove vague terms (etc, as needed, appropriate) and be specific'));
          }
          if (metrics.tooShort > 0) {
            console.log(chalk.yellow('  • Add more detail to short requirements'));
          }
          if (metrics.tooLong > 0) {
            console.log(chalk.yellow('  • Split long requirements into smaller ones'));
          }
          console.log();
        }
      }
      
      process.exit(0);
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

// Show traceability matrix
program
  .command('trace')
  .description('Show requirements traceability matrix')
  .option('-f, --file <path>', 'Specific requirements file')
  .option('--format <type>', 'Output format (table|json|markdown)', 'table')
  .action(async (options) => {
    try {
      console.log(chalk.bold('\n📊 Requirements Traceability Matrix\n'));
      
      const generator = new RequirementsGenerator(process.cwd());
      const matrix = await generator.generateTraceabilityMatrix(options.file);
      
      if (options.format === 'json') {
        console.log(JSON.stringify(matrix, null, 2));
      } else {
        console.log(chalk.bold('| Requirement | Design | Code | Tests | Status |'));
        console.log('|-------------|--------|------|-------|--------|');
        
        matrix.forEach(row => {
          const design = row.design ? '✓' : '-';
          const code = row.code ? '✓' : '-';
          const tests = row.tests ? '✓' : '-';
          const status = row.complete ? chalk.green('Complete') : chalk.yellow('Incomplete');
          
          console.log(`| ${row.id} | ${design} | ${code} | ${tests} | ${status} |`);
        });
        console.log();
        
        const complete = matrix.filter(r => r.complete).length;
        const total = matrix.length;
        const percentage = total > 0 ? Math.round((complete / total) * 100) : 0;
        
        console.log(chalk.bold('Coverage:'));
        console.log(chalk.dim(`  ${complete}/${total} requirements traced (${percentage}%)`));
        console.log();
      }
      
      process.exit(0);
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
