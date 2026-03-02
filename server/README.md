# 爱发电 Webhook 服务

处理爱发电赞助回调，验证签名后按赞助月份为对应用户增加积点。

**积点规则**：积点 = 月份 × 50  
- 1 个月 → 50 积点  
- 3 个月 → 150 积点  
- 6 个月 → 300 积点  
- 1 年(12月) → 600 积点  
- 2 年 → 1200 积点  
- 3 年 → 1800 积点  

## 配置

1. 复制 `.env.example` 为 `.env`
2. 填写 `AFDIAN_WEBHOOK_TOKEN`（爱发电开发者后台 → Webhook 配置）
3. 在 `index.js` 中标记的位置接入数据库逻辑（为 `custom_order_id` 对应的用户增加 `creditsToAdd` 积点）

## 运行

```bash
cd server
npm install
npm start
```

生产环境建议使用 `pm2` 或类似工具常驻运行。

## 爱发电 Webhook 配置

在爱发电后台设置 Webhook 地址为：`https://你的域名/webhook/afdian`

请以爱发电官方文档为准核对签名规则，如有差异请修改 `verifySignature` 函数。
