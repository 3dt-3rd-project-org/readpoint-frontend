import { useState } from 'react'
import { Link } from 'react-router-dom'


  function Auth() {
    const [tab, setTab] = useState('login')

  const handleGoogleAuth = () => {
    const GOOGLE_CLIENT_ID = '898813475333-g6vpbm9jgrvm4v8ec6525c73rcd52toq.apps.googleusercontent.com'
    const REDIRECT_URI = 'http://localhost:5173/auth/callback'
    
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `response_type=code` +
      `&client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=openid%20email%20profile` + // 구글에게 이메일, 프로필 정보를 넘기길 요청 
      `&access_type=offline` + // 오프라인 상태에도 백앤드에서 구글 api를 호출할 수 있도록 리프레시 토큰을 달라
      `&prompt=select_account` // 무조건 구글 계정 중 하나 선택

    localStorage.setItem('loginType', tab === 'admin' ? 'admin' : 'user')
    window.location.href = googleAuthUrl
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* 로고 */}
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-green-900">
            📖 Readpoint
          </Link>
          <p className="mt-2 text-gray-500 text-sm">
            {tab === 'login' ? '다시 만나서 반가워요' : '독서 기록을 시작해볼까요'}
          </p>
        </div>

        {/* 카드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-8 py-10">

          {/* 탭 */}
          <div className="flex bg-gray-100 rounded-full p-1 mb-8">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 py-2 rounded-full text-sm font-semibold transition-colors ${
                tab === 'login'
                  ? 'bg-white text-green-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => setTab('register')}
              className={`flex-1 py-2 rounded-full text-sm font-semibold transition-colors ${
                tab === 'register'
                  ? 'bg-white text-green-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              회원가입
            </button>
          </div>

          {/* 설명 */}
          <p className="text-center text-sm text-gray-500 mb-6">
            {tab === 'login'
              ? 'Google 계정으로 간편하게 로그인하세요'
              : 'Google 계정으로 간편하게 시작하세요'}
          </p>

          {/* Google 버튼 */}
          <button
            onClick={handleGoogleAuth}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
          >
            {/* Google SVG 로고 */}
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            <span className="text-sm font-semibold text-gray-700">
              Google로 {tab === 'login' ? '로그인' : '회원가입'}
            </span>
          </button>

          {/* 하단 안내 */}
          <p className="mt-6 text-center text-xs text-gray-400">
            {tab === 'login' ? (
              <>
                계정이 없으신가요?{' '}
                <button onClick={() => setTab('register')} className="text-green-900 font-semibold hover:underline">
                  회원가입
                </button>
              </>
            ) : (
              <>
                이미 계정이 있으신가요?{' '}
                <button onClick={() => setTab('login')} className="text-green-900 font-semibold hover:underline">
                  로그인
                </button>
              </>
            )}
          </p>
        </div>

        {/* 이용약관 */}
        <p className="mt-4 text-center text-xs text-gray-400">
          계속 진행하면{' '}
          <span 
            onClick={() => alert('이용약관 내용: Readpoin 서비스를 이용해주셔서 감사합니다. 본 약관은 서비스 준비 중이므로 임시 적용됩니다.')}
            className="underline cursor-pointer hover:text-gray-600">이용약관</span>
          {' '}및{' '}
          <span 
            onClick={() => alert('개인정보처리방침: 수집하는 항목(이메일, 프로필 사진)은 구글 로그인 연동 및 서비스 제공 목적으로만 사용됩니다.')}
            className="underline cursor-pointer hover:text-gray-600">개인정보처리방침</span>
          에 동의하는 것으로 간주합니다
        </p>

      </div>
    </div>
  )
}

export default Auth