import { X, Film, Sparkles } from 'lucide-react';
import { playOpen, playDrop } from '@/utils/audio';
import { useEffect } from 'react';
import { toast } from 'sonner';

interface CreditsModalProps {
  visible: boolean;
  credits: number;
  onClose: () => void;
  /** 爱发电赞助页（付款界面），如 https://ifdian.net/order/create?plan_id=858d43160f2811f1bb4c52540025c377&product_type=0&remark=&affiliate_code=&fr=afcom*/
  rechargeBaseUrl?: string;
  /** 当前用户 ID，用于 custom_order_id 以便 Webhook 识别并发放积点 */
  userId?: string | null;
}

// 爱发电赞助页：用户可选择 1/3/6/12/24/36 个月，积点 = 月份×50
const DEFAULT_RECHARGE_BASE = 'https://ifdian.net/order/create?plan_id=858d43160f2811f1bb4c52540025c377&product_type=0&remark=&affiliate_code=&fr=afcom';

export function CreditsModal({ visible, credits, onClose, rechargeBaseUrl = DEFAULT_RECHARGE_BASE, userId }: CreditsModalProps) {
  useEffect(() => {
    if (visible) playOpen();
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-foreground/8 backdrop-blur-sm" />
      <div
        className="relative glass-panel rounded-2xl shadow-elevated w-full max-w-md p-8 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground/40 hover:text-foreground transition-colors"
        >
          <X size={16} strokeWidth={1.5} />
        </button>

        {/* Tier 1: Natural daily gift */}
        <div className="text-center mb-8">
          <p className="font-serif-cn text-base text-foreground mb-2">今日清晨，灵感已如约而至</p>
          <p className="text-sm text-muted-foreground">
            当前余量 <span className="tabular-nums font-medium text-foreground">{credits}</span> 积点
            <span className="text-muted-foreground/40 ml-2">· 每日赠予 3 积点</span>
          </p>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-6" />

        {/* Tier 2: Watch for credits */}
        <button
          onClick={() => {
            playDrop();
            toast.info('观影获取积点功能即将上线，敬请期待');
          }}
          className="w-full text-left p-4 rounded-xl border border-border hover:border-scarlet-glow/20 transition-all duration-300 mb-4 group"
        >
          <div className="flex items-start gap-3">
            <Film size={16} strokeWidth={1.2} className="text-muted-foreground/40 mt-0.5 group-hover:text-scarlet-light transition-colors" />
            <div>
              <p className="text-sm text-foreground mb-0.5">驻足观赏一段影像，获取额外创作积点</p>
              <p className="text-[11px] text-muted-foreground/40">每日限量 · 约30秒</p>
            </div>
          </div>
        </button>

        {/* Tier 3: Purchase - 打开爱发电付款页，可选 1/3/6/12/24/36 个月 */}
        <button
          onClick={() => {
            playDrop();
            const base = rechargeBaseUrl.replace(/\/$/, '');
            const sep = base.includes('?') ? '&' : '?';
            const url = userId ? `${base}${sep}custom_order_id=${encodeURIComponent(userId)}` : base;
            window.open(url, '_blank');
            toast.success('已打开付款页面，可选赞助期限，积点=月份×50');
          }}
          className="w-full text-left p-4 rounded-xl border border-border hover:border-scarlet/30 transition-all duration-500 group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Sparkles size={16} strokeWidth={1.2} className="text-muted-foreground/40 mt-0.5 group-hover:text-scarlet-light transition-colors" />
              <div>
                <p className="text-sm text-foreground">
                  ¥5.00/月 · 可选 1/3/6/12/24/36 个月
                </p>
                <p className="text-[10px] text-muted-foreground/30 mt-1">
                  积点=月份×50，如3个月=150积点，1年=600积点
                </p>
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
