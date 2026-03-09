'use client'

import { cn, formatTime } from '@/lib/utils'
import { type LogItem, type LogLevel, useAppStore } from '@/stores/app-store'
import { useEffect, useRef, useState } from 'react'

const levelStyles: Record<LogLevel, string> = {
  info: 'text-slate-400',
  success: 'text-emerald-400',
  error: 'text-red-400',
  warning: 'text-amber-400',
}

const levelIcons: Record<LogLevel, string> = {
  info: '○',
  success: '✓',
  error: '✕',
  warning: '⚠',
}

function LogRow({ item }: { item: LogItem }) {
  return (
    <div className={cn('flex gap-2 py-1 px-2 text-xs font-mono', levelStyles[item.level])}>
      <span className="text-slate-600 shrink-0">{formatTime(item.timestamp)}</span>
      <span className="shrink-0">{levelIcons[item.level]}</span>
      <span className="break-all">{item.message}</span>
    </div>
  )
}

export function LogPanel() {
  const logs = useAppStore((s) => s.logs)
  const clearLogs = useAppStore((s) => s.clearLogs)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    if (scrollRef.current && !isCollapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, isCollapsed])

  return (
    <div className="flex flex-col bg-slate-900/80 rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-700/50 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Logs
          <span className="text-xs text-slate-500">({logs.length})</span>
        </h2>
        <div className="flex gap-1">
          <button
            onClick={clearLogs}
            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded transition-colors"
            title="Clear logs"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded transition-colors"
            title={isCollapsed ? '展开' : '折叠'}
          >
            <svg
              className={cn('w-3.5 h-3.5 transition-transform', isCollapsed && 'rotate-180')}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
      {!isCollapsed && (
        <div ref={scrollRef} className="h-40 overflow-y-auto bg-slate-950/50">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-600 text-xs">No logs yet</div>
          ) : (
            logs.map((item) => <LogRow key={item.id} item={item} />)
          )}
        </div>
      )}
    </div>
  )
}
