// test-simple-replacement.js - {input} 치환 테스트

require('dotenv').config();
const TreeExecutor = require('./tree-engine/TreeExecutor');

async function testSimpleReplacement() {
  console.log('🧪 {input} 치환 단순 테스트\n');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY가 설정되지 않았습니다.');
    process.exit(1);
  }

  // 가장 단순한 1개 노드 트리
  const simpleTree = {
    nodes: [
      {
        id: 'root',
        name: '루트 노드',
        model: 'gpt-3.5-turbo',
        systemMessage: '너는 앵무새야. 사용자가 입력한 내용을 그대로 따라해.',
        promptTemplate: '다음 내용을 그대로 반복해줘:\n\n{input}',
        outputSeparator: null
      }
    ]
  };

  const testInput = '안녕하세요. 이것은 테스트입니다.';

  console.log('📝 입력 텍스트:');
  console.log(testInput);
  console.log('\n' + '='.repeat(80) + '\n');

  try {
    const executor = new TreeExecutor(apiKey);
    executor.loadTree(simpleTree);

    console.log('🌳 트리 실행 전 - 루트 노드 정보:');
    const rootNode = executor.nodes.get('root');
    console.log('  - promptTemplate:', rootNode.promptTemplate);
    console.log('  - parentArrayIndex:', rootNode.parentArrayIndex);
    console.log('');

    await executor.execute(testInput);

    const results = executor.getResults();

    console.log('='.repeat(80));
    console.log('📊 결과:\n');

    results.nodes.forEach(node => {
      console.log(`🔹 ${node.name}`);
      console.log(`   입력 (node.input): ${node.input}`);
      console.log(`   출력 (node.output): ${node.output}`);
      console.log('');
    });

    console.log('='.repeat(80));

    // 검증
    const rootNode2 = results.nodes.find(n => n.id === 'root');
    if (rootNode2.input.includes('안녕하세요')) {
      console.log('✅ {input} 치환 성공!');
      console.log(`   실제 입력에 사용자 텍스트가 포함됨: "${rootNode2.input.substring(0, 100)}"`);
    } else {
      console.log('❌ {input} 치환 실패!');
      console.log(`   실제 입력: "${rootNode2.input}"`);
    }

  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testSimpleReplacement();
