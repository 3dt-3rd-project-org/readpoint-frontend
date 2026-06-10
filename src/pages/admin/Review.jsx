import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getAdminBooks } from '../../api'

const MOCK_CHARACTERS = [
  { id: 1, name: '싱클레어', role: '화자/주인공', chapter: '제1장', desc: '내면 성장을 겪는 주인공', isDup: false },
  { id: 2, name: '데미안', role: '정신적 스승', chapter: '제1장', desc: '카인의 표식을 지닌 자', isDup: false },
  { id: 3, name: '막스 데미안', role: '정신적 스승', chapter: '제1장', desc: '싱클레어의 친구', isDup: true },
  { id: 4, name: '베아트리체', role: '이상화된 여인', chapter: '제4장', desc: '싱클레어가 동경하는 소녀', isDup: false },
  { id: 5, name: '에바 부인', role: '정신적 어머니', chapter: '제7장', desc: '데미안의 어머니', isDup: false },
]

const TABS = ['인물', '관계', '사건']

function Review() {
  const [books, setBooks] = useState([])  
  const [selectedBook, setSelectedBook] = useState(null)
  const [activeTab, setActiveTab] = useState('인물')
  const [characters, setCharacters] = useState(MOCK_CHARACTERS)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  const handleEdit = (char) => {
    setEditingId(char.id)
    setEditForm({ name: char.name, role: char.role, desc: char.desc })
  }

  const handleSave = (id) => {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, ...editForm } : c))
    setEditingId(null)
  }

  const handleMerge = (id) => {
    // 중복 인물 병합 - 일단 삭제로 처리
    setCharacters(prev => prev.filter(c => c.id !== id))
  }

  useEffect(() => {
      getAdminBooks()
        .then(data => setBooks(data.books || []))
        .catch(err => console.error(err))
    }, [])

  if (!selectedBook) {
    return (
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">데이터 검수</h1>
        <p className="text-gray-400 text-sm mb-8">책을 선택해서 추출된 데이터를 검수하세요</p>
        <div className="flex gap-6">
          {books.map(book => (   // API에서 받아온 책 목록으로 렌더링
            <div
              key={book.books_id}
              onClick={() => setSelectedBook(book)}
              className="w-40 h-52 rounded-xl overflow-hidden cursor-pointer hover:opacity-80 transition-opacity flex items-end"
              style={{
                    backgroundImage: book.cover_url ? `url(${book.cover_url})` : 'none',
                    backgroundColor: '#1A3C2E',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                    }}
              >
                <p className="text-white font-bold text-sm p-4">{book.title}</p>
              </div>
        ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setSelectedBook(null)}
          className="text-sm text-green-800 font-semibold hover:text-green-600"
        >
          ← 책 목록
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          {selectedBook.title} — 데이터 검수
        </h1>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-6">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-green-900 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 인물 탭 */}
      {activeTab === '인물' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* 테이블 헤더 */}
          <div className="grid grid-cols-5 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400">
            <span>인물명</span>
            <span>역할</span>
            <span>첫 등장</span>
            <span>설명</span>
            <span>액션</span>
          </div>

          {/* 테이블 행 */}
          {characters.map((char, i) => (
            <div
              key={char.id}
              className={`grid grid-cols-5 px-5 py-4 items-center text-sm ${
                char.isDup ? 'bg-yellow-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
              } ${i !== characters.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              {editingId === char.id ? (
                <>
                  <input
                    value={editForm.name}
                    onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                    className="border border-gray-300 rounded px-2 py-1 text-xs"
                  />
                  <input
                    value={editForm.role}
                    onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}
                    className="border border-gray-300 rounded px-2 py-1 text-xs"
                  />
                  <span className="text-gray-400">{char.chapter}</span>
                  <input
                    value={editForm.desc}
                    onChange={e => setEditForm(p => ({ ...p, desc: e.target.value }))}
                    className="border border-gray-300 rounded px-2 py-1 text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(char.id)}
                      className="px-3 py-1 bg-green-900 text-white text-xs rounded-full"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full"
                    >
                      취소
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className={`font-medium ${char.isDup ? 'text-yellow-700' : 'text-gray-900'}`}>
                    {char.name}
                    {char.isDup && <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">중복의심</span>}
                  </span>
                  <span className="text-gray-500">{char.role}</span>
                  <span className="text-gray-400">{char.chapter}</span>
                  <span className="text-gray-500 text-xs">{char.desc}</span>
                  <div className="flex gap-2">
                    {char.isDup && (
                      <button
                        onClick={() => handleMerge(char.id)}
                        className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full hover:bg-yellow-200"
                      >
                        병합
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(char)}
                      className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full hover:bg-gray-200"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(char.id)}
                      className="px-3 py-1 bg-red-50 text-red-400 text-xs rounded-full hover:bg-red-100"
                    >
                      삭제
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 관계 탭 */}
      {activeTab === '관계' && (
        <div className="text-gray-400 text-sm">관계 데이터 준비 중입니다.</div>
      )}

      {/* 사건 탭 */}
      {activeTab === '사건' && (
        <div className="text-gray-400 text-sm">사건 데이터 준비 중입니다.</div>
      )}
    </div>
  )
}

export default Review