import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Shuffle array using Fisher-Yates algorithm
 * Returns both the shuffled array and the original indices
 */
export function shuffleArray<T>(array: T[]): { shuffled: T[], indices: number[] } {
  const indices = array.map((_, i) => i)
  const shuffled = [...array]

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }

  return { shuffled, indices }
}

/**
 * Parse TipTap JSON content to plain text
 */
export function parseTiptapContent(content: string): string {
  if (!content) return ''

  try {
    const parsed = JSON.parse(content)

    const extractText = (node: unknown): string => {
      if (!node || typeof node !== 'object') return ''

      const n = node as { type?: string; text?: string; content?: unknown[] }

      if (n.type === 'text' && n.text) {
        return n.text
      }

      if (Array.isArray(n.content)) {
        return n.content.map(extractText).join('')
      }

      return ''
    }

    return extractText(parsed)
  } catch {
    // If not valid JSON, return as-is (plain text)
    return content
  }
}

/**
 * Simple shuffle array - returns only the shuffled array
 */
export function shuffleArraySimple<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Format date string to Ukrainian locale format
 */
export function formatDateUk(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Format date string to default locale format
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString()
}
