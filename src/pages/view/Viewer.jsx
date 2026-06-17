import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import ePub from 'epubjs'
import { Network, ChevronLeft, MessageCircle, X } from 'lucide-react'
import { 
  getBookById, 
  getBookChapters, 
  getBookmarkByUserId,
  saveBookmarkByUserId,
  chatWithBook
} from '../../api'

// 채팅 패널 추천 질문 - 대화 시작 전에만 표시
const SUGGESTED_QUESTIONS = [
  '이 인물은 왜 이런 행동을 했을까?',
  '이 장면에서 핵심 갈등이 뭐야?',
  '이 장면의 분위기를 설명해줘',
  '작가가 전달하려는 메시지가 뭘까?',
]

function Viewer() {
  const { booksId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const resumeChapterOrder = location.state?.resumeChapterOrder

  // epub 렌더링 관련 ref
  const viewerRef = useRef(null)
  const renditionRef = useRef(null)
  const bookRef = useRef(null)
  const chaptersRef = useRef([])
  const tocRef = useRef([])
  const initialLocationSetRef = useRef(false)
  const hrefToChapterRef = useRef({})

  // 현재 읽은 위치 추적 (채팅 API에 넘길 값)
  const currentChapterRef = useRef(null)
  const currentParagraphRef = useRef(0)

  // useEffect 내부에서 최신 값 참조하기 위한 ref
  const booksIdRef = useRef(booksId)
  const resumeChapterOrderRef = useRef(resumeChapterOrder)
  const setCurrentPRef = useRef(null)

  // Strict Mode 이중 마운트 방지 플래그
  const isInitializingRef = useRef(null)

  // ref 선언부에 추가
  const destroyTimeoutRef = useRef(null)

  const [toc, setToc] = useState([])
  const [currentHref, setCurrentHref] = useState('')
  const [bookInfo, setBookInfo] = useState(null)
  const [currentP, setCurrentP] = useState(0)
  const [chapters, setChapters] = useState([])
  const [fontSize, setFontSize] = useState(100)

  // 채팅 패널 기본 닫힘
  const [showChat, setShowChat] = useState(false)

  // 채팅 상태
  const [chatHistory, setChatHistory] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatBottomRef = useRef(null)

  useEffect(() => { booksIdRef.current = booksId }, [booksId])
  useEffect(() => { resumeChapterOrderRef.current = resumeChapterOrder }, [resumeChapterOrder])
  useEffect(() => { setCurrentPRef.current = setCurrentP })

  // 새 메시지 올 때마다 채팅창 하단으로 스크롤
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

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

  // 채팅 전송 - 현재 위치(chapter_order, paragraph)를 API에 넘김
  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return

    const question = chatInput.trim()
    setChatInput('')
    setChatLoading(true)

    const newHistory = [...chatHistory, { role: 'user', content: question }]
    setChatHistory(newHistory)

    try {
      const res = await chatWithBook(
        booksId,
        question,
        currentChapterRef.current?.chapter_order || 1,
        currentParagraphRef.current || 0,
        chatHistory
      )
      setChatHistory([...newHistory, { 
        role: 'assistant', 
        content: res.answer,
        context_refs: res.context_refs
      }])
    } catch (err) {
      console.error(err)
      setChatHistory([...newHistory, { role: 'assistant', content: '오류가 발생했어요. 다시 시도해주세요.' }])
    } finally {
      setChatLoading(false)
    }
  }

  // 책 정보 조회
  useEffect(() => {
    getBookById(booksId)
      .then(data => setBookInfo(data.book))
      .catch(err => console.error(err))
  }, [booksId])

  // 챕터 목록 조회
  useEffect(() => {
    getBookChapters(booksId)
      .then(data => {
        setChapters(data.chapters || [])
        chaptersRef.current = data.chapters || []
      })
      .catch(err => console.error(err))
  }, [booksId])

  // epub 렌더링 초기화
  const epubUrl = bookInfo?.epub_blob_path
  useEffect(() => {
    if (!viewerRef.current || !epubUrl) return

    // StrictMode 이중 마운트 취소 처리
    if (isInitializingRef.current === epubUrl) {
      if (destroyTimeoutRef.current) {
        clearTimeout(destroyTimeoutRef.current)
        destroyTimeoutRef.current = null
      }
      return
    }
    isInitializingRef.current = epubUrl

    if (viewerRef.current) {
      viewerRef.current.innerHTML = ''
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

    rendition.on('relocated', (location) => {
      if (!location || destroyed) return

      const href = location.start?.href?.split('#')[0]
      setCurrentHref(href)

      const chapter = hrefToChapterRef.current?.[href]
      if (chapter) currentChapterRef.current = chapter

      const cfiString = typeof location.start === 'string' ? location.start : location.start?.cfi
      const paragraphMatch = cfiString?.match(/!\/4\/(\d+)/)
      const paragraph = paragraphMatch ? Math.floor(parseInt(paragraphMatch[1]) / 2) : 0
      currentParagraphRef.current = paragraph

      if (setCurrentPRef.current) setCurrentPRef.current(paragraph)
    })

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

      const doMapping = () => {
        const hrefToChapter = {}
        const currentChapters = chaptersRef.current || []

        currentChapters.forEach(chapter => {
          const matched = flatToc.find(tocItem =>
            tocItem.label?.trim() === chapter.title?.trim()
          )
          if (matched) {
            const hrefKey = matched.href?.split('#')[0]
            hrefToChapter[hrefKey] = chapter
          }
        })

        const mappedHrefs = new Set(Object.keys(hrefToChapter))
        const unmappedChapters = [...currentChapters]
          .sort((a, b) => a.chapter_order - b.chapter_order)
          .filter(ch => !Object.values(hrefToChapter).includes(ch))

        const unmappedSpines = spineItems.filter(href => !mappedHrefs.has(href))
        unmappedSpines.forEach((href, i) => {
          if (unmappedChapters[i]) hrefToChapter[href] = unmappedChapters[i]
        })

        hrefToChapterRef.current = hrefToChapter
      }

      doMapping()

      const bookmarkRes = await getBookmarkByUserId(booksIdRef.current).catch(() => null)
      if (destroyed) return

      doMapping()

      const targetOrder = resumeChapterOrderRef.current || bookmarkRes?.chapter_order

      // [중요 수정 3]: 타겟 챕터로 이동 시 렌더링 병목이나 에러로 멈추지 않도록 
      // 타임아웃/폴백을 걸어 무조건 최초 렌더링 화면을 통과시킵니다.
      if (targetOrder && !initialLocationSetRef.current) {
        const entry = Object.entries(hrefToChapterRef.current)
          .find(([, ch]) => Number(ch.chapter_order) === Number(targetOrder))
        const href = entry?.[0]
        if (href) {
          initialLocationSetRef.current = true
          try {
            await rendition.display(href)
            return
          } catch (e) {
            console.warn('지정 위치 이동 실패, 기본 위치로 복구:', e)
          }
        }
      }

      // 기본 디스플레이 호출
      await rendition.display().catch(err => console.error('렌더링 최종 에러:', err))
    }).catch(err => console.error('Epub 파싱 도중 에러 무시됨:', err))

    return () => {
      destroyed = true

      if (renditionRef.current?.location?.start) {
        const currentHref = renditionRef.current.location.start.href?.split('#')[0]
        const chapter = hrefToChapterRef.current?.[currentHref]
        const cfiString = renditionRef.current.location.start.cfi
        const paragraphMatch = cfiString?.match(/!\/4\/(\d+)/)
        const paragraph = paragraphMatch ? Math.floor(parseInt(paragraphMatch[1]) / 2) : 0

        if (chapter && booksIdRef.current) {
          saveBookmarkByUserId(booksIdRef.current, chapter.chapter_order, paragraph)
            .catch(err => console.error('자동 저장 실패:', err))
        }
      }

      destroyTimeoutRef.current = setTimeout(() => {
        try { renditionRef.current?.destroy() } catch (e) {}
        renditionRef.current = null
        try { book?.destroy() } catch (e) {}
        isInitializingRef.current = null
        destroyTimeoutRef.current = null
      }, 1000)
    }
  }, [epubUrl])

  const goToChapter = async (href) => {
    await renditionRef.current?.display(href)
  }

  return (
    <div className="flex h-[calc(100vh-80px)]">

      {/* 목차 - 고정 */}
      <div className="w-52 border-r border-gray-200 bg-gray-50 flex flex-col overflow-hidden shrink-0">
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
                  currentHref === item.href ? 'bg-green-100 text-green-900 font-semibold' : 'text-gray-600'
                }`}
              >
                {item.label}
              </button>
            ))
          )}
        </div>
      </div>

      {/* 본문 + 채팅 패널 */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* 상단 바 */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white shrink-0">
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
            <button
              onClick={() => navigate(`/graph?bookId=${booksId}`)}
              className="text-sm text-gray-500 font-semibold flex items-center gap-1 hover:text-green-900 transition-colors"
            >
              <Network size={16} />
              관계도
            </button>
            {/* 채팅 토글 버튼 */}
            <button
              onClick={() => setShowChat(!showChat)}
              className={`text-sm font-semibold flex items-center gap-1 transition-colors ${
                showChat ? 'text-green-900' : 'text-gray-500 hover:text-green-900'
              }`}
            >
              <MessageCircle size={16} />
              AI 독서 메이트
            </button>
          </div>
        </div>

        {/* epub + 채팅 패널 */}
        <div className="flex-1 flex overflow-hidden">
          {/* epub 렌더링 영역 */}
          <div className="flex-1 relative overflow-hidden">
            <div ref={viewerRef} className="absolute inset-0 w-full h-full overflow-hidden" />

            {/* 폰트 크기 조절 툴바 - 우측 하단 플로팅 */}
            <div className="absolute bottom-4 right-4 z-20 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full px-3 py-1.5 flex items-center gap-3 shadow-lg opacity-40 hover:opacity-100 transition-opacity duration-200">
              <button onClick={() => changeFontSize(-10)} className="text-xs text-gray-600 hover:text-green-900 font-bold">가</button>
              <span className="text-xs text-gray-400">{fontSize}%</span>
              <button onClick={() => changeFontSize(10)} className="text-sm text-gray-700 hover:text-green-900 font-bold">가</button>
            </div>
          </div>

          {/* 채팅 패널 - 인물 패널 자리 */}
          {showChat && (
            <div className="w-80 border-l border-gray-200 bg-white flex flex-col shrink-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
                <div>
                  <p className="text-sm font-semibold text-gray-800">AI 독서 메이트</p>
                  {/* 현재 읽은 위치 표시 */}
                  {currentChapterRef.current && (
                    <p className="text-xs text-gray-400">
                      {currentChapterRef.current.title} · {currentParagraphRef.current}번째 문단
                    </p>
                  )}
                </div>
                <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>

              {/* 대화 메시지 목록 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatHistory.length === 0 && (
                  <div className="mt-4">
                    <p className="text-center text-xs text-gray-400 mb-4 leading-relaxed">
                      지금 읽은 내용에 대해<br />자유롭게 질문해보세요!<br />
                      <span className="text-gray-300">스포일러 없이 답변해드려요 🙂</span>
                    </p>
                    {/* 추천 질문 - 대화 없을 때만 표시 */}
                    <div className="flex flex-col gap-2">
                      {SUGGESTED_QUESTIONS.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => setChatInput(q)}
                          className="text-left text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:border-green-700 hover:text-green-800 hover:bg-green-50 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-green-900 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }`}>
                      {msg.content}
                      {msg.context_refs?.length > 0 && (
                        <p className="text-gray-400 text-[10px] mt-1">
                          📖 {msg.context_refs.map(r => `${r.chapter_order}번째 목차 ${r.paragraph_order}번째 문단`).join(', ')} 참고
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3 py-2 text-xs text-gray-400">
                      생각 중...
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* 채팅 입력창 */}
              <div className="border-t border-gray-200 shrink-0">
                <div className="flex gap-2 p-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                    placeholder="질문을 입력하세요..."
                    className="flex-1 text-xs border border-gray-200 rounded-full px-3 py-2 outline-none focus:border-green-700"
                    disabled={chatLoading}
                  />
                  <button
                    onClick={handleSendChat}
                    disabled={chatLoading || !chatInput.trim()}
                    className="w-8 h-8 bg-green-900 text-white rounded-full flex items-center justify-center hover:bg-green-800 disabled:opacity-40 transition-colors shrink-0"
                  >
                    ↑
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Viewer