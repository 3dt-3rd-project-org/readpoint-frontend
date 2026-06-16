import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import ePub from 'epubjs'
import { Users, Network, ChevronLeft } from 'lucide-react'
import { 
  getBookById, 
  getBookRelations, 
  getBookChapters, 
  getBookmarkByUserId,
  saveBookmarkByUserId
} from '../../api'

function Viewer() {
  const { booksId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const resumeChapterOrder = location.state?.resumeChapterOrder

  const viewerRef = useRef(null)
  const renditionRef = useRef(null)
  const bookRef = useRef(null)
  const chaptersRef = useRef([])
  const tocRef = useRef([])
  const initialLocationSetRef = useRef(false)
  const hrefToChapterRef = useRef({})
  
  const booksIdRef = useRef(booksId)
  const resumeChapterOrderRef = useRef(resumeChapterOrder)
  const setCurrentPRef = useRef(null)
  
  // 💡 [핵심] Strict Mode 등으로 인해 이중 마운트될 때, 
  // 이미 로딩이 시작된 epub 경로를 기억하여 중복 생성을 원천 차단하는 플래그
  const isInitializingRef = useRef(null)

  const [toc, setToc] = useState([])
  const [currentHref, setCurrentHref] = useState('')
  const [showPersonPanel, setShowPersonPanel] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [bookInfo, setBookInfo] = useState(null)
  const [persons, setPersons] = useState([])
  const [currentP, setCurrentP] = useState(0)
  const [chapters, setChapters] = useState([])
  const [showFontPanel, setShowFontPanel] = useState(false)
  const [fontSize, setFontSize] = useState(100)

  useEffect(() => { booksIdRef.current = booksId }, [booksId])
  useEffect(() => { resumeChapterOrderRef.current = resumeChapterOrder }, [resumeChapterOrder])
  useEffect(() => { setCurrentPRef.current = setCurrentP })

  const getHrefByTitle = (title) => {
    const found = toc.find(item =>
      item.label.includes(title) || title.includes(item.label)
    )
    return found?.href
  }

  const changeFontSize = (delta) => {
    const newSize = Math.min(150, Math.max(70, fontSize + delta))
    setFontSize(newSize)
    renditionRef.current?.themes.fontSize(`${newSize}%`)
  }

  // 1. 데이터 로드부들
  useEffect(() => {
    getBookById(booksId)
      .then(data => setBookInfo(data.book))
      .catch(err => console.error(err))
  }, [booksId])

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

  // 2. Epub 렌더링 엔진 초기화
  const epubUrl = bookInfo?.epub_blob_path;
  useEffect(() => {
    if (!viewerRef.current || !epubUrl) return

    // 💡 이미 같은 책이 초기화 중이거나 완료되었다면 절대 중복해서 생성하지 않습니다.
    if (isInitializingRef.current === epubUrl) return
    isInitializingRef.current = epubUrl

    // 만약 이전 인스턴스가 남아있다면 안전하게 비워줍니다.
    if (viewerRef.current) {
      viewerRef.current.innerHTML = '';
    }

    let destroyed = false
    const book = ePub(epubUrl)
    bookRef.current = book

    const rendition = book.renderTo(viewerRef.current, {
      width: '100%',
      height: '100%',
      flow: 'scrolled',
      manager: 'continuous',
      allowScriptedContent: true
    })
    renditionRef.current = rendition

    // 모든 리소스가 비동기적으로 로드 및 준비가 끝난 후 UI 조작 시작
    book.ready.then(async () => {
      if (destroyed) return

      const nav = book.navigation
      setToc(nav.toc || [])
      tocRef.current = nav.toc || []

      const spineItems = []
      book.spine.each(item => spineItems.push(item.href))

      const flatToc = (nav.toc || []).flatMap(item =>
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

      hrefToChapterRef.current = hrefToChapter

      // 기존 북마크 정보 동기화
      const bookmarkRes = await getBookmarkByUserId(booksIdRef.current).catch(() => null)
      if (destroyed) return

      const targetOrder = resumeChapterOrderRef.current || bookmarkRes?.chapter_order

      if (targetOrder && !initialLocationSetRef.current) {
        const entry = Object.entries(hrefToChapterRef.current)
          .find(([, ch]) => Number(ch.chapter_order) === Number(targetOrder))

        const href = entry?.[0]
        if (href) {
          initialLocationSetRef.current = true
          await rendition.display(href).catch(() => rendition.display())
          return
        }
      }

      await rendition.display()
    }).catch(err => {
      console.error("Epub 파싱 도중 에러 무시됨:", err)
    })

    rendition.on('locationChanged', (location) => {
      if (!location || !location.start) return
      
      setCurrentHref(location.start.href)

      const cfiString = location.start.cfi
      const paragraphMatch = cfiString?.match(/!\/4\/(\d+)/)
      const paragraph = paragraphMatch ? Math.floor(parseInt(paragraphMatch[1]) / 2) : 0
      
      if (setCurrentPRef.current) {
        setCurrentPRef.current(paragraph)
      }
    })

    // Clean-up
    return () => {
      destroyed = true
      
      // 언마운트될 때 마지막 위치 저장
      if (renditionRef.current?.location?.start) {
        const currentHref = renditionRef.current.location.start.href?.split('#')[0]
        const chapter = hrefToChapterRef.current?.[currentHref]
        const cfiString = renditionRef.current.location.start.cfi
        const paragraphMatch = cfiString?.match(/!\/4\/(\d+)/)
        const paragraph = paragraphMatch ? Math.floor(parseInt(paragraphMatch[1]) / 2) : 0

        if (chapter && booksIdRef.current) {
          saveBookmarkByUserId(booksIdRef.current, chapter.chapter_order, paragraph)
            .catch(err => console.error("자동 저장 실패:", err))
        }
      }

      // 페이지 전환 등으로 유저가 아예 나갈 때만 리셋되도록, 
      // Strict Mode 일시 해제 시점에는 레퍼런스를 살려둡니다.
      setTimeout(() => {
        if (destroyed) {
          try { renditionRef.current?.destroy() } catch (e) {}
          renditionRef.current = null
          try { book?.destroy() } catch (e) {}
          isInitializingRef.current = null
        }
      }, 1000)
    }
  }, [epubUrl])

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
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/library')}
              className="text-sm text-green-800 font-semibold hover:text-green-600 flex items-center gap-1"
            >
              <ChevronLeft size={16} />
              서재
            </button>
          </div>

          <p className="text-sm text-gray-500 font-medium">{bookInfo?.title || '로딩 중...'}</p>

          <div className="flex items-center gap-4">
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
        <div className="flex flex-1 overflow-hidden relative">
          <div ref={viewerRef} className="absolute inset-0 w-full h-full overflow-hidden" />

          {/* 인물 패널 */}
          {showPersonPanel && (
            <div className="w-80 border-l border-gray-200 bg-white flex flex-col overflow-hidden z-10">
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