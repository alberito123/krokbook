'use client'

import * as React from 'react'
import type {
    Folder,
    Question,
    UserError,
    ParsedQuestion,
    FolderProgress,
    QuestionProgress,
    QuestionWithError,
    FolderNote
} from './types'
import { generateId, getFromStorage, setToStorage, removeFromStorage } from './storage'
import { shuffleArray } from './utils'
import { STORAGE_KEYS } from './constants'


// ============ Context ============

interface StoreContextValue {
    // State
    folders: Folder[]
    isLoading: boolean

    // Folder operations
    addFolder: (name: string) => Folder
    deleteFolder: (folderId: string) => void
    refreshFolders: () => void

    // Question operations
    getQuestions: (folderId: string) => Question[]
    addQuestions: (folderId: string, questions: ParsedQuestion[]) => void

    // Error operations
    getErrors: (folderId: string) => UserError[]
    addError: (folderId: string, questionId: string, selectedIndex: number) => UserError
    updateErrorNotes: (errorId: string, notes: string) => void
    getAllErrors: () => UserError[]
    getErrorQuestions: () => QuestionWithError[]

    // Notebook operations
    getNotebookContent: (folderId: string) => string
    saveNotebookContent: (folderId: string, content: string) => void

    // Progress operations
    getProgress: (folderId: string) => FolderProgress
    updateProgress: (folderId: string, questionId: string, status: 'correct' | 'incorrect', selectedIndex: number) => void
    resetProgress: (folderId: string) => FolderProgress

    // Current state operations (for persistence)
    getCurrentState: (folderId: string) => { questionIndex: number; testMode: 'study' | 'review' }
    saveCurrentState: (folderId: string, questionIndex: number, testMode: 'study' | 'review') => void

    // Folder notes operations
    getFolderNotes: (folderId: string) => FolderNote[]
    addFolderNote: (folderId: string, text: string) => FolderNote
    updateFolderNote: (folderId: string, noteId: string, text: string) => void
    deleteFolderNote: (folderId: string, noteId: string) => void

    // Error management
    removeError: (folderId: string, questionId: string) => void
    resolveError: (folderId: string, questionId: string) => void
}

const StoreContext = React.createContext<StoreContextValue | null>(null)

// ============ Provider ============

