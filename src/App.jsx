import { useMemo, useState } from 'react'

const cameras = [
  {
    id: 1,
    name: 'CAM 01 - Entrance',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    online: true,
  },
  {
    id: 2,
    name: 'CAM 02 - Lobby',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    online: true,
  },
  {
    id: 3,
    name: 'CAM 03 - Parking',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    online: false,
  },
  {
    id: 4,
    name: 'CAM 04 - Warehouse',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    online: true,
  },
]

const alertLogs = [
  {
    id: 1,
    level: 'critical',
    type: 'helmet',
    time: '18:31:22',
    camera: 'CAM 03 - Parking',
    message: '안전모 미착용 인원 감지',
  },
  {
    id: 2,
    level: 'warning',
    type: 'vest',
    time: '18:29:10',
    camera: 'CAM 02 - Lobby',
    message: '안전조끼 미착용 인원 감지',
  },
  {
    id: 3,
    level: 'critical',
    type: 'both',
    time: '18:27:04',
    camera: 'CAM 04 - Warehouse',
    message: '안전모/안전조끼 미착용 인원 감지',
  },
  {
    id: 4,
    level: 'info',
    type: 'ok',
    time: '18:21:35',
    camera: 'CAM 01 - Entrance',
    message: 'PPE 준수 상태 정상',
  },
]

const eventHistory = [
  { id: 1, time: '18:20', action: '관리자 로그인', actor: 'admin01' },
  { id: 2, time: '18:12', action: 'CAM 04 확대 보기', actor: 'admin01' },
  { id: 3, time: '18:09', action: '알람 확인 처리', actor: 'manager02' },
  { id: 4, time: '18:02', action: '분석 작업 시작', actor: 'system' },
]

const bottomFeed = [
  { id: 1, level: 'critical', text: '[18:31:22] CAM 03 - Parking | 안전모 미착용 인원 감지' },
  { id: 2, level: 'warning', text: '[18:29:10] CAM 02 - Lobby | 안전조끼 미착용 인원 감지' },
  { id: 3, level: 'critical', text: '[18:27:04] CAM 04 - Warehouse | 안전모/안전조끼 미착용 인원 감지' },
  { id: 4, level: 'info', text: '[18:21:35] CAM 01 - Entrance | PPE 준수 상태 정상' },
]

const levelStyles = {
  critical: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
  warning: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  info: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
}

