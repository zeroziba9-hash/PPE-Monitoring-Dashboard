import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import KpiCard from './components/KpiCard'
import FilterButton from './components/FilterButton'
import StateTile from './components/StateTile'
import {
  bottomFeed,
  cameras,
  demoScenario,
  eventHistory as initialEventHistory,
  initialAlertLogs,
  statusChip,
  systemEvents,
} from './data/mockData'
import { levelStyles } from './constants/statusStyles'
import { fetchLatestAlerts, patchAlertStatus } from './services/alertsApi'

const statusLabel = {
  new: 'NEW',
  acked: 'ACKED',
  in_progress: 'IN PROGRESS',
  resolved: 'RESOLVED',
  unknown: 'UNKNOWN',
}

const statusBadgeStyle = {
  new: 'bg-rose-500/20 text-rose-300',
  acked: 'bg-emerald-500/20 text-emerald-300',
  in_progress: 'bg-amber-500/20 text-amber-300',
  resolved: 'bg-sky-500/20 text-sky-300',
  unknown: 'bg-slate-500/20 text-slate-300',
}

const actionToStatus = {
  ack: 'acked',
  assign: 'in_progress',
  incident: 'in_progress',
  resolve: 'resolved',
}

const validStatus = new Set(['new', 'acked', 'in_progress', 'resolved'])

const normalizeAlert = (a) => {
  if (!a || typeof a !== 'object') return null
  if (a.id === undefined || a.id === null) return null

  const status = validStatus.has(a.status) ? a.status : 'unknown'

  return {
    id: a.id,
    level: a.level || 'info',
    type: a.type || 'ok',
    time: a.time || '--:--:--',
    camera: a.camera || 'Unknown camera',
    message: a.message || 'No message',
    confidence: Number.isFinite(a.confidence) ? a.confidence : 0,
    status,
    createdAt: a.createdAt || Date.now(),
  }
}

