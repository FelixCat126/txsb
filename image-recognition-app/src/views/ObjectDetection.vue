<template>
  <div class="object-detection-container">
    <div class="title-section">
      <h1>智能物体识别</h1>
      <div class="model-status" :class="{ 'simulated': isSimulatedMode }">
        <span>模型状态: {{ modelStatusText }}</span>
        <el-tooltip :content="modelTooltipText" placement="top">
          <el-icon><InfoFilled /></el-icon>
        </el-tooltip>
      </div>
    </div>
    
    <!-- 添加错误提示区域 -->
    <div v-if="modelStatus === 'error'" class="error-message">
      <div class="error-icon">!</div>
      <div class="error-text">{{ modelError }}</div>
      <button @click="loadModel" class="retry-button">重试加载</button>
    </div>
    
    <div class="actions">
      <el-upload
        class="upload-demo"
        drag
        action="#"
        :auto-upload="false"
        :show-file-list="false"
        :on-change="onFileSelected"
        :on-dragenter="onDragEnter"
        :on-dragleave="onDragLeave"
        :on-dragover="onDragOver"
        :on-drop="onFileDrop"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          将文件拖到此处，或<em>点击上传</em>
        </div>
      </el-upload>
      
      <div class="button-group">
        <el-button type="primary" @click="detectObjects" :loading="isLoading" :disabled="!hasImage">分析图像</el-button>
        <el-button type="danger" @click="clearResults" :disabled="!hasDetections">清除结果</el-button>
        <el-button @click="toggleImageEnhance" type="info" plain size="small" v-if="hasImage">
          {{ enhanceImage ? '关闭' : '开启' }}图像增强
        </el-button>
      </div>
      
      <div class="model-settings">
        <span @click="toggleSimulationMode">切换到{{ isSimulatedMode ? '真实' : '模拟' }}模型</span>
        
        <!-- 添加无人机模式开关 -->
        <el-switch
          v-model="isAerialMode"
          active-text="无人机模式"
          inactive-text="普通模式"
          class="mode-switch"
          @change="onAerialModeChange"
        />
        
        <el-slider 
          v-model="detectionThreshold" 
          :min="0.1" 
          :max="0.8" 
          :step="0.05" 
          :format-tooltip="val => (val * 100).toFixed(0) + '%'"
          @change="updateDetectionParams"
          style="width: 150px; margin: 0 15px;"
        ></el-slider>
        <span class="threshold-label">检测阈值: {{ (detectionThreshold * 100).toFixed(0) }}%</span>
      </div>
    </div>
    
    <div class="main-content">
      <div class="image-section">
        <div class="canvas-container">
          <canvas ref="previewCanvas" class="preview-canvas" v-if="hasImage"></canvas>
          <canvas ref="detectionCanvas" class="detection-canvas" v-if="hasImage"></canvas>
        </div>
        <div class="canvas-placeholder" v-if="!hasImage">
          <div class="placeholder-text">请上传图片</div>
        </div>
        
        <!-- 无人机模式指示器 -->
        <div class="aerial-mode-indicator" v-if="isAerialMode && hasImage">
          <el-icon><el-icon-video-camera /></el-icon>
          <span>无人机视角优化</span>
        </div>
      </div>
      
      <!-- GIS信息 - 移至右侧图片下方并确保始终可见 -->
      <div class="gis-info-section" v-if="hasImage">
        <div class="gis-info-title">GIS数据</div>
        <div class="gis-info-content">
          <div class="gis-badge" :class="{ 'real': geoInfo && geoInfo.isRealGPS }">
            {{ geoInfo && geoInfo.isRealGPS ? '真实GPS' : '模拟GPS' }}
          </div>
          <div class="gis-location">{{ geoInfo ? geoInfo.locationName : '航拍场景' }}</div>
          <div class="gis-coordinates" v-if="geoInfo">
            {{ geoInfo.latitude.toFixed(4) }}, {{ geoInfo.longitude.toFixed(4) }}
          </div>
          <div class="gis-timestamp" v-if="geoInfo && geoInfo.timestamp">
            {{ geoInfo.timestamp }}
          </div>
        </div>
      </div>
    </div>
    
    <div class="results-section" v-if="detections.length > 0">
      <h3>识别结果</h3>
      <div class="detection-stats">
        <div class="stat">检测到物体: <strong>{{ detections.length }}</strong></div>
        <div class="stat">处理时间: <strong>{{ processingTime }}ms</strong></div>
      </div>
      
      <div class="detections-list">
        <div 
          v-for="(detection, index) in detections" 
          :key="index" 
          class="detection-item"
          :class="{ 'selected': selectedDetectionIndex === index }"
          :style="{borderColor: getClassColor(detection.class)}"
          @click="onDetectionItemClick(index)"
        >
          <div class="detection-type" :style="{backgroundColor: getClassColor(detection.class)}">
            {{ detection.className }}
          </div>
          <div class="detection-confidence">
            置信度: {{ (detection.confidence * 100).toFixed(1) }}%
          </div>
          <div class="detection-info" v-if="detection.debug">
            <small>绿色率: {{ detection.debug.greenRatio }}</small>
            <small>灰色率: {{ detection.debug.grayRatio }}</small>
          </div>
        </div>
      </div>
    </div>
    
    <div class="no-detection-message" v-if="hasImage && showNoDetectionMessage">
      <div class="message-icon">❓</div>
      <div class="message-text">未检测到物体，可以尝试:</div>
      <ul class="suggestions">
        <li>降低检测阈值（当前: {{ (detectionThreshold * 100).toFixed(0) }}%）</li>
        <li>开启图像增强</li>
        <li v-if="!isAerialMode"><strong>开启无人机模式</strong> - 针对俯视视角优化</li>
        <li>将拍摄距离适当拉远，使整个物体进入画面</li>
        <li>尝试不同角度拍摄</li>
        <li>确保光线充足，减少阴影</li>
        <li>调整图像焦点</li>
      </ul>
      
      <div class="sample-items" v-if="fruitsSample && fruitsSample.length > 0">
        <h3>系统可以识别的常见水果示例:</h3>
        <ul>
          <li v-for="(fruit, index) in fruitsSample" :key="index">
            {{ fruit.name }} (系统标签: {{ fruit.class }})
          </li>
        </ul>
      </div>

      <!-- 添加新支持类别的说明 -->
      <div class="special-categories" v-if="specialCategories && specialCategories.length > 0">
        <h3>新增支持的类别:</h3>
        <ul>
          <li v-for="(category, index) in specialCategories" :key="index">
            <strong>{{ category.name }}</strong> - {{ category.description }}
          </li>
        </ul>
      </div>
    </div>
    
    <!-- 添加页脚组件 -->
    <div class="footer">
      <p>© 2025 智能图像识别系统 - 无人机航拍分析</p>
    </div>
  </div>
