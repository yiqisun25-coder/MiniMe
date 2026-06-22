const { readData, writeData, getUserRole, setLastSeen } = require('../../utils/api');
const { formatDateTime } = require('../../utils/time');

function getTodayStr() { return new Date().toISOString().slice(0, 10); }
function getNowTimeStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

const WELLNESS_SIGNS = [
  { icon: '🍵', wisdom: '饭后喝一小杯普洱，暖胃助消化', care: '记得饭后半小时再喝，慢慢品 💕' },
  { icon: '🌿', wisdom: '饭后散步二十分钟，胜过吃药一副', care: '没事绕着小区走走，我心里都是你' },
  { icon: '🌅', wisdom: '清晨空腹一杯温水，唤醒一天的活力', care: '起床第一件事喝水，然后想想祎琦 😊' },
  { icon: '🌷', wisdom: '今日宜玫瑰花茶，养颜又疏肝气', care: '我妈本来就好看，喝了更美 💐' },
  { icon: '🌙', wisdom: '睡前泡脚二十分钟，一觉睡到大天亮', care: '水温别超过45度，脚暖了全身都暖' },
  { icon: '🌱', wisdom: '今天多吃深色蔬菜，抗氧化好气色', care: '好气色是养出来的，妈妈越来越年轻' },
  { icon: '☀️', wisdom: '上午十点晒太阳十五分钟，补钙又舒心', care: '去晒晒太阳，你笑起来真的很好看' },
  { icon: '🍃', wisdom: '早晨做五次腹式深呼吸，清肺气', care: '慢慢吸慢慢呼，把烦恼都呼出去' },
  { icon: '🍋', wisdom: '温水泡柠檬片，维C满满助代谢', care: '少喝饮料多喝这个，妈妈最健康最美' },
  { icon: '🌸', wisdom: '压力大时，闭眼数十个呼吸，心自然静', care: '有什么事都可以跟祎琦说哦，我在的' },
  { icon: '🫐', wisdom: '今日宜吃蓝莓，护眼抗氧化越吃越年轻', care: '保护眼睛少看手机，多看美好的事' },
  { icon: '🍯', wisdom: '一小勺蜂蜜加温水，润肠养胃好睡眠', care: '天然的才最好，就像我妈一样自然美' },
  { icon: '🌻', wisdom: '下午加餐几颗核桃，补脑又健康', care: '聪明的妈妈要多补脑，哈哈爱你' },
  { icon: '💐', wisdom: '煲一碗红枣银耳羹，补气养颜内调为主', care: '好好吃饭是对自己最大的爱' },
  { icon: '✨', wisdom: '揉捏太阳穴两分钟，缓解疲劳头脑清', care: '妈妈累了就休息，不用撑着' },
  { icon: '🌟', wisdom: '早餐一个鸡蛋，蛋白质充足精力好', care: '早饭一定要好好吃，女儿在盯着你' },
  { icon: '💕', wisdom: '今日少盐少油，清淡饮食让身体轻盈', care: '轻盈是从里到外的，妈妈你已经很美了' },
  { icon: '🌼', wisdom: '菊花枸杞茶，明目又滋补肝肾', care: '护眼养肝，我妈眼睛亮亮的最好看' },
  { icon: '🦋', wisdom: '快走三十分钟，不伤膝盖效果好', care: '不用跑，走走就很好，贵在坚持' },
  { icon: '🌈', wisdom: '心情不好时喝一杯甘菊茶，舒缓情绪', care: '情绪也是健康的一部分，妈妈要开心' },
  { icon: '🍓', wisdom: '今日宜吃深色水果，花青素抗氧化', care: '吃得好才能打扮得好，里外都照顾' },
  { icon: '🌙', wisdom: '十一点前入睡，是肝脏自我修复的黄金时间', care: '早点睡，明天的事明天再说，别熬夜' },
  { icon: '🍵', wisdom: '饭前喝小半碗汤，饱感来得早吃得刚好', care: '这个方法我也在用，我们一起健康呀' },
  { icon: '🌊', wisdom: '今日开窗通风，让新鲜空气流进来', care: '好空气清爽心情，祎琦希望你每天这样' },
  { icon: '🎋', wisdom: '泡一壶茉莉花茶，排湿气又愉悦心情', care: '花香随着茶香，今天也是美好的一天' },
  { icon: '🥝', wisdom: '自制蔬果汁，新鲜营养不流失', care: '比买的健康多了，妈妈最会养生了' },
  { icon: '🍀', wisdom: '换用橄榄油炒菜，心血管更健康', care: '小小的改变，日积月累对身体好' },
  { icon: '🌾', wisdom: '顺时而食，多吃当季应季食物养脾胃', care: '跟着节气吃，是老祖宗留下的智慧' },
  { icon: '🍵', wisdom: '午后一杯淡绿茶，提神又不影响睡眠', care: '淡一点喝，有茶香就够了，妈妈安心' },
  { icon: '🌺', wisdom: '出门走走晒太阳，吸收天地阳气最养人', care: '出门遛个弯，我妈精气神最好了 💕' },
];

