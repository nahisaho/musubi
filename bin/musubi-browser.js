#!/usr/bin/env node

/**
 * @fileoverview CLI for Browser Automation Agent
 * @module bin/musubi-browser
 */

const { program } = require('commander');
const chalk = require('chalk');
const readline = require('readline');
const fs = require('fs-extra');
const path = require('path');

// Lazy load browser agent to speed up CLI startup
let BrowserAgent = null;

function loadBrowserAgent() {
  if (!BrowserAgent) {
    BrowserAgent = require('../src/agents/browser');
  }
  return BrowserAgent;
}

program
  .name('musubi-browser')
  .description('Browser automation with natural language commands')
  .version('1.0.0');

// Interactive mode (default)
program
  .command('interactive', { isDefault: true })
  .alias('i')
  .description('Start interactive browser automation session')
  .option('--headless', 'Run in headless mode', true)
  .option('--no-headless', 'Run with visible browser')
  .option('-b, --browser <type>', 'Browser type (chromium/firefox/webkit)', 'chromium')
  .option('-o, --output <dir>', 'Screenshot output directory', './screenshots')
  .option('-t, --timeout <ms>', 'Default timeout in milliseconds', '30000')
  .action(async (options) => {
    await runInteractive(options);
  });

// Execute a single command
program
  .command('run <command>')
  .description('Execute a single natural language command')
  .option('--headless', 'Run in headless mode', true)
  .option('--no-headless', 'Run with visible browser')
  .option('-b, --browser <type>', 'Browser type', 'chromium')
  .option('-o, --output <dir>', 'Screenshot output directory', './screenshots')
  .action(async (command, options) => {
    await runCommand(command, options);
  });

// Execute commands from a script file
program
  .command('script <file>')
  .description('Execute commands from a script file')
  .option('--headless', 'Run in headless mode', true)
  .option('--no-headless', 'Run with visible browser')
  .option('-b, --browser <type>', 'Browser type', 'chromium')
  .option('-o, --output <dir>', 'Screenshot output directory', './screenshots')
  .action(async (file, options) => {
    await runScript(file, options);
  });

// Compare screenshots
program
  .command('compare <expected> <actual>')
  .description('Compare two screenshots using AI')
  .option('--threshold <value>', 'Similarity threshold (0-1)', '0.95')
  .option('-d, --description <text>', 'What to verify')
  .action(async (expected, actual, options) => {
    await compareScreenshots(expected, actual, options);
  });

// Generate test code
program
  .command('generate-test')
  .description('Generate Playwright test from action history')
  .option('-n, --name <name>', 'Test name', 'Generated Test')
  .option('-o, --output <file>', 'Output file path')
  .option('-f, --format <format>', 'Test format (playwright/jest)', 'playwright')
  .option('-H, --history <file>', 'Action history JSON file')
  .action(async (options) => {
    await generateTest(options);
  });

/**
 * Run interactive browser session
 */
