<template>
  <div class="home">
    <h2 class="page-title">上海市图像识别系统</h2>
    <p class="page-desc">上传图片，识别其中的物体（建筑、道路、车辆、行人等）并在地图上标记</p>
    
    <div class="content-wrapper">
      <div class="left-panel">
        <div class="upload-container">
          <input 
            type="file" 
            ref="fileInput" 
            style="display:none" 
            accept="image/*" 
            @change="handleFileChange"
          />
          <button class="upload-button" @click="triggerFileInput">
            <i class="upload-icon">📷</i>
            上传图片进行识别
          </button>
        </div>
        
        <div v-if="imageUrl" class="preview-container">
          <img :src="imageUrl" class="preview-image" alt="预览图" />
          <div class="image-info">
            <span>图像大小: {{ imageSize }}</span>
          </div>
        </div>
        
        <div v-if="isLoading" class="status-message">
          <div class="loading-spinner"></div>
          正在分析图片，请稍候...
        </div>
        
        <div v-else-if="results.length" class="results-container">
          <h3>识别结果：</h3>
          <div 
            v-for="(item, index) in results" 
            :key="index"
            class="result-item"
            :class="{ 'highlight': selectedIndex === index }"
            @click="selectItem(index)"
          >
            <div class="result-icon" :style="{backgroundColor: getColorByConfidence(item.confidence)}">
              {{ item.name.substring(0, 1) }}
            </div>
            <div class="result-content">
              <div class="result-name">{{ item.name }}</div>
              <div class="result-confidence">可信度: {{ item.confidence }}%</div>
            </div>
            <div class="result-action" @click.stop="showOnMap(index)">
              <i class="map-icon">📍</i>
            </div>
          </div>
          
          <div class="recognition-info">
            <div class="info-item">
              <span class="info-label">定位位置</span>
              <span class="info-value">{{ locationText }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">识别时间</span>
              <span class="info-value">{{ recognitionTime }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="right-panel">
        <div class="map-container">
          <ShanghaiMap :markers="mapMarkers" ref="shanghaiMap" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ShanghaiMap from '@/components/ShanghaiMap.vue'

export default {
  name: 'Home',
  components: {
    ShanghaiMap
  },
  data() {
    return {
      imageUrl: '',
      imageSize: '',
      isLoading: false,
      results: [],
      selectedIndex: -1,
      mapMarkers: [],
      recognitionTime: '',
      locationText: '上海市',
      districts: [
        { name: '浦东新区', lng: 121.55, lat: 31.22, regions: ['张江', '陆家嘴', '金桥'] },
        { name: '黄浦区', lng: 121.48, lat: 31.22, regions: ['外滩', '人民广场', '豫园'] },
        { name: '徐汇区', lng: 121.43, lat: 31.18, regions: ['徐家汇', '衡山路', '上海南站'] },
        { name: '长宁区', lng: 121.38, lat: 31.22, regions: ['中山公园', '虹桥', '天山'] },
        { name: '静安区', lng: 121.45, lat: 31.23, regions: ['静安寺', '南京西路', '延安中路'] },
        { name: '普陀区', lng: 121.4, lat: 31.25, regions: ['长寿路', '曹杨', '中山北路'] },
        { name: '虹口区', lng: 121.5, lat: 31.27, regions: ['北外滩', '四川北路', '鲁迅公园'] },
        { name: '杨浦区', lng: 121.52, lat: 31.27, regions: ['复旦', '五角场', '杨浦大桥'] },
        { name: '闵行区', lng: 121.38, lat: 31.12, regions: ['莘庄', '七宝', '颛桥'] },
        { name: '宝山区', lng: 121.4, lat: 31.38, regions: ['大场', '顾村', '淞南'] }
      ]
    }
  },
  methods: {
    triggerFileInput() {
      this.$refs.fileInput.click();
    },
    handleFileChange(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      // 显示图片尺寸
      this.imageSize = this.formatFileSize(file.size);
      
      // 预览图片
      this.imageUrl = URL.createObjectURL(file);
      
      // 重置状态
      this.isLoading = true;
      this.results = [];
      this.selectedIndex = -1;
      this.mapMarkers = [];
      
      // 模拟分析过程
      setTimeout(() => {
        this.generateResults();
        this.addRandomMarkers();
        this.generateRecognitionInfo();
        this.isLoading = false;
      }, 2000);
    },
    formatFileSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    },
    generateResults() {
      // 模拟识别结果
      const possibleItems = [
        { name: '商业建筑', confidence: Math.floor(80 + Math.random() * 20) },
        { name: '道路交叉口', confidence: Math.floor(75 + Math.random() * 20) },
        { name: '城市公园', confidence: Math.floor(85 + Math.random() * 15) },
        { name: '机动车辆', confidence: Math.floor(70 + Math.random() * 25) },
        { name: '行人群体', confidence: Math.floor(60 + Math.random() * 30) },
        { name: '水域景观', confidence: Math.floor(65 + Math.random() * 25) },
        { name: '桥梁立交', confidence: Math.floor(75 + Math.random() * 20) },
        { name: '商店店铺', confidence: Math.floor(80 + Math.random() * 15) },
        { name: '住宅小区', confidence: Math.floor(85 + Math.random() * 15) },
        { name: '地标建筑', confidence: Math.floor(90 + Math.random() * 10) }
      ];
      
      // 随机选择3-5个结果
      const count = 3 + Math.floor(Math.random() * 3);
      const shuffled = [...possibleItems].sort(() => 0.5 - Math.random());
      this.results = shuffled.slice(0, count).sort((a, b) => b.confidence - a.confidence);
    },
    generateRecognitionInfo() {
      // 生成识别时间
      const now = new Date();
      this.recognitionTime = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      // 选择一个随机区域
      const district = this.districts[Math.floor(Math.random() * this.districts.length)];
      const region = district.regions[Math.floor(Math.random() * district.regions.length)];
      this.locationText = `上海市${district.name}${region}附近`;
    },
    addRandomMarkers() {
      // 清空现有标记
      this.mapMarkers = [];
      
      // 根据识别结果生成1到3个随机地点
      const markerCount = Math.min(this.results.length, 3);
      
      for (let i = 0; i < markerCount; i++) {
        const district = this.districts[Math.floor(Math.random() * this.districts.length)];
        const result = this.results[i];
        
        // 在区域坐标附近添加一些随机偏移
        const lng = district.lng + (Math.random() - 0.5) * 0.05;
        const lat = district.lat + (Math.random() - 0.5) * 0.05;
        
        // 随机选择一个区域内的具体地点
        const region = district.regions[Math.floor(Math.random() * district.regions.length)];
        
        this.mapMarkers.push({
          name: `${result.name} - ${district.name}${region}`,
          longitude: lng,
          latitude: lat,
          count: result.confidence,
          color: this.getColorByConfidence(result.confidence)
        });
      }
      
      // 随机高亮一个结果
      if (this.results.length > 0) {
        this.selectedIndex = Math.floor(Math.random() * this.results.length);
      }
    },
    selectItem(index) {
      this.selectedIndex = index;
    },
    showOnMap(index) {
      if (index < 0 || index >= this.results.length) return;
      
      // 查找对应的地图标记
      const marker = this.mapMarkers.find(m => m.name.includes(this.results[index].name));
      
      if (marker && this.$refs.shanghaiMap) {
        // 找到关联的区域名称
        const districtName = marker.name.split(' - ')[1].substring(0, 3);
        
        // 调用地图组件的方法高亮该区域
        this.$refs.shanghaiMap.highlightRegion(districtName);
      }
    },
    getColorByConfidence(confidence) {
      if (confidence >= 90) return '#67C23A'; // 绿色
      if (confidence >= 75) return '#409EFF'; // 蓝色
      if (confidence >= 60) return '#E6A23C'; // 黄色
      return '#F56C6C'; // 红色
    }
  }
}
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-title {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 10px;
}

.page-desc {
  text-align: center;
  color: #666;
  margin-bottom: 30px;
}

.content-wrapper {
  display: flex;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  min-height: 550px;
}

.left-panel {
  width: 340px;
  padding: 20px;
  border-right: 1px solid #eee;
  background-color: #fafbfc;
  overflow-y: auto;
}

.right-panel {
  flex: 1;
  position: relative;
}

.upload-button {
  display: flex;
  width: 100%;
  padding: 14px;
  background-color: #409eff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
  align-items: center;
  justify-content: center;
}

.upload-icon {
  margin-right: 10px;
  font-size: 20px;
}

.upload-button:hover {
  background-color: #66b1ff;
}

.preview-container {
  margin: 20px 0;
  text-align: center;
}

.preview-image {
  max-width: 100%;
  max-height: 200px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.image-info {
  margin-top: 8px;
  color: #909399;
  font-size: 12px;
}

.status-message {
  text-align: center;
  padding: 20px 0;
  color: #409eff;
  font-weight: bold;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.results-container {
  padding: 10px 0;
}

.results-container h3 {
  margin-bottom: 15px;
  font-size: 16px;
  color: #2c3e50;
}

.result-item {
  padding: 12px;
  margin-bottom: 10px;
  background-color: #f0f9ff;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  position: relative;
}

.result-item:hover {
  background-color: #ecf5ff;
  transform: translateY(-2px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.result-icon {
  width: 36px;
  height: 36px;
  border-radius: 18px;
  background-color: #409eff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-right: 10px;
}

.result-content {
  flex: 1;
}

.result-name {
  font-weight: bold;
  color: #303133;
  margin-bottom: 2px;
}

.result-confidence {
  color: #909399;
  font-size: 12px;
}

.result-action {
  padding: 6px;
  border-radius: 50%;
  transition: all 0.2s;
}

.result-action:hover {
  background-color: rgba(64, 158, 255, 0.1);
}

.map-icon {
  font-size: 18px;
}

.result-item.highlight {
  background-color: #fef0f0;
  border-left: 3px solid #f56c6c;
}

.recognition-info {
  margin-top: 20px;
  padding: 15px;
  border-radius: 6px;
  background-color: #f5f7fa;
  border: 1px dashed #dcdfe6;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 13px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-label {
  color: #606266;
}

.info-value {
  color: #303133;
  font-weight: 500;
}

.map-container {
  height: 100%;
  width: 100%;
  padding: 20px;
}
</style> 