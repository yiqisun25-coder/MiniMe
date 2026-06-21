# MiniMe 小程序

> 一个女儿给妈妈做的专属小空间。让异地的陪伴有个落脚的地方。

---

## 功能概览

### Tab 1 · 妈妈的生活
妈妈可以在这里记录日常，支持文字 + 照片。女儿在后台可以看到妈妈留下的所有内容，随时了解妈妈的状态。

- 妈妈发布图文记录
- 照片存入微信云存储，自动转换为可展示 URL
- 支持编辑、删除已发布的记录（含替换/移除照片）

### Tab 2 · 我们俩
女儿上传的共同回忆照片墙，2×2 网格布局，iOS/Android 均适配。

- 图文记录，支持 cloud:// 格式图片显示
- 兼容 Android WebView（使用 margin 代替 gap）

### Tab 3 · 陪陪我
妈妈打开这里，看到的是"女儿的分身"。

**场景卡片（2×2）**
四个场景，点击后头像切换对应照片并弹出随机暖心回复：
- ☀️ 早安
- 🌙 晚安
- 💭 想你了
- 🤫 悄悄话

**给你的信 💌**
底部入口，通往信件邮箱。有未读信件时显示红色数字角标。

### 信件系统
- 女儿在「给妈妈写信」页撰写带标题的长信
- 妈妈在「给你的信」页阅读，阅读后自动标记已读
- 女儿后台可查看所有已发信件及阅读状态

---

## 多用户支持（邀请码系统）

每对母女拥有独立的家庭数据，通过**6位邀请码**绑定。

### 首次使用流程

**女儿端（创建家庭）**
1. 打开小程序 → 进入设置页
2. 点「我是女儿」👧
3. 系统随机生成邀请码，可自定义（4-8位字母数字）
4. 把邀请码发给妈妈

**妈妈端（加入家庭）**
1. 打开小程序 → 进入设置页
2. 点「我是妈妈」👩
3. 输入女儿发来的邀请码，连接成功

> 忘记邀请码？连点头像5次进后台，顶部有显示。

### 数据隔离
每个家庭的数据存储在云数据库 `minime` 集合中，文档 `_id` 即为邀请码，完全隔离。

---

## 头像系统

| 优先级 | 来源 | 说明 |
|---|---|---|
| 1 | 云端上传 (`avatarFileId`) | 女儿在后台上传的照片，所有用户看到同一张 |
| 2 | 本地 `PHOTOS` 对象 | 场景专属照片，随场景卡片切换（原始版本保留） |
| 3 | `default_avatar.jpg` | 兜底默认头像 |

**更换头像**：连点头像5次 → 进后台 → 顶部「更换头像」→ 从相册或拍照选图 → 上传云存储后自动生效。

---

## 后台管理（Admin）

连点 Tab 3 头像 **5次**进入，仅女儿使用。

- 查看家庭邀请码
- 更换头像
- 查看妈妈的所有留言，支持一键全部已读
- 管理已发出内容：日常 / 记忆锁 / 信件，支持编辑和删除
- 快捷入口：写信、存日常、预存记忆

---

## 技术架构

### 云环境
```
env: cloud1-d5gbhjps14993bb27
```

### 云数据库
集合名：`minime`

```javascript
{
  _id: "FAMILY_CODE",     // 邀请码即文档ID
  momMessages: [],        // 妈妈留言
  momRecords: [],         // 妈妈的生活记录（图文）
  lettersToMom: [],       // 给妈妈的信
  myDaily: [],            // 女儿日常
  memories: [],           // 记忆锁
  avatarFileId: "",       // 头像 cloud:// fileID
}
```

### 云函数：`getImageURLs`
客户端无法直接使用 `getTempFileURL`（云存储权限限制），通过云函数绕过：

```javascript
// 调用方式
wx.cloud.callFunction({
  name: 'getImageURLs',
  data: { fileList: ['cloud://...'] }
})
// 返回临时 HTTPS URL，有效期约2小时
```

所有图片显示均走此云函数，不直接使用 `cloud://` 路径作为 `src`。

### 本地存储
```javascript
wx.setStorageSync('familyCode', code)  // 持久化家庭绑定
```

### 全局状态
```javascript
getApp().globalData = {
  binData: null,        // 当前家庭数据缓存
  currentLetter: null,  // 信件详情传递
  splashShown: false,
  needSetup: false,     // 未绑定家庭时重定向到 setup 页
}
```

### 页面列表

| 页面 | 路径 | 说明 |
|---|---|---|
| 陪陪我 | `pages/index` | Tab 3，场景卡片 + 信件入口 |
| 我们俩 | `pages/together` | Tab 2，照片墙 |
| 妈妈的生活 | `pages/mom` | Tab 1，妈妈记录 |
| 后台管理 | `pages/admin` | 5次点击进入 |
| 设置/邀请码 | `pages/setup` | 首次使用绑定 |
| 写信 | `pages/compose` | 女儿写长信 |
| 信件详情 | `pages/letter` | 妈妈读信 |
| 信件列表 | `pages/mailbox` | 妈妈的收件箱 |
| 日常记录 | `pages/daily` | 女儿发图文 |
| 记忆锁 | `pages/memory` | 预存定时解锁内容 |

---

## 已知注意事项

- **Android `gap` 不兼容**：flex 布局照片网格使用 `margin-bottom` + `justify-content: space-between` 代替 `gap`
- **`<text>` 默认内联**：WeChat 中需加 `display: block` 才能换行显示
- **云存储图片权限**：客户端调用 `getTempFileURL` 需部署云函数绕过
- **数据库文档自动创建**：`readData()` 捕获 `cannot find document` 错误时自动 `add` 新文档

---

*做给妈妈的，所以要好好做。*
