import { useEffect, useState } from 'react'
import { ChevronLeft, CheckCircle } from 'lucide-react'
import { getAdminBooks, getBookSummaryForReview, updateBookSummaryForReview } from '../../api'

function SummaryReview() {
  const [books, setBooks] = useState([])
  const [selectedBook, setSelectedBook] = useState(null)
  const [summaries, setSummaries] = useState([])
  const [editMap, setEditMap] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getAdminBooks()
      .then(data => setBooks(data.books || []))
      .catch(err => console.error(err))
  }, [])

  const handleBookSelect = async (book) => {
    setSelectedBook(book)
    setEditMap({})
    setLoading(true)

    try {
      const data = await getBookSummaryForReview(book.books_id)
      setSummaries(data.summaries || [])
    } catch (err) {
      console.error(err)
      setSummaries([])
    } finally {
      setLoading(false)
    }
  }

  const getEdit = (id) => editMap[id] || {}

  const handleChange = (id, field, value) => {
    setEditMap(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }))
  }

  const isDirty = (id) => Object.keys(editMap[id] || {}).length > 0

  const handleCompleteReview = async () => {
    const updatedList = summaries
      .filter(s => isDirty(s.progress_summary_id))
      .map(s => ({
        progress_summary_id: s.progress_summary_id,
        summary_3line: editMap[s.progress_summary_id]?.summary_3line ?? s.summary_3line
      }))

    try {
      if (updatedList.length > 0) {
        const res = await updateBookSummaryForReview(selectedBook.books_id, { summaries: updatedList })
        if (res?.error) {
          alert(res.message)
          return
        }
      }
      alert('검수가 완료되었습니다!')
      setSelectedBook(null)
    } catch (err) {
      console.error(err)
      alert('검수 완료 중 오류가 발생했습니다.')
    }
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

  // 요약 검수 화면
  return (
    <div className="p-6">
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

        <button
          onClick={handleCompleteReview}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg transition-colors bg-green-900 text-white hover:bg-green-800 cursor-pointer"
        >
          <CheckCircle size={14} />
          검수 완료
        </button>
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
                const current3line = edit.summary_3line ?? summary.summary_3line

                return (
                  <tr key={id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap align-top pt-5">
                      <div className="font-medium text-gray-900 mb-1">챕터 {summary.chapter_order}</div>
                      <div className="text-xs text-gray-400">문단 {summary.paragraph_order}</div>
                    </td>

                    <td className="px-6 py-4">
                      <textarea
                        value={current3line}
                        onChange={(e) => handleChange(id, 'summary_3line', e.target.value)}
                        rows={3}
                        className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-green-400 leading-relaxed"
                        placeholder="요약 내용을 입력하세요."
                      />
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap align-top pt-5 text-center">
                      <div className="h-6 flex items-center justify-center">
                        {dirty ? (
                          <span className="text-[11px] bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5 font-medium">
                            수정됨
                          </span>
                        ) : (
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