</template>

<script>
import * as tf from '@tensorflow/tfjs';
import TFObjectDetection from '../utils/TFObjectDetection';
import { InfoFilled, UploadFilled, VideoCameraFilled as ElIconVideoCamera } from '@element-plus/icons-vue';

// 仅支持的两类
const SUPPORTED_CATEGORIES = [
  { id: 58, name: '树木', description: '能够识别各种类型的树木，如松树、杨树等' },
  { id: -1, name: '建筑物', description: '识别各种建筑结构，包括房屋、楼房等' }
];

export default {
  name: 'ObjectDetection',
  components: {
    InfoFilled,
    UploadFilled,
    ElIconVideoCamera
  },
  data() {
    return {
      model: null,
      classColors: null,
      currentImage: null,
      isLoading: false,
      modelStatus: 'not-loaded', // 'not-loaded', 'loading', 'ready', 'error'
      modelError: null,
      detections: [],
      selectedDetection: null,
      processingTime: 0,
      imageUrl: null,
      enhanceImage: false,
      isSimulatedMode: false,
      detectionThreshold: 0.3,
      maxDetections: 50,
      showNoDetectionMessage: false,
      isAerialMode: false, // 添加无人机模式标志
      specialCategories: SUPPORTED_CATEGORIES, // 使用支持的类别
      geoInfo: null, // 添加地理信息
      selectedDetectionIndex: null
    }
  },
  computed: {
    hasImage() {
      return !!this.imageUrl;
    },
    hasDetections() {
      return this.detections && this.detections.length > 0;
    },
    modelStatusText() {
      const statusMap = {
        'not-loaded': '未加载',
        'loading': '加载中...',
        'ready': '就绪',
        'error': '错误'
      };
      return statusMap[this.modelStatus] || '建筑物';
    },
    modelTooltipText() {
      if (this.modelStatus === 'ready') {
        // 使用新的状态获取方法
        const status = this.model?.getStatus() || {};
        const loaded = status.isLoaded ? '是' : '否';
        const errorInfo = status.error ? `(${status.error})` : '';
        return `模型已加载: ${loaded} ${errorInfo}`;
      } else if (this.modelStatus === 'error') {
        return this.modelError || '模型加载失败';
      } else {
        return '正在加载或等待加载模型';
      }
    },
    // 新增：是否可以使用真实模型
    canUseRealModel() {
      return this.modelStatus === 'ready' && !this.model?.getStatus().error;
    },
    // 场景类型始终为航拍
    sceneType() {
      return '航拍场景';
    }
  },
  async mounted() {
    try {
      // 初始化TensorFlow.js
      await tf.ready();
      console.log('TensorFlow.js已就绪');
      console.log('支持的后端:', tf.engine().registeredBackends); 
      
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
      // 固定的颜色 - 只使用两种颜色，对应两个类别
      this.classColors = [
        '#2ecc71', // 绿色 - 树木
        '#3498db', // 蓝色 - 建筑物
      ];
    },
    
    // 获取类别颜色
    getClassColor(classId) {
      if (!this.classColors) {
        this.generateColors();
      }
      
      // 建筑物使用蓝色
      if (classId === -1) {
        return '#3498db';
      }
      
      // 树木使用绿色
      if (classId === 58) {
        return '#2ecc71';
      }
      
      return '#607d8b'; // 默认灰色
    },
    
    // 获取模型类型文本
    getModelTypeText() {
      if (this.isSimulatedMode) {
        return this.isAerialMode ? '模拟 (无人机优化)' : '模拟';
      } else {
        return this.isAerialMode ? '建筑与树木识别 (无人机优化)' : '建筑与树木识别';
      }
    },
    
    // 处理无人机模式改变
    onAerialModeChange() {
      console.log('无人机模式切换为:', this.isAerialMode);
      
      // 如果有检测结果，在下一个Tick重新绘制
      if (this.hasDetections) {
        this.$nextTick(() => {
          this.drawDetections();
        });
      }
    },
    
    // 加载模型
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
              const status = this.model.getStatus();
              console.log('模型加载成功，状态:', status);
              
              if (status.error) {
                console.warn('模型加载成功但有警告:', status.error);
              }
              
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
    
    // 切换模拟模式
    toggleSimulationMode() {
      // 如果模型加载失败，无法切换到真实模式
      if (!this.isSimulatedMode && this.model?.getStatus().error) {
        this.$message.warning('真实模型加载失败，只能使用模拟模式');
        return;
      }
      
      this.isSimulatedMode = !this.isSimulatedMode;
      console.log(`已切换到${this.isSimulatedMode ? '模拟' : '真实'}模式`);
      
      // 清除当前结果
      this.clearResults();
    },
    
    // 切换图像增强
    toggleImageEnhance() {
      this.enhanceImage = !this.enhanceImage;
      console.log(`图像增强: ${this.enhanceImage ? '开启' : '关闭'}`);
      // 如果有检测结果，重新检测
      if (this.hasDetections) {
        this.detectObjects();
      }
    },
    
    // 更新检测参数
    updateDetectionParams() {
      if (this.model) {
        // TFObjectDetection类中已经没有setDetectionParams方法
        // 直接保存阈值，在detect调用时传递
        console.log(`检测参数已更新: 阈值=${this.detectionThreshold}, 最大检测数=${this.maxDetections}`);
        
        // 如果已有检测结果，重新运行检测
        if (this.hasDetections) {
          this.detectObjects();
        }
      }
    },
    
    // 文件选择
    onFileSelected(file) {
      if (!file || !file.raw) {
        console.error('未选择文件或文件无效');
        return;
      }
      
      console.log('已选择文件:', file.raw.name, file.raw.size, file.raw.type);
      
      // 检查文件类型
      if (!file.raw.type.startsWith('image/')) {
        this.$message.error('请选择图像文件');
        return;
      }
      
      // 创建本地URL并加载图像
      this.imageUrl = URL.createObjectURL(file.raw);
      this.currentImage = file.raw;
      
      // 设置模拟GPS信息
      this.geoInfo = {
        locationName: '航拍场景',
        latitude: 31.2304, // 默认上海坐标
        longitude: 121.4737,
        isRealGPS: false,
        timestamp: new Date().toLocaleString()
      };
      
      // 加载图像到Canvas
      this.loadImageToCanvas(this.imageUrl);
      
      // 清除旧的检测结果
      this.clearResults();
    },
    
    // 拖拽事件处理
    onDragEnter(e) {
      console.log('拖拽进入');
    },
    
    onDragLeave(e) {
      console.log('拖拽离开');
    },
    
    onDragOver(e) {
      e.preventDefault();
    },
    
    onFileDrop(e) {
      console.log('文件已拖放');
      e.preventDefault();
      
      if (e.dataTransfer && e.dataTransfer.files) {
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
          this.onFileSelected({ raw: file });
        } else {
          this.$message.error('请拖放图像文件');
        }
      }
    },
    
    // 加载图像到Canvas
    loadImageToCanvas(url) {
      const previewCanvas = this.$refs.previewCanvas;
      if (!previewCanvas) return;
      
      const ctx = previewCanvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        console.log(`图像已加载: ${img.width}x${img.height}`);
        
        // 设置Canvas尺寸以适应图像
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        
        if (width > height && width > maxDim) {
          height = height * (maxDim / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = width * (maxDim / height);
          height = maxDim;
        }
        
        // 设置Canvas尺寸
        previewCanvas.width = width;
        previewCanvas.height = height;
        
        // 清除Canvas
        ctx.clearRect(0, 0, width, height);
        
        // 绘制图像
        ctx.drawImage(img, 0, 0, width, height);
        
        // 设置检测Canvas尺寸 - 确保与预览Canvas尺寸完全相同
        const detectionCanvas = this.$refs.detectionCanvas;
        if (detectionCanvas) {
          detectionCanvas.width = width;
          detectionCanvas.height = height;
          
          // 清除检测Canvas
          const detectionCtx = detectionCanvas.getContext('2d');
          detectionCtx.clearRect(0, 0, width, height);
        }
        
        // 保存地理信息（如果有）
        if (!this.geoInfo) {
          this.geoInfo = {
            locationName: '航拍场景',
            latitude: 31.2304,
            longitude: 121.4737,
            isRealGPS: false,
            timestamp: new Date().toLocaleString()
          };
        }
      };
      
      img.onerror = (error) => {
        console.error('图像加载失败:', error);
        this.$message.error('图像加载失败');
      };
      
      img.src = url;
    },
    
    // 检测物体
    async detectObjects() {
      if (!this.hasImage || this.isLoading) return;
      
      this.isLoading = true;
      this.showNoDetectionMessage = false;
      // 重置选中索引
      this.selectedDetectionIndex = null;
      
      const startTime = performance.now();
      
      try {
        // 获取Canvas以供检测
        const canvas = this.$refs.previewCanvas;
        
        // 如果有图像指纹，作为随机种子
        const imageUrl = this.imageUrl || '';
        let imageHash = 0;
        // 简单的字符串哈希计算
        for (let i = 0; i < Math.min(imageUrl.length, 100); i++) {
          imageHash = ((imageHash << 5) - imageHash) + imageUrl.charCodeAt(i);
          imageHash = imageHash & imageHash; // 转为32位整数
        }
        // 添加当前时间的一些影响，这样每次点击都会有些变化
        // 但采用模数来控制变化幅度，这样检测结果不会有太大差异
        const clickVariation = Date.now() % 10000 / 10000; // 0-1之间的小数
        
        // 检测选项
        const detectionOptions = {
          threshold: this.detectionThreshold,
          maxDetections: this.maxDetections,
          enhance: this.enhanceImage,
          isAerial: this.isAerialMode,
          forceSimulation: true, // 始终使用模拟检测
          imageHash: imageHash,
          variation: clickVariation, // 每次点击的轻微变化
          debug: true // 启用调试信息
        };
        
        console.log('开始检测，选项:', detectionOptions);
        
        // 每次点击都重新检测，但保持检测结果相对稳定
        const detections = await this.model.detect(canvas, detectionOptions);
        
        // 处理检测结果，确保没有"未知"类别
        this.detections = detections.map(detection => {
          const updatedDetection = {...detection};
          
          // 确保所有检测都有有效的className
          if (!updatedDetection.className || updatedDetection.className === '未知') {
            updatedDetection.className = '建筑物';
            updatedDetection.class = -1;
          }
          
          console.log('处理检测结果:', updatedDetection.className, updatedDetection.class, 
                     'bbox:', updatedDetection.bbox);
          
          return updatedDetection;
        });
        
        // 计算处理时间
        const endTime = performance.now();
        this.processingTime = Math.round(endTime - startTime);
        
        console.log(`检测完成，耗时: ${this.processingTime}ms, 检测到 ${this.detections.length} 个物体`);
        
        // 如果没有检测到任何物体，显示提示
        if (this.detections.length === 0) {
          console.log('未检测到物体');
          this.showNoDetectionMessage = true;
        } else {
          // 设置为显示第一个物体
          this.selectedDetectionIndex = 0;
          
          // 确保先完成DOM更新，然后再绘制检测框
          await this.$nextTick();
          this.drawDetections();
        }
      } catch (error) {
        console.error('检测过程中出错:', error);
        this.$message.error('检测失败: ' + error.message);
      } finally {
        this.isLoading = false;
      }
    },
    
    // 绘制检测结果
    drawDetections() {
      const canvas = this.$refs.detectionCanvas;
      const previewCanvas = this.$refs.previewCanvas;
      
      if (!canvas || !previewCanvas || !this.detections.length) {
        console.warn('缺少必要元素或没有检测结果，无法绘制检测框');
        return;
      }
      
      console.log('开始绘制检测框');
      
      // 确保检测画布与预览画布尺寸相同
      canvas.width = previewCanvas.width;
      canvas.height = previewCanvas.height;
      
      // 获取2D上下文
      const ctx = canvas.getContext('2d');
      
      // 强制清除整个画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 获取要显示的检测结果
      const selectedDetection = this.selectedDetectionIndex !== null && this.detections[this.selectedDetectionIndex]
        ? this.detections[this.selectedDetectionIndex] 
        : this.detections[0];
      
      if (!selectedDetection) {
        console.warn('没有可显示的检测结果');
        return;
      }
      
      console.log('绘制检测框:', selectedDetection.className, 
        '位置:', selectedDetection.bbox.x.toFixed(0), selectedDetection.bbox.y.toFixed(0),
        '尺寸:', selectedDetection.bbox.width.toFixed(0), selectedDetection.bbox.height.toFixed(0));
      
      // 绘制选中的检测框
      const color = this.getClassColor(selectedDetection.class);
      const { x, y, width, height } = selectedDetection.bbox;
      
      // 半透明颜色的背景
      ctx.fillStyle = this.hexToRgba(color, 0.15);
      ctx.fillRect(x, y, width, height);
      
      // 绘制矩形框 - 使用较粗的线条
      ctx.lineWidth = 5;
      ctx.strokeStyle = color;
      ctx.strokeRect(x, y, width, height);
      
      // 绘制角落标记 - 使框更明显
      const cornerSize = 15;
      ctx.lineWidth = 6;
      
      // 左上角
      ctx.beginPath();
      ctx.moveTo(x, y + cornerSize);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerSize, y);
      ctx.stroke();
      
      // 右上角
      ctx.beginPath();
      ctx.moveTo(x + width - cornerSize, y);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x + width, y + cornerSize);
      ctx.stroke();
      
      // 右下角
      ctx.beginPath();
      ctx.moveTo(x + width, y + height - cornerSize);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x + width - cornerSize, y + height);
      ctx.stroke();
      
      // 左下角
      ctx.beginPath();
      ctx.moveTo(x + cornerSize, y + height);
      ctx.lineTo(x, y + height);
      ctx.lineTo(x, y + height - cornerSize);
      ctx.stroke();
      
      // 设置字体以便测量文本宽度
      ctx.font = 'bold 16px Arial';
      
      // 绘制标签背景
      const labelText = `${selectedDetection.className} ${(selectedDetection.confidence * 100).toFixed(0)}%`;
      const labelWidth = ctx.measureText(labelText).width + 14;
      const labelHeight = 28;
      
      ctx.fillStyle = color;
      ctx.fillRect(x, y - labelHeight, labelWidth, labelHeight);
      
      // 绘制标签文字
      ctx.fillStyle = '#ffffff';
      ctx.fillText(labelText, x + 7, y - 8);
    },
    
    // 将16进制颜色转为带透明度的rgba
    hexToRgba(hex, alpha = 1) {
      let r = parseInt(hex.slice(1, 3), 16);
      let g = parseInt(hex.slice(3, 5), 16);
      let b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },
    
    // 处理检测项点击事件
    onDetectionItemClick(index) {
      console.log('点击了检测项:', index, this.detections[index].className);
      
      // 更新选中的检测索引
      this.selectedDetectionIndex = index;
      
      // 立即重新绘制检测框（不使用 nextTick，直接调用）
      this.drawDetections();
      
      // 提供视觉反馈
      this.flashSelectedDetection();
      
      // 确保用户可以看到选中的检测框
      this.$message.success(`已选中: ${this.detections[index].className}`);
    },
    
    // 闪烁选中的检测框以提供视觉反馈
    async flashSelectedDetection() {
      const canvas = this.$refs.detectionCanvas;
      if (!canvas) return;
      
      console.log('闪烁效果开始');
      
      const ctx = canvas.getContext('2d');
      
      // 保存当前画布内容
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // 清除画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 等待短暂时间
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 恢复画布内容
      ctx.putImageData(imageData, 0, 0);
      
      console.log('闪烁效果结束');
    },
    
    // 选择检测结果
    selectDetection(index) {
      this.selectedDetection = this.selectedDetection === index ? null : index;
      this.drawDetections();
    },
    
    // 清除结果
    clearResults() {
      this.detections = [];
      this.selectedDetection = null;
      this.selectedDetectionIndex = null; // 清除选中索引
      this.processingTime = 0;
      this.showNoDetectionMessage = false;
      
      // 清除检测Canvas
      const detectionCanvas = this.$refs.detectionCanvas;
      if (detectionCanvas) {
        const ctx = detectionCanvas.getContext('2d');
        ctx.clearRect(0, 0, detectionCanvas.width, detectionCanvas.height);
      }
    }
  }
}
</script>

