const { readData } = require('../../utils/api');
const { formatDate } = require('../../utils/time');

Page({
  data: {
    items: [],
    loading: true,
  },

  onShow() {
    if (typeof this.getTabBar === 'function') {
      this.getTabBar().setData({ selected: 1 });
    }
    this.load();
  },

  async load() {
    this.setData({ loading: true });
    try {
      const app = getApp();
      const data = app.globalData.binData || await readData();
      if (!app.globalData.binData) app.globalData.binData = data;

      const today = new Date().toISOString().slice(0, 10);

      // 妈妈的记录
      const momItems = (data.momRecords || []).map(r => ({
        ...r, type: 'mom', timeStr: formatDate(r.time),
      }));

      // 我的日常
      const dailyItems = (data.myDaily || []).map(r => ({
        ...r, type: 'daily', timeStr: formatDate(r.time),
      }));

      // 记忆（解锁制）
      const memoryItems = (data.memories || []).map(r => ({
        ...r,
        type: 'memory',
        timeStr: formatDate(r.time),
        unlocked: r.unlockDate <= today,
      }));

      // 混排按时间倒序
      const items = [...momItems, ...dailyItems, ...memoryItems]
        .sort((a, b) => new Date(b.time) - new Date(a.time));

      this.setData({ items, loading: false });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },
});
