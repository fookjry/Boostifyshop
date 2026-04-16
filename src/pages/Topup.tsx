import React, { useState, useEffect } from 'react';
import { doc, updateDoc, increment, addDoc, collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Wallet, Gift, QrCode, ArrowRight, Loader2, CheckCircle2, AlertCircle, Smartphone, Copy, Check, TrendingUp, TrendingDown, X, ClipboardPaste } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';

import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export function Topup({ user, profile }: { user: any; profile: any }) {
  const [method, setMethod] = useState<'gift' | 'transfer'>('gift');
  const [giftLink, setGiftLink] = useState('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const validateLink = (link: string) => {
    if (!link) {
      setIsValid(null);
      return;
    }
    // TrueMoney Angpao link pattern
    const pattern = /^https:\/\/gift\.truemoney\.com\/campaign\/\?v=[a-zA-Z0-9]+$/;
    setIsValid(pattern.test(link));
  };

  useEffect(() => {
    if (method === 'gift') {
      validateLink(giftLink);
    }
  }, [giftLink, method]);
  const [paymentSettings, setPaymentSettings] = useState({ trueMoneyNumber: '', paymentQrUrl: '' });
  const [paymentMethods, setPaymentMethods] = useState({ promptpay: 'open', truemoney: 'open' });
  const [copied, setCopied] = useState(false);

  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'payment'), (doc) => {
      if (doc.exists()) {
        setPaymentSettings({
          trueMoneyNumber: doc.data().trueMoneyNumber || '',
          paymentQrUrl: doc.data().paymentQrUrl || ''
        });
      }
    });

    const unsubMethods = onSnapshot(doc(db, 'settings', 'payment_methods'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setPaymentMethods({
          promptpay: data.promptpay || 'open',
          truemoney: data.truemoney || 'open'
        });
      }
    });

    // Fetch user transactions
    const q = query(
      collection(db, 'transactions'), 
      where('userId', '==', user.uid)
    );
    const unsubTx = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory to avoid composite index requirement
      list.sort((a: any, b: any) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      setTransactions(list.slice(0, 10));
    });

    return () => {
      unsubSettings();
      unsubMethods();
      unsubTx();
    };
  }, [user.uid]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isAdmin = profile?.role === 'admin';

  const isMethodAvailable = (methodKey: 'truemoney' | 'promptpay') => {
    const mode = paymentMethods[methodKey];
    if (mode === 'open') return true;
    if (mode === 'maintenance' && isAdmin) return true;
    return false;
  };

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    const methodKey = method === 'gift' ? 'truemoney' : 'promptpay';
    if (!isMethodAvailable(methodKey)) {
      setError('ขออภัย ช่องทางนี้ปิดปรับปรุงชั่วคราว');
      setLoading(false);
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await axios.post('/api/topup/verify', {
        userId: user.uid,
        type: method,
        data: method === 'gift' ? giftLink : giftLink // giftLink holds base64 for transfer
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setSuccess(true);
        setGiftLink('');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const allDisabled = !isMethodAvailable('promptpay') && !isMethodAvailable('truemoney');

  if (allDisabled) {
    const isMaintenance = paymentMethods.promptpay === 'maintenance' || paymentMethods.truemoney === 'maintenance';
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-6">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${isMaintenance ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
          <AlertCircle className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold text-white">{isMaintenance ? 'ระบบกำลังปิดปรับปรุง' : 'ระบบเติมเงินปิดให้บริการ'}</h1>
        <p className="text-slate-400">
          {isMaintenance 
            ? 'ขออภัยในความไม่สะดวก ขณะนี้ระบบเติมเงินกำลังอยู่ระหว่างการปรับปรุงเพื่อประสิทธิภาพที่ดีขึ้น' 
            : 'ขออภัย ขณะนี้ระบบเติมเงินยังไม่เปิดให้บริการในขณะนี้'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-white drop-shadow-md">เติมเงินเข้าวอลเล็ท</h1>
        <p className="text-slate-300">เพิ่มเงินในบัญชีของคุณเพื่อซื้อ VPN</p>
      </header>

      <div className="glass-panel p-8 space-y-8">
        <div className="flex p-1 bg-black/20 rounded-2xl border border-white/10 backdrop-blur-sm">
          <button 
            onClick={() => setMethod('gift')}
            disabled={!isMethodAvailable('truemoney')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all relative group ${method === 'gift' ? 'bg-blue-600/80 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-blue-500/50 backdrop-blur-md' : 'text-slate-400 hover:text-white hover:bg-white/5'} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Gift className="w-5 h-5" /> อั่งเปา TrueMoney
            {!isMethodAvailable('truemoney') && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
                {paymentMethods.truemoney === 'maintenance' ? 'กำลังปรับปรุง (เฉพาะแอดมิน)' : 'ปิดให้บริการ'}
              </div>
            )}
            {paymentMethods.truemoney === 'maintenance' && isAdmin && (
              <div className="absolute -top-2 -right-2 bg-amber-500 text-[8px] px-1.5 py-0.5 rounded-full font-black text-black animate-pulse">MAINTENANCE</div>
            )}
          </button>
          <button 
            onClick={() => setMethod('transfer')}
            disabled={!isMethodAvailable('promptpay')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all relative group ${method === 'transfer' ? 'bg-blue-600/80 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-blue-500/50 backdrop-blur-md' : 'text-slate-400 hover:text-white hover:bg-white/5'} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <QrCode className="w-5 h-5" /> โอนเงิน / QR Code
            {!isMethodAvailable('promptpay') && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
                {paymentMethods.promptpay === 'maintenance' ? 'กำลังปรับปรุง (เฉพาะแอดมิน)' : 'ปิดให้บริการ'}
              </div>
            )}
            {paymentMethods.promptpay === 'maintenance' && isAdmin && (
              <div className="absolute -top-2 -right-2 bg-amber-500 text-[8px] px-1.5 py-0.5 rounded-full font-black text-black animate-pulse">MAINTENANCE</div>
            )}
          </button>
        </div>

        {method === 'gift' ? (
          <form onSubmit={handleTopup} className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2 drop-shadow-sm">
                <Gift className="w-4 h-4 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" /> ลิงก์อั่งเปา TrueMoney
              </label>
              
              <div className="relative group">
                <input 
                  type="text" 
                  value={giftLink}
                  onChange={(e) => setGiftLink(e.target.value)}
                  className={`w-full bg-black/20 border-2 rounded-2xl py-4 pl-4 pr-24 text-white outline-none transition-all duration-300 min-h-[56px] text-lg backdrop-blur-sm ${
                    isValid === true 
                      ? 'border-emerald-500/50 focus:border-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(52,211,153,0.2)]' 
                      : isValid === false 
                        ? 'border-red-500/50 focus:border-red-400 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                        : 'border-white/10 focus:border-blue-500/50 focus:bg-white/5'
                  }`}
                  placeholder="วางลิงก์ซองอั่งเปา TrueMoney ที่นี่"
                  required
                />
                
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <AnimatePresence>
                    {!giftLink && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        type="button"
                        onClick={async () => {
                          try {
                            const text = await navigator.clipboard.readText();
                            if (text) setGiftLink(text);
                          } catch (err) {
                            console.error('Failed to read clipboard', err);
                          }
                        }}
                        className="flex items-center gap-1 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl transition-colors text-xs font-bold border border-blue-500/30 backdrop-blur-sm"
                      >
                        <ClipboardPaste className="w-4 h-4" /> วาง
                      </motion.button>
                    )}
                    {giftLink && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        type="button"
                        onClick={() => {
                          setGiftLink('');
                          setIsValid(null);
                        }}
                        className="p-2 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-full transition-colors backdrop-blur-sm"
                      >
                        <X className="w-5 h-5" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {isValid === false && giftLink && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-xs font-bold flex items-center gap-1 ml-1 drop-shadow-sm"
                >
                  <AlertCircle className="w-3 h-3" /> ลิงก์ไม่ถูกต้อง (ต้องขึ้นต้นด้วย https://gift.truemoney.com/campaign/?v=)
                </motion.p>
              )}

              {isValid === true && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-emerald-400 text-xs font-bold flex items-center gap-1 ml-1 drop-shadow-sm"
                >
                  <CheckCircle2 className="w-3 h-3" /> ลิงก์ถูกต้อง พร้อมใช้งาน
                </motion.p>
              )}

              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest leading-relaxed">
                * เงินจะถูกเพิ่มเข้าบัญชีทันทีหลังจากการตรวจสอบ <br />
                * กรุณาตรวจสอบว่าซองอั่งเปาเป็นแบบ "แบ่งจำนวนเงินเท่ากัน" หรือ "สุ่มจำนวนเงิน" ก็ได้
              </p>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-500/20 border border-red-500/30 p-4 rounded-2xl text-red-300 text-sm flex items-center gap-3 backdrop-blur-sm shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              >
                <AlertCircle className="w-5 h-5 shrink-0 text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" /> 
                <span className="font-medium">{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-500/20 border border-emerald-500/30 p-4 rounded-2xl text-emerald-300 text-sm flex items-center gap-3 backdrop-blur-sm shadow-[0_0_15px_rgba(52,211,153,0.2)]"
              >
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" /> 
                <span className="font-medium">เติมเงินสำเร็จ! ยอดเงินคงเหลือถูกอัปเดตแล้ว</span>
              </motion.div>
            )}

            <button 
              disabled={loading || !isValid}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-xl ${
                isValid 
                  ? 'glass-button' 
                  : 'bg-black/40 text-slate-500 cursor-not-allowed border border-white/5'
              }`}
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'ตรวจสอบและเติมเงิน'}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-6 py-4">
            <div className="bg-blue-500/20 border border-blue-400/30 rounded-2xl p-4 mb-2 backdrop-blur-sm shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <p className="text-blue-300 text-sm font-bold flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" /> วิธีนี้ รองรับการเติมเงินขั้นต่ำ 50 บาท
              </p>
            </div>
            {paymentSettings.paymentQrUrl ? (
              <div className="bg-white/10 p-4 rounded-3xl inline-block shadow-2xl border border-white/20 backdrop-blur-md">
                <img src={paymentSettings.paymentQrUrl} alt="Payment QR" className="max-w-[240px] h-auto rounded-xl" />
              </div>
            ) : (
              <div className="bg-black/20 p-12 rounded-3xl border border-white/10 inline-block backdrop-blur-sm">
                <QrCode className="w-16 h-16 text-slate-500 mx-auto drop-shadow-sm" />
                <p className="text-slate-400 text-xs mt-4 font-bold uppercase tracking-widest">ยังไม่ได้ตั้งค่า QR Code</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-xl font-bold text-white drop-shadow-sm">สแกนหรือโอนเงิน</h4>
                <p className="text-slate-300 text-sm max-w-xs mx-auto">สแกน QR Code ด้านบนเพื่อโอนเงิน และอัปโหลดสลิปเพื่อตรวจสอบอัตโนมัติ</p>
              </div>
            </div>

            <form onSubmit={handleTopup} className="space-y-4 pt-4 border-t border-white/10">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 text-left block drop-shadow-sm">อัปโหลดสลิปโอนเงิน (ตรวจสอบอัตโนมัติ)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setGiftLink(reader.result as string); // Reuse giftLink state for base64 image
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-blue-500/50 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500/20 file:text-blue-400 hover:file:bg-blue-500/30 backdrop-blur-sm"
                  required
                />
              </div>

              {error && <div className="bg-red-500/20 border border-red-500/30 p-4 rounded-xl text-red-300 text-sm flex items-center gap-2 text-left backdrop-blur-sm shadow-[0_0_15px_rgba(239,68,68,0.2)]"><AlertCircle className="w-5 h-5 shrink-0 text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" /> {error}</div>}
              {success && <div className="bg-emerald-500/20 border border-emerald-500/30 p-4 rounded-xl text-emerald-300 text-sm flex items-center gap-2 text-left backdrop-blur-sm shadow-[0_0_15px_rgba(52,211,153,0.2)]"><CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" /> ตรวจสอบสลิปสำเร็จ! ยอดเงินถูกเพิ่มแล้ว</div>}

              <button 
                disabled={loading || !giftLink}
                className="w-full glass-button py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'ตรวจสอบสลิป'}
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="glass-panel p-6">
        <h4 className="font-bold text-white mb-4 flex items-center gap-2 drop-shadow-sm">
          <Wallet className="w-5 h-5 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" /> รายการธุรกรรมล่าสุด
        </h4>
        {transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5 backdrop-blur-sm hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg border ${tx.type === 'topup' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(52,211,153,0.2)]' : 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]'}`}>
                    {tx.type === 'topup' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white drop-shadow-sm">{tx.note || 'เติมเงิน'}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                      {new Date(tx.timestamp).toLocaleString('th-TH')}
                    </p>
                  </div>
                </div>
                <p className={`font-bold drop-shadow-sm ${ (typeof tx.amount === 'object' ? (tx.amount.amount || 0) : (Number(tx.amount) || 0)) > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {(() => {
                    const amount = typeof tx.amount === 'object' ? (tx.amount.amount || 0) : (Number(tx.amount) || 0);
                    return amount > 0 ? `+${amount}` : amount;
                  })()} ฿
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm italic text-center py-4">ไม่พบรายการธุรกรรมล่าสุด</p>
        )}
      </div>
    </div>
  );
}
