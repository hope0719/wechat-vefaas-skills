---
name: wx-miniprogram-conventions
description: 微信小程序开发代码规范与避坑经验。当用户开始新微信小程序项目、或需要代码审查/修复时使用此技能。涵盖 JS 语法兼容性、微信 API 坑点、分包机制、JSON 配置规范、数据持久化策略、云函数冷启动防护等实战经验。
agent_created: true
---

# 微信小程序开发代码规范与避坑经验

## 概述

本技能记录了从实战中总结的微信小程序开发代码规范和避坑经验，涵盖 **JS 语法兼容性、微信 API 坑点、分包机制、JSON 配置、数据持久化策略、云函数冷启动防护** 六大类问题。适用于所有微信小程序项目，部分经验（云函数冷启动）需按实际后端架构调整。

---

## 1. JS/TS 语法兼容性

**背景**：`project.config.json` 中 `es6: false, enhance: false` 时，IDE 不做 ES6→ES5 转译，运行时直接报语法错误。

### 1.1 禁止使用的语法

| 语法 | 替代方案 | 参考 |
|------|---------|------|
| `async/await` | `.then(function(){}).catch(function(){})` 链 | references/js-compatibility.md |
| `?.` 可选链 | `(obj && obj.prop)` | 同上 |
| `??` 空值合并 | `(val != null) ? val : default` 或 `\|\|` | 同上 |
| `Promise.prototype.finally()` | `.then(fn, fn)` 模式 | 同上 |
| `const` / `let` | `var` | 同上 |
| `=>` 箭头函数 | `function` 关键字 | 同上 |
| 模板字面量 `` ` `` | 字符串 `+` 拼接 | 同上 |
| 解构赋值 | 逐字段赋值 | 同上 |
| `...` 展开运算符 | `Object.assign()` / `.concat()` | 同上 |
| `class` | function + prototype | 同上 |
| `for...of` | 传统 `for` 循环 | 同上 |
| 默认参数 | 函数体内 `!= null` 判断 | 同上 |

### 1.2 判断依据

查看 `project.config.json` 的 `setting.es6` 和 `setting.enhance` 字段：

```json
{
  "setting": {
    "es6": false,
    "enhance": false
  }
}
```

任一项为 false，全程使用 ES5 语法。

---

## 2. 微信 API 与原生组件坑点

### 2.1 chooseAvatar 冲突

- `button open-type="chooseAvatar"` 的父容器**不能有** `bind:tap`（或 `bindtap`），否则报 `chooseAvatar:fail another chooseAvatar is in progress`
- 头像点击事件应绑定在 button 本身的 `bind:chooseavatar` 上，而非父级 view

### 2.2 wx.getStorageSync 空对象陷阱

- `wx.getStorageSync('key')` 返回 `{}`（空对象）时，`||` 不触发 fallback
- 错误写法：`var data = wx.getStorageSync('key') || defaultData` → data 仍是 `{}`
- 正确写法：先获取再做完整性校验

```typescript
// ❌ 错误
var saved = wx.getStorageSync('gameState') || { played: {}, skipped: {} };

// ✅ 正确
var saved = wx.getStorageSync('gameState');
if (!saved || typeof saved.played !== 'object' || typeof saved.skipped !== 'object') {
  saved = { played: {}, skipped: {} };
}
```

### 2.3 Button open-type="share"

- 分享通过 `button open-type="share"` 触发页面的 `onShareAppMessage` / `onShareTimeline` 生命周期
- **不要在 page.json 中设置** `enableShareAppMessage` / `enableShareTimeline`（非标准字段）

---

## 3. JSON 配置规范

### 3.1 app.json

```json
{
  "tabBar": {
    // fontSize 必须是数字，不能是字符串
    "fontSize": 10,    // ✅ 正确
    // "fontSize": "10px"  // ❌ 错误
  }
}
```

### 3.2 page.json

每个页面自己的 `page.json` 只放页面的配置项，**不能放**：

- ❌ `enableShareAppMessage`（非标准字段）
- ❌ `enableShareTimeline`（非标准字段）

分享由页面 TS/JS 中的 `onShareAppMessage` / `onShareTimeline` 方法控制。

### 3.3 project.config.json

```json
{
  "setting": {
    "es6": false,    // 如果为 false，必须用 ES5 语法
    "enhance": false // 如果为 false，增强编译关闭
  }
}
```

---

## 4. 分包机制

### 4.1 分包不能引用分包资源

- **分包 A 的 WXML/WXSS/WXSS 中的图片/文件，不能引用分包 B 的资源**
- 除非两个分包都已下载，否则引用链断裂，资源 404
- 示例：百科页（主包）引用 `subpackages/game-assets-1/images/xxx.jpg` → **不显示**

### 4.2 解决方案

1. **用图床 CDN**: 将图片上传到免费图床（ImgURL、阿里云 OSS、腾讯云 COS 等），代码中用 HTTPS URL 引用
2. **主包资源**: 常用图片放主包 `images/` 目录
3. **注意**: 使用外部 CDN 时，需在微信公众平台后台配置 `downloadFile` 合法域名白名单（开发管理 → 开发设置 → 服务器域名）

### 4.3 主包资源最小化

- 主包有 2MB 大小限制（正式版）
- 分包每个 2MB，总数不超过 20MB
- 图片等大资源尽量放分包或 CDN

---

## 5. 数据持久化策略（云端+本地双验证）

### 5.1 背景

当使用无状态云函数（如 VeFaaS）时，冷启动会清空 `/tmp` 目录，导致服务端数据丢失。**云端无数据 ≠ 本地无数据**。

### 5.2 核心原则

```
读操作：先返回本地数据 → 后台静默同步 → 合并时保护本地非空值
写操作：先写本地（即时反馈） → 后台上传 → 失败入离线路队待重试
```


### 5.3 关键模式

#### 请求节流

同一 API 在 N 秒内不重复请求：

```typescript
var pendingSync = null;
var lastSync = 0;
const THROTTLE_MS = 10000;

