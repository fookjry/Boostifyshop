import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { CreditCard, TrendingUp, TrendingDown, Activity, DollarSign, Settings, Save, Loader2, Upload, Trash2, User, X } from 'lucide-react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { doc, setDoc, getDoc, limitToLast } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../../firebase';

export function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const userIdFilter = searchParams.get('userId');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [userMap, setUserMap] = useState<{ [key: string]: string }>({});
  const [stats, setStats] = useState({ totalTopup: 0, totalPurchase: 0, totalRevenue: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'analysis' | 'settings' | 'manual'>('analysis');
  const [paymentSettings, setPaymentSettings] = useState({ trueMoneyNumber: '', paymentQrUrl: '', bankHolder: '', minTopup: 50, easySlipApiKey: '', darkxApiKey: '' });
  const [paymentMethods, setPaymentMethods] = useState<{ promptpay: string; truemoney: string; manual: string }>({ promptpay: 'open', truemoney: 'open', manual: 'open' });

  const [savingSettings, setSavingSettings] = useState(false);
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [manualTopups, setManualTopups] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{ type: 'approve' | 'reject', id: string, amount?: number } | null>(null);
  const [rejectReason, setRejectReason] = useState('ยอดเงินไม่ถูกต้อง / สลิปไม่ถูกต้อง');

  useEffect(() => {
    // Other query logic
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
          truemoney: data.truemoney || 'open',
          manual: data.manual || 'open'
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

    const unsubManual = onSnapshot(query(collection(db, 'manual_topups'), orderBy('createdAt', 'desc'), limit(100)), (snap) => {
      setManualTopups(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsub();
      unsubSettings();
      unsubKeys();
      unsubMethods();
      unsubUsers();
      unsubManual();
    };
  }, []);

  const handleSetMethodStatus = async (method: 'promptpay' | 'truemoney' | 'manual', status: string) => {
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

  const [processingId, setProcessingId] = useState<string | null>(null);

  const confirmAction = async () => {
    if (!actionModal) return;
    const { type, id, amount } = actionModal;
    setProcessingId(id);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (type === 'approve') {
        await axios.post('/api/admin/topup/manual/approve', { id, amount }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        await axios.post('/api/admin/topup/manual/reject', { id, reason: rejectReason }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      setActionModal(null);
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setProcessingId(null);
      setSelectedImage(null);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-20 md:pb-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3 drop-shadow-md">
            <Activity className="w-7 h-7 md:w-8 md:h-8 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" /> กิจกรรมล่าสุด
          </h1>
          <p className="text-slate-300 text-sm md:text-base">ตรวจสอบกิจกรรมและประวัติธุรกรรมทั้งหมดในระบบ</p>
        </div>
      </header>

        <section className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 drop-shadow-sm">
            <CreditCard className="w-6 h-6 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" /> แจ้งโอนเงิน (รอยืนยัน)
          </h2>

          <div className="glass-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-black/40 text-slate-400 border-b border-white/10 font-black tracking-widest">
                  <tr>
                    <th className="px-6 py-4">เวลา</th>
                    <th className="px-6 py-4">ผู้ใช้</th>
                    <th className="px-6 py-4 text-right">ยอดเงิน</th>
                    <th className="px-6 py-4 text-center">สลิป</th>
                    <th className="px-6 py-4">สถานะ</th>
                    <th className="px-6 py-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {manualTopups.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic font-bold">ไม่มีรายการแจ้งโอนเงิน</td>
                    </tr>
                  ) : (
                    manualTopups.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-xs">
                          {new Date(tx.createdAt).toLocaleString('th-TH')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {tx.userEmail}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-amber-400">
                          {tx.amount} ฿
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button 
                            onClick={() => setSelectedImage(tx.slipImage)}
                            className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-3 py-1 rounded-lg transition-colors text-xs font-bold"
                          >
                            ดูสลิป
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                            tx.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                            tx.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {tx.status === 'pending' ? (
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => setActionModal({ type: 'approve', id: tx.id, amount: tx.amount })}
                                disabled={processingId === tx.id}
                                className="bg-emerald-600/80 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg transition-all font-bold text-xs disabled:opacity-50"
                              >
                                {processingId === tx.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'อนุมัติ'}
                              </button>
                              <button 
                                onClick={() => { setRejectReason(''); setActionModal({ type: 'reject', id: tx.id }); }}
                                disabled={processingId === tx.id}
                                className="bg-red-600/80 hover:bg-red-500 text-white px-3 py-1 rounded-lg transition-all font-bold text-xs disabled:opacity-50"
                              >
                                {processingId === tx.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ปฏิเสธ'}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">ดำเนินการแล้ว</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 drop-shadow-sm">
            <Activity className="w-6 h-6 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" /> ประวัติธุรกรรมทั้งหมด
          </h2>

          <div className="glass-panel overflow-hidden">
            <div className="p-4 border-b border-white/10 flex gap-4">
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500/50 transition-all"
              >
                <option value="all">ทุกประเภท</option>
                <option value="topup">เติมเงิน</option>
                <option value="purchase">ซื้อบริการ</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-black/40 text-slate-400 border-b border-white/10 font-black tracking-widest">
                  <tr>
                    <th className="px-6 py-4">เวลา</th>
                    <th className="px-6 py-4">ผู้ใช้</th>
                    <th className="px-6 py-4">ประเภท</th>
                    <th className="px-6 py-4">หมายเหตุ</th>
                    <th className="px-6 py-4 text-right">จำนวน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic font-bold">ไม่พบประวัติธุรกรรม</td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx: any) => {
                      const amount = typeof tx.amount === 'object' ? (tx.amount.amount || 0) : (Number(tx.amount) || 0);
                      return (
                        <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-xs">
                            {new Date(tx.timestamp).toLocaleString('th-TH')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {tx.userEmail || userMap[tx.userId] || tx.userId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap uppercase text-[10px]">
                            <span className={`px-2 py-1 rounded border ${tx.type === 'topup' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap italic text-slate-400">
                            {tx.note || '-'}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-right font-bold ${amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {amount >= 0 ? `+${amount}` : amount} ฿
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative max-w-2xl w-full bg-slate-900 border border-white/10 rounded-2xl p-2 shadow-2xl">
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-4 -right-4 bg-red-500 text-white p-2 rounded-full cursor-pointer hover:bg-red-400 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={selectedImage} alt="Slip" className="w-full h-auto max-h-[80vh] object-contain rounded-xl" />
          </div>
        </div>
      )}

      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-center">
          <div className="relative max-w-md w-full bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">
              {actionModal.type === 'approve' ? 'ยืนยันการอนุมัติ' : 'ยืนยันการปฏิเสธ'}
            </h3>
            
            {actionModal.type === 'approve' ? (
              <p className="text-slate-300 mb-6 font-medium">คุณต้องการอนุมัติยอดเงิน <span className="text-amber-400 font-bold">{actionModal.amount} ฿</span> หรือไม่?</p>
            ) : (
              <div className="mb-6 space-y-2">
                <label className="text-left block text-sm text-slate-300 font-bold">ระบุเหตุผลการปฏิเสธ:</label>
                <input 
                  type="text"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="เช่น ยอดเงินไม่ถูกต้อง / สลิปไม่ตรง"
                  className="w-full bg-black/50 border border-white/10 py-2 px-3 rounded-xl text-white outline-none focus:border-red-500/50 transition-colors"
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActionModal(null)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold transition-all"
              >
                ยกเลิก
              </button>
              <button 
                onClick={confirmAction}
                disabled={actionModal.type === 'reject' && !rejectReason.trim()}
                className={`flex-1 py-3 rounded-xl font-bold transition-all disabled:opacity-50 text-white ${
                  actionModal.type === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                ยืนยันการทำรายการ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
