import { useState } from 'react'

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

export default function App() {
  const [selected, setSelected] = useState(null)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">CCTV Dashboard</h1>
        <span className="text-sm text-slate-400">4-Grid View</span>
      </header>

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
