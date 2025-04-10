<template>
  <div class="object-detection">
    <h2>智能图像识别</h2>
    
    <!-- 添加错误提示区域 -->
    <div v-if="modelStatus === 'error'" class="error-message">
      <div class="error-icon">!</div>
      <div class="error-text">{{ modelError }}</div>
      <button @click="loadModel" class="retry-button">重试加载</button>
    </div>
    
    <div class="content-container">
      <!-- 左侧：图像上传和原始图像显示 -->
      <div class="original-image-section">
        <h3>上传图像</h3>
        <div class="upload-area" @click="triggerFileUpload" 
             @dragover.prevent 
             @drop.prevent="onFileDrop">
          <input type="file" ref="fileInput" @change="onFileSelected" accept="image/*" style="display: none">
          <div v-if="!originalImageUrl" class="upload-placeholder">
            <div class="upload-icon">+</div>
            <div class="upload-text">点击上传图片或拖拽图片到此区域</div>
            <div class="upload-hint">支持 .jpg、.jpeg、.png 格式</div>
          </div>
          <div v-else class="image-preview-container">
            <img :src="originalImageUrl" class="preview-image">
          </div>
        </div>
        <div class="file-info" v-if="currentFile">
          <div class="filename">文件名: {{ currentFile.name }}</div>
          <div class="filesize">大小: {{ formatFileSize(currentFile.size) }}</div>
        </div>
      </div>
      
      <!-- 右侧：匹配图像和识别结果 -->
      <div class="matched-image-section" v-if="matchedImageUrl">
        <h3>图像分析</h3>
        <div class="matched-image-container">
          <img :src="matchedImageUrl" ref="matchedImageEl" @load="onMatchedImageLoad" class="matched-image">
          <canvas ref="detectionCanvas" class="detection-overlay" v-if="detections.length > 0"></canvas>
          
          <!-- GIS信息覆盖层，只在分析前显示 -->
          <div class="gis-overlay" v-if="!detections.length && geoInfo.locationName">
            <div class="gis-data-compact" :class="{ 'real-gps': geoInfo.isRealGPS }">
              <div class="gps-badge" v-if="geoInfo.isRealGPS">真实GPS</div>
              <div class="gps-badge simulated" v-else>模拟GPS</div>
              <div><strong>{{ geoInfo.locationName }}</strong></div>
              <div>纬度: {{ geoInfo.latitude.toFixed(4) }}</div>
              <div>经度: {{ geoInfo.longitude.toFixed(4) }}</div>
              <div v-if="geoInfo.timestamp">时间: {{ geoInfo.timestamp }}</div>
            </div>
          </div>
        </div>
        
        <div class="controls-bar">
          <button @click="detectObjects" class="detect-btn" :disabled="!matchedImageLoaded || isProcessing">
            <span v-if="isProcessing">处理中...</span>
            <span v-else>分析图像</span>
          </button>
          <button @click="clearResults" class="clear-btn" :disabled="!matchedImageLoaded || isProcessing">
            清除结果
          </button>
        </div>
      </div>
    </div>
    
    <!-- 识别结果 -->
    <div class="results-section" v-if="detections.length > 0">
      <h3>识别结果</h3>
      <div class="detection-stats">
        <div class="stat">检测到物体: <strong>{{ detections.length }}</strong></div>
        <div class="stat">处理时间: <strong>{{ processingTime }}ms</strong></div>
      </div>
      
      <div class="detections-list">
        <div v-for="(detection, index) in detections" :key="index" class="detection-item"
             :style="{borderColor: getClassColor(detection.class)}">
          <div class="detection-type" :style="{backgroundColor: getClassColor(detection.class)}">
            {{ getClassName(detection.class) }}
          </div>
          <div class="detection-confidence">
            置信度: {{ (detection.confidence * 100).toFixed(1) }}%
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as tf from '@tensorflow/tfjs';
import TFObjectDetection from '../utils/TFObjectDetection';
import ImageProcessor from '../utils/ImageProcessor';

