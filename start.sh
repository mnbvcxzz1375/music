#!/bin/bash

echo "========================================"
echo "  🎵 音乐练习应用 - 一键启动"
echo "========================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 未检测到 Node.js，请先安装 Node.js 18+${NC}"
    echo "   下载地址: https://nodejs.org/"
    exit 1
fi

# 显示 Node.js 版本
NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js 版本: $NODE_VERSION${NC}"
echo ""

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "📦 首次运行，正在安装依赖..."
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ 依赖安装失败${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ 依赖安装完成${NC}"
    echo ""
fi

# 运行类型检查
echo "🔍 正在进行类型检查..."
npm run type-check
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️ 类型检查发现问题，但仍尝试启动...${NC}"
    echo ""
else
    echo -e "${GREEN}✅ 类型检查通过${NC}"
    echo ""
fi

# 启动开发服务器
echo "🚀 启动开发服务器..."
echo ""
echo "========================================"
echo "  地址: http://localhost:5173"
echo "  按 Ctrl+C 停止服务"
echo "========================================"
echo ""

# 尝试打开浏览器
if command -v open &> /dev/null; then
    # macOS
    sleep 3 && open http://localhost:5174 &
elif command -v xdg-open &> /dev/null; then
    # Linux
    sleep 3 && xdg-open http://localhost:5174 &
fi

# 启动 Vite 开发服务器
npm run dev