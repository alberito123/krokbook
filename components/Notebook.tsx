'use client'

import * as React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Eye, EyeOff, Send, Check, X, Pencil, Trash2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { TiptapEditor } from '@/components/TiptapEditor'
import type { NotebookTab, QuestionWithError, FolderNote } from '@/lib/types'

interface NotebookProps {
  folderId: string
  errorQuestions?: QuestionWithError[]
  activeTab?: NotebookTab
  onErrorNotesUpdate?: (errorId: string, notes: string) => void
}

/**
 * Notebook Component
 * 
 * Right panel component with:
 * - Notes tab with message-style notes
 * - Error Work tab with incorrect answers and notes
 * - Blur/hide notes option during testing
 */
export function Notebook({
  folderId,
  errorQuestions = [],
  activeTab = 'notes',
  onErrorNotesUpdate,
}: NotebookProps) {
  const store = useStore()
  const [currentTab, setCurrentTab] = React.useState<NotebookTab>(activeTab)
  const [blurNotes, setBlurNotes] = React.useState(false)
  const [folderNotes, setFolderNotes] = React.useState<FolderNote[]>([])
  const [newNoteText, setNewNoteText] = React.useState('')

  // Load folder notes when folderId changes
  React.useEffect(() => {
    const notes = store.getFolderNotes(folderId)
    setFolderNotes(notes)
    setNewNoteText('')
  }, [folderId, store])

  const handleTabChange = React.useCallback((value: string) => {
    setCurrentTab(value as NotebookTab)
  }, [])

  const handleAddNote = React.useCallback(() => {
    if (!newNoteText.trim()) return
    const newNote = store.addFolderNote(folderId, newNoteText.trim())
    setFolderNotes(prev => [newNote, ...prev])
    setNewNoteText('')
  }, [folderId, newNoteText, store])

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddNote()
    }
  }, [handleAddNote])

  const handleUpdateNote = React.useCallback((noteId: string, text: string) => {
    store.updateFolderNote(folderId, noteId, text)
    setFolderNotes(prev => prev.map(note =>
      note.id === noteId
        ? { ...note, text, updatedAt: new Date().toISOString() }
        : note
    ))
  }, [folderId, store])

  const handleDeleteNote = React.useCallback((noteId: string) => {
    store.deleteFolderNote(folderId, noteId)
    setFolderNotes(prev => prev.filter(note => note.id !== noteId))
  }, [folderId, store])

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-zinc-900">Notebook</h2>

        <div className="flex items-center gap-4">
          {/* Blur toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBlurNotes(!blurNotes)}
            className="gap-2"
          >
            {blurNotes ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {blurNotes ? 'Show Notes' : 'Hide Notes'}
          </Button>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start border-b border-zinc-200 rounded-none bg-transparent p-0">
          <TabsTrigger
            value="notes"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent"
          >
            Notes
            {folderNotes.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-zinc-100 text-zinc-700 rounded-full">
                {folderNotes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="errors"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent"
          >
            Error Work
            {errorQuestions.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                {errorQuestions.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="flex-1 mt-4 overflow-hidden data-[state=active]:flex flex-col data-[state=inactive]:hidden">
          <div className={blurNotes ? 'blur-sm select-none h-full flex flex-col' : 'h-full flex flex-col'}>
            {/* Input area with embedded send button */}
            <div className="relative mb-4">
              <Textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Напишіть нотатку..."
                disabled={blurNotes}
                className="min-h-[80px] pr-12 resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
                onClick={handleAddNote}
                disabled={!newNoteText.trim() || blurNotes}
                size="sm"
                className="absolute bottom-2 right-2 h-8 w-8 p-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* Notes list */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {folderNotes.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <p className="text-lg mb-2">Немає нотаток</p>
                  <p className="text-sm">
                    Напишіть нотатку вище і натисніть Enter або кнопку відправки.
                  </p>
                </div>
              ) : (
                folderNotes.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    blurred={blurNotes}
                    onUpdate={handleUpdateNote}
                    onDelete={handleDeleteNote}
                  />
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="errors" className="flex-1 mt-4 overflow-hidden data-[state=active]:flex flex-col data-[state=inactive]:hidden">
          <div className="h-full overflow-y-auto">
            {errorQuestions.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <p className="text-lg mb-2">No errors yet</p>
                <p className="text-sm">
                  Questions you answer incorrectly in Study Mode will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {errorQuestions.map(({ question, error }) => (
                  <ErrorQuestionCard
                    key={error.id}
                    question={question}
                    error={error}
                    blurred={blurNotes}
                    onNotesUpdate={onErrorNotesUpdate}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * NoteCard Component
 * Displays a single note with edit and delete functionality
 */
interface NoteCardProps {
  note: FolderNote
  blurred: boolean
  onUpdate: (noteId: string, text: string) => void
  onDelete: (noteId: string) => void
}

function NoteCard({ note, blurred, onUpdate, onDelete }: NoteCardProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editText, setEditText] = React.useState(note.text)

  const handleSave = React.useCallback(() => {
    if (editText.trim()) {
      onUpdate(note.id, editText.trim())
    }
    setIsEditing(false)
  }, [editText, note.id, onUpdate])

  const handleCancel = React.useCallback(() => {
    setEditText(note.text)
    setIsEditing(false)
  }, [note.text])

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      handleCancel()
    }
  }, [handleSave, handleCancel])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="border border-zinc-200 rounded-lg p-3 bg-white shadow-sm">
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full min-h-[60px] p-2 border border-zinc-300 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-zinc-400 text-sm"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="h-4 w-4 mr-1" />
              Скасувати
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!editText.trim()}>
              <Check className="h-4 w-4 mr-1" />
              Зберегти
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-start gap-2">
            <p className="text-zinc-800 whitespace-pre-wrap flex-1 text-sm">{note.text}</p>
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                disabled={blurred}
                className="h-7 w-7 p-0"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(note.id)}
                disabled={blurred}
                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="mt-2 text-xs text-zinc-400">
            {formatDate(note.createdAt)}
            {note.updatedAt !== note.createdAt && (
              <span className="ml-2">(ред. {formatDate(note.updatedAt)})</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * ErrorQuestionCard Component
 * Shows incorrect answer with ability to add notes
 */
interface ErrorQuestionCardProps {
  question: { id: string; questionText: string; answerOptions: string[]; correctAnswerIndex: number }
  error: { id: string; userSelectedIndex: number; notes: string; createdAt: string }
  blurred: boolean
  onNotesUpdate?: (errorId: string, notes: string) => void
}

function ErrorQuestionCard({ question, error, blurred, onNotesUpdate }: ErrorQuestionCardProps) {
  const [notes, setNotes] = React.useState(error.notes || '')
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const pendingNotesRef = React.useRef<string | null>(null)
  const onNotesUpdateRef = React.useRef(onNotesUpdate)
  const errorIdRef = React.useRef(error.id)

  // Keep refs in sync
  onNotesUpdateRef.current = onNotesUpdate
  errorIdRef.current = error.id

  React.useEffect(() => {
    setNotes(error.notes || '')
  }, [error.notes])

  const handleNotesUpdate = React.useCallback((newNotes: string) => {
    setNotes(newNotes)
    pendingNotesRef.current = newNotes

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (onNotesUpdateRef.current) {
        onNotesUpdateRef.current(errorIdRef.current, newNotes)
      }
      pendingNotesRef.current = null
    }, 2000)
  }, [])

  React.useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      // Flush pending save on unmount
      if (pendingNotesRef.current !== null && onNotesUpdateRef.current) {
        onNotesUpdateRef.current(errorIdRef.current, pendingNotesRef.current)
      }
    }
  }, [])

  return (
    <div className="border border-zinc-200 rounded-lg p-4 bg-white">
      {/* Question Text */}
      <div className="mb-4">
        <h3 className="font-semibold text-zinc-900 mb-2">Question:</h3>
        <p className="text-zinc-700">{question.questionText}</p>
      </div>

      {/* Answer Options */}
      <div className="mb-4 space-y-2">
        {question.answerOptions.map((option, index) => {
          const isCorrect = index === question.correctAnswerIndex
          const isUserAnswer = index === error.userSelectedIndex

          let className = 'p-3 rounded border '
          if (isCorrect) {
            className += 'bg-green-50 border-green-300 text-green-900'
          } else if (isUserAnswer) {
            className += 'bg-red-50 border-red-300 text-red-900'
          } else {
            className += 'bg-zinc-50 border-zinc-200 text-zinc-700'
          }

          return (
            <div key={index} className={className}>
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/50 flex items-center justify-center font-semibold text-sm">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="flex-1">{option}</span>
                {isCorrect && (
                  <span className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-green-700">
                    <Check className="h-3.5 w-3.5" />
                    Correct
                  </span>
                )}
                {isUserAnswer && !isCorrect && (
                  <span className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-red-700">
                    <X className="h-3.5 w-3.5" />
                    Your Answer
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Notes Editor */}
      <div className={`mt-4 ${blurred ? 'blur-sm select-none' : ''}`}>
        <h4 className="font-semibold text-zinc-900 mb-2">Your Notes:</h4>
        <TiptapEditor
          content={notes}
          onUpdate={handleNotesUpdate}
          placeholder="Add notes about why you got this wrong..."
          editable={!blurred}
        />
      </div>

      {/* Timestamp */}
      <div className="mt-3 text-xs text-zinc-500">
        Error recorded: {new Date(error.createdAt).toLocaleString()}
      </div>
    </div>
  )
}
