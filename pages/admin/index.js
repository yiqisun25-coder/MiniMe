const { readData, writeData } = require('../../utils/api');
const { formatDateTime } = require('../../utils/time');

Page({
  data: {
    messages: [],
    loading: true,
    unreadCount: 0,
  },

  async onLoad() { await this.load(); },
  async onShow() { await this.load(); },

  async load() {
    this.setData({ loading: true });
    try {
      const data = await readData();
      getApp().globalData.binData = data;

      const messages = (data.momMessages || [])
        .map(m => ({ ...m, timeStr: formatDateTime(m.time) }))
        .sort((a, b) => new Date(b.time) - new Date(a.time));

      this.setData({
        messages,
        unreadCount: messages.filter(m => !m.readByYiqi).length,
        loading: false,
      });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  async markAllRead() {
    const app = getApp();
    try {
      const data = app.globalData.binData || await readData();
      data.momMessages = (data.momMessages || []).map(m => ({ ...m, readByYiqi: true }));
      await writeData(data);
      app.globalData.binData = data;
      this.setData({
        messages: this.data.messages.map(m => ({ ...m, readByYiqi: true })),
        unreadCount: 0,
      });
      wx.showToast({ title: '已全部标记已读', icon: 'success' });
    } catch (e) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  goCompose() { wx.navigateTo({ url: '/pages/compose/index' }); },
  goDaily()   { wx.navigateTo({ url: '/pages/daily/index' }); },
  goMemory()  { wx.navigateTo({ url: '/pages/memory/index' }); },
});
