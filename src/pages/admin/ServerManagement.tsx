import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Server, Plus, Trash2, Power, Settings, Edit, Loader2, Save, X, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ServerForm = ({ data, setData, onSubmit, onCancel, title, isSaving }: any) => {
  return (
    <form onSubmit={onSubmit} className="flex flex-col max-h-[75dvh]">
      <div className="space-y-6 overflow-y-auto pr-2 pb-4 custom-scrollbar">
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">ชื่อเซิร์ฟเวอร์</label>
            <input 
              placeholder="Singapore Premium" 
              value={data.name}
              onChange={e => setData({...data, name: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Host IP/Domain</label>
            <input 
              placeholder="1.2.3.4" 
              value={data.host}
              onChange={e => setData({...data, host: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">พอร์ต (Port)</label>
            <input 
              type="number" 
              value={data.port ?? ''}
              onChange={e => setData({...data, port: e.target.value === '' ? '' : parseInt(e.target.value)})}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">ผู้ใช้สูงสุด</label>
            <input 
              type="number" 
              value={data.maxUsers ?? ''}
              onChange={e => setData({...data, maxUsers: e.target.value === '' ? '' : parseInt(e.target.value)})}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">ผู้ใช้ 3x-ui</label>
            <input 
              value={data.username}
              onChange={e => setData({...data, username: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">รหัสผ่าน 3x-ui</label>
            <input 
              type="password" 
              value={data.password}
              onChange={e => setData({...data, password: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">คำอธิบาย (สูงสุด 100 คำ)</label>
          <textarea 
            placeholder="คำอธิบายสั้นๆ เกี่ยวกับเซิร์ฟเวอร์..." 
            value={data.description || ''}
            onChange={e => setData({...data, description: e.target.value})}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white h-24 resize-none"
            maxLength={500}
          />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">ราคา (บาท)</label>
            <span className="text-[10px] text-slate-600 font-bold italic">* ใส่ 0 เพื่อปิดการขาย</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {[1, 3, 7, 15, 30].map(days => (
              <div key={days} className="space-y-1">
                <label className="text-[10px] text-slate-500 block text-center">{days} วัน</label>
                <input 
                  type="number" 
                  value={data.prices?.[days] ?? ''}
                  onChange={e => setData({
                    ...data, 
                    prices: { ...(data.prices || {}), [days]: e.target.value === '' ? 0 : parseInt(e.target.value) }
                  })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white text-center"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-4 border-t border-slate-800 shrink-0 mt-2">
        <button 
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-colors"
        >
          ยกเลิก
        </button>
        <button 
          type="submit"
          disabled={isSaving}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
          {isSaving ? "กำลังบันทึก..." : "บันทึกเซิร์ฟเวอร์"}
        </button>
      </div>
    </form>
  );
};

export function ServerManagement() {
  const [servers, setServers] = useState<any[]>([]);
  const [vpns, setVpns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingServer, setEditingServer] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const initialServerState = {
    name: '',
    host: '',
    port: 443,
    maxUsers: 100,
    username: '',
    password: '',
    description: '',
    supportedAppIcons: [],
    generalUsageIcons: [],
    prices: {
      1: 5,
      3: 15,
      7: 30,
      15: 60,
      30: 100
    }
  };

  const [newServer, setNewServer] = useState(initialServerState);
  const [isSaving, setIsSaving] = useState(false);

  const fetchServers = async () => {
    try {
      const response = await axios.get('/api/admin/servers');
      // Remove parsing of removed icon fields, they are unused and empty now.
      const parsedData = response.data.map((s: any) => {
        let prices = {};
        try {
          prices = typeof s.prices === 'string' ? JSON.parse(s.prices) : s.prices;
        } catch (e) {}

        return {
          ...s,
          prices,
          supportedAppIcons: [],
          generalUsageIcons: []
        };
      });
      setServers(parsedData);
    } catch (error) {
      console.error('Failed to fetch servers', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVpns = async () => {
    try {
      const response = await axios.get('/api/admin/vpns');
      const now = new Date();
      setVpns(response.data.filter((v: any) => new Date(v.expireAt) > now));
    } catch (error) {
      console.error('Failed to fetch VPNs', error);
    }
  };

  useEffect(() => {
    fetchServers();
    fetchVpns();
  }, []);

  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);
    try {
      // Set to empty string/array to avoid large bloat since we removed the feature
      const serverPayload = {
        ...newServer,
        supportedAppIcons: '[]',
        generalUsageIcons: '[]',
        status: 'online'
      };
      await axios.post('/api/admin/servers', serverPayload);
      setNewServer(initialServerState);
      setShowAddModal(false);
      await fetchServers();
      alert('บันทึกข้อมูลเซิร์ฟเวอร์เรียบร้อยแล้ว');
    } catch (error: any) {
      console.error('Failed to create server', error);
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServer) return;

    // Check for base64 / invalid icons
    setIsSaving(true);
    try {
      const { id, ...data } = editingServer;
      const serverPayload = {
        ...data,
        supportedAppIcons: '[]',
        generalUsageIcons: '[]',
      };
      await axios.put(`/api/admin/servers/${id}`, serverPayload);
      setEditingServer(null);
      await fetchServers();
      alert('อัปเดตข้อมูลเซิร์ฟเวอร์เรียบร้อยแล้ว');
    } catch (error: any) {
      console.error('Failed to update server', error);
      alert('เกิดข้อผิดพลาดในการอัปเดต: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleServer = async (server: any) => {
    try {
      await axios.put(`/api/admin/servers/${server.id}`, {
        ...server,
        status: server.status === 'online' ? 'offline' : 'online',
        supportedAppIcons: '[]',
        generalUsageIcons: '[]',
      });
      fetchServers();
    } catch (error) {
      console.error('Failed to toggle server', error);
    }
  };

  const deleteServer = async (id: string) => {
    try {
      await axios.delete(`/api/admin/servers/${id}`);
      setConfirmDelete(null);
      fetchServers();
    } catch (error) {
      console.error('Failed to delete server', error);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-20 md:pb-0">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3 drop-shadow-md">
            <Server className="w-7 h-7 md:w-8 md:h-8 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" /> จัดการเซิร์ฟเวอร์
          </h1>
          <p className="text-slate-300 text-sm md:text-base">ตั้งค่าเซิร์ฟเวอร์ VPN และราคาแต่ละรายการ</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="w-full md:w-auto glass-button px-6 py-3 font-bold flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> เพิ่มเซิร์ฟเวอร์ใหม่
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {servers.map(s => (
          <div key={s.id} className="glass-panel p-5 md:p-6 relative group hover:bg-white/5 transition-colors">
            <div className="flex justify-center items-center gap-2 mb-4">
              <button 
                onClick={async () => {
                  try {
                    // Fetch complete server details including credentials gracefully
                    const res = await axios.get('/api/admin/servers');
                    const fullServer = res.data.find((x: any) => x.id === s.id) || s;
                    setEditingServer({
                      ...fullServer,
                      prices: fullServer.prices || initialServerState.prices
                    });
                  } catch (error) {
                    console.error("Failed to load credentials", error);
                    setEditingServer({
                      ...s,
                      username: '',
                      password: '',
                      prices: s.prices || initialServerState.prices
                    });
                  }
                }}
                className="p-2 bg-black/20 text-slate-400 hover:text-blue-400 rounded-lg transition-colors border border-transparent hover:border-blue-500/30 backdrop-blur-sm"
              >
                <Edit className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
              <button 
                onClick={() => toggleServer(s)}
                className={`p-2 rounded-lg transition-colors border backdrop-blur-sm ${s.status === 'online' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30'}`}
              >
                <Power className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
              <button 
                onClick={() => setConfirmDelete(s.id)}
                className="p-2 bg-black/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-500/30 backdrop-blur-sm"
              >
                <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
            </div>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center border shadow-inner ${s.status === 'online' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                  <Server className="w-5 h-5 md:w-6 md:h-6 drop-shadow-[0_0_8px_rgba(currentColor,0.5)]" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-bold text-white truncate max-w-[150px] sm:max-w-none drop-shadow-sm">{s.name}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] md:text-xs text-slate-400 font-mono">{s.host}:{s.port}</p>
                    <span className="hidden sm:inline text-slate-600">•</span>
                    <p className="text-[9px] md:text-[10px] font-black text-blue-400 uppercase tracking-widest drop-shadow-sm">
                      {s.currentUsers || 0} / {s.maxUsers || '∞'} ผู้ใช้งาน
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {s.description && (
              <p className="text-xs md:text-sm text-slate-300 mb-4 line-clamp-2">{s.description}</p>
            )}

            <div className="grid grid-cols-5 gap-1.5 md:gap-2 pt-4 border-t border-white/10">
              {Object.entries(s.prices || {}).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([days, price]: any) => (
                <div key={days} className="text-center">
                  <p className="text-[9px] md:text-[10px] text-slate-400 uppercase font-black">{days}d</p>
                  <p className="text-xs md:text-sm font-bold text-white drop-shadow-sm">{price}฿</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modals */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setConfirmDelete(null)}
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
              <h3 className="text-lg md:text-xl font-bold text-white mb-2 drop-shadow-sm">ลบเซิร์ฟเวอร์?</h3>
              <p className="text-slate-300 text-sm md:text-base mb-6">การดำเนินการนี้ไม่สามารถย้อนกลับได้ การตั้งค่าทั้งหมดสำหรับเซิร์ฟเวอร์นี้จะยังคงอยู่ แต่เซิร์ฟเวอร์จะถูกลบออกจากรายการ</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold transition-colors border border-white/10 backdrop-blur-sm"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={() => deleteServer(confirmDelete)}
                  className="flex-1 bg-red-600/80 hover:bg-red-500 text-white py-3 rounded-xl font-bold transition-colors border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)] backdrop-blur-md"
                >
                  ลบ
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {(showAddModal || editingServer) && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => { setShowAddModal(false); setEditingServer(null); }}
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative glass-panel p-6 pb-10 md:p-8 rounded-t-[32px] md:rounded-[40px] max-w-2xl w-full shadow-2xl"
            >
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/20 rounded-full md:hidden mb-4" />
              {showAddModal ? (
                <ServerForm 
                  title="เพิ่มเซิร์ฟเวอร์ใหม่"
                  data={newServer}
                  setData={setNewServer}
                  onSubmit={handleAddServer}
                  onCancel={() => setShowAddModal(false)}
                  isSaving={isSaving}
                />
              ) : (
                <ServerForm 
                  title="แก้ไขเซิร์ฟเวอร์"
                  data={editingServer}
                  setData={setEditingServer}
                  onSubmit={handleUpdateServer}
                  onCancel={() => setEditingServer(null)}
                  isSaving={isSaving}
                />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
