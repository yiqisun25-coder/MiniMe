const { readData, writeData } = require('../../utils/api');

Page({
  onShow() {
    if (typeof this.getTabBar === 'function') {
      this.getTabBar().setData({ selected: 2 });
    }
  },

  data: {
    inputText: '',
    submitting: false,
    submitted: false,
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  async onSubmit() {
    const text = this.data.inputText.trim();
    if (!text || this.data.submitting) return;

    this.setData({ submitting: true });
    try {
      const app = getApp();
      const data = app.globalData.binData || await readData();
      data.momMessages = [
        { id: String(Date.now()), text, time: new Date().toISOString(), readByYiqi: false },
        ...(data.momMessages || []),
      ];
      await writeData(data);
      app.globalData.binData = data;
      this.setData({ submitted: true, submitting: false });
    } catch (e) {
      this.setData({ submitting: false });
      wx.showToast({ title: '发送失败，检查网络～', icon: 'none' });
    }
  },

  onReset() {
    this.setData({ inputText: '', submitted: false });
  },
});
