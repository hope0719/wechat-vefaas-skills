---
name: supabase-vefaas-integration
description: >
  Supabase 在 VeFaaS (Volcano Engine) 云函数环境中的完整集成指南。
  涵盖 Node.js 20 WebSocket 兼容性、字段映射规范、异步代码迁移、数据库 schema 管理、常见坑点和解决方案。
  适用于在 VeFaaS 或无服务器环境中使用 Supabase 的项目，特别是从同步存储迁移到异步数据库的场景。
  当用户需要在 VeFaaS 函数中集成 Supabase、或遇到数据库相关错误时使用此技能。
agent_created: true
---

# Supabase + VeFaaS 集成指南

本 skill 总结在 VeFaaS (Volcano Engine 云函数) 环境中使用 Supabase (PostgreSQL) 的完整最佳实践，基于「即兴游戏库」小程序项目的实际踩坑经验。

## 适用场景

- 在 VeFaaS / 无服务器函数中集成 Supabase
- Node.js 20+ 环境中使用 Supabase SDK
- 从文件系统 /tmp 存储迁移到云端数据库
- 需要 snake_case ↔ camelCase 字段映射的项目
- 微信小程序 + 云函数 + Supabase 技术栈
- 遇到 VeFaaS 冷启动导致数据丢失问题

## 核心原则

### 1. 为什么需要 Supabase

**问题**：VeFaaS 冷启动时 `/tmp` 目录被清空，导致：
- 用户积分丢失
- 签到记录丢失
- 邀请关系丢失
- Token 失效

**解决方案**：使用 Supabase（免费 PostgreSQL 数据库）
- 免费额度：500 MB 存储，无限 API 请求
- 自动扩缩容，无需管理服务器
- 实时订阅功能（可选）
- 完善的 JS SDK

### 2. Supabase 客户端初始化（Node.js 20 兼容）

VeFaaS 运行 Node.js 20，该版本没有原生 WebSocket 支持，Supabase SDK 需要 WebSocket 进行 Realtime 功能初始化。

```javascript
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');  // 必须安装 ws 包

let supabase = null;

function getSupabase() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
      throw new Error('缺少 Supabase 环境变量');
    }
    
    supabase = createClient(url, key, {
      auth: {
        persistSession: false,      // 服务端禁用 session 持久化
        autoRefreshToken: false,   // 服务端禁用 token 自动刷新
      },
      realtime: {
        transport: ws,             // Node.js 20 需要 ws 包
      },
    });
  }
  return supabase;
}
```

**依赖安装**:
```bash
npm install @supabase/supabase-js ws
```

