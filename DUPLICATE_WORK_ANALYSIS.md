# Duplicate Work Analysis: Our Fork vs Upstream

**Analysis Date**: 2026-02-05
**Fork Point**: `6acde5a` (Release version 0.12.1)
**Our Branch**: `main` (49 commits ahead)
**Upstream Branch**: `upstream/main` (36 commits ahead)

## Executive Summary

**Significant duplicate work detected** in several key areas:

- ✅ **Session Resume**: Both implemented (different approaches)
- ✅ **Version Tracking**: Both implemented (different scopes)
- ⚠️ **Settings UI**: Parallel enhancements (complementary)
- ❌ **Bulk Archive**: Only in our fork
- ❌ **OpenCode Support**: Only upstream
- ❌ **Expandable Composer**: Only in our fork

## Detailed Analysis

### 1. Session Resume Feature ⚠️ MAJOR OVERLAP

**Status**: Both forks implemented session resume, **but with different approaches**

#### Our Implementation (13 commits)
```
58db139 feat: implement session resume with spawn functionality
e80558c feat: add concurrency control to session resume
ede58c5 feat: rename restart to resume throughout the codebase
5ee9add feat: implement universal resume functionality for all three CLIs
6673a7b fix: resolve session resume duplicate creation bug
521d198 fix: resolve session resume parameter mismatch and silent error handling
153357a fix: add resumeSessionId parameter support to geminiLocal
fde0caa feat: improve restart session error messages
31f0df2 fix: add missing dialog.resume.sessionNotFound translation key
c64deb4 feat: add restart capability for inactive sessions
b9d9d6f fix: add restartSession RPC handler with not-implemented error
2d4b518 fix: improve error handling with specific HTTP status codes for restart
5d571b8 feat: add toast notifications for bulk archive and restart operations
```

**Our Approach**:
- Focus on spawning new CLI process with `--resume` flag
- Implemented `spawn-resumed-session` RPC handler
- Supports fork and YOLO modes
- Universal across all three CLIs (Claude, Gemini, Codex)
- Heavy focus on error handling and edge cases

**Files Modified**:
- `cli/src/api/apiMachine.ts` (spawn-resumed-session handler)
- `cli/src/runner/run.ts` (resume args support)
- `cli/src/agent/sessionFactory.ts`
- `cli/src/commands/claude.ts`
- UI components for resume button and error states

#### Upstream Implementation (1 commit)
```
87c79c3 feat: add session resume capability with automatic continuation
```

**Upstream Approach**:
- Focus on message merging and automatic continuation
- Database schema migration for message handling
- Added `resumeSessionId` parameter to spawn-happy-session
- Server-side session caching (`sessionCache.ts`)
- Message store enhancements

**Files Modified**:
- `cli/src/api/apiMachine.ts` (resumeSessionId in spawn-happy-session)
- `server/src/store/messages.ts` (new message merging logic)
- `server/src/sync/sessionCache.ts` (NEW FILE - 117 lines)
- `server/src/sync/syncEngine.ts` (continuation logic)
- Web UI changes for sending during inactive state

#### Overlap Assessment

**Conflict Probability**: 🔴 **HIGH** (First conflict detected in our rebase test)

**Compatibility**:
- Different RPC handlers: `spawn-resumed-session` (ours) vs `resumeSessionId` in `spawn-happy-session` (theirs)
- Both modify `cli/src/api/apiMachine.ts` - **guaranteed conflicts**
- Both modify `cli/src/runner/run.ts` - likely conflicts
- Different server-side approaches - our fork/reload vs their message merging

**Recommendations**:
1. ⚠️ **Do NOT cherry-pick** upstream's `87c79c3` - will cause major conflicts
2. ✅ **Evaluate their approach**: Session caching and message merging are interesting
3. ✅ **Consider hybrid**: Could merge their `sessionCache.ts` concept separately
4. ✅ **Document divergence**: Our implementation is more comprehensive with universal CLI support

**Estimated Integration Effort**: 8-16 hours (high conflict resolution)

---

### 2. Version Tracking ⚠️ MODERATE OVERLAP

**Status**: Both implemented version tracking, **complementary scopes**

#### Our Implementation (3 commits)
```
1eedeb1 feat: add version tracking with git SHA and build time
5edba38 fix: correct version.json import path in version route
9901e1a fix: use import.meta.dir for version.json path resolution
```

**Our Approach**:
- `/api/version` endpoint with git SHA, branch, build time
- HTML meta tags with version info
- Build-time script (`scripts/get-version.ts`)
- Embedded in compiled binary

