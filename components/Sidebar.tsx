'use client'

import * as React from 'react'
import { Upload, AlertCircle, FolderOpen, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Folder } from '@/lib/types'

export interface SidebarProps {
  folders: Folder[]
  selectedFolderId: string | null
  onFolderSelect: (folderId: string) => void
  onFolderDelete: (folderId: string) => void
  onUploadClick: () => void
  onErrorHubClick: () => void
  isMobileOpen?: boolean
  onMobileClose?: () => void
  isDesktopCollapsed?: boolean
}

/**
 * Sidebar Component
 * 
 * Navigation sidebar for the KrokBook application.
 * Supports responsive mobile drawer mode.
 * 
 * Features:
 * - Display list of folders from localStorage
 * - Delete folders with confirmation
 * - "Upload Database" button to open upload modal
 * - "Error Hub" navigation link
 * - Mobile drawer with overlay backdrop
 */
export function Sidebar({
  folders,
  selectedFolderId,
  onFolderSelect,
  onFolderDelete,
  onUploadClick,
  onErrorHubClick,
  isMobileOpen = false,
  onMobileClose,
  isDesktopCollapsed = false,
}: SidebarProps) {
  const [deletingFolderId, setDeletingFolderId] = React.useState<string | null>(null)

  const handleDeleteClick = async (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation()

    const folder = folders.find(f => f.id === folderId)
    if (!folder) return

    const confirmed = window.confirm(
      `Are you sure you want to delete "${folder.name}"?\n\nThis will permanently delete all questions and notes in this folder.`
    )

    if (!confirmed) return

    setDeletingFolderId(folderId)
    try {
      onFolderDelete(folderId)
    } finally {
      setDeletingFolderId(null)
    }
  }

  const handleFolderClick = (folderId: string) => {
    onFolderSelect(folderId)
    // Close mobile sidebar when folder is selected
    onMobileClose?.()
  }

  const handleUploadClickWithClose = () => {
    onUploadClick()
    onMobileClose?.()
  }

  const handleErrorHubClickWithClose = () => {
    onErrorHubClick()
    onMobileClose?.()
  }

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 animate-fade-in"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`
          w-64 bg-white border-r border-zinc-200 flex flex-col h-[100dvh] overflow-hidden
          ${isDesktopCollapsed ? 'hidden' : 'hidden md:flex'} md:relative
          ${isMobileOpen ? '!fixed inset-y-0 left-0 z-50 !flex animate-slide-in-left' : ''}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">KrokBook</h1>
            <p className="text-xs text-zinc-500 mt-1">Medical Exam Prep</p>
          </div>
          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onMobileClose}
            className="md:hidden p-2 -mr-2"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="p-4 space-y-2 border-b border-zinc-200">
          <Button
            onClick={handleUploadClickWithClose}
            className="w-full justify-start"
            variant="outline"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Tests
          </Button>

          <Button
            onClick={handleErrorHubClickWithClose}
            className="w-full justify-start"
            variant="outline"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Error Hub
          </Button>
        </div>

        {/* Folders List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-700">Folders</h2>
            </div>

            {folders.length === 0 ? (
              <div className="text-sm text-zinc-500 text-center py-8">
                <FolderOpen className="h-8 w-8 mx-auto mb-2 text-zinc-400" />
                <p>No folders yet</p>
                <p className="text-xs mt-1">Upload tests to create a folder</p>
              </div>
            ) : (
              <div className="space-y-1">
                {folders.map((folder) => {
                  const isSelected = folder.id === selectedFolderId
                  const isDeleting = deletingFolderId === folder.id

                  return (
                    <div
                      key={folder.id}
                      className={`
                        group relative w-full text-left px-3 py-2 rounded-md text-sm
                        transition-colors duration-150
                        ${isSelected
                          ? 'bg-zinc-900 text-white font-medium'
                          : 'text-zinc-700 hover:bg-zinc-100'
                        }
                      `}
                    >
                      <button
                        onClick={() => handleFolderClick(folder.id)}
                        disabled={isDeleting}
                        className="w-full text-left flex items-center gap-2"
                      >
                        <FolderOpen className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate flex-1">{folder.name}</span>
                      </button>

                      <button
                        onClick={(e) => handleDeleteClick(e, folder.id)}
                        disabled={isDeleting}
                        className={`
                          absolute right-2 top-1/2 -translate-y-1/2
                          p-1 rounded opacity-0 group-hover:opacity-100
                          transition-opacity duration-150
                          ${isSelected
                            ? 'hover:bg-zinc-800 text-white'
                            : 'hover:bg-zinc-200 text-zinc-600'
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                        title="Delete folder"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200">
          <p className="text-xs text-zinc-500 text-center">
            {folders.length} {folders.length === 1 ? 'folder' : 'folders'}
          </p>
        </div>
      </aside>
    </>
  )
}
