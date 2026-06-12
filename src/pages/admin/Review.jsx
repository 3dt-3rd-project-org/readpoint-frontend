import { useEffect, useState, useCallback } from 'react'
import { getAdminBooks } from '../../api'

/* ============================================================
   API 연동 포인트
   실제 API 연동 시 각 함수의 주석을 해제하고 목업 블록을 제거하세요

   가정한 엔드포인트:
     GET  /api/admin/books                        → 책 목록
     GET  /api/admin/books/:bookId/characters     → 인물 목록
     GET  /api/admin/books/:bookId/relations      → 관계 목록
     GET  /api/admin/books/:bookId/events         → 사건 목록
     PUT  /api/admin/books/:bookId/characters     → 인물 전체 일괄 저장 (검수 완료 시)
     PUT  /api/admin/books/:bookId/relations      → 관계 전체 일괄 저장
     PUT  /api/admin/books/:bookId/events         → 사건 전체 일괄 저장

   요청 바디: { characters: [...] } / { relations: [...] } / { events: [...] }
   응답 스펙:
     characters: [{ id, name, role, chapter, desc, isDup }]
     relations:  [{ id, source, target, type, desc }]
     events:     [{ id, title, chapter, characters, desc }]

   저장 시점:
     화면에서 수정/삭제/병합 → 로컬 state에만 반영 (API 호출 없음)
     "검수 완료 →" 버튼 클릭 → 해당 단계 데이터 일괄 API 전송
============================================================ */

async function fetchCharacters(bookId) {
  // const res = await fetch(`/api/admin/books/${bookId}/characters`)
  // if (!res.ok) throw new Error(`서버 오류: ${res.status}`)
  // const data = await res.json()
  // return data.characters

  await new Promise(r => setTimeout(r, 500))
  return [
    { id: 1, name: '싱클레어',    role: '화자/주인공',   chapter: '제1장', desc: '내면 성장을 겪는 주인공',   isDup: false },
    { id: 2, name: '데미안',      role: '정신적 스승',   chapter: '제1장', desc: '카인의 표식을 지닌 자',    isDup: false },
    { id: 3, name: '막스 데미안', role: '정신적 스승',   chapter: '제1장', desc: '싱클레어의 친구',          isDup: true  },
    { id: 4, name: '베아트리체',  role: '이상화된 여인', chapter: '제4장', desc: '싱클레어가 동경하는 소녀', isDup: false },
    { id: 5, name: '에바 부인',   role: '정신적 어머니', chapter: '제7장', desc: '데미안의 어머니',          isDup: false },
  ]
}

async function fetchRelations(bookId) {
  await new Promise(r => setTimeout(r, 500))
  return [
    { 
      relationship_change_id: 1, 
      books_id: bookId,
      source_character_id: '싱클레어', // 추후 DB 연동 시에는 실제 ID나 JOIN된 이름 필드로 대체
      target_character_id: '데미안', 
      relation: '정신적 인도자', 
      change_summary: '카인과 아벨의 새로운 해석을 통해 싱클레어를 성장의 길로 이끄는 스승이자 내면의 동반자',
      is_core_relation: true // 중요 관계 표시용
    },
    { 
      relationship_change_id: 2, 
      books_id: bookId,
      source_character_id: '싱클레어', 
      target_character_id: '프랭크 크로머', 
      relation: '적대 및 종속', 
      change_summary: '거짓 도둑질 자랑으로 미끼를 잡아 싱클레어를 협박하고 착취하며 악몽에 시달리게 한 인물',
      is_core_relation: false
    },
    { 
      relationship_change_id: 3, 
      books_id: bookId,
      source_character_id: '데미안', 
      target_character_id: '프랭크 크로머', 
      relation: '문제 해결', 
      change_summary: '싱클레어의 고통을 알아채고 직접 찾아가 대화함으로써 크로머의 협박과 갈취를 종결시킴',
      is_core_relation: false
    }
  ]
}

