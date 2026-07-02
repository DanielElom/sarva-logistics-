'use client'

import { io, Socket } from 'socket.io-client'

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('fair-ride-token') ?? ''
        : ''

    socket = io(SOCKET_URL, {
      query: { token },
      autoConnect: false,
      transports: ['websocket'],
    })
  }
  return socket
}

export function getChatSocket(): Socket {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('fair-ride-token') ?? ''
      : ''

  return io(`${SOCKET_URL}/chat`, {
    auth: { token },
    autoConnect: false,
    transports: ['websocket'],
  })
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export default getSocket
