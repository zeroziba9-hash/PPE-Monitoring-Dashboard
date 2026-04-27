import { useCallback, useEffect, useMemo, useState } from 'react'

const API_BASE = 'http://localhost:8080'

const DETECT_CODE_LABEL = {
  1: '안전모 미착용',
  2: '안전조끼 미착용',
  3: '안전모/조끼 미착용',
}

const DEMO_ACCOUNT = { id: 'safety-admin', password: 'admin1234', name: '안전관리자' }

const pageShell =
  'min-h-screen bg-[radial-gradient(circle_at_top,#0b1b3a_0%,#020617_45%,#020617_100%)] text-slate-100 p-4 md:p-6'
const panel =
  'mx-auto w-full max-w-[1600px] rounded-2xl border border-slate-700/80 bg-slate-950/70 p-5 shadow-2xl shadow-black/30 backdrop-blur-md'

function formatDt(isoStr) {
  if (!isoStr) return '-'
  const d = new Date(isoStr)
  if (isNaN(d)) return isoStr
  return d.toLocaleString('ko-KR', { hour12: false })
}

function normalizeCctv(raw) {
  if (!raw) return '-'
  const s = String(raw)
  if (/^cam\s*\d/i.test(s)) return s.toUpperCase()
  const n = parseInt(s, 10)
  return isNaN(n) ? s : `CAM ${String(n).padStart(2, '0')}`
}

