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
  return (
    <React.Suspense fallback={<div className="flex items-center justify-center h-[100dvh]"><p className="text-zinc-500">Loading...</p></div>}>
      <DashboardPageInner />
    </React.Suspense>
  )
}

function DashboardPageInner() {
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

  // Admin auth state
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = React.useState(false)
  const [passwordInput, setPasswordInput] = React.useState('')
  const [passwordError, setPasswordError] = React.useState(false)
  const [isVerifying, setIsVerifying] = React.useState(false)

  // Check sessionStorage for admin session on mount
  React.useEffect(() => {
    if (sessionStorage.getItem('isAdmin') === 'true') {
      setIsAdmin(true)
    }
  }, [])

  // Mobile-specific state
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)
  const [activeMobileTab, setActiveMobileTab] = React.useState<MobileTab>('tester')

  // Panel visibility state (desktop only)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false)
  const [isNotebookCollapsed, setIsNotebookCollapsed] = React.useState(false)
  const [isHeaderCollapsed, setIsHeaderCollapsed] = React.useState(false)

  // Load panel visibility from localStorage on mount
  React.useEffect(() => {
    try {
      const savedState = localStorage.getItem('panelVisibility')
      if (savedState) {
        const { sidebar, notebook, headerCollapsed } = JSON.parse(savedState)
        setIsSidebarCollapsed(sidebar ?? false)
        setIsNotebookCollapsed(notebook ?? false)
        setIsHeaderCollapsed(headerCollapsed ?? false)
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
        notebook: isNotebookCollapsed,
        headerCollapsed: isHeaderCollapsed,
      }))
    } catch (e) {
      console.warn('Failed to save panel visibility state:', e)
    }
  }, [isSidebarCollapsed, isNotebookCollapsed, isHeaderCollapsed])

  // Get current folder name for mobile header
  const currentFolderName = React.useMemo(() => {
    if (!selectedFolderId) return undefined
    return store.folders.find(f => f.id === selectedFolderId)?.name
  }, [selectedFolderId, store.folders])

  // Load folder data from Supabase when folder is selected
  const { loadQuestionsForFolder, getProgress, getErrors, getCurrentState } = store

  // Stable refs for store functions to avoid re-triggering the load effect
  const loadQuestionsForFolderRef = React.useRef(loadQuestionsForFolder)
  React.useEffect(() => { loadQuestionsForFolderRef.current = loadQuestionsForFolder }, [loadQuestionsForFolder])
  const getProgressRef = React.useRef(getProgress)
  React.useEffect(() => { getProgressRef.current = getProgress }, [getProgress])
  const getErrorsRef = React.useRef(getErrors)
  React.useEffect(() => { getErrorsRef.current = getErrors }, [getErrors])
  const getCurrentStateRef = React.useRef(getCurrentState)
  React.useEffect(() => { getCurrentStateRef.current = getCurrentState }, [getCurrentState])

  const loadFolderData = React.useCallback(async (folderId: string, isCancelled: () => boolean) => {
    const loadedQuestions = await loadQuestionsForFolderRef.current(folderId)
    if (isCancelled()) return

    const loadedProgress = getProgressRef.current(folderId, loadedQuestions)
    const loadedErrors = getErrorsRef.current(folderId)

    const errQuestions: QuestionWithError[] = loadedErrors
      .filter(error => !error.isResolved)
      .map(error => {
        const question = loadedQuestions.find(q => q.id === error.questionId)
        return question ? { question, error } : null
      })
      .filter((item): item is QuestionWithError => item !== null)
      .sort((a, b) => new Date(b.error.createdAt).getTime() - new Date(a.error.createdAt).getTime())

    if (isCancelled()) return

    setQuestions(loadedQuestions)
    setProgress(loadedProgress)
    setErrorQuestions(errQuestions)

    const savedState = getCurrentStateRef.current(folderId)
    setCurrentQuestionIndex(Math.min(savedState.questionIndex, Math.max(0, loadedQuestions.length - 1)))
    setTestMode(savedState.testMode)
  }, [])

  React.useEffect(() => {
    if (!selectedFolderId) {
      setQuestions([])
      setProgress(null)
      setErrorQuestions([])
      return
    }

    let cancelled = false
    loadFolderData(selectedFolderId, () => cancelled)
    return () => { cancelled = true }
  }, [selectedFolderId, loadFolderData])

  const handleFolderSelect = React.useCallback((folderId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('folder', folderId)
    router.push(`/dashboard?${params.toString()}`)
  }, [router, searchParams])

  const handleFolderDelete = React.useCallback(async (folderId: string) => {
    await store.deleteFolder(folderId)

    // If the deleted folder was selected, clear selection
    if (selectedFolderId === folderId) {
      router.push('/dashboard')
    }
  }, [store, selectedFolderId, router])

  const handleUploadClick = React.useCallback(() => {
    if (isAdmin) {
      setIsUploadModalOpen(true)
    } else {
      setPasswordError(false)
      setPasswordInput('')
      setIsPasswordModalOpen(true)
    }
  }, [isAdmin])

  const handleVerifyPassword = React.useCallback(async () => {
    setIsVerifying(true)
    setPasswordError(false)
    try {
      const res = await fetch('/api/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      })
      if (res.ok) {
        sessionStorage.setItem('isAdmin', 'true')
        setIsAdmin(true)
        setIsPasswordModalOpen(false)
        setIsUploadModalOpen(true)
      } else {
        setPasswordError(true)
      }
    } catch {
      setPasswordError(true)
    } finally {
      setIsVerifying(false)
    }
  }, [passwordInput])

  const handleUploadComplete = React.useCallback((folderId?: string) => {
    setIsUploadModalOpen(false)

    if (folderId) {
      // Navigate to the new folder (state already updated by addFolder/addQuestions)
      router.push(`/dashboard?folder=${folderId}`)
    } else if (selectedFolderId) {
      // Questions were added to current folder — refresh from cache
      const loadedQuestions = store.getQuestions(selectedFolderId)
      setQuestions(loadedQuestions)
      const loadedProgress = store.getProgress(selectedFolderId, loadedQuestions)
      setProgress(loadedProgress)
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
        isHeaderCollapsed={isHeaderCollapsed}
        onToggleHeader={() => setIsHeaderCollapsed(prev => !prev)}
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
        isAdmin={isAdmin}
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
              isHeaderCollapsed={isHeaderCollapsed}
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

      {/* Admin Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsPasswordModalOpen(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl p-6 w-80">
            <h2 className="text-lg font-semibold text-zinc-900 mb-1">Admin Access</h2>
            <p className="text-sm text-zinc-500 mb-4">Enter admin password to continue</p>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false) }}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
              placeholder="Password"
              autoFocus
              className="w-full h-10 px-3 rounded-md border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 mb-2"
            />
            {passwordError && (
              <p className="text-sm text-red-600 mb-2">Incorrect password</p>
            )}
            <div className="flex gap-2 justify-end mt-3">
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyPassword}
                disabled={isVerifying || !passwordInput}
                className="px-4 py-2 text-sm bg-zinc-900 text-white rounded-md hover:bg-zinc-700 disabled:opacity-50"
              >
                {isVerifying ? 'Checking...' : 'Enter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
