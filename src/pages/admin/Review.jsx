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

const STEPS = [
  { key: 'characters', label: '인물 검수' },
  { key: 'relations',  label: '관계 검수' },
  { key: 'events',     label: '사건 검수' },
]

const initialStepStatus = { characters: 'active', relations: 'pending', events: 'pending' }

const REVIEWABLE_STATUSES = ['ANALYZING_FINISHED', 'ANALYZING_COMPLETE']

function normalizeImportanceScore(value) {
  return value === null || value === undefined || value === '' ? 0 : value
}

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
      if (stepKey === 'relations')  fetched = (await fetchRelations(bookId)).map(r => ({
        ...r,
        importance_score: normalizeImportanceScore(r.importance_score),
      }))
      if (stepKey === 'events')     fetched = (await fetchEvents(bookId)).map(e => ({
        ...e,
        importance_score: normalizeImportanceScore(e.importance_score),
      }))
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

function StepIndicator({ steps, status, currentStep, onStepClick, readOnly }) {
  return (
    <div className="flex items-start gap-0 mb-10">
      {steps.map((step, i) => {
        const s = status[step.key]
        const isLast = i === steps.length - 1
        const isCurrent = step.key === currentStep
        const isClickable = !readOnly && s !== 'pending'
        return (
          <div key={step.key} className="flex items-start flex-1">
            <button
              type="button"
              onClick={() => isClickable && onStepClick(step.key)}
              disabled={!isClickable}
              className={`flex flex-col items-center flex-1 ${isClickable ? 'cursor-pointer' : 'cursor-default'} group`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-all
                ${isCurrent    ? 'bg-green-900 text-white ring-4 ring-green-100'
                : s === 'done' ? `bg-green-900 text-white ${isClickable ? 'group-hover:ring-2 group-hover:ring-green-200' : ''}`
                :                'bg-gray-100 text-gray-400'}`}>
                {s === 'done' && !isCurrent ? '✓' : i + 1}
              </div>
              <p className={`text-xs mt-1.5 font-medium whitespace-nowrap
                ${isCurrent ? 'text-green-900' : s === 'done' ? 'text-gray-500 group-hover:text-green-800' : 'text-gray-300'}`}>
                {step.label}
              </p>
            </button>
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
   CharacterTable
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
  const saveBulk = () => { setCharacters(bulkDraft); setBulkMode(false) }
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
                <button onClick={saveBulk} className="px-4 py-1.5 bg-green-900 text-white text-xs font-medium rounded-full hover:bg-green-800">전체 저장</button>
                <button onClick={cancelBulk} className="px-4 py-1.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full hover:bg-gray-200">취소</button>
              </>
            ) : (
              <button onClick={enterBulk} className="px-4 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full hover:bg-gray-200">전체 수정</button>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_2.5fr_0.5fr] px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400">
          <span>인물명</span><span>역할</span><span>설명</span><span className="text-right">액션</span>
        </div>
        {Array.isArray(rows) && rows.map((char, i) => (
          <div key={char.character_id}
            className={`grid grid-cols-[1fr_1fr_2.5fr_0.5fr] px-5 py-4 items-center text-sm
              ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
              ${i !== rows.length - 1 ? 'border-b border-gray-100' : ''}`}
          >
            {!readOnly && bulkMode ? (
              <>
                <input value={char.character_name || ''} onChange={e => updateDraft(char.character_id, 'character_name', e.target.value)} className="border border-gray-200 rounded px-2 py-1 text-xs w-[90%]" />
                <input value={char.role || ''} onChange={e => updateDraft(char.character_id, 'role', e.target.value)} className="border border-gray-200 rounded px-2 py-1 text-xs w-[90%]" />
                <input value={char.description || ''} onChange={e => updateDraft(char.character_id, 'description', e.target.value)} className="border border-gray-200 rounded px-2 py-1 text-xs w-[95%]" />
                <span className="text-right text-xs text-gray-300">-</span>
              </>
            ) : !readOnly && editingId === char.character_id ? (
              <>
                <input value={editForm.character_name || ''} onChange={e => setEditForm(p => ({ ...p, character_name: e.target.value }))} className="border border-gray-300 rounded px-2 py-1 text-xs w-[90%]" />
                <input value={editForm.role || ''} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))} className="border border-gray-300 rounded px-2 py-1 text-xs w-[90%]" />
                <input value={editForm.description || ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} className="border border-gray-300 rounded px-2 py-1 text-xs w-[95%]" />
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
                  {readOnly ? <span className="text-xs text-gray-300">-</span> : (
                    <button onClick={() => handleEdit(char)} className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full hover:bg-gray-200 transition-colors">수정</button>
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
   RelationTable
   - change_summary: textarea로 변경 (긴 텍스트 대응)
   - chapter_order, chapter_title 컬럼 추가 (읽기 전용)
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
      importance_score: normalizeImportanceScore(rel.importance_score),
      is_core_relation: rel.is_core_relation
    })
  }
  const handleSave = (id) => {
    setRelations(prev => prev.map(r => r.relationship_change_id === id
      ? { ...r, ...editForm, importance_score: normalizeImportanceScore(editForm.importance_score) } : r))
    setEditingId(null)
  }
  const handleCancel = () => setEditingId(null)

  const enterBulk = () => {
    setBulkDraft(relations.map(r => ({ ...r, importance_score: normalizeImportanceScore(r.importance_score) })))
    setBulkMode(true); setEditingId(null)
  }
  const saveBulk = () => {
    setRelations(bulkDraft.map(r => ({ ...r, importance_score: normalizeImportanceScore(r.importance_score) })))
    setBulkMode(false)
  }
  const cancelBulk = () => setBulkMode(false)
  const updateDraft = (id, field, value) =>
    setBulkDraft(prev => prev.map(r => r.relationship_change_id === id ? { ...r, [field]: value } : r))

  const rows = bulkMode ? bulkDraft : relations

  if (loading) return <div className="text-gray-400 p-4 text-center">데이터를 불러오는 중입니다...</div>
  if (error) return <ErrorRow message={error} onRetry={onRetry} />

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">{rows.length}개 관계</p>
        {!readOnly && (
          <div className="flex gap-2">
            {bulkMode ? (
              <>
                <button onClick={saveBulk} className="px-4 py-1.5 bg-green-900 text-white text-xs font-medium rounded-full hover:bg-green-800">전체 저장</button>
                <button onClick={cancelBulk} className="px-4 py-1.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full hover:bg-gray-200">취소</button>
              </>
            ) : (
              <button onClick={enterBulk} className="px-4 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full hover:bg-gray-200">전체 수정</button>
            )}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden min-w-[960px]">
          {/* cols: 인물관계(2) 챕터(2) 관계명(2) 변경요약(3) 중요도(1) 핵심(1) 액션(1) = 12 */}
          <div className="grid grid-cols-12 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400 gap-2">
            <span className="col-span-2">인물 관계 (A → B)</span>
            <span className="col-span-2">챕터</span>
            <span className="col-span-2">관계명</span>
            <span className="col-span-3">변경 요약</span>
            <span className="col-span-1 text-center">중요도</span>
            <span className="col-span-1 text-center">핵심</span>
            <span className="col-span-1 text-right">액션</span>
          </div>

          {rows.map((rel, i) => (
            <div key={rel.relationship_change_id}
              className={`grid grid-cols-12 px-5 py-4 items-start text-sm gap-2
                ${rel.is_core_relation ? 'bg-blue-50/40' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                ${i !== rows.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              {/* 인물 관계 — 항상 읽기 전용 */}
              <div className="col-span-2 flex flex-col">
                <span className="text-gray-900 font-medium text-xs">
                  {rel.source_character_name} → {rel.target_character_name}
                </span>
                <span className="text-gray-400 text-[10px] mt-0.5">
                  (ID: {rel.source_character_id} → {rel.target_character_id})
                </span>
              </div>

              {/* 챕터 — 항상 읽기 전용 */}
              <div className="col-span-2 flex flex-col text-xs">
                <span className="font-medium text-gray-600">
                  {rel.chapter_order != null ? `${rel.chapter_order}화` : '-'}
                </span>
                <span className="text-gray-400 truncate" title={rel.chapter_title}>
                  {rel.chapter_title || '-'}
                </span>
              </div>

              {/* ── 전체 수정 모드 ── */}
              {!readOnly && bulkMode ? (
                <>
                  <div className="col-span-2">
                    <input value={rel.relation || ''} onChange={e => updateDraft(rel.relationship_change_id, 'relation', e.target.value)}
                      className="border border-gray-200 rounded px-2 py-1 text-xs w-full focus:outline-green-900" />
                  </div>
                  <div className="col-span-3">
                    <textarea value={rel.change_summary || ''} onChange={e => updateDraft(rel.relationship_change_id, 'change_summary', e.target.value)}
                      rows={3} className="border border-gray-200 rounded px-2 py-1 text-xs w-full focus:outline-green-900 resize-none leading-relaxed" />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <input type="number" step="0.01" min="0" max="1"
                      value={normalizeImportanceScore(rel.importance_score)}
                      onChange={e => updateDraft(rel.relationship_change_id, 'importance_score', e.target.value === '' ? 0 : e.target.value)}
                      className="border border-gray-200 rounded px-1 py-1 text-xs w-14 text-center focus:outline-green-900" />
                  </div>
                  <div className="col-span-1 flex justify-center pt-1">
                    <input type="checkbox" checked={!!rel.is_core_relation}
                      onChange={e => updateDraft(rel.relationship_change_id, 'is_core_relation', e.target.checked)}
                      className="w-4 h-4 text-green-900 border-gray-300 rounded focus:ring-green-900" />
                  </div>
                  <div className="col-span-1 text-right text-gray-400 text-xs pt-1">수정 중</div>
                </>

              /* ── 단건 수정 모드 ── */
              ) : !readOnly && editingId === rel.relationship_change_id ? (
                <>
                  <div className="col-span-2">
                    <input value={editForm.relation || ''} onChange={e => setEditForm(p => ({ ...p, relation: e.target.value }))}
                      className="border border-gray-300 rounded px-2 py-1 text-xs w-full focus:outline-green-900" />
                  </div>
                  <div className="col-span-3">
                    <textarea value={editForm.change_summary || ''} onChange={e => setEditForm(p => ({ ...p, change_summary: e.target.value }))}
                      rows={3} className="border border-gray-300 rounded px-2 py-1 text-xs w-full focus:outline-green-900 resize-none leading-relaxed" />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <input type="number" step="0.01" min="0" max="1"
                      value={normalizeImportanceScore(editForm.importance_score)}
                      onChange={e => setEditForm(p => ({ ...p, importance_score: e.target.value === '' ? 0 : e.target.value }))}
                      className="border border-gray-300 rounded px-1 py-1 text-xs w-14 text-center focus:outline-green-900" />
                  </div>
                  <div className="col-span-1 flex justify-center pt-1">
                    <input type="checkbox" checked={!!editForm.is_core_relation}
                      onChange={e => setEditForm(p => ({ ...p, is_core_relation: e.target.checked }))}
                      className="w-4 h-4 text-green-900 border-gray-300 rounded focus:ring-green-900" />
                  </div>
                  <div className="col-span-1 flex gap-1 justify-end flex-wrap">
                    <button onClick={() => handleSave(rel.relationship_change_id)} className="px-2 py-1 bg-green-900 text-white text-xs rounded-full hover:bg-green-800">저장</button>
                    <button onClick={handleCancel} className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full hover:bg-gray-200">취소</button>
                  </div>
                </>

              /* ── 읽기 모드 ── */
              ) : (
                <>
                  <div className="col-span-2">
                    <span className="text-green-800 font-semibold text-xs bg-green-50 px-2 py-1 rounded block w-max max-w-full truncate" title={rel.relation}>
                      {rel.relation}
                    </span>
                  </div>
                  <div className="col-span-3">
                    <p className="text-gray-500 text-xs leading-relaxed whitespace-pre-wrap break-words pr-2">
                      {rel.change_summary}
                    </p>
                  </div>
                  <div className="col-span-1 text-center font-mono text-xs text-gray-600 pt-0.5">
                    {Number(normalizeImportanceScore(rel.importance_score)).toFixed(2)}
                  </div>
                  <div className="col-span-1 text-center pt-0.5">
                    {rel.is_core_relation
                      ? <span className="text-blue-600 bg-blue-50 text-[10px] font-bold px-1.5 py-0.5 rounded-full">CORE</span>
                      : <span className="text-gray-300 text-xs">-</span>}
                  </div>
                  <div className="col-span-1 text-right pt-0.5">
                    {readOnly ? <span className="text-xs text-gray-300">-</span> : (
                      <button onClick={() => handleEdit(rel)} className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full hover:bg-gray-200">수정</button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   EventTable
   - chapter_order, chapter_title 추가 (읽기 전용)
   - summary: textarea로 변경
   - is_sensitive: 제거
   - importance_score, is_core_event: 수정 가능
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
      importance_score: normalizeImportanceScore(evt.importance_score),
      is_core_event: evt.is_core_event
    })
  }
  const handleSave = (id) => {
    setEvents(prev => prev.map(e => e.event_id === id
      ? { ...e, ...editForm, importance_score: normalizeImportanceScore(editForm.importance_score) } : e))
    setEditingId(null)
  }
  const handleCancel = () => setEditingId(null)

  const enterBulk = () => {
    setBulkDraft(events.map(e => ({ ...e, importance_score: normalizeImportanceScore(e.importance_score) })))
    setBulkMode(true); setEditingId(null)
  }
  const saveBulk = () => {
    setEvents(bulkDraft.map(e => ({ ...e, importance_score: normalizeImportanceScore(e.importance_score) })))
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
                <button onClick={saveBulk} className="px-4 py-1.5 bg-green-900 text-white text-xs font-medium rounded-full hover:bg-green-800">전체 저장</button>
                <button onClick={cancelBulk} className="px-4 py-1.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full hover:bg-gray-200">취소</button>
              </>
            ) : (
              <button onClick={enterBulk} className="px-4 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full hover:bg-gray-200">전체 수정</button>
            )}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden min-w-[800px]">
          {/* cols: 사건명(2) 챕터(2) 중요도(1) 핵심(1) 사건요약(4) 액션(2) = 12 */}
          <div className="grid grid-cols-12 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400 gap-2">
            <span className="col-span-2">사건명</span>
            <span className="col-span-2">챕터</span>
            <span className="col-span-1 text-center">중요도</span>
            <span className="col-span-1 text-center">핵심</span>
            <span className="col-span-4">사건 요약</span>
            <span className="col-span-2 text-right">액션</span>
          </div>

          {rows.map((evt, i) => (
            <div key={evt.event_id}
              className={`grid grid-cols-12 px-5 py-4 items-start text-sm gap-2
                ${evt.is_core_event ? 'bg-yellow-50/40' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                ${i !== rows.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              {/* ── 전체 수정 모드 ── */}
              {!readOnly && bulkMode ? (
                <>
                  <div className="col-span-2 pr-1">
                    <input value={evt.short_title || ''} onChange={e => updateDraft(evt.event_id, 'short_title', e.target.value)}
                      className="border border-gray-200 rounded px-2 py-1 text-xs w-full focus:outline-green-900" placeholder="사건명" />
                  </div>

                  {/* 챕터 — 읽기 전용 */}
                  <div className="col-span-2 flex flex-col text-xs pt-1">
                    <span className="font-medium text-gray-600">
                      {evt.chapter_order != null ? `${evt.chapter_order}화` : '-'}
                    </span>
                    <span className="text-gray-400 truncate" title={evt.chapter_title}>{evt.chapter_title || '-'}</span>
                  </div>

                  <div className="col-span-1 flex justify-center">
                    <input type="number" min="0" max="1" step="0.01"
                      value={normalizeImportanceScore(evt.importance_score)}
                      onChange={e => updateDraft(evt.event_id, 'importance_score', e.target.value === '' ? 0 : e.target.value)}
                      className="border border-gray-200 rounded px-1 py-1 text-xs w-14 text-center focus:outline-green-900" />
                  </div>

                  <div className="col-span-1 flex justify-center pt-1">
                    <input type="checkbox" checked={!!evt.is_core_event}
                      onChange={e => updateDraft(evt.event_id, 'is_core_event', e.target.checked)}
                      className="rounded border-gray-300 text-green-900 focus:ring-green-900 w-4 h-4" />
                  </div>

                  <div className="col-span-4">
                    <textarea value={evt.summary || ''} onChange={e => updateDraft(evt.event_id, 'summary', e.target.value)}
                      rows={3} className="border border-gray-200 rounded px-2 py-1 text-xs w-full focus:outline-green-900 resize-none leading-relaxed" />
                  </div>

                  <div className="col-span-2 text-right text-gray-400 text-xs pt-1">수정 중</div>
                </>

              /* ── 단건 수정 모드 ── */
              ) : !readOnly && editingId === evt.event_id ? (
                <>
                  <div className="col-span-2 pr-1">
                    <input value={editForm.short_title || ''} onChange={e => setEditForm(p => ({ ...p, short_title: e.target.value }))}
                      className="border border-gray-300 rounded px-2 py-1 text-xs w-full focus:outline-green-900" />
                  </div>

                  {/* 챕터 — 읽기 전용 */}
                  <div className="col-span-2 flex flex-col text-xs pt-1">
                    <span className="font-medium text-gray-600">
                      {evt.chapter_order != null ? `${evt.chapter_order}화` : '-'}
                    </span>
                    <span className="text-gray-400 truncate" title={evt.chapter_title}>{evt.chapter_title || '-'}</span>
                  </div>

                  <div className="col-span-1 flex justify-center">
                    <input type="number" min="0" max="1" step="0.01"
                      value={normalizeImportanceScore(editForm.importance_score)}
                      onChange={e => setEditForm(p => ({ ...p, importance_score: e.target.value === '' ? 0 : e.target.value }))}
                      className="border border-gray-300 rounded px-1 py-1 text-xs w-14 text-center focus:outline-green-900" />
                  </div>

                  <div className="col-span-1 flex justify-center pt-1">
                    <input type="checkbox" checked={!!editForm.is_core_event}
                      onChange={e => setEditForm(p => ({ ...p, is_core_event: e.target.checked }))}
                      className="rounded border-gray-300 text-green-900 focus:ring-green-900 w-4 h-4" />
                  </div>

                  <div className="col-span-4">
                    <textarea value={editForm.summary || ''} onChange={e => setEditForm(p => ({ ...p, summary: e.target.value }))}
                      rows={3} className="border border-gray-300 rounded px-2 py-1 text-xs w-full focus:outline-green-900 resize-none leading-relaxed" />
                  </div>

                  <div className="col-span-2 flex gap-1 justify-end flex-wrap pt-1">
                    <button onClick={() => handleSave(evt.event_id)} className="px-3 py-1 bg-green-900 text-white text-xs rounded-full hover:bg-green-800">저장</button>
                    <button onClick={handleCancel} className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full hover:bg-gray-200">취소</button>
                  </div>
                </>

              /* ── 읽기 모드 ── */
              ) : (
                <>
                  <div className="col-span-2">
                    <span className="font-medium text-gray-900 text-xs leading-snug block">{evt.short_title}</span>
                  </div>

                  <div className="col-span-2 flex flex-col text-xs">
                    <span className="font-medium text-gray-600">
                      {evt.chapter_order != null ? `${evt.chapter_order}화` : '-'}
                    </span>
                    <span className="text-gray-400 truncate" title={evt.chapter_title}>{evt.chapter_title || '-'}</span>
                  </div>

                  <div className="col-span-1 flex justify-center pt-0.5">
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded w-max">
                      {Number(normalizeImportanceScore(evt.importance_score)).toFixed(2)}
                    </span>
                  </div>

                  <div className="col-span-1 text-center pt-0.5">
                    {evt.is_core_event
                      ? <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-bold">CORE</span>
                      : <span className="text-gray-300 text-xs">-</span>}
                  </div>

                  <div className="col-span-4">
                    <p className="text-gray-500 text-xs leading-relaxed whitespace-pre-wrap break-words pr-2">
                      {evt.summary}
                    </p>
                  </div>

                  <div className="col-span-2 text-right pt-0.5">
                    {readOnly ? <span className="text-xs text-gray-300">-</span> : (
                      <button onClick={() => handleEdit(evt)} className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full hover:bg-gray-200">수정</button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   StepPanel
============================================================ */
function StepPanel({ step, index, total, onComplete, onPrev, children, isFirst }) {
  return (
    <div className="rounded-2xl border border-green-100 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 bg-green-50/40 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold bg-green-900 text-white">
            {index + 1}
          </div>
          <p className="font-semibold text-sm text-gray-900">{step.label}</p>
          <span className="text-xs text-gray-400">{index + 1} / {total} 단계</span>
        </div>
        <div className="flex gap-2">
          {!isFirst && (
            <button onClick={onPrev}
              className="px-4 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-semibold rounded-full hover:bg-gray-50">
              ← 이전 단계
            </button>
          )}
          <button onClick={onComplete}
            className="px-5 py-1.5 bg-green-900 text-white text-xs font-semibold rounded-full hover:bg-green-800">
            검수 완료 →
          </button>
        </div>
      </div>
      <div className="px-6 pb-6 pt-5">{children}</div>
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
  const [currentStep, setCurrentStep]   = useState(STEPS[0].key)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [approving, setApproving] = useState(false)

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

  const handleComplete = (stepKey) => {
    const idx  = STEPS.findIndex(s => s.key === stepKey)
    const next = STEPS[idx + 1]
    setStepStatus(prev => ({
      ...prev,
      [stepKey]: 'done',
      ...(next ? { [next.key]: 'active' } : {}),
    }))
    setSaved(false)
    if (next) setCurrentStep(next.key)
  }

  const handleGoToPrevStep = () => {
    const idx = STEPS.findIndex(s => s.key === currentStep)
    if (idx <= 0) return
    setStepStatus(prev => {
      const next = { ...prev }
      STEPS.forEach((step, i) => {
        if (i < idx - 1) return
        else if (i === idx - 1) next[step.key] = 'active'
        else next[step.key] = 'pending'
      })
      return next
    })
    setSaved(false)
    setCurrentStep(STEPS[idx - 1].key)
  }

  const handleStepClick = (stepKey) => setCurrentStep(stepKey)

  const handleBookSelect = (book) => {
    setSelectedBook(book)
    setStepStatus(initialStepStatus)
    setCurrentStep(STEPS[0].key)
    setSaved(book.status === 'ANALYZING_COMPLETE')
  }

  const handleSaveReview = async () => {
    setSaving(true)
    try {
      const res = await approveAnalysisForReview(bookId, {
        characters: charData.data,
        relations:  relData.data.map(r => ({ ...r, importance_score: normalizeImportanceScore(r.importance_score) })),
        events:     eventData.data.map(e => ({ ...e, importance_score: normalizeImportanceScore(e.importance_score) })),
      })
      if (res?.error) { alert(`저장 실패: ${res.message}`); return }
      setSaved(true)
    } catch (err) {
      alert(`저장 실패: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleFinalApprove = async () => {
    setApproving(true)
    try {
      const res = await summarizeBook(bookId)
      if (res?.error) { alert(`최종 승인 실패: ${res.message}`); return }
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
                <div onClick={() => handleBookSelect(book)}
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
  const currentIndex = STEPS.findIndex(s => s.key === currentStep)

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setSelectedBook(null)}
          className="text-sm text-green-800 font-semibold hover:text-green-600">
          ← 책 목록
        </button>
        <h1 className="text-xl font-bold text-gray-900">{selectedBook.title} — 데이터 검수</h1>
        {isReadOnlyBook && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
            1차 검수 완료 · 읽기 전용
          </span>
        )}
      </div>

      {!isReadOnlyBook && (
        <StepIndicator
          steps={STEPS} status={stepStatus} currentStep={currentStep}
          onStepClick={handleStepClick} readOnly={isReadOnlyBook}
        />
      )}

      {isReadOnlyBook ? (
        <div className="space-y-4">
          {STEPS.map((step) => (
            <div key={step.key} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
                <p className="font-semibold text-sm text-gray-900">{step.label}</p>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">읽기 전용</span>
              </div>
              <div className="px-6 pb-6 pt-5">
                {step.key === 'characters' && <CharacterTable characters={charData.data} setCharacters={charData.setData} loading={charData.loading} error={charData.error} onRetry={charData.reload} readOnly />}
                {step.key === 'relations'  && <RelationTable  data={relData.data}   setData={relData.setData}   loading={relData.loading}   error={relData.error}   onRetry={relData.reload}   readOnly />}
                {step.key === 'events'     && <EventTable     data={eventData.data} setData={eventData.setData} loading={eventData.loading} error={eventData.error} onRetry={eventData.reload} readOnly />}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <StepPanel
          step={STEPS[currentIndex]} index={currentIndex} total={STEPS.length}
          isFirst={currentIndex === 0} onPrev={handleGoToPrevStep}
          onComplete={() => handleComplete(currentStep)}
        >
          {currentStep === 'characters' && <CharacterTable characters={charData.data} setCharacters={charData.setData} loading={charData.loading} error={charData.error} onRetry={charData.reload} readOnly={false} />}
          {currentStep === 'relations'  && <RelationTable  data={relData.data}   setData={relData.setData}   loading={relData.loading}   error={relData.error}   onRetry={relData.reload}   readOnly={false} />}
          {currentStep === 'events'     && <EventTable     data={eventData.data} setData={eventData.setData} loading={eventData.loading} error={eventData.error} onRetry={eventData.reload} readOnly={false} />}
        </StepPanel>
      )}

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
              <button onClick={handleSaveReview} disabled={saving}
                className="px-6 py-2 bg-white border border-green-900 text-green-900 text-sm font-semibold rounded-full hover:bg-green-50 disabled:opacity-50">
                {saving ? '저장 중…' : saved ? '저장됨 ✓' : '저장'}
              </button>
            )}
            <button onClick={handleFinalApprove} disabled={!saved || approving}
              className="px-6 py-2 bg-green-900 text-white text-sm font-semibold rounded-full hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed">
              {approving ? '처리 중…' : '최종 승인'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Review