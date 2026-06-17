const { readData, writeData } = require('../../utils/api');

Page({
  data: {
    text: '',
    submitting: false,
    submitted: false,
  },

  onInput(e) { this.setData({ text: e.detail.value }); },

  async onSubmit() {
    const text = this.data.text.trim();
    if (!text || this.data.submitting) return;
    this.setData({ submitting: true });
    try {
      const app = getApp();
      const data = app.globalData.binData || await readData();
      data.myDaily = [
        { id: String(Date.now()), text, time: new Date().toISOString() },
        ...(data.myDaily || []),
      ];
      await writeData(data);
      app.globalData.binData = data;
      this.setData({ submitted: true, submitting: false });
    } catch (e) {
      this.setData({ submitting: false });
      wx.showModal({ title: '保存失败', content: String(e.message || e.errMsg || JSON.stringify(e)), showCancel: false });
    }
  },

  onReset() { this.setData({ text: '', submitted: false }); },
  onBack()  { wx.navigateBack(); },
});
