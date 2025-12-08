#!/usr/bin/env node

/**
 * MUSUBI Orchestration CLI
 *
 * Multi-skill orchestration with ag2-inspired patterns
 *
 * Usage:
 *   musubi-orchestrate run <pattern> --skills <skills...>  # Execute pattern with skills
 *   musubi-orchestrate auto <task>                          # Auto-select and execute skill
 *   musubi-orchestrate sequential --skills <skills...>      # Execute skills sequentially
 *   musubi-orchestrate list-patterns                        # List available patterns
 *   musubi-orchestrate list-skills                          # List available skills
 *   musubi-orchestrate status                               # Show orchestration status
 */

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');

const {
  createOrchestrationEngine,
  PatternType,
  ExecutionStatus,
  Priority
} = require('../src/orchestration');

const {
  ReplanningEngine,
  GoalProgressTracker,
  Goal,
  AdaptiveGoalModifier,
  ProactivePathOptimizer,
  ModificationReason
} = require('../src/orchestration/replanning');

const program = new Command();

program
  .name('musubi-orchestrate')
  .description('MUSUBI Orchestration - Multi-skill workflow orchestration')
  .version('1.0.0');

/**
 * Load skills from templates
 */
async function loadSkills(projectPath) {
  const skills = new Map();
  const skillsPath = path.join(projectPath, 'src', 'templates', 'skills');
  
  if (await fs.pathExists(skillsPath)) {
    const skillDirs = await fs.readdir(skillsPath);
    
    for (const skillDir of skillDirs) {
      const skillPath = path.join(skillsPath, skillDir);
      const stat = await fs.stat(skillPath);
      
      if (stat.isDirectory()) {
        const metaPath = path.join(skillPath, 'skill.json');
        
        if (await fs.pathExists(metaPath)) {
          try {
            const meta = await fs.readJson(metaPath);
            skills.set(skillDir, {
              name: skillDir,
              ...meta,
              execute: async (input) => {
                // Placeholder for actual skill execution
                return { skill: skillDir, input, executed: true };
              }
            });
          } catch (e) {
            // Skip invalid skills
          }
        } else {
          // Create minimal skill entry
          skills.set(skillDir, {
            name: skillDir,
            description: `${skillDir} skill`,
            keywords: [skillDir],
            execute: async (input) => {
              return { skill: skillDir, input, executed: true };
            }
          });
        }
      }
    }
  }
  
  // Add built-in mock skills for demonstration
  if (skills.size === 0) {
    const mockSkills = [
      { name: 'requirements-analyst', keywords: ['requirement', 'ears', 'specification'], categories: ['requirements'] },
      { name: 'system-architect', keywords: ['architecture', 'design', 'c4'], categories: ['design'] },
      { name: 'task-decomposer', keywords: ['task', 'breakdown', 'decompose'], categories: ['implementation'] },
      { name: 'code-generator', keywords: ['code', 'implement', 'generate'], categories: ['implementation'] },
      { name: 'test-engineer', keywords: ['test', 'testing', 'qa'], categories: ['testing'] },
      { name: 'documentation-writer', keywords: ['document', 'readme', 'guide'], categories: ['documentation'] },
      { name: 'security-analyst', keywords: ['security', 'vulnerability', 'audit'], categories: ['security'] },
      { name: 'performance-engineer', keywords: ['performance', 'optimize', 'benchmark'], categories: ['performance'] }
    ];
    
    for (const skill of mockSkills) {
      skills.set(skill.name, {
        ...skill,
        description: `${skill.name} skill`,
        execute: async (input) => {
          return { skill: skill.name, input, executed: true, mock: true };
        }
      });
    }
  }
  
  return skills;
}

/**
 * Create configured engine
 */
async function createEngine(projectPath) {
  const engine = createOrchestrationEngine({
    maxConcurrent: 5,
    timeout: 300000
  });
  
  // Load and register skills
  const skills = await loadSkills(projectPath);
  for (const [name, skill] of skills) {
    engine.registerSkill(name, skill);
  }
  
  return engine;
}

