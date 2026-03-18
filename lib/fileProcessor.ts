/**
 * File Processor Module
 * 
 * Handles processing of uploaded files (.txt and .docx) to extract text content.
 * Supports docx files with table-based question formats.
 * Supports OMML math formulas in docx files.
 */

import * as mammoth from 'mammoth'
import JSZip from 'jszip'
import type { ParsedQuestion } from './types'

/**
 * Result of processing a single file
 */
export interface FileProcessingResult {
  fileName: string
  textContent: string
  success: boolean
  error?: string
  // For docx files with tables, we may also have HTML
  htmlContent?: string
}

/**
 * Read text content from a file using FileReader
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`))
    reader.readAsText(file)
  })
}

/**
 * Read file as ArrayBuffer using FileReader
 */
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Strip HTML tags and get text content
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

/**
 * Parse OMML (Office Math Markup Language) formulas from docx XML
 * Converts math expressions to readable text format
 */
function parseOmmlFormula(ommlXml: string): string {
  let result = ''
  
  // Handle fractions: <m:f><m:num>...</m:num><m:den>...</m:den></m:f>
  // Using [\s\S] instead of . with 's' flag for multiline matching
  const fractionRegex = /<m:f[^>]*>([\s\S]*?)<\/m:f>/g
  let processed = ommlXml
  
  // Replace fractions with (numerator)/(denominator) format
  processed = processed.replace(fractionRegex, (match) => {
    const numMatch = match.match(/<m:num[^>]*>([\s\S]*?)<\/m:num>/)
    const denMatch = match.match(/<m:den[^>]*>([\s\S]*?)<\/m:den>/)
    
    const num = numMatch ? extractMathText(numMatch[1]) : ''
    const den = denMatch ? extractMathText(denMatch[1]) : ''
    
    return `(${num})/(${den})`
  })
  
  // Handle superscripts: <m:sSup>...<m:sup>...</m:sup></m:sSup>
  processed = processed.replace(/<m:sSup[^>]*>([\s\S]*?)<\/m:sSup>/g, (match) => {
    const baseMatch = match.match(/<m:e[^>]*>([\s\S]*?)<\/m:e>/)
    const supMatch = match.match(/<m:sup[^>]*>([\s\S]*?)<\/m:sup>/)
    
    const base = baseMatch ? extractMathText(baseMatch[1]) : ''
    const sup = supMatch ? extractMathText(supMatch[1]) : ''
    
    return `${base}^${sup}`
  })
  
  // Handle subscripts: <m:sSub>...<m:sub>...</m:sub></m:sSub>
  processed = processed.replace(/<m:sSub[^>]*>([\s\S]*?)<\/m:sSub>/g, (match) => {
    const baseMatch = match.match(/<m:e[^>]*>([\s\S]*?)<\/m:e>/)
    const subMatch = match.match(/<m:sub[^>]*>([\s\S]*?)<\/m:sub>/)
    
    const base = baseMatch ? extractMathText(baseMatch[1]) : ''
    const sub = subMatch ? extractMathText(subMatch[1]) : ''
    
    return `${base}_${sub}`
  })
  
  // Handle radicals/roots: <m:rad>...</m:rad>
  processed = processed.replace(/<m:rad[^>]*>([\s\S]*?)<\/m:rad>/g, (match) => {
    const degMatch = match.match(/<m:deg[^>]*>([\s\S]*?)<\/m:deg>/)
    const eMatch = match.match(/<m:e[^>]*>([\s\S]*?)<\/m:e>/)
    
    const deg = degMatch ? extractMathText(degMatch[1]) : '2'
    const e = eMatch ? extractMathText(eMatch[1]) : ''
    
    if (deg === '2' || deg === '') {
      return `√(${e})`
    }
    return `${deg}√(${e})`
  })
  
  // Extract remaining text
  result = extractMathText(processed)
  
  return result.trim()
}

/**
 * Extract text content from OMML XML, handling <m:t> tags
 */
function extractMathText(xml: string): string {
  // Extract text from <m:t>...</m:t> tags
  const textParts: string[] = []
  const textRegex = /<m:t[^>]*>([^<]*)<\/m:t>/g
  let match
  
  while ((match = textRegex.exec(xml)) !== null) {
    textParts.push(match[1])
  }
  
  if (textParts.length > 0) {
    return textParts.join('')
  }
  
  // If no <m:t> tags, try to extract from <w:t> tags
  const wtRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g
  while ((match = wtRegex.exec(xml)) !== null) {
    textParts.push(match[1])
  }
  
  return textParts.join('')
}

/**
 * Process docx XML content and convert OMML formulas to text
 */
