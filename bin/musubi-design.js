#!/usr/bin/env node

/**
 * MUSUBI Design Document Generator CLI
 * 
 * Generates technical design documents with C4 model and ADR
 * Complies with Article V (Traceability) and steering context
 * 
 * Usage:
 *   musubi-design init <feature>           # Initialize design document
 *   musubi-design add-c4 <level>           # Add C4 diagram (context|container|component|code)
 *   musubi-design add-adr <decision>       # Add Architecture Decision Record
 *   musubi-design validate                 # Validate design completeness
 *   musubi-design trace                    # Show requirement traceability
 */

const { Command } = require('commander');
const chalk = require('chalk');
const DesignGenerator = require('../src/generators/design');

let inquirer;

/**
 * Initialize inquirer (ESM module in v9+)
 */
async function getInquirer() {
  if (!inquirer) {
    inquirer = (await import('inquirer')).default;
  }
  return inquirer;
}

const program = new Command();

program
  .name('musubi-design')
  .description('Design Document Generator - Create C4 models and ADRs')
  .version('0.9.4');

// Initialize design document
program
  .command('init <feature>')
  .description('Initialize design document for a feature')
  .option('-o, --output <path>', 'Output directory', 'docs/design')
  .option('-a, --author <name>', 'Author name')
  .option('--project <name>', 'Project name')
  .option('-r, --requirements <path>', 'Requirements file path')
  .option('--dry-run', 'Show what would be created without writing files')
  .option('--verbose', 'Show detailed output')
  .option('--json', 'Output result as JSON')
  .action(async (feature, options) => {
    try {
      if (!options.json && !options.dryRun) {
        console.log(chalk.bold(`\n🏗️  Initializing design for: ${feature}\n`));
      }
      
      if (options.verbose && !options.json) {
        console.log(chalk.dim('Options:'));
        console.log(chalk.dim(`  Output: ${options.output}`));
        console.log(chalk.dim(`  Author: ${options.author || 'Not specified'}`));
        console.log(chalk.dim(`  Project: ${options.project || 'Not specified'}`));
        console.log(chalk.dim(`  Requirements: ${options.requirements || 'Not specified'}`));
        console.log(chalk.dim(`  Dry run: ${options.dryRun || false}`));
        console.log();
      }
      
      const generator = new DesignGenerator(process.cwd());
      const result = await generator.init(feature, options);
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else if (options.dryRun) {
        console.log(chalk.yellow('🔍 Dry run - No files created'));
        console.log(chalk.dim(`\n  Would create: ${result.path}`));
        console.log(chalk.dim('  Template: C4 model design document'));
        console.log(chalk.dim(`  Feature: ${feature}`));
        console.log();
      } else {
        console.log(chalk.green('✓ Design document created'));
        console.log(chalk.dim(`  ${result.path}`));
        console.log();
        console.log(chalk.bold('Next steps:'));
        console.log(chalk.dim(`  1. Edit ${result.path}`));
        console.log(chalk.dim('  2. Add C4 diagrams: musubi-design add-c4 <level>'));
        console.log(chalk.dim('  3. Add ADRs: musubi-design add-adr <decision>'));
        console.log(chalk.dim('  4. Validate: musubi-design validate'));
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

// Add C4 diagram
program
  .command('add-c4 <level>')
  .description('Add C4 model diagram (context|container|component|code)')
  .option('-f, --file <path>', 'Design file path')
  .option('--format <type>', 'Diagram format (mermaid|plantuml)', 'mermaid')
  .action(async (level, options) => {
    try {
      console.log(chalk.bold(`\n📊 Adding C4 ${level} diagram\n`));
      
      const generator = new DesignGenerator(process.cwd());
      
      // Find design file
      let designFile = options.file;
      if (!designFile) {
        const files = await generator.findDesignFiles();
        if (files.length === 0) {
          console.error(chalk.red('✗ No design files found'));
          console.log(chalk.dim('  Run: musubi-design init <feature>'));
          process.exit(1);
        }
        
        if (files.length === 1) {
          designFile = files[0];
        } else {
          const inquirerInst = await getInquirer();
          const answer = await inquirerInst.prompt([{
            type: 'list',
            name: 'file',
            message: 'Select design file:',
            choices: files
          }]);
          designFile = answer.file;
        }
      }
      
      // Interactive prompts for C4 diagram
      const inquirerInst2 = await getInquirer();
      const answers = await inquirerInst2.prompt([
        {
          type: 'input',
          name: 'title',
          message: 'Diagram title:',
          default: `${level.charAt(0).toUpperCase() + level.slice(1)} Diagram`,
          validate: (input) => input.length > 0 || 'Title is required'
        },
        {
          type: 'input',
          name: 'description',
          message: 'Diagram description:',
          default: `Shows ${level}-level architecture`
        }
      ]);
      
      const diagram = {
        level,
        title: answers.title,
        description: answers.description,
        format: options.format
      };
      
      const result = await generator.addC4Diagram(designFile, diagram);
      
      console.log(chalk.green('\n✓ C4 diagram added:'));
      console.log(chalk.dim(`  ${result.level}: ${result.title}`));
      console.log(chalk.bold('\n📝 Diagram Template:'));
      console.log(chalk.cyan(result.template));
      console.log();
      
      process.exit(0);
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

// Add Architecture Decision Record
program
  .command('add-adr <decision>')
  .description('Add Architecture Decision Record')
  .option('-f, --file <path>', 'Design file path')
  .option('--status <status>', 'ADR status (proposed|accepted|rejected|deprecated)', 'proposed')
  .action(async (decision, options) => {
    try {
      console.log(chalk.bold(`\n📜 Adding ADR: ${decision}\n`));
      
      const generator = new DesignGenerator(process.cwd());
      
      // Find design file
      let designFile = options.file;
      if (!designFile) {
        const files = await generator.findDesignFiles();
        if (files.length === 0) {
          console.error(chalk.red('✗ No design files found'));
          console.log(chalk.dim('  Run: musubi-design init <feature>'));
          process.exit(1);
        }
        
        if (files.length === 1) {
          designFile = files[0];
        } else {
          const inquirerInst = await getInquirer();
          const answer = await inquirerInst.prompt([{
            type: 'list',
            name: 'file',
            message: 'Select design file:',
            choices: files
          }]);
          designFile = answer.file;
        }
      }
      
      // Interactive prompts for ADR
      const inquirerInst2 = await getInquirer();
      const answers = await inquirerInst2.prompt([
        {
          type: 'input',
          name: 'context',
          message: 'What is the context/problem?',
          validate: (input) => input.length > 0 || 'Context is required'
        },
        {
          type: 'input',
          name: 'decision',
          message: 'What is the decision?',
          validate: (input) => input.length > 0 || 'Decision is required'
        },
        {
          type: 'input',
          name: 'consequences',
          message: 'What are the consequences?',
          validate: (input) => input.length > 0 || 'Consequences are required'
        },
        {
          type: 'input',
          name: 'alternatives',
          message: 'Alternatives considered (comma-separated):',
          filter: (input) => input.split(',').map(s => s.trim()).filter(s => s.length > 0)
        }
      ]);
      
      const adr = {
        title: decision,
        status: options.status,
        context: answers.context,
        decision: answers.decision,
        consequences: answers.consequences,
        alternatives: answers.alternatives
      };
      
      const result = await generator.addADR(designFile, adr);
      
      console.log(chalk.green('\n✓ ADR added:'));
      console.log(chalk.dim(`  ADR-${result.number}: ${result.title}`));
      console.log(chalk.dim(`  Status: ${result.status}`));
      console.log();
      
      process.exit(0);
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

// Validate design document
program
  .command('validate')
  .description('Validate design document completeness')
  .option('-f, --file <path>', 'Specific design file')
  .option('-v, --verbose', 'Show detailed validation results')
  .action(async (options) => {
    try {
      console.log(chalk.bold('\n🔍 Validating Design Documents\n'));
      
      const generator = new DesignGenerator(process.cwd());
      const results = await generator.validate(options.file);
      
      if (results.passed) {
        console.log(chalk.green('✓ All designs valid\n'));
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
          console.log(`  ${icon} ${d.file}: ${d.message}`);
        });
        console.log();
      }
      
      process.exit(results.passed ? 0 : 1);
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

// Show requirement traceability
program
  .command('trace')
  .description('Show requirement-to-design traceability')
  .option('-f, --file <path>', 'Specific design file')
  .option('--format <type>', 'Output format (table|json|markdown)', 'table')
  .action(async (options) => {
    try {
      console.log(chalk.bold('\n🔗 Design Traceability Matrix\n'));
      
      const generator = new DesignGenerator(process.cwd());
      const matrix = await generator.generateTraceabilityMatrix(options.file);
      
      if (options.format === 'json') {
        console.log(JSON.stringify(matrix, null, 2));
      } else {
        console.log(chalk.bold('| Requirement | Design | Components | Status |'));
        console.log('|-------------|--------|------------|--------|');
        
        matrix.forEach(row => {
          const design = row.design ? '✓' : '-';
          const components = row.components || 0;
          const status = row.traced ? chalk.green('Traced') : chalk.yellow('Missing');
          
          console.log(`| ${row.requirement} | ${design} | ${components} | ${status} |`);
        });
        console.log();
        
        const traced = matrix.filter(r => r.traced).length;
        const total = matrix.length;
        const percentage = total > 0 ? Math.round((traced / total) * 100) : 0;
        
        console.log(chalk.bold('Coverage:'));
        console.log(chalk.dim(`  ${traced}/${total} requirements traced (${percentage}%)`));
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
