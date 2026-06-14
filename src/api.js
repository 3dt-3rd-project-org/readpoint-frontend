const BASE_URL = 'https://final-project-api-management.azure-api.net'

// 토큰 저장/조회/삭제
export const setToken = (token) => localStorage.setItem('accessToken', token)
export const getToken = () => localStorage.getItem('accessToken')
export const removeToken = () => localStorage.removeItem('accessToken')

// 공통 fetch 함수 (토큰 자동 첨부)
const authFetch = async (url, options = {}) => {
  const token = getToken()
  // FormData면 Content-Type 안 넣음 (브라우저가 자동으로 처리)
  const isFormData = options.body instanceof FormData
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json'}),
      'Authorization': `Bearer ${getToken()}`,
      ...options.headers,
    }
  })
  if (res.status === 401) {
    removeToken()
    window.location.href = '/auth'
  }
  return res.json()
}

// ── Auth ──────────────────────────────────────
// 사용자 로그인 (code -> JWT 토큰)
export const userLogin = (code) => authFetch('/auth/user/login', {
  method: 'POST',
  body: JSON.stringify({ code })
})

// 관리자 로그인 (code -> JWT 토큰)
export const adminLogin = (code) => authFetch('/auth/admin/login', {
  method: 'POST',
  body: JSON.stringify({ code })
})

// 회원 탈퇴
export const withdrawUser = () => authFetch('/auth/withdraw', { method: 'DELETE' })

// ── Admin Books ──────────────────────────────────────
// epub 업로드
export const uploadBook = async (file) => {
  const formData = new FormData()
  formData.append('bookFile', file)
  return authFetch('/adm/books', { method: 'POST', body: formData })
}

// 관리자 책 목록
export const getAdminBooks = () => authFetch('/adm/books')

// 책 삭제
export const deleteBook = (bookId) => authFetch(`/adm/books/${bookId}`, { method: 'DELETE'})

// 책 분석 실행
export const analyzeBook = (bookId) => authFetch(`/adm/books/${bookId}/analyze`, {
  method: 'POST'
})

// 요약 파이프라인 실행
export const summarizeBook = (bookId) => authFetch(`/adm/books/${bookId}/summary`, { method: 'POST' })

// 1차 검수 승인
export const approveAnalysis = (bookId) => authFetch(`/adm/books/${bookId}/approve-analysis`, { method: 'POST' })

// 2차 검수 승인
export const approveSummary = (bookId) => authFetch(`/adm/books/${bookId}/approve-summary`, { method: 'POST' })

// 책 수정
export const updateBook = (bookId, data) => authFetch(`/adm/books/${bookId}`, {
  method: 'PUT',
  body: JSON.stringify(data)
})

// 책 검수 인물 목록
export const getBookCharactersForReview = (bookId) => authFetch(`/adm/books/${bookId}/characters`)

// 책 검수 관계 목록
export const getBookRelationsForReview = (bookId) => authFetch(`/adm/books/${bookId}/relations`)

// 책 검수 사건 목록
export const getBookEventsForReview = (bookId) => authFetch(`/adm/books/${bookId}/events`)

export const approveAnalysisForReview = (bookId, data) => authFetch(`/adm/books/${bookId}/approve-analysis`, {
  method: 'POST',
  body: JSON.stringify(data)
})

// ── Reader Books ─────────────────────────────────────
// 사용자 책 목록
export const getBooks = () => authFetch('/books')

// 책 상세
export const getBookById = (bookId) => authFetch(`/books/${bookId}`)

// 챕터 목록
export const getBookChapters = (bookId) => authFetch(`/books/${bookId}/chapters`)

// 사건 목록
export const getBookEvents = (bookId, chapter, p) => 
  authFetch(`/books/${bookId}/events?c=${chapter}&p=${p}`)

// 인물 관계도
export const getBookRelations = (bookId, chapter, p = 1) => 
  authFetch(`/books/${bookId}/relations?c=${chapter}&p=${p}`)

// ── WebPubSub ─────────────────────────────────
// 웹소켓 토큰
export const getWebPubSubToken = () => authFetch('/adm/analyze/token')


// ── Application Insights ─────────────────────────────────
// 인사이트 조회
export const getInsights = (timespan = 'PT1H') => authFetch(`/insights/insights?timespan=${timespan}`)