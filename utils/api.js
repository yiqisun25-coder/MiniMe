const EMPTY_DATA = {
  momMessages: [],
  lettersToMom: [],
  momRecords: [],
  myDaily: [],
  memories: [],
  avatarFileId: '',
};

function getDB() {
  return wx.cloud.database({ env: 'cloud1-d5gbhjps14993bb27' });
}

function getFamilyCode() {
  return wx.getStorageSync('familyCode') || null;
}

function setFamilyCode(code) {
  wx.setStorageSync('familyCode', code);
}

function generateCode() {
  // 去掉易混淆字符 O/0/I/1
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function readData() {
  const code = getFamilyCode();
  if (!code) throw new Error('no_family_code');
  const db = getDB();
  try {
    const res = await db.collection('minime').doc(code).get();
    return res.data || { ...EMPTY_DATA };
  } catch (e) {
    const msg = e.message || e.errMsg || '';
    if (msg.includes('cannot find document')) {
      try {
        await db.collection('minime').add({ data: { _id: code, ...EMPTY_DATA } });
      } catch (_) {}
    } else {
      console.error('readData error:', e);
    }
    return { ...EMPTY_DATA };
  }
}

async function writeData(data) {
  const code = getFamilyCode();
  if (!code) throw new Error('no_family_code');
  const db = getDB();
  const { _id, _openid, ...payload } = data;
  await db.collection('minime').doc(code).set({ data: payload });
  return data;
}

// 女儿创建家庭：支持自定义码或自动生成，自动迁移旧数据
async function createFamily(customCode) {
  const db = getDB();

  // 尝试读取旧格式数据（迁移）
  let oldData = null;
  try {
    const old = await db.collection('minime').doc('minime_data').get();
    if (old.data) {
      const { _id, _openid, ...rest } = old.data;
      oldData = rest;
    }
  } catch (_) {}

  const code = customCode ? customCode.toUpperCase() : generateCode();

  try {
    await db.collection('minime').add({
      data: { _id: code, ...(oldData || EMPTY_DATA) },
    });
  } catch (e) {
    // add 失败通常是 _id 冲突（码已被用）
    const msg = e.message || e.errMsg || '';
    if (msg.includes('duplicate') || msg.includes('existed') || msg.includes('unique')) {
      throw new Error('code_taken');
    }
    // 随机码冲突：再试一次
    if (!customCode) {
      const retry = generateCode();
      await db.collection('minime').add({
        data: { _id: retry, ...(oldData || EMPTY_DATA) },
      });
      setFamilyCode(retry);
      return { code: retry, migrated: !!oldData };
    }
    throw e;
  }

  setFamilyCode(code);
  return { code, migrated: !!oldData };
}

// 妈妈加入：输入邀请码连接
async function joinFamily(inputCode) {
  const code = inputCode.trim().toUpperCase();
  const db = getDB();
  const res = await db.collection('minime').doc(code).get();
  if (!res.data) throw new Error('invalid_code');
  setFamilyCode(code);
  return res.data;
}

function getUserRole() { return wx.getStorageSync('userRole') || null; }
function setUserRole(role) { wx.setStorageSync('userRole', role); }
function getLastSeen(key) { return wx.getStorageSync(key) || '1970-01-01T00:00:00.000Z'; }
function setLastSeen(key) { wx.setStorageSync(key, new Date().toISOString()); }

module.exports = {
  readData, writeData, createFamily, joinFamily,
  getFamilyCode, generateCode, EMPTY_DATA,
  getUserRole, setUserRole, getLastSeen, setLastSeen,
};
