import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isBattleMatchExpiredAt,
  isBattlePresenceActive,
  normalizeBattleSessionErrorMessage,
  resolveBattleMatchRefreshState,
} from '../../lib/battle/runtime'

test('normalizeBattleSessionErrorMessage treats missing session as idle state', () => {
  assert.equal(normalizeBattleSessionErrorMessage('Battle session not found'), null)
  assert.equal(normalizeBattleSessionErrorMessage('Bad credentials'), 'Bad credentials')
})

test('resolveBattleMatchRefreshState requests result only when a live match just disappeared', () => {
  assert.deepEqual(
    resolveBattleMatchRefreshState('Active battle match not found', 'match-1'),
    { errorMessage: null, shouldLoadResult: true }
  )
  assert.deepEqual(
    resolveBattleMatchRefreshState('Active battle match not found', null),
    { errorMessage: null, shouldLoadResult: false }
  )
})

test('isBattlePresenceActive respects ttl and status', () => {
  const now = new Date('2026-04-01T20:00:45.000Z')

  assert.equal(
    isBattlePresenceActive('online', '2026-04-01T20:00:10.000Z', now),
    true
  )
  assert.equal(
    isBattlePresenceActive('online', '2026-04-01T19:59:50.000Z', now),
    false
  )
  assert.equal(
    isBattlePresenceActive('offline', '2026-04-01T20:00:40.000Z', now),
    false
  )
})

test('isBattleMatchExpiredAt flips exactly at timer boundary', () => {
  const startAt = '2026-04-01T20:00:00.000Z'

  assert.equal(
    isBattleMatchExpiredAt(startAt, 30, new Date('2026-04-01T20:00:29.999Z')),
    false
  )
  assert.equal(
    isBattleMatchExpiredAt(startAt, 30, new Date('2026-04-01T20:00:30.000Z')),
    true
  )
})
