import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client/dist/sockjs.js'
import FilterButton from './components/FilterButton'
import StateTile from './components/StateTile'
import ViolationActionPage from './components/ViolationActionPage'
import {
  cameras,
  eventHistory as initialEventHistory,
  initialAlertLogs,
  statusChip,
} from './data/mockData'
import { levelStyles } from './constants/statusStyles'
import { fetchLatestAlerts, patchAlertStatus } from './services/alertsApi'

const statusLabel = {
  new: '미확인',
  acked: '확인 중',
  in_progress: '처리 중',
  resolved: '처리 완료',
  unknown: '알 수 없음',
}

const statusBadgeStyle = {
  new: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
  acked: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  in_progress: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  resolved: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
  unknown: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
}

const actionToStatus = {
  ack: 'acked',
  resolve: 'resolved',
}

const validStatus = new Set(['new', 'acked', 'in_progress', 'resolved'])

const detectedTypeMap = {
  1: 'helmet',
  2: 'vest',
  3: 'both',
}

const typeLabelMap = {
  helmet: '안전모 미착용',
  vest: '안전조끼 미착용',
  both: '안전모/조끼 미착용',
  ok: '이상 없음',
}

const parseBBox = (raw) => {
  if (!raw) return null
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return null
  }
}

const cameraNoFromName = (cameraName) => {
  const text = String(cameraName || '')
  const m = text.match(/CAM\s*(\d{1,2})/i)
  return m ? String(parseInt(m[1], 10)) : null
}

const boxCenter = (b) => {
  if (!Array.isArray(b) || b.length < 4) return { x: 0, y: 0 }
  return { x: (Number(b[0]) + Number(b[2])) / 2, y: (Number(b[1]) + Number(b[3])) / 2 }
}

const blendBBox = (prevBox, newBox, alpha = 0.65) => {
  if (!Array.isArray(prevBox) || prevBox.length < 4) return newBox
  if (!Array.isArray(newBox) || newBox.length < 4) return prevBox
  return [0, 1, 2, 3].map((i) => Number(prevBox[i]) * (1 - alpha) + Number(newBox[i]) * alpha)
}

const smoothDetections = (prevDetections = [], nextDetections = []) => {
  if (!Array.isArray(nextDetections) || nextDetections.length === 0) return prevDetections

  const prevByTrack = new Map()
  prevDetections.forEach((p) => {
    if (p?.trackId !== null && p?.trackId !== undefined) {
      prevByTrack.set(String(p.trackId), p)
    }
  })

  return nextDetections.map((det) => {
    const trackKey = det?.trackId !== null && det?.trackId !== undefined ? String(det.trackId) : null

    if (trackKey && prevByTrack.has(trackKey)) {
      const prev = prevByTrack.get(trackKey)
      return { ...det, bboxNorm: blendBBox(prev?.bboxNorm, det?.bboxNorm) }
    }

    const center = boxCenter(det?.bboxNorm)
    const sameClass = prevDetections.filter((p) => String(p?.className) === String(det?.className))

    let best = null
    let bestDist = Infinity
    for (const p of sameClass) {
      const c = boxCenter(p?.bboxNorm)
      const d = Math.hypot(center.x - c.x, center.y - c.y)
      if (d < bestDist) { bestDist = d; best = p }
    }

    if (best && bestDist < 0.12) {
      return { ...det, bboxNorm: blendBBox(best.bboxNorm, det.bboxNorm) }
    }

    return det
  })
}

