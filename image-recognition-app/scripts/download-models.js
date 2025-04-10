/**
 * 模型下载脚本 - 真实YOLOv8模型版本
 * 此脚本用于自动下载图像识别应用所需的真实YOLOv8预训练模型
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// 模型来源列表（按优先级排序）
const MODEL_SOURCES = [
  {
    name: 'HuggingFace CDN',
    modelJson: 'https://huggingface.co/Hyuto/yolov8-tfjs/resolve/main/yolov8n/model.json',
    weightsBase: 'https://huggingface.co/Hyuto/yolov8-tfjs/resolve/main/yolov8n/',
    weightsPattern: ['group1-shard1of4.bin', 'group1-shard2of4.bin', 'group1-shard3of4.bin', 'group1-shard4of4.bin']
  },
  {
    name: 'UNPKG CDN',
    modelJson: 'https://unpkg.com/@tensorflow-models/coco-ssd@2.2.2/dist/model.json',
    weightsBase: 'https://unpkg.com/@tensorflow-models/coco-ssd@2.2.2/dist/',
    weightsPattern: ['group1-shard1of6', 'group1-shard2of6', 'group1-shard3of6', 'group1-shard4of6', 'group1-shard5of6', 'group1-shard6of6'] 
  },
  {
    name: 'TensorFlow Hub',
    modelJson: 'https://tfhub.dev/tensorflow/tfjs-model/ssd_mobilenet_v2/1/default/1/model.json',
    weightsBase: 'https://tfhub.dev/tensorflow/tfjs-model/ssd_mobilenet_v2/1/default/1/',
    weightsPattern: ['group1-shard1of15.bin', 'group1-shard2of15.bin', 'group1-shard3of15.bin']
  }
];

const OUTPUT_DIR = path.resolve(__dirname, '../public/models/yolov8n_web_model');

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`创建目录: ${OUTPUT_DIR}`);
}

// 下载文件函数
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const filename = path.basename(outputPath);
    console.log(`下载: ${filename}...`);
    
    // 选择http或https模块
    const client = url.startsWith('https') ? https : http;
    
    const file = fs.createWriteStream(outputPath);
    const request = client.get(url, response => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // 处理重定向
        console.log(`重定向到: ${response.headers.location}`);
        file.close();
        fs.unlink(outputPath, () => {});
        return downloadFile(response.headers.location, outputPath)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(outputPath, () => {}); // 删除不完整的文件
        reject(new Error(`下载失败，HTTP状态码: ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✓ 完成: ${filename}`);
        resolve();
      });
      
      file.on('error', err => {
        fs.unlink(outputPath, () => {}); // 删除不完整的文件
        reject(err);
      });
    });
    
    // 设置请求超时
    request.setTimeout(30000, () => {
      request.abort();
      file.close();
      fs.unlink(outputPath, () => {});
      reject(new Error('请求超时'));
    });
    
    request.on('error', err => {
      fs.unlink(outputPath, () => {}); // 删除不完整的文件
      console.error(`× 错误: ${filename} - ${err.message}`);
      reject(err);
    });
  });
}

// 修复model.json中的路径
function fixModelJson(modelJsonPath, source) {
  try {
    // 读取model.json文件
    const modelJson = JSON.parse(fs.readFileSync(modelJsonPath, 'utf8'));
    
    // 修改权重文件路径，保证它们只包含文件名而不包含路径
    if (modelJson.weightsManifest) {
      modelJson.weightsManifest.forEach(manifest => {
        if (manifest.paths) {
          manifest.paths = manifest.paths.map(path => {
            // 只保留文件名
            return path.split('/').pop();
          });
        }
      });
    }
    
    // 写回修复后的文件
    fs.writeFileSync(modelJsonPath, JSON.stringify(modelJson, null, 2));
    console.log('✓ 修复: model.json 中的路径');
    
    return true;
  } catch (error) {
    console.error('× 修复model.json失败:', error.message);
    return false;
  }
}

// 获取可用的预训练对象检测模型
async function downloadPretrainedModel() {
  for (const source of MODEL_SOURCES) {
    console.log(`尝试从 ${source.name} 下载模型...`);
    
    try {
      // 下载model.json
      const modelJsonPath = path.join(OUTPUT_DIR, 'model.json');
      await downloadFile(source.modelJson, modelJsonPath);
      
      // 修复model.json中的路径
      fixModelJson(modelJsonPath, source);
      
      // 解析model.json获取权重文件信息
      const modelJsonContent = fs.readFileSync(modelJsonPath, 'utf8');
      const modelData = JSON.parse(modelJsonContent);
      
      // 收集所有权重文件路径
      const weightFiles = [];
      if (modelData.weightsManifest) {
        for (const manifest of modelData.weightsManifest) {
          weightFiles.push(...manifest.paths);
        }
      } else {
        // 如果无法从model.json获取权重文件列表，使用预定义的模式
        weightFiles.push(...source.weightsPattern);
      }
      
      // 下载所有权重文件
      console.log(`开始下载 ${weightFiles.length} 个权重文件...`);
      
      const downloadPromises = weightFiles.map(weightFile => {
        const filename = path.basename(weightFile);
        const weightUrl = weightFile.startsWith('http') ? 
          weightFile : `${source.weightsBase}${filename}`;
        return downloadFile(weightUrl, path.join(OUTPUT_DIR, filename))
          .catch(error => {
            console.error(`下载 ${filename} 失败:`, error.message);
            throw error;
          });
      });
      
      await Promise.all(downloadPromises);
      
      console.log(`\n✅ 从 ${source.name} 成功下载模型文件！`);
      return true;
    } catch (error) {
      console.error(`\n❌ 从 ${source.name} 下载失败:`, error.message);
      console.log('尝试下一个来源...\n');
    }
  }
  
  return false;
}

// 创建模拟模型
function createMockModelJSON() {
  const modelJSON = {
    "format": "graph-model",
    "generatedBy": "TensorFlow.js Converter",
    "convertedBy": "TensorFlow.js Converter v3.18.0",
    "modelTopology": {
      "node": [
        {
          "name": "input",
          "op": "Placeholder",
          "attr": {
            "dtype": {
              "type": "DT_FLOAT"
            },
            "shape": {
              "shape": {
                "dim": [
                  {
                    "size": "1"
                  },
                  {
                    "size": "640"
                  },
                  {
                    "size": "640"
                  },
                  {
                    "size": "3"
                  }
                ]
              }
            }
          }
        },
        {
          "name": "output",
          "op": "Identity",
          "input": [
            "input"
          ],
          "attr": {
            "T": {
              "type": "DT_FLOAT"
            }
          }
        }
      ]
    },
    "signature": {
      "inputs": {
        "input": {
          "name": "input:0",
          "dtype": "DT_FLOAT",
          "tensorShape": {
            "dim": [
              {
                "size": "1"
              },
              {
                "size": "640"
              },
              {
                "size": "640"
              },
              {
                "size": "3"
              }
            ]
          }
        }
      },
      "outputs": {
        "output": {
          "name": "output:0",
          "dtype": "DT_FLOAT",
          "tensorShape": {
            "dim": [
              {
                "size": "1"
              },
              {
                "size": "8400"
              },
              {
                "size": "84"
              }
            ]
          }
        }
      }
    }
  };

  // 创建一个假的权重文件
  const weights = new Uint8Array(1024);
  for (let i = 0; i < weights.length; i++) {
    weights[i] = Math.floor(Math.random() * 256);
  }

  // 写入model.json
  fs.writeFileSync(path.join(OUTPUT_DIR, 'model.json'), JSON.stringify(modelJSON, null, 2));
  console.log('✓ 创建: model.json');

  // 写入权重文件
  fs.writeFileSync(path.join(OUTPUT_DIR, 'weights.bin'), weights);
  console.log('✓ 创建: weights.bin');
}

// 下载本地转换的YOLOv8模型（如果存在）
async function copyLocalModel() {
  const localModelPath = path.resolve(__dirname, '../local_models/yolov8n_web_model');
  
  if (fs.existsSync(localModelPath)) {
    console.log('发现本地预转换模型，复制到目标目录...');
    
    try {
      // 复制所有文件
      const files = fs.readdirSync(localModelPath);
      for (const file of files) {
        const sourcePath = path.join(localModelPath, file);
        const destPath = path.join(OUTPUT_DIR, file);
        
        fs.copyFileSync(sourcePath, destPath);
        console.log(`✓ 复制: ${file}`);
      }
      
      console.log('\n✅ 成功复制本地模型文件！');
      return true;
    } catch (error) {
      console.error('复制本地模型失败:', error.message);
      return false;
    }
  }
  
  return false;
}

// 主函数
async function main() {
  console.log('开始准备真实YOLOv8模型文件...');
  
  try {
    // 首先尝试复制本地模型（如果存在）
    const localSuccess = await copyLocalModel();
    if (localSuccess) return;
    
    // 然后尝试从在线来源下载
    const downloadSuccess = await downloadPretrainedModel();
    if (downloadSuccess) return;
    
    // 如果所有下载尝试都失败，使用模拟模型
    console.log('\n⚠️ 所有下载尝试都失败，创建模拟模型文件...');
    createMockModelJSON();
    
    console.log('\n✅ 模型文件准备成功!');
    console.log('提示：由于无法下载真实模型，正在使用模拟版本。');
    console.log('如需使用真实模型，请手动下载并放入 public/models/yolov8n_web_model/ 目录。');
  } catch (error) {
    console.error('\n❌ 处理过程中发生错误:', error.message);
    
    // 创建基本的模型文件，以确保应用至少能启动
    try {
      createMockModelJSON();
      console.log('\n✅ 已创建基本的模型文件!');
    } catch (e) {
      console.error('创建模拟模型文件失败:', e);
      process.exit(1);
    }
  }
}

// 执行主函数
main(); 