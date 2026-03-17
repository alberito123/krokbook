/**
 * Validation module for question data.
 * 
 * This module provides validation functions for question parsing and data integrity.
 * Validates: Requirements 12.2, 12.3, 12.4
 */

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * Validates that a question has the minimum required number of answer options (2).
 * 
 * @param answerOptions - Array of answer option strings
 * @returns ValidationResult indicating if the minimum requirement is met
 * 
 * **Validates: Requirement 12.2** - THE Database_Parser SHALL validate that each question has at least 2 answer options
 */
export function validateMinimumOptions(answerOptions: string[]): ValidationResult {
  const errors: string[] = []
  
  if (!Array.isArray(answerOptions)) {
    errors.push('Answer options must be an array')
    return { isValid: false, errors }
  }
  
  if (answerOptions.length < 2) {
    errors.push('Must have at least 2 answer options')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validates that a question has no more than the maximum allowed number of answer options (10).
 * 
 * @param answerOptions - Array of answer option strings
 * @returns ValidationResult indicating if the maximum requirement is met
 * 
 * **Validates: Requirement 12.4** - THE System SHALL support multiple answer options per question (minimum 2, maximum 10)
 */
export function validateMaximumOptions(answerOptions: string[]): ValidationResult {
  const errors: string[] = []
  
  if (!Array.isArray(answerOptions)) {
    errors.push('Answer options must be an array')
    return { isValid: false, errors }
  }
  
  if (answerOptions.length > 10) {
    errors.push('Cannot have more than 10 answer options')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validates that a question has exactly one correct answer.
 * 
 * @param correctAnswerIndex - The index of the correct answer
 * @param answerOptions - Array of answer option strings
 * @returns ValidationResult indicating if exactly one valid correct answer is specified
 * 
 * **Validates: Requirement 12.3** - THE Database_Parser SHALL validate that each question has exactly one correct answer
 */
export function validateExactlyOneCorrectAnswer(
  correctAnswerIndex: number,
  answerOptions: string[]
): ValidationResult {
  const errors: string[] = []
  
  if (!Array.isArray(answerOptions)) {
    errors.push('Answer options must be an array')
    return { isValid: false, errors }
  }
  
  // Check if correctAnswerIndex is a valid number
  if (typeof correctAnswerIndex !== 'number' || isNaN(correctAnswerIndex)) {
    errors.push('Correct answer index must be a valid number')
    return { isValid: false, errors }
  }
  
  // Check if correctAnswerIndex is -1 (no correct answer specified)
  if (correctAnswerIndex === -1) {
    errors.push('Must specify exactly one correct answer')
    return { isValid: false, errors }
  }
  
  // Check if correctAnswerIndex is within valid range
  if (correctAnswerIndex < 0 || correctAnswerIndex >= answerOptions.length) {
    errors.push(`Correct answer index ${correctAnswerIndex} is out of range (must be between 0 and ${answerOptions.length - 1})`)
    return { isValid: false, errors }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validates that a question has required fields populated.
 * 
 * @param questionText - The question text
 * @param answerOptions - Array of answer option strings
 * @param correctAnswerIndex - The index of the correct answer
 * @returns ValidationResult indicating if all required fields are present and valid
 * 
 * **Validates: Requirements 12.2, 12.3, 12.4** - Required fields validation
 */
export function validateRequiredFields(
  questionText: string,
  answerOptions: string[],
  correctAnswerIndex: number
): ValidationResult {
  const errors: string[] = []
  
  // Validate question text
  if (typeof questionText !== 'string' || questionText.trim() === '') {
    errors.push('Question text is required and must be a non-empty string')
  }
  
  // Validate answer options array
  if (!Array.isArray(answerOptions)) {
    errors.push('Answer options must be an array')
  } else {
    // Validate each answer option is a non-empty string
    answerOptions.forEach((option, index) => {
      if (typeof option !== 'string' || option.trim() === '') {
        errors.push(`Answer option at index ${index} must be a non-empty string`)
      }
    })
  }
  
  // Validate correct answer index is a number
  if (typeof correctAnswerIndex !== 'number' || isNaN(correctAnswerIndex)) {
    errors.push('Correct answer index must be a valid number')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validates option count bounds (minimum 2, maximum 10).
 * 
 * @param answerOptions - Array of answer option strings
 * @returns ValidationResult indicating if the option count is within valid bounds
 * 
 * **Validates: Requirements 12.2, 12.4** - THE System SHALL support multiple answer options per question (minimum 2, maximum 10)
 */
export function validateOptionCountBounds(answerOptions: string[]): ValidationResult {
  const errors: string[] = []
  
  if (!Array.isArray(answerOptions)) {
    errors.push('Answer options must be an array')
    return { isValid: false, errors }
  }
  
  const minResult = validateMinimumOptions(answerOptions)
  const maxResult = validateMaximumOptions(answerOptions)
  
  errors.push(...minResult.errors, ...maxResult.errors)
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Performs comprehensive validation on a question.
 * Combines all validation checks into a single function.
 * 
 * @param questionText - The question text
 * @param answerOptions - Array of answer option strings
 * @param correctAnswerIndex - The index of the correct answer
 * @returns ValidationResult with all validation errors
 * 
 * **Validates: Requirements 12.2, 12.3, 12.4**
 */
export function validateQuestion(
  questionText: string,
  answerOptions: string[],
  correctAnswerIndex: number
): ValidationResult {
  const errors: string[] = []
  
  // Validate required fields
  const requiredFieldsResult = validateRequiredFields(questionText, answerOptions, correctAnswerIndex)
  errors.push(...requiredFieldsResult.errors)
  
  // Only proceed with other validations if basic fields are valid
  if (requiredFieldsResult.isValid) {
    // Validate option count bounds
    const boundsResult = validateOptionCountBounds(answerOptions)
    errors.push(...boundsResult.errors)
    
    // Validate exactly one correct answer
    const correctAnswerResult = validateExactlyOneCorrectAnswer(correctAnswerIndex, answerOptions)
    errors.push(...correctAnswerResult.errors)
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}
