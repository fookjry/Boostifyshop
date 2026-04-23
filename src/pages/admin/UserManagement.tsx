import React, { useState, useEffect } from 'react';
import { Users, Search, Wallet, Plus, Trash2, ShieldAlert, Loader2, Settings, MoreVertical, UserCog, Key, Shield, Ban, CheckCircle2, Activity, Server, Filter, History, CreditCard, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../../firebase';

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

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users');
      // Format id properly from uid
      setUsers(response.data.map((u: any) => ({ ...u, id: u.uid })));
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // Refresh interval
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter || (!u.role && roleFilter === 'user');
    return matchesSearch && matchesRole;
  });

  const handleAddBalance = async () => {
    if (!showConfirm) return;
    const { userId, amount } = showConfirm;
    try {
      await axios.post(`/api/admin/users/${userId}/balance`, { amount });
      
      // Update local state optimistic
      setUsers(users.map(u => u.id === userId ? { ...u, balance: (u.balance || 0) + amount } : u));
      
      setShowConfirm(null);
      setAmounts(prev => ({ ...prev, [userId]: '' }));
    } catch (error) {
      console.error('Add balance failed:', error);
      alert('Failed to add balance');
    }
  };

  const viewUserVpns = async (userId: string, email: string) => {
    try {
      const response = await axios.get(`/api/admin/users/${userId}/vpns`);
      setUserVpns(response.data);
      setViewingUser({ id: userId, email });
    } catch (error) {
      console.error('Fetch user VPNs failed:', error);
    }
  };

  const deleteVpn = async (vpnId: string) => {
    try {
      await axios.delete(`/api/admin/vpns/${vpnId}`);
      setUserVpns(prev => prev.filter(v => v.id !== vpnId));
      setConfirmDeleteVpn(null);
    } catch (error) {
      console.error('Delete VPN failed:', error);
      alert('Failed to delete VPN');
    }
  };

  const resetTrial = async (userId: string) => {
    try {
      await axios.put(`/api/admin/users/${userId}`, { hasUsedTrial: false, lastTrialAt: null });
      setEditingUser((prev: any) => ({ ...prev, hasUsedTrial: false, lastTrialAt: null }));
      setUsers(users.map(u => u.id === userId ? { ...u, hasUsedTrial: false, lastTrialAt: null } : u));
    } catch (error) {
      console.error('Reset trial failed:', error);
      alert('Failed to reset trial');
    }
  };

  const resetAdClaim = async (userId: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      await axios.post(`/api/admin/users/${userId}/reset-ad-claim`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setEditingUser((prev: any) => ({ ...prev, lastAdClaimAt: null }));
    } catch (error: any) {
      console.error("Reset ad claim failed:", error);
      alert(error.response?.data?.error || "ไม่สามารถรีเซ็ตการรับสิทธิ์ได้");
    }
  };

  const handleUpdateUser = async (userId: string, data: any) => {
    setSavingUser(true);
    try {
      await axios.put(`/api/admin/users/${userId}`, data);
      const updatedUser = { ...editingUser, ...data };
      setEditingUser(updatedUser);
      setUsers(users.map(u => u.id === userId ? { ...u, ...data } : u));
    } catch (error) {
      console.error('Update user failed:', error);
      alert('Failed to update user');
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string | null) => {
    if (!userId) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await axios.delete(`/api/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.warning) {
        alert(response.data.warning);
      }
      
      setEditingUser(null);
      setConfirmDeleteUser(null);
    } catch (error: any) {
      console.error("Delete user failed:", error);
      alert(error.response?.data?.error || "ไม่สามารถลบผู้ใช้ได้");
    }
  };

  const [confirmDeleteUser, setConfirmDeleteUser] = useState<string | null>(null);

  return (
    <div className="space-y-6 md:space-y-8 pb-20 md:pb-0">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3 drop-shadow-md">
            <Users className="w-7 h-7 md:w-8 md:h-8 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" /> จัดการผู้ใช้
          </h1>
          <p className="text-slate-300 text-sm md:text-base">จัดการยอดเงินและ VPN ของผู้ใช้</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Link 
            to="/admin/transactions"
            className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all border border-white/10 backdrop-blur-sm"
          >
            <History className="w-4 h-4" /> ดู Transaction ล่าสุด
          </Link>
          <div className="relative w-full sm:w-auto">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="glass-input w-full sm:w-32 pl-10 pr-8 py-2.5 appearance-none"
            >
              <option value="all" className="bg-slate-900">ทั้งหมด</option>
              <option value="admin" className="bg-slate-900">Admin</option>
              <option value="user" className="bg-slate-900">User</option>
            </select>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              placeholder="ค้นหาผู้ใช้..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="glass-input w-full sm:w-64 pl-10 pr-4 py-2.5"
            />
          </div>
        </div>
      </header>

      {/* Desktop Table View */}
      <div className="hidden md:block glass-panel overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-black/20 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-white/10">
            <tr>
              <th className="px-6 py-4">อีเมลผู้ใช้</th>
              <th className="px-6 py-4">ยอดเงิน</th>
              <th className="px-6 py-4">บทบาท</th>
              <th className="px-6 py-4">สถานะ</th>
              <th className="px-6 py-4 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredUsers.map(u => (
              <tr key={u.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-slate-200 font-medium">{u.email}</td>
                <td className="px-6 py-4">
                  <span className="text-emerald-400 font-bold drop-shadow-[0_0_4px_rgba(52,211,153,0.5)]">{u.balance?.toLocaleString()} ฿</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${u.role === 'admin' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${u.status === 'suspended' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                    {u.status || 'active'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-3">
                    <Link 
                      to={`/admin/transactions?userId=${u.id}`}
                      className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors border border-transparent hover:border-emerald-500/30"
                      title="ดูธุรกรรม"
                    >
                      <CreditCard className="w-4 h-4" />
                    </Link>
                    <button 
                      onClick={() => viewUserVpns(u.id, u.email)}
                      className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors border border-transparent hover:border-blue-500/30"
                      title="ดู VPN"
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setEditingUser(u)}
                      className="p-2 text-slate-400 hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/20"
                      title="ตั้งค่า"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setConfirmDeleteUser(u.id)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                      title="ลบผู้ใช้"
                    >
                      <Trash2 className="w-4 h-4" />
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
          <div key={u.id} className="glass-panel p-5 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-white font-bold truncate max-w-[200px] drop-shadow-sm">{u.email}</p>
                <div className="flex gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${u.role === 'admin' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                    {u.role}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${u.status === 'suspended' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                    {u.status || 'active'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setEditingUser(u)}
                className="p-3 bg-white/5 rounded-xl text-slate-400 hover:text-white border border-white/10 backdrop-blur-sm"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t border-white/10">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">ยอดเงินคงเหลือ</p>
                <p className="text-xl font-bold text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">{u.balance?.toLocaleString()} ฿</p>
              </div>
              <div className="flex gap-2">
                <Link 
                  to={`/admin/transactions?userId=${u.id}`}
                  className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-bold border border-emerald-500/20"
                >
                  ธุรกรรม
                </Link>
                <button 
                  onClick={() => viewUserVpns(u.id, u.email)}
                  className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-xl text-xs font-bold border border-blue-500/20"
                >
                  ดู VPN
                </button>
                <button 
                  onClick={() => setConfirmDeleteUser(u.id)}
                  className="px-4 py-2 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold border border-red-500/20"
                >
                  ลบ
                </button>
              </div>
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
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setShowConfirm(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative glass-panel p-6 md:p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <Wallet className="w-7 h-7 md:w-8 md:h-8 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-2 drop-shadow-sm">ยืนยันการปรับยอดเงิน?</h3>
              <p className="text-slate-300 text-sm md:text-base mb-6">
                คุณกำลังจะปรับยอดเงินจำนวน <span className={`font-bold ${showConfirm.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{showConfirm.amount > 0 ? '+' : ''}{showConfirm.amount} ฿</span> ให้กับผู้ใช้
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowConfirm(null)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold transition-colors border border-white/10 backdrop-blur-sm"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleAddBalance}
                  className="flex-1 bg-blue-600/80 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-colors border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)] backdrop-blur-md"
                >
                  ยืนยัน
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
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setEditingUser(null)}
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative glass-panel w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-6 pb-10 md:p-8 shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col"
            >
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/20 rounded-full md:hidden mb-4" />
              <div className="flex justify-between items-center mb-6 shrink-0">
                <h3 className="text-xl font-bold text-white flex items-center gap-2 drop-shadow-sm">
                  <UserCog className="w-6 h-6 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" /> ตั้งค่าผู้ใช้
                </h3>
                <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white text-2xl transition-colors">×</button>
              </div>

              <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                {/* Quick Info */}
                <div className="bg-black/20 p-4 rounded-2xl border border-white/10 space-y-4 backdrop-blur-sm">
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1 drop-shadow-sm">อีเมลผู้ใช้</p>
                    <p className="text-white font-medium drop-shadow-sm">{editingUser.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2 drop-shadow-sm">สถานะทดลองใช้งาน</p>
                    {editingUser.hasUsedTrial ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 backdrop-blur-sm">
                        <Activity className="w-3.5 h-3.5" /> ใช้งานแล้ว ({new Date(editingUser.lastTrialAt).toLocaleDateString()})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ยังไม่ใช้งาน / รีเซ็ตแล้ว
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2 drop-shadow-sm">สิทธิ์ดูโฆษณา (ฟรี 6ชม.)</p>
                    {editingUser.lastAdClaimAt ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30 backdrop-blur-sm">
                        <Zap className="w-3.5 h-3.5" /> รับแล้ว ({new Date(editingUser.lastAdClaimAt).toLocaleDateString()})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm">
                        <CheckCircle2 className="w-3.5 h-3.5" /> พร้อมรับสิทธิ์
                      </span>
                    )}
                  </div>
                </div>

                {/* Balance Management */}
                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">จัดการยอดเงิน</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
                      <input 
                        type="number"
                        placeholder="0.00"
                        value={amounts[editingUser.id] || ''}
                        className="glass-input w-full pl-8 pr-4 py-3"
                        onChange={(e) => setAmounts(prev => ({ ...prev, [editingUser.id]: e.target.value }))}
                      />
                    </div>
                    <button 
                      onClick={() => {
                        const amt = parseFloat(amounts[editingUser.id] || '');
                        if (!isNaN(amt) && amt !== 0) setShowConfirm({ userId: editingUser.id, amount: amt });
                      }}
                      className="px-6 glass-button font-bold text-sm"
                    >
                      ตกลง
                    </button>
                  </div>
                </div>

                {/* Role & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">บทบาท</label>
                    <select 
                      value={editingUser.role}
                      onChange={(e) => handleUpdateUser(editingUser.id, { role: e.target.value })}
                      className="glass-input w-full p-3 appearance-none"
                    >
                      <option value="user" className="bg-slate-900">User</option>
                      <option value="admin" className="bg-slate-900">Admin</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">สถานะ</label>
                    <button 
                      onClick={() => handleUpdateUser(editingUser.id, { status: editingUser.status === 'suspended' ? 'active' : 'suspended' })}
                      className={`w-full p-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all border backdrop-blur-sm ${
                        editingUser.status === 'suspended' 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30' 
                          : 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30'
                      }`}
                    >
                      {editingUser.status === 'suspended' ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      {editingUser.status === 'suspended' ? 'ปลดระงับ' : 'ระงับการใช้งาน'}
                    </button>
                  </div>
                </div>

                {/* Other Actions */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  <button 
                    onClick={() => resetTrial(editingUser.id)}
                    disabled={!editingUser.hasUsedTrial}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all group border backdrop-blur-sm ${
                      editingUser.hasUsedTrial 
                        ? 'bg-white/5 border-white/10 hover:border-amber-500/50 cursor-pointer' 
                        : 'bg-emerald-500/10 border-emerald-500/20 cursor-not-allowed opacity-50'
                    }`}
                  >
                    {editingUser.hasUsedTrial ? (
                      <>
                        <Activity className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                        <span className="text-[10px] font-bold text-slate-400">รีเซ็ตทดลอง</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-2 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                        <span className="text-[10px] font-bold text-emerald-400">ทดลองพร้อมใช้</span>
                      </>
                    )}
                  </button>

                  <button 
                    onClick={() => resetAdClaim(editingUser.id)}
                    disabled={!editingUser.lastAdClaimAt}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all group border backdrop-blur-sm ${
                      editingUser.lastAdClaimAt 
                        ? 'bg-white/5 border-white/10 hover:border-orange-500/50 cursor-pointer' 
                        : 'bg-emerald-500/10 border-emerald-500/20 cursor-not-allowed opacity-50'
                    }`}
                  >
                    {editingUser.lastAdClaimAt ? (
                      <>
                        <Zap className="w-5 h-5 text-orange-400 mb-2 group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                        <span className="text-[10px] font-bold text-slate-400">รีเซ็ตสิทธิ์โฆษณา</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-2 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                        <span className="text-[10px] font-bold text-emerald-400">โฆษณาพร้อมใช้</span>
                      </>
                    )}
                  </button>

                  <button 
                    onClick={() => handleUpdateUser(editingUser.id, { role: editingUser.role === 'admin' ? 'user' : 'admin' })}
                    className="flex flex-col items-center justify-center p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-blue-500/50 transition-all group backdrop-blur-sm"
                  >
                    <UserCog className="w-5 h-5 text-blue-400 mb-2 group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <span className="text-[10px] font-bold text-slate-400">เปลี่ยนบทบาท</span>
                  </button>

                  <button 
                    onClick={() => setConfirmDeleteUser(editingUser.id)}
                    className="flex flex-col items-center justify-center p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-red-500/50 transition-all group backdrop-blur-sm"
                  >
                    <Trash2 className="w-5 h-5 text-red-400 mb-2 group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    <span className="text-[10px] font-bold text-slate-400">ลบผู้ใช้</span>
                  </button>
                </div>
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
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setConfirmDeleteUser(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative glass-panel p-6 md:p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-14 h-14 md:w-16 md:h-16 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <Trash2 className="w-7 h-7 md:w-8 md:h-8 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-2 drop-shadow-sm">ลบผู้ใช้?</h3>
              <p className="text-slate-300 text-sm md:text-base mb-6">การดำเนินการนี้ไม่สามารถย้อนกลับได้ และข้อมูลทั้งหมดของผู้ใช้จะหายไป</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmDeleteUser(null)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold transition-colors border border-white/10 backdrop-blur-sm"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={() => handleDeleteUser(confirmDeleteUser)}
                  className="flex-1 bg-red-600/80 hover:bg-red-500 text-white py-3 rounded-xl font-bold transition-colors border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)] backdrop-blur-md"
                >
                  ลบ
                </button>
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
              className="absolute inset-0 bg-black/60 backdrop-blur-md" 
              onClick={() => setViewingUser(null)} 
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative glass-panel w-full md:max-w-4xl rounded-t-[32px] md:rounded-3xl p-6 pb-10 md:p-8 shadow-2xl overflow-hidden max-h-[85dvh] flex flex-col"
            >
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/20 rounded-full md:hidden mb-4" />
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-white drop-shadow-sm">VPN ของ {viewingUser.email}</h2>
                  <p className="text-slate-300 text-xs md:text-sm">จัดการการตั้งค่าที่ใช้งานอยู่</p>
                </div>
                <button onClick={() => setViewingUser(null)} className="hidden md:block text-slate-400 hover:text-white text-3xl transition-colors">×</button>
              </div>
              
              <div className="overflow-y-auto flex-1 space-y-4 pr-2 custom-scrollbar">
                {userVpns.length ? userVpns.map(v => (
                  <div key={v.id} className="bg-black/20 p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group backdrop-blur-sm hover:bg-white/5 transition-colors">
                    <div className="space-y-1">
                      <p className="text-white font-bold flex items-center gap-2 drop-shadow-sm">
                        <Server className="w-4 h-4 text-blue-400 drop-shadow-[0_0_4px_rgba(59,130,246,0.5)]" />
                        {v.network} - {v.uuid.substring(0, 8)}...
                      </p>
                      <p className="text-[10px] md:text-xs text-slate-400 font-mono">หมดอายุ: {new Date(v.expireAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border backdrop-blur-sm ${v.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                        {v.status}
                      </div>
                      <button 
                        onClick={() => setConfirmDeleteVpn(v.id)}
                        className="p-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-black/20 rounded-full flex items-center justify-center border border-white/10 shadow-inner">
                      <ShieldAlert className="w-8 h-8 text-slate-500" />
                    </div>
                    <p className="text-slate-400 italic">ไม่พบ VPN สำหรับผู้ใช้นี้</p>
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
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setConfirmDeleteVpn(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative glass-panel p-6 md:p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-14 h-14 md:w-16 md:h-16 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <Trash2 className="w-7 h-7 md:w-8 md:h-8 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-2 drop-shadow-sm">ลบ VPN?</h3>
              <p className="text-slate-300 text-sm md:text-base mb-6">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmDeleteVpn(null)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold transition-colors border border-white/10 backdrop-blur-sm"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={() => deleteVpn(confirmDeleteVpn)}
                  className="flex-1 bg-red-600/80 hover:bg-red-500 text-white py-3 rounded-xl font-bold transition-colors border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)] backdrop-blur-md"
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
