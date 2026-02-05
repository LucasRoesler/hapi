# Upstream Sync Strategy

## Overview

This document outlines the strategy for syncing changes from the upstream repository (`tiann/hapi`) to our fork.

**Upstream Repository**: https://github.com/tiann/hapi
**Fork Point**: `6acde5a` (Release version 0.12.1)
**Last Upstream Sync**: Never (this is the initial sync strategy)

## Current State Analysis

### Divergence Summary

- **Our commits since fork**: 49 commits
- **Upstream commits since fork**: 36 commits
- **Total diverged commits**: 85 commits
- **Rebase feasibility**: ❌ **Conflicts detected immediately**
  - First conflict at: `02c645d` (feat: add bulk archive for sessions in web app)
  - Conflicting file: `web/src/components/SessionList.tsx`

### Major Structural Differences

1. **Directory Rename**: Upstream renamed `server/` → `hub/` (we still use `server/`)
2. **OpenCode Support**: Upstream added full OpenCode CLI support (we don't have this)
3. **Refactorings**: Upstream extracted several utilities into shared modules
4. **Web UI Enhancements**: Both forks have significant web UI changes that overlap

## Key Upstream Features Worth Syncing

### High Priority (Must Have)

1. **OpenCode Support** (`70b5c22`, `7e0b139`)
   - Full CLI integration for OpenCode
   - ~3000+ lines of new code in `cli/src/opencode/`
   - Change title MCP tool support

2. **Session Resume Improvements** (`87c79c3`)
   - Automatic continuation capability
   - Protocol version mismatch detection (`1b22fe0`)

3. **Codex Enhancements**
   - Collaboration modes support (`83f07c1`)
   - New remote mode (`3a1379d`)
   - App server integration with extensive refactoring

4. **Bug Fixes**
   - Windows spawn path fix (`798317c`)
   - Message ordering fix (`2f6bbcd` - Chinese PR)
   - Font scale compatibility (`308249a`, `efbe4f8`)

### Medium Priority (Nice to Have)

1. **Web UI Features**
   - Session sidebar for desktop (`e9cc98b`)
   - Reconnecting feedback banner (`5b27f6b`)
   - Built-in Nerd Font for terminal icons (`61dd69d`)
   - About section with version info and tests (`7cad11c`)

2. **Code Quality Refactorings**
   - BaseLocalLauncher extraction (`c5190b4`)
   - Shared utility modules (`0ceda16`, `b7c06db`, `cdf8226`)

3. **Documentation**
   - CONTRIBUTING.md (`cb693c6`)
   - Expanded AGENTS.md (`78fa9e7`)
   - Updated installation guide and other docs

### Low Priority (Consider Later)

1. **Server→Hub Rename** (`37e10a8`)
   - Large structural change
   - Would require updating all imports and references
   - Questionable value unless we want to stay closely aligned

## Recommended Sync Strategy: Cherry-Pick Workflow

Given the significant divergence and immediate conflicts, **rebasing is not viable**. Instead, use a **selective cherry-pick strategy** with weekly reviews.

### Weekly Sync Process

#### 1. Fetch Upstream Changes (Every Week)

```bash
# Fetch latest upstream
git fetch upstream main

# Review new commits
git log --oneline --no-merges main..upstream/main
```

#### 2. Categorize New Commits

Create a weekly review branch:

```bash
# Create dated review branch
git checkout -b upstream-review-$(date +%Y-%m-%d)
```

Review each commit and categorize:
- **Bug Fixes**: Usually safe to cherry-pick
- **Features**: Evaluate relevance to our fork
- **Refactorings**: May require adaptation
- **Breaking Changes**: Requires careful consideration

#### 3. Selective Cherry-Picking

For each desired commit:

```bash
# Cherry-pick with sign-off
git cherry-pick -x <commit-sha>

# If conflicts occur
git status
# Resolve conflicts manually
git add <resolved-files>
git cherry-pick --continue
```

The `-x` flag adds a reference to the original commit, making tracking easier.

#### 4. Test and Validate

After cherry-picking:

```bash
# Run tests
pnpm test

# Build all packages
pnpm build

# Manual testing as needed
```

#### 5. Create PR for Review

```bash
# Push review branch
git push origin upstream-review-$(date +%Y-%m-%d)

# Create PR with summary of changes
gh pr create --title "Sync upstream changes ($(date +%Y-%m-%d))" \
  --body "## Upstream Commits Cherry-Picked

[List commits with descriptions]

## Testing Done
[Describe testing]

## Breaking Changes
[List any breaking changes]
"
```

### Handling Conflicts

When cherry-picking conflicts occur:

1. **Analyze the conflict**: Understand both changes
2. **Prioritize our features**: Keep our custom functionality
3. **Integrate upstream fixes**: Merge bug fixes and improvements
4. **Document decisions**: Add comments explaining resolution choices

### Tracking Synced Commits

Maintain a log file `UPSTREAM_SYNC_LOG.md`:

```markdown
# Upstream Sync Log

## 2026-02-05

### Cherry-Picked
- `798317c`: fix(windows): use absolute path with shell:false for Claude spawn
- `308249a`: fix(web): improve font scale compatibility and defaults

### Skipped
- `37e10a8`: feat: rename server package to hub (too disruptive)

### Conflicts Resolved
- `2f6bbcd`: Message ordering fix - merged with our SessionList changes
```

## Alternative Strategy: Periodic Rebase Attempts

If we want to maintain closer alignment with upstream, attempt a full rebase quarterly:

### Quarterly Rebase Process

1. **Create a test branch**:
   ```bash
   git checkout -b rebase-test-$(date +%Y-%m)
   git rebase upstream/main
   ```

2. **Resolve all conflicts systematically**:
   - Document each conflict resolution
   - Test incrementally after each resolution
   - Take breaks to avoid fatigue

3. **If successful**:
   - Thoroughly test the rebased branch
   - Create a PR for team review
   - Merge if all tests pass

4. **If too many conflicts**:
   - Abandon rebase
   - Fall back to cherry-pick strategy
   - Document problematic areas

## Automation Opportunities

### 1. Weekly Upstream Check Script

Create `scripts/check-upstream.sh`:

```bash
#!/bin/bash
set -e

echo "Fetching upstream changes..."
git fetch upstream main

NEW_COMMITS=$(git log --oneline --no-merges main..upstream/main | wc -l)

if [ "$NEW_COMMITS" -gt 0 ]; then
    echo "📦 $NEW_COMMITS new commits available upstream:"
    git log --oneline --no-merges main..upstream/main
    echo ""
    echo "Run: git log --stat main..upstream/main"
    echo "To review changes in detail"
else
    echo "✅ No new upstream commits"
fi
```

### 2. GitHub Action for Upstream Monitoring

Create `.github/workflows/upstream-sync-check.yml`:

```yaml
name: Upstream Sync Check

on:
  schedule:
    # Run every Monday at 9 AM UTC
    - cron: '0 9 * * 1'
  workflow_dispatch:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Add upstream remote
        run: git remote add upstream https://github.com/tiann/hapi || true

      - name: Fetch upstream
        run: git fetch upstream main

      - name: Check for new commits
        id: check
        run: |
          COUNT=$(git log --oneline --no-merges main..upstream/main | wc -l)
          echo "count=$COUNT" >> $GITHUB_OUTPUT

          if [ "$COUNT" -gt 0 ]; then
            echo "commits<<EOF" >> $GITHUB_OUTPUT
            git log --oneline --no-merges main..upstream/main >> $GITHUB_OUTPUT
            echo "EOF" >> $GITHUB_OUTPUT
          fi

      - name: Create issue if new commits
        if: steps.check.outputs.count > 0
        uses: actions/github-script@v7
        with:
          script: |
            const count = '${{ steps.check.outputs.count }}';
            const commits = `${{ steps.check.outputs.commits }}`;

            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `Upstream sync: ${count} new commits available`,
              body: `## New Upstream Commits\n\n\`\`\`\n${commits}\n\`\`\`\n\nReview with:\n\`\`\`bash\ngit fetch upstream main\ngit log --stat main..upstream/main\n\`\`\``,
              labels: ['upstream-sync', 'needs-review']
            });
