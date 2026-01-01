#!/usr/bin/env node

/**
 * MUSUBI Initialization Script
 *
 * Initializes a new project with MUSUBI SDD tools for various AI coding agents:
 * - Claude Code: .claude/skills/ (25 skills) + .claude/commands/
 * - GitHub Copilot: .github/prompts/
 * - Cursor: .cursor/commands/
 * - Gemini CLI: .gemini/commands/
 * - Codex CLI: .codex/prompts/
 * - Qwen Code: .qwen/commands/
 * - Windsurf: .windsurf/workflows/
 *
 * All agents get:
 * - steering/ directory with project memory
 * - templates/ for documents
 * - Constitutional governance
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

const TEMPLATE_DIR = path.join(__dirname, '..', 'src', 'templates');
const SHARED_TEMPLATE_DIR = path.join(TEMPLATE_DIR, 'shared');
const AGENTS_TEMPLATE_DIR = path.join(TEMPLATE_DIR, 'agents');

/**
 * External specification reference handler
 * Supports: URL (http/https), local file path, Git repository
 * @param {string} specSource - Specification source (URL, file path, or git URL)
 * @returns {object} Parsed specification with metadata
 */
async function fetchExternalSpec(specSource) {
  const result = {
    source: specSource,
    type: 'unknown',
    content: null,
    metadata: {},
    error: null,
  };

  try {
    // Determine source type
    if (specSource.startsWith('http://') || specSource.startsWith('https://')) {
      result.type = 'url';
      const https = require('https');
      const http = require('http');
      const protocol = specSource.startsWith('https://') ? https : http;

      result.content = await new Promise((resolve, reject) => {
        protocol
          .get(specSource, res => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              // Handle redirect
              fetchExternalSpec(res.headers.location).then(r => resolve(r.content));
              return;
            }
            if (res.statusCode !== 200) {
              reject(new Error(`HTTP ${res.statusCode}`));
              return;
            }
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => resolve(data));
          })
          .on('error', reject);
      });

      // Extract metadata from URL
      result.metadata.url = specSource;
      result.metadata.fetchedAt = new Date().toISOString();
    } else if (specSource.startsWith('git://') || specSource.includes('.git')) {
      result.type = 'git';
      result.metadata.repository = specSource;
      // For Git repos, we'll store the reference for later cloning
      result.content = `# External Specification Reference\n\nRepository: ${specSource}\n\n> Clone this repository to access the full specification.\n`;
    } else if (fs.existsSync(specSource)) {
      result.type = 'file';
      result.content = await fs.readFile(specSource, 'utf8');
      result.metadata.path = path.resolve(specSource);
      result.metadata.readAt = new Date().toISOString();
    } else {
      result.error = `Specification source not found: ${specSource}`;
    }

    // Try to parse specification format
    if (result.content) {
      result.metadata.format = detectSpecFormat(result.content, specSource);
      result.metadata.summary = extractSpecSummary(result.content);
    }
  } catch (err) {
    result.error = err.message;
  }

  return result;
}

/**
 * Parse GitHub repository reference
 * Supports formats:
 * - owner/repo
 * - https://github.com/owner/repo
 * - git@github.com:owner/repo.git
 * @param {string} repoRef - Repository reference string
 * @returns {object} Parsed repository info
 */
