import { useMemo, useState } from 'react'

const initialRows = [
  { eventId: 1, cctvNo: 1, detectCode: '0:안전모', occurredAt: '2026년04월07일 13:01', processed: false, processedAt: '', createdAt: '2026년04월07일 03:01:01', updatedAt: '2026년04월07일 13:01:01' },
  { eventId: 2, cctvNo: 1, detectCode: '1:안전조끼', occurredAt: '2026년04월07일 07:01', processed: true, processedAt: '2026년04월07일 07:30', createdAt: '2026년04월07일 07:01:01', updatedAt: '2026년04월07일 07:30:01' },
  { eventId: 3, cctvNo: 3, detectCode: '1:안전조끼', occurredAt: '2026년04월06일 15:01', processed: true, processedAt: '2026년04월06일 15:20', createdAt: '2026년04월06일 15:01:01', updatedAt: '2026년04월06일 15:20:01' },
  { eventId: 4, cctvNo: 2, detectCode: '0:안전모', occurredAt: '2026년04월05일 15:01', processed: true, processedAt: '2026년04월05일 15:20', createdAt: '2026년04월05일 15:01:01', updatedAt: '2026년04월05일 15:20:01' },
]

const DEMO_ACCOUNT = {
  id: 'safety-admin',
  password: 'admin1234',
  name: '안전관리자',
}

const pageShell = 'min-h-screen bg-[radial-gradient(circle_at_top,#0b1b3a_0%,#020617_45%,#020617_100%)] text-slate-100 p-4 md:p-6'
const panel = 'mx-auto w-full max-w-[1600px] rounded-2xl border border-slate-700/80 bg-slate-950/70 p-5 shadow-2xl shadow-black/30 backdrop-blur-md'

