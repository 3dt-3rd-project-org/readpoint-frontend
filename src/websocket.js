import { getWebPubSubToken } from "./api";

let socket = null

export const connectWebSocket = async (onMessage) => {
  if (socket) return // ← 이미 연결돼있으면 중복 연결 방지

  try {
    const data = await getWebPubSubToken()
    const wsUrl = data.url 

    if (!wsUrl) {
      console.warn('웹소켓 URL을 받지 못했습니다.')
      return
    }

    socket = new WebSocket(wsUrl)

    socket.onopen = () => {
      console.log('웹소켓 연결 성공')
    }

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      console.log('웹소켓 메시지:', message)
      onMessage(message)
    }

    socket.onerror = (error) => {
      console.error('웹소켓 오류:', error)
    }

  } catch (err) {
    console.error('웹소켓 연결 실패:', err)
  }
}

export const disconnectWebSocket = () => {
  if (socket && socket.readyState === WebSocket.OPEN) {  // ← OPEN 상태일 때만 닫기
    socket.close()
  }
  socket = null
}