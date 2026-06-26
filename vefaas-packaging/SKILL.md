---
name: vefaas-packaging
description: >
  VeFaaS (Volcano Engine 云函数) 函数打包与部署指南。
  涵盖函数目录结构、run.sh 启动入口、打包命令、zip 包内容检查、VeFaaS 控制台上传流程、
  以及自动化部署脚本的使用方法。
  当用户需要打包 VeFaaS 函数、部署到火山引擎、或遇到部署相关错误（如 function_start_failed、exit 127）时使用此技能。
agent_created: true
---

# VeFaaS 函数打包与部署指南

本 skill 提供 VeFaaS (Volcano Engine 云函数) 的打包与部署完整流程，基于「即兴游戏库」小程序项目的实际踩坑经验。

## 适用场景

- 首次打包并部署 VeFaaS 函数
- 更新已有 VeFaaS 函数代码
- 遇到部署错误（function_start_failed、exit 127、模块找不到等）
- 需要编写自动化部署脚本
- 需要了解 VeFaaS 函数目录结构和必需文件

## 核心概念

### VeFaaS 函数限制

| 限制 | 说明 | 对打包的影响 |
|------|------|-------------|
| **只读文件系统** | 运行时不能 `npm install` | `node_modules/` 必须打包在 zip 中 |
| **唯一可写目录** | 只有 `/tmp` 可写 | 不要在函数中写文件到非 `/tmp` 路径 |
| **端口要求** | 必须监听 `*:8000` | `index.js` 中 `app.listen(8000, '0.0.0.0')` |
| **启动入口** | 必须提供 `run.sh` | 缺少会导致 `exit 127` 错误 |

### 标准项目结构

```
freegame/                          # VeFaaS 函数目录
├── run.sh                         # ✅ 启动入口（必需）
├── index.js                       # ✅ Express 入口（必需）
├── package.json                   # ✅ 依赖声明（必需）
├── package-lock.json              # 锁定版本（推荐）
├── .env                           # 环境变量（本地开发，不要打包）
├── lib/                           # 业务逻辑模块
│   ├── store.js
│   ├── wechat.js
│   ├── auth.js
│   ├── invite.js
│   └── room.js
├── routes/
│   └── api.js                     # API 路由
└── node_modules/                  # ✅ 依赖包（必需，已安装生产依赖）
```

## 打包流程

### 方法 1：手动打包（推荐用于首次部署）

```bash
cd /path/to/vefaas-function

# 1. 安装生产依赖
npm install --production

# 2. 确保 run.sh 有执行权限
chmod +x run.sh

# 3. 打包（输出到上级目录，避免把 zip 包自己也打进去）
cd /path/to/vefaas-function
zip -r ../vefaas-deploy.zip \
  run.sh \
  index.js \
  package.json \
  package-lock.json \
  lib/ \
  routes/ \
  node_modules/ \
  -x "node_modules/.cache/*" "node_modules/.npm/*" "*.test.js" "test-*.js"
```

**打包结果**：
- 包路径：`../vefaas-deploy.zip`
- 包大小：通常 3-10 MB（取决于依赖数量）
- 验证：`unzip -l ../vefaas-deploy.zip | head -20`

### 方法 2：自动化部署脚本

使用 `scripts/deploy.sh`（本 skill 附带）：

```bash
cd /path/to/vefaas-function
bash ../vefaas-development-guide/scripts/deploy.sh
# 或如果已安装此 skill：
bash ~/.workbuddy/skills/vefaas-packaging/scripts/deploy.sh
```

脚本功能：
1. 清理旧打包文件
2. 检查必需文件（run.sh、index.js、package.json）
3. 安装生产依赖
4. 打包并排除缓存文件
5. 显示包大小和下一步指引

### 方法 3：VeFaaS CLI 部署（推荐用于更新部署）

```bash
# 登录（首次使用）
vefaas login --accessKey "AKxxx" --secretKey "SKxxx"

# 拉取已有函数（如果还没拉过）
vefaas pull --func "freegame"

# 修改代码后部署
cd /path/to/vefaas-function
vefaas deploy --yes
```

## 部署流程

### 控制台部署（适合首次部署）

