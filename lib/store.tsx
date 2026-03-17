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
import { supabase } from './supabase'


// ============ Context ============

interface StoreContextValue {
    // State
    folders: Folder[]
    isLoading: boolean

    // Folder operations (async — saved to Supabase)
    addFolder: (name: string) => Promise<Folder>
    deleteFolder: (folderId: string) => Promise<void>
    refreshFolders: () => Promise<void>

    // Question operations
    loadQuestionsForFolder: (folderId: string) => Promise<Question[]>
    getQuestions: (folderId: string) => Question[]
    addQuestions: (folderId: string, questions: ParsedQuestion[]) => Promise<void>

    // Error operations (localStorage — per-user)
    getErrors: (folderId: string) => UserError[]
    addError: (folderId: string, questionId: string, selectedIndex: number) => UserError
    updateErrorNotes: (errorId: string, notes: string) => void
    getAllErrors: () => UserError[]
    getErrorQuestions: () => QuestionWithError[]

    // Notebook operations (localStorage — per-user)
    getNotebookContent: (folderId: string) => string
    saveNotebookContent: (folderId: string, content: string) => void

    // Progress operations (localStorage — per-user)
    getProgress: (folderId: string, questions?: Question[]) => FolderProgress
    updateProgress: (folderId: string, questionId: string, status: 'correct' | 'incorrect', selectedIndex: number) => void
    resetProgress: (folderId: string) => FolderProgress

    // Current state operations (localStorage — per-user)
    getCurrentState: (folderId: string) => { questionIndex: number; testMode: 'study' | 'review' }
    saveCurrentState: (folderId: string, questionIndex: number, testMode: 'study' | 'review') => void

    // Folder notes operations (localStorage — per-user)
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
    const [questionsByFolder, setQuestionsByFolder] = React.useState<Record<string, Question[]>>({})
    const [isLoading, setIsLoading] = React.useState(true)

    // Load folders from Supabase on mount
    React.useEffect(() => {
        const loadFolders = async () => {
            try {
                const { data, error } = await supabase
                    .from('folders')
                    .select('*')
                    .order('created_at', { ascending: true })

                if (error) throw error

                setFolders(data.map(f => ({
                    id: f.id as string,
                    name: f.name as string,
                    createdAt: f.created_at as string,
                })))
            } catch (err) {
                console.error('Failed to load folders from Supabase:', err)
            } finally {
                setIsLoading(false)
            }
        }

        loadFolders()
    }, [])

    const refreshFolders = React.useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('folders')
                .select('*')
                .order('created_at', { ascending: true })

            if (error) throw error