function parseGitHubRepo(repoRef) {
  let owner = '';
  let repo = '';
  let branch = 'main';
  let path = '';

  // Handle owner/repo format
  const simpleMatch = repoRef.match(/^([^/]+)\/([^/@#]+)(?:@([^#]+))?(?:#(.+))?$/);
  if (simpleMatch) {
    owner = simpleMatch[1];
    repo = simpleMatch[2];
    branch = simpleMatch[3] || 'main';
    path = simpleMatch[4] || '';
    return { owner, repo, branch, path, url: `https://github.com/${owner}/${repo}` };
  }

  // Handle https://github.com/owner/repo format
  const httpsMatch = repoRef.match(
    /github\.com\/([^/]+)\/([^/@#\s]+?)(?:\.git)?(?:@([^#]+))?(?:#(.+))?$/
  );
  if (httpsMatch) {
    owner = httpsMatch[1];
    repo = httpsMatch[2];
    branch = httpsMatch[3] || 'main';
    path = httpsMatch[4] || '';
    return { owner, repo, branch, path, url: `https://github.com/${owner}/${repo}` };
  }

  // Handle git@github.com:owner/repo.git format
  const sshMatch = repoRef.match(
    /git@github\.com:([^/]+)\/([^/.]+)(?:\.git)?(?:@([^#]+))?(?:#(.+))?$/
  );
  if (sshMatch) {
    owner = sshMatch[1];
    repo = sshMatch[2];
    branch = sshMatch[3] || 'main';
    path = sshMatch[4] || '';
    return { owner, repo, branch, path, url: `https://github.com/${owner}/${repo}` };
  }

  return { error: `Invalid GitHub repository format: ${repoRef}` };
}

/**
 * Fetch GitHub repository metadata and key files
 * @param {string} repoRef - Repository reference (owner/repo, URL, etc.)
 * @returns {object} Repository data with structure and key files
 */
async function fetchGitHubRepo(repoRef) {
  const parsed = parseGitHubRepo(repoRef);
  if (parsed.error) {
    return { source: repoRef, error: parsed.error };
  }

  const { owner, repo, branch, path: subPath } = parsed;
  const https = require('https');

  const result = {
    source: repoRef,
    owner,
    repo,
    branch,
    url: parsed.url,
    metadata: {},
    files: {},
    structure: [],
    improvements: [],
    error: null,
  };

  // Helper to fetch from GitHub API
  const fetchGitHubAPI = endpoint =>
    new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: endpoint,
        headers: {
          'User-Agent': 'MUSUBI-SDD',
          Accept: 'application/vnd.github.v3+json',
        },
      };

      // Add GitHub token if available
      if (process.env.GITHUB_TOKEN) {
        options.headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
      }

      https
        .get(options, res => {
          let data = '';
          res.on('data', chunk => (data += chunk));
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                resolve(JSON.parse(data));
              } catch {
                reject(new Error('Invalid JSON response'));
              }
            } else if (res.statusCode === 404) {
              reject(new Error(`Repository not found: ${owner}/${repo}`));
            } else if (res.statusCode === 403) {
              reject(
                new Error('GitHub API rate limit exceeded. Set GITHUB_TOKEN environment variable.')
              );
            } else {
              reject(new Error(`GitHub API error: ${res.statusCode}`));
            }
          });
        })
        .on('error', reject);
    });

  // Fetch raw file content
  const fetchRawFile = filePath =>
    new Promise((resolve, reject) => {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
      https
        .get(rawUrl, res => {
          if (res.statusCode === 302 || res.statusCode === 301) {
            https
              .get(res.headers.location, res2 => {
                let data = '';
                res2.on('data', chunk => (data += chunk));
                res2.on('end', () => resolve(data));
              })
              .on('error', reject);
            return;
          }
          if (res.statusCode !== 200) {
            resolve(null); // File not found is OK
            return;
          }
          let data = '';
          res.on('data', chunk => (data += chunk));
          res.on('end', () => resolve(data));
        })
        .on('error', reject);
    });

  try {
    // Fetch repository metadata
    const repoData = await fetchGitHubAPI(`/repos/${owner}/${repo}`);
    result.metadata = {
      name: repoData.name,
      description: repoData.description,
      language: repoData.language,
      stars: repoData.stargazers_count,
      topics: repoData.topics || [],
      license: repoData.license?.spdx_id,
      defaultBranch: repoData.default_branch,
      updatedAt: repoData.updated_at,
    };

    // Fetch directory structure (root level)
    const treePath = subPath
      ? `/repos/${owner}/${repo}/contents/${subPath}`
      : `/repos/${owner}/${repo}/contents`;
    try {
      const contents = await fetchGitHubAPI(treePath);
      if (Array.isArray(contents)) {
        result.structure = contents.map(item => ({
          name: item.name,
          type: item.type,
          path: item.path,
        }));
      }
    } catch {
      // Ignore structure fetch errors
    }

    // Fetch key files for analysis
    const keyFiles = [
      'README.md',
      'package.json',
      'Cargo.toml',
      'pyproject.toml',
      'go.mod',
      'pom.xml',
      '.github/CODEOWNERS',
      'ARCHITECTURE.md',
      'CONTRIBUTING.md',
      'docs/architecture.md',
      'src/lib.rs',
      'src/index.ts',
      'src/main.ts',
    ];

    for (const file of keyFiles) {
      const filePath = subPath ? `${subPath}/${file}` : file;
      try {
        const content = await fetchRawFile(filePath);
        if (content) {
          result.files[file] = content.slice(0, 10000); // Limit content size
        }
      } catch {
        // Ignore individual file fetch errors
      }
    }
  } catch (err) {
    result.error = err.message;
  }

  return result;
}

/**
 * Fetch multiple GitHub repositories
 * @param {string[]} repos - Array of repository references
 * @returns {object[]} Array of repository data
 */
async function fetchGitHubRepos(repos) {
  const results = [];

  for (const repoRef of repos) {
    console.log(chalk.cyan(`  📦 Fetching ${repoRef}...`));
    const repoData = await fetchGitHubRepo(repoRef);

    if (repoData.error) {
      console.log(chalk.yellow(`    ⚠️ ${repoData.error}`));
    } else {
      console.log(
        chalk.green(
          `    ✓ ${repoData.metadata.name || repoData.repo} (${repoData.metadata.language || 'unknown'})`
        )
      );
      if (repoData.metadata.description) {
        console.log(chalk.gray(`      ${repoData.metadata.description.slice(0, 80)}`));
      }
    }

    results.push(repoData);
  }

  return results;
}

/**
 * Analyze repositories for improvement suggestions
 * @param {object[]} repos - Array of fetched repository data
 * @returns {object} Analysis results with patterns and suggestions
 */
function analyzeReposForImprovements(repos) {
  const analysis = {
    patterns: [],
    architectures: [],
    technologies: [],
    configurations: [],
    suggestions: [],
  };

  for (const repo of repos) {
    if (repo.error) continue;

    // Detect architecture patterns from structure
    const dirs = repo.structure.filter(s => s.type === 'dir').map(s => s.name);
    const files = repo.structure.filter(s => s.type === 'file').map(s => s.name);

    // Check for Clean Architecture
    if (dirs.some(d => ['domain', 'application', 'infrastructure', 'interface'].includes(d))) {
      analysis.architectures.push({
        repo: repo.repo,
        pattern: 'clean-architecture',
        evidence: dirs.filter(d =>
          ['domain', 'application', 'infrastructure', 'interface'].includes(d)
        ),
      });
    }

    // Check for Hexagonal Architecture
    if (dirs.some(d => ['adapters', 'ports', 'core', 'hexagon'].includes(d))) {
      analysis.architectures.push({
        repo: repo.repo,
        pattern: 'hexagonal',
        evidence: dirs.filter(d => ['adapters', 'ports', 'core', 'hexagon'].includes(d)),
      });
    }

    // Check for DDD patterns
    if (
      dirs.some(d =>
        ['aggregates', 'entities', 'valueobjects', 'repositories', 'services'].includes(
          d.toLowerCase()
        )
      )
    ) {
      analysis.patterns.push({
        repo: repo.repo,
        pattern: 'domain-driven-design',
        evidence: dirs,
      });
    }

    // Check for monorepo patterns
    if (
      dirs.includes('packages') ||
      dirs.includes('apps') ||
      files.includes('pnpm-workspace.yaml')
    ) {
      analysis.patterns.push({
        repo: repo.repo,
        pattern: 'monorepo',
        evidence: dirs.filter(d => ['packages', 'apps', 'libs'].includes(d)),
      });
    }

    // Analyze package.json for technologies
    if (repo.files['package.json']) {
      try {
        const pkg = JSON.parse(repo.files['package.json']);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        // Detect frameworks
        if (deps['react']) analysis.technologies.push({ repo: repo.repo, tech: 'react' });
        if (deps['vue']) analysis.technologies.push({ repo: repo.repo, tech: 'vue' });
        if (deps['@angular/core']) analysis.technologies.push({ repo: repo.repo, tech: 'angular' });
        if (deps['express']) analysis.technologies.push({ repo: repo.repo, tech: 'express' });
        if (deps['fastify']) analysis.technologies.push({ repo: repo.repo, tech: 'fastify' });
        if (deps['next']) analysis.technologies.push({ repo: repo.repo, tech: 'nextjs' });
        if (deps['typescript']) analysis.technologies.push({ repo: repo.repo, tech: 'typescript' });

        // Detect testing frameworks
        if (deps['jest']) analysis.configurations.push({ repo: repo.repo, config: 'jest' });
        if (deps['vitest']) analysis.configurations.push({ repo: repo.repo, config: 'vitest' });
        if (deps['mocha']) analysis.configurations.push({ repo: repo.repo, config: 'mocha' });

        // Detect linting/formatting
        if (deps['eslint']) analysis.configurations.push({ repo: repo.repo, config: 'eslint' });
        if (deps['prettier']) analysis.configurations.push({ repo: repo.repo, config: 'prettier' });
        if (deps['biome']) analysis.configurations.push({ repo: repo.repo, config: 'biome' });
      } catch {
        // Ignore JSON parse errors
      }
    }

    // Analyze Cargo.toml for Rust patterns
    if (repo.files['Cargo.toml']) {
      const cargo = repo.files['Cargo.toml'];
      if (cargo.includes('[workspace]')) {
        analysis.patterns.push({ repo: repo.repo, pattern: 'rust-workspace' });
      }
      if (cargo.includes('tokio')) analysis.technologies.push({ repo: repo.repo, tech: 'tokio' });
      if (cargo.includes('actix')) analysis.technologies.push({ repo: repo.repo, tech: 'actix' });
      if (cargo.includes('axum')) analysis.technologies.push({ repo: repo.repo, tech: 'axum' });
    }

    // Analyze pyproject.toml for Python patterns
    if (repo.files['pyproject.toml']) {
      const pyproj = repo.files['pyproject.toml'];
      if (pyproj.includes('fastapi'))
        analysis.technologies.push({ repo: repo.repo, tech: 'fastapi' });
      if (pyproj.includes('django'))
        analysis.technologies.push({ repo: repo.repo, tech: 'django' });
      if (pyproj.includes('flask')) analysis.technologies.push({ repo: repo.repo, tech: 'flask' });
      if (pyproj.includes('pytest'))
        analysis.configurations.push({ repo: repo.repo, config: 'pytest' });
    }

    // Extract README insights
    if (repo.files['README.md']) {
      const readme = repo.files['README.md'];

      // Check for badges that indicate good practices
      if (readme.includes('coverage')) {
        analysis.suggestions.push({
          repo: repo.repo,
          suggestion: 'code-coverage',
          description: 'Implements code coverage tracking',
        });
      }
      if (readme.includes('CI/CD') || readme.includes('Actions')) {
        analysis.suggestions.push({
          repo: repo.repo,
          suggestion: 'ci-cd',
          description: 'Has CI/CD pipeline configured',
        });
      }
    }
  }

  // Generate improvement suggestions based on analysis
  if (analysis.architectures.length > 0) {
    const archCounts = {};
    for (const arch of analysis.architectures) {
      archCounts[arch.pattern] = (archCounts[arch.pattern] || 0) + 1;
    }
    const mostCommon = Object.entries(archCounts).sort((a, b) => b[1] - a[1])[0];
    if (mostCommon) {
      analysis.suggestions.push({
        type: 'architecture',
        suggestion: `Consider using ${mostCommon[0]} pattern`,
        count: mostCommon[1],
        repos: analysis.architectures.filter(a => a.pattern === mostCommon[0]).map(a => a.repo),
      });
    }
  }

  if (analysis.technologies.length > 0) {
    const techCounts = {};
    for (const tech of analysis.technologies) {
      techCounts[tech.tech] = (techCounts[tech.tech] || 0) + 1;
    }
    const popular = Object.entries(techCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    for (const [tech, count] of popular) {
      analysis.suggestions.push({
        type: 'technology',
        suggestion: `Consider using ${tech}`,
        count,
        repos: analysis.technologies.filter(t => t.tech === tech).map(t => t.repo),
      });
    }
  }

  return analysis;
}

/**
 * Save reference repositories analysis to steering/references/
 * @param {object[]} repos - Fetched repository data
 * @param {object} analysis - Analysis results
 * @param {string} projectPath - Target project path
 * @returns {string} Created file path
 */
async function saveReferenceRepos(repos, analysis, projectPath) {
  const refsDir = path.join(projectPath, 'steering', 'references');
  await fs.ensureDir(refsDir);

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `github-references-${timestamp}.md`;

  // Build markdown content
  let content = `# GitHub Reference Repositories

> Analyzed on ${new Date().toISOString()}

## Referenced Repositories

`;

  for (const repo of repos) {
    if (repo.error) {
      content += `### ❌ ${repo.source}\n\n`;
      content += `Error: ${repo.error}\n\n`;
      continue;
    }

    content += `### ${repo.metadata.name || repo.repo}\n\n`;
    content += `- **URL**: ${repo.url}\n`;
    content += `- **Language**: ${repo.metadata.language || 'Unknown'}\n`;
    content += `- **Stars**: ${repo.metadata.stars || 0}\n`;
    if (repo.metadata.description) {
      content += `- **Description**: ${repo.metadata.description}\n`;
    }
    if (repo.metadata.topics && repo.metadata.topics.length > 0) {
      content += `- **Topics**: ${repo.metadata.topics.join(', ')}\n`;
    }
    if (repo.metadata.license) {
      content += `- **License**: ${repo.metadata.license}\n`;
    }
    content += '\n';

    // Structure
    if (repo.structure.length > 0) {
      content += '**Directory Structure:**\n\n';
      content += '```\n';
      for (const item of repo.structure.slice(0, 20)) {
        content += `${item.type === 'dir' ? '📁' : '📄'} ${item.name}\n`;
      }
      if (repo.structure.length > 20) {
        content += `... and ${repo.structure.length - 20} more items\n`;
      }
      content += '```\n\n';
    }
  }

  // Analysis section
  content += `## Analysis Results

### Architecture Patterns Detected

`;

  if (analysis.architectures.length > 0) {
    for (const arch of analysis.architectures) {
      content += `- **${arch.pattern}** in \`${arch.repo}\`\n`;
      content += `  - Evidence: ${arch.evidence.join(', ')}\n`;
    }
  } else {
    content += '_No specific architecture patterns detected_\n';
  }

  content += `\n### Design Patterns

`;

  if (analysis.patterns.length > 0) {
    for (const pattern of analysis.patterns) {
      content += `- **${pattern.pattern}** in \`${pattern.repo}\`\n`;
    }
  } else {
    content += '_No specific design patterns detected_\n';
  }

  content += `\n### Technologies Used

`;

  if (analysis.technologies.length > 0) {
    const techByRepo = {};
    for (const tech of analysis.technologies) {
      if (!techByRepo[tech.repo]) techByRepo[tech.repo] = [];
      techByRepo[tech.repo].push(tech.tech);
    }
    for (const [repo, techs] of Object.entries(techByRepo)) {
      content += `- **${repo}**: ${techs.join(', ')}\n`;
    }
  } else {
    content += '_No specific technologies detected_\n';
  }

  content += `\n### Configurations

`;

  if (analysis.configurations.length > 0) {
    const configByRepo = {};
    for (const config of analysis.configurations) {
      if (!configByRepo[config.repo]) configByRepo[config.repo] = [];
      configByRepo[config.repo].push(config.config);
    }
    for (const [repo, configs] of Object.entries(configByRepo)) {
      content += `- **${repo}**: ${configs.join(', ')}\n`;
    }
  } else {
    content += '_No specific configurations detected_\n';
  }

  content += `\n## Improvement Suggestions

Based on the referenced repositories, consider the following improvements:

`;

  if (analysis.suggestions.length > 0) {
    let i = 1;
    for (const suggestion of analysis.suggestions) {
      if (suggestion.type === 'architecture') {
        content += `${i}. **Architecture**: ${suggestion.suggestion}\n`;
        content += `   - Found in ${suggestion.count} repository(ies): ${suggestion.repos.join(', ')}\n\n`;
      } else if (suggestion.type === 'technology') {
        content += `${i}. **Technology**: ${suggestion.suggestion}\n`;
        content += `   - Used by ${suggestion.count} repository(ies): ${suggestion.repos.join(', ')}\n\n`;
      } else {
        content += `${i}. **${suggestion.suggestion}**: ${suggestion.description}\n`;
        content += `   - Found in: ${suggestion.repo}\n\n`;
      }
      i++;
    }
  } else {
    content += '_No specific suggestions generated_\n';
  }

  content += `
---
*Generated by MUSUBI SDD - GitHub Reference Analysis*
`;

  await fs.writeFile(path.join(refsDir, filename), content);
  return filename;
}

/**
 * Detect specification format from content and filename
 */
function detectSpecFormat(content, source) {
  const ext = path.extname(source).toLowerCase();
  if (ext === '.json') return 'json';
  if (ext === '.yaml' || ext === '.yml') return 'yaml';
  if (ext === '.md') return 'markdown';
  if (ext === '.rst') return 'rst';
  if (ext === '.html') return 'html';

  // Try to detect from content
  if (content.trim().startsWith('{')) return 'json';
  if (content.includes('openapi:') || content.includes('swagger:')) return 'openapi';
  if (content.includes('asyncapi:')) return 'asyncapi';
  if (content.includes('# ')) return 'markdown';

  return 'text';
}

/**
 * Extract summary from specification content
 */
function extractSpecSummary(content) {
  // Extract first heading and description
  const lines = content.split('\n').slice(0, 50);
  let title = '';
  let description = '';

  for (const line of lines) {
    if (!title && line.startsWith('# ')) {
      title = line.replace('# ', '').trim();
    } else if (title && !description && line.trim() && !line.startsWith('#')) {
      description = line.trim().slice(0, 200);
      break;
    }
  }

  return { title, description };
}

/**
 * Save external specification reference to steering/specs/
 */
async function saveSpecReference(specResult, projectPath) {
  const specsDir = path.join(projectPath, 'steering', 'specs');
  await fs.ensureDir(specsDir);

  // Create spec reference file
  const timestamp = new Date().toISOString().split('T')[0];
  const safeName = specResult.metadata.summary?.title
    ? specResult.metadata.summary.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 50)
    : 'external-spec';
  const filename = `${safeName}-${timestamp}.md`;

  const refContent = `# External Specification Reference

## Source Information

- **Type**: ${specResult.type}
- **Source**: ${specResult.source}
- **Format**: ${specResult.metadata.format || 'unknown'}
- **Fetched**: ${specResult.metadata.fetchedAt || specResult.metadata.readAt || 'N/A'}

## Summary

${specResult.metadata.summary?.title ? `**Title**: ${specResult.metadata.summary.title}` : ''}
${specResult.metadata.summary?.description ? `\n**Description**: ${specResult.metadata.summary.description}` : ''}

## Integration Notes

This specification is used as a reference for:
- Requirements analysis
- Architecture design
- API design
- Compliance validation

## Original Content

\`\`\`${specResult.metadata.format || 'text'}
${specResult.content?.slice(0, 5000) || 'Content not available'}${specResult.content?.length > 5000 ? '\n\n... (truncated, see original source)' : ''}
\`\`\`

---
*Generated by MUSUBI SDD - External Specification Reference*
`;

  await fs.writeFile(path.join(specsDir, filename), refContent);
  return filename;
}

/**
 * Language recommendation engine
 * @param {object} requirements - User's answers about app types, performance, expertise
 * @returns {Array} Recommended languages with reasons
 */
function recommendLanguages(requirements) {
  const { appTypes, performanceNeeds, teamExpertise } = requirements;
  const scores = {};
  const reasons = {};

  // Initialize scores
  const allLangs = [
    'javascript',
    'python',
    'rust',
    'go',
    'java',
    'csharp',
    'cpp',
    'swift',
    'ruby',
    'php',
  ];
  for (const lang of allLangs) {
    scores[lang] = 0;
    reasons[lang] = [];
  }

  // Score by application type
  const appTypeScores = {
    'web-frontend': { javascript: 10, reason: 'Best ecosystem for web frontend' },
    'web-backend': {
      javascript: 6,
      python: 7,
      go: 8,
      rust: 7,
      java: 7,
      csharp: 6,
      ruby: 5,
      php: 5,
      reason: 'Strong backend frameworks',
    },
    cli: { rust: 9, go: 9, python: 6, reason: 'Fast startup, single binary' },
    desktop: { rust: 7, csharp: 8, cpp: 7, swift: 6, java: 6, reason: 'Native GUI support' },
    mobile: { swift: 9, java: 8, javascript: 6, reason: 'Mobile platform support' },
    data: { python: 10, rust: 6, reason: 'Rich data science ecosystem' },
    ml: { python: 10, rust: 5, cpp: 5, reason: 'ML/AI libraries and frameworks' },
    embedded: { rust: 10, cpp: 9, reason: 'Memory safety, no runtime' },
    game: { cpp: 9, csharp: 8, rust: 6, reason: 'Game engine support' },
    systems: { rust: 10, go: 8, cpp: 9, reason: 'Systems programming' },
  };

  for (const appType of appTypes || []) {
    const typeScores = appTypeScores[appType];
    if (typeScores) {
      for (const [lang, score] of Object.entries(typeScores)) {
        if (typeof score === 'number') {
          scores[lang] += score;
          if (!reasons[lang].includes(typeScores.reason)) {
            reasons[lang].push(typeScores.reason);
          }
        }
      }
    }
  }

  // Score by performance needs
  if (performanceNeeds === 'high') {
    scores.rust += 8;
    scores.go += 6;
    scores.cpp += 7;
    reasons.rust.push('High performance, zero-cost abstractions');
    reasons.go.push('Fast compilation, efficient runtime');
  } else if (performanceNeeds === 'rapid') {
    scores.python += 5;
    scores.javascript += 5;
    scores.ruby += 4;
    reasons.python.push('Rapid development, extensive libraries');
    reasons.javascript.push('Fast iteration, universal runtime');
  }

  // Boost by team expertise
  for (const lang of teamExpertise || []) {
    scores[lang] += 5;
    reasons[lang].push('Team has expertise');
  }

  // Sort and return top recommendations
  const sorted = Object.entries(scores)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const langInfo = {
    javascript: { name: 'JavaScript/TypeScript', emoji: '🟨' },
    python: { name: 'Python', emoji: '🐍' },
    rust: { name: 'Rust', emoji: '🦀' },
    go: { name: 'Go', emoji: '🐹' },
    java: { name: 'Java/Kotlin', emoji: '☕' },
    csharp: { name: 'C#/.NET', emoji: '💜' },
    cpp: { name: 'C/C++', emoji: '⚙️' },
    swift: { name: 'Swift', emoji: '🍎' },
    ruby: { name: 'Ruby', emoji: '💎' },
    php: { name: 'PHP', emoji: '🐘' },
  };

  return sorted.map(([lang]) => ({
    value: lang,
    name: langInfo[lang].name,
    emoji: langInfo[lang].emoji,
    reason: reasons[lang].slice(0, 2).join('; ') || 'General purpose',
    score: scores[lang],
  }));
}

/**
 * Main initialization function
 * @param {object} agent - Agent definition from registry
 * @param {string} agentKey - Agent key (e.g., 'claude-code', 'cursor')
 * @param {object} options - Command options (spec, workspace, etc.)
 */
async function main(agent, agentKey, options = {}) {
  // Dynamic import for inquirer (ESM module)
  const inquirer = await import('inquirer');

  // If called directly without agent parameter, default to Claude Code
  if (!agent) {
    const { getAgentDefinition } = require('../src/agents/registry');
    agent = getAgentDefinition('claude-code');
    agentKey = 'claude-code';
  }

  console.log(chalk.blue.bold('\n🎯 MUSUBI - Ultimate Specification Driven Development\n'));
  console.log(chalk.white(`Initializing for: ${chalk.bold(agent.label)}\n`));

  // Handle external specification reference
  let externalSpec = null;
  if (options.spec) {
    console.log(chalk.cyan('📄 Fetching external specification...'));
    externalSpec = await fetchExternalSpec(options.spec);
    if (externalSpec.error) {
      console.log(chalk.yellow(`⚠️  Warning: ${externalSpec.error}`));
    } else {
      console.log(
        chalk.green(
          `✓ Loaded specification: ${externalSpec.metadata.summary?.title || externalSpec.source}`
        )
      );
      console.log(
        chalk.gray(`  Format: ${externalSpec.metadata.format}, Type: ${externalSpec.type}\n`)
      );
    }
  }

  // Handle GitHub repository references
  let referenceRepos = null;
  let repoAnalysis = null;
  if (options.references && options.references.length > 0) {
    console.log(chalk.cyan(`\n📚 Fetching ${options.references.length} GitHub reference(s)...`));
    referenceRepos = await fetchGitHubRepos(options.references);

    // Analyze repositories for improvements
    const validRepos = referenceRepos.filter(r => !r.error);
    if (validRepos.length > 0) {
      console.log(chalk.cyan('\n🔍 Analyzing repositories for patterns and improvements...'));
      repoAnalysis = analyzeReposForImprovements(validRepos);

      if (repoAnalysis.suggestions.length > 0) {
        console.log(
          chalk.green(`\n💡 Found ${repoAnalysis.suggestions.length} improvement suggestion(s):`)
        );
        for (const suggestion of repoAnalysis.suggestions.slice(0, 5)) {
          if (suggestion.type === 'architecture') {
            console.log(
              chalk.white(`  • ${suggestion.suggestion} (from ${suggestion.repos.join(', ')})`)
            );
          } else if (suggestion.type === 'technology') {
            console.log(
              chalk.white(`  • ${suggestion.suggestion} (used by ${suggestion.count} repo(s))`)
            );
          } else {
            console.log(chalk.white(`  • ${suggestion.suggestion}`));
          }
        }
      }
      console.log('');
    }
  }

  // Check if already initialized for this agent
  const agentDir = agent.layout.agentDir;
  if (fs.existsSync(agentDir)) {
    const { overwrite } = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `MUSUBI for ${agent.label} is already initialized. Overwrite?`,
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('Initialization cancelled.'));
      process.exit(0);
    }
  }

  // Collect project information
  const prompts = [
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: path.basename(process.cwd()),
    },
    {
      type: 'input',
      name: 'description',
      message: 'Project description:',
      default: 'A software project using MUSUBI SDD',
    },
    {
      type: 'list',
      name: 'locale',
      message: 'Documentation language:',
      choices: [
        { name: 'English', value: 'en' },
        { name: '日本語 (Japanese)', value: 'ja' },
        { name: '中文 (Chinese)', value: 'zh' },
        { name: '한국어 (Korean)', value: 'ko' },
        { name: 'Bahasa Indonesia (Indonesian)', value: 'id' },
        { name: 'Español (Spanish)', value: 'es' },
        { name: 'Deutsch (German)', value: 'de' },
        { name: 'Français (French)', value: 'fr' },
      ],
      default: 'en',
    },
    {
      type: 'list',
      name: 'projectStructure',
      message: 'Project structure:',
      choices: [
        { name: 'Single package', value: 'single' },
        { name: 'Workspace / Monorepo', value: 'workspace' },
        { name: 'Microservices', value: 'microservices' },
      ],
      default: options.workspace ? 'workspace' : 'single',
    },
    {
      type: 'list',
      name: 'projectType',
      message: 'Project type:',
      choices: ['Greenfield (0→1)', 'Brownfield (1→n)', 'Both'],
    },
    {
      type: 'list',
      name: 'techStackApproach',
      message: 'Technology stack approach:',
      choices: [
        { name: 'Single language', value: 'single' },
        { name: 'Multiple languages', value: 'multiple' },
        { name: 'Undecided (decide later)', value: 'undecided' },
        { name: 'Help me decide (recommend based on requirements)', value: 'recommend' },
      ],
      default: 'single',
    },
  ];

  // Template selection if project structure is workspace or microservices
  const templatePrompts = [
    {
      type: 'list',
      name: 'archTemplate',
      message: 'Select architecture template:',
      choices: answers => {
        if (answers.projectStructure === 'workspace') {
          return [
            { name: 'Basic Workspace (packages/)', value: 'workspace-basic' },
            { name: 'Layered (core/, api/, web/)', value: 'workspace-layered' },
            { name: 'Domain-Driven (domains/, shared/)', value: 'workspace-ddd' },
            { name: 'Full Stack (frontend/, backend/, shared/)', value: 'workspace-fullstack' },
          ];
        } else if (answers.projectStructure === 'microservices') {
          return [
            { name: 'Basic Services (services/)', value: 'microservices-basic' },
            { name: 'Gateway + Services', value: 'microservices-gateway' },
            { name: 'Event-Driven (services/, events/)', value: 'microservices-event' },
          ];
        }
        return [{ name: 'Standard', value: 'standard' }];
      },
      when: answers =>
        answers.projectStructure === 'workspace' || answers.projectStructure === 'microservices',
    },
  ];

  // Language selection based on approach
  const languageChoices = [
    { name: 'JavaScript/TypeScript', value: 'javascript' },
    { name: 'Python', value: 'python' },
    { name: 'Rust', value: 'rust' },
    { name: 'Go', value: 'go' },
    { name: 'Java/Kotlin', value: 'java' },
    { name: 'C#/.NET', value: 'csharp' },
    { name: 'C/C++', value: 'cpp' },
    { name: 'Swift', value: 'swift' },
    { name: 'Ruby', value: 'ruby' },
    { name: 'PHP', value: 'php' },
    { name: 'Other', value: 'other' },
  ];

  // Recommendation questions for 'Help me decide' mode
  const recommendationPrompts = [
    {
      type: 'checkbox',
      name: 'appTypes',
      message: 'What type of application(s) are you building?',
      choices: [
        { name: 'Web Frontend (SPA, SSR)', value: 'web-frontend' },
        { name: 'Web Backend / API', value: 'web-backend' },
        { name: 'CLI Tool', value: 'cli' },
        { name: 'Desktop Application', value: 'desktop' },
        { name: 'Mobile App', value: 'mobile' },
        { name: 'Data Pipeline / ETL', value: 'data' },
        { name: 'AI/ML Application', value: 'ml' },
        { name: 'Embedded / IoT', value: 'embedded' },
        { name: 'Game Development', value: 'game' },
        { name: 'Systems / Infrastructure', value: 'systems' },
      ],
    },
    {
      type: 'list',
      name: 'performanceNeeds',
      message: 'Performance requirements:',
      choices: [
        { name: 'High performance / Low latency critical', value: 'high' },
        { name: 'Moderate (typical web app)', value: 'moderate' },
        { name: 'Rapid development prioritized', value: 'rapid' },
      ],
    },
    {
      type: 'checkbox',
      name: 'teamExpertise',
      message: 'Team expertise (select all that apply):',
      choices: languageChoices.filter(c => c.value !== 'other'),
    },
  ];

  // Get initial answers to determine language prompts
  const initialAnswers = await inquirer.default.prompt(prompts);
  let answers = { ...initialAnswers };

  // Handle tech stack approach
  if (answers.techStackApproach === 'single') {
    const langAnswer = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'primaryLanguage',
        message: 'Select primary language:',
        choices: languageChoices,
      },
    ]);
    answers.languages = [langAnswer.primaryLanguage];
  } else if (answers.techStackApproach === 'multiple') {
    const langAnswer = await inquirer.default.prompt([
      {
        type: 'checkbox',
        name: 'languages',
        message: 'Select languages (check all that apply):',
        choices: languageChoices,
        validate: input => (input.length > 0 ? true : 'Select at least one language'),
      },
    ]);
    answers.languages = langAnswer.languages;
  } else if (answers.techStackApproach === 'recommend') {
    // Ask recommendation questions
    const recAnswers = await inquirer.default.prompt(recommendationPrompts);
    const recommended = recommendLanguages(recAnswers);

    console.log(chalk.cyan('\n📊 Recommended languages based on your requirements:\n'));
    for (const rec of recommended) {
      console.log(chalk.white(`  ${rec.emoji} ${chalk.bold(rec.name)}: ${rec.reason}`));
    }
    console.log('');

    const confirmAnswer = await inquirer.default.prompt([
      {
        type: 'checkbox',
        name: 'languages',
        message: 'Confirm languages to use:',
        choices: recommended.map(r => ({ name: r.name, value: r.value, checked: true })),
      },
    ]);
    answers.languages = confirmAnswer.languages;
    answers.recommendationContext = recAnswers;
  } else {
    // undecided
    answers.languages = ['undecided'];
  }

  // Ask template questions if workspace or microservices
  if (answers.projectStructure === 'workspace' || answers.projectStructure === 'microservices') {
    const templateAnswer = await inquirer.default.prompt(templatePrompts);
    answers = { ...answers, ...templateAnswer };
  }

  // Continue with remaining prompts
  const remainingPrompts = [];
  if (agentKey === 'claude-code' && agent.layout.skillsDir) {
    remainingPrompts.push({
      type: 'checkbox',
      name: 'skills',
      message: 'Select skills to install (all recommended):',
      choices: [
        {
          name: 'Core (orchestrator, steering, constitution-enforcer)',
          value: 'core',
          checked: true,
        },
        {
          name: 'Requirements & Planning (requirements-analyst, project-manager, change-impact-analyzer)',
          value: 'requirements',
          checked: true,
        },
        {
          name: 'Architecture & Design (system-architect, api-designer, database-schema-designer, ui-ux-designer)',
          value: 'architecture',
          checked: true,
        },
        { name: 'Development (software-developer)', value: 'development', checked: true },
        {
          name: 'Quality & Review (test-engineer, code-reviewer, bug-hunter, quality-assurance, traceability-auditor)',
          value: 'quality',
          checked: true,
        },
        {
          name: 'Security & Performance (security-auditor, performance-optimizer)',
          value: 'security',
          checked: true,
        },
        {
          name: 'Infrastructure (devops-engineer, cloud-architect, database-administrator, site-reliability-engineer, release-coordinator)',
          value: 'infrastructure',
          checked: true,
        },
        {
          name: 'Documentation (technical-writer, ai-ml-engineer)',
          value: 'documentation',
          checked: true,
        },
      ],
    });
  }

  remainingPrompts.push(
    {
      type: 'confirm',
      name: 'createSteering',
      message: 'Generate initial steering context?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'createConstitution',
      message: 'Create constitutional governance?',
      default: true,
    }
  );

  const finalAnswers = await inquirer.default.prompt(remainingPrompts);
  answers = { ...answers, ...finalAnswers };

  console.log(chalk.green('\n✨ Initializing MUSUBI...\n'));

  // Create directory structure (agent-specific + shared)
  const dirs = [
    'steering',
    'steering/rules',
    'templates',
    'storage/specs',
    'storage/changes',
    'storage/archive',
  ];

  // Add agent-specific directories
  if (agent.layout.skillsDir) {
    dirs.unshift(agent.layout.skillsDir);
  }
  if (agent.layout.commandsDir) {
    dirs.unshift(agent.layout.commandsDir);
  }
  if (agent.layout.agentDir && !dirs.includes(agent.layout.agentDir)) {
    dirs.unshift(agent.layout.agentDir);
  }

  for (const dir of dirs) {
    await fs.ensureDir(dir);
    console.log(chalk.gray(`  Created ${dir}/`));
  }

  // Install skills (Claude Code only - Skills API)
  if (agentKey === 'claude-code' && agent.layout.skillsDir && answers.skills) {
    const skillGroups = {
      core: ['orchestrator', 'steering', 'constitution-enforcer'],
      requirements: ['requirements-analyst', 'project-manager', 'change-impact-analyzer'],
      architecture: [
        'system-architect',
        'api-designer',
        'database-schema-designer',
        'ui-ux-designer',
      ],
      development: ['software-developer'],
      quality: [
        'test-engineer',
        'code-reviewer',
        'bug-hunter',
        'quality-assurance',
        'traceability-auditor',
      ],
      security: ['security-auditor', 'performance-optimizer'],
      infrastructure: [
        'devops-engineer',
        'cloud-architect',
        'database-administrator',
        'site-reliability-engineer',
        'release-coordinator',
      ],
      documentation: ['technical-writer', 'ai-ml-engineer'],
    };

    let skillCount = 0;
    for (const group of answers.skills) {
      for (const skill of skillGroups[group]) {
        await copySkill(skill, agent);
        skillCount++;
      }
    }

    console.log(chalk.green(`\n  Installed ${skillCount} skills`));
  }

  // Install commands/prompts/workflows
  if (agent.features.hasCommands) {
    await copyCommands(agent, agentKey);
    const commandType =
      agentKey === 'github-copilot' || agentKey === 'codex'
        ? 'prompts'
        : agentKey === 'windsurf'
          ? 'workflows'
          : 'commands';
    console.log(chalk.green(`  Installed ${commandType}`));
  }

  // Install AGENTS.md (all platforms get 25 agent definitions)
  if (agent.layout.agentsFile) {
    await copyAgentsFile(agent);
    console.log(chalk.green('  Installed 25 agent definitions (AGENTS.md)'));
  }

  // Generate steering context
  if (answers.createSteering) {
    await generateSteering(answers, externalSpec);
    console.log(chalk.green('  Generated steering context'));
  }

  // Save external specification reference
  if (externalSpec && !externalSpec.error) {
    const specFilename = await saveSpecReference(externalSpec, process.cwd());
    console.log(chalk.green(`  Saved specification reference: steering/specs/${specFilename}`));
  }

  // Save GitHub repository references and analysis
  if (referenceRepos && referenceRepos.length > 0 && repoAnalysis) {
    const refFilename = await saveReferenceRepos(referenceRepos, repoAnalysis, process.cwd());
    console.log(chalk.green(`  Saved GitHub references: steering/references/${refFilename}`));
  }

  // Create constitution
  if (answers.createConstitution) {
    await createConstitution();
    console.log(chalk.green('  Created constitutional governance'));
  }

  // Generate language-specific dependency files (for single-package projects)
  if (answers.projectStructure !== 'workspace' && answers.projectStructure !== 'microservices') {
    const primaryLang =
      answers.languages && answers.languages[0] !== 'undecided' ? answers.languages[0] : null;
    if (primaryLang) {
      await generateDependencyFiles(primaryLang, answers);
      console.log(chalk.green(`  Generated ${primaryLang} project files`));
    }
  }

  // Generate reference architecture template if specified
  if (options.template) {
    await generateArchitectureTemplate(options.template, answers);
    console.log(chalk.green(`  Applied ${options.template} architecture template`));
  }

  // Create README
  await createReadme(answers, agent, agentKey);
  console.log(chalk.green(`  Created ${agent.layout.docFile || 'MUSUBI.md'} guide`));

  // Success message
  console.log(chalk.blue.bold(`\n✅ MUSUBI initialization complete for ${agent.label}!\n`));
  console.log(chalk.white('Next steps:'));
  console.log(chalk.gray('  1. Review steering/ context files'));
  console.log(chalk.gray('  2. Review steering/rules/constitution.md'));

  if (agent.features.hasSkills) {
    console.log(chalk.gray(`  3. Start using ${agent.label} with MUSUBI skills`));
  } else {
    console.log(chalk.gray(`  3. Start using ${agent.label} with MUSUBI`));
  }

  const cmdExample = agent.commands.requirements.replace(' <feature>', ' authentication');
  console.log(chalk.gray(`  4. Try commands: ${cmdExample}\n`));
  console.log(chalk.cyan('Learn more: https://github.com/nahisaho/MUSUBI\n'));
}

