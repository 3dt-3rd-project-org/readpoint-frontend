import { useState, useEffect } from 'react'

/* ============================================================
   API 연동 포인트
   fetchBookData(bookId) 함수만 교체하면 실제 API로 전환됩니다.

   API 응답 스펙:
   {
     book: { title: string, total_chapters: number },
     characters: [
       { character_id: number, name: string, role: string, first_seen_chapter: number | null }
     ],
     events: [
       { event_id: number, title: string, chapter: number }
     ]
   }
============================================================ */

async function fetchBookData(bookId) {
  // ── 실제 API로 교체할 때 아래 주석을 해제하고 목업 블록을 제거하세요 ──
  //
  // const res = await fetch(`/api/books/${bookId}/spoiler-data`)
  // if (!res.ok) throw new Error(`서버 오류: ${res.status}`)
  // return res.json()

  // ── 목업 데이터 (API 연동 전 임시) ──
  await new Promise(r => setTimeout(r, 600))
  return {
    book: { title: '데미안', total_chapters: 9 },
    characters: [
      { character_id: 1,  name: '싱클레어',        role: '주인공',        first_seen_chapter: 1 },
      { character_id: 5,  name: '프랭크 크로머',    role: '학생',          first_seen_chapter: 2 },
      { character_id: 6,  name: '싱클레어의 아버지', role: '아버지',        first_seen_chapter: 2 },
      { character_id: 7,  name: '싱클레어의 어머니', role: '어머니',        first_seen_chapter: 2 },
      { character_id: 9,  name: '막스 데미안',      role: '친구',          first_seen_chapter: 3 },
      { character_id: 11, name: '목사님',           role: '교사',          first_seen_chapter: 4 },
      { character_id: 12, name: '알폰스 벡',        role: '선배 학생',     first_seen_chapter: 5 },
      { character_id: 13, name: '베아트리체',        role: '소녀',          first_seen_chapter: 5 },
      { character_id: 14, name: '폴렌 박사',        role: '교사',          first_seen_chapter: 6 },
      { character_id: 15, name: '피스토리우스',      role: '오르간 연주자', first_seen_chapter: 6 },
      { character_id: 16, name: '크나우어',         role: '학생',          first_seen_chapter: 7 },
      { character_id: 17, name: '에바 부인',        role: '어머니',        first_seen_chapter: 8 },
      { character_id: 18, name: '정원 노부인',       role: '집주인',        first_seen_chapter: 8 },
      { character_id: 19, name: '일본인',           role: '학생',          first_seen_chapter: 8 },
      { character_id: 8,  name: '리나',             role: '하녀',          first_seen_chapter: null },
    ],
    events: [
      { event_id: 1,  title: '충동에 따르려 함',     chapter: 1 },
      { event_id: 7,  title: '거짓 도둑질 자랑',     chapter: 2 },
      { event_id: 8,  title: '현관의 첫 협박',       chapter: 2 },
      { event_id: 9,  title: '고백 포기 결심',       chapter: 2 },
      { event_id: 13, title: '카인 해석 대화',       chapter: 3 },
      { event_id: 16, title: '크로머의 해제 확인',   chapter: 3 },
      { event_id: 17, title: '부모에게 고백',        chapter: 3 },
      { event_id: 19, title: '사춘기 충돌',          chapter: 4 },
      { event_id: 20, title: '견진반 재회',          chapter: 4 },
      { event_id: 22, title: '십자가 도둑 논쟁',     chapter: 4 },
      { event_id: 25, title: '알폰스 벡과 첫 음주', chapter: 5 },
      { event_id: 27, title: '베아트리체 발견',      chapter: 5 },
      { event_id: 29, title: '데미안과 술집 대화',   chapter: 5 },
      { event_id: 31, title: '쪽지와 아브락사스',    chapter: 6 },
      { event_id: 35, title: '피스토리우스 첫만남',  chapter: 6 },
      { event_id: 36, title: '가르침과 꿈해석',      chapter: 6 },
      { event_id: 37, title: '아브락사스 가르침',    chapter: 7 },
      { event_id: 39, title: '크나우어의 호소',      chapter: 7 },
      { event_id: 42, title: '피스토리우스와 균열',  chapter: 7 },
      { event_id: 44, title: '거리에서 재회',        chapter: 8 },
      { event_id: 45, title: '에바 첫 만남',         chapter: 8 },
      { event_id: 46, title: '집단 합류와 사랑',     chapter: 8 },
      { event_id: 48, title: '에바 소환 시도',       chapter: 9 },
      { event_id: 51, title: '전쟁과 이별',          chapter: 9 },
      { event_id: 53, title: '야전 재회와 키스',     chapter: 9 },
    ],
  }
}

/* ============================================================
   서브 컴포넌트
============================================================ */

