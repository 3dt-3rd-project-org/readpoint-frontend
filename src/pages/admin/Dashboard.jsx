import { useState, useRef, useEffect } from 'react'
import { connectWebSocket, disconnectWebSocket } from '../../websocket'
import { uploadBook, getAdminBooks, analyzeBook } from '../../api'

const MOCK_STATS = {
  totalRuns: 24,
  successRate: 87.5,
  avgTime: '4분 32초',
  recentErrors: 3,
}
const STATUS_MAP = {
  READY:                { label: '📂 분석 전', className: 'text-blue-500' },
  ANALYZING:            { label: '⏳ 분석 중', className: 'text-yellow-600' },
  ANALYZING_ERROR:      { label: '❌ 분석 실패', className: 'text-red-500' },
  ANALYZING_FINISHED:   { label: '🔍 1차 검수 필요', className: 'text-purple-500' },
  ANALYZING_COMPLETE:   { label: '✅ 1차 검수 완료', className: 'text-green-500' },
  SUMMARIZING:          { label: '⏳ 요약 중', className: 'text-yellow-600' },
  SUMMARY_ERROR:        { label: '❌ 요약 실패', className: 'text-red-500' },
  SUMMARIZING_COMPLETE: { label: '🔍 최종 검수 필요', className: 'text-purple-500' },
  COMPLETE:             { label: '🌐 업로드 완료', className: 'text-green-600' },
}

const LOG_ICON = {
  error: '❌',
  success: '✅',
  running: '⏳',
}

