// Types
export * from './types'

// Constants
export * from './constants'

// Storage utilities
export { generateId, getFromStorage, setToStorage, removeFromStorage } from './storage'

// Utils
export { cn, shuffleArray, shuffleArraySimple, parseTiptapContent, formatDateUk, formatDate } from './utils'

// Parser
export { parseRawText } from './parser'

// File processor
export { processFiles, parseDocxTableHtml, isHtmlContent, combineFileContent, getProcessingErrors } from './fileProcessor'

// Validation
export { 
  validateMinimumOptions, 
  validateMaximumOptions, 
  validateExactlyOneCorrectAnswer,
  validateRequiredFields,
  validateOptionCountBounds,
  validateQuestion,
  type ValidationResult 
} from './validation'

// Store
export { StoreProvider, useStore } from './store'

// Hooks
export * from './hooks'
