@echo off
echo 开始下载真实YOLOv8模型...
echo.

rem 检查Python是否已安装
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo Python未安装，请安装Python 3.8或更高版本后再尝试。
  echo 您可以从 https://www.python.org/downloads/ 下载Python
  goto :end
)

rem 检查pip是否可用
python -m pip --version >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo pip不可用，请安装pip后再尝试。
  goto :end
)

echo 安装必要的Python包...
python -m pip install requests

echo.
echo 开始下载YOLOv8模型文件...
python local_models\download_yolo.py

if %ERRORLEVEL% EQU 0 (
  echo.
  echo 模型下载成功！
  echo 将使用真实的YOLOv8模型进行图像识别。
) else (
  echo.
  echo 模型下载失败。
  echo 将使用模拟模型。如需使用真实模型，请参阅 local_models\GUIDE.md 手动下载。
)

rem 复制模型文件到应用目录
echo.
echo 正在将模型文件复制到应用目录...
if exist local_models\yolov8n_web_model\model.json (
  xcopy /s /y local_models\yolov8n_web_model\*.* public\models\yolov8n_web_model\
  echo 模型文件已复制到 public\models\yolov8n_web_model\
) else (
  echo 未找到模型文件，将使用模拟模型。
)

echo.
echo 模型准备完成，现在您可以运行应用了。
echo 使用 'npm run serve' 启动应用服务器。

:end
pause 