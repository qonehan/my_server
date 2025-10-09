// test-full-pipeline.js - 전체 파이프라인 통합 테스트
// GPT → GPT → DALL-E → TTS → FFmpeg 영상 합성

require('dotenv').config();
const TreeExecutor = require('./tree-engine/TreeExecutor');
const VideoComposer = require('./video-engine/VideoComposer');

async function testFullPipeline() {
  console.log('🧪 전체 파이프라인 통합 테스트 시작\n');
  console.log('=' .repeat(80));

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY가 .env 파일에 설정되어 있지 않습니다.');
    process.exit(1);
  }

  // 전체 파이프라인 트리 구조
  const fullPipelineTree = {
    nodes: [
      // ===== 1층: 콘텐츠 분석 및 장면 분할 =====
      {
        id: 'root',
        name: '[1층] 콘텐츠 분석 - 3개 장면 분할',
        model: 'gpt-3.5-turbo',
        systemMessage: '너는 Shorts 영상 기획 전문가야. 주어진 글을 15초 Shorts 영상용 3개 장면으로 나눠줘.',
        promptTemplate: `다음 글을 3개 장면(각 5초)으로 나눠줘. 각 장면의 핵심 메시지만 간단히:

{input}

형식:
장면1 핵심 메시지
---
장면2 핵심 메시지
---
장면3 핵심 메시지`,
        outputSeparator: '---'
      },

      // ===== 2층: 각 장면별 상세 기획 (3개 노드) =====
      {
        id: 'scene1_planning',
        name: '[2층] 장면1 스크립트 기획',
        model: 'gpt-3.5-turbo',
        systemMessage: '너는 영상 스크립트 작가야. 주어진 주제의 내용을 정확히 전달하는 대사와 이미지를 만들어.',
        promptTemplate: `다음 주제로 5초 Shorts 장면을 기획해줘:

주제: {input}

반드시 이 주제의 핵심 내용이 전달되도록 작성해.

출력 형식:
[대사] (이 주제를 설명하는 자연스러운 대사, 15단어 이내)
===IMAGE===
[DALL-E 이미지 프롬프트] (영문, 이 주제를 시각적으로 표현, vivid style, 9:16 portrait, 상세하게)`,
        parentId: 'root',
        parentArrayIndex: 0,
        outputSeparator: '===IMAGE==='
      },
      {
        id: 'scene2_planning',
        name: '[2층] 장면2 스크립트 기획',
        model: 'gpt-3.5-turbo',
        systemMessage: '너는 영상 스크립트 작가야. 주어진 주제의 내용을 정확히 전달하는 대사와 이미지를 만들어.',
        promptTemplate: `다음 주제로 5초 Shorts 장면을 기획해줘:

주제: {input}

반드시 이 주제의 핵심 내용이 전달되도록 작성해.

출력 형식:
[대사] (이 주제를 설명하는 자연스러운 대사, 15단어 이내)
===IMAGE===
[DALL-E 이미지 프롬프트] (영문, 이 주제를 시각적으로 표현, vivid style, 9:16 portrait, 상세하게)`,
        parentId: 'root',
        parentArrayIndex: 1,
        outputSeparator: '===IMAGE==='
      },
      {
        id: 'scene3_planning',
        name: '[2층] 장면3 스크립트 기획',
        model: 'gpt-3.5-turbo',
        systemMessage: '너는 영상 스크립트 작가야. 주어진 주제의 내용을 정확히 전달하는 대사와 이미지를 만들어.',
        promptTemplate: `다음 주제로 5초 Shorts 장면을 기획해줘:

주제: {input}

반드시 이 주제의 핵심 내용이 전달되도록 작성해.

출력 형식:
[대사] (이 주제를 설명하는 자연스러운 대사, 15단어 이내)
===IMAGE===
[DALL-E 이미지 프롬프트] (영문, 이 주제를 시각적으로 표현, vivid style, 9:16 portrait, 상세하게)`,
        parentId: 'root',
        parentArrayIndex: 2,
        outputSeparator: '===IMAGE==='
      },

      // ===== 3층: 이미지 생성 (DALL-E) =====
      {
        id: 'scene1_image',
        name: '[3층] 장면1 이미지 생성',
        nodeType: 'dalle',
        promptTemplate: '{input}',
        parentId: 'scene1_planning',
        parentArrayIndex: 1,
        imageSize: '1024x1792',
        imageQuality: 'standard',
        imageStyle: 'vivid'
      },
      {
        id: 'scene2_image',
        name: '[3층] 장면2 이미지 생성',
        nodeType: 'dalle',
        promptTemplate: '{input}',
        parentId: 'scene2_planning',
        parentArrayIndex: 1,
        imageSize: '1024x1792',
        imageQuality: 'standard',
        imageStyle: 'vivid'
      },
      {
        id: 'scene3_image',
        name: '[3층] 장면3 이미지 생성',
        nodeType: 'dalle',
        promptTemplate: '{input}',
        parentId: 'scene3_planning',
        parentArrayIndex: 1,
        imageSize: '1024x1792',
        imageQuality: 'standard',
        imageStyle: 'vivid'
      },

      // ===== 4층: TTS 음성 생성 =====
      {
        id: 'scene1_audio',
        name: '[4층] 장면1 TTS 생성',
        nodeType: 'tts',
        promptTemplate: '{input}',
        parentId: 'scene1_planning',
        parentArrayIndex: 0, // 대사 텍스트
        ttsModel: 'tts-1',
        voice: 'alloy',
        speed: 1.0
      },
      {
        id: 'scene2_audio',
        name: '[4층] 장면2 TTS 생성',
        nodeType: 'tts',
        promptTemplate: '{input}',
        parentId: 'scene2_planning',
        parentArrayIndex: 0,
        ttsModel: 'tts-1',
        voice: 'alloy',
        speed: 1.0
      },
      {
        id: 'scene3_audio',
        name: '[4층] 장면3 TTS 생성',
        nodeType: 'tts',
        promptTemplate: '{input}',
        parentId: 'scene3_planning',
        parentArrayIndex: 0,
        ttsModel: 'tts-1',
        voice: 'alloy',
        speed: 1.0
      }
    ]
  };

  // 초기 입력
  const initialInput = `
AI의 시대, 우리는 무엇을 준비해야 할까?

인공지능은 이미 우리 삶 곳곳에 스며들었습니다.
하지만 AI를 두려워할 필요는 없습니다.
AI와 함께 성장하는 방법을 배우면, 우리는 더 창의적이고 효율적인 미래를 만들 수 있습니다.
  `.trim();

  console.log('📝 입력 텍스트:');
  console.log(initialInput);
  console.log('\n' + '='.repeat(80) + '\n');

  try {
    // ===== 1단계: 트리 실행 (GPT + DALL-E + TTS) =====
    console.log('🌳 1단계: API Tree 실행 중...\n');

    const executor = new TreeExecutor(apiKey);
    executor.loadTree(fullPipelineTree);

    await executor.execute(initialInput);

    const results = executor.getResults();
    console.log('\n' + '='.repeat(80));
    console.log('✅ API Tree 실행 완료\n');

    // ===== 2단계: 결과 수집 =====
    console.log('📊 2단계: 결과 수집 중...\n');

    const scenes = [];
    for (let i = 1; i <= 3; i++) {
      const planningNode = results.nodes.find(n => n.id === `scene${i}_planning`);
      const imageNode = results.nodes.find(n => n.id === `scene${i}_image`);
      const audioNode = results.nodes.find(n => n.id === `scene${i}_audio`);

      if (!planningNode || !imageNode || !audioNode) {
        throw new Error(`장면 ${i} 데이터가 완전하지 않습니다.`);
      }

      // 대사 텍스트 추출 (자막용)
      let subtitle = planningNode.outputArray[0] || '';
      // [대사] 부분만 추출
      const match = subtitle.match(/\[대사\]\s*(.+)/i);
      if (match) {
        subtitle = match[1].trim();
      }

      scenes.push({
        imagePath: imageNode.imagePath,
        audioPath: audioNode.audioPath,
        subtitle: subtitle.substring(0, 50), // 자막 길이 제한
        duration: 5
      });

      console.log(`  [장면 ${i}]`);
      console.log(`    이미지: ${imageNode.imagePath}`);
      console.log(`    오디오: ${audioNode.audioPath}`);
      console.log(`    자막: ${subtitle.substring(0, 40)}...`);
      console.log('');
    }

    // ===== 3단계: 영상 합성 =====
    console.log('='.repeat(80));
    console.log('🎬 3단계: FFmpeg 영상 합성 시작...\n');

    const videoComposer = new VideoComposer();
    const videoPath = await videoComposer.composeVideo(scenes, executor.executionId);

    // ===== 완료 =====
    console.log('\n' + '='.repeat(80));
    console.log('🎉 전체 파이프라인 테스트 성공!\n');
    console.log('📹 최종 영상 경로:');
    console.log(`   ${videoPath}`);
    console.log('\n📊 실행 통계:');
    console.log(`   - 실행 ID: ${executor.executionId}`);
    console.log(`   - 총 노드 수: ${results.nodes.length}개`);
    console.log(`   - 장면 수: ${scenes.length}개`);
    console.log(`   - 영상 길이: ${scenes.length * 5}초`);
    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 실행
testFullPipeline();
