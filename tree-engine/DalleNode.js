// DalleNode.js - DALL-E 이미지 생성 전용 노드

const TreeNode = require('./TreeNode');

class DalleNode extends TreeNode {
  constructor(config) {
    super(config);

    // DALL-E 전용 설정
    this.imageSize = config.imageSize || '1024x1792'; // 9:16 비율 (Shorts용)
    this.imageQuality = config.imageQuality || 'standard'; // standard, hd
    this.imageStyle = config.imageStyle || 'vivid'; // vivid, natural

    // 생성된 이미지 정보
    this.imageUrl = null;
    this.imagePath = null;
    this.revisedPrompt = null; // DALL-E가 수정한 프롬프트
  }

  /**
   * DALL-E는 구분자 없이 단일 이미지 URL 저장
   */
  parseOutput(rawOutput) {
    // rawOutput은 이미지 URL 또는 경로
    this.output = rawOutput;
    this.imageUrl = rawOutput;
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
      nodeType: 'dalle',
      imageSize: this.imageSize,
      imageQuality: this.imageQuality,
      imageStyle: this.imageStyle,
      imageUrl: this.imageUrl,
      imagePath: this.imagePath,
      revisedPrompt: this.revisedPrompt
    };
  }
}

module.exports = DalleNode;
