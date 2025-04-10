# 智能图像识别应用

基于Vue.js和TensorFlow.js的图像识别系统，实现了实时物体检测与场景分析。

## 功能特点

- **实时物体检测**：利用YOLOv8模型实现高效准确的物体检测
- **场景分析**：基于检测到的物体自动分析场景类型
- **地理信息提取**：从图像EXIF数据中提取GPS信息
- **交互式界面**：直观展示检测结果，支持拖放上传
- **上海地图集成**：将识别结果显示在地图上

## 技术栈

- 前端框架：Vue.js 2.x
- 物体检测：TensorFlow.js + YOLOv8
- 地图可视化：ECharts
- 元数据提取：Exif.js

## 快速开始

### 系统要求

- Node.js 14.x 或更高版本
- 现代浏览器 (Chrome, Firefox, Edge 等)
- 支持WebGL的显卡
- Python 3.8+ (如果需要下载真实YOLOv8模型)

### 安装与运行

1. 克隆代码库
   ```bash
   git clone https://github.com/your-username/image-recognition-app.git
   cd image-recognition-app
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 选择模型类型

   **选项A：使用模拟模型** (快速启动，无需额外依赖)
   ```bash
   # 启动应用（自动使用模拟模型）
   npm run serve
   ```

   **选项B：使用真实YOLOv8模型** (推荐，需要Python环境)
   ```bash
   # 下载真实YOLOv8模型
   npm run download-real-yolo
   
   # 启动应用
   npm run serve
   ```

4. 在浏览器中访问 `http://localhost:8080`

### 手动获取真实YOLOv8模型

如果自动下载失败，您可以通过以下方式手动获取真实的YOLOv8模型：

1. 访问 https://github.com/Hyuto/yolov8-tfjs/releases/tag/yolov8n
2. 下载 `yolov8n-tfjs-web_model.zip` 文件
3. 解压缩到 `local_models/yolov8n_web_model` 目录
4. 复制所有文件到 `public/models/yolov8n_web_model` 目录

更多详细信息，请参阅 `local_models/GUIDE.md`

## 使用说明

1. 在主页面上传图片（支持拖拽）
2. 应用将自动提取图像元数据并显示
3. 点击"分析图像"按钮执行物体检测
4. 检测结果将以边界框形式显示，同时列出物体类型和置信度
5. 场景分析结果显示在图像顶部
6. 检测到的物体将在上海地图上标记出来

## 模型信息

应用支持两种模式：

### 真实YOLOv8模型 (推荐)
- 支持80种常见物体分类
- 平均检测时间：200-500ms（取决于设备性能）
- 模型大小：约35MB
- 需要WebGL支持

### 模拟模型 (备选方案)
- 支持相同的80种物体分类
- 使用预定义的检测结果
- 无需WebGL支持
- 适合在不支持TensorFlow.js的环境中使用

## 更新日志

### v1.2.0

- 增加真实YOLOv8模型支持
- 提供多种获取模型的方式
- 增强模拟模式的兼容性
- 优化界面响应性能

### v1.1.0

- 集成真实的YOLOv8模型，替换模拟实现
- 添加自动模型下载功能
- 优化图像处理流程
- 改进场景分析算法
- 添加模型性能监控

### v1.0.0

- 初始版本发布
- 基本物体检测功能
- 地图集成
- 用户界面实现

## 系统模块

1. **仪表盘**：展示识别统计数据和热力图
2. **图像识别**：上传和分析图像，检测物体
3. **地图展示**：在上海地图上展示识别位置

## 图像识别功能使用指南

1. 点击"图像识别"导航链接进入识别页面
2. 点击上传区域或将图片拖拽到上传区域
3. 等待模型加载完成（首次加载可能需要几秒钟）
4. 点击"开始识别"按钮进行图像分析
5. 查看识别结果，包括检测到的物体和场景分析

## 首次运行说明

首次运行应用时，需要进行以下设置：

1. 安装依赖：
   ```bash
   npm install
   ```

2. 下载YOLOv8模型文件：
   ```bash
   cd public/models/yolov8n_web_model
   node download-model.js
   ```

3. 启动开发服务器：
   ```bash
   npm run serve
   ```

4. 构建生产版本：
   ```bash
   npm run build
   ```

## 技术实现

- **前端框架**：Vue.js 2.x
- **路由管理**：Vue Router
- **目标检测**：YOLOv8模型（通过yolov8js库）
- **机器学习**：TensorFlow.js
- **可视化**：ECharts（地图和图表）

## YOLOv8模型说明

本项目使用YOLOv8n模型，这是YOLOv8系列中最轻量级的模型，适合在浏览器中运行。模型能够识别80种常见物体，包括人、车辆、动物和常见物品。

### 模型性能优化

- 使用WebGL加速模型推理
- 图像预处理优化
- 使用轻量级模型变体

## 高级自定义

您可以通过修改以下文件自定义检测行为：

- `src/components/ObjectDetection.vue`：调整检测阈值和参数
- `src/utils/ImageProcessor.js`：修改场景分析逻辑和上海地标数据

## 开源许可

本项目基于MIT许可发布，您可以自由使用、修改和分发。

## 项目结构

```
image-recognition-app/
├── public/               # 静态资源
│   └── index.html        # HTML入口
├── src/                  # 源代码
│   ├── assets/           # 资源文件
│   ├── components/       # Vue组件
│   │   └── ImageRecognition.vue  # 主要图像识别组件
│   ├── router/           # 路由配置
│   │   └── index.js
│   ├── views/            # 页面视图
│   │   └── Home.vue      # 首页视图
│   ├── App.vue           # 根组件
│   └── main.js           # 入口文件
├── package.json          # 项目配置
└── vue.config.js         # Vue CLI配置
```

## 注意事项

- 当前版本使用模拟数据模拟图像识别结果
- 地图使用ECharts的简化地图数据 