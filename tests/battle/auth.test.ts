import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeBattleNickname, validateBattleNickname } from '../../lib/server/battle-auth'

test('normalizeBattleNickname trims edges and collapses whitespace', () => {
  assert.equal(normalizeBattleNickname('  Alice   Smith  '), 'Alice Smith')
})

test('validateBattleNickname rejects wildcard characters used by SQL like lookups', () => {
  assert.equal(
    validateBattleNickname('Alice%'),
    'Nickname can only contain letters, numbers, spaces, dashes, and underscores'
  )
  assert.equal(
    validateBattleNickname('Alice_Bob'),
    null
  )
})
