const { readData, writeData, getUserRole, getLastSeen, setLastSeen } = require('../../utils/api');
const { formatDate } = require('../../utils/time');

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

Page({
  data: {
    items: [],
    photos: [],
    loading: true,
    viewMode: 'timeline',
    newTimelineCount: 0,
    pickerVisible: false,
    pickerItemId: '',
    pickerItemType: '',
    pickerText: '',
    pickerReactions: [],
    emojis: ['❤️', '😄', '🥹', '💕', '👍', '😭'],
  },

  onShow() {
    if (getApp().globalData.needSetup) { wx.navigateTo({ url: '/pages/setup/index' }); return; }
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

      const today = new Date().toISOString().slice(0, 10);

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

      const photos = items
        .filter(r => r.image)
        .map((r, i) => ({
          ...r,
          tilt: TILTS[i % TILTS.length],
          caption: r.title || r.text || '',
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

      this.setData({ items, photos, loading: false, newTimelineCount });
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
      pickerReactions: item ? [...(item.reactions || [])] : [],
    });
  },

  closeReaction() {
    this.setData({ pickerVisible: false, pickerText: '' });
  },

  onPickerTextInput(e) {
    this.setData({ pickerText: e.detail.value });
  },

  async tapEmoji(e) {
    await this._saveReaction({ type: 'emoji', value: e.currentTarget.dataset.emoji });
  },

  async submitText() {
    const text = this.data.pickerText.trim();
    if (!text) return;
    await this._saveReaction({ type: 'text', value: text });
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
      this.setData({
        pickerReactions: newReactions,
        items: this.data.items.map(item => {
          if (item.id !== id) return item;
          return { ...item, reactions: newReactions };
        }),
      });
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
      this.setData({
        pickerVisible: false,
        pickerText: '',
        items: this.data.items.map(item =>
          item.id !== id ? item : { ...item, reactions: [...(item.reactions || []), entry] }
        ),
      });
    } catch (e) {
      wx.showToast({ title: '回应失败', icon: 'none' });
    }
  },
});
