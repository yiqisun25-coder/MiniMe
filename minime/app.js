const { getFamilyCode } = require('./utils/api');

App({
  onLaunch() {
    wx.cloud.init({ env: 'cloud1-d5gbhjps14993bb27', traceUser: false });
    this.globalData.needSetup = !getFamilyCode();
  },
  globalData: {
    binData: null,
    currentLetter: null,
    splashShown: false,
    needSetup: false,
  },
});
