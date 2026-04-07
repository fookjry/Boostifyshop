import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, increment, addDoc, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Users, Search, Wallet, Plus, Trash2, ShieldAlert, Loader2, Settings, MoreVertical, UserCog, Key, Shield, Ban, CheckCircle2, Activity, Server, Filter, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { Link } from 'react-router-dom';

export function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [userVpns, setUserVpns] = useState<any[]>([]);
  const [amounts, setAmounts] = useState<{[key: string]: string}>({});
  const [showConfirm, setShowConfirm] = useState<{ userId: string, amount: number } | null>(null);
  const [confirmDeleteVpn, setConfirmDeleteVpn] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [savingUser, setSavingUser] = useState(false);

  useEffect(() => {
    const path = 'users';
    const unsub = onSnapshot(collection(db, path), (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsub();
  }, []);

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter || (!u.role && roleFilter === 'user');
    return matchesSearch && matchesRole;
  });

  const handleAddBalance = async () => {
    if (!showConfirm) return;
    const { userId, amount } = showConfirm;
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, 'users', userId), {
        balance: increment(amount)
      });
      await addDoc(collection(db, 'transactions'), {
        userId,
        amount: amount,
        type: 'topup',
        timestamp: new Date().toISOString(),
        note: `แอดมินปรับยอดเงินด้วยตนเอง (${amount > 0 ? '+' : ''}${amount})`
      });
      setShowConfirm(null);
      setAmounts(prev => ({ ...prev, [userId]: '' }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const viewUserVpns = (userId: string, email: string) => {
    const q = query(collection(db, 'vpns'), where('userId', '==', userId));
    onSnapshot(q, (snap) => {
      setUserVpns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setViewingUser({ id: userId, email });
    });
  };

  const deleteVpn = async (vpnId: string) => {
    const path = `vpns/${vpnId}`;
    try {
      await deleteDoc(doc(db, 'vpns', vpnId));
      setUserVpns(prev => prev.filter(v => v.id !== vpnId));
      setConfirmDeleteVpn(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const resetTrial = async (userId: string) => {
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, 'users', userId), {
        hasUsedTrial: false,
        lastTrialAt: null
      });
      setEditingUser((prev: any) => ({ ...prev, hasUsedTrial: false, lastTrialAt: null }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleUpdateUser = async (userId: string, data: any) => {
    setSavingUser(true);
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, 'users', userId), data);
      setEditingUser(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const path = `users/${userId}`;
    try {
      await deleteDoc(doc(db, 'users', userId));
      setEditingUser(null);
      setConfirmDeleteUser(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const [confirmDeleteUser, setConfirmDeleteUser] = useState<string | null>(null);

  return (
    <div className="space-y-6 md:space-y-8 pb-20 md:pb-0">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7 md:w-8 md:h-8 text-blue-500" /> จัดการผู้ใช้
          </h1>
          <p className="text-slate-400 text-sm md:text-base">จัดการยอดเงินและ VPN ของผู้ใช้</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Link 
            to="/admin/transactions"
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border border-slate-700"
          >
            <History className="w-4 h-4" /> ดู Transaction ล่าสุด
          </Link>
          <div className="relative w-full sm:w-auto">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="w-full sm:w-32 bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-8 py-2.5 text-sm text-white focus:border-blue-500 outline-none transition-colors appearance-none"
            >
              <option value="all">ทั้งหมด</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              placeholder="ค้นหาผู้ใช้..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-64 bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none transition-colors"
            />
          </div>
        </div>
      </header>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] font-black tracking-widest">
            <tr>
              <th className="px-6 py-4">อีเมลผู้ใช้</th>
              <th className="px-6 py-4">ยอดเงิน</th>
              <th className="px-6 py-4">บทบาท</th>
              <th className="px-6 py-4">สถานะ</th>
              <th className="px-6 py-4 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredUsers.map(u => (
              <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4 text-slate-300 font-medium">{u.email}</td>
                <td className="px-6 py-4">
                  <span className="text-emerald-400 font-bold">{u.balance?.toLocaleString()} ฿</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${u.role === 'admin' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-500'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${u.status === 'suspended' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {u.status || 'active'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-3">
                    <button 
                      onClick={() => viewUserVpns(u.id, u.email)}
                      className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                      title="ดู VPN"
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setEditingUser(u)}
                      className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="ตั้งค่า"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-4">
        {filteredUsers.map(u => (
          <div key={u.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-white font-bold truncate max-w-[200px]">{u.email}</p>
                <div className="flex gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${u.role === 'admin' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-500'}`}>
                    {u.role}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${u.status === 'suspended' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {u.status || 'active'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setEditingUser(u)}
                className="p-3 bg-slate-800 rounded-xl text-slate-400 hover:text-white"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">ยอดเงินคงเหลือ</p>
                <p className="text-xl font-bold text-emerald-400">{u.balance?.toLocaleString()} ฿</p>
              </div>
              <button 
                onClick={() => viewUserVpns(u.id, u.email)}
                className="px-4 py-2 bg-blue-600/10 text-blue-500 rounded-xl text-xs font-bold"
              >
                ดู VPN
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Modals */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
              onClick={() => setShowConfirm(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-800 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-7 h-7 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-2">ยืนยันการปรับยอดเงิน?</h3>
              <p className="text-slate-400 text-sm md:text-base mb-6">
                คุณกำลังจะปรับยอดเงินจำนวน <span className={`font-bold ${showConfirm.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{showConfirm.amount > 0 ? '+' : ''}{showConfirm.amount} ฿</span> ให้กับผู้ใช้
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowConfirm(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleAddBalance}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-colors"
                >
                  ยืนยัน
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {confirmDeleteUser && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
              onClick={() => setConfirmDeleteUser(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-800 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-14 h-14 md:w-16 md:h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-2">ลบผู้ใช้?</h3>
              <p className="text-slate-400 text-sm md:text-base mb-6">การดำเนินการนี้ไม่สามารถย้อนกลับได้ และข้อมูลทั้งหมดของผู้ใช้จะหายไป</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmDeleteUser(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={() => handleDeleteUser(confirmDeleteUser)}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold transition-colors"
                >
                  ลบ
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {editingUser && (
          <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
              onClick={() => setEditingUser(null)}
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative bg-slate-900 w-full md:max-w-md rounded-t-3xl md:rounded-3xl border-t md:border border-slate-800 p-6 pb-10 md:p-8 shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6 shrink-0">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <UserCog className="w-6 h-6 text-blue-500" /> ตั้งค่าผู้ใช้
                </h3>
                <button onClick={() => setEditingUser(null)} className="text-slate-500 hover:text-white text-2xl">×</button>
              </div>

              <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                {/* Quick Info */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">อีเมลผู้ใช้</p>
                    <p className="text-white font-medium">{editingUser.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">สถานะทดลองใช้งาน</p>
                    {editingUser.hasUsedTrial ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        <Activity className="w-3.5 h-3.5" /> ใช้งานแล้ว
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ยังไม่ใช้งาน / รีเซ็ตแล้ว
                      </span>
                    )}
                  </div>
                </div>

                {/* Balance Management */}
                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">จัดการยอดเงิน</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">฿</span>
                      <input 
                        type="number"
                        placeholder="0.00"
                        value={amounts[editingUser.id] || ''}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-3 text-sm text-white focus:border-blue-500 outline-none"
                        onChange={(e) => setAmounts(prev => ({ ...prev, [editingUser.id]: e.target.value }))}
                      />
                    </div>
                    <button 
                      onClick={() => {
                        const amt = parseFloat(amounts[editingUser.id] || '');
                        if (!isNaN(amt) && amt !== 0) setShowConfirm({ userId: editingUser.id, amount: amt });
                      }}
                      className="px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-colors"
                    >
                      ตกลง
                    </button>
                  </div>
                </div>

                {/* Role & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">บทบาท</label>
                    <select 
                      value={editingUser.role}
                      onChange={(e) => handleUpdateUser(editingUser.id, { role: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">สถานะ</label>
                    <button 
                      onClick={() => handleUpdateUser(editingUser.id, { status: editingUser.status === 'suspended' ? 'active' : 'suspended' })}
                      className={`w-full p-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                        editingUser.status === 'suspended' 
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-500 border border-red-500/20'
                      }`}
                    >
                      {editingUser.status === 'suspended' ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      {editingUser.status === 'suspended' ? 'ปลดระงับ' : 'ระงับการใช้งาน'}
                    </button>
                  </div>
                </div>

                {/* Other Actions */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                  <button 
                    onClick={() => resetTrial(editingUser.id)}
                    disabled={!editingUser.hasUsedTrial}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all group ${
                      editingUser.hasUsedTrial 
                        ? 'bg-slate-950 border border-slate-800 hover:border-amber-500/50 cursor-pointer' 
                        : 'bg-emerald-500/5 border border-emerald-500/20 cursor-not-allowed'
                    }`}
                  >
                    {editingUser.hasUsedTrial ? (
                      <>
                        <Activity className="w-5 h-5 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold text-slate-400">รีเซ็ตทดลอง</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" />
                        <span className="text-[10px] font-bold text-emerald-500">พร้อมใช้งานแล้ว</span>
                      </>
                    )}
                  </button>
                    <button 
                      onClick={() => setConfirmDeleteUser(editingUser.id)}
                      className="flex flex-col items-center justify-center p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-red-500/50 transition-colors group"
                    >
                      <Trash2 className="w-5 h-5 text-red-500 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold text-slate-400">ลบผู้ใช้</span>
                    </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VPNs Modal */}
      <AnimatePresence>
        {viewingUser && (
          <div className="fixed inset-0 z-[160] flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" 
              onClick={() => setViewingUser(null)} 
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative bg-slate-900 w-full md:max-w-4xl rounded-t-[32px] md:rounded-3xl border-t md:border border-slate-800 p-6 pb-10 md:p-8 shadow-2xl overflow-hidden max-h-[85dvh] flex flex-col"
            >
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-800 rounded-full md:hidden mb-4" />
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-white">VPN ของ {viewingUser.email}</h2>
                  <p className="text-slate-400 text-xs md:text-sm">จัดการการตั้งค่าที่ใช้งานอยู่</p>
                </div>
                <button onClick={() => setViewingUser(null)} className="hidden md:block text-slate-500 hover:text-white text-3xl">×</button>
              </div>
              
              <div className="overflow-y-auto flex-1 space-y-4 pr-2 custom-scrollbar">
                {userVpns.length ? userVpns.map(v => (
                  <div key={v.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group">
                    <div className="space-y-1">
                      <p className="text-white font-bold flex items-center gap-2">
                        <Server className="w-4 h-4 text-blue-500" />
                        {v.network} - {v.uuid.substring(0, 8)}...
                      </p>
                      <p className="text-[10px] md:text-xs text-slate-500">หมดอายุ: {new Date(v.expireAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${v.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {v.status}
                      </div>
                      <button 
                        onClick={() => setConfirmDeleteVpn(v.id)}
                        className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center border border-slate-800">
                      <ShieldAlert className="w-8 h-8 text-slate-700" />
                    </div>
                    <p className="text-slate-500 italic">ไม่พบ VPN สำหรับผู้ใช้นี้</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {confirmDeleteVpn && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
              onClick={() => setConfirmDeleteVpn(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-800 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-14 h-14 md:w-16 md:h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-2">ลบ VPN?</h3>
              <p className="text-slate-400 text-sm md:text-base mb-6">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmDeleteVpn(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={() => deleteVpn(confirmDeleteVpn)}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold transition-colors"
                >
                  ลบ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
