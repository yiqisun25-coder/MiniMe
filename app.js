const { getFamilyCode } = require('./utils/api');

App({
  onLaunch() {
    wx.cloud.init({ env: 'cloud1-d5gbhjps14993bb27', traceUser: false });
    this.globalData.needSetup = !getFamilyCode();
    // 补绑定不用单独调：云函数 read/write 里会自动完成
  },
  globalData: {
    binData: null,
    currentLetter: null,
    splashShown: false,
    needSetup: false,
  },
});
