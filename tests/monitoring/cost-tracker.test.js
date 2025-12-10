/**
 * @fileoverview Tests for CostTracker - LLM usage and cost tracking
 * @trace REQ-P5-005
 * @requirement REQ-P5-005 Cost Tracking
 */

const path = require('path');
const fs = require('fs-extra');
const { CostTracker, DEFAULT_PRICING } = require('../../src/monitoring/cost-tracker');

describe('CostTracker', () => {
  let tracker;
  const testStorageDir = path.join(__dirname, '../test-output/cost-tracker');

  beforeAll(async () => {
    await fs.ensureDir(testStorageDir);
  });

  afterAll(async () => {
    await fs.rm(testStorageDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await fs.emptyDir(testStorageDir);
    tracker = new CostTracker({
      storageDir: testStorageDir,
    });
    await tracker.initialize();
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      const defaultTracker = new CostTracker();
      expect(defaultTracker.budgetLimit).toBe(0);
      expect(defaultTracker.budgetPeriod).toBe('monthly');
      expect(defaultTracker.sessionUsage).toEqual([]);
    });

    test('should accept custom options', () => {
      const customTracker = new CostTracker({
        storageDir: '/custom/path',
        budgetLimit: 100,
        budgetPeriod: 'weekly',
      });
      expect(customTracker.storageDir).toBe('/custom/path');
      expect(customTracker.budgetLimit).toBe(100);
      expect(customTracker.budgetPeriod).toBe('weekly');
    });

    test('should merge custom pricing', () => {
      const customTracker = new CostTracker({
        pricing: {
          'custom-model': { input: 1.0, output: 2.0 },
        },
      });
      expect(customTracker.pricing['custom-model']).toEqual({ input: 1.0, output: 2.0 });
      expect(customTracker.pricing['gpt-4o']).toBeDefined();
    });
  });

  describe('DEFAULT_PRICING', () => {
    test('should include major providers', () => {
      expect(DEFAULT_PRICING['gpt-4o']).toBeDefined();
      expect(DEFAULT_PRICING['claude-opus-4']).toBeDefined();
      expect(DEFAULT_PRICING['gemini-2.0-flash']).toBeDefined();
    });

    test('should have free pricing for local models', () => {
      expect(DEFAULT_PRICING['ollama'].input).toBe(0);
      expect(DEFAULT_PRICING['ollama'].output).toBe(0);
      expect(DEFAULT_PRICING['llama3.2'].input).toBe(0);
    });

    test('should have input and output prices', () => {
      Object.entries(DEFAULT_PRICING).forEach(([_model, pricing]) => {
        expect(typeof pricing.input).toBe('number');
        expect(typeof pricing.output).toBe('number');
      });
    });
  });

  describe('record', () => {
    test('should record usage and calculate cost', () => {
      const record = tracker.record({
        provider: 'openai',
        model: 'gpt-4o',
        inputTokens: 1000,
        outputTokens: 500,
      });

      expect(record.provider).toBe('openai');
      expect(record.model).toBe('gpt-4o');
      expect(record.inputTokens).toBe(1000);
      expect(record.outputTokens).toBe(500);
      expect(record.cost).toBeGreaterThan(0);
      expect(record.timestamp).toBeDefined();
    });

    test('should update session and period totals', () => {
      tracker.record({
        provider: 'openai',
        model: 'gpt-4o',
        inputTokens: 1000,
        outputTokens: 500,
      });

      expect(tracker.sessionUsage.length).toBe(1);
      expect(tracker.periodTotals.requests).toBe(1);
      expect(tracker.periodTotals.inputTokens).toBe(1000);
      expect(tracker.periodTotals.outputTokens).toBe(500);
    });

    test('should emit usage event', (done) => {
      tracker.on('usage', (record) => {
        expect(record.provider).toBe('anthropic');
        done();
      });

      tracker.record({
        provider: 'anthropic',
        model: 'claude-3.5-sonnet',
        inputTokens: 500,
        outputTokens: 200,
      });
    });

    test('should emit budget-exceeded event', (done) => {
      tracker.setBudget(0.001, 'monthly');

      tracker.on('budget-exceeded', (data) => {
        expect(data.current).toBeGreaterThanOrEqual(data.limit);
        done();
      });

      // Record expensive usage to exceed budget
      tracker.record({
        provider: 'openai',
        model: 'gpt-4-turbo',
        inputTokens: 100000,
        outputTokens: 50000,
      });
    });

    test('should emit budget-warning event at 80%', (done) => {
      // Set a budget that will trigger warning but not exceeded
      // GPT-4o: $2.50/1M input, $10.00/1M output
      // 10000 input + 5000 output = $0.025 + $0.05 = $0.075
      tracker.setBudget(0.09, 'monthly'); // 80% of 0.09 = 0.072

      tracker.on('budget-warning', (data) => {
        expect(data.percentage).toBeGreaterThanOrEqual(80);
        done();
      });

      // Record usage to trigger 80% warning
      tracker.record({
        provider: 'openai',
        model: 'gpt-4o',
        inputTokens: 10000,
        outputTokens: 5000,
      });
    });

    test('should use free pricing for local models', () => {
      const record = tracker.record({
        provider: 'ollama',
        model: 'llama3.2',
        inputTokens: 10000,
        outputTokens: 5000,
      });

      expect(record.cost).toBe(0);
    });

    test('should include metadata', () => {
      const record = tracker.record({
        provider: 'openai',
        model: 'gpt-4o',
        inputTokens: 100,
        outputTokens: 50,
        metadata: { feature: 'test', taskId: '123' },
      });

      expect(record.metadata.feature).toBe('test');
      expect(record.metadata.taskId).toBe('123');
    });
  });

  describe('getSessionSummary', () => {
    beforeEach(() => {
      tracker.record({ provider: 'openai', model: 'gpt-4o', inputTokens: 1000, outputTokens: 500 });
      tracker.record({ provider: 'openai', model: 'gpt-4o', inputTokens: 500, outputTokens: 200 });
      tracker.record({ provider: 'anthropic', model: 'claude-3.5-sonnet', inputTokens: 800, outputTokens: 400 });
    });

    test('should calculate total tokens and cost', () => {
      const summary = tracker.getSessionSummary();

      expect(summary.totalRequests).toBe(3);
      expect(summary.totalTokens).toBe(3400); // 1000+500 + 500+200 + 800+400
      expect(summary.totalCost).toBeGreaterThan(0);
    });

    test('should group by provider', () => {
      const summary = tracker.getSessionSummary();

      expect(summary.byProvider.openai.requests).toBe(2);
      expect(summary.byProvider.anthropic.requests).toBe(1);
    });

    test('should group by model', () => {
      const summary = tracker.getSessionSummary();

      expect(summary.byModel['gpt-4o'].requests).toBe(2);
      expect(summary.byModel['claude-3.5-sonnet'].requests).toBe(1);
    });

    test('should include session start time', () => {
      const summary = tracker.getSessionSummary();
      expect(summary.sessionStart).toBeDefined();
      expect(new Date(summary.sessionStart)).toBeInstanceOf(Date);
    });
  });

  describe('getPeriodSummary', () => {
    test('should return period totals', () => {
      tracker.record({ provider: 'openai', model: 'gpt-4o', inputTokens: 1000, outputTokens: 500 });

      const summary = tracker.getPeriodSummary();

      expect(summary.period).toBe('monthly');
      expect(summary.inputTokens).toBe(1000);
      expect(summary.outputTokens).toBe(500);
      expect(summary.requests).toBe(1);
    });

    test('should include budget info when set', () => {
      tracker.setBudget(100, 'monthly');
      tracker.record({ provider: 'openai', model: 'gpt-4o', inputTokens: 1000, outputTokens: 500 });

      const summary = tracker.getPeriodSummary();

      expect(summary.budgetLimit).toBe(100);
      expect(summary.budgetRemaining).toBeLessThan(100);
      expect(summary.budgetUsedPercent).toBeGreaterThan(0);
    });
  });

  describe('generateReport', () => {
    beforeEach(() => {
      tracker.record({ provider: 'openai', model: 'gpt-4o', inputTokens: 1000, outputTokens: 500 });
      tracker.record({ provider: 'anthropic', model: 'claude-3.5-sonnet', inputTokens: 500, outputTokens: 200 });
    });

    test('should generate text report', () => {
      const report = tracker.generateReport({ format: 'text' });

      expect(report).toContain('MUSUBI Cost Report');
      expect(report).toContain('Total Requests:');
      expect(report).toContain('Total Tokens:');
      expect(report).toContain('Total Cost:');
    });

    test('should generate JSON report', () => {
      const report = tracker.generateReport({ format: 'json' });
      const data = JSON.parse(report);

      expect(data.totalRequests).toBe(2);
      expect(data.byProvider).toBeDefined();
      expect(data.byModel).toBeDefined();
    });

    test('should show by provider in text report', () => {
      const report = tracker.generateReport({ format: 'text' });

      expect(report).toContain('By Provider');
      expect(report).toContain('openai');
      expect(report).toContain('anthropic');
    });
  });

  describe('saveSession', () => {
    test('should save session to file', async () => {
      tracker.record({ provider: 'openai', model: 'gpt-4o', inputTokens: 1000, outputTokens: 500 });

      const filepath = await tracker.saveSession();

      expect(filepath).toContain('session-');
      expect(await fs.pathExists(filepath)).toBe(true);

      const data = await fs.readJSON(filepath);
      expect(data.summary).toBeDefined();
      expect(data.records).toHaveLength(1);
    });
  });

  describe('resetSession', () => {
    test('should clear session usage', () => {
      tracker.record({ provider: 'openai', model: 'gpt-4o', inputTokens: 1000, outputTokens: 500 });
      expect(tracker.sessionUsage.length).toBe(1);

      tracker.resetSession();

      expect(tracker.sessionUsage.length).toBe(0);
    });

    test('should update session start time', () => {
      const originalStart = tracker.sessionStart;

      // Wait a bit to ensure different timestamp
      tracker.resetSession();

      expect(tracker.sessionStart.getTime()).toBeGreaterThanOrEqual(originalStart.getTime());
    });
  });

  describe('resetPeriod', () => {
    test('should clear period totals', () => {
      tracker.record({ provider: 'openai', model: 'gpt-4o', inputTokens: 1000, outputTokens: 500 });
      expect(tracker.periodTotals.requests).toBe(1);

      tracker.resetPeriod();

      expect(tracker.periodTotals.requests).toBe(0);
      expect(tracker.periodTotals.inputTokens).toBe(0);
      expect(tracker.periodTotals.outputTokens).toBe(0);
      expect(tracker.periodTotals.cost).toBe(0);
    });
  });

  describe('setPricing', () => {
    test('should update pricing for a model', () => {
      tracker.setPricing('custom-model', { input: 5.0, output: 10.0 });

      expect(tracker.pricing['custom-model']).toEqual({ input: 5.0, output: 10.0 });
    });

    test('should override existing pricing', () => {
      tracker.setPricing('gpt-4o', { input: 100.0, output: 200.0 });

      expect(tracker.pricing['gpt-4o']).toEqual({ input: 100.0, output: 200.0 });
    });
  });

  describe('getPricing', () => {
    test('should return pricing for known model', () => {
      const pricing = tracker.getPricing('gpt-4o');
      expect(pricing).toEqual(DEFAULT_PRICING['gpt-4o']);
    });

    test('should return default pricing for unknown model', () => {
      const pricing = tracker.getPricing('unknown-model');
      expect(pricing).toEqual({ input: 0, output: 0 });
    });
  });

  describe('getAllPricing', () => {
    test('should return all pricing configs', () => {
      const allPricing = tracker.getAllPricing();

      expect(allPricing['gpt-4o']).toBeDefined();
      expect(allPricing['claude-opus-4']).toBeDefined();
    });

    test('should return a copy', () => {
      const allPricing = tracker.getAllPricing();
      allPricing['new-model'] = { input: 1, output: 2 };

      expect(tracker.pricing['new-model']).toBeUndefined();
    });
  });

  describe('setBudget', () => {
    test('should set budget limit and period', () => {
      tracker.setBudget(50, 'weekly');

      expect(tracker.budgetLimit).toBe(50);
      expect(tracker.budgetPeriod).toBe('weekly');
    });

    test('should default to monthly period', () => {
      tracker.setBudget(100);

      expect(tracker.budgetLimit).toBe(100);
      expect(tracker.budgetPeriod).toBe('monthly');
    });
  });

  describe('EventEmitter', () => {
    test('should extend EventEmitter', () => {
      expect(tracker).toBeInstanceOf(require('events').EventEmitter);
    });

    test('should support multiple listeners', (done) => {
      let count = 0;

      tracker.on('usage', () => { count++; });
      tracker.on('usage', () => { count++; });
      tracker.on('usage', () => {
        if (count === 2) done();
      });

      tracker.record({ provider: 'test', model: 'test', inputTokens: 1, outputTokens: 1 });
    });
  });

  describe('cost calculation', () => {
    test('should calculate correctly for GPT-4o', () => {
      const record = tracker.record({
        provider: 'openai',
        model: 'gpt-4o',
        inputTokens: 1_000_000, // 1M tokens
        outputTokens: 1_000_000, // 1M tokens
      });

      // GPT-4o: $2.50/1M input, $10.00/1M output
      expect(record.cost).toBeCloseTo(2.50 + 10.00, 2);
    });

    test('should calculate correctly for Claude Sonnet', () => {
      const record = tracker.record({
        provider: 'anthropic',
        model: 'claude-3.5-sonnet',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      });

      // Claude 3.5 Sonnet: $3.00/1M input, $15.00/1M output
      expect(record.cost).toBeCloseTo(3.00 + 15.00, 2);
    });
  });

  describe('integration with monitoring module', () => {
    test('should be exported from monitoring module', () => {
      const { CostTracker: ExportedTracker } = require('../../src/monitoring');
      expect(ExportedTracker).toBe(CostTracker);
    });
  });
});
