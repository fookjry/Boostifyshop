import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Server, Users, CreditCard, Activity, ShieldAlert, ChevronRight, TrendingUp, DollarSign, MessageSquare, Save, Loader2, Wifi, Upload, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export function Admin() {
  const [stats, setStats] = useState({ totalUsers: 0, totalRevenue: 0, activeConfigs: 0, serverCount: 0 });
  const [userMap, setUserMap] = useState<{ [key: string]: string }>({});
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [discordInvite, setDiscordInvite] = useState('');
  const [siteName, setSiteName] = useState('VPNSaaS');
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
    { to: '/admin/networks', label: 'จัดการเครือข่าย', desc: 'ตั้งค่าเครือข่ายและ Inbound ID', icon: Wifi, color: 'indigo' },
    { to: '/admin/devices', label: 'จัดการจำนวนอุปกรณ์', desc: 'ตั้งค่าตัวเลือกจำนวนอุปกรณ์และราคา', icon: Server, color: 'pink' },
    { to: '/admin/transactions', label: 'ธุรกรรมและวิเคราะห์', desc: 'ดูบันทึกและกราฟรายได้', icon: CreditCard, color: 'emerald' },
  ];

  return (
    <div className="space-y-12 pb-24">
      <header>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-amber-500" /> แผงควบคุมแอดมิน
        </h1>
        <p className="text-slate-400">ภาพรวมระบบและทางลัดการจัดการ</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'ผู้ใช้ทั้งหมด', value: stats.totalUsers, icon: Users, color: 'blue' },
          { label: 'Config ทั้งหมด', value: stats.activeConfigs, icon: Activity, color: 'purple' },
          { label: 'เซิร์ฟเวอร์', value: stats.serverCount, icon: Server, color: 'amber' },
          { label: 'บันทึกล่าสุด', value: recentTransactions.length, icon: CreditCard, color: 'emerald' }
        ].map((s, i) => (
          <div key={i} className="bg-slate-900 p-4 md:p-6 rounded-2xl border border-slate-800">
            <s.icon className={`w-6 h-6 md:w-8 md:h-8 text-${s.color}-500 mb-3 md:mb-4`} />
            <p className="text-[10px] md:text-xs text-slate-500 uppercase font-bold tracking-wider">{s.label}</p>
            <p className="text-xl md:text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Management Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {menuItems.map((item, i) => (
          <Link 
            key={i} 
            to={item.to}
            className="group bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-800 hover:border-blue-500/50 transition-all hover:shadow-2xl hover:shadow-blue-500/10"
          >
            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-${item.color}-500/10 flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform`}>
              <item.icon className={`w-6 h-6 md:w-7 md:h-7 text-${item.color}-500`} />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-white mb-2 flex items-center justify-between">
              {item.label}
              <ChevronRight className="w-4 h-4 md:w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
            </h3>
            <p className="text-slate-400 text-xs md:text-sm">{item.desc}</p>
          </Link>
        ))}
      </div>

      {/* Global & Payment Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-800">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-indigo-500/10 p-3 rounded-2xl">
              <MessageSquare className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">ตั้งค่าทั่วไป</h3>
              <p className="text-slate-400 text-sm">ตั้งค่าพารามิเตอร์ทั่วทั้งแอปพลิเคชัน</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">ชื่อเว็บไซต์</label>
              <input 
                placeholder="VPNSaaS" 
                value={siteName}
                onChange={e => setSiteName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-indigo-500 outline-none transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">โลโก้เว็บไซต์</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center overflow-hidden">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-contain" />
                  ) : (
                    <Globe className="w-8 h-8 text-slate-700" />
                  )}
                </div>
                <label className="flex-1">
                  <div className="bg-slate-950 border border-slate-800 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 transition-colors">
                    {uploadingLogo ? (
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-slate-500 mb-1" />
                        <span className="text-xs text-slate-500">คลิกเพื่ออัปโหลดโลโก้</span>
                      </>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} />
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">ลิงก์เชิญ Discord</label>
              <div className="flex gap-2">
                <input 
                  placeholder="https://discord.gg/..." 
                  value={discordInvite}
                  onChange={e => setDiscordInvite(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-indigo-500 outline-none transition-colors"
                />
                <button 
                  onClick={async () => {
                    setSavingGlobal(true);
                    try {
                      await setDoc(doc(db, 'settings', 'global'), { discordInvite, siteName }, { merge: true });
                    } catch (error) {
                      handleFirestoreError(error, OperationType.UPDATE, 'settings/global');
                    } finally {
                      setSavingGlobal(false);
                    }
                  }}
                  disabled={savingGlobal}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white px-6 rounded-xl font-bold flex items-center gap-2 transition-all"
                >
                  {savingGlobal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-emerald-500/10 p-3 rounded-2xl">
              <CreditCard className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">ตั้งค่าการชำระเงิน</h3>
              <p className="text-slate-400 text-sm">ตั้งค่าช่องทางการรับเงิน</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">เบอร์ TrueMoney</label>
                <input 
                  value={trueMoneyNumber}
                  onChange={e => setTrueMoneyNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">ชื่อเจ้าของบัญชี</label>
                <input 
                  value={bankHolder}
                  onChange={e => setBankHolder(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">URL รูปภาพ QR Code (PromptPay)</label>
              <input 
                value={paymentQrUrl}
                onChange={e => setPaymentQrUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">เติมเงินขั้นต่ำ (บาท)</label>
                <input 
                  type="number"
                  value={minTopup}
                  onChange={e => setMinTopup(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
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
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                >
                  {savingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  บันทึกการรับเงิน
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest block">เปิด/ปิด ช่องทางชำระเงิน</label>
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
                    className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
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
                    className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-300">PromptPay (สลิป)</span>
                </label>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Recent Activity Mini-Table */}
      <section className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">กิจกรรมล่าสุด</h3>
          <Link to="/admin/transactions" className="text-blue-400 text-xs font-bold hover:underline">ดูทั้งหมด</Link>
        </div>
        
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="px-6 py-4">ผู้ใช้</th>
                <th className="px-6 py-4">ประเภท</th>
                <th className="px-6 py-4">จำนวนเงิน</th>
                <th className="px-6 py-4">วันที่</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {recentTransactions.map(tx => {
                const amount = typeof tx.amount === 'object' ? tx.amount.amount : tx.amount;
                return (
                <tr key={tx.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 text-slate-300 font-medium truncate max-w-[150px]">
                    {tx.userEmail || userMap[tx.userId] || tx.userId}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${tx.type === 'topup' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className={`px-6 py-4 font-bold ${amount > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {amount > 0 ? `+${amount}` : amount} ฿
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {new Date(tx.timestamp).toLocaleDateString()}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>

        {/* Mobile List */}
        <div className="md:hidden divide-y divide-slate-800">
          {recentTransactions.map(tx => {
            const amount = typeof tx.amount === 'object' ? tx.amount.amount : tx.amount;
            return (
              <div key={tx.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <p className="text-sm text-slate-300 font-medium truncate max-w-[200px]">
                    {tx.userEmail || userMap[tx.userId] || tx.userId}
                  </p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${tx.type === 'topup' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                    {tx.type}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-500">{new Date(tx.timestamp).toLocaleString()}</p>
                  <p className={`font-bold ${amount > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
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
