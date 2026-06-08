import { useState } from 'react'

const bookData = {
  1: {
    title: '데미안',
    totalChapters: 8,
    characters: [
      { name: '싱클레어', role: '화자/주인공', appearsAt: 1 },
      { name: '데미안', role: '정신적 스승', appearsAt: 1 },
      { name: '베아트리체', role: '이상화된 여인', appearsAt: 4 },
      { name: '크로머', role: '악당', appearsAt: 1 },
      { name: '에바 부인', role: '정신적 어머니', appearsAt: 7 },
      { name: '피스토리우스', role: '음악가/조언자', appearsAt: 5 },
    ],
    events: [
      { title: '크로머 협박 사건', chapter: 1 },
      { title: '데미안 첫 만남', chapter: 1 },
      { title: '카인의 표식 대화', chapter: 2 },
      { title: '베아트리체와의 만남', chapter: 4 },
      { title: '에바 부인 첫 등장', chapter: 7 },
      { title: '전쟁 발발', chapter: 8 },
    ]
  }
}

const books = [
  { id: 1, title: '데미안', author: '헤르만 헤세', color: '#3A7259' },
  { id: 2, title: '상록수', author: '심훈', color: '#2D3F6B' },
  { id: 3, title: '무영탑', author: '현진건', color: '#6B3A28' },
]

function Spoiler() {
  const [selectedBookId, setSelectedBookId] = useState(null)
  const [currentChapter, setCurrentChapter] = useState(4)

  const book = selectedBookId ? bookData[selectedBookId] : null
  const selectedBook = books.find(b => b.id === selectedBookId)

  const visibleCharacters = book?.characters.filter(c => c.appearsAt <= currentChapter)
  const lockedCharacters = book?.characters.filter(c => c.appearsAt > currentChapter)
  const visibleEvents = book?.events.filter(e => e.chapter <= currentChapter)
  const lockedEvents = book?.events.filter(e => e.chapter > currentChapter)

  if (!selectedBookId) {
    return (
      <div className="p-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">스포일러 차단 검증</h1>
        <p className="text-gray-500 text-sm mb-8">책을 선택해서 진도별 스포일러 차단을 확인하세요</p>
        <div className="flex gap-6">
          {books.map(book => (
            <div
              key={book.id}
              onClick={() => setSelectedBookId(book.id)}
              className="w-40 cursor-pointer hover:shadow-lg transition-shadow rounded-xl overflow-hidden border border-gray-200"
            >
              <div
                className="h-52 flex flex-col justify-end p-4"
                style={{ backgroundColor: book.color }}
              >
                <p className="text-white font-bold text-sm">{book.title}</p>
                <p className="text-white/70 text-xs">{book.author}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-10">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => setSelectedBookId(null)}
          className="text-sm text-green-800 font-semibold hover:text-green-600"
        >
          ← 책 목록
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {selectedBook?.title} — 스포일러 검증
        </h1>
      </div>

      {/* 진도 슬라이더 */}
      <div className="bg-gray-50 rounded-2xl p-6 mb-8">
        <p className="text-sm text-gray-500 mb-3">현재 진도 설정</p>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">1장</span>
          <input
            type="range"
            min={1}
            max={book.totalChapters}
            value={currentChapter}
            onChange={(e) => setCurrentChapter(Number(e.target.value))}
            className="flex-1 accent-green-700"
          />
          <span className="text-sm text-gray-400">{book.totalChapters}장</span>
        </div>
        <p className="text-center text-green-900 font-bold mt-2">
          제{currentChapter}장 기준
        </p>
      </div>

      {/* 3단 컬럼 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 등장 인물 */}
        <div className="border border-gray-200 rounded-2xl p-6">
          <p className="font-bold text-gray-900 mb-4">
            👥 등장 인물 ({visibleCharacters?.length}명)
          </p>
          <div className="space-y-3 mb-6">
            {visibleCharacters?.map(c => (
              <div key={c.name} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-900 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {c.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.role}</p>
                </div>
              </div>
            ))}
          </div>
          {lockedCharacters?.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-400 font-semibold mb-3">
                🔒 잠긴 인물 ({lockedCharacters.length}명)
              </p>
              {lockedCharacters.map(c => (
                <div key={c.name} className="flex items-center gap-3 mb-2 opacity-40">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white text-xs">
                    ?
                  </div>
                  <p className="text-sm text-gray-400">???</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 사건 */}
        <div className="border border-gray-200 rounded-2xl p-6">
          <p className="font-bold text-gray-900 mb-4">
            📌 사건 ({visibleEvents?.length}건)
          </p>
          <div className="space-y-3 mb-6">
            {visibleEvents?.map(e => (
              <div key={e.title} className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{e.title}</p>
                  <p className="text-xs text-gray-400">제{e.chapter}장</p>
                </div>
              </div>
            ))}
          </div>
          {lockedEvents?.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-400 font-semibold mb-3">
                🔒 잠긴 사건 ({lockedEvents.length}건)
              </p>
              {lockedEvents.map(e => (
                <div key={e.title} className="flex items-center gap-3 mb-2 opacity-40">
                  <div className="w-2 h-2 bg-gray-300 rounded-full" />
                  <p className="text-sm text-gray-400">???</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Spoiler