/**
 * Multi-Tenant Support Module
 *
 * Phase 6 P0: Enterprise Multi-Tenancy
 *
 * Features:
 * - Tenant context management
 * - Isolated storage namespaces
 * - Role-based access control (RBAC)
 * - Usage quotas and limits
 * - Audit logging
 *
 * @module src/enterprise/multi-tenant
 */

'use strict';

/**
 * Tenant roles
 */
const TenantRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
  GUEST: 'guest',
};

/**
 * Permission levels
 */
const Permission = {
  // Resource permissions
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  ADMIN: 'admin',

  // Feature permissions
  ORCHESTRATE: 'orchestrate',
  ANALYZE: 'analyze',
  GENERATE: 'generate',
  VALIDATE: 'validate',

  // Tenant permissions
  MANAGE_USERS: 'manage_users',
  MANAGE_QUOTAS: 'manage_quotas',
  VIEW_AUDIT: 'view_audit',
  BILLING: 'billing',
};

/**
 * Role permission mappings
 */
const ROLE_PERMISSIONS = {
  [TenantRole.OWNER]: Object.values(Permission),
  [TenantRole.ADMIN]: [
    Permission.READ,
    Permission.WRITE,
    Permission.DELETE,
    Permission.ORCHESTRATE,
    Permission.ANALYZE,
    Permission.GENERATE,
    Permission.VALIDATE,
    Permission.MANAGE_USERS,
    Permission.VIEW_AUDIT,
  ],
  [TenantRole.MEMBER]: [
    Permission.READ,
    Permission.WRITE,
    Permission.ORCHESTRATE,
    Permission.ANALYZE,
    Permission.GENERATE,
    Permission.VALIDATE,
  ],
  [TenantRole.VIEWER]: [Permission.READ, Permission.ANALYZE],
  [TenantRole.GUEST]: [Permission.READ],
};

/**
 * Tenant configuration
 */
class TenantConfig {
  /**
   * @param {Object} options
   * @param {string} options.id - Tenant ID
   * @param {string} options.name - Tenant name
   * @param {string} options.plan - Subscription plan
   * @param {Object} options.quotas - Usage quotas
   * @param {Object} options.settings - Tenant settings
   */
  constructor(options = {}) {
    this.id = options.id || this._generateId();
    this.name = options.name || 'Default Tenant';
    this.plan = options.plan || 'free';
    this.createdAt = options.createdAt || new Date().toISOString();
    this.updatedAt = options.updatedAt || new Date().toISOString();

    this.quotas = {
      maxTokensPerDay: options.quotas?.maxTokensPerDay || 100000,
      maxRequestsPerHour: options.quotas?.maxRequestsPerHour || 100,
      maxStorageMB: options.quotas?.maxStorageMB || 100,
      maxUsers: options.quotas?.maxUsers || 5,
      maxProjects: options.quotas?.maxProjects || 10,
      ...options.quotas,
    };

    this.settings = {
      defaultModel: options.settings?.defaultModel || 'gpt-4',
      allowedModels: options.settings?.allowedModels || ['gpt-4', 'gpt-3.5-turbo'],
      features: options.settings?.features || [],
      ...options.settings,
    };

    this.metadata = options.metadata || {};
  }

