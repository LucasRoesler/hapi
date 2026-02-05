# Upstream Sync Log

This file tracks all syncs from the upstream repository (`tiann/hapi`).

## Format

For each sync session, record:
- Date
- Commits cherry-picked (with SHA and description)
- Commits skipped (with reason)
- Conflicts encountered and how they were resolved
- Testing performed
- Any breaking changes or notable impacts

---

## 2026-02-05 - Initial Upstream Remote Setup

### Actions Taken
- Added upstream remote: https://github.com/tiann/hapi
- Fetched upstream/main branch
- Analyzed divergence (49 our commits vs 36 upstream commits)
- Tested rebase feasibility: ❌ **Immediate conflicts detected**

### Rebase Test Results
- **Conflict at**: `02c645d` (feat: add bulk archive for sessions in web app)
- **Conflicting file**: `web/src/components/SessionList.tsx`
- **Conclusion**: Rebase is not viable; cherry-pick strategy adopted

### Key Findings

#### Major Upstream Features We Don't Have
1. **OpenCode Support** - Full CLI integration (~3000 lines)
2. **Server→Hub Rename** - Structural change
3. **Enhanced Codex Remote Mode** - App server integration
4. **Session Sidebar** - Desktop UI enhancement
5. **Nerd Font Support** - Terminal icons

#### Notable Bug Fixes Available
1. `798317c` - Windows spawn path fix
2. `2f6bbcd` - Message ordering fix (Chinese PR)
3. `308249a` - Font scale compatibility fix

### Next Steps
- Review and create upstream sync strategy document ✅
- Set up weekly check automation ✅
- Decide on first batch of commits to cherry-pick

### Cherry-Picked
- None yet

### Skipped
- None yet (awaiting review)

### Conflicts Resolved
- None yet

---

## Template for Future Entries

```markdown
## YYYY-MM-DD - Brief Description

### Cherry-Picked
- `<sha>`: <commit message> - <notes>

### Skipped
- `<sha>`: <commit message> - <reason>

### Conflicts Resolved
- `<sha>`: <file path> - <resolution description>

### Testing Done
- <test description>

### Breaking Changes
- <if any>

### Notes
- <additional context>
```
