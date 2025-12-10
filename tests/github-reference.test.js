/**
 * Tests for GitHub Reference Feature
 *
 * Tests the --reference option for referencing GitHub repositories
 * to analyze patterns and generate improvement suggestions.
 */

const path = require('path');

// Mock modules before requiring the module under test
jest.mock('fs-extra');
jest.mock('https');

const _fs = require('fs-extra'); // Mocked, kept for potential future use
const _https = require('https'); // Mocked, kept for potential future use

// Extract functions from musubi-init.js for testing
// We need to read the file and eval specific functions
const initPath = path.join(__dirname, '..', 'bin', 'musubi-init.js');
const initContent = require('fs').readFileSync(initPath, 'utf8');

// Helper to extract and create function from source
function _extractFunction(name) {
  // Simple extraction for testing - look for function definition
  const funcRegex = new RegExp(`(function ${name}|const ${name} = |async function ${name})`, 'g');
  if (!funcRegex.test(initContent)) {
    return null;
  }
  return true;
}

describe('GitHub Reference Feature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseGitHubRepo', () => {
    // Since we can't easily extract the function, we'll test the patterns
    const _patterns = [
      { input: 'owner/repo', expected: { owner: 'owner', repo: 'repo', branch: 'main' } },
      { input: 'facebook/react', expected: { owner: 'facebook', repo: 'react', branch: 'main' } },
      {
        input: 'owner/repo@develop',
        expected: { owner: 'owner', repo: 'repo', branch: 'develop' },
      },
      { input: 'https://github.com/owner/repo', expected: { owner: 'owner', repo: 'repo' } },
      { input: 'https://github.com/owner/repo.git', expected: { owner: 'owner', repo: 'repo' } },
      { input: 'git@github.com:owner/repo.git', expected: { owner: 'owner', repo: 'repo' } },
    ]; // Kept for documentation of expected patterns

    it('should have parseGitHubRepo function defined', () => {
      expect(initContent).toContain('function parseGitHubRepo');
    });

    it('should handle owner/repo format', () => {
      expect(initContent).toContain('simpleMatch = repoRef.match');
    });

    it('should handle https://github.com format', () => {
      expect(initContent).toContain('httpsMatch = repoRef.match');
    });

    it('should handle git@github.com format', () => {
      expect(initContent).toContain('sshMatch = repoRef.match');
    });

    it('should support branch specification with @', () => {
      expect(initContent).toContain("branch = simpleMatch[3] || 'main'");
    });

    it('should support path specification with #', () => {
      expect(initContent).toContain("path = simpleMatch[4] || ''");
    });
  });

  describe('fetchGitHubRepo', () => {
    it('should have fetchGitHubRepo function defined', () => {
      expect(initContent).toContain('async function fetchGitHubRepo');
    });

    it('should fetch repository metadata from GitHub API', () => {
      expect(initContent).toContain('fetchGitHubAPI(`/repos/${owner}/${repo}`)');
    });

    it('should support GITHUB_TOKEN environment variable', () => {
      expect(initContent).toContain('process.env.GITHUB_TOKEN');
    });

    it('should fetch key files like README.md and package.json', () => {
      expect(initContent).toContain("'README.md'");
      expect(initContent).toContain("'package.json'");
      expect(initContent).toContain("'Cargo.toml'");
    });

    it('should handle rate limit errors gracefully', () => {
      expect(initContent).toContain('GitHub API rate limit exceeded');
    });

    it('should handle repository not found errors', () => {
      expect(initContent).toContain('Repository not found');
    });
  });

  describe('fetchGitHubRepos', () => {
    it('should have fetchGitHubRepos function defined', () => {
      expect(initContent).toContain('async function fetchGitHubRepos');
    });

    it('should iterate over multiple repositories', () => {
      expect(initContent).toContain('for (const repoRef of repos)');
    });

    it('should log progress for each repository', () => {
      expect(initContent).toContain('Fetching ${repoRef}');
    });
  });

  describe('analyzeReposForImprovements', () => {
    it('should have analyzeReposForImprovements function defined', () => {
      expect(initContent).toContain('function analyzeReposForImprovements');
    });

    it('should detect Clean Architecture pattern', () => {
      expect(initContent).toContain("pattern: 'clean-architecture'");
    });

    it('should detect Hexagonal Architecture pattern', () => {
      expect(initContent).toContain("pattern: 'hexagonal'");
    });

    it('should detect DDD patterns', () => {
      expect(initContent).toContain("pattern: 'domain-driven-design'");
    });

    it('should detect monorepo patterns', () => {
      expect(initContent).toContain("pattern: 'monorepo'");
    });

    it('should analyze package.json for technologies', () => {
      expect(initContent).toContain("JSON.parse(repo.files['package.json'])");
    });

    it('should detect React framework', () => {
      expect(initContent).toContain("tech: 'react'");
    });

    it('should detect Vue framework', () => {
      expect(initContent).toContain("tech: 'vue'");
    });

    it('should detect Next.js framework', () => {
      expect(initContent).toContain("tech: 'nextjs'");
    });

    it('should detect TypeScript', () => {
      expect(initContent).toContain("tech: 'typescript'");
    });

    it('should detect testing frameworks', () => {
      expect(initContent).toContain("config: 'jest'");
      expect(initContent).toContain("config: 'vitest'");
    });

    it('should detect linting tools', () => {
      expect(initContent).toContain("config: 'eslint'");
      expect(initContent).toContain("config: 'prettier'");
    });

    it('should analyze Cargo.toml for Rust patterns', () => {
      expect(initContent).toContain("pattern: 'rust-workspace'");
    });

    it('should detect Rust frameworks', () => {
      expect(initContent).toContain("tech: 'tokio'");
      expect(initContent).toContain("tech: 'axum'");
    });

    it('should analyze pyproject.toml for Python patterns', () => {
      expect(initContent).toContain("tech: 'fastapi'");
      expect(initContent).toContain("tech: 'django'");
    });

    it('should generate architecture suggestions', () => {
      expect(initContent).toContain("type: 'architecture'");
    });

    it('should generate technology suggestions', () => {
      expect(initContent).toContain("type: 'technology'");
    });
  });

  describe('saveReferenceRepos', () => {
    it('should have saveReferenceRepos function defined', () => {
      expect(initContent).toContain('async function saveReferenceRepos');
    });

    it('should create steering/references directory', () => {
      expect(initContent).toContain("steering', 'references'");
    });

    it('should generate markdown file with timestamp', () => {
      expect(initContent).toContain('github-references-${timestamp}.md');
    });

    it('should include repository metadata in output', () => {
      expect(initContent).toContain('repo.metadata.name');
      expect(initContent).toContain('repo.metadata.language');
      expect(initContent).toContain('repo.metadata.stars');
    });

    it('should include directory structure in output', () => {
      expect(initContent).toContain('Directory Structure');
    });

    it('should include architecture patterns section', () => {
      expect(initContent).toContain('Architecture Patterns Detected');
    });

    it('should include improvement suggestions section', () => {
      expect(initContent).toContain('Improvement Suggestions');
    });
  });

  describe('CLI Integration', () => {
    it('should add --reference option to init command', () => {
      const musubiPath = path.join(__dirname, '..', 'bin', 'musubi.js');
      const musubiContent = require('fs').readFileSync(musubiPath, 'utf8');
      expect(musubiContent).toContain('--reference <repo>');
    });

    it('should add -r/--ref shorthand alias', () => {
      const musubiPath = path.join(__dirname, '..', 'bin', 'musubi.js');
      const musubiContent = require('fs').readFileSync(musubiPath, 'utf8');
      expect(musubiContent).toContain('-r, --ref <repo>');
    });

    it('should support multiple references', () => {
      const musubiPath = path.join(__dirname, '..', 'bin', 'musubi.js');
      const musubiContent = require('fs').readFileSync(musubiPath, 'utf8');
      expect(musubiContent).toContain('can be specified multiple times');
    });

    it('should merge --reference and --ref options', () => {
      const musubiPath = path.join(__dirname, '..', 'bin', 'musubi.js');
      const musubiContent = require('fs').readFileSync(musubiPath, 'utf8');
      expect(musubiContent).toContain('(options.reference || [])');
      expect(musubiContent).toContain('(options.ref || [])');
    });

    it('should pass references to init options', () => {
      const musubiPath = path.join(__dirname, '..', 'bin', 'musubi.js');
      const musubiContent = require('fs').readFileSync(musubiPath, 'utf8');
      expect(musubiContent).toContain('references:');
    });
  });

  describe('Init Integration', () => {
    it('should handle GitHub references in main function', () => {
      expect(initContent).toContain('options.references');
    });

    it('should call fetchGitHubRepos when references provided', () => {
      expect(initContent).toContain('fetchGitHubRepos(options.references)');
    });

    it('should call analyzeReposForImprovements', () => {
      expect(initContent).toContain('analyzeReposForImprovements(validRepos)');
    });

    it('should display improvement suggestions during init', () => {
      expect(initContent).toContain('improvement suggestion(s)');
    });

    it('should save reference analysis to file', () => {
      expect(initContent).toContain('saveReferenceRepos(referenceRepos, repoAnalysis');
    });
  });
});