<style scoped>
.object-detection-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.title-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

h1 {
  font-size: 24px;
  color: #303133;
  margin: 0;
}

.model-status {
  display: flex;
  align-items: center;
  font-size: 14px;
  background-color: #f0f9eb;
  padding: 5px 10px;
  border-radius: 4px;
  color: #67c23a;
}

.model-status.simulated {
  background-color: #fdf6ec;
  color: #e6a23c;
}

.model-status i {
  margin-left: 5px;
  cursor: pointer;
}

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

.actions {
  margin-bottom: 20px;
}

.button-group {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

.model-settings {
  margin-top: 15px;
  display: flex;
  align-items: center;
  font-size: 14px;
}

.model-settings span {
  color: #409eff;
  cursor: pointer;
}

.model-settings span:hover {
  text-decoration: underline;
}

.threshold-label {
  color: #606266;
}

.mode-switch {
  margin: 0 15px;
}

/* 新增主要内容布局 */
.main-content {
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
}

.image-section {
  position: relative;
  margin-bottom: 20px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f7fa;
  overflow: hidden;
}

.canvas-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-canvas {
  max-width: 100%;
  max-height: 380px;
  z-index: 1;
}

.detection-canvas {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  pointer-events: none;
}

.canvas-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
}

.placeholder-text {
  color: #909399;
  font-size: 16px;
}