            setFolders(data.map(f => ({
                id: f.id as string,
                name: f.name as string,
                createdAt: f.created_at as string,
            })))
        } catch (err) {
            console.error('Failed to refresh folders:', err)
        }
    }, [])

    // ========== Folder Operations ==========

    const addFolder = React.useCallback(async (name: string): Promise<Folder> => {
        const { data, error } = await supabase
            .from('folders')
            .insert({ name })
            .select()
            .single()

        if (error) throw error

        const folder: Folder = {
            id: data.id as string,
            name: data.name as string,
            createdAt: data.created_at as string,
        }

        setFolders(prev => [...prev, folder])
        return folder
    }, [])

    const deleteFolder = React.useCallback(async (folderId: string): Promise<void> => {
        const { error } = await supabase
            .from('folders')
            .delete()
            .eq('id', folderId)

        if (error) throw error

        setFolders(prev => prev.filter(f => f.id !== folderId))
        setQuestionsByFolder(prev => {
            const next = { ...prev }
            delete next[folderId]
            return next
        })

        // Clean up user-specific localStorage data for this folder
        removeFromStorage(STORAGE_KEYS.ERRORS(folderId))
        removeFromStorage(STORAGE_KEYS.NOTEBOOK(folderId))
        removeFromStorage(STORAGE_KEYS.PROGRESS(folderId))
        removeFromStorage(STORAGE_KEYS.CURRENT_STATE(folderId))
        removeFromStorage(STORAGE_KEYS.FOLDER_NOTES(folderId))
    }, [])

    // ========== Question Operations ==========

    const loadQuestionsForFolder = React.useCallback(async (folderId: string): Promise<Question[]> => {
        try {
            const { data, error } = await supabase
                .from('questions')
                .select('*')
                .eq('folder_id', folderId)
                .order('created_at', { ascending: true })

            if (error) throw error

            const questions: Question[] = data.map(q => ({
                id: q.id as string,
                folderId: q.folder_id as string,
                questionText: q.question_text as string,
                answerOptions: q.answer_options as string[],
                correctAnswerIndex: q.correct_answer_index as number,
                sourceFile: (q.source_file as string) || undefined,
            }))

            setQuestionsByFolder(prev => ({ ...prev, [folderId]: questions }))
            return questions
        } catch (err) {
            console.error('Failed to load questions:', err)
            return []
        }
    }, [])

    const getQuestions = React.useCallback((folderId: string): Question[] => {
        return questionsByFolder[folderId] || []
    }, [questionsByFolder])

    const addQuestions = React.useCallback(async (folderId: string, parsedQuestions: ParsedQuestion[]): Promise<void> => {
        const rows = parsedQuestions
            .filter(pq => pq.isValid)
            .map(pq => ({
                folder_id: folderId,
                question_text: pq.questionText,
                answer_options: pq.answerOptions,
                correct_answer_index: pq.correctAnswerIndex,
                source_file: pq.sourceFile || null,
            }))

        const { data, error } = await supabase
            .from('questions')
            .insert(rows)
            .select()

        if (error) throw error

        const newQuestions: Question[] = data.map(q => ({
            id: q.id as string,
            folderId: q.folder_id as string,
            questionText: q.question_text as string,
            answerOptions: q.answer_options as string[],
            correctAnswerIndex: q.correct_answer_index as number,
            sourceFile: (q.source_file as string) || undefined,
        }))

        setQuestionsByFolder(prev => ({
            ...prev,
            [folderId]: [...(prev[folderId] || []), ...newQuestions],
        }))
    }, [])

    // ========== Error Operations (localStorage — per-user) ==========

    const getErrors = React.useCallback((folderId: string): UserError[] => {
        return getFromStorage<UserError[]>(STORAGE_KEYS.ERRORS(folderId), [])
    }, [])

    const addError = React.useCallback((folderId: string, questionId: string, selectedIndex: number): UserError => {
        const errors = getFromStorage<UserError[]>(STORAGE_KEYS.ERRORS(folderId), [])

        const existingError = errors.find(e => e.questionId === questionId)
        if (existingError) {
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
            const questions = questionsByFolder[folder.id] || []
            const errors = getFromStorage<UserError[]>(STORAGE_KEYS.ERRORS(folder.id), [])

            for (const error of errors) {
                if (error.isResolved) continue

                const question = questions.find(q => q.id === error.questionId)
                if (question) {
                    result.push({ question, error })
                }
            }
        }

        return result
    }, [folders, questionsByFolder])

    // ========== Notebook Operations (localStorage — per-user) ==========

    const getNotebookContent = React.useCallback((folderId: string): string => {
        return getFromStorage<string>(STORAGE_KEYS.NOTEBOOK(folderId), '')
    }, [])

    const saveNotebookContent = React.useCallback((folderId: string, content: string): void => {
        setToStorage(STORAGE_KEYS.NOTEBOOK(folderId), content)
    }, [])

    // ========== Folder Notes Operations (localStorage — per-user) ==========

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

    // ========== Progress Operations (localStorage — per-user) ==========

    const getProgress = React.useCallback((folderId: string, questions?: Question[]): FolderProgress => {
        const existing = getFromStorage<FolderProgress | null>(STORAGE_KEYS.PROGRESS(folderId), null)

        if (existing) {
            return existing
        }

        // Create new progress using provided questions (or cached)
        const qs = questions || questionsByFolder[folderId] || []
        const shuffledAnswers: Record<string, number[]> = {}
        const questionProgress: Record<string, QuestionProgress> = {}

        for (const question of qs) {
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
    }, [questionsByFolder])

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
        const questions = questionsByFolder[folderId] || []
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
    }, [questionsByFolder])

    // ========== Current State Operations (localStorage — per-user) ==========

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
        loadQuestionsForFolder,
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
        loadQuestionsForFolder,
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
