const { SUBSCRIBE } = require('./config');

const EMPTY_DATA = {
  momMessages: [],
  lettersToMom: [],
  momRecords: [],
  myDaily: [],
  memories: [],
  avatarFileId: '',
  daughterName: '',
  momName: '',
};

function getFamilyCode() {
  return wx.getStorageSync('familyCode') || null;
}

function setFamilyCode(code) {
  wx.setStorageSync('familyCode', code);
}

// 邀请码规则：6位，恰好3个字母 + 3个数字（顺序不限）
function isValidCode(code) {
  if (!/^[A-Z0-9]{6}$/.test(code)) return false;
  return (code.match(/[A-Z]/g) || []).length === 3;
}

function generateCode() {
  // 去掉易混淆字符 O/I 和 0/1
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const pick = (pool) => pool[Math.floor(Math.random() * pool.length)];
  const chars = [pick(letters), pick(letters), pick(letters), pick(digits), pick(digits), pick(digits)];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

async function callFamily(action, extra = {}) {
  const res = await wx.cloud.callFunction({ name: 'family', data: { action, ...extra } });
  return (res && res.result) || {};
}

// 本地存的家庭码已失效（家庭没了/绑定丢了）：清掉本地，带用户回 setup 重新来
let _redirectingSetup = false;
function handleNotBound() {
  wx.removeStorageSync('familyCode');
  wx.removeStorageSync('userRole');
  const app = getApp();
  app.globalData.binData = null;
  app.globalData.needSetup = true;
  if (_redirectingSetup) return;
  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  if (current && current.route === 'pages/setup/index') return;
  _redirectingSetup = true;
  wx.navigateTo({
    url: '/pages/setup/index',
    complete: () => { _redirectingSetup = false; },
  });
}

// 读写都走云函数：服务端只认 openid 绑定的家庭，数据库对客户端不开放
async function readData() {
  const code = getFamilyCode();
  if (!code) throw new Error('no_family_code');
  const r = await callFamily('read', { code, role: getUserRole() || '' });
  if (r.error === 'not_bound') { handleNotBound(); throw new Error('no_family_code'); }
  if (r.error) throw new Error(r.error);
  return r.data || { ...EMPTY_DATA };
}

async function writeData(data) {
  const code = getFamilyCode();
  if (!code) throw new Error('no_family_code');
  const { _id, _openid, ...payload } = data;
  const r = await callFamily('write', { code, role: getUserRole() || '', data: payload });
  if (r.error === 'not_bound') { handleNotBound(); throw new Error('no_family_code'); }
  if (r.error) throw new Error(r.error);
  return data;
}

// 女儿创建家庭：走云函数，服务端校验"每人只能有一个家庭"和邀请码格式
async function createFamily(customCode, extraData = {}) {
  let code = customCode ? customCode.toUpperCase() : generateCode();
  for (let attempt = 0; ; attempt++) {
    const r = await callFamily('create', { code, extraData });
    if (!r.error) {
      setFamilyCode(r.code);
      return { code: r.code, migrated: false };
    }
    if (r.error === 'already_bound') {
      // 这个微信已经有家庭了，直接恢复
      setFamilyCode(r.code);
      const err = new Error('already_bound');
      err.code = r.code;
      err.role = r.role;
      throw err;
    }
    // 自动生成的码撞车了就换一个重试
    if (r.error === 'code_taken' && !customCode && attempt < 2) {
      code = generateCode();
      continue;
    }
    throw new Error(r.error);
  }
}

// 妈妈加入：走云函数，服务端校验"每人只能加入一个家庭"
async function joinFamily(inputCode) {
  const code = inputCode.trim().toUpperCase();
  const r = await callFamily('join', { code });
  if (r.error === 'already_bound') {
    if (r.code === code) {
      // 重复加入自己的家庭（比如换手机），直接恢复
      setFamilyCode(r.code);
      return {};
    }
    const err = new Error('already_bound');
    err.code = r.code;
    err.role = r.role;
    throw err;
  }
  if (r.error === 'family_full') throw new Error('family_full');
  if (r.error) throw new Error('invalid_code');
  setFamilyCode(r.code);
  return r.family || {};
}

// 解绑当前微信和家庭的关系（数据不删）
async function unbindFamily() {
  await callFamily('unbind');
}

// ── 订阅消息 ──
// 请求订阅（只能在用户点击的调用链里发起）：同意一次 = 将来能收到一条提醒
// 用户勾选"总是保持以上选择"后不再弹窗，每次调用静默累积额度
function askSubscribe() {
  if (!SUBSCRIBE.templateId) return;
  try {
    wx.requestSubscribeMessage({
      tmplIds: [SUBSCRIBE.templateId],
      success: (res) => {
        if (res[SUBSCRIBE.templateId] === 'accept') {
          callFamily('grantSub').catch(() => {});
        }
      },
      fail: () => {},
    });
  } catch (e) { /* 老基础库不支持就算了 */ }
}

// 内容发布成功后通知家里其他人（静默执行，失败不影响主流程）
function notifyFamily(text) {
  if (!SUBSCRIBE.templateId) return;
  callFamily('notify', {
    templateId: SUBSCRIBE.templateId,
    contentKey: SUBSCRIBE.contentKey,
    timeKey: SUBSCRIBE.timeKey,
    text: String(text || ''),
  }).catch(() => {});
}

// ── 图片临时链接缓存 ──
// 临时链接约 2 小时有效，缓存 90 分钟：切 tab 不再重复调云函数，页面明显变快
const _imgUrlCache = {}; // fileID -> { url, expire }

function clearImageURLCache(fileID) {
  if (fileID) delete _imgUrlCache[fileID];
  else Object.keys(_imgUrlCache).forEach((k) => delete _imgUrlCache[k]);
}

// 批量换链接：命中缓存的直接用，没命中的才去调 getImageURLs
// 返回 { fileID: url }，拿不到的没有 key，调用方按空处理
async function resolveImageURLs(fileIDs) {
  const now = Date.now();
  const map = {};
  const need = [];
  (fileIDs || []).forEach((id) => {
    const hit = _imgUrlCache[id];
    if (hit && hit.expire > now) map[id] = hit.url;
    else if (need.indexOf(id) < 0) need.push(id);
  });
  if (need.length) {
    try {
      const res = await wx.cloud.callFunction({ name: 'getImageURLs', data: { fileList: need } });
      (((res || {}).result || {}).fileList || []).forEach((f) => {
        if (f.tempFileURL) {
          map[f.fileID] = f.tempFileURL;
          _imgUrlCache[f.fileID] = { url: f.tempFileURL, expire: now + 90 * 60 * 1000 };
        }
      });
    } catch (e) { /* 换不到就当没有，图片显示为空，不阻塞页面 */ }
  }
  return map;
}

// 上传路径按家庭码隔离，加随机后缀避免同毫秒覆盖
function makeCloudPath(folder, ext) {
  const code = getFamilyCode() || 'unknown';
  return `${code}/${folder}/${Date.now()}-${Math.floor(Math.random() * 1000000)}.${ext || 'jpg'}`;
}

function getUserRole() { return wx.getStorageSync('userRole') || null; }
function setUserRole(role) { wx.setStorageSync('userRole', role); }
function getLastSeen(key) { return wx.getStorageSync(key) || '1970-01-01T00:00:00.000Z'; }
function setLastSeen(key) { wx.setStorageSync(key, new Date().toISOString()); }

module.exports = {
  readData, writeData, createFamily, joinFamily,
  getFamilyCode, generateCode, isValidCode, makeCloudPath, EMPTY_DATA,
  getUserRole, setUserRole, getLastSeen, setLastSeen,
  unbindFamily, resolveImageURLs, clearImageURLCache,
  askSubscribe, notifyFamily,
};
