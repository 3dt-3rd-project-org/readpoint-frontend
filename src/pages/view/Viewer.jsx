import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import ePub from 'epubjs'
import { Users, Network, ChevronLeft, ChevronRight, Bookmark } from 'lucide-react' // Bookmark 아이콘 추가
import { 
  getBookById, 
  getBookRelations, 
  getBookChapters, 
  getBookmarkByUserId, // 추가
  saveBookmarkByUserId // 추가
} from '../../api'

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

  const location = useLocation()
  const resumeChapterOrder = location.state?.resumeChapterOrder

  const chaptersRef = useRef([])
  const tocRef = useRef([])
  
  // 📍 이어서 보기를 위해 최초 1회만 위치 이동 처리를 하기 위한 플래그 ref
  const initialLocationSetRef = useRef(false)

  const getHrefByTitle = (title) => {
    const found = toc.find(item =>
      item.label.includes(title) || title.includes(item.label)
    )
    return found?.href
  }
  const [showFontPanel, setShowFontPanel] = useState(false)
  const [fontSize, setFontSize] = useState(100)
  // 다른 ref들과 함께 상단에 선언
const hrefToChapterRef = useRef({})

  const changeFontSize = (delta) => {
    const newSize = Math.min(150, Math.max(70, fontSize + delta))
    setFontSize(newSize)
     renditionRef.current?.themes.fontSize(`${newSize}%`)
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
       .then(data => {
         setChapters(data.chapters || [])
         chaptersRef.current = data.chapters || []
       })
      .catch(err => console.error(err))
  }, [booksId])


useEffect(() => {
  if (!viewerRef.current || !bookInfo?.epub_blob_path) return

  const book = ePub(bookInfo.epub_blob_path)
  bookRef.current = book

  const rendition = book.renderTo(viewerRef.current, {
    width: '100%',
    height: '100%',
    flow: 'scrolled',
    manager: 'continuous',
    allowScriptedContent: true
  })

  renditionRef.current = rendition

  // 📍 1. spine + DB chapters 매핑 완료 후 북마크 이동
  book.loaded.navigation.then(async nav => {
    setToc(nav.toc)
    tocRef.current = nav.toc

    const spineItems = []
    book.spine.each(item => spineItems.push(item.href))

    const flatToc = nav.toc.flatMap(item =>
      item.subitems?.length ? item.subitems : [item]
    )

    const hrefToChapter = {}

    chaptersRef.current.forEach(chapter => {
      const matched = flatToc.find(tocItem =>
        tocItem.label?.trim() === chapter.title?.trim()
      )
      if (matched) {
        const hrefKey = matched.href?.split('#')[0]
        hrefToChapter[hrefKey] = chapter
      }
    })

    const mappedHrefs = new Set(Object.keys(hrefToChapter))
    const unmappedChapters = [...chaptersRef.current]
      .sort((a, b) => a.chapter_order - b.chapter_order)
      .filter(ch => !Object.values(hrefToChapter).includes(ch))

    const unmappedSpines = spineItems.filter(href => !mappedHrefs.has(href))
    unmappedSpines.forEach((href, i) => {
      if (unmappedChapters[i]) hrefToChapter[href] = unmappedChapters[i]
    })

    console.log('✅ href → chapter 매핑 결과:', hrefToChapter)
    hrefToChapterRef.current = hrefToChapter

    // 📍 2. 매핑 완료 후 북마크 조회 및 이동
    try {
      const res = await getBookmarkByUserId(booksId)
      const targetOrder = resumeChapterOrder || res?.chapter_order

      console.log('📍 targetOrder:', targetOrder)

      if (targetOrder && !initialLocationSetRef.current) {
        const entry = Object.entries(hrefToChapterRef.current)
          .find(([, ch]) => Number(ch.chapter_order) === Number(targetOrder))

        const href = entry?.[0]
        console.log('📍 찾은 href:', href)

        if (href) {
          initialLocationSetRef.current = true
          rendition.display(href)
          return
        }
      }
      rendition.display()
    } catch (err) {
      console.error('북마크 조회 실패:', err)
      rendition.display()
    }
  })

  // 📍 3. 위치 변경 감지 + 북마크 자동 저장
  let debounceTimer
  rendition.on('locationChanged', (location) => {
    const cfiString = location.start
    const currentHref = location.href?.split('#')[0]

    setCurrentHref(location.href)

    const paragraphMatch = cfiString.match(/!\/4\/(\d+)/)
    const paragraph = paragraphMatch ? parseInt(paragraphMatch[1]) / 2 : 0

    const chapter = hrefToChapterRef.current?.[currentHref]

    console.log('📍 현재 위치:', {
      href: currentHref,
      chapter_order: chapter?.chapter_order,
      chapter_title: chapter?.title,
      paragraph,
    })

    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      const p = location.start.displayed?.page || 0
      setCurrentP(p)

      if (chapter && booksId) {
        saveBookmarkByUserId(booksId, chapter.chapter_order, paragraph)
          .then(() => console.log('북마크 자동 저장 완료'))
          .catch(err => console.error('북마크 저장 실패:', err))
      }
    }, 5000)
  })

  return () => {
    clearTimeout(debounceTimer)
    renditionRef.current = null
    book.destroy()
  }
}, [bookInfo, booksId])
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
          {/* 왼쪽 */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/library')}
              className="text-sm text-green-800 font-semibold hover:text-green-600 flex items-center gap-1"
            >
              <ChevronLeft size={16} />
              서재
            </button>
          </div>

          {/* 가운데 */}
          <p className="text-sm text-gray-500 font-medium">{bookInfo?.title || '로딩 중...'}</p>

          {/* 오른쪽 */}
          <div className="flex items-center gap-4">
            {/* Aa 버튼 */}
            <div className="relative">
              <button
                onClick={() => setShowFontPanel(!showFontPanel)}
                className={`text-sm font-bold transition-colors ${
                  showFontPanel ? 'text-green-900' : 'text-gray-400 hover:text-green-900'
                }`}
              >
                Aa
              </button>
              {showFontPanel && (
                <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-44 z-50">
                  <p className="text-xs text-gray-400 mb-3">글씨 크기</p>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => changeFontSize(-10)}
                      className="w-8 h-8 rounded-full border border-gray-200 text-gray-400 hover:bg-gray-50 font-bold text-xs"
                    >
                      가
                    </button>
                    <span className="text-xs text-gray-500">{fontSize}%</span>
                    <button
                      onClick={() => changeFontSize(10)}
                      className="w-8 h-8 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-sm"
                    >
                      가
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowPersonPanel(!showPersonPanel)}
              className={`text-sm font-semibold flex items-center gap-1 transition-colors ${
                showPersonPanel ? 'text-green-900' : 'text-gray-500 hover:text-green-900'
              }`}
            >
              <Users size={16} />
              인물
            </button>
            <button
              onClick={() => navigate(`/graph?bookId=${booksId}`)}
              className="text-sm text-gray-500 font-semibold flex items-center gap-1 hover:text-green-900 transition-colors"
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