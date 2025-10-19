# API 레퍼런스

AI Shorts Generator의 모든 REST API 엔드포인트를 상세하게 설명합니다.

---

## 목차
- [기본 정보](#기본-정보)
- [트리 실행 API](#트리-실행-api)
- [영상 합성 API](#영상-합성-api)
- [파일 관리 API](#파일-관리-api)
- [설정 API](#설정-api)
- [유틸리티 API](#유틸리티-api)

---

## 기본 정보

### 서버 주소
- **개발**: `http://localhost:3001`
- **프로덕션**: 배포 서버 URL

### 응답 형식
모든 API는 JSON 형식으로 응답합니다.

### 에러 처리
에러 발생 시 다음 형식으로 응답:
```json
{
  "error": "에러 메시지",
  "details": "상세 에러 내용 (선택)"
}
```

---

## 트리 실행 API

### POST /api/tree/execute

트리 구조에 따라 AI 파이프라인을 실행합니다.

#### 요청

**헤더**:
```
Content-Type: application/json
```

**바디**:
```json
{
  "apiKey": "sk-proj-...",
  "initialInput": "AI가 바꾸는 미래 사회",
  "treeConfig": {
    "testMode": false,
    "testSceneCount": 2,
    "layer1": {
      "model": "gpt-4o",
      "systemMessage": "너는 교육 컨텐츠 전문 대본 작가야...",
      "promptTemplate": "아래 글을 읽고... {input}"
    },
    "layer2": {
      "model": "gpt-4o",
      "systemMessage": "너는 교육 영상 일러스트 기획 전문가야...",
      "promptTemplate": "다음 장면의 대본을 분석하고... {parent}"
    },
    "layer3": {
      "model": "dall-e-3",
      "imageSize": "1024x1792",
      "imageQuality": "standard",
      "imageStyle": "natural"
    }
  }
}
```

**필수 필드**:
- `apiKey` (string): OpenAI API 키
- `initialInput` (string): 사용자 입력 텍스트
- `treeConfig` (object): 트리 구조 설정

**선택 필드**:
- `treeConfig.testMode` (boolean): 테스트 모드 활성화 여부 (기본: false)
- `treeConfig.testSceneCount` (number): 테스트 모드 최대 장면 수 (기본: 2)

#### 응답

**성공 (200 OK)**:
```json
{
  "executionId": "exec_1234567890_abc123",
  "message": "트리 실행이 시작되었습니다.",
  "status": "running"
}
```

**에러 (400 Bad Request)**:
```json
{
  "error": "API 키가 필요합니다."
}
```

**에러 (500 Internal Server Error)**:
```json
{
  "error": "트리 실행 중 오류 발생",
  "details": "OpenAI API 호출 실패"
}
```

#### 예시

```javascript
const response = await fetch('http://localhost:3001/api/tree/execute', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    apiKey: 'sk-proj-...',
    initialInput: 'AI의 발전에 대해 설명해줘',
    treeConfig: {
      testMode: true,
      testSceneCount: 2,
      layer1: { /* ... */ },
      layer2: { /* ... */ },
      layer3: { /* ... */ }
    }
  })
});

const data = await response.json();
console.log('Execution ID:', data.executionId);
```

---

### GET /api/tree/result/:executionId

실행 중인 또는 완료된 트리의 결과를 조회합니다.

#### 요청

**경로 파라미터**:
- `executionId` (string): 트리 실행 ID

**예시**:
```
GET /api/tree/result/exec_1234567890_abc123
```

#### 응답

**실행 중 (200 OK)**:
```json
{
  "executionId": "exec_1234567890_abc123",
  "status": "running",
  "progress": 45,
  "currentStatus": "이미지 생성 중...",
  "sceneCount": 10,
  "results": {
    "nodes": [
      {
        "id": "root",
        "name": "[1층] Shorts 대본 생성",
        "type": "gpt",
        "status": "completed",
        "model": "gpt-4o",
        "input": "AI의 발전에 대해 설명해줘",
        "output": [
          "장면1 대본...",
          "장면2 대본...",
          "장면3 대본..."
        ]
      },
      {
        "id": "node_1_0",
        "name": "[2층] 장면1 자막&이미지",
        "type": "gpt",
        "status": "completed",
        "model": "gpt-4o",
        "input": "장면1 대본...",
        "output": [
          "AI 발전",
          "A modern robot illustration..."
        ]
      },
      {
        "id": "node_2_0_image",
        "name": "[3층] 장면1 이미지",
        "type": "dalle",
        "status": "running",
        "model": "dall-e-3",
        "input": "A modern robot illustration...",
        "output": null,
        "imageUrl": null
      }
    ]
  }
}
```

**완료 (200 OK)**:
```json
{
  "executionId": "exec_1234567890_abc123",
  "status": "completed",
  "progress": 100,
  "currentStatus": "완료",
  "sceneCount": 10,
  "results": {
    "nodes": [
      {
        "id": "node_2_0_image",
        "name": "[3층] 장면1 이미지",
        "type": "dalle",
        "status": "completed",
        "model": "dall-e-3",
        "input": "A modern robot illustration...",
        "output": "https://...",
        "imageUrl": "/generated/images/exec_..._scene1.png"
      },
      {
        "id": "node_2_0_tts",
        "name": "[3층] 장면1 음성 (TTS)",
        "type": "tts",
        "status": "completed",
        "model": "tts-1",
        "input": "AI 발전",
        "output": "audio_url",
        "audioUrl": "/generated/audio/exec_..._scene1.mp3"
      }
    ]
  }
}
```

**에러 (404 Not Found)**:
```json
{
  "error": "실행 ID를 찾을 수 없습니다."
}
```

#### 노드 상태

- `pending`: 대기 중
- `running`: 실행 중
- `completed`: 완료
- `failed`: 실패

#### 예시

```javascript
const executionId = 'exec_1234567890_abc123';
const response = await fetch(`http://localhost:3001/api/tree/result/${executionId}`);
const data = await response.json();

console.log('Status:', data.status);
console.log('Progress:', data.progress + '%');
console.log('Scene Count:', data.sceneCount);
```

---

### GET /api/tree/example

예제 트리 구조를 반환합니다.

#### 요청

```
GET /api/tree/example
```

#### 응답

```json
{
  "name": "Shorts 영상 생성",
  "type": "gpt",
  "model": "gpt-4o",
  "systemMessage": "너는 교육 컨텐츠 전문 대본 작가야...",
  "promptTemplate": "아래 글을 읽고... {input}",
  "children": [
    {
      "name": "장면{sceneNum} 자막&이미지",
      "type": "gpt",
      "model": "gpt-4o",
      "systemMessage": "너는 교육 영상 일러스트 기획 전문가야...",
      "promptTemplate": "다음 장면의 대본을 분석하고... {parent}",
      "isDynamic": true,
      "children": [
        {
          "name": "장면{sceneNum} 이미지",
          "type": "dalle",
          "model": "dall-e-3",
          "promptTemplate": "{parent}",
          "parentArrayIndex": 1,
          "imageSize": "1024x1792",
          "imageQuality": "standard",
          "imageStyle": "natural"
        },
        {
          "name": "장면{sceneNum} 음성 (TTS)",
          "type": "tts",
          "model": "tts-1",
          "voice": "alloy",
          "promptTemplate": "{parent}",
          "parentArrayIndex": 0
        }
      ]
    }
  ]
}
```

---

## 영상 합성 API

### POST /api/video/compose

이미지, 음성, 자막을 합성하여 최종 영상을 생성합니다.

#### 요청

**헤더**:
```
Content-Type: application/json
```

**바디**:
```json
{
  "executionId": "exec_1234567890_abc123",
  "scenes": [
    {
      "imagePath": "/workspaces/my_server/generated/images/exec_..._scene1.png",
      "audioPath": "/workspaces/my_server/generated/audio/exec_..._scene1.mp3",
      "subtitle": "AI 발전",
      "duration": 5
    },
    {
      "imagePath": "/workspaces/my_server/generated/images/exec_..._scene2.png",
      "audioPath": "/workspaces/my_server/generated/audio/exec_..._scene2.mp3",
      "subtitle": "인공지능 활용",
      "duration": 6
    }
  ]
}
```

**필수 필드**:
- `executionId` (string): 실행 ID
- `scenes` (array): 장면 배열
  - `imagePath` (string): 이미지 파일 절대 경로
  - `audioPath` (string): 오디오 파일 절대 경로
  - `subtitle` (string): 자막 텍스트
  - `duration` (number): 장면 길이 (초)

#### 응답

**성공 (200 OK)**:
```json
{
  "success": true,
  "videoPath": "/workspaces/my_server/generated/videos/exec_..._final.mp4",
  "videoUrl": "/generated/videos/exec_..._final.mp4",
  "duration": 35.5,
  "fileSize": "12.4 MB"
}
```

**에러 (400 Bad Request)**:
```json
{
  "error": "장면 데이터가 필요합니다."
}
```

**에러 (500 Internal Server Error)**:
```json
{
  "error": "영상 합성 실패",
  "details": "FFmpeg 처리 중 오류 발생"
}
```

#### 예시

```javascript
const response = await fetch('http://localhost:3001/api/video/compose', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    executionId: 'exec_1234567890_abc123',
    scenes: [
      {
        imagePath: '/path/to/scene1.png',
        audioPath: '/path/to/scene1.mp3',
        subtitle: 'AI 발전',
        duration: 5
      }
    ]
  })
});

const data = await response.json();
console.log('Video URL:', data.videoUrl);
```

---

## 파일 관리 API

### POST /api/files/cleanup

24시간 이상 경과한 파일을 삭제합니다.

#### 요청

```
POST /api/files/cleanup
```

#### 응답

**성공 (200 OK)**:
```json
{
  "success": true,
  "deletedFiles": 15,
  "freedSpace": "234.5 MB"
}
```

#### 예시

```javascript
const response = await fetch('http://localhost:3001/api/files/cleanup', {
  method: 'POST'
});

const data = await response.json();
console.log('Deleted files:', data.deletedFiles);
```

---

### DELETE /api/files/:executionId

특정 실행 ID의 모든 파일을 삭제합니다.

#### 요청

**경로 파라미터**:
- `executionId` (string): 실행 ID

**예시**:
```
DELETE /api/files/exec_1234567890_abc123
```

#### 응답

**성공 (200 OK)**:
```json
{
  "success": true,
  "message": "파일이 삭제되었습니다.",
  "deletedFiles": 12
}
```

**에러 (404 Not Found)**:
```json
{
  "error": "파일을 찾을 수 없습니다."
}
```

---

## 설정 API

### GET /api/settings

저장된 개발자 설정을 조회합니다.

#### 요청

```
GET /api/settings
```

#### 응답

**성공 (200 OK)**:
```json
{
  "testSceneCount": 2,
  "layer1": {
    "model": "gpt-4o",
    "systemMessage": "너는 교육 컨텐츠 전문 대본 작가야...",
    "promptTemplate": "아래 글을 읽고... {input}"
  },
  "layer2": {
    "model": "gpt-4o",
    "systemMessage": "너는 교육 영상 일러스트 기획 전문가야...",
    "promptTemplate": "다음 장면의 대본을 분석하고... {parent}"
  },
  "layer3": {
    "model": "dall-e-3",
    "imageSize": "1024x1792",
    "imageQuality": "standard",
    "imageStyle": "natural"
  }
}
```

**파일 없음 (200 OK)**:
```json
{}
```

---

### POST /api/settings

개발자 설정을 저장합니다.

#### 요청

**헤더**:
```
Content-Type: application/json
```

**바디**:
```json
{
  "testSceneCount": 3,
  "layer1": {
    "model": "gpt-3.5-turbo",
    "systemMessage": "수정된 시스템 메시지...",
    "promptTemplate": "수정된 프롬프트... {input}"
  },
  "layer2": {
    "model": "gpt-4o",
    "systemMessage": "...",
    "promptTemplate": "... {parent}"
  },
  "layer3": {
    "model": "dall-e-3",
    "imageSize": "1024x1024",
    "imageQuality": "hd",
    "imageStyle": "vivid"
  }
}
```

#### 응답

**성공 (200 OK)**:
```json
{
  "success": true,
  "message": "설정이 저장되었습니다."
}
```

**에러 (500 Internal Server Error)**:
```json
{
  "error": "설정 저장 실패",
  "details": "파일 쓰기 권한 없음"
}
```

#### 예시

```javascript
const settings = {
  testSceneCount: 3,
  layer1: { /* ... */ },
  layer2: { /* ... */ },
  layer3: { /* ... */ }
};

const response = await fetch('http://localhost:3001/api/settings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(settings)
});

const data = await response.json();
console.log(data.message);
```

---

## 유틸리티 API

### GET /api/models

OpenAI에서 사용 가능한 모델 목록을 조회합니다.

#### 요청

**쿼리 파라미터**:
- `apiKey` (string, 필수): OpenAI API 키

**예시**:
```
GET /api/models?apiKey=sk-proj-...
```

#### 응답

**성공 (200 OK)**:
```json
{
  "gpt": [
    { "id": "gpt-4o", "name": "GPT-4o" },
    { "id": "gpt-4o-mini", "name": "GPT-4o Mini" },
    { "id": "gpt-4-turbo", "name": "GPT-4 Turbo" },
    { "id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo" }
  ],
  "dalle": [
    { "id": "dall-e-3", "name": "DALL-E 3" },
    { "id": "dall-e-2", "name": "DALL-E 2" },
    { "id": "gpt-image-1", "name": "GPT Image 1" },
    { "id": "gpt-image-1-mini", "name": "GPT Image 1 Mini" }
  ],
  "tts": [
    { "id": "tts-1", "name": "TTS-1" },
    { "id": "tts-1-hd", "name": "TTS-1 HD" }
  ]
}
```

**에러 (400 Bad Request)**:
```json
{
  "error": "API 키가 필요합니다."
}
```

---

### GET /generated/*

생성된 파일(이미지, 오디오, 영상)을 제공합니다.

#### 요청

**예시**:
```
GET /generated/images/exec_1234567890_abc123_scene1.png
GET /generated/audio/exec_1234567890_abc123_scene1.mp3
GET /generated/videos/exec_1234567890_abc123_final.mp4
```

#### 응답

파일 바이너리 데이터

**에러 (404 Not Found)**:
```
파일을 찾을 수 없습니다.
```

---

## 에러 코드

### 400 Bad Request
- 필수 파라미터 누락
- 잘못된 요청 형식

### 404 Not Found
- 실행 ID 없음
- 파일 없음

### 500 Internal Server Error
- API 호출 실패
- 파일 시스템 오류
- FFmpeg 처리 오류

---

## 다음 단계

- [기술 상세](./06-technical-details.md) - 내부 구조 및 라이브러리
- [개발자 가이드](./04-developer-guide.md) - 커스터마이징 방법
