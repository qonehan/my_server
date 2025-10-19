# 시작하기

AI Shorts Generator를 설치하고 첫 영상을 생성하는 방법을 안내합니다.

---

## 필수 요구사항

### 시스템
- **Node.js** v16 이상
- **FFmpeg** (영상 합성용)
- 충분한 디스크 공간 (생성된 파일 저장용)

### API
- **OpenAI API Key** ([platform.openai.com](https://platform.openai.com))
  - GPT 모델 사용 권한
  - DALL-E 모델 사용 권한
  - TTS 모델 사용 권한

---

## 설치

### 1. 프로젝트 디렉토리 이동
```bash
cd /workspaces/my_server
```

### 2. 의존성 설치
```bash
npm install
```

### 3. FFmpeg 설치

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install ffmpeg
```

#### macOS
```bash
brew install ffmpeg
```

#### Windows
[ffmpeg.org](https://ffmpeg.org/download.html)에서 다운로드

#### 설치 확인
```bash
ffmpeg -version
```

---

## 서버 실행

### 기본 실행
```bash
node tree-server.js
```

또는

```bash
npm start
```

### 성공 메시지
```
🌳 API Tree 서버가 http://localhost:3001 에서 실행 중입니다.
📝 예제 트리: GET /api/tree/example
▶️  트리 실행: POST /api/tree/execute
📊 결과 조회: GET /api/tree/result/:executionId
📁 생성 파일: http://localhost:3001/generated/
🗑️  파일 정리: POST /api/files/cleanup
```

### 브라우저 접속
```
http://localhost:3001
```

---

## 첫 영상 생성하기

### 1단계: API 키 입력

좌측 사이드바의 **"OpenAI API Key"** 입력란에 API 키를 입력합니다.

```
sk-proj-...
```

💡 API 키는 브라우저에 자동으로 저장됩니다 (LocalStorage).

---

### 2단계: 콘텐츠 주제 입력

**"콘텐츠 주제"** 입력란에 생성하고 싶은 영상의 주제를 입력합니다.

**예시**:
```
AI가 바꾸는 미래 사회에 대해 설명해줘
```

```
양자 컴퓨터의 원리와 활용
```

```
기후 변화의 원인과 해결 방법
```

---

### 3단계: 테스트 모드 (권장)

처음 사용한다면 **테스트 모드**를 활성화하세요:

1. **"테스트 모드"** 토글 스위치를 ON으로 설정
2. 기본 2개 장면만 생성 (빠른 테스트용)
3. API 비용 약 80% 절감

💡 **비용 비교**:
- 테스트 모드 (2개 장면): 약 $0.20
- 일반 모드 (10개 장면): 약 $1.00

---

### 4단계: 영상 생성 시작

**"🚀 영상 생성 시작"** 버튼을 클릭합니다.

---

### 5단계: 진행 상황 확인

#### 좌측 패널
- **상태 표시**: 현재 진행 단계
- **진행률 바**: 전체 진행률 (0-100%)
- **장면 수**: 생성될 장면 개수

#### 우측 패널 (트리 시각화)

**노드 색상**:
- 🟦 회색: 대기 중 (pending)
- 🟨 노란색: 실행 중 (running)
- 🟩 초록색: 완료 (completed)
- 🟥 빨간색: 실패 (failed)

**노드 클릭**: 상세 정보 확인
- 입력/출력 내용
- 프롬프트 템플릿
- 이미지/오디오 미리보기

---

### 6단계: 결과 확인

영상 생성이 완료되면 모달창이 자동으로 열립니다:

- **영상 미리보기**: 생성된 영상을 바로 재생
- **📥 다운로드**: 영상 파일 다운로드
- **🔄 새 영상 만들기**: 페이지 새로고침

---

## 생성 시간

### 테스트 모드 (2개 장면)
- **예상 시간**: 약 2-3분
- **단계**:
  1. 대본 생성: ~30초
  2. 이미지 컨셉 생성: ~30초
  3. 이미지 생성 (DALL-E): ~1분
  4. TTS 생성: ~10초
  5. 영상 합성: ~10초

### 일반 모드 (8-12개 장면)
- **예상 시간**: 약 10-15분
- DALL-E 3 이미지 생성이 대부분의 시간을 차지

---

## 문제 해결

### Q: "API 키가 유효하지 않습니다" 오류

**A**: OpenAI API 키를 확인하세요:
1. API 키가 `sk-proj-` 또는 `sk-`로 시작하는지 확인
2. [OpenAI 플랫폼](https://platform.openai.com)에서 키 상태 확인
3. API 사용량 한도 및 크레딧 확인

### Q: 영상이 생성되지 않아요

**A**: 브라우저 콘솔을 확인하세요:
1. `F12` 키를 눌러 개발자 도구 열기
2. **Console** 탭에서 에러 메시지 확인
3. **Network** 탭에서 API 요청 상태 확인

### Q: 서버가 시작되지 않아요

**A**: 다음을 확인하세요:
1. Node.js 설치 확인: `node --version`
2. 포트 3001 사용 여부: `lsof -i :3001`
3. 의존성 설치 확인: `npm install`

### Q: FFmpeg 오류가 발생해요

**A**: FFmpeg 설치를 확인하세요:
```bash
ffmpeg -version
```

---

## 다음 단계

### 🎨 개발자 설정으로 커스터마이징

각 층의 모델, 프롬프트, 파라미터를 수정할 수 있습니다:

1. 좌측 하단의 **⚙️ 버튼** 클릭
2. 비밀번호 입력: `ai@shorts`
3. 원하는 설정 변경
4. **저장** 클릭

자세한 내용: [개발자 가이드](./04-developer-guide.md)

---

### 📝 더 알아보기

- [사용자 가이드](./03-user-guide.md) - 전체 기능 상세 설명
- [개발자 가이드](./04-developer-guide.md) - 커스터마이징 방법
- [API 레퍼런스](./05-api-reference.md) - API 엔드포인트 설명

---

**준비 완료!** 이제 첫 AI Shorts 영상을 만들어보세요! 🎬
