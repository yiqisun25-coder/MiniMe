const { readData, writeData, makeCloudPath } = require('../../utils/api');

Page({
  data: {
    title: '',
    text: '',
    unlockDate: '',
    photoPath: '',
    submitting: false,
    submitted: false,
  },

  onTitleInput(e)  { this.setData({ title: e.detail.value }); },
  onTextInput(e)   { this.setData({ text: e.detail.value }); },
  onDateChange(e)  { this.setData({ unlockDate: e.detail.value }); },

  choosePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        this.setData({ photoPath: res.tempFiles[0].tempFilePath });
      },
    });
  },

  async onSubmit() {
    const { title, text, unlockDate } = this.data;
    if (!title.trim() || !text.trim() || !unlockDate || this.data.submitting) return;
    this.setData({ submitting: true });
    try {
      const app = getApp();
      const data = app.globalData.binData || await readData();

      // 上传照片（如果有）
      let image = '';
      if (this.data.photoPath) {
        const ext = this.data.photoPath.split('.').pop() || 'jpg';
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: makeCloudPath('memories', ext),
          filePath: this.data.photoPath,
        });
        image = uploadRes.fileID;
      }

      data.memories = [
        ...(data.memories || []),
        {
          id: String(Date.now()),
          title: title.trim(),
          text: text.trim(),
          unlockDate,
          image,
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

  onReset() { this.setData({ title: '', text: '', unlockDate: '', photoPath: '', submitted: false }); },
  onBack()  { wx.navigateBack(); },
});
