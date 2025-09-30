// DOM 요소
const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const loading = document.getElementById('loading');
const apiKeySetup = document.getElementById('api-key-setup');
const chatContainer = document.getElementById('chat-container');
const inputArea = document.querySelector('.input-area');
const apiKeyInput = document.getElementById('api-key-input');
const saveApiKeyBtn = document.getElementById('save-api-key-btn');
const settingsBtn = document.getElementById('settings-btn');

// API 키 저장
let apiKey = localStorage.getItem('openai_api_key');

// 페이지 로드 시
window.addEventListener('load', () => {
  if (apiKey) {
    showChatInterface();
    addMessage('안녕하세요! 무엇을 도와드릴까요?', false);
  } else {
    showApiKeySetup();
  }
});

// API 키 설정 화면 표시
function showApiKeySetup() {
  apiKeySetup.style.display = 'flex';
  chatContainer.style.display = 'none';
  inputArea.style.display = 'none';
  apiKeyInput.focus();
}

// 채팅 인터페이스 표시
function showChatInterface() {
  apiKeySetup.style.display = 'none';
  chatContainer.style.display = 'block';
  inputArea.style.display = 'flex';
  userInput.focus();
}

// API 키 저장 버튼
saveApiKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();

  if (!key) {
    alert('API 키를 입력해주세요!');
    return;
  }

  if (!key.startsWith('sk-')) {
    alert('올바른 OpenAI API 키 형식이 아닙니다. (sk-로 시작해야 합니다)');
    return;
  }

  apiKey = key;
  localStorage.setItem('openai_api_key', key);
  apiKeyInput.value = '';

  showChatInterface();
  addMessage('안녕하세요! 무엇을 도와드릴까요?', false);
});

// API 키 입력창에서 엔터키
apiKeyInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    saveApiKeyBtn.click();
  }
});

// 설정 버튼 (API 키 변경)
settingsBtn.addEventListener('click', () => {
  if (confirm('API 키를 변경하시겠습니까? 현재 대화 내용은 유지됩니다.')) {
    showApiKeySetup();
  }
});

// 메시지 추가 함수
function addMessage(text, isUser = false) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message');
  messageDiv.classList.add(isUser ? 'user-message' : 'ai-message');

  const avatar = document.createElement('div');
  avatar.classList.add('avatar');
  avatar.textContent = isUser ? '👤' : '🤖';

  const content = document.createElement('div');
  content.classList.add('message-content');
  content.textContent = text;

  messageDiv.appendChild(avatar);
  messageDiv.appendChild(content);
  messagesContainer.appendChild(messageDiv);

  // 스크롤을 최하단으로
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ChatGPT API 호출
async function sendMessage() {
  const message = userInput.value.trim();

  if (!message) {
    alert('메시지를 입력해주세요!');
    return;
  }

  // 사용자 메시지 표시
  addMessage(message, true);

  // 입력창 초기화 및 비활성화
  userInput.value = '';
  userInput.disabled = true;
  sendBtn.disabled = true;
  loading.style.display = 'block';

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        apiKey
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '서버 응답 오류');
    }

    const data = await response.json();

    // AI 응답 표시
    addMessage(data.reply, false);

  } catch (error) {
    console.error('에러:', error);
    addMessage(`오류가 발생했습니다: ${error.message}`, false);
  } finally {
    // 입력창 활성화
    userInput.disabled = false;
    sendBtn.disabled = false;
    loading.style.display = 'none';
    userInput.focus();
  }
}

// 이벤트 리스너
sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keydown', (e) => {
  // Shift + Enter는 줄바꿈, Enter만 누르면 전송
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});