async function copySkill(skillName, agent) {
  // Only Claude Code has skillsDir (Skills API)
  if (!agent.layout.skillsDir) {
    return; // Skip for agents without Skills API support
  }

  const srcDir = path.join(AGENTS_TEMPLATE_DIR, 'claude-code', 'skills', skillName);
  const destDir = path.join(agent.layout.skillsDir, skillName);
  await fs.copy(srcDir, destDir);
}

async function copyCommands(agent, agentKey) {
  const srcDir = path.join(AGENTS_TEMPLATE_DIR, agentKey, 'commands');
  const destDir = agent.layout.commandsDir;

  // If agent-specific templates don't exist yet, fall back to Claude Code templates
  if (!fs.existsSync(srcDir)) {
    const fallbackSrc = path.join(AGENTS_TEMPLATE_DIR, 'claude-code', 'commands');
    await fs.copy(fallbackSrc, destDir);
  } else {
    await fs.copy(srcDir, destDir);
  }
}

async function copyAgentsFile(agent) {
  const sharedAgentsFile = path.join(AGENTS_TEMPLATE_DIR, 'shared', 'AGENTS.md');
  const destFile = agent.layout.agentsFile;

  // For Gemini CLI, AGENTS.md is embedded in GEMINI.md
  if (destFile === 'GEMINI.md') {
    // Read shared AGENTS.md
    const agentsContent = await fs.readFile(sharedAgentsFile, 'utf8');

    // Read existing GEMINI.md template if exists
    const geminiTemplate = path.join(AGENTS_TEMPLATE_DIR, 'gemini-cli', 'GEMINI.md');
    let geminiContent = '';
    if (fs.existsSync(geminiTemplate)) {
      geminiContent = await fs.readFile(geminiTemplate, 'utf8');
    } else {
      geminiContent =
        '# Gemini CLI - MUSUBI Configuration\n\n' +
        'This file configures Gemini CLI for MUSUBI SDD.\n\n' +
        '---\n\n';
    }

    // Append AGENTS.md content
    geminiContent += agentsContent;
    await fs.writeFile(destFile, geminiContent);
  } else {
    // For other platforms, copy AGENTS.md as-is
    await fs.copy(sharedAgentsFile, destFile);
  }
}