const normalizeAlert = (a) => {
  if (!a || typeof a !== 'object') return null
  if (a.id === undefined || a.id === null) return null

  const isBackendEvent = a.cctvNo !== undefined || a.detectedCode !== undefined

  if (isBackendEvent) {
    const type = detectedTypeMap[a.detectedCode] || 'ok'
    const status = a.completedFlag ? 'resolved' : 'new'
    const date = a.detectedAt ? new Date(a.detectedAt) : new Date()
    const rawCamera = a.cctvNo
    const normalizedCamera =
      typeof rawCamera === 'string' && rawCamera.toUpperCase().includes('CAM')
        ? rawCamera
        : `CAM ${String(rawCamera ?? '-').padStart(2, '0')}`

    return {
      id: a.id,
      level: status === 'resolved' ? 'info' : 'warning',
      type,
      time: date.toLocaleTimeString('ko-KR', { hour12: false }),
      camera: normalizedCamera,
      message: typeLabelMap[type] || 'PPE 이벤트',
      confidence: Number.isFinite(a.confidence) ? a.confidence : 0.95,
      bbox: parseBBox(a.bboxJson),
      status,
      createdAt: date.getTime(),
    }
  }

  const status = validStatus.has(a.status) ? a.status : 'unknown'
  return {
    id: a.id,
    level: a.level || 'info',
    type: a.type || 'ok',
    time: a.time || '--:--:--',
    camera: a.camera || 'Unknown camera',
    message: a.message || 'No message',
    confidence: Number.isFinite(a.confidence) ? a.confidence : 0,
    bbox: a.bbox || null,
    status,
    createdAt: a.createdAt || Date.now(),
  }
}

