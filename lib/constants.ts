/**
 * Application Constants
 * Centralized configuration values
 */

// LocalStorage Keys
export const STORAGE_KEYS = {
  FOLDERS: 'krokbook-folders',
  QUESTIONS: (folderId: string) => `krokbook-questions-${folderId}`,
  ERRORS: (folderId: string) => `krokbook-errors-${folderId}`,
  NOTEBOOK: (folderId: string) => `krokbook-notebook-${folderId}`,
  PROGRESS: (folderId: string) => `krokbook-progress-${folderId}`,
  CURRENT_STATE: (folderId: string) => `krokbook-current-state-${folderId}`,
  ALL_ERRORS: 'krokbook-all-errors',
  FOLDER_NOTES: (folderId: string) => `krokbook-folder-notes-${folderId}`,
  PANEL_VISIBILITY: 'panelVisibility',
} as const

// Validation limits
export const VALIDATION = {
  MIN_ANSWER_OPTIONS: 2,
  MAX_ANSWER_OPTIONS: 10,
} as const

// Supported file extensions
export const SUPPORTED_FILE_EXTENSIONS = ['.txt', '.docx'] as const

// Answer letter sequences
export const LATIN_LETTERS = 'ABCDEFGHIJ'
export const CYRILLIC_LETTERS = 'АБВГДЕЄЖЗИ'

// Cyrillic letters that look like Latin (for answer parsing)
// Maps Cyrillic -> Latin equivalent index
export const CYRILLIC_TO_LATIN_MAP: Record<string, number> = {
  'А': 0, // A
  'В': 1, // B (Cyrillic В looks like Latin B)
  'С': 2, // C (Cyrillic С looks like Latin C)
  'Е': 4, // E (Cyrillic Е looks like Latin E)
}

// Debounce delays (ms)
export const DEBOUNCE = {
  NOTES_SAVE: 2000,
} as const
