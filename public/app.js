// app.js - AI Shorts Generator 프론트엔드

// DOM 요소
const apiKeyInput = document.getElementById('apiKey');
const inputTextArea = document.getElementById('inputText');
const generateBtn = document.getElementById('generateBtn');
const sceneInfo = document.getElementById('sceneInfo');

// 캔버스
const treeSvg = document.getElementById('treeSvg');

// 노드 팝업
const nodePopup = document.getElementById('nodePopup');
const popupNodeName = document.getElementById('popupNodeName');
const popupContent = document.getElementById('popupContent');
const popupClose = document.getElementById('popupClose');

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

// 팝업 드래그 상태
let isPopupDragging = false;
let popupDragStartX = 0;
let popupDragStartY = 0;
let popupOffsetX = 0;
let popupOffsetY = 0;

// 초기 노드 템플릿 (실행 전 표시용)
const initialNodeTemplates = {
  root: {
    id: 'root',
    name: '[1층] Shorts 대본 생성',
    status: 'pending',
    model: 'gpt-3.5-turbo',
    systemMessage: '너는 Shorts 영상 대본 작가야. 사용자 입력을 바탕으로 흥미로운 Shorts 대본을 장면별로 작성해줘.',
    promptTemplate: `아래 내용을 바탕으로 30-60초 분량의 Shorts 영상 대본을 작성해줘.
각 장면은 5-10초 분량으로, 3-5개 장면으로 구성해줘.

입력 내용:
{input}

출력 형식 (반드시 "---"로 구분):
[장면1 대본 - 한두 문장으로 이 장면에서 말할 내용]
---
[장면2 대본 - 한두 문장으로 이 장면에서 말할 내용]
---
...`
  },
  planning: {
    name: '[2층] 자막 & 이미지 컨셉',
    status: 'pending',
    model: 'gpt-3.5-turbo',
    systemMessage: '너는 영상 연출 전문가야. 대본을 받아서 화면에 표시할 자막과 배경 이미지 컨셉을 만들어.',
    promptTemplate: `다음 장면의 대본을 바탕으로 자막과 이미지를 기획해줘:

장면 대본:
{parent}

출력 형식 (정확히 지켜줘):
첫 번째 줄: 화면에 표시할 자막 텍스트 (15자 이내, 핵심만 간결하게)
===IMAGE===
두 번째 부분: DALL-E 이미지 생성 프롬프트 (영문, vivid style, 9:16 portrait, 대본 내용을 시각적으로 표현)

예시:
AI가 바꾸는 미래
===IMAGE===
A futuristic cityscape with AI technology, holographic displays, robots and humans collaborating, vibrant colors, 9:16 portrait, vivid style, digital art`
  },
  image: {
    name: '[3층] 이미지 생성',
    status: 'pending',
    nodeType: 'dalle',
    promptTemplate: '{parent}',
    imageSize: '1024x1792',
    imageQuality: 'standard',
    imageStyle: 'vivid',
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

  // 3개 장면 예시
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
function getDynamicTreeConfig() {
  return {
    dynamicChildren: true,
    nodes: [
      {
        id: 'root',
        name: '[1층] Shorts 대본 생성',
        model: initialNodeTemplates.root.model || 'gpt-3.5-turbo',
        systemMessage: initialNodeTemplates.root.systemMessage,
        promptTemplate: initialNodeTemplates.root.promptTemplate,
        outputSeparator: '---'
      }
    ],
    nodeTemplates: {
      planning: {
        model: initialNodeTemplates.planning.model || 'gpt-3.5-turbo',
        systemMessage: initialNodeTemplates.planning.systemMessage,
        promptTemplate: initialNodeTemplates.planning.promptTemplate,
        outputSeparator: '===IMAGE==='
      },
      image: {
        nodeType: 'dalle',
        model: initialNodeTemplates.image.model || 'dall-e-3',
        promptTemplate: '{parent}',
        imageSize: initialNodeTemplates.image.imageSize || '1024x1792',
        imageQuality: initialNodeTemplates.image.imageQuality || 'standard',
        imageStyle: initialNodeTemplates.image.imageStyle || 'vivid'
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
    const executeResponse = await fetch('/api/tree/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: apiKey,
        initialInput: inputText,
        treeConfig: getDynamicTreeConfig()
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
function updateTreeVisualization(nodes, fromExecution = false) {
  if (!nodes || nodes.length === 0) return;

  const svg = treeSvg;
  while (svg.children.length > 1) {
    svg.removeChild(svg.lastChild);
  }

  // 팬 오프셋 적용
  svg.style.transform = `translate(${panOffsetX}px, ${panOffsetY}px)`;

  const layout = calculateTreeLayout(nodes);

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

  Object.keys(layers).sort().forEach((layerIdx, i) => {
    const layerNodes = layers[layerIdx];
    const layerWidth = layerNodes.length * (nodeWidth + horizontalGap) - horizontalGap;
    const startX = Math.max(50, (window.innerWidth - 350 - layerWidth) / 2);
    const y = 50 + i * (nodeHeight + verticalGap);

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

  return { nodes: layoutNodes, edges };
}

// ========== 노드 클릭 핸들러 ==========
function onNodeClick(node, event) {
  selectedNode = node;
  popupNodeName.textContent = node.name;

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
        <button class="btn-save-template" onclick="saveSystemMessage('${node.id}', '${getNodeLayer(node)}')">같은 층 전체 적용</button>
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
        <button class="btn-save-template" onclick="saveTemplate('${node.id}', '${getNodeLayer(node)}')">같은 층 전체 적용</button>
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

  // DALL-E 설정
  if (node.nodeType === 'dalle') {
    html += `<div class="popup-field">
      <span class="popup-field-label">DALL-E 설정</span>
      <div class="popup-field-value">
        크기: ${node.imageSize || '1024x1792'}<br>
        품질: ${node.imageQuality || 'standard'}<br>
        스타일: ${node.imageStyle || 'vivid'}
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

  popupContent.innerHTML = html;

  // 모델 select 박스 채우기
  if (!isExecuting && node.status === 'pending') {
    const nodeLayer = getNodeLayer(node);
    const selectElement = document.getElementById(`modelSelect_${node.id}`);

    if (selectElement) {
      populateModelSelect(selectElement, nodeLayer, node.model);
    }
  }

  // 팝업 위치 설정 (노드 옆에 표시)
  const rect = event.target.getBoundingClientRect();
  const popup = nodePopup;

  popup.style.display = 'flex';

  // 초기 위치 설정 (이전 드래그 오프셋 유지하지 않음)
  popupOffsetX = Math.min(rect.right + 20, window.innerWidth - 420);
  popupOffsetY = Math.max(100, rect.top);

  popup.style.left = popupOffsetX + 'px';
  popup.style.top = popupOffsetY + 'px';
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

  if (isPopupDragging) {
    popupOffsetX = e.clientX - popupDragStartX;
    popupOffsetY = e.clientY - popupDragStartY;
    nodePopup.style.left = popupOffsetX + 'px';
    nodePopup.style.top = popupOffsetY + 'px';
  }
});

window.addEventListener('mouseup', () => {
  if (isPanning) {
    isPanning = false;
    canvasViewport.classList.remove('dragging');
  }
  if (isPopupDragging) {
    isPopupDragging = false;
  }
});

// ========== 팝업 드래그 이벤트 ==========
nodePopup.addEventListener('mousedown', (e) => {
  // 헤더를 클릭했을 때만 드래그 시작
  if (e.target.closest('.node-popup-header') && !e.target.classList.contains('node-popup-close')) {
    isPopupDragging = true;
    popupDragStartX = e.clientX - popupOffsetX;
    popupDragStartY = e.clientY - popupOffsetY;
    e.preventDefault(); // 텍스트 선택 방지
  }
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
window.saveTemplate = function(nodeId, layer) {
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

  // 팝업 닫기
  nodePopup.style.display = 'none';

  alert('같은 층의 모든 노드에 적용되었습니다!');
};

// ========== 시스템 메시지 저장 (같은 층 전체 적용) ==========
window.saveSystemMessage = function(nodeId, layer) {
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

  // 팝업 닫기
  nodePopup.style.display = 'none';

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
  } else if (layer === 'audio') {
    initialNodeTemplates.audio.model = selectedModelId;
  }

  // 현재 표시된 노드들도 업데이트
  const initialNodes = createInitialNodes();
  updateTreeVisualization(initialNodes);

  alert(`✅ 모델이 ${selectedModelId}로 변경되었습니다!\n(같은 층의 모든 노드에 적용됨)`);
};

// ========== 이벤트 리스너 ==========
generateBtn.addEventListener('click', generateVideo);

popupClose.addEventListener('click', () => {
  nodePopup.style.display = 'none';
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

  // 초기 트리 표시
  const initialNodes = createInitialNodes();
  updateTreeVisualization(initialNodes);
});

apiKeyInput.addEventListener('change', () => {
  localStorage.setItem('openai_api_key', apiKeyInput.value);
});