  _generateId() {
    return `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if a feature is enabled
   * @param {string} feature
   * @returns {boolean}
   */
  hasFeature(feature) {
    return this.settings.features.includes(feature);
  }

  /**
   * Update quotas
   * @param {Object} quotas
   */
  updateQuotas(quotas) {
    this.quotas = { ...this.quotas, ...quotas };
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Serialize to JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      plan: this.plan,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      quotas: this.quotas,
      settings: this.settings,
      metadata: this.metadata,
    };
  }
}

/**
 * Tenant user
 */
class TenantUser {
  /**
   * @param {Object} options
   * @param {string} options.id - User ID
   * @param {string} options.tenantId - Tenant ID
   * @param {string} options.email - User email
   * @param {string} options.role - User role
   */
  constructor(options = {}) {
    this.id = options.id || this._generateId();
    this.tenantId = options.tenantId;
    this.email = options.email;
    this.name = options.name || '';
    this.role = options.role || TenantRole.MEMBER;
    this.permissions = options.permissions || ROLE_PERMISSIONS[this.role] || [];
    this.createdAt = options.createdAt || new Date().toISOString();
    this.lastActiveAt = options.lastActiveAt || null;
    this.metadata = options.metadata || {};
  }

  _generateId() {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if user has permission
   * @param {string} permission
   * @returns {boolean}
   */
  hasPermission(permission) {
    return this.permissions.includes(permission);
  }

  /**
   * Check if user has any of the permissions
   * @param {string[]} permissions
   * @returns {boolean}
   */
  hasAnyPermission(permissions) {
    return permissions.some(p => this.permissions.includes(p));
  }

  /**
   * Check if user has all permissions
   * @param {string[]} permissions
   * @returns {boolean}
   */
  hasAllPermissions(permissions) {
    return permissions.every(p => this.permissions.includes(p));
  }

  /**
   * Update role and permissions
   * @param {string} role
   */
  setRole(role) {
    this.role = role;
    this.permissions = ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Serialize to JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      email: this.email,
      name: this.name,
      role: this.role,
      permissions: this.permissions,
      createdAt: this.createdAt,
      lastActiveAt: this.lastActiveAt,
      metadata: this.metadata,
    };
  }
}

/**
 * Tenant context for request scoping
 */
class TenantContext {
  constructor(tenant, user = null) {
    this.tenant = tenant;
    this.user = user;
    this.requestId = this._generateRequestId();
    this.startTime = Date.now();
    this.metadata = {};
  }

  _generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get tenant ID
   * @returns {string}
   */
  getTenantId() {
    return this.tenant?.id;
  }

  /**
   * Get user ID
   * @returns {string|null}
   */
  getUserId() {
    return this.user?.id || null;
  }

  /**
   * Check if user has permission
   * @param {string} permission
   * @returns {boolean}
   */
  hasPermission(permission) {
    if (!this.user) return false;
    return this.user.hasPermission(permission);
  }

  /**
   * Get namespaced storage key
   * @param {string} key
   * @returns {string}
   */
  getStorageKey(key) {
    return `${this.tenant.id}:${key}`;
  }

  /**
   * Get request duration
   * @returns {number}
   */
  getDuration() {
    return Date.now() - this.startTime;
  }

  /**
   * Create audit entry
   * @param {string} action
   * @param {Object} details
   * @returns {Object}
   */
  createAuditEntry(action, details = {}) {
    return {
      requestId: this.requestId,
      tenantId: this.getTenantId(),
      userId: this.getUserId(),
      action,
      details,
      timestamp: new Date().toISOString(),
      duration: this.getDuration(),
    };
  }
}

/**
 * Usage tracker for quota management
 */
class UsageTracker {
  constructor() {
    this.usage = new Map();
    this.windows = new Map();
  }

  /**
   * Get usage key
   * @private
   */
  _getKey(tenantId, metric, period) {
    const periodKey = this._getPeriodKey(period);
    return `${tenantId}:${metric}:${periodKey}`;
  }

  /**
   * Get period key based on current time
   * @private
   */
  _getPeriodKey(period) {
    const now = new Date();
    switch (period) {
      case 'hour':
        return `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}`;
      case 'day':
        return `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
      case 'month':
        return `${now.getUTCFullYear()}-${now.getUTCMonth()}`;
      default:
        return 'all';
    }
  }

  /**
   * Track usage
   * @param {string} tenantId
   * @param {string} metric
   * @param {number} amount
   * @param {string} period
   */
  track(tenantId, metric, amount = 1, period = 'day') {
    const key = this._getKey(tenantId, metric, period);
    const current = this.usage.get(key) || 0;
    this.usage.set(key, current + amount);
  }

  /**
   * Get current usage
   * @param {string} tenantId
   * @param {string} metric
   * @param {string} period
   * @returns {number}
   */
  getUsage(tenantId, metric, period = 'day') {
    const key = this._getKey(tenantId, metric, period);
    return this.usage.get(key) || 0;
  }

  /**
   * Check if within quota
   * @param {string} tenantId
   * @param {string} metric
   * @param {number} limit
   * @param {string} period
   * @returns {boolean}
   */
  isWithinQuota(tenantId, metric, limit, period = 'day') {
    return this.getUsage(tenantId, metric, period) < limit;
  }

  /**
   * Get remaining quota
   * @param {string} tenantId
   * @param {string} metric
   * @param {number} limit
   * @param {string} period
   * @returns {number}
   */
  getRemainingQuota(tenantId, metric, limit, period = 'day') {
    const used = this.getUsage(tenantId, metric, period);
    return Math.max(0, limit - used);
  }

  /**
   * Get all usage for a tenant
   * @param {string} tenantId
   * @returns {Object}
   */
  getTenantUsage(tenantId) {
    const usage = {};
    for (const [key, value] of this.usage.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        const parts = key.split(':');
        const metric = parts[1];
        const period = parts[2];
        if (!usage[metric]) usage[metric] = {};
        usage[metric][period] = value;
      }
    }
    return usage;
  }

  /**
   * Reset usage for a tenant
   * @param {string} tenantId
   */
  resetTenantUsage(tenantId) {
    for (const key of this.usage.keys()) {
      if (key.startsWith(`${tenantId}:`)) {
        this.usage.delete(key);
      }
    }
  }

  /**
   * Clean up old entries
   */
  cleanup() {
    // Remove entries older than current period
    const now = new Date();
    const currentDay = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;

    for (const key of this.usage.keys()) {
      const parts = key.split(':');
      const period = parts[2];
      if (period && !period.startsWith(currentDay.substring(0, 10))) {
        this.usage.delete(key);
      }
    }
  }
}

