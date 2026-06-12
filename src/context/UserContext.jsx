import { createContext, useContext, useState, useEffect } from 'react'

const UserContext = createContext(null)

export function UserProvider({ children }) {
  // 앱이 처음 켜지거나 새로고침될 때 세션스토리지에서 안전하게 복구
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const sessionData = sessionStorage.getItem('u_session')
      if (sessionData) {
        try {
          // encodeURIComponent로 감싸졌던 한글 프로필까지 정상 복구
          return JSON.parse(decodeURIComponent(atob(sessionData)))
        } catch (e) {
          console.error("로그인 세션 복구 실패:", e)
          return null
        }
      }
    }
    return null
  })

  // user 상태가 변경될 때마다 세션스토리지에 동기화
  useEffect(() => {
    if (user) {
      try {
        const encodedData = btoa(encodeURIComponent(JSON.stringify(user)))
        sessionStorage.setItem('u_session', encodedData)
      } catch (e) {
        console.error("로그인 세션 저장 실패:", e)
      }
    } else {
      sessionStorage.removeItem('u_session')
    }
  }, [user])

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}