# SDD Change Archive Command

Archive a completed change proposal.

---

## Instructions for GitHub Copilot

You are executing the `#sdd-change-archive [change-name]` command to archive a completed change.

### Command Format

```bash
#sdd-change-archive add-2fa
#sdd-change-archive migrate-to-graphql
#sdd-change-archive refactor-auth-service
```

### Your Task

Archive the change proposal and implementation, update documentation, and clean up temporary resources.

---

## Process

### 1. Verify Change Completion

**Read Implementation Report**:

```bash
# Check implementation report exists
storage/changes/{{change-name}}-implementation.md
```

**Verify Status**:

- Implementation report exists
- All requirements implemented
- Tests passing
- Feature deployed to production
- Feature flag enabled (or deprecated feature removed)
- Monitoring shows stable metrics

**If Not Complete**:

```markdown
⚠️ **Change not ready for archival**

Status Check:

- [ ] Implementation complete
- [ ] Tests passing
- [ ] Deployed to production
- [ ] Feature flag enabled/removed
- [ ] Stable for 2+ weeks

Please complete all steps before archiving.
```

---

### 2. Collect Final Metrics

**Gather Success Metrics**:

```markdown
## Final Metrics: {{CHANGE_NAME}}

### Deployment

- **Deployed**: {{DATE}}
- **Rollout Complete**: {{DATE}}
- **Stable Period**: {{DAYS}} days

### Performance

- **P95 Latency**: {{VALUE}}ms (target: <200ms) ✅
- **Error Rate**: {{VALUE}}% (target: <0.1%) ✅
- **Throughput**: {{VALUE}} req/s ✅

### Adoption

- **User Adoption**: {{PERCENTAGE}}%
- **Feature Usage**: {{COUNT}} uses/day
- **Customer Feedback**: NPS {{SCORE}}

### Quality

- **Bugs Found**: {{COUNT}}
  - P0: 0
  - P1: {{COUNT}}
  - P2: {{COUNT}}
- **Incidents**: {{COUNT}}
- **Rollbacks**: {{COUNT}}

### Cost

- **Development Time**: {{HOURS}} hours
- **Infrastructure Cost**: ${{AMOUNT}}/month
- **ROI**: {{PERCENTAGE}}% (projected)
```

---

### 3. Update Change Status

**Update Change Proposal**:

```markdown
<!-- storage/changes/{{change-name}}-proposal.md -->

## Metadata

- **Change ID**: CHG-{{NUMBER}}
- **Status**: ~~Proposed~~ → ~~Approved~~ → ~~Implemented~~ → **Archived**
- **Created**: {{DATE}}
- **Approved**: {{DATE}}
- **Implemented**: {{DATE}}
- **Archived**: {{DATE}}
```

**Update Change Log**:

```markdown
<!-- storage/changes/change-log.md -->

| CHG-042 | add-2fa | ~~Implemented~~ → Archived | {{DATE}} | Two-factor authentication | ✅ |
```

---

### 4. Clean Up Feature Flag

**Remove Feature Flag** (if stable for 2+ weeks):

```typescript
// lib/feature-flags/flags.ts

export const FEATURE_FLAGS = {
  // Remove this:
  // enable_{{feature}}: {
  //   enabled: true,
  //   description: '{{DESCRIPTION}}',
  //   rolloutPercentage: 100,
  // },
  // ... other flags ...
} as const;
```

**Remove Feature Flag Checks**:

```typescript
// Before (with feature flag)
if (!isFeatureEnabled('enable_{{feature}}')) {
  return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 });
}

// After (feature flag removed)
// Just remove the check - feature is now permanent
```

**Create Cleanup PR**:

- Title: `chore: remove {{feature}} feature flag`
- Description: Feature is stable, removing flag
- Changes: Remove flag definition and all checks

---

### 5. Archive Deprecated Code

**If REMOVED Requirements Exist**:

#### Step 5.1: Verify Deprecation Period Passed

```markdown
Deprecation Timeline:

- Deprecated: {{DATE}}
- EOL Date: {{DATE}}
- Days Passed: {{DAYS}}
- Ready for Removal: {{DAYS >= DEPRECATION_PERIOD}}
```

