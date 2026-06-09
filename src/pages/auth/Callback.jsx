import { useEffect } from 'react'
import {useNavigate, useSearchParams } from 'react-router-dom'
import { userLogin, adminLogin, setToken } from '../../api'

function Callback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    // 1. 구글이 준 code 꺼내기
    const code = searchParams.get('code')

    // code 없으면 튕구기
    if (!code) {
      navigate('/auth')
      return
    }

    // 2. 구글로 떠나기 전 로그인 타입 꺼내기
    const loginType = localStorage.getItem(('loginType'))

    //3. 관리자라면 adminLogin, 일반 유저면 userLogin 함수 선택
    const loginFn = loginType === 'admin' ? admin : userLogin

    // 4. code 넣어서 백앤드로 보내기
    loginFn(code)
      .then(data => {
        if (data.token) {
          setToken(data.token.replace('Bearer ', ''))
          navigate('/library')
        } else {
          navigate('/auth')
          }
        })
        .catch(err => {
          console.error('로그인 실패:', err)
          navigate('/auth')
        })
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500 text-sm font-semibold animate-pulse">
        로그인 처리 중입니다. 잠시만 기다려주세요...</p>
    </div>
  )
}

export default Callback