/**
 * Audit logger for compliance
 */
class AuditLogger {
  constructor(options = {}) {
    this.logs = [];
    this.maxLogs = options.maxLogs || 10000;
    this.listeners = [];
  }

  /**
   * Log an audit event
   * @param {Object} entry
   */
  log(entry) {
    const auditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...entry,
      loggedAt: new Date().toISOString(),
    };

    this.logs.push(auditEntry);

    // Trim if over limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(auditEntry);
      } catch (_e) {
        // Ignore listener errors
      }
    }

    return auditEntry;
  }

  /**
   * Add audit listener
   * @param {Function} listener
   */
  addListener(listener) {
    this.listeners.push(listener);
  }

  /**
   * Remove audit listener
   * @param {Function} listener
   */
  removeListener(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Query audit logs
   * @param {Object} query
   * @returns {Object[]}
   */
  query(query = {}) {
    let results = [...this.logs];

    if (query.tenantId) {
      results = results.filter(e => e.tenantId === query.tenantId);
    }

    if (query.userId) {
      results = results.filter(e => e.userId === query.userId);
    }

    if (query.action) {
      results = results.filter(e => e.action === query.action);
    }

    if (query.startDate) {
      const start = new Date(query.startDate);
      results = results.filter(e => new Date(e.timestamp) >= start);
    }

    if (query.endDate) {
      const end = new Date(query.endDate);
      results = results.filter(e => new Date(e.timestamp) <= end);
    }

    if (query.limit) {
      results = results.slice(-query.limit);
    }

    return results;
  }

  /**
   * Export logs for a tenant
   * @param {string} tenantId
   * @returns {Object[]}
   */
  exportTenantLogs(tenantId) {
    return this.logs.filter(e => e.tenantId === tenantId);
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    const byTenant = {};
    const byAction = {};

    for (const log of this.logs) {
      byTenant[log.tenantId] = (byTenant[log.tenantId] || 0) + 1;
      byAction[log.action] = (byAction[log.action] || 0) + 1;
    }

    return {
      totalLogs: this.logs.length,
      byTenant,
      byAction,
      oldestLog: this.logs[0]?.timestamp,
      newestLog: this.logs[this.logs.length - 1]?.timestamp,
    };
  }

  /**
   * Clear logs
   * @param {string} tenantId - Optional tenant to clear
   */
  clear(tenantId = null) {
    if (tenantId) {
      this.logs = this.logs.filter(e => e.tenantId !== tenantId);
    } else {
      this.logs = [];
    }
  }
}

