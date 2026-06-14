import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { withdrawUser } from '../api'

function Profile() {
  const { user, setUser } = useUser()
  const navigate = useNavigate()
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false)
  const [nickname, setNickname] = useState(user?.nickname || '')
  const [previewUrl, setPreviewUrl] = useState(null)

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleNicknameUpdate = async () => {
    alert('닉네임 변경 API 연동 예정입니다.')
  }

  const handleWithdraw = async () => {
    try {
      const res = await withdrawUser()
      if (res.message) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('loginType')
        localStorage.removeItem('role')
        setUser(null)
        navigate('/')
      } else {
        alert('회원탈퇴 처리 중 오류가 발생했습니다.')
      }
    } catch (err) {
      console.error(err)
      alert('회원탈퇴 처리 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-12">

      {/* 상단 프로필 */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-24 h-24 bg-green-900 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-3 overflow-hidden">
          {previewUrl
            ? <img src={previewUrl} alt="프로필" className="w-full h-full object-cover" />
            : user?.nickname?.[0] || '?'
          }
        </div>
        <label className="text-xs text-gray-400 cursor-pointer hover:text-green-700 transition-colors">
          사진 변경
          <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </label>
      </div>

      {/* 닉네임 */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 mb-2">닉네임</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-700"
          />
          <button
            onClick={handleNicknameUpdate}
            className="px-4 py-2 bg-green-900 text-white text-sm font-semibold rounded-lg hover:bg-green-800 transition-colors"
          >
            변경
          </button>
        </div>
      </div>

      {/* 이메일 */}
      <div className="mb-10">
        <p className="text-xs font-semibold text-gray-400 mb-2">이메일</p>
        <p className="text-sm text-gray-700">{user?.email}</p>
      </div>

      {/* 회원탈퇴 */}
      <div className="border-t border-gray-100 pt-6">
        {!showWithdrawConfirm ? (
          <button
            onClick={() => setShowWithdrawConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors"
          >
            계정 탈퇴
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-600">정말 탈퇴하시겠어요?</p>
            <button
              onClick={handleWithdraw}
              className="text-sm text-white bg-red-500 px-4 py-2 rounded-full hover:bg-red-600 transition-colors"
            >
              확인
            </button>
            <button
              onClick={() => setShowWithdrawConfirm(false)}
              className="text-sm text-gray-500 px-4 py-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile