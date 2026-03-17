'use client'

import * as React from 'react'
import { Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, BookOpen, Eye, RotateCcw, Check, X, PanelLeft, PanelRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Question, FolderProgress, TestMode } from '@/lib/types'

export interface TesterProps {
  questions: Question[]
  progress: FolderProgress
  mode: TestMode
  onModeToggle: () => void
  onAnswerSelect: (questionId: string, selectedIndex: number, isCorrect: boolean) => void
  currentQuestionIndex: number
  onNavigate: (direction: 'next' | 'prev') => void
  onQuestionSelect: (index: number) => void
  onResetProgress: () => void
  // Panel visibility controls (optional for backward compatibility)
  isSidebarCollapsed?: boolean
  isNotebookCollapsed?: boolean
  onToggleSidebar?: () => void
  onToggleNotebook?: () => void
}

/**
 * Tester Component
 * 
 * Left panel component that displays questions with:
 * - Question indicators (1, 2, 3...) with status colors (white/green/red)
 * - Shuffled answer options for each attempt
 * - Study/Review mode toggle
 * - Search functionality
 */
const FONT_SIZE_KEY = 'krokbook-tester-font-size'
const FONT_SIZE_MIN = 12
const FONT_SIZE_MAX = 26
const FONT_SIZE_STEP = 2
const FONT_SIZE_DEFAULT = 16

