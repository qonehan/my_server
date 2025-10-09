# 📚 AI Shorts Generator - 라이브러리 사용 가이드

> 이 프로젝트에서 사용된 주요 라이브러리와 코드 문법 정리

---

## 📦 사용된 라이브러리 목록

### 프로덕션 의존성 (Dependencies)

```json
{
  "express": "^5.1.0",        // 웹 서버 프레임워크
  "dotenv": "^16.4.7",        // 환경변수 관리
  "openai": "^4.77.0",        // OpenAI API (사용하지 않음, fetch 사용)
  "fluent-ffmpeg": "^2.1.3",  // FFmpeg 래퍼
  "axios": "^1.7.9"           // HTTP 클라이언트 (사용하지 않음)
}
```

### Node.js 내장 모듈

```javascript
const fs = require('fs');      // 파일 시스템
const path = require('path');  // 경로 처리
const http = require('http');  // HTTP 서버 (사용하지 않음)
```

---

## 1️⃣ Express.js - 웹 서버 프레임워크

### 📘 공식 문서
- https://expressjs.com/

### 기본 사용법

#### 서버 생성 및 시작
```javascript
const express = require('express');
const app = express();
const PORT = 3001;

// 미들웨어 설정
app.use(express.json());                      // JSON 파싱
app.use(express.static('public'));            // 정적 파일 서빙
app.use('/path', express.static('folder'));   // 특정 경로 매핑

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버 실행: http://localhost:${PORT}`);
});
```

#### REST API 라우팅
```javascript
// GET 요청
app.get('/api/example', (req, res) => {
  res.json({ message: 'Hello World' });
});

// POST 요청
app.post('/api/data', (req, res) => {
  const data = req.body;  // JSON 바디 파싱 (express.json() 필요)
  res.json({ success: true, data });
});

// URL 파라미터
app.get('/api/user/:id', (req, res) => {
  const userId = req.params.id;
  res.json({ userId });
});

// 쿼리 스트링
app.get('/api/search', (req, res) => {
  const query = req.query.q;  // /api/search?q=hello
  res.json({ query });
});
```

#### 에러 핸들링
```javascript
app.post('/api/data', async (req, res) => {
  try {
    // 비즈니스 로직
    const result = await someAsyncFunction();
    res.json({ success: true, result });
  } catch (error) {
    console.error('에러:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 프로젝트 사용 예시

**파일:** `tree-server.js`

```javascript
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어 설정
app.use(express.json());
app.use(express.static('public'));
app.use('/generated', express.static(path.join(__dirname, 'generated')));

// API 라우트
app.post('/api/tree/execute', async (req, res) => {
  try {
    const { treeConfig, initialInput, apiKey } = req.body;

    // 트리 실행 로직
    const executionId = `exec_${Date.now()}`;
    const executor = new TreeExecutor(apiKey);
    executor.loadTree(treeConfig);

    executor.execute(initialInput).then(() => {
      console.log('✅ 실행 완료');
    });

    res.json({
      executionId,
      message: '트리 실행이 시작되었습니다.',
      status: 'running'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tree/result/:executionId', (req, res) => {
  const { executionId } = req.params;
  const executor = executors.get(executionId);

  if (!executor) {
    return res.status(404).json({ error: '실행 ID를 찾을 수 없습니다.' });
  }

  res.json(executor.getResults());
});

app.listen(PORT, () => {
  console.log(`🌳 서버 실행 중: http://localhost:${PORT}`);
});
```

---

## 2️⃣ dotenv - 환경변수 관리

### 📘 공식 문서
- https://github.com/motdotla/dotenv

### 기본 사용법

#### 설정
```javascript
// 파일 최상단에서 실행
require('dotenv').config();

// 또는 특정 경로 지정
require('dotenv').config({ path: '/custom/path/.env' });
```

#### 환경변수 접근
```javascript
const apiKey = process.env.OPENAI_API_KEY;
const port = process.env.PORT || 3001;  // 기본값 설정
const dbUrl = process.env.DATABASE_URL;
```

#### .env 파일 형식
```bash
# .env 파일
OPENAI_API_KEY=sk-proj-xxxxx
PORT=3001
NODE_ENV=development

# 주석 가능
# 공백 허용 안 됨
DATABASE_URL=mongodb://localhost:27017/mydb
```

### 프로젝트 사용 예시

**파일:** `tree-server.js`

```javascript
// 맨 위에서 환경변수 로드
require('dotenv').config();

const PORT = process.env.PORT || 3001;

// OpenAI API 키는 클라이언트에서 전달받음
// (서버에 저장하지 않는 보안 방식)
```

---

## 3️⃣ OpenAI API - AI 서비스

### 📘 공식 문서
- https://platform.openai.com/docs

### 사용 방식
**주의:** 이 프로젝트는 `openai` npm 패키지를 사용하지 않고, **Native Fetch API**를 직접 사용합니다.

#### GPT API 호출
```javascript
// GPT-3.5/4 채팅 완성
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: 'gpt-3.5-turbo',  // 또는 'gpt-4'
    messages: [
      { role: 'system', content: '너는 친절한 AI 비서야.' },
      { role: 'user', content: '안녕하세요!' }
    ],
    temperature: 0.7,
    max_tokens: 2000
  })
});

