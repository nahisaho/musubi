/**
 * CLI Tests for MUSUBI
 *
 * Tests for main CLI commands:
 * - musubi init
 * - musubi status
 * - musubi validate
 * - musubi info
 */

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

// MUSUBI bin directory (project root for tests)
const projectRoot = path.resolve(__dirname, '..');
const musubi = `node ${path.join(projectRoot, 'bin/musubi.js')}`;

describe('MUSUBI CLI', () => {
  let testDir;
  let originalCwd;

  beforeEach(() => {
    // Save original cwd
    originalCwd = process.cwd();
    // Create temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'musubi-test-'));
    process.chdir(testDir);
  });

  afterEach(() => {
    // Return to original directory before cleanup
    process.chdir(originalCwd);
    // Cleanup
    if (fs.existsSync(testDir)) {
      fs.removeSync(testDir);
    }
  });

  describe('musubi --version', () => {
    it('should display version number', () => {
      const output = execSync(`${musubi} --version`, { encoding: 'utf8' });
      expect(output).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should display version with -v flag', () => {
      const output = execSync(`${musubi} -v`, { encoding: 'utf8' });
      expect(output).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('musubi --help', () => {
    it('should display help information', () => {
      const output = execSync(`${musubi} --help`, { encoding: 'utf8' });
      expect(output).toContain('MUSUBI');
      expect(output).toContain('init');
      expect(output).toContain('status');
      expect(output).toContain('validate');
    });

    it('should show examples in help', () => {
      const output = execSync(`${musubi} --help`, { encoding: 'utf8' });
      expect(output).toContain('Examples:');
      expect(output).toContain('musubi init');
    });
  });

  describe('musubi info', () => {
    it('should display version and environment info', () => {
      const output = execSync(`${musubi} info`, { encoding: 'utf8' });
      expect(output).toContain('MUSUBI Information');
      expect(output).toContain('Version:');
      expect(output).toContain('Environment:');
      expect(output).toContain('Node.js:');
    });

    it('should list all 25 skills', () => {
      const output = execSync(`${musubi} info`, { encoding: 'utf8' });
      expect(output).toContain('25 Claude Code Skills');
      expect(output).toContain('orchestrator');
      expect(output).toContain('requirements-analyst');
      expect(output).toContain('software-developer');
    });
  });

  describe('musubi status', () => {
    it('should report MUSUBI not initialized in empty directory', () => {
      try {
        execSync(`${musubi} status`, { encoding: 'utf8' });
      } catch (error) {
        expect(error.stdout).toContain('not initialized');
        expect(error.status).toBe(1);
      }
    });

    it('should report initialized status when .claude/skills exists', () => {
      // Create minimal MUSUBI structure
      fs.mkdirSync('.claude/skills', { recursive: true });
      fs.mkdirSync('steering', { recursive: true });
      fs.writeFileSync('steering/structure.md', '# Structure');
      fs.writeFileSync('steering/tech.md', '# Tech');
      fs.writeFileSync('steering/product.md', '# Product');

      const output = execSync(`${musubi} status`, { encoding: 'utf8' });
      expect(output).toContain('MUSUBI is initialized');
    });

    it('should count installed skills', () => {
      fs.mkdirSync('.claude/skills/orchestrator', { recursive: true });
      fs.mkdirSync('.claude/skills/steering', { recursive: true });
      fs.mkdirSync('steering', { recursive: true });

      const output = execSync(`${musubi} status`, { encoding: 'utf8' });
      expect(output).toContain('2 installed');
    });

    it('should check steering files status', () => {
      fs.mkdirSync('.claude/skills', { recursive: true });
      fs.mkdirSync('steering', { recursive: true });
      fs.writeFileSync('steering/structure.md', '# Structure');
      fs.writeFileSync('steering/tech.md', '# Tech');
      // product.md missing

      const output = execSync(`${musubi} status`, { encoding: 'utf8' });
      expect(output).toContain('structure.md');
      expect(output).toContain('tech.md');
      expect(output).toContain('product.md');
    });
  });

  describe('musubi validate', () => {
    it('should fail if MUSUBI not initialized', () => {
      try {
        execSync(`${musubi} validate`, { encoding: 'utf8' });
      } catch (error) {
        expect(error.stdout).toContain('not initialized');
        expect(error.status).toBe(1);
      }
    });

    it('should run validation when initialized', () => {
      // Setup minimal MUSUBI project
      fs.mkdirSync('steering/rules', { recursive: true });
      fs.writeFileSync('steering/rules/constitution.md', '# Constitution');

      const output = execSync(`${musubi} validate`, { encoding: 'utf8' });
      expect(output).toContain('MUSUBI Validation');
      expect(output).toContain('Article I: Library-First');
    });

    it('should check for lib/ directory (Article I)', () => {
      fs.mkdirSync('steering/rules', { recursive: true });
      fs.writeFileSync('steering/rules/constitution.md', '# Constitution');
      fs.mkdirSync('lib/auth', { recursive: true });

      const output = execSync(`${musubi} validate`, { encoding: 'utf8' });
      expect(output).toContain('1 libraries found');
    });

    it('should check for CLI interfaces (Article II)', () => {
      fs.mkdirSync('steering/rules', { recursive: true });
      fs.writeFileSync('steering/rules/constitution.md', '# Constitution');
      fs.mkdirSync('lib/auth', { recursive: true });
      fs.writeFileSync('lib/auth/cli.ts', '#!/usr/bin/env node');

      const output = execSync(`${musubi} validate`, { encoding: 'utf8' });
      expect(output).toContain('CLI Interface');
    });

    it('should check for EARS format (Article IV)', () => {
      fs.mkdirSync('steering/rules', { recursive: true });
      fs.writeFileSync('steering/rules/constitution.md', '# Constitution');
      fs.mkdirSync('storage/specs', { recursive: true });
      fs.writeFileSync(
        'storage/specs/auth-requirements.md',
        'WHEN user provides credentials, THEN system SHALL authenticate'
      );

      const output = execSync(`${musubi} validate`, { encoding: 'utf8' });
      expect(output).toContain('EARS Requirements Format');
      expect(output).toContain('All requirements use EARS format');
    });

    it('should provide verbose output with --verbose flag', () => {
      fs.mkdirSync('steering/rules', { recursive: true });
      fs.writeFileSync('steering/rules/constitution.md', '# Constitution');
      fs.mkdirSync('lib/auth', { recursive: true });
      fs.mkdirSync('lib/payment', { recursive: true });

      const output = execSync(`${musubi} validate --verbose`, { encoding: 'utf8' });
      expect(output).toContain('auth');
      expect(output).toContain('payment');
    });
  });

  describe('musubi with no arguments', () => {
    it('should display help when no command provided', () => {
      try {
        execSync(musubi, { encoding: 'utf8', stdio: 'pipe' });
        // If no error thrown, check normal output path
        throw new Error('Should have thrown an error');
      } catch (error) {
        // Commander may output to stdout or stderr
        const output = error.stdout + error.stderr;
        expect(output).toContain('Usage:');
        expect(output).toContain('Commands:');
      }
    });
  });

  describe('musubi with invalid command', () => {
    it('should show error for unknown command', () => {
      try {
        execSync(`${musubi} invalid-command`, { encoding: 'utf8', stdio: 'pipe' });
      } catch (error) {
        expect(error.stderr).toContain('unknown command');
      }
    });
  });
});
