const { readData, writeData, makeCloudPath, askSubscribe, notifyFamily } = require('../../utils/api');
const { localDateStr, localTimeStr, localToISO } = require('../../utils/time');

function todayStr() { return localDateStr(); }
function nowTimeStr() { return localTimeStr(); }

Page({
  data: {
    text: '',
    photoPath: '',
    selectedDate: '',
    selectedTime: '',
    today: '',
    submitting: false,
    submitted: false,
  },

  onLoad() {
    this.setData({ today: todayStr(), selectedDate: todayStr(), selectedTime: nowTimeStr() });
  },

  onInput(e) { this.setData({ text: e.detail.value }); },
  onDateChange(e) { this.setData({ selectedDate: e.detail.value }); },
  onTimeChange(e) { this.setData({ selectedTime: e.detail.value }); },

  choosePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        this.setData({ photoPath: res.tempFiles[0].tempFilePath });
      },
    });
  },

  removePhoto() {
    this.setData({ photoPath: '' });
  },

  async onSubmit() {
    const text = this.data.text.trim();
    if (!text || this.data.submitting) return;
    askSubscribe(); // 借这次点击攒一条"将来收到提醒"的额度
    this.setData({ submitting: true });
    try {
      const app = getApp();
      const data = await readData();

      let image = '';
      if (this.data.photoPath) {
        const ext = this.data.photoPath.split('.').pop() || 'jpg';
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: makeCloudPath('daily', ext),
          filePath: this.data.photoPath,
        });
        image = uploadRes.fileID;
      }

      const time = localToISO(this.data.selectedDate, this.data.selectedTime);

      data.myDaily = [
        { id: String(Date.now()), text, image, time },
        ...(data.myDaily || []),
      ];
      await writeData(data);
      app.globalData.binData = data;
      notifyFamily(`女儿：${text}`);
      this.setData({ submitted: true, submitting: false });
    } catch (e) {
      this.setData({ submitting: false });
      wx.showModal({ title: '保存失败', content: String(e.message || e.errMsg || JSON.stringify(e)), showCancel: false });
    }
  },

  onReset() {
    this.setData({ text: '', photoPath: '', submitted: false, selectedDate: todayStr(), selectedTime: nowTimeStr() });
  },
  onBack() { wx.navigateBack(); },
});
