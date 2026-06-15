import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Library from './pages/Library'
import Graph from './pages/Graph'
import GNB from './components/GNB'
import Auth from './pages/auth/Auth'
import Viewer from './pages/view/Viewer'
import Dashboard from './pages/admin/Dashboard'
import Spoiler from './pages/admin/Spoiler'
import Review from './pages/admin/Review'
import AdminLayout from './components/AdminLayout'
import Callback from './pages/auth/Callback'
import Profile from './pages/profile'
import Summary from './pages/admin/Summary'

function App() {
  return (
    <BrowserRouter>
      <GNB />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/library" element={<Library />} />
        <Route path="/viewer/:booksId" element={<Viewer />} />
        <Route path="/graph" element={<Graph />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/auth/callback" element={<Callback />} />
        <Route path="/admin" element={<AdminLayout><Dashboard /></AdminLayout>} />
        <Route path="/admin/review" element={<AdminLayout><Review /></AdminLayout>} />
        <Route path="/admin/spoiler" element={<AdminLayout><Spoiler /></AdminLayout>} />
        <Route path="/admin/summary" element={<AdminLayout><Summary /></AdminLayout>} />
        <Route path="/admin/settings" element={<AdminLayout><div className="p-8"><h1 className="text-xl font-bold">설정</h1></div></AdminLayout>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App