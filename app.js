const { getFamilyCode, ensureBind } = require('./utils/api');

App({
  onLaunch() {
    wx.cloud.init({ env: 'cloud1-d5gbhjps14993bb27', traceUser: false });
    this.globalData.needSetup = !getFamilyCode();
    // 老设备已有家庭码但服务端没绑定记录的，静默补上
    if (!this.globalData.needSetup) ensureBind();
  },
  globalData: {
    binData: null,
    currentLetter: null,
    splashShown: false,
    needSetup: false,
  },
});
