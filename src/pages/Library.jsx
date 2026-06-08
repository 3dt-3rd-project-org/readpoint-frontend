import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

function Library() {
  const [selectedBook, setSelectedBook] = useState(null)
  const navigate = useNavigate()

  const books = [
    {
      id: 1,
      title: '데미안',
      author: '헤르만 헤세',
      progress: 45,
      lastChapter: '제4장 베아트리체',
      summary: '싱클레어는 새로운 소녀 베아트리체를 만나 이상화하기 시작한다. 데미안과의 관계는 점차 더 깊어져 간다.',
      color: '#3A7259'
    },
    {
      id: 2,
      title: '상록수',
      author: '심훈',
      progress: 20,
      lastChapter: '제2장',
      summary: '채영신과 박동혁은 농촌 계몽 운동에 헌신하며 서로의 존재를 의지한다.',
      color: '#2D3F6B'
    },
    {
      id: 3,
      title: '무영탑',
      author: '현진건',
      progress: 60,
      lastChapter: '제8장',
      summary: '아사달은 석가탑을 완성하기 위해 혼신을 다하지만 아사녀와의 이별이 다가온다.',
      color: '#6B3A28'
    },
  ]

  return (
    <div className="flex">
      {/* 서재 메인 */}
      <div className={`transition-all duration-300 ${selectedBook ? 'w-[calc(100%-500px)]' : 'w-full'} px-24 py-10`}>
        <h1 className="text-2xl font-bold text-gray-900">나의 서재</h1>
        <p className="text-gray-500 mt-2 text-sm">현재 읽고 있는 책</p>

        <div className="flex gap-10 mt-8 flex-wrap">
          {books.map(book => (
            <div
              key={book.id}
              onClick={() => setSelectedBook(book)}
              className={`w-80 rounded-2xl border overflow-hidden cursor-pointer hover:shadow-lg transition-all ${
                selectedBook?.id === book.id
                  ? 'border-green-500 shadow-lg'
                  : 'border-gray-200'
              }`}
            >
              {/* 표지 */}
              <div
                className="h-60 p-6 flex flex-col justify-end"
                style={{ backgroundColor: book.color }}
              >
                <h2 className="text-white text-xl font-bold">{book.title}</h2>
                <p className="text-white/70 text-sm mt-2">{book.author}</p>
              </div>

              {/* 정보 */}
              <div className="p-5">
                <p className="font-bold text-gray-900">{book.title}</p>
                <p className="text-gray-500 text-sm mt-1 mb-3">{book.author}</p>

                <div className="bg-gray-200 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-green-500"
                    style={{ width: `${book.progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">{book.progress}%  ·  마지막: {book.lastChapter}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 이어읽기 카드 (우측 슬라이드) */}
      <AnimatePresence>
        {selectedBook && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-16 w-[500px] h-[calc(100vh-64px)] bg-white border-l border-gray-200 shadow-xl z-40 overflow-y-auto"
          >
            {/* 상단 초록 띠 */}
            <div className="h-1.5 bg-green-500 w-full" />

            <div className="p-8">
              {/* 닫기 버튼 */}
              <div className="flex justify-between items-center mb-6">
                <span className="text-sm text-gray-500 font-semibold">이어읽기</span>
                <button
                  onClick={() => setSelectedBook(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ✕
                </button>
              </div>

              {/* 표지 */}
              <div
                className="w-full h-52 rounded-xl flex flex-col justify-end p-6 mb-6"
                style={{ backgroundColor: selectedBook.color }}
              >
                <h2 className="text-white text-2xl font-bold">{selectedBook.title}</h2>
                <p className="text-white/70 mt-1">{selectedBook.author}</p>
              </div>

              {/* 현재 위치 */}
              <div className="border-t border-gray-100 pt-5 mb-5">
                <p className="text-xs text-gray-400 mb-1">📍 현재 위치</p>
                <p className="text-lg font-bold text-gray-900">{selectedBook.lastChapter}</p>
              </div>

              {/* 진도 */}
              <div className="bg-gray-100 rounded-full h-1.5 mb-2">
                <div
                  className="h-1.5 rounded-full bg-green-500"
                  style={{ width: `${selectedBook.progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mb-5">{selectedBook.progress}%  ·  마지막 독서: 어제</p>

              {/* 줄거리 요약 */}
              <div className="border-t border-gray-100 pt-5 mb-6">
                <p className="text-xs text-gray-400 mb-2">📝 줄거리 요약</p>
                <p className="text-sm text-gray-700 leading-relaxed">{selectedBook.summary}</p>
              </div>

              {/* 버튼 */}
              <div className="flex gap-3 mb-3">
                <button 
                  onClick={() => navigate(`/viewer/${selectedBook.id}`)}
                  className="flex-1 bg-green-900 text-white rounded-full py-3 font-semibold hover:bg-green-800 transition-colors">
                  이어읽기
                </button>
                <button 
                  onClick={() => navigate(`/viewer/${selectedBook.id}`)}
                  className="flex-1 bg-gray-100 text-gray-500 rounded-full py-3 hover:bg-gray-200 transition-colors">
                  처음부터
                </button>
              </div>
              <button onClick={() => navigate(`/graph?bookId=${selectedBook.id}`)}
                className="w-full border border-green-800 text-green-800 rounded-full py-3 text-sm font-medium hover:bg-green-50 transition-colors">
                📊 관계도 보기
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Library