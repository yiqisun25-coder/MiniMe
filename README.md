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

---

## 多用户支持（邀请码系统）

每对母女通过**邀请码**绑定独立家庭数据，互不干扰。

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

- 查看家庭邀请码
- 更换头像
- 查看妈妈的所有留言，支持一键全部已读
- 管理内容：日常 / 记忆锁，支持编辑和删除

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
  _id: "FAMILY_CODE",      // 邀请码即文档ID
  momRecords: [],          // 妈妈的生活记录（图文）
  myDaily: [],             // 女儿日常（宝宝来信）
  memories: [],            // 预存记忆（定时解锁）
  momMessages: [],         // 妈妈留言
  lettersToMom: [],        // 给妈妈的信（旧版，兼容保留）
  avatarFileId: "",        // 头像 cloud:// fileID
  startDate: "",           // 在一起起始日期（YYYY-MM-DD）
  daughterName: "",        // 称呼
  momName: "",
}
```

### 云函数：`getImageURLs`
所有 `cloud://` 图片经云函数转为临时 HTTPS URL（有效期约 2 小时）。

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
| 陪陪我 | `pages/index` | Tab 3 |
| 我们俩 | `pages/together` | Tab 2，时间线 + 相册墙 + 写信 |
| 妈妈的生活 | `pages/mom` | Tab 1，开屏动画在此 |
| 设置 | `pages/setup` | 首次使用，邀请码 + 起始日期 |
| 后台管理 | `pages/admin` | 连点头像 5 次进入（女儿专用）|

---

*做给妈妈的，所以要好好做。*
