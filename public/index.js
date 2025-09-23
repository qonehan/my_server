// socket.io 클라이언트 객체 생성
const socket = io();

let currentNickname = '';

// DOM 요소들
const nicknameSection = document.querySelector("#nickname-section");
const chatSection = document.querySelector("#chat-section");
const nicknameInput = document.querySelector("#nickname");
const setNicknameBtn = document.querySelector("#set-nickname");
const changeNicknameBtn = document.querySelector("#change-nickname");
const currentNicknameSpan = document.querySelector("#current-nickname");
const messageInput = document.querySelector("#m");
const sendMsgBtn = document.querySelector("#send-msg");

// 닉네임 설정
function setNickname() {
  const nickname = nicknameInput.value.trim();
  if (nickname) {
    currentNickname = nickname;
    currentNicknameSpan.textContent = nickname;
    nicknameSection.style.display = "none";
    chatSection.style.display = "block";
    messageInput.focus();
  } else {
    alert("닉네임을 입력해주세요!");
  }
}

// 닉네임 변경
function changeNickname() {
  nicknameSection.style.display = "block";
  chatSection.style.display = "none";
  nicknameInput.value = currentNickname;
  nicknameInput.focus();
}

// 메시지 보내기
function sendMessage() {
  const msg = messageInput.value.trim();
  if (msg && currentNickname) {
    socket.emit("chat message", { nickname: currentNickname, message: msg });
    messageInput.value = "";
  }
}

// 이벤트 리스너들
setNicknameBtn.onclick = setNickname;
changeNicknameBtn.onclick = changeNickname;
sendMsgBtn.onclick = sendMessage;

// 엔터키로 닉네임 설정/메시지 전송
nicknameInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") setNickname();
});

messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

// 메시지 받기
socket.on("chat message", (data) => {
  const li = document.createElement("li");
  li.innerHTML = `<strong>${data.nickname}:</strong> ${data.message} <small style="color: #888;">${data.timestamp}</small>`;
  li.style.marginBottom = "5px";
  li.style.padding = "3px";
  document.querySelector("#messages").appendChild(li);

  // 스크롤을 맨 아래로
  const messages = document.querySelector("#messages");
  messages.scrollTop = messages.scrollHeight;
});

console.log("실시간 채팅 클라이언트 로드됨!")