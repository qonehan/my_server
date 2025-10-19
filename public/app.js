// app.js - AI Shorts Generator 프론트엔드

// DOM 요소
const apiKeyInput = document.getElementById('apiKey');
const inputTextArea = document.getElementById('inputText');
const generateBtn = document.getElementById('generateBtn');
const sceneInfo = document.getElementById('sceneInfo');
const testModeToggle = document.getElementById('testModeToggle');

// 캔버스
const treeSvg = document.getElementById('treeSvg');

// 노드 사이드바
const nodeSidebar = document.getElementById('nodeSidebar');
const sidebarNodeName = document.getElementById('sidebarNodeName');
const sidebarContent = document.getElementById('sidebarContent');
const sidebarClose = document.getElementById('sidebarClose');
const sidebarResizer = document.querySelector('.sidebar-resizer');

// 상태바
const statusText = document.getElementById('statusText');
const statusMessage = document.getElementById('statusMessage');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const executionInfo = document.getElementById('executionInfo');

// 결과 모달
const resultModal = document.getElementById('resultModal');
const resultModalClose = document.getElementById('resultModalClose');
const resultVideo = document.getElementById('resultVideo');
const downloadBtn = document.getElementById('downloadBtn');
const newVideoBtn = document.getElementById('newVideoBtn');

// 상태 변수
let currentExecutionId = null;
let pollingInterval = null;
let treeData = null;
let selectedNode = null;
let isExecuting = false;
let availableModels = null;
let modelSelectionCallback = null;
let currentNodeType = null;

// 캔버스 드래그 상태
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panOffsetX = 0;
let panOffsetY = 0;

// 사이드바 리사이즈 상태
let isResizing = false;
let sidebarWidth = 450;

// 모델별 지원 파라미터 정의
const modelCapabilities = {
  'dall-e-2': {
    supportsSize: true,
    supportedSizes: ['256x256', '512x512', '1024x1024'],
    supportsQuality: false,
    supportsStyle: false
  },
  'dall-e-3': {
    supportsSize: true,
    supportedSizes: ['1024x1024', '1024x1792', '1792x1024'],
    supportsQuality: true,
    supportedQualities: ['standard', 'hd'],
    supportsStyle: true,
    supportedStyles: ['vivid', 'natural']
  },
  'gpt-image-1': {
    supportsSize: true,
    supportedSizes: ['1024x1536', '1536x1024', '1024x1024', 'auto'],
    supportsQuality: true,
    supportedQualities: ['low', 'medium', 'high', 'auto'],
    supportsStyle: false
  },
  'gpt-image-1-mini': {
    supportsSize: true,
    supportedSizes: ['1024x1536', '1536x1024', '1024x1024', 'auto'],
    supportsQuality: true,
    supportedQualities: ['low', 'medium', 'high', 'auto'],
    supportsStyle: false
  }
};

// 초기 노드 템플릿 (실행 전 표시용)
const initialNodeTemplates = {
  root: {
    id: 'root',
    name: '[1층] Shorts 대본 생성',
    status: 'pending',
    model: 'gpt-4o',
    systemMessage: '너는 교육 컨텐츠 전문 대본 작가야. 글을 읽고 핵심을 파악해서 이해하기 쉬운 Shorts 대본을 작성해.',
    promptTemplate: `아래 글을 읽고 30-60초 분량의 교육용 Shorts 영상 대본을 작성해줘.

입력 내용:
{input}

대본 작성 규칙 (반드시 준수):
1. 총 8-12개 장면으로 구성 (30-60초 분량)
2. 각 장면당 한 문장만 작성 (5초 내외)
3. TTS가 읽을 대사만 작성 - 지문, 설명, 괄호, 장면번호 등 절대 금지
4. 한 장면 = 한 문장 = 하나의 이미지
5. 자연스러운 구어체로 작성

📌 대본 구조 (반드시 이 순서로):
1️⃣ 첫 번째 장면 (주제 소개): "오늘은 [주제]에 대해 알아볼게요."
   - 반드시 이 형식으로 시작
   - 예: "오늘은 인공지능의 발전에 대해 알아볼게요."

2️⃣ 두 번째~마지막 장면 (본론 전개): 핵심 내용을 순서대로 설명
   - 각 장면마다 하나의 핵심 내용만
   - 논리적 순서로 전개

⚠️ 출력 형식 (이 형식을 정확히 지켜야 함):
오늘은 [주제]에 대해 알아볼게요.
---
[본론 첫 번째 내용 한 문장]
---
[본론 두 번째 내용 한 문장]
---
[본론 세 번째 내용 한 문장]
---
...
(총 8-12개 장면)

❌ 잘못된 예시:
"장면1: 인공지능의 발전 (설명)"
"인공지능은 정말 대단해요. 오늘은 이것에 대해 알아봅시다." (2문장 금지)
"AI가 발전하고 있다" (주제 소개 형식 위반)

✅ 올바른 예시:
"오늘은 인공지능의 발전에 대해 알아볼게요."
---
"인공지능은 이미 우리 생활 곳곳에 사용되고 있어요."
---
"의료 분야에서는 질병 진단의 정확도가 크게 향상되었죠."
---
"자율주행 자동차도 빠르게 발전하고 있습니다."
---
...

⚠️ 중요:
- 첫 문장은 반드시 "오늘은 ~에 대해 알아볼게요." 형식
- 8-12개 장면 작성
- 각 장면은 한 문장만
- "---"로 구분`
  },
  planning: {
    name: '[2층] 자막 & 이미지 컨셉',
    status: 'pending',
    model: 'gpt-4o',
    systemMessage: '너는 교육 영상 일러스트 기획 전문가야. 대본의 핵심 내용을 손그림 스타일 일러스트로 시각화하는 프롬프트를 만들어.',
    promptTemplate: `다음 장면의 대본을 분석하고, 손그림 일러스트로 표현할 이미지 프롬프트를 작성해줘:

장면 대본:
{parent}

출력 형식 (정확히 지켜줘):
첫 번째 줄: 화면에 표시할 핵심 키워드 자막 (10자 이내)
===IMAGE===
두 번째 부분: DALL-E 이미지 프롬프트 (영문)

⚠️ 이미지 프롬프트 필수 구조 (반드시 이 순서대로):
1. 스타일 고정: "Hand-drawn illustration style, colored pencil sketch on beige paper,"
2. 구도: "9:16 vertical portrait composition, centered,"
3. 내용: 대본의 핵심 개념을 구체적으로 묘사 (단순하고 명확하게)
4. 색상: "soft pastel colors, gentle shading,"
5. 마무리: "simple and clean, educational drawing, white margins"

📌 핵심 규칙:
- 대본에서 설명하는 **핵심 대상이나 개념**을 그림의 중심에 배치
- 복잡한 배경이나 여러 요소 금지 → 한 장면에 하나의 주제만
- 텍스트, 문자, 라벨 절대 금지 → 순수 그림만
- "hand-drawn", "colored pencil", "sketch" 스타일 키워드 필수 포함

✅ 좋은 예시:
대본: "인공지능은 이미 우리 생활 곳곳에 사용되고 있어요."
자막: AI 활용
===IMAGE===
Hand-drawn illustration style, colored pencil sketch on beige paper, 9:16 vertical portrait composition, centered, a simple robot helping a person using smartphone and laptop at home, soft pastel colors, gentle shading, simple and clean, educational drawing, white margins

대본: "의료 분야에서는 질병 진단의 정확도가 크게 향상되었죠."
자막: 의료 진단
===IMAGE===
Hand-drawn illustration style, colored pencil sketch on beige paper, 9:16 vertical portrait composition, centered, a doctor looking at medical scan on screen with AI assistance icon, soft pastel colors, gentle shading, simple and clean, educational drawing, white margins`
  },
  image: {
    name: '[3층] 이미지 생성',
    status: 'pending',
    nodeType: 'dalle',
    model: 'dall-e-3',
    promptTemplate: '{parent}',
    imageSize: '1024x1792',
    imageQuality: 'standard',
    imageStyle: 'natural',
    parentArrayIndex: 1  // 2층의 두 번째 출력 (이미지 프롬프트)
  },
  audio: {
    name: 'TTS 음성',
    status: 'pending',
    nodeType: 'tts',
    promptTemplate: '{parent}',
    ttsModel: 'tts-1',
    voice: 'alloy',
    speed: 1.0,
    parentArrayIndex: null  // root의 대본을 직접 참조
  }
};

