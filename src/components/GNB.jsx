import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'

function GNB() {
  const location = useLocation()
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('accessToken'))
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const navigate = useNavigate()

  const user = {
    name: '박기원',
    email: 'user@gmail.com'
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
          { path: '/admin', label: '관리' },
        ].map(({ path, label }) => (
          <Link
            key={path}
            to={isLoggedIn ? path : '/auth'}  // ← 로그인 안 됐으면 /auth로
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
          <div className="relative">
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
                    onClick={() => {
                      setIsLoggedIn(false)
                      setDropdownOpen(false)
                    }}
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
          <>
            <button
              onClick={() => navigate('/auth')}
               className="text-base font-semibold bg-green-900 text-white px-4 py-2 rounded-full hover:bg-green-800 transition-colors"
            >
              로그인 / 회원가입
            </button>
          </>
        )}
      </div>
    </nav>
  )
}

export default GNB