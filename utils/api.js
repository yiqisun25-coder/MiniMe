const DOC_ID = 'minime_data';

const EMPTY_DATA = {
  momMessages: [],
  lettersToMom: [],
  momRecords: [],
  myDaily: [],
  memories: [],
};

function getDB() {
  return wx.cloud.database();
}

async function readData() {
  const db = getDB();
  try {
    const res = await db.collection('minime').doc(DOC_ID).get();
    return res.data || EMPTY_DATA;
  } catch (e) {
    // 文档不存在或其他错误，尝试用 set 初始化
    try {
      await db.collection('minime').doc(DOC_ID).set({ data: { ...EMPTY_DATA } });
    } catch (e2) {
      console.error('云数据库初始化失败', e2);
    }
    return { ...EMPTY_DATA };
  }
}

async function writeData(data) {
  const db = getDB();
  const { _id, _openid, ...payload } = data;
  await db.collection('minime').doc(DOC_ID).set({ data: payload });
  return data;
}

module.exports = { readData, writeData, EMPTY_DATA };
