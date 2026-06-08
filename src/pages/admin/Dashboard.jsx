import { useState, useRef } from 'react'

const MOCK_STATS = {
  totalRuns: 24,
  successRate: 87.5,
  avgTime: '4분 32초',
  recentErrors: 3,
}

const MOCK_BOOKS = [
  { id: 1, title: '데미안',  author: '헤르만 헤세', status: 'done' },
  { id: 2, title: '상록수',  author: '심훈',        status: 'running' },
  { id: 3, title: '무영탑',  author: '현진건',      status: 'error' },
]

const MOCK_LOGS = [
  { time: '14:52', type: 'error',   text: '무영탑 DAG1 실패 — 챕터 분리 오류 발생' },
  { time: '14:32', type: 'success', text: '상록수 분석 완료 — 검수를 진행해주세요' },
  { time: '14:10', type: 'running', text: '상록수 epub 업로드 완료 — 메타데이터 파싱 중' },
  { time: '13:55', type: 'success', text: '데미안 DAG2 완료 — 서비스 오픈 준비됨' },
]

const STATUS_MAP = {
  done:    { label: '✅ 분석완료', className: 'text-green-600' },
  running: { label: '⏳ 분석중',   className: 'text-yellow-600' },
  error:   { label: '❌ 오류 발생', className: 'text-red-500' },
}

const LOG_ICON = {
  error: '❌',
  success: '✅',
  running: '⏳',
}

function Dashboard() {
  const [books, setBooks] = useState(MOCK_BOOKS)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const fileInputRef = useRef(null)

  const handleFile = (file) => {
    if (!file) return
    if (!file.name.endsWith('.epub')) {
      alert('.epub 파일만 업로드 가능합니다.')
      return
    }
    setFileName(file.name)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleUpload = () => {
    if (!fileName) { fileInputRef.current?.click(); return }
    setFileName('')
  }

  const handleRetry = (bookId) => {
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, status: 'running' } : b))
  }

  const handleRunDAG2 = (bookId) => {
    console.log('DAG2 실행:', bookId)
  }

  return (
    <>
      <h1 className="text-xl font-bold text-gray-900 mb-6">파이프라인 현황</h1>

      {/* 통계 카드 */}
      <div className="mb-6">
        <p className="text-xs text-gray-400 flex items-center gap-1 mb-3">
          <span>📊</span> Application Insights
        </p>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: '총 실행',       value: `${MOCK_STATS.totalRuns}회`,    highlight: false },
            { label: '성공률',         value: `${MOCK_STATS.successRate}%`,   highlight: 'green' },
            { label: '평균 처리 시간', value: MOCK_STATS.avgTime,            highlight: 'green' },
            { label: '최근 오류',      value: `${MOCK_STATS.recentErrors}건`, highlight: 'red' },
          ].map(({ label, value, highlight }) => (
            <div
              key={label}
              className={`bg-white rounded-xl border px-5 py-4 ${
                highlight === 'red' ? 'border-red-300' : 'border-gray-200'
              }`}
            >
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className={`text-2xl font-bold ${
                highlight === 'green' ? 'text-green-600'
                : highlight === 'red' ? 'text-red-500'
                : 'text-gray-900'
              }`}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* epub 업로드 */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-gray-700 mb-3">epub 업로드</p>
        <div className="flex gap-3">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex-1 flex items-center px-5 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
              dragOver ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
            }`}
          >
            <p className="text-sm text-gray-400">
              {fileName || '파일을 여기에 끌어놓거나 클릭하세요  (.epub)'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".epub"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </div>
          <button
            onClick={handleUpload}
            className="px-6 py-4 bg-green-900 text-white text-sm font-semibold rounded-xl hover:bg-green-800 transition-colors shrink-0"
          >
            업로드
          </button>
        </div>
      </div>

      {/* 등록된 책 목록 */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-gray-700 mb-3">등록된 책 목록</p>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400">
            <span>제목</span>
            <span>저자</span>
            <span>상태</span>
            <span>액션</span>
          </div>
          {books.map((book, i) => (
            <div
              key={book.id}
              className={`grid grid-cols-4 px-5 py-4 items-center text-sm ${
                book.status === 'error' ? 'bg-red-50' : 'bg-white'
              } ${i !== books.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <span className="font-medium text-gray-900">{book.title}</span>
              <span className="text-gray-400">{book.author}</span>
              <span className={`font-medium ${STATUS_MAP[book.status].className}`}>
                {STATUS_MAP[book.status].label}
              </span>
              <span>
                {book.status === 'done' && (
                  <button
                    onClick={() => handleRunDAG2(book.id)}
                    className="px-4 py-1.5 bg-green-900 text-white text-xs font-semibold rounded-full hover:bg-green-800 transition-colors"
                  >
                    DAG 2 실행
                  </button>
                )}
                {book.status === 'error' && (
                  <button
                    onClick={() => handleRetry(book.id)}
                    className="text-sm text-red-500 font-medium hover:underline"
                  >
                    재시도
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 실시간 알림 */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">🔔 실시간 알림</p>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {MOCK_LOGS.map((log, i) => (
            <div key={i} className="flex items-start gap-4 px-5 py-3.5 text-sm">
              <span className="text-gray-400 shrink-0 w-10">{log.time}</span>
              <span className="shrink-0">{LOG_ICON[log.type]}</span>
              <span className={log.type === 'error' ? 'text-red-500' : 'text-gray-700'}>
                {log.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default Dashboard