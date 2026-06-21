const { createFamily, joinFamily, generateCode } = require('../../utils/api');


Page({
  data: {
    // 'initial' | 'set_code' | 'creating' | 'created' | 'joining' | 'joining_loading'
    step: 'initial',
    familyCode: '',
    migrated: false,
    customCode: '',   // 女儿自己设的码
    inputCode: '',    // 妈妈输入的码
    error: '',
  },

  // 女儿点"创建家庭" → 先让设置专属码
  onCreateTap() {
    this.setData({ step: 'set_code', customCode: generateCode(), error: '' });
  },

  onCustomCodeInput(e) {
    const val = e.detail.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    this.setData({ customCode: val, error: '' });
  },

  async onConfirmCreate() {
    const code = this.data.customCode.trim();
    if (code.length < 4) {
      this.setData({ error: '至少4位，再想一个' });
      return;
    }
    this.setData({ step: 'creating', error: '' });
    try {
      const { code: finalCode, migrated } = await createFamily(code);
      this.setData({ step: 'created', familyCode: finalCode, migrated });
    } catch (e) {
      const taken = e.message === 'code_taken';
      this.setData({
        step: 'set_code',
        error: taken ? '这个码被别人用了，换一个试试 😄' : '创建失败，检查一下网络～',
      });
    }
  },

  onJoinTap() {
    this.setData({ step: 'joining', inputCode: '', error: '' });
  },

  onCodeInput(e) {
    this.setData({ inputCode: e.detail.value.toUpperCase().replace(/[^A-Z0-9]/g, ''), error: '' });
  },

  async onConfirmJoin() {
    const code = this.data.inputCode.trim();
    if (code.length < 4) {
      this.setData({ error: '邀请码至少4位，再检查一下' });
      return;
    }
    this.setData({ step: 'joining_loading', error: '' });
    try {
      await joinFamily(code);
      getApp().globalData.needSetup = false;
      wx.navigateBack();
    } catch (e) {
      this.setData({ step: 'joining', error: '没找到这个邀请码，确认一下是不是输错了' });
    }
  },

  onEnterApp() {
    getApp().globalData.needSetup = false;
    wx.navigateBack();
  },

  onBackToInitial() {
    this.setData({ step: 'initial', error: '', inputCode: '', customCode: '' });
  },
});