async function fetchEvents(bookId) {
  await new Promise(r => setTimeout(r, 500))
  return [
    {
      event_id: 101,
      books_id: bookId,
      chapter_id: 1,
      event_order: 1,
      short_title: '크로머의 협박 시작',
      event_type: '갈등',
      summary: '싱클레어가 크로머에게 거짓으로 도둑질담을 늘어놓은 후, 이를 미끼로 협박당해 돈을 갈취당하기 시작함.',
      importance_score: 5,
      is_core_event: true,
      is_sensitive: false
    },
    {
      event_id: 102,
      books_id: bookId,
      chapter_id: 1,
      event_order: 2,
      short_title: '데미안과의 첫 만남',
      event_type: '인물 조우',
      summary: '학교에 새로 전학 온 데미안이 싱클레어에게 카인의 표식에 대한 기묘한 이야기를 건네며 깊은 인상을 남김.',
      importance_score: 5,
      is_core_event: true,
      is_sensitive: false
    }
  ]
}

// "검수 완료" 버튼 클릭 시 호출 — 로컬에서 수정한 전체 데이터를 한 번에 전송
async function submitStepData(bookId, stepKey, data) {
  // const res = await fetch(`/api/admin/books/${bookId}/${stepKey}`, {
  //   method: 'PUT',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ [stepKey]: data }),
  // })
  // if (!res.ok) throw new Error(`서버 오류: ${res.status}`)
  // return res.json()

  await new Promise(r => setTimeout(r, 600))
  return { success: true }
}

/* ============================================================
   상수
============================================================ */

const STEPS = [
  { key: 'characters', label: '인물 검수' },
  { key: 'relations',  label: '관계 검수' },
  { key: 'events',     label: '사건 검수' },
]

const initialStepStatus = { characters: 'active', relations: 'pending', events: 'pending' }

/* ============================================================
   훅: 단계별 데이터 로딩
   - 해당 단계가 active/done 될 때만 fetch
   - data: 로컬에서 자유롭게 수정 가능한 state
   - isDirty: 원본 대비 변경 여부 (선택적으로 UI에 표시 가능)
============================================================ */

function useStepData(bookId, stepKey, isActive) {
  const [data, setData]       = useState([])
  const [origin, setOrigin]   = useState([])   // 서버에서 받은 원본 (비교용)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    if (!bookId || !isActive) return
    setLoading(true)
    setError(null)
    try {
      let fetched = []
      if (stepKey === 'characters') fetched = await fetchCharacters(bookId)
      if (stepKey === 'relations')  fetched = await fetchRelations(bookId)
      if (stepKey === 'events')     fetched = await fetchEvents(bookId)
      setData(fetched)
      setOrigin(fetched)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [bookId, stepKey, isActive])

  useEffect(() => { load() }, [load])

  const isDirty = JSON.stringify(data) !== JSON.stringify(origin)

  return { data, setData, loading, error, reload: load, isDirty }
}

/* ============================================================
   서브 컴포넌트: StepIndicator
============================================================ */

