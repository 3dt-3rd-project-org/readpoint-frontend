import { useSearchParams, useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { getAdminBooks, getBookCharactersForReview, getBookRelationsForReview, getBookEventsForReview, approveAnalysisForReview, summarizeBook } from '../../api'

async function fetchCharacters(bookId) {
  await new Promise(r => setTimeout(r, 500));
  const response = await getBookCharactersForReview(bookId);
  return response?.characters || [];
}

async function fetchRelations(bookId) {
  await new Promise(r => setTimeout(r, 500));
  const response = await getBookRelationsForReview(bookId);
  return response?.relations || []; 
}

async function fetchEvents(bookId) {
  await new Promise(r => setTimeout(r, 500));
  const response = await getBookEventsForReview(bookId);
  return response?.events || []; 
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

// 검수 페이지에 노출할 책의 상태값
// - ANALYZING_FINISHED: 1차 검수 전. 인물/관계/사건 수정 가능. 저장 후에만 최종 승인 가능.
// - ANALYZING_COMPLETE: 1차 검수 완료. 읽기 전용. 저장 없이 바로 최종 승인 가능.
const REVIEWABLE_STATUSES = ['ANALYZING_FINISHED', 'ANALYZING_COMPLETE']

/* ============================================================
   훅: 단계별 데이터 로딩
============================================================ */

function useStepData(bookId, stepKey, isActive) {
  const [data, setData]       = useState([])
  const [origin, setOrigin]   = useState([])
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
   - readOnly: true면 수정/전체수정 버튼 및 입력 UI 숨김
============================================================ */

function CharacterTable({ characters, setCharacters, loading, error, onRetry, readOnly }) {
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm]   = useState({})
  const [bulkMode, setBulkMode]   = useState(false)
  const [bulkDraft, setBulkDraft] = useState([])

  const handleEdit = (char) => {
    setEditingId(char.character_id)
    setEditForm({ 
      character_name: char.character_name,
      role: char.role, 
      description: char.description 
    })
  }
  
  const handleSave = (id) => {
    setCharacters(prev => prev.map(c => c.character_id === id ? { ...c, ...editForm } : c))
    setEditingId(null)
  }
  
  const handleCancel = () => setEditingId(null)

  const enterBulk = () => {
    setBulkDraft(characters.map(c => ({ ...c })))
    setBulkMode(true)
    setEditingId(null)
  }
  
  const saveBulk = () => {
    setCharacters(bulkDraft)
    setBulkMode(false)
  }
  
  const cancelBulk = () => setBulkMode(false)
  
  const updateDraft = (id, field, value) =>
    setBulkDraft(prev => prev.map(c => c.character_id === id ? { ...c, [field]: value } : c))

  const rows = bulkMode ? bulkDraft : characters

  if (loading) return <div className="text-gray-400 p-4 text-center">데이터를 불러오는 중입니다...</div>
  if (error) return <div className="text-red-500 p-4 text-center">에러: {error} <button onClick={onRetry} className="underline ml-2 text-xs">재시도</button></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">검수 대상: {rows ? rows.length : 0}명</p>
        {!readOnly && (
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
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_2.5fr_0.5fr] px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400">
          <span>인물명</span>
          <span>역할</span>
          <span>설명</span>
          <span className="text-right">액션</span>
        </div>

        {Array.isArray(rows) && rows.map((char, i) => (
          <div key={char.character_id}
            className={`grid grid-cols-[1fr_1fr_2.5fr_0.5fr] px-5 py-4 items-center text-sm
              ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
              ${i !== rows.length - 1 ? 'border-b border-gray-100' : ''}`}
          >
            {!readOnly && bulkMode ? (
              <>
                <input value={char.character_name || ''} onChange={e => updateDraft(char.character_id, 'character_name', e.target.value)}
                  className="border border-gray-200 rounded px-2 py-1 text-xs w-[90%]" />
                <input value={char.role || ''} onChange={e => updateDraft(char.character_id, 'role', e.target.value)}
                  className="border border-gray-200 rounded px-2 py-1 text-xs w-[90%]" />
                <input value={char.description || ''} onChange={e => updateDraft(char.character_id, 'description', e.target.value)}
                  className="border border-gray-200 rounded px-2 py-1 text-xs w-[95%]" />
                <span className="text-right text-xs text-gray-300">-</span>
              </>
            ) : !readOnly && editingId === char.character_id ? (
              <>
                <input value={editForm.character_name || ''} onChange={e => setEditForm(p => ({ ...p, character_name: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-1 text-xs w-[90%]" />
                <input value={editForm.role || ''} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-1 text-xs w-[90%]" />
                <input value={editForm.description || ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-1 text-xs w-[95%]" />
                <div className="flex gap-1 justify-end">
                  <button onClick={() => handleSave(char.character_id)} className="text-green-700 font-medium hover:underline text-xs mr-2">저장</button>
                  <button onClick={handleCancel} className="text-gray-400 hover:underline text-xs">취소</button>
                </div>
              </>
            ) : (
              <>
                <span className="font-medium text-gray-900">{char.character_name}</span>
                <span className="text-gray-500">{char.role}</span>
                <span className="text-gray-500 text-xs line-clamp-1 pr-4" title={char.description}>{char.description}</span>
                <div className="text-right">
                  {readOnly ? (
                    <span className="text-xs text-gray-300">-</span>
                  ) : (
                    <button onClick={() => handleEdit(char)}
                      className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full hover:bg-gray-200 transition-colors">
                      수정
                    </button>
                  )}
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
   서브 컴포넌트: RelationTable
   - readOnly: true면 수정/전체수정 버튼 및 입력 UI 숨김
============================================================ */

function RelationTable({ data: relations, setData: setRelations, loading, error, onRetry, readOnly }) {
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkDraft, setBulkDraft] = useState([])

  const handleEdit = (rel) => {
    setEditingId(rel.relationship_change_id)
    setEditForm({ 
      relation: rel.relation, 
      change_summary: rel.change_summary,
      importance_score: rel.importance_score,
      is_core_relation: rel.is_core_relation
    })
  }
  
  const handleSave = (id) => {
    setRelations(prev => prev.map(r => r.relationship_change_id === id ? { ...r, ...editForm } : r))
    setEditingId(null)
  }
  const handleCancel = () => setEditingId(null)

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

  const rows = bulkMode ? bulkDraft : relations

  if (loading) return <div>로딩 중...</div>
  if (error) return <div>에러 발생: {error} <button onClick={onRetry}>재시도</button></div>

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">{rows.length}개 관계</p>
        {!readOnly && (
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
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden min-w-[800px]">
        <div className="grid grid-cols-12 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400 gap-4">
          <span className="col-span-2">인물 관계 (A → B)</span>
          <span className="col-span-2">관계명</span>
          <span className="col-span-4">변경 요약</span>
          <span className="col-span-1 text-center">중요도</span>
          <span className="col-span-1 text-center">핵심여부</span>
          <span className="col-span-2 text-right">액션</span>
        </div>

        {rows.map((rel, i) => (
          <div key={rel.relationship_change_id}
            className={`grid grid-cols-12 px-5 py-4 items-center text-sm gap-4
              ${rel.is_core_relation ? 'bg-blue-50/40 font-medium' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
              ${i !== rows.length - 1 ? 'border-b border-gray-100' : ''}`}
          >
            <div className="col-span-2 flex flex-col truncate">
              <span className="text-gray-900 font-medium">
                {rel.source_character_name} → {rel.target_character_name}
              </span>
              <span className="text-gray-400 text-xs">
                (ID: {rel.source_character_id} → {rel.target_character_id})
              </span>
            </div>

            {!readOnly && bulkMode ? (
              <>
                <div className="col-span-2">
                  <input 
                    value={rel.relation || ''} 
                    onChange={e => updateDraft(rel.relationship_change_id, 'relation', e.target.value)}
                    className="border border-gray-200 rounded px-2 py-1 text-xs w-full focus:outline-green-900" 
                  />
                </div>
                <div className="col-span-4">
                  <input 
                    value={rel.change_summary || ''} 
                    onChange={e => updateDraft(rel.relationship_change_id, 'change_summary', e.target.value)}
                    className="border border-gray-200 rounded px-2 py-1 text-xs w-full focus:outline-green-900" 
                  />
                </div>
                <div className="col-span-1 text-center">
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    max="1"
                    value={rel.importance_score || 0} 
                    onChange={e => updateDraft(rel.relationship_change_id, 'importance_score', e.target.value)}
                    className="border border-gray-200 rounded px-1 py-1 text-xs w-16 text-center focus:outline-green-900" 
                  />
                </div>
                <div className="col-span-1 text-center">
                  <input 
                    type="checkbox" 
                    checked={!!rel.is_core_relation} 
                    onChange={e => updateDraft(rel.relationship_change_id, 'is_core_relation', e.target.checked)}
                    className="w-4 h-4 text-green-900 border-gray-300 rounded focus:ring-green-900"
                  />
                </div>
                <div className="col-span-2 text-right text-gray-400 text-xs">
                  수정 중
                </div>
              </>
            ) : !readOnly && editingId === rel.relationship_change_id ? (
              <>
                <div className="col-span-2">
                  <input 
                    value={editForm.relation || ''} 
                    onChange={e => setEditForm(p => ({ ...p, relation: e.target.value }))}
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-full focus:outline-green-900" 
                  />
                </div>
                <div className="col-span-4">
                  <input 
                    value={editForm.change_summary || ''} 
                    onChange={e => setEditForm(p => ({ ...p, change_summary: e.target.value }))}
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-full focus:outline-green-900" 
                  />
                </div>
                <div className="col-span-1 text-center">
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    max="1"
                    value={editForm.importance_score || 0} 
                    onChange={e => setEditForm(p => ({ ...p, importance_score: e.target.value }))}
                    className="border border-gray-300 rounded px-1 py-1 text-xs w-16 text-center focus:outline-green-900" 
                  />
                </div>
                <div className="col-span-1 text-center">
                  <input 
                    type="checkbox" 
                    checked={!!editForm.is_core_relation} 
                    onChange={e => setEditForm(p => ({ ...p, is_core_relation: e.target.checked }))}
                    className="w-4 h-4 text-green-900 border-gray-300 rounded focus:ring-green-900"
                  />
                </div>
                <div className="col-span-2 flex gap-1 justify-end">
                  <button onClick={() => handleSave(rel.relationship_change_id)} className="px-3 py-1 bg-green-900 text-white text-xs rounded-full hover:bg-green-800">저장</button>
                  <button onClick={handleCancel} className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full hover:bg-gray-200">취소</button>
                </div>
              </>
            ) : (
              <>
                <div className="col-span-2">
                  <span className="text-green-800 font-semibold text-xs bg-green-50 px-2 py-1 rounded block w-max truncate max-w-full" title={rel.relation}>
                    {rel.relation}
                  </span>
                </div>
                <div className="col-span-4">
                  <span className="text-gray-500 text-xs block truncate pr-2" title={rel.change_summary}>
                    {rel.change_summary}
                  </span>
                </div>
                <div className="col-span-1 text-center font-mono text-xs text-gray-600">
                  {Number(rel.importance_score).toFixed(2)}
                </div>
                <div className="col-span-1 text-center">
                  {rel.is_core_relation ? (
                    <span className="text-blue-600 bg-blue-50 text-[10px] font-bold px-1.5 py-0.5 rounded-full">CORE</span>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </div>
                <div className="col-span-2 text-right">
                  {readOnly ? (
                    <span className="text-xs text-gray-300">-</span>
                  ) : (
                    <button onClick={() => handleEdit(rel)} className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full hover:bg-gray-200">수정</button>
                  )}
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
   서브 컴포넌트: EventTable
   - 유형(event_type) 컬럼 제거
   - 챕터 ID 읽기 전용 (수정 불가)
   - readOnly: true면 수정/전체수정 버튼 및 입력 UI 숨김
============================================================ */

function EventTable({ data: events, setData: setEvents, loading, error, onRetry, readOnly }) {
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkDraft, setBulkDraft] = useState([])

  const handleEdit = (evt) => {
    setEditingId(evt.event_id)
    setEditForm({ 
      short_title: evt.short_title, 
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

  const rows = bulkMode ? bulkDraft : events

  if (loading) return <LoadingRows />
  if (error)   return <ErrorRow message={error} onRetry={onRetry} />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">{rows.length}개 사건</p>
        {!readOnly && (
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
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-6 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400">
          <span>사건명</span>
          <span>챕터 ID</span>
          <span>중요도</span>
          <span>민감 여부</span>
          <span>사건 요약</span>
          <span>액션</span>
        </div>

        {rows.map((evt, i) => (
          <div key={evt.event_id}
            className={`grid grid-cols-6 px-5 py-4 items-center text-sm
              ${evt.is_core_event ? 'bg-yellow-50/40' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
              ${i !== rows.length - 1 ? 'border-b border-gray-100' : ''}`}
          >
            {!readOnly && bulkMode ? (
              <>
                {/* 사건명 (유형 제거) */}
                <div className="pr-2">
                  <input value={evt.short_title || ''} onChange={e => updateDraft(evt.event_id, 'short_title', e.target.value)}
                    className="border border-gray-200 rounded px-2 py-1 text-xs w-full" placeholder="사건명" />
                </div>

                {/* 챕터 ID — 읽기 전용 */}
                <span className="text-gray-400 text-xs">{evt.chapter_id}</span>

                {/* 중요도 */}
                <input type="number" min="0" max="10" value={evt.importance_score || 0}
                  onChange={e => updateDraft(evt.event_id, 'importance_score', parseInt(e.target.value) || 0)}
                  className="border border-gray-200 rounded px-2 py-1 text-xs w-16" />

                {/* 민감도 */}
                <label className="flex items-center gap-1 cursor-pointer select-none">
                  <input type="checkbox" checked={!!evt.is_sensitive}
                    onChange={e => updateDraft(evt.event_id, 'is_sensitive', e.target.checked)}
                    className="rounded border-gray-300 text-green-900 focus:ring-green-900 w-4 h-4" />
                  <span className="text-xs text-gray-500">민감</span>
                </label>

                {/* 사건 요약 */}
                <input value={evt.summary || ''} onChange={e => updateDraft(evt.event_id, 'summary', e.target.value)}
                  className="border border-gray-200 rounded px-2 py-1 text-xs w-full" />

                <span className="text-gray-300 text-xs">-</span>
              </>
            ) : !readOnly && editingId === evt.event_id ? (
              <>
                {/* 사건명 (유형 제거) */}
                <div className="pr-2">
                  <input value={editForm.short_title || ''} onChange={e => setEditForm(p => ({ ...p, short_title: e.target.value }))}
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-full" />
                </div>

                {/* 챕터 ID — 읽기 전용 */}
                <span className="text-gray-400 text-xs">{evt.chapter_id}</span>

                {/* 중요도 */}
                <input type="number" min="0" max="10" value={editForm.importance_score || 0}
                  onChange={e => setEditForm(p => ({ ...p, importance_score: parseInt(e.target.value) || 0 }))}
                  className="border border-gray-300 rounded px-2 py-1 text-xs w-16" />

                {/* 민감도 */}
                <label className="flex items-center gap-1 cursor-pointer select-none">
                  <input type="checkbox" checked={!!editForm.is_sensitive}
                    onChange={e => setEditForm(p => ({ ...p, is_sensitive: e.target.checked }))}
                    className="rounded border-gray-300 text-green-900 focus:ring-green-900 w-4 h-4" />
                  <span className="text-xs text-gray-500">민감</span>
                </label>

                {/* 사건 요약 */}
                <input value={editForm.summary || ''} onChange={e => setEditForm(p => ({ ...p, summary: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-1 text-xs w-full" />

                <div className="flex gap-2">
                  <button onClick={() => handleSave(evt.event_id)} className="px-3 py-1 bg-green-900 text-white text-xs rounded-full">저장</button>
                  <button onClick={handleCancel} className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">취소</button>
                </div>
              </>
            ) : (
              <>
                {/* 사건명 (유형 서브텍스트 제거) */}
                <span className="font-medium text-gray-900">{evt.short_title}</span>

                {/* 챕터 ID */}
                <span className="text-gray-400 text-xs">{evt.chapter_id}</span>

                {/* 중요도 뱃지 */}
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded w-max">
                  ★ {evt.importance_score || 0}
                </span>

                {/* 민감도 */}
                <div>
                  {evt.is_sensitive ? (
                    <span className="text-[11px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">민감</span>
                  ) : (
                    <span className="text-[11px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">일반</span>
                  )}
                </div>

                <span className="text-gray-500 text-xs truncate pr-2" title={evt.summary}>{evt.summary}</span>

                <div className="flex gap-2">
                  {readOnly ? (
                    <span className="text-xs text-gray-300">-</span>
                  ) : (
                    <button onClick={() => handleEdit(evt)} className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full hover:bg-gray-200">수정</button>
                  )}
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
   - readOnly: true면 모든 단계가 펼쳐진 채 잠긴 형태로 표시되고
     "검수 완료" 버튼이 노출되지 않음 (단계 전환 자체가 의미 없음).
   - readOnly가 아닐 때는 기존처럼 단계별 active/done/pending 흐름을 따름.
============================================================ */

function StepSection({ step, index, status, onComplete, children, readOnly }) {
  const s        = readOnly ? 'done' : status[step.key]
  const isLocked = !readOnly && s === 'pending'
  const isDone   = s === 'done'

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
          {readOnly && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">읽기 전용</span>}
          {!readOnly && isDone   && <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">완료</span>}
          {!readOnly && isLocked && <span className="text-xs text-gray-400">이전 단계 완료 후 활성화</span>}
        </div>
        {!readOnly && s === 'active' && (
          <button
            onClick={() => onComplete(step.key)}
            className="px-5 py-1.5 bg-green-900 text-white text-xs font-semibold rounded-full hover:bg-green-800"
          >
            검수 완료 →
          </button>
        )}
      </div>

      {(readOnly || s === 'active') && (
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
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [books, setBooks]               = useState([])
  const [selectedBook, setSelectedBook] = useState(null)
  const [stepStatus, setStepStatus]     = useState(initialStepStatus)

  // 1) DB 저장(approveAnalysisForReview) 관련 상태
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)   // 저장 성공 여부 -> 최종 승인 버튼 활성화 조건

  // 2) 최종 승인(파이프라인 실행, summarizeBook) 관련 상태
  const [approving, setApproving] = useState(false)

  // 선택된 책이 이미 1차 검수 완료(ANALYZING_COMPLETE) 상태인지 여부
  // -> 읽기 전용 모드. 저장 단계 없이 바로 최종 승인 가능.
  const isReadOnlyBook = selectedBook?.status === 'ANALYZING_COMPLETE'

  const charActive  = isReadOnlyBook || stepStatus.characters !== 'pending'
  const relActive   = isReadOnlyBook || stepStatus.relations  !== 'pending'
  const eventActive = isReadOnlyBook || stepStatus.events     !== 'pending'

  const bookId = selectedBook?.books_id

  const charData  = useStepData(bookId, 'characters', charActive)
  const relData   = useStepData(bookId, 'relations',  relActive)
  const eventData = useStepData(bookId, 'events',     eventActive)

  useEffect(() => {
    getAdminBooks()
      .then(data => {
        const allBooks = data.books || []
        // ANALYZING_FINISHED / ANALYZING_COMPLETE 상태인 책만 검수 대상으로 노출
        setBooks(allBooks.filter(b => REVIEWABLE_STATUSES.includes(b.status)))
      })
      .catch(err => console.error(err))
  }, [])

  useEffect(() => {
    const bookIdParam = searchParams.get('bookId')
    if (bookIdParam && books.length > 0) {
      const book = books.find(b => String(b.books_id) === String(bookIdParam))
      if (book) handleBookSelect(book)
    }
  }, [books, searchParams])

  // 서버 호출 없이 로컬 상태만 전환. 다음 단계를 활성화한다.
  const handleComplete = (stepKey) => {
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
    // 이미 1차 검수 완료된 책은 저장 단계 없이 바로 최종 승인 가능
    setSaved(book.status === 'ANALYZING_COMPLETE')
  }

  // ANALYZING_FINISHED 책의 3단계 검수 완료 후: 인물/관계/사건 데이터를 한 번에 DB에 저장
  const handleSaveReview = async () => {
    setSaving(true)
    try {
      const res = await approveAnalysisForReview(bookId, {
        characters: charData.data,
        relations:  relData.data,
        events:     eventData.data,
      })

      if (res?.error) {
        alert(`저장 실패: ${res.message}`)
        return
      }

      setSaved(true)
    } catch (err) {
      alert(`저장 실패: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // 저장 완료(또는 ANALYZING_COMPLETE) 후에만 호출 가능: 다음 파이프라인 실행 (body 없음)
  const handleFinalApprove = async () => {
    setApproving(true)
    try {
      const res = await summarizeBook(bookId)

      if (res?.error) {
        alert(`최종 승인 실패: ${res.message}`)
        return
      }

    const newLog = {
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      type: 'running',
      text: '2차 요약 파이프라인이 시작되었습니다. 약 30분 소요 예정'
    }
    const existing = JSON.parse(localStorage.getItem('pipeline_logs') || '[]')
    localStorage.setItem('pipeline_logs', JSON.stringify([newLog, ...existing].slice(0, 50)))

    navigate('/admin')
  } catch (err) {
    alert(`최종 승인 실패: ${err.message}`)
  } finally {
    setApproving(false)
  }
}

  if (!selectedBook) {
    return (
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">데이터 검수</h1>
        <p className="text-gray-400 text-sm mb-8">책을 선택해서 추출된 데이터를 검수하세요</p>
        {books.length === 0 ? (
          <p className="text-sm text-gray-400">검수 가능한 책이 없습니다.</p>
        ) : (
          <div className="flex gap-6 flex-wrap">
            {books.map(book => (
              <div key={book.books_id} className="flex flex-col gap-2">
                <div
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
                <span className={`text-[11px] text-center font-medium px-2 py-0.5 rounded-full
                  ${book.status === 'ANALYZING_COMPLETE' ? 'bg-gray-100 text-gray-500' : 'bg-amber-50 text-amber-600'}`}>
                  {book.status === 'ANALYZING_COMPLETE' ? '1차 검수 완료' : '검수 대기'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const allDone = isReadOnlyBook || STEPS.every(s => stepStatus[s.key] === 'done')

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
        {isReadOnlyBook && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
            1차 검수 완료 · 읽기 전용
          </span>
        )}
      </div>

      {!isReadOnlyBook && <StepIndicator steps={STEPS} status={stepStatus} />}

      {STEPS.map((step, i) => (
        <StepSection
          key={step.key}
          step={step}
          index={i}
          status={stepStatus}
          onComplete={handleComplete}
          readOnly={isReadOnlyBook}
        >
          {step.key === 'characters' && (
            <CharacterTable
              characters={charData.data}
              setCharacters={charData.setData}
              loading={charData.loading}
              error={charData.error}
              onRetry={charData.reload}
              readOnly={isReadOnlyBook}
            />
          )}
          {step.key === 'relations' && (
            <RelationTable
              data={relData.data}
              setData={relData.setData}
              loading={relData.loading}
              error={relData.error}
              onRetry={relData.reload}
              readOnly={isReadOnlyBook}
            />
          )}
          {step.key === 'events' && (
            <EventTable
              data={eventData.data}
              setData={eventData.setData}
              loading={eventData.loading}
              error={eventData.error}
              onRetry={eventData.reload}
              readOnly={isReadOnlyBook}
            />
          )}
        </StepSection>
      ))}

      {allDone && (
        <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-between">
          <div>
            <p className="font-semibold text-green-900 text-sm">
              {isReadOnlyBook ? '1차 검수가 완료된 도서입니다' : '모든 검수가 완료되었습니다'}
            </p>
            <p className="text-xs text-green-700 mt-0.5">
              {isReadOnlyBook
                ? '바로 최종 승인을 진행할 수 있습니다.'
                : saved
                  ? '저장이 완료되었습니다. 최종 승인을 진행해 주세요.'
                  : '먼저 검수 내용을 저장한 뒤 최종 승인을 진행할 수 있습니다.'}
            </p>
          </div>
          <div className="flex gap-2">
            {!isReadOnlyBook && (
              <button
                onClick={handleSaveReview}
                disabled={saving}
                className="px-6 py-2 bg-white border border-green-900 text-green-900 text-sm font-semibold rounded-full hover:bg-green-50 disabled:opacity-50"
              >
                {saving ? '저장 중…' : saved ? '저장됨 ✓' : '저장'}
              </button>
            )}
            <button
              onClick={handleFinalApprove}
              disabled={!saved || approving}
              className="px-6 py-2 bg-green-900 text-white text-sm font-semibold rounded-full hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {approving ? '처리 중…' : '최종 승인'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Review