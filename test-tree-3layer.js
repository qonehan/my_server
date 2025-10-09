// test-tree-3layer.js - 3층 구조 트리 테스트 (GPT → GPT → DALL-E)

require('dotenv').config();
const TreeExecutor = require('./tree-engine/TreeExecutor');

async function testThreeLayerTree() {
  console.log('🧪 3층 구조 API Tree 테스트 시작\n');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY가 .env 파일에 설정되어 있지 않습니다.');
    process.exit(1);
  }

  // 3층 트리 구조 정의
  const treeConfig = {
    nodes: [
      // ===== 1층: 콘텐츠 분석 및 장면 분할 =====
      {
        id: 'root',
        name: '[1층] 콘텐츠 분석 및 3개 장면 분할',
        model: 'gpt-3.5-turbo',
        systemMessage: '너는 Shorts 영상 기획 전문가야. 주어진 글을 분석해서 15초 영상에 적합한 3개의 장면으로 나눠줘.',
        promptTemplate: `다음 글을 읽고, Shorts 영상(15초)을 위한 3개 장면의 핵심 주제를 추출해줘. 각 장면은 5초씩이야.

글:
{input}

각 장면의 핵심 주제만 간단히 작성하고, "---"로 구분해줘.
형식:
장면1 주제
---
장면2 주제
---
장면3 주제`,
        outputSeparator: '---'
      },

      // ===== 2층: 각 장면별 상세 기획 (3개 노드 병렬) =====
      {
        id: 'scene1_planning',
        name: '[2층] 장면1 상세 기획',
        model: 'gpt-3.5-turbo',
        systemMessage: '너는 영상 스크립트 작가야. 주어진 주제로 구체적인 대사, 자막, 이미지 프롬프트를 작성해.',
        promptTemplate: `다음 주제로 5초 분량의 Shorts 영상 장면을 기획해줘:

주제: {input}

아래 형식으로 작성해줘:

대사: (TTS로 읽을 대사, 자연스럽고 간결하게)
자막: (화면에 표시할 짧은 텍스트)
===IMAGE===
(DALL-E로 생성할 이미지의 영문 프롬프트. 9:16 비율, vivid 스타일, 상세하게)`,
        parentId: 'root',
        parentArrayIndex: 0,
        outputSeparator: '===IMAGE==='
      },
      {
        id: 'scene2_planning',
        name: '[2층] 장면2 상세 기획',
        model: 'gpt-3.5-turbo',
        systemMessage: '너는 영상 스크립트 작가야. 주어진 주제로 구체적인 대사, 자막, 이미지 프롬프트를 작성해.',
        promptTemplate: `다음 주제로 5초 분량의 Shorts 영상 장면을 기획해줘:

주제: {input}

아래 형식으로 작성해줘:

대사: (TTS로 읽을 대사, 자연스럽고 간결하게)
자막: (화면에 표시할 짧은 텍스트)
===IMAGE===
(DALL-E로 생성할 이미지의 영문 프롬프트. 9:16 비율, vivid 스타일, 상세하게)`,
        parentId: 'root',
        parentArrayIndex: 1,
        outputSeparator: '===IMAGE==='
      },
      {
        id: 'scene3_planning',
        name: '[2층] 장면3 상세 기획',
        model: 'gpt-3.5-turbo',
        systemMessage: '너는 영상 스크립트 작가야. 주어진 주제로 구체적인 대사, 자막, 이미지 프롬프트를 작성해.',
        promptTemplate: `다음 주제로 5초 분량의 Shorts 영상 장면을 기획해줘:

주제: {input}

아래 형식으로 작성해줘:

대사: (TTS로 읽을 대사, 자연스럽고 간결하게)
자막: (화면에 표시할 짧은 텍스트)
===IMAGE===
(DALL-E로 생성할 이미지의 영문 프롬프트. 9:16 비율, vivid 스타일, 상세하게)`,
        parentId: 'root',
        parentArrayIndex: 2,
        outputSeparator: '===IMAGE==='
      },

      // ===== 3층: DALL-E 이미지 생성 (3개 노드 병렬) =====
      {
        id: 'scene1_image',
        name: '[3층] 장면1 이미지 생성',
        nodeType: 'dalle',
        promptTemplate: '{input}', // 부모의 이미지 프롬프트 그대로 사용
        parentId: 'scene1_planning',
        parentArrayIndex: 1, // 2층의 outputArray[1] = 이미지 프롬프트
        imageSize: '1024x1792', // 9:16 비율
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
      }
    ]
  };

  // 초기 입력
  const initialInput = `
인공지능이 창의성을 대체할 수 있을까?

많은 사람들이 AI가 예술과 창작 분야를 침범한다고 우려합니다.
하지만 실제로는 AI는 도구일 뿐, 진정한 창의성은 인간의 감정과 경험에서 나옵니다.
AI와 인간이 협력할 때, 우리는 이전에 상상하지 못했던 새로운 창작물을 만들어낼 수 있습니다.
  `.trim();

  console.log('📝 입력 텍스트:');
  console.log(initialInput);
  console.log('\n' + '='.repeat(80) + '\n');

  try {
    const executor = new TreeExecutor(apiKey);
    executor.loadTree(treeConfig);

    await executor.execute(initialInput);

    const results = executor.getResults();

    console.log('\n' + '='.repeat(80));
    console.log('📊 실행 결과:\n');

    // 1층 결과
    console.log('\n🔹 [1층] 장면 분할 결과:');
    const rootNode = results.nodes.find(n => n.id === 'root');
    if (rootNode) {
      rootNode.outputArray.forEach((scene, idx) => {
        console.log(`   장면${idx + 1}: ${scene}`);
      });
    }

    // 2층 결과
    console.log('\n🔹 [2층] 각 장면 상세 기획:');
    ['scene1_planning', 'scene2_planning', 'scene3_planning'].forEach((id, idx) => {
      const node = results.nodes.find(n => n.id === id);
      if (node && node.outputArray) {
        console.log(`\n   [장면${idx + 1}]`);
        console.log(`   대사/자막: ${node.outputArray[0]?.substring(0, 100)}...`);
        console.log(`   이미지 프롬프트: ${node.outputArray[1]?.substring(0, 100)}...`);
      }
    });

    // 3층 결과
    console.log('\n🔹 [3층] DALL-E 이미지 생성 결과:');
    ['scene1_image', 'scene2_image', 'scene3_image'].forEach((id, idx) => {
      const node = results.nodes.find(n => n.id === id);
      if (node) {
        console.log(`\n   [장면${idx + 1}]`);
        console.log(`   이미지 URL: ${node.imageUrl || '생성 실패'}`);
        if (node.revisedPrompt) {
          console.log(`   수정된 프롬프트: ${node.revisedPrompt.substring(0, 80)}...`);
        }
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ 3층 트리 테스트 완료!\n');

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testThreeLayerTree();
