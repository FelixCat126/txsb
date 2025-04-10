<template>
  <div class="dashboard">
    <h1>上海市图像识别系统仪表盘</h1>
    
    <div class="dashboard-stats">
      <div class="stat-card">
        <h3>总识别数</h3>
        <div class="stat-value">{{ totalRecognitions }}</div>
        <div class="stat-trend" :class="{'up': isTrendUp}">
          {{ trendText }}
        </div>
      </div>
      <div class="stat-card">
        <h3>准确率</h3>
        <div class="stat-value">{{ accuracy }}%</div>
        <div class="accuracy-bar">
          <div class="accuracy-progress" :style="{width: accuracy + '%'}"></div>
        </div>
      </div>
      <div class="stat-card">
        <h3>今日识别</h3>
        <div class="stat-value">{{ todayRecognitions }}</div>
        <div class="today-info">平均准确率: {{ todayAccuracy }}%</div>
      </div>
    </div>
    
    <div class="dashboard-charts">
      <div class="map-section">
        <h2 class="section-title">上海市区域识别分布热力图</h2>
        <div class="map-actions">
          <div class="map-filter">
            <span>筛选:</span>
            <select v-model="activeFilter" @change="applyFilter">
              <option value="all">全部数据</option>
              <option value="today">今日数据</option>
              <option value="accurate">高准确率</option>
              <option value="frequent">高频率</option>
            </select>
          </div>
        </div>
        <div class="map-wrapper">
          <ShanghaiMap :markers="displayMarkers" ref="shanghaiMap" />
        </div>
      </div>
      
      <div class="stats-section">
        <h2 class="section-title">识别类型统计</h2>
        <div class="stats-tabs">
          <div 
            v-for="tab in statsTabs" 
            :key="tab.key"
            :class="['tab-item', {active: activeTab === tab.key}]"
            @click="activeTab = tab.key"
          >
            {{ tab.name }}
          </div>
        </div>
        
        <div class="stats-table">
          <table>
            <thead>
              <tr>
                <th>{{ getTableHeader() }}</th>
                <th>数量</th>
                <th>准确率</th>
                <th>趋势</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in currentTableData" :key="index" @click="highlightOnMap(item)">
                <td>{{ item.name }}</td>
                <td>{{ item.count }}</td>
                <td>
                  <span :class="getAccuracyClass(item.accuracy)">
                    {{ item.accuracy }}%
                  </span>
                </td>
                <td>
                  <span :class="['trend-indicator', item.trend > 0 ? 'up' : item.trend < 0 ? 'down' : '']">
                    {{ item.trend > 0 ? '↑' : item.trend < 0 ? '↓' : '-' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="data-note">
          <p>数据更新时间: {{ lastUpdateTime }}</p>
          <p>数据来源: 图像识别系统API</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ShanghaiMap from '@/components/ShanghaiMap.vue'

export default {
  name: 'Dashboard',
  components: {
    ShanghaiMap
  },
  data() {
    return {
      recognitionData: [],
      districtMarkers: [],
      categoryStats: [],
      locationStats: [],
      activeTab: 'category',
      activeFilter: 'all',
      displayMarkers: [],
      isTrendUp: true,
      trendText: '↑ 较昨日增长12.5%',
      todayAccuracy: '76.8',
      lastUpdateTime: '',
      statsTabs: [
        { key: 'category', name: '按类型' },
        { key: 'district', name: '按区域' },
        { key: 'recent', name: '最近识别' }
      ]
    }
  },
  computed: {
    totalRecognitions() {
      return this.recognitionData.length
    },
    accuracy() {
      if (this.totalRecognitions === 0) return 0
      const correctCount = this.recognitionData.filter(item => item.isCorrect).length
      return ((correctCount / this.totalRecognitions) * 100).toFixed(1)
    },
    todayRecognitions() {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return this.recognitionData.filter(item => {
        const itemDate = new Date(item.timestamp)
        return itemDate >= today
      }).length
    },
    currentTableData() {
      if (this.activeTab === 'category') {
        return this.categoryStats
      } else if (this.activeTab === 'district') {
        return this.locationStats
      } else if (this.activeTab === 'recent') {
        return this.recentStats
      }
      return []
    }
  },
  mounted() {
    this.fetchRecognitionData()
    this.updateLastUpdateTime()
  },
  methods: {
    getTableHeader() {
      if (this.activeTab === 'category') return '识别类型'
      if (this.activeTab === 'district') return '区域名称'
      return '识别对象'
    },
    getAccuracyClass(accuracy) {
      if (accuracy >= 80) return 'accuracy-high'
      if (accuracy >= 60) return 'accuracy-medium'
      return 'accuracy-low'
    },
    fetchRecognitionData() {
      // 模拟获取识别数据
      setTimeout(() => {
        this.recognitionData = this.generateMockData()
        this.generateDistrictMarkers()
        this.generateCategoryStats()
        this.generateLocationStats()
        this.applyFilter()
      }, 800)
    },
    updateLastUpdateTime() {
      const now = new Date()
      this.lastUpdateTime = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    },
    generateMockData() {
      // 生成模拟数据用于展示
      const districts = [
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
      
      const categories = ['商业建筑', '道路交叉口', '城市公园', '机动车辆', '行人群体', '水域景观', '桥梁立交', '商店店铺', '住宅小区', '地标建筑']
      const mockData = []
      
      // 生成250条模拟数据
      for (let i = 0; i < 250; i++) {
        const district = districts[Math.floor(Math.random() * districts.length)]
        const region = district.regions[Math.floor(Math.random() * district.regions.length)]
        const category = categories[Math.floor(Math.random() * categories.length)]
        const isCorrect = Math.random() > 0.3 // 70%的准确率
        
        // 调整时间范围 - 大部分是最近几天的，少部分是更早的
        const timestamp = new Date()
        if (i < 50) {
          // 今天的数据 - 占比20%
          timestamp.setHours(Math.floor(Math.random() * 24))
          timestamp.setMinutes(Math.floor(Math.random() * 60))
        } else if (i < 150) {
          // 最近一周的数据 - 占比40%
          timestamp.setDate(timestamp.getDate() - Math.floor(Math.random() * 7))
        } else {
          // 更早的数据 - 占比40%
          timestamp.setDate(timestamp.getDate() - (7 + Math.floor(Math.random() * 23)))
        }
        
        // 在区域坐标附近添加一些随机偏移
        const longitude = district.lng + (Math.random() - 0.5) * 0.05
        const latitude = district.lat + (Math.random() - 0.5) * 0.05
        
        mockData.push({
          id: i,
          imageUrl: `https://example.com/images/sample${i}.jpg`,
          category: category,
          location: `${district.name}${region}`,
          predictedLabel: category,
          actualLabel: isCorrect ? category : categories[Math.floor(Math.random() * categories.length)],
          isCorrect: isCorrect,
          confidence: 0.7 + Math.random() * 0.3, // 70%-100%的置信度
          timestamp: timestamp.toISOString(),
          coordinates: [longitude, latitude]
        })
      }
      
      return mockData
    },
    generateDistrictMarkers() {
      // 清空现有标记
      this.districtMarkers = []
      
      // 上海市各区域的数据聚合
      const districts = {
        '浦东新区': { lng: 121.55, lat: 31.22 },
        '黄浦区': { lng: 121.48, lat: 31.22 },
        '徐汇区': { lng: 121.43, lat: 31.18 },
        '长宁区': { lng: 121.38, lat: 31.22 },
        '静安区': { lng: 121.45, lat: 31.23 },
        '普陀区': { lng: 121.4, lat: 31.25 },
        '虹口区': { lng: 121.5, lat: 31.27 },
        '杨浦区': { lng: 121.52, lat: 31.27 },
        '闵行区': { lng: 121.38, lat: 31.12 },
        '宝山区': { lng: 121.4, lat: 31.38 }
      }
      
      // 统计每个区域的识别数和准确率
      const districtData = {}
      
      this.recognitionData.forEach(item => {
        if (item.location) {
          // 提取区域名
          const district = Object.keys(districts).find(d => item.location.includes(d)) || '其他区域'
          
          if (!districtData[district]) {
            districtData[district] = {
              count: 0,
              correct: 0
            }
          }
          
          districtData[district].count++
          if (item.isCorrect) {
            districtData[district].correct++
          }
        }
      })
      
      // 为每个区域生成标记
      Object.keys(districtData).forEach(district => {
        if (districts[district]) {
          const count = districtData[district].count
          const correct = districtData[district].correct
          const accuracy = count > 0 ? (correct / count * 100).toFixed(1) : 0
          
          this.districtMarkers.push({
            name: district,
            longitude: districts[district].lng,
            latitude: districts[district].lat,
            count: count,
            accuracy: accuracy,
            color: this.getColorByAccuracy(accuracy)
          })
        }
      })
    },
    generateCategoryStats() {
      // 统计每个类型的识别数和准确率
      const categoryData = {}
      
      this.recognitionData.forEach(item => {
        const category = item.category
        if (!categoryData[category]) {
          categoryData[category] = {
            count: 0,
            correct: 0,
            lastWeek: 0
          }
        }
        
        categoryData[category].count++
        if (item.isCorrect) {
          categoryData[category].correct++
        }
        
        // 计算上周数据
        const itemDate = new Date(item.timestamp)
        const now = new Date()
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(now.getDate() - 7)
        
        if (itemDate >= oneWeekAgo && itemDate <= now) {
          categoryData[category].lastWeek++
        }
      })
      
      // 转换为适合渲染的格式
      this.categoryStats = Object.keys(categoryData).map(category => {
        const data = categoryData[category]
        const count = data.count
        const correct = data.correct
        const accuracy = count > 0 ? ((correct / count) * 100).toFixed(1) : 0
        
        // 计算趋势（与上周相比的变化百分比）
        const weekRatio = data.lastWeek / count
        const trend = Math.round((weekRatio - 0.25) * 4 * 100) / 100 // 0.25表示均匀分布
        
        return {
          name: category,
          count,
          accuracy,
          trend
        }
      }).sort((a, b) => b.count - a.count)
    },
    generateLocationStats() {
      // 按区域统计
      const locationData = {}
      
      this.recognitionData.forEach(item => {
        if (!item.location) return
        
        if (!locationData[item.location]) {
          locationData[item.location] = {
            count: 0,
            correct: 0,
            lastWeek: 0
          }
        }
        
        locationData[item.location].count++
        if (item.isCorrect) {
          locationData[item.location].correct++
        }
        
        // 计算上周数据
        const itemDate = new Date(item.timestamp)
        const now = new Date()
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(now.getDate() - 7)
        
        if (itemDate >= oneWeekAgo && itemDate <= now) {
          locationData[item.location].lastWeek++
        }
      })
      
      // 转换为适合渲染的格式
      this.locationStats = Object.keys(locationData).map(location => {
        const data = locationData[location]
        const count = data.count
        const correct = data.correct
        const accuracy = count > 0 ? ((correct / count) * 100).toFixed(1) : 0
        
        // 计算趋势
        const weekRatio = data.lastWeek / count
        const trend = Math.round((weekRatio - 0.25) * 4 * 100) / 100
        
        return {
          name: location,
          count,
          accuracy,
          trend,
          district: location.substring(0, 3) // 提取区名
        }
      }).sort((a, b) => b.count - a.count)
      
      // 最近识别统计 - 取最近30条记录
      this.recentStats = this.recognitionData
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 30)
        .map(item => ({
          name: item.category,
          count: 1,
          accuracy: item.isCorrect ? 100 : 0,
          trend: 0,
          location: item.location,
          timestamp: new Date(item.timestamp).toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }),
          coordinates: item.coordinates
        }))
    },
    applyFilter() {
      let filteredMarkers = [...this.districtMarkers]
      
      switch(this.activeFilter) {
        case 'today':
          // 今日数据
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          
          // 筛选今天的识别记录
          const todayData = this.recognitionData.filter(item => {
            const itemDate = new Date(item.timestamp)
            return itemDate >= today
          })
          
          // 按区域聚合
          const todayDistricts = {}
          todayData.forEach(item => {
            if (item.location) {
              const district = item.location.substring(0, 3)
              if (!todayDistricts[district]) {
                todayDistricts[district] = {
                  count: 0,
                  correct: 0
                }
              }
              todayDistricts[district].count++
              if (item.isCorrect) {
                todayDistricts[district].correct++
              }
            }
          })
          
          // 更新标记颜色和计数
          filteredMarkers = filteredMarkers.map(marker => {
            const districtData = todayDistricts[marker.name]
            if (districtData) {
              const accuracy = districtData.count > 0 
                ? (districtData.correct / districtData.count * 100).toFixed(1)
                : 0
                
              return {
                ...marker,
                count: districtData.count,
                accuracy: accuracy,
                color: this.getColorByAccuracy(accuracy)
              }
            }
            return { ...marker, count: 0, color: '#e0e0e0' }
          })
          break
          
        case 'accurate':
          // 高准确率（>80%）的数据
          filteredMarkers = filteredMarkers
            .filter(marker => parseFloat(marker.accuracy) >= 80)
            .map(marker => ({
              ...marker,
              color: '#67C23A' // 绿色标记高准确率
            }))
          break
          
        case 'frequent':
          // 高频率识别的区域（前30%）
          const sortedByCount = [...filteredMarkers].sort((a, b) => b.count - a.count)
          const threshold = sortedByCount[Math.floor(sortedByCount.length * 0.3)]?.count || 0
          
          filteredMarkers = filteredMarkers
            .filter(marker => marker.count >= threshold)
            .map(marker => ({
              ...marker,
              color: '#409EFF' // 蓝色标记高频率区域
            }))
          break
          
        default:
          // 保持原样
          break
      }
      
      this.displayMarkers = filteredMarkers
    },
    getColorByAccuracy(accuracy) {
      accuracy = parseFloat(accuracy)
      if (accuracy >= 80) return '#67C23A' // 绿色
      if (accuracy >= 60) return '#E6A23C' // 黄色
      return '#F56C6C' // 红色
    },
    highlightOnMap(item) {
      if (!this.$refs.shanghaiMap) return
      
      if (item.district) {
        this.$refs.shanghaiMap.highlightRegion(item.district)
      } else if (item.coordinates) {
        // 如果有精确坐标，可以平移并缩放地图
        console.log('显示坐标位置:', item.coordinates)
      } else if (item.location) {
        const district = item.location.substring(0, 3)
        this.$refs.shanghaiMap.highlightRegion(district)
      }
    }
  }
}
</script>

