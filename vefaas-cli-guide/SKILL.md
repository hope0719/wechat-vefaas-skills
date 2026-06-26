---
name: vefaas-cli-guide
description: >
  VeFaaS CLI (volcengine-vefaas) 完整使用指南。
  涵盖 CLI 安装、登录、函数创建、拉取、部署、环境变量管理、日志查看等全流程操作。
  当用户需要使用 VeFaaS CLI 管理云函数、或遇到 CLI 相关错误时使用此技能。
agent_created: true
---

# VeFaaS CLI 使用指南

本 skill 提供 VeFaaS CLI 的完整使用方法，基于「即兴游戏库」小程序项目的实际经验。

## 适用场景

- 首次安装和配置 VeFaaS CLI
- 需要拉取已有函数到本地开发
- 需要使用 CLI 部署函数（而不是控制台上传）
- 需要管理函数环境变量
- 需要查看函数日志和状态
- 遇到 CLI 相关错误（登录失败、部署失败等）

## CLI 安装

### 安装命令

```bash
npm i -g https://vefaas-cli.tos-cn-beijing.volces.com/volcengine-vefaas-latest.tgz
```

### 版本确认

```bash
vefaas --version
# 当前版本：0.1.8
```

### 安装失败排查

**错误**：`EACCES: permission denied`

**解决**：
```bash
# 方式 1：使用 sudo
sudo npm i -g https://vefaas-cli.tos-cn-beijing.volces.com/volcengine-vefaas-latest.tgz

# 方式 2：配置 npm 全局目录
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
npm i -g https://vefaas-cli.tos-cn-beijing.volces.com/volcengine-vefaas-latest.tgz
```

## CLI 登录

### 登录命令

```bash
vefaas login --accessKey "AKLxxx" --secretKey "SKxxx"
```

**参数说明**：
- `--accessKey`：火山引擎 Access Key ID
- `--secretKey`：火山引擎 Secret Access Key（**不需要 base64 解码**，直接复制原始字符串）

**示例**：
```bash
vefaas login \
  --accessKey "AKLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  --secretKey "SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx=="
```

### 登录失败排查

**错误**：`invalid access key or secret key`

**原因**：
1. AK/SK 错误
2. SK 被 base64 解码了（不需要解码）
3. 网络问题（无法访问火山引擎 API）

**解决**：
1. 检查 AK/SK 是否正确（从火山引擎控制台「访问控制」→「密钥管理」获取）
2. **不要对 SK 进行 base64 解码**，直接使用原始字符串
3. 检查网络连接（是否需要代理）

### 登录状态查看

```bash
vefaas whoami
```

显示当前登录的账号信息。

### 登出

```bash
vefaas logout
```

## 函数管理

### 查看函数列表

```bash
vefaas list
```

输出示例：
```
函数名称       函数 ID                  状态    创建时间
freegame     n9h9liub                运行中   2026-06-20 10:00:00
```

### 拉取已有函数到本地

如果函数在控制台已创建，需要拉取到本地开发：

```bash
vefaas pull --func "freegame"
# 或
vefaas pull --func "n9h9liub"
```

**结果**：
- 在当前目录创建 `freegame/` 文件夹
- 包含函数的所有文件（run.sh、index.js、package.json 等）
- 可以开始本地开发和调试

### 创建新函数

```bash
vefaas create --func "my-function" --runtime "nodejs20"
```

**注意**：通常建议在控制台创建函数（可以配置环境变量、实例配额等），然后用 `vefaas pull` 拉取到本地。

### 部署函数

```bash
# 进入函数目录
cd /path/to/freegame

# 部署（需要手动确认）
vefaas deploy

# 部署（跳过确认）
vefaas deploy --yes
```

**部署流程**：
1. CLI 自动打包函数目录（类似 `zip -r`）
2. 上传到 VeFaaS
3. 发布函数
4. 显示触发器 URL

**部署后验证**：
```bash
# 查看函数详情
vefaas describe --func "freegame"

# 测试健康检查
curl https://sd8tqn8pjtbcjjsjt684g.apigateway-cn-beijing.volceapi.com/health
```

### 查看函数详情

```bash
vefaas describe --func "freegame"
```

输出示例：
```
函数名称: freegame
函数 ID: n9h9liub
状态: 运行中
运行时: nodejs20
实例配额: 2048MB * 5
触发器 URL: https://sd8tqn8pjtbcjjsjt684g.apigateway-cn-beijing.volceapi.com/
创建时间: 2026-06-20 10:00:00
更新时间: 2026-06-26 15:00:00
```

### 删除函数

```bash
vefaas delete --func "freegame"
```

**注意**：删除后无法恢复，请谨慎操作。

## 环境变量管理

### 设置环境变量

