import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ePub from 'epubjs'
import { Users, Network, ChevronLeft, ChevronRight } from 'lucide-react'
import { getBookById, getBookRelations, getBookChapters } from '../../api'

function Viewer() {
  const { booksId } = useParams()
  const navigate = useNavigate()
  const viewerRef = useRef(null)
  const renditionRef = useRef(null)
  const bookRef = useRef(null)
  const [toc, setToc] = useState([])
  const [currentHref, setCurrentHref] = useState('')
  const [showPersonPanel, setShowPersonPanel] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [bookInfo, setBookInfo] = useState(null)
  const [persons, setPersons] = useState([])
  const [currentP, setCurrentP] = useState(0)
  const [chapters, setChapters] = useState([])
  // toc랑 매칭해서 href 찾기
  const getHrefByTitle = (title) => {
    const found = toc.find(item =>
      item.label.includes(title) || title.includes(item.label)
    )
    return found?.href
  }


  // 책 정보 가져오기
  useEffect(() => {
    getBookById(booksId)
      .then(data => setBookInfo(data.book))
      .catch(err => console.error(err))
  }, [booksId])

  // currentP 바뀔 때 인물 API 호출
  useEffect(() => {
    if (!booksId || currentP === 0) return
    getBookRelations(booksId, currentP)
      .then(data => setPersons(data.nodes || []))
      .catch(err => console.error(err))
  }, [booksId, currentP])

  useEffect(() => {
    getBookChapters(booksId)
      .then(data => setChapters(data.chapters || []))
      .catch(err => console.error(err))
  }, [booksId])

  // epub 렌더링
  useEffect(() => {
    if (!viewerRef.current || !bookInfo?.epub_blob_path) return

    const book = ePub(bookInfo.epub_blob_path)
    bookRef.current = book

    const rendition = book.renderTo(viewerRef.current, {
      width: '100%',
      height: '100%',
      flow: 'scrolled', // 스크롤 방식
      manager: 'continuous', // 다음 챕터도 세로로 연속해서 렌더링
      allowScriptedContent: true
    })

    renditionRef.current = rendition
    rendition.display()

    book.loaded.navigation.then(nav => {
      setToc(nav.toc)
    })

    let debounceTimer
    rendition.on('locationChanged', (location) => {
      setCurrentHref(location.start.href)
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        const p = location.start.displayed?.page || 0
        setCurrentP(p)
      }, 1000)
    })

    return () => {
      clearTimeout(debounceTimer)
      renditionRef.current = null
      book.destroy()
    }
  }, [bookInfo])

  const goToChapter = (href) => renditionRef.current?.display(href)

  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* 목차 */}
      <div className="w-52 border-r border-gray-200 bg-gray-50 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <p className="text-xs text-gray-400 font-semibold">목차</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {chapters.length > 0 ? (
            chapters.map((chapter) => (
              <button
                key={chapter.chapter_id}
                onClick={() => {
                  const href = getHrefByTitle(chapter.title)
                  if (href) goToChapter(href)
                }}
                className="w-full text-left text-xs py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors mb-1 text-gray-600"
              >
              {chapter.title}
            </button>
          ))
        ) : (
        toc.map((item, i) => (
          <button
            key={i}
            onClick={() => goToChapter(item.href)}
            className={`w-full text-left text-xs py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors mb-1 ${
              currentHref === item.href
                ? 'bg-green-100 text-green-900 font-semibold'
                : 'text-gray-600'
            }`}
          >
            {item.label}
          </button>
        ))
      )}
    </div>
  </div>
      

      {/* 본문 */}
      <div className="flex-1 flex flex-col">
        {/* 상단 바 */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
          <button
            onClick={() => navigate('/library')}
            className="text-sm text-green-800 font-semibold hover:text-green-600 flex items-center gap-1"
          >
            <ChevronLeft size={16} />
            서재
          </button>
          <p className="text-sm text-gray-500 font-medium">{bookInfo?.title || '로딩 중...'}</p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowPersonPanel(!showPersonPanel)}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                showPersonPanel ? 'text-green-900' : 'text-gray-400 hover:text-green-900'
              }`}
            >
              <Users size={16} />
              인물
            </button>
            <button
              onClick={() => navigate(`/graph?bookId=${booksId}`)}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-green-900 transition-colors"
            >
              <Network size={16} />
              관계도
            </button>
          </div>
        </div>

        {/* epub 렌더링 영역 */}
        <div className="flex flex-1 overflow-hidden">
          <div ref={viewerRef} className="flex-1 overflow-y-auto h-full" />

          {/* 인물 패널 */}
          {showPersonPanel && (
            <div className="w-80 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <p className="text-xs text-gray-400 font-semibold">등장 인물</p>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {persons.length === 0 ? (
                  <p className="text-xs text-gray-400 p-3">인물 데이터 준비 중...</p>
                ) : (
                  persons.map(person => (
                    <button
                      key={person.id}
                      onClick={() => setSelectedPerson(selectedPerson?.id === person.id ? null : person)}
                      className={`w-full text-left p-3 rounded-xl mb-2 transition-colors ${
                        selectedPerson?.id === person.id
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-900 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {person.name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{person.name}</p>
                          <p className="text-xs text-gray-400">{person.role}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Viewer