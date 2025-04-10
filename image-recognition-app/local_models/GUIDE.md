# 手动准备YOLOv8 TensorFlow.js模型

本指南提供了多种方法来手动获取真实的YOLOv8 TensorFlow.js模型文件，以便在图像识别应用中使用。

## 选项一：直接下载预转换的YOLOv8 TensorFlow.js模型

1. 访问 https://github.com/Hyuto/yolov8-tfjs/releases/tag/yolov8n
2. 下载 `yolov8n-tfjs-web_model.zip` 文件
3. 解压缩文件到 `local_models/yolov8n_web_model` 目录
4. 确保该目录包含以下文件：
   - `model.json`
   - `group1-shard1of4.bin`
   - `group1-shard2of4.bin`
   - `group1-shard3of4.bin`
   - `group1-shard4of4.bin`

## 选项二：使用Python脚本转换YOLOv8模型

如果您想从原始YOLOv8模型转换，请按照以下步骤操作：

### 前提条件
- Python 3.8或更高版本
- pip包管理器

### 步骤

1. 创建虚拟环境（推荐）：
```bash
python -m venv yolo_env
# 在Windows上激活
yolo_env\Scripts\activate
# 在Linux/Mac上激活
source yolo_env/bin/activate
```

2. 安装必要的包：
```bash
pip install ultralytics tensorflowjs
```

3. 创建一个转换脚本 `convert_yolo.py`：
```python
from ultralytics import YOLO
import tensorflowjs as tfjs
import os
import shutil

# 下载YOLOv8n模型
model = YOLO('yolov8n.pt')

# 导出为ONNX格式
model.export(format='onnx', imgsz=640)

# 转换为TensorFlow.js格式
onnx_model_path = 'yolov8n.onnx'
tfjs_output_path = 'yolov8n_web_model'

if not os.path.exists(tfjs_output_path):
    os.makedirs(tfjs_output_path)

# 使用tensorflowjs转换器
tfjs.converters.convert_tf_saved_model(
    onnx_model_path,
    tfjs_output_path
)

print(f"模型已转换并保存到 {tfjs_output_path}")
```

4. 运行转换脚本：
```bash
python convert_yolo.py
```

5. 将生成的模型文件复制到应用的本地模型目录：
```bash
cp -r yolov8n_web_model/* path/to/image-recognition-app/local_models/yolov8n_web_model/
```

## 选项三：使用替代对象检测模型

如果YOLOv8模型无法获取，您可以使用其他预训练的对象检测模型：

1. 访问 https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd
2. 下载COCO-SSD模型（比YOLOv8小且更容易获取）：
```bash
curl -O https://storage.googleapis.com/tfjs-models/savedmodel/ssd_mobilenet_v2/model.json
```

3. 下载相关的权重文件（根据model.json中的references）

4. 将下载的文件放在 `local_models/yolov8n_web_model` 目录中

## 验证模型文件

无论使用哪种方法，请确保：

1. 模型文件位于正确的目录中
2. `model.json` 中的权重文件路径正确（只包含文件名，不包含路径）
3. 所有引用的权重文件都存在

## 备注

- YOLOv8n是最小的YOLOv8模型版本，适合浏览器中运行
- 较大的模型（如YOLOv8m、YOLOv8l）准确度更高但加载和推理速度更慢
- 如果遇到CORS问题，请确保从相同域或配置了正确CORS头的服务器加载模型 