/**
 * Tests for Package Manager
 *
 * @traceability
 * - Requirement: REQ-V08-002 (Monorepo Support)
 * - Design: docs/plans/musubi-improvement-plan-v0.8.md
 */

const path = require('path');
const fs = require('fs-extra');
const {
  PackageManager,
  PackageType,
  DEFAULT_COVERAGE_TARGETS,
} = require('../src/managers/package-manager');

describe('PackageManager', () => {
  let manager;
  const testRoot = path.join(__dirname, '.test-package-manager');

  beforeEach(async () => {
    await fs.ensureDir(testRoot);
    await fs.ensureDir(path.join(testRoot, 'steering'));
    manager = new PackageManager(testRoot);
  });

  afterEach(async () => {
    await fs.remove(testRoot);
  });

  describe('detectPackageManager', () => {
    it('should detect npm by default', async () => {
      const pm = await manager.detectPackageManager();
      expect(pm).toBe('npm');
    });

    it('should detect pnpm from lock file', async () => {
      await fs.writeFile(path.join(testRoot, 'pnpm-lock.yaml'), '');
      const pm = await manager.detectPackageManager();
      expect(pm).toBe('pnpm');
    });

    it('should detect yarn from lock file', async () => {
      await fs.writeFile(path.join(testRoot, 'yarn.lock'), '');
      const pm = await manager.detectPackageManager();
      expect(pm).toBe('yarn');
    });

    it('should detect npm from lock file', async () => {
      await fs.writeFile(path.join(testRoot, 'package-lock.json'), '{}');
      const pm = await manager.detectPackageManager();
      expect(pm).toBe('npm');
    });
  });

  describe('loadConfig', () => {
    it('should return default config when no file exists', async () => {
      const config = await manager.loadConfig();
      expect(config).toBeDefined();
      expect(config.packages).toEqual([]);
    });

    it('should load config from file', async () => {
      const configContent = `
schema_version: "1.0"
packages:
  - name: test-package
    path: packages/test
    type: library
`;
      await fs.writeFile(path.join(testRoot, 'steering/packages.yml'), configContent);

      // Reset cached config
      manager._config = null;

      const config = await manager.loadConfig();
      expect(config.packages).toHaveLength(1);
      expect(config.packages[0].name).toBe('test-package');
    });
  });

  describe('getPackages', () => {
    it('should return empty array for empty project', async () => {
      const packages = await manager.getPackages();
      expect(packages).toEqual([]);
    });

    it('should return configured packages', async () => {
      const configContent = `
schema_version: "1.0"
packages:
  - name: "@test/core"
    path: packages/core
    type: library
  - name: "@test/cli"
    path: packages/cli
    type: cli
`;
      await fs.writeFile(path.join(testRoot, 'steering/packages.yml'), configContent);
      manager._config = null;
      manager._packages = null;

      const packages = await manager.getPackages();
      expect(packages).toHaveLength(2);
    });
  });

  describe('getCoverageTarget', () => {
    beforeEach(async () => {
      const configContent = `
schema_version: "1.0"
packages:
  - name: core-lib
    path: packages/core
    type: library
  - name: cli-tool
    path: packages/cli
    type: cli
    coverage_target: 75
  - name: web-app
    path: packages/web
    type: application
`;
      await fs.writeFile(path.join(testRoot, 'steering/packages.yml'), configContent);
      manager._config = null;
      manager._packages = null;
    });

    it('should return type-based default for library', async () => {
      const target = await manager.getCoverageTarget('core-lib');
      expect(target).toBe(90);
    });

    it('should return explicit target if specified', async () => {
      const target = await manager.getCoverageTarget('cli-tool');
      expect(target).toBe(75);
    });

    it('should return type-based default for application', async () => {
      const target = await manager.getCoverageTarget('web-app');
      expect(target).toBe(60);
    });

    it('should return 80 for unknown package', async () => {
      const target = await manager.getCoverageTarget('unknown');
      expect(target).toBe(80);
    });
  });

  describe('buildDependencyGraph', () => {
    beforeEach(async () => {
      const configContent = `
schema_version: "1.0"
packages:
  - name: "@test/core"
    path: packages/core
    type: library
    dependencies: []
  - name: "@test/cli"
    path: packages/cli
    type: cli
    dependencies:
      - "@test/core"
  - name: "@test/web"
    path: packages/web
    type: application
    dependencies:
      - "@test/core"
`;
      await fs.writeFile(path.join(testRoot, 'steering/packages.yml'), configContent);
      manager._config = null;
      manager._packages = null;
    });

    it('should build nodes for all packages', async () => {
      const graph = await manager.buildDependencyGraph();
      expect(graph.nodes).toHaveLength(3);
    });

    it('should build edges for internal dependencies', async () => {
      const graph = await manager.buildDependencyGraph();

      const cliToCoreEdge = graph.edges.find(e => e.from === '@test/cli' && e.to === '@test/core');
      expect(cliToCoreEdge).toBeDefined();

      const webToCoreEdge = graph.edges.find(e => e.from === '@test/web' && e.to === '@test/core');
      expect(webToCoreEdge).toBeDefined();
    });
  });

  describe('generateMermaidGraph', () => {
    beforeEach(async () => {
      const configContent = `
schema_version: "1.0"
packages:
  - name: core
    path: packages/core
    type: library
    dependencies: []
  - name: cli
    path: packages/cli
    type: cli
    dependencies:
      - core
`;
      await fs.writeFile(path.join(testRoot, 'steering/packages.yml'), configContent);
      manager._config = null;
      manager._packages = null;
    });

    it('should generate valid mermaid syntax', async () => {
      const mermaid = await manager.generateMermaidGraph();

      expect(mermaid).toContain('graph TD');
      expect(mermaid).toContain('core');
      expect(mermaid).toContain('cli');
      expect(mermaid).toContain('-->');
    });
  });

  describe('validate', () => {
    it('should pass for valid configuration', async () => {
      // Create package structure
      await fs.ensureDir(path.join(testRoot, 'packages/core'));
      await fs.writeFile(
        path.join(testRoot, 'packages/core/package.json'),
        JSON.stringify({ name: 'core', version: '1.0.0' })
      );

      const configContent = `
schema_version: "1.0"
packages:
  - name: core
    path: packages/core
    type: library
`;
      await fs.writeFile(path.join(testRoot, 'steering/packages.yml'), configContent);
      manager._config = null;
      manager._packages = null;

      const result = await manager.validate();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing package.json', async () => {
      const configContent = `
schema_version: "1.0"
packages:
  - name: missing
    path: packages/missing
    type: library
`;
      await fs.writeFile(path.join(testRoot, 'steering/packages.yml'), configContent);
      manager._config = null;
      manager._packages = null;

      const result = await manager.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect invalid coverage target', async () => {
      await fs.ensureDir(path.join(testRoot, 'packages/bad'));
      await fs.writeFile(
        path.join(testRoot, 'packages/bad/package.json'),
        JSON.stringify({ name: 'bad', version: '1.0.0' })
      );

      const configContent = `
schema_version: "1.0"
packages:
  - name: bad
    path: packages/bad
    type: library
    coverage_target: 150
`;
      await fs.writeFile(path.join(testRoot, 'steering/packages.yml'), configContent);
      manager._config = null;
      manager._packages = null;

      const result = await manager.validate();
      expect(result.valid).toBe(false);
    });
  });

  describe('getPublishablePackages', () => {
    it('should return publishable packages only', async () => {
      const configContent = `
schema_version: "1.0"
packages:
  - name: core
    path: packages/core
    type: library
    publishable: true
  - name: internal
    path: packages/internal
    type: library
    publishable: false
`;
      await fs.writeFile(path.join(testRoot, 'steering/packages.yml'), configContent);
      manager._config = null;
      manager._packages = null;

      const packages = await manager.getPublishablePackages();
      expect(packages).toHaveLength(1);
      expect(packages[0].name).toBe('core');
    });
  });
});

describe('PackageType', () => {
  it('should have all expected types', () => {
    expect(PackageType.LIBRARY).toBe('library');
    expect(PackageType.CLI).toBe('cli');
    expect(PackageType.APPLICATION).toBe('application');
    expect(PackageType.EXTENSION).toBe('extension');
    expect(PackageType.INFRASTRUCTURE).toBe('infrastructure');
    expect(PackageType.MONOREPO_ROOT).toBe('monorepo-root');
  });
});

describe('DEFAULT_COVERAGE_TARGETS', () => {
  it('should have appropriate defaults', () => {
    expect(DEFAULT_COVERAGE_TARGETS.library).toBe(90);
    expect(DEFAULT_COVERAGE_TARGETS.cli).toBe(70);
    expect(DEFAULT_COVERAGE_TARGETS.application).toBe(60);
    expect(DEFAULT_COVERAGE_TARGETS.extension).toBe(60);
    expect(DEFAULT_COVERAGE_TARGETS.infrastructure).toBe(50);
  });
});
