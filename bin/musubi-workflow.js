#!/usr/bin/env node

/**
 * MUSUBI Workflow CLI
 * 
 * Manage workflow state, transitions, and metrics.
 * 
 * Commands:
 *   init <feature>    - Initialize workflow for a feature
 *   status            - Show current workflow status
 *   next [stage]      - Transition to next stage
 *   complete          - Complete the workflow
 *   metrics           - Show workflow metrics summary
 *   history           - Show workflow history
 */

const { program } = require('commander');
const { WorkflowEngine, WORKFLOW_STAGES } = require('../src/managers/workflow');
const chalk = require('chalk');

const engine = new WorkflowEngine();

// Stage icons for visual feedback
const STAGE_ICONS = {
  spike: '🔬',
  research: '📚',
  requirements: '📋',
  design: '📐',
  tasks: '📝',
  implementation: '💻',
  review: '👀',
  testing: '🧪',
  deployment: '🚀',
  monitoring: '📊',
  retrospective: '🔄'
};

/**
 * Format stage name with icon
 */
function formatStage(stage) {
  const icon = STAGE_ICONS[stage] || '📌';
  return `${icon} ${stage}`;
}

/**
 * Display workflow status
 */
async function showStatus() {
  const state = await engine.getState();
  
  if (!state) {
    console.log(chalk.yellow('\n⚠️  No active workflow. Use "musubi-workflow init <feature>" to start.'));
    return;
  }

  console.log(chalk.bold('\n📊 Workflow Status\n'));
  console.log(chalk.white(`Feature: ${chalk.cyan(state.feature)}`));
  console.log(chalk.white(`Current Stage: ${formatStage(state.currentStage)}`));
  console.log(chalk.white(`Started: ${new Date(state.startedAt).toLocaleString()}`));
  
  // Show stage progress
  console.log(chalk.bold('\n📈 Stage Progress:\n'));
  
  const allStages = Object.keys(WORKFLOW_STAGES);
  const currentIndex = allStages.indexOf(state.currentStage);
  
  allStages.forEach((stage, index) => {
    const data = state.stages[stage];
    let status = '';
    let color = chalk.gray;
    
    if (data?.status === 'completed') {
      status = `✅ Completed (${data.duration})`;
      color = chalk.green;
    } else if (stage === state.currentStage) {
      status = '🔄 In Progress';
      color = chalk.blue;
    } else if (index < currentIndex) {
      status = '⏭️  Skipped';
      color = chalk.gray;
    } else {
      status = '⏳ Pending';
      color = chalk.gray;
    }
    
    console.log(color(`  ${formatStage(stage).padEnd(25)} ${status}`));
  });

  // Show valid transitions
  const validNext = await engine.getValidTransitions();
  if (validNext.length > 0) {
    console.log(chalk.bold('\n🔀 Valid Transitions:'));
    validNext.forEach(stage => {
      console.log(chalk.cyan(`  → ${formatStage(stage)}`));
    });
  }
}

/**
 * Display workflow history
 */
async function showHistory() {
  const state = await engine.getState();
  
  if (!state || !state.history) {
    console.log(chalk.yellow('\n⚠️  No workflow history available.'));
    return;
  }

  console.log(chalk.bold('\n📜 Workflow History\n'));
  
  state.history.forEach(event => {
    const time = new Date(event.timestamp).toLocaleString();
    let desc = '';
    
    switch (event.action) {
      case 'workflow-started':
        desc = `Started workflow for "${event.feature}" at ${formatStage(event.stage)}`;
        break;
      case 'stage-transition':
        desc = `${formatStage(event.from)} → ${formatStage(event.to)}`;
        if (event.notes) desc += ` (${event.notes})`;
        break;
      case 'feedback-loop':
        desc = `🔄 Feedback: ${formatStage(event.from)} → ${formatStage(event.to)} - ${event.reason}`;
        break;
      case 'workflow-completed':
        desc = `✅ Workflow completed`;
        if (event.notes) desc += ` (${event.notes})`;
        break;
      default:
        desc = event.action;
    }
    
    console.log(chalk.white(`  ${chalk.gray(time)} ${desc}`));
  });
}

/**
 * Display metrics summary
 */
