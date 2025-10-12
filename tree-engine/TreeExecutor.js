// TreeExecutor.js - 트리 실행 엔진

const TreeNode = require('./TreeNode');
const DalleNode = require('./DalleNode');
const TTSNode = require('./TTSNode');
const FileManager = require('../utils/FileManager');

class TreeExecutor {
  constructor(apiKey, executionId = null) {
    this.apiKey = apiKey;
    this.executionId = executionId || `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.nodes = new Map(); // id -> TreeNode
    this.rootNodes = [];
    this.fileManager = new FileManager();
  }

  /**
   * 트리 구조 로드
   */
  loadTree(treeConfig) {
    this.nodes.clear();
    this.rootNodes = [];
    this.treeConfig = treeConfig; // 템플릿 저장 (동적 노드 생성용)

    // 1단계: 모든 노드 생성 (타입에 따라 다른 클래스 사용)
    treeConfig.nodes.forEach(nodeConfig => {
      let node;
      if (nodeConfig.nodeType === 'dalle') {
        node = new DalleNode(nodeConfig);
      } else if (nodeConfig.nodeType === 'tts') {
        node = new TTSNode(nodeConfig);
      } else {
        node = new TreeNode(nodeConfig);
      }
      this.nodes.set(node.id, node);
    });

    // 2단계: 부모-자식 관계 설정
    this.nodes.forEach(node => {
      if (node.parentId) {
        const parent = this.nodes.get(node.parentId);
        if (parent) {
          parent.addChild(node);
        }
      } else {
        this.rootNodes.push(node);
      }
    });
  }

  /**
   * 트리 전체 실행
   */
  async execute(initialInput = '') {
    console.log('🌳 트리 실행 시작...');

    // 컨텍스트 저장 (모든 노드에서 접근 가능)
    this.context = {
      rootInput: initialInput
    };

    // 루트 노드들 실행 (병렬, 독립적으로 성공/실패 처리)
    const rootPromises = this.rootNodes.map(rootNode =>
      this.executeNode(rootNode, [initialInput])
    );

    const results = await Promise.allSettled(rootPromises);

    // 실패한 노드 로깅 (에러 전파하지 않음)
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`⚠️  루트 노드 실패 (${this.rootNodes[index].name}):`, result.reason?.message);
      }
    });

    console.log('✅ 트리 실행 완료');
    return this.getResults();
  }

  /**
   * 개별 노드 실행 (재귀적으로 자식들도 실행)
   */
  async executeNode(node, parentOutputArray) {
    try {
      node.status = 'running';
      console.log(`▶️  노드 실행 중: ${node.name} (${node.id})`);

      // 0. 원본 프롬프트 템플릿 저장 (치환 전)
      if (node.promptTemplate) {
        node.promptTemplateOriginal = node.promptTemplate;
      }

      // 1. 프롬프트 생성 (컨텍스트 전달)
      node.input = node.generatePrompt(parentOutputArray, this.context || {});
      console.log(`   입력: ${node.input.substring(0, 50)}...`);

      // 2. API 호출 (노드 타입에 따라 다른 API 호출)
      let response;
      if (node instanceof DalleNode) {
        response = await this.callDallE(node);
      } else if (node instanceof TTSNode) {
        response = await this.callTTS(node);
      } else {
        response = await this.callOpenAI(node);
      }

      // 3. 출력 파싱
      node.parseOutput(response);
      console.log(`   출력 배열 (${node.outputArray.length}개):`,
        node.outputArray.map(s => s.substring(0, 30) + '...'));

      node.status = 'completed';

      // 4. 동적 자식 노드 생성 (루트 노드인 경우)
      if (node.id === 'root' && this.treeConfig.dynamicChildren) {
        console.log(`   🔄 동적 자식 노드 생성: ${node.outputArray.length}개 장면 감지`);
        this.createDynamicChildren(node);
      }

      // 5. 자식 노드들 실행 (병렬, 독립적으로 성공/실패 처리)
      if (node.children.length > 0) {
        console.log(`   ↳ 자식 노드 ${node.children.length}개 실행...`);

        const childPromises = node.children.map(child =>
          this.executeNode(child, node.outputArray)
        );

        const childResults = await Promise.allSettled(childPromises);

        // 실패한 자식 노드 로깅 (에러 전파하지 않음)
        childResults.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`   ⚠️  자식 노드 실패 (${node.children[index].name}):`, result.reason?.message);
          }
        });
      }

    } catch (error) {
      node.status = 'failed';
      node.error = error.message;
      console.error(`❌ 노드 실행 실패: ${node.name}`, error.message);
      // 에러를 throw하지 않고 노드에만 실패 표시
      // throw error;
    }
  }

  /**
   * 동적 자식 노드 생성 (루트 노드 실행 후)
   */
  createDynamicChildren(rootNode) {
    const sceneCount = rootNode.outputArray.length;
    const templates = this.treeConfig.nodeTemplates || {};

    for (let i = 0; i < sceneCount; i++) {
      const sceneIndex = i + 1;

      // 2층: 자막 & 이미지 컨셉 노드
      if (templates.planning) {
        const planningConfig = {
          ...templates.planning,
          id: `scene${sceneIndex}_planning`,
          name: `[2층] 장면${sceneIndex} 자막&이미지`,
          parentId: 'root',
          parentArrayIndex: i
        };
        const planningNode = new TreeNode(planningConfig);
        this.nodes.set(planningNode.id, planningNode);
        rootNode.addChild(planningNode);

        // 3층: 이미지 노드 (2층의 자식)
        if (templates.image) {
          const imageConfig = {
            ...templates.image,
            id: `scene${sceneIndex}_image`,
            name: `[3층] 장면${sceneIndex} 이미지`,
            parentId: `scene${sceneIndex}_planning`,
            parentArrayIndex: 1  // 2층의 이미지 프롬프트
          };
          const imageNode = new DalleNode(imageConfig);
          this.nodes.set(imageNode.id, imageNode);
          planningNode.addChild(imageNode);
        }

        // TTS 노드 (root의 직접 자식)
        if (templates.audio) {
          const audioConfig = {
            ...templates.audio,
            id: `scene${sceneIndex}_audio`,
            name: `TTS 음성 ${sceneIndex}`,
            parentId: 'root',
            parentArrayIndex: i  // root의 i번째 대본
          };
          const audioNode = new TTSNode(audioConfig);
          this.nodes.set(audioNode.id, audioNode);
          rootNode.addChild(audioNode);  // root의 자식으로 추가
        }
      }
    }

    console.log(`   ✅ 동적으로 ${sceneCount * 3}개 노드 생성 완료`);
  }

  /**
   * OpenAI API 호출
   */
  async callOpenAI(node) {
    const messages = [];

    // 시스템 메시지
    if (node.systemMessage) {
      messages.push({
        role: 'system',
        content: node.systemMessage
      });
    }

    // 사용자 메시지
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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API 오류: ${error.error?.message || '알 수 없는 오류'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * 모든 노드의 실행 결과 반환
   */
  getResults() {
    const results = {
      nodes: [],
      tree: this.rootNodes.map(node => node.toJSON())
    };

    this.nodes.forEach(node => {
      const nodeResult = {
        id: node.id,
        name: node.name,
        status: node.status,
        input: node.input,
        output: node.output,
        outputArray: node.outputArray,
        error: node.error,
        promptTemplate: node.promptTemplate,
        promptTemplateOriginal: node.promptTemplateOriginal,
        systemMessage: node.systemMessage
      };

      // DalleNode 전용 필드 추가
      if (node.imageUrl) {
        nodeResult.imageUrl = node.imageUrl;
        nodeResult.imagePath = node.imagePath;
        nodeResult.revisedPrompt = node.revisedPrompt;
      }

      // TTSNode 전용 필드 추가
      if (node.audioPath) {
        nodeResult.audioPath = node.audioPath;
        nodeResult.audioDuration = node.audioDuration;
      }

      results.nodes.push(nodeResult);
    });

    return results;
  }

  /**
   * 특정 노드의 결과 가져오기
   */
  getNodeResult(nodeId) {
    const node = this.nodes.get(nodeId);
    return node ? node.toJSON() : null;
  }

  /**
   * DALL-E API 호출 및 이미지 다운로드
   */
  async callDallE(node) {
    const dalleModel = node.model || 'dall-e-3';

    // Request body 구성 (gpt-image-1은 style 파라미터 미지원)
    const requestBody = {
      model: dalleModel,
      prompt: node.input,
      n: 1,
      size: node.imageSize,
      quality: node.imageQuality
    };

    // dall-e-3만 style 파라미터 지원
    if (dalleModel === 'dall-e-3' && node.imageStyle) {
      requestBody.style = node.imageStyle;
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`DALL-E API 오류: ${error.error?.message || '알 수 없는 오류'}`);
    }

    const data = await response.json();

    // 이미지 URL 및 수정된 프롬프트 저장
    node.imageUrl = data.data[0].url;
    node.revisedPrompt = data.data[0].revised_prompt;

    console.log(`   🎨 이미지 생성 완료: ${node.imageUrl}`);
    if (node.revisedPrompt) {
      console.log(`   📝 수정된 프롬프트: ${node.revisedPrompt.substring(0, 80)}...`);
    }

    // 이미지 다운로드 및 로컬 저장
    try {
      const filename = this.fileManager.generateFilename(this.executionId, node.id, 'png');
      node.imagePath = await this.fileManager.downloadImage(node.imageUrl, filename);
      console.log(`   💾 로컬 저장: ${node.imagePath}`);
    } catch (error) {
      console.error(`   ⚠️  이미지 다운로드 실패 (URL은 유지): ${error.message}`);
      // URL은 저장되었으므로 계속 진행
    }

    return node.imageUrl;
  }

  /**
   * OpenAI TTS API 호출 및 오디오 저장
   */
  async callTTS(node) {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: node.ttsModel,
        input: node.input,
        voice: node.voice,
        speed: node.speed,
        response_format: node.format
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`TTS API 오류: ${error.error?.message || '알 수 없는 오류'}`);
    }

    console.log(`   🎤 음성 생성 완료 (voice: ${node.voice}, speed: ${node.speed})`);

    // 오디오 데이터 가져오기
    const audioBuffer = Buffer.from(await response.arrayBuffer());

    // 파일 저장
    const filename = this.fileManager.generateFilename(this.executionId, node.id, node.format);
    node.audioPath = await this.fileManager.saveAudio(audioBuffer, filename);
    console.log(`   💾 오디오 저장: ${node.audioPath}`);

    // 오디오 길이 추정 (대략 150 단어/분, mp3 기준)
    const wordCount = node.input.split(/\s+/).length;
    node.audioDuration = Math.ceil((wordCount / 150) * 60); // 초 단위
    console.log(`   ⏱️  예상 길이: ${node.audioDuration}초`);

    return node.audioPath;
  }
}

module.exports = TreeExecutor;
