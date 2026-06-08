const BASE_URL = 'https://final-project-api-management.azure-api.net'

// 토큰 저장/조회/삭제
export const setToken = (token) => localStorage.setItem('token', token)
export const getToken = () => localStorage.getItem('token')
export const removeToken = () => localStorage.removeItem('token')

// 공통 fetch 함수 (토큰 자동 첨부)
const authFetch = async (url, options = {}) => {
  const token = getToken()
  // FormData면 Content-Type 안 넣음 (브라우저가 자동으로 처리)
  const isFormData = options.body instanceof FormData
  const res = await fetch(`${BASE_URL}$${url}`, {
    ...options,
    headers: {
      ...(isForamData ? {} : { 'Content-Type': 'application/json '}),
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
// 구글 로그인 URL 가져오기 (관리자)
export const getAdminGoogleLoginUrl = () => {
  window.location.href = `${BASE_URL}/auth/admin/google`
}

// 구글 로그인 URL 가져오기 (사용자)
export const getUserGoogleLoginUrl = () => {
  window.location.href = `${BASE_URL}/auth/user/google`
}

// Admin Books
// epub 업로드
export const uploadBook = async (file) => {
  const formData = new FormData()
  formData.append('bookFile', file)
  return authFetch('/adm/books', { method: 'POST', body: formData })
}

// 관리자 책 목록
export const getAdminBooks = () => authFetch('/admin/books')

// 책 삭제
export const deleteBook = (bookId) => authFetch(`/adm/books/${bookId}`, { method: 'DELETE'})

// 책 분석 실행
export const analyzeBook = (bookId) => authFetch(`/adm/books/${bookId}/analyze`)

// 책 수정
export const updateBook = (bookId, data) => authFetch(`/adm/books/${bookId}`, {
  method: 'PUT',
  body: JSON.stringify(data)
})

// ── Reader Books ─────────────────────────────────────
// 사용자 책 목록
export const getBooks = () => authFetch('/reader/books')

// 책 상세
export const getBookById = (bookId) => authFetch(`/reader/books/${bookId}`)

// 인물 관계도
export const getBookRelations = (bookId, chapter) => authFetch(`/reader/books/${bookId}/relations?chapter=${chapter}`)

// ── WebPubSub ─────────────────────────────────
// 웹소켓 토큰
export const getWebPubSubToken = () => authFetch('/adm/negotiate')

