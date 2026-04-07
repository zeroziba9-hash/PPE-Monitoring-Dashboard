export const cameras = [
  { id: 1, name: 'CAM 01 - Entrance', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', online: true },
  { id: 2, name: 'CAM 02 - Lobby', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', online: true },
  { id: 3, name: 'CAM 03 - Parking', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', online: false },
  { id: 4, name: 'CAM 04 - Warehouse', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', online: true },
]

export const initialAlertLogs = [
  { id: 1, level: 'critical', type: 'helmet', time: '18:31:22', camera: 'CAM 03 - Parking', message: '안전모 미착용 인원 감지', confidence: 0.91, status: 'new' },
  { id: 2, level: 'warning', type: 'vest', time: '18:29:10', camera: 'CAM 02 - Lobby', message: '안전조끼 미착용 인원 감지', confidence: 0.84, status: 'new' },
  { id: 3, level: 'critical', type: 'both', time: '18:27:04', camera: 'CAM 04 - Warehouse', message: '안전모/안전조끼 미착용 인원 감지', confidence: 0.93, status: 'acked' },
  { id: 4, level: 'info', type: 'ok', time: '18:21:35', camera: 'CAM 01 - Entrance', message: 'PPE 준수 상태 정상', confidence: 0.98, status: 'acked' },
]

export const eventHistory = [
  { id: 1, time: '18:20', action: '관리자 로그인', actor: 'admin01' },
  { id: 2, time: '18:12', action: 'CAM 04 확대 보기', actor: 'admin01' },
  { id: 3, time: '18:09', action: '알람 확인 처리', actor: 'manager02' },
  { id: 4, time: '18:02', action: '분석 작업 시작', actor: 'system' },
]

export const systemEvents = [
  '[SYS] Gateway 연결 상태 정상',
  '[MODEL] PPE detector warm-up 완료',
  '[QUEUE] 분석 작업 2건 대기',
  '[STORAGE] 결과 저장 경로 정상',
]

export const bottomFeed = [
  { id: 1, level: 'critical', text: '[18:31:22] CAM 03 - Parking | 안전모 미착용 인원 감지' },
  { id: 2, level: 'warning', text: '[18:29:10] CAM 02 - Lobby | 안전조끼 미착용 인원 감지' },
  { id: 3, level: 'critical', text: '[18:27:04] CAM 04 - Warehouse | 안전모/안전조끼 미착용 인원 감지' },
  { id: 4, level: 'info', text: '[18:21:35] CAM 01 - Entrance | PPE 준수 상태 정상' },
]

export const demoScenario = {
  A: { name: '시나리오 A · 주간 작업 구역', people: 17, violations: 5, completeAt: '20:44:10' },
  B: { name: '시나리오 B · 야간 창고 점검', people: 11, violations: 3, completeAt: '20:44:35' },
}

export const statusChip = [
  { name: 'Gateway', value: 'Connected', tone: 'ok' },
  { name: 'Model', value: 'Running', tone: 'ok' },
  { name: 'DB', value: 'Healthy', tone: 'ok' },
]