// ========== 초기 트리 구조 생성 (3개 장면 예시) ==========
function createInitialNodes() {
  const nodes = [
    { ...initialNodeTemplates.root }
  ];

  // 3개 장면 예시 (UI 표시용, 실행 시 동적으로 변경됨)
  for (let i = 1; i <= 3; i++) {
    nodes.push({
      ...initialNodeTemplates.planning,
      id: `scene${i}_planning`,
      name: `[2층] 장면${i} 자막&이미지`
    });
    nodes.push({
      ...initialNodeTemplates.image,
      id: `scene${i}_image`,
      name: `[3층] 장면${i} 이미지`
    });
    // TTS는 UI에 표시하지 않음
  }

  return nodes;
}

// ========== 실행 트리 구조 생성 ==========
async function getDynamicTreeConfig() {
  const isTestMode = testModeToggle.checked;
  const devSettings = await loadDevSettings();

  return {
    dynamicChildren: true,
    testMode: isTestMode,  // 테스트 모드 플래그 추가
    testSceneCount: devSettings.testSceneCount,  // 테스트 모드 장면 수
    nodes: [
      {
        id: 'root',
        name: '[1층] Shorts 대본 생성',
        model: devSettings.layer1.model,
        systemMessage: devSettings.layer1.systemMessage,
        promptTemplate: devSettings.layer1.promptTemplate,
        outputSeparator: '---'
      }
    ],
    nodeTemplates: {
      planning: {
        model: devSettings.layer2.model,
        systemMessage: devSettings.layer2.systemMessage,
        promptTemplate: devSettings.layer2.promptTemplate,
        outputSeparator: '===IMAGE==='
      },
      image: {
        nodeType: 'dalle',
        model: devSettings.layer3.model,
        promptTemplate: '{parent}',
        imageSize: devSettings.layer3.imageSize,
        imageQuality: devSettings.layer3.imageQuality,
        imageStyle: devSettings.layer3.imageStyle
      },
      audio: {
        nodeType: 'tts',
        promptTemplate: '{parent}',  // root의 대본을 직접 사용
        ttsModel: initialNodeTemplates.audio.ttsModel || 'tts-1',
        voice: 'alloy',
        speed: 1.0
      }
    }
  };
}

// ========== 영상 생성 시작 ==========
async function generateVideo() {
  const apiKey = apiKeyInput.value.trim();
  const inputText = inputTextArea.value.trim();

  if (!apiKey) {
    alert('OpenAI API 키를 입력해주세요.');
    return;
  }

  if (!inputText) {
    alert('콘텐츠를 입력해주세요.');
    return;
  }

  // UI 초기화
  isExecuting = true;
  generateBtn.disabled = true;
  generateBtn.innerHTML = '<span class="loading"></span> 생성 중...';
  updateStatus('running', '트리 실행 시작...');
  showProgress(0);

  try {
    // 트리 실행 요청
    const treeConfig = await getDynamicTreeConfig();
    const executeResponse = await fetch('/api/tree/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: apiKey,
        initialInput: inputText,
        treeConfig: treeConfig
      })
    });

    if (!executeResponse.ok) {
      const error = await executeResponse.json();
      throw new Error(error.error || '트리 실행 실패');
    }

    const executeData = await executeResponse.json();
    currentExecutionId = executeData.executionId;
    executionInfo.textContent = `실행 ID: ${currentExecutionId}`;

    updateStatus('running', '노드 실행 중...');
    showProgress(10);

    // 결과 폴링 시작
    await pollResults();

  } catch (error) {
    console.error('에러:', error);
    updateStatus('failed', `에러: ${error.message}`);
    generateBtn.disabled = false;
    generateBtn.textContent = '🚀 영상 생성 시작';
    isExecuting = false;
  }
}

// ========== 결과 폴링 ==========
async function pollResults() {
  let pollCount = 0;
  const maxPolls = 180;

  return new Promise((resolve, reject) => {
    pollingInterval = setInterval(async () => {
      pollCount++;

      try {
        const resultResponse = await fetch(`/api/tree/result/${currentExecutionId}`);
        if (!resultResponse.ok) throw new Error('결과 조회 실패');

        const resultData = await resultResponse.json();
        treeData = resultData.results;

        // 트리 시각화 업데이트
        updateTreeVisualization(treeData.nodes, true);

        // 장면 수 업데이트
        const sceneCount = treeData.nodes.filter(n => n.id.includes('_planning')).length;
        sceneInfo.textContent = `실행 중 (${sceneCount}개 장면)`;

        // 진행률 업데이트
        const completedNodes = treeData.nodes.filter(n => n.status === 'completed').length;
        const totalNodes = treeData.nodes.length;
        const progress = Math.min(80, 10 + (completedNodes / totalNodes) * 70);
        showProgress(Math.round(progress));

        updateStatus('running', `진행 중... (${completedNodes}/${totalNodes} 노드 완료)`);

        // 완료 확인
        if (resultData.status === 'completed') {
          clearInterval(pollingInterval);
          updateStatus('running', '영상 합성 중...');
          showProgress(85);

          await composeVideo(treeData);
          resolve();
        }

      } catch (error) {
        clearInterval(pollingInterval);
        reject(error);
      }

      if (pollCount >= maxPolls) {
        clearInterval(pollingInterval);
        reject(new Error('타임아웃'));
      }

    }, 1000);
  });
}

