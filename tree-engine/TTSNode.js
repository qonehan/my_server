// TTSNode.js - OpenAI TTS 음성 생성 전용 노드

const TreeNode = require('./TreeNode');

class TTSNode extends TreeNode {
  constructor(config) {
    super(config);

    // TTS 전용 설정
    this.ttsModel = config.ttsModel || 'tts-1'; // tts-1, tts-1-hd
    this.voice = config.voice || 'alloy'; // alloy, echo, fable, onyx, nova, shimmer
    this.speed = config.speed || 1.0; // 0.25 ~ 4.0
    this.format = config.format || 'mp3'; // mp3, opus, aac, flac

    // 생성된 오디오 정보
    this.audioPath = null;
    this.audioDuration = null; // 초 단위
  }

  /**
   * TTS는 구분자 없이 단일 오디오 경로 저장
   */
  parseOutput(rawOutput) {
    // rawOutput은 오디오 파일 경로
    this.output = rawOutput;
    this.audioPath = rawOutput;
    this.outputArray = [rawOutput]; // 배열 형태로도 저장 (호환성)
    return this.outputArray;
  }

  /**
   * JSON 직렬화 (부모 메서드 오버라이드)
   */
  toJSON() {
    const baseJSON = super.toJSON();
    return {
      ...baseJSON,
      nodeType: 'tts',
      ttsModel: this.ttsModel,
      voice: this.voice,
      speed: this.speed,
      format: this.format,
      audioPath: this.audioPath,
      audioDuration: this.audioDuration
    };
  }
}

module.exports = TTSNode;
