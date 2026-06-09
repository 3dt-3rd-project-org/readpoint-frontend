import { getWebPubSubToken } from "./api";

let socket = null

export const connectWebSocket = async (onMessage) => {
  try {
    // 1. 백엔드로부터 안전한 실시간 접속용 주소(Token이 포함된 URL)를 받아옵니다.
    const data = await getWebPubSubToken()
    const wsUrl = data.wsUrl

    // 2. 브라우저의 기본 기능을 이용해 해당 주소로 실시간 웹소켓 통신 전화를 연결
    socket = new WebSocket(wsUrl)

    // 연결이 성공했을 때
    socket.onopen = () => {
      console.log('웹소켓 연결 성공')
    }

    // 서버에서 새로운 메시지를 실시간으로 던져줬을 때
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      console.log('웹소켓 메시지:', message)
      onMessage(message)
    }

    // 통신망이 끊기거나 에러가 나을 때
    socket.onerror = (error) => {
      console.error('웹소켓 오류:', error)
    }
  } catch (err) {
    console.error('웹소켓 연결 실패:', err)
  }
}

export const disconnectWebSocket = () => {
  if (socket) {
    socket.close()
    socket = null
  }
}