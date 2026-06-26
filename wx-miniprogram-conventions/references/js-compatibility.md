# JS 语法兼容性参考

当微信小程序项目的 `project.config.json` 中设置了 `"es6": false` 和 `"enhance": false` 时，
IDE 不做 ES6→ES5 转译，以下 ES6+ 语法在运行时直接报错。

## 禁止使用的语法

### 1. async/await（ES2017）

```typescript
// ❌ 错误
async function loadData() {
  const result = await api.getData();
  return result;
}

// ✅ 正确
function loadData() {
  return api.getData().then(function (result) {
    return result;
  }).catch(function (err) {
    console.error(err);
    return null;
  });
}
```

### 2. 可选链 ?.（ES2020）

```typescript
// ❌ 错误
const name = obj?.user?.name;
const msg = res.data?.error || '未知错误';

// ✅ 正确
const name = (obj && obj.user && obj.user.name);
const msg = (res.data && res.data.error) || '未知错误';
```

### 3. 空值合并 ??（ES2020）

```typescript
// ❌ 错误
const count = data.count ?? 0;
const label = SPEED_LABELS[index] ?? '默认';

// ✅ 正确（适用于数值/字符串）
const count = (data.count != null) ? data.count : 0;
const label = SPEED_LABELS[index] || '默认';

// 注意：?? 只过滤 null/undefined，|| 过滤所有 falsy
// 如果 0 或 '' 是合法值，必须用 != null 显式判断
```

### 4. Promise.prototype.finally()（ES2018）

```typescript
// ❌ 错误
promise.then(fn).catch(fn).finally(cleanup);

// ✅ 正确
promise.then(function (v) { cleanup(); return v; }, function (e) { cleanup(); throw e; });
```

### 5. 箭头函数（ES6）

```typescript
// ❌ 错误
const fn = () => { ... };
wx.request({ success: (res) => { ... } });

// ✅ 正确
function fn() { ... };
wx.request({ success: function (res) { ... } });
```

### 6. const/let（ES6）

```typescript
// ❌ 错误
const x = 1;
let y = 2;

// ✅ 正确
var x = 1;
var y = 2;
```

### 7. 模板字面量（ES6）

```typescript
// ❌ 错误
var msg = `Hello ${name}`;

// ✅ 正确
var msg = 'Hello ' + name;
```

### 8. 解构赋值（ES6）

```typescript
// ❌ 错误
var { name, age } = user;
var [a, b] = arr;

// ✅ 正确
var name = user.name;
var age = user.age;
```

### 9. 展开运算符（ES2018）

```typescript
// ❌ 错误
var merged = { ...obj1, ...obj2 };
var arr2 = [...arr1, 4, 5];

// ✅ 正确
var merged = Object.assign({}, obj1, obj2);
var arr2 = [].concat(arr1, [4, 5]);
```

### 10. 类语法 class（ES6）

```typescript
// ❌ 错误
class MyClass { constructor() { ... } }

// ✅ 正确：用函数 + prototype 模拟
function MyClass() { ... }
MyClass.prototype.method = function() { ... };
```

### 11. 默认参数（ES6）

```typescript
// ❌ 错误
function fn(a = 1, b = 'default') { ... }

// ✅ 正确
function fn(a, b) {
  a = (a != null) ? a : 1;
  b = (b != null) ? b : 'default';
}
```

### 12. for...of（ES6）

```typescript
// ❌ 错误
for (var item of list) { ... }

// ✅ 正确
for (var i = 0; i < list.length; i++) {
  var item = list[i];
  ...
}
```

## 启用增强编译后可用的语法

如果 `project.config.json` 中设置为 `"es6": true` 和 `"enhance": true`，则 IDE 会自动转译，
以上所有语法均可正常使用。但需要注意：仅 IDE 内编译的文件有效，外部 tsc 编译仍需自行控制 target。

## 快速判断

查看 `project.config.json`：

```json
{
  "setting": {
    "es6": false,   // false → 必须用 ES5 语法
    "enhance": false, // false → 增强编译关闭
  }
}
```

任一项为 false，则 .js 文件中必须使用 ES5 语法。