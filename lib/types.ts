/**
 * KrokBook - TypeScript Type Definitions
 * Local storage based quiz application
 */

// ============ Core Data Types ============

export interface Folder {
  id: string
  name: string
  createdAt: string
}

export interface Question {
  id: string
  folderId: string
  questionText: string
  answerOptions: string[]
  correctAnswerIndex: number
  sourceFile?: string
}

export interface UserError {
  id: string
  folderId: string
  questionId: string
  userSelectedIndex: number
  notes: string
  createdAt: string
  isResolved?: boolean
}

export interface NotebookNote {
  folderId: string
  content: string
  updatedAt: string
}

export interface FolderNote {
  id: string
  folderId: string
  text: string
  createdAt: string
  updatedAt: string
}

// ============ Question Progress Tracking ============

export interface QuestionProgress {
  questionId: string
  status: 'unanswered' | 'correct' | 'incorrect'
  selectedIndex?: number
}

export interface FolderProgress {
  folderId: string
  questionProgress: Record<string, QuestionProgress>
  shuffledAnswers: Record<string, number[]> // questionId -> shuffled indices
  lastAttemptAt?: string
}

// ============ Parsed Question (from parser) ============

export interface ParsedQuestion {
  questionText: string
  answerOptions: string[]
  correctAnswerIndex: number
  isValid: boolean
  validationErrors: string[]
  sourceFile?: string
}

// ============ UI State Types ============

export type TestMode = 'study' | 'review'
export type NotebookTab = 'notes' | 'errors'

// ============ Combined Types ============

export interface QuestionWithError {
  question: Question
  error: UserError
}

export interface QuestionWithProgress extends Question {
  progress: QuestionProgress
  shuffledOptions?: string[]
  shuffledCorrectIndex?: number
}

// ============ Store Types ============

export interface KrokbookStore {
  // Folders
  folders: Folder[]
  addFolder: (name: string) => Folder
  deleteFolder: (folderId: string) => void

  // Questions
  getQuestions: (folderId: string) => Question[]
  addQuestions: (folderId: string, questions: ParsedQuestion[]) => void

  // Errors
  getErrors: (folderId: string) => UserError[]
  addError: (folderId: string, questionId: string, selectedIndex: number) => UserError
  updateErrorNotes: (errorId: string, notes: string) => void
  getAllErrors: () => UserError[]

  // Notebook
  getNotebookContent: (folderId: string) => string
  saveNotebookContent: (folderId: string, content: string) => void

  // Progress
  getProgress: (folderId: string) => FolderProgress
  updateProgress: (folderId: string, questionId: string, status: 'correct' | 'incorrect', selectedIndex: number) => void
  resetProgress: (folderId: string) => FolderProgress

  // Error Hub
  getErrorQuestions: () => QuestionWithError[]
}
