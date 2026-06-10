import { useEffect } from 'react'
import {useNavigate, useSearchParams } from 'react-router-dom'
import { userLogin, adminLogin, setToken } from '../../api'

function Callback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    // strict mode에서 useEffect가 두번 실행되어 api가 중복 호출되는 것을 막음
    let isMounted = true

    // 1. 구글이 준 code 꺼내기
    const code = searchParams.get('code')

    // code 없으면 튕구기
    if (!code) {
      navigate('/auth')
      return
    }

    // 2. 구글로 떠나기 전 로그인 타입 꺼내기
    const loginType = localStorage.getItem('loginType')

    //3. 관리자라면 adminLogin, 일반 유저면 userLogin 함수 선택
    const loginFn = loginType === 'admin' ? adminLogin : userLogin

    // 4. code 넣어서 백앤드로 보내기
    loginFn(code)
      .then(data => {
        if (!isMounted) return

        if (data.token) {
          const cleanToken = data.token.replace('Bearer ', '')
          setToken(cleanToken)
          localStorage.setItem('accessToken', cleanToken)
          localStorage.setItem('role', data.user.role) // role도 저장
          const targetPath = loginType === 'admin' ? '/admin' : '/library'
          navigate(targetPath, { replace: true })
        } else {
          navigate('/auth')
          }
        })
        .catch(err => {
          if (!isMounted) return
          console.error('로그인 실패:', err)
          navigate('/auth')
        })
      return () => {
        isMounted = false
      }
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500 text-sm font-semibold animate-pulse">
        로그인 처리 중입니다. 잠시만 기다려주세요...</p>
    </div>
  )
}

export default Callback