export default function ViolationActionPage({ onBack }) {
  const [rows, setRows] = useState(initialRows)
  const [eventIdQuery, setEventIdQuery] = useState('')
  const [processedFilter, setProcessedFilter] = useState('all')
  const [notice, setNotice] = useState('')

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const idOk = eventIdQuery.trim() ? String(r.eventId).includes(eventIdQuery.trim()) : true
      const processedOk = processedFilter === 'all' ? true : processedFilter === 'yes' ? r.processed : !r.processed
      return idOk && processedOk
    })
  }, [rows, eventIdQuery, processedFilter])

  const toggleProcessed = (eventId, checked) => {
    setRows((prev) =>
      prev.map((r) =>
        r.eventId === eventId
          ? {
              ...r,
              processed: checked,
              processedAt: checked ? new Date().toLocaleString('ko-KR', { hour12: false }) : '',
              updatedAt: new Date().toLocaleString('ko-KR', { hour12: false }),
            }
          : r,
      ),
    )
  }

  const handleSearch = () => {
    setNotice(`조회 완료: ${filteredRows.length}건`)
    setTimeout(() => setNotice(''), 1600)
  }

  const handleSave = () => {
    setNotice('수정 사항 저장 완료 (Demo)')
    setTimeout(() => setNotice(''), 1800)
  }

  const handleLogin = () => {
    if (userId === DEMO_ACCOUNT.id && password === DEMO_ACCOUNT.password) {
      setIsLoggedIn(true)
      setLoginError('')
      setNotice(`${DEMO_ACCOUNT.name} 로그인 성공`)
      setTimeout(() => setNotice(''), 1500)
      return
    }
    setLoginError('아이디 또는 비밀번호가 올바르지 않습니다.')
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setPassword('')
    setLoginError('')
  }

  if (!isLoggedIn) {
    return (
      <div className={pageShell}>
        <div className={panel}>
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">CCTV 안전 위반 조치</h2>
              <p className="text-sm text-slate-400">안전관리자 인증 후 조치 페이지에 접근할 수 있습니다.</p>
            </div>
            <button onClick={onBack} className="rounded-md border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm hover:bg-slate-800">대시보드로 돌아가기</button>
          </div>

          <div className="mx-auto w-full max-w-[560px] rounded-xl border border-indigo-500/40 bg-slate-900/70 p-6">
            <h3 className="mb-5 text-3xl font-bold text-indigo-200">안전관리자 로그인</h3>
            <div className="space-y-3">
              <label className="text-lg text-slate-200">아이디</label>
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="아이디 입력"
                className="h-11 w-full rounded-md border border-indigo-500/50 bg-slate-950 px-3 text-lg text-slate-100 placeholder:text-slate-400"
              />

              <label className="pt-1 text-lg text-slate-200">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="h-11 w-full rounded-md border border-indigo-500/50 bg-slate-950 px-3 text-lg text-slate-100 placeholder:text-slate-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLogin()
                }}
              />

              {loginError && <p className="text-sm text-rose-300">{loginError}</p>}

              <button onClick={handleLogin} className="mt-2 w-full rounded-md bg-indigo-600 px-4 py-2 text-xl font-semibold hover:bg-indigo-500">
                로그인
              </button>
            </div>

            <p className="mt-5 text-sm text-slate-300">데모 계정: <b className="text-cyan-300">{DEMO_ACCOUNT.id}</b> / <b className="text-cyan-300">{DEMO_ACCOUNT.password}</b></p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={pageShell}>
      <div className={panel}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">CCTV 안전 위반 조치</h2>
            <p className="text-sm text-slate-400">이벤트 조회/처리 상태 수정 페이지</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-1 text-xs text-emerald-200">{DEMO_ACCOUNT.name} 로그인됨</span>
            <button onClick={handleLogout} className="rounded-md border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm hover:bg-slate-800">로그아웃</button>
            <button onClick={onBack} className="rounded-md border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm hover:bg-slate-800">대시보드로 돌아가기</button>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_auto]">
          <input
            value={eventIdQuery}
            onChange={(e) => setEventIdQuery(e.target.value)}
            placeholder="이벤트ID 검색"
            className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm"
          />
          <select
            value={processedFilter}
            onChange={(e) => setProcessedFilter(e.target.value)}
            className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm"
          >
            <option value="all">처리: 전체</option>
            <option value="yes">처리: Yes</option>
            <option value="no">처리: No</option>
          </select>
          <div className="flex gap-2">
            <button onClick={handleSearch} className="rounded-md border border-indigo-500/50 bg-indigo-500/15 px-4 py-2 text-sm hover:bg-indigo-500/25">조회</button>
            <button onClick={handleSave} className="rounded-md border border-cyan-500/50 bg-cyan-500/15 px-4 py-2 text-sm hover:bg-cyan-500/25">수정 저장</button>
          </div>
        </div>

        <p className="mb-2 text-right text-xs text-amber-300">* 안전관리자 담당자만 조치 가능합니다.</p>
        {notice && <p className="mb-2 text-right text-sm text-emerald-300">{notice}</p>}

        <div className="overflow-auto rounded-xl border border-slate-700/80 bg-slate-900/60">
          <table className="w-full min-w-[1200px] border-collapse text-sm">
            <thead className="bg-slate-800 text-slate-200">
              <tr>
                <th className="border border-slate-700 px-2 py-2">이벤트ID</th>
                <th className="border border-slate-700 px-2 py-2">CCTV번호</th>
                <th className="border border-slate-700 px-2 py-2">감지코드</th>
                <th className="border border-slate-700 px-2 py-2">발생일시</th>
                <th className="border border-slate-700 px-2 py-2">처리</th>
                <th className="border border-slate-700 px-2 py-2">처리일자</th>
                <th className="border border-slate-700 px-2 py-2">생성일자</th>
                <th className="border border-slate-700 px-2 py-2">수정일자</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.eventId} className="odd:bg-slate-950/40 even:bg-slate-900/50">
                  <td className="border border-slate-800 px-2 py-2 text-right font-semibold text-cyan-300">{row.eventId}</td>
                  <td className="border border-slate-800 px-2 py-2 text-right">{row.cctvNo}</td>
                  <td className="border border-slate-800 px-2 py-2">{row.detectCode}</td>
                  <td className="border border-slate-800 px-2 py-2">{row.occurredAt}</td>
                  <td className="border border-slate-800 px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={row.processed}
                      onChange={(e) => toggleProcessed(row.eventId, e.target.checked)}
                      className="h-5 w-5 accent-indigo-500"
                    />
                  </td>
                  <td className="border border-slate-800 px-2 py-2">{row.processedAt || '-'}</td>
                  <td className="border border-slate-800 px-2 py-2">{row.createdAt}</td>
                  <td className="border border-slate-800 px-2 py-2">{row.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
