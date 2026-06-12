import { useState, useRef, useEffect } from 'react'
import { BarChart2, Bell, BookOpen, Upload, CheckCircle, XCircle, Loader } from 'lucide-react'
import { connectWebSocket, disconnectWebSocket } from '../../websocket'
import { uploadBook, getAdminBooks, analyzeBook, summarizeBook, approveAnalysis, approveSummary, getInsights } from '../../api'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts'

const STATUS_MAP = {
  READY:                { label: '📂 분석 전', className: 'text-gray-400' },
  ANALYZING:            { label: '⏳ 분석 중', className: 'text-yellow-600' },
  ANALYZING_ERROR:      { label: '❌ 분석 실패', className: 'text-red-500' },
  ANALYZING_FINISHED:   { label: '🔍 1차 검수 필요', className: 'text-gray-500' },
  ANALYZING_COMPLETE:   { label: '✅ 1차 검수 완료', className: 'text-gray-500' },
  SUMMARIZING:          { label: '⏳ 요약 중', className: 'text-yellow-600' },
  SUMMARY_ERROR:        { label: '❌ 요약 실패', className: 'text-red-500' },
  SUMMARIZING_COMPLETE: { label: '🔍 최종 검수 필요', className: 'text-gray-500' },
  COMPLETE:             { label: '🌐 업로드 완료', className: 'text-green-600' },
}

const LOG_ICON = {
  error: <XCircle size={16} className="text-red-500 shrink-0" />,
  success: <CheckCircle size={16} className="text-green-500 shrink-0" />,
  running: <Loader size={16} className="text-yellow-500 shrink-0" />,
}

