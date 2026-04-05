# PPE Monitoring Dashboard (Frontend Demo)

저장 영상 기반 PPE(안전모/안전조끼) 분석 시스템을 가정한 **프론트엔드 시연용 대시보드**입니다.  
백엔드 연동 없이도 발표에서 "최종 화면/흐름"을 보여줄 수 있도록 구성했습니다.

## 주요 화면

- 4분할 CCTV 모니터링 그리드
- 관리자 사이드 패널
  - 시스템 상태
  - 알람 로그(필터)
  - 운영 히스토리
- 상단 KPI 카드
  - 총 탐지 인원 / 위반 건수 / 준수율 / 분석 상태
- 분석 진행률 UI(모의)
- 시나리오 A/B 전환
- 분석 완료 모달
- 하단 이벤트 피드(ticker)

## Tech Stack

- React (Vite)
- Tailwind CSS

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 개발 서버 주소(기본 `http://localhost:5173`)로 접속하면 됩니다.

## 빌드

```bash
npm run build
```

## 참고

- 현재 프로젝트는 **프론트 시연용 프로토타입**입니다.
- 실제 영상 분석(YOLO/OpenCV/FastAPI 등) 백엔드는 추후 연동 대상입니다.
