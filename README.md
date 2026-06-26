# WorkBuddy Skills - 微信小程序 + VeFaaS 开发技能包

本仓库包含 4 个 WorkBuddy AI 技能，用于微信小程序前端开发和 VeFaaS 云函数后端开发。

## 技能列表

### 1. wx-miniprogram-conventions（微信小程序代码规范）

**📁 目录**: `wx-miniprogram-conventions/`

**什么时候用**：
- ✅ 开始一个新的微信小程序项目时
- ✅ 需要对小程序代码进行审查或重构时
- ✅ 遇到微信小程序特有错误（如 `Unexpected token`、分包加载失败等）
- ✅ 需要了解微信小程序开发的最佳实践时

**不适用场景**：
- ❌ 开发 Web 前端项目（用其他技能）
- ❌ 开发 uni-app、Taro 等跨端框架（本技能专注原生小程序）

**核心内容**：
- JS 语法兼容性（ES5/ES6 避坑）
- 微信 API 坑点（wx.login、wx.getUserProfile 等）
- 分包机制与资源引用
- JSON 配置规范
- 数据持久化策略（wx.setStorage 冷启动防护）
- 云函数冷启动防护架构

---

### 2. vefaas-packaging（VeFaaS 函数打包与部署）

**📁 目录**: `vefaas-packaging/`

**什么时候用**：
- ✅ 首次打包并部署 VeFaaS 函数时
- ✅ 更新已有 VeFaaS 函数代码时
- ✅ 遇到部署错误（如 `function_start_failed`、`exit 127`、`Cannot find module`）
- ✅ 需要编写自动化部署脚本时
- ✅ 需要了解 VeFaaS 函数目录结构和必需文件时

**不适用场景**：
- ❌ 部署到 AWS Lambda、阿里云函数等其他云函数平台（打包方式不同）
- ❌ 纯前端部署（本技能专注 VeFaaS 云函数）

**核心内容**：
- VeFaaS 函数限制与要求
- 标准项目结构
- 打包命令与自动化脚本
- 部署流程（控制台 + CLI）
- 必需文件清单（run.sh、index.js、package.json、node_modules/）
- 常见部署错误与解决方案

---

### 3. vefaas-cli-guide（VeFaaS CLI 使用指南）

**📁 目录**: `vefaas-cli-guide/`

**什么时候用**：
- ✅ 首次安装和配置 VeFaaS CLI 时
- ✅ 需要拉取已有函数到本地开发时
- ✅ 需要使用 CLI 部署函数（而不是控制台上传）时
- ✅ 需要管理函数环境变量时
- ✅ 需要查看函数日志和状态时
- ✅ 遇到 CLI 相关错误时

**不适用场景**：
- ❌ 使用其他云函数的 CLI（如 AWS SAM、Serverless Framework）
- ❌ 不需要命令行操作（只用控制台即可）

**核心内容**：
- CLI 安装与登录
- 函数管理（创建、拉取、部署、删除）
- 环境变量管理
- 日志查看
- 完整工作流示例
- 常见 CLI 错误与解决方案

---

### 4. supabase-vefaas-integration（Supabase 数据库集成）

**📁 目录**: `supabase-vefaas-integration/`

**什么时候用**：
- ✅ 在 VeFaaS 函数中集成 Supabase 数据库时
- ✅ 遇到 VeFaaS 冷启动导致数据丢失问题时
- ✅ 从文件系统存储迁移到云端数据库时
- ✅ 需要 snake_case ↔ camelCase 字段映射时
- ✅ 遇到 Supabase 相关错误时（如 Node.js 20 WebSocket 错误、字段名不匹配等）

**不适用场景**：
- ❌ 使用其他数据库（MySQL、MongoDB 等）
- ❌ 不在 VeFaaS 环境中使用 Supabase（本技能包含 VeFaaS 特定配置）

