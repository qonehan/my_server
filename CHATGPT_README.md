# ChatGPT 채팅 웹사이트

OpenAI의 ChatGPT API를 활용한 실시간 채팅 웹 애플리케이션입니다.

## 기능

- 💬 ChatGPT API를 통한 AI와의 대화
- 🎨 깔끔한 채팅 UI (사용자/AI 메시지 구분)
- ⚡ 실시간 응답
- 📱 반응형 디자인

## 파일 구조

```
my_server/
├── chatgpt-server.js          # Express 서버 + OpenAI API 통합
├── chatgpt-public/             # 프론트엔드 파일
│   ├── index.html              # 메인 HTML
│   ├── app.js                  # 클라이언트 로직
│   └── style.css               # 스타일시트
├── .env.example                # 환경변수 샘플
└── package.json                # 프로젝트 설정
```

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. OpenAI API 키 설정

`.env.example` 파일을 복사하여 `.env` 파일을 생성합니다:

```bash
cp .env.example .env
```

`.env` 파일을 열어 OpenAI API 키를 입력합니다:

```
OPENAI_API_KEY=sk-proj-your-actual-api-key-here
PORT=3000
```

> 💡 **API 키 발급 방법:**
> 1. https://platform.openai.com 에 접속
> 2. 로그인 후 API Keys 메뉴로 이동
> 3. "Create new secret key" 버튼 클릭
> 4. 생성된 키를 복사하여 `.env` 파일에 붙여넣기

### 3. 서버 실행

**프로덕션 모드:**
```bash
npm run chatgpt
```

**개발 모드 (nodemon 사용):**
```bash
npm run chatgpt-dev
```

### 4. 웹사이트 접속

브라우저에서 `http://localhost:3000` 으로 접속합니다.

## 사용 방법

1. 웹사이트에 접속하면 ChatGPT의 환영 메시지가 표시됩니다
2. 하단 입력창에 질문을 입력합니다
3. **전송** 버튼을 클릭하거나 **Enter** 키를 누릅니다
   - `Shift + Enter`는 줄바꿈
   - `Enter`는 메시지 전송
4. ChatGPT의 응답이 채팅창에 표시됩니다

## 기술 스택

### Backend
- **Node.js** - 런타임 환경
- **Express 5** - 웹 프레임워크
- **dotenv** - 환경변수 관리
- **OpenAI API** - ChatGPT 3.5 Turbo

### Frontend
- **Vanilla JavaScript** - 클라이언트 로직
- **Fetch API** - 서버 통신
- **CSS3** - 스타일링 (그라디언트, 애니메이션)

## API 엔드포인트

### POST `/api/chat`

ChatGPT에게 메시지를 전송하고 응답을 받습니다.

**요청 본문:**
```json
{
  "message": "안녕하세요?"
}
```

**응답:**
```json
{
  "reply": "안녕하세요! 무엇을 도와드릴까요?"
}
```

**에러 응답:**
```json
{
  "error": "에러 메시지",
  "details": {}
}
```

## 커스터마이징

### 모델 변경

`chatgpt-server.js` 파일의 25번째 줄에서 모델을 변경할 수 있습니다:

```javascript
model: 'gpt-3.5-turbo',  // 또는 'gpt-4', 'gpt-4-turbo' 등
```

### 응답 길이 조절

`max_tokens` 값을 수정하여 응답 길이를 조절합니다:

```javascript
max_tokens: 1000,  // 원하는 토큰 수로 변경
```

### 스타일 수정

`chatgpt-public/style.css` 파일을 수정하여 디자인을 커스터마이징할 수 있습니다.

## 주의사항

⚠️ **OpenAI API는 유료 서비스입니다**
- API 사용량에 따라 비용이 청구됩니다
- https://platform.openai.com/usage 에서 사용량을 확인하세요
- API 키는 절대 공개 저장소에 커밋하지 마세요 (`.env` 파일은 `.gitignore`에 추가)

⚠️ **보안**
- `.env` 파일은 절대 Git에 커밋하지 마세요
- API 키가 유출되면 즉시 재발급하세요
- 프로덕션 환경에서는 Rate Limiting을 추가하세요

## 문제 해결

### "API 키가 설정되어 있지 않습니다" 에러

→ `.env` 파일에 `OPENAI_API_KEY`가 올바르게 설정되어 있는지 확인하세요.

### "ChatGPT API 요청 실패" 에러

→ API 키가 유효한지, 잔액이 충분한지 확인하세요.

### 응답이 너무 느림

→ 모델을 `gpt-3.5-turbo`로 변경하거나 `max_tokens`를 줄여보세요.

## 라이선스

ISC