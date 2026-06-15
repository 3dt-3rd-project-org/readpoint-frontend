import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useUser } from '../context/UserContext'
import { BookOpen, Network, ChevronRight } from 'lucide-react'

function GNBTooltip({ message, icon, onNext, onSkip, isLast }) {
  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white text-xs rounded-xl px-4 py-3 shadow-lg w-56">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-green-400">{icon}</span>
        <p className="leading-relaxed">{message}</p>
      </div>
      <div className="flex justify-between items-center">
        <button onClick={onSkip} className="text-gray-400 hover:text-white text-xs">건너뛰기</button>
        <button onClick={onNext} className="text-green-400 font-semibold text-xs flex items-center gap-0.5">
          {isLast ? '완료' : <>다음 <ChevronRight size={12} /></>}
        </button>
      </div>
      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 rotate-45" />
    </div>
  )
}

function GNB() {
  const location = useLocation()
  const navigate = useNavigate()
  const dropdownRef = useRef(null)
  const { user, setUser } = useUser()
  const isLoggedIn = !!user
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [tooltipStep, setTooltipStep] = useState(() => {
    if (localStorage.getItem('onboardingDone')) return null
    const saved = localStorage.getItem('tooltipStep')
    return saved !== null ? parseInt(saved) : 0
  })

  const handleTooltipNext = () => {
    const next = (tooltipStep ?? 0) + 1
    localStorage.setItem('tooltipStep', next)
    setTooltipStep(next)
    if (next === 2) {
      if (location.pathname === '/library') {
        window.dispatchEvent(new CustomEvent('tooltipStepChange', { detail: 2 }))
      } else {
        navigate('/library')
      }
    }
  }

  const handleTooltipSkip = () => {
    localStorage.setItem('onboardingDone', 'true')
    localStorage.removeItem('tooltipStep')
    setTooltipStep(null)
  }

  useEffect(() => {
    const checkLogin = () => {
      if (!localStorage.getItem('accessToken')) setUser(null)
    }
    window.addEventListener('storage', checkLogin)
    return () => window.removeEventListener('storage', checkLogin)
  }, [setUser])

  useEffect(() => {
    setDropdownOpen(false)
  }, [location])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [dropdownOpen])

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('loginType')
    sessionStorage.removeItem('u_session')
    setUser(null)
    setDropdownOpen(false)
    navigate('/')
  }

  const menus = [
    { path: '/library', label: '서재', tooltipIndex: 0, icon: <BookOpen size={13} />, tooltipMsg: '서재에서 책을 선택해 읽어보세요' },
    { path: '/graph', label: '관계도', tooltipIndex: 1, icon: <Network size={13} />, tooltipMsg: '인물 관계도를 챕터별로 볼 수 있어요' },
    ...(localStorage.getItem('loginType') === 'admin' ? [{ path: '/admin', label: '관리', tooltipIndex: null, icon: null, tooltipMsg: null }] : []),
  ]

  return (
    <nav className="flex items-center justify-between px-10 py-5 border-b border-gray-200 bg-white sticky top-0 z-50">
      <Link to="/" className="text-2xl font-bold text-green-900">
        📖 Readpoint
      </Link>

      <div className="flex items-center gap-8">
        {menus.map(({ path, label, tooltipIndex, icon, tooltipMsg }) => (
          <div key={path} className="relative">
            <Link
              to={isLoggedIn ? path : '/auth'}
              className={`text-base font-medium px-4 py-2 rounded-full transition-colors ${
                location.pathname === path
                  ? 'bg-green-900 text-white'
                  : 'text-gray-500 hover:text-green-900'
              }`}
            >
              {label}
            </Link>
            {tooltipIndex !== null && tooltipStep === tooltipIndex && isLoggedIn && (
              <GNBTooltip
                icon={icon}
                message={tooltipMsg}
                onNext={handleTooltipNext}
                onSkip={handleTooltipSkip}
                isLast={false}
              />
            )}
          </div>
        ))}

        <div className="w-px h-5 bg-gray-300" />

        {isLoggedIn ? (
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
            {dropdownOpen && (
              <div className="absolute right-0 top-12 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-400">{user?.email}</p>
                </div>
                <div className="py-1">
                  <button onClick={() => navigate('/profile')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    프로필 관리
                  </button>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50">
                    로그아웃
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
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