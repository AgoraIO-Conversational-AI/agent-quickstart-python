'use client'

import { cn } from '@/lib/utils'
import { type TranscriptItem, useAppStore } from '@/stores/app-store'
import { TurnStatus } from 'agora-agent-client-toolkit'
import { useEffect, useRef } from 'react'

function TranscriptRow({ item }: { item: TranscriptItem }) {
  const isAgent = item.type === 'agent'
  const isInProgress = item.status === TurnStatus.IN_PROGRESS

  return (
    <div className={cn('flex px-4 py-3', isAgent ? 'justify-start' : 'justify-end')}>
      <div className={cn('flex max-w-[82%] flex-col gap-1', isAgent ? 'items-start' : 'items-end')}>
        <span
          className={cn(
            'text-[11px] uppercase tracking-[0.16em]',
            isAgent ? 'text-[hsl(var(--muted-foreground))]' : 'text-cyan-300',
          )}
        >
          {isAgent ? 'Agent' : 'You'}
        </span>

        <div
          className={cn(
            'rounded-xl border px-4 py-3 text-sm leading-6',
            isAgent
              ? 'border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'
              : 'border-cyan-500/20 bg-cyan-500/10 text-cyan-50',
          )}
        >
          <p className="m-0 whitespace-pre-wrap break-words">
            {item.text}
            {isInProgress && <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-current" />}
          </p>
        </div>
      </div>
    </div>
  )
}

export function SubtitlePanel() {
  const transcripts = useAppStore((s) => s.transcripts)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcripts])

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-subtle))]">
      <div className="border-b border-[hsl(var(--border))] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-[hsl(var(--foreground))]">Transcript</h2>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">{transcripts.length} turns</span>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto py-2">
        {transcripts.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 text-sm text-[hsl(var(--muted-foreground))]">
            Waiting for the first utterance.
          </div>
        ) : (
          transcripts.map((item) => <TranscriptRow key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}
