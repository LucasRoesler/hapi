import { describe, expect, it, beforeEach } from 'bun:test'
import { Store } from './index'

describe('Draft Store', () => {
    let store: Store

    beforeEach(() => {
        store = new Store(':memory:')
    })

    describe('getDraft', () => {
        it('returns null for non-existent draft', () => {
            const draft = store.drafts.getDraft('session-1', 'default')
            expect(draft).toBeNull()
        })

        it('returns draft after saving', () => {
            // Create session first (foreign key constraint)
            const session = store.sessions.getOrCreateSession(null, { path: '/test' }, null, 'default')

            const timestamp = Date.now() - 1000 // 1 second ago (within tolerance)
            store.drafts.setDraft(session.id, 'default', 'Hello world', timestamp)

            const draft = store.drafts.getDraft(session.id, 'default')
            expect(draft).toEqual({
                text: 'Hello world',
                timestamp
            })
        })

        it('filters by namespace', () => {
            // Create sessions in different namespaces
            const sessionAlpha = store.sessions.getOrCreateSession(null, { path: '/alpha' }, null, 'alpha')
            const sessionBeta = store.sessions.getOrCreateSession(null, { path: '/beta' }, null, 'beta')

            const ts1 = Date.now() - 1000
            const ts2 = Date.now() - 500
            store.drafts.setDraft(sessionAlpha.id, 'alpha', 'Draft A', ts1)
            store.drafts.setDraft(sessionBeta.id, 'beta', 'Draft B', ts2)

            const draftAlpha = store.drafts.getDraft(sessionAlpha.id, 'alpha')
            const draftBeta = store.drafts.getDraft(sessionBeta.id, 'beta')

            expect(draftAlpha?.text).toBe('Draft A')
            expect(draftBeta?.text).toBe('Draft B')
        })
    })

    describe('setDraft', () => {
        it('saves draft and returns it', () => {
            const session = store.sessions.getOrCreateSession(null, { path: '/test' }, null, 'default')
            const timestamp = Date.now() - 500
            const result = store.drafts.setDraft(session.id, 'default', 'Test draft', timestamp)

            expect(result).toEqual({
                text: 'Test draft',
                timestamp
            })

            const draft = store.drafts.getDraft(session.id, 'default')
            expect(draft).toEqual(result)
        })

        it('updates draft with newer timestamp', () => {
            const session = store.sessions.getOrCreateSession(null, { path: '/test' }, null, 'default')

            const oldTimestamp = Date.now() - 2000
            const newTimestamp = Date.now() - 1000
            store.drafts.setDraft(session.id, 'default', 'Old draft', oldTimestamp)
            const result = store.drafts.setDraft(session.id, 'default', 'New draft', newTimestamp)

            expect(result.text).toBe('New draft')
            expect(result.timestamp).toBe(newTimestamp)

            const draft = store.drafts.getDraft(session.id, 'default')
            expect(draft?.text).toBe('New draft')
        })

        it('rejects draft with older timestamp (LWW)', () => {
            const session = store.sessions.getOrCreateSession(null, { path: '/test' }, null, 'default')

            const newerTimestamp = Date.now() - 1000
            const olderTimestamp = Date.now() - 2000
            store.drafts.setDraft(session.id, 'default', 'Newer draft', newerTimestamp)
            const result = store.drafts.setDraft(session.id, 'default', 'Older draft', olderTimestamp)

            // Should return existing draft, not the older one
            expect(result.text).toBe('Newer draft')
            expect(result.timestamp).toBe(newerTimestamp)

            const draft = store.drafts.getDraft(session.id, 'default')
            expect(draft?.text).toBe('Newer draft')
        })

        it('accepts draft with equal timestamp (LWW accepts >=)', () => {
            const session = store.sessions.getOrCreateSession(null, { path: '/test' }, null, 'default')

            const timestamp = Date.now() - 1000
            store.drafts.setDraft(session.id, 'default', 'First draft', timestamp)
            const result = store.drafts.setDraft(session.id, 'default', 'Second draft', timestamp)

            // With equal timestamps, last write wins
            expect(result.text).toBe('Second draft')
            expect(result.timestamp).toBe(timestamp)
        })

        it('handles multiple sessions independently', () => {
            const session1 = store.sessions.getOrCreateSession(null, { path: '/test1' }, null, 'default')
            const session2 = store.sessions.getOrCreateSession(null, { path: '/test2' }, null, 'default')

            const ts1 = Date.now() - 2000
            const ts2 = Date.now() - 1000
            store.drafts.setDraft(session1.id, 'default', 'Draft 1', ts1)
            store.drafts.setDraft(session2.id, 'default', 'Draft 2', ts2)

            const draft1 = store.drafts.getDraft(session1.id, 'default')
            const draft2 = store.drafts.getDraft(session2.id, 'default')

            expect(draft1?.text).toBe('Draft 1')
            expect(draft2?.text).toBe('Draft 2')
        })

        it('rejects future timestamps beyond tolerance', () => {
            const session = store.sessions.getOrCreateSession(null, { path: '/test' }, null, 'default')

            // Try to save a draft with timestamp 1 hour in the future
            const futureTimestamp = Date.now() + 3600000
            const result = store.drafts.setDraft(session.id, 'default', 'Future draft', futureTimestamp)

            // Should use server time instead
            expect(result.timestamp).toBeLessThan(futureTimestamp)
            expect(result.timestamp).toBeGreaterThan(Date.now() - 1000) // Within 1 second of now
        })

        it('accepts timestamps within tolerance (5 seconds)', () => {
            const session = store.sessions.getOrCreateSession(null, { path: '/test' }, null, 'default')

            // 4 seconds in the future (within 5 second tolerance)
            const nearFutureTimestamp = Date.now() + 4000
            const result = store.drafts.setDraft(session.id, 'default', 'Near future draft', nearFutureTimestamp)

            // Should accept the timestamp
            expect(result.timestamp).toBe(nearFutureTimestamp)
        })

        it('rejects timestamps too far in the past (> 1 hour)', () => {
            const session = store.sessions.getOrCreateSession(null, { path: '/test' }, null, 'default')

            // 2 hours in the past
            const pastTimestamp = Date.now() - 7200000
            const result = store.drafts.setDraft(session.id, 'default', 'Past draft', pastTimestamp)

            // Should use server time instead
            expect(result.timestamp).toBeGreaterThan(pastTimestamp)
            expect(result.timestamp).toBeGreaterThan(Date.now() - 1000) // Within 1 second of now
        })

        it('transaction rollback on LWW rejection', () => {
            const session = store.sessions.getOrCreateSession(null, { path: '/test' }, null, 'default')

            // Save newer draft
            const newerTimestamp = Date.now() - 1000
            const olderTimestamp = Date.now() - 2000
            store.drafts.setDraft(session.id, 'default', 'Newer draft', newerTimestamp)

            // Try to save older draft (should rollback)
            const result = store.drafts.setDraft(session.id, 'default', 'Older draft', olderTimestamp)

            // Should return existing draft
            expect(result.text).toBe('Newer draft')
            expect(result.timestamp).toBe(newerTimestamp)

            // Verify no partial state was written
            const draft = store.drafts.getDraft(session.id, 'default')
            expect(draft?.text).toBe('Newer draft')
            expect(draft?.timestamp).toBe(newerTimestamp)
        })
    })

    describe('clearDraft', () => {
        it('removes draft from storage', () => {
            const session = store.sessions.getOrCreateSession(null, { path: '/test' }, null, 'default')

            const timestamp = Date.now() - 1000
            store.drafts.setDraft(session.id, 'default', 'Hello', timestamp)
            expect(store.drafts.getDraft(session.id, 'default')).not.toBeNull()

            store.drafts.clearDraft(session.id, 'default')
            expect(store.drafts.getDraft(session.id, 'default')).toBeNull()
        })

        it('only removes specified session draft', () => {
            const session1 = store.sessions.getOrCreateSession(null, { path: '/test1' }, null, 'default')
            const session2 = store.sessions.getOrCreateSession(null, { path: '/test2' }, null, 'default')

            const ts1 = Date.now() - 2000
            const ts2 = Date.now() - 1000
            store.drafts.setDraft(session1.id, 'default', 'Draft 1', ts1)
            store.drafts.setDraft(session2.id, 'default', 'Draft 2', ts2)

            store.drafts.clearDraft(session1.id, 'default')

            expect(store.drafts.getDraft(session1.id, 'default')).toBeNull()
            expect(store.drafts.getDraft(session2.id, 'default')).not.toBeNull()
        })

        it('does not throw when clearing non-existent draft', () => {
            expect(() => store.drafts.clearDraft('non-existent', 'default')).not.toThrow()
        })
    })

    describe('CASCADE delete', () => {
        it('deletes draft when session is deleted', () => {
            // Create a session first
            const session = store.sessions.getOrCreateSession(null, { path: '/test' }, null, 'default')

            // Save a draft for that session
            const timestamp = Date.now() - 1000
            store.drafts.setDraft(session.id, 'default', 'Test draft', timestamp)
            expect(store.drafts.getDraft(session.id, 'default')).not.toBeNull()

            // Delete the session
            store.sessions.deleteSession(session.id, 'default')

            // Draft should be automatically deleted via CASCADE
            expect(store.drafts.getDraft(session.id, 'default')).toBeNull()
        })
    })
})
