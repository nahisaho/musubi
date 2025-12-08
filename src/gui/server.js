/**
 * @fileoverview MUSUBI Web GUI Server
 * @module gui/server
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
const FileWatcher = require('./services/file-watcher');
const ProjectScanner = require('./services/project-scanner');
const WorkflowService = require('./services/workflow-service');
const TraceabilityService = require('./services/traceability-service');
const { ReplanningService } = require('./services/replanning-service');

/**
 * @typedef {Object} GUIServerOptions
 * @property {number} [port=3000] - Server port
 * @property {string} [clientPath] - Custom client path
 * @property {boolean} [readonly=false] - Read-only mode
 * @property {boolean} [open=true] - Open browser automatically
 * @property {boolean} [dev=false] - Development mode
 */

/**
 * MUSUBI GUI Server
 */
class GUIServer {
  /**
   * Create a new GUIServer instance
   * @param {string} projectPath - Project path
   * @param {GUIServerOptions} options - Server options
   */
  constructor(projectPath, options = {}) {
    this.projectPath = projectPath || process.cwd();
    this.port = options.port || 3000;
    this.clientPath = options.clientPath || path.join(__dirname, 'public');
    this.readonly = options.readonly || false;
    this.open = options.open !== false;
    this.dev = options.dev || false;

    this.app = express();
    this.httpServer = null;
    this.wss = null;
    this.clients = new Set();
    this.fileWatcher = null;
    this.projectScanner = new ProjectScanner(this.projectPath);
    this.workflowService = new WorkflowService(this.projectPath);
    this.traceabilityService = new TraceabilityService(this.projectPath);
    this.replanningService = new ReplanningService(this.projectPath);

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(this.clientPath));
  }

  /**
   * Setup API routes
   */
  setupRoutes() {
    // Project routes
    this.app.get('/api/project', async (req, res) => {
      try {
        const project = await this.projectScanner.scan();
        res.json(project);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/project/validate', async (req, res) => {
      try {
        const result = await this.projectScanner.validate();
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Constitution routes
    this.app.get('/api/constitution', async (req, res) => {
      try {
        const constitution = await this.projectScanner.getConstitution();
        res.json(constitution);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Specs routes
    this.app.get('/api/specs', async (req, res) => {
      try {
        const specs = await this.projectScanner.getSpecs();
        res.json(specs);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/specs/:id', async (req, res) => {
      try {
        const spec = await this.projectScanner.getSpec(req.params.id);
        if (!spec) {
          return res.status(404).json({ error: 'Spec not found' });
        }
        res.json(spec);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Tasks routes
    this.app.get('/api/specs/:id/tasks', async (req, res) => {
      try {
        const tasks = await this.projectScanner.getTasks(req.params.id);
        res.json(tasks);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Traceability routes
    this.app.get('/api/traceability', async (req, res) => {
      try {
        const matrix = await this.projectScanner.getTraceabilityMatrix();
        res.json(matrix);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/traceability/graph', async (req, res) => {
      try {
        const graph = await this.projectScanner.getTraceabilityGraph();
        res.json(graph);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Workflow routes
    this.app.get('/api/workflow', async (req, res) => {
      try {
        const workflow = await this.projectScanner.getWorkflow();
        res.json(workflow);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Steering files routes
    this.app.get('/api/steering', async (req, res) => {
      try {
        const steering = await this.projectScanner.getSteering();
        res.json(steering);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', readonly: this.readonly });
    });

    // Traceability coverage
    this.app.get('/api/coverage', async (req, res) => {
      try {
        const coverage = await this.traceabilityService.getCoverage();
        res.json(coverage);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Workflow routes with feature ID
    this.app.get('/api/workflow/:featureId', async (req, res) => {
      try {
        const workflow = await this.workflowService.getWorkflowState(req.params.featureId);
        res.json(workflow);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // All workflows
    this.app.get('/api/workflows', async (req, res) => {
      try {
        const workflows = await this.workflowService.getAllWorkflows();
        res.json(workflows);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Replanning routes
    this.app.get('/api/replanning', async (req, res) => {
      try {
        const state = await this.replanningService.getState();
        res.json(state);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/replanning/summary', async (req, res) => {
      try {
        const summary = await this.replanningService.getSummary();
        res.json(summary);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/replanning/goals', async (req, res) => {
      try {
        const goals = await this.replanningService.getGoalProgress();
        res.json(goals);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/replanning/optimization', async (req, res) => {
      try {
        const optimization = await this.replanningService.getPathOptimization();
        res.json(optimization);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/replanning/history', async (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 20;
        const history = await this.replanningService.getHistory(limit);
        res.json(history);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/replanning/metrics', async (req, res) => {
      try {
        const metrics = await this.replanningService.getMetrics();
        res.json(metrics);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 404 handler for unknown API routes
    this.app.use('/api/*', (req, res) => {
      res.status(404).json({ error: 'Not found' });
    });

    // SPA fallback - serve index.html for all other routes
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(this.clientPath, 'index.html'));
    });
  }

  /**
   * Setup WebSocket server
   */
  setupWebSocket() {
    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Send initial project state
      this.projectScanner.scan().then((project) => {
        ws.send(JSON.stringify({ type: 'project:init', data: project }));
      });
    });
  }

  /**
   * Broadcast message to all connected clients
   * @param {Object} message
   */
  broadcast(message) {
    const data = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(data);
      }
    }
  }

  /**
   * Setup file watcher
   */
  setupFileWatcher() {
    this.fileWatcher = new FileWatcher(this.projectPath, {
      ignored: /(^|[\/\\])\.|node_modules/,
    });

    this.fileWatcher.on('change', async (filePath) => {
      try {
        const project = await this.projectScanner.scan();
        this.broadcast({ type: 'file:changed', data: { path: filePath, project } });
      } catch (error) {
        console.error('Error scanning project:', error);
      }
    });

    this.fileWatcher.on('add', async (filePath) => {
      try {
        const project = await this.projectScanner.scan();
        this.broadcast({ type: 'file:added', data: { path: filePath, project } });
      } catch (error) {
        console.error('Error scanning project:', error);
      }
    });

    this.fileWatcher.on('unlink', async (filePath) => {
      try {
        const project = await this.projectScanner.scan();
        this.broadcast({ type: 'file:removed', data: { path: filePath, project } });
      } catch (error) {
        console.error('Error scanning project:', error);
      }
    });
  }

  /**
   * Start the server
   * @returns {Promise<void>}
   */
  async start() {
    return new Promise((resolve, reject) => {
      this.httpServer = http.createServer(this.app);
      
      this.setupWebSocket();
      this.setupFileWatcher();

      this.httpServer.listen(this.port, (err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }

  /**
   * Open URL in default browser
   * @param {string} url
   */
  openBrowser(url) {
    const platform = process.platform;
    let cmd;

    if (platform === 'darwin') {
      cmd = `open "${url}"`;
    } else if (platform === 'win32') {
      cmd = `start "" "${url}"`;
    } else {
      cmd = `xdg-open "${url}"`;
    }

    require('child_process').exec(cmd);
  }

  /**
   * Stop the server
   * @returns {Promise<void>}
   */
  async stop() {
    if (this.fileWatcher) {
      await this.fileWatcher.close();
      this.fileWatcher = null;
    }

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    if (this.httpServer) {
      return new Promise((resolve) => {
        this.httpServer.close(resolve);
      });
    }
  }
}

module.exports = GUIServer;
