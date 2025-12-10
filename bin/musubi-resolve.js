#!/usr/bin/env node

/**
 * MUSUBI Resolve - Automated Issue Resolution CLI
 *
 * Resolves GitHub Issues automatically:
 * - Fetches issue details from GitHub API
 * - Analyzes codebase for relevant context
 * - Proposes solutions based on project rules
 * - Creates pull requests with fixes
 *
 * Usage:
 *   musubi-resolve <issue-number>           # Resolve a specific issue
 *   musubi-resolve --url <issue-url>        # Resolve by GitHub URL
 *   musubi-resolve --dry-run <issue-number> # Preview without creating PR
 *   musubi-resolve --list                   # List recent issues
 */

const { Command } = require('commander');
const chalk = require('chalk');
const _path = require('path');

// Import resolvers
let IssueResolver, GitHubClient;
try {
  IssueResolver = require('../src/resolvers/issue-resolver');
  GitHubClient = require('../src/integrations/github-client');
} catch {
  // Modules may not exist yet
}

const program = new Command();

program
  .name('musubi-resolve')
  .description('Automated Issue Resolution - Analyze and fix GitHub issues')
  .version('0.7.0');

/**
 * Extract owner/repo/number from GitHub issue URL
 */
function parseIssueUrl(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
  if (!match) {
    throw new Error('Invalid GitHub issue URL format');
  }
  return {
    owner: match[1],
    repo: match[2],
    number: parseInt(match[3])
  };
}

/**
 * Get GitHub context from git config or environment
 */
function getGitHubContext() {
  const { execSync } = require('child_process');
  
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const match = remoteUrl.match(/github\.com[:/]([^/]+)\/(.+?)(\.git)?$/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  } catch {
    // Not in a git repo or no remote
  }
  
  // Try environment variables
  if (process.env.GITHUB_REPOSITORY) {
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    return { owner, repo };
  }
  
  return null;
}

// Resolve issue command (default)
program
  .argument('[issue-number]', 'GitHub issue number to resolve')
  .option('-u, --url <url>', 'GitHub issue URL')
  .option('--dry-run', 'Preview resolution without creating PR')
  .option('--branch <name>', 'Custom branch name for the fix')
  .option('-f, --format <type>', 'Output format: console, json', 'console')
  .option('-v, --verbose', 'Show detailed resolution steps')
  .action(async (issueNumber, options) => {
    try {
      let owner, repo, number;
      
      // Parse issue reference
      if (options.url) {
        const parsed = parseIssueUrl(options.url);
        owner = parsed.owner;
        repo = parsed.repo;
        number = parsed.number;
      } else if (issueNumber) {
        number = parseInt(issueNumber);
        const context = getGitHubContext();
        if (!context) {
          console.error(chalk.red('✗ Could not determine GitHub repository.'));
          console.error(chalk.dim('  Use --url to specify the full issue URL.'));
          process.exit(1);
        }
        owner = context.owner;
        repo = context.repo;
      } else {
        program.outputHelp();
        return;
      }
      
      console.log(chalk.bold('\n🔧 MUSUBI Issue Resolver\n'));
      console.log(chalk.dim(`Repository: ${owner}/${repo}`));
      console.log(chalk.dim(`Issue: #${number}`));
      console.log(chalk.dim('━'.repeat(50)));
      
      // Check for GitHub token
      const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
      if (!token) {
        console.log(chalk.yellow('\n⚠ No GITHUB_TOKEN found. Running in offline mode.\n'));
      }
      
      // Initialize resolver
      if (!IssueResolver) {
        console.error(chalk.red('✗ IssueResolver module not found.'));
        console.error(chalk.dim('  Please ensure src/resolvers/issue-resolver.js exists.'));
        process.exit(1);
      }
      
      const resolver = new IssueResolver({
        workspaceRoot: process.cwd(),
        owner,
        repo,
        token,
        verbose: options.verbose
      });
      
      // Step 1: Fetch issue details
      console.log(chalk.cyan('\n[1/4] Fetching issue details...'));
      const issue = await resolver.fetchIssue(number);
      
      if (options.verbose) {
        console.log(chalk.dim(`  Title: ${issue.title}`));
        console.log(chalk.dim(`  Labels: ${issue.labels?.map(l => l.name || l).join(', ') || 'none'}`));
      }
      
      // Step 2: Analyze issue
      console.log(chalk.cyan('[2/4] Analyzing issue context...'));
      const analysis = await resolver.analyze(issue);
      
      if (options.verbose) {
        console.log(chalk.dim(`  Type: ${analysis.issueType}`));
        console.log(chalk.dim(`  Confidence: ${analysis.confidence}%`));
        console.log(chalk.dim(`  Files to modify: ${analysis.suggestedFiles?.length || 0}`));
      }
      
      // Step 3: Generate solution
      console.log(chalk.cyan('[3/4] Generating solution...'));
      const solution = await resolver.resolve(issue, analysis);
      
      if (options.format === 'json') {
        console.log(JSON.stringify({
          issue: { number, title: issue.title, owner, repo },
          analysis,
          solution,
          dryRun: options.dryRun
        }, null, 2));
        return;
      }
      
      // Display solution summary
      console.log(chalk.bold('\n📋 Resolution Summary\n'));
      console.log(chalk.bold('━'.repeat(50)));
      console.log(`\n${chalk.bold('Issue:')} ${issue.title}`);
      console.log(`${chalk.bold('Type:')} ${analysis.issueType}`);
      console.log(`${chalk.bold('Confidence:')} ${analysis.confidence}%`);
      
      if (solution.changes && solution.changes.length > 0) {
        console.log(chalk.bold('\nProposed Changes:'));
        solution.changes.forEach((change, i) => {
          console.log(chalk.dim(`  ${i + 1}. ${change.file}: ${change.description}`));
        });
      }
      
      if (solution.steps && solution.steps.length > 0) {
        console.log(chalk.bold('\nResolution Steps:'));
        solution.steps.forEach((step, i) => {
          console.log(chalk.dim(`  ${i + 1}. ${step}`));
        });
      }
      
      // Step 4: Create PR (if not dry run)
      if (options.dryRun) {
        console.log(chalk.yellow('\n[DRY RUN] No pull request created.\n'));
        return;
      }
      
      if (!token) {
        console.log(chalk.yellow('\n⚠ Cannot create PR without GITHUB_TOKEN.\n'));
        console.log(chalk.dim('  Set GITHUB_TOKEN environment variable to enable PR creation.'));
        return;
      }
      
      console.log(chalk.cyan('[4/4] Creating pull request...'));
      
      const branchName = options.branch || `fix/issue-${number}`;
      const pr = await resolver.createPR({
        issue,
        solution,
        branchName
      });
      
      if (pr) {
        console.log(chalk.green('\n✓ Pull request created successfully!\n'));
        console.log(chalk.bold(`  PR #${pr.number}: ${pr.title}`));
        console.log(chalk.cyan(`  ${pr.html_url || pr.url}`));
      } else {
        console.log(chalk.yellow('\n⚠ Could not create pull request.'));
        console.log(chalk.dim('  Review the proposed changes above and create manually.'));
      }
      
      console.log();
    } catch (error) {
      console.error(chalk.red('\n✗ Resolution failed:'), error.message);
      if (options.verbose) {
        console.error(chalk.dim(error.stack));
      }
      process.exit(1);
    }
  });