function SkeletonLines() {
  return (
    <div className="space-y-3">
      {[70, 50, 60].map(w => (
        <div
          key={w}
          className="h-3 rounded animate-pulse bg-gray-200"
          style={{ width: `${w}%` }}
        />
      ))}
    </div>
  )
}

function CharacterList({ characters, currentChapter }) {
  const visible = characters.filter(
    c => c.first_seen_chapter !== null && c.first_seen_chapter <= currentChapter
  )
  const locked = characters.filter(
    c => c.first_seen_chapter === null || c.first_seen_chapter > currentChapter
  )

  return (
    <>
      <p className="font-medium text-sm text-gray-900 mb-4">
        등장 인물{' '}
        <span className="text-gray-400 font-normal">({visible.length}명)</span>
      </p>

      <div className="space-y-3 mb-4">
        {visible.map(c => (
          <div key={c.character_id} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-800 flex items-center justify-center text-xs font-medium text-teal-50 shrink-0">
              {c.name[0]}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{c.name}</p>
              <p className="text-xs text-gray-400">{c.role}</p>
            </div>
          </div>
        ))}
      </div>

      {locked.length > 0 && (
        <>
          <hr className="border-gray-100 mb-3" />
          <p className="text-xs text-gray-400 font-medium mb-3">
            🔒 잠긴 인물 ({locked.length}명)
          </p>
          <div className="space-y-3">
            {locked.map(c => (
              <div key={c.character_id} className="flex items-center gap-3 opacity-40">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-400 shrink-0">
                  ?
                </div>
                <p className="text-sm text-gray-400">???</p>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

function EventList({ events, currentChapter }) {
  const visible = events.filter(e => e.chapter <= currentChapter)
  const locked  = events.filter(e => e.chapter > currentChapter)

  return (
    <>
      <p className="font-medium text-sm text-gray-900 mb-4">
        사건{' '}
        <span className="text-gray-400 font-normal">({visible.length}건)</span>
      </p>

      <div className="space-y-3 mb-4">
        {visible.map(e => (
          <div key={e.event_id} className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-teal-500 shrink-0 mt-1.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">{e.title}</p>
              <p className="text-xs text-gray-400">제{e.chapter}장</p>
            </div>
          </div>
        ))}
      </div>

      {locked.length > 0 && (
        <>
          <hr className="border-gray-100 mb-3" />
          <p className="text-xs text-gray-400 font-medium mb-3">
            🔒 잠긴 사건 ({locked.length}건)
          </p>
          <div className="space-y-3">
            {locked.map(e => (
              <div key={e.event_id} className="flex items-start gap-3 opacity-40">
                <div className="w-2 h-2 rounded-full bg-gray-300 shrink-0 mt-1.5" />
                <p className="text-sm text-gray-400">???</p>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

/* ============================================================
   메인 컴포넌트
   Props:
     bookId (number | string) — API에 넘길 책 ID, 기본값 1
============================================================ */

export default function Spoiler({ bookId = 1 }) {
  const [currentChapter, setCurrentChapter] = useState(4)
  const [data, setData]     = useState(null)   // { book, characters, events }
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchBookData(bookId)
      .then(res => {
        setData(res)
        setCurrentChapter(Math.min(currentChapter, res.book.total_chapters))
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [bookId])

  const totalChapters = data?.book?.total_chapters ?? 9

  return (
    <div className="p-10">
      {/* 진도 슬라이더 */}
      <div className="bg-gray-50 rounded-2xl p-6 mb-8">
        <p className="text-sm text-gray-500 mb-3">현재 진도 설정</p>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">1장</span>
          <input
            type="range"
            min={1}
            max={totalChapters}
            step={1}
            value={currentChapter}
            onChange={e => setCurrentChapter(Number(e.target.value))}
            className="flex-1 accent-teal-700"
            disabled={loading}
          />
          <span className="text-sm text-gray-400">{totalChapters}장</span>
        </div>
        <p className="text-center text-teal-900 font-bold mt-2">
          제{currentChapter}장 기준
        </p>
      </div>

      {/* 패널 */}
      <div className="grid grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-2xl p-6">
          {loading ? (
            <SkeletonLines />
          ) : error ? (
            <p className="text-sm text-red-500">데이터를 불러오지 못했습니다.</p>
          ) : (
            <CharacterList
              characters={data.characters}
              currentChapter={currentChapter}
            />
          )}
        </div>

        <div className="border border-gray-200 rounded-2xl p-6">
          {loading ? (
            <SkeletonLines />
          ) : error ? (
            <p className="text-sm text-red-500">데이터를 불러오지 못했습니다.</p>
          ) : (
            <EventList
              events={data.events}
              currentChapter={currentChapter}
            />
          )}
        </div>
      </div>
    </div>
  )
}