export default function ViolationActionPage({ onBack }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [loggedInName, setLoggedInName] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [processedFilter, setProcessedFilter] = useState('all')
  const [cctvFilter, setCctvFilter] = useState('all')

  // ── 이벤트 목록 로드 ──────────────────────────────────────
  const loadEvents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/event/latest`)
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json()
      setRows(data)
    } catch (e) {
      setError(`이벤트 로드 실패: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isLoggedIn) loadEvents()
  }, [isLoggedIn, loadEvents])

  // ── 로그인 ────────────────────────────────────────────────
  const handleLogin = async () => {
    setLoginLoading(true)
    setLoginError('')
    try {
      const res = await fetch(`${API_BASE}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: userId, password }),
      })
      if (res.ok) {
        const user = await res.json()
        setIsLoggedIn(true)
        setLoggedInName(user.name || user.employeeId || userId)
        setNotice('로그인 성공')
        setTimeout(() => setNotice(''), 1500)
        setLoginLoading(false)
        return
      }
    } catch {
      /* Spring Boot 꺼져 있으면 demo 계정 사용 */
    }

    // fallback: demo 계정
    if (userId === DEMO_ACCOUNT.id && password === DEMO_ACCOUNT.password) {
      setIsLoggedIn(true)
      setLoggedInName(DEMO_ACCOUNT.name)
      setNotice('로그인 성공 (Demo)')
      setTimeout(() => setNotice(''), 1500)
    } else {
      setLoginError('아이디 또는 비밀번호가 올바르지 않습니다.')
    }
    setLoginLoading(false)
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setPassword('')
    setLoginError('')
    setRows([])
  }

  // ── 처리 상태 토글 ────────────────────────────────────────
  const toggleProcessed = async (eventId, checked) => {
    const status = checked ? 'RESOLVED' : 'PENDING'
    // 낙관적 업데이트
    setRows((prev) =>
      prev.map((r) =>
        r.id === eventId
          ? { ...r, completedFlag: checked, completedAt: checked ? new Date().toISOString() : null }
          : r,
      ),
    )
    try {
      const res = await fetch(`${API_BASE}/api/event/${eventId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error(`PATCH ${res.status}`)
      setNotice(`이벤트 #${eventId} 상태 저장 완료`)
    } catch (e) {
      setError(`저장 실패: ${e.message}`)
    } finally {
      setTimeout(() => setNotice(''), 1800)
    }
  }

  // ── 필터 ─────────────────────────────────────────────────
  const cctvOptions = useMemo(() => {
    const set = new Set(rows.map((r) => normalizeCctv(r.cctvNo)))
    return ['all', ...Array.from(set).sort()]
  }, [rows])

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const q = searchQuery.trim().toLowerCase()
      const matchSearch = q
        ? String(r.id).includes(q) ||
          normalizeCctv(r.cctvNo).toLowerCase().includes(q) ||
          (DETECT_CODE_LABEL[r.detectedCode] || '').toLowerCase().includes(q)
        : true
      const matchProcessed =
        processedFilter === 'all'
          ? true
          : processedFilter === 'yes'
          ? r.completedFlag
          : !r.completedFlag
      const matchCctv =
        cctvFilter === 'all' ? true : normalizeCctv(r.cctvNo) === cctvFilter
      return matchSearch && matchProcessed && matchCctv
    })
  }, [rows, searchQuery, processedFilter, cctvFilter])

  const totalCount = rows.length
  const resolvedCount = rows.filter((r) => r.completedFlag).length
  const pendingCount = totalCount - resolvedCount

  // ── 로그인 화면 ───────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className={pageShell}>
        <div className={panel}>
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">CCTV 안전 위반 조치</h2>
              <p className="text-sm text-slate-400">안전관리자 인증 후 조치 페이지에 접근할 수 있습니다.</p>
            </div>
            <button
              onClick={onBack}
              className="rounded-md border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm hover:bg-slate-800"
            >
              대시보드로 돌아가기
            </button>
          </div>

          <div className="mx-auto w-full max-w-[480px] rounded-xl border border-indigo-500/40 bg-slate-900/70 p-6">
            <h3 className="mb-5 text-2xl font-bold text-indigo-200">안전관리자 로그인</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-slate-300">아이디</label>
                <input
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="아이디 입력"
                  className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">비밀번호</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
              {loginError && <p className="text-xs text-rose-300">{loginError}</p>}
              <button
                onClick={handleLogin}
                disabled={loginLoading}
                className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold hover:bg-indigo-500 disabled:bg-slate-700"
              >
                {loginLoading ? '로그인 중...' : '로그인'}
              </button>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              데모 계정: <b className="text-cyan-300">{DEMO_ACCOUNT.id}</b> /{' '}
              <b className="text-cyan-300">{DEMO_ACCOUNT.password}</b>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── 메인 조치 화면 ────────────────────────────────────────
  return (
    <div className={pageShell}>
      <div className={panel}>
        {/* 헤더 */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight">CCTV 안전 위반 조치</h2>
            <p className="text-xs text-slate-400">이벤트 조회 / 처리 상태 관리</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded border border-emerald-500/40 bg-emerald-500/15 px-2 py-1 text-xs text-emerald-200">
              {loggedInName} 로그인됨
            </span>
            <button
              onClick={loadEvents}
              className="rounded border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs hover:bg-slate-800"
            >
              {loading ? '로딩...' : '새로고침'}
            </button>
            <button
              onClick={handleLogout}
              className="rounded border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs hover:bg-slate-800"
            >
              로그아웃
            </button>
            <button
              onClick={onBack}
              className="rounded border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs hover:bg-slate-800"
            >
              대시보드로 돌아가기
            </button>
          </div>
        </div>

        {/* KPI */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-center">
            <p className="text-xs text-slate-400">전체 이벤트</p>
            <p className="text-2xl font-bold text-amber-300">{totalCount}</p>
          </div>
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-center">
            <p className="text-xs text-slate-400">미처리</p>
            <p className="text-2xl font-bold text-rose-300">{pendingCount}</p>
          </div>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
            <p className="text-xs text-slate-400">처리 완료</p>
            <p className="text-2xl font-bold text-emerald-300">{resolvedCount}</p>
          </div>
        </div>

        {/* 필터 */}
        <div className="mb-3 flex flex-wrap gap-2">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ID / CCTV / 감지유형 검색"
            className="h-9 flex-1 min-w-[160px] rounded border border-slate-700 bg-slate-900 px-3 text-xs"
          />
          <select
            value={cctvFilter}
            onChange={(e) => setCctvFilter(e.target.value)}
            className="h-9 rounded border border-slate-700 bg-slate-900 px-2 text-xs"
          >
            {cctvOptions.map((v) => (
              <option key={v} value={v}>
                {v === 'all' ? 'CCTV: 전체' : v}
              </option>
            ))}
          </select>
          <select
            value={processedFilter}
            onChange={(e) => setProcessedFilter(e.target.value)}
            className="h-9 rounded border border-slate-700 bg-slate-900 px-2 text-xs"
          >
            <option value="all">처리: 전체</option>
            <option value="no">미처리만</option>
            <option value="yes">처리완료만</option>
          </select>
        </div>

        {error && <p className="mb-2 text-xs text-rose-300">{error}</p>}
        {notice && <p className="mb-2 text-right text-xs text-emerald-300">{notice}</p>}
        <p className="mb-2 text-right text-xs text-amber-300">
          * 안전관리자 담당자만 조치 가능합니다. ({filteredRows.length}건 표시)
        </p>

        {/* 테이블 */}
        <div className="overflow-auto rounded-xl border border-slate-700/80 bg-slate-900/60">
          <table className="w-full min-w-[900px] border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-800 text-slate-200">
              <tr>
                <th className="border border-slate-700 px-3 py-2.5 text-center">이벤트 ID</th>
                <th className="border border-slate-700 px-3 py-2.5">CCTV</th>
                <th className="border border-slate-700 px-3 py-2.5">감지 유형</th>
                <th className="border border-slate-700 px-3 py-2.5 text-center">신뢰도</th>
                <th className="border border-slate-700 px-3 py-2.5">발생 일시</th>
                <th className="border border-slate-700 px-3 py-2.5 text-center">처리</th>
                <th className="border border-slate-700 px-3 py-2.5">처리 일시</th>
                <th className="border border-slate-700 px-3 py-2.5">생성 일시</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    로딩 중...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    이벤트가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      row.completedFlag
                        ? 'bg-slate-900/30 text-slate-500'
                        : 'odd:bg-slate-950/40 even:bg-slate-900/50 hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="border border-slate-800 px-3 py-2 text-center font-semibold text-cyan-300">
                      #{row.id}
                    </td>
                    <td className="border border-slate-800 px-3 py-2">
                      {normalizeCctv(row.cctvNo)}
                    </td>
                    <td className="border border-slate-800 px-3 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                          row.detectedCode === 1
                            ? 'bg-rose-500/20 text-rose-300'
                            : row.detectedCode === 2
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-orange-500/20 text-orange-300'
                        }`}
                      >
                        {DETECT_CODE_LABEL[row.detectedCode] || `코드 ${row.detectedCode}`}
                      </span>
                    </td>
                    <td className="border border-slate-800 px-3 py-2 text-center">
                      {row.confidence != null
                        ? `${(row.confidence * 100).toFixed(1)}%`
                        : '-'}
                    </td>
                    <td className="border border-slate-800 px-3 py-2 tabular-nums">
                      {formatDt(row.detectedAt)}
                    </td>
                    <td className="border border-slate-800 px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={!!row.completedFlag}
                        onChange={(e) => toggleProcessed(row.id, e.target.checked)}
                        className="h-4 w-4 accent-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="border border-slate-800 px-3 py-2 tabular-nums">
                      {row.completedAt ? formatDt(row.completedAt) : '-'}
                    </td>
                    <td className="border border-slate-800 px-3 py-2 tabular-nums">
                      {formatDt(row.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
