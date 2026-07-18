const { readData, getUserRole, getLastSeen, resolveImageURLs } = require('../../utils/api');

const DEFAULT_AVATAR = '/images/default_avatar.jpg';

const PHOTOS = {
  main:    DEFAULT_AVATAR,
  morning: DEFAULT_AVATAR,
  night:   DEFAULT_AVATAR,
  miss:    DEFAULT_AVATAR,
  secret:  DEFAULT_AVATAR,
};

const SCENES = {
  morning: {
    label: '早安', emoji: '🌤️', desc: '道一声早',
    responses: [
      '妈！早上好呀 ☀️ 昨晚睡得好不好？今天也要元气满满哦',
      '起床啦~ 今天也要美美的，我妈最好看了 💕',
      '*轻轻摇你* 早安，世界上最好的妈妈，新的一天加油鸭！',
      '妈妈早安！记得吃早饭，你是最值得被好好对待的人 ☀️',
    ],
  },
  night: {
    label: '晚安', emoji: '🌛', desc: '说句晚安',
    responses: [
      '妈，晚安 🌙 今天辛苦了，快去好好休息',
      '晚安晚安，今天有没有什么开心的事呀？💭',
      '*给你盖好被子* 好好睡觉，做个甜甜的梦，我想你了',
      '晚安妈妈 🌙 你已经很棒很棒了，明天见',
    ],
  },
  miss: {
    label: '想你了', emoji: '💗', desc: '轻轻抱抱',
    responses: [
      '妈，我想你了 💕 也不是很想，就是突然特别想',
      '就是想跟你说一声，我想你 🥹 没别的意思就是想',
      '妈妈你知道吗，我觉得我妈是全世界最好的妈妈',
      '*偷偷抱你一下* 想你了，就这样，没有原因 💕',
    ],
  },
  secret: {
    label: '悄悄话', emoji: '💬', desc: '留个口信',
    responses: [
      '嘘~ 偷偷告诉你，你是我见过最好的妈妈 🤫',
      '悄悄说：我觉得我妈比所有人的妈妈都好，这是秘密',
      '*凑近耳边* 告诉你一个秘密……我超爱你的 💕',
      '嘿 🤫 你真的很了不起，希望你自己也知道',
    ],
  },
};

// 所有场景回应合并，拍头像时轮换用
const ALL_RESPONSES = Object.values(SCENES).flatMap(s => s.responses);

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return '早安，妈妈 ☀';
  if (h >= 12 && h < 14) return '中午好，妈妈 🌤️';
  if (h >= 14 && h < 18) return '下午好，妈妈 🌤️';
  if (h >= 18 && h < 22) return '晚上好，妈妈 🌙';
  return '又是元气满满的一天呢！';
}

function getHeroDate() {
  const now = new Date();
  const weekday = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][now.getDay()];
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return `${weekday} · ${month}月${day}日 · 晴`;
}

Page({
  data: {
    avatarSrc: PHOTOS.main,
    uploadedAvatar: '',   // 云端上传的头像 URL（有则覆盖 PHOTOS）
    greeting: '',
    heroDate: '',
    today: '',
    scenes: Object.entries(SCENES).map(([key, s]) => ({
      key, label: s.label, emoji: s.emoji, desc: s.desc,
    })),
    currentResponse: '',
    activeScene: null,
    bubbleVisible: false,
    unreadCount: 0,
    latestLetter: null,
    adminHint: '',
    isDaughter: false,
    _responseIdx: 0,
    _sceneIdx: { morning: 0, night: 0, miss: 0, secret: 0 },
  },

  _tapCount: 0,
  _tapTimer: null,

  onShow() {
    if (getApp().globalData.needSetup) { wx.navigateTo({ url: '/pages/setup/index' }); return; }
    if (typeof this.getTabBar === 'function') {
      this.getTabBar().setData({ selected: 2 });
    }
    const now = new Date();
    const monthDay = `${now.getMonth() + 1}月${now.getDate()}日`;
    this.setData({ greeting: getGreeting(), heroDate: getHeroDate(), today: monthDay, isDaughter: getUserRole() === 'daughter' });
    this._loadData();
  },

  async _loadData() {
    try {
      const data = await readData();
      getApp().globalData.binData = data;

      // 加载头像：有上传 → 用上传的；没有 → 用 PHOTOS（不动原有场景照片）
      let uploadedAvatar = '';
      if (data.avatarFileId) {
        const map = await resolveImageURLs([data.avatarFileId]);
        uploadedAvatar = map[data.avatarFileId] || '';
      }

      const letters = data.lettersToMom || [];
      const unreadCount = letters.filter(l => !l.readByMom).length;
      const latestLetter = letters.sort((a, b) => new Date(b.time) - new Date(a.time))[0] || null;
      const avatarSrc = uploadedAvatar || PHOTOS.main;
      this.setData({ unreadCount, latestLetter, avatarSrc, uploadedAvatar });

      // 女儿：计算 Tab 0 未读妈妈帖子数
      if (getUserRole() === 'daughter' && typeof this.getTabBar === 'function') {
        const lastSeen = getLastSeen('lastSeenMomRecords');
        const newMomCount = (data.momRecords || []).filter(r => r.time > lastSeen).length;
        const badges = [...(this.getTabBar().data.badges || [0, 0, 0])];
        badges[0] = newMomCount;
        this.getTabBar().setData({ badges });
      }
    } catch (e) { /* 静默 */ }
  },

  async onPullDownRefresh() {
    try { await this._loadData(); } finally { wx.stopPullDownRefresh(); }
  },

  goToMailbox() {
    wx.navigateTo({ url: '/pages/mailbox/index' });
  },

  onWellnessTap() {
    wx.showToast({ title: '轻触卡片，解锁提醒', icon: 'none' });
  },

  onAvatarTap() {
    this._tapCount += 1;
    clearTimeout(this._tapTimer);
    if (this._tapCount >= 5) {
      this._tapCount = 0;
      this.setData({ adminHint: '' });
      wx.navigateTo({ url: '/pages/admin/index' });
      return;
    }
    if (getUserRole() === 'daughter' && this._tapCount >= 2) {
      this.setData({ adminHint: `再点 ${5 - this._tapCount} 次进入设置` });
    }
    this._tapTimer = setTimeout(() => {
      this._tapCount = 0;
      this.setData({ adminHint: '' });
    }, 2000);

    // 每拍一下换一条回应
    const idx = this.data._responseIdx % ALL_RESPONSES.length;
    const text = ALL_RESPONSES[idx];
    this.setData({ currentResponse: text, bubbleVisible: true, _responseIdx: idx + 1 });
  },

  onSceneTap(e) {
    const key = e.currentTarget.dataset.key;
    const responses = SCENES[key].responses;
    const sceneIdx = this.data._sceneIdx;
    const idx = sceneIdx[key] % responses.length;
    const text = responses[idx];
    sceneIdx[key] = idx + 1;
    this.setData({ _sceneIdx: sceneIdx });
    // 有上传头像 → 固定显示；没有 → 用场景专属照片
    const avatarSrc = this.data.uploadedAvatar || PHOTOS[key] || PHOTOS.main;
    this.setData({ bubbleVisible: false, avatarSrc });
    setTimeout(() => {
      this.setData({ currentResponse: text, activeScene: key, bubbleVisible: true });
    }, 150);
  },
});
