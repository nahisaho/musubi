/**
 * Release Manager - Release coordination and management
 * 
 * Provides release management capabilities:
 * - Release planning and tracking
 * - Feature flag management
 * - Rollback procedures
 * - Release notes generation
 * 
 * Part of MUSUBI v5.0.0 - Production Readiness
 * 
 * @module monitoring/release-manager
 * @version 1.0.0
 * 
 * @traceability
 * - Requirement: REQ-P5-003 (Release Automation)
 * - Design: docs/design/tdd-musubi-v5.0.0.md#3.3
 * - Test: tests/monitoring/release-manager.test.js
 */

const { EventEmitter } = require('events');

/**
 * Release States
 */
const ReleaseState = {
  PLANNING: 'planning',
  DEVELOPMENT: 'development',
  TESTING: 'testing',
  STAGING: 'staging',
  CANARY: 'canary',
  PRODUCTION: 'production',
  ROLLBACK: 'rollback',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

/**
 * Release Types
 */
const ReleaseType = {
  MAJOR: 'major',
  MINOR: 'minor',
  PATCH: 'patch',
  HOTFIX: 'hotfix',
  CANARY: 'canary'
};

/**
 * Feature Flag Status
 */
const FeatureFlagStatus = {
  ENABLED: 'enabled',
  DISABLED: 'disabled',
  PERCENTAGE: 'percentage',
  USER_LIST: 'user-list'
};

/**
 * Release definition
 */
class Release {
  constructor(options) {
    this.id = options.id || this._generateId();
    this.version = options.version;
    this.type = options.type || ReleaseType.MINOR;
    this.name = options.name || `Release ${options.version}`;
    this.description = options.description || '';
    this.state = options.state || ReleaseState.PLANNING;
    this.targetDate = options.targetDate || null;
    this.createdAt = options.createdAt || new Date();
    this.updatedAt = options.updatedAt || new Date();
    this.completedAt = null;
    
    this.features = options.features || [];
    this.bugFixes = options.bugFixes || [];
    this.breakingChanges = options.breakingChanges || [];
    this.dependencies = options.dependencies || [];
    
    this.rolloutStrategy = options.rolloutStrategy || {
      type: 'percentage',
      stages: [
        { percentage: 1, duration: '1h' },
        { percentage: 10, duration: '2h' },
        { percentage: 50, duration: '4h' },
        { percentage: 100, duration: null }
      ]
    };
    
    this.rollbackPlan = options.rollbackPlan || {
      automatic: true,
      triggers: ['error_rate > 5%', 'latency_p99 > 2s'],
      procedure: []
    };
    
    this.metrics = {
      errorsBefore: null,
      errorsAfter: null,
      latencyBefore: null,
      latencyAfter: null
    };
    
    this.history = [];
    this._addHistory('created', { version: this.version });
  }

  /**
   * Transition to a new state
   */
  transitionTo(newState, metadata = {}) {
    const validTransitions = {
      [ReleaseState.PLANNING]: [ReleaseState.DEVELOPMENT, ReleaseState.CANCELLED],
      [ReleaseState.DEVELOPMENT]: [ReleaseState.TESTING, ReleaseState.CANCELLED],
      [ReleaseState.TESTING]: [ReleaseState.STAGING, ReleaseState.DEVELOPMENT, ReleaseState.CANCELLED],
      [ReleaseState.STAGING]: [ReleaseState.CANARY, ReleaseState.PRODUCTION, ReleaseState.TESTING, ReleaseState.CANCELLED],
      [ReleaseState.CANARY]: [ReleaseState.PRODUCTION, ReleaseState.ROLLBACK],
      [ReleaseState.PRODUCTION]: [ReleaseState.COMPLETED, ReleaseState.ROLLBACK],
      [ReleaseState.ROLLBACK]: [ReleaseState.TESTING, ReleaseState.CANCELLED],
      [ReleaseState.COMPLETED]: [],
      [ReleaseState.CANCELLED]: []
    };

    const allowed = validTransitions[this.state] || [];
    if (!allowed.includes(newState)) {
      throw new Error(`Invalid transition from ${this.state} to ${newState}`);
    }

    const previousState = this.state;
    this.state = newState;
    this.updatedAt = new Date();
    
    if (newState === ReleaseState.COMPLETED) {
      this.completedAt = new Date();
    }

    this._addHistory('transition', { 
      from: previousState, 
      to: newState,
      ...metadata 
    });

    return this;
  }

  /**
   * Add a feature to the release
   */
  addFeature(feature) {
    this.features.push({
      id: feature.id || `feat-${this.features.length + 1}`,
      title: feature.title,
      description: feature.description || '',
      jiraId: feature.jiraId || null,
      breaking: feature.breaking || false
    });
    this._addHistory('featureAdded', { feature: feature.title });
    return this;
  }

  /**
   * Add a bug fix to the release
   */
  addBugFix(bugFix) {
    this.bugFixes.push({
      id: bugFix.id || `fix-${this.bugFixes.length + 1}`,
      title: bugFix.title,
      description: bugFix.description || '',
      jiraId: bugFix.jiraId || null,
      severity: bugFix.severity || 'medium'
    });
    this._addHistory('bugFixAdded', { bugFix: bugFix.title });
    return this;
  }

  /**
   * Generate release notes
   */
  generateReleaseNotes(format = 'markdown') {
    const notes = {
      version: this.version,
      date: this.completedAt || new Date(),
      features: this.features,
      bugFixes: this.bugFixes,
      breakingChanges: this.breakingChanges
    };

    if (format === 'markdown') {
      return this._toMarkdown(notes);
    } else if (format === 'json') {
      return JSON.stringify(notes, null, 2);
    }
    return notes;
  }

  /**
   * Generate markdown release notes
   * @private
   */
  _toMarkdown(notes) {
    let md = `# ${this.name}\n\n`;
    md += `**Version:** ${notes.version}  \n`;
    md += `**Date:** ${notes.date.toISOString().split('T')[0]}  \n`;
    md += `**Type:** ${this.type}  \n\n`;

    if (this.description) {
      md += `${this.description}\n\n`;
    }

    if (notes.breakingChanges.length > 0) {
      md += `## ⚠️ Breaking Changes\n\n`;
      for (const change of notes.breakingChanges) {
        md += `- ${change.title}\n`;
        if (change.description) md += `  ${change.description}\n`;
      }
      md += '\n';
    }

    if (notes.features.length > 0) {
      md += `## ✨ New Features\n\n`;
      for (const feature of notes.features) {
        md += `- **${feature.title}**`;
        if (feature.jiraId) md += ` (${feature.jiraId})`;
        md += '\n';
        if (feature.description) md += `  ${feature.description}\n`;
      }
      md += '\n';
    }

    if (notes.bugFixes.length > 0) {
      md += `## 🐛 Bug Fixes\n\n`;
      for (const fix of notes.bugFixes) {
        md += `- ${fix.title}`;
        if (fix.jiraId) md += ` (${fix.jiraId})`;
        md += '\n';
      }
      md += '\n';
    }

    return md;
  }

  /**
   * Add history entry
   * @private
   */
  _addHistory(action, data) {
    this.history.push({
      action,
      timestamp: new Date(),
      data
    });
  }

  /**
   * Generate unique ID
   * @private
   */
  _generateId() {
    return `rel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON() {
    return {
      id: this.id,
      version: this.version,
      type: this.type,
      name: this.name,
      description: this.description,
      state: this.state,
      targetDate: this.targetDate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      completedAt: this.completedAt,
      features: this.features,
      bugFixes: this.bugFixes,
      breakingChanges: this.breakingChanges,
      rolloutStrategy: this.rolloutStrategy,
      rollbackPlan: this.rollbackPlan,
      history: this.history
    };
  }
}

/**
 * Feature Flag definition
 */
class FeatureFlag {
  constructor(options) {
    this.key = options.key;
    this.name = options.name || options.key;
    this.description = options.description || '';
    this.status = options.status || FeatureFlagStatus.DISABLED;
    this.percentage = options.percentage || 0;
    this.userList = options.userList || [];
    this.createdAt = options.createdAt || new Date();
    this.updatedAt = options.updatedAt || new Date();
    this.metadata = options.metadata || {};
  }

  /**
   * Enable the feature flag
   */
  enable() {
    this.status = FeatureFlagStatus.ENABLED;
    this.percentage = 100;
    this.updatedAt = new Date();
    return this;
  }

  /**
   * Disable the feature flag
   */
  disable() {
    this.status = FeatureFlagStatus.DISABLED;
    this.percentage = 0;
    this.updatedAt = new Date();
    return this;
  }

  /**
   * Set percentage rollout
   */
  setPercentage(pct) {
    if (pct < 0 || pct > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }
    this.status = FeatureFlagStatus.PERCENTAGE;
    this.percentage = pct;
    this.updatedAt = new Date();
    return this;
  }

  /**
   * Check if feature is enabled for a user
   */
  isEnabledFor(userId) {
    switch (this.status) {
      case FeatureFlagStatus.ENABLED:
        return true;
      
      case FeatureFlagStatus.DISABLED:
        return false;
      
      case FeatureFlagStatus.USER_LIST:
        return this.userList.includes(userId);
      
      case FeatureFlagStatus.PERCENTAGE: {
        // Consistent hashing based on userId
        const hash = this._hashString(`${this.key}:${userId}`);
        return (hash % 100) < this.percentage;
      }
      
      default:
        return false;
    }
  }

  /**
   * Simple string hash
   * @private
   */
  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  toJSON() {
    return {
      key: this.key,
      name: this.name,
      description: this.description,
      status: this.status,
      percentage: this.percentage,
      userList: this.userList,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata
    };
  }
}

/**
 * Release Manager
 */
class ReleaseManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.releases = new Map();
    this.featureFlags = new Map();
    this.options = {
      autoGenerateNotes: options.autoGenerateNotes !== false,
      ...options
    };
  }

  /**
   * Create a new release
   */
  createRelease(options) {
    const release = options instanceof Release ? options : new Release(options);
    this.releases.set(release.id, release);
    this.emit('releaseCreated', release);
    return release;
  }

  /**
   * Get a release by ID
   */
  getRelease(id) {
    return this.releases.get(id);
  }

  /**
   * Get release by version
   */
  getReleaseByVersion(version) {
    for (const release of this.releases.values()) {
      if (release.version === version) {
        return release;
      }
    }
    return null;
  }

  /**
   * List all releases
   */
  listReleases(filter = {}) {
    let releases = [...this.releases.values()];
    
    if (filter.state) {
      releases = releases.filter(r => r.state === filter.state);
    }
    if (filter.type) {
      releases = releases.filter(r => r.type === filter.type);
    }
    
    return releases.map(r => r.toJSON());
  }

  /**
   * Transition a release to a new state
   */
  transitionRelease(releaseId, newState, metadata = {}) {
    const release = this.releases.get(releaseId);
    if (!release) {
      throw new Error(`Release not found: ${releaseId}`);
    }
    
    release.transitionTo(newState, metadata);
    this.emit('releaseTransitioned', { release, newState });
    return release;
  }

  /**
   * Create a feature flag
   */
  createFeatureFlag(options) {
    const flag = options instanceof FeatureFlag ? options : new FeatureFlag(options);
    this.featureFlags.set(flag.key, flag);
    this.emit('featureFlagCreated', flag);
    return flag;
  }

  /**
   * Get a feature flag
   */
  getFeatureFlag(key) {
    return this.featureFlags.get(key);
  }

  /**
   * List all feature flags
   */
  listFeatureFlags() {
    return [...this.featureFlags.values()].map(f => f.toJSON());
  }

  /**
   * Check if a feature is enabled for a user
   */
  isFeatureEnabled(flagKey, userId = null) {
    const flag = this.featureFlags.get(flagKey);
    if (!flag) return false;
    
    if (userId) {
      return flag.isEnabledFor(userId);
    }
    return flag.status === FeatureFlagStatus.ENABLED;
  }

  /**
   * Enable a feature flag
   */
  enableFeatureFlag(key) {
    const flag = this.featureFlags.get(key);
    if (!flag) throw new Error(`Feature flag not found: ${key}`);
    flag.enable();
    this.emit('featureFlagEnabled', flag);
    return flag;
  }

  /**
   * Disable a feature flag
   */
  disableFeatureFlag(key) {
    const flag = this.featureFlags.get(key);
    if (!flag) throw new Error(`Feature flag not found: ${key}`);
    flag.disable();
    this.emit('featureFlagDisabled', flag);
    return flag;
  }

  /**
   * Set feature flag percentage
   */
  setFeatureFlagPercentage(key, percentage) {
    const flag = this.featureFlags.get(key);
    if (!flag) throw new Error(`Feature flag not found: ${key}`);
    flag.setPercentage(percentage);
    this.emit('featureFlagUpdated', flag);
    return flag;
  }

  /**
   * Generate rollback procedure for a release
   */
  generateRollbackProcedure(releaseId) {
    const release = this.releases.get(releaseId);
    if (!release) throw new Error(`Release not found: ${releaseId}`);

    return {
      releaseId: release.id,
      version: release.version,
      steps: [
        {
          order: 1,
          action: 'notify',
          description: 'Notify team of rollback initiation',
          command: null
        },
        {
          order: 2,
          action: 'disable-flags',
          description: 'Disable all new feature flags',
          command: 'musubi release disable-flags --version ' + release.version
        },
        {
          order: 3,
          action: 'scale-down',
          description: 'Scale down new deployment',
          command: 'kubectl scale deployment app-v' + release.version + ' --replicas=0'
        },
        {
          order: 4,
          action: 'traffic-shift',
          description: 'Shift traffic to previous version',
          command: 'kubectl rollout undo deployment/app'
        },
        {
          order: 5,
          action: 'verify',
          description: 'Verify rollback success',
          command: 'curl -f http://app/health'
        },
        {
          order: 6,
          action: 'notify-complete',
          description: 'Notify team of rollback completion',
          command: null
        }
      ],
      automaticTriggers: release.rollbackPlan.triggers,
      estimatedDuration: '5-10 minutes'
    };
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    const releases = [...this.releases.values()];
    const flags = [...this.featureFlags.values()];

    return {
      totalReleases: releases.length,
      releasesByState: this._countBy(releases, 'state'),
      releasesByType: this._countBy(releases, 'type'),
      totalFeatureFlags: flags.length,
      enabledFlags: flags.filter(f => f.status === FeatureFlagStatus.ENABLED).length,
      disabledFlags: flags.filter(f => f.status === FeatureFlagStatus.DISABLED).length,
      percentageFlags: flags.filter(f => f.status === FeatureFlagStatus.PERCENTAGE).length
    };
  }

  /**
   * Count items by property
   * @private
   */
  _countBy(items, prop) {
    return items.reduce((acc, item) => {
      acc[item[prop]] = (acc[item[prop]] || 0) + 1;
      return acc;
    }, {});
  }
}

/**
 * Create a release manager
 */
function createReleaseManager(options = {}) {
  return new ReleaseManager(options);
}

module.exports = {
  // Classes
  Release,
  FeatureFlag,
  ReleaseManager,
  
  // Constants
  ReleaseState,
  ReleaseType,
  FeatureFlagStatus,
  
  // Factory
  createReleaseManager
};
