import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import cytoscape from 'cytoscape'
import { getBooks, getBookRelations } from '../api'

function Graph() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedNode, setSelectedNode] = useState(null)
  const [books, setBooks] = useState([])
  const [currentChapter, setCurrentChapter] = useState(100)
  const [bookTitle, setBookTitle] = useState('')
  const cyRef = useRef(null)
  const cyInstance = useRef(null)

  const bookId = searchParams.get('bookId')

  // 책 목록 가져오기
  useEffect(() => {
    getBooks().then(data => setBooks(data.books || []))
  }, [])

  // 관계도 데이터 가져오기
  useEffect(() => {
    if (!bookId || !cyRef.current) return

    const selectedBook = books.find(b => String(b.books_id) === String(bookId))
    if (selectedBook) setBookTitle(selectedBook.title)

    getBookRelations(bookId, currentChapter)
      .then(data => {
        if (cyInstance.current) cyInstance.current.destroy()

        const nodes = (data.nodes || []).map(n => ({
          data: { id: n.id, label: n.name, role: n.role }
        }))
        const edges = (data.edges || []).map(e => ({
          data: { source: e.source, target: e.target, label: e.relation || e.type }
        }))

        const cy = cytoscape({
          container: cyRef.current,
          elements: [...nodes, ...edges],
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

        cy.on('tap', 'node', (evt) => {
          const node = evt.target
          setSelectedNode({
            id: node.id(),
            name: node.data('label'),
            role: node.data('role')
          })
        })

        cyInstance.current = cy
      })
      .catch(err => console.error(err))
  }, [bookId, currentChapter, books])

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
    <div className="flex h-[calc(100vh-80px)]">
      <div className="flex-1 flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-4">
          <button
            onClick={() => { setSearchParams({}); setSelectedNode(null) }}
            className="text-sm text-green-800 font-semibold hover:text-green-600"
          >
            ← 책 목록
          </button>
          <span className="text-sm text-gray-900 font-bold">{bookTitle} — 인물 관계도</span>
          {/* 진도 슬라이더 */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-400">진도</span>
            <input
              type="range"
              min={1}
              max={500}
              value={currentChapter}
              onChange={(e) => setCurrentChapter(Number(e.target.value))}
              className="w-32 accent-green-700"
            />
            <span className="text-xs text-green-900 font-semibold">{currentChapter}</span>
          </div>
        </div>
        <div className="flex-1 bg-gray-50" ref={cyRef} />
      </div>

      {/* 인물 정보 패널 */}
      <div className="w-80 border-l border-gray-200 p-8 bg-white">
        <p className="text-sm text-gray-400 font-semibold mb-6">인물 정보</p>
        {selectedNode ? (
          <div>
            <div className="w-16 h-16 bg-green-900 rounded-full flex items-center justify-center text-white text-xl font-bold mb-4">
              {selectedNode.name?.[0] || selectedNode.id?.[0]}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedNode.name || selectedNode.id}</h2>
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