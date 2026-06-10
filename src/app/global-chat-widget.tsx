'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle, Send, Minimize2, Maximize2, Users, X,
  AtSign,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { useWebSocket, WebSocketProvider, type WSMessage } from './websocket-provider'

// ============================================================
// Types
// ============================================================

interface ChatMessage {
  id: string
  content: string
  senderName: string
  senderId?: string
  timestamp: string
  type: 'user' | 'system'
  mentions?: string[]
}

interface OnlineUser {
  id: string
  username: string
}

// ============================================================
// Chat Panel (inner component that uses WebSocket)
// ============================================================

function GlobalChatPanel({
  lang = 'en',
  username = 'Anonymous',
  onClose,
}: {
  lang: Lang
  username: string
  onClose: () => void
}) {
  const { connectionState, lastMessage, send, setOnMessage } = useWebSocket()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [mentionSearch, setMentionSearch] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [cursorPos, setCursorPos] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const STORAGE_KEY = 'vl-global-chat-history'

  // Hydration-safe load
  useEffect(() => {
    requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) setMessages(JSON.parse(raw))
      } catch { /* ignore */ }
      setMounted(true)
    })
  }, [])

  // Persist messages
  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-200)))
    } catch { /* ignore */ }
  }, [messages, mounted])

  // Handle incoming WebSocket messages
  useEffect(() => {
    setOnMessage((msg: WSMessage) => {
      switch (msg.type) {
        case 'user_list': {
          const users = (msg.payload.users as OnlineUser[]) || []
          setOnlineUsers(users)
          break
        }
        case 'user_joined': {
          const users = (msg.payload.users as OnlineUser[]) || []
          if (users.length > 0) setOnlineUsers(users)

          const joinedName = msg.payload.username as string
          if (joinedName) {
            setMessages(prev => [...prev, {
              id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              content: t(lang, 'chatWidget.userJoined').replace('{name}', joinedName),
              senderName: 'System',
              timestamp: msg.timestamp,
              type: 'system',
            }])
          }
          break
        }
        case 'user_left': {
          const users = (msg.payload.users as OnlineUser[]) || []
          if (users.length > 0) setOnlineUsers(users)

          const leftName = msg.payload.username as string
          if (leftName) {
            setMessages(prev => [...prev, {
              id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              content: t(lang, 'chatWidget.userLeft').replace('{name}', leftName),
              senderName: 'System',
              timestamp: msg.timestamp,
              type: 'system',
            }])
          }
          break
        }
        case 'chat_message': {
          setMessages(prev => [...prev, {
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            content: msg.payload.content as string,
            senderName: msg.senderName || 'Unknown',
            senderId: msg.senderId,
            timestamp: msg.timestamp,
            type: 'user',
            mentions: (msg.payload.mentions as string[]) || [],
          }])
          break
        }
        case 'typing_indicator': {
          const typingName = msg.payload.username as string
          if (typingName && typingName !== username) {
            setTypingUsers(prev => {
              if (!prev.includes(typingName)) return [...prev, typingName]
              return prev
            })
            // Clear typing indicator after 3s
            setTimeout(() => {
              setTypingUsers(prev => prev.filter(n => n !== typingName))
            }, 3000)
          }
          break
        }
      }
    })

    return () => setOnMessage(null)
  }, [lang, username, setOnMessage])

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Send message
  const sendMessage = useCallback(() => {
    if (!inputValue.trim()) return

    const mentions: string[] = []
    const mentionRegex = /@(\w+)/g
    let match: RegExpExecArray | null
    while ((match = mentionRegex.exec(inputValue)) !== null) {
      mentions.push(match[1])
    }

    send('chat_message', {
      content: inputValue.trim(),
      mentions,
    })

    // Add to local messages immediately
    setMessages(prev => [...prev, {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      content: inputValue.trim(),
      senderName: t(lang, 'chatWidget.you'),
      senderId: 'self',
      timestamp: new Date().toISOString(),
      type: 'user',
      mentions,
    }])

    setInputValue('')
    setMentionSearch(false)
    setMentionFilter('')
    inputRef.current?.focus()
  }, [inputValue, send, lang])

  // Input change with mention detection
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)
    setCursorPos(e.target.selectionStart || 0)

    // Check for @ mention trigger
    const beforeCursor = val.slice(0, e.target.selectionStart || 0)
    const atMatch = beforeCursor.match(/@(\w*)$/)
    if (atMatch) {
      setMentionSearch(true)
      setMentionFilter(atMatch[1].toLowerCase())
    } else {
      setMentionSearch(false)
      setMentionFilter('')
    }

    // Send typing indicator
    if (val.trim()) {
      send('typing_indicator', { username })
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      setTypingUsers(prev => prev.filter(n => n !== username))
    }, 3000)
  }, [send, username])

  // Select mention
  const selectMention = useCallback((userName: string) => {
    const beforeAt = inputValue.slice(0, cursorPos).replace(/@\w*$/, '')
    const afterCursor = inputValue.slice(cursorPos)
    setInputValue(`${beforeAt}@${userName} ${afterCursor}`)
    setMentionSearch(false)
    setMentionFilter('')
    inputRef.current?.focus()
  }, [inputValue, cursorPos])

  // Filtered online users for mention
  const filteredUsers = useMemo(() => {
    if (!mentionSearch) return []
    return onlineUsers.filter(u =>
      u.username.toLowerCase().includes(mentionFilter) && u.username !== username
    )
  }, [mentionSearch, mentionFilter, onlineUsers, username])

  // Connection status label
  const connectionLabel = useMemo(() => {
    switch (connectionState) {
      case 'connecting': return t(lang, 'ws.connecting')
      case 'connected': return t(lang, 'ws.connected')
      case 'disconnected': return t(lang, 'ws.disconnected')
      case 'error': return t(lang, 'ws.error')
    }
  }, [connectionState, lang])

  // Connection status color
  const connectionColor = useMemo(() => {
    switch (connectionState) {
      case 'connecting': return 'text-amber-400'
      case 'connected': return 'text-emerald-400'
      case 'disconnected': return 'text-gray-400'
      case 'error': return 'text-red-400'
    }
  }, [connectionState])

  // Format time
  const formatTime = useCallback((ts: string) => {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }, [])

  // Highlight mentions in text
  const renderContent = useCallback((content: string, mentions?: string[]) => {
    if (!mentions || mentions.length === 0) return content

    const parts = content.split(/(@\w+)/g)
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const name = part.slice(1)
        return (
          <span key={i} className="text-emerald-400 font-medium">
            {part}
          </span>
        )
      }
      return part
    })
  }, [])

  if (!mounted) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="fixed bottom-20 right-4 z-50 w-[380px] h-[500px] max-h-[70vh] vl-card rounded-xl shadow-2xl border border-[var(--vl-border)] flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-[var(--vl-border)] flex items-center justify-between bg-[var(--vl-bg-card)]">
        <div className="flex items-center gap-2">
          <MessageCircle className="size-4 text-emerald-400" />
          <h3 className="text-sm font-semibold vl-text-heading">{t(lang, 'chatWidget.title')}</h3>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
            {onlineUsers.length} {t(lang, 'chatWidget.online')}
          </Badge>
          <span className={`text-[9px] ${connectionColor}`}>
            {connectionLabel}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Online users toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Users className="size-3.5 vl-text-muted" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="vl-dialog text-xs">{t(lang, 'ws.onlineUsers')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 vl-text-muted hover:text-[var(--vl-text-heading)]"
            onClick={onClose}
          >
            <Minimize2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Online users bar */}
      <div className="px-3 py-1.5 border-b border-[var(--vl-border-subtle)] flex items-center gap-1.5 overflow-x-auto bg-[var(--vl-bg-inner)]">
        {onlineUsers.length === 0 ? (
          <span className="text-[10px] vl-text-muted">{t(lang, 'chatWidget.noUsers')}</span>
        ) : (
          onlineUsers.map(user => (
            <div
              key={user.id}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[var(--vl-bg-card)] border border-[var(--vl-border-subtle)] shrink-0"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] vl-text-body">{user.username}</span>
            </div>
          ))
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <MessageCircle className="size-8 vl-text-muted mb-2 opacity-30" />
            <p className="text-xs vl-text-muted">{t(lang, 'chatWidget.noMessages')}</p>
            <p className="text-[10px] vl-text-muted mt-1">{t(lang, 'chatWidget.noMessagesDesc')}</p>
          </div>
        ) : (
          messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col"
            >
              {msg.type === 'system' ? (
                <div className="flex justify-center">
                  <span className="text-[10px] vl-text-muted px-2 py-0.5 rounded-full bg-[var(--vl-bg-inner)]">
                    {msg.content}
                  </span>
                </div>
              ) : (
                <div className={`flex gap-2 ${msg.senderId === 'self' ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${
                      msg.senderId === 'self' ? 'bg-emerald-500' : 'bg-blue-500'
                    }`}
                  >
                    {msg.senderName.charAt(0).toUpperCase()}
                  </div>
                  {/* Bubble */}
                  <div
                    className={`max-w-[70%] rounded-lg px-2.5 py-1.5 ${
                      msg.senderId === 'self'
                        ? 'bg-emerald-500/15 border border-emerald-500/20'
                        : 'bg-[var(--vl-bg-inner)] border border-[var(--vl-border-subtle)]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[10px] font-medium ${msg.senderId === 'self' ? 'text-emerald-400' : 'text-blue-400'}`}>
                        {msg.senderName}
                      </span>
                      <span className="text-[8px] vl-text-muted">{formatTime(msg.timestamp)}</span>
                    </div>
                    <p className="text-xs vl-text-body leading-relaxed whitespace-pre-wrap">
                      {renderContent(msg.content, msg.mentions)}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Typing indicator */}
      <AnimatePresence>
        {typingUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 py-1 border-t border-[var(--vl-border-subtle)]"
          >
            <span className="text-[10px] vl-text-muted italic">
              {typingUsers.join(', ')} {typingUsers.length === 1 ? t(lang, 'ws.typingIndicator').replace('{name} is typing...', `${t(lang, 'ws.typingIndicator').replace('{name}', typingUsers[0])}`) : 'are typing...'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="p-2 border-t border-[var(--vl-border)] bg-[var(--vl-bg-card)]">
        {/* Mention dropdown */}
        <AnimatePresence>
          {mentionSearch && filteredUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="mb-2 border border-[var(--vl-border)] rounded-lg overflow-hidden bg-[var(--vl-bg-card)] shadow-lg"
            >
              <div className="px-2 py-1 border-b border-[var(--vl-border-subtle)]">
                <span className="text-[10px] vl-text-muted flex items-center gap-1">
                  <AtSign className="size-3" /> {t(lang, 'chatWidget.searchUsers')}
                </span>
              </div>
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => selectMention(user.username)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--vl-bg-card-hover)] transition-colors text-left"
                >
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[8px] font-bold text-white">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs vl-text-body">{user.username}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-1.5">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder={t(lang, 'chatWidget.placeholder')}
            className="vl-input h-8 text-xs flex-1"
          />
          <Button
            size="sm"
            className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
            onClick={sendMessage}
            disabled={!inputValue.trim()}
          >
            <Send className="size-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================
// Global Chat Widget (exported entry point with WebSocketProvider)
// ============================================================

export function GlobalChatWidget({
  lang = 'en',
  username = 'Anonymous',
}: {
  lang?: Lang
  username?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const STORAGE_KEY = 'vl-global-chat-history'

  // Hydration-safe mount
  useEffect(() => {
    requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const msgs = JSON.parse(raw)
          setUnreadCount(Math.min(msgs.length, 99))
        }
      } catch { /* ignore */ }
      setMounted(true)
    })
  }, [])

  // Reset unread when opened
  useEffect(() => {
    if (isOpen) setUnreadCount(0)
  }, [isOpen])

  if (!mounted) return null

  return (
    <WebSocketProvider username={username} lang={lang}>
      <AnimatePresence>
        {isOpen && (
          <GlobalChatPanel
            lang={lang}
            username={username}
            onClose={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg flex items-center justify-center transition-colors"
        aria-label={t(lang, 'chatWidget.title')}
      >
        {isOpen ? (
          <X className="size-5" />
        ) : (
          <>
            <MessageCircle className="size-5" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.span>
            )}
          </>
        )}
      </motion.button>
    </WebSocketProvider>
  )
}