function Dashboard() {
  const [books, setBooks] = useState([])
  const [logs, setLogs] = useState([]) 
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState(null)
  const fileInputRef = useRef(null)

  // 책 목록을 서버에서 불러오는 함수
  const fetchBooks = () => {
    getAdminBooks()
      .then(data => setBooks(data.books || []))
      .catch(err => console.error('책 목록 로드 실패:', err))
  }

  // 첫 마운트 시 책 목록 가져오기
  useEffect(() => {
    fetchBooks()
  }, [])

  // 파일 확장자 검사 및 저장
  const handleFile = (selectedFile) => {
    if (!selectedFile) return
    if (!selectedFile.name.endsWith('.epub')) {
      alert('.epub 파일만 업로드 가능합니다.')
      return
    }
    setFile(selectedFile)
  }

  // 드롭 이벤트
  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  // 파일 업로드 수행
  const handleUpload = async () => {
    if (!file) {
      fileInputRef.current?.click()
      return
    }
    
    try {
      await uploadBook(file)
      alert('파일이 성공적으로 업로드되었습니다.')
      setFile(null)
      fetchBooks() 
    } catch (error) {
      console.error('업로드 실패:', error)
      alert('파일 업로드 중 오류가 발생했습니다.')
    }
  }

  // 오류 상태 책 재시도 로직
  const handleRetry = async (bookId) => {
    // 1. 낙관적 업데이트: 화면에서 먼저 'ANALYZING'으로 상태를 변경
    setBooks(prev => prev.map(b => {
      const currentId = b.books_id || b.id
      return currentId === bookId ? { ...b, status: 'ANALYZING' } : b
    }))

    try {
      await analyzeBook(bookId)
      alert('분석을 다시 시작합니다.')
      fetchBooks()
    } catch (error) {
      console.error('재시도 실패:', error)
      alert('재시도 요청 중 오류가 발생했습니다.')
      fetchBooks() 
    }
  }

  // 1차 파이프라인 수동 실행
  const handleAnalyze = async (bookId) => {
    // 버튼 클릭 즉시 상태를 'ANALYZING'으로 바꾸어 연타 방지 및 UX 개선
    setBooks(prev => prev.map(b => {
      const currentId = b.books_id || b.id
      return currentId === bookId ? { ...b, status: 'ANALYZING' } : b
    }))

    try {
      await analyzeBook(bookId)
      alert('분석을 시작합니다.')
      fetchBooks()
    } catch (error) {
      console.error('분석 시작 실패:', error)
      alert('분석 시작 중 오류가 발생했습니다.')
      fetchBooks()
    }
  }

  // 2차 파이프라인 실행 핸들러 (틀 잡아두기)
  const handleSecondaryAnalyze = async (bookId) => {
    try {
      console.log('2차 분석 시작 API 호출:', bookId)
      // await analyzeBookSecondary(bookId) // 실제 2차 API가 있다면 여기에 연결
      // alert('2차 분석을 시작합니다.')
      // fetchBooks()
    } catch (error) {
      console.error('2차 분석 실패:', error)
    }
  }

  // 웹 소켓 연결 및 실시간 데이터 수신
  useEffect(() => {
    const token = localStorage.getItem('accessToken')

    if (!token || token === 'null') {
      console.warn("로그인 토큰이 없으므로 웹소켓 연결을 보류합니다.")
      return
    }

    connectWebSocket((message) => {
      console.log('웹소켓 메시지:', message)

      const newLog = {
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        type: message.event === 'ERROR' || message.event === 'METADATA_ERROR' ? 'error'
              : message.event === 'PROGRESS' ? 'running'
              : 'success',
        text: message.message || `${message.event} — Book ID: ${message.book_id || message.book?.books_id}`
      }
      setLogs(prev => [newLog, ...prev]) 
      
      // METADATA_COMPLETE 이벤트 받으면 해당 책 status 업데이트
      if (message.event === 'METADATA_COMPLETE' && message.book) {
        setBooks(prev => prev.map(b =>
          String(b.books_id || b.id) === String(message.book.books_id || message.book.id)
            ? { ...b, status: 'METADATA_COMPLETE' }
            : b
        ))
      }

      // COMPLETE, ERROR 이벤트 받으면 책 목록 전체 새로고침
      if (['COMPLETE', 'ERROR', 'METADATA_ERROR'].includes(message.event)) {
        fetchBooks()
      }
    })

    return () => disconnectWebSocket()
  }, [])

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

      {/* epub 업로드 슬롯 */}
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
              {file ? file.name : '파일을 여기에 끌어놓거나 클릭하세요  (.epub)'}
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

      {/* 등록된 책 목록 테이블 */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-gray-700 mb-3">등록된 책 목록</p>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400">
            <span>제목</span>
            <span>저자</span>
            <span>상태</span>
            <span>조치</span>
          </div>
          {books.map((book, i) => {
            const currentId = book.books_id || book.id 
            return (
              <div
                key={currentId}
                className={`grid grid-cols-4 px-5 py-4 items-center text-sm ${
                  book.status === 'ERROR' ? 'bg-red-50' : 'bg-white'
                } ${i !== books.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <span className="font-medium text-gray-900">{book.title}</span>
                <span className="text-gray-400">{book.author}</span>
                <span className={`font-medium ${STATUS_MAP[book.status]?.className || 'text-gray-500'}`}>
                  {STATUS_MAP[book.status]?.label || book.status}
                </span>
                <span className="flex gap-2">
                  {book.status === 'READY' && (
                    <button
                      onClick={() => handleAnalyze(currentId)}
                      className="px-4 py-1.5 bg-green-900 text-white text-xs font-semibold rounded-lg hover:bg-green-800 transition-colors shadow-sm"
                    >
                      1차 분석 시작(인물, 관계도)
                    </button>
                  )}
                  {book.status === 'ANALYZING_COMPLETE' && (
                    <button
                      onClick={() => handleSecondaryAnalyze(currentId)}
                      className="px-4 py-1.5 bg-green-50 text-green-900 border border-green-300 text-xs font-semibold rounded-lg hover:bg-green-100 transition-colors shadow-sm"
                    >
                      2차 분석 시작(요약)
                    </button>
                  )}
                  {['ANALYZING_ERROR', 'SUMMARY_ERROR'].includes(book.status) && (
                    <button
                      onClick={() => handleRetry(currentId)}
                      className="px-4 py-1.5 bg-red-50 text-red-500 border border-red-300 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors shadow-sm"
                    >
                      재시도
                    </button>
                  )}
                </span>
              </div>
            )
          })} 
        </div>
      </div>

      {/* 실시간 알림 로그 */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">🔔 실시간 알림</p>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {logs.length === 0 ? (
            <div className="px-5 py-4 text-sm text-gray-400">아직 알림이 없습니다.</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex items-start gap-4 px-5 py-3.5 text-sm">
                <span className="text-gray-400 shrink-0 w-10">{log.time}</span>
                <span className="shrink-0">{LOG_ICON[log.type]}</span>
                <span className={log.type === 'error' ? 'text-red-500' : 'text-gray-700'}>
                  {log.text}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

export default Dashboard