function syncFromServer() {
  if (pendingSync) return pendingSync;  // 复用进行中的请求
  var now = Date.now();
  if (now - lastSync < THROTTLE_MS) return Promise.resolve(localData);
  lastSync = now;
  pendingSync = request('/api/user/sync').then(function (res) {
    pendingSync = null;
    return mergeWithLocal(res);
  }, function (err) {
    pendingSync = null;
    throw err;
  });
  return pendingSync;
}
```

#### 积分合并保护

云端返回 0 但本地有值时，用 `Math.max` 保护：

```typescript
var mergedPoints = Math.max(serverProfile.points || 0, local.points || 0);
```

#### 离线写队列

写操作失败时入队，下次成功同步时重试：

```typescript
var offlineQueue = wx.getStorageSync('offline_queue') || [];
function enqueueWrite(write) {
  offlineQueue.push(write);
  wx.setStorageSync('offline_queue', offlineQueue);
}
function processOfflineQueue(callback) {
  var queue = wx.getStorageSync('offline_queue') || [];
  if (queue.length === 0) return Promise.resolve();
  var promises = queue.map(function (write) {
    return callback(write).then(function (success) {
      if (success) return true;
      return false; // 失败保留下次重试
    });
  });
  return Promise.all(promises).then(function (results) {
    var remaining = [];
    for (var i = 0; i < results.length; i++) {
      if (!results[i]) remaining.push(queue[i]);
    }
    wx.setStorageSync('offline_queue', remaining);
  });
}
```

---

## 6. TypeScript 编译（如适用）

### 6.1 编译命令

当手动编译 .ts → .js 时使用：

```bash
cd /path/to/project
node_modules/.bin/tsc -p tsconfig.temp.json
```

### 6.2 tsconfig.temp.json 示例

```json
{
  "compilerOptions": {
    "module": "CommonJS",
    "target": "ES2017",
    "allowJs": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "lib": ["ES2017"],
    "skipLibCheck": true,
    "strict": false,
    "noImplicitAny": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noEmitOnError": false,
    "rootDir": "./miniprogram",
    "outDir": "./miniprogram"
  },
  "include": ["/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 6.3 关键点

- `noEmitOnError: false` — 即使有类型错误也输出 .js
- `skipLibCheck: true` — 跳过类型定义检查
- `target: "ES2017"` — 避免输出 `?.` 和 `??`
- 但即使 target=ES2017，**source 中也不能用 async/await**（会被保留）

---

## 7. 图片与资源管理

### 7.1 图床选择

- 免费图床可选 ImgURL（`www.imgurl.org`）、SM.MS、腾讯云 COS（前 50GB 免费）
- ImgURL V3 API：`POST https://www.imgurl.org/api/v3/upload`，`Authorization: Bearer sk-xxx`
- 注意每日上传限额

### 7.2 微信白名单

外部图片/文件链接需要在微信公众平台后台添加 `downloadFile` 合法域名：

```
登录微信公众平台 → 开发管理 → 开发设置 → 服务器域名 → downloadFile 合法域名
```

---

## 8. 本地存储 key 命名规范

建议使用统一前缀避免冲突：

```typescript
// 用户数据
var KEY_USER_PROFILE = 'user_profile';
var KEY_API_TOKEN = 'api_token';

// 游戏数据
var KEY_GAME_STATE = 'game_state';
var KEY_PLAYED_GAMES = 'played_games';

// 缓存数据
var KEY_CHECKIN = 'checkin_cache';
var KEY_POINTS_HISTORY = 'points_history_cache';
var KEY_OFFLINE_QUEUE = 'offline_queue';

// 云函数缓存（节流用）
var KEY_LAST_SYNC = 'last_sync_time';
```

---

## 9. 常见功能实现经验

### 9.1 签到功能与积分本地缓存

**问题**：签到成功后积分显示不对，明明签到了但本地积分显示还是零，积分账单什么都没有。

**根本原因**：
- 签到成功后只保存了积分余额到 `user_profile`，但没有保存积分账单记录
- 积分账单页面从云端获取记录，但 VeFaaS 冷启动会丢数据
- 云端无数据 ≠ 本地无数据，需要本地缓存作为 fallback

**解决方案**：

1. **签到成功后本地保存积分记录**：

```typescript
// 在 profile.ts 中添加 _saveLocalPointsRecord() 方法
_saveLocalPointsRecord(record: { 
  type: 'in' | 'out'; 
  title: string; 
  amount: number; 
  balance: number; 
  time: number 
}) {
  try {
    const key = 'points_history_cache';
    let list: any[] = [];
    const raw = wx.getStorageSync(key);
    if (raw) {
      list = JSON.parse(raw);
      if (!Array.isArray(list)) list = [];
    }
    
    // 格式化时间（与 points-ledger.ts 的 _formatList 一致）
    const d = new Date(record.time);
    const timeStr = (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + 
                   String(d.getHours()).padStart(2, '0') + ':' + 
                   String(d.getMinutes()).padStart(2, '0');
    
    list.unshift({
      id: Date.now(),
      type: record.type,
      title: record.title,
      time: timeStr,
      amount: record.amount,
      balance: record.balance,
    });
    // 最多保存 100 条记录
    if (list.length > 100) list = list.slice(0, 100);
    wx.setStorageSync(key, JSON.stringify(list));
  } catch (e) {
    console.warn('[profile] 保存积分记录失败', e);
  }
}
```

2. **签到成功后的完整处理**：

```typescript
// 在 onCheckin() 的成功回调中
const profile = getUserProfile();
const reward = (result.baseReward || 0) + (result.streakBonus || 0);
const newBalance = result.newBalance;

// 1. 保存积分余额到 user_profile
saveUserProfile({
  ...profile,
  points: newBalance,
  pointsIncomeMonth: (profile.pointsIncomeMonth || 0) + reward,
});

// 2. 保存积分账单记录到本地缓存
this._saveLocalPointsRecord({
  type: 'in',
  title: '每日签到' + (displayStreak > 1 ? '（连续' + displayStreak + '天）' : ''),
  amount: reward,
  balance: newBalance,
  time: Date.now(),
});

// 3. 更新页面显示
this.setData({
  checkedInToday: true,
  points: newBalance,
  checkinLoading: false,
});
```

3. **积分账单页面读取逻辑**：

```typescript
// 在 points-ledger.ts 的 loadData() 中
function loadData() {
  // 优先从本地缓存读取
  const localKey = 'points_history_cache';
  const localRaw = wx.getStorageSync(localKey);
  let localList = [];
  if (localRaw) {
    try {
      localList = JSON.parse(localRaw);
    } catch (e) {
      localList = [];
    }
  }
  
  // 如果本地有数据，直接使用
  if (localList && localList.length > 0) {
    this.setData({
      ledgerList: localList,
      isOfflineData: true,
    });
    return;
  }
  
  // 否则从云端获取
  apiGetPointsHistory().then(function(history) {
    // 处理云端数据...
  });
}
```

**关键经验**：
- ✅ 写操作：先写本地（即时反馈） → 后台上传 → 失败入离线路队待重试
- ✅ 读操作：先返回本地数据 → 后台静默同步 → 合并时保护本地非空值
- ✅ 数据格式一致性：本地保存的时间格式需要与账单页面的显示格式一致
- ✅ 存储限制：最多保存 100 条记录，避免占用过多存储空间

### 9.2 按钮样式调整经验

**问题**：在手机上打开签到按钮会变得很左右很长。

**解决方案**：

1. **限制按钮宽度**：

```less
.checkin-btn {
  padding: 12rpx 30rpx;        // 减小 padding
  min-width: 120rpx;            // 最小宽度
  max-width: 180rpx;            // 最大宽度
  display: flex;
  align-items: center;
  justify-content: center;
}
```

2. **调整按钮位置**：

```less
.checkin-card__right {
  margin-right: 20rpx;          // 向右挪动
}
```

**关键经验**：
- ✅ 使用 `min-width` 和 `max-width` 限制按钮宽度，避免内容撑开
- ✅ 使用 `margin-right` 或 `margin-left` 调整按钮位置
- ✅ 使用 `padding` 控制按钮内部间距，而不是依赖内容撑开
- ✅ 在真机上测试样式效果，因为开发者工具的模拟器可能不准确

---

## 附录

- 详细 JS 语法兼容性参考：`references/js-compatibility.md`
- 完整代码示例见即兴游戏库项目：`miniprogram/utils/cloud-cache.ts`