export function Tester({
  questions,
  progress,
  mode,
  onModeToggle,
  onAnswerSelect,
  currentQuestionIndex,
  onNavigate,
  onQuestionSelect,
  onResetProgress,
  isSidebarCollapsed = false,
  isNotebookCollapsed = false,
  onToggleSidebar,
  onToggleNotebook,
}: TesterProps) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [filteredQuestions, setFilteredQuestions] = React.useState(questions)
  const [isHeaderCollapsed, setIsHeaderCollapsed] = React.useState(false)
  const [fontSize, setFontSize] = React.useState<number>(() => {
    if (typeof window === 'undefined') return FONT_SIZE_DEFAULT
    const saved = localStorage.getItem(FONT_SIZE_KEY)
    const parsed = saved ? parseInt(saved, 10) : NaN
    return isNaN(parsed) ? FONT_SIZE_DEFAULT : Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, parsed))
  })

  // Restore header collapsed state from localStorage on mount
  React.useEffect(() => {
    try {
      const savedState = localStorage.getItem('panelVisibility')
      if (savedState) {
        const saved = JSON.parse(savedState)
        if (saved.headerCollapsed !== undefined) setIsHeaderCollapsed(saved.headerCollapsed)
      }
    } catch (e) {
      console.warn('Failed to load header collapsed state:', e)
    }
  }, [])

  // Save header collapsed state to localStorage when changed
  React.useEffect(() => {
    try {
      const existing = localStorage.getItem('panelVisibility')
      const parsed = existing ? JSON.parse(existing) : {}
      localStorage.setItem('panelVisibility', JSON.stringify({
        ...parsed,
        headerCollapsed: isHeaderCollapsed
      }))
    } catch (e) {
      console.warn('Failed to save header collapsed state:', e)
    }
  }, [isHeaderCollapsed])

  const changeFontSize = (delta: number) => {
    setFontSize(prev => {
      const next = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, prev + delta))
      localStorage.setItem(FONT_SIZE_KEY, String(next))
      return next
    })
  }

  // Filter questions based on search
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredQuestions(questions)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = questions.filter(question => {
      if (question.questionText.toLowerCase().includes(query)) {
        return true
      }
      return question.answerOptions.some(option =>
        option.toLowerCase().includes(query)
      )
    })

    setFilteredQuestions(filtered)
  }, [searchQuery, questions])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleClearSearch = () => {
    setSearchQuery('')
  }

  const currentQuestion = filteredQuestions[currentQuestionIndex]
  const currentProgress = currentQuestion
    ? progress.questionProgress[currentQuestion.id]
    : null

  const isAnswered = currentProgress?.status !== 'unanswered'

  // Get shuffled answer options for current question
  const getShuffledOptions = React.useCallback((question: Question) => {
    const shuffleIndices = progress.shuffledAnswers[question.id]
    if (!shuffleIndices) {
      return {
        options: question.answerOptions,
        correctIndex: question.correctAnswerIndex
      }
    }

    const options = shuffleIndices.map(i => question.answerOptions[i])
    const correctIndex = shuffleIndices.indexOf(question.correctAnswerIndex)

    return { options, correctIndex }
  }, [progress.shuffledAnswers])

  const shuffled = currentQuestion ? getShuffledOptions(currentQuestion) : null

  const handleAnswerClick = (displayIndex: number) => {
    if (!currentQuestion || !shuffled) return
    if (mode === 'review' || isAnswered) return

    const isCorrect = displayIndex === shuffled.correctIndex
    // Convert back to original index for storage
    const originalIndex = progress.shuffledAnswers[currentQuestion.id]?.[displayIndex] ?? displayIndex

    onAnswerSelect(currentQuestion.id, originalIndex, isCorrect)
  }

  const canGoPrev = currentQuestionIndex > 0
  const canGoNext = currentQuestionIndex < filteredQuestions.length - 1

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-200 pb-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {/* Sidebar Toggle - hidden on mobile */}
            {onToggleSidebar && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSidebar}
                className="hidden md:flex p-2"
                title={isSidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}
              >
                <PanelLeft className={`h-5 w-5 ${isSidebarCollapsed ? 'text-zinc-400' : 'text-zinc-700'}`} />
              </Button>
            )}
            <h2 className="text-xl font-bold md:text-2xl text-zinc-900">Tester</h2>
          </div>

          {/* Mode Toggle & Reset & Font Size & Notebook Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={mode === 'study' ? 'default' : 'outline'}
              size="sm"
              onClick={onModeToggle}
              className="gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Study
            </Button>
            <Button
              variant={mode === 'review' ? 'default' : 'outline'}
              size="sm"
              onClick={onModeToggle}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Review
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onResetProgress}
              className="gap-2"
              title="Restart with shuffled answers"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            {/* Font size controls */}
            <div className="flex items-center gap-1 border border-zinc-200 rounded-md px-1">
              <button
                onClick={() => changeFontSize(-FONT_SIZE_STEP)}
                disabled={fontSize <= FONT_SIZE_MIN}
                className="px-1.5 py-0.5 text-sm font-bold text-zinc-600 hover:text-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Decrease font size"
              >
                A-
              </button>
              <span className="text-xs text-zinc-400 select-none">{fontSize}</span>
              <button
                onClick={() => changeFontSize(FONT_SIZE_STEP)}
                disabled={fontSize >= FONT_SIZE_MAX}
                className="px-1.5 py-0.5 text-sm font-bold text-zinc-600 hover:text-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Increase font size"
              >
                A+
              </button>
            </div>
            {/* Notebook Toggle - hidden on mobile */}
            {onToggleNotebook && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleNotebook}
                className="hidden md:flex p-2"
                title={isNotebookCollapsed ? 'Show Notes' : 'Hide Notes'}
              >
                <PanelRight className={`h-5 w-5 ${isNotebookCollapsed ? 'text-zinc-400' : 'text-zinc-700'}`} />
              </Button>
            )}
            {/* Header collapse toggle - mobile only */}
            <button
              onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
              className="md:hidden p-1.5 rounded-md hover:bg-zinc-100 transition-colors flex-shrink-0"
              aria-label={isHeaderCollapsed ? "Expand controls" : "Collapse controls"}
            >
              {isHeaderCollapsed ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronUp className="w-4 h-4 text-zinc-500" />}
            </button>
          </div>
        </div>

        {/* Collapsible section - hidden on mobile when collapsed, always visible on desktop */}
        <div className={`md:block ${isHeaderCollapsed ? 'hidden' : 'block'}`}>
          {/* Question Indicators */}
          <div className="flex flex-wrap gap-1 mb-4 max-h-24 overflow-y-auto">
            {filteredQuestions.map((question, index) => {
              const qProgress = progress.questionProgress[question.id]
              const status = qProgress?.status || 'unanswered'
              const isActive = index === currentQuestionIndex

              // Determine button styles based on status and active state
              let buttonClasses = 'w-8 h-8 rounded text-xs font-medium'

              if (status === 'correct') {
                // Green - use darker shade when active
                if (isActive) {
                  buttonClasses += ' bg-green-600 text-white'
                } else {
                  buttonClasses += ' bg-green-500 text-white hover:bg-green-600'
                }
              } else if (status === 'incorrect') {
                // Red - use darker shade when active
                if (isActive) {
                  buttonClasses += ' bg-red-600 text-white'
                } else {
                  buttonClasses += ' bg-red-500 text-white hover:bg-red-600'
                }
              } else {
                // Unanswered - apply yellow for active
                if (isActive) {
                  buttonClasses += ' bg-amber-100 text-amber-900 border-2 border-amber-400'
                } else {
                  buttonClasses += ' bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }
              }

              return (
                <button
                  key={question.id}
                  onClick={() => onQuestionSelect(index)}
                  className={buttonClasses}
                >
                  {index + 1}
                </button>
              )
            })}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10 pr-20"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500 hover:text-zinc-700"
              >
                Clear
              </button>
            )}
          </div>

          {/* Question Counter */}
          <div className="mt-3 text-sm text-zinc-600">
            {filteredQuestions.length > 0 ? (
              <>
                Question {currentQuestionIndex + 1} of {filteredQuestions.length}
                {searchQuery && (
                  <span className="text-zinc-500 ml-2">
                    (filtered from {questions.length})
                  </span>
                )}
              </>
            ) : (
              <span className="text-zinc-500">No questions found</span>
            )}
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="flex-1 overflow-y-auto">
        {!currentQuestion ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-zinc-500 text-lg mb-2">
                {searchQuery ? 'No matching questions' : 'No questions available'}
              </p>
              {searchQuery && (
                <Button variant="outline" size="sm" onClick={handleClearSearch}>
                  Clear search
                </Button>
              )}
            </div>
          </div>
        ) : shuffled && (
          <div className="space-y-6">
            {/* Question Text */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 md:p-6">
              <p className="text-zinc-900 leading-relaxed" style={{ fontSize: `${fontSize}px` }}>
                {currentQuestion.questionText}
              </p>
            </div>

            {/* Answer Options */}
            <div className="space-y-3">
              {shuffled.options.map((option, index) => {
                const isCorrect = index === shuffled.correctIndex
                const isSelected = currentProgress?.selectedIndex !== undefined &&
                  progress.shuffledAnswers[currentQuestion.id]?.[index] === currentProgress.selectedIndex
                const showFeedback = mode === 'review' || isAnswered

                let buttonStyle = 'bg-white border-zinc-200 text-zinc-900 hover:bg-zinc-50'

                if (showFeedback) {
                  if (isCorrect) {
                    buttonStyle = 'bg-green-50 border-green-500 text-green-900'
                  } else if (isSelected) {
                    buttonStyle = 'bg-red-50 border-red-500 text-red-900'
                  } else {
                    buttonStyle = 'bg-white border-zinc-200 text-zinc-500'
                  }
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerClick(index)}
                    disabled={mode === 'review' || isAnswered}
                    className={`
                      w-full text-left p-3 md:p-4 rounded-lg border-2 transition-colors
                      ${buttonStyle}
                      ${mode === 'review' || isAnswered ? 'cursor-default' : 'cursor-pointer active:opacity-80'}
                    `}
                  >
                    <div className="flex items-center gap-3" style={{ fontSize: `${fontSize}px` }}>
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center font-semibold text-sm">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="flex-1">{option}</span>
                      {showFeedback && isCorrect && (
                        <span className="flex-shrink-0 flex items-center gap-1 text-green-600 font-medium text-sm">
                          <Check className="h-4 w-4" />
                          Correct
                        </span>
                      )}
                      {showFeedback && isSelected && !isCorrect && (
                        <span className="flex-shrink-0 flex items-center gap-1 text-red-600 font-medium text-sm">
                          <X className="h-4 w-4" />
                          Your Answer
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Mode-specific messages */}
            {mode === 'study' && !isAnswered && (
              <div className="text-sm text-zinc-500 text-center py-4">
                Select an answer to reveal the correct option
              </div>
            )}
            {mode === 'review' && (
              <div className="text-sm text-zinc-500 text-center py-4">
                Review Mode: Correct answer is highlighted in green
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="border-t border-zinc-200 pt-4 mt-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => onNavigate('prev')}
            disabled={!canGoPrev}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="text-sm text-zinc-600">
            {filteredQuestions.length > 0 && (
              <span>
                {currentQuestionIndex + 1} / {filteredQuestions.length}
              </span>
            )}
          </div>

          <Button
            variant="outline"
            onClick={() => onNavigate('next')}
            disabled={!canGoNext}
            className="gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
