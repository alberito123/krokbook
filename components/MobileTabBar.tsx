'use client'

import * as React from 'react'
import { BookOpen, ClipboardList } from 'lucide-react'

export type MobileTab = 'tester' | 'notebook'

interface MobileTabBarProps {
    activeTab: MobileTab
    onTabChange: (tab: MobileTab) => void
    errorCount?: number
}

/**
 * MobileTabBar Component
 * 
 * Bottom tab bar for mobile devices to switch between
 * Tester (questions) and Notebook (notes/errors) views.
 */
export function MobileTabBar({
    activeTab,
    onTabChange,
    errorCount = 0,
}: MobileTabBarProps) {
    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-200">
            <div className="flex">
                <button
                    onClick={() => onTabChange('tester')}
                    className={`
            flex-1 flex flex-col items-center justify-center py-3 gap-1
            transition-colors duration-150
            ${activeTab === 'tester'
                            ? 'text-zinc-900 bg-zinc-50'
                            : 'text-zinc-500 hover:text-zinc-700'
                        }
          `}
                >
                    <ClipboardList className="h-5 w-5" />
                    <span className="text-xs font-medium">Questions</span>
                </button>

                <button
                    onClick={() => onTabChange('notebook')}
                    className={`
            flex-1 flex flex-col items-center justify-center py-3 gap-1 relative
            transition-colors duration-150
            ${activeTab === 'notebook'
                            ? 'text-zinc-900 bg-zinc-50'
                            : 'text-zinc-500 hover:text-zinc-700'
                        }
          `}
                >
                    <div className="relative">
                        <BookOpen className="h-5 w-5" />
                        {errorCount > 0 && (
                            <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                                {errorCount > 99 ? '99+' : errorCount}
                            </span>
                        )}
                    </div>
                    <span className="text-xs font-medium">Notes</span>
                </button>
            </div>
        </nav>
    )
}
