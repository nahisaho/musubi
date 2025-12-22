/**
 * @fileoverview Tests for GUI Server
 */

const Server = require('../../src/gui/server');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const _http = require('http');

// Increase Jest timeout for server tests
jest.setTimeout(15000);

// Generate unique port to avoid conflicts in parallel tests
let portCounter = 3100 + Math.floor(Math.random() * 1000);
function getNextPort() {
  return portCounter++;
}

describe('Server', () => {
  let tempDir;
  let server;

  beforeEach(async () => {
    tempDir = path.join(
      os.tmpdir(),
      `musubi-test-${Date.now()}-${Math.random().toString(36).substring(7)}`
    );
    await fs.ensureDir(path.join(tempDir, 'steering', 'rules'));
    await fs.ensureDir(path.join(tempDir, 'storage', 'specs'));
    await fs.writeFile(
      path.join(tempDir, 'steering', 'rules', 'constitution.md'),
      '# Constitution\n\n## Article 1: Purpose\nTest'
    );
  });

  afterEach(async () => {
    if (server) {
      try {
        await Promise.race([
          server.stop(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Stop timeout')), 10000)),
        ]);
      } catch (e) {
        // Force cleanup if stop times out
        if (server.httpServer) {
          server.httpServer.close();
        }
        if (server.wss) {
          server.wss.close();
        }
      }
      server = null;
    }
    try {
      await fs.remove(tempDir);
    } catch (e) {
      // Ignore cleanup errors
    }
  }, 15000);

  describe('constructor()', () => {
    it('should create a server instance', () => {
      server = new Server(tempDir);

      expect(server).toBeInstanceOf(Server);
      expect(server.projectPath).toBe(tempDir);
    });

    it('should accept custom port', () => {
      server = new Server(tempDir, { port: 4000 });

      expect(server.port).toBe(4000);
    });

    it('should default to port 3000', () => {
      server = new Server(tempDir);

      expect(server.port).toBe(3000);
    });
  });

  describe('start() and stop()', () => {
    it('should start and stop the server', async () => {
      const port = getNextPort();
      server = new Server(tempDir, { port });

      await server.start();
      expect(server.httpServer).not.toBeNull();
      expect(server.httpServer.listening).toBe(true);

      await server.stop();
      expect(server.httpServer.listening).toBe(false);
    });

    it('should handle already stopped server', async () => {
      const port = getNextPort();
      server = new Server(tempDir, { port });

      await server.start();
      await server.stop();

      // Should not throw
      await server.stop();
    });
  });

  describe('API endpoints', () => {
    let baseUrl;
    let apiPort;

    beforeEach(async () => {
      apiPort = getNextPort();
      server = new Server(tempDir, { port: apiPort });
      await server.start();
      baseUrl = `http://localhost:${apiPort}`;
    });

    it('should respond to health check', async () => {
      const response = await fetch(`${baseUrl}/api/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
    });

    it('should get project info', async () => {
      const response = await fetch(`${baseUrl}/api/project`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('hasSteering', true);
    });

    it('should get steering data', async () => {
      const response = await fetch(`${baseUrl}/api/steering`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('product');
      expect(data).toHaveProperty('structure');
      expect(data).toHaveProperty('tech');
    });

    it('should get specs list', async () => {
      await fs.writeFile(
        path.join(tempDir, 'storage', 'specs', 'test.md'),
        '---\ntitle: Test\n---\n# Test'
      );

      const response = await fetch(`${baseUrl}/api/specs`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should get traceability matrix', async () => {
      const response = await fetch(`${baseUrl}/api/traceability`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('requirements');
      expect(data).toHaveProperty('traces');
    });

    it('should get coverage statistics', async () => {
      const response = await fetch(`${baseUrl}/api/coverage`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('linked');
    });

    it('should get workflow state', async () => {
      const response = await fetch(`${baseUrl}/api/workflow/test-feature`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('featureId', 'test-feature');
      expect(data).toHaveProperty('currentStage');
    });

    it('should get all workflows', async () => {
      const response = await fetch(`${baseUrl}/api/workflows`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle 404 for unknown API', async () => {
      const response = await fetch(`${baseUrl}/api/unknown`);

      expect(response.status).toBe(404);
    });
  });

  describe('WebSocket', () => {
    it('should accept WebSocket connections', async () => {
      // Ensure directories exist for this test
      await fs.ensureDir(path.join(tempDir, 'storage', 'specs'));

      const wsPort = getNextPort();
      server = new Server(tempDir, { port: wsPort });
      await server.start();

      const WebSocket = require('ws');
      const ws = new WebSocket(`ws://localhost:${wsPort}`);

      await new Promise((resolve, reject) => {
        ws.on('open', () => {
          ws.close();
          resolve();
        });
        ws.on('error', reject);
      });
    });

    it('should broadcast to all clients', async () => {
      // Ensure directories exist for this test
      await fs.ensureDir(path.join(tempDir, 'storage', 'specs'));

      const wsPort = getNextPort();
      server = new Server(tempDir, { port: wsPort });
      await server.start();

      const WebSocket = require('ws');
      const ws = new WebSocket(`ws://localhost:${wsPort}`);

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('Timeout waiting for broadcast'));
        }, 5000);

        ws.on('open', () => {
          // Wait a bit for connection to stabilize
          setTimeout(() => {
            server.broadcast({ type: 'test', data: 'hello' });
          }, 100);
        });

        ws.on('message', data => {
          const message = JSON.parse(data.toString());
          if (message.type === 'test') {
            expect(message.data).toBe('hello');
            clearTimeout(timeout);
            ws.close();
            resolve();
          }
        });

        ws.on('error', err => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    });
  });

  describe('Static file serving', () => {
    it('should serve index.html for root', async () => {
      // Create a mock client dist
      const clientDir = path.join(tempDir, 'client', 'dist');
      await fs.ensureDir(clientDir);
      await fs.writeFile(path.join(clientDir, 'index.html'), '<html>Test</html>');

      const staticPort = getNextPort();
      server = new Server(tempDir, { port: staticPort, clientPath: clientDir });
      await server.start();

      const response = await fetch(`http://localhost:${staticPort}/`);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(text).toContain('<html>');
    });
  });
});
