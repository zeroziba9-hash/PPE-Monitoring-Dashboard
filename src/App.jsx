import { useEffect, useMemo, useState } from 'react'

const cameras = [
  { id: 1, name: 'CAM 01 - Entrance', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', online: true },
  { id: 2, name: 'CAM 02 - Lobby', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', online: true },
  { id: 3, name: 'CAM 03 - Parking', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', online: false },
  { id: 4, name: 'CAM 04 - Warehouse', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', online: true },
]

const initialAlertLogs = [
  { id: 1, level: 'critical', type: 'helmet', time: '18:31:22', camera: 'CAM 03 - Parking', message: '안전모 미착용 인원 감지', confidence: 0.91, status: 'new' },
  { id: 2, level: 'warning', type: 'vest', time: '18:29:10', camera: 'CAM 02 - Lobby', message: '안전조끼 미착용 인원 감지', confidence: 0.84, status: 'new' },
  { id: 3, level: 'critical', type: 'both', time: '18:27:04', camera: 'CAM 04 - Warehouse', message: '안전모/안전조끼 미착용 인원 감지', confidence: 0.93, status: 'acked' },
  { id: 4, level: 'info', type: 'ok', time: '18:21:35', camera: 'CAM 01 - Entrance', message: 'PPE 준수 상태 정상', confidence: 0.98, status: 'acked' },
]

const eventHistory = [
  { id: 1, time: '18:20', action: '관리자 로그인', actor: 'admin01' },
  { id: 2, time: '18:12', action: 'CAM 04 확대 보기', actor: 'admin01' },
  { id: 3, time: '18:09', action: '알람 확인 처리', actor: 'manager02' },
  { id: 4, time: '18:02', action: '분석 작업 시작', actor: 'system' },
]

const systemEvents = [
  '[SYS] Gateway 연결 상태 정상',
  '[MODEL] PPE detector warm-up 완료',
  '[QUEUE] 분석 작업 2건 대기',
  '[STORAGE] 결과 저장 경로 정상',
]

const bottomFeed = [
  { id: 1, level: 'critical', text: '[18:31:22] CAM 03 - Parking | 안전모 미착용 인원 감지' },
  { id: 2, level: 'warning', text: '[18:29:10] CAM 02 - Lobby | 안전조끼 미착용 인원 감지' },
  { id: 3, level: 'critical', text: '[18:27:04] CAM 04 - Warehouse | 안전모/안전조끼 미착용 인원 감지' },
  { id: 4, level: 'info', text: '[18:21:35] CAM 01 - Entrance | PPE 준수 상태 정상' },
]

const demoScenario = {
  A: { name: '시나리오 A · 주간 작업 구역', people: 17, violations: 5, completeAt: '20:44:10' },
  B: { name: '시나리오 B · 야간 창고 점검', people: 11, violations: 3, completeAt: '20:44:35' },
}

const levelStyles = {
  critical: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
  warning: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  info: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
}

const statusChip = [
  { name: 'Gateway', value: 'Connected', tone: 'ok' },
  { name: 'Model', value: 'Running', tone: 'ok' },
  { name: 'DB', value: 'Healthy', tone: 'ok' },
]

export default function App() {
  const [selected, setSelected] = useState(null)
  const [activeTab, setActiveTab] = useState('alerts')
  const [alertFilter, setAlertFilter] = useState('all')
  const [analysisState, setAnalysisState] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [activeScenario, setActiveScenario] = useState('A')
  const [showDoneModal, setShowDoneModal] = useState(false)
  const [alerts, setAlerts] = useState(initialAlertLogs)
  const [selectedAlertId, setSelectedAlertId] = useState(initialAlertLogs[0].id)

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
    if (alertFilter === 'all') return alerts
    return alerts.filter((log) => log.type === alertFilter)
  }, [alertFilter, alerts])

  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) ?? alerts[0]
  const violationCount = alerts.filter((a) => ['helmet', 'vest', 'both'].includes(a.type)).length
  const newAlertCount = alerts.filter((a) => a.status === 'new').length
  const complianceRate = Math.max(0, 100 - Math.round((violationCount / Math.max(totalPeople, 1)) * 100))

  const ackAlert = (id) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'acked' } : a)))
  }

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

  const statusText = analysisState === 'idle' ? '대기' : analysisState === 'analyzing' ? '분석 중' : '분석 완료'

  useEffect(() => {
    if (analysisState === 'done') setShowDoneModal(true)
  }, [analysisState])

  return (
    <div className="h-screen overflow-hidden bg-slate-950 text-slate-100 p-3 md:p-4">
      <div className="h-full flex flex-col min-h-0 rounded-2xl border border-slate-800/70 bg-slate-950/60 backdrop-blur-sm p-2.5 md:p-3">
        <section className="mb-2 rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold">PPE CONTROL CENTER</span>
            <span className="rounded border border-indigo-500/40 bg-indigo-500/15 px-1.5 py-0.5 text-indigo-300">DEMO</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            {statusChip.map((chip) => (
              <span key={chip.name} className="rounded border border-slate-700 bg-slate-950 px-2 py-1">
                {chip.name}: <b className="text-emerald-300">{chip.value}</b>
              </span>
            ))}
            <span className="rounded border border-slate-700 bg-slate-950 px-2 py-1">Operator: admin01</span>
          </div>
        </section>

        <header className="mb-2 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between relative">
          <div className="pointer-events-none absolute -top-8 right-0 h-24 w-40 bg-indigo-500/20 blur-3xl" />
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight">PPE Monitoring Dashboard</h1>
            <p className="text-xs text-slate-400 mt-0.5">저장 영상 기반 안전모/안전조끼 착용 분석 · {scenario.name}</p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-300">마지막 업데이트 {nowLabel}</span>
            <div className="flex rounded-md border border-slate-700 overflow-hidden">
              <button onClick={() => setActiveScenario('A')} className={`text-[11px] px-2 py-1.5 ${activeScenario === 'A' ? 'bg-indigo-600' : 'bg-slate-900 hover:bg-slate-800'}`}>시나리오 A</button>
              <button onClick={() => setActiveScenario('B')} className={`text-[11px] px-2 py-1.5 border-l border-slate-700 ${activeScenario === 'B' ? 'bg-indigo-600' : 'bg-slate-900 hover:bg-slate-800'}`}>시나리오 B</button>
            </div>
            <label className="text-[11px] px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 cursor-pointer">영상 업로드<input type="file" accept="video/*" className="hidden" /></label>
            <button onClick={startMockAnalysis} className="text-[11px] px-2.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20">분석 시작</button>
            <button disabled={analysisState !== 'done'} className="text-[11px] px-2.5 py-1.5 rounded-md bg-emerald-600/90 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400">결과 다운로드</button>
          </div>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          <KpiCard title="총 탐지 인원" value={`${totalPeople}`} sub="누적 기준" />
          <KpiCard title="위반 건수" value={`${violationCount}`} sub="안전모/조끼 미착용" tone="warn" />
          <KpiCard title="준수율" value={`${complianceRate}%`} sub="분석 구간 평균" tone="good" />
          <KpiCard title="미확인 알람" value={`${newAlertCount}`} sub="ACK 필요" tone="warn" />
        </section>

        {analysisState !== 'idle' && (
          <section className="mb-3 rounded-xl border border-slate-800 bg-slate-900 p-3">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-2"><span>분석 진행률</span><span>{progress}% · {statusText}</span></div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all" style={{ width: `${progress}%` }} /></div>
          </section>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4 flex-1 min-h-0 mb-3">
          <main className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full overflow-hidden">
            {cameras.map((cam) => {
              const hasViolation = filteredAlerts.some((log) => log.camera === cam.name && ['helmet', 'vest', 'both'].includes(log.type))
              return (
                <section key={cam.id} className={`rounded-2xl border bg-slate-900 overflow-hidden shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${hasViolation ? 'border-rose-500/70' : 'border-slate-800'}`}>
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-900/90">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{cam.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${cam.online ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>{cam.online ? 'ONLINE' : 'OFFLINE'}</span>
                      {hasViolation && <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 animate-pulse">위반 감지</span>}
                    </div>
                    <button onClick={() => setSelected(cam)} className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700">전체화면</button>
                  </div>
                  <div className="h-[20vh] md:h-[23vh] xl:h-[28vh] bg-black">
                    {cam.online ? <video className="w-full h-full object-cover" src={cam.url} controls autoPlay muted playsInline /> : <div className="w-full h-full flex items-center justify-center text-slate-500">신호 없음</div>}
                  </div>
                </section>
              )
            })}
          </main>

          <aside className="grid grid-rows-[auto_auto_1fr] gap-3 h-full min-h-0">
            <section className="rounded-xl bg-slate-950 border border-slate-800 p-3">
              <h2 className="text-sm font-semibold text-slate-300 mb-2">시스템 상태</h2>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <StateTile label="전체" value={cameras.length} />
                <StateTile label="정상" value={onlineCount} tone="good" />
                <StateTile label="오프라인" value={cameras.length - onlineCount} tone="bad" />
              </div>
            </section>

            <section className="rounded-xl bg-slate-950 border border-slate-800 p-3">
              <h3 className="text-xs text-slate-400 mb-2">선택 알람 상세</h3>
              {selectedAlert ? (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full ${levelStyles[selectedAlert.level]}`}>{selectedAlert.level.toUpperCase()}</span>
                    <span className="text-slate-400">{selectedAlert.time}</span>
                  </div>
                  <p className="text-sm">{selectedAlert.message}</p>
                  <p className="text-slate-400">{selectedAlert.camera}</p>
                  <p className="text-slate-400">confidence: {(selectedAlert.confidence * 100).toFixed(1)}%</p>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => ackAlert(selectedAlert.id)} className="text-xs px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500">ACK</button>
                    <button className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700">Assign</button>
                    <button className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700">Incident</button>
                  </div>
                </div>
              ) : <p className="text-xs text-slate-500">선택된 알람이 없습니다.</p>}
            </section>

            <section className="rounded-xl bg-slate-950 border border-slate-800 p-3 min-h-0 flex flex-col">
              <div className="flex gap-2 mb-3">
                <button onClick={() => setActiveTab('alerts')} className={`text-xs px-2 py-1 rounded-md ${activeTab === 'alerts' ? 'bg-indigo-600' : 'bg-slate-800 hover:bg-slate-700'}`}>알람 로그</button>
                <button onClick={() => setActiveTab('history')} className={`text-xs px-2 py-1 rounded-md ${activeTab === 'history' ? 'bg-indigo-600' : 'bg-slate-800 hover:bg-slate-700'}`}>운영 히스토리</button>
              </div>

              {activeTab === 'alerts' ? (
                <>
                  <div className="flex gap-2 mb-2 flex-wrap">
                    <FilterButton label="전체" value="all" current={alertFilter} onChange={setAlertFilter} />
                    <FilterButton label="안전모" value="helmet" current={alertFilter} onChange={setAlertFilter} />
                    <FilterButton label="조끼" value="vest" current={alertFilter} onChange={setAlertFilter} />
                    <FilterButton label="둘 다" value="both" current={alertFilter} onChange={setAlertFilter} />
                  </div>
                  <ul className="space-y-2 overflow-auto pr-1">
                    {filteredAlerts.map((log) => (
                      <li key={log.id} onClick={() => setSelectedAlertId(log.id)} className={`rounded-lg border p-2 cursor-pointer ${selectedAlertId === log.id ? 'border-indigo-500 bg-slate-800' : 'border-slate-800 bg-slate-900'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${levelStyles[log.level]}`}>{log.level.toUpperCase()}</span>
                          <div className="flex items-center gap-1">
                            {log.status === 'new' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">NEW</span>}
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
                  {eventHistory.map((event) => (
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

        <section className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />하단 이벤트 피드
            </div>
            <div className="ticker-mask"><div className="ticker-track">{[...bottomFeed, ...bottomFeed].map((item, idx) => <div key={`${item.id}-${idx}`} className={`text-xs rounded-md px-3 py-1.5 border shrink-0 ${item.level === 'critical' ? 'border-rose-500/40 bg-rose-500/10 text-rose-200' : item.level === 'warning' ? 'border-amber-500/40 bg-amber-500/10 text-amber-200' : 'border-sky-500/40 bg-sky-500/10 text-sky-200'}`}>{item.text}</div>)}</div></div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
            <div className="text-xs text-slate-400 mb-2">System Console</div>
            <div className="space-y-1 text-[11px] font-mono text-slate-300">
              {systemEvents.map((line) => <p key={line}>{line}</p>)}
            </div>
          </div>
        </section>
      </div>

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

function KpiCard({ title, value, sub, tone = 'default' }) {
  const toneStyle = tone === 'warn' ? 'border-amber-500/30 bg-amber-500/10' : tone === 'good' ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-slate-800 bg-slate-900'
  return (
    <article className={`rounded-xl border p-2.5 shadow-sm ${toneStyle}`}>
      <p className="text-[11px] text-slate-400">{title}</p>
      <p className="text-base font-bold mt-0.5">{value}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>
    </article>
  )
}

function FilterButton({ label, value, current, onChange }) {
  const active = current === value
  return (
    <button onClick={() => onChange(value)} className={`text-[11px] px-2 py-1 rounded-md border ${active ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200' : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'}`}>
      {label}
    </button>
  )
}

function StateTile({ label, value, tone = 'default' }) {
  const style = tone === 'good' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : tone === 'bad' ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' : 'bg-slate-900 border-slate-800 text-slate-100'
  return (
    <div className={`rounded-lg border p-2 ${style}`}>
      <div className="text-slate-400">{label}</div>
      <div className="text-base font-bold">{value}</div>
    </div>
  )
}
