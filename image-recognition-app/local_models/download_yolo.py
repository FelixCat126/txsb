#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
YOLOv8 TensorFlow.js模型下载脚本
此脚本将自动下载预转换的YOLOv8n TensorFlow.js模型文件
"""

import os
import sys
import requests
import shutil
import json
from zipfile import ZipFile
from io import BytesIO

# 模型下载链接
MODEL_LINKS = [
    # Hyuto的GitHub发布
    {
        "name": "GitHub Releases",
        "model_json": "https://github.com/Hyuto/yolov8-tfjs/raw/master/yolov8n/model.json",
        "weights_base": "https://github.com/Hyuto/yolov8-tfjs/raw/master/yolov8n/",
        "weights_pattern": [
            "group1-shard1of4.bin", 
            "group1-shard2of4.bin", 
            "group1-shard3of4.bin", 
            "group1-shard4of4.bin"
        ]
    },
    # jsdelivr CDN
    {
        "name": "jsDelivr CDN",
        "model_json": "https://cdn.jsdelivr.net/gh/Hyuto/yolov8-tfjs@master/yolov8n/model.json",
        "weights_base": "https://cdn.jsdelivr.net/gh/Hyuto/yolov8-tfjs@master/yolov8n/",
        "weights_pattern": [
            "group1-shard1of4.bin", 
            "group1-shard2of4.bin", 
            "group1-shard3of4.bin", 
            "group1-shard4of4.bin"
        ]
    },
    # HuggingFace
    {
        "name": "HuggingFace",
        "model_json": "https://huggingface.co/Hyuto/yolov8-tfjs/resolve/main/yolov8n/model.json",
        "weights_base": "https://huggingface.co/Hyuto/yolov8-tfjs/resolve/main/yolov8n/",
        "weights_pattern": [
            "group1-shard1of4.bin", 
            "group1-shard2of4.bin", 
            "group1-shard3of4.bin", 
            "group1-shard4of4.bin"
        ]
    },
    # 尝试下载COCO-SSD作为后备
    {
        "name": "COCO-SSD TensorFlow.js",
        "model_json": "https://storage.googleapis.com/tfjs-models/savedmodel/ssd_mobilenet_v2/model.json",
        "weights_base": "https://storage.googleapis.com/tfjs-models/savedmodel/ssd_mobilenet_v2/",
        "weights_pattern": [
            "group1-shard1of3.bin",
            "group1-shard2of3.bin",
            "group1-shard3of3.bin"
        ]
    }
]

# 输出目录
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "yolov8n_web_model")
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# GitHub API tokens (如果有的话可以增加请求限制)
GITHUB_TOKEN = None  # 如果有的话设置为"ghp_xxxxxx"

# 设置请求头
def get_headers():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    if GITHUB_TOKEN and "github.com" in url:
        headers["Authorization"] = f"token {GITHUB_TOKEN}"
    return headers

# 下载文件函数
def download_file(url, output_path):
    print(f"下载: {os.path.basename(output_path)}...")
    try:
        response = requests.get(url, headers=get_headers(), stream=True, timeout=30)
        response.raise_for_status()  # 检查请求是否成功
        
        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print(f"✓ 完成: {os.path.basename(output_path)}")
        return True
    except Exception as e:
        print(f"× 错误: {os.path.basename(output_path)} - {str(e)}")
        return False

# 尝试修复model.json中的路径
def fix_model_json(json_path):
    try:
        with open(json_path, 'r') as f:
            model_data = json.load(f)
        
        # 修改权重文件路径，确保只包含文件名
        if 'weightsManifest' in model_data:
            for manifest in model_data['weightsManifest']:
                if 'paths' in manifest:
                    manifest['paths'] = [os.path.basename(path) for path in manifest['paths']]
        
        with open(json_path, 'w') as f:
            json.dump(model_data, f, indent=2)
        
        print("✓ 修复: model.json文件路径")
        return True
    except Exception as e:
        print(f"× 修复model.json失败: {str(e)}")
        return False

# 从model.json中提取权重文件列表
def extract_weight_files(json_path):
    try:
        with open(json_path, 'r') as f:
            model_data = json.load(f)
        
        weight_files = []
        if 'weightsManifest' in model_data:
            for manifest in model_data['weightsManifest']:
                if 'paths' in manifest:
                    weight_files.extend(manifest['paths'])
        
        return weight_files
    except Exception as e:
        print(f"× 提取权重文件列表失败: {str(e)}")
        return []

# 尝试从不同的源下载模型
def try_download_model():
    for source in MODEL_LINKS:
        print(f"\n尝试从 {source['name']} 下载模型...")
        
        # 下载model.json
        model_json_path = os.path.join(OUTPUT_DIR, "model.json")
        if not download_file(source['model_json'], model_json_path):
            print(f"从 {source['name']} 下载model.json失败，尝试下一个源...")
            continue
        
        # 修复model.json中的路径
        fix_model_json(model_json_path)
        
        # 尝试从model.json中提取权重文件列表
        weight_files = extract_weight_files(model_json_path)
        
        # 如果无法从model.json获取权重文件列表，使用预设的模式
        if not weight_files:
            weight_files = source['weights_pattern']
        
        # 下载所有权重文件
        success = True
        for weight_file in weight_files:
            weight_url = f"{source['weights_base']}{weight_file}"
            weight_path = os.path.join(OUTPUT_DIR, weight_file)
            
            if not download_file(weight_url, weight_path):
                success = False
                break
        
        if success:
            print(f"\n✅ 成功从 {source['name']} 下载完整模型!")
            return True
        else:
            print(f"从 {source['name']} 下载权重文件失败，尝试下一个源...")
    
    return False

# 尝试下载预打包的zip文件
def try_download_zip():
    ZIP_URLS = [
        "https://github.com/Hyuto/yolov8-tfjs/releases/download/yolov8n/yolov8n-tfjs-web_model.zip",
        "https://huggingface.co/Hyuto/yolov8-tfjs/resolve/main/yolov8n-tfjs-web_model.zip"
    ]
    
    for url in ZIP_URLS:
        try:
            print(f"\n尝试下载打包的模型文件: {url}")
            response = requests.get(url, headers=get_headers(), timeout=60)
            response.raise_for_status()
            
            with ZipFile(BytesIO(response.content)) as zipf:
                # 解压到输出目录
                print("正在解压模型文件...")
                for member in zipf.namelist():
                    # 跳过目录条目和非必需文件
                    if member.endswith('/') or '__MACOSX' in member:
                        continue
                    
                    # 提取文件名部分
                    filename = os.path.basename(member)
                    if not filename:  # 如果是目录
                        continue
                    
                    # 解压文件
                    with zipf.open(member) as source:
                        with open(os.path.join(OUTPUT_DIR, filename), 'wb') as target:
                            shutil.copyfileobj(source, target)
                    print(f"✓ 解压: {filename}")
            
            print("\n✅ 成功下载并解压模型文件!")
            return True
        except Exception as e:
            print(f"× 下载或解压失败: {str(e)}")
    
    return False

# 主函数
def main():
    print("开始下载YOLOv8n TensorFlow.js模型文件...")
    
    # 首先尝试下载预打包的zip文件
    if try_download_zip():
        return True
    
    # 如果zip下载失败，尝试单独下载文件
    if try_download_model():
        return True
    
    print("\n❌ 所有下载尝试都失败。")
    print("请尝试手动下载模型文件，或检查网络连接。")
    print("另一种选择是使用较小的COCO-SSD模型代替YOLOv8。")
    return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 