if (!response.ok) {
  const error = await response.json();
  throw new Error(`API 오류: ${error.error?.message}`);
}

const data = await response.json();
const answer = data.choices[0].message.content;
```

#### DALL-E 3 이미지 생성
```javascript
const response = await fetch('https://api.openai.com/v1/images/generations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: 'dall-e-3',
    prompt: 'A futuristic cityscape with flying cars, 9:16 portrait',
    n: 1,
    size: '1024x1792',      // 9:16 비율 (Shorts)
    quality: 'standard',    // 또는 'hd'
    style: 'vivid'          // 또는 'natural'
  })
});

const data = await response.json();
const imageUrl = data.data[0].url;
const revisedPrompt = data.data[0].revised_prompt;
```

#### OpenAI TTS (Text-to-Speech)
```javascript
const response = await fetch('https://api.openai.com/v1/audio/speech', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: 'tts-1',         // 또는 'tts-1-hd'
    input: '안녕하세요, AI 음성입니다.',
    voice: 'alloy',         // alloy, echo, fable, onyx, nova, shimmer
    speed: 1.0,             // 0.25 ~ 4.0
    response_format: 'mp3'  // mp3, opus, aac, flac
  })
});

// 오디오 데이터는 바이너리 형태
const audioBuffer = Buffer.from(await response.arrayBuffer());
fs.writeFileSync('output.mp3', audioBuffer);
```

### 프로젝트 사용 예시

**파일:** `tree-engine/TreeExecutor.js`

```javascript
// GPT API 호출
async callOpenAI(node) {
  const messages = [];

  if (node.systemMessage) {
    messages.push({
      role: 'system',
      content: node.systemMessage
    });
  }

  messages.push({
    role: 'user',
    content: node.input
  });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    },
    body: JSON.stringify({
      model: node.model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

// DALL-E API 호출
async callDallE(node) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: node.input,
      n: 1,
      size: node.imageSize,
      quality: node.imageQuality,
      style: node.imageStyle
    })
  });

  const data = await response.json();
  node.imageUrl = data.data[0].url;

  // 이미지 다운로드 및 로컬 저장
  const filename = `${this.executionId}_${node.id}.png`;
  node.imagePath = await this.fileManager.downloadImage(node.imageUrl, filename);

  return node.imageUrl;
}

// TTS API 호출
async callTTS(node) {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: node.input,
      voice: node.voice,
      speed: node.speed,
      response_format: 'mp3'
    })
  });

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  const filename = `${this.executionId}_${node.id}.mp3`;
  node.audioPath = await this.fileManager.saveAudio(audioBuffer, filename);

  return node.audioPath;
}
```

---

## 4️⃣ fluent-ffmpeg - FFmpeg 래퍼

### 📘 공식 문서
- https://github.com/fluent-ffmpeg/node-fluent-ffmpeg

### 기본 사용법

#### 비디오 변환
```javascript
const ffmpeg = require('fluent-ffmpeg');

ffmpeg('input.mp4')
  .size('1920x1080')
  .fps(30)
  .videoCodec('libx264')
  .audioCodec('aac')
  .output('output.mp4')
  .on('start', (commandLine) => {
    console.log('FFmpeg 명령:', commandLine);
  })
  .on('progress', (progress) => {
    console.log(`진행률: ${progress.percent}%`);
  })
  .on('end', () => {
    console.log('✅ 변환 완료');
  })
  .on('error', (err) => {
    console.error('❌ 에러:', err.message);
  })
  .run();
```

#### 이미지 → 비디오
```javascript
ffmpeg('image.png')
  .loop(5)                    // 5초 동안 재생
  .videoCodec('libx264')
  .size('1080x1920')          // 9:16 비율 (Shorts)
  .fps(30)
  .duration(5)
  .output('video.mp4')
  .run();
```

#### 오디오 추가
```javascript
ffmpeg()
  .input('image.png')
  .loop(5)
  .input('audio.mp3')         // 오디오 추가
  .videoCodec('libx264')
  .audioCodec('aac')
  .size('1080x1920')
  .duration(5)
  .output('output.mp4')
  .run();
