'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RotateCcw, ChevronLeft, ChevronRight, FolderOpen, Eye, EyeOff, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { parseTiptapContent, shuffleArraySimple } from '@/lib/utils'
import type { Question, QuestionWithError, FolderProgress } from '@/lib/types'


/**
 * Error Hub Page
 * Shows all incorrect answers from all folders
 * Allows re-testing only the questions that were answered incorrectly
 */
export default function ErrorHubPage() {
  const router = useRouter()
  const store = useStore()

  const [errorQuestions, setErrorQuestions] = React.useState<QuestionWithError[]>([])
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null)
  const [testMode, setTestMode] = React.useState(false)
  const [testProgress, setTestProgress] = React.useState<Record<string, 'unanswered' | 'correct' | 'incorrect'>>({})
  const [shuffledAnswers, setShuffledAnswers] = React.useState<Record<string, number[]>>({})
  const [showNotes, setShowNotes] = React.useState(true)
  const [userSelections, setUserSelections] = React.useState<Record<string, number>>({})
  const [resolvedQuestionIds, setResolvedQuestionIds] = React.useState<Set<string>>(new Set())

  // Load all error questions
  React.useEffect(() => {
    const errors = store.getErrorQuestions()
    setErrorQuestions(errors)

    // Initialize shuffled answers
    const shuffled: Record<string, number[]> = {}
    for (const { question } of errors) {
      shuffled[question.id] = shuffleArraySimple(question.answerOptions.map((_, i) => i))
    }
    setShuffledAnswers(shuffled)
  }, [store])

  // Filter by folder
  const filteredErrors = React.useMemo(() => {
    if (!selectedFolderId) return errorQuestions
    return errorQuestions.filter(eq => eq.question.folderId === selectedFolderId)
  }, [errorQuestions, selectedFolderId])

  // Get unique folders from errors
  const errorFolders = React.useMemo(() => {
    const folderIds = new Set(errorQuestions.map(eq => eq.question.folderId))
    return store.folders.filter(f => folderIds.has(f.id))
  }, [errorQuestions, store.folders])

  const currentError = filteredErrors[currentIndex]

  const handleStartTest = () => {
    setTestMode(true)
    setCurrentIndex(0)
    setTestProgress({})
    setUserSelections({})
    setShowNotes(false) // Hide notes when starting practice

    // Re-shuffle answers
    const shuffled: Record<string, number[]> = {}
    for (const { question } of filteredErrors) {
      shuffled[question.id] = shuffleArraySimple(question.answerOptions.map((_, i) => i))
    }
    setShuffledAnswers(shuffled)
  }

  const handleAnswerSelect = (displayIndex: number) => {
    if (!currentError || testProgress[currentError.question.id]) return

    const question = currentError.question
    const shuffle = shuffledAnswers[question.id]
    const originalIndex = shuffle ? shuffle[displayIndex] : displayIndex
    const isCorrect = originalIndex === question.correctAnswerIndex

    // Track user's selection
    setUserSelections(prev => ({
      ...prev,
      [question.id]: displayIndex
    }))

    setTestProgress(prev => ({
      ...prev,
      [question.id]: isCorrect ? 'correct' : 'incorrect'
    }))

    // If answered correctly, resolve the error (mark as resolved, keep notes)
    // The question will be removed from UI only when user navigates away
    if (isCorrect) {
      store.resolveError(question.folderId, question.id)
      // Mark as resolved but don't remove from UI yet
      setResolvedQuestionIds(prev => new Set(prev).add(question.id))
    }
  }

  const handleNavigate = (direction: 'next' | 'prev') => {
    // Remove resolved questions from UI when navigating away
    const currentQuestionId = currentError?.question.id
    if (currentQuestionId && resolvedQuestionIds.has(currentQuestionId)) {
      setErrorQuestions(prev => prev.filter(eq => eq.question.id !== currentQuestionId))
      setResolvedQuestionIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(currentQuestionId)
        return newSet
      })
      // Adjust index if needed
      if (direction === 'next') {
        // Stay at same index (next question slides into current position)
        return
      } else if (direction === 'prev' && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1)
        return
      }
      return
    }

    if (direction === 'next' && currentIndex < filteredErrors.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else if (direction === 'prev' && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }

  const getShuffledOptions = (question: Question) => {
    const shuffle = shuffledAnswers[question.id]
    if (!shuffle) {
      return { options: question.answerOptions, correctIndex: question.correctAnswerIndex }
    }
    return {
      options: shuffle.map(i => question.answerOptions[i]),
      correctIndex: shuffle.indexOf(question.correctAnswerIndex)
    }
  }

  // Calculate stats
  const stats = React.useMemo(() => {
    const total = filteredErrors.length
    const answered = Object.keys(testProgress).length
    const correct = Object.values(testProgress).filter(s => s === 'correct').length
    return { total, answered, correct }
  }, [filteredErrors.length, testProgress])

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-zinc-900">Error Hub</h1>
            <p className="text-zinc-500 text-sm">
              {errorQuestions.length} questions with errors
            </p>
          </div>

          {filteredErrors.length > 0 && (
            <Button onClick={handleStartTest}>
              <RotateCcw className="h-4 w-4 mr-2" />
              {testMode ? 'Restart Test' : 'Practice Errors'}
            </Button>
          )}
        </div>

        {/* Folder Filter */}
        {errorFolders.length > 1 && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <span className="text-sm text-zinc-600">Filter:</span>
            <Button
              variant={selectedFolderId === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFolderId(null)}
            >
              All
            </Button>
            {errorFolders.map(folder => (
              <Button
                key={folder.id}
                variant={selectedFolderId === folder.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFolderId(folder.id)}
              >
                <FolderOpen className="h-3 w-3 mr-1" />
                {folder.name}
              </Button>
            ))}
          </div>
        )}

        {/* Question Indicators */}
        {testMode && filteredErrors.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-6 max-h-24 overflow-y-auto">
            {filteredErrors.map((eq, index) => {
              const status = testProgress[eq.question.id] || 'unanswered'
              const isActive = index === currentIndex

              // Match Tester component styles
              let buttonClasses = 'w-8 h-8 rounded text-xs font-medium transition-all'

              if (status === 'correct') {
                if (isActive) {
                  buttonClasses += ' bg-green-600 text-white'
                } else {
                  buttonClasses += ' bg-green-500 text-white hover:bg-green-600'
                }
              } else if (status === 'incorrect') {
                if (isActive) {
                  buttonClasses += ' bg-red-600 text-white'
                } else {
                  buttonClasses += ' bg-red-500 text-white hover:bg-red-600'
                }
              } else {
                // Unanswered - amber for active
                if (isActive) {
                  buttonClasses += ' bg-amber-100 text-amber-900 border-2 border-amber-400'
                } else {
                  buttonClasses += ' bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }
              }

              return (
                <button
                  key={eq.question.id}
                  onClick={() => {
                    // Remove resolved question when clicking away
                    const currentQuestionId = currentError?.question.id
                    if (currentQuestionId && resolvedQuestionIds.has(currentQuestionId)) {
                      setErrorQuestions(prev => prev.filter(eq => eq.question.id !== currentQuestionId))
                      setResolvedQuestionIds(prev => {
                        const newSet = new Set(prev)
                        newSet.delete(currentQuestionId)
                        return newSet
                      })
                      // Adjust target index if current question was before target
                      const currentIdx = filteredErrors.findIndex(e => e.question.id === currentQuestionId)
                      if (currentIdx < index) {
                        setCurrentIndex(index - 1)
                      } else {
                        setCurrentIndex(index)
                      }
                    } else {
                      setCurrentIndex(index)
                    }
                  }}
                  className={buttonClasses}
                >
                  {index + 1}
                </button>
              )
            })}
          </div>
        )}

        {/* Stats */}
        {testMode && stats.answered > 0 && (
          <div className="mb-6 p-4 bg-zinc-50 rounded-lg">
            <div className="flex justify-around text-center">
              <div>
                <div className="text-2xl font-bold text-zinc-900">{stats.answered}</div>
                <div className="text-xs text-zinc-500">Answered</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.correct}</div>
                <div className="text-xs text-zinc-500">Correct</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.answered - stats.correct}</div>
                <div className="text-xs text-zinc-500">Incorrect</div>
              </div>
            </div>
          </div>
        )}

        {/* No Errors State */}
        {filteredErrors.length === 0 && (
          <div className="text-center py-16">
            <div className="text-zinc-400 text-6xl mb-4">🎉</div>
            <h2 className="text-xl font-semibold text-zinc-900 mb-2">
              {errorQuestions.length === 0 ? 'No errors yet!' : 'No errors in this folder'}
            </h2>
            <p className="text-zinc-500">
              {errorQuestions.length === 0
                ? 'Start answering questions to see errors here'
                : 'Select a different folder to see errors'
              }
            </p>
          </div>
        )}

        {/* Current Question */}
        {currentError && (
          <div className="space-y-6">
            {/* Question Text */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-6">
              <div className="text-sm text-zinc-500 mb-2">
                Question {currentIndex + 1} of {filteredErrors.length}
              </div>
              <p className="text-lg text-zinc-900 leading-relaxed">
                {currentError.question.questionText}
              </p>
            </div>

            {/* Answer Options */}
            {(() => {
              const shuffled = getShuffledOptions(currentError.question)
              const status = testProgress[currentError.question.id]
              const isAnswered = !!status

              return (
                <div className="space-y-3">
                  {shuffled.options.map((option, index) => {
                    const isCorrect = index === shuffled.correctIndex
                    const originalIndex = shuffledAnswers[currentError.question.id]?.[index] ?? index
                    const wasSelected = originalIndex === currentError.error.userSelectedIndex
                    const showFeedback = isAnswered || !testMode

                    const userSelectedThisOption = userSelections[currentError.question.id] === index
                    let buttonStyle = 'bg-white border-zinc-200 text-zinc-900 hover:bg-zinc-50'

                    if (showFeedback) {
                      if (isCorrect) {
                        buttonStyle = 'bg-green-50 border-green-500 text-green-900'
                      } else if (userSelectedThisOption && status === 'incorrect') {
                        // User selected this wrong answer in current test
                        buttonStyle = 'bg-red-50 border-red-500 text-red-900'
                      } else {
                        buttonStyle = 'bg-white border-zinc-200 text-zinc-500'
                      }
                    }

                    return (
                      <button
                        key={index}
                        onClick={() => testMode && handleAnswerSelect(index)}
                        disabled={!testMode || isAnswered}
                        className={`
                          w-full text-left p-4 rounded-lg border-2 transition-all
                          ${buttonStyle}
                          ${!testMode || isAnswered ? 'cursor-default' : 'cursor-pointer'}
                        `}
                      >
                        <div className="flex items-center gap-3">
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
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })()}

            {/* Error Notes with toggle */}
            {currentError.error.notes && (
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotes(!showNotes)}
                  className="gap-2"
                >
                  {showNotes ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showNotes ? 'Hide Notes' : 'Show Notes'}
                </Button>

                {showNotes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="font-semibold text-amber-900 mb-2">Your Notes:</h4>
                    <div className="text-amber-800 whitespace-pre-wrap">
                      {parseTiptapContent(currentError.error.notes)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-200">
              <Button
                variant="outline"
                onClick={() => handleNavigate('prev')}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <span className="text-sm text-zinc-500">
                {currentIndex + 1} / {filteredErrors.length}
              </span>

              <Button
                variant="outline"
                onClick={() => handleNavigate('next')}
                disabled={currentIndex === filteredErrors.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
