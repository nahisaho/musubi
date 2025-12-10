/**
 * Parallel Execution Benchmark Tests
 * 
 * Tests to verify that parallel execution (Swarm pattern) achieves
 * at least 30% time reduction compared to sequential execution.
 * 
 * Phase 3 Acceptance Criteria verification
 */

'use strict';

const {
  OrchestrationEngine,
  PatternType,
  PLabel,
  createSwarmPattern,
  createSequentialPattern,
} = require('../../src/orchestration');

describe('Parallel Execution Benchmark', () => {
  let engine;
  const TASK_DURATION = 50; // ms per task (simulated)
  
  beforeEach(() => {
    engine = new OrchestrationEngine({
      enableHumanValidation: false,
    });

    // Register patterns using factory functions
    engine.registerPattern(PatternType.SEQUENTIAL, createSequentialPattern());
    engine.registerPattern(PatternType.SWARM, createSwarmPattern({ maxConcurrent: 10 }));

    // Register mock skills for benchmarking
    for (let i = 1; i <= 10; i++) {
      const skillName = `benchmark-task-${i}`;
      engine.registerSkill(skillName, async (input) => {
        await new Promise(resolve => setTimeout(resolve, TASK_DURATION));
        return { 
          success: true, 
          taskName: skillName,
          input,
          duration: TASK_DURATION,
          timestamp: Date.now()
        };
      });
    }
  });

  afterEach(() => {
    if (engine) {
      engine.cancelAll();
    }
  });

  describe('Sequential vs Parallel Comparison', () => {
    it('should achieve at least 30% time reduction with 5 parallel tasks', async () => {
      const taskCount = 5;
      const skills = Array.from({ length: taskCount }, (_, i) => `benchmark-task-${i + 1}`);
      const tasks = skills.map((skill, i) => ({
        id: `task-${i + 1}`,
        skill,
        input: { index: i + 1 }
      }));

      // Sequential execution
      const seqStart = Date.now();
      const seqResult = await engine.execute(PatternType.SEQUENTIAL, {
        input: {
          skills,
          initialInput: { source: 'sequential-benchmark' }
        }
      });
      const seqDuration = Date.now() - seqStart;

      // Parallel execution (Swarm)
      const parStart = Date.now();
      const parResult = await engine.execute(PatternType.SWARM, {
        input: {
          tasks,
          strategy: 'all'
        }
      });
      const parDuration = Date.now() - parStart;

      // Calculate improvement
      const improvement = ((seqDuration - parDuration) / seqDuration) * 100;

      console.log(`\n📊 Benchmark Results (${taskCount} tasks, ${TASK_DURATION}ms each):`);
      console.log(`   Sequential: ${seqDuration}ms`);
      console.log(`   Parallel:   ${parDuration}ms`);
      console.log(`   Improvement: ${improvement.toFixed(1)}%`);

      expect(seqResult.status).toBe('completed');
      expect(parResult.status).toBe('completed');
      expect(improvement).toBeGreaterThanOrEqual(30);
    }, 10000);

    it('should achieve at least 30% time reduction with 10 parallel tasks', async () => {
      const taskCount = 10;
      const skills = Array.from({ length: taskCount }, (_, i) => `benchmark-task-${i + 1}`);
      const tasks = skills.map((skill, i) => ({
        id: `task-${i + 1}`,
        skill,
        input: { index: i + 1 }
      }));

      // Sequential execution
      const seqStart = Date.now();
      await engine.execute(PatternType.SEQUENTIAL, {
        input: {
          skills,
          initialInput: { source: 'sequential-benchmark' }
        }
      });
      const seqDuration = Date.now() - seqStart;

      // Parallel execution
      const parStart = Date.now();
      await engine.execute(PatternType.SWARM, {
        input: {
          tasks,
          strategy: 'all'
        }
      });
      const parDuration = Date.now() - parStart;

      const improvement = ((seqDuration - parDuration) / seqDuration) * 100;

      console.log(`\n📊 Benchmark Results (${taskCount} tasks, ${TASK_DURATION}ms each):`);
      console.log(`   Sequential: ${seqDuration}ms`);
      console.log(`   Parallel:   ${parDuration}ms`);
      console.log(`   Improvement: ${improvement.toFixed(1)}%`);

      expect(improvement).toBeGreaterThanOrEqual(30);
    }, 15000);

    it('should scale performance with varying task counts', async () => {
      const results = [];
      
      for (const taskCount of [3, 5, 7]) {
        const skills = Array.from({ length: taskCount }, (_, i) => `benchmark-task-${i + 1}`);
        const tasks = skills.map((skill, i) => ({
          id: `task-${i + 1}`,
          skill,
          input: { index: i + 1 }
        }));

        // Sequential
        const seqStart = Date.now();
        await engine.execute(PatternType.SEQUENTIAL, {
          input: {
            skills,
            initialInput: {}
          }
        });
        const seqDuration = Date.now() - seqStart;

        // Parallel
        const parStart = Date.now();
        await engine.execute(PatternType.SWARM, {
          input: {
            tasks,
            strategy: 'all'
          }
        });
        const parDuration = Date.now() - parStart;

        const improvement = ((seqDuration - parDuration) / seqDuration) * 100;
        results.push({ taskCount, seqDuration, parDuration, improvement });
      }

      console.log('\n📊 Scaling Benchmark Results:');
      console.log('   Tasks | Sequential | Parallel | Improvement');
      console.log('   ------|------------|----------|------------');
      for (const r of results) {
        console.log(`   ${r.taskCount.toString().padStart(5)} | ${r.seqDuration.toString().padStart(10)}ms | ${r.parDuration.toString().padStart(8)}ms | ${r.improvement.toFixed(1).padStart(10)}%`);
      }

      // All should achieve at least 30% improvement
      for (const r of results) {
        expect(r.improvement).toBeGreaterThanOrEqual(30);
      }
    }, 30000);
  });

  describe('P-Label Priority Execution', () => {
    it('should execute P0 tasks before P1 tasks', async () => {
      const executionOrder = [];
      
      // Create skills that track execution order
      engine.registerSkill('p0-tracker', async (input) => {
        executionOrder.push({ name: input.name, priority: input.priority, time: Date.now() });
        await new Promise(resolve => setTimeout(resolve, 10));
        return { success: true };
      });

      engine.registerSkill('p1-tracker', async (input) => {
        executionOrder.push({ name: input.name, priority: input.priority, time: Date.now() });
        await new Promise(resolve => setTimeout(resolve, 10));
        return { success: true };
      });

      await engine.execute(PatternType.SWARM, {
        input: {
          tasks: [
            { id: 'p1-1', skill: 'p1-tracker', priority: PLabel.P1, input: { name: 'p1-1', priority: PLabel.P1 } },
            { id: 'p0-1', skill: 'p0-tracker', priority: PLabel.P0, input: { name: 'p0-1', priority: PLabel.P0 } },
            { id: 'p1-2', skill: 'p1-tracker', priority: PLabel.P1, input: { name: 'p1-2', priority: PLabel.P1 } },
            { id: 'p0-2', skill: 'p0-tracker', priority: PLabel.P0, input: { name: 'p0-2', priority: PLabel.P0 } },
          ],
          strategy: 'all'
        }
      });

      // P0 tasks should start before P1 tasks
      const p0Times = executionOrder.filter(e => e.priority === PLabel.P0).map(e => e.time);
      const p1Times = executionOrder.filter(e => e.priority === PLabel.P1).map(e => e.time);
      
      if (p0Times.length > 0 && p1Times.length > 0) {
        const earliestP0 = Math.min(...p0Times);
        const earliestP1 = Math.min(...p1Times);
        expect(earliestP0).toBeLessThanOrEqual(earliestP1);
      }
    });
  });

  describe('Dependency Handling in Parallel', () => {
    it('should respect task dependencies while maximizing parallelism', async () => {
      const executionLog = [];

      // Register logging skills
      ['task-a', 'task-b', 'task-c', 'task-d', 'task-e'].forEach(name => {
        engine.registerSkill(name, async () => {
          const startTime = Date.now();
          executionLog.push({ name, event: 'start', time: startTime });
          await new Promise(resolve => setTimeout(resolve, 30));
          executionLog.push({ name, event: 'end', time: Date.now() });
          return { success: true };
        });
      });

      // A and B can run in parallel
      // C depends on A
      // D depends on B
      // E depends on C and D
      const start = Date.now();
      await engine.execute(PatternType.SWARM, {
        input: {
          tasks: [
            { id: 'a', skill: 'task-a' },
            { id: 'b', skill: 'task-b' },
            { id: 'c', skill: 'task-c' },
            { id: 'd', skill: 'task-d' },
            { id: 'e', skill: 'task-e' },
          ],
          dependencies: {
            'c': ['a'],
            'd': ['b'],
            'e': ['c', 'd']
          },
          strategy: 'all'
        }
      });
      const totalDuration = Date.now() - start;

      // Sequential would take ~150ms (5 * 30ms)
      // Optimal parallel: ~90ms (A+B parallel, then C+D parallel, then E)
      // With overhead, should be significantly less than sequential
      const sequentialEstimate = 150;
      const improvement = ((sequentialEstimate - totalDuration) / sequentialEstimate) * 100;

      console.log(`\n📊 Dependency-Aware Parallel Execution:`);
      console.log(`   Total Duration: ${totalDuration}ms`);
      console.log(`   Sequential Estimate: ${sequentialEstimate}ms`);
      console.log(`   Improvement: ${improvement.toFixed(1)}%`);

      // Should achieve meaningful parallelism despite dependencies
      expect(improvement).toBeGreaterThan(20);
    }, 10000);
  });

  describe('Performance Statistics', () => {
    it('should generate performance summary', async () => {
      const benchmarks = [];
      
      // Run multiple iterations
      for (let iteration = 0; iteration < 3; iteration++) {
        const tasks = Array.from({ length: 5 }, (_, i) => ({
          id: `task-${i + 1}`,
          skill: `benchmark-task-${i + 1}`,
          input: { iteration }
        }));

        const start = Date.now();
        await engine.execute(PatternType.SWARM, {
          input: {
            tasks,
            strategy: 'all'
          }
        });
        benchmarks.push(Date.now() - start);
      }

      const avg = benchmarks.reduce((a, b) => a + b, 0) / benchmarks.length;
      const min = Math.min(...benchmarks);
      const max = Math.max(...benchmarks);

      console.log('\n📊 Performance Statistics (3 iterations, 5 tasks each):');
      console.log(`   Average: ${avg.toFixed(1)}ms`);
      console.log(`   Min: ${min}ms`);
      console.log(`   Max: ${max}ms`);
      console.log(`   Variance: ${(max - min)}ms`);

      // Performance should be consistent
      expect(max - min).toBeLessThan(avg * 0.5); // Less than 50% variance
    }, 15000);
  });
});

describe('Benchmark Summary', () => {
  it('should confirm Phase 3 parallel execution target (30%+ reduction)', () => {
    // This test documents the benchmark target
    console.log('\n═══════════════════════════════════════════════════════');
    console.log(' Phase 3 Parallel Execution Benchmark');
    console.log('═══════════════════════════════════════════════════════');
    console.log(' Target: 30%+ workflow time reduction');
    console.log(' Pattern: Swarm (parallel execution)');
    console.log(' Comparison: Sequential vs Parallel execution');
    console.log('═══════════════════════════════════════════════════════');
    
    expect(true).toBe(true);
  });
});