function StepIndicator({ steps, status }) {
  return (
    <div className="flex items-start gap-0 mb-10">
      {steps.map((step, i) => {
        const s = status[step.key]
        const isLast = i === steps.length - 1
        return (
          <div key={step.key} className="flex items-start flex-1">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0
                ${s === 'done'   ? 'bg-green-900 text-white'
                : s === 'active' ? 'bg-green-900 text-white ring-4 ring-green-100'
                :                  'bg-gray-100 text-gray-400'}`}>
                {s === 'done' ? '✓' : i + 1}
              </div>
              <p className={`text-xs mt-1.5 font-medium whitespace-nowrap
                ${s === 'active' ? 'text-green-900' : s === 'done' ? 'text-gray-500' : 'text-gray-300'}`}>
                {step.label}
              </p>
            </div>
            {!isLast && (
              <div className={`flex-1 h-0.5 mt-4 mx-1
                ${s === 'done' || status[steps[i + 1].key] !== 'pending' ? 'bg-green-900' : 'bg-gray-200'}`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ============================================================
   서브 컴포넌트: LoadingRows / ErrorRow
============================================================ */

function LoadingRows() {
  return (
    <div className="space-y-3 py-2">
      {[70, 55, 65].map(w => (
        <div key={w} className="h-3 rounded bg-gray-100 animate-pulse" style={{ width: `${w}%` }} />
      ))}
    </div>
  )
}

function ErrorRow({ message, onRetry }) {
  return (
    <div className="flex items-center justify-between py-3 px-1">
      <p className="text-sm text-red-400">데이터를 불러오지 못했습니다. ({message})</p>
      <button onClick={onRetry} className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full hover:bg-gray-200">
        다시 시도
      </button>
    </div>
  )
}

/* ============================================================
   서브 컴포넌트: CharacterTable
   - 수정/삭제/병합은 모두 로컬 state만 변경 (API 호출 없음)
   - API 전송은 부모(StepSection)의 "검수 완료" 버튼에서 일괄 처리
============================================================ */

function CharacterTable({ characters, setCharacters, loading, error, onRetry }) {
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm]   = useState({})
  const [bulkMode, setBulkMode]   = useState(false)
  const [bulkDraft, setBulkDraft] = useState([])

  /* 개별 수정 — 로컬만 반영 */
  const handleEdit = (char) => {
    setEditingId(char.id)
    setEditForm({ name: char.name, role: char.role, desc: char.desc })
  }
  const handleSave = (id) => {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, ...editForm } : c))
    setEditingId(null)
  }
  const handleCancel = () => setEditingId(null)

  /* 삭제 / 병합 — 로컬만 반영 */
  const handleDelete = (id) => setCharacters(prev => prev.filter(c => c.id !== id))
  const handleMerge  = (id) => setCharacters(prev => prev.filter(c => c.id !== id))

  /* 전체 수정 — 로컬만 반영 */
  const enterBulk = () => {
    setBulkDraft(characters.map(c => ({ ...c })))
    setBulkMode(true)
    setEditingId(null)
  }
  const saveBulk = () => {
    setCharacters(bulkDraft)
    setBulkMode(false)
  }
  const cancelBulk   = () => setBulkMode(false)
  const updateDraft  = (id, field, value) =>
    setBulkDraft(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  const deleteDraft  = (id) => setBulkDraft(prev => prev.filter(c => c.id !== id))

  const rows = bulkMode ? bulkDraft : characters

  if (loading) return <LoadingRows />
  if (error)   return <ErrorRow message={error} onRetry={onRetry} />

  return (
    <div>
      {/* 툴바 */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">{rows.length}명</p>
        <div className="flex gap-2">
          {bulkMode ? (
            <>
              <button onClick={saveBulk}
                className="px-4 py-1.5 bg-green-900 text-white text-xs font-medium rounded-full hover:bg-green-800">
                전체 저장
              </button>
              <button onClick={cancelBulk}
                className="px-4 py-1.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full hover:bg-gray-200">
                취소
              </button>
            </>
          ) : (
            <button onClick={enterBulk}
              className="px-4 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full hover:bg-gray-200">
              전체 수정
            </button>
          )}
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-5 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400">
          <span>인물명</span><span>역할</span><span>첫 등장</span><span>설명</span><span>액션</span>
        </div>

        {rows.map((char, i) => (
          <div key={char.id}
            className={`grid grid-cols-5 px-5 py-4 items-center text-sm
              ${char.isDup ? 'bg-yellow-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
              ${i !== rows.length - 1 ? 'border-b border-gray-100' : ''}`}
          >
            {bulkMode ? (
              <>
                <input value={char.name} onChange={e => updateDraft(char.id, 'name', e.target.value)}
                  className="border border-gray-200 rounded px-2 py-1 text-xs w-full" />
                <input value={char.role} onChange={e => updateDraft(char.id, 'role', e.target.value)}
                  className="border border-gray-200 rounded px-2 py-1 text-xs w-full" />
                <span className="text-gray-400 text-xs">{char.chapter}</span>
                <input value={char.desc} onChange={e => updateDraft(char.id, 'desc', e.target.value)}
                  className="border border-gray-200 rounded px-2 py-1 text-xs w-full" />
                
              </>
            ) : editingId === char.id ? (
              <>
                <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-1 text-xs" />
                <input value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-1 text-xs" />
                <span className="text-gray-400">{char.chapter}</span>
                <input value={editForm.desc} onChange={e => setEditForm(p => ({ ...p, desc: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-1 text-xs" />
                <div className="flex gap-2">
                  <button onClick={() => handleSave(char.id)}
                    className="px-3 py-1 bg-green-900 text-white text-xs rounded-full">
                    저장
                  </button>
                  <button onClick={handleCancel}
                    className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                    취소
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className={`font-medium ${char.isDup ? 'text-yellow-700' : 'text-gray-900'}`}>
                  {char.name}
                  {char.isDup && (
                    <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">중복의심</span>
                  )}
                </span>
                <span className="text-gray-500">{char.role}</span>
                <span className="text-gray-400">{char.chapter}</span>
                <span className="text-gray-500 text-xs">{char.desc}</span>
                <div className="flex gap-2">
                  {/* {char.isDup && (
                    <button onClick={() => handleMerge(char.id)}
                      className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full hover:bg-yellow-200">
                      병합
                    </button>
                  )} */}
                  <button onClick={() => handleEdit(char)}
                    className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full hover:bg-gray-200">
                    수정
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function RelationTable({ data: relations, setData: setRelations, loading, error, onRetry }) {
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkDraft, setBulkDraft] = useState([])

  /* 개별 수정 — 로컬만 반영 */
  const handleEdit = (rel) => {
    setEditingId(rel.relationship_change_id) // PK 변경
    setEditForm({ 
      source_character_id: rel.source_character_id, 
      target_character_id: rel.target_character_id, 
      relation: rel.relation, 
      change_summary: rel.change_summary 
    })
  }
  
  const handleSave = (id) => {
    setRelations(prev => prev.map(r => r.relationship_change_id === id ? { ...r, ...editForm } : r))
    setEditingId(null)
  }
  const handleCancel = () => setEditingId(null)

  /* 전체 수정 — 로컬만 반영 */
  const enterBulk = () => {
    setBulkDraft(relations.map(r => ({ ...r })))
    setBulkMode(true)
    setEditingId(null)
  }
  const saveBulk = () => {
    setRelations(bulkDraft)
    setBulkMode(false)
  }
  const cancelBulk = () => setBulkMode(false)
  const updateDraft = (id, field, value) =>
    setBulkDraft(prev => prev.map(r => r.relationship_change_id === id ? { ...r, [field]: value } : r))
  const deleteDraft = (id) => setBulkDraft(prev => prev.filter(r => r.relationship_change_id !== id))

  const rows = bulkMode ? bulkDraft : relations

  if (loading) return <LoadingRows />
  if (error)   return <ErrorRow message={error} onRetry={onRetry} />

  return (
    <div>
      {/* 툴바 */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">{rows.length}개 관계</p>
        <div className="flex gap-2">
          {bulkMode ? (
            <>
              <button onClick={saveBulk}
                className="px-4 py-1.5 bg-green-900 text-white text-xs font-medium rounded-full hover:bg-green-800">
                전체 저장
              </button>
              <button onClick={cancelBulk}
                className="px-4 py-1.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full hover:bg-gray-200">
                취소
              </button>
            </>
          ) : (
            <button onClick={enterBulk}
              className="px-4 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full hover:bg-gray-200">
              전체 수정
            </button>
          )}
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-5 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400">
          <span>인물 A (ID)</span><span>인물 B (ID)</span><span>관계 내용</span><span>변경 요약</span><span>액션</span>
        </div>

        {rows.map((rel, i) => (
          <div key={rel.relationship_change_id}
            className={`grid grid-cols-5 px-5 py-4 items-center text-sm
              ${rel.is_core_relation ? 'bg-blue-50/30' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
              ${i !== rows.length - 1 ? 'border-b border-gray-100' : ''}`}
          >
            {bulkMode ? (
              <>
                <input value={rel.source_character_id} onChange={e => updateDraft(rel.relationship_change_id, 'source_character_id', e.target.value)}
                  className="border border-gray-200 rounded px-2 py-1 text-xs w-full" />
                <input value={rel.target_character_id} onChange={e => updateDraft(rel.relationship_change_id, 'target_character_id', e.target.value)}
                  className="border border-gray-200 rounded px-2 py-1 text-xs w-full" />
                <input value={rel.relation} onChange={e => updateDraft(rel.relationship_change_id, 'relation', e.target.value)}
                  className="border border-gray-200 rounded px-2 py-1 text-xs w-full" />
                <input value={rel.change_summary} onChange={e => updateDraft(rel.relationship_change_id, 'change_summary', e.target.value)}
                  className="border border-gray-200 rounded px-2 py-1 text-xs w-full" />
                {/* <div>
                  <button onClick={() => deleteDraft(rel.relationship_change_id)}
                    className="px-3 py-1 bg-red-50 text-red-500 text-xs rounded-full hover:bg-red-100">
                    삭제
                  </button>
                </div> */}
              </>
            ) : editingId === rel.relationship_change_id ? (
              <>
                <input value={editForm.source_character_id} onChange={e => setEditForm(p => ({ ...p, source_character_id: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-1 text-xs" />
                <input value={editForm.target_character_id} onChange={e => setEditForm(p => ({ ...p, target_character_id: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-1 text-xs" />
                <input value={editForm.relation} onChange={e => setEditForm(p => ({ ...p, relation: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-1 text-xs" />
                <input value={editForm.change_summary} onChange={e => setEditForm(p => ({ ...p, change_summary: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-1 text-xs" />
                <div className="flex gap-2">
                  <button onClick={() => handleSave(rel.relationship_change_id)} className="px-3 py-1 bg-green-900 text-white text-xs rounded-full">저장</button>
                  <button onClick={handleCancel} className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">취소</button>
                </div>
              </>
            ) : (
              <>
                <span className="font-medium text-gray-900">{rel.source_character_id}</span>
                <span className="font-medium text-gray-900">{rel.target_character_id}</span>
                <span className="text-green-800 font-semibold text-xs bg-green-50 px-2 py-0.5 rounded w-max truncate max-w-full" title={rel.relation}>
                  {rel.relation}
                </span>
                <span className="text-gray-500 text-xs truncate pr-2" title={rel.change_summary}>
                  {rel.change_summary}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(rel)} className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full hover:bg-gray-200">수정</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function EventTable({ data: events, setData: setEvents, loading, error, onRetry }) {
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkDraft, setBulkDraft] = useState([])

  /* 개별 수정 — 로컬만 반영 */
  const handleEdit = (evt) => {
    setEditingId(evt.event_id)
    setEditForm({ 
      short_title: evt.short_title, 
      chapter_id: evt.chapter_id, 
      event_type: evt.event_type, 
      summary: evt.summary,
      importance_score: evt.importance_score,
      is_sensitive: evt.is_sensitive
    })
  }
  const handleSave = (id) => {
    setEvents(prev => prev.map(e => e.event_id === id ? { ...e, ...editForm } : e))
    setEditingId(null)
  }
  const handleCancel = () => setEditingId(null)

  /* 삭제 — 로컬만 반영 */
  const handleDelete = (id) => setEvents(prev => prev.filter(e => e.event_id !== id))

  /* 전체 수정 — 로컬만 반영 */
  const enterBulk = () => {
    setBulkDraft(events.map(e => ({ ...e })))
    setBulkMode(true)
    setEditingId(null)
  }
  const saveBulk = () => {
    setEvents(bulkDraft)
    setBulkMode(false)
  }
  const cancelBulk = () => setBulkMode(false)
  
  const updateDraft = (id, field, value) =>
    setBulkDraft(prev => prev.map(e => e.event_id === id ? { ...e, [field]: value } : e))
  const deleteDraft = (id) => setBulkDraft(prev => prev.filter(e => e.event_id !== id))

  const rows = bulkMode ? bulkDraft : events

  if (loading) return <LoadingRows />
  if (error)   return <ErrorRow message={error} onRetry={onRetry} />

  return (
    <div>
      {/* 툴바 */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">{rows.length}개 사건</p>
        <div className="flex gap-2">
          {bulkMode ? (
            <>
              <button onClick={saveBulk}
                className="px-4 py-1.5 bg-green-900 text-white text-xs font-medium rounded-full hover:bg-green-800">
                전체 저장
              </button>
              <button onClick={cancelBulk}
                className="px-4 py-1.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full hover:bg-gray-200">
                취소
              </button>
            </>
          ) : (
            <button onClick={enterBulk}
              className="px-4 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full hover:bg-gray-200">
              전체 수정
            </button>
          )}
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* 그리드 비율 조정을 위해 컬럼 구성 변경 (6개 영역으로 확장 또는 너비 배분) */}
        <div className="grid grid-cols-6 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400">
          <span>사건명 / 유형</span><span>챕터 ID</span><span>중요도</span><span>민감 여부</span><span>사건 요약</span><span>액션</span>
        </div>

        {rows.map((evt, i) => (
          <div key={evt.event_id}
            className={`grid grid-cols-6 px-5 py-4 items-center text-sm
              ${evt.is_core_event ? 'bg-yellow-50/40' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
              ${i !== rows.length - 1 ? 'border-b border-gray-100' : ''}`}
          >
            {bulkMode ? (
              <>
                {/* 사건명 및 유형 (묶음 혹은 단일 input) */}
                <div className="flex flex-col gap-1 pr-2">
                  <input value={evt.short_title || ''} onChange={e => updateDraft(evt.event_id, 'short_title', e.target.value)}
                    className="border border-gray-200 rounded px-2 py-1 text-xs w-full" placeholder="사건명" />
                  <input value={evt.event_type || ''} onChange={e => updateDraft(evt.event_id, 'event_type', e.target.value)}
                    className="border border-gray-200 rounded px-2 py-1 text-[11px] w-full text-gray-500" placeholder="유형" />
                </div>
                
                <input value={evt.chapter_id || ''} onChange={e => updateDraft(evt.event_id, 'chapter_id', e.target.value)}
                  className="border border-gray-200 rounded px-2 py-1 text-xs w-20" />
                
                {/* 중요도 점수 수정 */}
                <input type="number" min="0" max="10" value={evt.importance_score || 0} onChange={e => updateDraft(evt.event_id, 'importance_score', parseInt(e.target.value) || 0)}
                  className="border border-gray-200 rounded px-2 py-1 text-xs w-16" />
                
                {/* 민감도 체크박스 수정 */}
                <label className="flex items-center gap-1 cursor-pointer select-none">
                  <input type="checkbox" checked={!!evt.is_sensitive} onChange={e => updateDraft(evt.event_id, 'is_sensitive', e.target.checked)}
                    className="rounded border-gray-300 text-green-900 focus:ring-green-900 w-4 h-4" />
                  <span className="text-xs text-gray-500">민감</span>
                </label>

                <input value={evt.summary || ''} onChange={e => updateDraft(evt.event_id, 'summary', e.target.value)}
                  className="border border-gray-200 rounded px-2 py-1 text-xs w-full" />
                
                {/* <div>
                  <button onClick={() => deleteDraft(evt.event_id)}
                    className="px-3 py-1 bg-red-50 text-red-500 text-xs rounded-full hover:bg-red-100">
                    삭제
                  </button>
                </div> */}
              </>
            ) : editingId === evt.event_id ? (
              <>
                <div className="flex flex-col gap-1 pr-2">
                  <input value={editForm.short_title || ''} onChange={e => setEditForm(p => ({ ...p, short_title: e.target.value }))}
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-full" />
                  <input value={editForm.event_type || ''} onChange={e => setEditForm(p => ({ ...p, event_type: e.target.value }))}
                    className="border border-gray-300 rounded px-2 py-1 text-[11px] w-full" />
                </div>
                
                <input value={editForm.chapter_id || ''} onChange={e => setEditForm(p => ({ ...p, chapter_id: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-1 text-xs w-20" />
                
                <input type="number" min="0" max="10" value={editForm.importance_score || 0} onChange={e => setEditForm(p => ({ ...p, importance_score: parseInt(e.target.value) || 0 }))}
                  className="border border-gray-300 rounded px-2 py-1 text-xs w-16" />
                
                <label className="flex items-center gap-1 cursor-pointer select-none">
                  <input type="checkbox" checked={!!editForm.is_sensitive} onChange={e => setEditForm(p => ({ ...p, is_sensitive: e.target.checked }))}
                    className="rounded border-gray-300 text-green-900 focus:ring-green-900 w-4 h-4" />
                  <span className="text-xs text-gray-500">민감</span>
                </label>

                <input value={editForm.summary || ''} onChange={e => setEditForm(p => ({ ...p, summary: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-1 text-xs w-full" />
                
                <div className="flex gap-2">
                  <button onClick={() => handleSave(evt.event_id)} className="px-3 py-1 bg-green-900 text-white text-xs rounded-full">저장</button>
                  <button onClick={handleCancel} className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">취소</button>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900">{evt.short_title}</span>
                  <span className="text-[11px] text-gray-400 mt-0.5">{evt.event_type || '미지정'}</span>
                </div>
                <span className="text-gray-400 text-xs">{evt.chapter_id}</span>
                
                {/* 중요도 뱃지 노출 */}
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded w-max">
                  ★ {evt.importance_score || 0}
                </span>

                {/* 민감도 노출 */}
                <div>
                  {evt.is_sensitive ? (
                    <span className="text-[11px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">민감</span>
                  ) : (
                    <span className="text-[11px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">일반</span>
                  )}
                </div>

                <span className="text-gray-500 text-xs truncate pr-2" title={evt.summary}>{evt.summary}</span>
                
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(evt)} className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full hover:bg-gray-200">수정</button>
                  {/* <button onClick={() => handleDelete(evt.event_id)} className="px-3 py-1 bg-red-50 text-red-500 text-xs rounded-full hover:bg-red-100">삭제</button> */}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ============================================================
   서브 컴포넌트: StepSection
   - "검수 완료" 클릭 시 로컬 데이터를 API로 일괄 전송 후 다음 단계 활성화
============================================================ */

function StepSection({ step, index, status, data, onComplete, children }) {
  const s        = status[step.key]
  const isLocked = s === 'pending'
  const isDone   = s === 'done'
  const [submitting, setSubmitting] = useState(false)

  const handleComplete = async () => {
    setSubmitting(true)
    try {
      await onComplete(step.key, data)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`rounded-2xl border mb-4 overflow-hidden transition-all
      ${isLocked ? 'border-gray-100 bg-gray-50 opacity-50 pointer-events-none'
      : isDone   ? 'border-green-100 bg-green-50/30'
      :            'border-gray-200 bg-white'}`}
    >
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold
            ${isDone || !isLocked ? 'bg-green-900 text-white' : 'bg-gray-200 text-gray-400'}`}>
            {isDone ? '✓' : index + 1}
          </div>
          <p className={`font-semibold text-sm ${isLocked ? 'text-gray-400' : 'text-gray-900'}`}>
            {step.label}
          </p>
          {isDone   && <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">완료</span>}
          {isLocked && <span className="text-xs text-gray-400">이전 단계 완료 후 활성화</span>}
        </div>
        {s === 'active' && (
          <button
            onClick={handleComplete}
            disabled={submitting}
            className="px-5 py-1.5 bg-green-900 text-white text-xs font-semibold rounded-full hover:bg-green-800 disabled:opacity-50"
          >
            {submitting ? '저장 중…' : '검수 완료 →'}
          </button>
        )}
      </div>

      {s === 'active' && (
        <div className="px-6 pb-6 border-t border-gray-100 pt-5">
          {children}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   메인 컴포넌트
============================================================ */

function Review() {
  const [books, setBooks]               = useState([])
  const [selectedBook, setSelectedBook] = useState(null)
  const [stepStatus, setStepStatus]     = useState(initialStepStatus)
  const [finalSubmitting, setFinalSubmitting] = useState(false)

  const charActive  = stepStatus.characters !== 'pending'
  const relActive   = stepStatus.relations  !== 'pending'
  const eventActive = stepStatus.events     !== 'pending'

  const bookId = selectedBook?.books_id

  const charData  = useStepData(bookId, 'characters', charActive)
  const relData   = useStepData(bookId, 'relations',  relActive)
  const eventData = useStepData(bookId, 'events',     eventActive)

  useEffect(() => {
    getAdminBooks()
      .then(data => setBooks(data.books || []))
      .catch(err => console.error(err))
  }, [])

  // "검수 완료" — 로컬 데이터를 API로 일괄 전송 후 다음 단계 활성화
  const handleComplete = async (stepKey, data) => {
    await submitStepData(bookId, stepKey, data)
    const idx  = STEPS.findIndex(s => s.key === stepKey)
    const next = STEPS[idx + 1]
    setStepStatus(prev => ({
      ...prev,
      [stepKey]: 'done',
      ...(next ? { [next.key]: 'active' } : {}),
    }))
  }

  const handleBookSelect = (book) => {
    setSelectedBook(book)
    setStepStatus(initialStepStatus)
  }

  // 최종 승인 — 필요 시 별도 엔드포인트 호출
  const handleFinalApprove = async () => {
    setFinalSubmitting(true)
    try {
      // await fetch(`/api/admin/books/${bookId}/approve`, { method: 'POST' })
      await new Promise(r => setTimeout(r, 500))
      alert('최종 승인 완료')
    } finally {
      setFinalSubmitting(false)
    }
  }

  /* 책 선택 화면 */
  if (!selectedBook) {
    return (
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">데이터 검수</h1>
        <p className="text-gray-400 text-sm mb-8">책을 선택해서 추출된 데이터를 검수하세요</p>
        <div className="flex gap-6">
          {books.map(book => (
            <div
              key={book.books_id}
              onClick={() => handleBookSelect(book)}
              className="w-40 h-52 rounded-xl overflow-hidden cursor-pointer hover:opacity-80 transition-opacity flex items-end"
              style={{
                backgroundImage: book.cover_url ? `url(${book.cover_url})` : 'none',
                backgroundColor: '#1A3C2E',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <p className="text-white font-bold text-sm p-4">{book.title}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const allDone = STEPS.every(s => stepStatus[s.key] === 'done')

  const stepDataMap = {
    characters: charData.data,
    relations:  relData.data,
    events:     eventData.data,
  }

  /* 검수 화면 */
  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => setSelectedBook(null)}
          className="text-sm text-green-800 font-semibold hover:text-green-600"
        >
          ← 책 목록
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          {selectedBook.title} — 데이터 검수
        </h1>
      </div>

      <StepIndicator steps={STEPS} status={stepStatus} />

      {STEPS.map((step, i) => (
        <StepSection
          key={step.key}
          step={step}
          index={i}
          status={stepStatus}
          data={stepDataMap[step.key]}
          onComplete={handleComplete}
        >
          {step.key === 'characters' && (
            <CharacterTable
              characters={charData.data}
              setCharacters={charData.setData}
              loading={charData.loading}
              error={charData.error}
              onRetry={charData.reload}
            />
          )}
          {step.key === 'relations' && (
            // TODO: RelationTable 컴포넌트 연결
            <RelationTable data={relData.data} setData={relData.setData} loading={relData.loading} error={relData.error} onRetry={relData.reload} />
            // <p className="text-sm text-gray-400">관계 데이터 준비 중입니다.</p>
          )}
          {step.key === 'events' && (
            // TODO: EventTable 컴포넌트 연결
             <EventTable data={eventData.data} setData={eventData.setData} loading={eventData.loading} error={eventData.error} onRetry={eventData.reload} />
            // <p className="text-sm text-gray-400">사건 데이터 준비 중입니다.</p>
          )}
        </StepSection>
      ))}

      {allDone && (
        <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-between">
          <div>
            <p className="font-semibold text-green-900 text-sm">모든 검수가 완료되었습니다</p>
            <p className="text-xs text-green-700 mt-0.5">최종 승인 후 서비스에 반영됩니다</p>
          </div>
          <button
            onClick={handleFinalApprove}
            disabled={finalSubmitting}
            className="px-6 py-2 bg-green-900 text-white text-sm font-semibold rounded-full hover:bg-green-800 disabled:opacity-50"
          >
            {finalSubmitting ? '처리 중…' : '최종 승인'}
          </button>
        </div>
      )}
    </div>
  )
}

export default Review