async function generateSteering(answers, externalSpec = null) {
  const steeringTemplates = path.join(SHARED_TEMPLATE_DIR, 'steering');
  const locale = answers.locale || 'en';
  const languages = answers.languages || ['undecided'];

  // Copy and customize steering files
  const files = ['structure.md', 'product.md'];
  for (const file of files) {
    // Try locale-specific file first (e.g., structure.ja.md)
    let templatePath = path.join(steeringTemplates, file.replace('.md', `.${locale}.md`));
    if (locale === 'en' || !fs.existsSync(templatePath)) {
      // Fall back to default (English)
      templatePath = path.join(steeringTemplates, file);
    }

    // Determine output filename (locale suffix for non-English)
    const outputFile = locale !== 'en' ? file.replace('.md', `.${locale}.md`) : file;

    if (!fs.existsSync(templatePath)) {
      // If template doesn't exist, skip (don't fail)
      continue;
    }

    let content = await fs.readFile(templatePath, 'utf8');

    // Replace placeholders
    content = content.replace(/\{\{PROJECT_NAME\}\}/g, answers.projectName);
    content = content.replace(/\{\{DESCRIPTION\}\}/g, answers.description);
    content = content.replace(/\{\{DATE\}\}/g, new Date().toISOString().split('T')[0]);
    content = content.replace(/\{\{LOCALE\}\}/g, locale);

    await fs.writeFile(path.join('steering', outputFile), content);
  }

  // Generate tech.md based on selected languages
  const techContent = generateTechMd(languages, answers, locale);
  const techFile = locale !== 'en' ? `tech.${locale}.md` : 'tech.md';
  await fs.writeFile(path.join('steering', techFile), techContent);

  // Build external specification section for project.yml
  let externalSpecYml = '';
  if (externalSpec && !externalSpec.error) {
    externalSpecYml = `
# External Specification Reference
external_specs:
  - source: "${externalSpec.source}"
    type: ${externalSpec.type}
    format: ${externalSpec.metadata.format || 'unknown'}
    title: "${externalSpec.metadata.summary?.title || 'External Specification'}"
    fetched_at: ${externalSpec.metadata.fetchedAt || externalSpec.metadata.readAt || 'N/A'}
`;
  }

  // Create project.yml with locale, language settings, and external spec
  const projectYml = `# MUSUBI Project Configuration
name: ${answers.projectName}
description: ${answers.description}
locale: ${locale}
version: "0.1.0"
created: ${new Date().toISOString().split('T')[0]}

# Technology Stack
tech_stack:
  approach: ${answers.techStackApproach}
  languages:
${languages[0] === 'undecided' ? '    - undecided  # To be determined' : languages.map(l => `    - ${l}`).join('\n')}
${externalSpecYml}`;
  await fs.writeFile(path.join('steering', 'project.yml'), projectYml);

  // Generate workspace structure if applicable
  if (answers.projectStructure === 'workspace' || answers.projectStructure === 'microservices') {
    await generateWorkspaceStructure(answers);
  }
}

