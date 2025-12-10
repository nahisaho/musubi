#!/usr/bin/env node

/**
 * MUSUBI Cost Tracker CLI
 * Track and report LLM API usage costs
 *
 * Usage:
 *   musubi costs                    Show current session costs
 *   musubi costs report             Generate detailed cost report
 *   musubi costs report --period monthly  Show monthly costs
 *   musubi costs budget set 50      Set monthly budget to $50
 *   musubi costs budget status      Show budget status
 *   musubi costs reset              Reset session tracking
 *   musubi costs export             Export usage data to JSON
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { CostTracker, DEFAULT_PRICING } = require('../src/monitoring/cost-tracker');

const STORAGE_DIR = path.join(process.cwd(), '.musubi', 'costs');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'summary';
  const subCommand = args[1];

  const tracker = new CostTracker({
    storageDir: STORAGE_DIR,
  });

  await tracker.initialize();

  switch (command) {
    case 'summary':
    case 'show':
      await showSummary(tracker);
      break;

    case 'report':
      await showReport(tracker, args);
      break;

    case 'budget':
      await handleBudget(tracker, subCommand, args.slice(2));
      break;

    case 'reset':
      await handleReset(tracker, subCommand);
      break;

    case 'export':
      await exportData(tracker, args);
      break;

    case 'pricing':
      await showPricing(args.slice(1));
      break;

    case 'history':
      await showHistory(tracker, args);
      break;

    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;

    default:
      console.error(chalk.red(`Unknown command: ${command}`));
      showHelp();
      process.exit(1);
  }
}

async function showSummary(tracker) {
  console.log(chalk.blue.bold('\n📊 MUSUBI Cost Summary\n'));

  const summary = tracker.getSessionSummary();
  const period = tracker.getPeriodSummary();

  console.log(chalk.white('── Session ──'));
  console.log(`  Requests: ${chalk.cyan(summary.totalRequests)}`);
  console.log(`  Tokens: ${chalk.cyan(summary.totalTokens.toLocaleString())}`);
  console.log(`  Cost: ${chalk.green('$' + summary.totalCost.toFixed(4))}`);

  console.log(chalk.white('\n── This Month ──'));
  console.log(`  Requests: ${chalk.cyan(period.requests)}`);
  console.log(`  Tokens: ${chalk.cyan((period.inputTokens + period.outputTokens).toLocaleString())}`);
  console.log(`  Cost: ${chalk.green('$' + period.cost.toFixed(4))}`);

  if (period.budgetLimit) {
    console.log(chalk.white('\n── Budget ──'));
    const percentUsed = period.budgetUsedPercent;
    const color = percentUsed > 80 ? chalk.red : percentUsed > 50 ? chalk.yellow : chalk.green;
    console.log(`  Limit: $${period.budgetLimit.toFixed(2)}`);
    console.log(`  Used: ${color(percentUsed.toFixed(1) + '%')}`);
    console.log(`  Remaining: $${period.budgetRemaining.toFixed(2)}`);
  }

  console.log('');
}

async function showReport(tracker, args) {
  const periodIdx = args.indexOf('--period');
  const period = periodIdx !== -1 ? args[periodIdx + 1] : 'session';

  const formatIdx = args.indexOf('--format');
  const format = formatIdx !== -1 ? args[formatIdx + 1] : 'text';

  const report = tracker.generateReport({ period, format });
  console.log(report);
}

async function handleBudget(tracker, subCommand, args) {
  switch (subCommand) {
    case 'set': {
      const amount = parseFloat(args[0]);
      if (isNaN(amount) || amount < 0) {
        console.error(chalk.red('Invalid budget amount. Please provide a positive number.'));
        process.exit(1);
      }

      const period = args[1] || 'monthly';
      tracker.setBudget(amount, period);

      // Save to config
      const configPath = path.join(STORAGE_DIR, 'budget.json');
      await fs.ensureDir(STORAGE_DIR);
      await fs.writeJSON(configPath, { limit: amount, period }, { spaces: 2 });

      console.log(chalk.green(`✓ Budget set to $${amount.toFixed(2)} per ${period}`));
      break;
    }

    case 'status': {
      const summary = tracker.getPeriodSummary();
      console.log(chalk.blue.bold('\n💰 Budget Status\n'));

      if (!summary.budgetLimit) {
        console.log(chalk.yellow('No budget configured.'));
        console.log(chalk.gray('Use: musubi costs budget set <amount> [period]'));
      } else {
        console.log(`  Period: ${summary.period}`);
        console.log(`  Limit: $${summary.budgetLimit.toFixed(2)}`);
        console.log(`  Spent: $${summary.cost.toFixed(4)}`);
        console.log(`  Remaining: $${summary.budgetRemaining.toFixed(2)}`);

        const bar = createProgressBar(summary.budgetUsedPercent, 30);
        console.log(`\n  ${bar} ${summary.budgetUsedPercent.toFixed(1)}%`);
      }
      console.log('');
      break;
    }

    case 'clear': {
      const budgetPath = path.join(STORAGE_DIR, 'budget.json');
      await fs.remove(budgetPath);
      console.log(chalk.green('✓ Budget cleared'));
      break;
    }

    default:
      console.log('Usage:');
      console.log('  musubi costs budget set <amount> [period]  Set budget limit');
      console.log('  musubi costs budget status                 Show budget status');
      console.log('  musubi costs budget clear                  Remove budget limit');
  }
}

async function handleReset(tracker, subCommand) {
  switch (subCommand) {
    case 'session':
      tracker.resetSession();
      console.log(chalk.green('✓ Session tracking reset'));
      break;

    case 'period':
      tracker.resetPeriod();
      console.log(chalk.green('✓ Period totals reset'));
      break;

    case 'all':
      await fs.emptyDir(STORAGE_DIR);
      console.log(chalk.green('✓ All cost tracking data reset'));
      break;

    default:
      console.log('Usage:');
      console.log('  musubi costs reset session  Reset current session');
      console.log('  musubi costs reset period   Reset monthly/weekly totals');
      console.log('  musubi costs reset all      Clear all tracking data');
  }
}

async function exportData(tracker, args) {
  const outputIdx = args.indexOf('--output');
  const output = outputIdx !== -1 ? args[outputIdx + 1] : null;

  const summary = tracker.getSessionSummary();
  const period = tracker.getPeriodSummary();

  const data = {
    exportedAt: new Date().toISOString(),
    session: summary,
    period,
  };

  if (output) {
    await fs.ensureDir(path.dirname(output));
    await fs.writeJSON(output, data, { spaces: 2 });
    console.log(chalk.green(`✓ Exported to ${output}`));
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

async function showPricing(args) {
  const model = args[0];

  console.log(chalk.blue.bold('\n💵 LLM Pricing (per 1M tokens)\n'));

  if (model) {
    const pricing = DEFAULT_PRICING[model];
    if (pricing) {
      console.log(`  ${chalk.cyan(model)}`);
      console.log(`    Input: $${pricing.input.toFixed(2)}`);
      console.log(`    Output: $${pricing.output.toFixed(2)}`);
    } else {
      console.log(chalk.yellow(`Unknown model: ${model}`));
    }
  } else {
    // Group by provider
    const providers = {
      'OpenAI': ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1', 'o1-mini', 'o3-mini'],
      'Anthropic': ['claude-opus-4', 'claude-sonnet-4', 'claude-3.5-sonnet', 'claude-3.5-haiku', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
      'Google': ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
      'Local (Free)': ['ollama', 'llama3.2', 'codellama', 'mistral', 'qwen2.5'],
    };

    for (const [provider, models] of Object.entries(providers)) {
      console.log(chalk.white.bold(`  ${provider}:`));
      for (const m of models) {
        const p = DEFAULT_PRICING[m];
        if (p) {
          const inputStr = p.input === 0 ? 'Free' : `$${p.input.toFixed(2)}`;
          const outputStr = p.output === 0 ? 'Free' : `$${p.output.toFixed(2)}`;
          console.log(`    ${chalk.cyan(m.padEnd(20))} In: ${inputStr.padStart(7)} / Out: ${outputStr.padStart(7)}`);
        }
      }
      console.log('');
    }
  }
}

async function showHistory(tracker, args) {
  const sessions = await fs.readdir(STORAGE_DIR).catch(() => []);
  const sessionFiles = sessions.filter(f => f.startsWith('session-') && f.endsWith('.json'));

  if (sessionFiles.length === 0) {
    console.log(chalk.yellow('No historical sessions found.'));
    return;
  }

  console.log(chalk.blue.bold('\n📜 Session History\n'));

  const limit = parseInt(args[1]) || 10;
  const recentSessions = sessionFiles.slice(-limit).reverse();

  for (const file of recentSessions) {
    try {
      const data = await fs.readJSON(path.join(STORAGE_DIR, file));
      const summary = data.summary;
      
      console.log(chalk.white(`  ${summary.sessionStart}`));
      console.log(`    Duration: ${formatDuration(summary.duration)}`);
      console.log(`    Requests: ${summary.totalRequests}, Tokens: ${summary.totalTokens.toLocaleString()}`);
      console.log(`    Cost: ${chalk.green('$' + summary.totalCost.toFixed(4))}`);
      console.log('');
    } catch (e) {
      // Skip invalid files
    }
  }
}

function createProgressBar(percent, width) {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  const color = percent > 80 ? chalk.red : percent > 50 ? chalk.yellow : chalk.green;
  return color('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function showHelp() {
  console.log(`
${chalk.blue.bold('MUSUBI Cost Tracker')}

${chalk.white('Usage:')}
  musubi costs [command] [options]

${chalk.white('Commands:')}
  summary, show       Show current session and period costs
  report              Generate detailed cost report
    --period <p>      Report period (session, daily, weekly, monthly)
    --format <f>      Output format (text, json)
  
  budget set <$>      Set budget limit (e.g., 50 for $50)
  budget status       Show budget usage status
  budget clear        Remove budget limit
  
  pricing [model]     Show pricing for models
  history [n]         Show last n sessions (default: 10)
  
  reset session       Reset current session tracking
  reset period        Reset monthly totals
  reset all           Clear all tracking data
  
  export              Export data to JSON
    --output <file>   Write to file instead of stdout

${chalk.white('Examples:')}
  musubi costs
  musubi costs report --period monthly
  musubi costs budget set 100
  musubi costs pricing gpt-4o
  musubi costs export --output costs.json
`);
}

main().catch(error => {
  console.error(chalk.red('Error:'), error.message);
  process.exit(1);
});
