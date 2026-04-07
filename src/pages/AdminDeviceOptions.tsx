import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Shield, Plus, Edit2, Trash2, Check, X, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export function AdminDeviceOptions() {
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOption, setEditingOption] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    count: 1,
    price: 0,
    status: true,
    sortOrder: 0
  });

  useEffect(() => {
    const q = query(collection(db, 'device_options'), orderBy('sortOrder', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setOptions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'device_options');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const dataToSave = {
        count: Number(formData.count),
        price: Number(formData.price),
        status: formData.status,
        sortOrder: Number(formData.sortOrder),
        updatedAt: new Date().toISOString()
      };

      if (editingOption) {
        await updateDoc(doc(db, 'device_options', editingOption.id), dataToSave);
      } else {
        await addDoc(collection(db, 'device_options'), {
          ...dataToSave,
          createdAt: new Date().toISOString()
        });
      }

      setShowModal(false);
      setEditingOption(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบตัวเลือกนี้?')) return;
    try {
      await deleteDoc(doc(db, 'device_options', id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openModal = (option: any = null) => {
    if (option) {
      setEditingOption(option);
      setFormData({
        count: option.count,
        price: option.price,
        status: option.status,
        sortOrder: option.sortOrder
      });
    } else {
      setEditingOption(null);
      setFormData({
        count: 1,
        price: 0,
        status: true,
        sortOrder: options.length
      });
    }
    setError('');
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 drop-shadow-md">
            <Shield className="w-6 h-6 text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.5)]" />
            จัดการจำนวนอุปกรณ์
          </h1>
          <p className="text-slate-300 text-sm">ตั้งค่าตัวเลือกและราคาสำหรับจำนวนอุปกรณ์ที่ใช้งานได้</p>
        </div>
        <button
          onClick={() => openModal()}
          className="glass-button px-4 py-2 text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> เพิ่มตัวเลือก
        </button>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-black/40 text-slate-400 text-sm backdrop-blur-md">
              <tr>
                <th className="p-4 font-medium">ลำดับ</th>
                <th className="p-4 font-medium">จำนวนอุปกรณ์</th>
                <th className="p-4 font-medium">ราคาเพิ่ม (บาท)</th>
                <th className="p-4 font-medium">สถานะ</th>
                <th className="p-4 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {options.map((option) => (
                <tr key={option.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-slate-300">{option.sortOrder}</td>
                  <td className="p-4 text-white font-medium drop-shadow-sm">{option.count} เครื่อง</td>
                  <td className="p-4 text-emerald-400 font-medium drop-shadow-sm">+{option.price}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${option.status ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                      {option.status ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openModal(option)}
                        className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors border border-transparent hover:border-blue-500/30"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(option.id)}
                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {options.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    ยังไม่มีข้อมูลตัวเลือก
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative glass-panel p-6 w-full max-w-md shadow-2xl"
          >
            <h3 className="text-xl font-bold text-white mb-4 drop-shadow-sm">
              {editingOption ? 'แก้ไขตัวเลือก' : 'เพิ่มตัวเลือกใหม่'}
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm backdrop-blur-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1 drop-shadow-sm">จำนวนอุปกรณ์ (เครื่อง)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.count}
                  onChange={(e) => setFormData({ ...formData, count: Number(e.target.value) })}
                  className="w-full glass-input px-4 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1 drop-shadow-sm">ราคาเพิ่ม (บาท)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full glass-input px-4 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1 drop-shadow-sm">ลำดับการแสดงผล</label>
                <input
                  type="number"
                  required
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                  className="w-full glass-input px-4 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/10 backdrop-blur-sm shadow-inner">
                <span className="text-sm font-medium text-slate-300">สถานะการใช้งาน</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500/80 border border-white/10"></div>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors border border-white/10 backdrop-blur-sm"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 glass-button py-2 flex justify-center items-center"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'บันทึก'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
