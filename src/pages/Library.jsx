import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getBooks } from '../api'

function Library() {
  const [books, setBooks] = useState([])
  const [selectedBook, setSelectedBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getBooks()
      .then(data => {
        setBooks(data.books || [])  
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="p-10 text-gray-400 text-center">로딩 중...</div>


  return (
    <div className="flex">
      {/* 서재 메인 */}
      <div className={`transition-all duration-300 ${selectedBook ? 'w-[calc(100%-500px)]' : 'w-full'} px-24 py-10`}>
        <h1 className="text-2xl font-bold text-gray-900">나의 서재</h1>
        <p className="text-gray-500 mt-2 text-sm">현재 읽고 있는 책</p>

        <div className="flex gap-10 mt-8 flex-wrap">
          {books.map(book => {
            const hasCover = book.cover_url && book.cover_url.trim() !== "";

              return (
                <div
                  key={book.books_id}
                  onClick={() => setSelectedBook(book)}
                  className={`w-80 rounded-2xl border overflow-hidden cursor-pointer hover:shadow-lg transition-all ${
                    selectedBook?.books_id === book.books_id
                      ? 'border-green-500 shadow-lg'
                      : 'border-gray-200'
                  }`}
                >
                  {/* 표지 */}
                  <div
                    className="h-60 p-6 flex flex-col justify-end relative overflow-hidden"
                    style={{
                      backgroundColor: book.cover_url ? 'transparent' : '#1A3C2E',
                      backgroundImage: book.cover_url ? `url(${book.cover_url})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    {/* 표지 이미지가 있을 때만 어두운 오버레이를 씌웁니다 */}
                    {hasCover && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    )}

                    {/* 이미지가 없을 때만 표지 내부에 하얀 글씨로 제목을 보여줍니다 (선택 사항) */}
                    {!hasCover && (
                      <div className="relative z-10">
                        <h2 className="text-white text-xl font-bold line-clamp-2">{book.title}</h2>
                        <p className="text-white/70 text-sm mt-2">{book.author}</p>
                      </div>
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="p-5">
                    <p className="font-bold text-gray-900 line-clamp-1">{book.title}</p>
                    <p className="text-gray-500 text-sm mt-1 mb-3">{book.author}</p>

                    {/* 진도율 바 */}
                    <div className="bg-gray-200 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-green-500"
                        style={{ width: `${book.progress || 0}%` }}
                      />
                    </div>
                    
                    {/* 조건부 렌더링으로 데이터가 있을 때만 올바르게 출력 */}
                    <p className="text-xs text-gray-500 mt-2">
                      {book.progress !== undefined ? `${book.progress}%` : '0%'} 
                      {book.lastChapter && ` · 마지막: ${book.lastChapter}`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      {/* 이어읽기 카드 (우측 슬라이드) */}
      <AnimatePresence>
        {selectedBook && (() => {
          // selectedBook 전용 커버 검사 로직
          const sideHasCover = selectedBook.cover_url && selectedBook.cover_url.trim() !== "";

          return (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-16 w-[500px] h-[calc(100vh-64px)] bg-white border-l border-gray-200 shadow-xl z-40 overflow-y-auto"
            >
              {/* 상단 초록 띠 */}
              <div className="h-1.5 bg-green-500 w-full" />

              <div className="p-8">
                {/* 닫기 버튼 */}
                <div className="flex justify-between items-center mb-6">
                  <span className="text-sm text-gray-500 font-semibold">이어읽기</span>
                  <button
                    onClick={() => setSelectedBook(null)}
                    className="text-gray-400 hover:text-gray-600 text-xl"
                  >
                    ✕
                  </button>
                </div>

              {/* 우측 사이드바 표지 (메인 표지 로직과 동기화) */}
                <div
                  className="w-full h-52 rounded-xl flex flex-col justify-end p-6 mb-6 relative overflow-hidden"
                  style={{ 
                    backgroundColor: sideHasCover ? 'transparent' : '#1A3C2E',
                    backgroundImage: sideHasCover ? `url(${selectedBook.cover_url})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  {sideHasCover && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              )}
                  
                  {!sideHasCover && (
                    <div className="relative z-10">
                      <h2 className="text-white text-2xl font-bold">{selectedBook.title}</h2>
                      <p className="text-white/70 mt-1">{selectedBook.author}</p>
                    </div>
                  )}
                </div>

                {/* 현재 위치 */}
                <div className="border-t border-gray-100 pt-5 mb-5">
                  <p className="text-xs text-gray-400 mb-1">📍 현재 위치</p>
                  <p className="text-lg font-bold text-gray-900">{selectedBook.lastChapter || '기록 없음'}</p>
                </div>

                {/* 진도 */}
                <div className="bg-gray-100 rounded-full h-1.5 mb-2">
                  <div
                    className="h-1.5 rounded-full bg-green-500"
                    style={{ width: `${selectedBook.progress || 0}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mb-5">{selectedBook.progress || 0}%  ·  마지막 독서: 최근</p>

                {/* 줄거리 요약 */}
                <div className="border-t border-gray-100 pt-5 mb-6">
                  <p className="text-xs text-gray-400 mb-2">📝 줄거리 요약</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{selectedBook.summary || '요약 정보가 없습니다.'}</p>
                </div>

                {/* 버튼 */}
                <div className="flex gap-3 mb-3">
                  <button 
                    onClick={() => navigate(`/viewer/${selectedBook.books_id}`, { 
                      state: { book: selectedBook } 
                    })}
                    className="flex-1 bg-green-900 text-white rounded-full py-3 font-semibold hover:bg-green-800 transition-colors">
                    이어읽기
                  </button>
                  <button 
                    onClick={() => navigate(`/viewer/${selectedBook.books_id}`)}
                    className="flex-1 bg-gray-100 text-gray-500 rounded-full py-3 hover:bg-gray-200 transition-colors">
                    처음부터
                  </button>
                </div>
                <button onClick={() => navigate(`/graph?bookId=${selectedBook.books_id}`)}
                  className="w-full border border-green-800 text-green-800 rounded-full py-3 text-sm font-medium hover:bg-green-50 transition-colors">
                  📊 관계도 보기
                </button>
              </div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}

export default Library