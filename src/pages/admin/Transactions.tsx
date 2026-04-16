import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { CreditCard, TrendingUp, TrendingDown, Activity, DollarSign, Settings, Save, Loader2, Upload, Trash2, User, X } from 'lucide-react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { doc, setDoc, getDoc, limitToLast } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { useSearchParams } from 'react-router-dom';

export function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const userIdFilter = searchParams.get('userId');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [userMap, setUserMap] = useState<{ [key: string]: string }>({});
  const [stats, setStats] = useState({ totalTopup: 0, totalPurchase: 0, totalRevenue: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'analysis' | 'settings'>('analysis');
  const [paymentSettings, setPaymentSettings] = useState({ trueMoneyNumber: '', paymentQrUrl: '', bankHolder: '', minTopup: 50, easySlipApiKey: '', darkxApiKey: '' });
  const [paymentMethods, setPaymentMethods] = useState<{ promptpay: string; truemoney: string }>({ promptpay: 'open', truemoney: 'open' });
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
      let promptpayCount = 0;
      let truemoneyCount = 0;
      const userSpending: { [key: string]: { email: string, amount: number } } = {};

      filteredList.forEach((tx: any) => {
        const amount = typeof tx.amount === 'object' ? (tx.amount.amount || 0) : (Number(tx.amount) || 0);
        const absAmount = Math.abs(amount);
        
        if (tx.type === 'topup') {
          topup += absAmount;
          if (tx.note?.toLowerCase().includes('promptpay')) promptpayCount += absAmount;
          if (tx.note?.toLowerCase().includes('truemoney')) truemoneyCount += absAmount;
        }
        if (tx.type === 'purchase') {
          purchase += absAmount;
          const uId = tx.userId;
          if (!userSpending[uId]) userSpending[uId] = { email: tx.userEmail || 'Unknown', amount: 0 };
          userSpending[uId].amount += absAmount;
        }
      });
      setStats({ totalTopup: topup, totalPurchase: purchase, totalRevenue: topup - purchase });

      setPieData([
        { name: 'PromptPay', value: promptpayCount },
        { name: 'TrueMoney', value: truemoneyCount }
      ]);

      const topUsersList = Object.entries(userSpending)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
      setTopUsers(topUsersList);

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
        setPaymentSettings(prev => ({
          ...prev,
          trueMoneyNumber: data.trueMoneyNumber || '',
          paymentQrUrl: data.paymentQrUrl || '',
          bankHolder: data.bankHolder || '',
          minTopup: data.minTopup || 50
        }));
      }
    });

    const unsubKeys = onSnapshot(doc(db, 'settings', 'payment_keys'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setPaymentSettings(prev => ({
          ...prev,
          easySlipApiKey: data.easySlipApiKey || '',
          darkxApiKey: data.darkxApiKey || ''
        }));
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
      unsubKeys();
      unsubMethods();
      unsubUsers();
    };
  }, []);

  const handleSetMethodStatus = async (method: 'promptpay' | 'truemoney', status: string) => {
    try {
      setPaymentMethods(prev => ({ ...prev, [method]: status }));
      await setDoc(doc(db, 'settings', 'payment_methods'), {
        [method]: status
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
      const { easySlipApiKey, darkxApiKey, ...publicSettings } = paymentSettings;
      await setDoc(doc(db, 'settings', 'payment'), publicSettings, { merge: true });
      await setDoc(doc(db, 'settings', 'payment_keys'), { easySlipApiKey, darkxApiKey }, { merge: true });
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
            <Activity className="w-7 h-7 md:w-8 md:h-8 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" /> วิเคราะห์ธุรกรรม
          </h1>
          <p className="text-slate-300 text-sm md:text-base">ตรวจสอบรายได้ การเติมเงิน และพฤติกรรมผู้ใช้</p>
        </div>
        
        <div className="flex items-center gap-2 p-1 bg-black/20 rounded-xl border border-white/10 backdrop-blur-sm">
          <button 
            onClick={() => setActiveTab('analysis')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'analysis' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            วิเคราะห์ข้อมูล
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            ตั้งค่าการเงิน
          </button>
        </div>
      </header>

      {activeTab === 'analysis' ? (
        <>
          {/* Stats Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="glass-panel p-6 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-4">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">ยอดเติมเงิน</p>
              <p className="text-3xl font-black text-white">{stats.totalTopup.toLocaleString()} ฿</p>
            </div>
            
            <div className="glass-panel p-6 bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
                <TrendingDown className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">ยอดการซื้อ</p>
              <p className="text-3xl font-black text-white">{stats.totalPurchase.toLocaleString()} ฿</p>
            </div>

            <div className="glass-panel p-6 bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20 md:col-span-1 lg:col-span-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center mb-4">
                    <DollarSign className="w-5 h-5 text-amber-400" />
                  </div>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">รายได้สุทธิ</p>
                  <p className="text-3xl font-black text-white">{stats.totalRevenue.toLocaleString()} ฿</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-slate-500 font-bold mb-1">อัตรากำไร</p>
                  <p className="text-xl font-bold text-emerald-400">
                    {stats.totalTopup > 0 ? ((stats.totalRevenue / stats.totalTopup) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-panel p-6 md:p-8 flex flex-col min-h-[400px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" /> แนวโน้มรายได้รายวัน
                </h3>
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" /> <span className="text-slate-400">เติมเงิน</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-400" /> <span className="text-slate-400">ซื้อ VPN</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorTopup" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPurchase" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}฿`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(12px)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="topup" stroke="#34d399" strokeWidth={3} fillOpacity={1} fill="url(#colorTopup)" />
                    <Area type="monotone" dataKey="purchase" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPurchase)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel p-6 flex flex-col">
              <h3 className="text-lg font-bold text-white mb-6">สัดส่วนช่องทางเติมเงิน</h3>
              <div className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#f59e0b" />
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-3">
                {pieData.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">{item.name}</span>
                    <span className="text-white font-bold">{item.value.toLocaleString()} ฿</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Users */}
            <div className="glass-panel p-6 flex flex-col">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" /> ผู้ใช้ที่มียอดซื้อสูงสุด
              </h3>
              <div className="space-y-4 flex-1">
                {topUsers.map((user, idx) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">
                        {idx + 1}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-white truncate">{user.email}</p>
                        <p className="text-[10px] text-slate-500">ID: {user.id.substring(0, 8)}...</p>
                      </div>
                    </div>
                    <p className="text-emerald-400 font-black text-sm">{user.amount.toLocaleString()} ฿</p>
                  </div>
                ))}
                {topUsers.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 py-10">
                    <User className="w-10 h-10 mb-2 opacity-20" />
                    <p className="text-xs">ยังไม่มีข้อมูลการซื้อ</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Logs Table */}
            <div className="lg:col-span-2 glass-panel overflow-hidden flex flex-col">
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                <h3 className="text-lg font-bold text-white">ธุรกรรมล่าสุด</h3>
                <div className="flex gap-2">
                  <select 
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="glass-input px-3 py-1.5 text-[10px] font-bold uppercase"
                  >
                    <option value="all">ทั้งหมด</option>
                    <option value="topup">เติมเงิน</option>
                    <option value="purchase">ซื้อ VPN</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm text-left">
                  <thead className="bg-black/20 text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-white/10">
                    <tr>
                      <th className="px-6 py-4">ผู้ใช้</th>
                      <th className="px-6 py-4">ประเภท</th>
                      <th className="px-6 py-4">จำนวน</th>
                      <th className="px-6 py-4">เวลา</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredTransactions.slice(0, 10).map(tx => {
                      const amount = typeof tx.amount === 'object' ? tx.amount.amount : tx.amount;
                      return (
                        <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-white font-medium truncate max-w-[150px]">
                            {tx.userEmail || userMap[tx.userId] || tx.userId}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${tx.type === 'topup' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                              {tx.type === 'topup' ? 'เติมเงิน' : 'ซื้อ VPN'}
                            </span>
                          </td>
                          <td className={`px-6 py-4 font-bold ${amount > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                            {amount > 0 ? `+${amount}` : amount} ฿
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-[10px] font-mono">
                            {new Date(tx.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <section className="glass-panel p-5 md:p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-emerald-500/20 border border-emerald-500/30 p-3 rounded-2xl shadow-inner">
              <Settings className="w-6 h-6 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white drop-shadow-sm">ตั้งค่าการเงิน</h3>
              <p className="text-slate-300 text-sm">จัดการช่องทางการรับเงินและ API Keys</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="glass-panel p-5 space-y-4 bg-black/20 border-white/5">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest drop-shadow-sm">สถานะช่องทางชำระเงิน</h4>
                <div className="space-y-4">
                  {/* PromptPay Settings */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${paymentMethods.promptpay === 'open' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : paymentMethods.promptpay === 'maintenance' ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]' : 'bg-slate-600'}`} />
                      <span className="text-sm font-bold text-white">PromptPay / โอนเงิน</span>
                    </div>
                    <div className="flex gap-2">
                      {['open', 'closed', 'maintenance'].map((mode) => (
                        <button
                          key={mode}
                          onClick={() => handleSetMethodStatus('promptpay', mode)}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${
                            paymentMethods.promptpay === mode 
                              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                              : 'bg-black/20 border-white/10 text-slate-500 hover:border-white/20'
                          }`}
                        >
                          {mode === 'open' ? 'เปิด' : mode === 'closed' ? 'ปิด' : 'ปรับปรุง'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* TrueMoney Settings */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${paymentMethods.truemoney === 'open' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : paymentMethods.truemoney === 'maintenance' ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]' : 'bg-slate-600'}`} />
                      <span className="text-sm font-bold text-white">TrueMoney Wallet / อั่งเปา</span>
                    </div>
                    <div className="flex gap-2">
                      {['open', 'closed', 'maintenance'].map((mode) => (
                        <button
                          key={mode}
                          onClick={() => handleSetMethodStatus('truemoney', mode)}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${
                            paymentMethods.truemoney === mode 
                              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                              : 'bg-black/20 border-white/10 text-slate-500 hover:border-white/20'
                          }`}
                        >
                          {mode === 'open' ? 'เปิด' : mode === 'closed' ? 'ปิด' : 'ปรับปรุง'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">ชื่อบัญชีผู้รับเงิน</label>
                  <input 
                    placeholder="เช่น สมชาย ใจดี" 
                    value={paymentSettings.bankHolder}
                    onChange={e => setPaymentSettings(prev => ({ ...prev, bankHolder: e.target.value }))}
                    className="glass-input w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">EasySlip API Key</label>
                  <input 
                    type="password"
                    placeholder="v1_xxxxxxxxxxxx" 
                    value={paymentSettings.easySlipApiKey}
                    onChange={e => setPaymentSettings(prev => ({ ...prev, easySlipApiKey: e.target.value }))}
                    className="glass-input w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">DarkX API Key</label>
                  <input 
                    type="password"
                    placeholder="API Key จาก DarkX" 
                    value={paymentSettings.darkxApiKey}
                    onChange={e => setPaymentSettings(prev => ({ ...prev, darkxApiKey: e.target.value }))}
                    className="glass-input w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">เติมเงินขั้นต่ำ (บาท)</label>
                  <input 
                    type="number"
                    placeholder="50" 
                    value={paymentSettings.minTopup}
                    onChange={e => setPaymentSettings(prev => ({ ...prev, minTopup: Number(e.target.value) }))}
                    className="glass-input w-full"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">รูปภาพ QR Payment</label>
                <div className="flex flex-col gap-4">
                  {paymentSettings.paymentQrUrl ? (
                    <div className="relative w-40 h-40 group">
                      <img src={paymentSettings.paymentQrUrl} alt="QR" className="w-full h-full object-cover rounded-2xl border border-white/20 shadow-2xl" />
                      <button 
                        onClick={() => setPaymentSettings(prev => ({ ...prev, paymentQrUrl: '' }))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-40 h-40 border-2 border-dashed border-white/20 bg-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all">
                      <Upload className="w-8 h-8 text-slate-500" />
                      <span className="text-xs text-slate-500 font-bold">อัปโหลด QR</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                  )}
                </div>
              </div>

              <button 
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="w-full glass-button py-4 font-black uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {savingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                บันทึกการตั้งค่าทั้งหมด
              </button>
            </div>

            <div className="space-y-6">
              <div className="glass-panel p-8 bg-blue-600/10 border-blue-500/20 text-center space-y-4">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Activity className="w-8 h-8 text-blue-400" />
                </div>
                <h4 className="text-lg font-bold text-white">คำแนะนำการตั้งค่า</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  กรุณาตรวจสอบเบอร์ TrueMoney และ QR Code ให้ถูกต้องก่อนบันทึก ระบบตรวจสอบสลิป (EasySlip) จะทำงานอัตโนมัติเมื่อมีการอัปโหลดสลิปที่ถูกต้อง
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