function getDailySign() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  return WELLNESS_SIGNS[dayOfYear % WELLNESS_SIGNS.length];
}

const MOODS = [
  { emoji: '😊', label: '开心' },
  { emoji: '🥰', label: '很幸福' },
  { emoji: '😌', label: '还不错' },
  { emoji: '😔', label: '有点累' },
  { emoji: '😤', label: '有点烦' },
];

const WARM_RESPONSES = [
  '妈，我看到啦，今天的你真好 💕',
  '记下来了，你的每一天我都想知道',
  '妈妈的今天，女儿看见了 ❤️',
  '嗯嗯，我都看着呢，你今天也很棒',
  '谢谢你记下来，这些对我都很珍贵 💕',
];

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5  && h < 11) return '早上好，亲爱的妈妈 ☀️';
  if (h >= 11 && h < 14) return '午好，妈妈，吃饭了吗 🍱';
  if (h >= 14 && h < 18) return '下午好，妈妈，今天过得怎么样 🌤️';
  if (h >= 18 && h < 22) return '晚上好，妈妈 🌙';
  return '好事会发生 🥜';
}

Page({
  data: {
    greeting: '',
    records: [],
    loading: true,
    showForm: false,
    inputText: '',
    selectedMood: null,
    moods: MOODS,
    submitting: false,
    warmResponse: '',
    showResponse: false,
    photoPath: '',
    editingId: null,
    editingText: '',
    editingMood: null,
    editingPhoto: '',      // 当前显示用的图片 URL（resolved）
    editingPhotoFileId: '', // 原始 cloud:// fileID，用于保存
    editingPhotoPath: '',  // 用户新选的本地路径
    userRole: '',
    // 养生签
    wellnessSign: WELLNESS_SIGNS[0],
    wellnessOpened: false,
    // 开屏
    showSplash: false,
    splashFading: false,
    // 新建表单时间
    today: '',
    selectedDate: '',
    selectedTime: '',
  },

  onLoad() {
    this.setData({ today: getTodayStr(), selectedDate: getTodayStr(), selectedTime: getNowTimeStr() });
    const app = getApp();
    if (!app.globalData.splashShown) {
      app.globalData.splashShown = true;
      this.setData({ showSplash: true });
      setTimeout(() => this.setData({ splashFading: true }), 1400);
      setTimeout(() => this.setData({ showSplash: false, splashFading: false }), 2000);
    }
  },

  onShow() {
    if (getApp().globalData.needSetup) { wx.navigateTo({ url: '/pages/setup/index' }); return; }
    if (typeof this.getTabBar === 'function') {
      this.getTabBar().setData({ selected: 0 });
      // 女儿进来：清掉 Tab 0 角标，更新已读时间
      if (getUserRole() === 'daughter') {
        setLastSeen('lastSeenMomRecords');
        const badges = [...(this.getTabBar().data.badges || [0, 0, 0])];
        badges[0] = 0;
        this.getTabBar().setData({ badges });
      }
    }
    this.setData({ greeting: getGreeting(), userRole: getUserRole() || '' });
    this._initWellness();
    getApp().globalData.binData = null;
    this.load();
  },

  _initWellness() {
    const todayStr = new Date().toDateString();
    const savedDate = wx.getStorageSync('wellness_date') || '';
    this.setData({
      wellnessSign: getDailySign(),
      wellnessOpened: savedDate === todayStr,
    });
  },

  async _resolveImages(records) {
    const ids = records.filter(r => r.image && r.image.startsWith('cloud://')).map(r => r.image);
    if (!ids.length) return records;
    try {
      const res = await wx.cloud.callFunction({ name: 'getImageURLs', data: { fileList: ids } });
      const map = {};
      (res.result.fileList || []).forEach(f => { if (f.tempFileURL) map[f.fileID] = f.tempFileURL; });
      return records.map(r => ({
        ...r,
        image: r.image && r.image.startsWith('cloud://') ? (map[r.image] || '') : r.image,
      }));
    } catch (e) {
      return records.map(r => ({ ...r, image: r.image && r.image.startsWith('cloud://') ? '' : r.image }));
    }
  },

  async load() {
    this.setData({ loading: true });
    try {
      const app = getApp();
      const data = app.globalData.binData || await readData();
      if (!app.globalData.binData) app.globalData.binData = data;
      let records = (data.momRecords || [])
        .map(r => ({ ...r, timeStr: formatDateTime(r.time) }))
        .sort((a, b) => new Date(b.time) - new Date(a.time));
      records = await this._resolveImages(records);
      this.setData({ records, loading: false });
    } catch (e) {
      console.error('load error:', e);
      this.setData({ loading: false });
    }
  },

  toggleForm() {
    this.setData({
      showForm: !this.data.showForm,
      inputText: '', selectedMood: null, photoPath: '',
      selectedDate: getTodayStr(), selectedTime: getNowTimeStr(),
    });
  },

  onDateChange(e) { this.setData({ selectedDate: e.detail.value }); },
  onTimeChange(e) { this.setData({ selectedTime: e.detail.value }); },

  choosePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        this.setData({ photoPath: res.tempFiles[0].tempFilePath });
      },
    });
  },

  onTextInput(e)    { this.setData({ inputText: e.detail.value }); },
  selectMood(e)     { this.setData({ selectedMood: e.currentTarget.dataset.index }); },
  onEditInput(e)    { this.setData({ editingText: e.detail.value }); },
  selectEditMood(e) { this.setData({ editingMood: e.currentTarget.dataset.index }); },

  async onSubmit() {
    const text = this.data.inputText.trim();
    if (!text || this.data.submitting) return;
    this.setData({ submitting: true });
    try {
      const app = getApp();
      const data = app.globalData.binData || await readData();
      const mood = this.data.selectedMood !== null
        ? MOODS[this.data.selectedMood].emoji + ' ' + MOODS[this.data.selectedMood].label
        : null;
      let image = '';
      if (this.data.photoPath) {
        const ext = this.data.photoPath.split('.').pop() || 'jpg';
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `mom/${Date.now()}.${ext}`,
          filePath: this.data.photoPath,
        });
        image = uploadRes.fileID;
      }
      const time = new Date(`${this.data.selectedDate}T${this.data.selectedTime}:00`).toISOString();
      data.momRecords = [
        { id: String(Date.now()), text, mood, image, time },
        ...(data.momRecords || []),
      ];
      await writeData(data);
      app.globalData.binData = data;
      let records = (data.momRecords || [])
        .map(r => ({ ...r, timeStr: formatDateTime(r.time) }))
        .sort((a, b) => new Date(b.time) - new Date(a.time));
      records = await this._resolveImages(records);
      const response = WARM_RESPONSES[Math.floor(Math.random() * WARM_RESPONSES.length)];
      this.setData({
        submitting: false, showForm: false,
        inputText: '', selectedMood: null, photoPath: '',
        records, warmResponse: response, showResponse: true,
      });
      setTimeout(() => this.setData({ showResponse: false }), 3000);
    } catch (e) {
      this.setData({ submitting: false });
      wx.showToast({ title: '提交失败，检查网络', icon: 'none' });
    }
  },

  startEdit(e) {
    const id = e.currentTarget.dataset.id;
    const record = this.data.records.find(r => r.id === id);
    if (!record) return;
    // 从原始缓存拿 cloud:// fileID（resolved 后的 URL 不能用于保存）
    const rawData = getApp().globalData.binData;
    const rawRecord = rawData && (rawData.momRecords || []).find(r => r.id === id);
    let editingMood = null;
    if (record.mood) {
      MOODS.forEach((m, i) => {
        if (record.mood.includes(m.emoji)) editingMood = i;
      });
    }
    this.setData({
      editingId: id,
      editingText: record.text,
      editingMood,
      editingPhoto: record.image || '',
      editingPhotoFileId: rawRecord ? (rawRecord.image || '') : '',
      editingPhotoPath: '',
    });
  },

  cancelEdit() {
    this.setData({ editingId: null, editingText: '', editingMood: null, editingPhoto: '', editingPhotoFileId: '', editingPhotoPath: '' });
  },

  editChoosePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        this.setData({
          editingPhoto: res.tempFiles[0].tempFilePath,
          editingPhotoPath: res.tempFiles[0].tempFilePath,
        });
      },
    });
  },

  editRemovePhoto() {
    this.setData({ editingPhoto: '', editingPhotoFileId: '', editingPhotoPath: '' });
  },

  async saveEdit() {
    const text = this.data.editingText.trim();
    if (!text) return;
    try {
      const app = getApp();
      const data = app.globalData.binData || await readData();
      const mood = this.data.editingMood !== null
        ? MOODS[this.data.editingMood].emoji + ' ' + MOODS[this.data.editingMood].label
        : null;
      // 照片处理：新选了 → 上传；没改 → 用原 fileID；手动删了 → ''
      let image = this.data.editingPhotoFileId;
      if (this.data.editingPhotoPath) {
        const ext = this.data.editingPhotoPath.split('.').pop() || 'jpg';
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `mom/${Date.now()}.${ext}`,
          filePath: this.data.editingPhotoPath,
        });
        image = uploadRes.fileID;
      }
      data.momRecords = (data.momRecords || []).map(r =>
        r.id === this.data.editingId ? { ...r, text, mood, image } : r
      );
      await writeData(data);
      app.globalData.binData = data;
      let records = (data.momRecords || [])
        .map(r => ({ ...r, timeStr: formatDateTime(r.time) }))
        .sort((a, b) => new Date(b.time) - new Date(a.time));
      records = await this._resolveImages(records);
      this.setData({
        records,
        editingId: null, editingText: '', editingMood: null,
        editingPhoto: '', editingPhotoFileId: '', editingPhotoPath: '',
      });
      wx.showToast({ title: '已更新', icon: 'success' });
    } catch (e) {
      wx.showToast({ title: '更新失败', icon: 'none' });
    }
  },

  deleteRecord(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除这条记录？',
      content: '删除后不可恢复',
      confirmText: '删除',
      confirmColor: '#C4706A',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          const app = getApp();
          const data = app.globalData.binData || await readData();
          data.momRecords = (data.momRecords || []).filter(r => r.id !== id);
          await writeData(data);
          app.globalData.binData = data;
          const records = (data.momRecords || [])
            .map(r => ({ ...r, timeStr: formatDateTime(r.time) }))
            .sort((a, b) => new Date(b.time) - new Date(a.time));
          this.setData({ records });
          wx.showToast({ title: '已删除', icon: 'success' });
        } catch (e) {
          wx.showToast({ title: '删除失败', icon: 'none' });
        }
      },
    });
  },

  dismissResponse() { this.setData({ showResponse: false }); },

  onWellnessTap() {
    if (this.data.wellnessOpened) return;
    const todayStr = new Date().toDateString();
    wx.setStorageSync('wellness_date', todayStr);
    this.setData({ wellnessOpened: true });
  },
});