/**
 * Format execution result
 */
function formatResult(result, format = 'text') {
  if (format === 'json') {
    return JSON.stringify(result, null, 2);
  }
  
  let output = '';
  
  if (result.selectedSkill) {
    output += chalk.bold(`Selected Skill: `) + chalk.cyan(result.selectedSkill) + '\n';
    output += chalk.bold(`Confidence: `) + formatConfidence(result.confidence) + '\n';
  }
  
  if (result.results) {
    output += chalk.bold('\nExecution Results:\n');
    for (const r of result.results) {
      const status = r.status === ExecutionStatus.COMPLETED 
        ? chalk.green('✓') 
        : chalk.red('✗');
      const step = r.step ? `Step ${r.step}: ` : '';
      output += `  ${status} ${step}${chalk.cyan(r.skill)}`;
      if (r.error) {
        output += ` - ${chalk.red(r.error)}`;
      }
      output += '\n';
    }
  }
  
  if (result.summary) {
    output += chalk.bold('\nSummary:\n');
    output += `  Total Steps: ${result.summary.totalSteps}\n`;
    output += `  Completed: ${chalk.green(result.summary.completed)}\n`;
    output += `  Failed: ${chalk.red(result.summary.failed)}\n`;
    output += `  Success Rate: ${result.summary.successRate}\n`;
  }
  
  return output;
}

/**
 * Format confidence level
 */
function formatConfidence(confidence) {
  if (confidence >= 0.8) return chalk.green(`${(confidence * 100).toFixed(0)}% (High)`);
  if (confidence >= 0.5) return chalk.yellow(`${(confidence * 100).toFixed(0)}% (Medium)`);
  return chalk.red(`${(confidence * 100).toFixed(0)}% (Low)`);
}

