'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { Tester } from '@/components/Tester'
import { Notebook } from '@/components/Notebook'
import { UploadModal } from '@/components/UploadModal'
import { MobileHeader } from '@/components/MobileHeader'
import { MobileTabBar, type MobileTab } from '@/components/MobileTabBar'
import { useStore } from '@/lib/store'
import type { Question, QuestionWithError, TestMode, FolderProgress } from '@/lib/types'

/**
 * Dashboard Page
 * 
 * Main application page with responsive layout:
 * - Desktop: Split-screen with Sidebar + Tester + Notebook
 * - Mobile: Hamburger menu + tab-based navigation between Tester/Notebook
 */
export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedFolderId = searchParams.get('folder')
  const activeTab = (searchParams.get('tab') as 'notes' | 'errors') || 'notes'

  const store = useStore()

  const [questions, setQuestions] = React.useState<Question[]>([])
  const [progress, setProgress] = React.useState<FolderProgress | null>(null)
  const [errorQuestions, setErrorQuestions] = React.useState<QuestionWithError[]>([])
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false)
  const [testMode, setTestMode] = React.useState<TestMode>('study')
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0)

  // Mobile-specific state
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)
  const [activeMobileTab, setActiveMobileTab] = React.useState<MobileTab>('tester')

  // Panel visibility state (desktop only)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false)
  const [isNotebookCollapsed, setIsNotebookCollapsed] = React.useState(false)

  // Load panel visibility from localStorage on mount
  React.useEffect(() => {
    try {
      const savedState = localStorage.getItem('panelVisibility')
      if (savedState) {
        const { sidebar, notebook } = JSON.parse(savedState)
        setIsSidebarCollapsed(sidebar ?? false)
        setIsNotebookCollapsed(notebook ?? false)
      }
    } catch (e) {
      // Ignore localStorage errors (e.g., SSR, private browsing)
      console.warn('Failed to load panel visibility state:', e)
    }
  }, [])

  // Save panel visibility to localStorage when changed
  React.useEffect(() => {
    try {
      localStorage.setItem('panelVisibility', JSON.stringify({
        sidebar: isSidebarCollapsed,
        notebook: isNotebookCollapsed
      }))
    } catch (e) {
      console.warn('Failed to save panel visibility state:', e)
    }
  }, [isSidebarCollapsed, isNotebookCollapsed])

  // Get current folder name for mobile header
  const currentFolderName = React.useMemo(() => {
    if (!selectedFolderId) return undefined
    return store.folders.find(f => f.id === selectedFolderId)?.name
  }, [selectedFolderId, store.folders])

  // Load folder data when folder is selected
  React.useEffect(() => {
    if (!selectedFolderId) {
      setQuestions([])
      setProgress(null)
      setErrorQuestions([])
      return
    }

    const loadedQuestions = store.getQuestions(selectedFolderId)
    const loadedProgress = store.getProgress(selectedFolderId)
    const loadedErrors = store.getErrors(selectedFolderId)

    // Build error questions (sorted by createdAt desc - newest first)
    const errQuestions: QuestionWithError[] = loadedErrors
      .filter(error => !error.isResolved)
      .map(error => {
        const question = loadedQuestions.find(q => q.id === error.questionId)
        return question ? { question, error } : null
      })
      .filter((item): item is QuestionWithError => item !== null)
      .sort((a, b) => new Date(b.error.createdAt).getTime() - new Date(a.error.createdAt).getTime())

    setQuestions(loadedQuestions)
    setProgress(loadedProgress)
    setErrorQuestions(errQuestions)

    // Load saved current state
    const savedState = store.getCurrentState(selectedFolderId)
    setCurrentQuestionIndex(Math.min(savedState.questionIndex, loadedQuestions.length - 1))
    setTestMode(savedState.testMode)
  }, [selectedFolderId, store])

  const handleFolderSelect = React.useCallback((folderId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('folder', folderId)
    router.push(`/dashboard?${params.toString()}`)
  }, [router, searchParams])

  const handleFolderDelete = React.useCallback((folderId: string) => {
    store.deleteFolder(folderId)

    // If the deleted folder was selected, clear selection
    if (selectedFolderId === folderId) {
      router.push('/dashboard')
    }
  }, [store, selectedFolderId, router])

  const handleUploadClick = React.useCallback(() => {
    setIsUploadModalOpen(true)
  }, [])

  const handleUploadComplete = React.useCallback((folderId?: string) => {
    setIsUploadModalOpen(false)
    store.refreshFolders()

    if (folderId) {
      // Navigate to the new folder
      router.push(`/dashboard?folder=${folderId}`)
    } else if (selectedFolderId) {
      // Reload current folder
      const loadedQuestions = store.getQuestions(selectedFolderId)
      setQuestions(loadedQuestions)
    }
  }, [store, selectedFolderId, router])

  const handleErrorHubClick = React.useCallback(() => {
    router.push('/error-hub')
  }, [router])

  const handleModeToggle = React.useCallback(() => {
    setTestMode(prev => {
      const newMode = prev === 'study' ? 'review' : 'study'
      if (selectedFolderId) {
        store.saveCurrentState(selectedFolderId, currentQuestionIndex, newMode)
      }
      return newMode
    })
  }, [selectedFolderId, currentQuestionIndex, store])

  const handleAnswerSelect = React.useCallback((questionId: string, selectedIndex: number, isCorrect: boolean) => {
    if (!selectedFolderId || !progress) return

    // Update progress
    const status = isCorrect ? 'correct' : 'incorrect'
    store.updateProgress(selectedFolderId, questionId, status, selectedIndex)

    // Update local progress state
    setProgress(prev => {
      if (!prev) return prev
      return {
        ...prev,
        questionProgress: {
          ...prev.questionProgress,
          [questionId]: { questionId, status, selectedIndex }
        }
      }
    })

    // If incorrect, add to errors
    if (!isCorrect) {
      const error = store.addError(selectedFolderId, questionId, selectedIndex)
      const question = questions.find(q => q.id === questionId)
      if (question) {
        setErrorQuestions(prev => {
          // Check if already exists
          const exists = prev.some(eq => eq.question.id === questionId)
          if (exists) {
            return prev.map(eq =>
              eq.question.id === questionId
                ? { question, error }
                : eq
            )
          }
          return [{ question, error }, ...prev]
        })
      }
    } else {
      // If correct, resolve the error (mark as resolved, keeping notes)
      store.resolveError(selectedFolderId, questionId)
      setErrorQuestions(prev => prev.filter(eq => eq.question.id !== questionId))
    }
  }, [selectedFolderId, progress, store, questions])

  const handleNavigate = React.useCallback((direction: 'next' | 'prev') => {
    setCurrentQuestionIndex(prev => {
      let newIndex: number
      if (direction === 'next') {
        newIndex = Math.min(prev + 1, questions.length - 1)
      } else {
        newIndex = Math.max(prev - 1, 0)
      }
      if (selectedFolderId) {
        store.saveCurrentState(selectedFolderId, newIndex, testMode)
      }
      return newIndex
    })
  }, [questions.length, selectedFolderId, testMode, store])

  const handleQuestionSelect = React.useCallback((index: number) => {
    setCurrentQuestionIndex(index)
    if (selectedFolderId) {
      store.saveCurrentState(selectedFolderId, index, testMode)
    }
  }, [selectedFolderId, testMode, store])

  const handleResetProgress = React.useCallback(() => {
    if (!selectedFolderId) return
    const newProgress = store.resetProgress(selectedFolderId)
    setProgress(newProgress)
    setCurrentQuestionIndex(0)
    store.saveCurrentState(selectedFolderId, 0, testMode)
  }, [selectedFolderId, store, testMode])

  const handleErrorNotesUpdate = React.useCallback((errorId: string, notes: string) => {
    store.updateErrorNotes(errorId, notes)
    setErrorQuestions(prev =>
      prev.map(eq =>
        eq.error.id === errorId
          ? { ...eq, error: { ...eq.error, notes } }
          : eq
      )
    )
  }, [store])

  // Mobile handlers
  const handleMenuToggle = React.useCallback(() => {
    setIsSidebarOpen(prev => !prev)
  }, [])

  const handleSidebarClose = React.useCallback(() => {
    setIsSidebarOpen(false)
  }, [])

  const handleMobileTabChange = React.useCallback((tab: MobileTab) => {
    setActiveMobileTab(tab)
  }, [])

  // Panel visibility handlers (desktop only)
  const handleToggleSidebar = React.useCallback(() => {
    setIsSidebarCollapsed(prev => !prev)
  }, [])

  const handleToggleNotebook = React.useCallback(() => {
    setIsNotebookCollapsed(prev => !prev)
  }, [])

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-white overflow-hidden">
      {/* Mobile Header - only visible on mobile */}
      <MobileHeader
        folderName={currentFolderName}
        onMenuClick={handleMenuToggle}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Sidebar - drawer on mobile, static on desktop (collapsible) */}
      <Sidebar
        folders={store.folders}
        selectedFolderId={selectedFolderId}
        onFolderSelect={handleFolderSelect}
        onFolderDelete={handleFolderDelete}
        onUploadClick={handleUploadClick}
        onErrorHubClick={handleErrorHubClick}
        isMobileOpen={isSidebarOpen}
        onMobileClose={handleSidebarClose}
        isDesktopCollapsed={isSidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className={`
        flex-1 flex flex-col md:flex-row pt-14 md:pt-0 pb-16 md:pb-0 min-h-0 overflow-hidden
        ${isSidebarCollapsed && isNotebookCollapsed ? 'md:justify-center' : ''}
      `}>
        {/* Tester Panel - Hidden on mobile when notebook tab is active */}
        <div
          className={`
            min-h-0 p-4 md:p-6 overflow-y-auto transition-all duration-300
            ${activeMobileTab === 'notebook' ? 'hidden md:block' : 'block'}
            ${isNotebookCollapsed
              ? isSidebarCollapsed
                ? 'flex-1 md:max-w-4xl md:mx-auto w-full'
                : 'flex-1'
              : 'flex-1 border-r border-zinc-200'
            }
          `}
        >
          {store.isLoading && (
            <div className="flex items-center justify-center h-full">
              <p className="text-zinc-500">Loading...</p>
            </div>
          )}

          {!store.isLoading && !selectedFolderId && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-zinc-500 text-lg mb-2">No folder selected</p>
                <p className="text-zinc-400 text-sm">
                  Select a folder from the sidebar to get started
                </p>
              </div>
            </div>
          )}

          {!store.isLoading && selectedFolderId && questions.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-zinc-500 text-lg mb-2">No questions yet</p>
                <p className="text-zinc-400 text-sm">
                  Upload questions to this folder to get started
                </p>
              </div>
            </div>
          )}

          {!store.isLoading && selectedFolderId && questions.length > 0 && progress && (
            <Tester
              questions={questions}
              progress={progress}
              mode={testMode}
              onModeToggle={handleModeToggle}
              onAnswerSelect={handleAnswerSelect}
              currentQuestionIndex={currentQuestionIndex}
              onNavigate={handleNavigate}
              onQuestionSelect={handleQuestionSelect}
              onResetProgress={handleResetProgress}
              isSidebarCollapsed={isSidebarCollapsed}
              isNotebookCollapsed={isNotebookCollapsed}
              onToggleSidebar={handleToggleSidebar}
              onToggleNotebook={handleToggleNotebook}
            />
          )}
        </div>

        {/* Notebook Panel - Hidden on mobile when tester tab is active, collapsible on desktop */}
        {!isNotebookCollapsed && (
          <div
            className={`
              flex-1 min-h-0 p-4 md:p-6 overflow-y-auto
              ${activeMobileTab === 'tester' ? 'hidden md:block' : 'block'}
            `}
          >
            {!store.isLoading && !selectedFolderId && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-zinc-500 text-lg mb-2">No folder selected</p>
                  <p className="text-zinc-400 text-sm">
                    Select a folder to view notes
                  </p>
                </div>
              </div>
            )}

            {!store.isLoading && selectedFolderId && (
              <Notebook
                folderId={selectedFolderId}
                errorQuestions={errorQuestions}
                activeTab={activeTab}
                onErrorNotesUpdate={handleErrorNotesUpdate}
              />
            )}
          </div>
        )}
      </div>

      {/* Mobile Tab Bar - only visible on mobile */}
      <MobileTabBar
        activeTab={activeMobileTab}
        onTabChange={handleMobileTabChange}
        errorCount={errorQuestions.length}
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        folders={store.folders}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  )
}