/**
 * Tenant manager - main entry point for multi-tenant operations
 */
class TenantManager {
  constructor(options = {}) {
    this.tenants = new Map();
    this.users = new Map();
    this.usageTracker = new UsageTracker();
    this.auditLogger = new AuditLogger(options.audit);
    this.currentContext = null;
  }

  /**
   * Create a new tenant
   * @param {Object} config
   * @returns {TenantConfig}
   */
  createTenant(config) {
    const tenant = new TenantConfig(config);
    this.tenants.set(tenant.id, tenant);

    this.auditLogger.log({
      tenantId: tenant.id,
      action: 'tenant.created',
      details: { name: tenant.name, plan: tenant.plan },
      timestamp: new Date().toISOString(),
    });

    return tenant;
  }

  /**
   * Get tenant by ID
   * @param {string} tenantId
   * @returns {TenantConfig|undefined}
   */
  getTenant(tenantId) {
    return this.tenants.get(tenantId);
  }

  /**
   * Update tenant
   * @param {string} tenantId
   * @param {Object} updates
   * @returns {TenantConfig|null}
   */
  updateTenant(tenantId, updates) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return null;

    if (updates.name) tenant.name = updates.name;
    if (updates.plan) tenant.plan = updates.plan;
    if (updates.quotas) tenant.updateQuotas(updates.quotas);
    if (updates.settings) tenant.settings = { ...tenant.settings, ...updates.settings };
    if (updates.metadata) tenant.metadata = { ...tenant.metadata, ...updates.metadata };

    tenant.updatedAt = new Date().toISOString();

    this.auditLogger.log({
      tenantId: tenant.id,
      action: 'tenant.updated',
      details: updates,
      timestamp: new Date().toISOString(),
    });