export default function App() {
  const [selected, setSelected] = useState(null)
  const [pageMode, setPageMode] = useState('dashboard')
  const [activeTab, setActiveTab] = useState('alerts')
  const [alertFilter, setAlertFilter] = useState('all')
  const [alerts, setAlerts] = useState(initialAlertLogs.map(normalizeAlert).filter(Boolean))
  const [selectedAlertId, setSelectedAlertId] = useState(initialAlertLogs[0].id)
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [alertsError, setAlertsError] = useState('')
  const [opsHistory, setOpsHistory] = useState(initialEventHistory)
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionType, setActionType] = useState('ack')
  const [actionNote, setActionNote] = useState('')
  const [actionSaving, setActionSaving] = useState(false)
  const [hideResolved, setHideResolved] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [timeRange, setTimeRange] = useState('all')
  const [lastSuccessAt, setLastSuccessAt] = useState('')
  const [toast, setToast] = useState('')
  const [cameraStreams, setCameraStreams] = useState(() =>
    Object.fromEntries(
      cameras.map((cam) => [cam.id, { url: cam.url, online: cam.online, source: 'demo' }]),
    ),
  )

  const previousNewCountRef = useRef(0)
  const uploadedUrlRef = useRef({})
  const liveBoxTimersRef = useRef({})
  const uploadBlockRef = useRef({}) // {[camNo]: unblockTime} - 업로드 후 bbox 블랙아웃
  const [liveBBoxes, setLiveBBoxes] = useState({})
  const [detectorLiveByCamNo, setDetectorLiveByCamNo] = useState({})
  const [videoDims, setVideoDims] = useState({}) // {[camId]: {nw, nh}}
  const [playingCams, setPlayingCams] = useState({}) // {[camId]: boolean}
  const [bboxBlocked, setBboxBlocked] = useState({}) // {[camId]: boolean} - 업로드 중 bbox 완전 차단
  const videoContainerRefs = useRef({}) // {[camId]: HTMLElement}

  // object-fit: contain 기준으로 실제 영상 렌더링 영역 계산
  const getVideoOverlayStyle = useCallback((camId) => {
    const dims = videoDims[camId]
    const container = videoContainerRefs.current[camId]
    if (!dims || !container) return { position: 'absolute', inset: 0 }
    const cw = container.clientWidth
    const ch = container.clientHeight
    if (cw === 0 || ch === 0) return { position: 'absolute', inset: 0 }
    const scale = Math.min(cw / dims.nw, ch / dims.nh)
    const rw = dims.nw * scale
    const rh = dims.nh * scale
    const left = (cw - rw) / 2
    const top = (ch - rh) / 2
    return { position: 'absolute', left, top, width: rw, height: rh }
  }, [videoDims])

  const onlineCount = useMemo(
    () => cameras.filter((c) => cameraStreams[c.id]?.online).length,
    [cameraStreams],
  )

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
  const resolvedCount = alerts.filter((a) => a.status === 'resolved').length
  const pendingCount = alerts.filter((a) => a.status !== 'resolved').length
  const completionRate = Math.round((resolvedCount / Math.max(alerts.length, 1)) * 100)

  const notifyNewAlert = useCallback((countDiff) => {
    if (countDiff <= 0) return
    setToast(`새 알람 ${countDiff}건 발생`)
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('PPE 새 알람', { body: `새 알람 ${countDiff}건이 감지되었습니다.` })
      } else if (Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }
  }, [])

  const handleCameraUpload = async (camId, file) => {
    if (!file) return
    const prevUrl = uploadedUrlRef.current[camId]
    if (prevUrl) URL.revokeObjectURL(prevUrl)
    const objectUrl = URL.createObjectURL(file)
    uploadedUrlRef.current[camId] = objectUrl
    const cameraName = cameras.find((c) => c.id === camId)?.name || `CAM ${String(camId).padStart(2, '0')}`
    const camNo = cameraNoFromName(cameraName)

    // bbox 완전 차단 시작
    setBboxBlocked((prev) => ({ ...prev, [camId]: true }))
    setPlayingCams((prev) => ({ ...prev, [camId]: false }))
    if (camNo) {
      uploadBlockRef.current[camNo] = Date.now() + 6000
      setDetectorLiveByCamNo((prev) => { const next = { ...prev }; delete next[camNo]; return next })
    }
    Object.values(liveBoxTimersRef.current).forEach((timerId) => clearTimeout(timerId))
    liveBoxTimersRef.current = {}
    setLiveBBoxes({})
    setCameraStreams((prev) => ({ ...prev, [camId]: { url: objectUrl, online: true, source: 'uploaded' } }))
    setToast(`${cameraName} 영상 업로드 완료`)

    try {
      const form = new FormData()
      form.append('file', file)
      form.append('cameraName', cameraName)
      const res = await fetch('http://127.0.0.1:8000/analyze-upload', { method: 'POST', body: form })
      if (!res.ok) throw new Error(`detector ${res.status}`)
      setToast(`${cameraName} 실시간 추론 실행됨`)
    } catch {
      setAlertsError('디텍터 연결 실패 · http://127.0.0.1:8000 실행 확인 필요')
    } finally {
      // 응답 후 3초 더 기다렸다가 차단 해제 (새 detector가 안정화될 때까지)
      setTimeout(() => {
        setBboxBlocked((prev) => ({ ...prev, [camId]: false }))
      }, 3000)
    }
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
    const actionName = actionType === 'ack' ? '알람 확인 처리' : '해결 처리'
    setActionSaving(true)
    try {
      await patchAlertStatus(selectedAlert.id, {
        status: nextStatus === 'resolved' ? 'RESOLVED' : 'PENDING',
      })
    } catch {
      setAlertsError('상태 변경 API 실패 · 로컬 상태로 반영됨')
    } finally {
      const time = new Date().toTimeString().slice(0, 5)
      setAlerts((prev) =>
        prev.map((a) => a.id === selectedAlert.id ? { ...a, status: nextStatus } : a),
      )
      setOpsHistory((prev) => [
        { id: Date.now(), time, action: `${actionName}${actionNote ? ` · ${actionNote}` : ''}`, actor: 'admin01' },
        ...prev,
      ])
      setActionSaving(false)
      setShowActionModal(false)
    }
  }

  // 앱 시작 시 4개 카메라 자동 감지 시작
  useEffect(() => {
    const camVideoPaths = [
      { id: 1, name: 'CAM 01 - Entrance', path: String.raw`C:\Users\ASUS\Desktop\PPE-Monitoring-Dashboard\PPE-Monitoring-Dashboard\public\cam1.mp4` },
      { id: 2, name: 'CAM 02 - Lobby',    path: String.raw`C:\Users\ASUS\Desktop\PPE-Monitoring-Dashboard\PPE-Monitoring-Dashboard\public\cam2.mp4` },
      { id: 3, name: 'CAM 03 - Parking',  path: String.raw`C:\Users\ASUS\Desktop\PPE-Monitoring-Dashboard\PPE-Monitoring-Dashboard\public\cam3.mp4` },
      { id: 4, name: 'CAM 04 - Warehouse',path: String.raw`C:\Users\ASUS\Desktop\PPE-Monitoring-Dashboard\PPE-Monitoring-Dashboard\public\cam4.mp4` },
    ]
    camVideoPaths.forEach(({ name, path }) => {
      fetch('http://127.0.0.1:8000/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: path, cameraName: name }),
      }).catch(() => {})
    })
  }, [])

  useEffect(() => {
    loadAlerts()
    const timer = setInterval(loadAlerts, 10000)
    return () => clearInterval(timer)
  }, [loadAlerts])

  useEffect(() => {
    let client = null
    try {
      client = new Client({
        webSocketFactory: () => new SockJS('/ws/events'),
        reconnectDelay: 2000,
        onConnect: () => {
          client.subscribe('/topic/events', (message) => {
            try {
              const incoming = JSON.parse(message.body)
              const normalized = normalizeAlert(incoming)
              if (!normalized) return
              setAlerts((prev) => {
                const exists = prev.some((item) => item.id === normalized.id)
                if (exists) return prev.map((item) => (item.id === normalized.id ? { ...item, ...normalized } : item))
                return [normalized, ...prev]
              })
              const camNo = cameraNoFromName(normalized.camera)
              if (camNo && normalized.bbox) {
                setLiveBBoxes((prev) => ({ ...prev, [camNo]: normalized }))
                if (liveBoxTimersRef.current[camNo]) clearTimeout(liveBoxTimersRef.current[camNo])
                liveBoxTimersRef.current[camNo] = setTimeout(() => {
                  setLiveBBoxes((prev) => { const next = { ...prev }; delete next[camNo]; return next })
                }, 3500)
              }
            } catch { /* ignore malformed */ }
          })
        },
      })
      client.activate()
    } catch { /* websocket init failed */ }

    return () => {
      Object.values(liveBoxTimersRef.current).forEach((timerId) => clearTimeout(timerId))
      liveBoxTimersRef.current = {}
      if (client) client.deactivate()
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/live-detections')
        if (!res.ok) return
        const data = await res.json()
        const byCamera = data?.detectionsByCamera
        if (!byCamera || typeof byCamera !== 'object') return
        const nowSec = Date.now() / 1000
        setDetectorLiveByCamNo((prev) => {
          const next = { ...prev }
          Object.entries(byCamera).forEach(([cameraName, value]) => {
            const camNo = cameraNoFromName(cameraName)
            if (!camNo) return
            // 업로드 직후 블랙아웃 기간이면 무시
            const blockUntil = uploadBlockRef.current[camNo]
            if (blockUntil && Date.now() < blockUntil) return
            const incoming = Array.isArray(value?.detections) ? value.detections : []
            const incomingUpdatedAt = Number(value?.updatedAt || nowSec)
            const prevCam = prev[camNo]
            const smoothed = smoothDetections(prevCam?.detections || [], incoming)
            next[camNo] = { detections: smoothed, updatedAt: incomingUpdatedAt }
          })
          Object.entries(next).forEach(([camNo, value]) => {
            if (nowSec - Number(value?.updatedAt || 0) > 6.0) delete next[camNo]
          })
          return next
        })
      } catch { /* ignore */ }
    }, 250)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2400)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    const uploadedUrls = uploadedUrlRef.current
    return () => { Object.values(uploadedUrls).forEach((url) => { if (url) URL.revokeObjectURL(url) }) }
  }, [])

  if (pageMode === 'action') {
    return <ViolationActionPage onBack={() => setPageMode('dashboard')} />
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#0b1b3a_0%,#020617_50%,#020617_100%)] text-slate-100 p-3">
      <div className="flex flex-col rounded-2xl border border-slate-700/60 bg-slate-950/70 backdrop-blur-md shadow-2xl shadow-black/40 p-3 gap-3">

        {/* ── 헤더 ── */}
        <header className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight">PPE Monitoring Dashboard</h1>
                <span className="rounded border border-indigo-400/50 bg-indigo-500/20 px-2 py-0.5 text-[11px] text-indigo-200">DEMO</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">CCTV 기반 안전 보호구 실시간 모니터링</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            {lastSuccessAt && (
              <span className="rounded border border-emerald-700/40 bg-emerald-900/20 px-2 py-1 text-emerald-300">
                API 동기화 {lastSuccessAt}
              </span>
            )}
            {statusChip.map((chip) => (
              <span key={chip.name} className="rounded border border-slate-700 bg-slate-900 px-2 py-1">
                {chip.name}: <b className="text-emerald-300">{chip.value}</b>
              </span>
            ))}
            <button
              onClick={() => setPageMode('action')}
              className="rounded border border-cyan-500/50 bg-cyan-500/15 px-3 py-1 text-cyan-200 hover:bg-cyan-500/25 transition-colors"
            >
              조치 페이지
            </button>
          </div>
        </header>

        {/* ── 메인 영역 ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-3 xl:h-[780px]">

          {/* CCTV 그리드 */}
          <main className="relative grid grid-cols-1 md:grid-cols-2 md:grid-rows-2 gap-0 min-h-[420px] xl:min-h-[700px] overflow-hidden rounded-xl bg-black">
            <div className="pointer-events-none absolute inset-0 hidden md:block z-10">
              <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/20" />
              <div className="absolute top-1/2 left-0 w-full h-px -translate-y-1/2 bg-white/20" />
            </div>

            {cameras.map((cam) => {
              const stream = cameraStreams[cam.id] || { url: cam.url, online: cam.online, source: 'demo' }
              const camNo = cameraNoFromName(cam.name)
              const liveViolation = camNo ? liveBBoxes[camNo] : null
              const detectorLive = camNo ? detectorLiveByCamNo[camNo] : null
              const overlayDetections = detectorLive?.detections || []
              const hasViolation = overlayDetections.length > 0 || Boolean(liveViolation)

              return (
                <section key={cam.id} className="relative bg-black overflow-hidden">
                  {/* 카메라 상단 바 */}
                  <div className="absolute left-2 right-2 top-2 z-20 flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/60 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{cam.name}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${stream.online ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                        {stream.online ? 'ONLINE' : 'OFFLINE'}
                      </span>
                      {stream.source === 'uploaded' && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">LOCAL</span>
                      )}
                      {hasViolation && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 animate-pulse">위반 감지</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <label className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer transition-colors">
                        영상 올리기
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            handleCameraUpload(cam.id, file)
                            e.target.value = ''
                          }}
                        />
                      </label>
                      <button
                        onClick={() => setSelected({ ...cam, url: stream.url })}
                        className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                      >
                        전체화면
                      </button>
                    </div>
                  </div>

                  {/* 영상 */}
                  <div
                    className="h-full bg-black relative"
                    ref={(el) => { videoContainerRefs.current[cam.id] = el }}
                  >
                    {stream.online ? (
                      <>
                        <video
                          className="w-full h-full object-contain bg-black"
                          src={stream.url}
                          controls
                          autoPlay
                          muted
                          playsInline
                          loop
                          onLoadedMetadata={(e) => {
                            const v = e.currentTarget
                            setVideoDims(prev => ({
                              ...prev,
                              [cam.id]: { nw: v.videoWidth, nh: v.videoHeight }
                            }))
                            v.play().catch(() => {})
                          }}
                          onCanPlay={(e) => { if (e.currentTarget.paused) e.currentTarget.play().catch(() => {}) }}
                          onPlay={() => setPlayingCams(prev => ({ ...prev, [cam.id]: true }))}
                          onPause={() => setPlayingCams(prev => ({ ...prev, [cam.id]: false }))}
                          onEnded={() => setPlayingCams(prev => ({ ...prev, [cam.id]: false }))}
                        />
                        {overlayDetections.length > 0 && playingCams[cam.id] && !bboxBlocked[cam.id] && (
                          <div className="pointer-events-none z-10" style={getVideoOverlayStyle(cam.id)}>
                            {overlayDetections.map((det, idx) => {
                              const box = Array.isArray(det?.bboxNorm) ? det.bboxNorm : null
                              if (!box || box.length < 4) return null
                              const [x1, y1, x2, y2] = box.map((v) => Number(v))
                              if (![x1, y1, x2, y2].every(Number.isFinite)) return null
                              const clsName = String(det.className || '').toLowerCase()
                              const isViolation = clsName.includes('no-helmet') || clsName.includes('no_helmet') || clsName.includes('no-vest') || clsName.includes('no_vest')
                              const borderCls = isViolation ? 'border-rose-500' : 'border-cyan-400'
                              const labelCls = isViolation ? 'bg-rose-600/90' : 'bg-cyan-600/90'
                              const style = {
                                left: `${Math.max(0, x1 * 100)}%`,
                                top: `${Math.max(0, y1 * 100)}%`,
                                width: `${Math.max(1, (x2 - x1) * 100)}%`,
                                height: `${Math.max(1, (y2 - y1) * 100)}%`,
                              }
                              return (
                                <div
                                  key={`${det.className || 'det'}-${idx}`}
                                  className={`absolute border-2 ${borderCls} shadow-[0_0_0_1px_rgba(255,255,255,0.2)]`}
                                  style={style}
                                >
                                  <span className={`absolute -top-6 left-0 whitespace-nowrap rounded ${labelCls} px-1.5 py-0.5 text-[10px] text-white`}>
                                    {String(det.className || 'ppe').toUpperCase()} {Math.round((Number(det.confidence) || 0) * 100)}%
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">신호 없음</div>
                    )}
                  </div>
                </section>
              )
            })}
          </main>

          {/* 우측 사이드바 */}
          <aside className="grid grid-rows-[auto_minmax(0,1fr)] gap-3 min-h-[420px] xl:h-[780px] overflow-hidden">

            {/* 시스템 상태 + KPI 통합 */}
            <section className="rounded-xl bg-slate-900/60 border border-slate-700/60 p-3">
              <h2 className="text-sm font-semibold text-slate-200 mb-3">시스템 현황</h2>

              {/* CCTV 상태 */}
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <StateTile label="전체 CCTV" value={cameras.length} />
                <StateTile label="정상" value={onlineCount} tone="good" />
                <StateTile label="오프라인" value={cameras.length - onlineCount} tone="bad" />
              </div>

              {/* KPI 통합 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
                  <p className="text-xs text-slate-400 mb-1">탐지 건수</p>
                  <p className="text-xl font-bold text-amber-300">{violationCount}</p>
                  <p className="text-xs text-slate-500 mt-0.5">안전모 / 조끼</p>
                </div>
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5">
                  <p className="text-xs text-slate-400 mb-1">처리 완료</p>
                  <p className="text-xl font-bold text-emerald-300">{resolvedCount}</p>
                  <p className="text-xs text-slate-500 mt-0.5">미처리 {pendingCount}건</p>
                </div>
                <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-2.5">
                  <p className="text-xs text-slate-400 mb-1">조치 완료율</p>
                  <p className="text-xl font-bold text-sky-300">{completionRate}%</p>
                  <p className="text-xs text-slate-500 mt-0.5">전체 기준</p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-2.5">
                  <p className="text-xs text-slate-400 mb-1">미처리</p>
                  <p className="text-xl font-bold text-rose-300">{pendingCount}</p>
                  <p className="text-xs text-slate-500 mt-0.5">즉시 조치 필요</p>
                </div>
              </div>
            </section>

            {/* 알람 로그 / 운영 히스토리 */}
            <section className="rounded-xl bg-slate-900/60 border border-slate-700/60 p-3 min-h-0 flex flex-col">
              <div className="flex gap-2 mb-3 items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('alerts')}
                    className={`text-xs px-3 py-1.5 rounded-md transition-colors ${activeTab === 'alerts' ? 'bg-indigo-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                  >
                    알람 로그
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`text-xs px-3 py-1.5 rounded-md transition-colors ${activeTab === 'history' ? 'bg-indigo-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                  >
                    운영 히스토리
                  </button>
                </div>
                <button
                  onClick={loadAlerts}
                  className="text-xs px-2 py-1.5 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
                >
                  {alertsLoading ? '로딩 중...' : '새로고침'}
                </button>
              </div>

              {activeTab === 'alerts' ? (
                <>
                  {/* 선택된 알람 상세 */}
                  {selectedAlert && (
                    <div className="mb-2 rounded-lg border border-slate-700 bg-slate-900/80 p-2">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${levelStyles[selectedAlert.level] || levelStyles.info}`}>
                            {selectedAlert.level.toUpperCase()}
                          </span>
                          <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${statusBadgeStyle[selectedAlert.status] || statusBadgeStyle.unknown}`}>
                            {statusLabel[selectedAlert.status] || statusLabel.unknown}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">{selectedAlert.time}</span>
                      </div>
                      <p className="text-xs font-medium mb-1">{selectedAlert.message}</p>
                      <p className="text-[11px] text-slate-400 mb-1.5">{selectedAlert.camera} · {(selectedAlert.confidence * 100).toFixed(1)}%</p>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => openActionModal('ack')}
                          className="text-[11px] px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 transition-colors flex-1"
                        >
                          확인 (ACK)
                        </button>
                        <button
                          onClick={() => openActionModal('resolve')}
                          className="text-[11px] px-2 py-1 rounded-md bg-sky-700 hover:bg-sky-600 transition-colors flex-1"
                        >
                          해결 완료
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 필터 */}
                  <div className="flex gap-1.5 mb-1.5 flex-wrap items-center">
                    <FilterButton label="전체" value="all" current={alertFilter} onChange={setAlertFilter} />
                    <FilterButton label="안전모" value="helmet" current={alertFilter} onChange={setAlertFilter} />
                    <FilterButton label="조끼" value="vest" current={alertFilter} onChange={setAlertFilter} />
                    <FilterButton label="둘 다" value="both" current={alertFilter} onChange={setAlertFilter} />
                    <select
                      value={timeRange}
                      onChange={(e) => setTimeRange(e.target.value)}
                      className="text-[11px] bg-slate-800 border border-slate-700 rounded-md px-1.5 py-0.5 ml-auto"
                    >
                      <option value="1h">1시간</option>
                      <option value="24h">24시간</option>
                      <option value="all">전체</option>
                    </select>
                  </div>
                  {alertsError && (
                    <p className="text-xs text-amber-300 mb-2 px-1">{alertsError}</p>
                  )}

                  <ul className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-1">
                    {filteredAlerts.map((log) => (
                      <li
                        key={log.id}
                        onClick={() => setSelectedAlertId(log.id)}
                        className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                          selectedAlertId === log.id
                            ? 'border-indigo-500/60 bg-slate-800'
                            : 'border-slate-700/60 bg-slate-900/60 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${levelStyles[log.level] || levelStyles.info}`}>
                            {log.level.toUpperCase()}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusBadgeStyle[log.status] || statusBadgeStyle.unknown}`}>
                              {statusLabel[log.status] || statusLabel.unknown}
                            </span>
                            <span className="text-xs text-slate-400">{log.time}</span>
                          </div>
                        </div>
                        <p className="text-sm">{log.message}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{log.camera}</p>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <ul className="space-y-2 overflow-auto min-h-0 pr-1">
                  {opsHistory.map((event) => (
                    <li key={event.id} className="rounded-lg bg-slate-900/60 border border-slate-700/60 p-3">
                      <div className="text-xs text-slate-400 mb-1">{event.time}</div>
                      <div className="text-sm">{event.action}</div>
                      <div className="text-xs text-slate-500 mt-0.5">by {event.actor}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>

      </div>

      {/* ── 토스트 ── */}
      {toast && (
        <div className="fixed right-4 top-4 z-[60] rounded-lg border border-indigo-400/40 bg-indigo-500/20 px-4 py-2.5 text-sm text-indigo-100 shadow-lg">
          {toast}
        </div>
      )}

      {/* ── 액션 모달 ── */}
      {showActionModal && selectedAlert && (
        <div
          className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
          onClick={() => setShowActionModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold mb-1">
              {actionType === 'ack' ? '알람 확인 처리' : '해결 완료 처리'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {selectedAlert.camera} · {selectedAlert.message}
            </p>
            <div className="grid gap-3 mb-4">
              <label className="text-xs text-slate-300">메모 (선택)</label>
              <textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                rows={3}
                className="bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm placeholder:text-slate-500"
                placeholder="조치 내용을 입력하세요"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowActionModal(false)}
                className="text-sm px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                취소
              </button>
              <button
                onClick={applyAlertAction}
                disabled={actionSaving}
                className="text-sm px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 transition-colors"
              >
                {actionSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 전체화면 모달 ── */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-5xl rounded-xl overflow-hidden border border-slate-700 bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center">
              <span className="font-medium">{selected.name}</span>
              <button
                onClick={() => setSelected(null)}
                className="text-xs px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                닫기
              </button>
            </div>
            <div className="aspect-video bg-black">
              <video className="w-full h-full object-contain" src={selected.url} controls autoPlay muted playsInline loop />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