// List issues command
program
  .command('list')
  .description('List recent open issues from the repository')
  .option('-n, --limit <number>', 'Maximum number of issues to show', '10')
  .option('-l, --labels <labels>', 'Filter by labels (comma-separated)')
  .option('-f, --format <type>', 'Output format: console, json', 'console')
  .action(async options => {
    try {
      const context = getGitHubContext();
      if (!context) {
        console.error(chalk.red('✗ Could not determine GitHub repository.'));
        process.exit(1);
      }
      
      const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
      if (!token) {
        console.error(chalk.red('✗ GITHUB_TOKEN required to list issues.'));
        process.exit(1);
      }
      
      if (!GitHubClient) {
        console.error(chalk.red('✗ GitHubClient module not found.'));
        process.exit(1);
      }
      
      const client = new GitHubClient({
        token,
        owner: context.owner,
        repo: context.repo
      });
      
      const labels = options.labels ? options.labels.split(',') : undefined;
      const issues = await client.listIssues({
        state: 'open',
        labels,
        per_page: parseInt(options.limit) || 10
      });
      
      if (options.format === 'json') {
        console.log(JSON.stringify(issues, null, 2));
        return;
      }
      
      console.log(chalk.bold(`\n📋 Open Issues - ${context.owner}/${context.repo}\n`));
      console.log(chalk.bold('━'.repeat(70)));
      
      if (issues.length === 0) {
        console.log(chalk.dim('\n  No open issues found.\n'));
        return;
      }
      
      issues.forEach(issue => {
        const labelStr = issue.labels?.map(l => l.name).join(', ') || '';
        console.log(`\n  #${chalk.cyan(issue.number)} ${issue.title}`);
        if (labelStr) {
          console.log(chalk.dim(`     Labels: ${labelStr}`));
        }
        console.log(chalk.dim(`     ${issue.html_url}`));
      });
      
      console.log('\n' + chalk.bold('━'.repeat(70)));
      console.log(chalk.dim(`\nShowing ${issues.length} of total open issues.`));
      console.log(chalk.dim('Run `musubi-resolve <number>` to resolve an issue.\n'));
    } catch (error) {
      console.error(chalk.red('✗ Failed to list issues:'), error.message);
      process.exit(1);
    }
  });

// Parse arguments
program.parse(process.argv);

// Show help if no arguments
if (process.argv.length === 2) {
  program.outputHelp();
}
