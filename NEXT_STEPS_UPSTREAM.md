# Next Steps: Upstream Sync

## What We Accomplished

✅ **Added upstream remote** (`tiann/hapi`)
✅ **Analyzed divergence**: 49 our commits vs 36 upstream commits
✅ **Tested rebase**: ❌ Immediate conflicts - rebase not viable
✅ **Created comprehensive sync strategy**
✅ **Set up automation**: Weekly check script + GitHub Action
✅ **Documented everything**: Strategy, quickstart guide, and sync log

## Immediate Next Steps (This Week)

### 1. Review High-Priority Bug Fixes (~30 minutes)

Cherry-pick these critical bug fixes first:

```bash
# Create sync branch
git checkout -b upstream-bugfixes-2026-02-05

# Windows spawn fix
git cherry-pick -x 798317c
# If conflicts: resolve, test, continue

# Message ordering fix (Chinese PR - important UX fix)
git cherry-pick -x 2f6bbcd
# If conflicts: resolve, test, continue

# Font scale compatibility
git cherry-pick -x 308249a

# Test
pnpm test && pnpm build

# Update UPSTREAM_SYNC_LOG.md with results
# Create PR
```

**Expected commits**:
- `798317c`: fix(windows): use absolute path with shell:false for Claude spawn
- `2f6bbcd`: fix(web): 修复切换会话时消息乱序问题 (message ordering)
- `308249a`: fix(web): improve font scale compatibility and defaults

### 2. Evaluate OpenCode Support (~1 hour review)

OpenCode is a major feature upstream added. Review it:

```bash
# See what OpenCode adds
git log --stat --grep="opencode" 6acde5a..upstream/main

# Review the main commits
git show 70b5c22  # feat: support opencode
git show 7e0b139  # feat: add change_title MCP tool support

# Check the file changes
git diff 6acde5a..upstream/main -- 'cli/src/opencode/*'
```

**Decision needed**:
- Do we want OpenCode support in our fork?
- If yes: Plan integration (likely 2-3 hours to cherry-pick and test)
- If no: Document in UPSTREAM_SYNC_LOG.md that we're skipping

### 3. Test the Check Script (~5 minutes)

```bash
# Run the automated check
./scripts/check-upstream.sh

# Verify it shows the upstream commits nicely categorized
```

### 4. Set Up GitHub Action (Optional, ~10 minutes)

If you want weekly automated notifications:

```bash
# The workflow file is already created at:
# .github/workflows/upstream-sync-check.yml

# Commit it:
git add .github/workflows/upstream-sync-check.yml
git commit -m "ci: add weekly upstream sync check workflow"
git push

# It will run every Monday at 9 AM UTC
# You can also trigger manually in GitHub Actions UI
```

## Recommended Priority for Other Upstream Features

### High Priority (Next 1-2 Weeks)

1. **Session Sidebar** (`e9cc98b`)
   - Desktop UI enhancement
   - Likely minimal conflicts
   - Good UX improvement

2. **Reconnecting Feedback** (`5b27f6b`)
   - Shows user when SSE connection lost
   - Small, focused feature

3. **Session Resume Improvements** (`87c79c3`, `1b22fe0`)
   - Automatic continuation
   - Protocol version mismatch detection
   - Core functionality improvements

### Medium Priority (Next Month)

1. **Nerd Font Terminal Icons** (`61dd69d`)
   - Better terminal UX
   - Self-contained feature

2. **About Section** (`7cad11c`)
   - Settings page enhancement
   - Has tests included

3. **BaseLocalLauncher Refactor** (`c5190b4`)
   - Code quality improvement
   - May reduce duplication

### Low Priority (Consider Later)

1. **Server → Hub Rename** (`37e10a8`)
   - Large structural change
   - Questionable value
   - Would require updating many imports

2. **Shared Utility Modules** (`0ceda16`, `b7c06db`, `cdf8226`)
   - Nice refactorings
   - Not critical
   - May cause more conflicts

## Weekly Sync Cadence (Suggested)

### Every Monday

1. Run `./scripts/check-upstream.sh` (or check GitHub issue if action is set up)
2. Review new commits (10-15 minutes)
3. Identify 1-3 commits to cherry-pick
4. Create sync branch and cherry-pick
5. Test and create PR
6. Update `UPSTREAM_SYNC_LOG.md`

**Total time per week**: 30-60 minutes

This keeps us:
- ✅ Up to date with critical fixes
- ✅ Aware of new features
- ✅ Not overwhelmed by backlog
- ✅ In control of our codebase direction

## Decision Points

### Question 1: OpenCode Support?

**Options**:
- **Yes**: We want feature parity with upstream
  - Action: Cherry-pick related commits (2-3 hours)
  - Impact: ~3000 lines of new code
  - Benefit: Full CLI compatibility

- **No**: Not relevant to our use case
  - Action: Document skip in UPSTREAM_SYNC_LOG.md
  - Impact: Our fork diverges on this feature
  - Benefit: Less code to maintain

### Question 2: Server → Hub Rename?

**Options**:
- **Yes**: Stay aligned with upstream naming
  - Action: Create separate branch, rename, update all imports
  - Impact: Large PR, many file changes
  - Benefit: Easier future syncs

- **No**: Keep current naming
  - Action: Continue using `server/`
  - Impact: Permanent naming divergence
  - Benefit: Avoid disruptive change

### Question 3: Weekly Automation?

**Options**:
- **Yes**: Enable GitHub Action
  - Action: Commit the workflow file
  - Impact: Weekly issues created automatically
  - Benefit: Never miss upstream changes

- **No**: Manual checks
  - Action: Run `./scripts/check-upstream.sh` manually
  - Impact: Might forget to check
  - Benefit: Less noise

## Resources Created

All documentation is now in place:

1. **UPSTREAM_SYNC_STRATEGY.md** - Full strategy document
2. **UPSTREAM_SYNC_QUICKSTART.md** - Quick reference guide
3. **UPSTREAM_SYNC_LOG.md** - Track all syncs
4. **scripts/check-upstream.sh** - Automated check script
5. **.github/workflows/upstream-sync-check.yml** - Weekly automation

## Success Metrics

After one month of syncing, we should be able to answer:

- ✅ How many upstream commits have we integrated?
- ✅ What's our average time per weekly sync?
- ✅ Are conflicts becoming more or less common?
- ✅ Are we keeping up with critical bug fixes?
- ✅ Is the cherry-pick strategy working well?

If the answer to the last question is "no", we can reassess and potentially attempt a quarterly rebase.

## Questions or Issues?

If you encounter:
- **Difficult conflicts**: Document in sync log, consider skipping
- **Uncertain about a commit**: Create a discussion issue
- **Strategy not working**: Reassess after a month

The goal is **sustainable syncing**, not perfect alignment. It's okay to diverge on features that don't fit our needs!
