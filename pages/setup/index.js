const { createFamily, joinFamily, isValidCode, setUserRole } = require('../../utils/api');
const { localDateStr } = require('../../utils/time');


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
    today: localDateStr(),
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
    if (code && !isValidCode(code)) {
      this.setData({ error: '要3个字母加3个数字（6位），比如 MOM520' });
      return;
    }
    this.setData({ step: 'creating', error: '' });
    try {
      const name = this.data.daughterName.trim();
      const mom = this.data.momName.trim();
      const start = this.data.startDate;
      const extra = {};
      if (name) extra.daughterName = name;
      if (mom)  extra.momName = mom;
      if (start) extra.startDate = start;
      // 空 → api 里自动生成并在撞车时重试
      const { code: finalCode, migrated } = await createFamily(code || null, extra);
      if (name) wx.setStorageSync('daughterName', name);
      if (mom)  wx.setStorageSync('momName', mom);
      if (start) wx.setStorageSync('startDate', start);
      this.setData({ step: 'created', familyCode: finalCode, migrated });
    } catch (e) {
      if (e.message === 'already_bound') {
        // 这个微信已经有家庭了，直接恢复进入
        setUserRole(e.role || 'daughter');
        getApp().globalData.needSetup = false;
        getApp().globalData.showSplashOnNext = true;
        wx.showToast({ title: `你已经有家庭啦（${e.code}），带你进去`, icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1200);
        return;
      }
      const msgMap = {
        code_taken: '这个码被别人用了，换一个试试 😄',
        bad_format: '要3个字母加3个数字（6位），比如 MOM520',
      };
      this.setData({
        step: 'set_code',
        error: msgMap[e.message] || '创建失败，检查一下网络～',
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
      const family = await joinFamily(code);
      // 把女儿创建家庭时设置的信息同步到妈妈的设备（开屏天数依赖 startDate）
      if (family.startDate) wx.setStorageSync('startDate', family.startDate);
      if (family.daughterName) wx.setStorageSync('daughterName', family.daughterName);
      if (family.momName) wx.setStorageSync('momName', family.momName);
      setUserRole('mom');
      getApp().globalData.needSetup = false;
      getApp().globalData.showSplashOnNext = true;
      wx.navigateBack();
    } catch (e) {
      if (e.message === 'already_bound') {
        this.setData({
          step: 'joining',
          error: `这个微信已经绑定过家庭（${e.code}），一个人只能加入一个家庭。如果绑错了，在管理页可以解绑`,
        });
        return;
      }
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
