# 🎬 AI Shorts Generator

> 텍스트를 입력하면 자동으로 **Shorts 형태의 영상**을 생성하는 AI 기반 플랫폼

OpenAI API(GPT, DALL-E, TTS)를 **Tree 구조**로 연결하여, 하나의 텍스트 입력에서 자막과 음성이 포함된 완성된 영상을 자동으로 생성합니다.

---

## 📋 프로젝트 개요

### 핵심 기능
- **자동 장면 분할**: GPT가 입력 텍스트를 3-5개 장면으로 분석
- **자막 & 이미지 생성**: 각 장면별 자막과 DALL-E 이미지 자동 생성
- **음성 합성**: OpenAI TTS로 자연스러운 음성 생성
- **영상 합성**: FFmpeg로 이미지 + 음성 + 자막을 9:16 Shorts 영상으로 합성
- **실시간 UI**: 웹 브라우저에서 진행 상황을 실시간으로 확인

### 작동 원리
```
사용자 입력 텍스트
        ↓
[1층] GPT - 콘텐츠 분석 및 장면 분할
  출력: ["장면1 대본", "장면2 대본", "장면3 대본"]
        ↓
[2층] GPT - 각 장면별 자막 & 이미지 컨셉 기획 (병렬 처리)
  출력: ["자막 텍스트", "DALL-E 프롬프트"]
        ↓
[3층] DALL-E 3 - 각 장면 이미지 생성 (9:16, 병렬 처리)
  출력: 이미지 파일 (1024x1792)
        ↓
[4층] TTS - 각 장면 음성 생성 (병렬 처리)
  출력: MP3 오디오 파일
        ↓
[영상 합성] FFmpeg - 이미지 + 오디오 + 자막
        ↓
최종 Shorts 영상 (1080x1920, 9:16, MP4)
```

---

## 🚀 시작하기

