// server.js
const express = require('express');

const app = express();              // 서버 앱 만들기
const PORT = process.env.PORT || 3000; // 포트 번호 정하기(환경변수 없으면 3000)

app.get("/", (req, res) => {        // "/" 주소로 GET 요청이 오면
  res.send("Hello World");          // 글자 보내주기(응답)
});

app.listen(PORT, () => {            // 서버를 켠다(대기 시작)
  console.log(`Server on http://localhost:${PORT}`);
});
