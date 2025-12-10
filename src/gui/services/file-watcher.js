/**
 * @fileoverview File Watcher Service
 * @module gui/services/file-watcher
 */

const chokidar = require('chokidar');
const EventEmitter = require('events');
const path = require('path');

/**
 * File Watcher - Watches for file changes in the project
 */
class FileWatcher extends EventEmitter {
  /**
   * Create a new FileWatcher instance
   * @param {string} projectPath - Project path to watch
   * @param {Object} options - Chokidar options
   */
  constructor(projectPath, options = {}) {
    super();
    
    this.projectPath = projectPath;
    this.options = {
      ignored: options.ignored || /(^|[/\\])\.|node_modules/,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
      ...options,
    };

    this.watcher = null;
    this.debounceTimers = new Map();
    this.debounceDelay = 500;

    this.start();
  }

  /**
   * Start watching
   */
  start() {
    const watchPaths = [
      path.join(this.projectPath, 'steering'),
      path.join(this.projectPath, 'storage'),
    ];

    this.watcher = chokidar.watch(watchPaths, this.options);

    this.watcher.on('change', (filePath) => {
      this.debounce('change', filePath);
    });

    this.watcher.on('add', (filePath) => {
      this.debounce('add', filePath);
    });

    this.watcher.on('unlink', (filePath) => {
      this.debounce('unlink', filePath);
    });

    this.watcher.on('error', (error) => {
      this.emit('error', error);
    });

    this.watcher.on('ready', () => {
      this.emit('ready');
    });
  }

  /**
   * Debounce file events
   * @param {string} event - Event name
   * @param {string} filePath - File path
   */
  debounce(event, filePath) {
    const key = `${event}:${filePath}`;
    
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }

    const timer = setTimeout(() => {
      this.emit(event, filePath);
      this.debounceTimers.delete(key);
    }, this.debounceDelay);

    this.debounceTimers.set(key, timer);
  }

  /**
   * Close the watcher
   * @returns {Promise<void>}
   */
  async close() {
    // Clear all timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  /**
   * Check if watcher is active
   * @returns {boolean}
   */
  get isActive() {
    return this.watcher !== null;
  }
}

module.exports = FileWatcher;
