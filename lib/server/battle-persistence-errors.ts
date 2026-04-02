interface ErrorWithCode {
  code?: string | null
  message?: string | null
  details?: string | null
}

function getErrorField(error: unknown, field: keyof ErrorWithCode): string | null {
  if (!error || typeof error !== 'object') {
    return null
  }

  const value = (error as ErrorWithCode)[field]
  return typeof value === 'string' ? value : null
}

export function isSupabaseUniqueViolation(error: unknown, constraint?: string): boolean {
  const code = getErrorField(error, 'code')
  if (code !== '23505') {
    return false
  }

  if (!constraint) {
    return true
  }

  const haystack = [
    getErrorField(error, 'message'),
    getErrorField(error, 'details'),
  ].filter(Boolean).join(' ')

  return haystack.includes(constraint)
}
