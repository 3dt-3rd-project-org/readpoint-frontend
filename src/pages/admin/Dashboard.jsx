import { useState, useRef, useEffect } from 'react'
import { connectWebSocket, disconnectWebSocket } from '../../websocket'
import { uploadBook, getAdminBooks, analyzeBook, summarizeBook, approveAnalysis, approveSummary } from '../../api'

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

  // ==========================================
  // ⚙️ 관리자 핵심 제어 핸들러 함수들
  // ==========================================

  // 1. [재시도] 핸들러
  const handleRetry = async (bookId) => {
    setBooks(prev => prev.map(b => {
      const currentId = b.books_id || b.id
      return currentId === bookId ? { ...b, status: 'ANALYZING' } : b
    }))

    const initLog = {
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      type: 'running',
      text: `🔄 관리자가 재시도를 시작했습니다. (Book ID: ${bookId})`
    }
    setLogs(prev => [initLog, ...prev])

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

  // 2. [1차 분석 시작] 핸들러
  const handleAnalyze = async (bookId) => {
    setBooks(prev => prev.map(b => {
      const currentId = b.books_id || b.id
      return currentId === bookId ? { ...b, status: 'ANALYZING' } : b
    }))

    const initLog = {
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      type: 'running',
      text: `🚀 관리자가 1차 분석 파이프라인을 시작했습니다. (Book ID: ${bookId})`
    }
    setLogs(prev => [initLog, ...prev])

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

  // 3. [1차 검수 승인] 핸들러
  const handleApproveAnalysis = async (bookId) => {
    const initLog = {
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      type: 'success',
      text: `👍 관리자가 1차 분석 결과를 승인했습니다. (Book ID: ${bookId})`
    }
    setLogs(prev => [initLog, ...prev])

    try {
      await approveAnalysis(bookId)
      alert('1차 검수가 승인되었습니다.')
      fetchBooks()
    } catch (error) {
      console.error('1차 승인 실패:', error)
      alert('승인 처리 중 오류가 발생했습니다.')
      fetchBooks()
    }
  }

  // 4. [요약 생성] 핸들러
  const handleSummarize = async (bookId) => {
    setBooks(prev => prev.map(b => {
      const currentId = b.books_id || b.id
      return currentId === bookId ? { ...b, status: 'SUMMARIZING' } : b
    }))

    const initLog = {
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      type: 'running',
      text: `📝 관리자가 요약 및 관계도 생성 파이프라인을 시작했습니다. (Book ID: ${bookId})`
    }
    setLogs(prev => [initLog, ...prev])

    try {
      await summarizeBook(bookId)
      alert('요약 생성을 시작합니다.')
      fetchBooks()
    } catch (error) {
      console.error('요약 생성 실패:', error)
      alert('요약 생성 중 오류가 발생했습니다.')
      fetchBooks()
    }
  }

  // 5. [2차 검수 승인] 핸들러
  const handleApproveSummary = async (bookId) => {
    const initLog = {
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      type: 'success',
      text: `🌐 관리자가 최종 요약을 승인하여 서비스를 배포했습니다! (Book ID: ${bookId})`
    }
    setLogs(prev => [initLog, ...prev])

    try {
      await approveSummary(bookId)
      alert('최종 검수가 승인되어 서비스에 반영되었습니다.')
      fetchBooks()
    } catch (error) {
      console.error('최종 승인 실패:', error)
      alert('최종 승인 처리 중 오류가 발생했습니다.')
      fetchBooks()
    }
  }

  // ==========================================
  // 📡 실시간 웹소켓 이벤트 감지 및 처리 구역
  // ==========================================
  useEffect(() => {
    const token = localStorage.getItem('accessToken')

    if (!token || token === 'null') {
      console.warn("로그인 토큰이 없으므로 웹소켓 연결을 보류합니다.")
      return
    }

    let isActive = true

    connectWebSocket((payload) => {
      if (!isActive) return 

      console.log('★ 실시간 웹소켓 배달 원본:', payload)

      // 1. 대소문자 꼬임 방지를 위한 상단 변환
      const incomingStatus = (payload.status || '').toUpperCase()

      // 2. 알림창 한글 맵핑 템플릿
      const DEFAULT_MESSAGES = {
        'ANALYZING_FINISHED': '🎉 1차 본문 분석 파이프라인이 완료되었습니다! (검수 필요)',
        'SUMMARIZING_COMPLETE': '🎉 요약 및 관계도 생성 파이프라인이 완료되었습니다! (최종 검수 필요)',
        'ANALYZING_ERROR': '❌ 1차 본문 분석 중 오류가 발생했습니다.',
        'SUMMARY_ERROR': '❌ 요약 생성 중 오류가 발생했습니다.',
        'METADATA_COMPLETE': '📂 새 도서의 메타데이터 파싱 및 등록이 완료되었습니다.',
        'METADATA_ERROR': '❌ 도서 메타데이터 파싱 중 오류가 발생했습니다.'
      }

      // 3. 문구 우선순위 판단 (ADF 에러 알맹이 -> 백엔드 메세지 -> 기본 한글 문구 -> 기계 디폴트)
      const logText = payload.error 
        || payload.message 
        || DEFAULT_MESSAGES[incomingStatus] 
        || `${incomingStatus} — Book ID: ${payload.book_id || '알 수 없음'}`

      // 4. 에러 및 진행률 아이콘 맵핑 버그 완전 박멸
      const newLog = {
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        type: incomingStatus.includes('ERROR') ? 'error'
              : incomingStatus.includes('PROGRESS') ? 'running'
              : 'success',
        text: logText
      }
      
      setLogs(prev => [newLog, ...prev]) 
      
      // 5. 실시간 상태 전환 유도
      const refreshEvents = [
        'ANALYZING_FINISHED',
        'ANALYZING_ERROR',   
        'SUMMARIZING_COMPLETE',
        'SUMMARY_ERROR',       
        'METADATA_COMPLETE',   
        'METADATA_ERROR'
      ]

      if (refreshEvents.includes(incomingStatus)) {
        fetchBooks()
      }
    })

    return () => {
      isActive = false
      disconnectWebSocket()
    }
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
            const isError = ['ANALYZING_ERROR', 'SUMMARY_ERROR'].includes(book.status)
            return (
              <div
                key={currentId}
                className={`grid grid-cols-4 px-5 py-4 items-center text-sm ${
                  isError ? 'bg-red-50' : 'bg-white'
                } ${i !== books.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <span className="font-medium text-gray-900">{book.title}</span>
                <span className="text-gray-400">{book.author}</span>
                <span className={`font-medium ${STATUS_MAP[book.status]?.className || 'text-gray-500'}`}>
                  {STATUS_MAP[book.status]?.label || book.status}
                </span>
                <span className="flex gap-2">
                  {book.status === 'READY' && (
                    <button onClick={() => handleAnalyze(currentId)}
                      className="px-4 py-1.5 bg-green-900 text-white text-xs font-semibold rounded-lg hover:bg-green-800 transition-colors shadow-sm">
                      1차 분석 시작
                    </button>
                  )}
                  {book.status === 'ANALYZING_FINISHED' && (
                    <button onClick={() => handleApproveAnalysis(currentId)}
                      className="px-4 py-1.5 bg-green-50 text-green-900 border border-green-300 text-xs font-semibold rounded-lg hover:bg-green-100 transition-colors shadow-sm">
                      1차 검수 승인
                    </button>
                  )}
                  {book.status === 'ANALYZING_COMPLETE' && (
                    <button onClick={() => handleSummarize(currentId)}
                      className="px-4 py-1.5 bg-green-900 text-white text-xs font-semibold rounded-lg hover:bg-green-800 transition-colors shadow-sm">
                      요약 생성
                    </button>
                  )}
                  {book.status === 'SUMMARIZING_COMPLETE' && (
                    <button onClick={() => handleApproveSummary(currentId)}
                      className="px-4 py-1.5 bg-green-50 text-green-900 border border-green-300 text-xs font-semibold rounded-lg hover:bg-green-100 transition-colors shadow-sm">
                      2차 검수 승인
                    </button>
                  )}
                  {isError && (
                    <button onClick={() => handleRetry(currentId)}
                      className="px-4 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm">
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