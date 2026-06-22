Component({
  data: {
    selected: 0,
    badges: [0, 0, 0],
    list: [
      { pagePath: '/pages/mom/index',      emoji: '🌸', text: '妈妈的生活' },
      { pagePath: '/pages/together/index', emoji: '💞', text: '我们俩'    },
      { pagePath: '/pages/index/index',    emoji: '🏠', text: '陪陪我'    },
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
