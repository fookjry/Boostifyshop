import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { CreditCard, TrendingUp, TrendingDown, Activity, DollarSign, Settings, Save, Loader2, Upload, Trash2, User, X } from 'lucide-react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { useSearchParams } from 'react-router-dom';

export function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const userIdFilter = searchParams.get('userId');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [userMap, setUserMap] = useState<{ [key: string]: string }>({});
  const [stats, setStats] = useState({ totalTopup: 0, totalPurchase: 0, totalRevenue: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [paymentSettings, setPaymentSettings] = useState({ trueMoneyNumber: '', paymentQrUrl: '' });
  const [paymentMethods, setPaymentMethods] = useState({ promptpay: true, truemoney: true });
  const [savingSettings, setSavingSettings] = useState(false);
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    const txPath = 'transactions';
    const q = query(collection(db, txPath), orderBy('timestamp', 'desc'), limit(500));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      // If userIdFilter is present, we still fetch all but filter in memory for stats/charts 
      // or we could query specifically. For simplicity with existing code, we filter here.
      const filteredList = userIdFilter ? list.filter(tx => tx.userId === userIdFilter) : list;
      
      setTransactions(list);

      // Aggregate stats based on filtered list
      let topup = 0;
      let purchase = 0;
      filteredList.forEach((tx: any) => {
        const amount = typeof tx.amount === 'object' ? (tx.amount.amount || 0) : (Number(tx.amount) || 0);
        if (tx.type === 'topup') topup += Math.abs(amount);
        if (tx.type === 'purchase') purchase += Math.abs(amount);
      });
      setStats({ totalTopup: topup, totalPurchase: purchase, totalRevenue: topup - purchase });

      // Aggregate chart data (by date) based on filtered list
      const dailyData: { [key: string]: { date: string, topup: number, purchase: number } } = {};
      filteredList.forEach((tx: any) => {
        const amount = typeof tx.amount === 'object' ? (tx.amount.amount || 0) : (Number(tx.amount) || 0);
        const date = new Date(tx.timestamp).toLocaleDateString();
        if (!dailyData[date]) dailyData[date] = { date, topup: 0, purchase: 0 };
        if (tx.type === 'topup') dailyData[date].topup += Math.abs(amount);
        if (tx.type === 'purchase') dailyData[date].purchase += Math.abs(amount);
      });
      setChartData(Object.values(dailyData).reverse());
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, txPath);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'payment'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setPaymentSettings({
          trueMoneyNumber: data.trueMoneyNumber || '',
          paymentQrUrl: data.paymentQrUrl || '',
          bankHolder: data.bankHolder || '',
          minTopup: data.minTopup || 50
        } as any);
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
    });

    return () => {
      unsub();
      unsubSettings();
      unsubMethods();
      unsubUsers();
    };
  }, []);

  const handleToggleMethod = async (method: 'promptpay' | 'truemoney') => {
    try {
      await setDoc(doc(db, 'settings', 'payment_methods'), {
        [method]: !paymentMethods[method]
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/payment_methods');
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesUser = !userIdFilter || tx.userId === userIdFilter;
    const matchesMethod = filterMethod === 'all' || 
      (filterMethod === 'promptpay' && tx.note?.toLowerCase().includes('promptpay')) ||
      (filterMethod === 'truemoney' && tx.note?.toLowerCase().includes('truemoney'));
    const matchesStatus = filterStatus === 'all' || tx.type === filterStatus;
    return matchesUser && matchesMethod && matchesStatus;
  });

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'payment'), paymentSettings, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/payment');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentSettings(prev => ({ ...prev, paymentQrUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-20 md:pb-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3 drop-shadow-md">
            <CreditCard className="w-7 h-7 md:w-8 md:h-8 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> วิเคราะห์ธุรกรรม
          </h1>
          <p className="text-slate-300 text-sm md:text-base">ตรวจสอบรายได้ การเติมเงิน และการซื้อแบบเรียลไทม์</p>
        </div>
        {userIdFilter && (
          <div className="glass-panel px-4 py-2 flex items-center gap-3 border-blue-500/30">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400 drop-shadow-[0_0_4px_rgba(59,130,246,0.5)]" />
              <span className="text-blue-400 text-sm font-medium drop-shadow-sm">
                กรองโดยผู้ใช้: <span className="text-white">{userMap[userIdFilter] || userIdFilter}</span>
              </span>
            </div>
            <button 
              onClick={() => {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('userId');
                setSearchParams(newParams);
              }}
              className="p-1 hover:bg-blue-500/20 rounded-full text-blue-400 transition-colors"
              title="ล้างการกรอง"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {[
          { label: 'ยอดการเติมเงินทั้งหมด', value: `${stats.totalTopup.toLocaleString()} ฿`, icon: TrendingUp, color: 'emerald' },
          { label: 'ยอดการซื้อทั้งหมด', value: `${stats.totalPurchase.toLocaleString()} ฿`, icon: TrendingDown, color: 'blue' },
          { label: 'รายได้สุทธิ', value: `${stats.totalRevenue.toLocaleString()} ฿`, icon: DollarSign, color: 'amber' }
        ].map((s, i) => (
          <div key={i} className={`glass-panel p-5 md:p-6 ${i === 2 ? 'sm:col-span-2 lg:col-span-1' : ''}`}>
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-${s.color}-500/20 border border-${s.color}-500/30 flex items-center justify-center mb-4 shadow-inner`}>
              <s.icon className={`w-5 h-5 md:w-6 md:h-6 text-${s.color}-400 drop-shadow-[0_0_8px_rgba(currentColor,0.5)]`} />
            </div>
            <p className="text-[10px] md:text-xs text-slate-400 uppercase font-bold tracking-wider drop-shadow-sm">{s.label}</p>
            <p className="text-2xl md:text-3xl font-bold text-white drop-shadow-sm">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="glass-panel p-5 md:p-8 h-[300px] md:h-[400px] flex flex-col">
          <h3 className="text-base md:text-lg font-bold text-white mb-4 md:mb-6 drop-shadow-sm">แนวโน้มรายได้</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTopup" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(8px)' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="topup" stroke="#34d399" fillOpacity={1} fill="url(#colorTopup)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-5 md:p-8 h-[300px] md:h-[400px] flex flex-col">
          <h3 className="text-base md:text-lg font-bold text-white mb-4 md:mb-6 drop-shadow-sm">การเติมเงิน vs การซื้อ</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(8px)' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend />
                <Bar dataKey="topup" fill="#34d399" radius={[4, 4, 0, 0]} />
                <Bar dataKey="purchase" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Payment Settings */}
      <section className="glass-panel p-5 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-emerald-500/20 border border-emerald-500/30 p-2.5 md:p-3 rounded-2xl shadow-inner">
            <Settings className="w-5 h-5 md:w-6 md:h-6 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-bold text-white drop-shadow-sm">ตั้งค่าการชำระเงิน</h3>
            <p className="text-slate-300 text-xs md:text-sm">ตั้งค่า TrueMoney Wallet และ QR การชำระเงิน</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <div className="space-y-6">
            <div className="glass-panel p-4 space-y-4 bg-black/20">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest drop-shadow-sm">ควบคุมช่องทางการชำระเงินที่ใช้งาน</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${paymentMethods.promptpay ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-600'}`} />
                    <span className="text-sm font-bold text-white drop-shadow-sm">PromptPay / โอนเงิน</span>
                  </div>
                  <button 
                    onClick={() => handleToggleMethod('promptpay')}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${paymentMethods.promptpay ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30'}`}
                  >
                    {paymentMethods.promptpay ? 'เปิด' : 'ปิด'}
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${paymentMethods.truemoney ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-600'}`} />
                    <span className="text-sm font-bold text-white drop-shadow-sm">TrueMoney Wallet / อั่งเปา</span>
                  </div>
                  <button 
                    onClick={() => handleToggleMethod('truemoney')}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${paymentMethods.truemoney ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30'}`}
                  >
                    {paymentMethods.truemoney ? 'เปิด' : 'ปิด'}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">เบอร์ TrueMoney Wallet</label>
              <input 
                placeholder="0xx-xxx-xxxx" 
                value={paymentSettings.trueMoneyNumber}
                onChange={e => setPaymentSettings(prev => ({ ...prev, trueMoneyNumber: e.target.value }))}
                className="glass-input w-full"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">Easy Slip API Key</label>
              <div className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-slate-400 backdrop-blur-sm">
                ตั้งค่าผ่าน Environment Variable (EASY_SLIP_API_KEY) เพื่อความปลอดภัย
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">ชื่อบัญชีผู้รับเงิน (ตรวจสอบสลิป)</label>
                <input 
                  placeholder="เช่น สมชาย ใจดี" 
                  value={(paymentSettings as any).bankHolder || ''}
                  onChange={e => setPaymentSettings(prev => ({ ...prev, bankHolder: e.target.value }))}
                  className="glass-input w-full"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">เติมเงินขั้นต่ำ (บาท)</label>
                <input 
                  type="number"
                  placeholder="50" 
                  value={(paymentSettings as any).minTopup || ''}
                  onChange={e => setPaymentSettings(prev => ({ ...prev, minTopup: Number(e.target.value) }))}
                  className="glass-input w-full"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">รูปภาพ QR / สลิปการชำระเงิน</label>
              <div className="flex flex-col gap-4">
                {paymentSettings.paymentQrUrl ? (
                  <div className="relative w-32 h-32 group">
                    <img src={paymentSettings.paymentQrUrl} alt="QR" className="w-full h-full object-cover rounded-xl border border-white/20 shadow-lg" />
                    <button 
                      onClick={() => setPaymentSettings(prev => ({ ...prev, paymentQrUrl: '' }))}
                      className="absolute -top-2 -right-2 bg-red-500/80 backdrop-blur-sm text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="w-32 h-32 border-2 border-dashed border-white/20 bg-white/5 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors backdrop-blur-sm">
                    <Upload className="w-6 h-6 text-slate-400" />
                    <span className="text-[10px] text-slate-400 font-bold">อัปโหลด</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                )}
              </div>
            </div>

            <button 
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="w-full sm:w-auto glass-button px-8 py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              บันทึกการตั้งค่าการชำระเงิน
            </button>
          </div>

          <div className="glass-panel p-6 bg-black/20 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center shadow-inner">
              <Activity className="w-6 h-6 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            </div>
            <p className="text-xs md:text-sm text-slate-300 max-w-xs">
              การตั้งค่าเหล่านี้จะแสดงให้ผู้ใช้เห็นในส่วนการเติมเงิน ตรวจสอบให้แน่ใจว่าเบอร์และ QR code ถูกต้องเพื่อรับชำระเงิน
            </p>
          </div>
        </div>
      </section>

      {/* Recent Logs */}
      <div className="glass-panel overflow-hidden">
        <div className="p-5 md:p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5">
          <h3 className="text-lg font-bold text-white drop-shadow-sm">ธุรกรรมล่าสุด</h3>
          <div className="flex flex-wrap gap-2 md:gap-3">
            <select 
              value={filterMethod}
              onChange={e => setFilterMethod(e.target.value)}
              className="flex-1 sm:flex-none glass-input px-4 py-2 text-xs"
            >
              <option value="all" className="bg-slate-900">ทุกช่องทาง</option>
              <option value="promptpay" className="bg-slate-900">PromptPay</option>
              <option value="truemoney" className="bg-slate-900">TrueMoney</option>
            </select>
            <select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="flex-1 sm:flex-none glass-input px-4 py-2 text-xs"
            >
              <option value="all" className="bg-slate-900">ทุกสถานะ</option>
              <option value="topup" className="bg-slate-900">เติมเงิน</option>
              <option value="purchase" className="bg-slate-900">ซื้อ VPN</option>
              <option value="trial" className="bg-slate-900">ทดลองใช้งาน</option>
            </select>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-black/20 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-white/10">
              <tr>
                <th className="px-6 py-4">ผู้ใช้</th>
                <th className="px-6 py-4">ช่องทาง</th>
                <th className="px-6 py-4">จำนวนเงิน</th>
                <th className="px-6 py-4">วันที่</th>
                <th className="px-6 py-4">สถานะช่องทาง</th>
                <th className="px-6 py-4">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTransactions.map(tx => {
                const isPromptPay = tx.note?.toLowerCase().includes('promptpay');
                const isTrueMoney = tx.note?.toLowerCase().includes('truemoney');
                const isMethodDisabled = (isPromptPay && !paymentMethods.promptpay) || (isTrueMoney && !paymentMethods.truemoney);
                const amount = typeof tx.amount === 'object' ? tx.amount.amount : tx.amount;

                return (
                  <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-slate-200 font-medium truncate max-w-[150px]">
                      {tx.userEmail || userMap[tx.userId] || tx.userId}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${tx.type === 'topup' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                        {isPromptPay ? 'PromptPay' : isTrueMoney ? 'TrueMoney' : tx.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 font-bold ${amount > 0 ? 'text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.5)]' : 'text-slate-300'}`}>
                      {amount > 0 ? `+${amount}` : amount} ฿
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs font-mono">
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {isMethodDisabled ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800/50 text-slate-400 border border-slate-700/50 backdrop-blur-sm">
                          ปิดใช้งาน
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm">
                          ใช้งานอยู่
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs italic">
                      <div className="flex flex-col gap-1">
                        {typeof tx.note === 'string' ? tx.note : JSON.stringify(tx.note)}
                        {isMethodDisabled && tx.type === 'pending' && (
                          <span className="text-[10px] text-amber-400 font-bold drop-shadow-sm">⚠️ ช่องทางนี้ถูกปิดแล้ว อาจใช้เวลาตรวจสอบ</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden divide-y divide-white/5">
          {filteredTransactions.map(tx => {
            const isPromptPay = tx.note?.toLowerCase().includes('promptpay');
            const isTrueMoney = tx.note?.toLowerCase().includes('truemoney');
            const isMethodDisabled = (isPromptPay && !paymentMethods.promptpay) || (isTrueMoney && !paymentMethods.truemoney);
            const amount = typeof tx.amount === 'object' ? tx.amount.amount : tx.amount;

            return (
              <div key={tx.id} className="p-4 space-y-3 hover:bg-white/5 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white truncate max-w-[200px] drop-shadow-sm">
                      {tx.userEmail || userMap[tx.userId] || tx.userId}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {new Date(tx.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <p className={`text-lg font-black ${amount > 0 ? 'text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.5)]' : 'text-slate-300'}`}>
                    {amount > 0 ? `+${amount}` : amount} ฿
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${tx.type === 'topup' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                    {isPromptPay ? 'PromptPay' : isTrueMoney ? 'TrueMoney' : tx.type}
                  </span>
                  {isMethodDisabled ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800/50 text-slate-400 border border-slate-700/50 backdrop-blur-sm">
                      ปิดใช้งาน
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm">
                      ใช้งานอยู่
                    </span>
                  )}
                </div>

                <div className="bg-black/20 p-3 rounded-xl border border-white/5 backdrop-blur-sm">
                  <p className="text-[10px] text-slate-400 italic leading-relaxed">
                    {typeof tx.note === 'string' ? tx.note : JSON.stringify(tx.note)}
                    {isMethodDisabled && tx.type === 'pending' && (
                      <span className="block mt-1 text-amber-400 font-bold drop-shadow-sm">⚠️ ช่องทางนี้ถูกปิดแล้ว อาจใช้เวลาตรวจสอบ</span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
