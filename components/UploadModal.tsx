'use client'

import * as React from 'react'
import { X, Upload, FileText, File, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { processFiles, parseDocxTableHtml, isHtmlContent } from '@/lib/fileProcessor'
import { parseRawText } from '@/lib/parser'
import { useStore } from '@/lib/store'
import type { Folder, ParsedQuestion } from '@/lib/types'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  folders: Folder[]
  onUploadComplete: (folderId?: string) => void
}

/**
 * UploadModal Component
 * 
 * Modal for uploading tests via:
 * - Drag & drop file upload (.txt, .docx)
 * - Text area for manual input
 * - Creates new folder with questions
 */
export function UploadModal({
  isOpen,
  onClose,
  folders,
  onUploadComplete,
}: UploadModalProps) {
  const store = useStore()

  const [folderName, setFolderName] = React.useState('')
  const [textContent, setTextContent] = React.useState('')
  const [files, setFiles] = React.useState<File[]>([])
  const [isDragOver, setIsDragOver] = React.useState(false)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [parsedQuestions, setParsedQuestions] = React.useState<ParsedQuestion[]>([])
  const [activeTab, setActiveTab] = React.useState<'file' | 'text'>('file')
  const [folderMode, setFolderMode] = React.useState<'new' | 'existing'>('new')
  const [selectedFolderId, setSelectedFolderId] = React.useState<string>('')

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setFolderName('')
      setTextContent('')
      setFiles([])
      setError(null)
      setParsedQuestions([])
      setActiveTab('file')
      setFolderMode('new')
      setSelectedFolderId('')
    }
  }, [isOpen])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const droppedFiles = Array.from(e.dataTransfer.files).filter(file =>
      file.name.endsWith('.txt') || file.name.endsWith('.docx')
    )

    if (droppedFiles.length === 0) {
      setError('Please drop .txt or .docx files only')
      return
    }

    setFiles(prev => [...prev, ...droppedFiles])
    setError(null)

    // Auto-set folder name from first file
    if (!folderName && droppedFiles.length > 0) {
      const name = droppedFiles[0].name.replace(/\.(txt|docx)$/i, '')
      setFolderName(name)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return

    const selectedFiles = Array.from(e.target.files).filter(file =>
      file.name.endsWith('.txt') || file.name.endsWith('.docx')
    )

    setFiles(prev => [...prev, ...selectedFiles])
    setError(null)

    if (!folderName && selectedFiles.length > 0) {
      const name = selectedFiles[0].name.replace(/\.(txt|docx)$/i, '')
      setFolderName(name)
    }
  }

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handlePreview = async () => {
    setError(null)
    setIsProcessing(true)

    try {
      let allQuestions: ParsedQuestion[] = []

      if (activeTab === 'file' && files.length > 0) {
        const results = await processFiles(files)
        const failedFiles = results.filter(r => !r.success)

        if (failedFiles.length > 0) {
          setError(`Failed to process: ${failedFiles.map(f => f.fileName).join(', ')}`)
        }

        // Parse each file based on its content type
        for (const result of results) {
          if (!result.success) continue

          let questions: ParsedQuestion[]

          // Check if it's HTML (docx with tables)
          if (isHtmlContent(result.textContent)) {
            questions = parseDocxTableHtml(result.textContent, result.fileName)
          } else {
            console.log('[UploadModal] Parsing raw text, first 500 chars:', result.textContent.substring(0, 500))
            questions = parseRawText(result.textContent, result.fileName)
            console.log('[UploadModal] Parsed questions:', questions.length, 'valid:', questions.filter(q => q.isValid).length)
            if (questions.length > 0) {
              console.log('[UploadModal] First question:', questions[0])
            }
          }

          allQuestions.push(...questions)
        }
      } else if (activeTab === 'text') {
        if (!textContent.trim()) {
          setError('No content to parse')
          setIsProcessing(false)
          return
        }
        allQuestions = parseRawText(textContent)
      }

      if (allQuestions.length === 0) {
        setError('No questions found. Check file format.')
        setIsProcessing(false)
        return
      }

      setParsedQuestions(allQuestions)

      const invalidCount = allQuestions.filter(q => !q.isValid).length
      if (invalidCount > 0) {
        setError(`${invalidCount} questions have validation errors`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process files')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUpload = async () => {
    const validQuestions = parsedQuestions.filter(q => q.isValid)
    if (validQuestions.length === 0) {
      setError('No valid questions to upload')
      return
    }

    if (folderMode === 'new' && !folderName.trim()) {
      setError('Please enter a folder name')
      return
    }

    if (folderMode === 'existing' && !selectedFolderId) {
      setError('Please select a folder')
      return
    }

    setIsProcessing(true)

    try {
      let targetFolderId: string

      if (folderMode === 'new') {
        // Create new folder in Supabase
        const newFolder = await store.addFolder(folderName.trim())
        targetFolderId = newFolder.id
      } else {
        // Use existing folder
        targetFolderId = selectedFolderId
      }

      // Add questions to Supabase
      await store.addQuestions(targetFolderId, validQuestions)

      onUploadComplete(targetFolderId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload questions')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900">Upload Tests</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-100"
          >
            <X className="h-5 w-5 text-zinc-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Folder Mode Selection */}
          <div className="flex gap-2">
            <Button
              variant={folderMode === 'new' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFolderMode('new')}
            >
              New Folder
            </Button>
            <Button
              variant={folderMode === 'existing' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFolderMode('existing')}
              disabled={folders.length === 0}
            >
              Add to Existing
            </Button>
          </div>

          {/* Folder Name (for new folder) */}
          {folderMode === 'new' && (
            <div>
              <Label htmlFor="folderName">Folder Name</Label>
              <Input
                id="folderName"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Enter folder name..."
                className="mt-1"
              />
            </div>
          )}

          {/* Folder Select (for existing folder) */}
          {folderMode === 'existing' && (
            <div>
              <Label htmlFor="existingFolder">Select Folder</Label>
              <select
                id="existingFolder"
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-md border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
              >
                <option value="">Select a folder...</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tab Buttons */}
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'file' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('file')}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
            <Button
              variant={activeTab === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('text')}
            >
              <FileText className="h-4 w-4 mr-2" />
              Paste Text
            </Button>
          </div>

          {/* File Upload */}
          {activeTab === 'file' && (
            <div>
              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors
                  ${isDragOver
                    ? 'border-zinc-900 bg-zinc-50'
                    : 'border-zinc-300 hover:border-zinc-400'
                  }
                `}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-zinc-400" />
                <p className="text-sm text-zinc-600">
                  Drag & drop files here, or click to browse
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Supports .txt and .docx files
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.docx"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* File List */}
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-zinc-50 rounded"
                    >
                      <File className="h-4 w-4 text-zinc-500" />
                      <span className="flex-1 text-sm truncate">{file.name}</span>
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="p-1 hover:bg-zinc-200 rounded"
                      >
                        <X className="h-4 w-4 text-zinc-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Text Input */}
          {activeTab === 'text' && (
            <div>
              <Label htmlFor="textContent">Paste questions here</Label>
              <Textarea
                id="textContent"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder={`Example format:

What is the capital of Ukraine?
A) Kyiv
B) Lviv
C) Odesa
D) Kharkiv
ANSWER: A

Next question?
...`}
                className="mt-1 min-h-[200px] font-mono text-sm"
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Preview */}
          {parsedQuestions.length > 0 && (
            <div className="space-y-4">
              {/* Valid questions summary */}
              <div className="border border-zinc-200 rounded p-4">
                <h3 className="font-medium text-zinc-900 mb-2">
                  ✓ {parsedQuestions.filter(q => q.isValid).length} valid questions
                </h3>
                <div className="max-h-32 overflow-y-auto space-y-2 text-sm">
                  {parsedQuestions.filter(q => q.isValid).slice(0, 3).map((q, i) => (
                    <div key={i} className="p-2 rounded bg-green-50">
                      <p className="font-medium truncate">{q.questionText}</p>
                      <p className="text-xs text-zinc-500">{q.answerOptions.length} options</p>
                    </div>
                  ))}
                  {parsedQuestions.filter(q => q.isValid).length > 3 && (
                    <p className="text-zinc-500 text-center">
                      ...and {parsedQuestions.filter(q => q.isValid).length - 3} more valid
                    </p>
                  )}
                </div>
              </div>

              {/* Invalid questions with errors */}
              {parsedQuestions.filter(q => !q.isValid).length > 0 && (
                <div className="border border-red-200 rounded p-4 bg-red-50/50">
                  <h3 className="font-medium text-red-800 mb-2">
                    ✗ {parsedQuestions.filter(q => !q.isValid).length} questions with errors
                  </h3>
                  <div className="max-h-48 overflow-y-auto space-y-3 text-sm">
                    {parsedQuestions.filter(q => !q.isValid).map((q, i) => (
                      <div key={i} className="p-3 rounded bg-red-100 border border-red-200">
                        <p className="font-medium text-red-900 mb-1">
                          {q.questionText || '(Empty question text)'}
                        </p>
                        <div className="text-xs text-red-700 space-y-1">
                          <p><strong>Errors:</strong> {q.validationErrors.join(', ')}</p>
                          <p><strong>Options found:</strong> {q.answerOptions.length}</p>
                          {q.answerOptions.length > 0 && (
                            <details className="mt-1">
                              <summary className="cursor-pointer hover:text-red-900">Show options</summary>
                              <ul className="mt-1 ml-4 list-disc">
                                {q.answerOptions.map((opt, j) => (
                                  <li key={j} className="truncate">{opt}</li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-zinc-200">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>

          {parsedQuestions.length === 0 ? (
            <Button
              onClick={handlePreview}
              disabled={isProcessing || (activeTab === 'file' && files.length === 0) || (activeTab === 'text' && !textContent.trim())}
            >
              {isProcessing ? 'Processing...' : 'Preview'}
            </Button>
          ) : (
            <Button
              onClick={handleUpload}
              disabled={isProcessing || parsedQuestions.filter(q => q.isValid).length === 0}
            >
              {isProcessing ? 'Uploading...' : folderMode === 'new'
                ? `Create Folder (${parsedQuestions.filter(q => q.isValid).length} questions)`
                : `Add ${parsedQuestions.filter(q => q.isValid).length} questions`
              }
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
