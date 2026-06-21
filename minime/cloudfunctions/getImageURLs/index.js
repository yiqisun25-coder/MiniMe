const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const { fileList } = event
  if (!fileList || !fileList.length) return { fileList: [] }
  return await cloud.getTempFileURL({ fileList })
}
