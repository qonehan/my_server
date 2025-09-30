// chatgpt-server.js
const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// JSON 요청 파싱
app.use(express.json());

// 정적 파일 제공
app.use(express.static('chatgpt-public'));

// 메인 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'chatgpt-public', 'index.html'));
});

// ChatGPT API 엔드포인트
app.post('/api/chat', async (req, res) => {
  try {
    const { message, apiKey } = req.body;

    if (!message) {
      return res.status(400).json({ error: '메시지가 필요합니다.' });
    }

    if (!apiKey) {
      return res.status(400).json({ error: 'API 키가 필요합니다.' });
    }

    // OpenAI API 호출
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API 에러:', error);
      return res.status(response.status).json({
        error: 'ChatGPT API 요청 실패',
        details: error
      });
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    res.json({ reply });

  } catch (error) {
    console.error('서버 에러:', error);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

app.listen(PORT, () => {
  console.log(`ChatGPT 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  console.log('OpenAI API 키가 설정되어 있는지 확인하세요: .env 파일에 OPENAI_API_KEY를 추가하세요.');
});