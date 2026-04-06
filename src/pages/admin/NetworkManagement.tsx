import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Wifi, Plus, Trash2, Power, Edit, Loader2, Save, X, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

const COLORS = [
  { name: 'Emerald', value: 'emerald' },
  { name: 'Red', value: 'red' },
  { name: 'Blue', value: 'blue' },
  { name: 'Orange', value: 'orange' },
  { name: 'Purple', value: 'purple' },
  { name: 'Pink', value: 'pink' },
  { name: 'Indigo', value: 'indigo' },
  { name: 'Amber', value: 'amber' },
];

const NetworkForm = ({ data, setData, onSubmit, onCancel, title }: any) => (
  <form onSubmit={onSubmit} className="flex flex-col max-h-[75dvh]">
    <div className="space-y-6 overflow-y-auto pr-2 pb-4 custom-scrollbar">
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1">
        <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">ชื่อเครือข่าย</label>
        <input 
          placeholder="เช่น AIS, TRUE, DTAC" 
          value={data.name}
          onChange={e => setData({...data, name: e.target.value})}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none"
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Inbound ID</label>
        <input 
          type="number"
          placeholder="เช่น 1, 2, 3" 
          value={data.inboundId ?? ''}
          onChange={e => setData({...data, inboundId: e.target.value === '' ? '' : parseInt(e.target.value)})}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none"
          required
        />
      </div>
    </div>

    <div className="space-y-2">
      <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">สีประจำเครือข่าย</label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {COLORS.map(c => {
          const colorClasses: Record<string, string> = {
            emerald: 'bg-emerald-500 shadow-emerald-500/20',
            red: 'bg-red-500 shadow-red-500/20',
            blue: 'bg-blue-500 shadow-blue-500/20',
            orange: 'bg-orange-500 shadow-orange-500/20',
            purple: 'bg-purple-500 shadow-purple-500/20',
            pink: 'bg-pink-500 shadow-pink-500/20',
            indigo: 'bg-indigo-500 shadow-indigo-500/20',
            amber: 'bg-amber-500 shadow-amber-500/20',
          };
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => setData({...data, color: c.value})}
              className={`p-2 rounded-xl border transition-all flex items-center gap-2 ${data.color === c.value ? 'bg-slate-800 border-blue-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
            >
              <div className={`w-4 h-4 rounded-full shadow-lg ${colorClasses[c.value] || colorClasses.emerald}`} />
              <span className="text-[10px] text-white font-bold">{c.name}</span>
            </button>
          );
        })}
      </div>
    </div>
    </div>

    <div className="flex gap-4 pt-4 border-t border-slate-800 shrink-0 mt-2">
      <button 
        type="button"
        onClick={onCancel}
        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-colors"
      >
        ยกเลิก
      </button>
      <button 
        type="submit"
        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
      >
        <Save className="w-4 h-4" /> บันทึกเครือข่าย
      </button>
    </div>
  </form>
);

export function NetworkManagement() {
  const [networks, setNetworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNetwork, setEditingNetwork] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const initialNetworkState = {
    name: '',
    inboundId: 1,
    status: 'open',
    color: 'emerald'
  };

  const [newNetwork, setNewNetwork] = useState(initialNetworkState);

  useEffect(() => {
    const path = 'networks';
    const unsub = onSnapshot(collection(db, path), (snap) => {
      setNetworks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsub();
  }, []);

  const handleAddNetwork = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'networks';
    try {
      await addDoc(collection(db, path), { ...newNetwork, status: 'open' });
      setNewNetwork(initialNetworkState);
      setShowAddModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleUpdateNetwork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNetwork) return;
    const path = `networks/${editingNetwork.id}`;
    try {
      const { id, ...data } = editingNetwork;
      await updateDoc(doc(db, 'networks', id), data);
      setEditingNetwork(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const toggleNetwork = async (id: string, currentStatus: string) => {
    const path = `networks/${id}`;
    try {
      await updateDoc(doc(db, 'networks', id), {
        status: currentStatus === 'open' ? 'closed' : 'open'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteNetwork = async (id: string) => {
    const path = `networks/${id}`;
    try {
      await deleteDoc(doc(db, 'networks', id));
      setConfirmDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-20 md:pb-0">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Wifi className="w-7 h-7 md:w-8 md:h-8 text-blue-500" /> จัดการเครือข่าย
          </h1>
          <p className="text-slate-400 text-sm md:text-base">ตั้งค่าเครือข่ายและ Inbound ID สำหรับการซื้อ VPN</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-5 h-5" /> เพิ่มเครือข่ายใหม่
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {networks.map(n => {
          const color = n.color || 'emerald';
          const colorClasses: Record<string, string> = {
            emerald: n.status === 'open' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500',
            red: n.status === 'open' ? 'bg-red-500/10 text-red-500' : 'bg-red-500/10 text-red-500',
            blue: n.status === 'open' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500',
            orange: n.status === 'open' ? 'bg-orange-500/10 text-orange-500' : 'bg-red-500/10 text-red-500',
            purple: n.status === 'open' ? 'bg-purple-500/10 text-purple-500' : 'bg-red-500/10 text-red-500',
            pink: n.status === 'open' ? 'bg-pink-500/10 text-pink-500' : 'bg-red-500/10 text-red-500',
            indigo: n.status === 'open' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-red-500/10 text-red-500',
            amber: n.status === 'open' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500',
          };
          const glowClasses: Record<string, string> = {
            emerald: 'bg-emerald-500/5',
            red: 'bg-red-500/5',
            blue: 'bg-blue-500/5',
            orange: 'bg-orange-500/5',
            purple: 'bg-purple-500/5',
            pink: 'bg-pink-500/5',
            indigo: 'bg-indigo-500/5',
            amber: 'bg-amber-500/5',
          };

          return (
            <div key={n.id} className="bg-slate-900 p-5 md:p-6 rounded-3xl border border-slate-800 relative group overflow-hidden">
              <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl -mr-16 -mt-16 ${glowClasses[color] || glowClasses.emerald}`} />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center ${colorClasses[color] || colorClasses.emerald}`}>
                    <Wifi className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-white">{n.name}</h3>
                    <div className="flex items-center gap-2">
                      <Hash className="w-3 h-3 text-slate-500" />
                      <p className="text-[10px] md:text-xs text-slate-500 font-mono">Inbound ID: {n.inboundId}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2">
                  <button 
                    onClick={() => setEditingNetwork(n)}
                    className="p-2 bg-slate-800 text-slate-400 hover:text-blue-400 rounded-lg transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                  <button 
                    onClick={() => toggleNetwork(n.id, n.status)}
                    className={`p-2 rounded-lg transition-colors ${n.status === 'open' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
                  >
                    <Power className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                  <button 
                    onClick={() => setConfirmDelete(n.id)}
                    className="p-2 bg-slate-800 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-800 relative z-10">
                <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest">สถานะการขาย</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${n.status === 'open' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                  {n.status === 'open' ? 'เปิดการขาย' : 'ปิดการขาย'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
              onClick={() => setConfirmDelete(null)}
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
              <h3 className="text-lg md:text-xl font-bold text-white mb-2">ลบเครือข่าย?</h3>
              <p className="text-slate-400 text-sm md:text-base mb-6">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={() => deleteNetwork(confirmDelete)}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold transition-colors"
                >
                  ลบ
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {(showAddModal || editingNetwork) && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
              onClick={() => { setShowAddModal(false); setEditingNetwork(null); }}
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative bg-slate-900 p-6 pb-10 md:p-8 rounded-t-[32px] md:rounded-[40px] border-t md:border border-slate-800 max-w-md w-full shadow-2xl"
            >
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-800 rounded-full md:hidden mb-4" />
              {showAddModal ? (
                <NetworkForm 
                  title="เพิ่มเครือข่ายใหม่"
                  data={newNetwork}
                  setData={setNewNetwork}
                  onSubmit={handleAddNetwork}
                  onCancel={() => setShowAddModal(false)}
                />
              ) : (
                <NetworkForm 
                  title="แก้ไขเครือข่าย"
                  data={editingNetwork}
                  setData={setEditingNetwork}
                  onSubmit={handleUpdateNetwork}
                  onCancel={() => setEditingNetwork(null)}
                />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
