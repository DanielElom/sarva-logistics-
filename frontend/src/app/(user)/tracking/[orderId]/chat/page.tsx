'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { io, Socket } from 'socket.io-client'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import { useAuthStore } from '@/stores/auth.store'
import { useOrderStore } from '@/stores/order.store'
import api from '@/lib/api'

interface Message {
  id: string
  content: string
  senderId: string
  senderName: string
  createdAt: string
  isMine: boolean
}

export default function ChatPage() {
  const params = useParams()
  const orderId = params.orderId as string
  const router = useRouter()

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const userId = useAuthStore((s) => s.user?.id)
  const userName = useAuthStore((s) => s.user?.name)
  const activeOrder = useOrderStore((s) => s.activeOrder)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [connected, setConnected] = useState(false)

  const socketRef = useRef<Socket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }

    // Load existing messages
    api.get(`/chat/${orderId}/messages`).then(({ data }) => {
      if (Array.isArray(data)) {
        setMessages(
          data.map((m: any) => ({
            id: m.id,
            content: m.content,
            senderId: m.senderId,
            senderName: m.senderName ?? 'User',
            createdAt: m.createdAt,
            isMine: m.senderId === userId,
          })),
        )
      }
    }).catch(() => null)

    // Socket
    if (!userId) return
    const sock = io('http://localhost:3001/chat', {
      auth: { token: typeof window !== 'undefined' ? localStorage.getItem('fair-ride-token') ?? '' : '' },
      transports: ['websocket'],
    })
    socketRef.current = sock

    sock.on('connect', () => {
      setConnected(true)
      sock.emit('join_room', { orderId })
    })

    sock.on('new_message', (msg: any) => {
      setMessages((prev) => [
        ...prev,
        {
          id: msg.id ?? Date.now().toString(),
          content: msg.content,
          senderId: msg.senderId,
          senderName: msg.senderName ?? 'User',
          createdAt: msg.createdAt ?? new Date().toISOString(),
          isMine: msg.senderId === userId,
        },
      ])
    })

    sock.on('disconnect', () => setConnected(false))

    return () => { sock.disconnect(); socketRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || !userId) return
    setSending(true)
    const optimistic: Message = {
      id: Date.now().toString(),
      content: text,
      senderId: userId,
      senderName: userName ?? 'Me',
      createdAt: new Date().toISOString(),
      isMine: true,
    }
    setMessages((prev) => [...prev, optimistic])
    setInput('')
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit('send_message', { orderId, content: text })
      } else {
        await api.post(`/chat/${orderId}/messages`, { content: text })
      }
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  if (!isAuthenticated) return null

  const riderName = activeOrder?.rider?.user?.name ?? 'Rider'

  return (
    <ScreenWrapper>
      {/* header */}
      <header className="sticky top-0 z-30 bg-[#f8faf4]/95 backdrop-blur-sm flex items-center gap-4 px-6 py-4 border-b border-outline-variant/20">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined text-[#003418]" style={{ fontVariationSettings: "'FILL' 0" }}>
            arrow_back
          </span>
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}
            >
              electric_moped
            </span>
          </div>
          <div>
            <p className="font-['Manrope'] font-bold text-sm text-on-surface">{riderName}</p>
            <p className="text-[10px] text-on-surface-variant flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-primary' : 'bg-outline-variant'}`} />
              {connected ? 'Online' : 'Connecting…'}
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push(`/tracking/${orderId}`)}
          className="text-primary text-xs font-bold"
        >
          Track
        </button>
      </header>

      {/* messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-center space-y-2">
            <span
              className="material-symbols-outlined text-outline"
              style={{ fontVariationSettings: "'FILL' 0", fontSize: '40px' }}
            >
              chat_bubble
            </span>
            <p className="text-sm text-on-surface-variant">
              No messages yet. Say hi to your rider!
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-snug ${
                msg.isMine
                  ? 'bg-primary text-white rounded-br-sm'
                  : 'bg-surface-container-low text-on-surface rounded-bl-sm'
              }`}
            >
              {msg.content}
              <p className={`text-[9px] mt-1 ${msg.isMine ? 'text-white/60' : 'text-on-surface-variant'}`}>
                {new Date(msg.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </main>

      {/* input */}
      <div className="px-4 pb-6 pt-2 bg-[#f8faf4]/95 backdrop-blur-sm border-t border-outline-variant/20">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Message your rider…"
            className="flex-1 px-4 py-3 rounded-2xl bg-surface-container-low border border-outline-variant/30 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform disabled:opacity-40"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}
            >
              send
            </span>
          </button>
        </div>
      </div>
    </ScreenWrapper>
  )
}