// 地标描述
const LANDMARK_DESCRIPTIONS = {
  '城市广场': '城市中心的主要公共广场，周围有多个重要的地标建筑和购物区',
  '滨水区': '沿河岸的著名地标区域，可以欣赏到城市天际线的壮丽景色',
  '金融中心': '城市金融和商业中心，拥有诸多摩天大楼',
  '古典园林': '传统风格的古典园林，周围是传统的商业区和美食街',
  '文化街区': '保留历史建筑特色的时尚休闲区，融合了传统与现代元素',
  '商业区': '城市主要的商业和文化区域之一，拥有多个大型购物中心',
  '历史寺庙': '具有悠久历史的古寺，现为城市中心的著名宗教场所，周围是高档商业区',
  '步行商业街': '城市最繁华的商业步行街，拥有众多百年老店和现代购物中心',
  '中央车站': '城市的主要铁路枢纽，连接全国各大城市',
  '交通枢纽': '集机场、火车站、地铁、长途汽车于一体的综合交通枢纽',
  '国际机场': '城市主要的国际机场，位于城市东部',
  '主题公园': '大型主题乐园，拥有众多游乐设施和表演',
  '中央公园': '城市的大型城市公园，面积约140公顷'
};

// COCO数据集类别
const CLASS_NAMES = [
  '人', '自行车', '汽车', '摩托车', '飞机', '公交车', '火车', '卡车', '船',
  '红绿灯', '消防栓', '停止标志', '停车计时器', '长凳', '鸟', '猫', '狗',
  '马', '羊', '牛', '大象', '熊', '斑马', '长颈鹿', '背包', '雨伞', '手提包',
  '领带', '行李箱', '飞盘', '滑雪板', '滑雪板', '运动球', '风筝', '棒球棒',
  '棒球手套', '滑板', '冲浪板', '网球拍', '瓶子', '酒杯', '杯子', '叉子',
  '刀', '勺子', '碗', '香蕉', '苹果', '三明治', '橙子', '西兰花', '胡萝卜',
  '热狗', '披萨', '甜甜圈', '蛋糕', '椅子', '沙发', '树木', '床', '餐桌',
  '厕所', '电视', '笔记本电脑', '鼠标', '遥控器', '键盘', '手机', '微波炉',
  '烤箱', '烤面包机', '水槽', '冰箱', '书', '钟', '花瓶', '剪刀', '泰迪熊',
  '吹风机', '牙刷'
];

