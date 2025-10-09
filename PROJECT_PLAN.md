# AI Shorts 영상 생성 플랫폼 - 프로젝트 계획서

## 📋 프로젝트 개요

하나의 개념을 담고 있는 글을 입력하면, OpenAI API를 트리 구조로 연결하여 처리하고, 최종적으로 자막과 TTS가 입힌 Shorts 형태의 영상을 자동으로 생성하는 웹 플랫폼

---

## 🎯 핵심 기능

### 1. API Tree 시스템
- **트리 구조 정의**: 사용자가 노드를 드래그 앤 드롭으로 연결
- **구분자 기반 배열 분리**: 각 API 응답을 특정 구분자로 split하여 배열에 저장
- **부모-자식 참조**: 자식 노드가 부모 배열의 특정 인덱스를 참조하여 프롬프트 구성
- **병렬/순차 실행**:
  - 형제 노드 → 병렬 처리
  - 부모-자식 노드 → 순차 처리

### 2. 노드 설정 (각 노드 클릭 시)
- **Developer Message** (시스템 프롬프트)
- **User Prompt Template** (예: `{parent[0]}를 발전시켜줘`)
- **부모 배열 참조 설정** (어떤 부모의 몇 번째 요소 사용)
- **출력 구분자 설정** (예: `\n---\n`, `===IMAGE===`)
- **실행 결과 표시** (입력, 출력, 배열)

### 3. 영상 생성 파이프라인 (3층 구조)
```
입력 글
  ↓
[1층: 콘텐츠 분석 및 장면 분할]
Root Node (GPT)
  → 입력: 사용자가 작성한 글
  → 출력: ["장면1 주제", "장면2 주제", "장면3 주제"]
  → 구분자: "---"
  ↓
[2층: 장면별 컨셉 기획 및 스크립트 작성]
Scene Planning Nodes (GPT - 병렬 처리)
  ├─ 장면1 기획
  │   → 입력: parent[0] (장면1 주제)
  │   → 출력: ["대사/자막 텍스트", "DALL-E 이미지 프롬프트"]
  │   → 구분자: "===IMAGE==="
  ├─ 장면2 기획
  │   → 입력: parent[1] (장면2 주제)
  │   → 출력: ["대사/자막 텍스트", "DALL-E 이미지 프롬프트"]
  └─ 장면3 기획
      → 입력: parent[2] (장면3 주제)
      → 출력: ["대사/자막 텍스트", "DALL-E 이미지 프롬프트"]
  ↓
[3층: 이미지 생성]
Image Generation Nodes (DALL-E 3 - 병렬 처리)
  ├─ 장면1 이미지 생성
  │   → 입력: parent[1] (장면1 이미지 프롬프트)
  │   → 출력: 이미지 URL/경로
  ├─ 장면2 이미지 생성
  │   → 입력: parent[1] (장면2 이미지 프롬프트)
  │   → 출력: 이미지 URL/경로
  └─ 장면3 이미지 생성
      → 입력: parent[1] (장면3 이미지 프롬프트)
      → 출력: 이미지 URL/경로
  ↓
[후처리: TTS 음성 생성]
  → 2층의 대사/자막[0]을 모아서 TTS 생성
  ↓
[영상 합성 - FFmpeg]
  ├─ 3층 이미지들을 시간순 배치
  ├─ TTS 오디오 오버레이
  ├─ 2층 자막 텍스트 오버레이
  └─ Shorts 포맷 (9:16 비율)
  ↓
최종 영상 출력 (MP4)
```

---

## 🏗️ 시스템 아키텍처

### 백엔드 (Node.js + Express)
```
tree-engine/
  ├─ TreeNode.js          # 노드 클래스 (프롬프트 생성, 출력 파싱)
  ├─ TreeExecutor.js      # 트리 실행 엔진 (순회, API 호출)
  └─ MediaGenerator.js    # 이미지/TTS 생성

video-engine/
  ├─ ImageGenerator.js    # DALL-E 이미지 생성
  ├─ TTSGenerator.js      # OpenAI TTS 음성 생성
  └─ VideoComposer.js     # FFmpeg 영상 합성

server/
  ├─ tree-server.js       # API Tree 실행 서버
  └─ video-server.js      # 영상 생성 서버
```

