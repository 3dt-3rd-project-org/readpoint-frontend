import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react' 
import { useUser } from '../context/UserContext'

function GNB() {
  const location = useLocation()
  const navigate = useNavigate()
  const dropdownRef = useRef(null) 

  const { user, setUser } = useUser() // 전역 user 상태 가져오기

  // 💡 [핵심 수정] 혼자 로컬스토리지 보던 것을 전역 user 가 있냐 없냐(!!user)로 기준을 바꿉니다.
  const isLoggedIn = !!user 
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // 1. 다른 탭에서 로그인/로그아웃 시 상태 동기화 (기존 유지)
  useEffect(() => {
    const checkLogin = () => {
      // 로컬스토리지 찌꺼기가 만약 지워지면 전역 상태도 비워줌
      if (!localStorage.getItem('accessToken')) {
        setUser(null)
      }
    }
    window.addEventListener('storage', checkLogin)
    return () => window.removeEventListener('storage', checkLogin)
  }, [setUser])

  // 2. 페이지(location) 변경 시마다 드롭다운 닫기 (기존 유지)
  useEffect(() => {
    setDropdownOpen(false) 
  }, [location])

  // 3. 드롭다운 바깥 영역 클릭 시 자동으로 드롭다운 닫기 (기존 유지)
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [dropdownOpen])

  // 로그아웃 핸들러
  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('loginType')
    setUser(null) // 💡 [수정] 전역 상태를 null로 만들어 세션스토리지도 같이 비워지게 함
    setDropdownOpen(false)
    navigate('/')
  }

  return (
    <nav className="flex items-center justify-between px-10 py-5 border-b border-gray-200 bg-white sticky top-0 z-50">
      {/* 로고 */}
      <Link to="/" className="text-2xl font-bold text-green-900">
        📖 Readpoint
      </Link>

      {/* 메뉴 + 버튼 */}
      <div className="flex items-center gap-8">
        {[
          { path: '/library', label: '서재' },
          { path: '/graph', label: '관계도' },
          ...(user?.role === 'ADMIN' ? [{ path: '/admin', label: '관리' }] : []), 
        ].map(({ path, label }) => (
          <Link
            key={path}
            to={isLoggedIn ? path : '/auth'} // 💡 이제 isLoggedIn이 정확히 false가 되므로 /auth로 잘 이동합니다!
            className={`text-base font-medium px-4 py-2 rounded-full transition-colors ${
              location.pathname === path
                ? 'bg-green-900 text-white'
                : 'text-gray-500 hover:text-green-900'
            }`}
          >
            {label}
          </Link>
        ))}

        <div className="w-px h-5 bg-gray-300" />

        {isLoggedIn ? (
          /* 로그인 상태 */
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 text-base font-medium text-gray-700 hover:text-green-900 transition-colors"
            >
              <div className="w-8 h-8 bg-green-900 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {user?.nickname?.[0] || user?.name?.[0] || '?'}
              </div>
              {user?.nickname || user?.name}
              <span className="text-xs text-gray-400">▼</span>
            </button>

            {/* 드롭다운 */}
            {dropdownOpen && (
              <div className="absolute right-0 top-12 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-400">{user?.email}</p>
                </div>
                <div className="py-1">
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    내 프로필
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50"
                  >
                    로그아웃
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* 비로그인 상태 */
          <button
            onClick={() => navigate('/auth')}
            className="text-base font-semibold bg-green-900 text-white px-4 py-2 rounded-full hover:bg-green-800 transition-colors"
          >
            로그인 / 회원가입
          </button>
        )}
      </div>
    </nav>
  )
}

export default GNB