export default function App() {
  const [selected, setSelected] = useState(null)
  const [activeTab, setActiveTab] = useState('alerts')
  const [alertFilter, setAlertFilter] = useState('all')
  const [analysisState, setAnalysisState] = useState('idle') // idle | analyzing | done
  const [progress, setProgress] = useState(0)

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

  const onlineCount = useMemo(
    () => cameras.filter((camera) => camera.online).length,
    [],
  )

  const violationCount = alertLogs.filter((log) =>
    ['helmet', 'vest', 'both'].includes(log.type),
  ).length
  const complianceRate = Math.max(
    0,
    100 - Math.round((violationCount / (violationCount + 12)) * 100),
  )

  const filteredAlerts = useMemo(() => {
    if (alertFilter === 'all') return alertLogs
    return alertLogs.filter((log) => log.type === alertFilter)
  }, [alertFilter])

  const startMockAnalysis = () => {
    setAnalysisState('analyzing')
    setProgress(0)

    let current = 0
    const timer = setInterval(() => {
      current += 10
      setProgress(current)
      if (current >= 100) {
        clearInterval(timer)
        setAnalysisState('done')
      }
    }, 180)
  }

  const statusText =
    analysisState === 'idle'
      ? '대기'
      : analysisState === 'analyzing'
        ? '분석 중'
        : '분석 완료'

  return (
    <div className="h-screen overflow-hidden bg-slate-950 text-slate-100 p-4 md:p-6">
      <div className="h-full flex flex-col min-h-0 rounded-2xl border border-slate-800/70 bg-slate-950/60 backdrop-blur-sm p-3 md:p-4">
        <header className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              PPE Monitoring Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              저장 영상 기반 안전모/안전조끼 착용 분석
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-slate-300">
              마지막 업데이트 {nowLabel}
            </span>
            <label className="text-xs px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 cursor-pointer">
              영상 업로드
              <input type="file" accept="video/*" className="hidden" />
            </label>
            <button
              onClick={startMockAnalysis}
              className="text-xs px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
            >
              분석 시작
            </button>
          </div>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <KpiCard title="총 탐지 인원" value="17" sub="누적 기준" />
          <KpiCard
            title="위반 건수"
            value={`${violationCount}`}
            sub="안전모/조끼 미착용"
            tone="warn"
          />
          <KpiCard
            title="준수율"
            value={`${complianceRate}%`}
            sub="분석 구간 평균"
            tone="good"
          />
          <KpiCard
            title="분석 상태"
            value={statusText}
            sub={analysisState === 'analyzing' ? `${progress}%` : '최근 영상 기준'}
          />
        </section>

        {analysisState !== 'idle' && (
          <section className="mb-3 rounded-xl border border-slate-800 bg-slate-900 p-3">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
              <span>분석 진행률</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4 flex-1 min-h-0 mb-3">
          <main className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full overflow-hidden">
            {cameras.map((cam) => {
              const hasViolation = filteredAlerts.some(
                (log) =>
                  log.camera === cam.name &&
                  ['helmet', 'vest', 'both'].includes(log.type),
              )

              return (
                <section
                  key={cam.id}
                  className={`rounded-2xl border bg-slate-900 overflow-hidden shadow-lg ${
                    hasViolation ? 'border-rose-500/70' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-900/90">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{cam.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          cam.online
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {cam.online ? 'ONLINE' : 'OFFLINE'}
                      </span>
                      {hasViolation && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 animate-pulse">
                          위반 감지
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setSelected(cam)}
                      className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700"
                    >
                      전체화면
                    </button>
                  </div>

                  <div className="h-[20vh] md:h-[23vh] xl:h-[28vh] bg-black">
                    {cam.online ? (
                      <video
                        className="w-full h-full object-cover"
                        src={cam.url}
                        controls
                        autoPlay
                        muted
                        playsInline
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        신호 없음
                      </div>
                    )}
                  </div>
                </section>
              )
            })}
          </main>

          <aside className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-4 h-full overflow-hidden">
            <section className="rounded-xl bg-slate-950 border border-slate-800 p-3">
              <h2 className="text-sm font-semibold text-slate-300 mb-2">
                시스템 상태
              </h2>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-slate-900 border border-slate-800 p-2">
                  <div className="text-slate-400">전체</div>
                  <div className="text-base font-bold">{cameras.length}</div>
                </div>
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2">
                  <div className="text-emerald-300">정상</div>
                  <div className="text-base font-bold text-emerald-200">
                    {onlineCount}
                  </div>
                </div>
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-2">
                  <div className="text-rose-300">오프라인</div>
                  <div className="text-base font-bold text-rose-200">
                    {cameras.length - onlineCount}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl bg-slate-950 border border-slate-800 p-3 flex-1 min-h-0 flex flex-col">
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setActiveTab('alerts')}
                  className={`text-xs px-2 py-1 rounded-md ${
                    activeTab === 'alerts'
                      ? 'bg-indigo-600'
                      : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                >
                  알람 로그
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`text-xs px-2 py-1 rounded-md ${
                    activeTab === 'history'
                      ? 'bg-indigo-600'
                      : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                >
                  운영 히스토리
                </button>
              </div>

              {activeTab === 'alerts' ? (
                <>
                  <div className="flex gap-2 mb-2 flex-wrap">
                    <FilterButton
                      label="전체"
                      value="all"
                      current={alertFilter}
                      onChange={setAlertFilter}
                    />
                    <FilterButton
                      label="안전모"
                      value="helmet"
                      current={alertFilter}
                      onChange={setAlertFilter}
                    />
                    <FilterButton
                      label="조끼"
                      value="vest"
                      current={alertFilter}
                      onChange={setAlertFilter}
                    />
                    <FilterButton
                      label="둘 다"
                      value="both"
                      current={alertFilter}
                      onChange={setAlertFilter}
                    />
                  </div>
                  <ul className="space-y-2 overflow-auto pr-1">
                    {filteredAlerts.map((log) => (
                      <li
                        key={log.id}
                        className="rounded-lg bg-slate-900 border border-slate-800 p-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full ${
                              levelStyles[log.level]
                            }`}
                          >
                            {log.level.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-400">{log.time}</span>
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
                    <li
                      key={event.id}
                      className="rounded-lg bg-slate-900 border border-slate-800 p-2"
                    >
                      <div className="text-xs text-slate-400">{event.time}</div>
                      <div className="text-sm mt-0.5">{event.action}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        by {event.actor}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>

        <section className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            하단 이벤트 피드
          </div>
          <div className="flex gap-2 overflow-x-auto whitespace-nowrap pb-1">
            {bottomFeed.map((item) => (
              <div
                key={item.id}
                className={`text-xs rounded-md px-3 py-1.5 border ${
                  item.level === 'critical'
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                    : item.level === 'warning'
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                      : 'border-sky-500/40 bg-sky-500/10 text-sky-200'
                }`}
              >
                {item.text}
              </div>
            ))}
          </div>
        </section>
      </div>

      {selected && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-5xl rounded-xl overflow-hidden border border-slate-700 bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-slate-800 flex justify-between items-center">
              <span className="font-medium">{selected.name}</span>
              <button
                onClick={() => setSelected(null)}
                className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700"
              >
                닫기
              </button>
            </div>
            <div className="aspect-video bg-black">
              <video
                className="w-full h-full object-contain"
                src={selected.url}
                controls
                autoPlay
                muted
                playsInline
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({ title, value, sub, tone = 'default' }) {
  const toneStyle =
    tone === 'warn'
      ? 'border-amber-500/30 bg-amber-500/10'
      : tone === 'good'
        ? 'border-emerald-500/30 bg-emerald-500/10'
        : 'border-slate-800 bg-slate-900'

  return (
    <article className={`rounded-xl border p-3 shadow-sm ${toneStyle}`}>
      <p className="text-xs text-slate-400">{title}</p>
      <p className="text-lg font-bold mt-1">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </article>
  )
}

function FilterButton({ label, value, current, onChange }) {
  const active = current === value
  return (
    <button
      onClick={() => onChange(value)}
      className={`text-[11px] px-2 py-1 rounded-md border ${
        active
          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200'
          : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
      }`}
    >
      {label}
    </button>
  )
}
