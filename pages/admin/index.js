const { readData, writeData, getFamilyCode, unbindFamily } = require('../../utils/api');
const { formatDateTime, localDateStr, localTimeStr, localToISO } = require('../../utils/time');

const DEFAULT_AVATAR = '/images/default_avatar.jpg';

function getTodayStr() { return localDateStr(); }
function getNowTimeStr() { return localTimeStr(); }

Page({
  data: {
    familyCode: '',
    avatarSrc: DEFAULT_AVATAR,
    avatarFileId: '',
    avatarUploading: false,
    daughterName: '',
    momName: '',
    messages: [],
    loading: true,
    unreadCount: 0,
    today: '',
    // 我发出去的
    activeTab: 'daily',
    dailyList: [],
    memoryList: [],
    letterList: [],
    editingId: null,
    editingText: '',
    editingDate: '',
    editingTime: '',
  },

  async onLoad() { this.setData({ today: getTodayStr(), familyCode: getFamilyCode() || '' }); await this.load(); },
  async onShow() { await this.load(); },

  async load() {
    this.setData({ loading: true });
    try {
      const data = await readData();
      getApp().globalData.binData = data;

      const messages = (data.momMessages || [])
        .map(m => ({ ...m, timeStr: formatDateTime(m.time) }))
        .sort((a, b) => new Date(b.time) - new Date(a.time));

      const dailyList = (data.myDaily || [])
        .map(r => ({ ...r, timeStr: formatDateTime(r.time) }))
        .sort((a, b) => new Date(b.time) - new Date(a.time));

      const memoryList = (data.memories || [])
        .map(r => ({ ...r, timeStr: formatDateTime(r.time) }))
        .sort((a, b) => new Date(b.time) - new Date(a.time));

      const letterList = (data.lettersToMom || [])
        .map(r => ({ ...r, timeStr: formatDateTime(r.time) }))
        .sort((a, b) => new Date(b.time) - new Date(a.time));

      // 加载头像
      let avatarSrc = DEFAULT_AVATAR;
      const avatarFileId = data.avatarFileId || '';
      if (avatarFileId) {
        try {
          const res = await wx.cloud.callFunction({
            name: 'getImageURLs',
            data: { fileList: [avatarFileId] },
          });
          const item = res.result && res.result.fileList && res.result.fileList[0];
          if (item && item.tempFileURL) avatarSrc = item.tempFileURL;
        } catch (_) {}
      }

      const daughterName = data.daughterName || '';
      const momName = data.momName || '';
      wx.setStorageSync('daughterName', daughterName);
      wx.setStorageSync('momName', momName);

      this.setData({
        messages,
        unreadCount: messages.filter(m => !m.readByYiqi).length,
        dailyList,
        memoryList,
        letterList,
        avatarSrc,
        avatarFileId,
        daughterName,
        momName,
        loading: false,
      });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  async markAllRead() {
    const app = getApp();
    try {
      const data = app.globalData.binData || await readData();
      data.momMessages = (data.momMessages || []).map(m => ({ ...m, readByYiqi: true }));
      await writeData(data);
      app.globalData.binData = data;
      this.setData({
        messages: this.data.messages.map(m => ({ ...m, readByYiqi: true })),
        unreadCount: 0,
      });
      wx.showToast({ title: '已全部标记已读', icon: 'success' });
    } catch (e) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab, editingId: null });
  },

  // ── 删除 ──
  deleteItem(e) {
    const { id, type } = e.currentTarget.dataset;
    wx.showModal({
      title: '删除这条？',
      content: '删除后不可恢复',
      confirmText: '删除',
      confirmColor: '#C4706A',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          const app = getApp();
          const data = app.globalData.binData || await readData();
          const keyMap = { daily: 'myDaily', memory: 'memories', letter: 'lettersToMom' };
          const listKey = keyMap[type];
          data[listKey] = (data[listKey] || []).filter(r => r.id !== id);
          await writeData(data);
          app.globalData.binData = data;
          const listName = type + 'List';
          this.setData({ [listName]: this.data[listName].filter(r => r.id !== id) });
          wx.showToast({ title: '已删除', icon: 'success' });
        } catch (e) {
          wx.showToast({ title: '删除失败', icon: 'none' });
        }
      },
    });
  },

  // ── 日常编辑 ──
  startEdit(e) {
    const { id } = e.currentTarget.dataset;
    const item = this.data.dailyList.find(r => r.id === id);
    if (!item) return;
    const d = new Date(item.time);
    const date = localDateStr(d);
    const time = localTimeStr(d);
    this.setData({ editingId: id, editingText: item.text, editingDate: date, editingTime: time });
  },

  cancelEdit() { this.setData({ editingId: null, editingText: '', editingDate: '', editingTime: '' }); },
  onEditInput(e)    { this.setData({ editingText: e.detail.value }); },
  onEditDateChange(e) { this.setData({ editingDate: e.detail.value }); },
  onEditTimeChange(e) { this.setData({ editingTime: e.detail.value }); },

  async saveEdit() {
    const text = this.data.editingText.trim();
    if (!text) return;
    try {
      const app = getApp();
      const data = app.globalData.binData || await readData();
      const time = localToISO(this.data.editingDate, this.data.editingTime);
      data.myDaily = (data.myDaily || []).map(r =>
        r.id === this.data.editingId ? { ...r, text, time } : r
      );
      await writeData(data);
      app.globalData.binData = data;
      const updated = this.data.dailyList
        .map(r => r.id === this.data.editingId ? { ...r, text, time, timeStr: formatDateTime(time) } : r)
        .sort((a, b) => new Date(b.time) - new Date(a.time));
      this.setData({ dailyList: updated, editingId: null, editingText: '', editingDate: '', editingTime: '' });
      wx.showToast({ title: '已更新', icon: 'success' });
    } catch (e) {
      wx.showToast({ title: '更新失败', icon: 'none' });
    }
  },

  onNameInput(e)    { this.setData({ daughterName: e.detail.value }); },
  onMomNameInput(e) { this.setData({ momName: e.detail.value }); },

  async saveName() {
    const daughterName = this.data.daughterName.trim();
    const momName = this.data.momName.trim();
    try {
      const app = getApp();
      const data = app.globalData.binData || await readData();
      data.daughterName = daughterName;
      data.momName = momName;
      await writeData(data);
      app.globalData.binData = data;
      wx.setStorageSync('daughterName', daughterName);
      wx.setStorageSync('momName', momName);
      wx.showToast({ title: '已保存 💕', icon: 'success' });
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  async uploadAvatar() {
    if (this.data.avatarUploading) return;
    try {
      const mediaRes = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
      });
      if (!mediaRes.tempFiles || !mediaRes.tempFiles.length) return;

      this.setData({ avatarUploading: true });
      const tempFilePath = mediaRes.tempFiles[0].tempFilePath;
      const code = this.data.familyCode;
      const cloudPath = `${code}/avatar.jpg`;

      const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: tempFilePath });
      const fileID = uploadRes.fileID;

      // 转成可展示的 URL
      const urlRes = await wx.cloud.callFunction({
        name: 'getImageURLs',
        data: { fileList: [fileID] },
      });
      const item = urlRes.result && urlRes.result.fileList && urlRes.result.fileList[0];
      const avatarSrc = (item && item.tempFileURL) ? item.tempFileURL : tempFilePath;

      // 存入家庭数据
      const app = getApp();
      const data = app.globalData.binData || await readData();
      data.avatarFileId = fileID;
      await writeData(data);
      app.globalData.binData = data;

      this.setData({ avatarSrc, avatarFileId: fileID, avatarUploading: false });
      wx.showToast({ title: '头像已更新 💕', icon: 'success' });
    } catch (e) {
      this.setData({ avatarUploading: false });
      wx.showToast({ title: '上传失败，试试别的图', icon: 'none' });
    }
  },

  onUnbindTap() {
    wx.showModal({
      title: '解绑并退出这个家庭？',
      content: '数据不会删除，之后重新输入邀请码还能连回来',
      confirmText: '解绑',
      confirmColor: '#C4706A',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await unbindFamily();
          wx.removeStorageSync('familyCode');
          wx.removeStorageSync('userRole');
          wx.removeStorageSync('startDate');
          const app = getApp();
          app.globalData.binData = null;
          app.globalData.needSetup = true;
          app.globalData.splashShown = false;
          wx.reLaunch({ url: '/pages/mom/index' });
        } catch (e) {
          wx.showToast({ title: '解绑失败，检查网络', icon: 'none' });
        }
      },
    });
  },

  goCompose() { wx.navigateTo({ url: '/pages/compose/index' }); },
  goDaily()   { wx.navigateTo({ url: '/pages/daily/index' }); },
  goMemory()  { wx.navigateTo({ url: '/pages/memory/index' }); },
});
