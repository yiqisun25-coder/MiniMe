const { readData, writeData } = require('../../utils/api');

Page({
  data: {
    title: '',
    text: '',
    unlockDate: '',
    submitting: false,
    submitted: false,
  },

  onTitleInput(e)  { this.setData({ title: e.detail.value }); },
  onTextInput(e)   { this.setData({ text: e.detail.value }); },
  onDateChange(e)  { this.setData({ unlockDate: e.detail.value }); },

  async onSubmit() {
    const { title, text, unlockDate } = this.data;
    if (!title.trim() || !text.trim() || !unlockDate || this.data.submitting) return;
    this.setData({ submitting: true });
    try {
      const app = getApp();
      const data = app.globalData.binData || await readData();
      data.memories = [
        ...(data.memories || []),
        {
          id: String(Date.now()),
          title: title.trim(),
          text: text.trim(),
          unlockDate,
          time: new Date().toISOString(),
        },
      ].sort((a, b) => a.unlockDate.localeCompare(b.unlockDate));
      await writeData(data);
      app.globalData.binData = data;
      this.setData({ submitted: true, submitting: false });
    } catch (e) {
      this.setData({ submitting: false });
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  onReset() { this.setData({ title: '', text: '', unlockDate: '', submitted: false }); },
  onBack()  { wx.navigateBack(); },
});
