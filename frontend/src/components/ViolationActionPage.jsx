import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client/dist/sockjs.js'

const API_BASE = 'http://localhost:8080'

const DETECT_CODE_LABEL = {
  1: '안전모 미착용',
  2: '안전조끼 미착용',
  3: '안전모/조끼 미착용',
}

const DETECT_CODE_STYLE = {
  1: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
  2: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  3: 'bg-orange-500/15 text-orange-300 border-orange-500/25',
}

const DEMO_ACCOUNT = { id: 'safety-admin', password: 'admin1234', name: '안전관리자' }

const shell = 'min-h-screen bg-[radial-gradient(ellipse_at_top,#0d1f3c_0%,#020617_55%)] text-slate-100 p-3'
const panel = 'mx-auto w-full max-w-[1600px] rounded-2xl border border-slate-700/50 bg-slate-950/80 p-4 shadow-2xl shadow-black/60 backdrop-blur-md'

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

const ShieldIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
)

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
  const [wsConnected, setWsConnected] = useState(false)
  const stompClientRef = useRef(null)

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

  // WebSocket 실시간 연동 (로그인 후 활성화)
  useEffect(() => {
    if (!isLoggedIn) return
    let client = null
    try {
      client = new Client({
        webSocketFactory: () => new SockJS('/ws/events'),
        reconnectDelay: 3000,
        onConnect: () => {
          setWsConnected(true)
          client.subscribe('/topic/events', (message) => {
            try {
              const incoming = JSON.parse(message.body)
              if (!incoming?.id) return
              setRows((prev) => {
                const exists = prev.some((r) => r.id === incoming.id)
                if (exists) {
                  // 상태 변경 업데이트
                  return prev.map((r) => r.id === incoming.id ? { ...r, ...incoming } : r)
                }
                // 새 이벤트 맨 앞에 추가
                return [incoming, ...prev]
              })
            } catch { /* ignore */ }
          })
        },
        onDisconnect: () => setWsConnected(false),
        onStompError: () => setWsConnected(false),
      })
      client.activate()
      stompClientRef.current = client
    } catch { /* WebSocket 미지원 환경 */ }
    return () => {
      if (client) client.deactivate()
      stompClientRef.current = null
      setWsConnected(false)
    }
  }, [isLoggedIn])

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

  const toggleProcessed = async (eventId, checked) => {
    const status = checked ? 'RESOLVED' : 'PENDING'
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
        processedFilter === 'all' ? true : processedFilter === 'yes' ? r.completedFlag : !r.completedFlag
      const matchCctv = cctvFilter === 'all' ? true : normalizeCctv(r.cctvNo) === cctvFilter
      return matchSearch && matchProcessed && matchCctv
    })
  }, [rows, searchQuery, processedFilter, cctvFilter])

  const totalCount = rows.length
  const resolvedCount = rows.filter((r) => r.completedFlag).length
  const pendingCount = totalCount - resolvedCount
  const completionRate = Math.round((resolvedCount / Math.max(totalCount, 1)) * 100)

  // ── 로그인 화면 ────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className={shell}>
        <div className={panel}>
          {/* 뒤로가기 */}
          <button
            onClick={onBack}
            className="mb-6 flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            대시보드로 돌아가기
          </button>

          {/* 로그인 카드 */}
          <div className="mx-auto w-full max-w-[380px]">
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-sm p-8 shadow-xl shadow-black/30">
              {/* 아이콘 */}
              <div className="flex flex-col items-center mb-6">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/15 border border-indigo-500/25 text-indigo-400 mb-3">
                  <ShieldIcon />
                </div>
                <h2 className="text-base font-bold text-slate-100">안전관리자 로그인</h2>
                <p className="text-[11px] text-slate-500 mt-1">CCTV 안전 위반 조치 페이지</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1.5">아이디</label>
                  <input
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="아이디 입력"
                    className="h-10 w-full rounded-xl border border-slate-700/60 bg-slate-800/60 px-3.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1.5">비밀번호</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호 입력"
                    className="h-10 w-full rounded-xl border border-slate-700/60 bg-slate-800/60 px-3.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60 transition-colors"
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>
                {loginError && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1">
                    <span>⚠</span> {loginError}
                  </p>
                )}
                <button
                  onClick={handleLogin}
                  disabled={loginLoading}
                  className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 transition-colors text-sm font-semibold text-white mt-1"
                >
                  {loginLoading ? '로그인 중...' : '로그인'}
                </button>
              </div>

              {/* 데모 계정 힌트 */}
              <div className="mt-5 rounded-xl border border-slate-700/40 bg-slate-800/40 p-3">
                <p className="text-[10px] text-slate-600 mb-1.5 font-medium uppercase tracking-wider">데모 계정</p>
                <div className="flex items-center gap-2 text-[11px]">
                  <code className="text-cyan-400 font-mono">{DEMO_ACCOUNT.id}</code>
                  <span className="text-slate-700">/</span>
                  <code className="text-cyan-400 font-mono">{DEMO_ACCOUNT.password}</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── 메인 조치 화면 ─────────────────────────────────────────
  return (
    <div className={shell}>
      <div className={panel}>
        {/* 헤더 */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600/15 border border-indigo-500/25 text-indigo-400">
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight text-slate-100">CCTV 안전 위반 조치</h2>
                <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400 font-medium">
                  {loggedInName}
                </span>
                <span className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium ${
                  wsConnected
                    ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
                    : 'border-slate-700/40 bg-slate-900/40 text-slate-600'
                }`}>
                  <span className={`w-1 h-1 rounded-full ${wsConnected ? 'bg-indigo-400 animate-pulse' : 'bg-slate-700'}`} />
                  {wsConnected ? 'LIVE' : '연결 중...'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">이벤트 조회 · 처리 상태 관리</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={loadAlerts}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-1.5 text-[11px] hover:bg-slate-800 text-slate-400 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              {loading ? '새로고침 중...' : '새로고침'}
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-1.5 text-[11px] hover:bg-slate-800 text-slate-400 transition-colors"
            >
              로그아웃
            </button>
            <button
              onClick={onBack}
              className="rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-[11px] hover:bg-indigo-500/20 text-indigo-300 transition-colors font-medium"
            >
              ← 대시보드
            </button>
          </div>
        </div>

        {/* KPI 카드 */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          {[
            { label: '전체 이벤트', value: totalCount, color: 'border-l-slate-500', text: 'text-slate-200' },
            { label: '미처리', value: pendingCount, color: 'border-l-rose-500', text: 'text-rose-300' },
            { label: '처리 완료', value: resolvedCount, color: 'border-l-emerald-500', text: 'text-emerald-300' },
          ].map(({ label, value, color, text }) => (
            <div key={label} className={`rounded-xl border border-slate-700/50 bg-slate-900/40 px-4 py-3 border-l-2 ${color}`}>
              <p className="text-[11px] text-slate-500 mb-1">{label}</p>
              <p className={`text-2xl font-bold tabular-nums ${text}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* 완료율 바 */}
        <div className="mb-5 rounded-xl border border-slate-700/50 bg-slate-900/40 px-4 py-3">
          <div className="flex items-center justify-between text-[11px] mb-2">
            <span className="text-slate-500 font-medium">전체 조치 완료율</span>
            <span className="text-emerald-400 font-bold tabular-nums">{completionRate}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-700 to-emerald-400 rounded-full transition-all duration-700"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* 필터 바 */}
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ID · CCTV · 감지유형 검색"
              className="h-9 w-full rounded-lg border border-slate-700/60 bg-slate-900/60 pl-9 pr-3 text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
            />
          </div>
          <select
            value={cctvFilter}
            onChange={(e) => setCctvFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-700/60 bg-slate-900/60 px-2.5 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500/40"
          >
            {cctvOptions.map((v) => (
              <option key={v} value={v}>{v === 'all' ? 'CCTV: 전체' : v}</option>
            ))}
          </select>
          <select
            value={processedFilter}
            onChange={(e) => setProcessedFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-700/60 bg-slate-900/60 px-2.5 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500/40"
          >
            <option value="all">처리: 전체</option>
            <option value="no">미처리만</option>
            <option value="yes">처리완료만</option>
          </select>
          <span className="text-[10px] text-slate-600 ml-auto tabular-nums">{filteredRows.length}건</span>
        </div>

        {error && (
          <p className="mb-3 text-[11px] text-rose-400 flex items-center gap-1">
            <span>⚠</span> {error}
          </p>
        )}
        {notice && (
          <p className="mb-3 text-[11px] text-emerald-400 flex items-center gap-1 justify-end">
            <span>✓</span> {notice}
          </p>
        )}

        {/* 테이블 */}
        <div className="overflow-auto rounded-xl border border-slate-700/50">
          <table className="w-full min-w-[900px] text-[11px]">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400">
                {['ID', 'CCTV', '감지 유형', '신뢰도', '발생 일시', '처리', '처리 일시', '생성 일시'].map((col, i) => (
                  <th
                    key={col}
                    className={`px-3 py-2.5 font-semibold border-b border-slate-700/60 ${
                      i === 0 || i === 5 ? 'text-center' : 'text-left'
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-600">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-6 h-6 animate-spin text-slate-700" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      불러오는 중...
                    </div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-600">이벤트가 없습니다.</td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      row.completedFlag
                        ? 'text-slate-700 bg-transparent'
                        : 'bg-slate-950/20 hover:bg-slate-800/20'
                    }`}
                  >
                    <td className="px-3 py-2.5 text-center font-mono text-slate-500">
                      #{row.id}
                    </td>
                    <td className="px-3 py-2.5 text-slate-300 font-medium">
                      {normalizeCctv(row.cctvNo)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold border ${DETECT_CODE_STYLE[row.detectedCode] || 'bg-slate-500/15 text-slate-400 border-slate-500/25'}`}>
                        {DETECT_CODE_LABEL[row.detectedCode] || `코드 ${row.detectedCode}`}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-slate-400">
                      {row.confidence != null ? `${(row.confidence * 100).toFixed(1)}%` : '-'}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-slate-400">
                      {formatDt(row.detectedAt)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!row.completedFlag}
                          onChange={(e) => toggleProcessed(row.id, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600" />
                      </label>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-slate-500">
                      {row.completedAt ? formatDt(row.completedAt) : (
                        <span className="text-slate-700">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-slate-500">
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