```bash
vefaas env set --func "freegame" SUPABASE_URL=https://xxx.supabase.co
vefaas env set --func "freegame" SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx
vefaas env set --func "freegame" WECHAT_APPID=wxbe8d4d1c4cae4908
vefaas env set --func "freegame" WECHAT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 查看环境变量

```bash
vefaas env list --func "freegame"
```

**注意**：出于安全考虑，敏感值（如 Secret Key）可能显示为 `***`

### 删除环境变量

```bash
vefaas env unset --func "freegame" WECHAT_SECRET
```

## 日志查看

### 查看函数日志

```bash
vefaas logs --func "freegame"
```

**注意**：VeFaaS CLI 的日志功能可能有限，建议在控制台查看完整日志：
1. 登录火山引擎控制台
2. 进入 VeFaaS 服务
3. 选择函数
4. 点击「日志」标签

## 完整工作流示例

### 场景 1：首次部署新函数

```bash
# 1. 在控制台创建函数（配置环境变量、实例配额）
#    登录 https://console.volcengine.com/vefaas/

# 2. 拉取到本地
vefaas pull --func "freegame"

# 3. 本地开发
cd freegame
npm install
# 编辑代码...

# 4. 本地测试（如果有条件）
node index.js

# 5. 部署
vefaas deploy --yes

# 6. 验证
curl https://sd8tqn8pjtbcjjsjt684g.apigateway-cn-beijing.volceapi.com/health
```

### 场景 2：更新已有函数

```bash
# 1. 拉取最新代码（如果多人协作）
vefaas pull --func "freegame"

# 2. 本地开发
cd freegame
# 编辑代码...

# 3. 部署
vefaas deploy --yes

# 4. 查看日志（验证部署成功）
vefaas logs --func "freegame"
```

### 场景 3：紧急回滚

```bash
# 1. 查看函数版本历史（控制台）
#    登录控制台 → 函数详情 → 版本管理

# 2. 回滚到上一版本（控制台）
#    点击「回滚」按钮

# 或

# 3. 本地回滚代码
cd freegame
git checkout HEAD~1  # 如果使用 git
vefaas deploy --yes
```

## 常见 CLI 错误

### 错误 1: `command not found: vefaas`

**原因**：CLI 未安装或不在 PATH 中

**解决**：
```bash
# 检查是否安装
npm list -g vefaas

# 重新安装
npm i -g https://vefaas-cli.tos-cn-beijing.volces.com/volcengine-vefaas-latest.tgz

# 检查 PATH
echo $PATH
```

### 错误 2: `login failed: invalid access key`

**原因**：AK/SK 错误

**解决**：
1. 检查 AK/SK 是否正确
2. **不要对 SK 进行 base64 解码**
3. 从控制台重新获取 AK/SK

### 错误 3: `deploy failed: function not found`

**原因**：函数不存在或函数名称错误

**解决**：
```bash
# 检查函数列表
vefaas list

# 确认函数名称或 ID
vefaas describe --func "freegame"
```

### 错误 4: `deploy failed: package too large`

**原因**：zip 包超过大小限制（通常 50 MB）

**解决**：
1. 检查 `node_modules/` 大小
2. 删除不必要的依赖
3. 使用 `.npmignore` 或 zip 的 `-x` 参数排除文件

```bash
# 查看包大小
du -sh node_modules/

# 打包时排除测试文件和缓存
zip -r ../vefaas-deploy.zip ... -x "node_modules/.cache/*" "*.test.js"
```

### 错误 5: `pull failed: permission denied`

**原因**：登录账号没有函数访问权限

**解决**：
1. 确认登录的 AK/SK 是否正确
2. 联系管理员授予函数访问权限

## 最佳实践

1. **使用 `--yes` 参数**：脚本化部署时，使用 `vefaas deploy --yes` 跳过确认
2. **版本控制**：使用 git 管理函数代码，方便回滚
3. **环境变量分离**：本地开发用 `.env` 文件，生产环境用 VeFaaS 控制台配置
4. **健康检查**：在函数中实现 `/health` 端点，方便部署后验证
5. **日志**：在关键步骤添加 `console.log()`，方便排查问题

## 参考资料

- VeFaaS 官方文档: https://www.volcengine.com/docs/6363
- 火山引擎控制台: https://console.volcengine.com/vefaas/
- 访问控制（获取 AK/SK）: https://console.volcengine.com/iam/keymanage/

## 与其他技能的关系

- **`wx-miniprogram-conventions`**：小程序前端代码规范
- **`vefaas-packaging`**：函数打包详细指南（本技能聚焦 CLI，那个技能聚焦打包）
- **`supabase-vefaas-integration`**：Supabase 数据库集成

## 版本历史

- 2026-06-26: 从 `vefaas-development-guide` 拆分出来，专注于 VeFaaS CLI 使用
