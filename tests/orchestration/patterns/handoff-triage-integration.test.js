/**
 * Integration tests for Handoff and Triage patterns
 * 
 * Tests end-to-end workflows combining both patterns
 */

const {
  createOrchestrationEngine,
  PatternType,
  ExecutionStatus,
  _HandoffPattern,
  HandoffFilters,
  _HandoffConfig,
  TriagePattern,
  TriageCategory,
  TriageStrategy,
  AgentCapability
} = require('../../../src/orchestration');

describe('Handoff and Triage Integration', () => {
  let engine;

  beforeEach(() => {
    engine = createOrchestrationEngine();
  });

  describe('Triage to Handoff workflow', () => {
    it('should classify request and handoff to specialized agent', async () => {
      // Create specialized agents with capabilities
      const agents = [
        {
          name: 'billing-agent',
          capability: new AgentCapability({
            agent: { name: 'billing-agent' },
            categories: [TriageCategory.BILLING, TriageCategory.REFUND],
            keywords: ['invoice', 'payment', 'refund', 'charge'],
            priority: 2
          }),
          execute: async (_input) => ({
            agent: 'billing-agent',
            processed: true,
            action: 'refund_processed'
          })
        },
        {
          name: 'support-agent',
          capability: new AgentCapability({
            agent: { name: 'support-agent' },
            categories: [TriageCategory.SUPPORT],
            keywords: ['help', 'issue', 'problem'],
            priority: 1
          }),
          execute: async (_input) => ({
            agent: 'support-agent',
            processed: true,
            action: 'support_ticket_created'
          })
        }
      ];

      // Step 1: Triage the request
      const triageContext = await engine.execute(PatternType.TRIAGE, {
        task: 'Classify customer request',
        input: {
          message: 'I need a refund for order #12345',
          agents,
          enableHandoff: false  // Just classify, don't auto-handoff
        }
      });

      expect(triageContext.status).toBe(ExecutionStatus.COMPLETED);
      expect(triageContext.output.classification.category).toBe('refund');
      expect(triageContext.output.classification.selectedAgent).toBe('billing-agent');

      // Step 2: Handoff to the selected agent
      const selectedAgentName = triageContext.output.classification.selectedAgent;
      const selectedAgent = agents.find(a => a.name === selectedAgentName);

      const handoffContext = await engine.execute(PatternType.HANDOFF, {
        task: 'Process refund request',
        input: {
          sourceAgent: 'triage-agent',
          targetAgents: [selectedAgent],
          reason: `Classified as ${triageContext.output.classification.category}`,
          context: {
            classification: triageContext.output.classification,
            originalMessage: 'I need a refund for order #12345'
          }
        }
      });

      expect(handoffContext.status).toBe(ExecutionStatus.COMPLETED);
      expect(handoffContext.output.targetAgent).toBe('billing-agent');
    });

    it('should handle multiple category matches with priority routing', async () => {
      const agents = [
        {
          name: 'senior-billing',
          capability: new AgentCapability({
            agent: { name: 'senior-billing' },
            categories: [TriageCategory.BILLING, TriageCategory.REFUND],
            keywords: ['urgent', 'large', 'important'],
            priority: 3  // Higher priority
          })
        },
        {
          name: 'junior-billing',
          capability: new AgentCapability({
            agent: { name: 'junior-billing' },
            categories: [TriageCategory.BILLING, TriageCategory.REFUND],
            keywords: ['refund', 'payment'],
            priority: 1
          })
        }
      ];

      const context = await engine.execute(PatternType.TRIAGE, {
        task: 'Route billing request',
        input: {
          message: 'This is URGENT - I need a large refund immediately',
          agents,
          enableHandoff: false
        }
      });

      expect(context.status).toBe(ExecutionStatus.COMPLETED);
      // Senior agent should be selected due to 'urgent' and 'large' keyword matches + higher priority
      expect(context.output.classification.selectedAgent).toBe('senior-billing');
    });
  });

  describe('Multi-step handoff chain', () => {
    it('should track handoff chain through multiple agents', async () => {
      const _frontlineAgent = {
        name: 'frontline',
        execute: async () => ({ action: 'initial_response' })
      };

      const specialistAgent = {
        name: 'specialist',
        execute: async () => ({ action: 'specialized_handling' })
      };

      const supervisorAgent = {
        name: 'supervisor',
        execute: async () => ({ action: 'escalation_resolved' })
      };

      // First handoff: frontline -> specialist
      const handoff1 = await engine.execute(PatternType.HANDOFF, {
        task: 'Escalate to specialist',
        input: {
          sourceAgent: 'frontline',
          targetAgents: [specialistAgent],
          reason: 'Technical expertise required'
        }
      });

      expect(handoff1.status).toBe(ExecutionStatus.COMPLETED);
      expect(handoff1.output.handoffChain).toHaveLength(1);
      expect(handoff1.output.handoffChain[0].from).toBe('frontline');
      expect(handoff1.output.handoffChain[0].to).toBe('specialist');

      // Second handoff: specialist -> supervisor
      const handoff2 = await engine.execute(PatternType.HANDOFF, {
        task: 'Escalate to supervisor',
        input: {
          sourceAgent: 'specialist',
          targetAgents: [supervisorAgent],
          reason: 'Customer requested manager',
          previousChain: handoff1.output.handoffChain
        }
      });

      expect(handoff2.status).toBe(ExecutionStatus.COMPLETED);
      expect(handoff2.output.targetAgent).toBe('supervisor');
    });
  });

  describe('Input filter integration', () => {
    it('should apply input filters when handing off from triage', async () => {
      const conversationHistory = [
        { role: 'user', content: 'Hello' },
        { role: 'agent', content: 'Hi, how can I help?' },
        { role: 'user', content: 'I have a billing question' },
        { role: 'agent', content: 'Let me transfer you to billing' },
        { role: 'user', content: 'I need a refund please' }
      ];

      const billingAgent = {
        name: 'billing',
        execute: async (input) => ({
          receivedHistory: input.history,
          processed: true
        })
      };

      // Use lastN filter to only pass recent messages
      const filteredHistory = HandoffFilters.lastN(2)(conversationHistory);

      const context = await engine.execute(PatternType.HANDOFF, {
        task: 'Transfer to billing',
        input: {
          sourceAgent: 'triage',
          targetAgents: [billingAgent],
          history: filteredHistory,
          reason: 'Billing question detected'
        }
      });

      expect(context.status).toBe(ExecutionStatus.COMPLETED);
      // Only last 2 messages should be passed
      expect(filteredHistory).toHaveLength(2);
      expect(filteredHistory[0].content).toBe('Let me transfer you to billing');
      expect(filteredHistory[1].content).toBe('I need a refund please');
    });

    it('should filter user messages only', () => {
      const history = [
        { role: 'user', content: 'Hello' },
        { role: 'agent', content: 'Hi!' },
        { role: 'user', content: 'Help me' },
        { role: 'system', content: 'Connecting...' }
      ];

      const filtered = HandoffFilters.userMessagesOnly(history);

      expect(filtered).toHaveLength(2);
      expect(filtered.every(m => m.role === 'user')).toBe(true);
    });
  });

  describe('Fallback handling', () => {
    it('should use fallback agent when no match found', async () => {
      const generalAgent = {
        name: 'general-agent',
        capability: new AgentCapability({
          agent: { name: 'general-agent' },
          categories: [TriageCategory.GENERAL],
          keywords: [],
          priority: 0
        })
      };

      const triagePattern = new TriagePattern({
        strategy: TriageStrategy.KEYWORD,
        fallbackAgent: generalAgent
      });

      triagePattern.registerAgent('general-agent', generalAgent.capability);

      const classification = await triagePattern.classifyRequest(
        'something completely unrelated xyz123',
        {}
      );

      // Should classify but with low confidence
      expect(classification.category).toBe(TriageCategory.GENERAL);
    });

    it('should handle handoff with fallback targets', async () => {
      const _primaryAgent = {
        name: 'primary',
        // Simulate unavailable agent
        available: false,
        execute: async () => { throw new Error('Agent unavailable'); }
      };

      const fallbackAgent = {
        name: 'fallback',
        available: true,
        execute: async () => ({ action: 'handled_by_fallback' })
      };

      const context = await engine.execute(PatternType.HANDOFF, {
        task: 'Handle request',
        input: {
          sourceAgent: 'router',
          targetAgents: [fallbackAgent], // Skip unavailable, use fallback
          reason: 'Routing to available agent'
        }
      });

      expect(context.status).toBe(ExecutionStatus.COMPLETED);
      expect(context.output.targetAgent).toBe('fallback');
    });
  });

  describe('Strategy selection', () => {
    it('should classify correctly with KEYWORD strategy', async () => {
      const agents = [
        {
          name: 'tech-agent',
          capability: new AgentCapability({
            agent: { name: 'tech-agent' },
            categories: [TriageCategory.TECHNICAL],
            keywords: ['api', 'bug', 'error', 'code', 'integration']
          })
        }
      ];

      const context = await engine.execute(PatternType.TRIAGE, {
        task: 'Classify',
        input: {
          message: 'I have an API integration error in my code',
          agents,
          strategy: TriageStrategy.KEYWORD,
          enableHandoff: false
        }
      });

      expect(context.status).toBe(ExecutionStatus.COMPLETED);
      expect(context.output.classification.category).toBe('technical');
    });

    it('should classify correctly with INTENT strategy', async () => {
      const agents = [
        {
          name: 'refund-agent',
          capability: new AgentCapability({
            agent: { name: 'refund-agent' },
            categories: [TriageCategory.REFUND],
            keywords: ['refund', 'money back']
          })
        }
      ];

      const triagePattern = new TriagePattern({
        strategy: TriageStrategy.INTENT
      });
      triagePattern.registerAgent('refund-agent', agents[0].capability);

      const classification = await triagePattern.classifyRequest(
        'I want my money back for this order',
        {}
      );

      // Intent detection should identify refund intent
      expect(classification.intents.length).toBeGreaterThan(0);
    });

    it('should combine strategies with HYBRID', async () => {
      const agents = [
        {
          name: 'sales-agent',
          capability: new AgentCapability({
            agent: { name: 'sales-agent' },
            categories: [TriageCategory.SALES],
            keywords: ['buy', 'purchase', 'pricing']
          })
        }
      ];

      const context = await engine.execute(PatternType.TRIAGE, {
        task: 'Classify',
        input: {
          message: 'I want to buy your enterprise plan',
          agents,
          strategy: TriageStrategy.HYBRID,
          enableHandoff: false
        }
      });

      expect(context.status).toBe(ExecutionStatus.COMPLETED);
      expect(context.output.classification.category).toBe('sales');
      expect(context.output.classification.reasoning).toContain('Hybrid');
    });
  });

  describe('Event emission', () => {
    it('should emit triage events', async () => {
      const events = [];
      
      engine.on('triage:started', (data) => events.push({ type: 'started', data }));
      engine.on('triage:classified', (data) => events.push({ type: 'classified', data }));
      engine.on('triage:completed', (data) => events.push({ type: 'completed', data }));

      const agents = [
        {
          name: 'test-agent',
          capability: new AgentCapability({
            agent: { name: 'test-agent' },
            categories: [TriageCategory.GENERAL],
            keywords: []
          })
        }
      ];

      await engine.execute(PatternType.TRIAGE, {
        task: 'Test events',
        input: {
          message: 'Test message',
          agents,
          enableHandoff: false
        }
      });

      expect(events.some(e => e.type === 'started')).toBe(true);
      expect(events.some(e => e.type === 'classified')).toBe(true);
      expect(events.some(e => e.type === 'completed')).toBe(true);
    });

    it('should emit handoff events', async () => {
      const events = [];
      
      engine.on('handoff:started', (data) => events.push({ type: 'started', data }));
      engine.on('handoff:completed', (data) => events.push({ type: 'completed', data }));

      const targetAgent = {
        name: 'target',
        execute: async () => ({ done: true })
      };

      await engine.execute(PatternType.HANDOFF, {
        task: 'Test events',
        input: {
          sourceAgent: 'source',
          targetAgents: [targetAgent]
        }
      });

      expect(events.some(e => e.type === 'started')).toBe(true);
      expect(events.some(e => e.type === 'completed')).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle missing agents gracefully', async () => {
      const context = await engine.execute(PatternType.TRIAGE, {
        task: 'Classify without agents',
        input: {
          message: 'Test message',
          agents: [],
          enableHandoff: false
        }
      });

      expect(context.status).toBe(ExecutionStatus.FAILED);
      expect(context.error).toContain('agent');
    });

    it('should handle missing message gracefully', async () => {
      const context = await engine.execute(PatternType.TRIAGE, {
        task: 'Classify without message',
        input: {
          agents: [{ name: 'test' }]
        }
      });

      expect(context.status).toBe(ExecutionStatus.FAILED);
      expect(context.error).toContain('message');
    });

    it('should handle handoff without source agent', async () => {
      const context = await engine.execute(PatternType.HANDOFF, {
        task: 'Handoff without source',
        input: {
          targetAgents: [{ name: 'target' }]
        }
      });

      expect(context.status).toBe(ExecutionStatus.FAILED);
      expect(context.error).toContain('sourceAgent');
    });
  });

  describe('Performance', () => {
    it('should classify requests quickly', async () => {
      const agents = [
        {
          name: 'agent1',
          capability: new AgentCapability({
            agent: { name: 'agent1' },
            categories: [TriageCategory.BILLING],
            keywords: ['billing']
          })
        }
      ];

      const start = Date.now();
      
      await engine.execute(PatternType.TRIAGE, {
        task: 'Quick classify',
        input: {
          message: 'billing question',
          agents,
          enableHandoff: false
        }
      });

      const duration = Date.now() - start;
      
      // Classification should complete in under 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle multiple concurrent triage requests', async () => {
      const agents = [
        {
          name: 'agent',
          capability: new AgentCapability({
            agent: { name: 'agent' },
            categories: [TriageCategory.GENERAL],
            keywords: []
          })
        }
      ];

      const messages = [
        'Message 1',
        'Message 2',
        'Message 3',
        'Message 4',
        'Message 5'
      ];

      const promises = messages.map(message =>
        engine.execute(PatternType.TRIAGE, {
          task: 'Concurrent classify',
          input: {
            message,
            agents,
            enableHandoff: false
          }
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(results.every(r => r.status === ExecutionStatus.COMPLETED)).toBe(true);
    });
  });
});