async function showMetrics() {
  const summary = await engine.getMetricsSummary();
  
  console.log(chalk.bold('\n📊 Workflow Metrics Summary\n'));
  
  if (summary.message) {
    console.log(chalk.yellow(`  ${summary.message}`));
    return;
  }

  console.log(chalk.white(`  Total Workflows:     ${summary.totalWorkflows}`));
  console.log(chalk.white(`  Completed:           ${summary.completedWorkflows}`));
  console.log(chalk.white(`  Stage Transitions:   ${summary.stageTransitions}`));
  console.log(chalk.white(`  Feedback Loops:      ${summary.feedbackLoops}`));
  
  if (summary.averageDuration) {
    console.log(chalk.white(`  Average Duration:    ${summary.averageDuration}`));
  }

  if (Object.keys(summary.stageStats).length > 0) {
    console.log(chalk.bold('\n📈 Stage Visit Counts:\n'));
    Object.entries(summary.stageStats)
      .sort((a, b) => b[1].visits - a[1].visits)
      .forEach(([stage, data]) => {
        console.log(chalk.white(`  ${formatStage(stage).padEnd(25)} ${data.visits} visits`));
      });
  }
}

// CLI Commands
program
  .name('musubi-workflow')
  .description('MUSUBI Workflow Engine - Manage SDD workflow state and metrics')
  .version('2.0.7');

program
  .command('init <feature>')
  .description('Initialize a new workflow for a feature')
  .option('-s, --stage <stage>', 'Starting stage', 'requirements')
  .action(async (feature, options) => {
    try {
      const state = await engine.initWorkflow(feature, { startStage: options.stage });
      console.log(chalk.green(`\n✅ Workflow initialized for "${feature}"`));
      console.log(chalk.cyan(`   Starting at: ${formatStage(state.currentStage)}`));
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show current workflow status')
  .action(showStatus);

program
  .command('next [stage]')
  .description('Transition to the next stage')
  .option('-n, --notes <notes>', 'Transition notes')
  .action(async (stage, options) => {
    try {
      const state = await engine.getState();
      if (!state) {
        console.log(chalk.yellow('\n⚠️  No active workflow.'));
        return;
      }

      // If no stage specified, show valid options
      if (!stage) {
        const validNext = await engine.getValidTransitions();
        console.log(chalk.bold('\n🔀 Valid next stages:'));
        validNext.forEach(s => console.log(chalk.cyan(`  → ${formatStage(s)}`)));
        console.log(chalk.white('\nUse: musubi-workflow next <stage>'));
        return;
      }

      const newState = await engine.transitionTo(stage, options.notes);
      console.log(chalk.green(`\n✅ Transitioned to ${formatStage(stage)}`));
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('feedback <from> <to>')
  .description('Record a feedback loop')
  .requiredOption('-r, --reason <reason>', 'Reason for feedback loop')
  .action(async (from, to, options) => {
    try {
      await engine.recordFeedbackLoop(from, to, options.reason);
      await engine.transitionTo(to, `Feedback: ${options.reason}`);
      console.log(chalk.yellow(`\n🔄 Feedback loop recorded: ${formatStage(from)} → ${formatStage(to)}`));
      console.log(chalk.gray(`   Reason: ${options.reason}`));
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('complete')
  .description('Complete the current workflow')
  .option('-n, --notes <notes>', 'Completion notes')
  .action(async (options) => {
    try {
      const summary = await engine.completeWorkflow(options.notes);
      
      console.log(chalk.green('\n✅ Workflow Completed!\n'));
      console.log(chalk.bold('📊 Summary:'));
      console.log(chalk.white(`  Feature:        ${summary.feature}`));
      console.log(chalk.white(`  Total Duration: ${summary.totalDuration}`));
      console.log(chalk.white(`  Stages:         ${summary.stages.length}`));
      console.log(chalk.white(`  Feedback Loops: ${summary.feedbackLoops}`));
      
      if (summary.stages.length > 0) {
        console.log(chalk.bold('\n📈 Stage Breakdown:'));
        summary.stages.forEach(s => {
          console.log(chalk.white(`  ${formatStage(s.name).padEnd(25)} ${s.duration} (${s.attempts} attempt${s.attempts > 1 ? 's' : ''})`));
        });
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('history')
  .description('Show workflow history')
  .action(showHistory);

program
  .command('metrics')
  .description('Show workflow metrics summary')
  .action(showMetrics);

program.parse();