**核心内容**：
- Supabase 客户端初始化（Node.js 20 兼容）
- 字段映射规范（snake_case ↔ camelCase）
- 异步代码模式（从同步存储迁移到异步数据库）
- 错误处理模式
- Upsert 模式（幂等写入）
- 数据库 Schema 管理
- 调试技巧
- 常见坑点和解决方案

---

## 技能之间的关系

```
微信小程序前端开发
    └── wx-miniprogram-conventions（前端代码规范）

VeFaaS 云函数后端开发
    ├── vefaas-packaging（打包与部署）
    ├── vefaas-cli-guide（CLI 使用）
    └── supabase-vefaas-integration（数据库集成）
```

**典型工作流**：

1. **开发新功能**：
   - 前端：用 `wx-miniprogram-conventions` 指导小程序代码
   - 后端：用 `vefaas-cli-guide` 拉取函数到本地
   - 数据库：用 `supabase-vefaas-integration` 集成数据库
   - 部署：用 `vefaas-packaging` 打包并部署

2. **排查错误**：
   - 前端错误 → `wx-miniprogram-conventions`
   - 部署错误 → `vefaas-packaging`
   - CLI 错误 → `vefaas-cli-guide`
   - 数据库错误 → `supabase-vefaas-integration`

---

## 如何使用这些技能

### 方式 1：安装到 WorkBuddy（推荐）

如果你使用 WorkBuddy AI 助手，可以将这些技能安装到 `~/.workbuddy/skills/` 目录：

```bash
# 克隆本仓库
git clone https://github.com/你的用户名/vefaas-skills.git ~/.workbuddy/skills-temp

# 复制技能到 WorkBuddy 技能目录
cp -r ~/.workbuddy/skills-temp/wx-miniprogram-conventions ~/.workbuddy/skills/
cp -r ~/.workbuddy/skills-temp/vefaas-packaging ~/.workbuddy/skills/
cp -r ~/.workbuddy/skills-temp/vefaas-cli-guide ~/.workbuddy/skills/
cp -r ~/.workbuddy/skills-temp/supabase-vefaas-integration ~/.workbuddy/skills/

# 清理
rm -rf ~/.workbuddy/skills-temp
```

安装后，WorkBuddy 会根据 `description` 字段自动在合适的场景加载对应的技能。

### 方式 2：作为参考文档

即使不使用 WorkBuddy，你也可以直接阅读这些技能文件作为开发指南：

- `wx-miniprogram-conventions/SKILL.md` - 小程序开发指南
- `vefaas-packaging/SKILL.md` - 打包部署指南
- `vefaas-cli-guide/SKILL.md` - CLI 使用指南
- `supabase-vefaas-integration/SKILL.md` - 数据库集成指南

---

## 技能触发示例

### 示例 1：开始新小程序项目

**用户说**："帮我创建一个新的微信小程序项目，实现用户登录和积分系统"

**WorkBuddy 行为**：
1. 自动加载 `wx-miniprogram-conventions` 技能
2. 按照技能中的规范创建项目结构
3. 确保代码兼容微信小程序运行时

### 示例 2：部署云函数失败

**用户说**："我用 VeFaaS CLI 部署函数时遇到 exit 127 错误"

**WorkBuddy 行为**：
1. 自动加载 `vefaas-packaging` 技能
2. 识别错误原因（run.sh 缺少或没有执行权限）
3. 提供解决方案

### 示例 3：数据库集成

**用户说**："我的 VeFaaS 函数冷启动时用户数据丢失，怎么解决？"

**WorkBuddy 行为**：
1. 自动加载 `supabase-vefaas-integration` 技能
2. 解释冷启动问题
3. 指导集成 Supabase 数据库

---

## 贡献

如果你发现错误或想添加新内容，欢迎提交 Pull Request。

## 许可证

MIT License

## 作者

基于「即兴游戏库」小程序项目经验整理

---

**最后更新**：2026-06-26
