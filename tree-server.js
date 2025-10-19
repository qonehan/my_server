// tree-server.js - API Tree 서버

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const TreeExecutor = require('./tree-engine/TreeExecutor');
const FileManager = require('./utils/FileManager');
const VideoComposer = require('./video-engine/VideoComposer');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static('public'));

// 생성된 파일 제공 (정적 파일 서빙)
app.use('/generated', express.static(path.join(__dirname, 'generated')));

// 실행 중인 트리들을 저장 (간단한 메모리 저장)
const executors = new Map();
const fileManager = new FileManager();
const videoComposer = new VideoComposer();

// 설정 파일 경로
const SETTINGS_FILE = path.join(__dirname, 'config', 'dev-settings.json');

/**
 * 트리 실행 API
 */
app.post('/api/tree/execute', async (req, res) => {
  try {
    const { treeConfig, initialInput, apiKey } = req.body;

    console.log('[DEBUG /api/tree/execute] 요청 받음');
    console.log('[DEBUG] initialInput:', initialInput?.substring(0, 100));
    console.log('[DEBUG] initialInput type:', typeof initialInput);
    console.log('[DEBUG] initialInput length:', initialInput?.length);

    if (!treeConfig || !treeConfig.nodes) {
      return res.status(400).json({ error: '트리 구조(treeConfig)가 필요합니다.' });
    }

    if (!apiKey) {
      return res.status(400).json({ error: 'OpenAI API 키가 필요합니다.' });
    }

    // 실행 ID 생성
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // TreeExecutor 생성 및 실행
    const executor = new TreeExecutor(apiKey);
    executor.loadTree(treeConfig);

    executors.set(executionId, executor);

    const inputToUse = initialInput || '';
    console.log('[DEBUG] execute()에 전달할 값:', inputToUse.substring(0, 100));

    // 비동기 실행 (결과는 나중에 조회)
    executor.execute(inputToUse)
      .then(() => {
        console.log(`✅ 실행 완료: ${executionId}`);
      })
      .catch(error => {
        console.error(`❌ 실행 실패: ${executionId}`, error);
      });

    res.json({
      executionId,
      message: '트리 실행이 시작되었습니다.',
      status: 'running'
    });

  } catch (error) {
    console.error('트리 실행 에러:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 실행 결과 조회 API
 */
app.get('/api/tree/result/:executionId', (req, res) => {
  try {
    const { executionId } = req.params;
    const executor = executors.get(executionId);

    if (!executor) {
      return res.status(404).json({ error: '실행 ID를 찾을 수 없습니다.' });
    }

    const results = executor.getResults();

    // 모든 노드가 완료되었는지 확인
    const allCompleted = results.nodes.every(
      node => node.status === 'completed' || node.status === 'failed'
    );

    res.json({
      executionId,
      status: allCompleted ? 'completed' : 'running',
      results
    });

  } catch (error) {
    console.error('결과 조회 에러:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * OpenAI 모델 목록 조회 API
 */
app.get('/api/models', async (req, res) => {
  try {
    const { apiKey } = req.query;

    if (!apiKey) {
      return res.status(400).json({ error: 'API 키가 필요합니다.' });
    }

    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || '모델 목록 조회 실패');
    }

    const data = await response.json();

    // 모델 분류
    const models = {
      chat: [],      // GPT 채팅 모델
      image: [],     // DALL-E 이미지 모델
      audio: [],     // TTS/Whisper/Realtime 오디오 모델
      embedding: [], // 임베딩 모델
      other: []      // 기타
    };

    data.data.forEach(model => {
      const modelId = model.id.toLowerCase();
      const modelData = {
        id: model.id,
        name: model.id,
        created: model.created,
        owned_by: model.owned_by
      };

      // GPT 채팅 모델 (gpt-3.5, gpt-4, gpt-5, o1, o3, o4, chatgpt 등)
      if (
        modelId.includes('gpt-3.5') ||
        modelId.includes('gpt-4') ||
        modelId.includes('gpt-5') ||
        modelId.startsWith('o1') ||
        modelId.startsWith('o3') ||
        modelId.startsWith('o4') ||
        modelId.includes('chatgpt') ||
        modelId.includes('gpt-4.1')
      ) {
        // audio, realtime, transcribe, tts 등은 제외
        if (!modelId.includes('audio') &&
            !modelId.includes('realtime') &&
            !modelId.includes('transcribe') &&
            !modelId.includes('-tts')) {
          models.chat.push(modelData);
        } else {
          models.audio.push(modelData);
        }
      }
      // 이미지 생성 모델 (DALL-E, gpt-image, sora)
      else if (
        modelId.includes('dall-e') ||
        modelId.includes('gpt-image') ||
        modelId.includes('sora')
      ) {
        models.image.push(modelData);
      }
      // 오디오 모델 (TTS, Whisper, gpt-audio, gpt-realtime)
      else if (
        modelId.includes('tts') ||
        modelId.includes('whisper') ||
        modelId.includes('gpt-audio') ||
        modelId.includes('gpt-realtime') ||
        modelId.includes('audio') ||
        modelId.includes('realtime') ||
        modelId.includes('transcribe')
      ) {
        models.audio.push(modelData);
      }
      // 임베딩 모델
      else if (modelId.includes('embedding')) {
        models.embedding.push(modelData);
      }
      // 기타 (davinci, babbage, moderation 등)
      else {
        models.other.push(modelData);
      }
    });

    // 각 카테고리별 정렬 (최신순)
    Object.keys(models).forEach(category => {
      models[category].sort((a, b) => b.created - a.created);
    });

    res.json(models);

  } catch (error) {
    console.error('모델 목록 조회 에러:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 테스트용 예제 트리
 */
app.get('/api/tree/example', (req, res) => {
  const exampleTree = {
    nodes: [
      {
        id: 'root',
        name: '아이디어 생성',
        model: 'gpt-3.5-turbo',
        systemMessage: '너는 창의적인 아이디어 생성 전문가야.',
        promptTemplate: '{input}에 대한 3가지 창의적인 아이디어를 생성해줘. 각 아이디어는 "---"로 구분해줘.',
        outputSeparator: '---'
      },
      {
        id: 'child1',
        name: '아이디어 1 상세화',
        model: 'gpt-3.5-turbo',
        systemMessage: '너는 아이디어를 구체화하는 전문가야.',
        promptTemplate: '다음 아이디어를 더 상세하게 발전시켜줘: {input}',
        parentId: 'root',
        parentArrayIndex: 0,
        outputSeparator: null
      },
      {
        id: 'child2',
        name: '아이디어 2 상세화',
        model: 'gpt-3.5-turbo',
        systemMessage: '너는 아이디어를 구체화하는 전문가야.',
        promptTemplate: '다음 아이디어를 더 상세하게 발전시켜줘: {input}',
        parentId: 'root',
        parentArrayIndex: 1,
        outputSeparator: null
      },
      {
        id: 'child3',
        name: '아이디어 3 상세화',
        model: 'gpt-3.5-turbo',
        systemMessage: '너는 아이디어를 구체화하는 전문가야.',
        promptTemplate: '다음 아이디어를 더 상세하게 발전시켜줘: {input}',
        parentId: 'root',
        parentArrayIndex: 2,
        outputSeparator: null
      }
    ]
  };

  res.json(exampleTree);
});

/**
 * 영상 생성 API
 */
app.post('/api/video/compose', async (req, res) => {
  try {
    const { executionId, scenes } = req.body;

    if (!executionId || !scenes || !Array.isArray(scenes)) {
      return res.status(400).json({
        error: 'executionId와 scenes 배열이 필요합니다.'
      });
    }

    // 장면 데이터 검증
    // scenes: [{imagePath, audioPath, subtitle, duration}]

    console.log(`📹 영상 생성 요청 (실행 ID: ${executionId}, 장면: ${scenes.length}개)`);

    const videoPath = await videoComposer.composeVideo(scenes, executionId);

    // 상대 URL로 변환
    const videoUrl = `/generated/videos/${path.basename(videoPath)}`;

    res.json({
      success: true,
      videoPath,
      videoUrl,
      message: '영상 생성 완료'
    });

  } catch (error) {
    console.error('영상 생성 에러:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 파일 정리 API
 */
app.post('/api/files/cleanup', (req, res) => {
  try {
    const { maxAgeHours = 24 } = req.body;
    const deletedCount = fileManager.cleanupOldFiles(maxAgeHours);

    res.json({
      success: true,
      deletedCount,
      message: `${deletedCount}개 파일 정리 완료`
    });

  } catch (error) {
    console.error('파일 정리 에러:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 디스크 사용량 조회 API
 */
app.get('/api/files/usage', (req, res) => {
  try {
    const usage = fileManager.getDiskUsage();
    res.json(usage);

  } catch (error) {
    console.error('사용량 조회 에러:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 특정 실행 ID의 파일 삭제 API
 */
app.delete('/api/files/:executionId', (req, res) => {
  try {
    const { executionId } = req.params;
    const deletedCount = fileManager.deleteExecutionFiles(executionId);

    res.json({
      success: true,
      deletedCount,
      message: `실행 ID ${executionId}의 파일 ${deletedCount}개 삭제 완료`
    });

  } catch (error) {
    console.error('파일 삭제 에러:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 개발자 설정 불러오기 API
 */
app.get('/api/settings', async (req, res) => {
  try {
    // 설정 파일 읽기
    const data = await fs.readFile(SETTINGS_FILE, 'utf8');
    const settings = JSON.parse(data);
    res.json(settings);
  } catch (error) {
    // 파일이 없으면 null 반환 (프론트엔드에서 기본값 사용)
    if (error.code === 'ENOENT') {
      res.json(null);
    } else {
      console.error('설정 불러오기 에러:', error);
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * 개발자 설정 저장 API
 */
app.post('/api/settings', async (req, res) => {
  try {
    const settings = req.body;

    // config 디렉토리가 없으면 생성
    const configDir = path.dirname(SETTINGS_FILE);
    try {
      await fs.access(configDir);
    } catch {
      await fs.mkdir(configDir, { recursive: true });
    }

    // 설정 파일 저장
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');

    res.json({
      success: true,
      message: '설정이 저장되었습니다.'
    });

  } catch (error) {
    console.error('설정 저장 에러:', error);
    res.status(500).json({ error: error.message });
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🌳 API Tree 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  console.log('📝 예제 트리: GET /api/tree/example');
  console.log('▶️  트리 실행: POST /api/tree/execute');
  console.log('📊 결과 조회: GET /api/tree/result/:executionId');
  console.log('📁 생성 파일: http://localhost:${PORT}/generated/');
  console.log('🗑️  파일 정리: POST /api/files/cleanup');

  // 서버 시작 시 오래된 파일 정리
  fileManager.cleanupOldFiles(24);
});

// 주기적으로 오래된 파일 정리 (6시간마다)
setInterval(() => {
  console.log('🔄 주기적 파일 정리 시작...');
  fileManager.cleanupOldFiles(24);
}, 6 * 60 * 60 * 1000);