```

#### 자막 추가 (drawtext 필터)
```javascript
ffmpeg('video.mp4')
  .videoFilters([
    {
      filter: 'drawtext',
      options: {
        text: '자막 텍스트',
        fontsize: 48,
        fontcolor: 'white',
        x: '(w-text_w)/2',    // 가운데 정렬
        y: 'h-200',           // 하단에서 200px
        borderw: 3,           // 테두리 두께
        bordercolor: 'black'
      }
    }
  ])
  .output('output.mp4')
  .run();
```

#### 비디오 연결 (concat)
```javascript
// concat.txt 파일 생성
// file 'scene1.mp4'
// file 'scene2.mp4'
// file 'scene3.mp4'

ffmpeg()
  .input('concat.txt')
  .inputOptions(['-f concat', '-safe 0'])
  .videoCodec('copy')    // 재인코딩 없이 복사 (빠름)
  .audioCodec('copy')
  .output('final.mp4')
  .run();
```

### 프로젝트 사용 예시

**파일:** `video-engine/VideoComposer.js`

```javascript
const ffmpeg = require('fluent-ffmpeg');

class VideoComposer {
  // 개별 장면 생성 (이미지 + 오디오 + 자막)
  async createScene(scene, index, executionId) {
    return new Promise((resolve, reject) => {
      const tempPath = `scene${index}_temp.mp4`;

      let command = ffmpeg();

      // 이미지 입력
      if (scene.imagePath && fs.existsSync(scene.imagePath)) {
        command.input(scene.imagePath).loop(scene.duration || 5);
      } else {
        // 검은 화면 생성
        command.input('color=c=black:s=1080x1920:d=5').inputFormat('lavfi');
      }

      // 오디오 입력
      if (scene.audioPath && fs.existsSync(scene.audioPath)) {
        command.input(scene.audioPath);
      }

      // 영상 설정
      command
        .videoCodec('libx264')
        .size('1080x1920')      // 9:16 Shorts
        .fps(30)
        .duration(scene.duration || 5);

      // 자막 추가
      if (scene.subtitle) {
        const subtitle = scene.subtitle.replace(/'/g, "\\'");
        command.videoFilters([
          {
            filter: 'drawtext',
            options: {
              text: subtitle,
              fontsize: 48,
              fontcolor: 'white',
              x: '(w-text_w)/2',
              y: 'h-200',
              borderw: 3,
              bordercolor: 'black'
            }
          }
        ]);
      }

      // 출력 및 이벤트 핸들러
      command
        .output(tempPath)
        .on('start', (cmd) => console.log('FFmpeg 시작:', cmd))
        .on('progress', (prog) => {
          if (prog.percent) {
            console.log(`진행률: ${prog.percent.toFixed(1)}%`);
          }
        })
        .on('end', () => resolve(tempPath))
        .on('error', (err) => reject(err))
        .run();
    });
  }

  // 여러 장면 연결
  async concatenateScenes(scenePaths, outputPath) {
    return new Promise((resolve, reject) => {
      // concat.txt 파일 생성
      const concatFile = 'concat_temp.txt';
      const concatContent = scenePaths.map(p => `file '${p}'`).join('\n');
      fs.writeFileSync(concatFile, concatContent);

      ffmpeg()
        .input(concatFile)
        .inputOptions(['-f concat', '-safe 0'])
        .videoCodec('copy')    // 빠른 연결 (재인코딩 안 함)
        .audioCodec('copy')
        .output(outputPath)
        .on('end', () => {
          fs.unlinkSync(concatFile);  // 임시 파일 삭제
          resolve(outputPath);
        })
        .on('error', (err) => reject(err))
        .run();
    });
  }
}

module.exports = VideoComposer;
```

---

## 5️⃣ Node.js 내장 모듈

### fs (File System)

```javascript
const fs = require('fs');

// 동기 방식
const data = fs.readFileSync('file.txt', 'utf8');
fs.writeFileSync('output.txt', 'Hello World');

// 비동기 방식 (권장)
fs.readFile('file.txt', 'utf8', (err, data) => {
  if (err) throw err;
  console.log(data);
});

// Promise 방식
const fsPromises = require('fs').promises;
const data = await fsPromises.readFile('file.txt', 'utf8');

// 디렉토리 생성
if (!fs.existsSync('folder')) {
  fs.mkdirSync('folder', { recursive: true });
}

// 파일 삭제
if (fs.existsSync('file.txt')) {
  fs.unlinkSync('file.txt');
}

// 파일 목록
const files = fs.readdirSync('folder');

// 파일 정보
const stats = fs.statSync('file.txt');
console.log(stats.size);        // 파일 크기 (bytes)
console.log(stats.mtime);       // 수정 시간
console.log(stats.isFile());    // 파일인지 확인
```

### path (경로 처리)

```javascript
const path = require('path');

// 경로 결합
const fullPath = path.join(__dirname, 'folder', 'file.txt');
// /root/project/folder/file.txt

// 절대 경로 생성
const absPath = path.resolve('folder', 'file.txt');

// 파일명 추출
const filename = path.basename('/path/to/file.txt');  // file.txt

// 확장자 추출
const ext = path.extname('file.txt');  // .txt

// 디렉토리 추출
const dir = path.dirname('/path/to/file.txt');  // /path/to

// 경로 분리
const parsed = path.parse('/path/to/file.txt');
// {
//   root: '/',
//   dir: '/path/to',
//   base: 'file.txt',
//   ext: '.txt',
//   name: 'file'
// }

// __dirname: 현재 파일의 디렉토리 절대 경로
// __filename: 현재 파일의 절대 경로
console.log(__dirname);   // /root/my_server-1
console.log(__filename);  // /root/my_server-1/server.js
```

### 프로젝트 사용 예시

**파일:** `utils/FileManager.js`

```javascript
const fs = require('fs');
const path = require('path');

class FileManager {
  constructor() {
    this.baseDir = path.join(__dirname, '..', 'generated');
    this.imagesDir = path.join(this.baseDir, 'images');
    this.audioDir = path.join(this.baseDir, 'audio');
    this.videosDir = path.join(this.baseDir, 'videos');

    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.imagesDir, this.audioDir, this.videosDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 디렉토리 생성: ${dir}`);
      }
    });
  }

  generateFilename(executionId, nodeId, extension) {
    return `${executionId}_${nodeId}_${Date.now()}.${extension}`;
  }

  async saveAudio(buffer, filename) {
    const filePath = path.join(this.audioDir, filename);
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  async downloadImage(url, filename) {
    const filePath = path.join(this.imagesDir, filename);
    const response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  // 오래된 파일 정리 (24시간 이상)
  cleanupOldFiles(maxAgeHours = 24) {
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;
    let deletedCount = 0;

    [this.imagesDir, this.audioDir, this.videosDir].forEach(dir => {
      const files = fs.readdirSync(dir);

      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtime.getTime();

        if (age > maxAge) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      });
    });

    console.log(`🗑️  ${deletedCount}개 파일 정리 완료`);
    return deletedCount;
  }
}

module.exports = FileManager;
```

---

## 6️⃣ Fetch API - HTTP 요청

### 기본 사용법

Fetch는 Node.js v18+에서 **글로벌 API**로 제공됩니다.

#### GET 요청
```javascript
const response = await fetch('https://api.example.com/data');

if (!response.ok) {
  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}

const data = await response.json();  // JSON 파싱
console.log(data);
```

#### POST 요청
```javascript
const response = await fetch('https://api.example.com/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token123'
  },
  body: JSON.stringify({
    name: 'John',
    age: 30
  })
});

const result = await response.json();
```

#### 바이너리 데이터 다운로드
```javascript
const response = await fetch('https://example.com/image.png');
const buffer = Buffer.from(await response.arrayBuffer());
fs.writeFileSync('image.png', buffer);
```

---

## 💡 프로젝트 아키텍처 요약

### 라이브러리 사용 흐름

```
[클라이언트 (public/app.js)]
        ↓ Fetch API
[Express 서버 (tree-server.js)]
        ↓
[TreeExecutor (tree-engine/)]
        ↓ Fetch API
[OpenAI API (GPT, DALL-E, TTS)]
        ↓
[FileManager (utils/)] - fs, path
        ↓
[VideoComposer (video-engine/)] - fluent-ffmpeg
        ↓
[최종 영상 생성]
```

### 주요 기술 스택

1. **Express.js** - REST API 서버, 정적 파일 서빙
2. **Fetch API** - OpenAI API 호출, 이미지 다운로드
3. **fluent-ffmpeg** - 영상 합성 (이미지 + 오디오 + 자막)
4. **fs/path** - 파일 시스템 관리
5. **dotenv** - 환경변수 관리

---

## 🔗 참고 자료

### 공식 문서
- **Express.js**: https://expressjs.com/
- **dotenv**: https://github.com/motdotla/dotenv
- **OpenAI API**: https://platform.openai.com/docs
- **fluent-ffmpeg**: https://github.com/fluent-ffmpeg/node-fluent-ffmpeg
- **Node.js fs**: https://nodejs.org/api/fs.html
- **Node.js path**: https://nodejs.org/api/path.html
- **Fetch API**: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API

### FFmpeg 참고
- **FFmpeg 공식 문서**: https://ffmpeg.org/documentation.html
- **drawtext 필터**: https://ffmpeg.org/ffmpeg-filters.html#drawtext
- **concat 데먹서**: https://ffmpeg.org/ffmpeg-formats.html#concat

---

**작성일**: 2025-10-09
**프로젝트**: AI Shorts Generator v1.0.0
