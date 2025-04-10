# YOLOv8模型集成指南

本目录用于存放YOLOv8模型文件，以便在浏览器中使用yolov8js库进行实时目标检测。

## 获取模型文件

YOLOv8模型需要转换为TensorFlow.js格式才能在浏览器中使用。请按照以下步骤获取模型文件：

### 方法1：使用官方预训练模型

1. 安装Ultralytics和tensorflowjs：
   ```bash
   pip install ultralytics tensorflowjs
   ```

2. 使用Python脚本转换模型：
   ```python
   from ultralytics import YOLO
   import tensorflowjs as tfjs
   import os

   # 下载YOLOv8n模型
   model = YOLO('yolov8n.pt')
   
   # 导出为ONNX格式
   model.export(format='onnx', imgsz=640)
   
   # 将ONNX转换为TensorFlow.js格式
   # 假设ONNX模型保存在当前目录下的yolov8n.onnx
   input_path = 'yolov8n.onnx'
   output_path = 'yolov8n_web_model'
   
   if not os.path.exists(output_path):
       os.makedirs(output_path)
   
   # 转换模型
   tfjs.converters.convert_to_tfjs_graph_model(
       input_path,
       output_path
   )
   ```

3. 将生成的模型文件（包括model.json和*.bin文件）复制到此目录。

### 方法2：使用预转换模型

1. 访问以下资源下载已转换好的模型：
   - [YOLO TF.js Models](https://github.com/Hyuto/yolo-tfjs-models)
   - [yolov8-tfjs](https://github.com/Hyuto/yolov8-tfjs)

2. 下载YOLOv8n模型，将所有文件解压到本目录。

## 使用模型

在实际部署时，需要完成以下步骤：

1. 安装依赖：
   ```bash
   npm install @tensorflow/tfjs yolov8js
   ```

2. 取消ObjectDetection.vue中的注释代码：
   - 删除模拟加载和检测的代码
   - 取消`import`语句和`loadModel()`方法的注释
   - 在`mounted()`中调用`this.loadModel()`而不是`this.simulateModelLoading()`

## 调整模型设置

根据性能需求，可以考虑以下调整：

1. 使用更小的模型版本：
   - YOLOv8n（默认）：最轻量级，适合移动设备
   - YOLOv8s：小型模型，精度和速度平衡
   - YOLOv8m：中型模型，更高精度但速度较慢

2. 降低检测分辨率以提高速度：
   - 在模型检测时可以指定图像大小：
     ```javascript
     // 降低分辨率提高速度
     const predictions = await this.model.detect(image, {
       size: 416, // 默认是640
       confThreshold: 0.25 // 置信度阈值
     });
     ```

## 注意事项

1. 首次加载模型可能需要几秒到几十秒不等，取决于网络速度和模型大小
2. 在移动设备上性能可能受限，建议使用更小的模型或降低检测分辨率
3. 模型文件总大小约为20-30MB，请确保有足够的缓存空间 