// ========== 영상 합성 ==========
async function composeVideo(treeResults) {
  const scenes = [];
  let sceneIndex = 1;

  while (true) {
    const planningNode = treeResults.nodes.find(n => n.id === `scene${sceneIndex}_planning`);
    const imageNode = treeResults.nodes.find(n => n.id === `scene${sceneIndex}_image`);
    const audioNode = treeResults.nodes.find(n => n.id === `scene${sceneIndex}_audio`);

    if (!planningNode || !imageNode || !audioNode) break;

    // 2층의 첫 번째 출력이 자막
    let subtitle = planningNode.outputArray[0] || '';
    subtitle = subtitle.trim();

    const duration = audioNode.audioDuration ? Math.max(3, audioNode.audioDuration) : 5;

    scenes.push({
      imagePath: imageNode.imagePath,
      audioPath: audioNode.audioPath,
      subtitle: subtitle,
      duration: duration
    });

    sceneIndex++;
  }

  updateStatus('running', `${scenes.length}개 장면 합성 중...`);
  showProgress(90);

  const composeResponse = await fetch('/api/video/compose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      executionId: currentExecutionId,
      scenes: scenes
    })
  });

  if (!composeResponse.ok) {
    const error = await composeResponse.json();
    throw new Error(error.error || '영상 합성 실패');
  }

  const composeData = await composeResponse.json();
  showProgress(100);
  updateStatus('completed', '영상 생성 완료!');

  showResult(composeData);
}

// ========== 결과 표시 ==========
function showResult(videoData) {
  resultVideo.src = videoData.videoUrl;
  downloadBtn.href = videoData.videoUrl;
  downloadBtn.download = `ai-shorts-${currentExecutionId}.mp4`;
  resultModal.style.display = 'flex';

  generateBtn.disabled = false;
  generateBtn.textContent = '🚀 영상 생성 시작';
  isExecuting = false;
}