export default {
  name: 'ObjectDetection',
  data() {
    return {
      model: null,
      originalImageUrl: null,
      matchedImageUrl: null,
      matchedImageLoaded: false,
      isProcessing: false,
      modelStatus: 'not-loaded', // 'not-loaded', 'loading', 'ready', 'error'
      loadingProgress: 0,
      detections: [],
      processingTime: 0,
      currentFile: null,
      geoInfo: {
        locationName: '',
        latitude: 0,
        longitude: 0,
        isRealGPS: false,
        timestamp: null
      },
      classColors: null,
      modelError: null,
      sceneAnalysis: null
    }
  },
  async mounted() {
    try {
      // 初始化TensorFlow.js
      await tf.ready();
      console.log('TensorFlow.js已就绪');
      console.log('支持的后端:', tf.engine().registeredBackends); 
      
      // 设置WebGL后端为优先选择
      await tf.setBackend('webgl');
      console.log('使用后端:', tf.getBackend());
      
      // 为每个类别生成随机颜色
      this.generateColors();
      
      // 加载模型
      await this.loadModel();
    } catch (error) {
      console.error('初始化错误:', error);
      this.modelError = error.message;
      this.modelStatus = 'error';
    }
  },
  methods: {
    // 生成随机颜色
    generateColors() {
      this.classColors = CLASS_NAMES.map(() => {
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 70%, 50%)`;
      });
    },
    
    // 获取类别名称
    getClassName(classId) {
      return CLASS_NAMES[classId] || '建筑物';
    },
    
    // 获取类别颜色
    getClassColor(classId) {
      return this.classColors[classId] || '#ccc';
    },
    
    // 获取地标描述
    getLandmarkDescription(name) {
      return LANDMARK_DESCRIPTIONS[name] || '著名地标';
    },
    
    // 加载模型 - 使用TFObjectDetection模型
    async loadModel() {
      this.modelStatus = 'loading';
      this.modelError = null;
      
      try {
        // 初始化模型
        this.model = new TFObjectDetection();
        
        // 添加重试逻辑
        let retryCount = 0;
        const maxRetries = 2;
        
        while (retryCount <= maxRetries) {
          try {
            // 使用新的 loadModel 方法
            const success = await this.model.loadModel();
            if (success) {
              this.modelStatus = 'ready';
              console.log('模型加载成功');
              return;
            } else {
              throw new Error('模型加载失败，返回了失败状态');
            }
          } catch (error) {
            retryCount++;
            if (retryCount <= maxRetries) {
              console.log(`模型加载失败，尝试重试 (${retryCount}/${maxRetries})...`);
              // 等待2秒后重试
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
              throw error; // 所有重试都失败，抛出错误
            }
          }
        }
      } catch (error) {
        console.error('加载模型时出错:', error);
        this.modelError = `加载模型失败: ${error.message}。请检查网络连接并刷新页面重试。`;
        this.modelStatus = 'error';
      }
    },
    
    // 触发文件上传
    triggerFileUpload() {
      if (this.$refs.fileInput) {
        this.$refs.fileInput.click();
      }
    },
    
    // 文件拖放处理
    onFileDrop(e) {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.handleFile(files[0]);
      }
    },
    
    // 文件选择处理
    onFileSelected(e) {
      const files = e.target.files;
      if (files.length > 0) {
        this.handleFile(files[0]);
      }
    },
    
    // 处理上传的文件
    async handleFile(file) {
      this.currentFile = file;
      this.clearResults();
      
      try {
        // 读取并显示原始图像
        const dataUrl = await ImageProcessor.readFileAsDataURL(file);
        this.originalImageUrl = dataUrl;
        
        // 获取GIS信息并创建匹配图像
        this.geoInfo = await ImageProcessor.extractGeoInfo(file, dataUrl);
        console.log('获取到的地理信息:', this.geoInfo);
        
        // 设置匹配图像URL (在真实实现中，匹配图像就是原始图像)
        this.matchedImageUrl = dataUrl;
        
      } catch (error) {
        console.error('处理文件时出错:', error);
      }
    },
    
    // 匹配图像加载完成
    onMatchedImageLoad() {
      this.matchedImageLoaded = true;
    },
    
    // 格式化文件大小
    formatFileSize(bytes) {
      if (bytes < 1024) {
        return bytes + ' B';
      } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + ' KB';
      } else {
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
      }
    },
    
    // 检测物体
    async detectObjects() {
      if (!this.matchedImageLoaded || this.isProcessing || this.modelStatus !== 'ready') {
        return;
      }
      
      this.isProcessing = true;
      const startTime = performance.now();
      
      try {
        // 获取匹配图像元素
        const imageEl = this.$refs.matchedImageEl;
        
        // 执行检测
        this.detections = await this.model.detect(imageEl);
        
        // 分析场景
        if (this.detections.length > 0) {
          this.sceneAnalysis = ImageProcessor.analyzeScene(this.detections);
          console.log('场景分析结果:', this.sceneAnalysis);
        }
        
        // 在Canvas上绘制检测框
        this.drawDetections();
        
        // 计算处理时间
        this.processingTime = Math.round(performance.now() - startTime);
      } catch (error) {
        console.error('检测物体时出错:', error);
      } finally {
        this.isProcessing = false;
      }
    },
    
    // 在Canvas上绘制检测框
    drawDetections() {
      const canvas = this.$refs.detectionCanvas;
      const img = this.$refs.matchedImageEl;
      
      if (!canvas || !img) return;
      
      // 设置Canvas尺寸与图像一致
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 绘制每个检测框
      this.detections.forEach(detection => {
        const { x, y, width, height } = detection.bbox;
        const color = this.getClassColor(detection.class);
        
        // 绘制矩形框
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);
        
        // 绘制标签背景
        ctx.fillStyle = color;
        const className = this.getClassName(detection.class);
        const confidence = (detection.confidence * 100).toFixed(0);
        const label = `${className} ${confidence}%`;
        const textWidth = ctx.measureText(label).width;
        
        ctx.fillRect(x, y - 30, textWidth + 10, 30);
        
        // 绘制标签文本
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(label, x + 5, y - 10);
      });
      
      // 如果有场景分析结果，添加到画布上
      if (this.sceneAnalysis) {
        const { sceneType, sceneProbability } = this.sceneAnalysis;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 200, 50);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(`场景: ${sceneType}`, 20, 30);
        ctx.font = '14px Arial';
        ctx.fillText(`可能性: ${sceneProbability}%`, 20, 50);
      }
    },
    
    // 清除结果
    clearResults() {
      this.detections = [];
      this.processingTime = 0;
      this.sceneAnalysis = null;
      
      // 清除Canvas
      const canvas = this.$refs.detectionCanvas;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }
}
</script>

<style scoped>
.object-detection {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  color: #1e88e5;
  margin-bottom: 20px;
  text-align: center;
}

h3 {
  color: #444;
  margin-bottom: 15px;
  font-size: 1.3rem;
}

.content-container {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
}

.original-image-section, 
.matched-image-section {
  flex: 1;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
}

.upload-area {
  border: 2px dashed #ccc;
  border-radius: 8px;
  height: 300px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 15px;
  overflow: hidden;
}

.upload-area:hover {
  border-color: #1e88e5;
  background-color: rgba(30, 136, 229, 0.03);
}

.upload-placeholder {
  text-align: center;
  color: #777;
}

.upload-icon {
  font-size: 40px;
  line-height: 1;
  margin-bottom: 10px;
  color: #ccc;
}

.upload-text {
  font-size: 16px;
  margin-bottom: 8px;
}

.upload-hint {
  font-size: 14px;
  color: #999;
}

.image-preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.preview-image, .matched-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.matched-image-container {
  position: relative;
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 15px;
  min-height: 300px;
  overflow: hidden;
}

.gis-overlay {
  position: absolute;
  bottom: 10px;
  right: 10px;
  z-index: 10;
}

.gis-data-compact {
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 10px;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.4;
  max-width: 200px;
  text-align: right;
  position: relative;
}

.gis-data-compact.real-gps {
  background-color: rgba(52, 168, 83, 0.8);
}

.gps-badge {
  position: absolute;
  top: -10px;
  left: 10px;
  background-color: #4285f4;
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: bold;
}

.gps-badge.simulated {
  background-color: #fbbc05;
  color: #333;
}

.detection-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.file-info {
  margin-top: 5px;
  font-size: 14px;
  color: #666;
}

.controls-bar {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

.detect-btn, .clear-btn {
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.detect-btn {
  background-color: #1e88e5;
  color: white;
  flex: 2;
}

.detect-btn:hover:not(:disabled) {
  background-color: #1976d2;
}

.clear-btn {
  background-color: #f5f5f5;
  color: #666;
  flex: 1;
}

.clear-btn:hover:not(:disabled) {
  background-color: #e0e0e0;
}

.detect-btn:disabled, .clear-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.results-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.detection-stats {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
}

.stat {
  font-size: 15px;
  color: #555;
}

.detections-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}

.detection-item {
  border: 2px solid;
  border-radius: 6px;
  overflow: hidden;
}

.detection-type {
  padding: 6px 10px;
  color: white;
  font-weight: bold;
}

.detection-confidence {
  padding: 6px 10px;
  font-size: 14px;
  color: #444;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .content-container {
    flex-direction: column;
  }
  
  .original-image-section, 
  .matched-image-section {
    flex: none;
  }
}

/* 添加错误消息样式 */
.error-message {
  background-color: #ffebee;
  border: 1px solid #ef5350;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
}

.error-icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: #ef5350;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  font-size: 18px;
  margin-right: 15px;
}

.error-text {
  flex: 1;
  color: #d32f2f;
  font-size: 14px;
}

.retry-button {
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 15px;
  cursor: pointer;
  font-size: 14px;
  margin-left: 15px;
}

.retry-button:hover {
  background-color: #1976d2;
}
</style> 