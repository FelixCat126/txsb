/**
 * 图像处理工具类
 * 用于图像预处理、EXIF数据提取和GIS信息提取
 */

import EXIF from 'exif-js';

// 通用地标映射数据（当无法获取真实GPS数据时使用）
const LANDMARKS = [
  { name: '城市广场', lat: 31.2304, lng: 121.4737, radius: 0.8 },
  { name: '滨水区', lat: 31.2448, lng: 121.4836, radius: 1.2 },
  { name: '金融中心', lat: 31.2347, lng: 121.5078, radius: 1.0 },
  { name: '古典园林', lat: 31.2271, lng: 121.4762, radius: 0.6 },
  { name: '文化街区', lat: 31.2242, lng: 121.4677, radius: 0.7 },
  { name: '商业区', lat: 31.2353, lng: 121.4717, radius: 0.9 },
  { name: '历史寺庙', lat: 31.2267, lng: 121.4471, radius: 0.6 },
  { name: '步行商业街', lat: 31.2363, lng: 121.4810, radius: 0.8 },
  { name: '中央车站', lat: 31.2495, lng: 121.4560, radius: 1.0 },
  { name: '交通枢纽', lat: 31.2673, lng: 121.4688, radius: 1.5 },
  { name: '国际机场', lat: 31.1443, lng: 121.8053, radius: 2.0 },
  { name: '主题公园', lat: 31.1452, lng: 121.6579, radius: 1.8 },
  { name: '中央公园', lat: 31.2242, lng: 121.4384, radius: 1.3 }
];

// 时间段分类
const TIME_PERIODS = [
  { name: '清晨', start: 5, end: 8 },
  { name: '上午', start: 8, end: 12 },
  { name: '中午', start: 12, end: 14 },
  { name: '下午', start: 14, end: 18 },
  { name: '傍晚', start: 18, end: 20 },
  { name: '夜晚', start: 20, end: 23 },
  { name: '深夜', start: 23, end: 5 }
];

// 匹配图片前缀
const MATCH_IMAGE_PREFIX = '/images/matches/';

// 颜色数组用于生成占位图
const COLORS = [
  '#4285f4', '#ea4335', '#fbbc05', '#34a853',
  '#ff6d01', '#46bdc6', '#7baaf7', '#f07b72',
  '#fcd04f', '#71c287', '#ffa14e', '#87d3cf', '#a0c1fa'
];

class ImageProcessor {
  /**
   * 从图像中提取元数据（如果有）
   * @param {File} imageFile - 图像文件
   * @returns {Promise<Object>} 元数据对象
   */
  static async extractMetadata(imageFile) {
    return new Promise((resolve) => {
      const metadata = {
        hasGeoTag: false,
        location: null,
        timestamp: null,
        estimatedTime: this._getTimePeriod(new Date().getHours()),
        locationGuess: null
      };
      
      // 尝试从文件名猜测位置
      metadata.locationGuess = this._guessLocationFromFilename(imageFile.name);
      
      // 如果浏览器支持EXIF读取，可以在这里添加EXIF读取代码
      
      resolve(metadata);
    });
  }
  
