// FileManager.js - 파일 다운로드 및 관리

const fs = require('fs');
const path = require('path');

class FileManager {
  constructor() {
    this.baseDir = path.join(__dirname, '..', 'generated');
    this.imagesDir = path.join(this.baseDir, 'images');
    this.audioDir = path.join(this.baseDir, 'audio');

    // 디렉토리 생성
    this.ensureDirectories();
  }

  /**
   * 필요한 디렉토리 생성
   */
  ensureDirectories() {
    [this.baseDir, this.imagesDir, this.audioDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 디렉토리 생성: ${dir}`);
      }
    });
  }

  /**
   * URL에서 이미지 다운로드
   */
  async downloadImage(imageUrl, filename) {
    try {
      console.log(`⬇️  이미지 다운로드 중: ${filename}`);

      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`이미지 다운로드 실패: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const filePath = path.join(this.imagesDir, filename);

      fs.writeFileSync(filePath, Buffer.from(buffer));
      console.log(`✅ 이미지 저장 완료: ${filePath}`);

      return filePath;

    } catch (error) {
      console.error(`❌ 이미지 다운로드 실패: ${filename}`, error.message);
      throw error;
    }
  }

  /**
   * 오디오 파일 저장
   */
  async saveAudio(audioBuffer, filename) {
    try {
      const filePath = path.join(this.audioDir, filename);
      fs.writeFileSync(filePath, audioBuffer);
      console.log(`✅ 오디오 저장 완료: ${filePath}`);
      return filePath;

    } catch (error) {
      console.error(`❌ 오디오 저장 실패: ${filename}`, error.message);
      throw error;
    }
  }

  /**
   * 파일명 생성 (executionId_nodeId_timestamp.확장자)
   */
  generateFilename(executionId, nodeId, extension) {
    const timestamp = Date.now();
    return `${executionId}_${nodeId}_${timestamp}.${extension}`;
  }

  /**
   * 오래된 파일 정리 (24시간 이상)
   */
  cleanupOldFiles(maxAgeHours = 24) {
    const maxAge = maxAgeHours * 60 * 60 * 1000; // 밀리초
    const now = Date.now();
    let deletedCount = 0;

    [this.imagesDir, this.audioDir].forEach(dir => {
      if (!fs.existsSync(dir)) return;

      const files = fs.readdirSync(dir);

      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtimeMs;

        if (fileAge > maxAge) {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`🗑️  오래된 파일 삭제: ${file}`);
        }
      });
    });

    if (deletedCount > 0) {
      console.log(`✅ 총 ${deletedCount}개 파일 정리 완료`);
    }

    return deletedCount;
  }

  /**
   * 특정 실행 ID의 모든 파일 삭제
   */
  deleteExecutionFiles(executionId) {
    let deletedCount = 0;

    [this.imagesDir, this.audioDir].forEach(dir => {
      if (!fs.existsSync(dir)) return;

      const files = fs.readdirSync(dir);

      files.forEach(file => {
        if (file.startsWith(executionId)) {
          const filePath = path.join(dir, file);
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      });
    });

    console.log(`🗑️  실행 ID ${executionId}의 파일 ${deletedCount}개 삭제`);
    return deletedCount;
  }

  /**
   * 디스크 사용량 조회
   */
  getDiskUsage() {
    let totalSize = 0;
    let fileCount = 0;

    [this.imagesDir, this.audioDir].forEach(dir => {
      if (!fs.existsSync(dir)) return;

      const files = fs.readdirSync(dir);

      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
        fileCount++;
      });
    });

    return {
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      fileCount
    };
  }

  /**
   * 파일 존재 확인
   */
  fileExists(filePath) {
    return fs.existsSync(filePath);
  }

  /**
   * 상대 경로를 절대 경로로 변환
   */
  getAbsolutePath(relativePath) {
    return path.resolve(this.baseDir, relativePath);
  }
}

module.exports = FileManager;
