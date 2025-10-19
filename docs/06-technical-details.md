# 기술 상세

AI Shorts Generator의 내부 구조, 라이브러리, 코드 아키텍처를 상세하게 설명합니다.

---

## 목차
- [프로젝트 구조](#프로젝트-구조)
- [사용 라이브러리](#사용-라이브러리)
- [트리 실행 엔진](#트리-실행-엔진)
- [영상 합성 엔진](#영상-합성-엔진)
- [파일 관리 시스템](#파일-관리-시스템)

---

## 프로젝트 구조

```
my_server/
├── tree-server.js              # Express.js API 서버
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
│   └── app.js                # 프론트엔드 로직
│
├── config/                    # 설정 파일
│   ├── dev-password.md       # 개발자 비밀번호
│   └── dev-settings.json     # 개발자 설정 (자동 생성)
│
├── docs/                      # 문서
│
├── generated/                 # 생성된 파일 (자동 생성)
│   ├── images/               # DALL-E 이미지
│   ├── audio/                # TTS 오디오
│   └── videos/               # 최종 영상
│
└── package.json              # 의존성 및 스크립트
```

---

## 사용 라이브러리

### 프로덕션 의존성

#### Express.js (v5.1.0)
- **용도**: REST API 서버 프레임워크
- **문서**: https://expressjs.com/
- **사용 기능**:
  - JSON 파싱 미들웨어
  - 정적 파일 서빙
  - REST API 라우팅
  - 에러 핸들링

**주요 코드**:
```javascript
const express = require('express');
const app = express();

app.use(express.json());                           // JSON 파싱
app.use(express.static('public'));                 // 정적 파일
app.use('/generated', express.static('generated')); // 생성 파일

app.post('/api/tree/execute', async (req, res) => {
  const { apiKey, initialInput, treeConfig } = req.body;
  // ...
});
```

---

#### fluent-ffmpeg (v2.1.3)
- **용도**: FFmpeg 래퍼 라이브러리
- **문서**: https://github.com/fluent-ffmpeg/node-fluent-ffmpeg
- **사용 기능**:
  - 이미지 시퀀스 → 비디오 변환
  - 오디오 트랙 합성
  - 텍스트 오버레이 (자막)
  - 필터 체인 (fade, scale)

**주요 코드** (video-engine/VideoComposer.js):
```javascript
const ffmpeg = require('fluent-ffmpeg');

ffmpeg()
  .input(imagePath)
  .loop(duration)
  .input(audioPath)
  .complexFilter([
    `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,
     pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fade=t=in:st=0:d=0.5`,
    `drawtext=text='${subtitle}':
     fontfile=/usr/share/fonts/truetype/noto/NotoSansKR-Bold.ttf:
     fontsize=48:fontcolor=white:x=(w-text_w)/2:y=h-150`
  ])
  .outputOptions(['-pix_fmt yuv420p', '-preset fast', '-crf 23'])
  .save(outputPath);
```

---

#### dotenv (v16.4.7)
- **용도**: 환경변수 관리
- **문서**: https://github.com/motdotla/dotenv
- **사용 기능**:
  - `.env` 파일에서 환경변수 로드
  - OpenAI API 키 관리 (선택사항)

**주요 코드**:
```javascript
require('dotenv').config();

const apiKey = process.env.OPENAI_API_KEY || 'ui에서 입력';
```

---

#### axios (v1.7.9)
- **용도**: HTTP 클라이언트 (현재 미사용)
- **문서**: https://axios-http.com/
- **비고**: OpenAI API 호출을 `fetch`로 대체하여 사용하지 않음

---

#### openai (v4.77.0)
- **용도**: OpenAI 공식 SDK (현재 미사용)
- **문서**: https://github.com/openai/openai-node
- **비고**: `fetch`로 직접 REST API 호출하여 사용하지 않음

---

### Node.js 내장 모듈

#### fs (File System)
- **용도**: 파일 읽기/쓰기
- **사용 예시**:
```javascript
const fs = require('fs').promises;

// 파일 읽기
const data = await fs.readFile('/path/to/file', 'utf8');

// 파일 쓰기
await fs.writeFile('/path/to/file', data, 'utf8');

// 디렉토리 생성
await fs.mkdir('/path/to/dir', { recursive: true });

// 파일 삭제
await fs.unlink('/path/to/file');

// 파일 정보
const stats = await fs.stat('/path/to/file');
console.log(stats.mtime); // 수정 시간
```

---

#### path
- **용도**: 파일 경로 처리
- **사용 예시**:
```javascript
const path = require('path');

// 경로 결합
const filePath = path.join(__dirname, 'generated', 'images', 'test.png');
// /workspaces/my_server/generated/images/test.png

// 파일명 추출
const filename = path.basename('/path/to/file.png');
// file.png

// 확장자 추출
const ext = path.extname('file.png');
// .png
```

---

## 트리 실행 엔진

### TreeNode.js

GPT 노드 클래스입니다.

#### 주요 기능
- OpenAI GPT API 호출
- 플레이스홀더 치환 (`{input}`, `{parent}`, `{sceneNum}`)
- 자식 노드 생성 및 관리
- 상태 관리 (pending, running, completed, failed)

#### 핵심 코드

```javascript
class TreeNode {
  constructor(config) {
    this.id = config.id || 'root';
    this.name = config.name;
    this.type = config.type || 'gpt';
    this.model = config.model || 'gpt-4o';
    this.systemMessage = config.systemMessage || '';
    this.promptTemplate = config.promptTemplate || '{input}';
    this.children = config.children || [];
    this.status = 'pending';
    this.input = null;
    this.output = null;
  }

  async execute(input, apiKey, parentOutput = null, sceneNum = null, rootInput = null) {
    this.status = 'running';
    this.input = input;

    try {
      // 플레이스홀더 치환
      const prompt = this.replacePlaceholders(
        this.promptTemplate,
        input,
        parentOutput,
        sceneNum,
        rootInput
      );

      // OpenAI API 호출
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: this.systemMessage },
            { role: 'user', content: prompt }
          ]
        })
      });

      const data = await response.json();
      const outputText = data.choices[0].message.content;

      // 출력 파싱 (---로 구분된 배열)
      this.output = outputText.split('---').map(s => s.trim()).filter(Boolean);
      this.status = 'completed';

      return this.output;
    } catch (error) {
      this.status = 'failed';
      throw error;
    }
  }

  replacePlaceholders(template, input, parentOutput, sceneNum, rootInput) {
    let result = template;

    // {input} 치환
    if (input) {
      result = result.replace(/{input}/g, input);
    }

    // {parent} 치환
    if (parentOutput !== null) {
      result = result.replace(/{parent}/g, parentOutput);
    }

    // {sceneNum} 치환
    if (sceneNum !== null) {
      result = result.replace(/{sceneNum}/g, sceneNum);
    }

    // {root} 치환
    if (rootInput) {
      result = result.replace(/{root}/g, rootInput);
    }

    return result;
  }
}
```

---

### TreeExecutor.js

트리 순회 및 실행 엔진입니다.

#### 주요 기능
- 트리 구조 로드 및 관리
- 층별 병렬 실행
- 동적 노드 생성
- 진행 상황 추적
- 테스트 모드 지원

#### 핵심 로직

```javascript
class TreeExecutor {
  constructor(apiKey, treeConfig) {
    this.apiKey = apiKey;
    this.treeConfig = treeConfig;
    this.rootNode = null;
    this.allNodes = new Map();
    this.executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async execute(initialInput) {
    // 1층: 루트 노드 실행
    const rootOutput = await this.rootNode.execute(initialInput, this.apiKey);
    const sceneCount = rootOutput.length;

    // 테스트 모드 처리
    const testSceneCount = this.treeConfig.testSceneCount || 2;
    const limitedSceneCount = this.treeConfig.testMode
      ? Math.min(sceneCount, testSceneCount)
      : sceneCount;

    // 2층: 동적 노드 생성 및 실행
    const layer2Promises = [];
    for (let i = 0; i < limitedSceneCount; i++) {
      const sceneInput = rootOutput[i];
      const sceneNum = i + 1;

      const layer2Node = this.createDynamicNode(this.treeConfig.layer2, sceneNum);
      const promise = layer2Node.execute(sceneInput, this.apiKey, sceneInput, sceneNum, initialInput);
      layer2Promises.push(promise);
    }

    // 병렬 실행
    const layer2Results = await Promise.all(layer2Promises);

    // 3층: 이미지 + TTS 노드 생성 및 실행
    const layer3Promises = [];
    for (let i = 0; i < limitedSceneCount; i++) {
      const sceneNum = i + 1;
      const layer2Output = layer2Results[i];

      // 이미지 노드
      const imageNode = new DalleNode({
        id: `node_2_${i}_image`,
        name: `[3층] 장면${sceneNum} 이미지`,
        model: this.treeConfig.layer3.model,
        imageSize: this.treeConfig.layer3.imageSize,
        imageQuality: this.treeConfig.layer3.imageQuality,
        imageStyle: this.treeConfig.layer3.imageStyle,
        parentArrayIndex: 1  // layer2Output[1] = 이미지 프롬프트
      });

      // TTS 노드
      const ttsNode = new TTSNode({
        id: `node_2_${i}_tts`,
        name: `[3층] 장면${sceneNum} 음성 (TTS)`,
        model: 'tts-1',
        voice: 'alloy',
        parentArrayIndex: 0  // layer2Output[0] = 자막 텍스트
      });

      layer3Promises.push(
        imageNode.execute(layer2Output[1], this.apiKey, this.executionId, sceneNum),
        ttsNode.execute(layer2Output[0], this.apiKey, this.executionId, sceneNum)
      );
    }

    await Promise.all(layer3Promises);

    return {
      executionId: this.executionId,
      status: 'completed',
      sceneCount: limitedSceneCount,
      results: this.getAllResults()
    };
  }
}
```

---

### DalleNode.js

DALL-E 이미지 생성 노드입니다.

#### 주요 기능
- OpenAI DALL-E API 호출
- 이미지 다운로드 및 로컬 저장
- 모델별 파라미터 지원

#### 핵심 코드

```javascript
class DalleNode {
  async execute(prompt, apiKey, executionId, sceneNum) {
    this.status = 'running';
    this.input = prompt;

    try {
      // DALL-E API 호출
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          size: this.imageSize,
          quality: this.imageQuality,
          style: this.imageStyle,
          n: 1
        })
      });

      const data = await response.json();
      const imageUrl = data.data[0].url;

      // 이미지 다운로드
      const imageResponse = await fetch(imageUrl);
      const arrayBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 로컬 저장
      const filename = `${executionId}_scene${sceneNum}.png`;
      const filepath = path.join(__dirname, '../generated/images', filename);
      await fs.writeFile(filepath, buffer);

      this.output = imageUrl;
      this.imageUrl = `/generated/images/${filename}`;
      this.status = 'completed';

      return this.output;
    } catch (error) {
      this.status = 'failed';
      throw error;
    }
  }
}
```

---

### TTSNode.js

OpenAI TTS 음성 생성 노드입니다.

#### 주요 기능
- OpenAI TTS API 호출
- MP3 파일 저장
- 음성 길이 계산

#### 핵심 코드

```javascript
class TTSNode {
  async execute(text, apiKey, executionId, sceneNum) {
    this.status = 'running';
    this.input = text;

    try {
      // TTS API 호출
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          voice: this.voice,
          input: text
        })
      });

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // MP3 저장
      const filename = `${executionId}_scene${sceneNum}.mp3`;
      const filepath = path.join(__dirname, '../generated/audio', filename);
      await fs.writeFile(filepath, buffer);

      this.output = 'audio_url';
      this.audioUrl = `/generated/audio/${filename}`;
      this.status = 'completed';

      return this.output;
    } catch (error) {
      this.status = 'failed';
      throw error;
    }
  }
}
```

---

## 영상 합성 엔진

### VideoComposer.js

FFmpeg를 사용하여 이미지, 오디오, 자막을 합성합니다.

#### 주요 기능
- 이미지 시퀀스 → 비디오 변환
- 오디오 트랙 합성
- 자막 텍스트 오버레이
- Shorts 포맷 (1080x1920, 9:16)
- 장면 전환 효과 (fade)

#### 핵심 코드

```javascript
class VideoComposer {
  async composeVideo(scenes, executionId) {
    const tempVideos = [];

    // 1. 각 장면을 개별 비디오로 생성
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const tempVideoPath = path.join(this.tempDir, `scene${i + 1}.mp4`);

      await this.createSceneVideo(scene, tempVideoPath);
      tempVideos.push(tempVideoPath);
    }

    // 2. 모든 장면 비디오를 하나로 연결
    const finalVideoPath = path.join(this.outputDir, `${executionId}_final.mp4`);
    await this.concatenateVideos(tempVideos, finalVideoPath);

    return finalVideoPath;
  }

  async createSceneVideo(scene, outputPath) {
    const { imagePath, audioPath, subtitle, duration } = scene;

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(imagePath)
        .loop(duration)
        .input(audioPath)
        .complexFilter([
          // 이미지 스케일링 및 패딩 (1080x1920)
          `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,
           pad=1080:1920:(ow-iw)/2:(oh-ih)/2,
           fade=t=in:st=0:d=0.5,fade=t=out:st=${duration - 0.5}:d=0.5[v]`,

          // 자막 오버레이
          `[v]drawtext=text='${subtitle}':
           fontfile=/usr/share/fonts/truetype/noto/NotoSansKR-Bold.ttf:
           fontsize=48:fontcolor=white:borderw=2:bordercolor=black:
           x=(w-text_w)/2:y=h-150[vout]`
        ])
        .outputOptions([
          '-map', '[vout]',
          '-map', '1:a',
          '-pix_fmt', 'yuv420p',
          '-preset', 'fast',
          '-crf', '23',
          '-t', duration
        ])
        .save(outputPath)
        .on('end', resolve)
        .on('error', reject);
    });
  }

  async concatenateVideos(videoPaths, outputPath) {
    // concat.txt 파일 생성
    const concatFile = path.join(this.tempDir, 'concat.txt');
    const content = videoPaths.map(p => `file '${p}'`).join('\n');
    await fs.writeFile(concatFile, content);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(['-c', 'copy'])
        .save(outputPath)
        .on('end', resolve)
        .on('error', reject);
    });
  }
}
```

---

## 파일 관리 시스템

### FileManager.js

생성된 파일을 관리하고 자동으로 정리합니다.

#### 주요 기능
- 24시간 후 자동 파일 삭제
- 6시간마다 자동 정리
- 서버 시작 시 오래된 파일 정리
- 실행 ID별 파일 삭제

#### 핵심 코드

```javascript
class FileManager {
  constructor() {
    this.generatedDir = path.join(__dirname, '../generated');
    this.maxAge = 24 * 60 * 60 * 1000; // 24시간

    // 6시간마다 자동 정리
    setInterval(() => this.cleanup(), 6 * 60 * 60 * 1000);
  }

  async cleanup() {
    const now = Date.now();
    let deletedCount = 0;

    const dirs = ['images', 'audio', 'videos'];
    for (const dir of dirs) {
      const dirPath = path.join(this.generatedDir, dir);
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        const age = now - stats.mtime.getTime();

        if (age > this.maxAge) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }
    }

    console.log(`🗑️  ${deletedCount}개 파일 정리 완료`);
    return deletedCount;
  }

  async deleteByExecutionId(executionId) {
    let deletedCount = 0;

    const dirs = ['images', 'audio', 'videos'];
    for (const dir of dirs) {
      const dirPath = path.join(this.generatedDir, dir);
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        if (file.startsWith(executionId)) {
          await fs.unlink(path.join(dirPath, file));
          deletedCount++;
        }
      }
    }

    return deletedCount;
  }
}
```

---

## 프론트엔드 아키텍처

### app.js

클라이언트 측 JavaScript 로직입니다.

#### 주요 기능
- API 호출 (fetch)
- 트리 시각화 (SVG)
- 실시간 진행 상황 업데이트 (폴링)
- 개발자 설정 UI
- 노드 클릭 상세 정보

#### 핵심 코드

```javascript
// API 호출
async function executeTree() {
  const response = await fetch('/api/tree/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: apiKey,
      initialInput: contentInput,
      treeConfig: devSettings
    })
  });

  const data = await response.json();
  executionId = data.executionId;

  // 폴링 시작
  pollResults();
}

// 실시간 진행 상황 업데이트
async function pollResults() {
  const response = await fetch(`/api/tree/result/${executionId}`);
  const data = await response.json();

  updateProgress(data.progress);
  updateTreeVisualization(data.results.nodes);

  if (data.status !== 'completed') {
    setTimeout(pollResults, 1000); // 1초마다 폴링
  } else {
    showCompletionModal(data);
  }
}

// SVG 트리 시각화
function drawTree(nodes) {
  const svg = document.getElementById('treeSvg');
  svg.innerHTML = '';

  nodes.forEach((node, index) => {
    const x = calculateX(node);
    const y = calculateY(node);

    // 노드 원 그리기
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', 30);
    circle.setAttribute('fill', getColorByStatus(node.status));
    circle.onclick = () => showNodeDetails(node);

    svg.appendChild(circle);
  });
}
```

---

## 다음 단계

- [개발자 가이드](./04-developer-guide.md) - 커스터마이징 방법
- [API 레퍼런스](./05-api-reference.md) - API 엔드포인트 상세 설명
