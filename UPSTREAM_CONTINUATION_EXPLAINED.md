# Upstream Session Continuation Feature - Deep Dive

**Commit**: `87c79c3` - "feat: add session resume capability with automatic continuation"
**Author**: weishu
**Date**: Jan 27, 2026

## Overview

Upstream's continuation feature provides **automatic transparent session resumption** when a user tries to send a message to an inactive session. Instead of requiring an explicit "Resume" button click, the system automatically resumes the session behind the scenes when the user types a message.

## Key Concept: "Automatic Continuation"

The core innovation is: **Allow users to send messages to inactive sessions, and auto-resume in the background**.

### User Experience Flow

1. **User has an inactive session** (CLI process exited)
2. **User types a message** in the web UI
3. **System detects session is inactive** before sending
4. **System automatically resumes the session**:
   - Spawns new CLI process with `resumeSessionId` parameter
   - CLI creates a **new session ID** with full conversation history
   - Messages from old session are **merged** into new session
   - UI seamlessly switches to new session ID
5. **Message is sent** to the now-active session
6. **User sees no interruption** - just a brief loading state

### UI Changes

**Before** (without continuation):
```
Session is inactive. Controls are disabled.
[Composer is disabled, can't type]
```

**After** (with continuation):
```
Session is inactive. Sending will resume it automatically.
[Composer is enabled, user can type and send]
```

## Architecture Components

### 1. Session Merging (`sessionCache.ts` - NEW FILE)

The `SessionCache` class manages session state and provides the merge capability:

```typescript
async mergeSessions(oldSessionId: string, newSessionId: string, namespace: string): Promise<void>
```

**What happens during merge**:

1. **Message Migration**: All messages from old session → new session
   ```typescript
   this.store.messages.mergeSessionMessages(oldSessionId, newSessionId)
   ```

2. **Metadata Preservation**: Merge metadata from both sessions
   - Keep session name from old session
   - Keep newer summary if exists
   - Preserve important metadata

3. **Todos Transfer**: Move todo list to new session
   ```typescript
   this.store.sessions.setSessionTodos(
       newSessionId,
       oldStored.todos,
       oldStored.todosUpdatedAt,
       namespace
   )
   ```

4. **Old Session Cleanup**: Delete old session record
   ```typescript
   this.store.sessions.deleteSession(oldSessionId, namespace)
   this.sessions.delete(oldSessionId)
   this.publisher.emit({ type: 'session-removed', sessionId: oldSessionId })
   ```

**Result**: User continues in the same logical conversation, just with a new underlying session ID.

### 2. Message Merging (`messages.ts`)

```typescript
export function mergeSessionMessages(
    db: Database,
    fromSessionId: string,
    toSessionId: string
): { moved: number; oldMaxSeq: number; newMaxSeq: number }
```

**Smart merge algorithm**:

1. **Preserve ordering**: Shift all new session messages by old session's max seq
   ```typescript
   // If old session had messages 1-10
   // And new session has messages 1-5
   // New session messages become 11-15
   db.prepare(
       'UPDATE messages SET seq = seq + ? WHERE session_id = ?'
   ).run(oldMaxSeq, toSessionId)
   ```

2. **Handle `localId` collisions**: Remove duplicate local IDs
   - Local IDs are client-generated unique identifiers
   - If both sessions have same local ID, clear it from old messages
   - Prevents duplicate message detection issues

3. **Move all old messages**: Update session_id for all old messages
   ```typescript
   db.prepare(
       'UPDATE messages SET session_id = ? WHERE session_id = ?'
   ).run(toSessionId, fromSessionId)
   ```

**Result**: Complete conversation history in the new session, in chronological order.

### 3. Resume Flow (`syncEngine.ts`)

```typescript
async resumeSession(sessionId: string, namespace: string): Promise<ResumeSessionResult>
```

**Step-by-step process**:

1. **Validate access**: Check user has permission for this session
   ```typescript
   const access = this.sessionCache.resolveSessionAccess(sessionId, namespace)
   ```

2. **Check if already active**: If active, return immediately
   ```typescript
   if (session.active) {
       return { type: 'success', sessionId: access.sessionId }
   }
   ```

3. **Extract resume token**: Get the Claude/Codex/Gemini session ID
   ```typescript
   const resumeToken = flavor === 'codex'
       ? metadata.codexSessionId
       : flavor === 'gemini'
           ? metadata.geminiSessionId
           : metadata.claudeSessionId
   ```

4. **Find online machine**: Locate machine that can run this session
   - Prefer original machine ID
   - Fall back to matching hostname
   - Fail if no machines online

