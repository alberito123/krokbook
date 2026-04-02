import assert from 'node:assert/strict'
import test from 'node:test'
import { isSupabaseUniqueViolation } from '../../lib/server/battle-persistence-errors'

test('isSupabaseUniqueViolation detects postgres unique violations', () => {
  assert.equal(
    isSupabaseUniqueViolation({
      code: '23505',
      message: 'duplicate key value violates unique constraint "battle_profiles_nickname_idx"',
    }),
    true
  )
})

test('isSupabaseUniqueViolation can match a specific constraint name', () => {
  assert.equal(
    isSupabaseUniqueViolation({
      code: '23505',
      details: 'Key (challenge_id)=(123) already exists. constraint "battle_matches_challenge_id_key"',
    }, 'battle_matches_challenge_id_key'),
    true
  )
  assert.equal(
    isSupabaseUniqueViolation({
      code: '23505',
      message: 'duplicate key value violates unique constraint "battle_profiles_nickname_idx"',
    }, 'battle_matches_challenge_id_key'),
    false
  )
})

test('isSupabaseUniqueViolation ignores non-unique database errors', () => {
  assert.equal(
    isSupabaseUniqueViolation({
      code: '42501',
      message: 'permission denied',
    }),
    false
  )
})
