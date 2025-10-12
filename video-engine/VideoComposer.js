// VideoComposer.js - FFmpeg를 사용한 영상 합성

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

class VideoComposer {
  constructor() {
    this.outputDir = path.join(__dirname, '..', 'generated', 'videos');
    this.ensureDirectory();
  }

  /**
   * 출력 디렉토리 생성
   */
  ensureDirectory() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * 장면 데이터로부터 Shorts 영상 생성
   * @param {Array} scenes - [{imagePath, audioPath, subtitle, duration}]
   * @param {String} executionId - 실행 ID
   * @returns {Promise<String>} - 생성된 영상 경로
   */
  async composeVideo(scenes, executionId) {
    try {
      console.log(`\n🎬 영상 합성 시작 (${scenes.length}개 장면)`);

      // 출력 파일 경로
      const outputFilename = `${executionId}_${Date.now()}.mp4`;
      const outputPath = path.join(this.outputDir, outputFilename);

      // 1단계: 각 장면을 개별 영상으로 변환 (이미지 + 오디오)
      const scenePaths = [];
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        console.log(`  [장면 ${i + 1}/${scenes.length}] 처리 중...`);

        const scenePath = await this.createScene(scene, i, executionId);
        scenePaths.push(scenePath);
      }

      // 2단계: 모든 장면을 하나로 연결
      console.log(`  🔗 장면 연결 중...`);
      await this.concatenateScenes(scenePaths, outputPath);

      // 3단계: 임시 파일 정리
      scenePaths.forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });

      console.log(`✅ 영상 합성 완료: ${outputPath}\n`);
      return outputPath;

    } catch (error) {
      console.error('❌ 영상 합성 실패:', error.message);
      throw error;
    }
  }

  /**
   * 개별 장면 생성 (이미지 + 오디오 + 자막)
   */
  async createScene(scene, index, executionId) {
    return new Promise((resolve, reject) => {
      const tempPath = path.join(this.outputDir, `${executionId}_scene${index}_temp.mp4`);

      let command = ffmpeg();

      // 이미지 입력 (정지 이미지를 영상으로)
      if (scene.imagePath && fs.existsSync(scene.imagePath)) {
        command.input(scene.imagePath)
          .loop(scene.duration || 5); // 이미지 반복 재생
      } else {
        // 이미지 없으면 검은 화면
        command.input('color=c=black:s=1080x1920:d=' + (scene.duration || 5))
          .inputFormat('lavfi');
      }

      // 오디오 입력
      if (scene.audioPath && fs.existsSync(scene.audioPath)) {
        command.input(scene.audioPath);
      }

      // 영상 설정
      command
        .videoCodec('libx264')
        .size('1080x1920') // 9:16 비율 (Shorts)
        .fps(30)
        .duration(scene.duration || 5);

      // 자막 추가
      if (scene.subtitle) {
        const subtitle = scene.subtitle.replace(/'/g, "\\'"); // 작은따옴표 이스케이프
        command.videoFilters([
          {
            filter: 'drawtext',
            options: {
              text: subtitle,
              fontfile: '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',
              fontsize: 48,
              fontcolor: 'white',
              x: '(w-text_w)/2',
              y: 'h-200',
              borderw: 3,
              bordercolor: 'black'
            }
          }
        ]);
      }

      // 출력
      command
        .output(tempPath)
        .on('start', (commandLine) => {
          console.log(`    FFmpeg 명령: ${commandLine.substring(0, 100)}...`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            process.stdout.write(`\r    진행률: ${progress.percent.toFixed(1)}%`);
          }
        })
        .on('end', () => {
          console.log(`\n    ✅ 장면 ${index + 1} 완료`);
          resolve(tempPath);
        })
        .on('error', (err) => {
          console.error(`\n    ❌ 장면 ${index + 1} 실패:`, err.message);
          reject(err);
        })
        .run();
    });
  }

  /**
   * 여러 장면을 하나의 영상으로 연결
   */
  async concatenateScenes(scenePaths, outputPath) {
    return new Promise((resolve, reject) => {
      // concat.txt 파일 생성
      const concatFile = path.join(this.outputDir, `concat_${Date.now()}.txt`);
      const concatContent = scenePaths.map(p => `file '${p}'`).join('\n');
      fs.writeFileSync(concatFile, concatContent);

      ffmpeg()
        .input(concatFile)
        .inputOptions(['-f concat', '-safe 0'])
        .videoCodec('copy')
        .audioCodec('copy')
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log(`    FFmpeg concat: ${commandLine.substring(0, 100)}...`);
        })
        .on('end', () => {
          // concat 파일 삭제
          if (fs.existsSync(concatFile)) {
            fs.unlinkSync(concatFile);
          }
          console.log(`    ✅ 영상 연결 완료`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error(`    ❌ 영상 연결 실패:`, err.message);
          reject(err);
        })
        .run();
    });
  }

  /**
   * 간단한 테스트용: 이미지만으로 영상 생성
   */
  async createSimpleVideo(imagePath, duration = 5, outputFilename) {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(this.outputDir, outputFilename);

      ffmpeg(imagePath)
        .loop(duration)
        .videoCodec('libx264')
        .size('1080x1920')
        .fps(30)
        .duration(duration)
        .output(outputPath)
        .on('end', () => {
          console.log(`✅ 간단 영상 생성 완료: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error(`❌ 영상 생성 실패:`, err.message);
          reject(err);
        })
        .run();
    });
  }
}

module.exports = VideoComposer;
