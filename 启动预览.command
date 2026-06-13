#!/bin/zsh
cd "$(dirname "$0")"
echo "唐少博的数字战争本地预览已启动："
echo "http://127.0.0.1:5173/play.html"
echo ""
echo "保持这个窗口打开，关闭窗口会停止预览。"
python3 -m http.server 5173 --bind 127.0.0.1
