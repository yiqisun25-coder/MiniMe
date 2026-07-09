// ============================================================
// 订阅消息（微信通知）配置
//
// 开通步骤：
// 1. 打开 mp.weixin.qq.com → 左侧「订阅消息」→「公共模板库」
//    挑一个通用提醒类模板（最好带两个字段：一个"内容"、一个"时间"）
// 2. 选用后在「我的模板」里能看到 模板ID，填到下面 templateId
// 3. 点开模板详情，把两个字段的"字段名"（形如 thing1、time2）
//    分别填到 contentKey / timeKey
//
// templateId 留空 = 通知功能关闭，app 其他功能完全不受影响
// ============================================================
module.exports = {
  SUBSCRIBE: {
    // 「日程提醒」模板：提醒内容 + 时间
    templateId: 'GVm_3RX1jdEu9HcyNsqmZhoRu6qMUfEpX20LDD5ZPBQ',
    contentKey: 'thing2',
    timeKey: 'time25',
  },
};