5. **Spawn with resume token**: Call RPC to spawn new session
   ```typescript
   const spawnResult = await this.rpcGateway.spawnSession(
       targetMachine.id,
       metadata.path,
       flavor,
       undefined,  // model
       undefined,  // yolo
       undefined,  // sessionType
       undefined,  // worktreeName
       resumeToken // THIS IS THE KEY - passes Claude session ID
   )
   ```

6. **Wait for activation**: Poll until session becomes active (15s timeout)
   ```typescript
   const becameActive = await this.waitForSessionActive(spawnResult.sessionId)
   ```

7. **Merge sessions**: If new session has different ID, merge old into new
   ```typescript
   if (spawnResult.sessionId !== access.sessionId) {
       await this.sessionCache.mergeSessions(
           access.sessionId,      // old hapi session
           spawnResult.sessionId, // new hapi session
           namespace
       )
   }
   ```

**Result**: New active session with complete history, old session removed.

### 4. UI Integration (`useSendMessage.ts`)

The hook now accepts `resolveSessionId` callback:

```typescript
export function useSendMessage(
    api: ApiClient | null,
    sessionId: string | null,
    options?: {
        resolveSessionId?: (sessionId: string) => Promise<string>
        onSessionResolved?: (sessionId: string) => void
    }
)
```

**Pre-send resolution**:

```typescript
const sendMessage = (text: string, attachments?: AttachmentMetadata[]) => {
    let targetSessionId = sessionId

    if (options?.resolveSessionId) {
        // Call resume API before sending
        const resolved = await options.resolveSessionId(sessionId)

        if (resolved && resolved !== sessionId) {
            // Session was resumed with new ID
            options.onSessionResolved?.(resolved)
            targetSessionId = resolved
        }
    }

    // Send to resolved (possibly new) session ID
    mutation.mutate({
        sessionId: targetSessionId,
        text,
        localId,
        createdAt,
        attachments,
    })
}
```

**Loading state during resolution**:
- `isResolving` state tracks resume operation
- `isSending` includes both resolve and actual send
- User sees loading indicator during auto-resume

### 5. Router Integration (`router.tsx`)

The session page provides the resolve callbacks:

```typescript
const { sendMessage, retryMessage, isSending } = useSendMessage(api, sessionId, {
    resolveSessionId: async (currentSessionId) => {
        if (!api || !session || session.active) {
            return currentSessionId // No need to resolve
        }

        // Call resume API
        return await api.resumeSession(currentSessionId)
    },

    onSessionResolved: (resolvedSessionId) => {
        // Seed message window with old session's messages
        seedMessageWindowFromSession(session.id, resolvedSessionId)

        // Update cache optimistically
        queryClient.setQueryData(queryKeys.session(resolvedSessionId), {
            session: { ...session, id: resolvedSessionId, active: true }
        })

        // Navigate to new session URL
        navigate({
            to: '/sessions/$sessionId',
            params: { sessionId: resolvedSessionId },
            replace: true // Replace history so back button works
        })
    }
})
```

**What `seedMessageWindowFromSession` does**:
- Copies message window state from old session to new session
- Prevents UI flicker during transition
- User sees same messages before/after resume

## Comparison with Your Implementation

| Aspect | Upstream (Automatic) | Your Fork (Manual) |
|--------|---------------------|-------------------|
| **Trigger** | User sends message | User clicks "Resume" button |
| **User Action** | Just type and send | Click button, wait, then send |
| **Session ID Change** | Transparent (URL updates) | Explicit reload |
| **Message Preservation** | Server-side merge | Client spawns with --resume flag |
| **RPC Approach** | `resumeSessionId` in spawn-happy-session | Separate `spawn-resumed-session` handler |
| **UI State** | Composer always enabled | Composer disabled when inactive |
| **Error Handling** | Toast on resume failure | Dedicated error states |
| **Additional Features** | - | Fork, reload, YOLO modes |

## Technical Differences

### RPC Handler Approach

**Upstream**:
```typescript
// Adds resumeSessionId parameter to existing spawn-happy-session
this.rpcHandlerManager.registerHandler('spawn-happy-session', async (params) => {
    const { directory, sessionId, resumeSessionId, ... } = params

    const result = await spawnSession({
        directory,
        sessionId,
        resumeSessionId, // Pass to CLI
        ...
    })
})
```

**Your Fork**:
```typescript
// Creates separate spawn-resumed-session handler
this.rpcHandlerManager.registerHandler('spawn-resumed-session', async (params) => {
    const { hapiSessionId, directory, sessionIdToResume, fork, yolo } = params

    const result = await spawnSession({
        directory,
        sessionId: hapiSessionId,      // Use existing hapi ID
        resumeSessionId: sessionIdToResume,
        forkSession: fork === true,
        yolo: yolo === true
    })
})
```

**Key Difference**: Upstream lets the new spawn create a new hapi session ID, then merges server-side. You reuse the existing hapi session ID and let the CLI handle resume.

### Session ID Continuity