#### Step 5.2: Final Communication

```markdown
Subject: Final Notice - {{DEPRECATED_FEATURE}} Removal

Dear Users,

This is a final notice that {{DEPRECATED_FEATURE}} will be removed on {{DATE}}.

Timeline:

- Deprecated: {{DEPRECATION_DATE}} ({{DAYS_SINCE}} days ago)
- Final Warning: Today
- Removal: {{REMOVAL_DATE}} ({{DAYS_UNTIL}} days)

Migration Guide:
{{MIGRATION_GUIDE_URL}}

Support:
If you need assistance, contact {{SUPPORT_EMAIL}}

Thank you,
{{TEAM}}
```

#### Step 5.3: Remove Deprecated Code

```bash
# Create archive branch (backup)
git checkout -b archive/{{deprecated-feature}}
git push origin archive/{{deprecated-feature}}

# Remove deprecated code
git checkout main
rm -rf lib/{{deprecated-feature}}/

# Update imports
grep -r "from '@/lib/{{deprecated-feature}}'" .
# Fix any remaining references
```

#### Step 5.4: Document Removal

````markdown
<!-- storage/archive/{{deprecated-feature}}-removal.md -->

# Deprecated Feature Removal: {{FEATURE}}

## Metadata

- **Feature**: {{DEPRECATED_FEATURE}}
- **Deprecated**: {{DEPRECATION_DATE}}
- **Removed**: {{REMOVAL_DATE}}
- **Archive Branch**: archive/{{deprecated-feature}}

## Reason for Removal

{{REASON}}

## Migration Path

{{MIGRATION_INSTRUCTIONS}}

## Impact

- **Affected Users**: {{COUNT}}
- **Breaking Changes**: Yes
- **Alternative**: {{ALTERNATIVE}}

## Recovery

If needed, restore from archive branch:

```bash
git checkout archive/{{deprecated-feature}} -- lib/{{deprecated-feature}}/
```
````

````

---

### 6. Update Documentation

**Update Main Documentation**:

```markdown
<!-- README.md -->

## Changelog

### [{{VERSION}}] - {{DATE}}

#### Added
- {{FEATURE}}: {{DESCRIPTION}} (CHG-{{NUMBER}})

#### Changed
- {{MODIFIED_FEATURE}}: {{DESCRIPTION}}

#### Deprecated
- {{DEPRECATED_FEATURE}}: Use {{ALTERNATIVE}} instead

#### Removed
- {{REMOVED_FEATURE}}: Removed after {{DAYS}}-day deprecation period
````

**Update API Documentation** (if applicable):

```markdown
<!-- docs/api/{{endpoint}}.md -->

## POST /api/{{feature}}

**Added**: {{DATE}} (CHG-{{NUMBER}})

### Description

{{DESCRIPTION}}

### Request

[...]

### Response

[...]
```

---

### 7. Update Steering Files

**Update Architecture**:

```markdown
<!-- steering/structure.md -->

## Components

### {{Feature}}

- **Location**: `lib/{{feature}}/`
- **Purpose**: {{DESCRIPTION}}
- **Pattern**: {{PATTERN}}
- **Added**: {{DATE}} (CHG-{{NUMBER}})
- **Status**: Production ✅
```

**Update Technology Stack**:

```markdown
<!-- steering/tech.md -->

## Dependencies

### Added (CHG-{{NUMBER}})

- `{{package}}@{{version}}` - {{PURPOSE}}
```

**Update Product Context** (if applicable):

```markdown
<!-- steering/product.md -->

## Features

### {{Feature}}