/**
 * Generate workspace/monorepo structure based on template
 */
async function generateWorkspaceStructure(answers) {
  const template = answers.archTemplate || 'workspace-basic';
  const languages = answers.languages || ['javascript'];
  const primaryLang = languages[0];

  const structures = {
    'workspace-basic': {
      dirs: ['packages/', 'packages/core/', 'packages/cli/', 'packages/web/'],
      files: {
        'packages/README.md': '# Packages\n\nThis workspace contains multiple packages.\n',
      },
    },
    'workspace-layered': {
      dirs: ['core/', 'api/', 'web/', 'shared/', 'tools/'],
      files: {
        'core/README.md': '# Core\n\nBusiness logic and domain models.\n',
        'api/README.md': '# API\n\nREST/GraphQL API layer.\n',
        'web/README.md': '# Web\n\nFrontend application.\n',
        'shared/README.md': '# Shared\n\nShared utilities and types.\n',
      },
    },
    'workspace-ddd': {
      dirs: [
        'domains/',
        'domains/identity/',
        'domains/catalog/',
        'shared/',
        'shared/kernel/',
        'infrastructure/',
      ],
      files: {
        'domains/README.md': '# Domains\n\nDomain-driven design bounded contexts.\n',
        'shared/kernel/README.md': '# Shared Kernel\n\nCore abstractions shared across domains.\n',
        'infrastructure/README.md': '# Infrastructure\n\nCross-cutting infrastructure concerns.\n',
      },
    },
    'workspace-fullstack': {
      dirs: ['frontend/', 'backend/', 'shared/', 'e2e/', 'docs/'],
      files: {
        'frontend/README.md': '# Frontend\n\nClient-side application.\n',
        'backend/README.md': '# Backend\n\nServer-side application.\n',
        'shared/README.md': '# Shared\n\nShared types and utilities.\n',
        'e2e/README.md': '# E2E Tests\n\nEnd-to-end test suite.\n',
      },
    },
    'microservices-basic': {
      dirs: ['services/', 'services/auth/', 'services/api/', 'services/worker/', 'libs/'],
      files: {
        'services/README.md': '# Services\n\nMicroservices directory.\n',
        'libs/README.md': '# Libraries\n\nShared libraries across services.\n',
      },
    },
    'microservices-gateway': {
      dirs: ['gateway/', 'services/', 'services/users/', 'services/products/', 'shared/'],
      files: {
        'gateway/README.md': '# API Gateway\n\nEntry point for all API requests.\n',
        'services/README.md': '# Services\n\nBackend microservices.\n',
      },
    },
    'microservices-event': {
      dirs: [
        'services/',
        'services/order/',
        'services/inventory/',
        'events/',
        'events/schemas/',
        'infrastructure/',
      ],
      files: {
        'services/README.md': '# Services\n\nEvent-driven microservices.\n',
        'events/README.md': '# Events\n\nEvent schemas and contracts.\n',
        'events/schemas/README.md': '# Event Schemas\n\nAsyncAPI/CloudEvents schemas.\n',
      },
    },
  };

  const structure = structures[template] || structures['workspace-basic'];

  // Create directories
  for (const dir of structure.dirs) {
    await fs.ensureDir(dir);
  }

  // Create files
  for (const [file, content] of Object.entries(structure.files)) {
    await fs.writeFile(file, content);
  }

  // Generate language-specific workspace config
  await generateWorkspaceConfig(primaryLang, template, answers);
}