**Upstream**:
- New CLI spawn → new hapi session ID
- Server merges old session into new session
- Messages and metadata copied over
- Old session deleted
- URL changes to new session ID

**Your Fork**:
- New CLI spawn → **same** hapi session ID (passed via --hapi-session-id)
- CLI resumes with existing Claude session ID
- SessionStart hook updates metadata.claudeSessionId
- URL stays the same

**Trade-offs**:

Upstream approach:
- ✅ Clean separation: each CLI spawn = new session
- ✅ Server has full control over merge logic
- ❌ More complex: requires message merging, metadata merging, session deletion
- ❌ URL changes (requires navigation)

Your approach:
- ✅ Simpler: session ID stays constant
- ✅ No URL change needed
- ❌ Reusing session IDs could be confusing in logs
- ❌ Relies on SessionStart hook firing correctly

## Database Schema Impact

Upstream added session merging, which requires:

1. **Message sequence renumbering**: Update seq field during merge
2. **Local ID collision handling**: Clear duplicate local IDs
3. **Metadata merging**: Smart merge of session metadata
4. **Atomic operations**: All within a transaction

Your approach doesn't need these because session ID remains constant.

## Pros of Upstream's Approach

1. **✅ Better UX**: No explicit resume button needed
2. **✅ Seamless**: User can just start typing
3. **✅ Clear session boundaries**: Each spawn = new session ID
4. **✅ Server-side control**: Merge logic centralized
5. **✅ Handles edge cases**: Smart metadata merging, collision detection

## Pros of Your Approach

1. **✅ Simpler architecture**: No server-side session merging
2. **✅ Stable URLs**: Session ID never changes
3. **✅ More features**: Fork, reload, YOLO modes
4. **✅ Universal**: Works across all three CLIs
5. **✅ Better error handling**: Dedicated UI states and toasts
6. **✅ More explicit**: User knows when they're resuming

## Why Upstream Has Less Code

Upstream's implementation *looks* simpler (1 commit vs your 13), but:

1. **Different scope**: They only implemented basic resume
2. **No extra features**: No fork, reload, or YOLO
3. **Server-side complexity**: The merge logic is substantial (~200 lines)
4. **Your features are additive**: You built resume + many enhancements

Your 13 commits include:
- Universal CLI support (Claude, Gemini, Codex)
- Fork and reload features
- YOLO mode
- Extensive error handling
- UI polish and toast notifications
- Concurrency control
- Parameter validation

If you stripped those features, your core resume would be similar complexity.

## Could You Adopt Their Approach?

**Possible, but challenging**:

### What you'd need to cherry-pick:
1. ✅ `sessionCache.ts` (117 lines) - Session caching and merging
2. ✅ Message merging in `messages.ts` (~50 lines)
3. ✅ Resume flow in `syncEngine.ts` (~127 lines)
4. ⚠️ Changes to `spawn-happy-session` RPC handler
5. ⚠️ UI changes to `useSendMessage`, `SessionChat`, router

### Conflicts to resolve:
1. 🔴 **apiMachine.ts**: Different RPC handler structure
2. 🔴 **runner/run.ts**: Different spawn parameter handling
3. 🟡 **SessionChat.tsx**: Your fork/reload UI vs their auto-resume
4. 🟡 **useSendMessage.ts**: Your error handling vs their resolve logic

### Estimated effort:
- 8-12 hours of conflict resolution
- 4-6 hours of testing
- Risk of breaking your fork/reload features

### Recommendation:

**❌ Don't adopt their continuation approach** because:

1. Your implementation works well and is more feature-rich
2. High conflict risk with your fork/reload features
3. Their "automatic" approach might confuse users who want explicit control
4. You'd lose URL stability (session IDs change)
5. Not worth the integration effort

**✅ What you could learn from it**:

1. **Server-side session caching**: Their `SessionCache` class is well-designed
   - Could inspire improvements to your session state management

2. **Message window seeding**: `seedMessageWindowFromSession` prevents flicker
   - Could use this technique in your resume flow

3. **Smart metadata merging**: Their metadata merge logic handles edge cases
   - Could improve your metadata handling

## Summary

Upstream's continuation feature provides **transparent automatic session resumption** when sending messages to inactive sessions. It uses:

- Server-side session merging
- Message sequence renumbering
- Metadata smart-merging
- Seamless URL navigation
- Pre-send session resolution

Your implementation is **more comprehensive** with:

- Fork and reload capabilities
- YOLO mode
- Stable session IDs
- Better error handling
- Universal CLI support

**Both are valid approaches solving the same problem differently**. Yours prioritizes features and control, theirs prioritizes seamlessness and simplicity.

For your fork, **stick with your implementation**. The automatic continuation is elegant but doesn't provide enough value to justify the integration effort and potential feature loss.
