import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Printer, CreditCard, RotateCcw } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import jsPDF from 'jspdf';
import { useAuth } from '../contexts/AuthContext';
import { useMembershipCard } from '../hooks/useMembershipCard';

interface MembershipCardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Design constants (match the reference image) ─────────────────────────
const DARK = '#26233f';
const ACCENT = '#f7b2b0';
const LIGHT_BG = '#f4f2f8';

export const MembershipCardModal: React.FC<MembershipCardModalProps> = ({ isOpen, onClose }) => {
  // All hooks at top level — NEVER after a conditional return
  const { userProfile } = useAuth();
  const { card, isLoading, isGenerating, generateCard, generateError } = useMembershipCard();
  const [isFlipped, setIsFlipped] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen && !isLoading && !card && !isGenerating) {
      generateCard();
    }
  }, [isOpen, isLoading, card, isGenerating, generateCard]);

  // Computed values (safe with fallbacks)
  const membershipId = card?.card_id || userProfile?.unique_short_id || '---';
  // QR must encode card.card_id — this is exactly what verify_membership_card() searches for in the DB
  const verifyUrl = card?.card_id
    ? `${window.location.origin}/verify-card/${card.card_id}`
    : `${window.location.origin}/verify-card/`;

  const issueDate = card
    ? new Date(card.issue_date).toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' })
    : '---';

  // ── Canvas-based card export (100% reliable, no CORS issues) ──────────────
  const exportCard = useCallback(async (format: 'png' | 'pdf') => {
    if (!userProfile) return;
    setIsExporting(true);
    setExportError(null);

    try {
      await document.fonts.ready;

      // ── Canvas setup (3× for high resolution) ──
      const SCALE = 3;
      const W = 540, H = 320;
      const canvas = document.createElement('canvas');
      canvas.width = W * SCALE;
      canvas.height = H * SCALE;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(SCALE, SCALE);

      // ── Helper: load image ──
      const loadImg = (src: string): Promise<HTMLImageElement | null> =>
        new Promise(resolve => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => {
            // retry without crossOrigin
            const img2 = new Image();
            img2.onload = () => resolve(img2);
            img2.onerror = () => resolve(null);
            img2.src = src;
          };
          img.src = src.startsWith('http')
            ? `${src}${src.includes('?') ? '&' : '?'}cb=${Date.now()}`
            : src;
        });

      // ── Helper: rounded rect path ──
      const rRect = (x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      };

      // ── Load images in parallel ──
      const [logoImg, avatarImg] = await Promise.all([
        loadImg('/ABC.jpg'),
        userProfile.avatar_url ? loadImg(userProfile.avatar_url) : Promise.resolve(null),
      ]);

      // ── Get QR code from existing canvas element ──
      let qrImg: HTMLImageElement | null = null;
      if (qrRef.current) {
        const qrDataUrl = qrRef.current.toDataURL('image/png');
        qrImg = await loadImg(qrDataUrl);
      }

      // ── Colors ──
      const CLR_DARK  = '#26233f';
      const CLR_ACCENT = '#f7b2b0';
      const CLR_LIGHT  = '#f4f2f8';

      // ════════════════════════════════════════════
      // 1. DARK BACKGROUND
      // ════════════════════════════════════════════
      ctx.fillStyle = CLR_DARK;
      ctx.fillRect(0, 0, W, H);

      // ════════════════════════════════════════════
      // 2. LIGHT LEFT PANEL (44% width, wavy right edge)
      //    CSS: borderRadius '0 40% 40% 0 / 0 50% 50% 0'
      //    The right edge is the right half of an ellipse:
      //      center = (W*0.44 - W*0.44*0.40 , H/2) = (142.6, 160)
      //      rx=95.04, ry=160
      // ════════════════════════════════════════════
      const panelW = W * 0.44;           // 237.6
      const ellipseCX = panelW * (1 - 0.40); // 142.56
      const ellipseRX = panelW * 0.40;   // 95.04
      const ellipseRY = H * 0.50;        // 160

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(ellipseCX, 0);
      ctx.ellipse(ellipseCX, H / 2, ellipseRX, ellipseRY, 0, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fillStyle = CLR_LIGHT;
      ctx.globalAlpha = 0.97;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();

      // ════════════════════════════════════════════
      // 3. BADGE top-left (on light panel)
      // ════════════════════════════════════════════
      const badgeX = 8, badgeY = 14, badgeH2 = 24, badgeW2 = 155;
      rRect(badgeX, badgeY, badgeW2, badgeH2, 12);
      ctx.fillStyle = CLR_ACCENT;
      ctx.fill();

      // Shield in badge
      ctx.save();
      ctx.translate(badgeX + 16, badgeY + badgeH2 / 2);
      ctx.fillStyle = CLR_DARK;
      ctx.beginPath();
      ctx.moveTo(0, -8); ctx.lineTo(-6, -5); ctx.lineTo(-6, 0);
      ctx.quadraticCurveTo(-6, 7, 0, 8);
      ctx.quadraticCurveTo(6, 7, 6, 0); ctx.lineTo(6, -5);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'white'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-2.5, 0.5); ctx.lineTo(0, 3); ctx.lineTo(3.5, -2);
      ctx.stroke();
      ctx.restore();

      // Badge text
      ctx.fillStyle = CLR_DARK;
      ctx.font = '800 11px "Cairo", sans-serif';
      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText('بطاقة عضوية رسمية', badgeX + badgeW2 - 8, badgeY + badgeH2 / 2);

      // ════════════════════════════════════════════
      // 4. LOGO + ORG NAME (top-right, dark area)
      // ════════════════════════════════════════════
      const logoR = 22;
      const logoX = W - 16 - logoR;
      const logoY2 = 16 + logoR;

      ctx.save();
      ctx.beginPath();
      ctx.arc(logoX, logoY2, logoR, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      if (logoImg) { ctx.clip(); ctx.drawImage(logoImg, logoX - logoR, logoY2 - logoR, logoR * 2, logoR * 2); }
      ctx.restore();

      ctx.strokeStyle = CLR_ACCENT; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(logoX, logoY2, logoR, 0, Math.PI * 2); ctx.stroke();

      const orgRightX = logoX - logoR - 10;
      ctx.fillStyle = CLR_ACCENT;
      ctx.font = '900 13px "Cairo", sans-serif';
      ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText('جمعية عون وسند الخيرية', orgRightX, 14);
      ctx.fillStyle = 'rgba(244,242,248,0.75)';
      ctx.font = '400 10px "Cairo", sans-serif';
      ctx.fillText('الخيرية التطوعية', orgRightX, 31);

      // ════════════════════════════════════════════
      // 5. PROFILE PHOTO (in light panel, left side)
      //    Left column is 180px wide, starts at x=0 with 16px padding
      //    Photo: 110×130, centered → photoX = 16 + (180-110)/2 = 51
      // ════════════════════════════════════════════
      const photoW2 = 110, photoH2 = 130;
      const photoX = 35, photoY2 = 55;

      rRect(photoX, photoY2, photoW2, photoH2, 12);
      ctx.fillStyle = '#ddd8ea'; ctx.fill();

      if (avatarImg) {
        ctx.save();
        rRect(photoX, photoY2, photoW2, photoH2, 12);
        ctx.clip();
        ctx.drawImage(avatarImg, photoX, photoY2, photoW2, photoH2);
        ctx.restore();
      } else {
        // Default person silhouette
        ctx.save();
        rRect(photoX, photoY2, photoW2, photoH2, 12);
        ctx.clip();
        ctx.strokeStyle = CLR_DARK; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(photoX + photoW2 / 2, photoY2 + 45, 20, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(photoX + photoW2 / 2, photoY2 + 105, 30, 20, 0, Math.PI, 2 * Math.PI);
        ctx.stroke();
        ctx.restore();
      }

      ctx.strokeStyle = CLR_ACCENT; ctx.lineWidth = 3;
      rRect(photoX, photoY2, photoW2, photoH2, 12); ctx.stroke();

      // ════════════════════════════════════════════
      // 6. QR CODE (below photo, in light panel)
      // ════════════════════════════════════════════
      const qrContX = photoX - 4;
      const qrContY = photoY2 + photoH2 + 8;
      const qrContW = photoW2 + 48;
      const qrContH = 66;

      rRect(qrContX, qrContY, qrContW, qrContH, 10);
      ctx.fillStyle = 'rgba(244,242,248,0.9)'; ctx.fill();

      // QR white bg
      const qrInnerSize = 56;
      const qrInnerX = qrContX + 5, qrInnerY = qrContY + 5;
      rRect(qrInnerX, qrInnerY, qrInnerSize + 6, qrInnerSize + 6, 4);
      ctx.fillStyle = '#fff'; ctx.fill();
      if (qrImg) ctx.drawImage(qrImg, qrInnerX + 3, qrInnerY + 3, qrInnerSize, qrInnerSize);

      // Shield next to QR
      const shCX = qrInnerX + qrInnerSize + 6 + 20;
      const shCY = qrContY + qrContH / 2 - 4;
      ctx.fillStyle = `${CLR_ACCENT}30`;
      ctx.beginPath(); ctx.arc(shCX, shCY, 14, 0, Math.PI * 2); ctx.fill();

      ctx.save(); ctx.translate(shCX, shCY - 2);
      ctx.fillStyle = CLR_ACCENT;
      ctx.beginPath();
      ctx.moveTo(0, -9); ctx.lineTo(-7, -5.5); ctx.lineTo(-7, 0);
      ctx.quadraticCurveTo(-7, 7, 0, 9);
      ctx.quadraticCurveTo(7, 7, 7, 0); ctx.lineTo(7, -5.5);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'white'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(0, 3); ctx.lineTo(4, -2.5); ctx.stroke();
      ctx.restore();

      ctx.fillStyle = CLR_DARK;
      ctx.font = '700 7.5px "Cairo", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.direction = 'rtl';
      ctx.fillText('تحقق من', shCX, shCY + 13);
      ctx.fillText('العضوية', shCX, shCY + 23);

      // ════════════════════════════════════════════
      // 7. MEMBER NAME (right/dark area)
      // ════════════════════════════════════════════
      const nameRightX = W - 16;
      ctx.fillStyle = 'rgba(244,242,248,0.6)';
      ctx.font = '400 9px "Cairo", sans-serif';
      ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText('الاسم الكامل', nameRightX, 58);

      const nameFontSize = (userProfile.full_name || '').length > 14 ? 18 : 22;
      ctx.fillStyle = '#fff';
      ctx.font = `900 ${nameFontSize}px "Cairo", sans-serif`;
      ctx.fillText(userProfile.full_name || '', nameRightX, 71);

      // Divider with diamond
      const divY = 105;
      const infoLeft = panelW + 16;
      ctx.strokeStyle = 'rgba(247,178,176,0.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(infoLeft, divY); ctx.lineTo(W - 16, divY); ctx.stroke();
      ctx.save();
      ctx.translate((infoLeft + W - 16) / 2, divY);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = CLR_ACCENT; ctx.fillRect(-3, -3, 6, 6);
      ctx.restore();

      // ════════════════════════════════════════════
      // 8. INFO GRID 2×2
      // ════════════════════════════════════════════
      const gridTop = 114;
      const totalInfoW = W - 16 - infoLeft;
      const colW2 = totalInfoW / 2;
      const rowH2 = 46;

      const infoItems = [
        { label: 'الصفة',         value: userProfile.membership_type || 'عضو' },
        { label: 'رقم العضوية',  value: membershipId },
        { label: 'المدينة',       value: (userProfile as any).location || 'نواكشوط' },
        { label: 'تاريخ الإصدار', value: issueDate },
      ];

      infoItems.forEach((item, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        // RTL: col0 on the right, col1 on the left
        const cellRight = W - 16 - col * colW2;
        const cellY = gridTop + row * rowH2;

        // Icon box
        const ibSize = 28, ibX = cellRight - ibSize, ibY = cellY;
        rRect(ibX, ibY, ibSize, ibSize, 7);
        ctx.fillStyle = 'rgba(247,178,176,0.3)'; ctx.fill();

        // Label
        ctx.fillStyle = 'rgba(244,242,248,0.55)';
        ctx.font = '400 8px "Cairo", sans-serif';
        ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
        ctx.fillText(item.label, ibX - 5, ibY + 1);

        // Value
        ctx.fillStyle = '#fff';
        ctx.font = '800 11px "Cairo", sans-serif';
        ctx.fillText(item.value, ibX - 5, ibY + 14);
      });

      // ════════════════════════════════════════════
      // 9. BOTTOM STRIP
      // ════════════════════════════════════════════
      const footH = 24, stripH2 = 34;
      const stripY2 = H - footH - stripH2;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, stripY2, W, stripH2);
      ctx.strokeStyle = 'rgba(247,178,176,0.15)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, stripY2); ctx.lineTo(W, stripY2); ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '600 9px "Cairo", sans-serif';
      ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText('هذه البطاقة ملك لجمعية عون وسند الخيرية', W - 46, stripY2 + 6);
      ctx.fillText('وتُستخدم لإثبات العضوية.', W - 46, stripY2 + 19);

      // ════════════════════════════════════════════
      // 10. FOOTER
      // ════════════════════════════════════════════
      const fY2 = H - footH;
      ctx.fillStyle = CLR_LIGHT; ctx.fillRect(0, fY2, W, footH);
      ctx.strokeStyle = 'rgba(38,35,63,0.08)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, fY2); ctx.lineTo(W, fY2); ctx.stroke();

      ctx.fillStyle = CLR_DARK;
      ctx.font = '700 9px sans-serif';
      ctx.direction = 'ltr'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Awn & Sanad Charity – Mauritania', W / 2, fY2 + footH / 2);

      // ════════════════════════════════════════════
      // EXPORT
      // ════════════════════════════════════════════
      const dataUrl = canvas.toDataURL('image/png');
      const safeName = (userProfile.full_name || 'member').replace(/\s+/g, '_');

      if (format === 'png') {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `Awn_Sanad_Card_${safeName}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [90, 56] });
        pdf.addImage(dataUrl, 'PNG', 0, 0, 90, 56);
        pdf.save(`Awn_Sanad_Card_${safeName}.pdf`);
      }

    } catch (err) {
      console.error('Export error:', err);
      setExportError('حدث خطأ أثناء التصدير، يرجى المحاولة مجدداً.');
    } finally {
      setIsExporting(false);
    }
  }, [userProfile, membershipId, issueDate, qrRef]);

  // Guard — nothing rendered if modal is closed
  if (!isOpen || !userProfile) return null;

  return (
    <AnimatePresence>
      <div
        dir="rtl"
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px', background: 'rgba(15,23,42,0.88)', backdropFilter: 'blur(10px)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
          style={{ borderRadius: '24px', boxShadow: '0 30px 80px -10px rgba(0,0,0,0.5)', width: '100%', maxWidth: '600px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '95vh' }}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-3" style={{ fontFamily: '"Cairo", sans-serif' }}>
              <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${DARK}, #3b3659)` }}>
                <CreditCard className="w-4 h-4" style={{ color: ACCENT }} />
              </span>
              معاينة البطاقة الرسمية
            </h2>
            <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center gap-8" style={{ background: '#f8fafc' }}>

            {generateError ? (
              // ── Error state: no unique_short_id assigned yet ──
              <div className="py-12 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <p className="text-rose-600 dark:text-rose-400 font-bold text-sm leading-relaxed max-w-xs" style={{ fontFamily: '"Cairo", sans-serif' }}>
                  {(generateError as Error)?.message || 'لم يتم تعيين رقم عضوية لهذا الحساب بعد. يرجى التواصل مع الإدارة.'}
                </p>
              </div>
            ) : isLoading || isGenerating || !card ? (
              <div className="py-16 flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full border-4 animate-spin" style={{ borderColor: `${ACCENT}33`, borderTopColor: ACCENT }} />
                <p className="text-slate-500 font-bold text-sm" style={{ fontFamily: '"Cairo", sans-serif' }}>
                  جاري تحضير بطاقتك الرسمية…
                </p>
              </div>
            ) : (
              <>
                {/* ── 3D Flip Container ── */}
                <div
                  className="shrink-0 cursor-pointer"
                  style={{ perspective: '1200px', width: '540px', height: '320px', position: 'relative', maxWidth: '100%' }}
                  onClick={() => setIsFlipped(f => !f)}
                >
                  <motion.div
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.55, ease: 'easeInOut' }}
                    style={{ width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d' }}
                  >
                    {/* Front */}
                    <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'translateZ(1px)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 60px -10px rgba(38,35,63,0.6)' }}>
                      <div ref={frontCardRef} style={{ width: '100%', height: '100%' }}>
                        <CardFront
                          userProfile={userProfile}
                          membershipId={membershipId}
                          issueDate={issueDate}
                          verifyUrl={verifyUrl}
                          qrRef={qrRef}
                        />
                      </div>
                    </div>
                    {/* Back */}
                    <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg) translateZ(1px)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 60px -10px rgba(0,0,0,0.25)' }}>
                      <div ref={backCardRef} style={{ width: '100%', height: '100%' }}>
                        <CardBack />
                      </div>
                    </div>
                  </motion.div>

                  {/* Flip hint */}
                  <div
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                    style={{ position: 'absolute', bottom: '-28px', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, padding: '3px 12px', borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', whiteSpace: 'nowrap', fontFamily: '"Cairo", sans-serif' }}
                  >
                    <RotateCcw className="w-3 h-3" />
                    انقر للقلب
                  </div>
                </div>

                {/* Error */}
                {exportError && (
                  <div className="w-full bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-600 font-bold" style={{ fontFamily: '"Cairo", sans-serif' }}>
                    {exportError}
                  </div>
                )}

                {/* ── Action Buttons ── */}
                <div className="w-full flex flex-col gap-3" style={{ fontFamily: '"Cairo", sans-serif', maxWidth: '400px' }}>
                  <button
                    onClick={() => exportCard('png')}
                    disabled={isExporting}
                    className="w-full py-3.5 rounded-2xl text-white font-bold text-[15px] flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                    style={{ background: `linear-gradient(135deg, #1e1b4b 0%, ${DARK} 100%)`, boxShadow: '0 6px 24px -6px rgba(30,27,75,0.45)' }}
                  >
                    {isExporting
                      ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      : <Download className="w-4 h-4" style={{ color: ACCENT }} />}
                    تنزيل البطاقة كصورة (PNG)
                  </button>

                  <button
                    onClick={() => exportCard('pdf')}
                    disabled={isExporting}
                    className="w-full py-3.5 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50"
                  >
                    <Printer className="w-4 h-4" />
                    حفظ للطباعة (PDF)
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// CARD FRONT — matches the reference image exactly
// ══════════════════════════════════════════════════════════════════════════════
interface CardFrontProps {
  userProfile: {
    full_name: string;
    membership_type?: string;
    avatar_url?: string;
    location?: string;
  };
  membershipId: string;
  issueDate: string;
  verifyUrl: string;
  qrRef: React.RefObject<HTMLCanvasElement>;
}

const CardFront: React.FC<CardFrontProps> = ({ userProfile, membershipId, issueDate, verifyUrl, qrRef }) => {
  const s: React.CSSProperties = {
    width: '100%', height: '100%',
    fontFamily: '"Cairo", "Noto Sans Arabic", sans-serif',
    direction: 'rtl',
    display: 'flex',
    flexDirection: 'column',
    background: DARK,
    position: 'relative',
    overflow: 'hidden',
  };

  return (
    <div style={s}>
      {/* Subtle background wave/shape on the right side */}
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: '44%', height: '100%',
        background: LIGHT_BG,
        borderRadius: '0 40% 40% 0 / 0 50% 50% 0',
        opacity: 0.97,
        zIndex: 1,
      }} />

      {/* ── MAIN CONTENT AREA ── */}
      <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* ── TOP SECTION ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 16px 8px' }}>

          {/* LEFT: Logo + Org name (on dark) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', border: `2px solid ${ACCENT}`, background: '#fff', flexShrink: 0 }}>
              <img src="/ABC.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 900, color: ACCENT, lineHeight: 1.25 }}>جمعية عون وسند الخيرية</div>
              <div style={{ fontSize: '10px', color: 'rgba(244,242,248,0.75)', marginTop: '1px' }}>الخيرية التطوعية</div>
            </div>
          </div>

          {/* RIGHT: Badge + shield (on light bg) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: ACCENT, borderRadius: '20px', padding: '4px 10px 4px 6px' }}>
            {/* Shield icon */}
            <svg width="14" height="16" viewBox="0 0 24 28" fill="none">
              <path d="M12 2L3 6v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V6L12 2z" fill={DARK} />
              <path d="M9 13l2 2 4-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: '11px', fontWeight: 800, color: DARK }}>بطاقة عضوية رسمية</span>
          </div>
        </div>

        {/* ── MIDDLE SECTION: Name + Info ── */}
        <div style={{ display: 'flex', flex: 1, padding: '0 16px 0' }}>

          {/* RIGHT column (dark side): Name + fields */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px' }}>
            {/* Name */}
            <div>
              <div style={{ fontSize: '9px', color: 'rgba(244,242,248,0.6)', marginBottom: '3px', letterSpacing: '0.04em' }}>الاسم الكامل</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
                {userProfile.full_name}
              </div>
              {/* Divider with diamond */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(247,178,176,0.3)' }} />
                <div style={{ width: '6px', height: '6px', background: ACCENT, transform: 'rotate(45deg)', borderRadius: '1px' }} />
                <div style={{ flex: 1, height: '1px', background: 'rgba(247,178,176,0.3)' }} />
              </div>
            </div>

            {/* 2×2 Info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <InfoField icon="person" label="الصفة" value={userProfile.membership_type || 'عضو'} />
              <InfoField icon="card" label="رقم العضوية" value={membershipId} />
              <InfoField icon="building" label="المدينة" value={userProfile.location || 'نواكشوط'} />
              <InfoField icon="calendar" label="تاريخ الإصدار" value={issueDate} />
            </div>
          </div>

          {/* LEFT column (light side): Photo + QR */}
          <div style={{ width: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', paddingBottom: '8px' }}>
            {/* Profile photo */}
            <div style={{ width: '110px', height: '130px', borderRadius: '12px', overflow: 'hidden', border: `3px solid ${ACCENT}`, background: '#c8c8d8', flexShrink: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
              {userProfile.avatar_url
                ? <img src={userProfile.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ddd8ea' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={DARK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )
              }
            </div>

            {/* QR + label row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(244,242,248,0.9)', borderRadius: '10px', padding: '5px 7px' }}>
              <div style={{ background: '#fff', padding: '3px', borderRadius: '4px', lineHeight: 0 }}>
                <QRCodeCanvas
                  ref={qrRef}
                  value={verifyUrl}
                  size={58}
                  level="M"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                {/* Shield check icon */}
                <div style={{ width: '28px', height: '28px', background: `${ACCENT}30`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="18" viewBox="0 0 24 28" fill="none">
                    <path d="M12 2L3 6v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V6L12 2z" fill={ACCENT} />
                    <path d="M9 13l2 2 4-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span style={{ fontSize: '8px', fontWeight: 700, color: DARK, textAlign: 'center', lineHeight: 1.2 }}>تحقق من<br />العضوية</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── BOTTOM STRIP (dark) ── */}
        <div style={{ background: 'rgba(0,0,0,0.35)', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', borderTop: `1px solid rgba(247,178,176,0.15)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            {/* Shield icon */}
            <div style={{ width: '28px', height: '28px', background: `${ACCENT}25`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="16" viewBox="0 0 24 28" fill="none">
                <path d="M12 2L3 6v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V6L12 2z" fill={ACCENT} />
                <path d="M9 13l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.85)', fontWeight: 600, lineHeight: 1.5 }}>
              هذه البطاقة ملك لجمعية عون وسند الخيرية<br />وتُستخدم لإثبات العضوية.
            </span>
          </div>
          {/* Decorative hands icon */}
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>

        {/* ── FOOTER (white/light) ── */}
        <div style={{ background: LIGHT_BG, padding: '5px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid rgba(38,35,63,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={DARK} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span style={{ fontSize: '9px', color: DARK, fontWeight: 600, fontFamily: 'sans-serif' }}>Awn &amp; Sanad Charity – Mauritania</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Info field with icon ───────────────────────────────────────────────────
const InfoField: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => {
  const icons: Record<string, React.ReactNode> = {
    person: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DARK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    card: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DARK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ),
    building: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DARK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 22V12h6v10"/><path d="M9 7h1"/><path d="M14 7h1"/><path d="M9 11h1"/><path d="M14 11h1"/>
      </svg>
    ),
    calendar: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DARK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
      {/* Icon box */}
      <div style={{ width: '28px', height: '28px', background: `${ACCENT}30`, borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icons[icon]}
      </div>
      <div>
        <div style={{ fontSize: '8px', color: 'rgba(244,242,248,0.55)', marginBottom: '1px' }}>{label}</div>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{value}</div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// CARD BACK — unchanged as requested
// ══════════════════════════════════════════════════════════════════════════════
const CardBack: React.FC = () => (
  <div style={{ width: '100%', height: '100%', background: '#fff', fontFamily: '"Cairo", "Noto Sans Arabic", sans-serif', direction: 'rtl', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0' }}>
    <div style={{ background: DARK, height: '42px', display: 'flex', alignItems: 'center', padding: '0 16px', flexShrink: 0 }}>
      <span style={{ fontSize: '12px', fontWeight: 700, color: ACCENT }}>تعليمات هامة للاستخدام</span>
    </div>
    <div style={{ flex: 1, padding: '14px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px' }}>
      {[
        'هذه البطاقة ملك لجمعية عون وسند الخيرية وتستخدم لإثبات العضوية.',
        'يرجى إبراز هذه البطاقة عند حضور الاجتماعات والأنشطة الرسمية.',
        'في حالة فقدان البطاقة، يرجى إبلاغ الإدارة فوراً عبر الموقع الرسمي.',
        'استخدام هذه البطاقة يخضع للوائح والقوانين الداخلية للجمعية.',
      ].map((t, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <span style={{ color: ACCENT, fontSize: '10px', marginTop: '2px', flexShrink: 0 }}>●</span>
          <span style={{ fontSize: '10px', color: '#334155', lineHeight: 1.55, fontWeight: 600 }}>{t}</span>
        </div>
      ))}
    </div>
    <div style={{ background: '#f1f5f9', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 14px', flexShrink: 0, borderTop: '1px solid #e2e8f0' }}>
      <span style={{ fontSize: '8px', color: '#94a3b8' }}>Awn &amp; Sanad Charity – Mauritania</span>
    </div>
  </div>
);
