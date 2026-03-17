/**
 * Component-specific type definitions
 */

import type { Question, UserError, FolderProgress, TestMode, NotebookTab, QuestionWithError, Folder } from '../types'

// ============ Notebook Types ============

export interface NotebookProps {
  folderId: string
  errorQuestions?: QuestionWithError[]
  activeTab?: NotebookTab
  onErrorNotesUpdate?: (errorId: string, notes: string) => void
}

export interface NoteCardProps {
  note: {
    id: string
    text: string
    createdAt: string
    updatedAt: string
  }
  blurred: boolean
  onUpdate: (noteId: string, text: string) => void
  onDelete: (noteId: string) => void
}

export interface ErrorQuestionCardProps {
  question: Pick<Question, 'id' | 'questionText' | 'answerOptions' | 'correctAnswerIndex'>
  error: Pick<UserError, 'id' | 'userSelectedIndex' | 'notes' | 'createdAt'>
  blurred: boolean
  onNotesUpdate?: (errorId: string, notes: string) => void
}

// ============ Tester Types ============

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
  isSidebarCollapsed?: boolean
  isNotebookCollapsed?: boolean
  onToggleSidebar?: () => void
  onToggleNotebook?: () => void
}

// ============ Sidebar Types ============

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

// ============ Upload Modal Types ============

export interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  folders: Folder[]
  onUploadComplete: (folderId?: string) => void
}

// ============ Mobile Types ============

export type MobileTab = 'tester' | 'notebook'

export interface MobileHeaderProps {
  folderName?: string
  onMenuClick: () => void
  isSidebarOpen: boolean
}

export interface MobileTabBarProps {
  activeTab: MobileTab
  onTabChange: (tab: MobileTab) => void
  errorCount?: number
}

// ============ TiptapEditor Types ============

export interface TiptapEditorProps {
  content: string
  onUpdate: (content: string) => void
  placeholder?: string
  editable?: boolean
}