async function runInteractive(options) {
  const Agent = loadBrowserAgent();
  
  console.log(chalk.cyan('\n🌐 MUSUBI Browser Agent - Interactive Mode'));
  console.log(chalk.gray('Type browser commands in natural language. Type "help" for commands.\n'));

  const agent = new Agent({
    headless: options.headless,
    browser: options.browser,
    outputDir: options.output,
    timeout: parseInt(options.timeout, 10),
  });

  try {
    await agent.launch();
    console.log(chalk.green('✓ Browser launched\n'));

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const prompt = () => {
      rl.question(chalk.yellow('browser> '), async (input) => {
        const command = input.trim();

        if (!command) {
          prompt();
          return;
        }

        if (command === 'exit' || command === 'quit' || command === 'q') {
          console.log(chalk.gray('\nClosing browser...'));
          await agent.close();
          rl.close();
          process.exit(0);
          return;
        }

        if (command === 'help' || command === '?') {
          showHelp();
          prompt();
          return;
        }

        if (command === 'history') {
          showHistory(agent);
          prompt();
          return;
        }

        if (command === 'clear') {
          agent.clearHistory();
          console.log(chalk.green('✓ History cleared'));
          prompt();
          return;
        }

        if (command.startsWith('save-test ')) {
          const outputPath = command.slice(10).trim();
          await saveTest(agent, outputPath);
          prompt();
          return;
        }

        try {
          const startTime = Date.now();
          const result = await agent.execute(command);
          const elapsed = Date.now() - startTime;

          if (result.success) {
            console.log(chalk.green(`✓ Done (${elapsed}ms)`));
            if (result.results) {
              for (const r of result.results) {
                if (r.data?.path) {
                  console.log(chalk.gray(`  Screenshot: ${r.data.path}`));
                }
                if (r.data?.url) {
                  console.log(chalk.gray(`  URL: ${r.data.url}`));
                }
              }
            }
          } else {
            console.log(chalk.red(`✗ Failed: ${result.error}`));
          }
        } catch (error) {
          console.log(chalk.red(`✗ Error: ${error.message}`));
        }

        prompt();
      });
    };

    prompt();

  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Run a single command
 */
async function runCommand(command, options) {
  const Agent = loadBrowserAgent();
  
  console.log(chalk.cyan('🌐 MUSUBI Browser Agent'));
  console.log(chalk.gray(`Command: ${command}\n`));

  const agent = new Agent({
    headless: options.headless,
    browser: options.browser,
    outputDir: options.output,
  });

  try {
    await agent.launch();
    const result = await agent.execute(command);

    if (result.success) {
      console.log(chalk.green('✓ Command executed successfully'));
      
      if (result.results) {
        for (const r of result.results) {
          console.log(chalk.gray(`  ${r.type}: ${JSON.stringify(r.data)}`));
        }
      }
    } else {
      console.log(chalk.red(`✗ Failed: ${result.error}`));
      process.exitCode = 1;
    }

  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exitCode = 1;
  } finally {
    await agent.close();
  }
}

/**
 * Run commands from a script file
 */
async function runScript(file, options) {
  const Agent = loadBrowserAgent();
  
  if (!await fs.pathExists(file)) {
    console.error(chalk.red(`Script file not found: ${file}`));
    process.exit(1);
  }

  const content = await fs.readFile(file, 'utf-8');
  const commands = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));

  console.log(chalk.cyan('🌐 MUSUBI Browser Agent - Script Mode'));
  console.log(chalk.gray(`Script: ${file}`));
  console.log(chalk.gray(`Commands: ${commands.length}\n`));

  const agent = new Agent({
    headless: options.headless,
    browser: options.browser,
    outputDir: options.output,
  });

  try {
    await agent.launch();
    
    let passed = 0;
    let failed = 0;

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      process.stdout.write(chalk.gray(`[${i + 1}/${commands.length}] ${command.slice(0, 50)}...`));

      try {
        const result = await agent.execute(command);
        if (result.success) {
          console.log(chalk.green(' ✓'));
          passed++;
        } else {
          console.log(chalk.red(` ✗ ${result.error}`));
          failed++;
        }
      } catch (error) {
        console.log(chalk.red(` ✗ ${error.message}`));
        failed++;
      }
    }

    console.log('');
    console.log(chalk.cyan('Results:'));
    console.log(chalk.green(`  Passed: ${passed}`));
    console.log(chalk.red(`  Failed: ${failed}`));

    if (failed > 0) {
      process.exitCode = 1;
    }

  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exitCode = 1;
  } finally {
    await agent.close();
  }
}

/**
 * Compare two screenshots
 */