  /**
   * 分析场景，基于检测到的物体
   * @param {Array} detections - 检测到的物体数组
   * @returns {Object} 场景分析结果
   */
  static analyzeScene(detections) {
    // 根据检测到的物体分类场景
    const objectTypes = detections.map(d => d.class);
    const objectCounts = {};
    
    // 统计各类物体数量
    for (const type of objectTypes) {
      objectCounts[type] = (objectCounts[type] || 0) + 1;
    }
    
    // 判断场景类型
    let sceneType = '普通场景';
    let sceneProbability = 50;
    
    // 排序获取前3种最多的物体
    const topObjects = Object.entries(objectCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
    
    // 基于物体组合判断场景类型
    if (objectTypes.includes(0) && (objectTypes.includes(2) || objectTypes.includes(5))) {
      sceneType = '城市街道';
      sceneProbability = 85;
    } else if (objectTypes.includes(0) && objectTypes.filter(t => [56, 60, 41, 44, 42, 43].includes(t)).length >= 2) {
      sceneType = '餐厅/咖啡厅';
      sceneProbability = 80;
    } else if (objectTypes.filter(t => [62, 57, 56, 58].includes(t)).length >= 2) {
      sceneType = '室内生活空间';
      sceneProbability = 75;
    } else if (objectTypes.filter(t => [58, 14, 13].includes(t)).length >= 1) {
      sceneType = '公园/自然环境';
      sceneProbability = 70;
    } else if (objectTypes.filter(t => [2, 7, 3, 1, 5].includes(t)).length >= 2) {
      sceneType = '交通/道路';
      sceneProbability = 80;
    } else if (detections.length > 5) {
      sceneType = '复杂场景';
      sceneProbability = 60;
    }
    
    return {
      sceneType,
      sceneProbability,
      topObjects
    };
  }
  
  /**
   * 从文件名中猜测位置
   * @private
   */
  static _guessLocationFromFilename(filename) {
    filename = filename.toLowerCase();
    
    for (const landmark of LANDMARKS) {
      if (filename.includes(landmark.name.toLowerCase()) || 
          filename.includes(landmark.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())) {
        return landmark.name;
      }
    }
    
    return null;
  }
  
  /**
   * 获取当前时间段名称
   * @private
   */
  static _getTimePeriod(hour) {
    const periods = [
      { start: 6, end: 11, name: '上午' },
      { start: 11, end: 13, name: '中午' },
      { start: 13, end: 18, name: '下午' },
      { start: 18, end: 22, name: '晚上' },
      { start: 22, end: 6, name: '夜间' }
    ];
    
    for (const period of periods) {
      if (period.start < period.end) {
        // 正常时间段
        if (hour >= period.start && hour < period.end) {
          return period.name;
        }
      } else {
        // 处理跨午夜的时间段
        if (hour >= period.start || hour < period.end) {
          return period.name;
        }
      }
    }
    return '默认时间';
  }

  /**
   * 从文件名生成哈希值用于匹配图片
   * @param {String} filename - 文件名
   * @returns {String} 哈希值
   */
  static generateHashFromFilename(filename) {
    // 简单的哈希算法，将文件名转换为数字
    let hash = 0;
    for (let i = 0; i < filename.length; i++) {
      const char = filename.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    // 将哈希值转换为1-4之间的数字
    const hashNumber = Math.abs(hash) % 4 + 1;
    return hashNumber.toString();
  }
  
  /**
   * 处理上传的图片，返回原图的略大副本
   * @param {String} originalDataUrl - 原始图片的Data URL
   * @returns {Promise<String>} 处理后的图片Data URL
   */
  static async processImageForDisplay(originalDataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          // 创建Canvas元素
          const canvas = document.createElement('canvas');
          
          // 计算新尺寸，比原图略大10%
          const scale = 1.1;
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          
          const ctx = canvas.getContext('2d');
          
          // 绘制略大的图像
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // 返回处理后的图像
          resolve(canvas.toDataURL('image/jpeg'));
        } catch (error) {
          console.error('处理图像时出错:', error);
          // 出错时返回原图
          resolve(originalDataUrl);
        }
      };
      
      img.onerror = () => {
        console.error('加载图像时出错');
        // 出错时返回原图
        resolve(originalDataUrl);
      };
      
      img.src = originalDataUrl;
    });
  }
  
  /**
   * 将GPS坐标从度分秒(DMS)格式转换为十进制度(DD)格式
   * @private
   * @param {Array} coordinates - GPS坐标数组 [度, 分, 秒]
   * @param {String} direction - 方向 (N, S, E, W)
   * @returns {Number} 十进制度格式的坐标
   */
  static _convertDMSToDD(coordinates, direction) {
    if (!coordinates || coordinates.length < 3) {
      return 0;
    }
    
    let dd = coordinates[0] + coordinates[1] / 60 + coordinates[2] / 3600;
    
    // 对于南纬和西经，坐标为负数
    if (direction === 'S' || direction === 'W') {
      dd = -dd;
    }
    
    return dd;
  }
  
  /**
   * 从图像的EXIF数据中提取GPS信息
   * @param {File} imageFile - 图像文件
   * @returns {Promise<Object>} GPS信息对象
   */
  static extractExifGPS(imageFile) {
    console.log('开始提取EXIF数据，文件:', imageFile.name, '类型:', imageFile.type);
    
    return new Promise((resolve) => {
      // 默认GPS信息
      const defaultGPSInfo = {
        hasGeoTag: false,
        latitude: 0,
        longitude: 0,
        locationName: null
      };
      
      // 如果不是图片文件，直接返回默认值
      if (!imageFile || !imageFile.type.startsWith('image/')) {
        console.log('不是图片文件，跳过EXIF提取');
        resolve(defaultGPSInfo);
        return;
      }
      
      try {
        // 确保EXIF库正确加载
        if (!EXIF) {
          console.error('EXIF库未正确加载');
          resolve(defaultGPSInfo);
          return;
        }
        
        // 辅助方法：打印图片所有可用标签
        const logAllTags = (exifData) => {
          console.log('所有EXIF标签:');
          for (const key in exifData) {
            console.log(`${key}: ${exifData[key]}`);
          }
        };
        
        // 使用EXIF库提取数据
        EXIF.getData(imageFile, function() {
          try {
            // 尝试获取GPS数据
            console.log('EXIF.getData 完成，开始分析标签');
            const exifData = EXIF.getAllTags(this);
            
            // 记录所有标签用于调试
            logAllTags(exifData);
            
            // 特别检查GPS标签的存在
            if (exifData.GPSLatitude) {
              console.log('找到GPS纬度:', exifData.GPSLatitude);
            } else {
              console.log('未找到GPS纬度标签');
            }
            
            if (exifData.GPSLongitude) {
              console.log('找到GPS经度:', exifData.GPSLongitude);
            } else {
              console.log('未找到GPS经度标签');
            }
            
            // 尝试使用备用方法读取GPS信息
            const lat = EXIF.getTag(this, "GPSLatitude");
            const latRef = EXIF.getTag(this, "GPSLatitudeRef");
            const lng = EXIF.getTag(this, "GPSLongitude");
            const lngRef = EXIF.getTag(this, "GPSLongitudeRef");
            
            console.log('备用方法获取的GPS信息:', { lat, latRef, lng, lngRef });
            
            if (lat && lng) {
              // 将GPS坐标从度分秒转换为十进制度
              const latitude = ImageProcessor._convertDMSToDD(lat, latRef);
              const longitude = ImageProcessor._convertDMSToDD(lng, lngRef);
              
              console.log('成功提取GPS坐标:', latitude, longitude);
              
              resolve({
                hasGeoTag: true,
                latitude: latitude,
                longitude: longitude,
                locationName: '拍摄位置',
                altitude: EXIF.getTag(this, "GPSAltitude") ? EXIF.getTag(this, "GPSAltitude").valueOf() : null,
                timestamp: EXIF.getTag(this, "DateTimeOriginal") || EXIF.getTag(this, "DateTime")
              });
              return;
            }
            
            // 如果EXIF中没有GPS数据，返回默认值
            console.log('图片没有GPS标签，使用默认值');
            resolve(defaultGPSInfo);
          } catch (error) {
            console.error('解析EXIF数据时出错:', error);
            resolve(defaultGPSInfo);
          }
        });
      } catch (error) {
        console.error('获取EXIF数据时出错:', error);
        resolve(defaultGPSInfo);
      }
    });
  }
  
  /**
   * 获取与匹配图片对应的地标信息
   * @param {String} filename - 原始文件名
   * @returns {Object} 地标信息对象
   */
  static getLandmarkFromFilename(filename) {
    const hash = this.generateHashFromFilename(filename);
    // 使用哈希值来确定地标索引
    const index = (parseInt(hash) - 1) % LANDMARKS.length;
    return LANDMARKS[index];
  }
  
  /**
   * 从图像中提取GIS地理位置信息，优先使用EXIF数据
   * @param {File} imageFile - 图像文件对象
   * @param {String} dataUrl - 图像的Data URL
   * @returns {Promise<Object>} 地理信息对象
   */
  static async extractGeoInfo(imageFile, dataUrl) {
    // 首先尝试读取EXIF中的GPS数据
    const exifGPS = await this.extractExifGPS(imageFile);
    console.log('提取的EXIF GPS数据:', exifGPS);
    
    // 处理图像，创建略大的副本
    const processedDataUrl = await this.processImageForDisplay(dataUrl);
    
    if (exifGPS.hasGeoTag) {
      // 如果图片有GPS标签，使用真实数据
      console.log('使用真实GPS数据');
      return {
        hasGeoTag: true,
        latitude: exifGPS.latitude,
        longitude: exifGPS.longitude,
        locationName: exifGPS.locationName || '拍摄位置',
        matchedImageUrl: processedDataUrl,
        isRealGPS: true,
        timestamp: exifGPS.timestamp
      };
    } else {
      // 如果没有GPS标签，使用基于文件名的模拟数据
      console.log('使用模拟GPS数据');
      const landmark = this.getLandmarkFromFilename(imageFile.name);
      return {
        hasGeoTag: true,
        latitude: landmark.lat,
        longitude: landmark.lng,
        locationName: landmark.name,
        matchedImageUrl: processedDataUrl,
        isRealGPS: false
      };
    }
  }
  
  /**
   * 读取文件为DataURL
   * @param {File} file - 文件对象
   * @returns {Promise<string>} 文件的DataURL
   */
  static readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        resolve(event.target.result);
      };
      
      reader.onerror = (error) => {
        reject(error);
      };
      
      reader.readAsDataURL(file);
    });
  }
}

export default ImageProcessor; 