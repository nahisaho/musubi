/**
 * Constitution Level Manager Tests
 *
 * Tests for constitution enforcement levels (critical/advisory/flexible)
 */

const {
  ConstitutionLevelManager,
  EnforcementLevel,
  ArticleId,
  DEFAULT_ARTICLE_LEVELS,
} = require('../src/validators/constitution-level-manager');
const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

describe('ConstitutionLevelManager', () => {
  const testDir = '/tmp/test-constitution-levels';
  let manager;

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    await fs.ensureDir(path.join(testDir, 'steering/rules'));
    manager = new ConstitutionLevelManager(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('getArticleLevel', () => {
    it('should return default levels when no config exists', async () => {
      const level = await manager.getArticleLevel(ArticleId.LIBRARY_FIRST);
      expect(level).toBe('critical');
    });

    it('should return advisory for Article II by default', async () => {
      const level = await manager.getArticleLevel(ArticleId.CLI_INTERFACE);
      expect(level).toBe('advisory');
    });

    it('should return flexible for Article VII by default', async () => {
      const level = await manager.getArticleLevel(ArticleId.DOCUMENTATION);
      expect(level).toBe('flexible');
    });

    it('should respect custom config', async () => {
      const config = {
        schema_version: '1.0',
        levels: {
          critical: {
            enforcement: 'block',
            articles: [
              { id: ArticleId.LIBRARY_FIRST, name: 'Article I' },
              { id: ArticleId.CLI_INTERFACE, name: 'Article II' }, // Changed to critical
            ],
          },
          advisory: {
            enforcement: 'warn',
            articles: [{ id: ArticleId.TEST_FIRST, name: 'Article III' }],
          },
          flexible: {
            enforcement: 'configurable',
            articles: [],
          },
        },
      };
      await fs.writeFile(
        path.join(testDir, 'steering/rules/constitution-levels.yml'),
        yaml.dump(config)
      );

      manager._config = null; // Reset cache
      const level = await manager.getArticleLevel(ArticleId.CLI_INTERFACE);
      expect(level).toBe('critical');
    });
  });

  describe('isBlocking', () => {
    it('should return true for critical articles', async () => {
      const isBlocking = await manager.isBlocking(ArticleId.LIBRARY_FIRST);
      expect(isBlocking).toBe(true);
    });

    it('should return false for advisory articles', async () => {
      const isBlocking = await manager.isBlocking(ArticleId.CLI_INTERFACE);
      expect(isBlocking).toBe(false);
    });

    it('should return false for flexible articles', async () => {
      const isBlocking = await manager.isBlocking(ArticleId.DOCUMENTATION);
      expect(isBlocking).toBe(false);
    });
  });

  describe('getCoverageThreshold', () => {
    it('should return default threshold (80)', async () => {
      const threshold = await manager.getCoverageThreshold();
      expect(threshold).toBe(80);
    });

    it('should respect project overrides', async () => {
      const projectConfig = {
        constitution: {
          overrides: {
            coverage_threshold: 90,
          },
        },
      };
      await fs.writeFile(path.join(testDir, 'steering/project.yml'), yaml.dump(projectConfig));

      manager._projectConfig = null; // Reset cache
      const threshold = await manager.getCoverageThreshold();
      expect(threshold).toBe(90);
    });
  });

  describe('isMockAllowed', () => {
    it('should return false by default', async () => {
      const allowed = await manager.isMockAllowed();
      expect(allowed).toBe(false);
    });

    it('should allow mocks for LLM providers', async () => {
      const config = {
        schema_version: '1.0',
        levels: {},
        configurable: {
          mock_allowed: {
            default: false,
            exceptions: ['llm-providers', 'openai', 'anthropic'],
          },
        },
      };
      await fs.writeFile(
        path.join(testDir, 'steering/rules/constitution-levels.yml'),
        yaml.dump(config)
      );

      manager._config = null;
      const allowed = await manager.isMockAllowed('openai');
      expect(allowed).toBe(true);
    });
  });

  describe('isEarsRequired', () => {
    it('should return true by default', async () => {
      const required = await manager.isEarsRequired();
      expect(required).toBe(true);
    });

    it('should return false for small mode when configured', async () => {
      const config = {
        schema_version: '1.0',
        levels: {},
        configurable: {
          ears_required: {
            default: true,
            per_mode: true,
            mode_defaults: {
              small: false,
            },
          },
        },
      };
      await fs.writeFile(
        path.join(testDir, 'steering/rules/constitution-levels.yml'),
        yaml.dump(config)
      );

      manager._config = null;
      const required = await manager.isEarsRequired({ mode: 'small' });
      expect(required).toBe(false);
    });
  });

  describe('getCriticalArticles', () => {
    it('should return default critical articles', async () => {
      const articles = await manager.getCriticalArticles();
      expect(articles.length).toBe(3);
      expect(articles.map(a => a.id)).toContain(ArticleId.LIBRARY_FIRST);
      expect(articles.map(a => a.id)).toContain(ArticleId.TEST_FIRST);
      expect(articles.map(a => a.id)).toContain(ArticleId.TRACEABILITY);
    });
  });

  describe('validate', () => {
    it('should pass when all critical checks pass', async () => {
      const validation = {
        [ArticleId.LIBRARY_FIRST]: true,
        [ArticleId.TEST_FIRST]: true,
        [ArticleId.TRACEABILITY]: true,
        [ArticleId.CLI_INTERFACE]: true,
      };

      const result = await manager.validate(validation);
      expect(result.passed).toBe(true);
      expect(result.critical.filter(c => c.status === 'passed').length).toBe(3);
    });

    it('should fail when a critical check fails', async () => {
      const validation = {
        [ArticleId.LIBRARY_FIRST]: false,
        [ArticleId.TEST_FIRST]: true,
        [ArticleId.TRACEABILITY]: true,
      };

      const result = await manager.validate(validation);
      expect(result.passed).toBe(false);
      expect(result.critical.filter(c => c.status === 'failed').length).toBe(1);
    });

    it('should pass when only advisory checks fail', async () => {
      const validation = {
        [ArticleId.LIBRARY_FIRST]: true,
        [ArticleId.TEST_FIRST]: true,
        [ArticleId.TRACEABILITY]: true,
        [ArticleId.CLI_INTERFACE]: false,
        [ArticleId.EARS_FORMAT]: false,
      };

      const result = await manager.validate(validation);
      expect(result.passed).toBe(true);
      expect(result.advisory.filter(c => c.status === 'warning').length).toBe(2);
    });
  });

  describe('getSummary', () => {
    it('should return complete summary', async () => {
      const summary = await manager.getSummary();

      expect(summary.critical).toBeDefined();
      expect(summary.advisory).toBeDefined();
      expect(summary.flexible).toBeDefined();
      expect(summary.configurable).toBeDefined();
      expect(summary.configurable.coverage_threshold).toBe(80);
    });
  });
});

describe('EnforcementLevel', () => {
  it('should have correct values', () => {
    expect(EnforcementLevel.BLOCK).toBe('block');
    expect(EnforcementLevel.WARN).toBe('warn');
    expect(EnforcementLevel.CONFIGURE).toBe('configurable');
  });
});

describe('ArticleId', () => {
  it('should have correct article IDs', () => {
    expect(ArticleId.LIBRARY_FIRST).toBe('CONST-001');
    expect(ArticleId.TEST_FIRST).toBe('CONST-003');
    expect(ArticleId.TRACEABILITY).toBe('CONST-005');
    expect(ArticleId.REAL_SERVICE_TESTING).toBe('CONST-009');
  });
});

describe('DEFAULT_ARTICLE_LEVELS', () => {
  it('should define all articles', () => {
    expect(Object.keys(DEFAULT_ARTICLE_LEVELS).length).toBe(9);
    expect(DEFAULT_ARTICLE_LEVELS[ArticleId.LIBRARY_FIRST]).toBe('critical');
    expect(DEFAULT_ARTICLE_LEVELS[ArticleId.REAL_SERVICE_TESTING]).toBe('advisory');
  });
});