// Run pattern command
program
  .command('run <pattern>')
  .description('Execute an orchestration pattern')
  .option('-s, --skills <skills...>', 'Skills to execute')
  .option('-t, --task <task>', 'Task description')
  .option('-i, --input <json>', 'Input data as JSON')
  .option('-f, --format <type>', 'Output format (text|json)', 'text')
  .action(async (pattern, options) => {
    try {
      console.log(chalk.bold(`\n🎭 Running ${pattern} pattern\n`));
      
      const engine = await createEngine(process.cwd());
      
      const input = options.input ? JSON.parse(options.input) : {};
      if (options.skills) {
        input.skills = options.skills;
      }
      
      const context = await engine.execute(pattern, {
        task: options.task || `Execute ${pattern} pattern`,
        input
      });
      
      if (context.status === ExecutionStatus.COMPLETED) {
        console.log(chalk.green('✓ Pattern execution completed\n'));
        console.log(formatResult(context.output, options.format));
      } else {
        console.log(chalk.red(`✗ Pattern execution failed: ${context.error}\n`));
        process.exit(1);
      }
      
    } catch (error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}\n`));
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Auto pattern command
program
  .command('auto <task>')
  .description('Automatically select and execute the best skill for a task')
  .option('-i, --input <json>', 'Input data as JSON')
  .option('-f, --format <type>', 'Output format (text|json)', 'text')
  .option('--multi', 'Execute multiple matching skills')
  .action(async (task, options) => {
    try {
      console.log(chalk.bold('\n🤖 Auto Pattern - Intelligent Skill Selection\n'));
      console.log(chalk.dim(`Task: ${task}\n`));
      
      const engine = await createEngine(process.cwd());
      
      const input = options.input ? JSON.parse(options.input) : {};
      input.task = task;
      
      // Update auto pattern config if multi mode
      if (options.multi) {
        const autoPattern = engine.getPattern(PatternType.AUTO);
        if (autoPattern) {
          autoPattern.options.multiMatch = true;
        }
      }
      
      const context = await engine.execute(PatternType.AUTO, {
        task,
        input
      });
      
      if (context.status === ExecutionStatus.COMPLETED) {
        console.log(chalk.green('✓ Auto execution completed\n'));
        console.log(formatResult(context.output, options.format));
      } else {
        console.log(chalk.red(`✗ Auto execution failed: ${context.error}\n`));
        process.exit(1);
      }
      
    } catch (error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}\n`));
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Sequential pattern command
program
  .command('sequential')
  .description('Execute skills in sequence')
  .requiredOption('-s, --skills <skills...>', 'Skills to execute in order')
  .option('-i, --input <json>', 'Initial input data as JSON')
  .option('-f, --format <type>', 'Output format (text|json)', 'text')
  .option('--continue-on-error', 'Continue execution on error')
  .action(async (options) => {
    try {
      console.log(chalk.bold('\n🔗 Sequential Pattern - Step-by-Step Execution\n'));
      console.log(chalk.dim(`Skills: ${options.skills.join(' → ')}\n`));
      
      const engine = await createEngine(process.cwd());
      
      const initialInput = options.input ? JSON.parse(options.input) : {};
      
      const context = await engine.execute(PatternType.SEQUENTIAL, {
        task: `Sequential execution of ${options.skills.length} skills`,
        input: {
          skills: options.skills,
          initialInput
        }
      });
      
      if (context.status === ExecutionStatus.COMPLETED) {
        console.log(chalk.green('\n✓ Sequential execution completed\n'));
        console.log(formatResult(context.output, options.format));
      } else {
        console.log(chalk.red(`\n✗ Sequential execution failed: ${context.error}\n`));
        process.exit(1);
      }
      
    } catch (error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}\n`));
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// List patterns command
program
  .command('list-patterns')
  .description('List available orchestration patterns')
  .option('-f, --format <type>', 'Output format (text|json)', 'text')
  .action(async (options) => {
    try {
      console.log(chalk.bold('\n🎭 Available Orchestration Patterns\n'));
      
      const engine = await createEngine(process.cwd());
      const patterns = engine.listPatterns();
      
      if (options.format === 'json') {
        const patternData = patterns.map(name => {
          const pattern = engine.getPattern(name);
          return {
            name,
            metadata: pattern.metadata || { name }
          };
        });
        console.log(JSON.stringify(patternData, null, 2));
      } else {
        if (patterns.length === 0) {
          console.log(chalk.yellow('No patterns registered'));
        } else {
          for (const name of patterns) {
            const pattern = engine.getPattern(name);
            const meta = pattern.metadata || {};
            console.log(chalk.cyan(`  ${name}`));
            if (meta.description) {
              console.log(chalk.dim(`    ${meta.description}`));
            }
          }
        }
      }
      
      console.log('');
      
    } catch (error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

// List skills command
program
  .command('list-skills')
  .description('List available skills')
  .option('-f, --format <type>', 'Output format (text|json)', 'text')
  .option('--category <category>', 'Filter by category')
  .action(async (options) => {
    try {
      console.log(chalk.bold('\n🛠️  Available Skills\n'));
      
      const engine = await createEngine(process.cwd());
      const skillNames = engine.listSkills();
      
      let skills = skillNames.map(name => {
        const skill = engine.getSkill(name);
        return { name, ...skill };
      });
      
      // Filter by category
      if (options.category) {
        skills = skills.filter(s => 
          s.categories && s.categories.includes(options.category)
        );
      }
      
      if (options.format === 'json') {
        console.log(JSON.stringify(skills, null, 2));
      } else {
        if (skills.length === 0) {
          console.log(chalk.yellow('No skills found'));
        } else {
          // Group by category
          const byCategory = {};
          for (const skill of skills) {
            const cat = (skill.categories && skill.categories[0]) || 'other';
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(skill);
          }
          
          for (const [category, catSkills] of Object.entries(byCategory)) {
            console.log(chalk.bold(`  ${category}:`));
            for (const skill of catSkills) {
              console.log(chalk.cyan(`    ${skill.name}`));
              if (skill.keywords && skill.keywords.length > 0) {
                console.log(chalk.dim(`      Keywords: ${skill.keywords.join(', ')}`));
              }
            }
            console.log('');
          }
        }
      }
      
    } catch (error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

// ============================================================================
// Replanning Commands
// ============================================================================

// Goal tracking command
program
  .command('goal')
  .description('Manage goals for goal-driven replanning')
  .argument('<action>', 'Action: list, add, update, remove, status')
  .option('-n, --name <name>', 'Goal name')
  .option('-d, --description <desc>', 'Goal description')
  .option('-p, --priority <priority>', 'Priority (1-10)', '5')
  .option('--deadline <date>', 'Deadline (ISO date)')
  .option('--progress <progress>', 'Progress (0-1)')
  .option('--id <id>', 'Goal ID')
  .option('-f, --format <type>', 'Output format (text|json)', 'text')
  .action(async (action, options) => {
    try {
      const tracker = new GoalProgressTracker();
      
      switch (action) {
        case 'add': {
          if (!options.name) {
            console.error(chalk.red('Error: --name is required'));
            process.exit(1);
          }
          
          const goal = tracker.registerGoal({
            name: options.name,
            description: options.description || '',
            priority: parseInt(options.priority, 10),
            deadline: options.deadline ? new Date(options.deadline).getTime() : null
          });
          
          console.log(chalk.green(`\n✓ Goal created: ${goal.id}\n`));
          console.log(chalk.cyan(`  Name: ${goal.name}`));
          console.log(chalk.dim(`  Priority: ${goal.priority}`));
          if (goal.deadline) {
            console.log(chalk.dim(`  Deadline: ${new Date(goal.deadline).toISOString()}`));
          }
          console.log('');
          break;
        }
        
        case 'list': {
          console.log(chalk.bold('\n🎯 Registered Goals\n'));
          
          const goals = Array.from(tracker.goals.values());
          
          if (options.format === 'json') {
            console.log(JSON.stringify(goals.map(g => g.toJSON()), null, 2));
          } else if (goals.length === 0) {
            console.log(chalk.yellow('  No goals registered'));
          } else {
            for (const goal of goals) {
              const statusIcon = goal.isComplete() ? chalk.green('✓') : 
                                 goal.status === 'in-progress' ? chalk.yellow('◐') : 
                                 chalk.dim('○');
              console.log(`  ${statusIcon} ${chalk.cyan(goal.name)} (${goal.id})`);
              console.log(chalk.dim(`     Progress: ${(goal.progress * 100).toFixed(0)}% | Priority: ${goal.priority} | Status: ${goal.status}`));
            }
          }
          console.log('');
          break;
        }
        
        case 'update': {
          if (!options.id) {
            console.error(chalk.red('Error: --id is required'));
            process.exit(1);
          }
          
          if (options.progress) {
            tracker.updateProgress(options.id, parseFloat(options.progress));
            console.log(chalk.green(`\n✓ Goal ${options.id} updated to ${(parseFloat(options.progress) * 100).toFixed(0)}% progress\n`));
          }
          break;
        }
        
        case 'status': {
          console.log(chalk.bold('\n📊 Goal Tracking Status\n'));
          console.log(`  Goals: ${tracker.goals.size}`);
          console.log(`  Tracking: ${tracker.isTracking ? chalk.green('Active') : chalk.dim('Inactive')}`);
          console.log('');
          break;
        }
        
        default:
          console.error(chalk.red(`Unknown action: ${action}`));
          console.log('Available actions: list, add, update, remove, status');
          process.exit(1);
      }
      
    } catch (error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

// Replan command
program
  .command('replan')
  .description('Trigger replanning analysis')
  .option('-p, --plan <json>', 'Current plan as JSON')
  .option('-f, --plan-file <file>', 'Plan file path')
  .option('--trigger <type>', 'Trigger type (failure|timeout|manual|resource)', 'manual')
  .option('--context <json>', 'Execution context as JSON')
  .option('-o, --output <file>', 'Output file for alternatives')
  .option('--format <type>', 'Output format (text|json)', 'text')
  .action(async (options) => {
    try {
      console.log(chalk.bold('\n🔄 Replanning Analysis\n'));
      
      let plan;
      if (options.planFile) {
        plan = await fs.readJson(options.planFile);
      } else if (options.plan) {
        plan = JSON.parse(options.plan);
      } else {
        // Demo plan
        plan = {
          id: 'demo-plan',
          name: 'Demo Plan',
          tasks: [
            { id: 't1', skill: 'requirements-analyst', name: 'Analyze Requirements' },
            { id: 't2', skill: 'system-architect', name: 'Design Architecture', dependencies: ['t1'] },
            { id: 't3', skill: 'code-generator', name: 'Generate Code', dependencies: ['t2'] }
          ]
        };
        console.log(chalk.dim('  Using demo plan (provide --plan or --plan-file for custom plan)\n'));
      }
      
      const engine = new ReplanningEngine();
      const normalized = engine.normalizePlan(plan);
      
      console.log(chalk.bold('  Plan:'));
      console.log(`    ID: ${chalk.cyan(normalized.id)}`);
      console.log(`    Tasks: ${normalized.tasks.length}`);
      
      // Show tasks
      for (const task of normalized.tasks) {
        console.log(chalk.dim(`      - ${task.name || task.skill} (${task.id})`));
      }
      
      console.log(chalk.bold('\n  Analysis:'));
      console.log(`    Trigger: ${chalk.yellow(options.trigger)}`);
      console.log(`    Status: ${chalk.green('Ready for replanning')}`);
      
      if (options.output) {
        await fs.writeJson(options.output, {
          plan: normalized,
          trigger: options.trigger,
          timestamp: new Date().toISOString()
        }, { spaces: 2 });
        console.log(chalk.dim(`\n  Output written to: ${options.output}`));
      }
      
      console.log('');
      
    } catch (error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

// Goal modification command
program
  .command('modify-goal')
  .description('Adaptively modify a goal based on constraints')
  .option('--id <id>', 'Goal ID to modify')
  .option('--reason <reason>', 'Modification reason (time|resource|dependency|priority)', 'time')
  .option('--approve', 'Auto-approve modification')
  .option('-f, --format <type>', 'Output format (text|json)', 'text')
  .action(async (options) => {
    try {
      console.log(chalk.bold('\n🔧 Adaptive Goal Modification\n'));
      
      const modifier = new AdaptiveGoalModifier({ requireApproval: !options.approve });
      
      // Demo goal if no ID provided
      const goal = modifier.registerGoal({
        id: options.id || 'demo-goal',
        name: 'Demo Goal',
        priority: 'high',
        targetDate: new Date(Date.now() + 86400000 * 7).toISOString(),
        deliverables: [
          { id: 'd1', name: 'Core Feature', priority: 'critical' },
          { id: 'd2', name: 'Documentation', priority: 'normal' }
        ]
      });
      
      const reasonMap = {
        time: ModificationReason.TIME_CONSTRAINT,
        resource: ModificationReason.RESOURCE_CONSTRAINT,
        dependency: ModificationReason.DEPENDENCY_FAILURE,
        priority: ModificationReason.PRIORITY_SHIFT
      };
      
      const trigger = { reason: reasonMap[options.reason] || ModificationReason.TIME_CONSTRAINT };
      
      console.log(chalk.bold('  Goal:'));
      console.log(`    ID: ${chalk.cyan(goal.id)}`);
      console.log(`    Name: ${goal.name}`);
      console.log(`    Priority: ${goal.priority}`);
      
      console.log(chalk.bold('\n  Trigger:'));
      console.log(`    Reason: ${chalk.yellow(trigger.reason)}`);
      
      const result = await modifier.triggerModification(goal.id, trigger);
      
      console.log(chalk.bold('\n  Result:'));
      console.log(`    Status: ${result.status === 'applied' ? chalk.green(result.status) : chalk.yellow(result.status)}`);
      
      if (result.modification) {
        console.log(`    Strategy: ${chalk.cyan(result.modification.strategy.type)}`);
        console.log(`    Confidence: ${(result.modification.confidence * 100).toFixed(0)}%`);
        
        if (result.modification.impact) {
          console.log(`    Impact Score: ${(result.modification.impact.totalScore * 100).toFixed(0)}%`);
          console.log(`    Risk Level: ${result.modification.impact.riskLevel}`);
        }
      }
      
      if (options.format === 'json') {
        console.log('\n' + JSON.stringify(result, null, 2));
      }
      
      console.log('');
      
    } catch (error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

// Path optimization command
program
  .command('optimize-path')
  .description('Analyze and optimize execution path')
  .option('-p, --path <json>', 'Execution path as JSON')
  .option('-f, --path-file <file>', 'Path file')
  .option('--format <type>', 'Output format (text|json)', 'text')
  .action(async (options) => {
    try {
      console.log(chalk.bold('\n⚡ Path Optimization Analysis\n'));
      
      const optimizer = new ProactivePathOptimizer(null);
      
      let pathData;
      if (options.pathFile) {
        pathData = await fs.readJson(options.pathFile);
      } else if (options.path) {
        pathData = JSON.parse(options.path);
      } else {
        // Demo path
        pathData = {
          pending: [
            { id: 't1', name: 'Task 1', estimatedDuration: 10000, dependencies: [] },
            { id: 't2', name: 'Task 2', estimatedDuration: 5000, dependencies: [] },
            { id: 't3', name: 'Task 3', estimatedDuration: 8000, dependencies: ['t1'] },
            { id: 't4', name: 'Task 4', estimatedDuration: 3000, dependencies: ['t2', 't3'] }
          ]
        };
        console.log(chalk.dim('  Using demo path (provide --path or --path-file for custom)\n'));
      }
      
      const metrics = optimizer.calculatePathMetrics(pathData);
      
      console.log(chalk.bold('  Path Metrics:'));
      console.log(`    Estimated Time: ${chalk.cyan(metrics.estimatedTime + 'ms')}`);
      console.log(`    Parallelization Factor: ${(metrics.parallelizationFactor * 100).toFixed(0)}%`);
      console.log(`    Risk Score: ${metrics.riskScore.toFixed(2)}`);
      console.log(`    Overall Score: ${metrics.getScore().toFixed(2)}`);
      
      console.log(chalk.bold('\n  Tasks:'));
      for (const task of pathData.pending) {
        const deps = task.dependencies?.length ? ` -> [${task.dependencies.join(', ')}]` : '';
        console.log(chalk.dim(`    - ${task.name} (${task.id})${deps}`));
      }
      
      if (options.format === 'json') {
        console.log('\n' + JSON.stringify({
          path: pathData,
          metrics: {
            estimatedTime: metrics.estimatedTime,
            parallelizationFactor: metrics.parallelizationFactor,
            riskScore: metrics.riskScore,
            score: metrics.getScore()
          }
        }, null, 2));
      }
      
      console.log('');
      
    } catch (error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Show orchestration engine status')
  .option('-f, --format <type>', 'Output format (text|json)', 'text')
  .action(async (options) => {
    try {
      console.log(chalk.bold('\n📊 Orchestration Status\n'));
      
      const engine = await createEngine(process.cwd());
      const status = engine.getStatus();
      
      if (options.format === 'json') {
        console.log(JSON.stringify(status, null, 2));
      } else {
        console.log(chalk.bold('Patterns:'));
        console.log(`  Registered: ${chalk.cyan(status.patterns.length)}`);
        for (const p of status.patterns) {
          console.log(`    - ${p}`);
        }
        
        console.log(chalk.bold('\nSkills:'));
        console.log(`  Registered: ${chalk.cyan(status.skills.length)}`);
        
        console.log(chalk.bold('\nActive Executions:'));
        console.log(`  Count: ${chalk.cyan(status.activeExecutions)}`);
        
        if (status.contexts.length > 0) {
          console.log(chalk.bold('\nActive Contexts:'));
          for (const ctx of status.contexts) {
            console.log(`  - ${ctx.id}: ${ctx.task} (${ctx.status})`);
          }
        }
      }
      
      console.log('');
      
    } catch (error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