**Files Created/Modified**:
- `scripts/get-version.ts` (NEW)
- `server/src/web/routes/version.ts` (NEW)
- `web/vite.config.ts` (meta tag injection)

#### Upstream Implementation (2 commits)
```
7cad11c Add About section to settings page with version info and tests
1b22fe0 feat: add CLI-server protocol version mismatch detection
```

**Upstream Approach**:
- Settings page "About" section with UI display
- Protocol version constant (`shared/src/version.ts`)
- Protocol version mismatch detection between CLI and server
- Version header (`X-Hapi-Protocol-Version`)
- **Unit tests included** (`settings/index.test.tsx`)

**Files Created/Modified**:
- `shared/src/version.ts` (PROTOCOL_VERSION constant)
- `web/src/routes/settings/index.tsx` (About section UI)
- `web/src/routes/settings/index.test.tsx` (NEW - tests)
- `cli/src/utils/errorUtils.ts` (version mismatch detection)
- `cli/src/utils/errorUtils.test.ts` (NEW - tests)

#### Overlap Assessment

**Conflict Probability**: 🟡 **MEDIUM**

**Compatibility**:
- **Complementary features**: Ours provides version endpoint, theirs provides version UI
- **Both modify** `web/src/routes/settings/index.tsx` - likely conflicts
- **Different scopes**: We focus on deployment tracking, they focus on protocol compatibility

**Recommendations**:
1. ✅ **Cherry-pick** `1b22fe0` (protocol version mismatch) - **HIGH VALUE**
   - Prevents CLI/server version mismatches
   - Includes useful error handling
   - Minimal conflicts expected
2. ✅ **Cherry-pick** `7cad11c` (About section) - **MODERATE VALUE**
   - Will conflict with our settings changes
   - Includes test infrastructure setup (Vitest)
   - Good UX addition
3. ✅ **Merge both approaches**: Our API + their UI + their protocol checks

**Estimated Integration Effort**: 2-4 hours

---

### 3. Settings Page UI ⚠️ MODERATE OVERLAP

**Status**: Both added different features to settings page

#### Our Additions
```
1d1298d feat: add PWA force update controls to settings menu
aa91b75 feat: add base paths management UI in settings
5ee9add feat: implement universal resume functionality for all three CLIs (resume settings)
```

**Features**:
- PWA update controls
- Base paths management
- Resume-related settings

#### Upstream Additions
```
7cad11c Add About section to settings page with version info and tests
efbe4f8 feat(web): add font size setting
```

**Features**:
- About section (version info, website link)
- Font size selector
- **Test infrastructure** (Vitest setup)

#### Overlap Assessment

**Conflict Probability**: 🟡 **MEDIUM**

**Compatibility**: **Complementary** - different settings sections

**Recommendations**:
1. ✅ **Cherry-pick both** font size and About section
2. ✅ **Manual merge** will be needed for `settings/index.tsx`
3. ✅ **Bonus**: Get their Vitest test setup

**Estimated Integration Effort**: 1-2 hours

---

### 4. Web UI Router Changes ⚠️ MODERATE OVERLAP

**Status**: Both modified routing logic

#### Our Changes
```
aa91b75 feat: add base paths management UI in settings (settings route)
```

#### Upstream Changes
```
87c79c3 feat: add session resume capability with automatic continuation
e9cc98b feat(web): Add session sidebar for desktop, keep mobile single-page layout
5b27f6b feat(web): Add reconnecting feedback when SSE connection is lost
```

**Upstream Features**:
- Session sidebar (desktop layout)
- Reconnecting feedback banner
- Session resume routing

#### Overlap Assessment

**Conflict Probability**: 🟡 **MEDIUM**

**Recommendations**:
1. ⏸️ **Defer** `e9cc98b` (session sidebar) - large UI restructure
2. ✅ **Cherry-pick** `5b27f6b` (reconnecting feedback) - good UX, minimal conflicts
3. ⚠️ **Skip** resume routing changes (conflicts with our implementation)

**Estimated Integration Effort**: 3-5 hours (mainly for session sidebar if desired)

---

### 5. Codex Changes ❌ NO OVERLAP

**Status**: Only upstream has Codex changes, we haven't touched Codex

#### Upstream Changes
```
3a1379d feat: new codex remote mode
83f07c1 feat: support codex collaboration_modes
2735421 remove unsupported builtin commands for codex
```

**Files Modified** (upstream only):
- `cli/src/codex/codexRemoteLauncher.ts` (massive refactor)
- `cli/src/codex/codexAppServerClient.ts` (NEW - 409 lines)
- `cli/src/codex/utils/appServerConfig.ts` (NEW - 151 lines)
- Many other new Codex utilities

