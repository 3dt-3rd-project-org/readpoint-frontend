import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import cytoscape from 'cytoscape'

// 더미 데이터 - 나중에 API로 교체
const bookData = {
  1: {
    title: '데미안',
    nodes: [
      { data: { id: '싱클레어', label: '싱클레어', role: '화자/주인공' } },
      { data: { id: '데미안', label: '데미안', role: '정신적 스승' } },
      { data: { id: '베아트리체', label: '베아트리체', role: '이상화된 여인' } },
      { data: { id: '크로머', label: '크로머', role: '악당' } },
      { data: { id: '에바부인', label: '에바 부인', role: '정신적 어머니' } },
    ],
    edges: [
      { data: { source: '싱클레어', target: '데미안', label: '친구/스승' } },
      { data: { source: '싱클레어', target: '베아트리체', label: '동경' } },
      { data: { source: '싱클레어', target: '크로머', label: '협박' } },
      { data: { source: '데미안', target: '에바부인', label: '모자' } },
    ]
  },
  2: {
    title: '상록수',
    nodes: [
      { data: { id: '채영신', label: '채영신', role: '여주인공' } },
      { data: { id: '박동혁', label: '박동혁', role: '남주인공' } },
      { data: { id: '최경애', label: '최경애', role: '조력자' } },
    ],
    edges: [
      { data: { source: '채영신', target: '박동혁', label: '연인' } },
      { data: { source: '채영신', target: '최경애', label: '친구' } },
    ]
  },
  3: {
    title: '무영탑',
    nodes: [
      { data: { id: '아사달', label: '아사달', role: '석공' } },
      { data: { id: '아사녀', label: '아사녀', role: '아내' } },
      { data: { id: '주만', label: '주만', role: '귀족 여인' } },
    ],
    edges: [
      { data: { source: '아사달', target: '아사녀', label: '부부' } },
      { data: { source: '아사달', target: '주만', label: '갈등' } },
    ]
  }
}

const books = [
  { id: 1, title: '데미안', author: '헤르만 헤세', color: '#3A7259' },
  { id: 2, title: '상록수', author: '심훈', color: '#2D3F6B' },
  { id: 3, title: '무영탑', author: '현진건', color: '#6B3A28' },
]

function Graph() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedNode, setSelectedNode] = useState(null)
  const cyRef = useRef(null)
  const cyInstance = useRef(null)

  const bookId = searchParams.get('bookId')
  const currentBook = bookId ? bookData[bookId] : null

  useEffect(() => {
    if (!currentBook || !cyRef.current) return

    if (cyInstance.current) cyInstance.current.destroy()

    const cy = cytoscape({
      container: cyRef.current,
      elements: [
        ...currentBook.nodes,
        ...currentBook.edges,
      ],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#1A3C2E',
            'label': 'data(label)',
            'color': '#ffffff',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '12px',
            'width': '80px',
            'height': '80px',
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#4CAF7D',
            'target-arrow-color': '#4CAF7D',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '10px',
            'color': '#767676',
            'text-background-color': '#ffffff',
            'text-background-opacity': 1,
            'text-background-padding': '2px',
          }
        },
        {
          selector: 'node:selected',
          style: { 'background-color': '#4CAF7D' }
        }
      ],
      layout: { name: 'cose', padding: 50 }
    })

    // 노드 클릭 시 인물 정보 표시
    cy.on('tap', 'node', (evt) => {
      const node = evt.target
      setSelectedNode({
        id: node.id(),
        role: node.data('role')
      })
    })

    cyInstance.current = cy

    return () => cy.destroy()
  }, [bookId])

  // 책 선택 화면
  if (!currentBook) {
    return (
      <div className="px-24 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">인물 관계도</h1>
        <p className="text-gray-500 text-sm mb-8">책을 선택하면 인물 관계도를 볼 수 있어요</p>

        <div className="flex gap-8">
          {books.map(book => (
            <div
              key={book.id}
              onClick={() => setSearchParams({ bookId: book.id })}
              className="w-48 cursor-pointer hover:shadow-lg transition-shadow rounded-xl overflow-hidden border border-gray-200"
            >
              <div
                className="h-64 flex flex-col justify-end p-5"
                style={{ backgroundColor: book.color }}
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
    <div className="flex h-[calc(100vh-80px)]">
      {/* 뒤로가기 + 그래프 */}
      <div className="flex-1 flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-4">
          <button
            onClick={() => { setSearchParams({}); setSelectedNode(null) }}
            className="text-sm text-green-800 font-semibold hover:text-green-600"
          >
            ← 책 목록
          </button>
          <span className="text-sm text-gray-900 font-bold">{currentBook.title} — 인물 관계도</span>
        </div>
        <div className="flex-1 bg-gray-50" ref={cyRef} />
      </div>

      {/* 인물 정보 패널 */}
      <div className="w-80 border-l border-gray-200 p-8 bg-white">
        <p className="text-sm text-gray-400 font-semibold mb-6">인물 정보</p>
        {selectedNode ? (
          <div>
            <div className="w-16 h-16 bg-green-900 rounded-full flex items-center justify-center text-white text-xl font-bold mb-4">
              {selectedNode.id[0]}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedNode.id}</h2>
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400 mb-1">역할</p>
              <p className="text-sm text-gray-700">{selectedNode.role}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">인물을 클릭하면 정보가 표시됩니다</p>
        )}
      </div>
    </div>
  )
}

export default Graph