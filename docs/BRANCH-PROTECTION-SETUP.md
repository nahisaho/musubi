# Branch Protection Setup Guide

This guide explains how to configure Branch Protection Rules for the `main` branch.

## Prerequisites

- Repository owner or admin access
- Completed Phase 1-3 implementation (CI workflow + Platform tests + Release workflow)

## Configuration Steps

### 1. Navigate to Branch Protection Settings

1. Go to GitHub repository: https://github.com/nahisaho/MUSUBI
2. Click **Settings** (top right)
3. In left sidebar, click **Branches**
4. Click **Add branch protection rule**

### 2. Configure Branch Name Pattern

- **Branch name pattern**: `main`

### 3. Enable Required Settings

#### ✅ Require a pull request before merging

- [x] **Require a pull request before merging**
  - **Required approvals**: 0 (small team)
  - [x] **Dismiss stale pull request approvals when new commits are pushed**
  - [x] **Require review from Code Owners** (if CODEOWNERS file exists)

#### ✅ Require status checks to pass before merging

- [x] **Require status checks to pass before merging**
- [x] **Require branches to be up to date before merging**

**Search and add the following 11 required checks**:

1. `lint / ESLint & Prettier`
2. `test / Jest Tests`
3. `build / Build Verification`
4. `audit / Security Audit`
5. `platform-tests / Platform Tests (claude-code)`
6. `platform-tests / Platform Tests (github-copilot)`
7. `platform-tests / Platform Tests (cursor)`
8. `platform-tests / Platform Tests (gemini-cli)`
9. `platform-tests / Platform Tests (windsurf)`
10. `platform-tests / Platform Tests (codex)`
11. `platform-tests / Platform Tests (qwen-code)`

**Note**: These status check names appear after running the CI workflow at least once. If they don't appear in the search, merge a PR first to trigger the workflow.

#### ✅ Require conversation resolution before merging

- [x] **Require conversation resolution before merging**

#### ✅ Require linear history

- [x] **Require linear history**

#### ❌ Do not allow bypassing the above settings

- [ ] **Do not allow bypassing the above settings**
  - **Reason**: This would prevent even administrators from merging without CI passing. Keep unchecked for emergency hotfixes, but follow CI requirements in normal workflow.

### 4. Additional Recommended Settings

- [x] **Require deployments to succeed before merging** (Optional)
- [x] **Lock branch** (Optional - prevents all pushes to branch)
- [x] **Do not allow force pushes**
- [x] **Do not allow deletions**

### 5. Save Configuration

- Click **Create** button at the bottom

## Verification

### Test the Branch Protection

1. Create a test branch:
   ```bash
   git checkout -b test/branch-protection
   echo "test" >> README.md
   git commit -am "test: verify branch protection"
   git push origin test/branch-protection
   ```

2. Create a Pull Request on GitHub

3. Verify the following:
   - ✅ **Merge button is disabled** with message "Merging is blocked"
   - ✅ **Status checks section shows**: "Required status checks: 11"
   - ✅ All 11 CI jobs appear in the status check list
   - ✅ After CI completes successfully, merge button becomes enabled

4. Test failed CI scenario:
   - Make a commit that breaks linting (e.g., add trailing spaces)
   - Push to PR branch
   - Verify merge button is disabled again
   - Fix the issue and verify merge button re-enables

## Expected Behavior

### ✅ Allowed Actions

- Creating feature branches
- Creating Pull Requests
- Pushing commits to PR branches
- Merging PR after all CI checks pass + approval (if required)

### ❌ Blocked Actions

- Direct push to `main` branch
- Merging PR while CI is running
- Merging PR with failing CI checks
- Force pushing to `main` (if configured)
- Deleting `main` branch (if configured)

## Troubleshooting

### Status checks not appearing in search

**Problem**: Required status checks don't show up in the search box.

**Solution**: 
1. Merge at least one PR to trigger CI workflow
2. Wait for all jobs to complete
3. Return to Branch Protection settings
4. Status check names should now appear in autocomplete

### Merge button enabled despite failing checks

**Problem**: Merge button is green even with failing CI.

**Solution**:
1. Check that "Require status checks to pass before merging" is enabled
2. Verify all 11 status checks are listed in the required checks section
3. Confirm "Require branches to be up to date before merging" is checked

### Cannot merge even after CI passes

**Problem**: All checks pass but merge is still blocked.

**Solution**:
1. Check if "Require pull request reviews" is enabled and approvals are needed
2. Check if "Require conversation resolution" is enabled and comments need resolving
3. Verify branch is up-to-date with `main`

## Maintenance

### Adding New CI Jobs

When adding new CI jobs to `.github/workflows/ci.yml`:

1. Add the job to the workflow file
2. Merge the change to `main`
3. Update Branch Protection settings
4. Add the new job name to required status checks

### Removing CI Jobs

When removing CI jobs:

1. Update Branch Protection settings first (remove from required checks)
2. Then remove the job from workflow file
3. Merge the change

## Related Tasks

- **TASK-GHA-011**: Branch Protection Rules configuration
- **Phase 4**: Complete CI/CD implementation
- **REQ-GHA-011**: Branch protection requirements

## References

- [GitHub Docs: Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Docs: Required Status Checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging)

---

**Last Updated**: 2025-11-17  
**Status**: Phase 4 - Ready for implementation
