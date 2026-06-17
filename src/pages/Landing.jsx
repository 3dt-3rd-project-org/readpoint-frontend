import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useUser } from '../context/UserContext'
import { getAllBooks } from '../api'
import heroImg from '../assets/hero.jpg'
import screenshotGraph from '../assets/screenshot-graph.png'
import screenshotViewer from '../assets/screenshot-viewer.png'
import screenshotLibrary from '../assets/screenshot-library.png'

const FEATURES = [
  {
    title: '인물 관계도',
    desc: '현재 읽은 챕터 기준으로 동적으로 업데이트되는 인물 관계 그래프. 사건별로 관계 변화를 탐색할 수 있어요.',
    img: screenshotGraph,
    alt: '인물 관계도 화면',
  },
  {
    title: 'AI 독서 메이트',
    desc: '읽은 범위 내에서만 답변하는 AI 토론 파트너. 스포일러 걱정 없이 깊이 있는 대화를 나눠보세요.',
    img: screenshotViewer,
    alt: '뷰어 및 AI 채팅 화면',
  },
  {
    title: '진도 동기화',
    desc: '읽은 위치가 자동 저장되어 언제든 이어읽을 수 있어요. 읽은 시점까지의 관계도와 AI 독서 메이트도 함께 활성화됩니다.',
    img: screenshotLibrary,
    alt: '서재 화면',
  },
]

function Landing() {
  const { user } = useUser()
  const navigate = useNavigate()
  const [books, setBooks] = useState([])

  useEffect(() => {
    if (user) navigate('/library', { replace: true })
  }, [user])

  useEffect(() => {
    getAllBooks().then(data => setBooks(data.books || [])).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-white">

      {/* 히어로 섹션 */}
      <div className="relative min-h-[680px] flex items-center">
        <img src={heroImg} alt="hero" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative z-10 px-24 max-w-2xl">
          <h1 className="text-7xl font-bold text-white leading-tight mb-6">
            스포일러 없이,<br />더 깊이.
          </h1>
          <p className="text-white/90 text-lg italic font-light mb-2">
            "책을 읽는 사람은 죽기 전에 천 개의 삶을 산다"
          </p>
          <p className="text-white/60 text-sm mb-12">— 조지 R.R. 마틴</p>
          <button
            onClick={() => navigate('/auth')}
            className="bg-white text-green-900 px-10 py-4 rounded-full text-base font-semibold hover:bg-gray-100 transition-colors"
          >
            지금 시작하기
          </button>
        </div>
      </div>

      {/* 기능 소개 섹션 - 텍스트 + 스크린샷 교차 배치 */}
      <div className="py-24 px-24 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-16 text-center">
          Readpoint가 특별한 이유
        </h2>

        <div className="flex flex-col gap-24">
          {FEATURES.map((feature, idx) => (
            <div
              key={feature.title}
              className={`flex items-center gap-16 ${idx % 2 === 1 ? 'flex-row-reverse' : ''}`}
            >
              {/* 텍스트 */}
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-500 text-base leading-relaxed">{feature.desc}</p>
              </div>

              {/* 스크린샷 */}
              <div className="flex-1">
                <img
                  src={feature.img}
                  alt={feature.alt}
                  className="w-full rounded-2xl shadow-xl border border-gray-100"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 책 목록 섹션 */}
      {books.length > 0 && (
        <div className="py-16 bg-gray-50">
          <div className="px-24">
            <h2 className="text-2xl font-bold text-gray-900 mb-10">지금 읽을 수 있는 책</h2>
            <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-none">
              {books.map(book => {
                const hasCover = book.cover_url && book.cover_url.trim() !== ''
                return (
                  <div
                    key={book.books_id}
                    className="shrink-0 w-40 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => navigate('/auth')}
                  >
                    <div
                      className="w-40 h-56 rounded-xl overflow-hidden shadow-md flex items-end p-4"
                      style={{
                        backgroundColor: hasCover ? 'transparent' : '#1A3C2E',
                        backgroundImage: hasCover ? `url(${book.cover_url})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    >
                      {!hasCover && (
                        <div>
                          <p className="text-white text-sm font-bold line-clamp-2">{book.title}</p>
                          <p className="text-white/60 text-xs mt-1">{book.author}</p>
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-800 mt-2 line-clamp-1">{book.title}</p>
                    <p className="text-xs text-gray-400">{book.author}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* CTA 섹션 */}
      <div className="bg-green-900 px-24 py-16 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">지금 바로 시작해보세요</h2>
        <p className="text-white/70 mb-8">스포일러 걱정 없이 책을 더 깊이 즐기세요</p>
        <button
          onClick={() => navigate('/auth')}
          className="border-2 border-white text-white px-10 py-4 rounded-full text-base font-semibold hover:bg-white hover:text-green-900 transition-colors"
        >
          Google로 시작하기
        </button>
      </div>

    </div>
  )
}

export default Landing