#!/usr/bin/env node

/**
 * @fileoverview E2E Test for Ollama Provider
 * @description End-to-end integration test with real Ollama server
 */

'use strict';

const { OllamaProvider } = require('../../src/llm-providers/ollama-provider');

// WSL to Windows host
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://192.168.224.1:11434';
const TEST_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b';
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text:latest';

async function runE2ETests() {
  console.log('🧪 Ollama E2E Integration Test\n');
  console.log(`Host: ${OLLAMA_HOST}`);
  console.log(`Model: ${TEST_MODEL}`);
  console.log(`Embed Model: ${EMBED_MODEL}\n`);

  const provider = new OllamaProvider({
    baseUrl: OLLAMA_HOST,
    model: TEST_MODEL,
  });

  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  async function test(name, fn) {
    process.stdout.write(`  ${name}... `);
    const start = Date.now();
    try {
      await fn();
      const duration = Date.now() - start;
      console.log(`✅ (${duration}ms)`);
      results.passed++;
      results.tests.push({ name, status: 'passed', duration });
    } catch (error) {
      const duration = Date.now() - start;
      console.log(`❌ (${duration}ms)`);
      console.log(`    Error: ${error.message}`);
      results.failed++;
      results.tests.push({ name, status: 'failed', duration, error: error.message });
    }
  }

  // Test 1: Health check
  await test('Health check (isAvailable)', async () => {
    const available = await provider.isAvailable();
    if (!available) throw new Error('Ollama is not available');
  });

  // Test 2: List models
  await test('Refresh models', async () => {
    const models = await provider.refreshModels();
    if (!Array.isArray(models) || models.length === 0) {
      throw new Error('No models found');
    }
    console.log(`\n    Found ${models.length} models: ${models.slice(0, 4).join(', ')}...`);
  });

  // Test 3: Simple completion
  await test('Simple completion', async () => {
    const response = await provider.complete('Say "Hello MUSUBI" and nothing else.', {
      temperature: 0,
      maxTokens: 50,
    });

    if (!response.content) {
      throw new Error('No content in response');
    }
    console.log(`\n    Response: "${response.content.substring(0, 100)}..."`);
    console.log(`    Tokens: ${response.usage?.totalTokens || 'N/A'}`);
  });

  // Test 4: Completion with system prompt
  await test('Completion with system prompt', async () => {
    const response = await provider.complete(
      'Return a JSON object with keys "status" set to "ok" and "tool" set to "musubi".',
      {
        systemPrompt: 'You are a helpful assistant that responds only in valid JSON format. No explanation, just JSON.',
        temperature: 0,
        maxTokens: 100,
      }
    );

    if (!response.content) {
      throw new Error('No content in response');
    }
    console.log(`\n    Response: "${response.content.substring(0, 150)}..."`);
  });

  // Test 5: Streaming completion
  await test('Streaming completion', async () => {
    let fullContent = '';
    let chunkCount = 0;

    const stream = provider.stream('Count from 1 to 5, one number per line.', {
      temperature: 0,
      maxTokens: 50,
    });

    for await (const chunk of stream) {
      fullContent += chunk;
      chunkCount++;
    }

    if (chunkCount === 0) {
      throw new Error('No chunks received');
    }
    console.log(`\n    Received ${chunkCount} chunks`);
    console.log(`    Full response: "${fullContent.substring(0, 80).replace(/\n/g, '\\n')}..."`);
  });

  // Test 6: Embeddings
  await test('Generate embeddings', async () => {
    try {
      const embedding = await provider.embed('MUSUBI is a specification-driven development tool.', {
        model: EMBED_MODEL,
      });

      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('No embedding returned');
      }
      console.log(`\n    Embedding dimension: ${embedding.length}`);
      console.log(`    First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        console.log(`\n    (Skipped: ${EMBED_MODEL} model not available)`);
        return;
      }
      throw error;
    }
  });

  // Test 7: Get model info
  await test('Get model info', async () => {
    const info = await provider.getModelInfo(TEST_MODEL);
    if (!info) {
      throw new Error('No model info returned');
    }
    console.log(`\n    Model family: ${info.details?.family || 'N/A'}`);
    console.log(`    Parameters: ${info.details?.parameter_size || 'N/A'}`);
  });

  // Test 8: Error handling (invalid model)
  await test('Error handling (invalid model)', async () => {
    try {
      await provider.complete('test', {
        model: 'non-existent-model-xyz123',
      });
      throw new Error('Should have thrown an error');
    } catch (error) {
      if (error.message === 'Should have thrown an error') {
        throw error;
      }
      console.log(`\n    Expected error caught: ${error.message.substring(0, 60)}...`);
    }
  });

  // Test 9: Multi-turn conversation simulation
  await test('Multi-turn conversation', async () => {
    // First message
    const response1 = await provider.complete(
      'Remember this: The secret code is MUSUBI-2025. Acknowledge with "Got it".',
      { temperature: 0, maxTokens: 50 }
    );
    console.log(`\n    First response: "${response1.content.substring(0, 50)}..."`);

    // Second message with context in prompt
    const response2 = await provider.complete(
      `Previous context: You were told the secret code is MUSUBI-2025.
       
Question: What is the secret code I mentioned?`,
      { temperature: 0, maxTokens: 50 }
    );
    
    console.log(`    Second response: "${response2.content.substring(0, 80)}..."`);
    
    if (!response2.content.includes('MUSUBI') && !response2.content.includes('2025')) {
      console.log('    Warning: Context may not be maintained');
    }
  });

  // Test 10: Code generation
  await test('Code generation (JavaScript)', async () => {
    const response = await provider.complete(
      'Write a JavaScript function called "add" that takes two numbers and returns their sum. Only code, no explanation.',
      {
        systemPrompt: 'You are a code assistant. Return only valid JavaScript code without markdown.',
        temperature: 0,
        maxTokens: 150,
      }
    );

    if (!response.content.includes('function') && !response.content.includes('=>')) {
      console.log(`\n    Warning: Response may not contain valid function`);
    }
    console.log(`\n    Generated code:\n${response.content.split('\n').slice(0, 6).map(l => '      ' + l).join('\n')}`);
  });

  // Test 11: Long context handling
  await test('Long context handling', async () => {
    const longContext = 'word '.repeat(500); // About 500 tokens
    const response = await provider.complete(
      `${longContext}\n\nHow many times does the word "word" appear above? Just give a number.`,
      { temperature: 0, maxTokens: 50 }
    );
    
    console.log(`\n    Response: "${response.content.substring(0, 50)}..."`);
    console.log(`    Prompt tokens: ${response.usage?.promptTokens || 'N/A'}`);
  });

  // Test 12: Provider metadata
  await test('Provider metadata', async () => {
    const response = await provider.complete('Hi', { maxTokens: 10 });
    
    if (!response.metadata) {
      throw new Error('No metadata in response');
    }
    console.log(`\n    Provider: ${response.metadata.provider}`);
    console.log(`    Duration: ${response.metadata.duration}ms`);
    console.log(`    Model: ${response.model}`);
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Results: ${results.passed} passed, ${results.failed} failed`);
  console.log('='.repeat(60));

  if (results.failed > 0) {
    console.log('\n❌ Failed tests:');
    results.tests.filter(t => t.status === 'failed').forEach(t => {
      console.log(`  - ${t.name}: ${t.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All E2E tests passed!');
    process.exit(0);
  }
}

// Run tests
runE2ETests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
