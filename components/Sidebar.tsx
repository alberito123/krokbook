'use client'

import * as React from 'react'
import { Upload, AlertCircle, FolderOpen, Swords, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Folder } from '@/lib/types'

const LS_LIMIT_BYTES = 5 * 1024 * 1024 // 5 MB

function useLocalStorageSize() {
  const measure = () => {
    if (typeof window === 'undefined') return 0
    let total = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? ''
      const value = localStorage.getItem(key) ?? ''
      total += (key.length + value.length) * 2
    }
    return total
  }

  const [usedBytes, setUsedBytes] = React.useState(0)

  React.useEffect(() => {
    setUsedBytes(measure())
    const handler = () => setUsedBytes(measure())
    window.addEventListener('krokbook-storage-changed', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('krokbook-storage-changed', handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

  const percent = Math.min(100, (usedBytes / LS_LIMIT_BYTES) * 100)
  const usedMB = (usedBytes / (1024 * 1024)).toFixed(2)
  const status = percent > 80 ? 'danger' : percent > 55 ? 'warning' : 'ok'

  return { usedMB, percent, status }
}

export interface SidebarProps {
  folders: Folder[]
  selectedFolderId: string | null
  onFolderSelect: (folderId: string) => void
  onFolderDelete: (folderId: string) => void
  onUploadClick: () => void
  onErrorHubClick: () => void
  onBattleClick?: () => void
  activeRoute?: 'dashboard' | 'battle'
  isMobileOpen?: boolean
  onMobileClose?: () => void
  isDesktopCollapsed?: boolean
  isAdmin?: boolean
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
  onBattleClick,
  activeRoute = 'dashboard',
  isMobileOpen = false,
  onMobileClose,
  isDesktopCollapsed = false,
  isAdmin = false,
}: SidebarProps) {
  const [deletingFolderId, setDeletingFolderId] = React.useState<string | null>(null)
  const { usedMB, percent, status } = useLocalStorageSize()

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
      await onFolderDelete(folderId)
    } catch (err) {
      console.error('Failed to delete folder:', err)
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

  const handleBattleClickWithClose = () => {
    onBattleClick?.()
    onMobileClose?.()
  }

  const isBattleActive = activeRoute === 'battle'

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

          {onBattleClick && (
            <Button
              onClick={handleBattleClickWithClose}
              className="w-full justify-start"
              variant={isBattleActive ? 'default' : 'outline'}
            >
              <Swords className="h-4 w-4 mr-2" />
              Battle
            </Button>
          )}
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

                      {isAdmin && (
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
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 space-y-3">
          <p className="text-xs text-zinc-500 text-center">
            {folders.length} {folders.length === 1 ? 'folder' : 'folders'}
          </p>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-500">Local storage</span>
              <span className={
                status === 'danger' ? 'text-red-600 font-medium' :
                status === 'warning' ? 'text-amber-600 font-medium' :
                'text-zinc-500'
              }>
                {usedMB} / 5 MB
              </span>
            </div>
            <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  status === 'danger' ? 'bg-red-500' :
                  status === 'warning' ? 'bg-amber-400' :
                  'bg-green-500'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
            {status === 'danger' && (
              <p className="text-xs text-red-600 mt-1">
                Storage almost full — notes may not save
              </p>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