- **Description**: {{DESCRIPTION}}
- **Users**: {{USER_TYPE}}
- **Adoption**: {{PERCENTAGE}}%
- **Since**: {{DATE}}
```

---

### 8. Create Archive Summary

**Generate Archive Report**:

````markdown
# Archive Report: {{CHANGE_NAME}}

## Metadata

- **Change ID**: CHG-{{NUMBER}}
- **Status**: Archived
- **Lifecycle**:
  - Proposed: {{DATE}}
  - Approved: {{DATE}}
  - Implemented: {{DATE}}
  - Deployed: {{DATE}}
  - Archived: {{DATE}}
- **Total Duration**: {{DAYS}} days

## Summary

### What Was Changed

**ADDED**:

- lib/{{feature}}/ - {{DESCRIPTION}}
- API: POST /api/{{feature}}
- UI: /{{feature}} page

**MODIFIED**:

- lib/auth/password.ts - Updated hashing algorithm
- Database: users table (added columns)

**REMOVED**:

- lib/auth/remember-me.ts - Deprecated feature

### Final Metrics

#### Performance

- **P95 Latency**: {{VALUE}}ms ✅
- **Error Rate**: {{VALUE}}% ✅
- **Uptime**: {{PERCENTAGE}}% ✅

#### Adoption

- **Active Users**: {{COUNT}}
- **Daily Usage**: {{COUNT}} requests/day
- **Customer Satisfaction**: NPS {{SCORE}}

#### Quality

- **Total Bugs**: {{COUNT}} (0 P0, {{N}} P1, {{N}} P2)
- **Incidents**: {{COUNT}}
- **Rollbacks**: {{COUNT}}

#### Cost

- **Development**: {{HOURS}} hours
- **Infrastructure**: ${{AMOUNT}}/month
- **ROI**: {{PERCENTAGE}}%

### Lessons Learned

#### What Went Well ✅

- {{POSITIVE_POINT_1}}
- {{POSITIVE_POINT_2}}
- {{POSITIVE_POINT_3}}

#### What Could Be Improved 📝

- {{IMPROVEMENT_1}}
- {{IMPROVEMENT_2}}
- {{IMPROVEMENT_3}}

#### Recommendations for Future Changes

- {{RECOMMENDATION_1}}
- {{RECOMMENDATION_2}}
- {{RECOMMENDATION_3}}

## Files

### Created

- storage/changes/{{change-name}}-proposal.md
- storage/changes/{{change-name}}-implementation.md
- storage/changes/{{change-name}}-archive.md
- lib/{{feature}}/\* ({{N}} files)
- tests/\* ({{N}} test files)

### Modified

- steering/structure.md
- steering/tech.md
- README.md
- package.json
- ({{N}} other files)

### Deleted

- lib/{{deprecated-feature}}/\* ({{N}} files)
- Feature flag references ({{N}} locations)

## Archival Actions

### Completed

- [x] Final metrics collected
- [x] Change status updated to "Archived"
- [x] Change log updated
- [x] Feature flag removed
- [x] Deprecated code removed (if applicable)
- [x] Documentation updated
- [x] Steering files updated
- [x] Archive report created

### Backup/Recovery

**Archive Branch**: `archive/{{change-name}}`

**Restore Command**:

```bash
# If rollback needed (unlikely)
git checkout archive/{{change-name}}
```
````

**Deprecated Code Recovery**:

```bash
# If removed code needs to be restored
git checkout archive/{{deprecated-feature}} -- lib/{{deprecated-feature}}/
```

## Constitutional Compliance (Final Check)

- ✅ Article I: Library-First - Maintained
- ✅ Article II: CLI Interface - Maintained
- ✅ Article III: Test Coverage - 87% (>= 80%)
- ✅ Article IV: EARS Format - All requirements
- ✅ Article V: Traceability - 100% coverage
- ✅ Article VI: Steering - Updated
- ✅ Article VII: Simplicity - No unnecessary complexity added
- ✅ Article VIII: Anti-Abstraction - No unnecessary wrappers
- ✅ Article IX: Integration Tests - Included

## Sign-Off

**Engineering Lead**: {{NAME}} - Approved on {{DATE}}
**Product Lead**: {{NAME}} - Approved on {{DATE}}
**QA Lead**: {{NAME}} - Approved on {{DATE}}

---

**Change successfully archived** ✅

````

**Save To**:
- English: `storage/changes/{{change-name}}-archive.md`
- Japanese: `storage/changes/{{change-name}}-archive.ja.md`

---

### 9. Move Files to Archive Directory

**Organize Archive**:

```bash
# Create archive directory
mkdir -p storage/archive/{{YEAR}}/{{change-name}}/

