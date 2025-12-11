/**
 * Multi-Tenant Support Tests
 *
 * Phase 6 P0: Enterprise Multi-Tenancy
 */

'use strict';

const {
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
} = require('../../src/enterprise/multi-tenant');

describe('Multi-Tenant Module', () => {
  // ============================================================
  // TenantRole Tests
  // ============================================================
  describe('TenantRole', () => {
    it('should define all roles', () => {
      expect(TenantRole.OWNER).toBe('owner');
      expect(TenantRole.ADMIN).toBe('admin');
      expect(TenantRole.MEMBER).toBe('member');
      expect(TenantRole.VIEWER).toBe('viewer');
      expect(TenantRole.GUEST).toBe('guest');
    });
  });

  // ============================================================
  // Permission Tests
  // ============================================================
  describe('Permission', () => {
    it('should define resource permissions', () => {
      expect(Permission.READ).toBe('read');
      expect(Permission.WRITE).toBe('write');
      expect(Permission.DELETE).toBe('delete');
      expect(Permission.ADMIN).toBe('admin');
    });

    it('should define feature permissions', () => {
      expect(Permission.ORCHESTRATE).toBe('orchestrate');
      expect(Permission.ANALYZE).toBe('analyze');
      expect(Permission.GENERATE).toBe('generate');
      expect(Permission.VALIDATE).toBe('validate');
    });

    it('should define tenant permissions', () => {
      expect(Permission.MANAGE_USERS).toBe('manage_users');
      expect(Permission.MANAGE_QUOTAS).toBe('manage_quotas');
      expect(Permission.VIEW_AUDIT).toBe('view_audit');
      expect(Permission.BILLING).toBe('billing');
    });
  });

  // ============================================================
  // ROLE_PERMISSIONS Tests
  // ============================================================
  describe('ROLE_PERMISSIONS', () => {
    it('should give owner all permissions', () => {
      expect(ROLE_PERMISSIONS[TenantRole.OWNER]).toEqual(Object.values(Permission));
    });

    it('should give admin most permissions except billing', () => {
      const adminPerms = ROLE_PERMISSIONS[TenantRole.ADMIN];
      expect(adminPerms).toContain(Permission.READ);
      expect(adminPerms).toContain(Permission.WRITE);
      expect(adminPerms).toContain(Permission.DELETE);
      expect(adminPerms).toContain(Permission.MANAGE_USERS);
      expect(adminPerms).not.toContain(Permission.BILLING);
    });

    it('should give member operational permissions', () => {
      const memberPerms = ROLE_PERMISSIONS[TenantRole.MEMBER];
      expect(memberPerms).toContain(Permission.READ);
      expect(memberPerms).toContain(Permission.WRITE);
      expect(memberPerms).toContain(Permission.ORCHESTRATE);
      expect(memberPerms).not.toContain(Permission.DELETE);
      expect(memberPerms).not.toContain(Permission.MANAGE_USERS);
    });

    it('should give viewer read-only access', () => {
      const viewerPerms = ROLE_PERMISSIONS[TenantRole.VIEWER];
      expect(viewerPerms).toContain(Permission.READ);
      expect(viewerPerms).toContain(Permission.ANALYZE);
      expect(viewerPerms).not.toContain(Permission.WRITE);
    });

    it('should give guest minimal access', () => {
      const guestPerms = ROLE_PERMISSIONS[TenantRole.GUEST];
      expect(guestPerms).toEqual([Permission.READ]);
    });
  });

  // ============================================================
  // TenantConfig Tests
  // ============================================================
  describe('TenantConfig', () => {
    it('should create with default values', () => {
      const tenant = new TenantConfig();
      expect(tenant.id).toMatch(/^tenant_/);
      expect(tenant.name).toBe('Default Tenant');
      expect(tenant.plan).toBe('free');
      expect(tenant.quotas.maxTokensPerDay).toBe(100000);
      expect(tenant.quotas.maxUsers).toBe(5);
    });

    it('should create with custom values', () => {
      const tenant = new TenantConfig({
        id: 'custom-tenant',
        name: 'My Company',
        plan: 'enterprise',
        quotas: {
          maxTokensPerDay: 1000000,
          maxUsers: 100,
        },
      });

      expect(tenant.id).toBe('custom-tenant');
      expect(tenant.name).toBe('My Company');
      expect(tenant.plan).toBe('enterprise');
      expect(tenant.quotas.maxTokensPerDay).toBe(1000000);
      expect(tenant.quotas.maxUsers).toBe(100);
    });

    it('should check for features', () => {
      const tenant = new TenantConfig({
        settings: {
          features: ['advanced-ai', 'custom-models'],
        },
      });

      expect(tenant.hasFeature('advanced-ai')).toBe(true);
      expect(tenant.hasFeature('custom-models')).toBe(true);
      expect(tenant.hasFeature('non-existent')).toBe(false);
    });

    it('should update quotas', async () => {
      const tenant = new TenantConfig();
      const originalUpdated = tenant.updatedAt;

      // Wait a tick to ensure time difference
      await new Promise((r) => setTimeout(r, 5));
      tenant.updateQuotas({ maxTokensPerDay: 500000 });

      expect(tenant.quotas.maxTokensPerDay).toBe(500000);
      expect(tenant.updatedAt).not.toBe(originalUpdated);
    });

    it('should serialize to JSON', () => {
      const tenant = new TenantConfig({ name: 'Test' });
      const json = tenant.toJSON();

      expect(json.id).toBeDefined();
      expect(json.name).toBe('Test');
      expect(json.quotas).toBeDefined();
      expect(json.settings).toBeDefined();
    });
  });

  // ============================================================
  // TenantUser Tests
  // ============================================================
  describe('TenantUser', () => {
    it('should create with default values', () => {
      const user = new TenantUser({
        tenantId: 'tenant-1',
        email: 'user@example.com',
      });

      expect(user.id).toMatch(/^user_/);
      expect(user.tenantId).toBe('tenant-1');
      expect(user.email).toBe('user@example.com');
      expect(user.role).toBe(TenantRole.MEMBER);
    });

    it('should create with custom role', () => {
      const user = new TenantUser({
        tenantId: 'tenant-1',
        email: 'admin@example.com',
        role: TenantRole.ADMIN,
      });

      expect(user.role).toBe(TenantRole.ADMIN);
      expect(user.permissions).toEqual(ROLE_PERMISSIONS[TenantRole.ADMIN]);
    });

    it('should check single permission', () => {
      const user = new TenantUser({
        tenantId: 'tenant-1',
        email: 'member@example.com',
        role: TenantRole.MEMBER,
      });

      expect(user.hasPermission(Permission.READ)).toBe(true);
      expect(user.hasPermission(Permission.WRITE)).toBe(true);
      expect(user.hasPermission(Permission.DELETE)).toBe(false);
    });

    it('should check any of permissions', () => {
      const user = new TenantUser({
        tenantId: 'tenant-1',
        email: 'viewer@example.com',
        role: TenantRole.VIEWER,
      });

      expect(user.hasAnyPermission([Permission.WRITE, Permission.READ])).toBe(true);
      expect(user.hasAnyPermission([Permission.DELETE, Permission.ADMIN])).toBe(false);
    });

    it('should check all permissions', () => {
      const user = new TenantUser({
        tenantId: 'tenant-1',
        email: 'member@example.com',
        role: TenantRole.MEMBER,
      });

      expect(user.hasAllPermissions([Permission.READ, Permission.WRITE])).toBe(true);
      expect(user.hasAllPermissions([Permission.READ, Permission.DELETE])).toBe(false);
    });

    it('should update role', () => {
      const user = new TenantUser({
        tenantId: 'tenant-1',
        email: 'user@example.com',
        role: TenantRole.MEMBER,
      });

      user.setRole(TenantRole.ADMIN);

      expect(user.role).toBe(TenantRole.ADMIN);
      expect(user.permissions).toEqual(ROLE_PERMISSIONS[TenantRole.ADMIN]);
    });

    it('should serialize to JSON', () => {
      const user = new TenantUser({
        tenantId: 'tenant-1',
        email: 'user@example.com',
        name: 'Test User',
      });

      const json = user.toJSON();

      expect(json.id).toBeDefined();
      expect(json.tenantId).toBe('tenant-1');
      expect(json.email).toBe('user@example.com');
      expect(json.name).toBe('Test User');
    });
  });

  // ============================================================
  // TenantContext Tests
  // ============================================================
  describe('TenantContext', () => {
    let tenant;
    let user;

    beforeEach(() => {
      tenant = new TenantConfig({ id: 'test-tenant' });
      user = new TenantUser({
        tenantId: 'test-tenant',
        email: 'user@test.com',
        role: TenantRole.MEMBER,
      });
    });

    it('should create context with tenant and user', () => {
      const context = new TenantContext(tenant, user);

      expect(context.tenant).toBe(tenant);
      expect(context.user).toBe(user);
      expect(context.requestId).toMatch(/^req_/);
    });

    it('should create context without user', () => {
      const context = new TenantContext(tenant);

      expect(context.tenant).toBe(tenant);
      expect(context.user).toBeNull();
    });

    it('should get tenant ID', () => {
      const context = new TenantContext(tenant, user);
      expect(context.getTenantId()).toBe('test-tenant');
    });

    it('should get user ID', () => {
      const context = new TenantContext(tenant, user);
      expect(context.getUserId()).toBe(user.id);

      const contextNoUser = new TenantContext(tenant);
      expect(contextNoUser.getUserId()).toBeNull();
    });

    it('should check permissions via context', () => {
      const context = new TenantContext(tenant, user);

      expect(context.hasPermission(Permission.READ)).toBe(true);
      expect(context.hasPermission(Permission.DELETE)).toBe(false);
    });

    it('should return false for permissions without user', () => {
      const context = new TenantContext(tenant);
      expect(context.hasPermission(Permission.READ)).toBe(false);
    });

    it('should get namespaced storage key', () => {
      const context = new TenantContext(tenant, user);
      expect(context.getStorageKey('settings')).toBe('test-tenant:settings');
    });

    it('should track duration', async () => {
      const context = new TenantContext(tenant, user);
      await new Promise(r => setTimeout(r, 10));
      expect(context.getDuration()).toBeGreaterThanOrEqual(10);
    });

    it('should create audit entry', () => {
      const context = new TenantContext(tenant, user);
      const entry = context.createAuditEntry('test.action', { key: 'value' });

      expect(entry.requestId).toBe(context.requestId);
      expect(entry.tenantId).toBe('test-tenant');
      expect(entry.userId).toBe(user.id);
      expect(entry.action).toBe('test.action');
      expect(entry.details).toEqual({ key: 'value' });
      expect(entry.timestamp).toBeDefined();
    });
  });

  // ============================================================
  // UsageTracker Tests
  // ============================================================
  describe('UsageTracker', () => {
    let tracker;

    beforeEach(() => {
      tracker = new UsageTracker();
    });

    it('should track usage', () => {
      tracker.track('tenant-1', 'tokens', 100);
      tracker.track('tenant-1', 'tokens', 50);

      expect(tracker.getUsage('tenant-1', 'tokens')).toBe(150);
    });

    it('should track different metrics separately', () => {
      tracker.track('tenant-1', 'tokens', 100);
      tracker.track('tenant-1', 'requests', 5);

      expect(tracker.getUsage('tenant-1', 'tokens')).toBe(100);
      expect(tracker.getUsage('tenant-1', 'requests')).toBe(5);
    });

    it('should track different tenants separately', () => {
      tracker.track('tenant-1', 'tokens', 100);
      tracker.track('tenant-2', 'tokens', 200);

      expect(tracker.getUsage('tenant-1', 'tokens')).toBe(100);
      expect(tracker.getUsage('tenant-2', 'tokens')).toBe(200);
    });

    it('should check quota', () => {
      tracker.track('tenant-1', 'tokens', 80);

      expect(tracker.isWithinQuota('tenant-1', 'tokens', 100)).toBe(true);
      expect(tracker.isWithinQuota('tenant-1', 'tokens', 50)).toBe(false);
    });

    it('should get remaining quota', () => {
      tracker.track('tenant-1', 'tokens', 70);

      expect(tracker.getRemainingQuota('tenant-1', 'tokens', 100)).toBe(30);
      expect(tracker.getRemainingQuota('tenant-1', 'tokens', 50)).toBe(0);
    });

    it('should get all usage for tenant', () => {
      tracker.track('tenant-1', 'tokens', 100);
      tracker.track('tenant-1', 'requests', 5);

      const usage = tracker.getTenantUsage('tenant-1');

      expect(usage.tokens).toBeDefined();
      expect(usage.requests).toBeDefined();
    });

    it('should reset tenant usage', () => {
      tracker.track('tenant-1', 'tokens', 100);
      tracker.track('tenant-2', 'tokens', 200);

      tracker.resetTenantUsage('tenant-1');

      expect(tracker.getUsage('tenant-1', 'tokens')).toBe(0);
      expect(tracker.getUsage('tenant-2', 'tokens')).toBe(200);
    });
  });

  // ============================================================
  // AuditLogger Tests
  // ============================================================
  describe('AuditLogger', () => {
    let logger;

    beforeEach(() => {
      logger = new AuditLogger({ maxLogs: 100 });
    });

    it('should log audit entries', () => {
      const entry = logger.log({
        tenantId: 'tenant-1',
        action: 'test.action',
      });

      expect(entry.id).toMatch(/^audit_/);
      expect(entry.tenantId).toBe('tenant-1');
      expect(entry.action).toBe('test.action');
      expect(entry.loggedAt).toBeDefined();
    });

    it('should query by tenant', () => {
      logger.log({ tenantId: 'tenant-1', action: 'action1' });
      logger.log({ tenantId: 'tenant-2', action: 'action2' });
      logger.log({ tenantId: 'tenant-1', action: 'action3' });

      const results = logger.query({ tenantId: 'tenant-1' });

      expect(results.length).toBe(2);
      expect(results.every(r => r.tenantId === 'tenant-1')).toBe(true);
    });

    it('should query by action', () => {
      logger.log({ tenantId: 'tenant-1', action: 'user.login' });
      logger.log({ tenantId: 'tenant-1', action: 'user.logout' });
      logger.log({ tenantId: 'tenant-1', action: 'user.login' });

      const results = logger.query({ action: 'user.login' });

      expect(results.length).toBe(2);
    });

    it('should query with limit', () => {
      for (let i = 0; i < 10; i++) {
        logger.log({ tenantId: 'tenant-1', action: `action${i}` });
      }

      const results = logger.query({ limit: 5 });

      expect(results.length).toBe(5);
    });

    it('should export tenant logs', () => {
      logger.log({ tenantId: 'tenant-1', action: 'action1' });
      logger.log({ tenantId: 'tenant-2', action: 'action2' });

      const exported = logger.exportTenantLogs('tenant-1');

      expect(exported.length).toBe(1);
      expect(exported[0].tenantId).toBe('tenant-1');
    });

    it('should add and notify listeners', () => {
      const listener = jest.fn();
      logger.addListener(listener);

      logger.log({ tenantId: 'tenant-1', action: 'test' });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant-1', action: 'test' })
      );
    });

    it('should remove listener', () => {
      const listener = jest.fn();
      logger.addListener(listener);
      logger.removeListener(listener);

      logger.log({ tenantId: 'tenant-1', action: 'test' });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should get statistics', () => {
      logger.log({ tenantId: 'tenant-1', action: 'action1' });
      logger.log({ tenantId: 'tenant-1', action: 'action2' });
      logger.log({ tenantId: 'tenant-2', action: 'action1' });

      const stats = logger.getStats();

      expect(stats.totalLogs).toBe(3);
      expect(stats.byTenant['tenant-1']).toBe(2);
      expect(stats.byTenant['tenant-2']).toBe(1);
      expect(stats.byAction['action1']).toBe(2);
    });

    it('should clear logs', () => {
      logger.log({ tenantId: 'tenant-1', action: 'test' });
      logger.log({ tenantId: 'tenant-2', action: 'test' });

      logger.clear('tenant-1');

      expect(logger.query({ tenantId: 'tenant-1' }).length).toBe(0);
      expect(logger.query({ tenantId: 'tenant-2' }).length).toBe(1);
    });

    it('should enforce max logs', () => {
      const smallLogger = new AuditLogger({ maxLogs: 5 });

      for (let i = 0; i < 10; i++) {
        smallLogger.log({ tenantId: 'tenant-1', action: `action${i}` });
      }

      expect(smallLogger.getStats().totalLogs).toBe(5);
    });
  });

  // ============================================================
  // TenantManager Tests
  // ============================================================
  describe('TenantManager', () => {
    let manager;

    beforeEach(() => {
      manager = new TenantManager();
    });

    describe('Tenant Management', () => {
      it('should create tenant', () => {
        const tenant = manager.createTenant({ name: 'Test Tenant' });

        expect(tenant.id).toBeDefined();
        expect(tenant.name).toBe('Test Tenant');
        expect(manager.getTenant(tenant.id)).toBe(tenant);
      });

      it('should update tenant', () => {
        const tenant = manager.createTenant({ name: 'Original' });
        const updated = manager.updateTenant(tenant.id, {
          name: 'Updated',
          quotas: { maxUsers: 50 },
        });

        expect(updated.name).toBe('Updated');
        expect(updated.quotas.maxUsers).toBe(50);
      });

      it('should delete tenant', () => {
        const tenant = manager.createTenant({ name: 'To Delete' });
        const user = manager.addUser(tenant.id, { email: 'user@test.com' });

        const deleted = manager.deleteTenant(tenant.id);

        expect(deleted).toBe(true);
        expect(manager.getTenant(tenant.id)).toBeUndefined();
        expect(manager.getUser(user.id)).toBeUndefined();
      });

      it('should list all tenants', () => {
        manager.createTenant({ name: 'Tenant 1' });
        manager.createTenant({ name: 'Tenant 2' });

        const tenants = manager.listTenants();

        expect(tenants.length).toBe(2);
      });
    });

    describe('User Management', () => {
      let tenant;

      beforeEach(() => {
        tenant = manager.createTenant({ name: 'Test Tenant' });
      });

      it('should add user', () => {
        const user = manager.addUser(tenant.id, {
          email: 'user@test.com',
          role: TenantRole.MEMBER,
        });

        expect(user.id).toBeDefined();
        expect(user.tenantId).toBe(tenant.id);
        expect(manager.getUser(user.id)).toBe(user);
      });

      it('should enforce user limit', () => {
        const smallTenant = manager.createTenant({
          name: 'Small',
          quotas: { maxUsers: 2 },
        });

        manager.addUser(smallTenant.id, { email: 'user1@test.com' });
        manager.addUser(smallTenant.id, { email: 'user2@test.com' });

        expect(() => {
          manager.addUser(smallTenant.id, { email: 'user3@test.com' });
        }).toThrow(/User limit reached/);
      });

      it('should get tenant users', () => {
        manager.addUser(tenant.id, { email: 'user1@test.com' });
        manager.addUser(tenant.id, { email: 'user2@test.com' });

        const users = manager.getTenantUsers(tenant.id);

        expect(users.length).toBe(2);
      });

      it('should update user', () => {
        const user = manager.addUser(tenant.id, { email: 'user@test.com' });
        const updated = manager.updateUser(user.id, {
          name: 'Updated Name',
          role: TenantRole.ADMIN,
        });

        expect(updated.name).toBe('Updated Name');
        expect(updated.role).toBe(TenantRole.ADMIN);
      });

      it('should remove user', () => {
        const user = manager.addUser(tenant.id, { email: 'user@test.com' });
        const removed = manager.removeUser(user.id);

        expect(removed).toBe(true);
        expect(manager.getUser(user.id)).toBeUndefined();
      });
    });

    describe('Context Management', () => {
      let tenant;
      let user;

      beforeEach(() => {
        tenant = manager.createTenant({ name: 'Test Tenant' });
        user = manager.addUser(tenant.id, {
          email: 'user@test.com',
          role: TenantRole.MEMBER,
        });
      });

      it('should create context', () => {
        const context = manager.createContext(tenant.id, user.id);

        expect(context.tenant).toBe(tenant);
        expect(context.user).toBe(user);
        expect(manager.getCurrentContext()).toBe(context);
      });

      it('should create context without user', () => {
        const context = manager.createContext(tenant.id);

        expect(context.tenant).toBe(tenant);
        expect(context.user).toBeNull();
      });

      it('should throw for non-existent tenant', () => {
        expect(() => {
          manager.createContext('non-existent');
        }).toThrow(/Tenant non-existent not found/);
      });

      it('should throw for non-existent user', () => {
        expect(() => {
          manager.createContext(tenant.id, 'non-existent');
        }).toThrow(/User non-existent not found/);
      });

      it('should throw for user from different tenant', () => {
        const otherTenant = manager.createTenant({ name: 'Other' });

        expect(() => {
          manager.createContext(otherTenant.id, user.id);
        }).toThrow(/does not belong to tenant/);
      });
    });

    describe('Usage Tracking', () => {
      let tenant;

      beforeEach(() => {
        tenant = manager.createTenant({
          name: 'Test Tenant',
          quotas: {
            maxTokensPerDay: 1000,
            maxRequestsPerHour: 10,
          },
        });
        manager.createContext(tenant.id);
      });

      it('should track usage', () => {
        manager.trackUsage('tokens', 100);
        manager.trackUsage('tokens', 50);

        const stats = manager.getTenantStats(tenant.id);
        expect(stats.usage.tokens).toBeDefined();
      });

      it('should check quota', () => {
        expect(manager.checkQuota('tokens')).toBe(true);

        for (let i = 0; i < 10; i++) {
          manager.trackUsage('tokens', 100);
        }

        expect(manager.checkQuota('tokens')).toBe(false);
      });
    });

    describe('Audit Logging', () => {
      let tenant;

      beforeEach(() => {
        tenant = manager.createTenant({ name: 'Test Tenant' });
        manager.createContext(tenant.id);
      });

      it('should log audit events', () => {
        manager.audit('test.action', { key: 'value' });

        const stats = manager.getStats();
        expect(stats.audit.totalLogs).toBeGreaterThan(0);
      });

      it('should include tenant context in audit', () => {
        manager.audit('custom.action', { custom: 'data' });

        const tenantStats = manager.getTenantStats(tenant.id);
        expect(tenantStats.auditCount).toBeGreaterThan(0);
      });
    });

    describe('Statistics', () => {
      it('should get overall stats', () => {
        manager.createTenant({ name: 'Tenant 1' });
        const tenant2 = manager.createTenant({ name: 'Tenant 2' });
        manager.addUser(tenant2.id, { email: 'user@test.com' });

        const stats = manager.getStats();

        expect(stats.tenantCount).toBe(2);
        expect(stats.userCount).toBe(1);
        expect(stats.audit).toBeDefined();
      });

      it('should get tenant stats', () => {
        const tenant = manager.createTenant({ name: 'Test Tenant' });
        manager.addUser(tenant.id, { email: 'user1@test.com' });
        manager.addUser(tenant.id, { email: 'user2@test.com' });

        const stats = manager.getTenantStats(tenant.id);

        expect(stats.tenant.name).toBe('Test Tenant');
        expect(stats.users.length).toBe(2);
        expect(stats.usage).toBeDefined();
      });
    });
  });

  // ============================================================
  // Default Instance Tests
  // ============================================================
  describe('Default Instance', () => {
    it('should export default tenant manager', () => {
      expect(defaultTenantManager).toBeInstanceOf(TenantManager);
    });
  });
});