**环境变量配置**:
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx
```

### 3. 字段映射规范（snake_case ↔ camelCase）

数据库使用 `snake_case`，业务逻辑使用 `camelCase`。必须双向映射：

#### 读取时：DB → JS (snake_case → camelCase)

```javascript
function mapUser(row) {
  if (!row) return null;
  return {
    userId: row.user_id,
    openId: row.open_id,
    nickname: row.nickname || '',
    avatar: row.avatar || '',
    isLoggedIn: row.is_logged_in || false,
    points: row.points || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

#### 写入时：JS → DB (camelCase → snake_case)

```javascript
async function updateUser(userId, updates) {
  const dbUpdates = {};
  
  // 手动映射每个字段
  if (updates.nickname !== undefined) dbUpdates.nickname = updates.nickname;
  if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
  if (updates.isLoggedIn !== undefined) dbUpdates.is_logged_in = updates.isLoggedIn;
  if (updates.points !== undefined) dbUpdates.points = updates.points;
  
  dbUpdates.updated_at = Date.now();
  
  const { data, error } = await client
    .from('users')
    .update(dbUpdates)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return mapUser(data);
}
```

**关键规则**:
- 读取：所有 `mapXxx()` 函数负责映射
- 写入：所有 `createXxx()` / `updateXxx()` 函数手动映射
- 不要依赖自动化工具，手动映射最可靠

### 4. 异步代码模式

Supabase SDK 所有操作都是异步的（返回 Promise）。如果从同步存储（如本地文件）迁移，需要全面异步化。

#### 数据层函数签名

```javascript
// ✅ 正确：所有函数都是 async
async function getUser(userId) {
  const client = getSupabase();
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;  // 无记录
    throw error;
  }
  
  return mapUser(data);
}
```

#### 调用方必须 await

```javascript
// ❌ 错误：忘记 await，得到 Promise 而不是数据
const user = store.getUser(userId);

// ✅ 正确：调用方也必须 async + await
async function handleRequest(userId) {
  const user = await store.getUser(userId);
  return user;
}
```

#### Express 路由异步化

```javascript
// ✅ 正确：路由必须是 async，并用 try/catch
app.get('/api/user', async (req, res) => {
  try {
    const user = await store.getUser(req.userId);
    res.json({ success: true, data: user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

**迁移检查清单**:
1. ✅ 数据层所有函数加 `async`
2. ✅ 数据层所有 Supabase 调用加 `await`
3. ✅ 所有调用数据层的函数加 `async`
4. ✅ 所有调用加 `await`
5. ✅ Express 路由加 `async` + `try/catch`

### 5. 错误处理模式

#### Supabase 错误码

- `PGRST116`: "JSON object requested, but 0 rows returned" → 无记录，返回 `null`
- `23505`: Unique violation → 唯一约束冲突
- `23503`: Foreign key violation → 外键约束冲突

```javascript
const { data, error } = await client
  .from('users')
  .select('*')
  .eq('user_id', userId)
  .single();

if (error) {
  if (error.code === 'PGRST116') return null;  // 无记录，正常情况
  throw error;  // 其他错误，抛出
}
```

#### 全局错误处理

```javascript
// Express 全局错误处理器
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'internal_error',
    message: err.message,
  });
});
```

### 6. Upsert 模式（幂等写入）

对于需要"存在则更新，不存在则插入"的操作，使用 `upsert()`:

```javascript
await client
  .from('checkins')
  .upsert({
    user_id: userId,
    last_date: today,
    streak: streak,
    updated_at: Date.now(),
  }, {
    onConflict: 'user_id',  // 冲突时用于判断的列
  });
```

**前提条件**: `onConflict` 指定的列必须有唯一约束：

```sql
ALTER TABLE checkins ADD CONSTRAINT checkins_user_id_key UNIQUE (user_id);
```

### 7. 数据库 Schema 管理

#### Schema 迁移脚本模式

使用 `pg` 库直接连接数据库执行 DDL：

```javascript
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  await client.connect();
  
  // 添加列（幂等）
  await client.query(`
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS is_logged_in boolean DEFAULT false;
  `);
  
  // 添加约束（先删后建）
  await client.query('DROP CONSTRAINT IF EXISTS points_transactions_type_check;');
  await client.query(`
    ALTER TABLE points_transactions 
    ADD CONSTRAINT points_transactions_type_check 
    CHECK (type IN ('income', 'expense', 'in', 'out'));
  `);
  
  // 添加唯一约束（幂等，用 DO $$ 块）
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'checkins_user_id_key'
      ) THEN
        ALTER TABLE checkins ADD CONSTRAINT checkins_user_id_key UNIQUE (user_id);
      END IF;
    END $$;
  `);
  
  await client.end();
}
```

#### 打印表结构（调试用）

```javascript
async function printSchema() {
  const tables = ['users', 'invite_codes', 'tokens', 'points_transactions', 'checkins', 'rooms', 'game_states'];
  
  for (const table of tables) {
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = '${table}'
      ORDER BY ordinal_position;
    `);
    
    console.log(`\n=== ${table} ===`);
    res.rows.forEach(row => {
      console.log(`  ${row.column_name} (${row.data_type})`);
    });
  }
}
```

### 8. 调试技巧

#### 调试端点（不依赖微信登录）

在开发/调试阶段，添加一个不依赖微信登录的调试端点：

```javascript
app.get('/api/debug/test-supabase', async (req, res) => {
  const results = {};
  
  try {
    // 测试 1: 连接
    const client = getSupabase();
    results.connection = 'ok';
    
    // 测试 2: 读取
    const user = await getUser('test-id');
    results.getUser = user ? 'found' : 'not_found';
    
    // 测试 3: 写入
    const newUser = await createUser({
      userId: 'test-' + Date.now(),
      openId: 'test-openid',
      nickname: 'Test User',
    });
    results.createUser = newUser ? 'ok' : 'failed';
    
    res.json({ success: true, results });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message, results });
  }
});
```

#### 直接数据库查询（绕过 SDK）

当 SDK 行为异常时，用 `pg` 直接查询：

```javascript
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const res = await client.query('SELECT * FROM users WHERE user_id = $1', [userId]);
console.log(res.rows[0]);

