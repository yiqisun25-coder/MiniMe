Component({
  data: {
    selected: 0,
    hidden: false,
    badges: [0, 0, 0],
    list: [
      {
        pagePath: '/pages/mom/index',
        text: '妈妈的生活',
        icon: '/images/icons/home.svg',
        iconActive: '/images/icons/home-active.svg',
      },
      {
        pagePath: '/pages/together/index',
        text: '我们俩',
        icon: '/images/icons/heart.svg',
        iconActive: '/images/icons/heart-active.svg',
      },
      {
        pagePath: '/pages/index/index',
        text: '陪陪我',
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