function processDocxXmlWithFormulas(xml: string): string {
  let result = xml
  
  // Replace all OMML math blocks with their text representation
  // Using [\s\S] instead of . with 's' flag for multiline matching
  const mathRegex = /<m:oMath[^>]*>([\s\S]*?)<\/m:oMath>/g
  result = result.replace(mathRegex, (_match: string, content: string) => {
    return parseOmmlFormula(content)
  })
  
  // Also handle oMathPara (math paragraphs)
  const mathParaRegex = /<m:oMathPara[^>]*>([\s\S]*?)<\/m:oMathPara>/g
  result = result.replace(mathParaRegex, (_match: string, content: string) => {
    // Extract oMath from within oMathPara
    const innerMathRegex = /<m:oMath[^>]*>([\s\S]*?)<\/m:oMath>/g
    return content.replace(innerMathRegex, (_innerMatch: string, innerContent: string) => {
      return parseOmmlFormula(innerContent)
    })
  })
  
  return result
}

/**
 * Extract text from docx XML with formula support
 */
function extractTextFromDocxXml(xml: string): string {
  const lines: string[] = []
  
  // Split by paragraphs
  const paragraphRegex = /<w:p[^>]*>([\s\S]*?)<\/w:p>/g
  let paraMatch: RegExpExecArray | null
  
  while ((paraMatch = paragraphRegex.exec(xml)) !== null) {
    const para = paraMatch[1]
    let lineText = ''
    
    // Process paragraph content sequentially
    // We need to handle both <w:t> text and <m:oMath> formulas in order
    let pos = 0
    const content = para
    
    while (pos < content.length) {
      // Check for oMath formula
      const mathStart = content.indexOf('<m:oMath', pos)
      const textStart = content.indexOf('<w:t', pos)
      
      if (mathStart === -1 && textStart === -1) {
        break
      }
      
      // Process whichever comes first
      if (mathStart !== -1 && (textStart === -1 || mathStart < textStart)) {
        // Found a formula first
        const mathEnd = content.indexOf('</m:oMath>', mathStart)
        if (mathEnd !== -1) {
          const mathContent = content.substring(mathStart, mathEnd + 10)
          const formulaText = parseOmmlFormulaFromTag(mathContent)
          lineText += formulaText
          pos = mathEnd + 10
        } else {
          pos = mathStart + 1
        }
      } else if (textStart !== -1) {
        // Found text first
        const textEnd = content.indexOf('</w:t>', textStart)
        if (textEnd !== -1) {
          const textTag = content.substring(textStart, textEnd + 6)
          const textMatch = textTag.match(/<w:t[^>]*>([^<]*)<\/w:t>/)
          if (textMatch) {
            lineText += textMatch[1]
          }
          pos = textEnd + 6
        } else {
          pos = textStart + 1
        }
      }
    }
    
    if (lineText.trim()) {
      lines.push(lineText)
    }
  }
  
  return lines.join('\n')
}

/**
 * Parse a complete <m:oMath>...</m:oMath> tag and return text representation
 */
function parseOmmlFormulaFromTag(mathTag: string): string {
  // Remove the outer oMath tags
  const content = mathTag.replace(/<\/?m:oMath[^>]*>/g, '')
  return parseOmmlFormula(content)
}

/**
 * Read docx file and extract text with formula support using JSZip
 */
async function extractDocxTextWithFormulas(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer)
    const documentXml = await zip.file('word/document.xml')?.async('string')
    
    if (!documentXml) {
      throw new Error('Could not find document.xml in docx file')
    }
    
    return extractTextFromDocxXml(documentXml)
  } catch (error) {
    console.error('Error extracting docx with formulas:', error)
    throw error
  }
}

/**
 * Parse docx HTML table structure into questions
 * 
 * Expected structure:
 * - Each <tr><td> is either a question or answer
 * - Questions have <ol><li>...</li></ol> (ordered list)
 * - Answers have <ul><li>...</li></ul> (unordered list)
 * - Correct answer starts with *
 */