export function StoreProvider({ children }: { children: React.ReactNode }) {
    const [folders, setFolders] = React.useState<Folder[]>([])
    const [isLoading, setIsLoading] = React.useState(true)

    // Load folders on mount
    React.useEffect(() => {
        const loadedFolders = getFromStorage<Folder[]>(STORAGE_KEYS.FOLDERS, [])
        setFolders(loadedFolders)
        setIsLoading(false)
    }, [])

    const refreshFolders = React.useCallback(() => {
        const loadedFolders = getFromStorage<Folder[]>(STORAGE_KEYS.FOLDERS, [])
        setFolders(loadedFolders)
    }, [])

    // ========== Folder Operations ==========

    const addFolder = React.useCallback((name: string): Folder => {
        const newFolder: Folder = {
            id: generateId(),
            name,
            createdAt: new Date().toISOString(),
        }

        const updatedFolders = [...folders, newFolder]
        setToStorage(STORAGE_KEYS.FOLDERS, updatedFolders)
        setFolders(updatedFolders)

        return newFolder
    }, [folders])

    const deleteFolder = React.useCallback((folderId: string): void => {
        // Remove folder using functional update to avoid stale closure
        setFolders(prevFolders => {
            const updatedFolders = prevFolders.filter(f => f.id !== folderId)
            setToStorage(STORAGE_KEYS.FOLDERS, updatedFolders)
            return updatedFolders
        })

        // Clean up related data
        removeFromStorage(STORAGE_KEYS.QUESTIONS(folderId))
        removeFromStorage(STORAGE_KEYS.ERRORS(folderId))
        removeFromStorage(STORAGE_KEYS.NOTEBOOK(folderId))
        removeFromStorage(STORAGE_KEYS.PROGRESS(folderId))
        removeFromStorage(STORAGE_KEYS.CURRENT_STATE(folderId))
        removeFromStorage(STORAGE_KEYS.FOLDER_NOTES(folderId))
    }, [])

    // ========== Question Operations ==========

    const getQuestions = React.useCallback((folderId: string): Question[] => {
        return getFromStorage<Question[]>(STORAGE_KEYS.QUESTIONS(folderId), [])
    }, [])

    const addQuestions = React.useCallback((folderId: string, parsedQuestions: ParsedQuestion[]): void => {
        const existingQuestions = getFromStorage<Question[]>(STORAGE_KEYS.QUESTIONS(folderId), [])

        const newQuestions: Question[] = parsedQuestions
            .filter(pq => pq.isValid)
            .map(pq => ({
                id: generateId(),
                folderId,
                questionText: pq.questionText,
                answerOptions: pq.answerOptions,
                correctAnswerIndex: pq.correctAnswerIndex,
                sourceFile: pq.sourceFile,
            }))

        const allQuestions = [...existingQuestions, ...newQuestions]
        setToStorage(STORAGE_KEYS.QUESTIONS(folderId), allQuestions)

        // Update progress for new questions (if progress already exists)
        const existingProgress = getFromStorage<FolderProgress | null>(STORAGE_KEYS.PROGRESS(folderId), null)
        if (existingProgress && newQuestions.length > 0) {
            for (const question of newQuestions) {
                const { indices } = shuffleArray(question.answerOptions)
                existingProgress.shuffledAnswers[question.id] = indices
                existingProgress.questionProgress[question.id] = {
                    questionId: question.id,
                    status: 'unanswered',
                }
            }
            setToStorage(STORAGE_KEYS.PROGRESS(folderId), existingProgress)
        }
    }, [])

    // ========== Error Operations ==========

    const getErrors = React.useCallback((folderId: string): UserError[] => {
        return getFromStorage<UserError[]>(STORAGE_KEYS.ERRORS(folderId), [])
    }, [])

    const addError = React.useCallback((folderId: string, questionId: string, selectedIndex: number): UserError => {
        const errors = getFromStorage<UserError[]>(STORAGE_KEYS.ERRORS(folderId), [])

        // Check if error already exists for this question
        const existingError = errors.find(e => e.questionId === questionId)
        if (existingError) {
            // Update existing error with new selected index, mark as not resolved
            existingError.userSelectedIndex = selectedIndex
            existingError.createdAt = new Date().toISOString()
            existingError.isResolved = false
            setToStorage(STORAGE_KEYS.ERRORS(folderId), errors)
            return existingError
        }

        const newError: UserError = {
            id: generateId(),
            folderId,
            questionId,
            userSelectedIndex: selectedIndex,
            notes: '',
            createdAt: new Date().toISOString(),
            isResolved: false,
        }

        const updatedErrors = [...errors, newError]
        setToStorage(STORAGE_KEYS.ERRORS(folderId), updatedErrors)

        return newError
    }, [])

    const updateErrorNotes = React.useCallback((errorId: string, notes: string): void => {
        // Find which folder this error belongs to
        for (const folder of folders) {
            const errors = getFromStorage<UserError[]>(STORAGE_KEYS.ERRORS(folder.id), [])
            const errorIndex = errors.findIndex(e => e.id === errorId)

            if (errorIndex !== -1) {
                errors[errorIndex].notes = notes
                setToStorage(STORAGE_KEYS.ERRORS(folder.id), errors)
                return
            }
        }
    }, [folders])

    const getAllErrors = React.useCallback((): UserError[] => {
        const allErrors: UserError[] = []
        for (const folder of folders) {
            const folderErrors = getFromStorage<UserError[]>(STORAGE_KEYS.ERRORS(folder.id), [])
            allErrors.push(...folderErrors)
        }
        return allErrors
    }, [folders])

    const getErrorQuestions = React.useCallback((): QuestionWithError[] => {
        const result: QuestionWithError[] = []

        for (const folder of folders) {
            const questions = getFromStorage<Question[]>(STORAGE_KEYS.QUESTIONS(folder.id), [])
            const errors = getFromStorage<UserError[]>(STORAGE_KEYS.ERRORS(folder.id), [])

            for (const error of errors) {
                // Skip resolved errors
                if (error.isResolved) continue

                const question = questions.find(q => q.id === error.questionId)
                if (question) {
                    result.push({ question, error })
                }
            }
        }

        return result
    }, [folders])

    // ========== Notebook Operations ==========

    const getNotebookContent = React.useCallback((folderId: string): string => {
        return getFromStorage<string>(STORAGE_KEYS.NOTEBOOK(folderId), '')
    }, [])

    const saveNotebookContent = React.useCallback((folderId: string, content: string): void => {
        setToStorage(STORAGE_KEYS.NOTEBOOK(folderId), content)
    }, [])

    // ========== Folder Notes Operations ==========

    const getFolderNotes = React.useCallback((folderId: string): FolderNote[] => {
        return getFromStorage<FolderNote[]>(STORAGE_KEYS.FOLDER_NOTES(folderId), [])
    }, [])

    const addFolderNote = React.useCallback((folderId: string, text: string): FolderNote => {
        const notes = getFromStorage<FolderNote[]>(STORAGE_KEYS.FOLDER_NOTES(folderId), [])
        const now = new Date().toISOString()
        const newNote: FolderNote = {
            id: generateId(),
            folderId,
            text,
            createdAt: now,
            updatedAt: now,
        }
        const updatedNotes = [newNote, ...notes]
        setToStorage(STORAGE_KEYS.FOLDER_NOTES(folderId), updatedNotes)
        return newNote
    }, [])

    const updateFolderNote = React.useCallback((folderId: string, noteId: string, text: string): void => {
        const notes = getFromStorage<FolderNote[]>(STORAGE_KEYS.FOLDER_NOTES(folderId), [])
        const noteIndex = notes.findIndex(n => n.id === noteId)
        if (noteIndex !== -1) {
            notes[noteIndex].text = text
            notes[noteIndex].updatedAt = new Date().toISOString()
            setToStorage(STORAGE_KEYS.FOLDER_NOTES(folderId), notes)
        }
    }, [])

    const deleteFolderNote = React.useCallback((folderId: string, noteId: string): void => {
        const notes = getFromStorage<FolderNote[]>(STORAGE_KEYS.FOLDER_NOTES(folderId), [])
        const updatedNotes = notes.filter(n => n.id !== noteId)
        setToStorage(STORAGE_KEYS.FOLDER_NOTES(folderId), updatedNotes)
    }, [])

    const removeError = React.useCallback((folderId: string, questionId: string): void => {
        const errors = getFromStorage<UserError[]>(STORAGE_KEYS.ERRORS(folderId), [])
        const updatedErrors = errors.filter(e => e.questionId !== questionId)
        setToStorage(STORAGE_KEYS.ERRORS(folderId), updatedErrors)
    }, [])

    const resolveError = React.useCallback((folderId: string, questionId: string): void => {
        const errors = getFromStorage<UserError[]>(STORAGE_KEYS.ERRORS(folderId), [])
        const errorIndex = errors.findIndex(e => e.questionId === questionId)
        if (errorIndex !== -1) {
            errors[errorIndex].isResolved = true
            setToStorage(STORAGE_KEYS.ERRORS(folderId), errors)
        }
    }, [])

    // ========== Progress Operations ==========

    const getProgress = React.useCallback((folderId: string): FolderProgress => {
        const existing = getFromStorage<FolderProgress | null>(STORAGE_KEYS.PROGRESS(folderId), null)

        if (existing) {
            return existing
        }

        // Create new progress with shuffled answers
        const questions = getFromStorage<Question[]>(STORAGE_KEYS.QUESTIONS(folderId), [])
        const shuffledAnswers: Record<string, number[]> = {}
        const questionProgress: Record<string, QuestionProgress> = {}

        for (const question of questions) {
            const { indices } = shuffleArray(question.answerOptions)
            shuffledAnswers[question.id] = indices
            questionProgress[question.id] = {
                questionId: question.id,
                status: 'unanswered',
            }
        }

        const progress: FolderProgress = {
            folderId,
            questionProgress,
            shuffledAnswers,
        }

        setToStorage(STORAGE_KEYS.PROGRESS(folderId), progress)
        return progress
    }, [])

    const updateProgress = React.useCallback((
        folderId: string,
        questionId: string,
        status: 'correct' | 'incorrect',
        selectedIndex: number
    ): void => {
        const progress = getFromStorage<FolderProgress>(STORAGE_KEYS.PROGRESS(folderId), {
            folderId,
            questionProgress: {},
            shuffledAnswers: {},
        })

        progress.questionProgress[questionId] = {
            questionId,
            status,
            selectedIndex,
        }
        progress.lastAttemptAt = new Date().toISOString()

        setToStorage(STORAGE_KEYS.PROGRESS(folderId), progress)
    }, [])

    const resetProgress = React.useCallback((folderId: string): FolderProgress => {
        // Create new progress with fresh shuffled answers
        const questions = getFromStorage<Question[]>(STORAGE_KEYS.QUESTIONS(folderId), [])
        const shuffledAnswers: Record<string, number[]> = {}
        const questionProgress: Record<string, QuestionProgress> = {}

        for (const question of questions) {
            const { indices } = shuffleArray(question.answerOptions)
            shuffledAnswers[question.id] = indices
            questionProgress[question.id] = {
                questionId: question.id,
                status: 'unanswered',
            }
        }

        const progress: FolderProgress = {
            folderId,
            questionProgress,
            shuffledAnswers,
            lastAttemptAt: new Date().toISOString(),
        }

        setToStorage(STORAGE_KEYS.PROGRESS(folderId), progress)
        return progress
    }, [])

    // ========== Current State Operations ==========

    const getCurrentState = React.useCallback((folderId: string): { questionIndex: number; testMode: 'study' | 'review' } => {
        return getFromStorage(STORAGE_KEYS.CURRENT_STATE(folderId), { questionIndex: 0, testMode: 'study' })
    }, [])

    const saveCurrentState = React.useCallback((folderId: string, questionIndex: number, testMode: 'study' | 'review'): void => {
        setToStorage(STORAGE_KEYS.CURRENT_STATE(folderId), { questionIndex, testMode })
    }, [])

    const value = React.useMemo<StoreContextValue>(() => ({
        folders,
        isLoading,
        addFolder,
        deleteFolder,
        refreshFolders,
        getQuestions,
        addQuestions,
        getErrors,
        addError,
        updateErrorNotes,
        getAllErrors,
        getErrorQuestions,
        getNotebookContent,
        saveNotebookContent,
        getFolderNotes,
        addFolderNote,
        updateFolderNote,
        deleteFolderNote,
        removeError,
        resolveError,
        getProgress,
        updateProgress,
        resetProgress,
        getCurrentState,
        saveCurrentState,
    }), [
        folders,
        isLoading,
        addFolder,
        deleteFolder,
        refreshFolders,
        getQuestions,
        addQuestions,
        getErrors,
        addError,
        updateErrorNotes,
        getAllErrors,
        getErrorQuestions,
        getNotebookContent,
        saveNotebookContent,
        getFolderNotes,
        addFolderNote,
        updateFolderNote,
        deleteFolderNote,
        removeError,
        resolveError,
        getProgress,
        updateProgress,
        resetProgress,
        getCurrentState,
        saveCurrentState,
    ])

    return (
        <StoreContext.Provider value={value}>
            {children}
        </StoreContext.Provider>
    )
}

// ============ Hook ============

export function useStore(): StoreContextValue {
    const context = React.useContext(StoreContext)
    if (!context) {
        throw new Error('useStore must be used within a StoreProvider')
    }
    return context
}
