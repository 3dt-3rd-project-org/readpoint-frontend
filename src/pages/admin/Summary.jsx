import { useEffect, useState } from 'react'
import { ChevronLeft, Save, CheckCircle } from 'lucide-react'
import { getAdminBooks } from '../../api'

const mockData = [
  {
    progress_summary_id: 1,
    books_id: 10,
    event_id: 3,
    chapter_id: 46,
    start_paragraph_id: 1,
    end_paragraph_id: 5,
    summary_3line: '싱클레어는 어린 시절 두 세계, 밝은 집과 어두운 바깥 세계 사이에서 분열을 느낀다.\n프랑크 크로머에게 거짓말을 하고 협박을 받기 시작한다.\n데미안이 처음 등장하며 싱클레어에게 다가온다.',
  },
  {
    progress_summary_id: 2,
    books_id: 10,
    event_id: 5,
    chapter_id: 47,
    start_paragraph_id: 6,
    end_paragraph_id: 12,
    summary_3line: '데미안이 카인과 아벨 이야기를 새롭게 해석해준다.\n기존 도덕 체계에 의문을 품게 된다.\n싱클레어는 데미안에게 강한 이끌림을 느낀다.',
  },
  {
    progress_summary_id: 3,
    books_id: 10,
    event_id: 7,
    chapter_id: 48,
    start_paragraph_id: 13,
    end_paragraph_id: 20,
    summary_3line: '싱클레어는 베아트리체를 보고 이상적 여성상을 투영한다.\n그림을 그리며 내면의 형상을 찾아가기 시작한다.\n그림 속 얼굴이 데미안을 닮아가고 있음을 깨닫는다.',
  },
]

function SummaryReview() {
  const [books, setBooks] = useState([])
  const [selectedBook, setSelectedBook] = useState(null)
  const [summaries, setSummaries] = useState([])
  const [editMap, setEditMap] = useState({})
  const [savedIds, setSavedIds] = useState(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getAdminBooks()
      .then(data => setBooks(data.books || []))
      .catch(err => console.error(err))
  }, [])

  const handleBookSelect = (book) => {
    setSelectedBook(book)
    setEditMap({})
    setSavedIds(new Set())
    setLoading(true)

    // TODO: API 생기면 교체
    setTimeout(() => {
      setSummaries(mockData)
      setLoading(false)
    }, 300)
  }

  const getEdit = (id) => editMap[id] || {}

  const handleChange = (id, field, value) => {
    setEditMap(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }))
    setSavedIds(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  // 개별 행이 수정되었는지 여부
  const isDirty = (id) => Object.keys(editMap[id] || {}).length > 0 && !savedIds.has(id)

  // 화면 전체에 수정된 항목이 하나라도 있는지 여부
  const isAnyDirty = summaries.some(summary => isDirty(summary.progress_summary_id))

  // [전체 저장] 버튼 핸들러
  const handleSaveAll = async () => {
    const updatedList = summaries
      .filter(s => isDirty(s.progress_summary_id))
      .map(s => ({ ...s, ...editMap[s.progress_summary_id] }))

    if (updatedList.length === 0) return

    console.log('전체 저장 대상:', updatedList)
    // TODO: await bulkUpdateProgressSummaries(updatedList)

    setSavedIds(prev => {
      const next = new Set(prev)
      updatedList.forEach(s => next.add(s.progress_summary_id))
      return next
    })
    alert('모든 변경 사항이 저장되었습니다.')
  }

  // [검수 완료] 버튼 핸들러
  const handleCompleteReview = async () => {
    if (isAnyDirty) {
      alert('저장되지 않은 변경 사항이 있습니다. 먼저 전체 저장을 해주세요.')
      return
    }
    console.log('검수 완료 처리할 책 ID:', selectedBook.books_id)
    // TODO: await completeBookReview(selectedBook.books_id)
    alert('검수가 완료되었습니다!')
    setSelectedBook(null) // 완료 후 목록으로 이동
  }

  // 책 선택 화면
  if (!selectedBook) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-2">3줄 요약 검수</h1>
        <p className="text-gray-400 text-sm mb-8">책을 선택해서 요약 데이터를 검수하세요</p>
        <div className="flex gap-6 flex-wrap">
          {books.map(book => (
            <div
              key={book.books_id}
              onClick={() => handleBookSelect(book)}
              className="w-40 h-52 rounded-xl overflow-hidden cursor-pointer hover:opacity-80 transition-opacity flex items-end"
              style={{
                backgroundImage: book.cover_url ? `url(${book.cover_url})` : 'none',
                backgroundColor: '#1A3C2E',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <p className="text-white font-bold text-sm p-4">{book.title}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 요약 검수 화면 (테이블 형식)
  return (
    <div className="p-6">
      {/* 상단 헤더 영역 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedBook(null)}
            className="flex items-center gap-1 text-sm text-green-800 font-semibold hover:text-green-600"
          >
            <ChevronLeft size={16} />
            책 목록
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {selectedBook.title} — 3줄 요약 검수
          </h1>
        </div>

        {/* 상단 액션 버튼 그룹 */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveAll}
            disabled={!isAnyDirty}
            className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
              isAnyDirty
                ? 'bg-amber-600 text-white hover:bg-amber-500 cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Save size={14} />
            전체 저장
          </button>
          <button
            onClick={handleCompleteReview}
            disabled={isAnyDirty}
            className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
              !isAnyDirty
                ? 'bg-green-900 text-white hover:bg-green-800 cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle size={14} />
            검수 완료
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-400 mb-4">검수 대상: {summaries.length}개</p>

      {loading ? (
        <div className="text-gray-400 text-sm py-10 text-center">불러오는 중...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 w-32">위치</th>
                <th className="px-6 py-3">3줄 요약 내용</th>
                <th className="px-6 py-3 w-32 text-center">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {summaries.map((summary) => {
                const id = summary.progress_summary_id
                const edit = getEdit(id)
                const dirty = isDirty(id)
                const saved = savedIds.has(id)
                const current3line = edit.summary_3line ?? summary.summary_3line

                return (
                  <tr key={id} className="hover:bg-gray-50/50 transition-colors">
                    {/* 위치 정보 */}
                    <td className="px-6 py-4 whitespace-nowrap align-top pt-5">
                      <div className="font-medium text-gray-900 mb-1">챕터 {summary.chapter_id}</div>
                      <div className="text-xs text-gray-400">문단 {summary.start_paragraph_id} ~ {summary.end_paragraph_id}</div>
                    </td>

                    {/* 3줄 요약 수정 영역 */}
                    <td className="px-6 py-4">
                      <textarea
                        value={current3line}
                        onChange={(e) => handleChange(id, 'summary_3line', e.target.value)}
                        rows={3}
                        className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-green-400 leading-relaxed"
                        placeholder="요약 내용을 입력하세요."
                      />
                    </td>

                    {/* 수정/저장 상태 표시 피드백 */}
                    <td className="px-6 py-4 whitespace-nowrap align-top pt-5 text-center">
                      <div className="h-6 flex items-center justify-center">
                        {dirty && (
                          <span className="text-[11px] bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5 font-medium">
                            수정됨
                          </span>
                        )}
                        {saved && (
                          <span className="text-[11px] bg-green-50 text-green-600 border border-green-200 rounded-full px-2 py-0.5 font-medium">
                            저장완료
                          </span>
                        )}
                        {!dirty && !saved && (
                          <span className="text-[11px] text-gray-300">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default SummaryReview