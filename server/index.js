/**
 * 爱发电 Webhook 处理服务
 * 接收赞助回调，验证签名，解析订单并增加用户积点
 */
require('dotenv').config();
const express = require('express');
const crypto = require('crypto');

const app = express();

// 解析 JSON 请求体（爱发电发送 JSON 格式）
app.use(express.json({ limit: '1mb' }));

// ============ 配置 ============
// 从环境变量读取，或在本地 .env 中配置
// 爱发电 Webhook 配置的 token（在爱发电开发者后台获取）
const AFDIAN_WEBHOOK_TOKEN = process.env.AFDIAN_WEBHOOK_TOKEN || 'YOUR_AFDIAN_TOKEN';

// ============ 签名验证 ============
/**
 * 根据爱发电文档计算并验证签名
 * 爱发电常见规则：sign = md5(user_id + out_trade_no + ... + token)
 * 请以爱发电官方文档为准，如有差异请修改此函数
 * 文档：https://afdian.net/developer
 */
function verifySignature(body, receivedSign) {
  if (!receivedSign) return false;

  // 爱发电可能将参数放在 body.data 中，或直接在 body 顶层
  const data = body.data || body;

  // 常见签名规则：按字段名排序后拼接 + token，再 MD5
  // 示例：md5(user_id + out_trade_no + custom_order_id + total_amount + token)
  // 请根据爱发电最新文档调整以下字段顺序
  const userId = String(data.user_id || '');
  const outTradeNo = String(data.out_trade_no || '');
  const customOrderId = String(data.custom_order_id || '');
  const totalAmount = String(data.total_amount ?? '');

  const signStr = userId + outTradeNo + customOrderId + totalAmount + AFDIAN_WEBHOOK_TOKEN;
  const computedSign = crypto.createHash('md5').update(signStr).digest('hex');

  return computedSign.toLowerCase() === String(receivedSign).toLowerCase();
}

/**
 * 备用签名规则：若爱发电使用「所有参数按键名排序后拼接」的方式
 * 可根据文档启用此函数替代上面的 verifySignature
 */
function verifySignatureAlt(body, receivedSign) {
  const data = body.data || body;
  const sortedKeys = Object.keys(data).filter((k) => k !== 'sign').sort();
  const signStr = sortedKeys.map((k) => `${k}=${data[k]}`).join('&') + AFDIAN_WEBHOOK_TOKEN;
  const computedSign = crypto.createHash('md5').update(signStr).digest('hex');
  return computedSign.toLowerCase() === String(receivedSign).toLowerCase();
}

// ============ Webhook 路由 ============
app.post('/webhook/afdian', (req, res) => {
  try {
    const body = req.body;

    if (!body || typeof body !== 'object') {
      return res.status(400).json({ ec: 400, em: 'Invalid body' });
    }

    const receivedSign = body.sign || body.data?.sign || req.headers['x-afdian-sign'];
    const data = body.data || body;

    // 1. 签名验证
    const isValid =
      verifySignature(body, receivedSign) || verifySignatureAlt(body, receivedSign);

    if (!isValid) {
      console.error('[Afdian] Signature verification failed');
      return res.status(403).json({ ec: 403, em: 'Invalid signature' });
    }

    // 2. 解析订单信息
    const customOrderId = data.custom_order_id;
    const totalAmount = data.total_amount ?? data.amount ?? 0; // 单位：分，500 = 5 元

    if (!customOrderId) {
      console.error('[Afdian] Missing custom_order_id');
      return res.status(400).json({ ec: 400, em: 'Missing custom_order_id' });
    }

    // 3. 计算赞助月份与积点
    // 5元/月 = 500分/月，月份 = 总金额(分) / 500
    // 若爱发电直接返回 month 或 plan_month 字段，可优先使用
    const monthsFromPayload = data.month ?? data.plan_month ?? data.months;
    const totalFen = Number(totalAmount);
    const months =
      monthsFromPayload != null
        ? Math.max(1, Math.floor(Number(monthsFromPayload)))
        : Math.max(1, Math.floor(totalFen / 500));

    // 积点 = 月份 × 50
    const creditsToAdd = months * 50;

    const amountYuan = totalFen / 100;
    if (amountYuan < 5) {
      return res.json({ ec: 200, em: '' });
    }

    // ============================================================
    // 【在此接入数据库逻辑】
    // customOrderId 即您系统中的用户 ID（user_id）
    // creditsToAdd = 应增加的积点数（月份×50）
    //
    // 示例（Supabase）：
    //   const { createClient } = require('@supabase/supabase-js');
    //   const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    //   const { data: profile } = await supabase
    //     .from('profiles')
    //     .select('credits')
    //     .eq('user_id', customOrderId)
    //     .single();
    //   await supabase
    //     .from('profiles')
    //     .update({ credits: (profile?.credits ?? 0) + creditsToAdd })
    //     .eq('user_id', customOrderId);
    // ============================================================

    console.log(
      `[Afdian] Order OK: userId=${customOrderId}, amount=${amountYuan}元, months=${months}, credits=${creditsToAdd}`
    );

    return res.json({ ec: 200, em: '' });
  } catch (err) {
    console.error('[Afdian] Webhook error:', err);
    return res.status(500).json({ ec: 500, em: 'Internal error' });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Afdian Webhook] Server listening on port ${PORT}`);
  if (AFDIAN_WEBHOOK_TOKEN === 'YOUR_AFDIAN_TOKEN') {
    console.warn('[Afdian Webhook] 请设置环境变量 AFDIAN_WEBHOOK_TOKEN');
  }
});
