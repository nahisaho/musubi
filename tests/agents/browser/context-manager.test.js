/**
 * @fileoverview Tests for Context Manager
 * @module tests/agents/browser/context-manager.test.js
 */

const ContextManager = require('../../../src/agents/browser/context-manager');

describe('ContextManager', () => {
  let manager;

  beforeEach(() => {
    manager = new ContextManager();
  });

  describe('constructor', () => {
    test('should initialize with default values', () => {
      expect(manager.browser).toBeNull();
      expect(manager.contexts.size).toBe(0);
      expect(manager.pages.size).toBe(0);
      expect(manager.activeContextName).toBe('default');
      expect(manager.actionHistory).toEqual([]);
    });
  });

  describe('recordAction', () => {
    test('should record action to history', () => {
      const action = { type: 'navigate', url: 'https://example.com' };
      const result = { success: true };

      manager.recordAction(action, result);

      expect(manager.actionHistory).toHaveLength(1);
      expect(manager.actionHistory[0].action).toBe(action);
      expect(manager.actionHistory[0].result).toBe(result);
      expect(manager.actionHistory[0].timestamp).toBeDefined();
      expect(manager.actionHistory[0].context).toBe('default');
    });

    test('should record multiple actions', () => {
      manager.recordAction({ type: 'navigate' }, { success: true });
      manager.recordAction({ type: 'click' }, { success: true });
      manager.recordAction({ type: 'fill' }, { success: true });

      expect(manager.actionHistory).toHaveLength(3);
    });
  });

  describe('getActionHistory', () => {
    test('should return a copy of action history', () => {
      manager.recordAction({ type: 'navigate' }, { success: true });
      
      const history = manager.getActionHistory();
      history.push({ extra: 'item' });

      expect(manager.actionHistory).toHaveLength(1);
    });
  });

  describe('clearHistory', () => {
    test('should clear action history', () => {
      manager.recordAction({ type: 'navigate' }, { success: true });
      manager.recordAction({ type: 'click' }, { success: true });
      
      manager.clearHistory();

      expect(manager.actionHistory).toHaveLength(0);
    });
  });

  describe('setActiveContext', () => {
    test('should throw error for non-existent context', () => {
      expect(() => {
        manager.setActiveContext('nonexistent');
      }).toThrow('Context "nonexistent" does not exist');
    });
  });

  describe('getActiveContextName', () => {
    test('should return default context name', () => {
      expect(manager.getActiveContextName()).toBe('default');
    });
  });

  describe('reset', () => {
    test('should reset all state', () => {
      manager.recordAction({ type: 'navigate' }, { success: true });
      
      manager.reset();

      expect(manager.browser).toBeNull();
      expect(manager.contexts.size).toBe(0);
      expect(manager.pages.size).toBe(0);
      expect(manager.activeContextName).toBe('default');
      expect(manager.actionHistory).toHaveLength(0);
    });
  });

  describe('getContextNames', () => {
    test('should return empty array when no contexts', () => {
      expect(manager.getContextNames()).toEqual([]);
    });
  });

  describe('getPageNames', () => {
    test('should return empty array when no pages', () => {
      expect(manager.getPageNames()).toEqual([]);
    });
  });
});
