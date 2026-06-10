import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react' // useRef 추가


function GNB() {
  const location = useLocation()
  const navigate = useNavigate()
  const dropdownRef = useRef(null) // 드롭다운 외부 클릭 감지용
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('accessToken'))
  const [role, setRole] = useState(localStorage.getItem('role')) 

  const [dropdownOpen, setDropdownOpen] = useState(false)

  // 더미 데이터 (추후 API나 전역 상태로 대체)
  const user = {
    name: '박기원',
    email: 'user@gmail.com'
  }

  // 1. 다른 탭에서 로그인/로그아웃 시 상태 동기화
  useEffect(() => {
    const checkLogin = () => {
      setIsLoggedIn(!!localStorage.getItem('accessToken'))
      setRole(localStorage.getItem('role'))
    }
    window.addEventListener('storage', checkLogin)
    return () => window.removeEventListener('storage', checkLogin)
  }, [])

  // 2. 페이지(location) 변경 시마다 로그인 확인 + 드롭다운 닫기
  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('accessToken'))
    setRole(localStorage.getItem('role'))
    setDropdownOpen(false) // 페이지 이동하면 드롭다운은 닫아주는 게 자연스러워요.
  }, [location])

  // 3. 드롭다운 바깥 영역 클릭 시 자동으로 드롭다운 닫기
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
    localStorage.removeItem('role')
    setIsLoggedIn(false)
    setDropdownOpen(false)
    setRole(null)
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
          ...(role === 'ADMIN' ? [{ path: '/admin', label: '관리' }] : []), 
        ].map(({ path, label }) => (
          <Link
            key={path}
            to={isLoggedIn ? path : '/auth'}
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
                {user.name[0]}
              </div>
              {user.name}
              <span className="text-xs text-gray-400">▼</span>
            </button>

            {/* 드롭다운 */}
            {dropdownOpen && (
              <div className="absolute right-0 top-12 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
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