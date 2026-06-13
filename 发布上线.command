#!/bin/zsh
set -e

cd "$(dirname "$0")"

NODE_BIN=""
for candidate in \
  "/Users/tang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" \
  "/Applications/Codex.app/Contents/Resources/node" \
  "/opt/homebrew/bin/node" \
  "/usr/local/bin/node"
do
  if [ -x "$candidate" ]; then
    NODE_BIN="$candidate"
    break
  fi
done

if [ -z "$NODE_BIN" ] && command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
fi

if [ -n "$NODE_BIN" ]; then
  echo "正在生成最新单文件预览..."
  "$NODE_BIN" scripts/build-single-preview.mjs
else
  echo "没有找到 Node，跳过预览生成，使用现有预览文件继续上线。"
fi

PUBLISH_DIR="/tmp/number-war-publish"
echo "正在整理发布文件..."
rm -rf "$PUBLISH_DIR"
mkdir -p "$PUBLISH_DIR"

rsync -a \
  --exclude ".git" \
  --exclude "node_modules" \
  --exclude "dist" \
  --exclude ".vercel" \
  --exclude ".DS_Store" \
  --exclude "Number-war-ready.zip" \
  ./ "$PUBLISH_DIR/"

cd "$PUBLISH_DIR"

if [ ! -d ".git" ]; then
  git init -b main
else
  git checkout -B main
fi

git config user.name "Tangshaobo90"
git config user.email "tangshaobo90@gmail.com"

git add .
git commit -m "Sync candy skin game build" || true

git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/Tangshaobo90/Number-war.git

export http_proxy="${http_proxy:-http://localhost:7897}"
export https_proxy="${https_proxy:-http://localhost:7897}"

echo "正在同步到 GitHub..."
git push -u origin main --force

echo ""
echo "同步完成。Vercel 会自动开始部署。"
echo "仓库：https://github.com/Tangshaobo90/Number-war"
echo ""
read -n 1 -s -r "按任意键关闭窗口..."