export function parseDocxTableHtml(html: string, sourceFile?: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = []

  // Extract all table cells using split approach instead of regex with 's' flag
  const cells: string[] = []
  const parts = html.split('<td>')

  for (let i = 1; i < parts.length; i++) {
    const endIdx = parts[i].indexOf('</td>')
    if (endIdx !== -1) {
      cells.push(parts[i].substring(0, endIdx))
    }
  }

  let currentQuestion: string | null = null
  let currentAnswers: string[] = []
  let correctAnswerIndex = -1

  for (const cell of cells) {
    const text = stripHtml(cell).trim()
    if (!text) continue

    // Check if this is a question (contains <ol>) or answer (contains <ul>)
    const isQuestion = cell.includes('<ol>') && !cell.includes('<ul>')
    const isAnswer = cell.includes('<ul>')

    if (isQuestion) {
      // Save previous question if exists
      if (currentQuestion && currentAnswers.length >= 2) {
        questions.push({
          questionText: currentQuestion,
          answerOptions: currentAnswers,
          correctAnswerIndex,
          isValid: correctAnswerIndex >= 0 && currentAnswers.length >= 2,
          validationErrors: correctAnswerIndex < 0 ? ['Missing correct answer'] : [],
          sourceFile,
        })
      }

      // Start new question - remove leading number if present
      currentQuestion = text.replace(/^\d+\.\s*/, '')
      currentAnswers = []
      correctAnswerIndex = -1
    } else if (isAnswer && currentQuestion) {
      // This is an answer option
      let answerText = text

      // Check if it's the correct answer (starts with *)
      if (answerText.startsWith('*')) {
        correctAnswerIndex = currentAnswers.length
        answerText = answerText.substring(1).trim()
      }

      if (answerText) {
        currentAnswers.push(answerText)
      }
    } else if (currentQuestion && text) {
      // Might be a plain answer without <ul> wrapper
      let answerText = text

      if (answerText.startsWith('*')) {
        correctAnswerIndex = currentAnswers.length
        answerText = answerText.substring(1).trim()
      }

      if (answerText) {
        currentAnswers.push(answerText)
      }
    }
  }

  // Don't forget the last question
  if (currentQuestion && currentAnswers.length >= 2) {
    questions.push({
      questionText: currentQuestion,
      answerOptions: currentAnswers,
      correctAnswerIndex,
      isValid: correctAnswerIndex >= 0 && currentAnswers.length >= 2,
      validationErrors: correctAnswerIndex < 0 ? ['Missing correct answer'] : [],
      sourceFile,
    })
  }

  return questions
}

/**
 * Process uploaded files and extract text/HTML content
 * 
 * Supports:
 * - .txt files: Read as text
 * - .docx files: Convert to HTML for table parsing
 */
export async function processFiles(files: File[]): Promise<FileProcessingResult[]> {
  const results: FileProcessingResult[] = []

  for (const file of files) {
    try {
      let textContent: string
      let htmlContent: string | undefined

      if (file.name.toLowerCase().endsWith('.txt')) {
        textContent = await readFileAsText(file)
      } else if (file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')) {
        const arrayBuffer = await readFileAsArrayBuffer(file)

        // Get both HTML and raw text
        // Note: mammoth works best with .docx, but can handle some .doc files
        try {
          const htmlResult = await mammoth.convertToHtml({ arrayBuffer })
          htmlContent = htmlResult.value

          // Check if HTML contains tables - if so, use table parser
          if (htmlContent.includes('<table>')) {
            // For table-based docs, we'll use HTML parsing
            textContent = htmlContent
          } else {
            // For non-table docs, use custom parser with formula support
            // This ensures OMML formulas are properly converted to text
            try {
              textContent = await extractDocxTextWithFormulas(arrayBuffer)
            } catch (err) {
              // Fallback to mammoth if custom parser fails
              console.error('[fileProcessor] Custom parser failed, using mammoth fallback:', err)
              const mammothText = await mammoth.extractRawText({ arrayBuffer })
              textContent = mammothText.value
            }
          }
        } catch (docError) {
          // .doc files may not be supported by mammoth
          if (file.name.toLowerCase().endsWith('.doc')) {
            throw new Error(`Old .doc format not fully supported. Please convert to .docx or .txt`)
          }
          throw docError
        }
      } else {
        throw new Error(`Unsupported file type: ${file.name}`)
      }

      results.push({
        fileName: file.name,
        textContent,
        htmlContent,
        success: true
      })
    } catch (error) {
      results.push({
        fileName: file.name,
        textContent: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  return results
}

/**
 * Check if content is HTML (for docx table format)
 */
export function isHtmlContent(content: string): boolean {
  return content.trim().startsWith('<table>') || content.includes('<table>')
}

/**
 * Combine text content from multiple file processing results
 */
export function combineFileContent(results: FileProcessingResult[]): string {
  return results
    .filter(r => r.success)
    .map(r => r.textContent)
    .join('\n\n')
}

/**
 * Get error messages from failed file processing results
 */
export function getProcessingErrors(results: FileProcessingResult[]): string[] {
  return results
    .filter(r => !r.success)
    .map(r => `${r.fileName}: ${r.error || 'Unknown error'}`)
}
