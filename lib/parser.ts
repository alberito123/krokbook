import { ParsedQuestion } from '@/lib/types'
import { LATIN_LETTERS, CYRILLIC_LETTERS, CYRILLIC_TO_LATIN_MAP } from '@/lib/constants'

/**
 * Universal Parser for Ukrainian Pharmacy Test Files
 *
 * Supports multiple formats:
 * 1. Letter labels (A. B. C. D. E.) with ANSWER: X
 * 2. Letter labels with asterisk (*) marking correct answer
 * 3. No letter labels with asterisk marking correct answer
 * 4. Various indentation styles (spaces, tabs)
 * 5. Both Latin and Cyrillic letters for answers
 * 6. Questions with/without empty lines between them
 * 7. Dash placeholders (-, —, ---) as empty options
 */

// ============ Types ============

interface RawQuestion {
  questionText: string
  options: Array<{
    letter?: string
    text: string
    isCorrect: boolean
  }>
  answerLetter?: string
}

// ============ Main Parser ============

/**
 * Parse raw text into structured questions
 * @param text - Raw text content from file
 * @param sourceFile - Optional source file name for tracking
 */
export function parseRawText(text: string, sourceFile?: string): ParsedQuestion[] {
  if (!text || text.trim() === '') {
    return []
  }

  // Normalize line endings and split
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  
  // Split into raw question blocks
  const rawQuestions = splitIntoQuestions(normalizedText)
  
  // Parse each block into structured question
  const questions: ParsedQuestion[] = []
  
  for (let i = 0; i < rawQuestions.length; i++) {
    const raw = rawQuestions[i]
    const parsed = parseQuestionBlock(raw, i, sourceFile)
    
    if (parsed && parsed.questionText.trim()) {
      questions.push(parsed)
    }
  }
  
  return questions
}

// ============ Question Splitting ============

/**
 * Split text into individual question blocks
 * Supports two formats:
 * 1. ANSWER: as delimiter (primary)
 * 2. Numbered questions (1., 2., 3.) when no ANSWER: present
 */
function splitIntoQuestions(text: string): RawQuestion[] {
  const lines = text.split('\n')
  
  // Check if file has ANSWER: lines
  const hasAnswerLines = lines.some(l => /^ANSWER\.?\s*:/i.test(l.trim()))
  
  if (hasAnswerLines) {
    return splitByAnswerKeyword(lines)
  } else {
    return splitByNumberedQuestions(lines)
  }
}

/**
 * Split by ANSWER: keyword (original method)
 */
function splitByAnswerKeyword(lines: string[]): RawQuestion[] {
  const questions: RawQuestion[] = []
  
  let currentLines: string[] = []
  let currentAnswerLetter: string | undefined
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    
    // Check if this line contains ANSWER:
    const answerMatch = trimmed.match(/^ANSWER\.?\s*:\s*([A-EА-ЯЁІЇЄ])/i)
    
    if (answerMatch) {
      currentAnswerLetter = answerMatch[1].toUpperCase()
      currentLines.push(line)
      
      // Save current question and start new one
      if (currentLines.length > 1) {
        const rawQ = parseRawQuestionBlock(currentLines, currentAnswerLetter)
        if (rawQ) {
          questions.push(rawQ)
        }
      }
      
      currentLines = []
      currentAnswerLetter = undefined
    } else {
      currentLines.push(line)
    }
  }
  
  // Handle last block if it has content
  if (currentLines.length > 0) {
    const rawQ = parseRawQuestionBlock(currentLines, currentAnswerLetter)
    if (rawQ) {
      questions.push(rawQ)
    }
  }
  
  return questions
}

/**
 * Split by numbered questions (1., 2., 3., etc.)
 * Used when file has no ANSWER: lines but has asterisk markers
 */
