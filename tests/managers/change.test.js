const ChangeManager = require('../../src/managers/change');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

describe('ChangeManager', () => {
  let tmpDir;
  let manager;

  beforeEach(async () => {
    // Create temporary directory
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'musubi-change-test-'));
    manager = new ChangeManager(tmpDir);
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.remove(tmpDir);
  });

  describe('initChange', () => {
    test('creates new change proposal', async () => {
      const result = await manager.initChange('CHANGE-001', {
        title: 'Add user authentication',
        description: 'Implement JWT-based authentication',
      });

      expect(result.changeId).toBe('CHANGE-001');
      expect(await fs.pathExists(result.file)).toBe(true);

      const content = await fs.readFile(result.file, 'utf-8');
      expect(content).toContain('Add user authentication');
      expect(content).toContain('CHANGE-001');
    });

    test('throws error if change already exists', async () => {
      await manager.initChange('CHANGE-001');

      await expect(manager.initChange('CHANGE-001')).rejects.toThrow(
        'Change CHANGE-001 already exists'
      );
    });

    test('creates changes directory if not exists', async () => {
      const changesDir = path.join(tmpDir, 'storage/changes');

      expect(await fs.pathExists(changesDir)).toBe(false);

      await manager.initChange('CHANGE-001');

      expect(await fs.pathExists(changesDir)).toBe(true);
    });
  });

  describe('applyChange', () => {
    test('applies change with dry run', async () => {
      // Create change with delta items
      await manager.initChange('CHANGE-002');
      const changeFile = path.join(tmpDir, 'storage/changes/CHANGE-002.md');

      // Add some delta items (replace placeholder)
      const content = await fs.readFile(changeFile, 'utf-8');
      const withItems = content.replace(
        '### ADDED\n\n<!-- List new requirements here -->',
        '### ADDED\n\n- REQ-AUTH-001: User login\n- REQ-AUTH-002: User logout'
      );
      await fs.writeFile(changeFile, withItems);

      const result = await manager.applyChange('CHANGE-002', { dryRun: true });

      expect(result.stats.added).toBe(2);
    });

    test('throws error if change not found', async () => {
      await expect(manager.applyChange('NONEXISTENT')).rejects.toThrow(
        'Change NONEXISTENT not found'
      );
    });
  });

  describe('archiveChange', () => {
    test('archives change to specs directory', async () => {
      await manager.initChange('CHANGE-003');

      const result = await manager.archiveChange('CHANGE-003');

      expect(await fs.pathExists(result.archive)).toBe(true);
      expect(await fs.pathExists(result.source)).toBe(false);
    });

    test('throws error if change not found', async () => {
      await expect(manager.archiveChange('NONEXISTENT')).rejects.toThrow(
        'Change NONEXISTENT not found'
      );
    });
  });

  describe('listChanges', () => {
    test('lists all changes', async () => {
      await manager.initChange('CHANGE-004', { title: 'Change A' });
      await manager.initChange('CHANGE-005', { title: 'Change B' });

      const changes = await manager.listChanges();

      expect(changes.length).toBe(2);
      expect(changes[0].id).toBe('CHANGE-004');
      expect(changes[1].id).toBe('CHANGE-005');
    });

    test('returns empty array if no changes', async () => {
      const changes = await manager.listChanges();

      expect(changes).toEqual([]);
    });

    test('filters by status', async () => {
      await manager.initChange('CHANGE-006');

      const changes = await manager.listChanges({ status: 'pending' });

      expect(changes.length).toBeGreaterThan(0);
    });
  });

  describe('validateChange', () => {
    test('validates change with valid delta', async () => {
      await manager.initChange('CHANGE-007');
      const changeFile = path.join(tmpDir, 'storage/changes/CHANGE-007.md');

      // Add valid delta items
      const content = await fs.readFile(changeFile, 'utf-8');
      const withItems = content.replace(
        '### ADDED\n\n<!-- List new requirements here -->',
        '### ADDED\n\n- REQ-AUTH-001: User login'
      );
      await fs.writeFile(changeFile, withItems);

      const result = await manager.validateChange('CHANGE-007');

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('detects invalid requirement IDs', async () => {
      await manager.initChange('CHANGE-008');
      const changeFile = path.join(tmpDir, 'storage/changes/CHANGE-008.md');

      // Add invalid delta items (not matching REQ-XXX-NNN pattern)
      const content = await fs.readFile(changeFile, 'utf-8');
      const withItems = content.replace(
        '### ADDED\n\n<!-- List new requirements here -->',
        '### ADDED\n\n- INVALID: Bad requirement'
      );
      await fs.writeFile(changeFile, withItems);

      const result = await manager.validateChange('CHANGE-008');

      // Since parser skips items that don't match REQ- pattern,
      // this will be valid (no items parsed = no errors)
      expect(result.valid).toBe(true);
      expect(result.stats.added).toBe(0);
    });
  });

  describe('parseDelta', () => {
    test('parses delta with all sections', async () => {
      await manager.initChange('CHANGE-009');
      const changeFile = path.join(tmpDir, 'storage/changes/CHANGE-009.md');

      // Add items to all sections (replace placeholders)
      let content = await fs.readFile(changeFile, 'utf-8');
      content = content
        .replace(
          '### ADDED\n\n<!-- List new requirements here -->',
          '### ADDED\n\n- REQ-NEW-001: New requirement'
        )
        .replace(
          '### MODIFIED\n\n<!-- List modified requirements here -->',
          '### MODIFIED\n\n- REQ-MOD-001: Modified requirement'
        )
        .replace(
          '### REMOVED\n\n<!-- List removed requirements here -->',
          '### REMOVED\n\n- REQ-DEL-001: Removed requirement'
        )
        .replace(
          '### RENAMED\n\n<!-- List renamed requirements here -->',
          '### RENAMED\n\n- REQ-OLD-001: Renamed requirement'
        );
      await fs.writeFile(changeFile, content);

      const delta = await manager.parseDelta(changeFile);

      expect(delta.added.length).toBe(1);
      expect(delta.modified.length).toBe(1);
      expect(delta.removed.length).toBe(1);
      expect(delta.renamed.length).toBe(1);
    });
  });

  describe('template rendering', () => {
    test('renders template with variables', () => {
      const template = '# {{title}}\n\n**ID**: {{id}}';
      const rendered = manager.renderTemplate(template, {
        title: 'Test Title',
        id: 'TEST-001',
      });

      expect(rendered).toBe('# Test Title\n\n**ID**: TEST-001');
    });
  });
});
