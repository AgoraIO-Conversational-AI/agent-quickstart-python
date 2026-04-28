'use client'

import { cn, formatTime } from '@/lib/utils'
import { type LogItem, type LogLevel, useAppStore } from '@/stores/app-store'
import { useEffect, useRef, useState } from 'react'

const levelStyles: Record<LogLevel, string> = {
  info: 'text-slate-300',
  success: 'text-emerald-300',
  error: 'text-red-300',
  warning: 'text-amber-300',
}

const levelIcons: Record<LogLevel, string> = {
  info: 'i',
  success: '+',
  error: '!',
  warning: '~',
}

function LogRow({ item }: { item: LogItem }) {
  return (
    <div className={cn('flex gap-2 px-4 py-2 text-xs font-mono', levelStyles[item.level])}>
      <span className="shrink-0 text-[hsl(var(--muted-foreground))]">{formatTime(item.timestamp)}</span>
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
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-[hsl(var(--foreground))]">Runtime logs</h2>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">({logs.length})</span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={clearLogs}
            className="rounded-md border border-[hsl(var(--border))] px-2.5 py-1 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
            title="Clear logs"
          >
            Clear
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="rounded-md border border-[hsl(var(--border))] px-2.5 py-1 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
            title={isCollapsed ? 'Show logs' : 'Hide logs'}
          >
            {isCollapsed ? 'Show' : 'Hide'}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div ref={scrollRef} className="h-full min-h-[280px] overflow-y-auto bg-[hsl(var(--surface-subtle))] py-2">
          {logs.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 text-xs text-[hsl(var(--muted-foreground))]">
              No runtime events yet.
            </div>
          ) : (
            logs.map((item) => <LogRow key={item.id} item={item} />)
          )}
        </div>
      )}
    </div>
  )
}
