const { createFamily, joinFamily, generateCode, setUserRole } = require('../../utils/api');


Page({
  data: {
    // 'initial' | 'set_code' | 'creating' | 'created' | 'joining' | 'joining_loading'
    step: 'initial',
    familyCode: '',
    migrated: false,
    customCode: '',     // 女儿自己设的码
    daughterName: '',   // 妈妈叫我
    momName: '',        // 我叫妈妈
    startDate: '',      // 在一起起始日期
    today: new Date().toISOString().slice(0, 10),
    inputCode: '',      // 妈妈输入的码
    error: '',
  },

  // 女儿点"创建家庭" → 先让设置专属码
  onCreateTap() {
    this.setData({ step: 'set_code', customCode: '', error: '' });
  },

  onCustomCodeInput(e) {
    this.setData({ customCode: e.detail.value, error: '' });
  },

  onNameInput(e) {
    this.setData({ daughterName: e.detail.value });
  },

  onMomNameInput(e) {
    this.setData({ momName: e.detail.value });
  },

  onStartDateChange(e) {
    this.setData({ startDate: e.detail.value });
  },

  async onConfirmCreate() {
    const code = this.data.customCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code && code.length < 4) {
      this.setData({ error: '至少4位，再想一个' });
      return;
    }
    // 空 → 自动生成一个
    const finalInput = code || generateCode();
    this.setData({ step: 'creating', error: '' });
    try {
      const name = this.data.daughterName.trim();
      const mom = this.data.momName.trim();
      const start = this.data.startDate;
      const extra = {};
      if (name) extra.daughterName = name;
      if (mom)  extra.momName = mom;
      if (start) extra.startDate = start;
      const { code: finalCode, migrated } = await createFamily(finalInput, extra);
      if (name) wx.setStorageSync('daughterName', name);
      if (mom)  wx.setStorageSync('momName', mom);
      if (start) wx.setStorageSync('startDate', start);
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
      setUserRole('mom');
      getApp().globalData.needSetup = false;
      getApp().globalData.showSplashOnNext = true;
      wx.navigateBack();
    } catch (e) {
      this.setData({ step: 'joining', error: '没找到这个邀请码，确认一下是不是输错了' });
    }
  },

  onEnterApp() {
    setUserRole('daughter');
    getApp().globalData.needSetup = false;
    getApp().globalData.showSplashOnNext = true;
    wx.navigateBack();
  },

  onBackToInitial() {
    this.setData({ step: 'initial', error: '', inputCode: '', customCode: '' });
  },
});