function splitByNumberedQuestions(lines: string[]): RawQuestion[] {
  const questions: RawQuestion[] = []
  
  let currentLines: string[] = []
  let currentQuestionNumber = 0
  
  // Regex to match question number at start of line: "1.", "2.", "123." etc.
  const questionNumberRegex = /^(\d+)\.\s+/
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    
    // Check if this line starts a new numbered question
    const numberMatch = trimmed.match(questionNumberRegex)
    
    if (numberMatch) {
      const questionNum = parseInt(numberMatch[1], 10)
      
      // Save previous question if exists
      if (currentLines.length > 0 && currentQuestionNumber > 0) {
        const rawQ = parseRawQuestionBlock(currentLines, undefined)
        if (rawQ) {
          questions.push(rawQ)
        }
      }
      
      // Start new question - remove the number prefix
      currentLines = [trimmed.replace(questionNumberRegex, '')]
      currentQuestionNumber = questionNum
    } else if (trimmed !== '') {
      currentLines.push(trimmed)
    }
  }
  
  // Handle last block
  if (currentLines.length > 0) {
    const rawQ = parseRawQuestionBlock(currentLines, undefined)
    if (rawQ) {
      questions.push(rawQ)
    }
  }
  
  return questions
}

/**
 * Parse a block of lines into a RawQuestion
 */
function parseRawQuestionBlock(lines: string[], answerLetter?: string): RawQuestion | null {
  // Filter out empty lines and ANSWER lines
  const contentLines = lines
    .map(l => l.trim())
    .filter(l => l !== '' && !/^ANSWER\.?\s*:/i.test(l))
  
  if (contentLines.length === 0) {
    return null
  }
  
  // Detect if we have letter labels
  // Must have punctuation after letter (. ) : or tab), not just space
  // This prevents "В кишечнику" from being detected as option "B"
  const hasLetterLabels = contentLines.some(l => 
    /^[A-EАБВГД][\.)\:\t]/i.test(l) || /^\s+[A-EАБВГД][\.)\:\t]/i.test(l)
  )
  
  if (hasLetterLabels) {
    return parseLetterLabelBlock(contentLines, answerLetter)
  } else {
    return parseNoLetterBlock(contentLines, answerLetter)
  }
}

/**
 * Parse block with letter labels (A. B. C. D. E.)
 */
function parseLetterLabelBlock(lines: string[], answerLetter?: string): RawQuestion | null {
  const questionLines: string[] = []
  const options: RawQuestion['options'] = []
  let foundFirstOption = false
  
  // Regex to match answer options with various formats:
  // A. text, A) text, A:\ttext, etc.
  // Must have punctuation (. ) : or tab) after letter, not just space
  // This prevents "В кишечнику" from matching as option "B"
  const optionRegex = /^\s*([A-EАБВГД])[\.)\:\t]+\s*(.*)$/i
  
  for (const line of lines) {
    const match = line.match(optionRegex)
    
    if (match) {
      foundFirstOption = true
      const letter = match[1].toUpperCase()
      let text = match[2].trim()
      let isCorrect = false
      
      // Check for asterisk marking correct answer
      if (text.startsWith('*')) {
        isCorrect = true
        text = text.substring(1).trim()
      } else if (text.endsWith('*')) {
        isCorrect = true
        text = text.slice(0, -1).trim()
      }
      
      // Handle dash-only options (empty placeholders)
      const isDash = /^[-—]{1,5}$/.test(text)
      if (isDash) {
        options.push({ letter, text: '', isCorrect: false })
      } else {
        options.push({ letter, text, isCorrect })
      }
    } else if (!foundFirstOption) {
      // This is part of the question text (before first option)
      questionLines.push(line)
    }
    // Lines after first option that don't match are ignored (could be continuation)
  }
  
  if (options.length === 0) {
    return null
  }
  
  return {
    questionText: questionLines.join(' ').trim(),
    options,
    answerLetter
  }
}

/**
 * Parse block without letter labels
 * Uses asterisk to mark correct answer:
 * - At start: *Correct answer
 * - At end: Correct answer*
 * - With space: Correct answer *
 */
function parseNoLetterBlock(lines: string[], answerLetter?: string): RawQuestion | null {
  const questionLines: string[] = []
  const options: RawQuestion['options'] = []
  let foundFirstOption = false
  
  for (const line of lines) {
    // Check for asterisk marking correct answer (at start)
    if (line.startsWith('*') || line.startsWith('* ')) {
      foundFirstOption = true
      const text = line.replace(/^\*\s*/, '').trim()
      if (text) {
        options.push({ text, isCorrect: true })
      }
    } 
    // Check for asterisk at end of line (e.g., "Ацетилсаліцилова кислота*" or "Відповідь *")
    else if (/\s*\*\s*$/.test(line)) {
      foundFirstOption = true
      const text = line.replace(/\s*\*\s*$/, '').trim()
      if (text) {
        options.push({ text, isCorrect: true })
      }
    }
    else if (!foundFirstOption && (line.endsWith('?') || line.endsWith(':'))) {
      // Question text
      questionLines.push(line)
    } else if (!foundFirstOption && questionLines.length === 0) {
      // First line is question
      questionLines.push(line)
    } else {
      // Option text
      foundFirstOption = true
      // Skip dash-only options
      if (line !== '-' && line !== '—' && line !== '---') {
        options.push({ text: line, isCorrect: false })
      }
    }
  }
  
  if (options.length === 0) {
    return null
  }
  
  return {
    questionText: questionLines.join(' ').trim(),
    options,
    answerLetter
  }
}

