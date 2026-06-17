import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import cytoscape from 'cytoscape'
import { Plus, Minus, Maximize2, Save } from 'lucide-react'
import { getBooks, getBookRelations, getBookChapters, getBookEvents, getBookmarkByUserId } from '../api'

function Graph() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedNode, setSelectedNode] = useState(null)
  const [books, setBooks] = useState([])
  const [bookTitle, setBookTitle] = useState('')
  const cyRef = useRef(null)
  const cyInstance = useRef(null)
  const bookId = searchParams.get('bookId')
  const [summaryExpanded, setSummaryExpanded] = useState(false)

  const [isDirty, setIsDirty] = useState(false)
  const [currentChapter, setCurrentChapter] = useState(1)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [graphNodes, setGraphNodes] = useState([])
  const [controlsCollapsed, setControlsCollapsed] = useState(false)
  const [chapters, setChapters] = useState([])
  const [events, setEvents] = useState([])

  // 유저 읽기 진도 (스포일러 방지 기준)
  const [userProgress, setUserProgress] = useState(null)

  // 사건 검색 필터 (프론트 필터링)
  const filteredEvents = events.filter(ev =>
    ev.short_title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 챕터 변경 - 미저장 변경사항 확인
  const handleChapterChange = (val) => {
    if (isDirty && !window.confirm('저장하지 않은 변경사항이 있어요. 이동하시겠어요?')) return
    setIsDirty(false)
    setCurrentChapter(val)
  }

  // 사건 선택/해제 - 미저장 변경사항 확인
  const handleEventSelect = (ev) => {
    if (isDirty && !window.confirm('저장하지 않은 변경사항이 있어요. 이동하시겠어요?')) return
    setIsDirty(false)
    setSelectedEvent(selectedEvent?.event_id === ev.event_id ? null : ev)
  }

  // 노드 위치 localStorage 저장
  const handleSavePositions = () => {
    if (!cyInstance.current) return
    const positions = {}
    cyInstance.current.nodes().forEach(n => {
      positions[n.id()] = n.position()
    })
    const p = selectedEvent?.start_paragraph_order || userProgress?.paragraph_order || 9999
    const c = selectedEvent ? selectedEvent.chapter_order : userProgress?.chapter_order || 100
    localStorage.setItem(`graph-positions-${bookId}-${c}-${p}`, JSON.stringify(positions))
    setIsDirty(false)
  }

  // 전체 책 목록 조회
  useEffect(() => {
    getBooks().then(data => setBooks(data.books || []))
  }, [])

  // 책 제목 설정
  useEffect(() => {
    if (!bookId) return
    const selectedBook = books.find(b => String(b.books_id) === String(bookId))
    if (selectedBook) setBookTitle(selectedBook.title)
  }, [bookId, books])

  // 챕터 목록 조회
  useEffect(() => {
    if (!bookId) return
    getBookChapters(bookId).then(data => {
      setChapters(data.chapters || [])
    })
  }, [bookId])

  // 유저 읽기 진도 조회 - 관계도 스포일러 방지 기준
  useEffect(() => {
    if (!bookId) return
    getBookmarkByUserId(bookId)
      .then(data => setUserProgress(data))
      .catch(() => setUserProgress(null))
  }, [bookId])

  // 사건 목록 조회 - 챕터 변경 시 초기화
  useEffect(() => {
    if (!bookId) return
    getBookEvents(bookId, currentChapter, 9999).then(data => {
      const filtered = (data.events || [])
        .filter(e => e.chapter_order === currentChapter)
        .sort((a, b) => a.event_order - b.event_order)
        .map((ev, idx) => ({ ...ev, event_order: idx + 1 }))
      setEvents(filtered)
    })
    setSelectedNode(null)
    setSelectedEvent(null)
    setSearchTerm('')
  }, [bookId, currentChapter])

  // 관계도 그래프 렌더링
  useEffect(() => {
    if (!bookId || !cyRef.current) return

    let cancelled = false

    // 사건 선택 시 해당 시점, 아니면 유저 읽기 진도 기준으로 관계도 조회
    const p = selectedEvent?.start_paragraph_order || userProgress?.paragraph_order || 9999
    const c = selectedEvent ? selectedEvent.chapter_order : userProgress?.chapter_order || 100

    // 기존 인스턴스 정리
    if (cyInstance.current) {
      try {
        cyInstance.current.removeAllListeners()
        cyInstance.current.destroy()
      } catch (e) {
        console.warn('기존 인스턴스 파괴 중 경고:', e)
      }
      cyInstance.current = null
    }

    if (cyRef.current) cyRef.current.style.pointerEvents = 'none'
    setGraphNodes([])

    getBookRelations(bookId, c, p)
      .then(data => {
        if (cancelled || !cyRef.current) return

        const nodes = (data.nodes || []).map(n => ({
          data: { id: n.id, label: n.name, role: n.role }
        }))
        const edges = (data.edges || []).map(e => ({
          data: { source: e.source, target: e.target, label: e.type }
        }))

        // 노드 없으면 렌더링 중단
        if (nodes.length === 0) {
          if (cyRef.current) cyRef.current.style.pointerEvents = 'auto'
          return
        }

        // 주인공 노드 강조용
        const mainChar = (data.nodes || []).find(n => n.role === '주인공')

        const cy = cytoscape({
          container: cyRef.current,
          elements: [...nodes, ...edges],
          style: [
            // 기본 노드 스타일
            {
              selector: 'node',
              style: {
                'background-color': '#1A3C2E',
                'label': 'data(label)',
                'color': '#ffffff',
                'text-valign': 'center',
                'text-halign': 'center',
                'font-size': '11px',
                'width': '70px',
                'height': '70px',
                'text-wrap': 'wrap',
                'text-max-width': '60px',
                'border-width': 0,
              }
            },
            // 주인공 노드 강조 (테두리)
            {
              selector: mainChar ? `node[id = "${mainChar.id}"]` : '',
              style: {
                'width': '90px',
                'height': '90px',
                'font-size': '13px',
                'font-weight': 'bold',
                'border-width': 3,
                'border-color': '#4CAF7D',
                'border-opacity': 0.8,
              }
            },
            // 엣지 스타일 - 기본은 흐리게, hover 시 라벨 표시
            {
              selector: 'edge',
              style: {
                'width': 1.5,
                'line-color': '#4CAF7D',
                'target-arrow-color': '#4CAF7D',
                'target-arrow-shape': 'triangle',
                'curve-style': 'bezier',
                'control-point-step-size': 40,
                'label': 'data(label)',
                'font-size': '10px',
                'color': '#111111',
                'text-background-color': '#ffffff',
                'text-background-opacity': 0,
                'text-background-padding': '3px',
                'text-background-shape': 'roundrectangle',
                'opacity': 0.6,
              }
            },
            { selector: 'node:selected', style: { 'background-color': '#4CAF7D' } }
          ],
          // 동심원 레이아웃 - 연결 많은 노드가 중심
          layout: {
            name: 'concentric',
            fit: true,
            padding: 50,
            minNodeSpacing: 60,
            avoidOverlap: true,
            concentric: (node) => node.degree(),
            levelWidth: () => 2,
            animate: false
          }
        })

        if (cyRef.current) cyRef.current.style.pointerEvents = 'auto'

        // hover 시 연결된 노드/엣지만 강조 (포커스 & 딤 효과)
        cy.on('mouseover', 'node', function(e) {
          const sel = e.target
          cy.elements().style({ 'opacity': 0.1 })
          sel.style('opacity', 1)
          sel.connectedEdges().style({ 'opacity': 1, 'text-background-opacity': 0.8 })
          sel.connectedEdges().connectedNodes().style('opacity', 1)
          if (cyRef.current) cyRef.current.style.cursor = 'pointer'
        })

        cy.on('mouseout', 'node', function() {
          cy.nodes().style('opacity', 1)
          cy.edges().style({ 'opacity': 0.6, 'text-background-opacity': 0 })
          if (cyRef.current) cyRef.current.style.cursor = 'default'
        })

        // 노드 클릭 시 인물 정보 패널 표시
        cy.on('tap', 'node', (evt) => {
          const node = evt.target
          setSelectedNode({
            id: node.id(),
            name: node.data('label'),
            role: node.data('role')
          })
        })

        // 노드 드래그 시 미저장 상태 표시
        cy.on('dragfree', 'node', () => setIsDirty(true))

        // 저장된 노드 위치 복원
        const savedPositions = localStorage.getItem(`graph-positions-${bookId}-${c}-${p}`)
        if (savedPositions) {
          const positions = JSON.parse(savedPositions)
          cy.nodes().forEach(n => {
            if (positions[n.id()]) n.position(positions[n.id()])
          })
          cy.fit()
        }

        cyInstance.current = cy
        setGraphNodes(cy.nodes().map(n => ({
          id: n.id(),
          name: n.data('label'),
          role: n.data('role')
        })))
      })
      .catch(err => console.error(err))

    // cleanup - 언마운트 또는 의존성 변경 시 인스턴스 정리
    return () => {
      cancelled = true
      if (cyRef.current) cyRef.current.style.cursor = 'default'
      if (cyInstance.current) {
        try {
          cyInstance.current.removeAllListeners()
          cyInstance.current.destroy()
        } catch (e) {
          console.warn(e)
        }
        cyInstance.current = null
      }
      setGraphNodes([])
    }
  }, [bookId, currentChapter, selectedEvent, userProgress])

  // 책 선택 화면
  if (!bookId) {
    return (
      <div className="px-24 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">인물 관계도</h1>
        <p className="text-gray-500 text-sm mb-8">책을 선택하면 인물 관계도를 볼 수 있어요</p>
        <div className="flex gap-8 flex-wrap">
          {books.map(book => (
            <div
              key={book.books_id}
              onClick={() => setSearchParams({ bookId: book.books_id })}
              className="w-48 cursor-pointer hover:shadow-lg transition-shadow rounded-xl overflow-hidden border border-gray-200"
            >
              <div
                className="h-64 flex flex-col justify-end p-5"
                style={{
                  backgroundColor: '#1A3C2E',
                  backgroundImage: book.cover_url ? `url(${book.cover_url})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                <h2 className="text-white font-bold">{book.title}</h2>
                <p className="text-white/70 text-sm">{book.author}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 관계도 화면
  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">

      {/* 상단 컨트롤 */}
      {!controlsCollapsed && (
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 shrink-0">
          <div className="flex gap-6 h-40">

            {/* 챕터 선택 */}
            <div className="w-48 shrink-0 flex flex-col">
              <button
                onClick={() => { setSearchParams({}); setSelectedNode(null) }}
                className="text-sm text-green-800 font-semibold hover:text-green-600 mb-1 self-start"
              >
                ← 책 목록
              </button>
              <span className="text-sm font-bold text-gray-800 mb-3 truncate">{bookTitle}</span>
              <label className="text-xs font-semibold text-gray-500 mb-1">챕터 선택</label>
              <select
                value={currentChapter}
                onChange={(e) => handleChapterChange(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 outline-none focus:border-green-800 focus:ring-1 focus:ring-green-800 cursor-pointer"
              >
                {chapters.map(ch => (
                  <option key={ch.chapter_id} value={ch.chapter_order}>
                    {ch.title || `제 ${ch.chapter_order} 장`}
                  </option>
                ))}
              </select>
            </div>

            {/* 사건 검색 + 리스트 */}
            <div className="flex-1 flex flex-col border border-gray-200 rounded-lg overflow-hidden bg-gray-50 shadow-inner">
              {selectedEvent && (
                <div className="px-3 py-1.5 bg-green-50 border-b border-green-100 flex items-center justify-between">
                  <span className="text-xs text-green-700 font-semibold">선택됨: {selectedEvent.short_title}</span>
                  <button
                    onClick={() => handleEventSelect(selectedEvent)}
                    className="text-green-400 hover:text-green-700 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}
              <div className="p-2 border-b border-gray-200 bg-white">
                <input
                  type="text"
                  placeholder="어떤 사건을 찾으시나요? (예: 만남, 협박)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md outline-none focus:border-green-800 transition-colors"
                />
              </div>
              <div className="flex-1 overflow-y-auto p-1">
                {filteredEvents.length > 0 ? (
                  <ul className="space-y-1">
                    {filteredEvents.map(ev => (
                      <li
                        key={ev.event_id}
                        onClick={() => handleEventSelect(ev)}
                        className={`px-3 py-2 text-sm rounded-md cursor-pointer transition-colors flex items-center gap-3
                          ${selectedEvent?.event_id === ev.event_id
                            ? 'bg-green-800 text-white font-semibold shadow-sm'
                            : 'text-gray-700 hover:bg-green-100'
                          }`}
                      >
                        <span className={`${selectedEvent?.event_id === ev.event_id ? 'text-green-300' : 'text-gray-400'} text-xs font-mono w-5`}>
                          {ev.event_order}.
                        </span>
                        <span>{ev.short_title}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">
                    검색 결과가 없습니다.
                  </div>
                )}
              </div>
            </div>

            {/* 선택된 사건 상태창 */}
            <div className="w-64 shrink-0 bg-green-50/50 border border-green-100 rounded-lg p-4 flex flex-col justify-center items-center text-center">
              {selectedEvent ? (
                <>
                  <span className="text-xs font-bold text-green-700 mb-2 px-2 py-1 bg-green-100 rounded-full">
                    {currentChapter}장 {selectedEvent.event_order}번째 사건
                  </span>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">{selectedEvent.short_title}</h3>
                  {selectedEvent.summary && (
                    <p
                      onClick={() => setSummaryExpanded(v => !v)}
                      className={`text-xs text-gray-500 leading-relaxed cursor-pointer ${summaryExpanded ? '' : 'line-clamp-2'}`}
                    >
                      {selectedEvent.summary}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-green-800/60 leading-relaxed">
                  좌측 목록에서 탐색할<br />사건을 선택해 주세요.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 접기/펼치기 버튼 */}
      <div className="flex justify-end px-6 py-1 bg-white border-b border-gray-100">
        <button
          onClick={() => setControlsCollapsed(c => !c)}
          className="text-xs text-gray-400 hover:text-green-700 flex items-center gap-1"
        >
          {controlsCollapsed ? '▼ 펼치기' : '▲ 접기'}
        </button>
      </div>

      {/* 관계도 + 인물 패널 */}
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 bg-gray-50" ref={cyRef} />

        {/* 줌 / 저장 버튼 */}
        <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2">
          <button title="확대" onClick={() => cyInstance.current?.zoom(cyInstance.current.zoom() * 1.2)}
            className="w-8 h-8 bg-white border border-gray-200 rounded-lg shadow text-gray-600 hover:bg-gray-50 flex items-center justify-center">
            <Plus size={14} />
          </button>
          <button title="축소" onClick={() => cyInstance.current?.zoom(cyInstance.current.zoom() * 0.8)}
            className="w-8 h-8 bg-white border border-gray-200 rounded-lg shadow text-gray-600 hover:bg-gray-50 flex items-center justify-center">
            <Minus size={14} />
          </button>
          <button title="중심 맞추기" onClick={() => cyInstance.current?.fit()}
            className="w-8 h-8 bg-white border border-gray-200 rounded-lg shadow text-gray-600 hover:bg-gray-50 flex items-center justify-center">
            <Maximize2 size={14} />
          </button>
          {/* 드래그 후 변경사항 있을 때만 저장 버튼 표시 */}
          {isDirty && (
            <button title="위치 저장" onClick={handleSavePositions}
              className="w-8 h-8 bg-green-800 border border-green-700 rounded-lg shadow text-white hover:bg-green-700 flex items-center justify-center">
              <Save size={14} />
            </button>
          )}
        </div>

        {/* 인물 정보 패널 */}
        <div className="w-72 border-l border-gray-200 bg-white overflow-y-auto z-10">
          <div className="p-6">
            <p className="text-sm text-gray-400 font-semibold mb-4">인물 정보</p>
            <p className="text-xs text-gray-300 mb-4">노드를 클릭하면 인물 정보가 표시됩니다</p>
            {selectedNode ? (
              <div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-xs text-green-700 font-semibold mb-4 hover:text-green-500 block"
                >
                  ← 전체 인물
                </button>
                <div className="w-16 h-16 bg-green-900 rounded-full flex items-center justify-center text-white text-xl font-bold mb-4 shadow-md">
                  {selectedNode.name?.[0] || selectedNode.id?.[0]}
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedNode.name || selectedNode.id}</h2>
                <div className="border-t border-gray-100 pt-4 space-y-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">역할</p>
                    <p className="text-sm text-gray-700">{selectedNode.role || '정보 없음'}</p>
                  </div>
                </div>
              </div>
            ) : (
              /* 전체 인물 목록 그리드 */
              <div className="grid grid-cols-3 gap-3">
                {graphNodes.length > 0 ? (
                  graphNodes.map(char => (
                    <div
                      key={char.id}
                      onClick={() => setSelectedNode(char)}
                      className="flex flex-col items-center cursor-pointer hover:opacity-70 transition-opacity"
                    >
                      <div className="w-10 h-10 bg-green-900 rounded-full flex items-center justify-center text-white text-sm font-bold mb-1 shadow-sm">
                        {char.name?.[0] || char.id?.[0]}
                      </div>
                      <span className="text-xs text-gray-600 text-center truncate w-full">{char.name}</span>
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 text-center text-sm text-gray-400 mt-4">
                    데이터가 없습니다.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Graph