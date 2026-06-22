import { useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import {
  BarChart2, Bell, BookOpen, Upload,
  CheckCircle, XCircle, Loader,
  FolderOpen, Clock, AlertCircle, Search, Globe, RefreshCw
} from 'lucide-react'
import { connectWebSocket, disconnectWebSocket } from '../../websocket'
import { uploadBook, getAdminBooks, analyzeBook, getInsights } from '../../api'
import { XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts'

// 책 상태별 라벨 + lucide 아이콘 매핑
const STATUS_MAP = {
  READY:                { label: '분석 전',       icon: <FolderOpen size={14} />,   className: 'text-gray-400' },
  ANALYZING:            { label: '분석 중',        icon: <Clock size={14} />,         className: 'text-yellow-600' },
  ANALYZING_ERROR:      { label: '분석 실패',      icon: <AlertCircle size={14} />,   className: 'text-red-500' },
  ANALYZING_FINISHED:   { label: '1차 검수 필요',  icon: <Search size={14} />,        className: 'text-gray-500' },
  ANALYZING_COMPLETE:   { label: '1차 검수 완료',  icon: <CheckCircle size={14} />,   className: 'text-gray-500' },
  SUMMARIZING:          { label: '요약 중',        icon: <Clock size={14} />,         className: 'text-yellow-600' },
  SUMMARY_ERROR:        { label: '요약 실패',      icon: <AlertCircle size={14} />,   className: 'text-red-500' },
  SUMMARIZING_COMPLETE: { label: '최종 검수 필요', icon: <Search size={14} />,        className: 'text-gray-500' },
  COMPLETE:             { label: '업로드 완료',    icon: <Globe size={14} />,         className: 'text-green-600' },
}

// 알림 로그 아이콘
const LOG_ICON = {
  error:   <XCircle size={16} className="text-red-500 shrink-0" />,
  success: <CheckCircle size={16} className="text-green-500 shrink-0" />,
  running: <Loader size={16} className="text-yellow-500 shrink-0" />,
}

// ms → 사람이 읽기 좋은 시간 포맷
function formatMs(ms) {
  if (!ms) return '-'
  if (ms < 1000) return `${Math.round(ms)}ms`
  const min = Math.floor(ms / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  return min > 0 ? `${min}분 ${sec}초` : `${sec}초`
}

// 스켈레톤 컴포넌트
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

function Dashboard() {
  const navigate = useNavigate()

  const [books, setBooks] = useState([])
  const [isLoadingBooks, setIsLoadingBooks] = useState(true)
  const [isLoadingInsights, setIsLoadingInsights] = useState(true)
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState(null)
  const [isNewLog, setIsNewLog] = useState(false)
  const [timespan, setTimespan] = useState('PT1H')
  const [insights, setInsights] = useState({
    totalRequests: 0,
    failedRequests: 0,
    avgResponseTime: 0,
    successRate: 0,
    requestsByOperation: [],
    failedDetails: [],
  })

  // 파이프라인 알림 로그 - localStorage에 저장해서 탭 이동 후에도 유지
  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('pipeline_logs')
    return saved ? JSON.parse(saved) : []
  })

  const fileInputRef = useRef(null)

  const TIMESPAN_OPTIONS = [
    { label: '30분', value: 'PT30M' },
    { label: '1시간', value: 'PT1H' },
    { label: '6시간', value: 'PT6H' },
    { label: '12시간', value: 'PT12H' },
    { label: '1일', value: 'P1D' },
    { label: '3일', value: 'P3D' },
    { label: '7일', value: 'P7D' },
  ]

  // 로그 변경 시 localStorage 동기화
  useEffect(() => {
    localStorage.setItem('pipeline_logs', JSON.stringify(logs))
  }, [logs])

  // 책 목록 조회
  const fetchBooks = () => {
    setIsLoadingBooks(true)
    getAdminBooks()
      .then(data => {
        setBooks(data.books || [])
        setIsLoadingBooks(false)
      })
      .catch(err => {
        console.error('책 목록 로드 실패:', err)
        setIsLoadingBooks(false)
      })
  }

  // 로그 변경 시 하이라이트 트리거
  useEffect(() => {
    if (logs.length === 0) return
    setIsNewLog(true)
    const timer = setTimeout(() => setIsNewLog(false), 1500)
    return () => clearTimeout(timer)
  }, [logs])

  // 초기 데이터 로드 + timespan 변경 시 insights 재조회
  useEffect(() => {
    fetchBooks()
    setIsLoadingInsights(true)
    getInsights(timespan)
      .then(data => {
        setInsights(data)
        setIsLoadingInsights(false)
      })
      .catch(() => setIsLoadingInsights(false))
  }, [timespan])

  // WebSocket 연결 - 파이프라인 실시간 알림 수신
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token || token === 'null') return

    let isActive = true

    connectWebSocket((payload) => {
      if (!isActive) return

      const incomingStatus = (payload.status || '').toUpperCase()

      const DEFAULT_MESSAGES = {
        'ANALYZING_FINISHED':   '1차 분석 파이프라인이 완료되었습니다! (검수 필요)',
        'SUMMARIZING_COMPLETE': '요약 및 관계도 생성 파이프라인이 완료되었습니다! (최종 검수 필요)',
        'ANALYZING_ERROR':      '1차 분석 중 오류가 발생했습니다.',
        'SUMMARY_ERROR':        '요약 생성 중 오류가 발생했습니다.',
        'METADATA_COMPLETE':    `새 도서의 메타데이터 파싱 및 등록이 완료되었습니다. (Book ID: ${payload.book?.books_id || '알 수 없음'})`,
        'METADATA_ERROR':       '도서 메타데이터 파싱 중 오류가 발생했습니다.'
      }

      const logText = payload.error || payload.message || DEFAULT_MESSAGES[incomingStatus] || `${incomingStatus} — Book ID: ${payload.books_id || '알 수 없음'}`

      setLogs(prev => [{
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        type: incomingStatus.includes('ERROR') ? 'error'
          : incomingStatus.includes('FINISHED') || incomingStatus.includes('COMPLETE') ? 'success'
          : (payload.message || '').includes('성공') ? 'success'
          : 'running',
        text: logText
      }, ...prev].slice(0, 50))

      if (['ANALYZING_FINISHED', 'ANALYZING_ERROR', 'SUMMARIZING_COMPLETE', 'SUMMARY_ERROR', 'METADATA_COMPLETE', 'METADATA_ERROR'].includes(incomingStatus)) {
        fetchBooks()
      }
    })

    return () => {
      isActive = false
      disconnectWebSocket()
    }
  }, [])

  // 파일 유효성 검사 및 선택
  const handleFile = (selectedFile) => {
    if (!selectedFile) return
    if (!selectedFile.name.endsWith('.epub')) {
      alert('.epub 파일만 업로드 가능합니다.')
      return
    }
    setFile(selectedFile)
  }

  // 드래그앤드롭
  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  // epub 업로드
  const handleUpload = async () => {
    if (!file) {
      fileInputRef.current?.click()
      return
    }
    try {
      await uploadBook(file)
      setLogs(prev => [{
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        type: 'success',
        text: `${file.name} 업로드가 완료되었습니다.`
      }, ...prev].slice(0, 50))
      setFile(null)
      fetchBooks()
    } catch (error) {
      console.error('업로드 실패:', error)
      setLogs(prev => [{
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        type: 'error',
        text: `파일 업로드 중 오류가 발생했습니다.`
      }, ...prev].slice(0, 50))
    }
  }

  // 오류 시 1차 분석 재시도
  const handleRetry = async (bookId) => {
    setBooks(prev => prev.map(b =>
      (b.books_id || b.id) === bookId ? { ...b, status: 'ANALYZING' } : b
    ))
    setLogs(prev => [{
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      type: 'running',
      text: '관리자가 재시도를 시작했습니다.'
    }, ...prev].slice(0, 50))
    try {
      await analyzeBook(bookId)
      fetchBooks()
    } catch (error) {
      console.error('재시도 실패:', error)
      fetchBooks()
    }
  }

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
                  timespan === opt.value ? 'bg-green-900 text-white' : 'text-gray-400 hover:text-green-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 지표 카드 4개 */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          {isLoadingInsights ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                <Skeleton className="h-3 w-16 mb-3" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))
          ) : (
            [
              { label: '총 요청 수',    value: `${insights.totalRequests}회`,       highlight: false },
              { label: '성공률',        value: `${insights.successRate}%`,           highlight: 'green' },
              { label: '평균 응답시간', value: formatMs(insights.avgResponseTime),   highlight: 'green' },
              { label: '실패 요청',     value: `${insights.failedRequests}건`,       highlight: 'red' },
            ].map(({ label, value, highlight }) => (
              <div
                key={label}
                className={`bg-white rounded-xl border px-5 py-4 ${highlight === 'red' ? 'border-red-300' : 'border-gray-200'}`}
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
            ))
          )}
        </div>

        {/* 차트 영역 */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {isLoadingInsights ? (
            <>
              <div className="col-span-2 bg-white rounded-xl border border-gray-200 px-5 py-4">
                <Skeleton className="h-3 w-24 mb-3" />
                <Skeleton className="h-[250px] w-full" />
              </div>
              <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                <Skeleton className="h-3 w-24 mb-3" />
                <Skeleton className="h-[180px] w-full rounded-full mx-auto" />
              </div>
            </>
          ) : (
            <>
              <div className="col-span-2 bg-white rounded-xl border border-gray-200 px-5 py-4">
                <p className="text-xs text-gray-400 mb-3">함수별 요청 수</p>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={insights.requestsByOperation || []} margin={{ bottom: 60 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 9 }}
                      tickFormatter={(v) => v.replace('GET ', '').replace('POST ', '')}
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

              <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                <p className="text-xs text-gray-400 mb-3">성공 / 실패 비율</p>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value">
                      <Cell fill="#1A3C2E" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Legend iconSize={10} />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>

        {/* 실패 요청 상세 테이블 */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400">실패 요청 상세</p>
            <p className="text-xs text-gray-300">최근 20건</p>
          </div>
          {isLoadingInsights ? (
            <div className="space-y-2">
              {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : !insights.failedDetails || insights.failedDetails.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">실패 요청이 없습니다.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400">
                  <th className="text-left pb-2 font-medium">시간</th>
                  <th className="text-left pb-2 font-medium">함수명</th>
                  <th className="text-left pb-2 font-medium">에러코드</th>
                  <th className="text-right pb-2 font-medium">응답시간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {insights.failedDetails.map((row, i) => (
                  <tr key={i}>
                    <td className="py-2 text-gray-400">
                      {new Date(row.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-2 text-gray-700">{row.name}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        row.resultCode >= 500 ? 'bg-red-50 text-red-500' : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        {row.resultCode}
                      </span>
                    </td>
                    <td className="py-2 text-right text-gray-500">{formatMs(row.duration)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* epub 업로드 */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Upload size={14} /> epub 업로드
        </p>
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
              {file ? file.name : '파일을 여기에 끌어놓거나 클릭하세요 (.epub)'}
            </p>
            <input ref={fileInputRef} type="file" accept=".epub" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
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
        <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <BookOpen size={14} /> 등록된 책 목록
        </p>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400">
            <span>제목</span><span>저자</span><span>상태</span><span>조치</span>
          </div>

          {isLoadingBooks ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="grid grid-cols-4 px-5 py-4 items-center border-b border-gray-100">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-24 rounded-lg" />
              </div>
            ))
          ) : books.length === 0 ? (
            <div className="px-5 py-8 text-sm text-gray-400 text-center">등록된 책이 없습니다.</div>
          ) : (
            books.map((book, i) => {
              const currentId = book.books_id || book.id
              const isError = ['ANALYZING_ERROR', 'SUMMARY_ERROR'].includes(book.status)
              const statusInfo = STATUS_MAP[book.status]

              return (
                <div
                  key={currentId}
                  className={`grid grid-cols-4 px-5 py-4 items-center text-sm ${isError ? 'bg-red-50' : 'bg-white'} ${i !== books.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <span className="font-medium text-gray-900">{book.title}</span>
                  <span className="text-gray-400">{book.author}</span>
                  <span className={`font-medium flex items-center gap-1 ${statusInfo?.className || 'text-gray-500'}`}>
                    {statusInfo?.icon}
                    {statusInfo?.label || book.status}
                  </span>
                  <span className="flex gap-2">
                    {book.status === 'READY' && (
                      <button
                        onClick={() => navigate(`/admin/booksinfo?bookId=${currentId}`)}
                        className="px-4 py-1.5 bg-yellow-50 text-yellow-800 border border-yellow-300 text-xs font-semibold rounded-lg hover:bg-yellow-100 transition-colors shadow-sm"
                      >
                        메타 검수
                      </button>
                    )}
                    {book.status === 'ANALYZING_FINISHED' && (
                      <button
                        onClick={() => navigate(`/admin/review?bookId=${currentId}`)}
                        className="px-4 py-1.5 bg-orange-50 text-orange-800 border border-orange-300 text-xs font-semibold rounded-lg hover:bg-orange-100 transition-colors shadow-sm"
                      >
                        1차 검수하기
                      </button>
                    )}
                    {book.status === 'SUMMARIZING_COMPLETE' && (
                      <button
                        onClick={() => navigate(`/admin/summary?bookId=${currentId}`)}
                        className="px-4 py-1.5 bg-blue-50 text-blue-900 border border-blue-300 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors shadow-sm"
                      >
                        2차 검수하기
                      </button>
                    )}
                    {isError && (
                      <button
                        onClick={() => handleRetry(currentId)}
                        className="px-4 py-1.5 bg-red-50 text-red-700 border border-red-300 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors shadow-sm flex items-center gap-1"
                      >
                        <RefreshCw size={12} /> 재시도
                      </button>
                    )}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 실시간 알림 로그 */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Bell size={14} /> 실시간 알림
        </p>
        <div className={`bg-white rounded-xl border divide-y divide-gray-100 max-h-60 overflow-y-auto transition-all duration-300 ${
          isNewLog ? 'border-green-200 shadow-green-50 shadow-sm' : 'border-gray-200'
        }`}>
          {logs.length === 0 ? (
            <div className="px-5 py-4 text-sm text-gray-400">아직 알림이 없습니다.</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 text-xs">
                <span className="text-gray-400 shrink-0 w-16">{log.time}</span>
                <span className="shrink-0">{LOG_ICON[log.type]}</span>
                <span className={`truncate ${
                  log.type === 'error' ? 'text-red-500'
                  : log.type === 'success' ? 'text-green-600'
                  : 'text-gray-700'
                }`}>
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