const { readData, writeData, askSubscribe, notifyFamily } = require('../../utils/api');

Page({
  data: {
    title: '',
    content: '',
    submitting: false,
    submitted: false,
  },

  onTitleInput(e) { this.setData({ title: e.detail.value }); },
  onContentInput(e) { this.setData({ content: e.detail.value }); },

  async onSubmit() {
    const title = this.data.title.trim();
    const content = this.data.content.trim();
    if (!title || !content || this.data.submitting) return;

    askSubscribe(); // 借这次点击攒一条"将来收到提醒"的额度
    this.setData({ submitting: true });
    try {
      const app = getApp();
      const data = await readData();
      data.lettersToMom = [
        {
          id: String(Date.now()),
          title,
          text: content,
          time: new Date().toISOString(),
          readByMom: false,
        },
        ...(data.lettersToMom || []),
      ];
      await writeData(data);
      app.globalData.binData = data;
      notifyFamily(`新的一封信：${title}`);
      this.setData({ submitted: true, submitting: false });
    } catch (e) {
      this.setData({ submitting: false });
      wx.showToast({ title: '发送失败', icon: 'none' });
    }
  },

  onBack() {
    wx.navigateBack();
  },
});