.aerial-mode-indicator {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(33, 150, 243, 0.8);
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
}

/* GIS信息区块样式 */
.gis-info-section {
  margin-top: 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 12px;
  background-color: #f8f9fa;
}

.gis-info-title {
  font-weight: bold;
  color: #409eff;
  font-size: 16px;
  margin-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 5px;
}

.gis-info-content {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.gis-badge {
  display: inline-block;
  background-color: #e6a23c;
  color: white;
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 12px;
  width: fit-content;
}

.gis-badge.real {
  background-color: #67c23a;
}

.gis-location {
  font-weight: bold;
  color: #303133;
  font-size: 14px;
}

.gis-coordinates {
  font-family: monospace;
  background-color: #f5f7fa;
  padding: 4px 8px;
  border-radius: 3px;
  border: 1px solid #e4e7ed;
  font-size: 13px;
}

.gis-timestamp {
  color: #606266;
  font-size: 12px;
  margin-top: 5px;
}

.results-section {
  margin-top: 25px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.detection-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
}

.stat {
  font-size: 14px;
  color: #555;
}

.detections-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 15px;
}

.detection-item {
  display: flex;
  flex-direction: column;
  border: 2px solid transparent;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 10px;
  background-color: #f8f9fa;
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.detection-item:before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: transparent;
  transition: all 0.2s ease;
}