/**
 * Generate language-specific workspace configuration files
 */
async function generateWorkspaceConfig(primaryLang, template, answers) {
  const projectName = answers.projectName || 'my-project';

  if (primaryLang === 'javascript') {
    // Generate pnpm-workspace.yaml or npm workspaces in package.json
    const workspaceConfig =
      template.startsWith('workspace') || template.startsWith('microservices')
        ? `packages:
  - 'packages/*'
  - 'services/*'
  - 'shared'
  - 'libs/*'
`
        : '';
    if (workspaceConfig) {
      await fs.writeFile('pnpm-workspace.yaml', workspaceConfig);
    }

    // Root package.json with workspaces
    const rootPackageJson = {
      name: projectName,
      version: '0.0.0',
      private: true,
      workspaces: ['packages/*', 'services/*', 'shared', 'libs/*'],
      scripts: {
        build: 'pnpm -r build',
        test: 'pnpm -r test',
        lint: 'pnpm -r lint',
      },
      devDependencies: {
        typescript: '^5.0.0',
      },
    };
    await fs.writeFile('package.json', JSON.stringify(rootPackageJson, null, 2) + '\n');
  } else if (primaryLang === 'rust') {
    // Generate Cargo workspace
    const members =
      template === 'workspace-basic'
        ? ['packages/*']
        : template === 'workspace-layered'
          ? ['core', 'api', 'shared']
          : template === 'microservices-basic'
            ? ['services/*', 'libs/*']
            : ['crates/*'];

    const cargoToml = `[workspace]
resolver = "2"
members = [
${members.map(m => `    "${m}"`).join(',\n')}
]

[workspace.package]
version = "0.1.0"
edition = "2021"
authors = ["${projectName} Team"]
license = "MIT"

[workspace.dependencies]
# Add shared dependencies here
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
`;
    await fs.writeFile('Cargo.toml', cargoToml);
  } else if (primaryLang === 'python') {
    // Generate pyproject.toml for monorepo
    const pyprojectToml = `[project]
name = "${projectName}"
version = "0.1.0"
description = "${answers.description || ''}"
requires-python = ">=3.11"

[tool.ruff]
line-length = 100

[tool.pytest.ini_options]
testpaths = ["tests"]
`;
    await fs.writeFile('pyproject.toml', pyprojectToml);
  } else if (primaryLang === 'go') {
    // Generate go.work for Go workspaces
    const goWork = `go 1.21

use (
    ./cmd
    ./internal
    ./pkg
)
`;
    await fs.writeFile('go.work', goWork);
  }
}