// ============ Question Block Parsing ============

/**
 * Convert RawQuestion to ParsedQuestion with validation
 */
function parseQuestionBlock(raw: RawQuestion, index: number, sourceFile?: string): ParsedQuestion | null {
  const validationErrors: string[] = []
  
  // Extract answer options (filter out empty ones)
  // Keep track of original indices for correct answer mapping
  const nonEmptyOptions: Array<{ text: string; originalIndex: number; letter?: string; isCorrect: boolean }> = []
  
  raw.options.forEach((o, idx) => {
    if (o.text.length > 0) {
      nonEmptyOptions.push({
        text: o.text,
        originalIndex: idx,
        letter: o.letter,
        isCorrect: o.isCorrect
      })
    }
  })
  
  const answerOptions = nonEmptyOptions.map(o => o.text)
  
  // Determine correct answer index
  let correctAnswerIndex = -1
  
  // First, check if any option is marked with asterisk
  const asteriskOption = nonEmptyOptions.find(o => o.isCorrect)
  if (asteriskOption) {
    correctAnswerIndex = nonEmptyOptions.indexOf(asteriskOption)
  }
  
  // If no asterisk, use ANSWER: letter
  if (correctAnswerIndex === -1 && raw.answerLetter) {
    // First try to find by letter match
    const letterIndex = nonEmptyOptions.findIndex(o => {
      if (!o.letter) return false
      return normalizeAnswerLetter(o.letter) === normalizeAnswerLetter(raw.answerLetter!)
    })
    
    if (letterIndex >= 0) {
      correctAnswerIndex = letterIndex
    } else {
      // Fallback to position-based index
      correctAnswerIndex = letterToIndex(raw.answerLetter, answerOptions.length)
    }
  }
  
  // Validation
  if (answerOptions.length < 2) {
    validationErrors.push(`Question ${index + 1}: Must have at least 2 answer options (found ${answerOptions.length})`)
  }
  
  if (correctAnswerIndex === -1 || correctAnswerIndex >= answerOptions.length) {
    validationErrors.push(`Question ${index + 1}: Missing or invalid correct answer`)
    correctAnswerIndex = -1
  }
  
  return {
    questionText: raw.questionText,
    answerOptions,
    correctAnswerIndex,
    isValid: validationErrors.length === 0,
    validationErrors,
    ...(sourceFile && { sourceFile })
  }
}

/**
 * Normalize answer letter (handle Cyrillic/Latin equivalents)
 */
function normalizeAnswerLetter(letter: string): string {
  const upper = letter.toUpperCase()
  
  // Map Cyrillic lookalikes to Latin
  const cyrillicToLatin: Record<string, string> = {
    'А': 'A',
    'В': 'B', 
    'С': 'C',
    'Е': 'E',
    'І': 'I',
  }
  
  return cyrillicToLatin[upper] || upper
}

/**
 * Convert answer letter to index
 * Handles both Latin and Cyrillic letters
 */
function letterToIndex(letter: string, maxOptions: number): number {
  const upperLetter = letter.toUpperCase()
  
  // Try Latin first
  const latinIndex = LATIN_LETTERS.indexOf(upperLetter)
  if (latinIndex >= 0 && latinIndex < maxOptions) {
    return latinIndex
  }
  
  // Try Cyrillic
  const cyrillicIndex = CYRILLIC_LETTERS.indexOf(upperLetter)
  if (cyrillicIndex >= 0 && cyrillicIndex < maxOptions) {
    return cyrillicIndex
  }
  
  // Try Cyrillic lookalikes
  const lookalikeIndex = CYRILLIC_TO_LATIN_MAP[upperLetter]
  if (lookalikeIndex !== undefined && lookalikeIndex < maxOptions) {
    return lookalikeIndex
  }
  
  return -1
}

