const { readData } = require('../../utils/api');
const { formatDate } = require('../../utils/time');

async function resolveImages(items) {
  const ids = items.filter(r => r.image && r.image.startsWith('cloud://')).map(r => r.image);
  if (!ids.length) return items;
  try {
    const res = await wx.cloud.callFunction({ name: 'getImageURLs', data: { fileList: ids } });
    const map = {};
    (res.result.fileList || []).forEach(f => { if (f.tempFileURL) map[f.fileID] = f.tempFileURL; });
    return items.map(r => ({
      ...r,
      image: r.image && r.image.startsWith('cloud://') ? (map[r.image] || '') : r.image,
    }));
  } catch (e) {
    return items.map(r => ({ ...r, image: r.image && r.image.startsWith('cloud://') ? '' : r.image }));
  }
}

const TILTS = [-3, -1.5, 0, 1.5, 3, -2, 2, -1, 1, -2.5];

Page({
  data: {
    items: [],
    photos: [],
    loading: true,
    viewMode: 'timeline', // 'timeline' | 'photos'
  },

  onShow() {
    if (getApp().globalData.needSetup) { wx.navigateTo({ url: '/pages/setup/index' }); return; }
    if (typeof this.getTabBar === 'function') {
      this.getTabBar().setData({ selected: 1 });
    }
    getApp().globalData.binData = null;
    this.load();
  },

  switchView(e) {
    this.setData({ viewMode: e.currentTarget.dataset.mode });
  },

  async load() {
    this.setData({ loading: true });
    try {
      const data = await readData();

      const today = new Date().toISOString().slice(0, 10);

      const momItems = (data.momRecords || []).map(r => ({
        ...r, type: 'mom', timeStr: formatDate(r.time),
      }));

      const dailyItems = (data.myDaily || []).map(r => ({
        ...r, type: 'daily', timeStr: formatDate(r.time),
      }));

      const memoryItems = (data.memories || []).map(r => ({
        ...r,
        type: 'memory',
        timeStr: formatDate(r.time),
        unlocked: r.unlockDate <= today,
      }));

      let items = [...momItems, ...dailyItems, ...memoryItems]
        .sort((a, b) => new Date(b.time) - new Date(a.time));

      items = await resolveImages(items);

      const photos = items
        .filter(r => r.image)
        .map((r, i) => ({
          ...r,
          tilt: TILTS[i % TILTS.length],
          caption: r.title || r.text || '',
        }));

      this.setData({ items, photos, loading: false });
    } catch (e) {
      console.error('together load error:', e);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },
});
