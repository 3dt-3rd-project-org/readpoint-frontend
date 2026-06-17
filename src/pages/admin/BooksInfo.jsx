import { useState, useEffect } from "react";
import { getAdminBooks, updateBook } from "../../api";

/* ============================================================
   도서 정보 수정 페이지
   - Review 컴포넌트와 동일한 패턴:
     1) 책 목록 카드 그리드 → 선택
     2) 선택된 책의 정보 수정 폼
============================================================ */

/* ============================================================
   북 목록 섹션
============================================================ */

function BookList({ books, onSelect }) {
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">도서 정보 수정</h1>
      <p className="text-gray-400 text-sm mb-8">수정할 도서를 선택하세요</p>
      <div className="flex flex-wrap gap-6">
        {books.map(book => (
          <div
            key={book.books_id}
            onClick={() => onSelect(book)}
            className="w-40 h-52 rounded-xl overflow-hidden cursor-pointer hover:opacity-80 transition-opacity flex items-end"
            style={{
              backgroundImage: book.cover_url ? `url(${book.cover_url})` : "none",
              backgroundColor: "#1A3C2E",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="w-full bg-gradient-to-t from-black/70 to-transparent p-3">
              <p className="text-white font-bold text-sm leading-tight">{book.title}</p>
              <p className="text-white/60 text-xs mt-0.5">{book.author}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   인풋 필드
============================================================ */

function InputField({ label, name, value, onChange, type = "text", placeholder, error, hint, readOnly }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full h-10 border rounded-lg px-3 text-sm text-gray-900 outline-none transition-all
          ${readOnly
            ? "bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed"
            : error
              ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
              : "border-gray-200 bg-white focus:border-green-800 focus:ring-2 focus:ring-green-50"
          }`}
      />
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

/* ============================================================
   도서 편집 폼
============================================================ */

function BookEditForm({ book, onBack }) {
  const [form, setForm] = useState({
    title: book.title || "",
    author: book.author || "",
    publisher: book.publisher || "",
    published_year: String(book.published_year || ""),
    cover_url: book.cover_url || "",
    isbn: book.isbn || "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: "" }));
    setDirty(true);
    setSaved(false);
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim())       errs.title = "제목을 입력해 주세요.";
    if (!form.author.trim())      errs.author = "저자를 입력해 주세요.";
    if (!form.publisher.trim())   errs.publisher = "출판사를 입력해 주세요.";
    if (!form.published_year || isNaN(Number(form.published_year)))
                                  errs.published_year = "유효한 연도를 입력해 주세요.";
    if (form.isbn && !/^\d{10,13}$/.test(form.isbn.replace(/-/g, "")))
                                  errs.isbn = "ISBN은 10~13자리 숫자여야 합니다.";
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try {
      await updateBook(book.books_id, {
        title:          form.title,
        author:         form.author,
        publisher:      form.publisher,
        published_year: Number(form.published_year),
        cover_url:      form.cover_url,
        isbn:           form.isbn,
      });
      setDirty(false);
      setSaved(true);
    } catch (err) {
      alert(`저장 실패: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (dirty && !window.confirm("변경 사항을 저장하지 않고 나가시겠습니까?")) return;
    onBack();
  };

  const formatDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  const statusColor = {
    READY:      "bg-green-50 text-green-800",
    PROCESSING: "bg-yellow-50 text-yellow-700",
    ERROR:      "bg-red-50 text-red-600",
  }[book.status] || "bg-gray-100 text-gray-500";

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={handleCancel}
          className="text-sm text-green-800 font-semibold hover:text-green-600"
        >
          ← 책 목록
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          {book.title} — 도서 정보 수정
        </h1>
      </div>

      {/* 카드 */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* 카드 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <p className="font-semibold text-sm text-gray-900">기본 정보</p>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor}`}>
            {book.status}
          </span>
        </div>

        <div className="px-6 pb-6 pt-5">
          {/* 표지 미리보기 + URL */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">표지 이미지</label>
            <div className="flex gap-4 items-start">
              <div className="w-16 h-24 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0 bg-gray-50 flex items-center justify-content-center">
                {form.cover_url ? (
                  <img
                    src={form.cover_url}
                    alt="표지"
                    className="w-full h-full object-cover"
                    onError={e => { e.target.style.display = "none"; }}
                  />
                ) : (
                  <span className="text-2xl m-auto">📚</span>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  name="cover_url"
                  value={form.cover_url}
                  onChange={handleChange}
                  placeholder="https://example.com/cover.jpg"
                  className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm text-gray-900 outline-none focus:border-green-800 focus:ring-2 focus:ring-green-50"
                />
                <p className="text-xs text-gray-400 mt-1">URL 입력 시 왼쪽에 미리보기가 표시됩니다.</p>
              </div>
            </div>
          </div>

          {/* 폼 그리드 */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <InputField label="제목"       name="title"          value={form.title}          onChange={handleChange} placeholder="도서 제목"  error={errors.title} />
            <InputField label="저자"       name="author"         value={form.author}         onChange={handleChange} placeholder="저자 이름"  error={errors.author} />
            <InputField label="출판사"     name="publisher"      value={form.publisher}      onChange={handleChange} placeholder="출판사"     error={errors.publisher} />
            <InputField label="출판 연도"  name="published_year" value={form.published_year} onChange={handleChange} placeholder="예: 2024"   type="number" error={errors.published_year} />
            <div className="col-span-2">
              <InputField
                label="ISBN"
                name="isbn"
                value={form.isbn}
                onChange={handleChange}
                placeholder="하이픈(-) 없이 10~13자리"
                hint="예: 9788937460449"
                error={errors.isbn}
              />
            </div>
          </div>

          {/* 읽기 전용 메타 */}
          <div className="flex gap-6 mt-5 pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-400">도서 ID <span className="text-gray-700 font-medium ml-1">{book.books_id}</span></span>
            <span className="text-xs text-gray-400">등록일 <span className="text-gray-700 font-medium ml-1">{formatDate(book.created_at)}</span></span>
            <span className="text-xs text-gray-400">최종 수정 <span className="text-gray-700 font-medium ml-1">{formatDate(book.updated_at)}</span></span>
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center justify-between mt-5 pt-5 border-t border-gray-100">
            <div>
              {saved && (
                <span className="text-xs text-green-700 bg-green-50 px-3 py-1 rounded-full font-medium">
                  ✓ 저장되었습니다
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !dirty}
                className="px-5 py-1.5 bg-green-900 text-white text-xs font-semibold rounded-full hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "저장 중…" : "수정 완료 →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   메인 컴포넌트
============================================================ */

function BooksInfo() {
  const [books, setBooks]           = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [loadingBooks, setLoadingBooks] = useState(true);

  useEffect(() => {
    getAdminBooks()
      .then(data => setBooks(data.books || []))
      .catch(err => console.error(err))
      .finally(() => setLoadingBooks(false));
  }, []);

  if (loadingBooks) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-green-800 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">도서 목록을 불러오는 중…</p>
        </div>
      </div>
    );
  }

  if (!selectedBook) {
    return (
      <BookList
        books={books}
        onSelect={(book) => setSelectedBook(book)}
      />
    );
  }

  return (
    <BookEditForm
      book={selectedBook}
      onBack={() => setSelectedBook(null)}
    />
  );
}

export default BooksInfo;