async function compareScreenshots(expected, actual, options) {
  const Agent = loadBrowserAgent();
  const { AIComparator } = Agent;
  
  console.log(chalk.cyan('🖼️ Screenshot Comparison'));
  console.log(chalk.gray(`Expected: ${expected}`));
  console.log(chalk.gray(`Actual: ${actual}`));
  console.log(chalk.gray(`Threshold: ${options.threshold}\n`));

  const comparator = new AIComparator({
    threshold: parseFloat(options.threshold),
  });

  try {
    const result = await comparator.compare(expected, actual, {
      description: options.description,
    });

    if (result.passed) {
      console.log(chalk.green(`✓ PASSED - Similarity: ${result.similarity}%`));
    } else {
      console.log(chalk.red(`✗ FAILED - Similarity: ${result.similarity}% (threshold: ${result.threshold}%)`));
      
      if (result.differences.length > 0) {
        console.log(chalk.yellow('\nDifferences:'));
        for (const diff of result.differences) {
          console.log(chalk.yellow(`  - ${diff}`));
        }
      }
      
      process.exitCode = 1;
    }

    // Generate report
    const report = comparator.generateReport(result);
    const reportPath = path.join(path.dirname(actual), 'comparison-report.md');
    await fs.writeFile(reportPath, report);
    console.log(chalk.gray(`\nReport saved: ${reportPath}`));

  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exitCode = 1;
  }
}

/**
 * Generate test code from history
 */
async function generateTest(options) {
  const Agent = loadBrowserAgent();
  const { TestGenerator } = Agent;
  
  console.log(chalk.cyan('📝 Generate Test Code'));

  const generator = new TestGenerator();
  
  let history = [];
  if (options.history) {
    if (!await fs.pathExists(options.history)) {
      console.error(chalk.red(`History file not found: ${options.history}`));
      process.exit(1);
    }
    history = JSON.parse(await fs.readFile(options.history, 'utf-8'));
  }

  try {
    const code = await generator.generateTest(history, {
      name: options.name,
      format: options.format,
      output: options.output,
    });

    if (options.output) {
      console.log(chalk.green(`✓ Test saved to: ${options.output}`));
    } else {
      console.log('\n' + code);
    }

  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exitCode = 1;
  }
}

/**
 * Show help
 */
function showHelp() {
  console.log(chalk.cyan('\nAvailable Commands:'));
  console.log(chalk.gray('  Navigation:'));
  console.log('    "https://example.com を開く" or "go to https://example.com"');
  console.log(chalk.gray('  Click:'));
  console.log('    "ログインボタンをクリック" or "click login button"');
  console.log(chalk.gray('  Fill:'));
  console.log('    "メール欄に「test@example.com」と入力" or "type test@example.com in email field"');
  console.log(chalk.gray('  Wait:'));
  console.log('    "3秒待つ" or "wait 3 seconds"');
  console.log(chalk.gray('  Screenshot:'));
  console.log('    "スクリーンショット" or "take screenshot"');
  console.log(chalk.gray('  Assert:'));
  console.log('    "「ログイン成功」が表示される" or "verify Login Success is visible"');
  console.log(chalk.gray('\nSession Commands:'));
  console.log('    history      - Show action history');
  console.log('    clear        - Clear action history');
  console.log('    save-test <file> - Save history as Playwright test');
  console.log('    exit/quit/q  - Close browser and exit');
  console.log('');
}

/**
 * Show action history
 */
function showHistory(agent) {
  const history = agent.getActionHistory();
  
  if (history.length === 0) {
    console.log(chalk.gray('No actions in history.'));
    return;
  }

  console.log(chalk.cyan(`\nAction History (${history.length} actions):`));
  for (let i = 0; i < history.length; i++) {
    const item = history[i];
    const status = item.result?.success ? chalk.green('✓') : chalk.red('✗');
    console.log(`  ${i + 1}. ${status} ${item.action.type}: ${item.action.raw || JSON.stringify(item.action)}`);
  }
  console.log('');
}

/**
 * Save test from history
 */
async function saveTest(agent, outputPath) {
  const history = agent.getActionHistory();
  
  if (history.length === 0) {
    console.log(chalk.yellow('No actions in history to save.'));
    return;
  }

  try {
    const _code = await agent.generateTest({
      name: 'Interactive Session Test',
      output: outputPath,
    });
    console.log(chalk.green(`✓ Test saved to: ${outputPath}`));
  } catch (error) {
    console.log(chalk.red(`Error saving test: ${error.message}`));
  }
}

// Parse arguments
program.parse(process.argv);