export default function App() {
  const [selected, setSelected] = useState(null)
  const [activeTab, setActiveTab] = useState('alerts')
  const [alertFilter, setAlertFilter] = useState('all')
  const [analysisState, setAnalysisState] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [activeScenario, setActiveScenario] = useState('A')
  const [showDoneModal, setShowDoneModal] = useState(false)
  const [alerts, setAlerts] = useState(initialAlertLogs.map(normalizeAlert).filter(Boolean))
  const [selectedAlertId, setSelectedAlertId] = useState(initialAlertLogs[0].id)
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [alertsError, setAlertsError] = useState('')
  const [opsHistory, setOpsHistory] = useState(initialEventHistory)
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionType, setActionType] = useState('ack')
  const [assignee, setAssignee] = useState('admin01')
  const [actionNote, setActionNote] = useState('')
  const [actionSaving, setActionSaving] = useState(false)
  const [hideResolved, setHideResolved] = useState(true)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [timeRange, setTimeRange] = useState('24h')
  const [lastSuccessAt, setLastSuccessAt] = useState('')
  const [toast, setToast] = useState('')
  const [incidentTitle, setIncidentTitle] = useState('PPE 위반 인시던트')
  const [incidentSeverity, setIncidentSeverity] = useState('high')

  const previousNewCountRef = useRef(0)

  const nowLabel = useMemo(
    () =>
      new Date().toLocaleString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [],
  )

  const onlineCount = useMemo(() => cameras.filter((c) => c.online).length, [])
  const scenario = demoScenario[activeScenario]
  const totalPeople = scenario.people

  const filteredAlerts = useMemo(() => {
    const now = Date.now()
    const oneHour = 60 * 60 * 1000
    const twentyFourHour = 24 * oneHour

    return alerts
      .filter((log) => (alertFilter === 'all' ? true : log.type === alertFilter))
      .filter((log) => (hideResolved ? log.status !== 'resolved' : true))
      .filter((log) => {
        if (timeRange === 'all') return true
        const age = now - (log.createdAt || now)
        if (timeRange === '1h') return age <= oneHour
        if (timeRange === '24h') return age <= twentyFourHour
        return true
      })
      .filter((log) => {
        if (!searchKeyword.trim()) return true
        const q = searchKeyword.toLowerCase()
        return `${log.camera} ${log.message}`.toLowerCase().includes(q)
      })
  }, [alertFilter, alerts, hideResolved, timeRange, searchKeyword])

  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) ?? alerts[0]
  const violationCount = alerts.filter((a) => ['helmet', 'vest', 'both'].includes(a.type)).length
  const newAlertCount = alerts.filter((a) => a.status === 'new').length
  const complianceRate = Math.max(0, 100 - Math.round((violationCount / Math.max(totalPeople, 1)) * 100))

  const beep = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      oscillator.connect(gain)
      gain.connect(audioCtx.destination)
      oscillator.type = 'sine'
      oscillator.frequency.value = 880
      gain.gain.value = 0.03
      oscillator.start()
      setTimeout(() => {
        oscillator.stop()
        audioCtx.close()
      }, 180)
    } catch {
      // ignore sound failures
    }
  }, [])

  const notifyNewAlert = useCallback((countDiff) => {
    if (countDiff <= 0) return
    setToast(`새 알람 ${countDiff}건 발생`)
    beep()

    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('PPE 새 알람', { body: `새 알람 ${countDiff}건이 감지되었습니다.` })
      } else if (Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }
  }, [beep])

  const startMockAnalysis = () => {
    setAnalysisState('analyzing')
    setShowDoneModal(false)
    setProgress(0)

    let current = 0
    const timer = setInterval(() => {
      current += 10
      setProgress(current)
      if (current >= 100) {
        clearInterval(timer)
        setAnalysisState('done')
      }
    }, activeScenario === 'A' ? 180 : 220)
  }

  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true)
    setAlertsError('')

    let retries = 2
    let waitMs = 400

    while (retries >= 0) {
      try {
        const latest = await fetchLatestAlerts()
        const normalized = latest.map(normalizeAlert).filter(Boolean)

        if (normalized.length > 0) {
          setAlerts(normalized)
          setSelectedAlertId((prev) => prev ?? normalized[0].id)
        }

        const nowNewCount = normalized.filter((a) => a.status === 'new').length
        const diff = nowNewCount - previousNewCountRef.current
        previousNewCountRef.current = nowNewCount
        notifyNewAlert(diff)

        setLastSuccessAt(new Date().toLocaleTimeString('ko-KR', { hour12: false }))
        setAlertsLoading(false)
        return
      } catch {
        if (retries === 0) {
          setAlertsError('API 연결 실패 · Mock 데이터로 동작 중')
          setAlertsLoading(false)
          return
        }
        await new Promise((r) => setTimeout(r, waitMs))
        waitMs *= 2
        retries -= 1
      }
    }
  }, [notifyNewAlert])

  const openActionModal = (type) => {
    setActionType(type)
    setActionNote('')
    setShowActionModal(true)
  }

  const applyAlertAction = async () => {
    if (!selectedAlert) return

    const nextStatus = actionToStatus[actionType] ?? 'acked'
    const actionName =
      actionType === 'ack'
        ? '알람 확인 처리'
        : actionType === 'assign'
          ? '담당자 할당'
          : actionType === 'incident'
            ? '인시던트 등록'
            : '해결 처리'

    setActionSaving(true)

    try {
      await patchAlertStatus(selectedAlert.id, {
        status: nextStatus,
        assignee,
        note: actionNote,
        actionType,
        incident: actionType === 'incident' ? { title: incidentTitle, severity: incidentSeverity } : undefined,
      })
    } catch {
      setAlertsError('상태 변경 API 실패 · 로컬 상태로 반영됨')
    } finally {
      const time = new Date().toTimeString().slice(0, 5)

      setAlerts((prev) =>
        prev.map((a) =>
          a.id === selectedAlert.id
            ? {
                ...a,
                status: nextStatus,
              }
            : a,
        ),
      )

      setOpsHistory((prev) => [
        {
          id: Date.now(),
          time,
          action:
            actionType === 'incident'
              ? `${actionName} · ${incidentTitle} (${incidentSeverity})${actionNote ? ` · ${actionNote}` : ''}`
              : `${actionName}${actionNote ? ` · ${actionNote}` : ''}`,
          actor: assignee,
        },
        ...prev,
      ])

      setActionSaving(false)
      setShowActionModal(false)
    }
  }

  const statusText = analysisState === 'idle' ? '대기' : analysisState === 'analyzing' ? '분석 중' : '분석 완료'

  useEffect(() => {
    if (analysisState === 'done') setShowDoneModal(true)
  }, [analysisState])

  useEffect(() => {
    loadAlerts()
    const timer = setInterval(loadAlerts, 10000)
    return () => clearInterval(timer)
  }, [loadAlerts])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2400)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#0b1b3a_0%,#020617_45%,#020617_100%)] text-slate-100 p-2.5 md:p-3">
      <div className="h-full flex flex-col min-h-0 rounded-2xl border border-slate-700/80 bg-slate-950/70 backdrop-blur-md shadow-2xl shadow-black/30 p-2 md:p-2.5">
        <section className="mb-1.5 rounded-xl border border-slate-700/80 bg-slate-900/80 px-2.5 py-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold">PPE CONTROL CENTER</span>
            <span className="rounded border border-indigo-400/50 bg-indigo-500/20 px-1.5 py-0.5 text-indigo-200">DEMO</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-300">
            {statusChip.map((chip) => (
              <span key={chip.name} className="rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5">
                {chip.name}: <b className="text-emerald-300">{chip.value}</b>
              </span>
            ))}
            <span className="rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5">Operator: admin01</span>
          </div>
        </section>

        <header className="mb-1.5 flex items-end justify-between gap-2 relative">
          <div className="pointer-events-none absolute -top-8 right-0 h-24 w-40 bg-indigo-500/20 blur-3xl" />
          <div>
            <h1 className="text-[15px] md:text-base font-bold tracking-tight">PPE Monitoring Dashboard</h1>
            <p className="text-[10px] text-slate-400 mt-0">저장 영상 기반 안전모/안전조끼 착용 분석 · {scenario.name}</p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-0.5">
            <span className="text-[11px] rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-300">마지막 업데이트 {nowLabel}</span>
            {lastSuccessAt && <span className="text-[11px] rounded-md border border-emerald-700/40 bg-emerald-900/20 px-2 py-1.5 text-emerald-300">API 성공 {lastSuccessAt}</span>}
            <div className="flex rounded-md border border-slate-700 overflow-hidden">
              <button onClick={() => setActiveScenario('A')} className={`text-[11px] px-2 py-1.5 ${activeScenario === 'A' ? 'bg-indigo-600' : 'bg-slate-900 hover:bg-slate-800'}`}>시나리오 A</button>
              <button onClick={() => setActiveScenario('B')} className={`text-[11px] px-2 py-1.5 border-l border-slate-700 ${activeScenario === 'B' ? 'bg-indigo-600' : 'bg-slate-900 hover:bg-slate-800'}`}>시나리오 B</button>
            </div>
            <label className="text-[11px] px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 cursor-pointer">영상 업로드<input type="file" accept="video/*" className="hidden" /></label>
            <button onClick={startMockAnalysis} className="text-[11px] px-2.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20">분석 시작</button>
            <button disabled={analysisState !== 'done'} className="text-[11px] px-2.5 py-1.5 rounded-md bg-emerald-600/90 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400">결과 다운로드</button>
          </div>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-1.5 mb-1.5">
          <KpiCard title="총 탐지 인원" value={`${totalPeople}`} sub="누적 기준" />
          <KpiCard title="위반 건수" value={`${violationCount}`} sub="안전모/조끼 미착용" tone="warn" />
          <KpiCard title="준수율" value={`${complianceRate}%`} sub="분석 구간 평균" tone="good" />
          <KpiCard title="미확인 알람" value={`${newAlertCount}`} sub="ACK 필요" tone="warn" />
        </section>

        {analysisState !== 'idle' && (
          <section className="mb-1.5 rounded-xl border border-slate-800 bg-slate-900 p-2">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-2"><span>분석 진행률</span><span>{progress}% · {statusText}</span></div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all" style={{ width: `${progress}%` }} /></div>
          </section>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-2 flex-1 min-h-0 mb-1.5">
          <main className="relative grid grid-cols-1 md:grid-cols-2 md:grid-rows-2 gap-0 h-full overflow-hidden rounded-xl bg-black">
            <div className="pointer-events-none absolute inset-0 hidden md:block z-10">
              <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/25" />
              <div className="absolute top-1/2 left-0 w-full h-px -translate-y-1/2 bg-white/25" />
            </div>
            {cameras.map((cam) => {
              const hasViolation = filteredAlerts.some((log) => log.camera === cam.name && ['helmet', 'vest', 'both'].includes(log.type) && log.status !== 'resolved')
              return (
                <section key={cam.id} className="relative bg-black overflow-hidden">
                  <div className="absolute left-1.5 right-1.5 top-1.5 z-20 flex items-center justify-between px-2 py-1 rounded-md bg-slate-900/70 border border-slate-700/70 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{cam.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${cam.online ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>{cam.online ? 'ONLINE' : 'OFFLINE'}</span>
                      {hasViolation && <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 animate-pulse">위반 감지</span>}
                    </div>
                    <button onClick={() => setSelected(cam)} className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700">전체화면</button>
                  </div>
                  <div className="h-full bg-black">
                    {cam.online ? <video className="w-full h-full object-cover" src={cam.url} controls autoPlay muted playsInline /> : <div className="w-full h-full flex items-center justify-center text-slate-500">신호 없음</div>}
                  </div>
                </section>
              )
            })}
          </main>

          <aside className="grid grid-rows-[auto_auto_1fr] gap-2 h-full min-h-0">
            <section className="rounded-xl bg-slate-900/55 border border-slate-700/80 p-2">
              <h2 className="text-xs font-semibold text-slate-300 mb-1.5">시스템 상태</h2>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <StateTile label="전체" value={cameras.length} />
                <StateTile label="정상" value={onlineCount} tone="good" />
                <StateTile label="오프라인" value={cameras.length - onlineCount} tone="bad" />
              </div>
            </section>

            <section className="rounded-xl bg-slate-900/55 border border-slate-700/80 p-2">
              <h3 className="text-[11px] text-slate-400 mb-1.5">선택 알람 상세</h3>
              {selectedAlert ? (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full ${levelStyles[selectedAlert.level] || levelStyles.info}`}>{selectedAlert.level.toUpperCase()}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${statusBadgeStyle[selectedAlert.status] || statusBadgeStyle.unknown}`}>{statusLabel[selectedAlert.status] || statusLabel.unknown}</span>
                  </div>
                  <p className="text-sm">{selectedAlert.message}</p>
                  <p className="text-slate-400">{selectedAlert.camera} · {selectedAlert.time}</p>
                  <p className="text-slate-400">confidence: {(selectedAlert.confidence * 100).toFixed(1)}%</p>
                  <div className="flex gap-2 pt-1 flex-wrap">
                    <button onClick={() => openActionModal('ack')} className="text-xs px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500">ACK</button>
                    <button onClick={() => openActionModal('assign')} className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700">Assign</button>
                    <button onClick={() => openActionModal('incident')} className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700">Incident</button>
                    <button onClick={() => openActionModal('resolve')} className="text-xs px-2 py-1 rounded bg-sky-700 hover:bg-sky-600">Resolve</button>
                  </div>
                </div>
              ) : <p className="text-xs text-slate-500">선택된 알람이 없습니다.</p>}
            </section>

            <section className="rounded-xl bg-slate-900/55 border border-slate-700/80 p-2 min-h-0 flex flex-col">
              <div className="flex gap-2 mb-2 items-center justify-between">
                <div className="flex gap-2">
                  <button onClick={() => setActiveTab('alerts')} className={`text-xs px-2 py-1 rounded-md ${activeTab === 'alerts' ? 'bg-indigo-600' : 'bg-slate-800 hover:bg-slate-700'}`}>알람 로그</button>
                  <button onClick={() => setActiveTab('history')} className={`text-xs px-2 py-1 rounded-md ${activeTab === 'history' ? 'bg-indigo-600' : 'bg-slate-800 hover:bg-slate-700'}`}>운영 히스토리</button>
                </div>
                <button onClick={loadAlerts} className="text-[10px] px-2 py-1 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800">새로고침</button>
              </div>

              {activeTab === 'alerts' ? (
                <>
                  <div className="flex gap-2 mb-2 flex-wrap items-center">
                    <FilterButton label="전체" value="all" current={alertFilter} onChange={setAlertFilter} />
                    <FilterButton label="안전모" value="helmet" current={alertFilter} onChange={setAlertFilter} />
                    <FilterButton label="조끼" value="vest" current={alertFilter} onChange={setAlertFilter} />
                    <FilterButton label="둘 다" value="both" current={alertFilter} onChange={setAlertFilter} />
                    {alertsLoading && <span className="text-[10px] text-slate-400">불러오는 중...</span>}
                  </div>
                  <div className="flex gap-2 mb-2 flex-wrap items-center">
                    <input value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="카메라/메시지 검색" className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1" />
                    <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1">
                      <option value="1h">최근 1시간</option>
                      <option value="24h">최근 24시간</option>
                      <option value="all">전체</option>
                    </select>
                    <label className="text-xs inline-flex items-center gap-1">
                      <input type="checkbox" checked={hideResolved} onChange={(e) => setHideResolved(e.target.checked)} />
                      resolved 숨기기
                    </label>
                  </div>
                  {alertsError && <p className="text-[10px] text-amber-300 mb-2">{alertsError}</p>}
                  <ul className="space-y-2 overflow-auto pr-1">
                    {filteredAlerts.map((log) => (
                      <li key={log.id} onClick={() => setSelectedAlertId(log.id)} className={`rounded-lg border p-2 cursor-pointer ${selectedAlertId === log.id ? 'border-indigo-500 bg-slate-800' : 'border-slate-800 bg-slate-900'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${levelStyles[log.level] || levelStyles.info}`}>{log.level.toUpperCase()}</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusBadgeStyle[log.status] || statusBadgeStyle.unknown}`}>{statusLabel[log.status] || statusLabel.unknown}</span>
                            <span className="text-xs text-slate-400">{log.time}</span>
                          </div>
                        </div>
                        <p className="text-sm mt-1">{log.message}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{log.camera}</p>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <ul className="space-y-2 overflow-auto pr-1">
                  {opsHistory.map((event) => (
                    <li key={event.id} className="rounded-lg bg-slate-900 border border-slate-800 p-2">
                      <div className="text-xs text-slate-400">{event.time}</div>
                      <div className="text-sm mt-0.5">{event.action}</div>
                      <div className="text-xs text-slate-500 mt-0.5">by {event.actor}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-2 shrink-0">
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-2 py-1 overflow-hidden h-[56px]">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5 leading-none">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />하단 이벤트 피드
            </div>
            <div className="ticker-mask"><div className="ticker-track">{[...bottomFeed, ...bottomFeed].map((item, idx) => <div key={`${item.id}-${idx}`} className={`text-[10px] whitespace-nowrap leading-none rounded-md px-2 py-0.5 border shrink-0 ${item.level === 'critical' ? 'border-rose-500/40 bg-rose-500/10 text-rose-200' : item.level === 'warning' ? 'border-amber-500/40 bg-amber-500/10 text-amber-200' : 'border-sky-500/40 bg-sky-500/10 text-sky-200'}`}>{item.text}</div>)}</div></div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-2 py-1 overflow-hidden h-[56px]">
            <div className="text-[11px] text-slate-400 mb-1">System Console</div>
            <div className="space-y-0.5 text-[10px] font-mono text-slate-300 leading-tight">
              {systemEvents.map((line) => <p key={line} className="truncate">{line}</p>)}
            </div>
          </div>
        </section>
      </div>

      {toast && (
        <div className="fixed right-4 top-4 z-[60] rounded-md border border-indigo-400/40 bg-indigo-500/20 px-3 py-2 text-xs text-indigo-100">
          {toast}
        </div>
      )}

      {showActionModal && selectedAlert && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowActionModal(false)}>
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-3">상황 처리</h3>
            <p className="text-xs text-slate-400 mb-2">대상: {selectedAlert.camera} · {selectedAlert.message}</p>

            <div className="grid gap-2 mb-3">
              <label className="text-xs text-slate-300">액션</label>
              <select value={actionType} onChange={(e) => setActionType(e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm">
                <option value="ack">ACK</option>
                <option value="assign">담당자 할당</option>
                <option value="incident">인시던트 등록</option>
                <option value="resolve">해결 처리</option>
              </select>

              <label className="text-xs text-slate-300 mt-1">처리자</label>
              <input value={assignee} onChange={(e) => setAssignee(e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm" />

              {actionType === 'incident' && (
                <>
                  <label className="text-xs text-slate-300 mt-1">인시던트 제목</label>
                  <input value={incidentTitle} onChange={(e) => setIncidentTitle(e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm" />
                  <label className="text-xs text-slate-300 mt-1">심각도</label>
                  <select value={incidentSeverity} onChange={(e) => setIncidentSeverity(e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm">
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="critical">critical</option>
                  </select>
                </>
              )}

              <label className="text-xs text-slate-300 mt-1">메모</label>
              <textarea value={actionNote} onChange={(e) => setActionNote(e.target.value)} rows={3} className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm" placeholder="조치 내용을 입력하세요" />
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowActionModal(false)} className="text-xs px-3 py-2 rounded bg-slate-800 hover:bg-slate-700">취소</button>
              <button onClick={applyAlertAction} disabled={actionSaving} className="text-xs px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700">{actionSaving ? '저장 중...' : '저장'}</button>
            </div>
          </div>
        </div>
      )}

      {showDoneModal && (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4" onClick={() => setShowDoneModal(false)}>
          <div className="w-full max-w-md rounded-xl border border-emerald-500/30 bg-slate-900 p-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-emerald-300">분석 완료</p>
            <h3 className="text-lg font-semibold mt-1">{scenario.name}</h3>
            <p className="text-sm text-slate-400 mt-2">완료 시각 {scenario.completeAt} · 총 {totalPeople}명 중 위반 {violationCount}건 감지</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="text-xs px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700" onClick={() => setShowDoneModal(false)}>닫기</button>
              <button className="text-xs px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500">리포트 보기</button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-5xl rounded-xl overflow-hidden border border-slate-700 bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="px-3 py-2 border-b border-slate-800 flex justify-between items-center">
              <span className="font-medium">{selected.name}</span>
              <button onClick={() => setSelected(null)} className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700">닫기</button>
            </div>
            <div className="aspect-video bg-black"><video className="w-full h-full object-contain" src={selected.url} controls autoPlay muted playsInline /></div>
          </div>
        </div>
      )}
    </div>
  )
}
