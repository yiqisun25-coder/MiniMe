# MiniMe 小程序

> 一个女儿给妈妈做的专属小空间。让异地的陪伴有个落脚的地方。

---

## 功能概览

### 开屏动画
纯 CSS 手绘风插画开屏：太阳（带笑脸 + 光芒）、云朵、多层山丘、小树、小房子。  
显示"我在这里 · 妈妈，今天也想你了"及自定义在一起的天数。  
首次使用完成 setup 后自动播放一次，之后不重复出现。

### Tab 1 · 妈妈的生活
妈妈记录日常，支持文字 + 照片（4:3 显示）。

- 每日养生签卡片（30 条循环，点击解锁）
- 心情标签：开心 / 很幸福 / 还不错 / 有点累 / 有点烦
- 支持编辑、删除记录（含替换 / 移除照片）
- 女儿端可查看所有内容

### Tab 2 · 我们俩
时间线 + 相册墙双视图。

**时间线**
- 妈妈的生活 📒 / 宝宝来信 📨 / 解锁记忆，统一左对齐布局
- 按日期分组，显示"今天 / 昨天"标签
- 每条内容可添加表情回应 + 文字回应（面板内可编辑 / 删除）

**相册墙**
- 2×2 固定两列（`width: 50%`，iOS / Android 均适配）
- 拍立得风格卡片，随机 emoji 装饰贴纸（随机边 + 随机旋转角度）
- 照片左上角显示日期

**统计栏**
- 实时显示"和妈妈一起走过的第 X 天"（起始日期在 setup 中自定义）
- 实时照片总数

**女儿写信入口**
- 右下角悬浮 ✉️ 按钮（仅女儿角色可见）
- 弹出写信面板，支持文字 + 照片，发送后即显示在时间线"宝宝来信"

### Tab 3 · 陪陪我
妈妈打开这里，看到的是"女儿的分身"。

- 中央头像带光晕 + 白边圆圈
- 2×2 场景卡片：道一声早 / 说句晚安 / 轻轻抱抱 / 留个口信
- 点击触发随机暖心回复
- 信箱入口：女儿写的信在这里拆开读，未读有角标

### 体验细节
- 四个列表页支持**下拉刷新**
- **微信订阅消息通知**：对方发了新内容，微信服务通知提醒（发布时攒订阅额度，一次允许 = 一条通知）
- 时间按各自手机时区显示；开屏"在一起的天数"按本地日历日计算

---

## 多用户支持（邀请码系统）

每对母女通过**邀请码**绑定独立家庭数据，互不干扰。

**隔离规则（由 `family` 云函数在服务端强制执行）**
- 邀请码 6 位：恰好 3 个字母 + 3 个数字（自动生成时避开易混淆的 O/I/0/1）
- 每个微信号只能创建**或**加入一个家庭（按 openid 记录在 `members` 集合）
- 一个家庭最多 4 人；误绑可在后台管理页解绑（数据不删）
- 换手机输入自己家的邀请码可直接恢复

### 首次使用流程

**女儿端（创建家庭）**
1. 打开小程序 → setup 页
2. 点「我是女儿」
3. 设置专属码 + 称呼 + **在一起的起始日期**（天数从这里算）
4. 把邀请码发给妈妈，完成后播放开屏动画

**妈妈端（加入家庭）**
1. 打开小程序 → setup 页
2. 点「我是妈妈」
3. 输入女儿发来的邀请码，连接成功后播放开屏动画

> 起始日期可以是妈妈的生日、第一次视频通话的日子，或任意有意义的日期。

---

## 头像系统

| 优先级 | 来源 | 说明 |
|---|---|---|
| 1 | 云端上传 (`avatarFileId`) | 女儿在后台上传，所有用户看到同一张 |
| 2 | 兜底 emoji | 🌷（妈妈）/ 🧸（女儿）|

**更换头像**：连点 Tab 3 头像 5 次 → 进后台 → 顶部「更换头像」。

---

## 后台管理（Admin）

连点 Tab 3 头像 **5 次**进入，仅女儿使用。

- 查看家庭邀请码 / 解绑退出家庭
- 更换头像
- 查看妈妈的所有留言，支持一键全部已读
- 管理内容：日常 / 记忆锁 / 信件，支持编辑和删除

---

## 技术架构

### 云环境
```
env: cloud1-d5gbhjps14993bb27
```

### 云数据库

**`minime`** —— 家庭数据，一家一个文档：

