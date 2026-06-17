const SCENES = {
  morning: {
    label: '早安', emoji: '☀️', desc: '元气满满叫你起床',
    responses: [
      '妈！早上好呀 ☀️ 昨晚睡得好不好？今天也要元气满满哦',
      '起床啦~ 今天也要美美的，我妈最好看了 💕',
      '*轻轻摇你* 早安，世界上最好的妈妈，新的一天加油鸭！',
      '妈妈早安！记得吃早饭，你是最值得被好好对待的人 ☀️',
    ],
  },
  night: {
    label: '晚安', emoji: '🌙', desc: '好好休息，我想你了',
    responses: [
      '妈，晚安 🌙 今天辛苦了，快去好好休息',
      '晚安晚安，今天有没有什么开心的事呀？💭',
      '*给你盖好被子* 好好睡觉，做个甜甜的梦，我想你了',
      '晚安妈妈 🌙 你已经很棒很棒了，明天见',
    ],
  },
  miss: {
    label: '想你了', emoji: '💭', desc: '就是想说说话',
    responses: [
      '妈，我想你了 💕 也不是很想，就是突然特别想',
      '就是想跟你说一声，我想你 🥹 没别的意思就是想',
      '妈妈你知道吗，我觉得我妈是全世界最好的妈妈',
      '*偷偷抱你一下* 想你了，就这样，没有原因 💕',
    ],
  },
  secret: {
    label: '悄悄话', emoji: '🤫', desc: '偷偷告诉你一件事',
    responses: [
      '嘘~ 偷偷告诉你，你是我见过最好的妈妈 🤫',
      '悄悄说：我觉得我妈比所有人的妈妈都好，这是秘密',
      '*凑近耳边* 告诉你一个秘密……我超爱你的 💕',
      '嘿 🤫 你真的很了不起，希望你自己也知道',
    ],
  },
};

const PHOTOS = {
  main:    '/images/me_main.jpeg',
  morning: '/images/me_morning.jpeg',
  night:   '/images/me_night.jpeg',
  miss:    '/images/me_miss.jpeg',
  secret:  '/images/me_secret.jpeg',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return '早上好 ☀️';
  if (h >= 12 && h < 14) return '中午好 🌤️';
  if (h >= 14 && h < 18) return '下午好 🌤️';
  if (h >= 18 && h < 22) return '晚上好 🌙';
  return '又是元气满满的一天呢！';
}

Page({
  data: {
    avatarSrc: PHOTOS.main,
    greeting: '',
    scenes: Object.entries(SCENES).map(([key, s]) => ({
      key, label: s.label, emoji: s.emoji, desc: s.desc,
    })),
    currentResponse: '',
    activeScene: null,
    bubbleVisible: false,
  },

  _tapCount: 0,
  _tapTimer: null,

  onShow() {
    if (typeof this.getTabBar === 'function') {
      this.getTabBar().setData({ selected: 2 });
    }
    this.setData({ greeting: getGreeting() });
  },

  onAvatarTap() {
    this._tapCount += 1;
    clearTimeout(this._tapTimer);
    if (this._tapCount >= 5) {
      this._tapCount = 0;
      wx.navigateTo({ url: '/pages/admin/index' });
      return;
    }
    this._tapTimer = setTimeout(() => { this._tapCount = 0; }, 2000);
  },

  onSceneTap(e) {
    const key = e.currentTarget.dataset.key;
    const responses = SCENES[key].responses;
    const text = responses[Math.floor(Math.random() * responses.length)];
    this.setData({ bubbleVisible: false, avatarSrc: PHOTOS[key] });
    setTimeout(() => {
      this.setData({ currentResponse: text, activeScene: key, bubbleVisible: true });
    }, 150);
  },
});
