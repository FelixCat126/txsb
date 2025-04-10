/**
 * YOLOv8模型下载脚本
 * 
 * 本脚本帮助自动下载YOLOv8n的TensorFlow.js版本模型文件
 * 使用方法: node download-model.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// 模型文件URL (来自Hyuto/yolov8-tfjs的预转换模型)
const MODEL_URL = 'https://github.com/Hyuto/yolov8-tfjs/releases/download/yolov8n/model.json';
const WEIGHTS_URL_BASE = 'https://github.com/Hyuto/yolov8-tfjs/releases/download/yolov8n/';
const MODEL_DIR = path.resolve(__dirname);

// 确保目录存在
if (!fs.existsSync(MODEL_DIR)) {
  fs.mkdirSync(MODEL_DIR, { recursive: true });
}

// 下载文件函数
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`下载: ${url} -> ${outputPath}`);
    
    const file = fs.createWriteStream(outputPath);
    https.get(url, response => {
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', err => {
      fs.unlink(outputPath, () => {}); // 删除不完整的文件
      reject(err);
    });
  });
}

// 解析model.json以获取权重文件列表
async function downloadWeights(modelJson) {
  const modelData = JSON.parse(modelJson);
  const weightsManifest = modelData.weightsManifest;
  
  for (const manifest of weightsManifest) {
    for (const path of manifest.paths) {
      const weightsUrl = WEIGHTS_URL_BASE + path;
      const outputPath = MODEL_DIR + '/' + path;
      await downloadFile(weightsUrl, outputPath);
    }
  }
}

// 主函数
async function main() {
  try {
    // 下载model.json
    const modelJsonPath = path.join(MODEL_DIR, 'model.json');
    await downloadFile(MODEL_URL, modelJsonPath);
    
    // 读取model.json获取权重信息
    const modelJson = fs.readFileSync(modelJsonPath, 'utf8');
    
    // 下载权重文件
    await downloadWeights(modelJson);
    
    console.log('模型下载完成! 所有文件已保存至:', MODEL_DIR);
  } catch (error) {
    console.error('下载过程中发生错误:', error);
  }
}

// 执行主函数
main(); 