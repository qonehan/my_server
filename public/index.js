// socket.io 클라이언트 객체 생성
const socket = io();


// 메시지 보내기
document.querySelector("button").onclick = () => {
  const msg = document.querySelector("#m").value;
  socket.emit("chat message", msg);
  document.querySelector("#m").value = "";
};


// 메시지 받기
socket.on("chat message", (msg) => {
  const li = document.createElement("li");
  li.textContent = msg;
  document.querySelector("#messages").appendChild(li);
});


console.log("my server!!")