#### Recommendations
✅ **Safe to cherry-pick** if Codex support is important
- Low conflict risk (we haven't touched these files)
- Self-contained feature

**Estimated Integration Effort**: 1-2 hours (mainly testing)

---

### 6. OpenCode Support ❌ NO OVERLAP

**Status**: Only upstream has OpenCode, completely new

#### Upstream Implementation
```
70b5c22 feat: support opencode
7e0b139 feat: add change_title MCP tool support to OpenCode
```

**New Files** (~3000 lines):
- `cli/src/opencode/*` (entire new directory)
- `cli/src/ui/ink/OpencodeDisplay.tsx`
- `cli/src/commands/opencode.ts`

#### Recommendations
✅ **Safe to cherry-pick** if desired
- No conflicts (completely new code)
- Self-contained feature
- Significant new functionality

**Estimated Integration Effort**: 2-3 hours (mainly testing)

---

### 7. Bulk Archive Feature ✅ UNIQUE TO OUR FORK

**Status**: Only we have this feature

#### Our Implementation (6 commits)
```
02c645d feat: add bulk archive for sessions in web app
6c5b4e5 fix(security): add confirmation dialog for bulk archive operations
9d00d9b fix: replace Promise.all with Promise.allSettled in bulk archive
b03ac87 fix: add user-visible error messages and retry for bulk archive
9d0e033 fix: add loading states and accessibility to bulk archive UI
5d571b8 feat: add toast notifications for bulk archive and restart operations
```

**Our Unique Features**:
- Bulk session archiving
- Security confirmation dialogs
- Error handling and retry logic
- Loading states and accessibility
- Toast notifications

#### Recommendations
✅ **No upstream equivalent** - this is our unique contribution
- Could contribute back to upstream if desired

---

### 8. Expandable Composer ✅ UNIQUE TO OUR FORK

**Status**: Only we have this feature

#### Our Implementation (3 commits)
```
f8c8cb4 feat: add expandable composer with drag and double-tap gestures
5ce2efc feat: enhance expandable composer with snap points and improved UX
b8b88b8 docs: add expandable composer implementation proposal
```

**Our Unique Features**:
- Expandable message composer
- Drag gestures
- Double-tap to expand
- Snap points

#### Recommendations
✅ **No upstream equivalent** - our unique mobile UX improvement

---

### 9. Fork and Reload Sessions ✅ UNIQUE TO OUR FORK

**Status**: Only we have this feature

#### Our Implementation (5 commits)
```
f337924 feat: add fork and reload session features (beta)
8a03b85 feat: add UI for fork and reload session features
e4f632c fix: add missing translations for fork and reload actions
9cb31dd feat: add YOLO toggle to fork and reload operations
```

**Our Unique Features**:
- Session forking
- Session reloading
- YOLO mode
- Full UI integration

#### Recommendations
✅ **No upstream equivalent** - our unique workflow features

---

## Files with Overlapping Changes

33 files modified by both forks:

### High-Risk Files (Major Conflicts Expected)
1. `cli/src/api/apiMachine.ts` ⚠️ - Different RPC handlers
2. `cli/src/runner/run.ts` ⚠️ - Different spawn logic
3. `web/src/routes/settings/index.tsx` ⚠️ - Different UI sections
4. `web/src/hooks/mutations/useSendMessage.ts` ⚠️ - Different enhancements
5. `web/src/router.tsx` ⚠️ - Different routing changes

### Medium-Risk Files
6. `web/src/components/SessionList.tsx` - Already conflicted in rebase test
7. `web/src/components/AssistantChat/HappyComposer.tsx`
8. `cli/src/modules/common/rpcTypes.ts`
9. `web/src/lib/locales/en.ts` - Translation keys
10. `web/src/lib/locales/zh-CN.ts` - Translation keys

### Low-Risk Files (Likely Auto-Mergeable)
- `package.json`, `bun.lock` - Dependency changes
- `.gitignore` - Simple additions
- Various CSS and configuration files

---

## Summary of Duplicate Work

| Feature | Our Fork | Upstream | Overlap | Action |
|---------|----------|----------|---------|--------|
| **Session Resume** | ✅ (13 commits) | ✅ (1 commit) | 🔴 HIGH | Skip upstream version |
| **Protocol Version** | ❌ | ✅ | 🟢 NONE | ✅ Cherry-pick |
| **Version Tracking** | ✅ (API) | ✅ (UI) | 🟡 MEDIUM | ✅ Merge both |
| **About Section** | ❌ | ✅ | 🟢 NONE | ✅ Cherry-pick |
| **Font Size Setting** | ❌ | ✅ | 🟢 NONE | ✅ Cherry-pick |
| **Session Sidebar** | ❌ | ✅ | 🟢 NONE | ⏸️ Consider later |
| **Reconnecting Banner** | ❌ | ✅ | 🟢 NONE | ✅ Cherry-pick |
| **OpenCode Support** | ❌ | ✅ | 🟢 NONE | ⏸️ Decide if wanted |
| **Codex Remote Mode** | ❌ | ✅ | 🟢 NONE | ✅ Cherry-pick if using Codex |
| **Bulk Archive** | ✅ (6 commits) | ❌ | 🟢 NONE | Our unique feature |
| **Expandable Composer** | ✅ (3 commits) | ❌ | 🟢 NONE | Our unique feature |
| **Fork/Reload Sessions** | ✅ (5 commits) | ❌ | 🟢 NONE | Our unique feature |
| **Base Paths UI** | ✅ | ❌ | 🟢 NONE | Our unique feature |
| **PWA Force Update** | ✅ | ❌ | 🟢 NONE | Our unique feature |

---

## Recommendations by Priority

### Immediate (This Week) - Low Hanging Fruit

1. ✅ **Protocol Version Mismatch** (`1b22fe0`)
   - High value, low conflicts
   - Prevents version compatibility issues
   - Estimated: 30 minutes

2. ✅ **Reconnecting Feedback Banner** (`5b27f6b`)
   - Good UX improvement
   - Low conflict risk
   - Estimated: 30 minutes

3. ✅ **Font Size Setting** (`efbe4f8`)
   - Accessibility improvement
   - Minimal conflicts
   - Estimated: 45 minutes

### Short Term (Next 2 Weeks)

4. ✅ **About Section** (`7cad11c`)
   - Includes test infrastructure
   - Will conflict with our settings changes
   - Estimated: 2 hours

5. ✅ **Codex Enhancements** (`3a1379d`, `83f07c1`)
   - If using Codex
   - Low conflict risk
   - Estimated: 1-2 hours

6. ✅ **Bug Fixes**
   - Message ordering (`2f6bbcd`)
   - Windows spawn path (`798317c`)
   - Font compatibility (`308249a`)
   - Estimated: 1 hour total

### Medium Term (Next Month)

7. ⏸️ **Session Sidebar** (`e9cc98b`)
   - Large UI restructure
   - Evaluate if worth the effort
   - Estimated: 4-6 hours

8. ⏸️ **OpenCode Support** (`70b5c22`, `7e0b139`)
   - Only if we want this CLI support
   - Low conflicts but large addition
   - Estimated: 3-4 hours

### Do NOT Cherry-Pick

9. ❌ **Session Resume** (`87c79c3`)
   - Our implementation is more comprehensive
   - High conflict risk
   - Not worth the integration effort

---

## Work Efficiency Analysis

### Wasted Effort

**Session Resume**: ~13 commits (ours) vs 1 commit (theirs)
- **Estimated duplicate effort**: 16-24 hours
- **Reason for duplication**: Parallel development, no coordination
- **Impact**: Medium - our implementation is more feature-rich, so not entirely wasted

### Valuable Parallel Work

**Complementary Features**:
- Our: Bulk archive, expandable composer, fork/reload
- Theirs: OpenCode, session sidebar, protocol versioning
- **Net positive**: Both forks added unique value

### Missed Opportunities

If we had synced earlier:
- Could have built on their protocol version detection
- Could have leveraged their test infrastructure setup
- Could have avoided session resume duplication

**Recommendation**: **Weekly sync cadence is critical** to avoid future duplication

---

## Conclusion

**Total Duplicate Work**: ~15-20% of commits have some overlap
- **Major Duplication**: Session resume feature (different approaches)
- **Complementary Work**: Version tracking, settings UI
- **Unique Features**: Both forks have valuable unique contributions

**Going Forward**:
1. ✅ Implement weekly sync process
2. ✅ Cherry-pick low-conflict upstream improvements
3. ❌ Skip upstream session resume (ours is better)
4. ⏸️ Evaluate large features (OpenCode, session sidebar) based on needs
5. 📝 Document our unique features for potential upstream contribution

**Estimated Sync Effort** (first sync):
- Low-hanging fruit: 2-3 hours
- All recommended items: 8-12 hours
- Including session sidebar: 12-18 hours