# Move change documents
mv storage/changes/{{change-name}}-proposal.md storage/archive/{{YEAR}}/{{change-name}}/
mv storage/changes/{{change-name}}-implementation.md storage/archive/{{YEAR}}/{{change-name}}/
mv storage/changes/{{change-name}}-archive.md storage/archive/{{YEAR}}/{{change-name}}/

# Move Japanese versions
mv storage/changes/{{change-name}}-proposal.ja.md storage/archive/{{YEAR}}/{{change-name}}/
mv storage/changes/{{change-name}}-implementation.ja.md storage/archive/{{YEAR}}/{{change-name}}/
mv storage/changes/{{change-name}}-archive.ja.md storage/archive/{{YEAR}}/{{change-name}}/

# Create index
cat > storage/archive/{{YEAR}}/{{change-name}}/README.md <<EOF
# Change Archive: {{CHANGE_NAME}}

**Change ID**: CHG-{{NUMBER}}
**Archived**: {{DATE}}

## Documents
- [Proposal]({{change-name}}-proposal.md)
- [Implementation]({{change-name}}-implementation.md)
- [Archive Report]({{change-name}}-archive.md)

## Quick Facts
- **Type**: {{TYPE}}
- **Duration**: {{DAYS}} days
- **Status**: Successfully archived ✅
EOF
````

---

### 10. Generate Final Summary

```markdown
## ✅ Change Archived Successfully

**Change**: {{CHANGE_NAME}}
**Change ID**: CHG-{{NUMBER}}

### Lifecycle:

- Proposed: {{DATE}}
- Implemented: {{DATE}}
- Deployed: {{DATE}}
- **Archived**: {{DATE}}
- **Total Duration**: {{DAYS}} days

### Final Status:

- ✅ All requirements implemented
- ✅ Tests passing ({{COVERAGE}}% coverage)
- ✅ Production stable ({{DAYS}} days)
- ✅ Feature flag removed
- ✅ Deprecated code removed
- ✅ Documentation updated
- ✅ Steering updated

### Metrics:

- **Performance**: Within SLA ✅
- **Adoption**: {{PERCENTAGE}}%
- **Satisfaction**: NPS {{SCORE}}
- **Bugs**: {{COUNT}} total (0 critical)

### Files Archived:

- storage/archive/{{YEAR}}/{{change-name}}/

### Lessons Learned:

- {{TOP_LESSON_1}}
- {{TOP_LESSON_2}}
- {{TOP_LESSON_3}}

---

**Change successfully completed and archived** 🎉
```

---

## Validation Checklist

Before completing, verify:

- [ ] Implementation report exists and complete
- [ ] Feature deployed to production
- [ ] Feature stable for 2+ weeks
- [ ] Final metrics collected
- [ ] Change status updated to "Archived"
- [ ] Change log updated
- [ ] Feature flag removed (if applicable)
- [ ] Deprecated code removed (if applicable)
- [ ] Documentation updated
- [ ] Steering files updated
- [ ] Archive report created (bilingual)
- [ ] Files moved to archive directory
- [ ] Lessons learned documented
- [ ] Summary presented to user

---

## Edge Cases

### Change Not Deployed

If change not yet in production:

```markdown
⚠️ **Cannot archive - not deployed**

Current Status: {{STATUS}}

Please complete:

1. Deploy to production
2. Enable feature flag
3. Monitor for 2+ weeks
4. Then archive

Use `#sdd-change-archive {{change-name}}` after deployment.
```

### Change Unstable

If metrics show issues:

```markdown
⚠️ **Cannot archive - metrics below target**

Metrics:

- Error Rate: {{VALUE}}% (target: <0.1%) ❌
- P95 Latency: {{VALUE}}ms (target: <200ms) ❌

Please:

1. Investigate issues
2. Fix problems
3. Monitor until stable
4. Then archive
```

---

**Execution**: Begin change archival now for the specified change.
