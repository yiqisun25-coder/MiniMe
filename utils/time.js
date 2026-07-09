function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatDateTime(iso) {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${d.getMonth() + 1}月${d.getDate()}日 ${h}:${m}`;
}

// 本机时区的 YYYY-MM-DD（toISOString 是 UTC，不能用来取"今天"）
function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 本机时区的 HH:MM
function localTimeStr(d = new Date()) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// 把本机时区的 "YYYY-MM-DD" + "HH:MM" 转成 ISO 串存储
// 手动拆字段构造，避免 iOS 上字符串解析的兼容问题
function localToISO(dateStr, timeStr) {
  const [y, mo, da] = String(dateStr).split('-').map(Number);
  const [h, mi] = String(timeStr || '00:00').split(':').map(Number);
  return new Date(y, mo - 1, da, h || 0, mi || 0).toISOString();
}

// 页面头部日期："WED · 7月8日"
function heroDateStr(d = new Date()) {
  const weekday = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()];
  return `${weekday} · ${d.getMonth() + 1}月${d.getDate()}日`;
}

// 从起始日到今天过了多少天（含起始日当天），按本机日历日计算
function daysSince(startDateStr) {
  const [y, mo, da] = String(startDateStr).slice(0, 10).split('-').map(Number);
  const start = new Date(y, mo - 1, da);
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((todayMidnight - start) / 86400000) + 1;
}

module.exports = { formatDate, formatDateTime, localDateStr, localTimeStr, localToISO, daysSince, heroDateStr };
