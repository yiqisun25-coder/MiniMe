const { readData, writeData, getUserRole, getLastSeen, setLastSeen, makeCloudPath } = require('../../utils/api');
const { formatDate, localDateStr, localTimeStr, daysSince } = require('../../utils/time');

async function resolveImages(items) {
  const ids = items.filter(r => r.image && r.image.startsWith('cloud://')).map(r => r.image);
  if (!ids.length) return items;
  try {
    const res = await wx.cloud.callFunction({ name: 'getImageURLs', data: { fileList: ids } });
    const map = {};
    (res.result.fileList || []).forEach(f => { if (f.tempFileURL) map[f.fileID] = f.tempFileURL; });
    return items.map(r => ({
      ...r,
      image: r.image && r.image.startsWith('cloud://') ? (map[r.image] || '') : r.image,
    }));
  } catch (e) {
    return items.map(r => ({ ...r, image: r.image && r.image.startsWith('cloud://') ? '' : r.image }));
  }
}

const TILTS = [-3, -1.5, 0, 1.5, 3, -2, 2, -1, 1, -2.5];

const DECO_EMOJIS = ['✿','💕','⭐','🌸','✨','♡','💛','✦','🎀','🌼','🍀','💝'];
// 预生成每张图的随机位置，避免渲染时计算
function randomDecoStyle(seed) {
  // 用 seed 做伪随机，保证同一张图每次渲染一样
  const r = (n) => ((seed * 9301 + 49297) % 233280) / 233280 * n;
  seed = Math.floor(seed * 9301 + 49297) % 233280;
  const side = Math.floor(r(4)); // 0=top, 1=bottom, 2=left, 3=right
  let style = `position:absolute;font-size:28rpx;z-index:3;line-height:1;`;
  const rot = Math.floor(r(40)) - 20;
  style += `transform:rotate(${rot}deg);`;
  if (side === 0) {
    style += `top:-16rpx;left:${10 + Math.floor(r(60))}%;`;
  } else if (side === 1) {
    style += `bottom:24rpx;left:${10 + Math.floor(r(60))}%;`;
  } else if (side === 2) {
    style += `left:-16rpx;top:${10 + Math.floor(r(60))}%;`;
  } else {
    style += `right:-16rpx;top:${10 + Math.floor(r(60))}%;`;
  }
  return style;
}

