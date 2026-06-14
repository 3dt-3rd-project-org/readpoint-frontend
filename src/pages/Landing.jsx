import { useNavigate } from 'react-router-dom'
import { RefreshCw, Shield, Network } from 'lucide-react'
import heroImg from '../assets/hero.jpg'
import { useEffect } from 'react'
import { useUser } from '../context/UserContext'

function Landing() {
  const { user } = useUser()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/library', { replace: true })
    }
  }, [user])


  return (
    <div className="min-h-screen">
      {/* 히어로 섹션 */}
      <div className="relative h-[700px] flex items-center">
        {/* 배경 이미지 */}
        <img
          src={heroImg}
          alt="hero"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* 어두운 오버레이 */}
        <div className="absolute inset-0 bg-black/50" />

        {/* 텍스트 */}
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
            Google로 시작하기
          </button>
        </div>
      </div>

      {/* 기능 소개 섹션 */}
      <div className="px-24 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">
          Readpoint가 특별한 이유
        </h2>

        <div className="grid grid-cols-3 gap-8">
          {[
            {
              icon: <RefreshCw size={32} className="text-green-900" />,
              title: '진도 동기화',
              desc: '챕터 이동 시 해당 시점 세계관만 활성화됩니다. 읽은 만큼만 보여요.'
            },
            {
              icon: <Shield size={32} className="text-green-900" />,
              title: '스포일러 차단',
              desc: 'SQL 단계에서 미래 데이터를 원천 차단합니다. 완벽한 스포일러 방지.'
            },
            {
              icon: <Network size={32} className="text-green-900" />,
              title: '인물 관계도',
              desc: '현재 진도 기준으로 동적으로 업데이트되는 인물 관계 그래프.'
            },
          ].map(feature => (
            <div
              key={feature.title}
              className="border border-gray-200 rounded-2xl p-10 hover:shadow-md transition-shadow"
            >
              <div className="mb-5">{feature.icon}</div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA 섹션 */}
      <div className="bg-green-900 px-24 py-16 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          지금 바로 시작해보세요
        </h2>
        <p className="text-white/70 mb-8">
          스포일러 걱정 없이 책을 더 깊이 즐기세요
        </p>
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