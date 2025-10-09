// TreeNode.js - 트리 노드 클래스 정의

class TreeNode {
  constructor(config) {
    this.id = config.id;
    this.name = config.name || `Node ${config.id}`;

    // API 설정
    this.model = config.model || 'gpt-3.5-turbo';
    this.systemMessage = config.systemMessage || '';
    this.promptTemplate = config.promptTemplate || '{input}';

    // 입력/출력 설정
    this.parentId = config.parentId || null;
    this.parentArrayIndex = config.parentArrayIndex || 0; // 부모 배열의 몇 번째 요소 사용
    this.outputSeparator = config.outputSeparator || '\n---\n'; // 출력 구분자

    // 실행 결과
    this.input = null; // 실제 입력된 프롬프트
    this.output = null; // API 응답 (원본)
    this.outputArray = []; // 구분자로 분리된 배열
    this.status = 'pending'; // pending, running, completed, failed
    this.error = null;

    // 자식 노드들
    this.children = [];
  }

  /**
   * 부모의 출력을 받아서 프롬프트 생성
   * @param {Array} parentOutput - 부모 노드의 출력 배열
   * @param {Object} context - 추가 컨텍스트 (rootInput 등)
   */
  generatePrompt(parentOutput, context = {}) {
    // 디버깅: parentOutput 확인
    console.log(`[DEBUG ${this.id}] parentOutput:`, parentOutput);
    console.log(`[DEBUG ${this.id}] parentArrayIndex:`, this.parentArrayIndex);

    // parentArrayIndex 기본값 처리
    const arrayIndex = this.parentArrayIndex !== undefined ? this.parentArrayIndex : 0;

    // 부모 노드의 값 가져오기 (현재 인덱스에 해당하는 값)
    const parentValue = parentOutput && parentOutput[arrayIndex]
      ? parentOutput[arrayIndex]
      : (parentOutput && parentOutput.length > 0 ? parentOutput[0] : '');

    console.log(`[DEBUG ${this.id}] Using arrayIndex: ${arrayIndex}, parentValue:`, parentValue?.substring(0, 50));

    // 프롬프트 템플릿 치환
    let prompt = this.promptTemplate;

    // 1. {parent} - 현재 노드의 부모 출력 (동적, 가장 많이 사용)
    prompt = prompt.replace(/{parent}/g, parentValue);

    // 2. {parent[N]} - 부모의 N번째 출력 (고정 인덱스, 특정 출력 참조 시)
    prompt = prompt.replace(/{parent\[(\d+)\]}/g, (match, index) => {
      return parentOutput && parentOutput[parseInt(index)]
        ? parentOutput[parseInt(index)]
        : '';
    });

    // 3. {sceneNum} - 현재 장면 번호 (1, 2, 3...)
    prompt = prompt.replace(/{sceneNum}/g, arrayIndex + 1);

    // 4. {root} - 최초 사용자 입력
    if (context.rootInput) {
      prompt = prompt.replace(/{root}/g, context.rootInput);
    }

    // 하위 호환성을 위한 별칭들
    prompt = prompt.replace(/{input}/g, parentValue); // {parent}와 동일
    prompt = prompt.replace(/{parent\[i\]}/g, parentValue); // {parent}와 동일

    console.log(`[DEBUG ${this.id}] final prompt:`, prompt.substring(0, 100));

    return prompt;
  }

  /**
   * 출력을 구분자로 분리해서 배열로 저장
   */
  parseOutput(rawOutput) {
    this.output = rawOutput;

    if (!this.outputSeparator) {
      // 구분자가 없으면 전체를 하나의 요소로
      this.outputArray = [rawOutput.trim()];
    } else {
      // 구분자로 분리
      this.outputArray = rawOutput
        .split(this.outputSeparator)
        .map(item => item.trim())
        .filter(item => item.length > 0);
    }

    return this.outputArray;
  }

  /**
   * 자식 노드 추가
   */
  addChild(childNode) {
    this.children.push(childNode);
  }

  /**
   * 노드를 JSON으로 직렬화
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      model: this.model,
      systemMessage: this.systemMessage,
      promptTemplate: this.promptTemplate,
      parentId: this.parentId,
      parentArrayIndex: this.parentArrayIndex,
      outputSeparator: this.outputSeparator,
      input: this.input,
      output: this.output,
      outputArray: this.outputArray,
      status: this.status,
      error: this.error,
      children: this.children.map(child => child.toJSON())
    };
  }
}

module.exports = TreeNode;
