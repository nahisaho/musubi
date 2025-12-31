#!/usr/bin/env node

/**
 * MUSUBI Dashboard CLI
 * 
 * Workflow dashboard for progress visualization and management.
 * 
 * Usage:
 *   musubi-dashboard show <feature>      Show workflow status
 *   musubi-dashboard create <feature>    Create new workflow
 *   musubi-dashboard advance <feature>   Advance to next stage
 *   musubi-dashboard blocker <feature>   Manage blockers
 *   musubi-dashboard sprint <action>     Sprint management
 *   musubi-dashboard trace <action>      Traceability management
 * 
 * Requirement: IMP-6.2-003-05
 */

const { DashboardCLI } = require('../src/cli/dashboard-cli');

const args = process.argv.slice(2);
const command = args[0];
const subcommand = args[1];
const feature = args[2] || args[1];

// Parse options
const options = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2);
    const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
    options[key] = value;
    if (value !== true) i++;
  }
}

async function main() {
  const cli = new DashboardCLI();

  if (!command || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  try {
    let result;

    switch (command) {
      case 'show':
      case 'status':
        result = await cli.execute('workflow:status', [subcommand]);
        formatWorkflowStatus(result);
        break;

      case 'create':
      case 'start':
        result = await cli.execute('workflow:create', [subcommand], options);
        console.log(`\n✅ Workflow created for: ${subcommand}`);
        formatWorkflowStatus(result);
        break;

      case 'advance':
        result = await cli.execute('workflow:advance', [subcommand], options);
        console.log(`\n✅ Workflow advanced`);
        formatWorkflowStatus(result);
        break;

      case 'blocker':
        if (options.add) {
          result = await cli.execute('blocker:add', [subcommand], {
            stage: options.stage || 'current',
            description: options.add,
            severity: options.severity || 'medium'
          });
          console.log(`\n✅ Blocker added: ${options.add}`);
        } else if (options.resolve) {
          result = await cli.execute('blocker:resolve', [subcommand], {
            blockerId: options.resolve,
            resolution: options.resolution || 'Resolved'
          });
          console.log(`\n✅ Blocker resolved`);
        } else {
          result = await cli.execute('blocker:list', [subcommand]);
          formatBlockers(result);
        }
        break;

      case 'sprint':
        await handleSprintCommand(cli, subcommand, args.slice(2), options);
        break;

      case 'trace':
        await handleTraceCommand(cli, subcommand, args.slice(2), options);
        break;

      case 'report':
        result = await cli.execute('report:generate', [subcommand], options);
        console.log(result.report);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function handleSprintCommand(cli, action, args, options) {
  let result;

  switch (action) {
    case 'create':
      result = await cli.execute('sprint:create', args, options);
      console.log(`\n✅ Sprint created: ${result.id}`);
      break;

    case 'start':
      result = await cli.execute('sprint:start', args);
      console.log(`\n✅ Sprint started: ${args[0]}`);
      break;

    case 'complete':
      result = await cli.execute('sprint:complete', args);
      console.log(`\n✅ Sprint completed: ${args[0]}`);
      break;

    case 'status':
      result = await cli.execute('sprint:status', args);
      formatSprintStatus(result);
      break;

    case 'report':
      result = await cli.execute('sprint:report', args, options);
      console.log(result.markdown || result.report);
      break;

    default:
      console.error(`Unknown sprint action: ${action}`);
      process.exit(1);
  }
}

async function handleTraceCommand(cli, action, args, options) {
  let result;

  switch (action) {
    case 'extract':
      result = await cli.execute('trace:extract', args, options);
      console.log(`\n✅ Extracted ${result.references?.length || 0} traceability references`);
      break;

    case 'gaps':
      result = await cli.execute('trace:gaps', args);
      formatGaps(result);
      break;

    case 'matrix':
      result = await cli.execute('trace:matrix', args, options);
      console.log(result.markdown || JSON.stringify(result, null, 2));
      break;

    case 'report':
      result = await cli.execute('trace:report', args, options);
      console.log(result.report);
      break;

    default:
      console.error(`Unknown trace action: ${action}`);
      process.exit(1);
  }
}

function formatWorkflowStatus(workflow) {
  if (!workflow) {
    console.log('\n⚠️  No workflow found for this feature');
    return;
  }

  console.log(`\n📊 Workflow Dashboard: ${workflow.featureId || 'Unknown'}`);
  console.log('═'.repeat(50));

  if (workflow.title) {
    console.log(`📝 Title: ${workflow.title}`);
  }

  console.log(`📍 Current Stage: ${workflow.currentStage || 'N/A'}`);
  console.log(`📈 Completion: ${workflow.completion || 0}%`);
  console.log('');

  // Stage visualization
  const stages = ['steering', 'requirements', 'design', 'implementation', 'validation'];
  const stageStatus = workflow.stages || {};

  console.log('Stages:');
  stages.forEach((stage, index) => {
    const status = stageStatus[stage]?.status || 'pending';
    const icon = getStatusIcon(status);
    const current = stage === workflow.currentStage ? '◀' : '';
    console.log(`  ${index + 1}. ${icon} ${stage.padEnd(15)} ${current}`);
  });

  if (workflow.blockers && workflow.blockers.length > 0) {
    console.log(`\n⚠️  Blockers: ${workflow.blockers.filter(b => !b.resolvedAt).length} active`);
  }
}

function formatBlockers(result) {
  const blockers = result.blockers || [];
  
  if (blockers.length === 0) {
    console.log('\n✅ No blockers');
    return;
  }

  console.log(`\n⚠️  Blockers (${blockers.length}):`);
  console.log('─'.repeat(40));

  blockers.forEach((blocker, i) => {
    const status = blocker.resolvedAt ? '✅' : '🚫';
    console.log(`${i + 1}. ${status} [${blocker.severity || 'medium'}] ${blocker.description}`);
    if (blocker.stage) {
      console.log(`   Stage: ${blocker.stage}`);
    }
  });
}

function formatSprintStatus(sprint) {
  if (!sprint) {
    console.log('\n⚠️  Sprint not found');
    return;
  }

  console.log(`\n🏃 Sprint: ${sprint.name || sprint.id}`);
  console.log('═'.repeat(50));
  console.log(`Status: ${sprint.status || 'unknown'}`);
  console.log(`Tasks: ${sprint.tasks?.length || 0}`);
  
  if (sprint.metrics) {
    console.log(`Completion: ${sprint.metrics.completionPercentage || 0}%`);
    console.log(`Points: ${sprint.metrics.completedPoints || 0}/${sprint.metrics.totalPoints || 0}`);
  }
}

function formatGaps(result) {
  const gaps = result.gaps || [];

  if (gaps.length === 0) {
    console.log('\n✅ No traceability gaps detected');
    return;
  }

  console.log(`\n⚠️  Traceability Gaps (${gaps.length}):`);
  console.log('─'.repeat(50));

  // Group by severity
  const bySeverity = { critical: [], high: [], medium: [], low: [] };
  gaps.forEach(gap => {
    const sev = gap.severity || 'medium';
    if (bySeverity[sev]) bySeverity[sev].push(gap);
  });

  Object.entries(bySeverity).forEach(([severity, items]) => {
    if (items.length > 0) {
      const icon = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '🟢';
      console.log(`\n${icon} ${severity.toUpperCase()} (${items.length}):`);
      items.forEach(gap => {
        console.log(`  - ${gap.requirementId}: ${gap.gapType}`);
        if (gap.suggestion) {
          console.log(`    💡 ${gap.suggestion}`);
        }
      });
    }
  });
}

function getStatusIcon(status) {
  const icons = {
    'completed': '✅',
    'in-progress': '🔄',
    'blocked': '🚫',
    'pending': '⬜',
    'not-started': '⬜'
  };
  return icons[status] || '⬜';
}

function showHelp() {
  console.log(`
MUSUBI Dashboard CLI v6.2.0

Usage: musubi-dashboard <command> [options]

Workflow Commands:
  show <feature>         Show workflow status
  create <feature>       Create new workflow
  start <feature>        Alias for create
  advance <feature>      Advance to next stage
  blocker <feature>      Manage blockers
    --add <description>  Add a blocker
    --resolve <id>       Resolve a blocker
    --stage <stage>      Specify stage
    --severity <level>   Set severity (low/medium/high/critical)

Sprint Commands:
  sprint create <name>   Create a new sprint
    --feature <id>       Associated feature
    --velocity <points>  Sprint velocity
  sprint start <id>      Start a sprint
  sprint complete <id>   Complete a sprint
  sprint status <id>     Show sprint status
  sprint report <id>     Generate sprint report

Traceability Commands:
  trace extract <dir>    Extract traceability IDs
  trace gaps <feature>   Detect traceability gaps
  trace matrix           Generate traceability matrix
  trace report           Generate full report

General Options:
  --verbose              Show detailed output
  --format <type>        Output format (text/json/markdown)
  --help, -h             Show this help

Examples:
  musubi-dashboard show user-auth
  musubi-dashboard create FEAT-001 --title "User Authentication"
  musubi-dashboard blocker FEAT-001 --add "Waiting for API spec"
  musubi-dashboard sprint create "Sprint 1" --feature FEAT-001
  musubi-dashboard trace gaps FEAT-001
`);
}

main();
