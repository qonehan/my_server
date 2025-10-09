// test-tree.js - 트리 실행 테스트 스크립트

require('dotenv').config();
const TreeExecutor = require('./tree-engine/TreeExecutor');

async function testTree() {
  console.log('🧪 API Tree 테스트 시작\n');

  // API 키 확인
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY가 .env 파일에 설정되어 있지 않습니다.');
    process.exit(1);
  }

  // 트리 구조 정의
  const treeConfig = {
    nodes: [
      {
        id: 'root',
        name: '주제 분석 및 3가지 핵심 포인트 추출',
        model: 'gpt-3.5-turbo',
        systemMessage: '너는 콘텐츠 분석 전문가야. 주어진 글을 분석해서 Shorts 영상에 적합한 3가지 핵심 포인트를 추출해.',
        promptTemplate: '{input}\n\n위 내용을 3개의 핵심 포인트로 요약해줘. 각 포인트는 "---"로 구분해줘.',
        outputSeparator: '---'
      },
      {
        id: 'scene1',
        name: '장면 1: 시각적 설명',
        model: 'gpt-3.5-turbo',
        systemMessage: '너는 영상 스크립트 작가야.',
        promptTemplate: '다음 내용을 15초 Shorts 영상의 첫 번째 장면으로 만들어줘. 자막 텍스트와 이미지 생성을 위한 프롬프트를 "===IMAGE===" 구분자로 나눠서 작성해줘:\n\n{input}',
        parentId: 'root',
        parentArrayIndex: 0,
        outputSeparator: '===IMAGE==='
      },
      {
        id: 'scene2',
        name: '장면 2: 시각적 설명',
        model: 'gpt-3.5-turbo',
        systemMessage: '너는 영상 스크립트 작가야.',
        promptTemplate: '다음 내용을 15초 Shorts 영상의 두 번째 장면으로 만들어줘. 자막 텍스트와 이미지 생성을 위한 프롬프트를 "===IMAGE===" 구분자로 나눠서 작성해줘:\n\n{input}',
        parentId: 'root',
        parentArrayIndex: 1,
        outputSeparator: '===IMAGE==='
      },
      {
        id: 'scene3',
        name: '장면 3: 시각적 설명',
        model: 'gpt-3.5-turbo',
        systemMessage: '너는 영상 스크립트 작가야.',
        promptTemplate: '다음 내용을 15초 Shorts 영상의 세 번째 장면으로 만들어줘. 자막 텍스트와 이미지 생성을 위한 프롬프트를 "===IMAGE===" 구분자로 나눠서 작성해줘:\n\n{input}',
        parentId: 'root',
        parentArrayIndex: 2,
        outputSeparator: '===IMAGE==='
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
    // Executor 생성 및 실행
    const executor = new TreeExecutor(apiKey);
    executor.loadTree(treeConfig);

    await executor.execute(initialInput);

    // 결과 출력
    const results = executor.getResults();

    console.log('\n' + '='.repeat(80));
    console.log('📊 실행 결과:\n');

    results.nodes.forEach(node => {
      console.log(`\n🔹 ${node.name} (${node.id})`);
      console.log(`   상태: ${node.status}`);

      if (node.input) {
        console.log(`   입력: ${node.input.substring(0, 100)}...`);
      }

      if (node.outputArray && node.outputArray.length > 0) {
        console.log(`   출력 배열 (${node.outputArray.length}개):`);
        node.outputArray.forEach((item, idx) => {
          console.log(`     [${idx}] ${item.substring(0, 80)}...`);
        });
      }

      if (node.error) {
        console.log(`   에러: ${node.error}`);
      }
      console.log('');
    });

    console.log('='.repeat(80));
    console.log('✅ 테스트 완료!\n');

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    process.exit(1);
  }
}

// 실행
testTree();
