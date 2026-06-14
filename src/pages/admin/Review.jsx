import { useSearchParams } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { getAdminBooks, getBookCharactersForReview, getBookRelationsForReview, getBookEventsForReview, approveAnalysisForReview } from '../../api'

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

async function submitStepData(bookId, stepKey, data) {
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
============================================================ */

function CharacterTable({ characters, setCharacters, loading, error, onRetry }) {
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
            {bulkMode ? (
              <>
                <input value={char.character_name || ''} onChange={e => updateDraft(char.character_id, 'character_name', e.target.value)}
                  className="border border-gray-200 rounded px-2 py-1 text-xs w-[90%]" />
                <input value={char.role || ''} onChange={e => updateDraft(char.character_id, 'role', e.target.value)}
                  className="border border-gray-200 rounded px-2 py-1 text-xs w-[90%]" />
                <input value={char.description || ''} onChange={e => updateDraft(char.character_id, 'description', e.target.value)}
                  className="border border-gray-200 rounded px-2 py-1 text-xs w-[95%]" />
                <span className="text-right text-xs text-gray-300">-</span>
              </>
            ) : editingId === char.character_id ? (
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
                  <button onClick={() => handleEdit(char)}
                    className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full hover:bg-gray-200 transition-colors">
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

/* ============================================================
   서브 컴포넌트: RelationTable
============================================================ */

function RelationTable({ data: relations, setData: setRelations, loading, error, onRetry }) {
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

            {bulkMode ? (
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
            ) : editingId === rel.relationship_change_id ? (
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

/* ============================================================
   서브 컴포넌트: EventTable
   - 유형(event_type) 컬럼 제거
   - 챕터 ID 읽기 전용 (수정 불가)
============================================================ */

function EventTable({ data: events, setData: setEvents, loading, error, onRetry }) {
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
            {bulkMode ? (
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
            ) : editingId === evt.event_id ? (
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
                  <button onClick={() => handleEdit(evt)} className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full hover:bg-gray-200">수정</button>
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
  const [searchParams] = useSearchParams()
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

  useEffect(() => {
    const bookIdParam = searchParams.get('bookId')
    if (bookIdParam && books.length > 0) {
      const book = books.find(b => String(b.books_id) === String(bookIdParam))
      if (book) handleBookSelect(book)
    }
  }, [books, searchParams])

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

 // handleFinalApprove 수정
const handleFinalApprove = async () => {
  setFinalSubmitting(true)
  try {
    const res = await approveAnalysisForReview(bookId, {
      characters: charData.data,
      relations:  relData.data,
      events:     eventData.data,
    })

    if (res?.error) {
      alert(`승인 실패: ${res.message}`)
      return
    }

    alert('최종 승인 완료')
  } catch (err) {
    alert(`승인 실패: ${err.message}`)
  } finally {
    setFinalSubmitting(false)
  }
}

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
            <RelationTable data={relData.data} setData={relData.setData} loading={relData.loading} error={relData.error} onRetry={relData.reload} />
          )}
          {step.key === 'events' && (
            <EventTable data={eventData.data} setData={eventData.setData} loading={eventData.loading} error={eventData.error} onRetry={eventData.reload} />
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