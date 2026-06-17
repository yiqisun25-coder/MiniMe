const { readData } = require('../../utils/api');
const { formatDate } = require('../../utils/time');

Page({
  data: {
    letters: [],
    loading: true,
  },

  async onLoad() { await this.load(); },

  async onShow() {
    if (typeof this.getTabBar === 'function') {
      this.getTabBar().setData({ selected: 1 });
    }
    await this.load();
  },

  async load() {
    this.setData({ loading: true });
    try {
      const app = getApp();
      const data = await readData();
      app.globalData.binData = data;

      const letters = (data.lettersToMom || [])
        .map(l => ({ ...l, timeStr: formatDate(l.time) }))
        .sort((a, b) => new Date(b.time) - new Date(a.time));

      this.setData({ letters, loading: false });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败，检查网络～', icon: 'none' });
    }
  },

  onLetterTap(e) {
    const id = e.currentTarget.dataset.id;
    const app = getApp();
    app.globalData.currentLetter = (app.globalData.binData.lettersToMom || []).find(l => l.id === id);
    wx.navigateTo({ url: '/pages/letter/index?id=' + id });
  },
});