<style scoped>
.dashboard {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  margin-bottom: 20px;
  color: #2c3e50;
  text-align: center;
  font-weight: 600;
}

.dashboard-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  flex: 1;
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
  display: flex;
  flex-direction: column;
}

.stat-card h3 {
  margin-bottom: 10px;
  color: #606266;
  font-size: 16px;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 600;
  color: #409EFF;
  margin-bottom: 10px;
}

.stat-trend {
  font-size: 14px;
  color: #909399;
}

.stat-trend.up {
  color: #67C23A;
}

.stat-trend.down {
  color: #F56C6C;
}

.accuracy-bar {
  height: 6px;
  background-color: #f0f2f5;
  border-radius: 3px;
  margin-top: 5px;
  overflow: hidden;
}

.accuracy-progress {
  height: 100%;
  background-color: #67C23A;
  transition: width 0.5s ease;
}

.today-info {
  font-size: 14px;
  color: #909399;
  margin-top: auto;
}

.dashboard-charts {
  display: flex;
  gap: 20px;
}

.map-section {
  flex: 2;
  display: flex;
  flex-direction: column;
}

.map-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}

.map-filter {
  font-size: 14px;
  color: #606266;
}

.map-filter select {
  margin-left: 5px;
  padding: 4px 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background-color: white;
}

