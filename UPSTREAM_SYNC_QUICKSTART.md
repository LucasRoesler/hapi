# Upstream Sync Quick Start Guide

Quick reference for syncing changes from upstream `tiann/hapi` repository.

## TL;DR

```bash
# 1. Check for new upstream commits
./scripts/check-upstream.sh

# 2. Create sync branch
git checkout -b upstream-sync-$(date +%Y-%m-%d)

# 3. Cherry-pick desired commits
git cherry-pick -x <commit-sha>

# 4. Test and create PR
pnpm test && gh pr create
```

## Weekly Workflow

### 1. Check Upstream (5 minutes)

Run the automated check script:

```bash
./scripts/check-upstream.sh
```

This shows:
- Number of new commits
- Categorized by type (bug fixes, features, docs, refactors)
- File change summary

### 2. Review Commits (10-20 minutes)

Review in detail:

```bash
# See all new commits with stats
git log --stat main..upstream/main

# Review specific commit
git show <commit-sha>

# See what files changed
git diff --stat $(git merge-base main upstream/main)..upstream/main
```

### 3. Categorize & Decide (5-10 minutes)

For each commit, decide:

| Type | Conflicts? | Action |
|------|------------|--------|
| Bug Fix | No | ✅ Cherry-pick |
| Bug Fix | Yes | ⚠️ Resolve & cherry-pick |
| Feature | No | ✅ Cherry-pick if relevant |
| Feature | Yes | ⚠️ Evaluate effort vs value |
| Refactor | No | ⏸️ Consider later |
| Refactor | Yes | ❌ Skip unless critical |
| Docs | Any | ✅ Usually safe |

### 4. Cherry-Pick Selected Commits (15-30 minutes)

```bash
# Create dated sync branch
git checkout -b upstream-sync-$(date +%Y-%m-%d)

# Cherry-pick commits (the -x flag adds reference to original)
git cherry-pick -x <commit-sha-1>
git cherry-pick -x <commit-sha-2>
# ... continue for each commit
```

**If conflicts occur**:

```bash
# Check conflicted files
git status

# Resolve conflicts in editor
# Then mark as resolved:
git add <resolved-files>

# Continue cherry-pick
git cherry-pick --continue
```

**To abort if things go wrong**:

```bash
git cherry-pick --abort
```

### 5. Test Changes (10-20 minutes)

```bash
# Install dependencies (if needed)
pnpm install

# Run tests
pnpm test

# Build all packages
pnpm build

# Manual testing as needed
pnpm --filter cli dev
```

### 6. Update Sync Log (5 minutes)

Edit `UPSTREAM_SYNC_LOG.md`:

```markdown
## 2026-02-XX - Brief Description

### Cherry-Picked
- `abc1234`: fix(web): improve font scaling - No conflicts, tests pass
- `def5678`: feat(cli): add new feature - Resolved conflict in config.ts

### Skipped
- `ghi9012`: refactor: large structural change - Too disruptive, defer

### Conflicts Resolved
- `def5678`: cli/src/config.ts - Kept our config structure, merged new options

### Testing Done
- Unit tests pass
- Manual testing in dev mode
- Build successful for all packages

### Notes
- Font scaling fix improves mobile UX
- New feature integrates well with our changes
```

### 7. Create PR (5 minutes)

```bash
# Push branch
git push origin upstream-sync-$(date +%Y-%m-%d)

# Create PR
gh pr create \
  --title "Sync upstream changes ($(date +%Y-%m-%d))" \
  --body "## Summary

Cherry-picked X commits from upstream tiann/hapi.

## Commits Included
- \`abc1234\`: fix(web): improve font scaling
- \`def5678\`: feat(cli): add new feature

## Testing Done
- ✅ Unit tests pass
- ✅ Build successful
- ✅ Manual testing in dev

## Breaking Changes
None

See UPSTREAM_SYNC_LOG.md for details.
"
```

## Common Scenarios

### Scenario 1: Simple Bug Fix (No Conflicts)

```bash
# Check upstream
./scripts/check-upstream.sh

# Found: abc1234 fix(web): resolve button alignment issue

# Create branch
git checkout -b upstream-sync-$(date +%Y-%m-%d)

# Cherry-pick
git cherry-pick -x abc1234

# Test
pnpm test

# Update log and create PR
```

