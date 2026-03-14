'use client'

import { TurnStatus } from 'agora-agent-client-toolkit'
import { cn } from '@/lib/utils'
import { type TranscriptItem, useAppStore } from '@/stores/app-store'
import { useEffect, useRef } from 'react'

function TranscriptRow({ item }: { item: TranscriptItem }) {
  const isAgent = item.type === 'agent'
  const isInProgress = item.status === TurnStatus.IN_PROGRESS

  return (
    <div className={cn('flex gap-3 p-3', isAgent ? 'flex-row' : 'flex-row-reverse')}>
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0',
          isAgent ? 'bg-blue-500' : 'bg-emerald-500',
        )}
      >
        {isAgent ? 'AI' : 'Me'}
      </div>
      <div
        className={cn(
          'max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
          isAgent ? 'bg-slate-700 text-slate-100 rounded-tl-sm' : 'bg-blue-600 text-white rounded-tr-sm',
        )}
      >
        <p className="m-0 whitespace-pre-wrap break-words">
          {item.text}
          {isInProgress && <span className="inline-block w-1.5 h-4 ml-1 bg-current animate-pulse rounded-sm" />}
        </p>
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
    <div className="flex flex-col h-full bg-slate-800/50 rounded-xl border border-slate-700/50">
      <div className="px-4 py-3 border-b border-slate-700/50">
        <h2 className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          Conversation Subtitles
        </h2>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 min-h-0">
        {transcripts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            Waiting for conversation to start...
          </div>
        ) : (
          transcripts.map((item) => <TranscriptRow key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}