.stats-section {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.section-title {
  font-size: 18px;
  margin-bottom: 15px;
  font-weight: 600;
  color: #2c3e50;
}

.stats-tabs {
  display: flex;
  margin-bottom: 15px;
  border-bottom: 1px solid #e4e7ed;
}

.tab-item {
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: #606266;
  transition: all 0.3s;
  border-bottom: 2px solid transparent;
}

.tab-item:hover {
  color: #409EFF;
}

.tab-item.active {
  color: #409EFF;
  border-bottom-color: #409EFF;
}

.map-wrapper {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  height: 500px;
  flex: 1;
}

.stats-table {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 15px;
  height: 500px;
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 10px 8px;
  text-align: left;
  border-bottom: 1px solid #EBEEF5;
  font-size: 14px;
}

th {
  font-weight: 600;
  color: #606266;
  background-color: #F5F7FA;
}

tbody tr {
  cursor: pointer;
  transition: background-color 0.3s;
}

tbody tr:hover {
  background-color: #f5f7fa;
}

.accuracy-high {
  color: #67C23A;
}

.accuracy-medium {
  color: #E6A23C;
}

.accuracy-low {
  color: #F56C6C;
}

.trend-indicator {
  font-weight: bold;
}

.trend-indicator.up {
  color: #67C23A;
}

.trend-indicator.down {
  color: #F56C6C;
}

.data-note {
  margin-top: 15px;
  font-size: 12px;
  color: #909399;
  text-align: right;
}

@media (max-width: 768px) {
  .dashboard-stats,
  .dashboard-charts {
    flex-direction: column;
  }
  
  .map-wrapper,
  .stats-table {
    height: 400px;
  }
}
</style> 