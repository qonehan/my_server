// server.js
const express = require('express');
const http = require("http");
const { Server } = require('socket.io');
const path = require('path');

const app = express();              // 서버 앱 만들기
const server = http.createServer(app);   // express를 http 서버로 감쌈
const io = new Server(server);           // socket.io 서버 생성

const PORT = process.env.PORT || 80; // 포트 번호 정하기(환경변수 없으면 80)

app.use(express.static('public')); // public 안의 파일 접근 가능
app.get('/', (req, res) => {      // "/" 주소로 GET 요청이 오면
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});       


io.on("connection", (socket) => {
  console.log("새로운 유저 접속!");

  // 메시지 받기
  socket.on("chat message", (msg) => {
    console.log("메시지:", msg);

    // 모든 클라이언트에게 전송
    io.emit("chat message", msg);
  });

  // 연결 끊기 이벤트
  socket.on("disconnect", () => {
    console.log("유저 연결 해제");
  });
});


server.listen(PORT, () => {            // 서버를 켠다(대기 시작)
  console.log(`Server on http://localhost:${PORT}`);
});
