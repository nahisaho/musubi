/**
 * Steering Sync Tests
 * 
 * Tests for steering file synchronization.
 * 
 * Requirement: IMP-6.2-007-01, IMP-6.2-007-02
 */

const { SteeringSync } = require('../../src/constitutional/steering-sync');
const fs = require('fs').promises;
const path = require('path');

describe('SteeringSync', () => {
  let sync;
  const testDir = 'test-steering-sync-temp';
  const steeringDir = `${testDir}/steering`;

  beforeEach(async () => {
    sync = new SteeringSync({ 
      steeringDir,
      backupDir: `${steeringDir}/backups`
    });
    
    // Setup test steering directory
    await fs.mkdir(steeringDir, { recursive: true });
    
    // Create basic steering files
    await fs.writeFile(
      path.join(steeringDir, 'project.yml'),
      "name: 'Test Project'\nversion: '1.0.0'\nstatus: active\n",
      'utf-8'
    );
    
    await fs.writeFile(
      path.join(steeringDir, 'product.md'),
      '# Product\n\n**Version**: 1.0.0\n\n## Changelog\n',
      'utf-8'
    );
    
    await fs.writeFile(
      path.join(steeringDir, 'tech.md'),
      '# Technology\n\n## Dependencies\n- Node.js\n',
      'utf-8'
    );
    
    await fs.writeFile(
      path.join(steeringDir, 'structure.md'),
      '# Structure\n\n- `src/`: Source code\n',
      'utf-8'
    );
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  describe('constructor', () => {
    it('should create sync with default config', () => {
      const s = new SteeringSync();
      expect(s.config).toBeDefined();
      expect(s.config.steeringDir).toBe('steering');
    });

    it('should merge custom config', () => {
      const s = new SteeringSync({ customOption: true });
      expect(s.config.customOption).toBe(true);
    });
  });

  describe('updateForVersion', () => {
    it('should update project.yml version', async () => {
      const result = await sync.updateForVersion({
        version: '1.1.0'
      });

      expect(result.updates.length).toBeGreaterThan(0);
      
      const projectContent = await fs.readFile(
        path.join(steeringDir, 'project.yml'),
        'utf-8'
      );
      expect(projectContent).toContain("version: '1.1.0'");
    });

    it('should update product.md version', async () => {
      const result = await sync.updateForVersion({
        version: '1.1.0'
      });

      const productContent = await fs.readFile(
        path.join(steeringDir, 'product.md'),
        'utf-8'
      );
      expect(productContent).toContain('**Version**: 1.1.0');
    });

    it('should add changelog entry', async () => {
      const result = await sync.updateForVersion({
        version: '1.1.0',
        features: ['New feature A', 'Bug fix B']
      });

      const productContent = await fs.readFile(
        path.join(steeringDir, 'product.md'),
        'utf-8'
      );
      expect(productContent).toContain('### v1.1.0');
      expect(productContent).toContain('New feature A');
    });

    it('should update tech.md when techChanges provided', async () => {
      const result = await sync.updateForVersion({
        version: '1.1.0',
        techChanges: {
          newDependencies: [
            { name: 'Express', version: '4.x', description: 'Web framework' }
          ]
        }
      });

      const techContent = await fs.readFile(
        path.join(steeringDir, 'tech.md'),
        'utf-8'
      );
      expect(techContent).toContain('Express');
    });

    it('should update structure.md when structureChanges provided', async () => {
      const result = await sync.updateForVersion({
        version: '1.1.0',
        structureChanges: {
          newDirectories: [
            { path: 'lib', description: 'Library code' }
          ]
        }
      });

      const structureContent = await fs.readFile(
        path.join(steeringDir, 'structure.md'),
        'utf-8'
      );
      expect(structureContent).toContain('lib');
    });

    it('should create backup before update', async () => {
      await sync.updateForVersion({ version: '1.1.0' });

      const backupDir = path.join(steeringDir, 'backups');
      const backups = await fs.readdir(backupDir);
      expect(backups.length).toBeGreaterThan(0);
    });

    it('should return update summary', async () => {
      const result = await sync.updateForVersion({
        version: '1.1.0',
        status: 'released'
      });

      expect(result.version).toBe('1.1.0');
      expect(result.updatedAt).toBeDefined();
      expect(result.filesUpdated).toBeGreaterThan(0);
    });
  });

  describe('checkConsistency', () => {
    it('should pass when files are consistent', async () => {
      const result = await sync.checkConsistency();

      expect(result.consistent).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    it('should detect version mismatch', async () => {
      // Update project.yml to different version
      await fs.writeFile(
        path.join(steeringDir, 'project.yml'),
        "version: '2.0.0'\n",
        'utf-8'
      );

      const result = await sync.checkConsistency();

      const versionIssue = result.issues.find(i => i.type === 'version-mismatch');
      expect(versionIssue).toBeDefined();
    });

    it('should detect missing directory referenced in structure.md', async () => {
      await fs.writeFile(
        path.join(steeringDir, 'structure.md'),
        '# Structure\n\n- `nonexistent/`: Does not exist\n',
        'utf-8'
      );

      const result = await sync.checkConsistency();

      const dirIssue = result.issues.find(i => i.type === 'missing-directory');
      expect(dirIssue).toBeDefined();
      expect(dirIssue.message).toContain('nonexistent');
    });

    it('should include timestamp', async () => {
      const result = await sync.checkConsistency();
      expect(result.checkedAt).toBeDefined();
    });
  });

  describe('autoFix', () => {
    it('should return fixed and failed counts', async () => {
      const issues = [
        { type: 'version-mismatch', file: 'product.md', message: 'test' }
      ];

      const result = await sync.autoFix(issues);

      expect(result.fixed).toBeDefined();
      expect(result.failed).toBeDefined();
    });

    it('should not auto-fix version mismatch', async () => {
      const issues = [
        { type: 'version-mismatch', file: 'product.md', message: 'test' }
      ];

      const result = await sync.autoFix(issues);

      expect(result.failed).toBe(1);
      expect(result.details.failed[0].reason).toContain('手動');
    });

    it('should include timestamp', async () => {
      const result = await sync.autoFix([]);
      expect(result.fixedAt).toBeDefined();
    });
  });

  describe('loadProjectFile', () => {
    it('should load and parse project.yml', async () => {
      const project = await sync.loadProjectFile();

      expect(project.name).toBe('Test Project');
      expect(project.version).toBe('1.0.0');
      expect(project.status).toBe('active');
    });

    it('should return null for missing file', async () => {
      await fs.rm(path.join(steeringDir, 'project.yml'));

      const project = await sync.loadProjectFile();

      expect(project).toBeNull();
    });
  });

  describe('loadSteeringFile', () => {
    it('should load file content', async () => {
      const content = await sync.loadSteeringFile('tech.md');

      expect(content).toContain('Technology');
    });

    it('should return null for missing file', async () => {
      const content = await sync.loadSteeringFile('nonexistent.md');

      expect(content).toBeNull();
    });
  });

  describe('backupFiles', () => {
    it('should create backup directory', async () => {
      const backupPath = await sync.backupFiles();

      expect(backupPath).toBeDefined();
      const exists = await fs.access(backupPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should backup all steering files', async () => {
      const backupPath = await sync.backupFiles();

      const files = await fs.readdir(backupPath);
      expect(files).toContain('project.yml');
      expect(files).toContain('product.md');
      expect(files).toContain('tech.md');
      expect(files).toContain('structure.md');
    });

    it('should use timestamp in backup path', async () => {
      const backupPath = await sync.backupFiles();

      // Backup path should contain date-like pattern
      expect(backupPath).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  describe('generateReport', () => {
    it('should generate markdown report', async () => {
      const report = await sync.generateReport();

      expect(report).toContain('Steering Sync Report');
    });

    it('should include consistency status', async () => {
      const report = await sync.generateReport();

      expect(report).toContain('Consistency Check');
    });

    it('should include file status table', async () => {
      const report = await sync.generateReport();

      expect(report).toContain('File Status');
      expect(report).toContain('tech.md');
      expect(report).toContain('structure.md');
    });

    it('should show issues when inconsistent', async () => {
      await fs.writeFile(
        path.join(steeringDir, 'project.yml'),
        "version: '9.9.9'\n",
        'utf-8'
      );

      const report = await sync.generateReport();

      expect(report).toContain('inconsistency');
    });

    it('should include project version', async () => {
      const report = await sync.generateReport();

      expect(report).toContain('1.0.0');
    });
  });

  describe('updateProjectFile', () => {
    it('should update version in project.yml', async () => {
      const result = await sync.updateProjectFile({ version: '2.0.0' });

      expect(result).toBeDefined();
      expect(result.changes).toContain('version');
    });

    it('should update status in project.yml', async () => {
      const result = await sync.updateProjectFile({ status: 'released' });

      const content = await fs.readFile(
        path.join(steeringDir, 'project.yml'),
        'utf-8'
      );
      expect(content).toContain('status: released');
    });

    it('should return null when file missing', async () => {
      await fs.rm(path.join(steeringDir, 'project.yml'));

      const result = await sync.updateProjectFile({ version: '2.0.0' });

      expect(result).toBeNull();
    });
  });

  describe('updateProductFile', () => {
    it('should update version header', async () => {
      const result = await sync.updateProductFile({ version: '2.0.0' });

      const content = await fs.readFile(
        path.join(steeringDir, 'product.md'),
        'utf-8'
      );
      expect(content).toContain('**Version**: 2.0.0');
    });

    it('should add features to changelog', async () => {
      const result = await sync.updateProductFile({
        version: '2.0.0',
        features: ['Feature X', 'Feature Y']
      });

      const content = await fs.readFile(
        path.join(steeringDir, 'product.md'),
        'utf-8'
      );
      expect(content).toContain('Feature X');
      expect(content).toContain('Feature Y');
    });

    it('should return null when no changes needed', async () => {
      const result = await sync.updateProductFile({});

      expect(result).toBeNull();
    });
  });

  describe('updateTechFile', () => {
    it('should add new dependencies', async () => {
      const result = await sync.updateTechFile({
        techChanges: {
          newDependencies: [{ name: 'React', description: 'UI library' }]
        }
      });

      const content = await fs.readFile(
        path.join(steeringDir, 'tech.md'),
        'utf-8'
      );
      expect(content).toContain('React');
    });

    it('should skip existing dependencies', async () => {
      const result = await sync.updateTechFile({
        techChanges: {
          newDependencies: [{ name: 'Node.js', description: 'Already exists' }]
        }
      });

      expect(result).toBeNull();
    });
  });

  describe('updateStructureFile', () => {
    it('should add new directories', async () => {
      const result = await sync.updateStructureFile({
        structureChanges: {
          newDirectories: [{ path: 'tests', description: 'Test files' }]
        }
      });

      const content = await fs.readFile(
        path.join(steeringDir, 'structure.md'),
        'utf-8'
      );
      expect(content).toContain('tests');
    });

    it('should skip existing directories', async () => {
      const result = await sync.updateStructureFile({
        structureChanges: {
          newDirectories: [{ path: 'src', description: 'Already exists' }]
        }
      });

      expect(result).toBeNull();
    });
  });
});