await client.end();
```

## 常见坑点和解决方案

### 坑点 1: Node.js 20 WebSocket 错误

**错误**: `Node.js 20 detected without native WebSocket support`

**解决**: 安装 `ws` 包并传递给 Supabase 客户端（见上文"客户端初始化"）

### 坑点 2: 忘记 await（得到 Promise 而不是数据）

**错误**: `Cannot read properties of undefined (reading 'slice')`

**原因**: 调用 `store.xxx()` 忘记 `await`，得到 Promise 对象而不是数据

**解决**: 全局搜索 `store.` 确保所有调用都加了 `await`

### 坑点 3: 字段名不匹配（snake_case vs camelCase）

**错误**: `Could not find the 'is_logged_in' column`

**原因**: 代码用了 JS 字段名（`isLoggedIn`）而不是 DB 字段名（`is_logged_in`）

**解决**: 
- 读取：`mapXxx()` 函数映射
- 写入：手动映射到 `snake_case`

### 坑点 4: CHECK 约束不匹配

**错误**: `new row violates check constraint "points_transactions_type_check"`

**原因**: 数据库约束只允许 `in`/`out`，但代码用了 `income`/`expense`

**解决**: 修改数据库约束（见上文"Schema 管理"）

### 坑点 5: Upsert 失败（缺少唯一约束）

**错误**: `There is no unique or exclusion constraint matching the ON CONFLICT specification`

**原因**: `upsert()` 的 `onConflict` 列没有唯一约束

**解决**: 添加唯一约束（见上文"Upsert 模式"）

### 坑点 6: 微信 code 一次性使用，无法重复测试

**错误**: `code been used`（用 curl 测试登录时）

**原因**: 微信 `code2Session` 的 code 只能使用一次

**解决**: 创建不依赖微信登录的调试端点（见上文"调试技巧"）

## 环境变量配置

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx

# 微信（如果用到）
WECHAT_APPID=wx...
WECHAT_SECRET=...
```

**VeFaaS 环境变量配置**:
```bash
vefaas env set SUPABASE_URL=https://xxx.supabase.co
vefaas env set SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx
```

## 部署检查清单

部署前检查：
1. ✅ `package.json` 包含 `@supabase/supabase-js` 和 `ws`
2. ✅ 环境变量已配置（`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`）
3. ✅ 数据库 schema 已更新（运行迁移脚本）
4. ✅ 所有 `store.xxx()` 调用都加了 `await`
5. ✅ 所有 Express 路由都加了 `async` + `try/catch`
6. ✅ 字段映射完整（读取和写入）

部署后验证：
1. ✅ 调用调试端点 `/api/debug/test-supabase`
2. ✅ 检查 Supabase 控制台数据是否正确写入
3. ✅ 删除调试端点（生产环境）

## 参考资料

- `references/store-supabase-example.js`: 完整的数据层示例代码
- `references/schema-migration-example.js`: 完整的 schema 迁移脚本示例
- Supabase JS SDK 文档: https://supabase.com/docs/reference/javascript
- VeFaaS 文档: https://www.volcengine.com/docs/6363

## 与其他技能的关系

- **`wx-miniprogram-conventions`**：小程序前端代码规范
- **`vefaas-packaging`**：函数打包与部署（本技能负责数据库，那个技能负责打包）
- **`vefaas-cli-guide`**：VeFaaS CLI 使用（本技能聚焦数据库，那个技能聚焦 CLI）

## 版本历史

- 2026-06-26: 从 `vefaas-development-guide` 拆分出来，专注于 Supabase 数据库集成
