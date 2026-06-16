import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '../../context/UserContext'

function Auth() {
  const { user } = useUser()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isPending = searchParams.get('pending') === 'true'
  const [modal, setModal] = useState(null)
  const [pendingLoginType, setPendingLoginType] = useState(null)

  const alreadyAgreed = localStorage.getItem('privacyAgreed') === 'true'

  // useEffect(() => {
  //   const token = localStorage.getItem('accessToken')
  //   const role = localStorage.getItem('role')
  //   if (token) {
  //     navigate(role === 'ADMIN' ? '/admin' : '/library', { replace: true })
  //   }
  // }, [])

  useEffect(() => {
  const token = localStorage.getItem('accessToken')
  
  // 1. 토큰도 있고, Context에 유저 정보도 확실히 들어왔을 때만 실행합니다.
  if (token && user) {
    // 2. localStorage보다는 Context에 있는 유저 권한을 보는 게 가장 정확합니다.
    const userRole = user.loginType || localStorage.getItem('role')
    
    if (userRole === 'ADMIN') {
      navigate('/admin', { replace: true })
    } else {
      navigate('/library', { replace: true })
    }
  }
}, [user, navigate]) // 💡 중요: user 상태가 바뀔 때마다 다시 검사하도록 등록!

  // 동의 후 구글 로그인 진행
  useEffect(() => {
    if (pendingLoginType && alreadyAgreed) {
      startGoogleAuth(pendingLoginType)
    }
  }, [pendingLoginType, alreadyAgreed])

  const startGoogleAuth = (loginType) => {
    const GOOGLE_CLIENT_ID = '898813475333-g6vpbm9jgrvm4v8ec6525c73rcd52toq.apps.googleusercontent.com'
    const REDIRECT_URI = window.location.origin + '/auth/callback'
    const googleAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `response_type=code` +
      `&client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=openid%20email%20profile` +
      `&access_type=offline` +
      `&prompt=select_account`
    localStorage.setItem('loginType', loginType)
    window.location.href = googleAuthUrl
  }

  const handleLogin = (loginType) => {
    if (!alreadyAgreed) {
      setPendingLoginType(loginType)
      setModal('privacy_agree')
    } else {
      startGoogleAuth(loginType)
    }
  }

  const handleAgree = () => {
    localStorage.setItem('privacyAgreed', 'true')
    setModal(null)
    if (pendingLoginType) startGoogleAuth(pendingLoginType)
  }

  return (
    <>
      {/* 모달 */}
      {modal === 'privacy_agree' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-2">서비스 이용 동의</h2>
            <p className="text-xs text-gray-400 mb-5">아래 약관을 확인하고 동의해 주세요.</p>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">

              {/* 이용약관 */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <p className="text-xs font-semibold text-gray-700">이용약관 (필수)</p>
                </div>
                <div className="px-4 py-3 text-xs text-gray-500 leading-relaxed whitespace-pre-line h-28 overflow-y-auto">
      {`제1조 (목적)
      본 약관은 Readpoint(이하 "서비스")가 제공하는 독서 기록 및 인물 관계도 서비스의 이용에 관한 조건 및 절차를 규정합니다.

      제2조 (이용 자격)
      만 14세 이상 누구나 Google 계정으로 가입하여 서비스를 이용할 수 있습니다.

      제3조 (서비스 내용)
      서비스는 공개 도서의 인물 관계도 및 독서 기록 기능을 제공합니다. 저작권이 만료된 공개 도메인 도서만 제공됩니다.

      제4조 (금지 행위)
      서비스를 악용하거나 타인의 이용을 방해하는 행위, 무단 크롤링, 자동화 도구를 이용한 데이터 수집을 금지합니다.

      제5조 (서비스 변경 및 중단)
      서비스 내용은 사전 고지 후 변경될 수 있으며, 불가피한 경우 예고 없이 중단될 수 있습니다.

      제6조 (면책 조항)
      서비스는 제공된 데이터의 정확성을 보장하지 않으며, 이용자의 서비스 이용으로 발생한 손해에 대해 책임을 지지 않습니다.`}
                </div>
              </div>

              {/* 개인정보처리방침 */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <p className="text-xs font-semibold text-gray-700">개인정보 수집 및 이용 동의 (필수)</p>
                </div>
                <div className="px-4 py-3 text-xs text-gray-500 leading-relaxed whitespace-pre-line h-28 overflow-y-auto">
      {`1. 수집 항목
      - 이메일 주소, 닉네임 (Google 계정 기반)
      - 서비스 이용 기록 (독서 진도, 북마크)

      2. 수집 목적
      - 회원 식별 및 서비스 이용
      - 맞춤형 독서 기록 제공

      3. 보유 기간
      - 회원 탈퇴 시까지
      - 관련 법령에 따라 보존이 필요한 경우 해당 기간 보유

      4. 제3자 제공
      - 수집된 정보는 제3자에게 제공되지 않습니다.
      - 단, Google OAuth 인증을 통해 Google로부터 기본 프로필 정보를 수신합니다.

      5. 이용자 권리
      - 개인정보 열람, 수정, 삭제를 요청할 수 있습니다.
      - 회원 탈퇴 시 모든 개인정보가 삭제됩니다.`}
                </div>
              </div>

            </div>

            <button
              onClick={handleAgree}
              className="w-full mt-5 bg-green-900 text-white py-3 rounded-full text-sm font-semibold hover:bg-green-800 transition-colors"
            >
              전체 동의하고 계속하기
            </button>
            <button
              onClick={() => { setModal(null); setPendingLoginType(null) }}
              className="w-full mt-2 py-2 rounded-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}


      {modal && modal !== 'privacy_agree' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {modal === 'terms' ? '이용약관' : '개인정보처리방침'}
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
              {modal === 'terms'
                ? `1. 서비스 이용\nReadpoint는 독서 기록 및 인물 관계도 서비스를 제공합니다.\n\n2. 계정\nGoogle 계정으로 가입하며, 부정 이용 시 서비스 이용이 제한될 수 있습니다.\n\n3. 금지 행위\n서비스를 악용하거나 타인에게 피해를 주는 행위를 금지합니다.\n\n4. 서비스 변경\n서비스 내용은 사전 고지 없이 변경될 수 있습니다.`
                : `Readpoint는 서비스 제공을 위해 아래와 같이 최소한의 개인정보를 수집합니다.\n\n수집 항목: 이메일 주소, 닉네임 (Google 계정 기반)\n수집 목적: 회원 식별 및 서비스 이용\n보유 기간: 회원 탈퇴 시까지\n\n수집된 정보는 제3자에게 제공되지 않습니다.`}
            </p>
            <button
              onClick={() => setModal(null)}
              className="mt-6 w-full bg-green-900 text-white py-3 rounded-full text-sm font-semibold hover:bg-green-800 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">

          <div className="text-center mb-8">
            <Link to="/" className="text-3xl font-bold text-green-900">📖 Readpoint</Link>
            <p className="mt-2 text-gray-500 text-sm">스포일러 없이, 더 깊이.</p>
          </div>

          {isPending && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 mb-4 text-sm text-blue-700 text-center">
              관리자 가입 승인 요청이 완료되었습니다.<br />
              Teams 승인 완료 후 다시 로그인해 주세요.
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-8 py-10">
            <p className="text-center text-sm text-gray-500 mb-6">Google 계정으로 간편하게 시작하세요</p>

            <button
              onClick={() => handleLogin('user')}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              <span className="text-sm font-semibold text-gray-700">Google로 시작하기</span>
            </button>
          </div>

          <p className="mt-4 text-center text-xs text-gray-400">
            <button
              onClick={() => {
                setPendingLoginType('user')
                setModal('privacy_agree')
              }}
              className="text-green-900 font-semibold hover:underline"
            >
              회원가입
            </button>
            {' | '}
            <button
              onClick={() => handleLogin('admin')}
              className="text-green-900 font-semibold hover:underline"
            >
              관리자 로그인
            </button>
          </p>

        </div>
      </div>
    </>
  )
}

export default Auth;