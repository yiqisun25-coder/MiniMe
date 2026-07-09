const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const EMPTY_DATA = {
  momMessages: [],
  lettersToMom: [],
  momRecords: [],
  myDaily: [],
  memories: [],
  avatarFileId: '',
  daughterName: '',
  momName: '',
}

// 邀请码规则：6位，恰好3个字母 + 3个数字（顺序不限）
function isValidCode(code) {
  if (!/^[A-Z0-9]{6}$/.test(code)) return false
  const letters = (code.match(/[A-Z]/g) || []).length
  return letters === 3
}

async function getBinding(openid) {
  try {
    const res = await db.collection('members').doc(openid).get()
    return res.data || null
  } catch (e) {
    return null
  }
}

async function familyExists(code) {
  try {
    const res = await db.collection('minime').doc(code).get()
    return !!res.data
  } catch (e) {
    return false
  }
}

async function bind(openid, code, role) {
  await db.collection('members').add({
    data: { _id: openid, code, role: role || '', boundAt: new Date().toISOString() },
  })
}

// 拿到当前用户绑定的家庭码；没绑定但带了合法的老家庭码就自动补绑
async function requireBinding(openid, fallbackCode, fallbackRole) {
  let bound = await getBinding(openid)
  if (!bound && fallbackCode && (await familyExists(fallbackCode))) {
    await bind(openid, fallbackCode, fallbackRole || '')
    bound = { code: fallbackCode }
  }
  return bound
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const action = event.action
  const code = String(event.code || '').trim().toUpperCase()

  // 读家庭数据：永远只读自己绑定的那个家庭，客户端传什么码都没用
  if (action === 'read') {
    const bound = await requireBinding(OPENID, code, event.role)
    if (!bound) return { error: 'not_bound' }
    try {
      const res = await db.collection('minime').doc(bound.code).get()
      return { code: bound.code, data: res.data || { ...EMPTY_DATA } }
    } catch (e) {
      // 文档不存在就补一个空的
      try {
        await db.collection('minime').add({ data: { _id: bound.code, ...EMPTY_DATA } })
      } catch (_) {}
      return { code: bound.code, data: { ...EMPTY_DATA } }
    }
  }

  // 写家庭数据：同样只写自己绑定的家庭
  if (action === 'write') {
    const bound = await requireBinding(OPENID, code, event.role)
    if (!bound) return { error: 'not_bound' }
    const { _id, _openid, ...payload } = event.data || {}
    await db.collection('minime').doc(bound.code).set({ data: payload })
    return { ok: true }
  }

  // 查询自己绑定的家庭（换手机恢复用）
  if (action === 'getMine') {
    const bound = await getBinding(OPENID)
    return bound ? { code: bound.code, role: bound.role } : { code: '' }
  }

  // 女儿创建家庭：每人只能有一个家庭
  if (action === 'create') {
    const bound = await getBinding(OPENID)
    if (bound) return { error: 'already_bound', code: bound.code, role: bound.role }
    if (!isValidCode(code)) return { error: 'bad_format' }
    try {
      await db.collection('minime').add({
        data: { _id: code, ...EMPTY_DATA, ...(event.extraData || {}) },
      })
    } catch (e) {
      return { error: 'code_taken' }
    }
    await bind(OPENID, code, 'daughter')
    return { code }
  }

  // 妈妈加入家庭：每人只能加入一个
  if (action === 'join') {
    const bound = await getBinding(OPENID)
    if (bound) return { error: 'already_bound', code: bound.code, role: bound.role }
    let res
    try {
      res = await db.collection('minime').doc(code).get()
    } catch (e) {
      return { error: 'invalid_code' }
    }
    if (!res.data) return { error: 'invalid_code' }
    // 一个家庭最多 4 人，码泄露了也进不来一群人
    try {
      const cnt = await db.collection('members').where({ code }).count()
      if (cnt.total >= 4) return { error: 'family_full' }
    } catch (e) {}
    await bind(OPENID, code, 'mom')
    const d = res.data
    return {
      code,
      family: {
        startDate: d.startDate || '',
        daughterName: d.daughterName || '',
        momName: d.momName || '',
      },
    }
  }

  // 老用户补绑定：设备上已有家庭码但 members 里没记录
  if (action === 'ensureBind') {
    const bound = await getBinding(OPENID)
    if (bound) return { code: bound.code, role: bound.role }
    if (!code || !(await familyExists(code))) return { error: 'invalid_code' }
    await bind(OPENID, code, event.role || '')
    return { code }
  }

  // 解绑（误加入了别人的家庭时的出口）
  if (action === 'unbind') {
    try {
      await db.collection('members').doc(OPENID).remove()
    } catch (e) {}
    return { ok: true }
  }

  return { error: 'unknown_action' }
}
