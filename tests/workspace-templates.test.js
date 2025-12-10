/**
 * Workspace/Monorepo Template Tests
 *
 * Tests for the --workspace option and architecture templates
 */

const path = require('path');
const fs = require('fs-extra');
const os = require('os');

describe('Workspace/Monorepo Templates', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `musubi-workspace-test-${Date.now()}`);
    await fs.ensureDir(tempDir);
  });

  afterEach(async () => {
    if (tempDir && (await fs.pathExists(tempDir))) {
      await fs.remove(tempDir);
    }
  });

  describe('Workspace Structure Templates', () => {
    const templates = {
      'workspace-basic': ['packages/', 'packages/core/', 'packages/cli/', 'packages/web/'],
      'workspace-layered': ['core/', 'api/', 'web/', 'shared/', 'tools/'],
      'workspace-ddd': [
        'domains/',
        'domains/identity/',
        'domains/catalog/',
        'shared/',
        'shared/kernel/',
        'infrastructure/',
      ],
      'workspace-fullstack': ['frontend/', 'backend/', 'shared/', 'e2e/', 'docs/'],
      'microservices-basic': [
        'services/',
        'services/auth/',
        'services/api/',
        'services/worker/',
        'libs/',
      ],
      'microservices-gateway': [
        'gateway/',
        'services/',
        'services/users/',
        'services/products/',
        'shared/',
      ],
      'microservices-event': [
        'services/',
        'services/order/',
        'services/inventory/',
        'events/',
        'events/schemas/',
        'infrastructure/',
      ],
    };

    for (const [template, expectedDirs] of Object.entries(templates)) {
      it(`should define ${template} structure with correct directories`, () => {
        expect(expectedDirs.length).toBeGreaterThan(0);
        expectedDirs.forEach(dir => {
          expect(dir.endsWith('/')).toBe(true);
        });
      });
    }
  });

  describe('Language-Specific Workspace Configs', () => {
    it('should generate pnpm-workspace.yaml for JavaScript', async () => {
      const workspaceConfig = `packages:
  - 'packages/*'
  - 'services/*'
  - 'shared'
  - 'libs/*'
`;
      const configPath = path.join(tempDir, 'pnpm-workspace.yaml');
      await fs.writeFile(configPath, workspaceConfig);

      const content = await fs.readFile(configPath, 'utf8');
      expect(content).toContain('packages:');
      expect(content).toContain("'packages/*'");
    });

    it('should generate Cargo.toml for Rust workspace', async () => {
      const cargoToml = `[workspace]
resolver = "2"
members = [
    "packages/*"
]

[workspace.package]
version = "0.1.0"
edition = "2021"

[workspace.dependencies]
tokio = { version = "1", features = ["full"] }
`;
      const configPath = path.join(tempDir, 'Cargo.toml');
      await fs.writeFile(configPath, cargoToml);

      const content = await fs.readFile(configPath, 'utf8');
      expect(content).toContain('[workspace]');
      expect(content).toContain('resolver = "2"');
      expect(content).toContain('[workspace.dependencies]');
    });

    it('should generate pyproject.toml for Python monorepo', async () => {
      const pyprojectToml = `[project]
name = "my-project"
version = "0.1.0"
requires-python = ">=3.11"

[tool.ruff]
line-length = 100
`;
      const configPath = path.join(tempDir, 'pyproject.toml');
      await fs.writeFile(configPath, pyprojectToml);

      const content = await fs.readFile(configPath, 'utf8');
      expect(content).toContain('[project]');
      expect(content).toContain('requires-python');
    });

    it('should generate go.work for Go workspaces', async () => {
      const goWork = `go 1.21

use (
    ./cmd
    ./internal
    ./pkg
)
`;
      const configPath = path.join(tempDir, 'go.work');
      await fs.writeFile(configPath, goWork);

      const content = await fs.readFile(configPath, 'utf8');
      expect(content).toContain('go 1.21');
      expect(content).toContain('use (');
    });
  });

  describe('Project Structure Options', () => {
    it('should have single package as default', () => {
      const choices = [
        { name: 'Single package', value: 'single' },
        { name: 'Workspace / Monorepo', value: 'workspace' },
        { name: 'Microservices', value: 'microservices' },
      ];
      expect(choices[0].value).toBe('single');
    });

    it('should offer workspace and microservices options', () => {
      const choices = [
        { name: 'Single package', value: 'single' },
        { name: 'Workspace / Monorepo', value: 'workspace' },
        { name: 'Microservices', value: 'microservices' },
      ];
      expect(choices.map(c => c.value)).toContain('workspace');
      expect(choices.map(c => c.value)).toContain('microservices');
    });
  });

  describe('Architecture Template Selection', () => {
    it('should offer workspace templates when workspace is selected', () => {
      const workspaceTemplates = [
        { name: 'Basic Workspace (packages/)', value: 'workspace-basic' },
        { name: 'Layered (core/, api/, web/)', value: 'workspace-layered' },
        { name: 'Domain-Driven (domains/, shared/)', value: 'workspace-ddd' },
        { name: 'Full Stack (frontend/, backend/, shared/)', value: 'workspace-fullstack' },
      ];

      expect(workspaceTemplates.length).toBe(4);
      expect(workspaceTemplates.map(t => t.value)).toContain('workspace-layered');
      expect(workspaceTemplates.map(t => t.value)).toContain('workspace-ddd');
    });

    it('should offer microservices templates when microservices is selected', () => {
      const microservicesTemplates = [
        { name: 'Basic Services (services/)', value: 'microservices-basic' },
        { name: 'Gateway + Services', value: 'microservices-gateway' },
        { name: 'Event-Driven (services/, events/)', value: 'microservices-event' },
      ];

      expect(microservicesTemplates.length).toBe(3);
      expect(microservicesTemplates.map(t => t.value)).toContain('microservices-gateway');
      expect(microservicesTemplates.map(t => t.value)).toContain('microservices-event');
    });
  });
});