```javascript
{
  _id: "FAMILY_CODE",      // 邀请码即文档ID
  momRecords: [],          // 妈妈的生活记录（图文）
  myDaily: [],             // 女儿日常（宝宝来信）
  memories: [],            // 预存记忆（定时解锁）
  momMessages: [],         // 妈妈留言
  lettersToMom: [],        // 给妈妈的信（信箱）
  avatarFileId: "",        // 头像 cloud:// fileID
  startDate: "",           // 在一起起始日期（YYYY-MM-DD）
  daughterName: "",        // 称呼
  momName: "",
}
```

**`members`** —— openid → 家庭 的绑定关系（每人一条）：

```javascript
{
  _id: "openid",           // 微信用户唯一标识
  code: "FAMILY_CODE",     // 绑定的家庭
  role: "daughter | mom",
  subCount: 0,             // 订阅消息剩余额度
}
```

### 云函数

**`family`** —— 唯一数据通道，所有读写都按 openid 验明正身：

| action | 作用 |
|---|---|
| `read` / `write` | 只能读写自己绑定的家庭（客户端传什么码都没用）|
| `create` / `join` | 创建/加入家庭，每人限一个，家庭上限 4 人 |
| `grantSub` / `notify` | 订阅消息：攒额度 / 通知家里其他人 |
| `unbind` / `getMine` | 解绑 / 换手机恢复 |

**`getImageURLs`** —— `cloud://` 图片转临时 HTTPS URL（约 2 小时有效），**带归属校验**：只放行调用者自己家庭的图片。客户端另有 90 分钟内存缓存，切页不重复请求。

### 安全模型

| 层 | 权限 |
|---|---|
| 数据库 `minime` / `members` | 所有用户不可读写（仅云函数可访问）|
| 云存储 | 仅创建者可读写；展示走 `getImageURLs` 归属校验 |
| 照片路径 | `家庭码/分类/时间戳-随机数`，按家庭隔离 |

### 时间约定
存储统一用 ISO/UTC 字符串；显示一律经 `utils/time.js` 转当前手机时区。写操作前强制重读最新数据，避免两人同时在线互相覆盖。

### 订阅消息
模板 ID 与字段名配置在 `utils/config.js`（留空则通知功能静默关闭）。发送逻辑在 `family` 云函数 `notify`，只发给同家庭成员，额度用尽自动停发。

### 本地存储
```javascript
wx.setStorageSync('familyCode', code)
wx.setStorageSync('startDate', date)     // 在一起起始日期
wx.setStorageSync('daughterName', name)
wx.setStorageSync('momName', name)
```

### 全局状态
```javascript
getApp().globalData = {
  binData: null,              // 家庭数据缓存
  splashShown: false,         // 开屏是否已播放
  showSplashOnNext: false,    // setup 完成后触发开屏
  needSetup: false,           // 未绑定时跳转 setup
}
```

### 图片比例方案
WeChat `<image>` 不可靠支持 `aspect-ratio`，统一使用 padding-bottom 包裹：

```css
/* 4:3 */
.img-ratio-wrap { position: relative; padding-bottom: 75%; overflow: hidden; }
/* 1:1 */
.polaroid-img-wrap { position: relative; padding-bottom: 100%; overflow: hidden; }
.img-ratio-img { position: absolute; top:0; left:0; width:100%; height:100%; }
```

### Android 兼容注意
- Tab bar 不使用 `backdrop-filter`（安卓不支持）
- 不使用 `env(safe-area-inset-bottom)`（安卓无效）
- 相册墙用 `width: 50%` + padding 做间距，不用 `gap`（保证严格两列）

### 页面列表

| 页面 | 路径 | 说明 |
|---|---|---|
| 妈妈的生活 | `pages/mom` | Tab 1，开屏动画在此 |
| 我们俩 | `pages/together` | Tab 2，时间线 + 相册墙 + 写信 |
| 陪陪我 | `pages/index` | Tab 3，场景卡片 + 信箱入口 |
| 设置 | `pages/setup` | 首次使用，邀请码 + 起始日期 |
| 后台管理 | `pages/admin` | 连点头像 5 次进入（女儿专用）|
| 女儿日常 | `pages/daily` | 记录一条日常（补日期时间）|
| 记忆锁 | `pages/memory` | 预存记忆，到日期解锁 |
| 写信 | `pages/compose` | 女儿写信给妈妈 |
| 信箱 / 信件 | `pages/mailbox` / `pages/letter` | 妈妈读信，自动标记已读 |
| 妈妈留言 | `pages/talk` | 妈妈给女儿留口信 |

---

*做给妈妈的，所以要好好做。*
