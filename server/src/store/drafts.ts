import type { Database } from 'bun:sqlite'

type DraftRow = {
    session_id: string
    namespace: string
    draft_text: string
    draft_timestamp: number
}

export type DraftData = {
    text: string
    timestamp: number
}

/**
 * Get draft for a session
 */
export function getDraft(db: Database, sessionId: string, namespace: string): DraftData | null {
    const row = db.prepare(`
        SELECT draft_text, draft_timestamp
        FROM session_drafts
        WHERE session_id = ? AND namespace = ?
    `).get(sessionId, namespace) as Pick<DraftRow, 'draft_text' | 'draft_timestamp'> | undefined

    if (!row) return null

    return {
        text: row.draft_text,
        timestamp: row.draft_timestamp
    }
}

/**
 * Save draft for a session using Last-Write-Wins (LWW) strategy.
 * Returns the actual draft stored (may differ from request if LWW rejected the update).
 */
export function setDraft(
    db: Database,
    sessionId: string,
    namespace: string,
    text: string,
    timestamp: number
): DraftData {
    // Validate timestamp is reasonable (not too far in past or future)
    const serverTime = Date.now()
    const maxAllowedTimestamp = serverTime + 5000 // 5 seconds future tolerance for clock skew
    const minAllowedTimestamp = serverTime - 3600000 // 1 hour past tolerance

    if (timestamp > maxAllowedTimestamp) {
        console.warn('[Drafts] Rejected future timestamp', {
            sessionId,
            timestamp,
            serverTime,
            diff: timestamp - serverTime
        })
        // Use server time instead
        timestamp = serverTime
    } else if (timestamp < minAllowedTimestamp) {
        console.warn('[Drafts] Rejected timestamp too far in past', {
            sessionId,
            timestamp,
            serverTime,
            diff: serverTime - timestamp
        })
        // Use server time instead
        timestamp = serverTime
    }

    // Wrap check-and-set in transaction for atomicity
    db.exec('BEGIN IMMEDIATE')
    try {
        // Last-Write-Wins logic: Check if existing draft is newer
        const row = db.prepare(`
            SELECT draft_text, draft_timestamp
            FROM session_drafts
            WHERE session_id = ? AND namespace = ?
        `).get(sessionId, namespace) as Pick<DraftRow, 'draft_text' | 'draft_timestamp'> | undefined

        if (row && row.draft_timestamp > timestamp) {
            // Reject older update, return current draft
            db.exec('ROLLBACK')
            console.log('[Drafts] Rejected older draft update', {
                sessionId,
                incoming: timestamp,
                existing: row.draft_timestamp
            })
            return {
                text: row.draft_text,
                timestamp: row.draft_timestamp
            }
        }

        // Accept newer update
        db.prepare(`
            INSERT OR REPLACE INTO session_drafts (session_id, namespace, draft_text, draft_timestamp)
            VALUES (?, ?, ?, ?)
        `).run(sessionId, namespace, text, timestamp)

        db.exec('COMMIT')
        console.log('[Drafts] Saved draft', { sessionId, timestamp, length: text.length })

        return { text, timestamp }
    } catch (error) {
        db.exec('ROLLBACK')
        throw error
    }
}

/**
 * Clear draft for a session
 */
export function clearDraft(db: Database, sessionId: string, namespace: string): void {
    db.prepare(`
        DELETE FROM session_drafts
        WHERE session_id = ? AND namespace = ?
    `).run(sessionId, namespace)

    console.log('[Drafts] Cleared draft', { sessionId })
}
