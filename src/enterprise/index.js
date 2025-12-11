/**
 * Enterprise Module - MUSUBI SDD
 *
 * Phase 6: Enterprise-grade features for multi-tenant deployments
 *
 * @module enterprise
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
} = require('./multi-tenant');

module.exports = {
  // Constants
  TenantRole,
  Permission,
  ROLE_PERMISSIONS,

  // Classes
  TenantConfig,
  TenantUser,
  TenantContext,
  UsageTracker,
  AuditLogger,
  TenantManager,

  // Default instance
  defaultTenantManager,
};