/**
 * Generate reference architecture template structure
 */
async function generateArchitectureTemplate(templateName, answers) {
  const ARCH_TEMPLATE_DIR = path.join(__dirname, '..', 'src', 'templates', 'architectures');
  const languages = answers.languages || ['javascript'];
  const primaryLang = languages[0];

  const architectures = {
    'clean-architecture': {
      dirs: [
        'src/domain/entities/',
        'src/domain/value-objects/',
        'src/domain/services/',
        'src/domain/errors/',
        'src/application/use-cases/',
        'src/application/ports/input/',
        'src/application/ports/output/',
        'src/application/dtos/',
        'src/infrastructure/persistence/repositories/',
        'src/infrastructure/persistence/mappers/',
        'src/infrastructure/external/',
        'src/interface/controllers/',
        'src/interface/presenters/',
        'src/interface/cli/',
      ],
      readme: 'clean-architecture/README.md',
    },
    hexagonal: {
      dirs: [
        'src/core/domain/models/',
        'src/core/domain/events/',
        'src/core/domain/services/',
        'src/core/ports/inbound/',
        'src/core/ports/outbound/',
        'src/core/application/commands/',
        'src/core/application/queries/',
        'src/adapters/inbound/http/',
        'src/adapters/inbound/cli/',
        'src/adapters/outbound/persistence/',
        'src/adapters/outbound/messaging/',
      ],
      readme: 'hexagonal/README.md',
    },
    'event-driven': {
      dirs: [
        'src/domain/events/',
        'src/domain/aggregates/',
        'src/domain/commands/',
        'src/application/command-handlers/',
        'src/application/event-handlers/',
        'src/application/sagas/',
        'src/application/projections/',
        'src/infrastructure/messaging/',
        'src/infrastructure/event-store/',
        'src/interface/api/',
        'src/interface/consumers/',
        'src/interface/publishers/',
      ],
      readme: 'event-driven/README.md',
    },
    layered: {
      dirs: [
        'src/presentation/controllers/',
        'src/presentation/views/',
        'src/business/services/',
        'src/business/models/',
        'src/data/repositories/',
        'src/data/entities/',
      ],
      readme: null,
    },
    'modular-monolith': {
      dirs: [
        'src/modules/users/',
        'src/modules/users/domain/',
        'src/modules/users/application/',
        'src/modules/users/infrastructure/',
        'src/modules/orders/',
        'src/modules/orders/domain/',
        'src/modules/orders/application/',
        'src/modules/orders/infrastructure/',
        'src/shared/kernel/',
        'src/shared/infrastructure/',
      ],
      readme: null,
    },
  };

  const arch = architectures[templateName];
  if (!arch) {
    console.log(chalk.yellow(`  Unknown architecture template: ${templateName}`));
    return;
  }

  // Create directories
  for (const dir of arch.dirs) {
    await fs.ensureDir(dir);
    // Create .gitkeep to preserve empty directories
    await fs.writeFile(path.join(dir, '.gitkeep'), '');
  }

  // Copy architecture README if available
  if (arch.readme) {
    const readmePath = path.join(ARCH_TEMPLATE_DIR, arch.readme);
    if (await fs.pathExists(readmePath)) {
      const destPath = path.join('docs', 'architecture', 'README.md');
      await fs.ensureDir(path.dirname(destPath));
      await fs.copy(readmePath, destPath);
    }
  }

  // Generate language-specific entry files
  await generateArchitectureEntryFiles(templateName, primaryLang, answers);
}

/**
 * Generate entry files for architecture template
 */
async function generateArchitectureEntryFiles(templateName, primaryLang, answers) {
  const projectName = answers.projectName || 'my-project';

  // Create a basic entry file based on language
  if (primaryLang === 'javascript' || primaryLang === 'typescript') {
    const entryFile = `// ${projectName} - ${templateName}
// Entry point for the application

export function main(): void {
  console.log('Hello from ${projectName}!');
}

main();
`;
    await fs.ensureDir('src');
    await fs.writeFile('src/index.ts', entryFile);
  } else if (primaryLang === 'rust') {
    const mainRs = `//! ${projectName} - ${templateName}
//! 
//! Entry point for the application

fn main() {
    println!("Hello from ${projectName}!");
}
`;
    await fs.ensureDir('src');
    await fs.writeFile('src/main.rs', mainRs);
  } else if (primaryLang === 'python') {
    const safeName = projectName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const mainPy = `"""${projectName} - ${templateName}

Entry point for the application
"""


def main() -> None:
    print(f"Hello from ${projectName}!")


if __name__ == "__main__":
    main()
`;
    const srcDir = `src/${safeName}`;
    await fs.ensureDir(srcDir);
    await fs.writeFile(`${srcDir}/__main__.py`, mainPy);
  }
}

/**
 * Generate language-specific dependency files for single-package projects
 */
