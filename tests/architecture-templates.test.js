/**
 * Reference Architecture Template Tests
 *
 * Tests for architecture templates (clean-architecture, hexagonal, event-driven)
 */

const path = require('path');
const fs = require('fs-extra');
const os = require('os');

describe('Reference Architecture Templates', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `musubi-arch-test-${Date.now()}`);
    await fs.ensureDir(tempDir);
  });

  afterEach(async () => {
    if (tempDir && (await fs.pathExists(tempDir))) {
      await fs.remove(tempDir);
    }
  });

  describe('Template Files', () => {
    const templatesDir = path.join(__dirname, '..', 'src', 'templates', 'architectures');

    it('should have architectures README', async () => {
      const readmePath = path.join(templatesDir, 'README.md');
      expect(await fs.pathExists(readmePath)).toBe(true);
    });

    it('should have clean-architecture template', async () => {
      const templatePath = path.join(templatesDir, 'clean-architecture', 'README.md');
      expect(await fs.pathExists(templatePath)).toBe(true);
    });

    it('should have hexagonal template', async () => {
      const templatePath = path.join(templatesDir, 'hexagonal', 'README.md');
      expect(await fs.pathExists(templatePath)).toBe(true);
    });

    it('should have event-driven template', async () => {
      const templatePath = path.join(templatesDir, 'event-driven', 'README.md');
      expect(await fs.pathExists(templatePath)).toBe(true);
    });
  });

  describe('Clean Architecture Structure', () => {
    const expectedDirs = [
      'src/domain/entities/',
      'src/domain/value-objects/',
      'src/application/use-cases/',
      'src/application/ports/input/',
      'src/application/ports/output/',
      'src/infrastructure/persistence/repositories/',
      'src/interface/controllers/',
    ];

    expectedDirs.forEach(dir => {
      it(`should define ${dir}`, () => {
        expect(dir).toMatch(/^src\/(domain|application|infrastructure|interface)\//);
      });
    });

    it('should have four main layers', () => {
      const layers = ['domain', 'application', 'infrastructure', 'interface'];
      layers.forEach(layer => {
        const hasLayer = expectedDirs.some(d => d.includes(`/${layer}/`));
        expect(hasLayer).toBe(true);
      });
    });
  });

  describe('Hexagonal Architecture Structure', () => {
    const expectedDirs = [
      'src/core/domain/models/',
      'src/core/ports/inbound/',
      'src/core/ports/outbound/',
      'src/adapters/inbound/http/',
      'src/adapters/outbound/persistence/',
    ];

    it('should separate core from adapters', () => {
      const coreDirs = expectedDirs.filter(d => d.includes('/core/'));
      const adapterDirs = expectedDirs.filter(d => d.includes('/adapters/'));
      expect(coreDirs.length).toBeGreaterThan(0);
      expect(adapterDirs.length).toBeGreaterThan(0);
    });

    it('should have inbound and outbound ports', () => {
      expect(expectedDirs.some(d => d.includes('ports/inbound/'))).toBe(true);
      expect(expectedDirs.some(d => d.includes('ports/outbound/'))).toBe(true);
    });

    it('should have inbound and outbound adapters', () => {
      expect(expectedDirs.some(d => d.includes('adapters/inbound/'))).toBe(true);
      expect(expectedDirs.some(d => d.includes('adapters/outbound/'))).toBe(true);
    });
  });

  describe('Event-Driven Architecture Structure', () => {
    const expectedDirs = [
      'src/domain/events/',
      'src/domain/aggregates/',
      'src/domain/commands/',
      'src/application/command-handlers/',
      'src/application/event-handlers/',
      'src/application/sagas/',
      'src/infrastructure/messaging/',
      'src/infrastructure/event-store/',
    ];

    it('should have events directory', () => {
      expect(expectedDirs.some(d => d.includes('/events/'))).toBe(true);
    });

    it('should have command and event handlers', () => {
      expect(expectedDirs.some(d => d.includes('command-handlers/'))).toBe(true);
      expect(expectedDirs.some(d => d.includes('event-handlers/'))).toBe(true);
    });

    it('should have messaging infrastructure', () => {
      expect(expectedDirs.some(d => d.includes('/messaging/'))).toBe(true);
    });

    it('should have sagas for process coordination', () => {
      expect(expectedDirs.some(d => d.includes('/sagas/'))).toBe(true);
    });
  });

  describe('Template README Content', () => {
    const templatesDir = path.join(__dirname, '..', 'src', 'templates', 'architectures');

    it('should document clean architecture layers', async () => {
      const content = await fs.readFile(
        path.join(templatesDir, 'clean-architecture', 'README.md'),
        'utf8'
      );
      expect(content).toContain('Domain');
      expect(content).toContain('Application');
      expect(content).toContain('Infrastructure');
      expect(content).toContain('Interface');
    });

    it('should document hexagonal ports and adapters', async () => {
      const content = await fs.readFile(path.join(templatesDir, 'hexagonal', 'README.md'), 'utf8');
      expect(content).toContain('Ports');
      expect(content).toContain('Adapters');
      expect(content).toContain('Inbound');
      expect(content).toContain('Outbound');
    });

    it('should document event-driven patterns', async () => {
      const content = await fs.readFile(
        path.join(templatesDir, 'event-driven', 'README.md'),
        'utf8'
      );
      expect(content).toContain('Event');
      expect(content).toContain('Command');
      expect(content).toContain('Saga');
    });
  });

  describe('Language-Specific Entry Files', () => {
    it('should generate TypeScript entry file', async () => {
      const entryFile = `// my-project - clean-architecture
// Entry point for the application

export function main(): void {
  console.log('Hello from my-project!');
}

main();
`;
      const filePath = path.join(tempDir, 'src', 'index.ts');
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, entryFile);

      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toContain('export function main');
    });

    it('should generate Rust entry file', async () => {
      const mainRs = `fn main() {
    println!("Hello from my-project!");
}
`;
      const filePath = path.join(tempDir, 'src', 'main.rs');
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, mainRs);

      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toContain('fn main()');
    });

    it('should generate Python entry file', async () => {
      const mainPy = `def main() -> None:
    print("Hello from my-project!")


if __name__ == "__main__":
    main()
`;
      const filePath = path.join(tempDir, 'src', 'my_project', '__main__.py');
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, mainPy);

      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toContain('def main()');
    });
  });
});