```

## Decision Matrix

Use this matrix to decide whether to cherry-pick a commit:

| Commit Type | Contains Bug Fix | Conflicts | Decision |
|-------------|------------------|-----------|----------|
| Bug Fix | Yes | No | ✅ Cherry-pick |
| Bug Fix | Yes | Yes | ⚠️ Resolve & cherry-pick |
| Feature | N/A | No | ✅ Cherry-pick if relevant |
| Feature | N/A | Yes | ⚠️ Evaluate effort vs value |
| Refactor | N/A | No | ⏸️ Consider later |
| Refactor | N/A | Yes | ❌ Skip unless critical |
| Docs | N/A | Any | ✅ Usually safe to take |

## Recommended Action Plan (This Week)

### Immediate Actions

1. **Cherry-pick critical bug fixes**:
   ```bash
   git checkout -b upstream-bugfixes-2026-02-05
   git cherry-pick -x 798317c  # Windows spawn fix
   git cherry-pick -x 2f6bbcd  # Message ordering fix
   ```

2. **Evaluate OpenCode support**:
   - Review OpenCode feature set
   - Decide if we want this functionality
   - If yes, plan integration (likely requires multiple cherry-picks or manual porting)

3. **Set up monitoring**:
   - Add the weekly check script
   - Set up GitHub Action for notifications

### Next Week

1. **Review remaining upstream commits**
2. **Cherry-pick font scale improvements** (`308249a`, `efbe4f8`)
3. **Consider session sidebar feature** (`e9cc98b`)

### Monthly

1. **Review sync log**
2. **Identify patterns in conflicts**
3. **Consider if structural alignment is needed** (e.g., server→hub rename)

## Conclusion

Given the significant divergence and immediate conflicts, a **selective cherry-pick strategy** is the most pragmatic approach. This allows us to:

- Maintain our custom features and improvements
- Selectively adopt valuable upstream changes
- Avoid painful conflict resolution sessions
- Stay in control of our codebase direction

The weekly sync cadence with automation will ensure we don't fall too far behind and can continuously evaluate what's worth integrating.
