import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Search, ShieldAlert, Settings } from 'lucide-react'

function AdminLayout({ children }) {
  const location = useLocation()

  const menus = [
    { path: '/admin', label: '대시보드', icon: <LayoutDashboard size={18} /> },
    { path: '/admin/review', label: '검수', icon: <Search size={18} /> },
    // { path: '/admin/spoiler', label: '스포일러 검증', icon: <ShieldAlert size={18} /> },
    { path: '/admin/settings', label: '설정', icon: <Settings size={18} /> },
  ]

  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* 사이드바 */}
      <div className="w-60 border-r border-gray-200 bg-gray-50 flex flex-col">
        <div className="p-6">
          <p className="text-xs text-gray-400 font-semibold mb-4">관리자 페이지</p>
          <nav className="space-y-1">
            {menus.map(menu => (
              <Link
                key={menu.path}
                to={menu.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  location.pathname === menu.path
                    ? 'bg-green-900 text-white'
                    : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                {menu.icon}
                {menu.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 overflow-y-auto px-10 py-8">
        {children}
      </div>
    </div>
  )
}

export default AdminLayout