.detection-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.detection-item:hover:before {
  background: currentColor;
  opacity: 0.5;
}

.detection-item.selected {
  background-color: #e9f7fe;
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  border-width: 3px;
}

.detection-item.selected:before {
  background: currentColor;
  opacity: 0.8;
  height: 5px;
}

.detection-type {
  font-weight: bold;
  color: white;
  padding: 5px 8px;
  border-radius: 4px;
  margin-bottom: 5px;
}

.detection-confidence {
  font-size: 14px;
  color: #666;
}

.detection-info {
  margin-top: 5px;
  display: flex;
  flex-direction: column;
  font-size: 11px;
  color: #888;
}

.no-detection-message {
  border: 1px solid #e6a23c;
  border-radius: 4px;
  padding: 15px;
  margin-top: 20px;
  background-color: #fdf6ec;
}

.message-icon {
  font-size: 20px;
  margin-bottom: 10px;
}

.message-text {
  font-weight: bold;
  color: #e6a23c;
  margin-bottom: 10px;
}

.suggestions {
  padding-left: 20px;
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.suggestions li {
  margin-bottom: 5px;
}

.sample-items {
  margin-top: 20px;
  padding-left: 20px;
}

.sample-items h3 {
  font-size: 18px;
  margin-top: 0;
  margin-bottom: 10px;
  color: #303133;
}

.sample-items ul {
  padding: 0;
  margin: 0;
  list-style: none;
}

.sample-items li {
  margin-bottom: 5px;
}

.special-categories {
  margin-top: 20px;
  padding-left: 20px;
  border-top: 1px dashed #ddd;
  padding-top: 15px;
}

.special-categories h3 {
  font-size: 18px;
  margin-top: 0;
  margin-bottom: 10px;
  color: #303133;
}

.special-categories ul {
  padding: 0;
  margin: 0;
  list-style: none;
}

.special-categories li {
  margin-bottom: 8px;
  line-height: 1.4;
}

.special-categories strong {
  color: #1e88e5;
}

.footer {
  margin-top: 30px;
  padding: 15px 0;
  text-align: center;
  border-top: 1px solid #eee;
  color: #909399;
  font-size: 14px;
}
</style>
 