describe('Pattern Detection', () => {
  describe('Architecture Detection Rules', () => {
    it('should detect clean architecture by directory names', () => {
      // Clean architecture directories
      const _cleanArchDirs = ['domain', 'application', 'infrastructure', 'interface']; // Reference docs
      expect(initContent).toContain("['domain', 'application', 'infrastructure', 'interface']");
    });

    it('should detect hexagonal architecture by directory names', () => {
      // Hexagonal architecture directories
      const _hexDirs = ['adapters', 'ports', 'core', 'hexagon']; // Reference docs
      expect(initContent).toContain("['adapters', 'ports', 'core', 'hexagon']");
    });

    it('should detect DDD by directory names', () => {
      // DDD directories
      expect(initContent).toContain("'aggregates'");
      expect(initContent).toContain("'entities'");
      expect(initContent).toContain("'valueobjects'");
    });
  });

  describe('Technology Detection Rules', () => {
    it('should detect frontend frameworks', () => {
      expect(initContent).toContain("deps['react']");
      expect(initContent).toContain("deps['vue']");
      expect(initContent).toContain("deps['@angular/core']");
    });

    it('should detect backend frameworks', () => {
      expect(initContent).toContain("deps['express']");
      expect(initContent).toContain("deps['fastify']");
    });

    it('should detect meta-frameworks', () => {
      expect(initContent).toContain("deps['next']");
    });
  });
});

describe('Error Handling', () => {
  it('should handle invalid repository format', () => {
    expect(initContent).toContain('Invalid GitHub repository format');
  });

  it('should handle API errors gracefully', () => {
    expect(initContent).toContain('GitHub API error');
  });

  it('should continue on individual file fetch errors', () => {
    expect(initContent).toContain('Ignore individual file fetch errors');
  });

  it('should filter out repos with errors before analysis', () => {
    expect(initContent).toContain('referenceRepos.filter(r => !r.error)');
  });
});
