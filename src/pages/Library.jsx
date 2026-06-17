import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Search, Network, MapPin, FileText, ChevronRight, Star } from 'lucide-react'
import { getBooks, getAllBooks, getBookChapters, getSummaryByUserId  } from '../api'

const TOOLTIP_STEPS = [
  {
    id: 'book-card',
    icon: <BookOpen size={14} />,
    message: '책을 클릭하면 이어읽기 패널이 열려요',
  },
  {
    id: 'explore-tab',
    icon: <Search size={14} />,
    message: '여기서 원하는 책을 검색할 수 있어요',
  },
]

function Tooltip({ icon, message, onNext, onSkip, isLast, position = 'top' }) {
  return (
    <div className={`absolute z-50 bg-gray-900 text-white text-xs rounded-xl px-4 py-3 shadow-lg w-56 left-1/2 -translate-x-1/2 ${
      position === 'top' ? '-top-20' : '-bottom-20'
    }`}>
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
      <div className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 rotate-45 ${
        position === 'top' ? '-bottom-1.5' : '-top-1.5'
      }`} />
    </div>
  )
}

function Library() {
  const [books, setBooks] = useState([])
  const [selectedBook, setSelectedBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [allBooks, setAllBooks] = useState([])
  const [tab, setTab] = useState('shelf')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchType, setSearchType] = useState('title')
  const [expandSummary, setExpandSummary] = useState(false)
  const [tooltipStep, setTooltipStep] = useState(() => {
    if (localStorage.getItem('onboardingDone')) return null
    const saved = localStorage.getItem('tooltipStep')
    return saved !== null ? parseInt(saved) : null
  })
  const [summary, setSummary] = useState(null)

  const navigate = useNavigate()

  useEffect(() => {
    getAllBooks().then(data => setAllBooks(data.books || []))
  }, [])

  const fetchBooks = useCallback(async () => {
  try {
    const data = await getBooks()
    const bookList = data.books || []
    const booksWithProgress = await Promise.all(
      bookList.map(async book => {
        try {
          const chaptersData = await getBookChapters(book.books_id)
          const chapterList = chaptersData.chapters || []
          const totalChapters = chapterList.length || 1
          const progress = book.last_read_chapter_order
            ? Math.round((book.last_read_chapter_order / totalChapters) * 100)
            : 0
          const matchedChapter = chapterList.find(
            ch => Number(ch.chapter_order) === Number(book.last_read_chapter_order)
          )
          const lastChapterName = matchedChapter
            ? matchedChapter.title
            : (book.last_read_chapter_order ? `${book.last_read_chapter_order}화` : '기록 없음')
          return { ...book, progress, lastChapter: lastChapterName }
        } catch (err) {
          console.error("챕터 매핑 실패:", err)
          return { ...book, progress: 0, lastChapter: '기록 없음' }
        }
      })
    )
    setBooks(booksWithProgress)
    setLoading(false)
  } catch (err) {
    console.error(err)
    setLoading(false)
  }
}, [])

useEffect(() => {
  fetchBooks()
  window.addEventListener('focus', fetchBooks)
  return () => window.removeEventListener('focus', fetchBooks)
}, [fetchBooks])

useEffect(() => {
  if (!selectedBook) return
  getSummaryByUserId(
    selectedBook.books_id,
    selectedBook.last_read_chapter_id,
    selectedBook.last_read_paragraph_id
  )
    .then(data => setSummary(data.summary || '요약 정보가 없습니다.'))
    .catch(() => setSummary('요약 정보가 없습니다.'))
}, [selectedBook])


  const handleTooltipNext = () => {
    if (tooltipStep >= TOOLTIP_STEPS.length + 1) {
      localStorage.setItem('onboardingDone', 'true')
      localStorage.removeItem('tooltipStep')
      setTooltipStep(null)
    } else {
      const next = (tooltipStep ?? 2) + 1
      localStorage.setItem('tooltipStep', next)
      setTooltipStep(next)
    }
  }

  const handleTooltipSkip = () => {
    localStorage.setItem('onboardingDone', 'true')
    localStorage.removeItem('tooltipStep')
    setTooltipStep(null)
  }

  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem('tooltipStep')
      if (saved !== null) setTooltipStep(parseInt(saved))
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const filteredBooks = allBooks.filter(book => {
    if (!searchTerm) return true
    if (searchType === 'title') return book.title?.toLowerCase().includes(searchTerm.toLowerCase())
    if (searchType === 'author') return book.author?.toLowerCase().includes(searchTerm.toLowerCase())
    return true
  })

  useEffect(() => {
    const handler = (e) => setTooltipStep(e.detail)
    window.addEventListener('tooltipStepChange', handler)
    return () => window.removeEventListener('tooltipStepChange', handler)
  }, [])

  if (loading) return <div className="p-10 text-gray-400 text-center">로딩 중...</div>

  return (
    <div className="flex">
      <div className={`transition-all duration-300 ${selectedBook ? 'w-[calc(100%-500px)]' : 'w-full'} px-24 py-10`}>

        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-6">
            <button
              onClick={() => { setTab('shelf'); setSearchTerm('') }}
              className={`text-lg font-bold transition-colors ${tab === 'shelf' ? 'text-gray-900' : 'text-gray-300 hover:text-gray-500'}`}
            >
              나의 서재
            </button>
            <div className="relative">
              <button
                onClick={() => setTab('explore')}
                className={`text-lg font-bold transition-colors ${tab === 'explore' ? 'text-gray-900' : 'text-gray-300 hover:text-gray-500'}`}
              >
                책 찾기
              </button>
              {tooltipStep === 3 && (
                <Tooltip
                  icon={TOOLTIP_STEPS[1].icon}
                  message={TOOLTIP_STEPS[1].message}
                  onNext={handleTooltipNext}
                  onSkip={handleTooltipSkip}
                  isLast={true}
                  position="bottom"
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {tab === 'explore' && (
              <>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="border border-gray-200 rounded-full px-3 py-2 text-sm text-gray-600 outline-none focus:border-green-700"
                >
                  <option value="title">제목</option>
                  <option value="author">저자</option>
                </select>
                <input
                  type="text"
                  placeholder="검색어를 입력하세요"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-green-700 w-64"
                />
              </>
            )}
          </div>
        </div>

        {tab === 'shelf' && (
          <>
            <p className="text-gray-500 text-sm mb-8">현재 읽고 있는 책</p>
            {books.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-400 text-sm mb-3">아직 읽고 있는 책이 없어요</p>
                <button onClick={() => setTab('explore')} className="text-green-900 font-semibold text-sm hover:underline">
                  책 찾기 →
                </button>
              </div>
            ) : (
              <BookGrid
                books={books}
                selectedBook={selectedBook}
                setSelectedBook={setSelectedBook}
                tooltipStep={tooltipStep}
                handleTooltipNext={handleTooltipNext}
                handleTooltipSkip={handleTooltipSkip}
              />
            )}
          </>
        )}

        {tab === 'explore' && (
          <>
            <p className="text-gray-500 text-sm mb-8">총 {filteredBooks.length}권</p>
            {filteredBooks.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-400 text-sm">검색 결과가 없습니다.</p>
              </div>
            ) : (
              <BookGrid
                books={filteredBooks}
                selectedBook={selectedBook}
                setSelectedBook={setSelectedBook}
                tooltipStep={tooltipStep}
                handleTooltipNext={handleTooltipNext}
                handleTooltipSkip={handleTooltipSkip}
              />
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {selectedBook && (() => {
          const sideHasCover = selectedBook.cover_url && selectedBook.cover_url.trim() !== ""
          return (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-16 w-[500px] h-[calc(100vh-64px)] bg-white border-l border-gray-200 shadow-xl z-40 overflow-y-auto"
            >
              <div className="h-1.5 bg-green-500 w-full" />
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-sm text-gray-500 font-semibold">이어읽기</span>
                  <button onClick={() => setSelectedBook(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>
                <div
                  className="w-full h-52 rounded-xl flex flex-col justify-end p-6 mb-6 relative overflow-hidden"
                  style={{
                    backgroundColor: sideHasCover ? 'transparent' : '#1A3C2E',
                    backgroundImage: sideHasCover ? `url(${selectedBook.cover_url})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  {sideHasCover && <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />}
                  {!sideHasCover && (
                    <div className="relative z-10">
                      <h2 className="text-white text-2xl font-bold">{selectedBook.title}</h2>
                      <p className="text-white/70 mt-1">{selectedBook.author}</p>
                    </div>
                  )}
                </div>
                <div className="border-t border-gray-100 pt-5 mb-5">
                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                    <MapPin size={12} /> 현재 위치
                  </p>
                  <p className="text-lg font-bold text-gray-900">{selectedBook.lastChapter || '기록 없음'}</p>
                </div>
                <div className="bg-gray-100 rounded-full h-1.5 mb-2">
                  <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${selectedBook.progress || 0}%` }} />
                </div>
                <p className="text-xs text-gray-400 mb-5">{selectedBook.progress || 0}% · 마지막 독서: 최근</p>
                <div className="border-t border-gray-100 pt-5 mb-6">
                  <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                    <FileText size={12} /> 줄거리 요약
                  </p>
                  <p className={`text-sm text-gray-700 leading-relaxed ${expandSummary ? '' : 'line-clamp-5'}`}>
                    {summary || '요약 정보가 없습니다.'}
                  </p>
                  {summary && summary.length > 200 && (
                    <button
                      onClick={() => setExpandSummary(!expandSummary)}
                      className="text-xs text-green-800 font-semibold mt-1 hover:underline"
                    >
                      {expandSummary ? '접기' : '더 보기'}
                    </button>
                  )}
                </div>
                <div className="flex gap-3 mb-3">
                    <button
                      onClick={() => navigate(`/viewer/${selectedBook.books_id}`, { 
                        state: { 
                          book: selectedBook,
                          resumeChapterOrder: selectedBook.last_read_chapter_order
                        } 
                      })}
                      className="flex-1 bg-green-900 text-white rounded-full py-3 font-semibold hover:bg-green-800 transition-colors"
                    >
                      이어읽기
                    </button>
                  <button
                    onClick={() => navigate(`/viewer/${selectedBook.books_id}`)}
                    className="flex-1 border border-gray-300 text-gray-600 rounded-full py-3 hover:bg-gray-50 transition-colors"
                  >
                    처음부터
                  </button>
                </div>
                <button
                  onClick={() => navigate(`/graph?bookId=${selectedBook.books_id}`)}
                  className="w-full border border-green-800 text-green-800 rounded-full py-3 text-sm font-medium hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Network size={16} /> 관계도 보기
                </button>
              </div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}

function BookGrid({ books, selectedBook, setSelectedBook, tooltipStep, handleTooltipNext, handleTooltipSkip }) {
  return (
    <div className="flex gap-10 flex-wrap">
      {books.map((book, idx) => {
        const hasCover = book.cover_url && book.cover_url.trim() !== ""
        return (
          <div key={book.books_id} className="relative">
              {/* 완독 뱃지 */}
              {book.progress >= 85 && (
                <div className="absolute top-3 right-3 z-10 bg-emerald-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Star size={15} fill="white" />
                  완독
                </div>
              )}
            {tooltipStep === 2 && idx === 0 && (
              <Tooltip
                icon={<BookOpen size={14} />}
                message="책을 클릭하면 이어읽기 패널이 열려요"
                onNext={handleTooltipNext}
                onSkip={handleTooltipSkip}
                isLast={false}
                position="top"
              />
            )}
            <div
              onClick={() => setSelectedBook(book)}
              className={`w-80 rounded-2xl border overflow-hidden cursor-pointer hover:shadow-lg transition-all ${
                selectedBook?.books_id === book.books_id ? 'border-green-500 shadow-lg' : 'border-gray-200'
              }`}
            >
              <div
                className="h-60 p-6 flex flex-col justify-end relative overflow-hidden"
                style={{
                  backgroundColor: hasCover ? 'transparent' : '#1A3C2E',
                  backgroundImage: hasCover ? `url(${book.cover_url})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {hasCover && <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />}
                {!hasCover && (
                  <div className="relative z-10">
                    <h2 className="text-white text-xl font-bold line-clamp-2">{book.title}</h2>
                    <p className="text-white/70 text-sm mt-2">{book.author}</p>
                  </div>
                )}
              </div>
              <div className="p-5">
                <p className="font-bold text-gray-900 line-clamp-1">{book.title}</p>
                <p className="text-gray-500 text-sm mt-1 mb-3">{book.author}</p>
                <div className="bg-gray-200 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${book.progress || 0}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {book.progress !== undefined ? `${book.progress}%` : '0%'}
                  {book.lastChapter && ` · 마지막: ${book.lastChapter}`}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default Library