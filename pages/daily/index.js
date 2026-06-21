const { readData, writeData } = require('../../utils/api');

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function nowTimeStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

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
    this.setData({ submitting: true });
    try {
      const app = getApp();
      const data = app.globalData.binData || await readData();

      let image = '';
      if (this.data.photoPath) {
        const ext = this.data.photoPath.split('.').pop() || 'jpg';
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `daily/${Date.now()}.${ext}`,
          filePath: this.data.photoPath,
        });
        image = uploadRes.fileID;
      }

      const time = new Date(`${this.data.selectedDate}T${this.data.selectedTime}:00`).toISOString();

      data.myDaily = [
        { id: String(Date.now()), text, image, time },
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

  onReset() {
    this.setData({ text: '', photoPath: '', submitted: false, selectedDate: todayStr(), selectedTime: nowTimeStr() });
  },
  onBack() { wx.navigateBack(); },
});
