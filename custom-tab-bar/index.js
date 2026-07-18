Component({
  lifetimes: {
    attached() {
      // 女儿端第三个 tab 显示"我的"
      if (wx.getStorageSync('userRole') === 'daughter') {
        this.setData({ 'list[2].text': '我的' });
      }
    },
  },
  data: {
    selected: 0,
    hidden: false,
    badges: [0, 0, 0],
    list: [
      {
        pagePath: '/pages/mom/index',
        text: '日常记录',
        icon: '/images/icons/home.svg',
        iconActive: '/images/icons/home-active.svg',
      },
      {
        pagePath: '/pages/together/index',
        text: '相册',
        icon: '/images/icons/heart.svg',
        iconActive: '/images/icons/heart-active.svg',
      },
      {
        pagePath: '/pages/index/index',
        text: '我的',
        icon: '/images/icons/person.svg',
        iconActive: '/images/icons/person-active.svg',
      },
    ],
  },
  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      wx.switchTab({ url: this.data.list[index].pagePath });
      this.setData({ selected: index });
    },
  },
});