### 프론트엔드 (React)
```
components/
  ├─ TreeCanvas/          # React Flow 기반 노드 편집기
  │   ├─ NodeEditor.jsx   # 드래그 앤 드롭 캔버스
  │   ├─ NodePanel.jsx    # 노드 설정 패널
  │   └─ EdgeConnector.jsx
  │
  ├─ InputForm/           # 초기 입력 폼
  └─ VideoPlayer/         # 결과 영상 플레이어
```

---

## 🔧 기술 스택

### 백엔드
- **Runtime**: Node.js
- **Framework**: Express.js
- **OpenAI API**:
  - GPT-3.5/4 (텍스트 처리)
  - DALL-E 3 (이미지 생성)
  - TTS (음성 합성)
- **영상 처리**: FFmpeg

### 프론트엔드
- **Framework**: React
- **노드 편집기**: React Flow
- **상태 관리**: Context API / Redux
- **스타일링**: CSS Modules / Tailwind CSS

### 인프라
- **파일 저장**: 로컬 파일 시스템 (추후 S3/Cloud Storage)
- **환경 변수**: dotenv

---

## 📊 데이터 구조

### TreeNode
```javascript
{
  id: "node1",
  name: "장면 1 스크립트 생성",
  model: "gpt-4",
  systemMessage: "너는 영상 스크립트 작가야",
  promptTemplate: "다음 주제로 스크립트 작성: {parent[0]}",
  outputSeparator: "===IMAGE===",

  parentId: "root",
  parentArrayIndex: 0,

  input: "실제 입력된 프롬프트",
  output: "API 응답 원본",
  outputArray: ["분리된", "결과", "배열"],

  status: "completed", // pending, running, completed, failed
  error: null
}
```

### VideoConfig
```javascript
{
  scenes: [
    {
      id: "scene1",
      duration: 5, // 초
      script: "자막 텍스트",
      imagePrompt: "DALL-E 프롬프트",
      imagePath: "/generated/image1.png",
      audioPath: "/generated/audio1.mp3"
    }
  ],
  format: {
    width: 1080,
    height: 1920, // 9:16 비율
    fps: 30
  }
}
```

---

## 🚀 구현 단계

### Phase 1: API Tree 엔진 ✅ (완료)
- [x] TreeNode 클래스 구현
- [x] TreeExecutor 실행 엔진
- [x] 구분자 기반 배열 분리
- [x] 부모-자식 참조 시스템
- [x] 병렬/순차 실행 로직
- [x] REST API 서버 (`tree-server.js`)

### Phase 2: OpenAI API 통합 (진행 중)
- [ ] DALL-E 3 이미지 생성 API
- [ ] OpenAI TTS 음성 생성 API
- [ ] 생성된 파일 저장 관리
- [ ] 에러 핸들링 및 재시도 로직

### Phase 3: FFmpeg 영상 합성
- [ ] 이미지 시퀀스 → 비디오 변환
- [ ] 오디오 트랙 합성
- [ ] 자막 텍스트 오버레이
- [ ] Shorts 포맷 (9:16) 렌더링
- [ ] 트랜지션 효과 추가

### Phase 4: 프론트엔드 UI
- [ ] React 프로젝트 셋업
- [ ] React Flow 노드 편집기
- [ ] 노드 설정 패널 (시스템 메시지, 프롬프트 등)
- [ ] 초기 입력 폼
- [ ] 실행 진행 상황 표시
- [ ] 결과 영상 플레이어

### Phase 5: 통합 및 최적화
- [ ] 프론트엔드 ↔ 백엔드 API 연동
- [ ] WebSocket을 통한 실시간 진행 상황 업데이트
- [ ] 트리 모델 저장/불러오기 기능
- [ ] 에러 처리 및 사용자 피드백
- [ ] 성능 최적화 (캐싱, 병렬 처리)

---

## 🎬 예상 사용 시나리오

### 1. 사용자 입력
```
"인공지능이 창의성을 대체할 수 있을까?

많은 사람들이 AI가 예술과 창작 분야를 침범한다고 우려합니다.
하지만 실제로는 AI는 도구일 뿐, 진정한 창의성은 인간의 감정과 경험에서 나옵니다."
```