1. 登录 [火山引擎 VeFaaS 控制台](https://console.volcengine.com/vefaas/)
2. 点击「创建函数」或选择已有函数
3. 上传 `vefaas-deploy.zip`
4. 配置环境变量（见下方「环境变量配置」）
5. 点击「发布」

### CLI 部署（适合更新部署）

```bash
vefaas deploy --yes
```

部署后：
- 函数 ID：`n9h9liub`（示例）
- 触发器 URL：`https://sd8tqn8pjtbcjjsjt684g.apigateway-cn-beijing.volceapi.com/`

## 必需文件清单

### 1. run.sh（启动入口）

**必须包含**，否则 VeFaaS 启动失败（exit 127）

```bash
#!/bin/bash
# VeFaaS 文件系统为只读，不允许 npm install
# node_modules 已在 zip 包中
node index.js
```

**权限检查**：
```bash
ls -la run.sh
# 应显示 -rwxr-xr-x（即有 x 权限）
```

如果缺少执行权限：
```bash
chmod +x run.sh
```

### 2. index.js（Express 入口）

```javascript
const express = require('express');
const app = express();

app.use(express.json());

// 路由
app.use('/api', require('./routes/api'));

// 监听端口 8000（VeFaaS 要求）
const PORT = 8000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`VeFaaS function listening on port ${PORT}`);
});
```

**关键**：
- 必须监听 `0.0.0.0:8000`
- 不能是 `localhost:9000` 或其他端口

### 3. package.json（依赖声明）

```json
{
  "name": "my-vefaas-function",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "express": "^4.21.0",
    "axios": "^1.7.0",
    "cors": "^2.8.5"
  },
  "scripts": {
    "start": "node index.js"
  }
}
```

**注意**：
- 所有依赖必须在 `dependencies` 中（不能在 `devDependencies`）
- 运行 `npm install --production` 只安装 `dependencies`

### 4. node_modules/（依赖包）

**必须打包**，因为 VeFaaS 运行时不能 `npm install`。

检查是否完整：
```bash
ls node_modules/ | head -20
```

如果缺少依赖：
```bash
npm install --production
```

## 环境变量配置

在 VeFaaS 控制台或 CLI 中配置：

```bash
# 如果函数需要访问外部服务（如数据库、微信 API）
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx
WECHAT_APPID=wx...
WECHAT_SECRET=...

# 其他
NODE_ENV=production
```

**配置方式**：

**控制台**：
1. 进入函数详情页
2. 点击「环境变量」
3. 添加键值对
4. 保存并发布

**CLI**：
```bash
vefaas env set SUPABASE_URL=https://xxx.supabase.co
vefaas env set SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx
```

## 常见部署错误

### 错误 1: function_start_failed (exit 127)

**原因**：`run.sh` 不存在或没有执行权限

**解决**：
```bash
# 检查文件是否存在
unzip -l vefaas-deploy.zip | grep run.sh

# 检查权限
ls -la run.sh  # 应有 -rwxr-xr-x

# 修复
chmod +x run.sh
```

### 错误 2: Error: Cannot find module 'xxx'

**原因**：`node_modules/` 缺少依赖或没有打包

**解决**：
```bash
# 重新安装依赖
npm install --production

# 重新打包（确保包含 node_modules/）
zip -r ../vefaas-deploy.zip ... node_modules/
```

### 错误 3: listen EADDRINUSE :::9000

**原因**：`index.js` 监听了错误端口

**解决**：改为监听 `8000` 端口
```javascript
app.listen(8000, '0.0.0.0', () => { ... });
```

### 错误 4: 部署后函数无法访问

**原因**：可能是环境变量未配置或健康检查失败

**解决**：
1. 检查环境变量是否已配置
2. 查看函数日志（控制台 → 函数详情 → 日志）
3. 测试健康检查接口（如果有）

## 打包检查清单

部署前检查：
1. ✅ `run.sh` 存在且有执行权限
2. ✅ `index.js` 监听 `0.0.0.0:8000`
3. ✅ `package.json` 包含所有必需依赖
4. ✅ `node_modules/` 已安装并打包
5. ✅ 环境变量已配置
6. ✅ zip 包不包含 `.env` 文件（敏感信息）
7. ✅ zip 包不包含 `.git` 目录

打包后验证：
```bash
# 检查打包内容
unzip -l ../vefaas-deploy.zip | grep -E "run\.sh|index\.js|package\.json|node_modules/"

# 检查包大小
du -h ../vefaas-deploy.zip
```

## 参考资料

- `scripts/deploy.sh`：自动化部署脚本
- VeFaaS 官方文档: https://www.volcengine.com/docs/6363
- 微信小程序登录文档: https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/login.html

## 与其他技能的关系

- **`wx-miniprogram-conventions`**：小程序前端代码规范
- **`supabase-vefaas-integration`**：Supabase 数据库集成（本技能负责打包，那个技能负责数据库）
- **`vefaas-cli-guide`**：VeFaaS CLI 详细使用指南（本技能聚焦打包，那个技能聚焦 CLI）

## 版本历史

- 2026-06-26: 从 `vefaas-development-guide` 拆分出来，专注于打包与部署
