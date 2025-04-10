@echo off
title 图像识别应用启动器
color 0A

echo 欢迎使用图像识别应用！
echo ==============================
echo.
echo 请选择模型类型:
echo 1 - 使用模拟模型 (快速启动，无需额外依赖)
echo 2 - 使用真实YOLOv8模型 (推荐，需要Python环境)
echo.
set /p model_choice="请输入选项 (1 或 2): "

if "%model_choice%"=="2" (
    echo.
    echo 您选择了使用真实YOLOv8模型。
    echo 开始下载真实YOLOv8模型...
    call download_real_yolo.bat
) else (
    echo.
    echo 您选择了使用模拟模型。
    echo 准备模拟模型文件...
    call npm run download-models
)

echo.
echo 安装依赖中...
call npm install

echo.
echo 启动应用服务器...
call npm run serve

pause 