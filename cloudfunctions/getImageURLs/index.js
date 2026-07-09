const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 只给调用者自己家庭的图片换临时链接：
// 1. 先查 members 拿到调用者绑定的家庭码
// 2. 只放行 属于该家庭文档里的 fileID，或路径带家庭码前缀的新文件
exports.main = async (event) => {
  const { fileList } = event
  if (!fileList || !fileList.length) return { fileList: [] }

  const { OPENID } = cloud.getWXContext()
  let binding = null
  try {
    const res = await db.collection('members').doc(OPENID).get()
    binding = res.data || null
  } catch (e) {}
  if (!binding || !binding.code) return { fileList: [] }

  // 收集这个家庭名下的所有 fileID（老文件路径没有家庭码前缀，靠这个兜住）
  const owned = new Set()
  try {
    const res = await db.collection('minime').doc(binding.code).get()
    const doc = res.data || {}
    if (doc.avatarFileId) owned.add(doc.avatarFileId)
    for (const key of ['momRecords', 'myDaily', 'memories', 'lettersToMom', 'momMessages']) {
      for (const item of doc[key] || []) {
        if (item && item.image) owned.add(item.image)
      }
    }
  } catch (e) {}

  const prefix = `/${binding.code}/`
  const allowed = fileList.filter(
    (id) => owned.has(id) || String(id).includes(prefix)
  )
  if (!allowed.length) return { fileList: [] }
  return await cloud.getTempFileURL({ fileList: allowed })
}
