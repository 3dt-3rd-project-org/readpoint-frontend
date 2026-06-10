import { useState, useRef, useEffect } from 'react'
import { connectWebSocket, disconnectWebSocket } from '../../websocket'
import { uploadBook, getAdminBooks } from '../../api' // 추후 retryBookApi 같은 게 있다면 추가

const MOCK_STATS = {
  totalRuns: 24,
  successRate: 87.5,
  avgTime: '4분 32초',
  recentErrors: 3,
}

const STATUS_MAP = {
  COMPLETE:   { label: '✅ 분석완료', className: 'text-green-600' },
  METADATA_COMPLETE: { label: '📋 검수 대기', className: 'text-blue-500' },
  ANALYZING:  { label: '⏳ 분석중',   className: 'text-yellow-600' },
  ERROR:      { label: '❌ 오류 발생', className: 'text-red-500' },
}

const LOG_ICON = {
  error: '❌',
  success: '✅',
  running: '⏳',
}

function Dashboard() {
  const [books, setBooks] = useState([])
  const [logs, setLogs] = useState([]) // 실시간 로그도 상태로 관리하여 업데이트 가능하게 변경
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
      fetchBooks() // 업로드 성공 후 목록 최신화
    } catch (error) {
      console.error('업로드 실패:', error)
      alert('파일 업로드 중 오류가 발생했습니다.')
    }
  }

  // 오류 상태 책 재시도 로직
  const handleRetry = async (bookId) => {
    // 1. 화면에서 먼저 'running'으로 상태를 바꿔 시각적 피드백 제공
    setBooks(prev => prev.map(b => {
      const currentId = b.books_id || b.id
      return currentId === bookId ? { ...b, status: 'running' } : b
    }))

    try {
      // 2. 실제 백엔드 재시도 API 호출 예시 (프로젝트 스펙에 맞게 주석 해제하여 사용하세요)
      // await retryBookApi(bookId)
      // fetchBooks() 
    } catch (error) {
      console.error('재시도 실패:', error)
      alert('재시도 요청 중 오류가 발생했습니다.')
      fetchBooks() // 에러 시 원래 상태로 복구하기 위해 리프레시
    }
  }

  // DAG2 파이프라인 수동 실행
  const handleRunDAG2 = (bookId) => {
    console.log('DAG2 실행:', bookId)
    // 추후 runDag2Api(bookId) 같은 API 연동 필요
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
      setLogs(prev => [newLog, ...prev]) // 최신로그가 위에서부터
      
      // METADATA_COMPLETE 이벤트 받으면 해당 책 status 업데이트
      if (message.event === 'METADATA_COMPLETE' && message.book) {
        setBooks(prev => prev.map(b =>
          String(b.books_id) === String(message.book.books_id)
            ? {...b, ststus: 'METADATA_COMPLETE' }
            : b
        ))
      }

      // COMPLETE, ERROR 이벤트 받으면 책 목록 전체 새로고침
      if (['COMPLETE', 'ERROR', 'METADATA_ERROR'].includes(message.event)) {
        getAdminBooks().then(data => setBooks(data.books || []))
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
            <span>액션</span>
          </div>
          {books.map((book, i) => {
            const currentId = book.books_id || book.id; // 안전하게 고유 ID 추출
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
                <span>
                  {book.status === 'METADATA_COMPLETE' && ( 
                    <button
                      onClick={() => handleRunDAG2(currentId)}
                      className="px-4 py-1.5 bg-green-900 text-white text-xs font-semibold rounded-full hover:bg-green-800 transition-colors"
                    >
                      분석 시작
                    </button>
                  )}
                  {book.status === 'COMPLETE' && (
                    <button onClick={() => {}}>
                      2차 분석 시작
                    </button>
                  )}
                  {book.status === 'ERROR' && (
                    <button
                      onClick={() => handleRetry(currentId)}
                      className="text-sm text-red-500 font-medium hover:underline"
                    >
                      재시도
                    </button>
                  )}
                </span>
              </div>
            )
          })} {/* 맵 컴포넌트 괄호 구조 정상 복구 */}
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