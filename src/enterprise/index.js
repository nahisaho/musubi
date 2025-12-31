/**
 * Enterprise Module - MUSUBI SDD
 *
 * Phase 6: Enterprise-grade features for multi-tenant deployments
 * Phase 4 (v6.2): Document generation, error handling, rollback
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

const {
  ExperimentReportGenerator,
  createExperimentReportGenerator,
  REPORT_FORMAT,
  TEST_STATUS
} = require('./experiment-report');

const {
  TechArticleGenerator,
  createTechArticleGenerator,
  PLATFORM,
  ARTICLE_TYPE
} = require('./tech-article');

const {
  ErrorRecoveryHandler,
  createErrorRecoveryHandler,
  ERROR_CATEGORY,
  RECOVERY_ACTION
} = require('./error-recovery');

const {
  RollbackManager,
  createRollbackManager,
  ROLLBACK_LEVEL,
  ROLLBACK_STATUS,
  WORKFLOW_STAGE
} = require('./rollback-manager');

module.exports = {
  // Multi-tenant Constants
  TenantRole,
  Permission,
  ROLE_PERMISSIONS,

  // Multi-tenant Classes
  TenantConfig,
  TenantUser,
  TenantContext,
  UsageTracker,
  AuditLogger,
  TenantManager,
  defaultTenantManager,

  // Experiment Report (IMP-6.2-006-01)
  ExperimentReportGenerator,
  createExperimentReportGenerator,
  REPORT_FORMAT,
  TEST_STATUS,

  // Tech Article (IMP-6.2-006-02)
  TechArticleGenerator,
  createTechArticleGenerator,
  PLATFORM,
  ARTICLE_TYPE,

  // Error Recovery (IMP-6.2-008-01)
  ErrorRecoveryHandler,
  createErrorRecoveryHandler,
  ERROR_CATEGORY,
  RECOVERY_ACTION,

  // Rollback Manager (IMP-6.2-008-02)
  RollbackManager,
  createRollbackManager,
  ROLLBACK_LEVEL,
  ROLLBACK_STATUS,
  WORKFLOW_STAGE
};
