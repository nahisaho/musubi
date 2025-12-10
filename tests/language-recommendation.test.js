/**
 * Language Recommendation Tests
 *
 * Tests for the language recommendation engine in musubi-init.js
 */

const path = require('path');

// Extract recommendLanguages function for testing
// We need to load the module in a way that exposes the internal function
const initScript = require('fs').readFileSync(
  path.join(__dirname, '..', 'bin', 'musubi-init.js'),
  'utf8'
);

// Extract the function using regex (since it's not exported)
const functionMatch = initScript.match(/function recommendLanguages\(requirements\) \{[\s\S]*?^}/m);
let recommendLanguages;

if (functionMatch) {
  // Create the function dynamically
  eval(`recommendLanguages = ${functionMatch[0]}`);
}

describe('Language Recommendation Engine', () => {
  beforeAll(() => {
    expect(recommendLanguages).toBeDefined();
  });

  describe('Application Type Recommendations', () => {
    test('should recommend JavaScript for web frontend', () => {
      const result = recommendLanguages({
        appTypes: ['web-frontend'],
        performanceNeeds: 'moderate',
        teamExpertise: [],
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].value).toBe('javascript');
    });

    test('should recommend Python for ML/AI applications', () => {
      const result = recommendLanguages({
        appTypes: ['ml'],
        performanceNeeds: 'moderate',
        teamExpertise: [],
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].value).toBe('python');
    });

    test('should recommend Rust or Go for CLI tools', () => {
      const result = recommendLanguages({
        appTypes: ['cli'],
        performanceNeeds: 'high',
        teamExpertise: [],
      });

      expect(result.length).toBeGreaterThan(0);
      expect(['rust', 'go']).toContain(result[0].value);
    });

    test('should recommend Rust for embedded/IoT', () => {
      const result = recommendLanguages({
        appTypes: ['embedded'],
        performanceNeeds: 'high',
        teamExpertise: [],
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].value).toBe('rust');
    });

    test('should recommend Python for data pipelines', () => {
      const result = recommendLanguages({
        appTypes: ['data'],
        performanceNeeds: 'moderate',
        teamExpertise: [],
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].value).toBe('python');
    });
  });

  describe('Performance-Based Recommendations', () => {
    test('should boost Rust/Go for high performance needs', () => {
      const result = recommendLanguages({
        appTypes: ['web-backend'],
        performanceNeeds: 'high',
        teamExpertise: [],
      });

      expect(result.length).toBeGreaterThan(0);
      // High performance should favor Rust or Go
      const topLangs = result.slice(0, 2).map(r => r.value);
      expect(topLangs.some(l => ['rust', 'go'].includes(l))).toBe(true);
    });

    test('should boost Python/JS for rapid development', () => {
      const result = recommendLanguages({
        appTypes: ['web-backend'],
        performanceNeeds: 'rapid',
        teamExpertise: [],
      });

      expect(result.length).toBeGreaterThan(0);
      // Rapid development should favor Python or JavaScript
      const topLangs = result.slice(0, 2).map(r => r.value);
      expect(topLangs.some(l => ['python', 'javascript'].includes(l))).toBe(true);
    });
  });

  describe('Team Expertise Influence', () => {
    test('should boost languages team knows', () => {
      const result = recommendLanguages({
        appTypes: ['web-backend'],
        performanceNeeds: 'moderate',
        teamExpertise: ['ruby'],
      });

      expect(result.length).toBeGreaterThan(0);
      // Ruby should be boosted
      const rubyRec = result.find(r => r.value === 'ruby');
      expect(rubyRec).toBeDefined();
    });

    test('should prioritize team expertise with matching app type', () => {
      const result = recommendLanguages({
        appTypes: ['web-frontend'],
        performanceNeeds: 'moderate',
        teamExpertise: ['javascript'],
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].value).toBe('javascript');
      expect(result[0].reason).toContain('Team has expertise');
    });
  });

  describe('Multi-Type Applications', () => {
    test('should handle multiple app types', () => {
      const result = recommendLanguages({
        appTypes: ['web-backend', 'cli'],
        performanceNeeds: 'high',
        teamExpertise: [],
      });

      expect(result.length).toBeGreaterThan(0);
      // Should recommend languages good for both
      expect(['rust', 'go']).toContain(result[0].value);
    });

    test('should handle web frontend + backend combo', () => {
      const result = recommendLanguages({
        appTypes: ['web-frontend', 'web-backend'],
        performanceNeeds: 'moderate',
        teamExpertise: [],
      });

      expect(result.length).toBeGreaterThan(0);
      // JavaScript/TypeScript excels at full-stack
      expect(result[0].value).toBe('javascript');
    });
  });

  describe('Result Structure', () => {
    test('should return max 3 recommendations', () => {
      const result = recommendLanguages({
        appTypes: ['web-backend'],
        performanceNeeds: 'moderate',
        teamExpertise: ['python', 'javascript', 'go', 'rust'],
      });

      expect(result.length).toBeLessThanOrEqual(3);
    });

    test('should include required fields', () => {
      const result = recommendLanguages({
        appTypes: ['web-backend'],
        performanceNeeds: 'moderate',
        teamExpertise: [],
      });

      expect(result.length).toBeGreaterThan(0);
      const rec = result[0];
      expect(rec).toHaveProperty('value');
      expect(rec).toHaveProperty('name');
      expect(rec).toHaveProperty('emoji');
      expect(rec).toHaveProperty('reason');
      expect(rec).toHaveProperty('score');
    });

    test('should sort by score descending', () => {
      const result = recommendLanguages({
        appTypes: ['web-backend'],
        performanceNeeds: 'moderate',
        teamExpertise: [],
      });

      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty inputs', () => {
      const result = recommendLanguages({
        appTypes: [],
        performanceNeeds: undefined,
        teamExpertise: [],
      });

      expect(result).toEqual([]);
    });

    test('should handle undefined inputs', () => {
      const result = recommendLanguages({});

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
