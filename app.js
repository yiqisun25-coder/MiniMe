App({
  onLaunch() {
    wx.cloud.init({
      env: 'cloud1-d5gbhjps14993bb27',
      traceUser: false,
    });
  },
  globalData: {
    binData: null,
    currentLetter: null,
  },
});