    return tenant;
  }

  /**
   * Delete tenant
   * @param {string} tenantId
   * @returns {boolean}
   */
  deleteTenant(tenantId) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return false;

    // Remove all users
    for (const [userId, user] of this.users.entries()) {
      if (user.tenantId === tenantId) {
        this.users.delete(userId);
      }
    }

    // Clear usage
    this.usageTracker.resetTenantUsage(tenantId);

    // Remove tenant
    this.tenants.delete(tenantId);

    this.auditLogger.log({
      tenantId,
      action: 'tenant.deleted',
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  /**
   * Add user to tenant
   * @param {string} tenantId
   * @param {Object} userData
   * @returns {TenantUser|null}
   */
  addUser(tenantId, userData) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return null;

    // Check user limit
    const currentUsers = this.getTenantUsers(tenantId).length;
    if (currentUsers >= tenant.quotas.maxUsers) {
      throw new Error(`User limit reached for tenant ${tenantId}`);
    }

    const user = new TenantUser({ ...userData, tenantId });
    this.users.set(user.id, user);

    this.auditLogger.log({
      tenantId,
      userId: user.id,
      action: 'user.added',
      details: { email: user.email, role: user.role },
      timestamp: new Date().toISOString(),
    });

    return user;
  }

  /**
   * Get user by ID
   * @param {string} userId
   * @returns {TenantUser|undefined}
   */
  getUser(userId) {
    return this.users.get(userId);
  }

  /**
   * Get all users for a tenant
   * @param {string} tenantId
   * @returns {TenantUser[]}
   */
  getTenantUsers(tenantId) {
    return Array.from(this.users.values()).filter(u => u.tenantId === tenantId);
  }

  /**
   * Update user
   * @param {string} userId
   * @param {Object} updates
   * @returns {TenantUser|null}
   */
  updateUser(userId, updates) {
    const user = this.users.get(userId);
    if (!user) return null;

    if (updates.name) user.name = updates.name;
    if (updates.role) user.setRole(updates.role);
    if (updates.metadata) user.metadata = { ...user.metadata, ...updates.metadata };

    this.auditLogger.log({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'user.updated',
      details: updates,
      timestamp: new Date().toISOString(),
    });

    return user;
  }

  /**
   * Remove user
   * @param {string} userId
   * @returns {boolean}
   */
  removeUser(userId) {
    const user = this.users.get(userId);
    if (!user) return false;

    this.users.delete(userId);

    this.auditLogger.log({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'user.removed',
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  /**
   * Create context for a request
   * @param {string} tenantId
   * @param {string} userId
   * @returns {TenantContext}
   */
  createContext(tenantId, userId = null) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const user = userId ? this.users.get(userId) : null;
    if (userId && !user) {
      throw new Error(`User ${userId} not found`);
    }

    if (user && user.tenantId !== tenantId) {
      throw new Error(`User ${userId} does not belong to tenant ${tenantId}`);
    }

    const context = new TenantContext(tenant, user);
    this.currentContext = context;

    return context;
  }

  /**
   * Get current context
   * @returns {TenantContext|null}
   */
  getCurrentContext() {
    return this.currentContext;
  }

  /**
   * Track usage for current context
   * @param {string} metric
   * @param {number} amount
   */
  trackUsage(metric, amount = 1) {
    if (this.currentContext) {
      this.usageTracker.track(this.currentContext.getTenantId(), metric, amount);
    }
  }

  /**
   * Check quota for current context
   * @param {string} metric
   * @returns {boolean}
   */
  checkQuota(metric) {
    if (!this.currentContext) return true;

    const tenant = this.currentContext.tenant;
    const quotaMap = {
      tokens: { limit: tenant.quotas.maxTokensPerDay, period: 'day' },
      requests: { limit: tenant.quotas.maxRequestsPerHour, period: 'hour' },
    };

    const quota = quotaMap[metric];
    if (!quota) return true;

    return this.usageTracker.isWithinQuota(
      tenant.id,
      metric,
      quota.limit,
      quota.period
    );
  }

  /**
   * Log audit event for current context
   * @param {string} action
   * @param {Object} details
   */
  audit(action, details = {}) {
    if (this.currentContext) {
      const entry = this.currentContext.createAuditEntry(action, details);
      this.auditLogger.log(entry);
    }
  }

  /**
   * Get usage statistics for a tenant
   * @param {string} tenantId
   * @returns {Object}
   */
  getTenantStats(tenantId) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return null;

    return {
      tenant: tenant.toJSON(),
      users: this.getTenantUsers(tenantId).map(u => u.toJSON()),
      usage: this.usageTracker.getTenantUsage(tenantId),
      auditCount: this.auditLogger.exportTenantLogs(tenantId).length,
    };
  }

  /**
   * List all tenants
   * @returns {TenantConfig[]}
   */
  listTenants() {
    return Array.from(this.tenants.values());
  }

  /**
   * Get overall statistics
   * @returns {Object}
   */
  getStats() {
    return {
      tenantCount: this.tenants.size,
      userCount: this.users.size,
      audit: this.auditLogger.getStats(),
    };
  }
}

// Default instance
const defaultTenantManager = new TenantManager();

module.exports = {
  TenantRole,
  Permission,
  ROLE_PERMISSIONS,
  TenantConfig,
  TenantUser,
  TenantContext,
  UsageTracker,
  AuditLogger,
  TenantManager,
  defaultTenantManager,
};
