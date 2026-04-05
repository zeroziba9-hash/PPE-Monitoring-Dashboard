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
    time: '18:31:22',
    camera: 'CAM 03 - Parking',
    message: '카메라 신호 끊김 감지',
  },
  {
    id: 2,
    level: 'warning',
    time: '18:29:10',
    camera: 'CAM 02 - Lobby',
    message: '출입구 체류 시간 임계치 초과',
  },
  {
    id: 3,
    level: 'info',
    time: '18:25:04',
    camera: 'CAM 04 - Warehouse',
    message: '정상 모니터링 재개',
  },
  {
    id: 4,
    level: 'warning',
    time: '18:21:35',
    camera: 'CAM 01 - Entrance',
    message: '야간 모드 전환',
  },
]

const eventHistory = [
  { id: 1, time: '18:20', action: '관리자 로그인', actor: 'admin01' },
  { id: 2, time: '18:12', action: 'CAM 04 확대 보기', actor: 'admin01' },
  { id: 3, time: '18:09', action: '알람 확인 처리', actor: 'manager02' },
  { id: 4, time: '18:02', action: '녹화 백업 시작', actor: 'system' },
]

const levelStyles = {
  critical: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
  warning: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  info: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
}

export default function App() {
  const [selected, setSelected] = useState(null)

  const onlineCount = useMemo(
    () => cameras.filter((camera) => camera.online).length,
    [],
  )
  const offlineCount = cameras.length - onlineCount

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">CCTV Dashboard</h1>
        <div className="text-sm text-slate-400">관리자 모니터링 화면</div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        <main className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cameras.map((cam) => (
            <section
              key={cam.id}
              className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
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
                </div>
                <button
                  onClick={() => setSelected(cam)}
                  className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700"
                >
                  전체화면
                </button>
              </div>

              <div className="aspect-video bg-black">
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
          ))}
        </main>

        <aside className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-4 h-fit xl:sticky xl:top-6">
          <section className="rounded-xl bg-slate-950 border border-slate-800 p-3">
            <h2 className="text-sm font-semibold text-slate-300 mb-2">시스템 상태</h2>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-slate-900 border border-slate-800 p-2">
                <div className="text-slate-400">전체</div>
                <div className="text-base font-bold">{cameras.length}</div>
              </div>
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2">
                <div className="text-emerald-300">정상</div>
                <div className="text-base font-bold text-emerald-200">{onlineCount}</div>
              </div>
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-2">
                <div className="text-rose-300">오프라인</div>
                <div className="text-base font-bold text-rose-200">{offlineCount}</div>
              </div>
            </div>
          </section>

          <section className="rounded-xl bg-slate-950 border border-slate-800 p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-300">알람 로그</h2>
              <button className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700">
                전체 보기
              </button>
            </div>

            <ul className="space-y-2 max-h-64 overflow-auto pr-1">
              {alertLogs.map((log) => (
                <li key={log.id} className="rounded-lg bg-slate-900 border border-slate-800 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${levelStyles[log.level]}`}>
                      {log.level.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-400">{log.time}</span>
                  </div>
                  <p className="text-sm mt-1">{log.message}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{log.camera}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl bg-slate-950 border border-slate-800 p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-300">운영 히스토리</h2>
            </div>

            <ul className="space-y-2 max-h-56 overflow-auto pr-1">
              {eventHistory.map((event) => (
                <li key={event.id} className="rounded-lg bg-slate-900 border border-slate-800 p-2">
                  <div className="text-xs text-slate-400">{event.time}</div>
                  <div className="text-sm mt-0.5">{event.action}</div>
                  <div className="text-xs text-slate-500 mt-0.5">by {event.actor}</div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
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
