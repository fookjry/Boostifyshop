import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Server, Users, CreditCard, Activity, ShieldAlert, ChevronRight, TrendingUp, DollarSign, MessageSquare, Save, Loader2, Wifi, Upload, Globe, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export function Admin() {
  const [stats, setStats] = useState({ totalUsers: 0, totalRevenue: 0, activeConfigs: 0, serverCount: 0 });
  const [userMap, setUserMap] = useState<{ [key: string]: string }>({});
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [discordInvite, setDiscordInvite] = useState('');
  const [siteName, setSiteName] = useState('VPNSaaS');
  const [announcement, setAnnouncement] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [trueMoneyNumber, setTrueMoneyNumber] = useState('');
  const [paymentQrUrl, setPaymentQrUrl] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [minTopup, setMinTopup] = useState(50);
  const [paymentMethods, setPaymentMethods] = useState({ promptpay: true, truemoney: true });
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit file size to 500KB for base64 storage in Firestore
    if (file.size > 500 * 1024) {
      alert('ไฟล์มีขนาดใหญ่เกินไป (จำกัด 500KB)');
      return;
    }

    setUploadingLogo(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setLogoUrl(base64String);
        await setDoc(doc(db, 'settings', 'global'), { logoUrl: base64String }, { merge: true });
        setUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Logo upload error:', error);
      setUploadingLogo(false);
    }
  };

  useEffect(() => {
    const unsubGlobal = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setDiscordInvite(data.discordInvite || '');
        setSiteName(data.siteName || 'VPNSaaS');
        setAnnouncement(data.announcement || '');
        setLogoUrl(data.logoUrl || '');
      }
    });

    const unsubPayment = onSnapshot(doc(db, 'settings', 'payment'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setTrueMoneyNumber(data.trueMoneyNumber || '');
        setPaymentQrUrl(data.paymentQrUrl || '');
        setBankHolder(data.bankHolder || '');
        setMinTopup(data.minTopup || 50);
      }
    });

    const unsubMethods = onSnapshot(doc(db, 'settings', 'payment_methods'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setPaymentMethods({
          promptpay: data.promptpay ?? true,
          truemoney: data.truemoney ?? true
        });
      }
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const mapping: { [key: string]: string } = {};
      snap.docs.forEach(doc => {
        mapping[doc.id] = doc.data().email || 'Unknown';
      });
      setUserMap(mapping);
      setStats(prev => ({ ...prev, totalUsers: snap.size }));
    });

    const unsubServers = onSnapshot(collection(db, 'servers'), (snap) => {
      setStats(prev => ({ ...prev, serverCount: snap.size }));
    });

    const unsubTx = onSnapshot(query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(5)), (snap) => {
      setRecentTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      // Note: Full revenue aggregation should be done in Transactions page or via a more efficient query
    });

    const unsubVpns = onSnapshot(collection(db, 'vpns'), (snap) => {
      const now = new Date();
      setStats(prev => ({ 
        ...prev, 
        activeConfigs: snap.docs.filter(d => {
          const data = d.data();
          return new Date(data.expireAt) > now;
        }).length 
      }));
    });

    return () => {
      unsubGlobal();
      unsubPayment();
      unsubMethods();
      unsubUsers();
      unsubServers();
      unsubTx();
      unsubVpns();
    };
  }, []);

  const menuItems = [
    { to: '/admin/users', label: 'จัดการผู้ใช้', desc: 'จัดการยอดเงินและ VPN ของผู้ใช้', icon: Users, color: 'blue' },
    { to: '/admin/servers', label: 'จัดการเซิร์ฟเวอร์', desc: 'ตั้งค่าเซิร์ฟเวอร์และราคา', icon: Server, color: 'amber' },
    { to: '/admin/icons', label: 'จัดการรูปภาพแอพ', desc: 'อัปโหลดไอคอนแอพ (1-10)', icon: ImageIcon, color: 'blue' },
    { to: '/admin/networks', label: 'จัดการเครือข่าย', desc: 'ตั้งค่าเครือข่ายและ Inbound ID', icon: Wifi, color: 'indigo' },
    { to: '/admin/devices', label: 'จัดการจำนวนอุปกรณ์', desc: 'ตั้งค่าตัวเลือกจำนวนอุปกรณ์และราคา', icon: Server, color: 'pink' },
    { to: '/admin/transactions', label: 'ธุรกรรมและวิเคราะห์', desc: 'ดูบันทึกและกราฟรายได้', icon: CreditCard, color: 'emerald' },
  ];

  return (
    <div className="space-y-12 pb-24">
      <header>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3 drop-shadow-md">
          <ShieldAlert className="w-8 h-8 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" /> แผงควบคุมแอดมิน
        </h1>
        <p className="text-slate-300">ภาพรวมระบบและทางลัดการจัดการ</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'ผู้ใช้ทั้งหมด', value: stats.totalUsers, icon: Users, color: 'blue' },
          { label: 'Config ทั้งหมด', value: stats.activeConfigs, icon: Activity, color: 'purple' },
          { label: 'เซิร์ฟเวอร์', value: stats.serverCount, icon: Server, color: 'amber' },
          { label: 'บันทึกล่าสุด', value: recentTransactions.length, icon: CreditCard, color: 'emerald' }
        ].map((s, i) => (
          <div key={i} className="glass-panel p-4 md:p-6">
            <s.icon className={`w-6 h-6 md:w-8 md:h-8 text-${s.color}-400 mb-3 md:mb-4 drop-shadow-[0_0_8px_rgba(currentColor,0.5)]`} />
            <p className="text-[10px] md:text-xs text-slate-400 uppercase font-bold tracking-wider">{s.label}</p>
            <p className="text-xl md:text-2xl font-bold text-white drop-shadow-sm">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Management Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {menuItems.map((item, i) => (
          <Link 
            key={i} 
            to={item.to}
            className="group glass-panel p-6 md:p-8 hover:border-blue-500/50 transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:bg-white/5"
          >
            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-${item.color}-500/20 flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform border border-${item.color}-500/30 shadow-[0_0_10px_rgba(currentColor,0.2)]`}>
              <item.icon className={`w-6 h-6 md:w-7 md:h-7 text-${item.color}-400 drop-shadow-[0_0_8px_rgba(currentColor,0.5)]`} />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-white mb-2 flex items-center justify-between drop-shadow-sm">
              {item.label}
              <ChevronRight className="w-4 h-4 md:w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
            </h3>
            <p className="text-slate-300 text-xs md:text-sm">{item.desc}</p>
          </Link>
        ))}
      </div>

      {/* Global & Payment Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="glass-panel p-6 md:p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-indigo-500/20 p-3 rounded-2xl border border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
              <MessageSquare className="w-6 h-6 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white drop-shadow-sm">ตั้งค่าทั่วไป</h3>
              <p className="text-slate-300 text-sm">ตั้งค่าพารามิเตอร์ทั่วทั้งแอปพลิเคชัน</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">ชื่อเว็บไซต์</label>
              <input 
                placeholder="VPNSaaS" 
                value={siteName}
                onChange={e => setSiteName(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-indigo-500/50 focus:bg-white/5 outline-none transition-all backdrop-blur-sm shadow-inner"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">โลโก้เว็บไซต์</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-black/20 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden backdrop-blur-sm shadow-inner">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-contain" />
                  ) : (
                    <Globe className="w-8 h-8 text-slate-500 drop-shadow-sm" />
                  )}
                </div>
                <label className="flex-1">
                  <div className="bg-black/20 border border-white/10 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/50 hover:bg-white/5 transition-all backdrop-blur-sm">
                    {uploadingLogo ? (
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-slate-400 mb-1 drop-shadow-sm" />
                        <span className="text-xs text-slate-400">คลิกเพื่ออัปโหลดโลโก้</span>
                      </>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} />
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">ข้อความประกาศ (ตัวอักษรวิ่ง)</label>
              <textarea 
                placeholder="ยินดีต้อนรับสู่ VPNSaaS..." 
                value={announcement}
                onChange={e => setAnnouncement(e.target.value)}
                rows={2}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-indigo-500/50 focus:bg-white/5 outline-none transition-all backdrop-blur-sm shadow-inner resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">ลิงก์เชิญ Discord</label>
              <div className="flex gap-2">
                <input 
                  placeholder="https://discord.gg/..." 
                  value={discordInvite}
                  onChange={e => setDiscordInvite(e.target.value)}
                  className="flex-1 bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-indigo-500/50 focus:bg-white/5 outline-none transition-all backdrop-blur-sm shadow-inner"
                />
                <button 
                  onClick={async () => {
                    setSavingGlobal(true);
                    try {
                      await setDoc(doc(db, 'settings', 'global'), { discordInvite, siteName, announcement }, { merge: true });
                    } catch (error) {
                      handleFirestoreError(error, OperationType.UPDATE, 'settings/global');
                    } finally {
                      setSavingGlobal(false);
                    }
                  }}
                  disabled={savingGlobal}
                  className="bg-indigo-600/80 hover:bg-indigo-500 disabled:bg-white/5 disabled:text-slate-500 text-white px-6 rounded-xl font-bold flex items-center gap-2 transition-all border border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.3)] backdrop-blur-md"
                >
                  {savingGlobal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="glass-panel p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-emerald-500/20 p-3 rounded-2xl border border-emerald-500/30 shadow-[0_0_10px_rgba(52,211,153,0.2)]">
              <CreditCard className="w-6 h-6 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white drop-shadow-sm">ตั้งค่าการชำระเงิน</h3>
              <p className="text-slate-300 text-sm">ตั้งค่าช่องทางการรับเงิน</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">เบอร์ TrueMoney</label>
                <input 
                  value={trueMoneyNumber}
                  onChange={e => setTrueMoneyNumber(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 focus:bg-white/5 outline-none transition-all backdrop-blur-sm shadow-inner"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">ชื่อเจ้าของบัญชี</label>
                <input 
                  value={bankHolder}
                  onChange={e => setBankHolder(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 focus:bg-white/5 outline-none transition-all backdrop-blur-sm shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">URL รูปภาพ QR Code (PromptPay)</label>
              <input 
                value={paymentQrUrl}
                onChange={e => setPaymentQrUrl(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 focus:bg-white/5 outline-none transition-all backdrop-blur-sm shadow-inner"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">เติมเงินขั้นต่ำ (บาท)</label>
                <input 
                  type="number"
                  value={minTopup}
                  onChange={e => setMinTopup(Number(e.target.value))}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 focus:bg-white/5 outline-none transition-all backdrop-blur-sm shadow-inner"
                />
              </div>
              <div className="flex items-end">
                <button 
                  onClick={async () => {
                    setSavingPayment(true);
                    try {
                      await setDoc(doc(db, 'settings', 'payment'), { 
                        trueMoneyNumber, 
                        paymentQrUrl, 
                        bankHolder, 
                        minTopup 
                      }, { merge: true });
                    } catch (error) {
                      handleFirestoreError(error, OperationType.UPDATE, 'settings/payment');
                    } finally {
                      setSavingPayment(false);
                    }
                  }}
                  disabled={savingPayment}
                  className="w-full bg-emerald-600/80 hover:bg-emerald-500 disabled:bg-white/5 disabled:text-slate-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-emerald-500/50 shadow-[0_0_15px_rgba(52,211,153,0.3)] backdrop-blur-md"
                >
                  {savingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  บันทึกการรับเงิน
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-3">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block drop-shadow-sm">เปิด/ปิด ช่องทางชำระเงิน</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={paymentMethods.truemoney}
                    onChange={async (e) => {
                      const newValue = e.target.checked;
                      setPaymentMethods(prev => ({ ...prev, truemoney: newValue }));
                      await setDoc(doc(db, 'settings', 'payment_methods'), { truemoney: newValue }, { merge: true });
                    }}
                    className="w-4 h-4 rounded border-white/20 bg-black/20 text-emerald-500 focus:ring-emerald-500/50 backdrop-blur-sm"
                  />
                  <span className="text-sm text-slate-300">TrueMoney (อั่งเปา)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={paymentMethods.promptpay}
                    onChange={async (e) => {
                      const newValue = e.target.checked;
                      setPaymentMethods(prev => ({ ...prev, promptpay: newValue }));
                      await setDoc(doc(db, 'settings', 'payment_methods'), { promptpay: newValue }, { merge: true });
                    }}
                    className="w-4 h-4 rounded border-white/20 bg-black/20 text-emerald-500 focus:ring-emerald-500/50 backdrop-blur-sm"
                  />
                  <span className="text-sm text-slate-300">PromptPay (สลิป)</span>
                </label>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Recent Activity Mini-Table */}
      <section className="glass-panel overflow-hidden">
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h3 className="text-lg font-bold text-white drop-shadow-sm">กิจกรรมล่าสุด</h3>
          <Link to="/admin/transactions" className="text-blue-400 text-xs font-bold hover:underline drop-shadow-sm">ดูทั้งหมด</Link>
        </div>
        
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-black/40 text-slate-400 uppercase text-[10px] font-black tracking-widest backdrop-blur-md">
              <tr>
                <th className="px-6 py-4">ผู้ใช้</th>
                <th className="px-6 py-4">ประเภท</th>
                <th className="px-6 py-4">จำนวนเงิน</th>
                <th className="px-6 py-4">วันที่</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentTransactions.map(tx => {
                const amount = typeof tx.amount === 'object' ? tx.amount.amount : tx.amount;
                return (
                <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-slate-300 font-medium truncate max-w-[150px]">
                    {tx.userEmail || userMap[tx.userId] || tx.userId}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${tx.type === 'topup' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className={`px-6 py-4 font-bold drop-shadow-sm ${amount > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {amount > 0 ? `+${amount}` : amount} ฿
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">
                    {new Date(tx.timestamp).toLocaleDateString()}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>

        {/* Mobile List */}
        <div className="md:hidden divide-y divide-white/5">
          {recentTransactions.map(tx => {
            const amount = typeof tx.amount === 'object' ? tx.amount.amount : tx.amount;
            return (
              <div key={tx.id} className="p-4 space-y-3 hover:bg-white/5 transition-colors">
                <div className="flex justify-between items-start">
                  <p className="text-sm text-slate-300 font-medium truncate max-w-[200px]">
                    {tx.userEmail || userMap[tx.userId] || tx.userId}
                  </p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${tx.type === 'topup' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                    {tx.type}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-400">{new Date(tx.timestamp).toLocaleString()}</p>
                  <p className={`font-bold drop-shadow-sm ${amount > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {amount > 0 ? `+${amount}` : amount} ฿
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