// ========== 트리 시각화 ==========
function updateTreeVisualization(nodes) {
  if (!nodes || nodes.length === 0) return;

  const svg = treeSvg;
  while (svg.children.length > 1) {
    svg.removeChild(svg.lastChild);
  }

  const layout = calculateTreeLayout(nodes);

  // SVG 크기를 계산된 bounds에 맞게 설정 (viewBox 제거하여 원래 크기 유지)
  svg.setAttribute('width', layout.bounds.width);
  svg.setAttribute('height', layout.bounds.height);

  // 팬 오프셋 적용
  svg.style.transform = `translate(${panOffsetX}px, ${panOffsetY}px)`;

  // 간선 그리기
  layout.edges.forEach(edge => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'edge-line');
    line.setAttribute('x1', edge.x1);
    line.setAttribute('y1', edge.y1);
    line.setAttribute('x2', edge.x2);
    line.setAttribute('y2', edge.y2);
    svg.appendChild(line);
  });

  // 노드 그리기
  layout.nodes.forEach(layoutNode => {
    const node = layoutNode.data;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${layoutNode.x}, ${layoutNode.y})`);

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('class', `node-rect ${node.status}`);
    rect.setAttribute('width', layoutNode.width);
    rect.setAttribute('height', layoutNode.height);
    rect.setAttribute('rx', '8');
    rect.setAttribute('stroke-width', '2');
    rect.addEventListener('click', (e) => {
      e.stopPropagation();
      onNodeClick(node, e);
    });
    g.appendChild(rect);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('class', 'node-text');
    text.setAttribute('x', layoutNode.width / 2);
    text.setAttribute('y', layoutNode.height / 2 - 5);
    text.setAttribute('text-anchor', 'middle');
    text.textContent = node.name;
    g.appendChild(text);

    const statusText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    statusText.setAttribute('class', 'node-status');
    statusText.setAttribute('x', layoutNode.width / 2);
    statusText.setAttribute('y', layoutNode.height / 2 + 12);
    statusText.setAttribute('text-anchor', 'middle');
    statusText.textContent = getStatusText(node.status);
    g.appendChild(statusText);

    svg.appendChild(g);
  });
}

// ========== 트리 레이아웃 계산 ==========
function calculateTreeLayout(nodes) {
  const nodeWidth = 180;
  const nodeHeight = 60;
  const horizontalGap = 30;
  const verticalGap = 80;
  const padding = 50; // 여백

  const layers = {};
  nodes.forEach(node => {
    // TTS 노드는 UI에서 숨김
    if (node.id.includes('_audio')) return;

    let layer = 0;
    if (node.id === 'root') layer = 0;
    else if (node.id.includes('_planning')) layer = 1;
    else if (node.id.includes('_image')) layer = 2;

    if (!layers[layer]) layers[layer] = [];
    layers[layer].push(node);
  });

  const layoutNodes = [];
  const edges = [];

  // 가장 넓은 레이어의 너비 계산
  let maxLayerWidth = 0;
  Object.keys(layers).forEach(layerIdx => {
    const layerNodes = layers[layerIdx];
    const layerWidth = layerNodes.length * (nodeWidth + horizontalGap) - horizontalGap;
    maxLayerWidth = Math.max(maxLayerWidth, layerWidth);
  });

  Object.keys(layers).sort().forEach((layerIdx, i) => {
    const layerNodes = layers[layerIdx];
    const layerWidth = layerNodes.length * (nodeWidth + horizontalGap) - horizontalGap;
    // 중앙 정렬
    const startX = padding + (maxLayerWidth - layerWidth) / 2;
    const y = padding + i * (nodeHeight + verticalGap);

    layerNodes.forEach((node, j) => {
      const x = startX + j * (nodeWidth + horizontalGap);
      layoutNodes.push({
        data: node,
        x: x,
        y: y,
        width: nodeWidth,
        height: nodeHeight
      });
    });
  });

  layoutNodes.forEach(child => {
    if (child.data.id !== 'root') {
      const parentId = child.data.id.includes('_image') || child.data.id.includes('_audio')
        ? child.data.id.replace('_image', '_planning').replace('_audio', '_planning')
        : 'root';

      const parent = layoutNodes.find(n => n.data.id === parentId);
      if (parent) {
        edges.push({
          x1: parent.x + parent.width / 2,
          y1: parent.y + parent.height,
          x2: child.x + child.width / 2,
          y2: child.y
        });
      }
    }
  });

  // 전체 레이아웃의 경계 계산
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  layoutNodes.forEach(node => {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  });

  const totalWidth = maxX - minX + padding * 2;
  const totalHeight = maxY - minY + padding * 2;

  return {
    nodes: layoutNodes,
    edges,
    bounds: {
      width: Math.max(totalWidth, 800), // 최소 너비
      height: Math.max(totalHeight, 400) // 최소 높이
    }
  };
}

// ========== 노드 클릭 핸들러 ==========
function onNodeClick(node) {
  selectedNode = node;
  sidebarNodeName.textContent = node.name;

  let html = '';

  // 상태
  html += `<div class="popup-field">
    <span class="popup-field-label">상태</span>
    <div><span class="popup-status-badge ${node.status}">${getStatusText(node.status)}</span></div>
  </div>`;

  // 모델 선택 (select 드롭다운)
  if (node.model || node.nodeType === 'dalle') {
    const isEditable = !isExecuting && node.status === 'pending';
    const currentModel = node.model || (node.nodeType === 'dalle' ? 'dall-e-3' : 'gpt-3.5-turbo');
    const nodeLayer = getNodeLayer(node);

    html += `<div class="popup-field">
      <span class="popup-field-label">🤖 모델</span>
      <div class="popup-field-value">
        ${isEditable ? `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 0.85rem; color: #aaa; min-width: 40px;">현재:</span>
              <strong style="color: #667eea;">${currentModel}</strong>
            </div>
            <select id="modelSelect_${node.id}" class="model-select-compact" onchange="updateModelSelection('${node.id}', '${nodeLayer}', this.value)">
              <option value="">변경하려면 선택...</option>
            </select>
          </div>
        ` : `
          <strong style="color: #667eea;">${currentModel}</strong>
        `}
      </div>
    </div>`;
  }

  // Developer Message (시스템 프롬프트) - 항상 표시
  if (node.systemMessage) {
    const isEditable = !isExecuting && node.status === 'pending';
    html += `<div class="popup-field">
      <span class="popup-field-label">Developer Message (시스템 프롬프트)</span>
      ${isEditable ? `
        <textarea class="popup-field-edit" id="editSystemMessage" rows="3">${escapeHtml(node.systemMessage)}</textarea>
        <button class="btn-save-template" onclick="saveSystemMessage('${getNodeLayer(node)}')">같은 층 전체 적용</button>
      ` : `
        <div class="popup-field-value code">${escapeHtml(node.systemMessage)}</div>
      `}
      <div class="placeholder-help">
        <span class="placeholder-help-title">💡 역할</span>
        API의 동작 방식과 역할을 정의합니다. 이 메시지는 AI가 어떤 "캐릭터"로 응답할지 결정합니다.
      </div>
    </div>`;
  }

  // User Prompt Template (편집 가능) - 항상 표시
  if (node.promptTemplate) {
    const isEditable = !isExecuting && node.status === 'pending';
    const parentArrayIndex = node.parentArrayIndex !== undefined ? node.parentArrayIndex : 0;

    html += `<div class="popup-field">
      <span class="popup-field-label">User Prompt Template (치환 전)</span>
      ${isEditable ? `
        <textarea class="popup-field-edit" id="editPromptTemplate" rows="8">${escapeHtml(node.promptTemplate)}</textarea>
        <button class="btn-save-template" onclick="saveTemplate('${getNodeLayer(node)}')">같은 층 전체 적용</button>
      ` : `
        <div class="popup-field-value code">${escapeHtml(node.promptTemplate)}</div>
      `}
      <div class="placeholder-help">
        <span class="placeholder-help-title">💡 플레이스홀더란?</span>
        실행 시 자동으로 치환되는 변수입니다.<br><br>

        <strong>📌 핵심 플레이스홀더:</strong><br>
        • <code>{parent}</code> - 부모의 출력 중 <strong>인덱스 ${parentArrayIndex}</strong>번 값 ⭐<br>
        • <code>{parent[N]}</code> - 부모의 N번째 출력 (고정 인덱스)<br>
        • <code>{sceneNum}</code> - 현재 장면 번호 (1, 2, 3...)<br>
        • <code>{root}</code> - 최초 사용자 입력<br><br>

        <strong>💡 이 노드의 <code>{parent}</code> 동작:</strong><br>
        ${node.id.includes('_image') ?
          `이미지 노드는 부모(2층)의 <strong>두 번째 출력</strong> (인덱스 1 = 이미지 프롬프트)을 사용합니다.` :
          node.id.includes('_audio') ?
          `TTS 노드는 부모(2층)의 <strong>첫 번째 출력</strong> (인덱스  0 = 대사)을 사용합니다.` :
          `부모가 ["출력1", "출력2", "출력3"]일 때, <code>{parent}</code>는 인덱스 ${parentArrayIndex}번 값을 참조합니다.`
        }

        <br><br>→ <strong>같은 층 노드들도 각자 다른 부모 출력 인덱스를 참조할 수 있습니다!</strong>
      </div>
    </div>`;

    // 실행 중이면 원본 프롬프트도 함께 표시
    if ((isExecuting || node.input) && node.promptTemplateOriginal) {
      html += `<div class="popup-field">
        <span class="popup-field-label">📝 원본 프롬프트 템플릿 (실행 당시)</span>
        <div class="popup-field-value code">${escapeHtml(node.promptTemplateOriginal)}</div>
      </div>`;
    }
  }

  // DALL-E 설정 (모델별 지원 파라미터에 따라 동적 표시)
  if (node.nodeType === 'dalle') {
    const currentModel = node.model || 'dall-e-3';
    const capabilities = modelCapabilities[currentModel] || modelCapabilities['dall-e-3'];
    const isEditable = !isExecuting && node.status === 'pending';

    html += `<div class="popup-field">
      <span class="popup-field-label">DALL-E 설정</span>
      <div class="popup-field-value">`;

    // 크기 (Size)
    if (capabilities.supportsSize) {
      html += `<div style="margin-bottom: 8px;">
        <strong>크기:</strong> `;
      if (isEditable && capabilities.supportedSizes && capabilities.supportedSizes.length > 1) {
        html += `<select id="imageSize_${node.id}" class="model-select-compact" style="width: auto; display: inline-block; margin-left: 8px;" onchange="updateImageParameter('${node.id}', 'imageSize', this.value)">`;
        capabilities.supportedSizes.forEach(size => {
          const selected = size === (node.imageSize || '1024x1792') ? 'selected' : '';
          html += `<option value="${size}" ${selected}>${size}</option>`;
        });
        html += `</select>`;
      } else {
        html += `<span>${node.imageSize || '1024x1792'}</span>`;
      }
      html += `</div>`;
    }

    // 품질 (Quality)
    if (capabilities.supportsQuality) {
      html += `<div style="margin-bottom: 8px;">
        <strong>품질:</strong> `;
      if (isEditable && capabilities.supportedQualities && capabilities.supportedQualities.length > 1) {
        html += `<select id="imageQuality_${node.id}" class="model-select-compact" style="width: auto; display: inline-block; margin-left: 8px;" onchange="updateImageParameter('${node.id}', 'imageQuality', this.value)">`;
        capabilities.supportedQualities.forEach(quality => {
          const selected = quality === (node.imageQuality || 'medium') ? 'selected' : '';
          html += `<option value="${quality}" ${selected}>${quality}</option>`;
        });
        html += `</select>`;
      } else {
        html += `<span>${node.imageQuality || 'medium'}</span>`;
      }
      html += `</div>`;
    } else {
      html += `<div style="margin-bottom: 8px;"><strong>품질:</strong> <span style="color: #999;">지원 안 함</span></div>`;
    }

    // 스타일 (Style)
    if (capabilities.supportsStyle) {
      html += `<div style="margin-bottom: 8px;">
        <strong>스타일:</strong> `;
      if (isEditable && capabilities.supportedStyles && capabilities.supportedStyles.length > 1) {
        html += `<select id="imageStyle_${node.id}" class="model-select-compact" style="width: auto; display: inline-block; margin-left: 8px;" onchange="updateImageParameter('${node.id}', 'imageStyle', this.value)">`;
        capabilities.supportedStyles.forEach(style => {
          const selected = style === (node.imageStyle || 'natural') ? 'selected' : '';
          html += `<option value="${style}" ${selected}>${style}</option>`;
        });
        html += `</select>`;
      } else {
        html += `<span>${node.imageStyle || 'natural'}</span>`;
      }
      html += `</div>`;
    } else {
      html += `<div style="margin-bottom: 8px;"><strong>스타일:</strong> <span style="color: #999;">지원 안 함 (${currentModel})</span></div>`;
    }

    html += `
      </div>
      <div class="placeholder-help">
        <span class="placeholder-help-title">ℹ️ 모델별 지원 파라미터</span>
        <strong>${currentModel}</strong> 모델은 위에 표시된 파라미터를 지원합니다.
        ${isEditable ? '드롭다운에서 값을 선택하여 변경할 수 있습니다.' : ''}
      </div>
    </div>`;
  }

  // TTS 설정
  if (node.nodeType === 'tts') {
    html += `<div class="popup-field">
      <span class="popup-field-label">TTS 설정</span>
      <div class="popup-field-value">
        모델: ${node.ttsModel || 'tts-1'}<br>
        음성: ${node.voice || 'alloy'}<br>
        속도: ${node.speed || '1.0'}x
      </div>
    </div>`;
  }

  // 실행 후 데이터
  if (isExecuting || node.input || node.output) {
    if (node.input) {
      html += `<div class="popup-field">
        <span class="popup-field-label">📥 실제 API 입력 (플레이스홀더 치환 후)</span>
        <div class="popup-field-value code">${escapeHtml(node.input)}</div>
      </div>`;
    }

    if (node.output) {
      html += `<div class="popup-field">
        <span class="popup-field-label">📤 실제 출력 (Output)</span>
        <div class="popup-field-value code">${escapeHtml(node.output)}</div>
      </div>`;
    }

    if (node.outputArray && node.outputArray.length > 0) {
      html += `<div class="popup-field">
        <span class="popup-field-label">📋 출력 배열 (${node.outputArray.length}개)</span>`;
      node.outputArray.forEach((item, idx) => {
        html += `<div class="popup-field-value" style="margin-bottom: 8px;">[${idx}] ${escapeHtml(item)}</div>`;
      });
      html += `</div>`;
    }

    if (node.imageUrl) {
      html += `<div class="popup-field">
        <span class="popup-field-label">🎨 생성된 이미지</span>
        <div class="popup-field-value"><img src="${node.imageUrl}" alt="Generated Image"></div>
      </div>`;
    }

    if (node.audioPath) {
      const audioUrl = node.audioPath.replace('/workspaces/my_server', '');
      html += `<div class="popup-field">
        <span class="popup-field-label">🎤 생성된 음성 (${node.audioDuration || '?'}초)</span>
        <div class="popup-field-value"><audio controls src="${audioUrl}"></audio></div>
      </div>`;
    }
  }

  sidebarContent.innerHTML = html;

  // 모델 select 박스 채우기
  if (!isExecuting && node.status === 'pending') {
    const nodeLayer = getNodeLayer(node);
    const selectElement = document.getElementById(`modelSelect_${node.id}`);

    if (selectElement) {
      populateModelSelect(selectElement, nodeLayer, node.model);
    }
  }

  // 사이드바 표시
  nodeSidebar.style.display = 'flex';
}

// ========== 캔버스 드래그 (팬) 이벤트 ==========
const canvasViewport = document.getElementById('canvasViewport');

canvasViewport.addEventListener('mousedown', (e) => {
  // 노드를 클릭한 경우는 팬 시작하지 않음
  if (e.target.classList.contains('node-rect')) return;

  isPanning = true;
  panStartX = e.clientX - panOffsetX;
  panStartY = e.clientY - panOffsetY;
  canvasViewport.classList.add('dragging');
});

window.addEventListener('mousemove', (e) => {
  if (isPanning) {
    panOffsetX = e.clientX - panStartX;
    panOffsetY = e.clientY - panStartY;
    treeSvg.style.transform = `translate(${panOffsetX}px, ${panOffsetY}px)`;
  }

  if (isResizing) {
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth >= 300 && newWidth <= 800) {
      sidebarWidth = newWidth;
      nodeSidebar.style.width = sidebarWidth + 'px';
    }
  }
});

window.addEventListener('mouseup', () => {
  if (isPanning) {
    isPanning = false;
    canvasViewport.classList.remove('dragging');
  }
  if (isResizing) {
    isResizing = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
});

// ========== 사이드바 리사이즈 이벤트 ==========
sidebarResizer.addEventListener('mousedown', (e) => {
  isResizing = true;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  e.preventDefault();
});

// ========== 상태 업데이트 ==========
function updateStatus(status, message) {
  const statusMap = {
    'idle': '대기 중',
    'running': '실행 중',
    'completed': '완료',
    'failed': '실패'
  };
  statusText.textContent = statusMap[status] || status;
  statusMessage.textContent = message || '';
}

function showProgress(percent) {
  progressContainer.style.display = 'block';
  progressBar.style.width = `${percent}%`;
}

function getStatusText(status) {
  const map = {
    'pending': '⏳ 대기',
    'running': '⚙️ 실행',
    'completed': '✅ 완료',
    'failed': '❌ 실패'
  };
  return map[status] || status;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========== 노드 레이어 판단 ==========
function getNodeLayer(node) {
  if (node.id === 'root') return 'root';
  if (node.id.includes('_planning')) return 'planning';
  if (node.id.includes('_image')) return 'image';
  if (node.id.includes('_audio')) return 'audio';
  return 'unknown';
}

// ========== 템플릿 저장 (같은 층 전체 적용) ==========
window.saveTemplate = function(layer) {
  const newTemplate = document.getElementById('editPromptTemplate').value;

  if (!newTemplate.trim()) {
    alert('프롬프트 템플릿을 입력해주세요.');
    return;
  }

  // 초기 노드 템플릿 업데이트
  if (layer === 'root') {
    initialNodeTemplates.root.promptTemplate = newTemplate;
  } else if (layer === 'planning') {
    initialNodeTemplates.planning.promptTemplate = newTemplate;
  } else if (layer === 'image') {
    initialNodeTemplates.image.promptTemplate = newTemplate;
  } else if (layer === 'audio') {
    initialNodeTemplates.audio.promptTemplate = newTemplate;
  }

  // 현재 표시된 노드들도 업데이트
  const initialNodes = createInitialNodes();
  updateTreeVisualization(initialNodes);

  // 사이드바 닫기
  nodeSidebar.style.display = 'none';

  alert('같은 층의 모든 노드에 적용되었습니다!');
};

// ========== 시스템 메시지 저장 (같은 층 전체 적용) ==========
window.saveSystemMessage = function(layer) {
  const newSystemMessage = document.getElementById('editSystemMessage').value;

  if (!newSystemMessage.trim()) {
    alert('Developer Message를 입력해주세요.');
    return;
  }

  // 초기 노드 템플릿 업데이트
  if (layer === 'root') {
    initialNodeTemplates.root.systemMessage = newSystemMessage;
  } else if (layer === 'planning') {
    initialNodeTemplates.planning.systemMessage = newSystemMessage;
  }

  // 현재 표시된 노드들도 업데이트
  const initialNodes = createInitialNodes();
  updateTreeVisualization(initialNodes);

  // 사이드바 닫기
  nodeSidebar.style.display = 'none';

  alert('같은 층의 모든 노드에 적용되었습니다!');
};

// ========== 모델 목록 가져오기 ==========
async function fetchAvailableModels() {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    alert('API 키를 먼저 입력해주세요.');
    return null;
  }

  try {
    const response = await fetch(`/api/models?apiKey=${encodeURIComponent(apiKey)}`);
    if (!response.ok) {
      throw new Error('모델 목록 조회 실패');
    }

    availableModels = await response.json();
    return availableModels;
  } catch (error) {
    console.error('모델 목록 조회 에러:', error);
    alert('모델 목록을 가져오는데 실패했습니다.');
    return null;
  }
}

// ========== select 박스에 모델 목록 채우기 ==========
async function populateModelSelect(selectElement, nodeLayer, currentModel) {
  // 모델 목록이 없으면 먼저 가져오기
  if (!availableModels) {
    const models = await fetchAvailableModels();
    if (!models) {
      selectElement.innerHTML = '<option value="">모델 목록 로드 실패</option>';
      return;
    }
  }

  // 노드 레이어에 따라 표시할 모델 결정
  let modelsToShow = [];
  let categoryLabel = '';

  if (nodeLayer === 'image') {
    modelsToShow = availableModels.image || [];
    categoryLabel = '이미지 생성 모델';
  } else if (nodeLayer === 'audio') {
    modelsToShow = availableModels.audio || [];
    categoryLabel = '오디오 모델';
  } else {
    // root, planning - GPT 모델
    modelsToShow = availableModels.chat || [];
    categoryLabel = 'GPT 채팅 모델';
  }

  // select 박스 채우기
  selectElement.innerHTML = '<option value="">모델 선택...</option>';

  if (modelsToShow.length === 0) {
    selectElement.innerHTML += `<option value="" disabled>${categoryLabel}을 찾을 수 없습니다</option>`;
    return;
  }

  // 옵션 추가
  modelsToShow.forEach(model => {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = `${model.id} (${model.owned_by})`;
    if (model.id === currentModel) {
      option.selected = true;
    }
    selectElement.appendChild(option);
  });
}

// ========== 모델 선택 업데이트 (같은 층 전체 적용) ==========
window.updateModelSelection = function(nodeId, layer, selectedModelId) {
  if (!selectedModelId) return;

  // 초기 노드 템플릿 업데이트
  if (layer === 'root') {
    initialNodeTemplates.root.model = selectedModelId;
  } else if (layer === 'planning') {
    initialNodeTemplates.planning.model = selectedModelId;
  } else if (layer === 'image') {
    initialNodeTemplates.image.model = selectedModelId;

    // 이미지 모델 변경 시 해당 모델의 기본 파라미터로 자동 설정
    const capabilities = modelCapabilities[selectedModelId];
    if (capabilities) {
      // 크기 - 첫 번째 지원 크기로 설정
      if (capabilities.supportedSizes && capabilities.supportedSizes.length > 0) {
        initialNodeTemplates.image.imageSize = capabilities.supportedSizes[0];
      }
      // 품질 - 첫 번째 지원 품질로 설정 (또는 medium/standard)
      if (capabilities.supportedQualities && capabilities.supportedQualities.length > 0) {
        const defaultQuality = capabilities.supportedQualities.includes('medium') ? 'medium'
                              : capabilities.supportedQualities.includes('standard') ? 'standard'
                              : capabilities.supportedQualities[0];
        initialNodeTemplates.image.imageQuality = defaultQuality;
      }
      // 스타일 - 지원하면 natural, 아니면 제거
      if (capabilities.supportsStyle && capabilities.supportedStyles) {
        const defaultStyle = capabilities.supportedStyles.includes('natural') ? 'natural' : capabilities.supportedStyles[0];
        initialNodeTemplates.image.imageStyle = defaultStyle;
      } else {
        initialNodeTemplates.image.imageStyle = null;
      }
    }
  } else if (layer === 'audio') {
    initialNodeTemplates.audio.model = selectedModelId;
  }

  // 현재 표시된 노드들도 업데이트
  const initialNodes = createInitialNodes();
  updateTreeVisualization(initialNodes);

  // 사이드바가 열려있으면 현재 노드 다시 렌더링 (파라미터 변경 반영)
  if (selectedNode && selectedNode.id === nodeId) {
    // 노드 정보 업데이트
    selectedNode.model = selectedModelId;
    if (layer === 'image' && modelCapabilities[selectedModelId]) {
      const capabilities = modelCapabilities[selectedModelId];
      if (capabilities.supportedSizes) selectedNode.imageSize = capabilities.supportedSizes[0];
      if (capabilities.supportedQualities) {
        const defaultQuality = capabilities.supportedQualities.includes('medium') ? 'medium'
                              : capabilities.supportedQualities.includes('standard') ? 'standard'
                              : capabilities.supportedQualities[0];
        selectedNode.imageQuality = defaultQuality;
      }
      if (capabilities.supportsStyle && capabilities.supportedStyles) {
        selectedNode.imageStyle = capabilities.supportedStyles.includes('natural') ? 'natural' : capabilities.supportedStyles[0];
      }
    }
    onNodeClick(selectedNode);
  }

  alert(`✅ 모델이 ${selectedModelId}로 변경되었습니다!\n(같은 층의 모든 노드에 적용됨)`);
};

// ========== 이미지 파라미터 업데이트 ==========
window.updateImageParameter = function(nodeId, paramName, value) {
  // 템플릿 업데이트
  initialNodeTemplates.image[paramName] = value;

  // 현재 노드 업데이트
  if (selectedNode && selectedNode.id === nodeId) {
    selectedNode[paramName] = value;
  }

  // 트리 시각화 업데이트
  const initialNodes = createInitialNodes();
  updateTreeVisualization(initialNodes);

  console.log(`✅ ${paramName} 변경: ${value} (같은 층 모든 노드에 적용)`);
};

// ========== 이벤트 리스너 ==========
generateBtn.addEventListener('click', generateVideo);

sidebarClose.addEventListener('click', () => {
  nodeSidebar.style.display = 'none';
});

resultModalClose.addEventListener('click', () => {
  resultModal.style.display = 'none';
});

newVideoBtn.addEventListener('click', () => {
  resultModal.style.display = 'none';
  location.reload();
});

// API 키 저장/불러오기
window.addEventListener('load', () => {
  const savedKey = localStorage.getItem('openai_api_key');
  if (savedKey) apiKeyInput.value = savedKey;

  // 테스트 모드 상태 복원
  const savedTestMode = localStorage.getItem('test_mode');
  if (savedTestMode === 'true') {
    testModeToggle.checked = true;
  }

  // 초기 트리 표시
  const initialNodes = createInitialNodes();
  updateTreeVisualization(initialNodes);
});

apiKeyInput.addEventListener('change', () => {
  localStorage.setItem('openai_api_key', apiKeyInput.value);
});

// 테스트 모드 토글 이벤트
testModeToggle.addEventListener('change', () => {
  localStorage.setItem('test_mode', testModeToggle.checked);
  console.log(`테스트 모드: ${testModeToggle.checked ? 'ON (2개 장면만 생성)' : 'OFF (전체 장면 생성)'}`);
});

// ========== 개발자 설정 ==========
const devSettingsBtn = document.getElementById('devSettingsBtn');
const devSettingsModal = document.getElementById('devSettingsModal');
const devSettingsClose = document.getElementById('devSettingsClose');
const devLoginScreen = document.getElementById('devLoginScreen');
const devSettingsContent = document.getElementById('devSettingsContent');
const devPassword = document.getElementById('devPassword');
const devLoginBtn = document.getElementById('devLoginBtn');
const devLoginError = document.getElementById('devLoginError');
const devTestSceneCount = document.getElementById('devTestSceneCount');
const devSaveBtn = document.getElementById('devSaveBtn');
const devResetBtn = document.getElementById('devResetBtn');

// 각 층별 설정 요소
const devLayer1Model = document.getElementById('devLayer1Model');
const devLayer1System = document.getElementById('devLayer1System');
const devLayer1Prompt = document.getElementById('devLayer1Prompt');
const devLayer2Model = document.getElementById('devLayer2Model');
const devLayer2System = document.getElementById('devLayer2System');
const devLayer2Prompt = document.getElementById('devLayer2Prompt');
const devLayer3Model = document.getElementById('devLayer3Model');
const devLayer3Size = document.getElementById('devLayer3Size');
const devLayer3Quality = document.getElementById('devLayer3Quality');
const devLayer3Style = document.getElementById('devLayer3Style');

const DEV_PASSWORD = 'ai@shorts';
let isDevAuthenticated = false;

// 개발자 설정 기본값
const defaultDevSettings = {
  testSceneCount: 2,
  layer1: {
    model: 'gpt-4o',
    systemMessage: '너는 교육 컨텐츠 전문 대본 작가야. 글을 읽고 핵심을 파악해서 이해하기 쉬운 Shorts 대본을 작성해.',
    promptTemplate: initialNodeTemplates.root.promptTemplate
  },
  layer2: {
    model: 'gpt-4o',
    systemMessage: initialNodeTemplates.planning.systemMessage,
    promptTemplate: initialNodeTemplates.planning.promptTemplate
  },
  layer3: {
    model: 'dall-e-3',
    imageSize: '1024x1792',
    imageQuality: 'standard',
    imageStyle: 'natural'
  }
};

// 개발자 설정 불러오기 (서버에서)
async function loadDevSettings() {
  try {
    const response = await fetch('/api/settings');
    const settings = await response.json();

    // 서버에 설정이 없으면 기본값 사용
    if (!settings) {
      return { ...defaultDevSettings };
    }

    return settings;
  } catch (error) {
    console.error('설정 불러오기 실패, 기본값 사용:', error);
    return { ...defaultDevSettings };
  }
}

// 개발자 설정 저장 (서버로)
async function saveDevSettings(settings) {
  try {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error('설정 저장 실패');
    }

    return true;
  } catch (error) {
    console.error('설정 저장 실패:', error);
    throw error;
  }
}

// 개발자 설정 모달 열기
devSettingsBtn.addEventListener('click', async () => {
  devSettingsModal.style.display = 'flex';
  devPassword.value = '';
  devLoginError.textContent = '';

  if (isDevAuthenticated) {
    devLoginScreen.style.display = 'none';
    devSettingsContent.style.display = 'block';
    await loadDevSettingsToUI();
  } else {
    devLoginScreen.style.display = 'block';
    devSettingsContent.style.display = 'none';
  }
});

// 개발자 설정 모달 닫기
devSettingsClose.addEventListener('click', () => {
  devSettingsModal.style.display = 'none';
});

// 로그인 처리
devLoginBtn.addEventListener('click', async () => {
  if (devPassword.value === DEV_PASSWORD) {
    isDevAuthenticated = true;
    devLoginScreen.style.display = 'none';
    devSettingsContent.style.display = 'block';
    await loadDevSettingsToUI();
    devLoginError.textContent = '';
  } else {
    devLoginError.textContent = '비밀번호가 올바르지 않습니다.';
  }
});

// Enter 키로 로그인
devPassword.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    devLoginBtn.click();
  }
});

// 개발자 설정 UI에 로드
async function loadDevSettingsToUI() {
  const settings = await loadDevSettings();

  // 기본 설정
  devTestSceneCount.value = settings.testSceneCount;

  // 1층 설정
  devLayer1Model.value = settings.layer1.model;
  devLayer1System.value = settings.layer1.systemMessage;
  devLayer1Prompt.value = settings.layer1.promptTemplate;

  // 2층 설정
  devLayer2Model.value = settings.layer2.model;
  devLayer2System.value = settings.layer2.systemMessage;
  devLayer2Prompt.value = settings.layer2.promptTemplate;

  // 3층 설정
  devLayer3Model.value = settings.layer3.model;
  devLayer3Size.value = settings.layer3.imageSize;
  devLayer3Quality.value = settings.layer3.imageQuality;
  devLayer3Style.value = settings.layer3.imageStyle;
}

// 개발자 설정 저장
devSaveBtn.addEventListener('click', async () => {
  try {
    const settings = {
      testSceneCount: parseInt(devTestSceneCount.value),
      layer1: {
        model: devLayer1Model.value,
        systemMessage: devLayer1System.value,
        promptTemplate: devLayer1Prompt.value
      },
      layer2: {
        model: devLayer2Model.value,
        systemMessage: devLayer2System.value,
        promptTemplate: devLayer2Prompt.value
      },
      layer3: {
        model: devLayer3Model.value,
        imageSize: devLayer3Size.value,
        imageQuality: devLayer3Quality.value,
        imageStyle: devLayer3Style.value
      }
    };

    await saveDevSettings(settings);
    alert('설정이 저장되었습니다! 서버 재시작 후에도 유지됩니다.');
    devSettingsModal.style.display = 'none';

    // 트리 업데이트
    const initialNodes = createInitialNodes();
    updateTreeVisualization(initialNodes);
  } catch (error) {
    alert('설정 저장에 실패했습니다: ' + error.message);
  }
});

// 개발자 설정 초기화
devResetBtn.addEventListener('click', async () => {
  if (confirm('모든 설정을 기본값으로 초기화하시겠습니까?')) {
    try {
      await saveDevSettings({ ...defaultDevSettings });
      await loadDevSettingsToUI();
      alert('설정이 초기화되었습니다!');
    } catch (error) {
      alert('설정 초기화에 실패했습니다: ' + error.message);
    }
  }
});

// 모달 외부 클릭 시 닫기
devSettingsModal.addEventListener('click', (e) => {
  if (e.target === devSettingsModal) {
    devSettingsModal.style.display = 'none';
  }
});

// 탭 전환
document.querySelectorAll('.dev-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const targetTab = tab.dataset.tab;

    // 모든 탭 비활성화
    document.querySelectorAll('.dev-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.dev-tab-content').forEach(c => c.classList.remove('active'));

    // 선택한 탭 활성화
    tab.classList.add('active');
    document.getElementById(`tab${targetTab.charAt(0).toUpperCase() + targetTab.slice(1)}`).classList.add('active');
  });
});

// ==================== 모바일 하단바 토글 ====================
const leftPanel = document.querySelector('.left-panel');
const panelHeader = document.querySelector('.panel-header');

// 모바일에서만 작동
if (window.innerWidth <= 768) {
  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  // 터치 시작
  panelHeader.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
    isDragging = true;
  });

  // 터치 이동
  panelHeader.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;

    // 위로 드래그하면 펼치기
    if (deltaY < -50) {
      leftPanel.classList.add('expanded');
    }
    // 아래로 드래그하면 접기
    else if (deltaY > 50) {
      leftPanel.classList.remove('expanded');
    }
  });

  // 터치 종료
  panelHeader.addEventListener('touchend', () => {
    isDragging = false;
  });

  // 헤더 클릭으로도 토글
  panelHeader.addEventListener('click', () => {
    leftPanel.classList.toggle('expanded');
  });
}

// 창 크기 변경 시 이벤트 리스너 재설정
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    leftPanel.classList.remove('expanded');
  }
});

// ==================== SVG 핀치 줌 ====================
const svgElement = document.getElementById('treeSvg');
let scale = 1;
let lastDistance = 0;

// 두 터치 포인트 사이의 거리 계산
function getDistance(touch1, touch2) {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// SVG 확대/축소
if (svgElement) {
  svgElement.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      lastDistance = getDistance(e.touches[0], e.touches[1]);
    }
  });

  svgElement.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const delta = currentDistance - lastDistance;

      // 확대/축소 비율 계산
      scale += delta * 0.01;
      scale = Math.max(0.5, Math.min(scale, 5)); // 0.5배 ~ 5배

      // SVG에 transform 적용
      svgElement.style.transform = `scale(${scale})`;
      svgElement.style.transformOrigin = 'center center';

      lastDistance = currentDistance;
    }
  });

  svgElement.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
      lastDistance = 0;
    }
  });
}

// ==================== 캔버스 팬(이동) 기능 ====================
const canvasContainer = document.querySelector('.canvas-container');
if (canvasContainer && svgElement) {
  let isPanning = false;
  let startX = 0;
  let startY = 0;
  let translateX = 0;
  let translateY = 0;

  canvasContainer.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isPanning = true;
      startX = e.touches[0].clientX - translateX;
      startY = e.touches[0].clientY - translateY;
    }
  });

  canvasContainer.addEventListener('touchmove', (e) => {
    if (isPanning && e.touches.length === 1) {
      e.preventDefault();
      translateX = e.touches[0].clientX - startX;
      translateY = e.touches[0].clientY - startY;

      svgElement.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    }
  });

  canvasContainer.addEventListener('touchend', () => {
    isPanning = false;
  });
}