function formatMs(ms) {
  if (!ms) return '-'
  if (ms < 1000) return `${Math.round(ms)}ms`
  const min = Math.floor(ms / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  return min > 0 ? `${min}분 ${sec}초` : `${sec}초`
}

function Dashboard() {
  const [books, setBooks] = useState([])
  const [logs, setLogs] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState(null)
  const [insights, setInsights] = useState({
    totalRequests: 0,
    failedRequests: 0,
    avgResponseTime: 0,
    successRate: 0,
    requestsByOperation: []
  })
  const fileInputRef = useRef(null)

  const [timespan, setTimespan] = useState('PT1H')

  const TIMESPAN_OPTIONS = [
    { label: '30분', value: 'PT30M' },
    { label: '1시간', value: 'PT1H' },
    { label: '6시간', value: 'PT6H' },
    { label: '12시간', value: 'PT12H' },
    { label: '1일', value: 'P1D' },
    { label: '3일', value: 'P3D' },
    { label: '7일', value: 'P7D' },
  ]

  const fetchBooks = () => {
    getAdminBooks()
      .then(data => setBooks(data.books || []))
      .catch(err => console.error('책 목록 로드 실패:', err))
  }

  useEffect(() => {
    fetchBooks()
    getInsights(timespan).then(data => {
      console.log('insights data:', data)
      console.log('avgResponseTime:', data.avgResponseTime)
      setInsights(data)
    })
  }, [timespan])

  const handleFile = (selectedFile) => {
    if (!selectedFile) return
    if (!selectedFile.name.endsWith('.epub')) {
      alert('.epub 파일만 업로드 가능합니다.')
      return
    }
    setFile(selectedFile)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

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

  const handleRetry = async (bookId) => {
    setBooks(prev => prev.map(b => {
      const currentId = b.books_id || b.id
      return currentId === bookId ? { ...b, status: 'ANALYZING' } : b
    }))
    setLogs(prev => [{
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      type: 'running',
      text: `관리자가 재시도를 시작했습니다.`
    }, ...prev])
    try {
      await analyzeBook(bookId)
      fetchBooks()
    } catch (error) {
      console.error('재시도 실패:', error)
      fetchBooks()
    }
  }

  const handleAnalyze = async (bookId) => {
    setBooks(prev => prev.map(b => {
      const currentId = b.books_id || b.id
      return currentId === bookId ? { ...b, status: 'ANALYZING' } : b
    }))
    setLogs(prev => [{
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      type: 'running',
      text: `관리자가 1차 분석 파이프라인을 시작했습니다. (Book ID: ${bookId})`
    }, ...prev])
    try {
      await analyzeBook(bookId)
      fetchBooks()
    } catch (error) {
      console.error('분석 시작 실패:', error)
      fetchBooks()
    }
  }

  const handleApproveAnalysis = async (bookId) => {
    setLogs(prev => [{
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      type: 'success',
      text: `관리자가 1차 분석 결과를 승인했습니다.`
    }, ...prev])
    try {
      await approveAnalysis(bookId)
      fetchBooks()
    } catch (error) {
      console.error('1차 승인 실패:', error)
      fetchBooks()
    }
  }

  const handleSummarize = async (bookId) => {
    setBooks(prev => prev.map(b => {
      const currentId = b.books_id || b.id
      return currentId === bookId ? { ...b, status: 'SUMMARIZING' } : b
    }))
    setLogs(prev => [{
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      type: 'running',
      text: `관리자가 요약 및 관계도 생성 파이프라인을 시작했습니다.`
    }, ...prev])
    try {
      await summarizeBook(bookId)
      fetchBooks()
    } catch (error) {
      console.error('요약 생성 실패:', error)
      fetchBooks()
    }
  }

  const handleApproveSummary = async (bookId) => {
    setLogs(prev => [{
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      type: 'success',
      text: `관리자가 최종 요약을 승인하여 서비스를 배포했습니다!`
    }, ...prev])
    try {
      await approveSummary(bookId)
      fetchBooks()
    } catch (error) {
      console.error('최종 승인 실패:', error)
      fetchBooks()
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token || token === 'null') return

    let isActive = true

    connectWebSocket((payload) => {
      if (!isActive) return
      const incomingStatus = (payload.status || '').toUpperCase()
      const DEFAULT_MESSAGES = {
        'ANALYZING_FINISHED': '1차 본문 분석 파이프라인이 완료되었습니다! (검수 필요)',
        'SUMMARIZING_COMPLETE': '요약 및 관계도 생성 파이프라인이 완료되었습니다! (최종 검수 필요)',
        'ANALYZING_ERROR': '1차 본문 분석 중 오류가 발생했습니다.',
        'SUMMARY_ERROR': '요약 생성 중 오류가 발생했습니다.',
        'METADATA_COMPLETE': `새 도서의 메타데이터 파싱 및 등록이 완료되었습니다. (Book ID: ${payload.book?.books_id || '알 수 없음'})`,
        'METADATA_ERROR': '도서 메타데이터 파싱 중 오류가 발생했습니다.'
      }
      const logText = payload.error || payload.message || DEFAULT_MESSAGES[incomingStatus] || `${incomingStatus} — Book ID: ${payload.books_id || '알 수 없음'}`
      setLogs(prev => [{
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        type: incomingStatus.includes('ERROR') ? 'error'
          : incomingStatus.includes('FINISHED') || incomingStatus.includes('COMPLETE') ? 'success'
          : (payload.message || '').includes('성공') ? 'success'
          : 'running',
        text: logText
      }, ...prev])
      if (['ANALYZING_FINISHED', 'ANALYZING_ERROR', 'SUMMARIZING_COMPLETE', 'SUMMARY_ERROR', 'METADATA_COMPLETE', 'METADATA_ERROR'].includes(incomingStatus)) {
        fetchBooks()
      }
    })

    return () => {
      isActive = false
      disconnectWebSocket()
    }
  }, [])

  const pieData = [
    { name: '성공', value: insights.totalRequests - insights.failedRequests },
    { name: '실패', value: insights.failedRequests },
  ]


  return (
    <>
      <h1 className="text-xl font-bold text-gray-900 mb-6">파이프라인 현황</h1>

      {/* Application Insights */}
      <div className="mb-6">
        <div className="text-xs text-gray-400 flex items-center gap-1 mb-3">
          <BarChart2 size={14} /> Application Insights
          <div className="ml-auto flex gap-1">
            {TIMESPAN_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setTimespan(opt.value)}
                className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                  timespan === opt.value
                    ? 'bg-green-900 text-white'
                    : 'text-gray-400 hover:text-green-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 카드 4개 */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[
            { label: '총 요청 수', value: `${insights.totalRequests}회`, highlight: false },
            { label: '성공률', value: `${insights.successRate}%`, highlight: 'green' },
            { label: '평균 응답시간', value: formatMs(insights.avgResponseTime), highlight: 'green' },
            { label: '실패 요청', value: `${insights.failedRequests}건`, highlight: 'red' },
          ].map(({ label, value, highlight }) => (
            <div
              key={label}
              className={`bg-white rounded-xl border px-5 py-4 ${highlight === 'red' ? 'border-red-300' : 'border-gray-200'}`}
            >
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className={`text-2xl font-bold ${highlight === 'green' ? 'text-green-600' : highlight === 'red' ? 'text-red-500' : 'text-gray-900'}`}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* 그래프 2개 */}
        <div className="grid grid-cols-3 gap-4">
          {/* 라인 차트 */}
          {/* 바 차트 */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p className="text-xs text-gray-400 mb-3">함수별 요청 수</p>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={insights.requestsByOperation || []} margin={{ bottom: 60 }}>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 9 }}
                    tickFormatter={(value) => value.replace('GET ', '').replace('POST ', '')}
                    angle={-30} 
                    textAnchor="end" 
                    height={60}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="requests" fill="#1A3C2E" name="요청 수" />
                </BarChart>
              </ResponsiveContainer>
            </div>

          {/* 도넛 차트 */}
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p className="text-xs text-gray-400 mb-3">성공 / 실패 비율</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  dataKey="value"
                >
                  <Cell fill="#1A3C2E" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Legend iconSize={10} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* epub 업로드 */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Upload size={14} /> epub 업로드</p>
        <div className="flex gap-3">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex-1 flex items-center px-5 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${dragOver ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}
          >
            <p className="text-sm text-gray-400">
              {file ? file.name : '파일을 여기에 끌어놓거나 클릭하세요  (.epub)'}
            </p>
            <input ref={fileInputRef} type="file" accept=".epub" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
          </div>
          <button onClick={handleUpload} className="px-6 py-4 bg-green-900 text-white text-sm font-semibold rounded-xl hover:bg-green-800 transition-colors shrink-0">
            업로드
          </button>
        </div>
      </div>

      {/* 책 목록 */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <BookOpen size={14} /> 등록된 책 목록</p>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400">
            <span>제목</span><span>저자</span><span>상태</span><span>조치</span>
          </div>
          {books.map((book, i) => {
            const currentId = book.books_id || book.id
            const isError = ['ANALYZING_ERROR', 'SUMMARY_ERROR'].includes(book.status)
            return (
              <div
                key={currentId}
                className={`grid grid-cols-4 px-5 py-4 items-center text-sm ${isError ? 'bg-red-50' : 'bg-white'} ${i !== books.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <span className="font-medium text-gray-900">{book.title}</span>
                <span className="text-gray-400">{book.author}</span>
                <span className={`font-medium ${STATUS_MAP[book.status]?.className || 'text-gray-500'}`}>
                  {STATUS_MAP[book.status]?.label || book.status}
                </span>
                <span className="flex gap-2">
                  {book.status === 'READY' && <button onClick={() => handleAnalyze(currentId)} className="px-4 py-1.5 bg-green-900 text-white text-xs font-semibold rounded-lg hover:bg-green-800 transition-colors shadow-sm">1차 분석 시작</button>}
                  {book.status === 'ANALYZING_FINISHED' && <button onClick={() => handleApproveAnalysis(currentId)} className="px-4 py-1.5 bg-green-50 text-green-900 border border-green-300 text-xs font-semibold rounded-lg hover:bg-green-100 transition-colors shadow-sm">1차 검수 승인</button>}
                  {book.status === 'ANALYZING_COMPLETE' && <button onClick={() => handleSummarize(currentId)} className="px-4 py-1.5 bg-green-900 text-white text-xs font-semibold rounded-lg hover:bg-green-800 transition-colors shadow-sm">요약 생성</button>}
                  {book.status === 'SUMMARIZING_COMPLETE' && <button onClick={() => handleApproveSummary(currentId)} className="px-4 py-1.5 bg-green-50 text-green-900 border border-green-300 text-xs font-semibold rounded-lg hover:bg-green-100 transition-colors shadow-sm">2차 검수 승인</button>}
                  {isError && <button onClick={() => handleRetry(currentId)} className="px-4 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm">재시도</button>}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 실시간 알림 */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Bell size={14} /> 실시간 알림</p>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {logs.length === 0 ? (
            <div className="px-5 py-4 text-sm text-gray-400">아직 알림이 없습니다.</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex items-start gap-4 px-5 py-3.5 text-sm">
                <span className="text-gray-400 shrink-0 w-10">{log.time}</span>
                <span className="shrink-0">{LOG_ICON[log.type]}</span>
                <span className={
            log.type === 'error' ? 'text-red-500' 
            : log.type === 'success' ? 'text-green-600'
            : 'text-gray-700'
          }>{log.text}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

export default Dashboard