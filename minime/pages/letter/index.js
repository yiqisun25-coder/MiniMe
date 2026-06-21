const { readData, writeData } = require('../../utils/api');
const { formatDate } = require('../../utils/time');

Page({
  data: {
    letter: null,
  },

  async onLoad(options) {
    const app = getApp();
    const letter = app.globalData.currentLetter;
    if (!letter) return;

    this.setData({
      letter: { ...letter, timeStr: formatDate(letter.time) },
    });
    wx.setNavigationBarTitle({ title: letter.title || '信件' });

    if (!letter.readByMom) {
      this.markAsRead(options.id, app);
    }
  },

  async markAsRead(id, app) {
    try {
      const data = app.globalData.binData || await readData();
      const idx = (data.lettersToMom || []).findIndex(l => l.id === id);
      if (idx >= 0 && !data.lettersToMom[idx].readByMom) {
        data.lettersToMom[idx].readByMom = true;
        app.globalData.binData = data;
        await writeData(data);
      }
    } catch (e) {
      // 不影响阅读体验，静默失败
    }
  },
});