async function generateDependencyFiles(primaryLang, answers) {
  const projectName = answers.projectName || 'my-project';
  const safeName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  if (primaryLang === 'javascript') {
    // Check if package.json already exists
    if (!(await fs.pathExists('package.json'))) {
      const packageJson = {
        name: safeName,
        version: '0.1.0',
        description: answers.description || '',
        type: 'module',
        main: 'dist/index.js',
        types: 'dist/index.d.ts',
        scripts: {
          build: 'tsc',
          test: 'jest',
          lint: 'eslint src/',
          format: 'prettier --write .',
        },
        devDependencies: {
          typescript: '^5.0.0',
          '@types/node': '^20.0.0',
          jest: '^29.0.0',
          '@types/jest': '^29.0.0',
          eslint: '^9.0.0',
          prettier: '^3.0.0',
        },
      };
      await fs.writeFile('package.json', JSON.stringify(packageJson, null, 2) + '\n');
    }

    // Generate tsconfig.json
    if (!(await fs.pathExists('tsconfig.json'))) {
      const tsconfig = {
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          declaration: true,
          outDir: './dist',
          rootDir: './src',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist'],
      };
      await fs.writeFile('tsconfig.json', JSON.stringify(tsconfig, null, 2) + '\n');
    }
  } else if (primaryLang === 'rust') {
    // Check if Cargo.toml already exists
    if (!(await fs.pathExists('Cargo.toml'))) {
      const cargoToml = `[package]
name = "${safeName}"
version = "0.1.0"
edition = "2021"
description = "${answers.description || ''}"
license = "MIT"

[dependencies]
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
thiserror = "1"
tracing = "0.1"

[dev-dependencies]
tokio-test = "0.4"
`;
      await fs.writeFile('Cargo.toml', cargoToml);

      // Create src/main.rs or src/lib.rs
      await fs.ensureDir('src');
      if (!(await fs.pathExists('src/main.rs')) && !(await fs.pathExists('src/lib.rs'))) {
        const mainRs = `//! ${answers.description || projectName}

fn main() {
    println!("Hello from ${projectName}!");
}
`;
        await fs.writeFile('src/main.rs', mainRs);
      }
    }
  } else if (primaryLang === 'python') {
    // Check if pyproject.toml already exists
    if (!(await fs.pathExists('pyproject.toml'))) {
      const pyprojectToml = `[project]
name = "${safeName}"
version = "0.1.0"
description = "${answers.description || ''}"
requires-python = ">=3.11"
dependencies = []

[project.optional-dependencies]
dev = [
    "pytest>=7.0",
    "ruff>=0.1",
    "mypy>=1.0",
]

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W"]

[tool.mypy]
python_version = "3.11"
strict = true

[tool.pytest.ini_options]
testpaths = ["tests"]
`;
      await fs.writeFile('pyproject.toml', pyprojectToml);

      // Create src directory and __init__.py
      const srcDir = `src/${safeName.replace(/-/g, '_')}`;
      await fs.ensureDir(srcDir);
      if (!(await fs.pathExists(`${srcDir}/__init__.py`))) {
        await fs.writeFile(
          `${srcDir}/__init__.py`,
          `"""${answers.description || projectName}"""\n\n__version__ = "0.1.0"\n`
        );
      }
    }
  } else if (primaryLang === 'go') {
    // Check if go.mod already exists
    if (!(await fs.pathExists('go.mod'))) {
      const goMod = `module github.com/${safeName}

go 1.21

require (
    // Add dependencies here
)
`;
      await fs.writeFile('go.mod', goMod);

      // Create main.go
      await fs.ensureDir('cmd');
      if (!(await fs.pathExists('cmd/main.go'))) {
        const mainGo = `package main

import "fmt"

func main() {
    fmt.Println("Hello from ${projectName}!")
}
`;
        await fs.writeFile('cmd/main.go', mainGo);
      }
    }
  } else if (primaryLang === 'java') {
    // Generate pom.xml for Maven
    if (!(await fs.pathExists('pom.xml'))) {
      const pomXml = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.example</groupId>
    <artifactId>${safeName}</artifactId>
    <version>0.1.0</version>
    <packaging>jar</packaging>

    <name>${projectName}</name>
    <description>${answers.description || ''}</description>

    <properties>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>5.10.0</version>
            <scope>test</scope>
        </dependency>
    </dependencies>
</project>
`;
      await fs.writeFile('pom.xml', pomXml);
    }
  } else if (primaryLang === 'csharp') {
    // Generate .csproj file
    const csprojPath = `${projectName}.csproj`;
    if (!(await fs.pathExists(csprojPath))) {
      const csproj = `<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.Extensions.Logging" Version="8.0.0" />
  </ItemGroup>

</Project>
`;
      await fs.writeFile(csprojPath, csproj);
    }
  }
}

/**
 * Generate language-specific tech.md content
 */
function generateTechMd(languages, answers, _locale) {
  const langInfo = {
    javascript: {
      name: 'JavaScript/TypeScript',
      version: 'ES2022+ / TypeScript 5.0+',
      runtime: 'Node.js 20+ LTS, Bun, Deno',
      packageManager: 'npm, pnpm, yarn',
      frameworks: 'React, Vue, Next.js, Express, Fastify',
      testing: 'Jest, Vitest, Playwright',
    },
    python: {
      name: 'Python',
      version: '3.11+',
      runtime: 'CPython, PyPy',
      packageManager: 'pip, poetry, uv',
      frameworks: 'FastAPI, Django, Flask',
      testing: 'pytest, unittest',
    },
    rust: {
      name: 'Rust',
      version: '1.75+ stable',
      runtime: 'Native binary',
      packageManager: 'Cargo',
      frameworks: 'Axum, Actix-web, Tokio',
      testing: 'cargo test, criterion',
    },
    go: {
      name: 'Go',
      version: '1.21+',
      runtime: 'Native binary',
      packageManager: 'Go modules',
      frameworks: 'Gin, Echo, Chi',
      testing: 'go test, testify',
    },
    java: {
      name: 'Java/Kotlin',
      version: 'Java 21 LTS / Kotlin 1.9+',
      runtime: 'JVM, GraalVM',
      packageManager: 'Maven, Gradle',
      frameworks: 'Spring Boot, Quarkus, Ktor',
      testing: 'JUnit 5, Kotest',
    },
    csharp: {
      name: 'C#/.NET',
      version: '.NET 8+',
      runtime: '.NET Runtime',
      packageManager: 'NuGet',
      frameworks: 'ASP.NET Core, MAUI',
      testing: 'xUnit, NUnit',
    },
    cpp: {
      name: 'C/C++',
      version: 'C++20',
      runtime: 'Native binary',
      packageManager: 'vcpkg, Conan',
      frameworks: 'Qt, Boost',
      testing: 'GoogleTest, Catch2',
    },
    swift: {
      name: 'Swift',
      version: '5.9+',
      runtime: 'Native binary',
      packageManager: 'Swift Package Manager',
      frameworks: 'SwiftUI, Vapor',
      testing: 'XCTest',
    },
    ruby: {
      name: 'Ruby',
      version: '3.2+',
      runtime: 'CRuby, JRuby',
      packageManager: 'Bundler, RubyGems',
      frameworks: 'Rails, Sinatra',
      testing: 'RSpec, Minitest',
    },
    php: {
      name: 'PHP',
      version: '8.2+',
      runtime: 'PHP-FPM, Swoole',
      packageManager: 'Composer',
      frameworks: 'Laravel, Symfony',
      testing: 'PHPUnit, Pest',
    },
  };

  const isUndecided = languages[0] === 'undecided';
  const date = new Date().toISOString().split('T')[0];

  if (isUndecided) {
    return `# Technology Stack

**Project**: ${answers.projectName}
**Last Updated**: ${date}
**Status**: Technology stack to be determined

---

## Overview

The technology stack for this project has not yet been decided. This document will be updated once the technical decisions are made.

## Decision Criteria

When selecting technologies, consider:

1. **Application Type**: What type of application is being built?
2. **Performance Requirements**: What are the performance constraints?
3. **Team Expertise**: What technologies is the team familiar with?
4. **Ecosystem**: What libraries and tools are available?
5. **Long-term Maintainability**: How well-supported is the technology?

## Candidates Under Consideration

| Aspect | Options | Decision |
|--------|---------|----------|
| Primary Language | TBD | ⏳ Pending |
| Web Framework | TBD | ⏳ Pending |
| Database | TBD | ⏳ Pending |
| Hosting | TBD | ⏳ Pending |

## Next Steps

1. [ ] Define functional requirements
2. [ ] Identify performance constraints
3. [ ] Evaluate team skills
4. [ ] Create proof-of-concept
5. [ ] Make final decision and update this document

---

*Run \`musubi steering\` to update this document after decisions are made.*
`;
  }

  // Generate tech.md for selected languages
  const primaryLang = languages[0];
  const primary = langInfo[primaryLang] || { name: primaryLang, version: 'Latest' };

  let languageTable = `### Programming Languages

| Language | Version | Role | Notes |
|----------|---------|------|-------|
`;

  for (let i = 0; i < languages.length; i++) {
    const lang = languages[i];
    const info = langInfo[lang] || { name: lang, version: 'Latest' };
    const role = i === 0 ? 'Primary' : 'Secondary';
    languageTable += `| ${info.name} | ${info.version} | ${role} | ${info.runtime || ''} |\n`;
  }

  let frameworksSection = '';
  for (const lang of languages) {
    const info = langInfo[lang];
    if (info && info.frameworks) {
      frameworksSection += `
### ${info.name} Ecosystem

- **Package Manager**: ${info.packageManager}
- **Frameworks**: ${info.frameworks}
- **Testing**: ${info.testing}
`;
    }
  }

  return `# Technology Stack

**Project**: ${answers.projectName}
**Last Updated**: ${date}
**Version**: 0.1.0

---

## Overview

${answers.description}

---

## Primary Technologies

${languageTable}
${frameworksSection}

---

## Development Environment

### Required Tools

- Primary language runtime (see above)
- Git 2.40+
- IDE: VS Code / JetBrains / Neovim

### Recommended Extensions

- Language-specific LSP
- Linter/Formatter integration
- Test runner integration

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Primary Language | ${primary.name} | Selected during project initialization |
| Package Manager | ${primary.packageManager || 'TBD'} | Standard for ${primary.name} |

---

## Dependencies

### Production Dependencies

*To be documented as dependencies are added.*

### Development Dependencies

*To be documented as dependencies are added.*

---

*Generated by MUSUBI SDD - Update with \`musubi steering\`*
`;
}

async function createConstitution() {
  const constitutionTemplate = path.join(SHARED_TEMPLATE_DIR, 'constitution', 'constitution.md');
  await fs.copy(constitutionTemplate, 'steering/rules/constitution.md');
}

async function createReadme(answers, agent, agentKey) {
  const skillsSection =
    agent.features.hasSkills && answers.skills
      ? `This project uses **MUSUBI** (Ultimate Specification Driven Development) with ${answers.skills.length} skill groups.

### Available Skills

Check \`${agent.layout.skillsDir}/\` directory for all installed skills.

`
      : `This project uses **MUSUBI** (Ultimate Specification Driven Development).

`;

  const commandType =
    agentKey === 'github-copilot' || agentKey === 'codex'
      ? 'Prompts'
      : agentKey === 'windsurf'
        ? 'Workflows'
        : 'Commands';

  const readme = `# MUSUBI - ${answers.projectName}

${answers.description}

## Initialized with MUSUBI SDD for ${agent.label}

${skillsSection}
### ${commandType}

- \`${agent.commands.steering}\` - Generate/update project memory
- \`${agent.commands.requirements}\` - Create EARS requirements
- \`${agent.commands.design}\` - Generate C4 + ADR design
- \`${agent.commands.tasks}\` - Break down into tasks
- \`${agent.commands.implement}\` - Execute implementation
- \`${agent.commands.validate}\` - Validate constitutional compliance

### Project Memory

- \`steering/structure.md\` - Architecture patterns
- \`steering/tech.md\` - Technology stack
- \`steering/product.md\` - Product context
- \`steering/rules/constitution.md\` - 9 Constitutional Articles

### Learn More

- [MUSUBI Documentation](https://github.com/nahisaho/MUSUBI)
- [Constitutional Governance](steering/rules/constitution.md)
- [8-Stage SDD Workflow](steering/rules/workflow.md)

---

**Agent**: ${agent.label}
**Initialized**: ${new Date().toISOString().split('T')[0]}
**MUSUBI Version**: 0.1.0
`;

  const filename = agent.layout.docFile || 'MUSUBI.md';
  await fs.writeFile(filename, readme);
}

// Export for use from musubi.js
module.exports = main;

// Allow direct execution for backward compatibility
if (require.main === module) {
  main().catch(err => {
    console.error(chalk.red('\n❌ Initialization failed:'), err.message);
    process.exit(1);
  });
}