**Time**: ~15 minutes

### Scenario 2: Bug Fix with Conflicts

```bash
# Cherry-pick
git cherry-pick -x abc1234
# CONFLICT in web/src/components/Button.tsx

# Check what conflicted
git status

# Edit file to resolve
vim web/src/components/Button.tsx

# Look for conflict markers:
# <<<<<<< HEAD
# our code
# =======
# upstream code
# >>>>>>> abc1234

# Resolve by merging both changes appropriately

# Mark as resolved
git add web/src/components/Button.tsx

# Continue
git cherry-pick --continue

# Test thoroughly
pnpm test
```

**Time**: ~30 minutes

### Scenario 3: Large Feature (Multiple Commits)

```bash
# Example: OpenCode support (multiple commits)

# Review the feature commits
git log --oneline --grep="opencode" main..upstream/main

# Found multiple commits, review them:
git log -p 70b5c22  # Main feature
git log -p 7e0b139  # Additional support

# Decide: This is large, needs careful planning
# Option A: Cherry-pick all related commits
# Option B: Manually port the feature
# Option C: Defer for now

# If cherry-picking:
git checkout -b upstream-opencode-support
git cherry-pick -x 70b5c22
# Resolve conflicts
git cherry-pick -x 7e0b139
# Test extensively
```

**Time**: 1-3 hours (depending on complexity)

### Scenario 4: Skip a Commit

Sometimes you'll want to skip commits:

```bash
# Reasons to skip:
# - Too disruptive (e.g., server -> hub rename)
# - Not relevant to our fork
# - Too many conflicts for little value
# - Superseded by our own implementation

# Document in UPSTREAM_SYNC_LOG.md:
### Skipped
- `abc1234`: feat: rename server to hub - Too disruptive, deferred
```

## Tips & Best Practices

### ✅ DO

- **Test incrementally**: Test after each cherry-pick, not at the end
- **Commit often**: Cherry-pick one or a few related commits at a time
- **Document decisions**: Record why you skipped or modified something
- **Ask for help**: If unsure about a conflict, ask the team
- **Use `-x` flag**: Always use `git cherry-pick -x` to track origins

### ❌ DON'T

- **Cherry-pick blindly**: Understand what each commit does first
- **Resolve conflicts hastily**: Take time to understand both sides
- **Skip testing**: Always test before pushing
- **Batch too many commits**: Keep PRs focused and reviewable
- **Forget to update the log**: Track your work for future reference

## Automation

### Weekly Reminder

The GitHub Action runs every Monday at 9 AM UTC and:
- Checks for new upstream commits
- Creates/updates an issue with details
- Categorizes commits by type
- Provides a checklist for the sync process

You can also trigger it manually:
```bash
# Via GitHub UI: Actions -> Upstream Sync Check -> Run workflow
# Or via CLI:
gh workflow run upstream-sync-check.yml
```

### Manual Check Anytime

```bash
./scripts/check-upstream.sh
```

## Troubleshooting

### "error: could not apply..."

Cherry-pick failed due to conflicts.

**Solution**: Resolve conflicts manually (see Scenario 2 above)

### "error: Your local changes would be overwritten"

You have uncommitted changes.

**Solution**:
```bash
git status
git stash
git cherry-pick -x <sha>
git stash pop
```

### Too many conflicts

Cherry-picking is becoming painful.

**Solution**:
1. Skip the problematic commit
2. Document why in UPSTREAM_SYNC_LOG.md
3. Consider manually porting the feature later
4. Or accept divergence on this feature

### Lost track of what was cherry-picked

**Solution**: Check the commit message
```bash
git log --grep="cherry picked from commit"
```

The `-x` flag adds this automatically.

## Resources

- **Full Strategy**: See `UPSTREAM_SYNC_STRATEGY.md`
- **Sync Log**: See `UPSTREAM_SYNC_LOG.md`
- **Upstream Repo**: https://github.com/tiann/hapi
- **Git Cherry-Pick Docs**: https://git-scm.com/docs/git-cherry-pick

## Questions?

If you're unsure about:
- Whether to cherry-pick a commit
- How to resolve a conflict
- Whether a feature is worth porting

Create a discussion issue or ask the team in your sync PR!
