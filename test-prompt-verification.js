// test-prompt-verification.js - 프롬프트가 제대로 전달되는지 확인

require('dotenv').config();
const TreeExecutor = require('./tree-engine/TreeExecutor');

async function testPromptVerification() {
  console.log('🧪 프롬프트 전달 검증 테스트\n');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY가 설정되지 않았습니다.');
    process.exit(1);
  }

  // 간단한 2층 구조로 테스트
  const testTree = {
    nodes: [
      {
        id: 'root',
        name: '루트 노드',
        model: 'gpt-3.5-turbo',
        systemMessage: '너는 요약 전문가야. 사용자가 입력한 내용을 절대 바꾸지 말고 정확히 요약해.',
        promptTemplate: '다음 내용을 3줄로 요약해줘:\n\n{input}',
        outputSeparator: null
      },
      {
        id: 'child',
        name: '자식 노드',
        model: 'gpt-3.5-turbo',
        systemMessage: '너는 번역가야.',
        promptTemplate: '다음 한국어를 영어로 번역해줘:\n\n{input}',
        parentId: 'root',
        parentArrayIndex: 0,
        outputSeparator: null
      }
    ]
  };

  const testInput = `
AI 시대의 핵심은 인간과 AI의 협력입니다.
AI는 도구일 뿐, 진정한 창의성은 인간에게서 나옵니다.
우리는 AI와 함께 더 나은 미래를 만들 수 있습니다.
  `.trim();

  console.log('📝 입력 텍스트:');
  console.log(testInput);
  console.log('\n' + '='.repeat(80) + '\n');

  try {
    const executor = new TreeExecutor(apiKey);
    executor.loadTree(testTree);

    await executor.execute(testInput);

    const results = executor.getResults();

    console.log('='.repeat(80));
    console.log('📊 결과:\n');

    results.nodes.forEach(node => {
      console.log(`\n🔹 ${node.name}`);
      console.log(`   입력: ${node.input}`);
      console.log(`   출력: ${node.output}`);
      console.log('');
    });

    console.log('='.repeat(80));

    // 검증
    const rootNode = results.nodes.find(n => n.id === 'root');
    if (rootNode.input.includes('AI 시대의 핵심')) {
      console.log('✅ 루트 노드에 사용자 입력이 제대로 전달되었습니다!');
    } else {
      console.log('❌ 루트 노드에 사용자 입력이 전달되지 않았습니다!');
      console.log(`   실제 입력: ${rootNode.input}`);
    }

  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    process.exit(1);
  }
}

testPromptVerification();
