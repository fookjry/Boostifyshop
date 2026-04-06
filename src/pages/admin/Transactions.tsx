import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { CreditCard, TrendingUp, TrendingDown, Activity, DollarSign, Settings, Save, Loader2, Upload, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

export function Transactions() {
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
      setTransactions(list);

      // Aggregate stats
      let topup = 0;
      let purchase = 0;
      list.forEach((tx: any) => {
        const amount = typeof tx.amount === 'object' ? (tx.amount.amount || 0) : (Number(tx.amount) || 0);
        if (tx.type === 'topup') topup += Math.abs(amount);
        if (tx.type === 'purchase') purchase += Math.abs(amount);
      });
      setStats({ totalTopup: topup, totalPurchase: purchase, totalRevenue: topup - purchase });

      // Aggregate chart data (by date)
      const dailyData: { [key: string]: { date: string, topup: number, purchase: number } } = {};
      list.forEach((tx: any) => {
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
    const matchesMethod = filterMethod === 'all' || 
      (filterMethod === 'promptpay' && tx.note?.toLowerCase().includes('promptpay')) ||
      (filterMethod === 'truemoney' && tx.note?.toLowerCase().includes('truemoney'));
    const matchesStatus = filterStatus === 'all' || tx.type === filterStatus;
    return matchesMethod && matchesStatus;
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
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <CreditCard className="w-7 h-7 md:w-8 md:h-8 text-emerald-500" /> วิเคราะห์ธุรกรรม
        </h1>
        <p className="text-slate-400 text-sm md:text-base">ตรวจสอบรายได้ การเติมเงิน และการซื้อแบบเรียลไทม์</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {[
          { label: 'ยอดการเติมเงินทั้งหมด', value: `${stats.totalTopup.toLocaleString()} ฿`, icon: TrendingUp, color: 'emerald' },
          { label: 'ยอดการซื้อทั้งหมด', value: `${stats.totalPurchase.toLocaleString()} ฿`, icon: TrendingDown, color: 'blue' },
          { label: 'รายได้สุทธิ', value: `${stats.totalRevenue.toLocaleString()} ฿`, icon: DollarSign, color: 'amber' }
        ].map((s, i) => (
          <div key={i} className={`bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-800 ${i === 2 ? 'sm:col-span-2 lg:col-span-1' : ''}`}>
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-${s.color}-500/10 flex items-center justify-center mb-4`}>
              <s.icon className={`w-5 h-5 md:w-6 md:h-6 text-${s.color}-500`} />
            </div>
            <p className="text-[10px] md:text-xs text-slate-500 uppercase font-bold tracking-wider">{s.label}</p>
            <p className="text-2xl md:text-3xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-slate-900 p-5 md:p-8 rounded-3xl border border-slate-800 h-[300px] md:h-[400px] flex flex-col">
          <h3 className="text-base md:text-lg font-bold text-white mb-4 md:mb-6">แนวโน้มรายได้</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTopup" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="topup" stroke="#10b981" fillOpacity={1} fill="url(#colorTopup)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 p-5 md:p-8 rounded-3xl border border-slate-800 h-[300px] md:h-[400px] flex flex-col">
          <h3 className="text-base md:text-lg font-bold text-white mb-4 md:mb-6">การเติมเงิน vs การซื้อ</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend />
                <Bar dataKey="topup" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="purchase" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Payment Settings */}
      <section className="bg-slate-900 p-5 md:p-8 rounded-3xl border border-slate-800">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-emerald-500/10 p-2.5 md:p-3 rounded-2xl">
            <Settings className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-bold text-white">ตั้งค่าการชำระเงิน</h3>
            <p className="text-slate-400 text-xs md:text-sm">ตั้งค่า TrueMoney Wallet และ QR การชำระเงิน</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <div className="space-y-6">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ควบคุมช่องทางการชำระเงินที่ใช้งาน</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${paymentMethods.promptpay ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`} />
                    <span className="text-sm font-bold text-white">PromptPay / โอนเงิน</span>
                  </div>
                  <button 
                    onClick={() => handleToggleMethod('promptpay')}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${paymentMethods.promptpay ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white' : 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'}`}
                  >
                    {paymentMethods.promptpay ? 'เปิด' : 'ปิด'}
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${paymentMethods.truemoney ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`} />
                    <span className="text-sm font-bold text-white">TrueMoney Wallet / อั่งเปา</span>
                  </div>
                  <button 
                    onClick={() => handleToggleMethod('truemoney')}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${paymentMethods.truemoney ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white' : 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'}`}
                  >
                    {paymentMethods.truemoney ? 'เปิด' : 'ปิด'}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">เบอร์ TrueMoney Wallet</label>
              <input 
                placeholder="0xx-xxx-xxxx" 
                value={paymentSettings.trueMoneyNumber}
                onChange={e => setPaymentSettings(prev => ({ ...prev, trueMoneyNumber: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Easy Slip API Key</label>
              <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-500">
                ตั้งค่าผ่าน Environment Variable (EASY_SLIP_API_KEY) เพื่อความปลอดภัย
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">ชื่อบัญชีผู้รับเงิน (ตรวจสอบสลิป)</label>
                <input 
                  placeholder="เช่น สมชาย ใจดี" 
                  value={(paymentSettings as any).bankHolder || ''}
                  onChange={e => setPaymentSettings(prev => ({ ...prev, bankHolder: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">เติมเงินขั้นต่ำ (บาท)</label>
                <input 
                  type="number"
                  placeholder="50" 
                  value={(paymentSettings as any).minTopup || ''}
                  onChange={e => setPaymentSettings(prev => ({ ...prev, minTopup: Number(e.target.value) }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">รูปภาพ QR / สลิปการชำระเงิน</label>
              <div className="flex flex-col gap-4">
                {paymentSettings.paymentQrUrl ? (
                  <div className="relative w-32 h-32 group">
                    <img src={paymentSettings.paymentQrUrl} alt="QR" className="w-full h-full object-cover rounded-xl border border-slate-800" />
                    <button 
                      onClick={() => setPaymentSettings(prev => ({ ...prev, paymentQrUrl: '' }))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="w-32 h-32 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-emerald-500/50 transition-colors">
                    <Upload className="w-6 h-6 text-slate-600" />
                    <span className="text-[10px] text-slate-600 font-bold">อัปโหลด</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                )}
              </div>
            </div>

            <button 
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
            >
              {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              บันทึกการตั้งค่าการชำระเงิน
            </button>
          </div>

          <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center">
              <Activity className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-xs md:text-sm text-slate-400 max-w-xs">
              การตั้งค่าเหล่านี้จะแสดงให้ผู้ใช้เห็นในส่วนการเติมเงิน ตรวจสอบให้แน่ใจว่าเบอร์และ QR code ถูกต้องเพื่อรับชำระเงิน
            </p>
          </div>
        </div>
      </section>

      {/* Recent Logs */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
        <div className="p-5 md:p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-white">ธุรกรรมล่าสุด</h3>
          <div className="flex flex-wrap gap-2 md:gap-3">
            <select 
              value={filterMethod}
              onChange={e => setFilterMethod(e.target.value)}
              className="flex-1 sm:flex-none bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:border-blue-500 outline-none"
            >
              <option value="all">ทุกช่องทาง</option>
              <option value="promptpay">PromptPay</option>
              <option value="truemoney">TrueMoney</option>
            </select>
            <select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="flex-1 sm:flex-none bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:border-blue-500 outline-none"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="topup">เติมเงิน</option>
              <option value="purchase">ซื้อ</option>
            </select>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="px-6 py-4">ผู้ใช้</th>
                <th className="px-6 py-4">ช่องทาง</th>
                <th className="px-6 py-4">จำนวนเงิน</th>
                <th className="px-6 py-4">วันที่</th>
                <th className="px-6 py-4">สถานะช่องทาง</th>
                <th className="px-6 py-4">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredTransactions.map(tx => {
                const isPromptPay = tx.note?.toLowerCase().includes('promptpay');
                const isTrueMoney = tx.note?.toLowerCase().includes('truemoney');
                const isMethodDisabled = (isPromptPay && !paymentMethods.promptpay) || (isTrueMoney && !paymentMethods.truemoney);
                const amount = typeof tx.amount === 'object' ? tx.amount.amount : tx.amount;

                return (
                  <tr key={tx.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-slate-300 font-medium truncate max-w-[150px]">
                      {tx.userEmail || userMap[tx.userId] || tx.userId}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${tx.type === 'topup' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                        {isPromptPay ? 'PromptPay' : isTrueMoney ? 'TrueMoney' : tx.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 font-bold ${amount > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {amount > 0 ? `+${amount}` : amount} ฿
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {isMethodDisabled ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-500 border border-slate-700">
                          ปิดใช้งาน
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-500">
                          ใช้งานอยู่
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs italic">
                      <div className="flex flex-col gap-1">
                        {typeof tx.note === 'string' ? tx.note : JSON.stringify(tx.note)}
                        {isMethodDisabled && tx.type === 'pending' && (
                          <span className="text-[10px] text-amber-500 font-bold">⚠️ ช่องทางนี้ถูกปิดแล้ว อาจใช้เวลาตรวจสอบ</span>
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
        <div className="md:hidden divide-y divide-slate-800">
          {filteredTransactions.map(tx => {
            const isPromptPay = tx.note?.toLowerCase().includes('promptpay');
            const isTrueMoney = tx.note?.toLowerCase().includes('truemoney');
            const isMethodDisabled = (isPromptPay && !paymentMethods.promptpay) || (isTrueMoney && !paymentMethods.truemoney);
            const amount = typeof tx.amount === 'object' ? tx.amount.amount : tx.amount;

            return (
              <div key={tx.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white truncate max-w-[200px]">
                      {tx.userEmail || userMap[tx.userId] || tx.userId}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(tx.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <p className={`text-lg font-black ${amount > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {amount > 0 ? `+${amount}` : amount} ฿
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${tx.type === 'topup' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                    {isPromptPay ? 'PromptPay' : isTrueMoney ? 'TrueMoney' : tx.type}
                  </span>
                  {isMethodDisabled ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-500 border border-slate-700">
                      ปิดใช้งาน
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-500">
                      ใช้งานอยู่
                    </span>
                  )}
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-500 italic leading-relaxed">
                    {typeof tx.note === 'string' ? tx.note : JSON.stringify(tx.note)}
                    {isMethodDisabled && tx.type === 'pending' && (
                      <span className="block mt-1 text-amber-500 font-bold">⚠️ ช่องทางนี้ถูกปิดแล้ว อาจใช้เวลาตรวจสอบ</span>
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