Page({
  data: {
    items: [],
    photos: [],
    loading: true,
    viewMode: 'timeline',
    newTimelineCount: 0,
    daysTogether: 0,
    photoCount: 0,
    pickerVisible: false,
    pickerItemId: '',
    editingReactionRi: -1,
    pickerTextFocus: false,
    pickerTextFocused: false,
    pickerItemType: '',
    pickerText: '',
    pickerReactions: [],
    emojis: ['❤️', '😄', '🥹', '💕', '👍', '😭'],
    // 写信面板
    composeVisible: false,
    composeText: '',
    composePhoto: '',
    composeSending: false,
    composeFocused: false,
    userRole: '',
  },

  onShow() {
    if (getApp().globalData.needSetup) { wx.navigateTo({ url: '/pages/setup/index' }); return; }
    this.setData({ userRole: getUserRole() || '' });
    if (typeof this.getTabBar === 'function') {
      this.getTabBar().setData({ selected: 1 });
    }
    getApp().globalData.binData = null;
    this.load();
  },

  switchView(e) {
    this.setData({ viewMode: e.currentTarget.dataset.mode });
  },

  async load() {
    this.setData({ loading: true });
    try {
      const data = await readData();

      const today = localDateStr();

      const momItems = (data.momRecords || []).map(r => ({
        ...r, type: 'mom', timeStr: formatDate(r.time),
      }));

      const dailyItems = (data.myDaily || []).map(r => ({
        ...r, type: 'daily', timeStr: formatDate(r.time),
      }));

      const memoryItems = (data.memories || []).map(r => ({
        ...r,
        type: 'memory',
        timeStr: formatDate(r.time),
        unlocked: r.unlockDate <= today,
      }));

      let items = [...momItems, ...dailyItems, ...memoryItems]
        .sort((a, b) => new Date(b.time) - new Date(a.time));

      items = await resolveImages(items);

      // 添加短时间和日期标签
      const todayStr = today;
      const yesterdayStr = localDateStr(new Date(Date.now() - 86400000));
      let lastDate = '';
      items = items.map(item => {
        const t = item.time ? new Date(item.time) : null;
        const dateStr = t ? localDateStr(t) : '';
        const timeOnly = t ? localTimeStr(t) : '';
        let showDateLabel = false;
        let dateLabel = '';
        if (dateStr && dateStr !== lastDate) {
          showDateLabel = true;
          lastDate = dateStr;
          if (dateStr === todayStr) dateLabel = `${dateStr.slice(5).replace('-', '/')}  今天`;
          else if (dateStr === yesterdayStr) dateLabel = `${dateStr.slice(5).replace('-', '/')}  昨天`;
          else dateLabel = dateStr.slice(5).replace('-', '/');
        }
        const reactions = item.reactions || [];
        return {
          ...item,
          shortTime: timeOnly,
          showDateLabel,
          dateLabel,
          emojiReactions: reactions.filter(r => r.type === 'emoji'),
          textReactions: reactions.filter(r => r.type === 'text'),
        };
      });

      const photos = items
        .filter(r => r.image)
        .map((r, i) => ({
          ...r,
          tilt: TILTS[i % TILTS.length],
          caption: r.title || r.text || '',
          decoText: DECO_EMOJIS[i % DECO_EMOJIS.length],
          decoStyle: randomDecoStyle(i + 1),
        }));

      const role = getUserRole();

      // 妈妈：计算时间线新内容数（女儿发的 daily + 解锁记忆）
      let newTimelineCount = 0;
      if (role === 'mom') {
        const lastSeen = getLastSeen('lastSeenTimeline');
        newTimelineCount = [...dailyItems, ...memoryItems.filter(r => r.unlocked)]
          .filter(r => r.time > lastSeen).length;
        setLastSeen('lastSeenTimeline');
      }

      // 女儿：更新 Tab 0 角标
      if (role === 'daughter' && typeof this.getTabBar === 'function') {
        const lastSeen = getLastSeen('lastSeenMomRecords');
        const newMomCount = momItems.filter(r => r.time > lastSeen).length;
        const badges = [...(this.getTabBar().data.badges || [0, 0, 0])];
        badges[0] = newMomCount;
        this.getTabBar().setData({ badges });
      }

      // 天数：优先用云端家庭数据里的起始日期，并同步到本地（妈妈的设备靠这里拿到女儿设置的日期）
      const savedStart = data.startDate || wx.getStorageSync('startDate') || '2000-01-22';
      if (data.startDate) wx.setStorageSync('startDate', data.startDate);
      const daysStr = daysSince(savedStart).toLocaleString('zh-CN');

      const photoCount = photos.length;

      this.setData({ items, photos, loading: false, newTimelineCount, daysTogether: daysStr, photoCount });
    } catch (e) {
      console.error('together load error:', e);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // ── 回应 ──

  openReaction(e) {
    const { id, type } = e.currentTarget.dataset;
    const item = this.data.items.find(it => it.id === id);
    this.setData({
      pickerVisible: true,
      pickerItemId: id,
      pickerItemType: type,
      pickerText: '',
      pickerTextFocus: false,
      editingReactionRi: -1,
      pickerReactions: item ? [...(item.reactions || [])] : [],
    });
  },

  closeReaction() {
    this.setData({ pickerVisible: false, pickerText: '', editingReactionRi: -1, pickerTextFocused: false });
  },

  onMaskTap() {
    // 输入框聚焦时点遮罩不关闭，避免键盘误触
    if (this.data.pickerTextFocused) return;
    this.closeReaction();
  },

  noop() {},

  // ── 写信面板 ──
  openCompose() {
    this.setData({ composeVisible: true, composeText: '', composePhoto: '', composeSending: false });
  },
  closeCompose() {
    this.setData({ composeVisible: false, composeText: '', composePhoto: '' });
  },
  onComposeMaskTap() {
    if (this.data.composeFocused) return;
    this.closeCompose();
  },
  onComposeInput(e) { this.setData({ composeText: e.detail.value }); },
  onComposeFocus() { this.setData({ composeFocused: true }); },
  onComposeBlur() { this.setData({ composeFocused: false }); },
  chooseComposePhoto() {
    wx.chooseMedia({
      count: 1, mediaType: ['image'], sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ composePhoto: res.tempFiles[0].tempFilePath });
      },
    });
  },
  removeComposePhoto() { this.setData({ composePhoto: '' }); },
  async submitCompose() {
    const text = this.data.composeText.trim();
    if (!text || this.data.composeSending) return;
    this.setData({ composeSending: true });
    try {
      let imageId = '';
      if (this.data.composePhoto) {
        const ext = this.data.composePhoto.split('.').pop() || 'jpg';
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: makeCloudPath('daily', ext),
          filePath: this.data.composePhoto,
        });
        imageId = uploadRes.fileID;
      }
      const app = getApp();
      const data = app.globalData.binData || await readData();
      const entry = { id: `d${Date.now()}`, text, time: new Date().toISOString(), image: imageId };
      data.myDaily = [...(data.myDaily || []), entry];
      await writeData(data);
      app.globalData.binData = null;
      this.closeCompose();
      await this.load();
      wx.showToast({ title: '发出去啦 💕', icon: 'none' });
    } catch (e) {
      this.setData({ composeSending: false });
      wx.showToast({ title: '发送失败，再试试', icon: 'none' });
    }
  },

  onPickerFocus() {
    this.setData({ pickerTextFocused: true });
  },

  onPickerBlur() {
    this.setData({ pickerTextFocused: false });
  },

  onPickerTextInput(e) {
    this.setData({ pickerText: e.detail.value });
  },

  // 点击文字回应 → 进入编辑模式
  editTextReaction(e) {
    const { id, type, ri, value } = e.currentTarget.dataset;
    const item = this.data.items.find(it => it.id === id);
    // ri 是 textReactions 里的下标，需要转成 reactions 总下标
    const reactions = item ? (item.reactions || []) : [];
    let textCount = 0;
    let realRi = -1;
    for (let i = 0; i < reactions.length; i++) {
      if (reactions[i].type === 'text') {
        if (textCount === ri) { realRi = i; break; }
        textCount++;
      }
    }
    this.setData({
      pickerVisible: true,
      pickerItemId: id,
      pickerItemType: type,
      pickerText: value,
      pickerTextFocus: true,
      editingReactionRi: realRi,
      pickerReactions: reactions,
    });
  },

  async tapEmoji(e) {
    await this._saveReaction({ type: 'emoji', value: e.currentTarget.dataset.emoji });
  },

  async submitText() {
    const text = this.data.pickerText.trim();
    if (!text) return;
    const { editingReactionRi } = this.data;
    if (editingReactionRi >= 0) {
      await this._updateTextReaction(editingReactionRi, text);
    } else {
      await this._saveReaction({ type: 'text', value: text });
    }
  },

  async deleteEditingReaction() {
    const { editingReactionRi } = this.data;
    if (editingReactionRi < 0) return;
    await this._deleteReactionByRi(editingReactionRi);
  },

  async _updateTextReaction(ri, newText) {
    const { pickerItemId: id, pickerItemType: itemType } = this.data;
    const keyMap = { mom: 'momRecords', daily: 'myDaily', memory: 'memories' };
    const listKey = keyMap[itemType];
    try {
      const app = getApp();
      const data = app.globalData.binData || await readData();
      data[listKey] = (data[listKey] || []).map(r => {
        if (r.id !== id) return r;
        const reactions = [...(r.reactions || [])];
        reactions[ri] = { ...reactions[ri], value: newText, time: new Date().toISOString() };
        return { ...r, reactions };
      });
      await writeData(data);
      app.globalData.binData = data;
      const updatedReactions = this.data.pickerReactions.map((r, i) =>
        i === ri ? { ...r, value: newText } : r
      );
      this._applyReactionsToItems(id, updatedReactions);
      this.setData({ pickerVisible: false, pickerText: '', editingReactionRi: -1 });
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  async _deleteReactionByRi(ri) {
    const { pickerItemId: id, pickerItemType: type } = this.data;
    const keyMap = { mom: 'momRecords', daily: 'myDaily', memory: 'memories' };
    const listKey = keyMap[type];
    try {
      const app = getApp();
      const data = app.globalData.binData || await readData();
      data[listKey] = (data[listKey] || []).map(r => {
        if (r.id !== id) return r;
        return { ...r, reactions: (r.reactions || []).filter((_, i) => i !== ri) };
      });
      await writeData(data);
      app.globalData.binData = data;
      const newReactions = this.data.pickerReactions.filter((_, i) => i !== ri);
      this._applyReactionsToItems(id, newReactions);
      this.setData({ pickerVisible: false, pickerText: '', editingReactionRi: -1 });
    } catch (e) {
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  },

  _applyReactionsToItems(id, reactions) {
    this.setData({
      items: this.data.items.map(item => {
        if (item.id !== id) return item;
        return {
          ...item,
          reactions,
          emojiReactions: reactions.filter(r => r.type === 'emoji'),
          textReactions: reactions.filter(r => r.type === 'text'),
        };
      }),
    });
  },

  async deleteReactionFromPicker(e) {
    const ri = e.currentTarget.dataset.ri;
    const { pickerItemId: id, pickerItemType: type } = this.data;
    const keyMap = { mom: 'momRecords', daily: 'myDaily', memory: 'memories' };
    const listKey = keyMap[type];
    try {
      const app = getApp();
      const data = app.globalData.binData || await readData();
      data[listKey] = (data[listKey] || []).map(r => {
        if (r.id !== id) return r;
        return { ...r, reactions: (r.reactions || []).filter((_, i) => i !== ri) };
      });
      await writeData(data);
      app.globalData.binData = data;
      const newReactions = this.data.pickerReactions.filter((_, i) => i !== ri);
      this._applyReactionsToItems(id, newReactions);
      this.setData({ pickerReactions: newReactions });
    } catch (e) {
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  },

  async _saveReaction(reaction) {
    const { pickerItemId: id, pickerItemType: itemType } = this.data;
    const keyMap = { mom: 'momRecords', daily: 'myDaily', memory: 'memories' };
    const listKey = keyMap[itemType];
    try {
      const app = getApp();
      const data = app.globalData.binData || await readData();
      const entry = { ...reaction, time: new Date().toISOString() };
      data[listKey] = (data[listKey] || []).map(r =>
        r.id !== id ? r : { ...r, reactions: [...(r.reactions || []), entry] }
      );
      await writeData(data);
      app.globalData.binData = data;
      const newReactions = [...(this.data.pickerReactions), entry];
      this._applyReactionsToItems(id, newReactions);
      this.setData({ pickerVisible: false, pickerText: '', editingReactionRi: -1 });
    } catch (e) {
      wx.showToast({ title: '回应失败', icon: 'none' });
    }
  },
});