### 2. API Tree 처리 (3층 구조)
```
[1층 Root] 콘텐츠 분석 및 장면 분할 (GPT)
  → 입력: "인공지능이 창의성을 대체할 수 있을까?..."
  → 출력: ["AI는 도구다", "창의성은 인간 고유", "협력의 가능성"]
  ↓
[2층 Child 1-1] 장면 1 컨셉 기획 (GPT)
  → 입력: "AI는 도구다"
  → 출력: [
      "대사: AI는 단지 도구일 뿐입니다. 자막: AI는 도구",
      "A futuristic robot hand and human hand shaking hands, collaboration concept, digital art, vibrant colors, 9:16 aspect ratio"
    ]
  ↓
[3층 Child 2-1] 장면 1 이미지 생성 (DALL-E)
  → 입력: "A futuristic robot hand and human hand shaking..."
  → 출력: "/generated/scene1_image.png"

[2층 Child 1-2] 장면 2 컨셉 기획 (GPT)
  → 입력: "창의성은 인간 고유"
  → 출력: [
      "대사: 진정한 창의성은 인간만의 영역입니다. 자막: 인간의 창의성",
      "An artist painting on canvas with emotional expression, warm lighting, impressionist style, 9:16"
    ]
  ↓
[3층 Child 2-2] 장면 2 이미지 생성 (DALL-E)
  → 입력: "An artist painting on canvas..."
  → 출력: "/generated/scene2_image.png"
```

### 3. 멀티미디어 생성
- DALL-E: 각 장면의 이미지 생성
- TTS: 자막 텍스트를 음성으로 변환

### 4. FFmpeg 합성
```bash
ffmpeg -loop 1 -i scene1.png -i audio1.mp3 \
  -vf "drawtext=text='AI는 도구일 뿐':fontsize=48" \
  -t 5 -s 1080x1920 output.mp4
```

### 5. 최종 결과
- 9:16 비율의 Shorts 영상 (MP4)
- 총 길이: 15-60초
- 자막, 이미지, TTS 음성 포함

---

## 💡 향후 확장 가능성

### 기능 확장
- [ ] 다양한 영상 템플릿 제공
- [ ] BGM 자동 추가
- [ ] 트랜지션 효과 커스터마이징
- [ ] 다국어 TTS 지원
- [ ] 영상 스타일 프리셋 (비즈니스, 교육, 엔터테인먼트)

### 성능 개선
- [ ] GPU 가속 (CUDA 지원 FFmpeg)
- [ ] 분산 처리 (작업 큐 시스템)
- [ ] 결과 캐싱

### 플랫폼 확장
- [ ] YouTube Shorts 자동 업로드
- [ ] Instagram Reels 연동
- [ ] TikTok API 통합
- [ ] 팀 협업 기능
- [ ] 템플릿 마켓플레이스

---

## 📝 API 엔드포인트 (예정)

### Tree API
```
POST   /api/tree/execute       # 트리 실행
GET    /api/tree/result/:id    # 실행 결과 조회
POST   /api/tree/save          # 트리 모델 저장
GET    /api/tree/load/:id      # 트리 모델 불러오기
```

### Video API
```
POST   /api/video/generate     # 영상 생성 시작
GET    /api/video/status/:id   # 생성 진행 상황
GET    /api/video/download/:id # 완성된 영상 다운로드
```

### Media API
```
POST   /api/image/generate     # DALL-E 이미지 생성
POST   /api/tts/generate       # TTS 음성 생성
```

---

## 🔒 보안 고려사항

- OpenAI API 키는 서버 환경변수에만 저장
- 클라이언트에서 API 키 직접 사용 금지
- 파일 업로드 크기 제한
- Rate limiting 구현
- 생성된 파일 자동 정리 (임시 파일 관리)

---

## 📦 의존성

### Backend
```json
{
  "express": "^5.1.0",
  "dotenv": "^16.4.7",
  "openai": "^4.x.x",
  "fluent-ffmpeg": "^2.x.x"
}
```

### Frontend
```json
{
  "react": "^18.x.x",
  "react-flow-renderer": "^10.x.x",
  "axios": "^1.x.x"
}
```

---

## 📚 참고 문서

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [React Flow Documentation](https://reactflow.dev/)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [YouTube Shorts Best Practices](https://support.google.com/youtube/answer/10059070)

---

**프로젝트 시작일**: 2025-10-07
**현재 진행 상황**: Phase 1 완료, Phase 2 진행 중
**예상 완료일**: TBD
