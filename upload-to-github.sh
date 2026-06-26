#!/bin/bash

# GitHub 上传脚本
# 使用方法：
# 1. 先登录 GitHub：gh auth login
# 2. 运行本脚本：bash upload-to-github.sh

set -e

REPO_NAME="workbuddy-vefaas-skills"
REPO_DESC="WorkBuddy Skills - 微信小程序 + VeFaaS 开发技能包（4个独立技能）"
PRIVATE=false  # 改为 true 如果要做私有仓库

echo "=== GitHub 上传脚本 ==="
echo ""

# 检查 gh CLI 是否登录
echo "[1/4] 检查 GitHub 登录状态..."
if ! gh auth status &>/dev/null; then
  echo "错误：未登录 GitHub"
  echo "请先运行：gh auth login"
  exit 1
fi
echo "✓ 已登录 GitHub"
echo ""

# 进入仓库目录
cd /tmp/vefaas-skills-repo

# 重命名分支为 main
echo "[2/4] 重命名分支为 main..."
git branch -M main
echo "✓ 分支已重命名为 main"
echo ""

# 创建 GitHub 仓库
echo "[3/4] 创建 GitHub 仓库..."
if gh repo view "$REPO_NAME" &>/dev/null; then
  echo "仓库已存在，跳过创建"
else
  gh repo create "$REPO_NAME" \
    --description "$REPO_DESC" \
    $([ "$PRIVATE" = true ] && echo "--private" || echo "--public") \
    --source=. \
    --push
fi
echo ""

# 推送到 GitHub
echo "[4/4] 推送到 GitHub..."
git push -u origin main
echo ""

echo "=== 上传完成 ==="
echo "仓库地址：https://github.com/$(gh api user --jq '.login')/$REPO_NAME"
echo ""
echo "下一步："
echo "1. 访问仓库地址确认上传成功"
echo "2. 编辑 README.md 中的 GitHub 用户名"
echo "3. 分享给团队或社区"
