<template>
  <div class="map-container">
    <div ref="mapChart" class="echarts-map"></div>
    
    <div class="loading-overlay" v-if="loading">
      <div class="spinner"></div>
      <div>加载地图数据中...</div>
    </div>
    
    <div class="map-controls">
      <div class="zoom-controls">
        <button @click="zoomIn" title="放大"><i class="el-icon-plus"></i></button>
        <button @click="zoomOut" title="缩小"><i class="el-icon-minus"></i></button>
        <button @click="resetZoom" title="重置视图"><i class="el-icon-refresh"></i></button>
      </div>
    </div>
    
    <div class="map-legend">
      <div class="legend-title">识别密度</div>
      <div class="legend-items">
        <div v-for="(color, index) in legendColors" :key="index" class="legend-item">
          <span class="color-box" :style="{backgroundColor: color}"></span>
          <span class="legend-label">{{legendLabels[index]}}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts'

export default {
  name: 'ShanghaiMap',
  props: {
    markers: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      chart: null,
      mapLoaded: false,
      loading: true,
      zoom: 1,
      center: [121.47, 31.23], // 上海市中心坐标
      legendColors: ['#e0ffe0', '#b7ffb7', '#85ff85', '#4dff4d', '#1aff1a', '#00cc00', '#009900'],
      legendLabels: ['极低', '很低', '低', '中等', '高', '很高', '极高'],
      districtData: []
    }
  },
  watch: {
    markers: {
      handler(newMarkers) {
        if (this.mapLoaded && this.chart) {
          this.updateMarkers(newMarkers)
        }
      },
      deep: true
    }
  },
  mounted() {
    this.initMap()
  },
  beforeUnmount() {
    if (this.chart) {
      this.chart.dispose()
      this.chart = null
    }
    window.removeEventListener('resize', this.resizeChart)
  },
  methods: {
    async initMap() {
      this.loading = true
      
      try {
        // 使用真实的上海地图数据
        const response = await fetch('/shanghai-geo.json')
        const shanghaiJson = await response.json()
        
        // 注册地图数据
        echarts.registerMap('shanghai', shanghaiJson)
        
        // 初始化地图
        this.chart = echarts.init(this.$refs.mapChart)
        window.addEventListener('resize', this.resizeChart)
        
        // 生成随机区域数据
        this.generateRandomAreaData()
        
        // 设置地图配置
        this.setMapOptions()
        
        // 添加点击事件
        this.chart.on('click', this.handleMapClick)
        
        this.mapLoaded = true
        this.loading = false
        
        // 更新标记
        if (this.markers && this.markers.length > 0) {
          this.updateMarkers(this.markers)
        }
      } catch (error) {
        console.error('加载地图数据失败:', error)
        this.loading = false
      }
    },
    
    generateRandomAreaData() {
      // 上海区域数据
      const districts = [
        { name: '黄浦区', value: Math.floor(Math.random() * 1000) },
        { name: '徐汇区', value: Math.floor(Math.random() * 1000) },
        { name: '长宁区', value: Math.floor(Math.random() * 1000) },
        { name: '静安区', value: Math.floor(Math.random() * 1000) },
        { name: '普陀区', value: Math.floor(Math.random() * 1000) },
        { name: '虹口区', value: Math.floor(Math.random() * 1000) }
      ]
      
      this.districtData = districts
    },
    
    setMapOptions() {
      if (!this.chart) return
      
      const option = {
        backgroundColor: '#f8f9fa',
        tooltip: {
          trigger: 'item',
          formatter: params => {
            if (params.seriesType === 'map') {
              return `<div style="font-weight:bold;margin-bottom:5px">${params.name}</div>
                     识别计数: ${params.value || 0}<br/>
                     识别种类: 建筑物, 车辆, 行人`
            } else if (params.seriesType === 'effectScatter') {
              return `<div style="font-weight:bold;margin-bottom:5px">${params.data.name}</div>
                     识别类型: ${params.data.type}<br/>
                     识别计数: ${params.data.value[2]}<br/>
                     置信度: ${params.data.confidence}%<br/>
                     时间: ${params.data.time}`
            }
            return params.name
          }
        },
        visualMap: {
          type: 'continuous',
          min: 0,
          max: 1000,
          text: ['高', '低'],
          realtime: false,
          calculable: true,
          inRange: {
            color: this.legendColors
          },
          textStyle: {
            color: '#333'
          },
          left: 'left',
          top: 'bottom',
          show: false
        },
        geo: {
          map: 'shanghai',
          roam: true,
          zoom: this.zoom,
          center: this.center,
          scaleLimit: {
            min: 1,
            max: 5
          },
          itemStyle: {
            areaColor: '#f3f3f3',
            borderColor: '#ccc',
            borderWidth: 1
          },
          emphasis: {
            itemStyle: {
              areaColor: '#e6f7ff',
              shadowColor: 'rgba(0, 0, 0, 0.5)',
              shadowBlur: 5
            },
            label: {
              show: true,
              color: '#333'
            }
          }
        },
        series: [
          {
            name: '上海区域识别热力图',
            type: 'map',
            map: 'shanghai',
            geoIndex: 0,
            data: this.districtData
          },
          {
            name: '识别点',
            type: 'effectScatter',
            coordinateSystem: 'geo',
            symbolSize: val => Math.min(val[2] / 10, 20),
            showEffectOn: 'render',
            rippleEffect: {
              brushType: 'stroke'
            },
            hoverAnimation: true,
            itemStyle: {
              color: params => {
                // 基于confidence分配颜色
                const confidence = params.data.confidence
                if (confidence > 90) return '#ff4d4d'
                if (confidence > 80) return '#ff8c1a'
                if (confidence > 70) return '#ffcc00'
                return '#85c1e9'
              },
              shadowBlur: 10,
              shadowColor: '#333'
            },
            zlevel: 1,
            data: []
          }
        ]
      }
      
      this.chart.setOption(option)
    },
    
    updateMarkers(markers) {
      if (!this.chart || !this.mapLoaded) return
      
      const scatterData = markers.map(marker => ({
        name: marker.name || '识别点',
        value: [
          marker.lng || marker.coordinates[0],
          marker.lat || marker.coordinates[1],
          marker.count || 1
        ],
        type: marker.type || '建筑物',
        confidence: marker.confidence || Math.floor(Math.random() * 30) + 70,
        time: marker.time || this.formatTime(new Date())
      }))
      
      this.chart.setOption({
        series: [
          {
            name: '上海区域识别热力图',
            type: 'map',
            map: 'shanghai',
            geoIndex: 0,
            data: this.districtData
          },
          {
            name: '识别点',
            type: 'effectScatter',
            data: scatterData
          }
        ]
      })
    },
    
    highlightRegion(regionName) {
      if (!this.chart || !this.mapLoaded) return
      
      this.chart.dispatchAction({
        type: 'highlight',
        name: regionName
      })
      
      // 3秒后取消高亮
      setTimeout(() => {
        this.chart.dispatchAction({
          type: 'downplay',
          name: regionName
        })
      }, 3000)
    },
    
    handleMapClick(params) {
      if (params.componentType === 'geo' || params.componentType === 'series' && params.seriesType === 'map') {
        this.$emit('region-click', params.name)
      } else if (params.componentType === 'series' && params.seriesType === 'effectScatter') {
        this.$emit('marker-click', params.data)
      }
    },
    
    zoomIn() {
      if (!this.chart) return
      this.zoom += 0.5
      this.updateZoom()
    },
    
    zoomOut() {
      if (!this.chart || this.zoom <= 1) return
      this.zoom -= 0.5
      this.updateZoom()
    },
    
    resetZoom() {
      if (!this.chart) return
      this.zoom = 1
      this.center = [121.47, 31.23]
      this.updateZoom()
    },
    
    updateZoom() {
      this.chart.setOption({
        geo: {
          zoom: this.zoom,
          center: this.center
        }
      })
    },
    
    resizeChart() {
      if (this.chart) {
        this.chart.resize()
      }
    },
    
    formatTime(date) {
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `${hours}:${minutes}`
    }
  }
}
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.echarts-map {
  width: 100%;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.map-controls {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 10;
}

.zoom-controls {
  display: flex;
  flex-direction: column;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.zoom-controls button {
  border: none;
  background-color: white;
  padding: 8px;
  cursor: pointer;
  font-size: 16px;
  color: #555;
  transition: background-color 0.2s;
}

.zoom-controls button:hover {
  background-color: #f0f0f0;
}

.zoom-controls button:not(:last-child) {
  border-bottom: 1px solid #eee;
}

.map-legend {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background-color: white;
  border-radius: 4px;
  padding: 10px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.legend-title {
  font-weight: bold;
  margin-bottom: 5px;
  font-size: 12px;
}

.legend-items {
  display: flex;
  flex-direction: column;
}

.legend-item {
  display: flex;
  align-items: center;
  margin: 2px 0;
}

.color-box {
  width: 15px;
  height: 15px;
  margin-right: 5px;
  border: 1px solid #ddd;
}

.legend-label {
  font-size: 11px;
}
</style> 