'use client'

import * as React from 'react'
import { Menu, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MobileHeaderProps {
    folderName?: string
    onMenuClick: () => void
    isSidebarOpen: boolean
    isHeaderCollapsed?: boolean
    onToggleHeader?: () => void
}

/**
 * MobileHeader Component
 * 
 * Header with hamburger menu for mobile devices.
 * Shows only on screens smaller than md breakpoint.
 */
export function MobileHeader({
    folderName,
    onMenuClick,
    isSidebarOpen,
    isHeaderCollapsed,
    onToggleHeader,
}: MobileHeaderProps) {
    return (
        <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-zinc-200">
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onMenuClick}
                        className="p-2 -ml-2"
                        aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
                    >
                        {isSidebarOpen ? (
                            <X className="h-5 w-5" />
                        ) : (
                            <Menu className="h-5 w-5" />
                        )}
                    </Button>
                    <div>
                        <h1 className="text-lg font-bold text-zinc-900">KrokBook</h1>
                        {folderName && (
                            <p className="text-xs text-zinc-500 truncate max-w-[200px]">
                                {folderName}
                            </p>
                        )}
                    </div>
                </div>
                {onToggleHeader && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggleHeader}
                        className="p-2 -mr-2"
                        aria-label={isHeaderCollapsed ? 'Show controls' : 'Hide controls'}
                    >
                        {isHeaderCollapsed ? (
                            <ChevronDown className="h-5 w-5 text-zinc-500" />
                        ) : (
                            <ChevronUp className="h-5 w-5 text-zinc-500" />
                        )}
                    </Button>
                )}
            </div>
        </header>
    )
}