### 사전 요구사항
- **Node.js** v16 이상
- **FFmpeg** (영상 합성용)
- **OpenAI API Key** ([platform.openai.com](https://platform.openai.com))

### 설치 및 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정 (선택사항)
cp .env.example .env
# .env 파일에서 OPENAI_API_KEY 설정 (또는 UI에서 입력)

# 3. 서버 실행
npm start

# 4. 브라우저에서 접속
# http://localhost:3001
```

### FFmpeg 설치

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
[ffmpeg.org](https://ffmpeg.org/download.html)에서 다운로드

---

## 📁 프로젝트 구조

```
my_server/
├── tree-server.js              # Express.js API 서버 (포트 3001)
│
├── tree-engine/                # API Tree 실행 엔진
│   ├── TreeNode.js            # GPT 노드 클래스
│   ├── TreeExecutor.js        # 트리 순회 및 실행 엔진
│   ├── DalleNode.js           # DALL-E 이미지 생성 노드
│   └── TTSNode.js             # OpenAI TTS 음성 생성 노드
│
├── video-engine/              # 영상 합성
│   └── VideoComposer.js       # FFmpeg 기반 영상 합성
│
├── utils/                     # 유틸리티
│   └── FileManager.js         # 파일 저장 및 자동 정리
│
├── public/                    # 프론트엔드
│   ├── index.html            # 메인 UI
│   ├── style.css             # 스타일시트
│   └── app.js                # 프론트엔드 로직 (트리 시각화, API 호출)
│
├── generated/                 # 생성된 파일 (자동 생성)
│   ├── images/               # DALL-E 이미지
│   ├── audio/                # TTS 오디오
│   └── videos/               # 최종 영상
│
├── package.json              # 의존성 및 스크립트
├── .env.example             # 환경변수 템플릿
└── README.md                # 프로젝트 소개
```

---

## 🌐 API 엔드포인트

### 트리 실행
```http
POST /api/tree/execute
Content-Type: application/json

{
  "apiKey": "sk-...",
  "initialInput": "입력 텍스트...",
  "treeConfig": { /* 트리 구조 설정 */ }
}

응답:
{
  "executionId": "exec_1234567890_abc123",
  "message": "트리 실행이 시작되었습니다.",
  "status": "running"
}
```

### 실행 결과 조회
```http
GET /api/tree/result/:executionId

응답:
{
  "executionId": "exec_...",
  "status": "completed",
  "results": {
    "nodes": [ /* 각 노드의 입력/출력/이미지/오디오 */ ]
  }
}
```

### 영상 합성
```http
POST /api/video/compose
Content-Type: application/json

{
  "executionId": "exec_...",
  "scenes": [
    {
      "imagePath": "/path/to/image.png",
      "audioPath": "/path/to/audio.mp3",
      "subtitle": "자막 텍스트",
      "duration": 5
    }
  ]
}

응답:
{
  "success": true,
  "videoPath": "/root/.../final.mp4",
  "videoUrl": "/generated/videos/exec_..._final.mp4"
}
```

### 기타 API
- `GET /api/tree/example` - 예제 트리 구조
- `GET /api/models?apiKey=...` - 사용 가능한 OpenAI 모델 목록
- `POST /api/files/cleanup` - 오래된 파일 정리
- `DELETE /api/files/:executionId` - 특정 실행 파일 삭제

---

## 💡 사용 방법

### 1. 웹 UI 사용

1. **브라우저에서 접속**: `http://localhost:3001`
2. **API 키 입력**: OpenAI API 키 입력 (로컬 저장됨)
3. **콘텐츠 입력**: 영상으로 만들고 싶은 텍스트 입력
4. **생성 시작**: "영상 생성 시작" 버튼 클릭
5. **진행 상황 확인**:
   - 프로그레스 바로 전체 진행률 확인
   - 트리 시각화로 각 노드 상태 확인
   - 노드 클릭 시 상세 정보 확인 (입력/출력/이미지/오디오)
6. **결과 확인**: 완성된 영상 재생 및 다운로드

### 2. 프롬프트 커스터마이징

트리 시각화에서 **노드를 클릭**하면:
- **Developer Message** (시스템 프롬프트) 편집 가능
- **User Prompt Template** 편집 가능
  - `{parent}` - 부모 노드의 출력
  - `{parent[N]}` - 부모의 N번째 출력
  - `{sceneNum}` - 현재 장면 번호 (1, 2, 3...)
  - `{root}` - 최초 사용자 입력
- **모델 선택** - GPT 모델 변경 가능
- 변경 사항은 **같은 층의 모든 노드**에 적용됨

---

## 🎨 API Tree 시스템 소개

### 핵심 개념

**API Tree**는 여러 API 호출을 **트리 구조**로 연결하여 복잡한 작업을 자동화하는 시스템입니다.

#### 1. 노드 (Node)
- 각 노드는 하나의 API 호출을 담당
- GPT, DALL-E, TTS 등 다양한 API 타입 지원

#### 2. 부모-자식 참조
- 자식 노드는 부모 노드의 **출력 배열**을 참조하여 입력 생성
- 예: 부모가 `["장면1", "장면2", "장면3"]` 출력 시,
  - 자식1은 `"장면1"` (인덱스 0)
  - 자식2는 `"장면2"` (인덱스 1)
  - 자식3은 `"장면3"` (인덱스 2)을 각각 참조

#### 3. 병렬/순차 실행
- **같은 층 노드**: 병렬 처리 (Promise.all)
- **부모-자식 노드**: 순차 처리 (부모 완료 후 자식 실행)
- 성능 최적화: 3개 장면 순차 실행(90초) → 병렬 실행(30초)

#### 4. 동적 노드 생성
- 루트 노드 실행 후, 출력 배열 길이만큼 자동으로 자식 노드 생성
- 3개 장면 → 9개 노드 (각 장면마다 자막, 이미지, 음성)

---

## 🔧 기술 스택

### Backend
- **Node.js** + **Express.js** - REST API 서버
- **OpenAI API**
  - GPT-3.5/4 - 텍스트 처리 및 기획
  - DALL-E 3 - 이미지 생성
  - TTS-1 - 음성 합성
- **FFmpeg** + **fluent-ffmpeg** - 영상 합성
- **axios** - HTTP 클라이언트
- **dotenv** - 환경변수 관리

### Frontend
- **Vanilla JavaScript** - 프론트엔드 로직
- **SVG** - 트리 시각화
- **CSS Grid/Flexbox** - 반응형 레이아웃
- **Fetch API** - REST API 호출
- **Polling** - 실시간 진행 상황 업데이트 (1초 간격)

### File System
- **generated/** - 이미지/오디오/영상 저장
- **FileManager** - 24시간 후 자동 파일 정리

---

## 📊 프로젝트 현황

### ✅ 완료된 기능 (100%)

#### Phase 1: API Tree 엔진 ✅
- TreeNode, TreeExecutor 구현
- DALL-E, TTS 전용 노드 클래스
- 부모-자식 참조 시스템
- 병렬/순차 실행 로직
- 동적 노드 생성

#### Phase 2: OpenAI API 통합 ✅
- GPT-3.5/4 통합
- DALL-E 3 이미지 생성 및 로컬 저장
- OpenAI TTS 음성 생성
- 에러 핸들링

#### Phase 3: FFmpeg 영상 합성 ✅
- 이미지 시퀀스 → 비디오 변환
- 오디오 트랙 합성
- 자막 텍스트 오버레이 (한글 지원)
- Shorts 포맷 (1080x1920, 9:16)
- 장면 전환 효과 (fade)

#### Phase 4: 프론트엔드 UI ✅
- HTML/CSS/JavaScript 구현
- API 키 입력 (로컬 저장)
- 트리 시각화 (SVG 기반)
- 노드 상세 정보 팝업
- 프롬프트 및 모델 설정
- 실시간 진행 상황 표시
- 결과 영상 플레이어

### 🎯 실제 사용 통계
- **입력 텍스트**: 200-1000자
- **장면 수**: 3-5개 (동적 생성)
- **영상 길이**: 15-60초
- **영상 포맷**: 1080x1920 (9:16 Shorts)
- **실행 시간**: 약 30-60초
- **이미지 해상도**: 1024x1792 (DALL-E 3)
- **음성 품질**: TTS-1 (alloy voice)

---

## 🐛 알려진 이슈 및 제한사항

### 제한사항
1. **DALL-E 비용**: 이미지 1장당 $0.04-0.08 (DALL-E 3)
2. **TTS 비용**: 1,000자당 $0.015 (TTS-1)
3. **영상 길이**: 최대 60초 권장 (파일 크기 제한)
4. **동시 실행**: 서버 메모리에 따라 제한

### 알려진 이슈
- ⚠️ 한글 자막이 깨질 수 있음 (FFmpeg 폰트 설정 필요)
- ⚠️ DALL-E 이미지 URL은 1시간 후 만료 (로컬 저장으로 해결)

---

## 🔮 향후 개선 계획

### 단기 (1-2주)
- [ ] **WebSocket 통합** - 폴링 대신 실시간 업데이트
- [ ] **에러 재시도 로직** - API 호출 실패 시 자동 재시도
- [ ] **프리셋 템플릿** - 다양한 Shorts 유형 제공
  - 교육용 (설명형)
  - 마케팅 (홍보형)
  - 스토리텔링 (이야기형)

### 중기 (1-2개월)
- [ ] **React 리팩토링** - 더 나은 UI/UX
- [ ] **React Flow 통합** - 드래그 앤 드롭으로 트리 편집
- [ ] **배경음악(BGM) 추가**
- [ ] **다양한 트랜지션 효과** (slide, wipe, zoom)
- [ ] **영상 품질 선택** (표준/고화질)

### 장기 (3-6개월)
- [ ] **사용자 계정 시스템** - 회원가입/로그인
- [ ] **프로젝트 관리** - 트리 저장/불러오기 (DB 연동)
- [ ] **YouTube Shorts 자동 업로드**
- [ ] **템플릿 마켓플레이스**
- [ ] **GPU 가속** (CUDA 지원 FFmpeg)
- [ ] **분산 처리** (작업 큐 시스템)

---

## 🤝 기여하기

이 프로젝트는 현재 개인 프로젝트이지만, 기여를 환영합니다!

### 개발 환경 설정
```bash
# 레포지토리 클론
git clone https://github.com/qonehan/my_server.git
cd my_server

# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env

# 개발 모드 실행 (nodemon)
npm run dev
```

### 브랜치 구조
- `main` - AI Shorts Generator (현재 프로젝트)
- `legacy-app1` - Socket.io 채팅 앱 (이전 프로젝트)

---

## 📝 라이선스

ISC License

---

## 👤 작성자

**qonehan**
- GitHub: [@qonehan](https://github.com/qonehan)
- Email: kyuwonhan04@gmail.com

---

## 🙏 감사의 말

이 프로젝트는 다음 기술들을 사용하여 만들어졌습니다:
- [OpenAI API](https://platform.openai.com)
- [FFmpeg](https://ffmpeg.org)
- [Express.js](https://expressjs.com)
- [Node.js](https://nodejs.org)

---

**프로젝트 시작일**: 2025-10-07
**마지막 업데이트**: 2025-10-09
**프로젝트 상태**: ✅ Production Ready (기본 기능 완성)
