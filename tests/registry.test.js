/**
 * Unit Tests for Agent Registry
 *
 * Tests for src/agents/registry.js:
 * - getAgentDefinition()
 * - detectAgentFromFlags()
 * - getAgentList()
 * - getAllAliasFlags()
 */

const {
  agentDefinitions,
  getAgentDefinition,
  detectAgentFromFlags,
  getAgentList,
  getAllAliasFlags,
} = require('../src/agents/registry');

describe('Agent Registry', () => {
  describe('getAgentDefinition()', () => {
    it('should return Claude Code definition', () => {
      const agent = getAgentDefinition('claude-code');
      expect(agent.label).toBe('Claude Code');
      expect(agent.features.hasSkills).toBe(true);
      expect(agent.layout.skillsDir).toBe('.claude/skills');
    });

    it('should return GitHub Copilot definition', () => {
      const agent = getAgentDefinition('github-copilot');
      expect(agent.label).toBe('GitHub Copilot');
      expect(agent.features.hasSkills).toBe(true);
      expect(agent.layout.commandsDir).toBe('.github/prompts');
      expect(agent.layout.agentsFile).toBe('.github/AGENTS.md');
    });

    it('should return Cursor definition', () => {
      const agent = getAgentDefinition('cursor');
      expect(agent.label).toBe('Cursor IDE');
      expect(agent.layout.commandsDir).toBe('.cursor/commands');
    });

    it('should return Gemini CLI definition', () => {
      const agent = getAgentDefinition('gemini-cli');
      expect(agent.label).toBe('Gemini CLI');
      expect(agent.features.commandFormat).toBe('toml');
    });

    it('should return Codex definition', () => {
      const agent = getAgentDefinition('codex');
      expect(agent.label).toBe('Codex CLI');
      expect(agent.features.commandPrefix).toBe('/prompts:');
    });

    it('should return Qwen Code definition', () => {
      const agent = getAgentDefinition('qwen-code');
      expect(agent.label).toBe('Qwen Code');
    });

    it('should return Windsurf definition', () => {
      const agent = getAgentDefinition('windsurf');
      expect(agent.label).toBe('Windsurf IDE');
      expect(agent.layout.commandsDir).toBe('.windsurf/workflows');
    });

    it('should throw error for unknown agent', () => {
      expect(() => getAgentDefinition('unknown')).toThrow('Unknown agent: unknown');
    });
  });

  describe('detectAgentFromFlags()', () => {
    it('should detect Claude Code from --claude flag', () => {
      const agentKey = detectAgentFromFlags({ claude: true });
      expect(agentKey).toBe('claude-code');
    });

    it('should detect Claude Code from --claude-code flag', () => {
      const agentKey = detectAgentFromFlags({ claudeCode: true });
      expect(agentKey).toBe('claude-code');
    });

    it('should detect GitHub Copilot from --copilot flag', () => {
      const agentKey = detectAgentFromFlags({ copilot: true });
      expect(agentKey).toBe('github-copilot');
    });

    it('should detect GitHub Copilot from --github-copilot flag', () => {
      const agentKey = detectAgentFromFlags({ githubCopilot: true });
      expect(agentKey).toBe('github-copilot');
    });

    it('should detect Cursor from --cursor flag', () => {
      const agentKey = detectAgentFromFlags({ cursor: true });
      expect(agentKey).toBe('cursor');
    });

    it('should detect Gemini CLI from --gemini flag', () => {
      const agentKey = detectAgentFromFlags({ gemini: true });
      expect(agentKey).toBe('gemini-cli');
    });

    it('should detect Gemini CLI from --gemini-cli flag', () => {
      const agentKey = detectAgentFromFlags({ geminiCli: true });
      expect(agentKey).toBe('gemini-cli');
    });

    it('should detect Codex from --codex flag', () => {
      const agentKey = detectAgentFromFlags({ codex: true });
      expect(agentKey).toBe('codex');
    });

    it('should detect Codex from --codex-cli flag', () => {
      const agentKey = detectAgentFromFlags({ codexCli: true });
      expect(agentKey).toBe('codex');
    });

    it('should detect Qwen Code from --qwen flag', () => {
      const agentKey = detectAgentFromFlags({ qwen: true });
      expect(agentKey).toBe('qwen-code');
    });

    it('should detect Qwen Code from --qwen-code flag', () => {
      const agentKey = detectAgentFromFlags({ qwenCode: true });
      expect(agentKey).toBe('qwen-code');
    });

    it('should detect Windsurf from --windsurf flag', () => {
      const agentKey = detectAgentFromFlags({ windsurf: true });
      expect(agentKey).toBe('windsurf');
    });

    it('should default to Claude Code when no flags', () => {
      const agentKey = detectAgentFromFlags({});
      expect(agentKey).toBe('claude-code');
    });

    it('should prioritize first matching flag', () => {
      const agentKey = detectAgentFromFlags({ cursor: true, copilot: true });
      // Should return whichever is checked first in the iteration
      expect(['claude-code', 'cursor', 'github-copilot']).toContain(agentKey);
    });
  });

  describe('getAgentList()', () => {
    it('should return array of 7 agent keys', () => {
      const agents = getAgentList();
      expect(agents).toHaveLength(7);
    });

    it('should include all expected agents', () => {
      const agents = getAgentList();
      expect(agents).toContain('claude-code');
      expect(agents).toContain('github-copilot');
      expect(agents).toContain('cursor');
      expect(agents).toContain('gemini-cli');
      expect(agents).toContain('codex');
      expect(agents).toContain('qwen-code');
      expect(agents).toContain('windsurf');
    });
  });

  describe('getAllAliasFlags()', () => {
    it('should return array of flags', () => {
      const flags = getAllAliasFlags();
      expect(Array.isArray(flags)).toBe(true);
      expect(flags.length).toBeGreaterThan(0);
    });

    it('should include Claude Code aliases', () => {
      const flags = getAllAliasFlags();
      expect(flags).toContain('claude-code');
      expect(flags).toContain('claude');
    });

    it('should include GitHub Copilot aliases', () => {
      const flags = getAllAliasFlags();
      expect(flags).toContain('copilot');
      expect(flags).toContain('github-copilot');
    });

    it('should include all agent aliases', () => {
      const flags = getAllAliasFlags();
      expect(flags).toContain('cursor');
      expect(flags).toContain('gemini');
      expect(flags).toContain('gemini-cli');
      expect(flags).toContain('codex');
      expect(flags).toContain('codex-cli');
      expect(flags).toContain('qwen');
      expect(flags).toContain('qwen-code');
      expect(flags).toContain('windsurf');
    });

    it('should not include -- prefix', () => {
      const flags = getAllAliasFlags();
      flags.forEach(flag => {
        expect(flag.startsWith('--')).toBe(false);
      });
    });

    it('should not have duplicates', () => {
      const flags = getAllAliasFlags();
      const uniqueFlags = [...new Set(flags)];
      expect(flags.length).toBe(uniqueFlags.length);
    });
  });

  describe('Agent Definitions Structure', () => {
    it('should have all 7 agents defined', () => {
      expect(Object.keys(agentDefinitions)).toHaveLength(7);
    });

    it('all agents should have required properties', () => {
      Object.entries(agentDefinitions).forEach(([_key, agent]) => {
        expect(agent).toHaveProperty('label');
        expect(agent).toHaveProperty('description');
        expect(agent).toHaveProperty('aliasFlags');
        expect(agent).toHaveProperty('recommendedModels');
        expect(agent).toHaveProperty('layout');
        expect(agent).toHaveProperty('commands');
        expect(agent).toHaveProperty('features');
      });
    });

    it('all agents should have steering command', () => {
      Object.values(agentDefinitions).forEach(agent => {
        expect(agent.commands).toHaveProperty('steering');
        expect(agent.commands).toHaveProperty('requirements');
        expect(agent.commands).toHaveProperty('design');
        expect(agent.commands).toHaveProperty('tasks');
        expect(agent.commands).toHaveProperty('implement');
        expect(agent.commands).toHaveProperty('validate');
      });
    });

    it('all platforms should have skills (AGENTS.md)', () => {
      expect(agentDefinitions['claude-code'].features.hasSkills).toBe(true);
      expect(agentDefinitions['github-copilot'].features.hasSkills).toBe(true);
      expect(agentDefinitions['cursor'].features.hasSkills).toBe(true);
      expect(agentDefinitions['gemini-cli'].features.hasSkills).toBe(true);
      expect(agentDefinitions['codex'].features.hasSkills).toBe(true);
      expect(agentDefinitions['qwen-code'].features.hasSkills).toBe(true);
      expect(agentDefinitions['windsurf'].features.hasSkills).toBe(true);
    });

    it('only Gemini should have TOML format', () => {
      expect(agentDefinitions['gemini-cli'].features.commandFormat).toBe('toml');
      expect(agentDefinitions['claude-code'].features.commandFormat).toBeUndefined();
      expect(agentDefinitions['cursor'].features.commandFormat).toBeUndefined();
    });
  });
});
