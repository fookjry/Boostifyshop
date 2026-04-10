import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../../firebase';
import { Image as ImageIcon, Upload, Trash2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

const IconCard = ({ icon, uploadingId, handleUpload, handleDelete }: any) => (
  <div className="glass-panel p-5 flex flex-col items-center text-center space-y-4 group relative overflow-hidden">
    <div className="absolute top-2 left-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">ID: {icon.id}</div>
    
    <div className="w-20 h-20 md:w-24 md:h-24 bg-black/20 border border-white/10 rounded-2xl flex items-center justify-center overflow-hidden backdrop-blur-sm shadow-inner relative">
      {icon.url ? (
        <img src={icon.url} alt={`Icon ${icon.id}`} className="w-full h-full object-contain p-2" />
      ) : (
        <ImageIcon className="w-8 h-8 text-slate-700" />
      )}
      
      {uploadingId === icon.id && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        </div>
      )}
    </div>

    <div className="flex flex-col w-full gap-2">
      <label className="cursor-pointer">
        <div className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border ${icon.url ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600/30'}`}>
          <Upload className="w-3.5 h-3.5" />
          {icon.url ? 'เปลี่ยนรูป' : 'อัปโหลด'}
        </div>
        <input 
          type="file" 
          className="hidden" 
          accept="image/*" 
          onChange={(e) => handleUpload(icon.id, e)}
          disabled={uploadingId !== null}
        />
      </label>

      {icon.url && (
        <button 
          onClick={() => handleDelete(icon.id)}
          className="w-full py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
        >
          <Trash2 className="w-3.5 h-3.5" />
          ลบรูปภาพ
        </button>
      )}
    </div>
  </div>
);

export function AppIconManager() {
  const [icons, setIcons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'app_icons'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const iconList = [];
        // IDs 1-6 only
        for (let i = 1; i <= 6; i++) {
          iconList.push({
            id: i,
            url: data[i] || null
          });
        }
        setIcons(iconList);
      } else {
        const initialIcons = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, url: null }));
        setIcons(initialIcons);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleUpload = async (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert('ไฟล์มีขนาดใหญ่เกินไป (จำกัด 1MB)');
      return;
    }

    setUploadingId(id);
    console.log(`Starting Base64 upload for icon ${id}...`);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        // Update Firestore directly with base64 string
        await setDoc(doc(db, 'settings', 'app_icons'), {
          [id]: base64String
        }, { merge: true });
        
        console.log(`Icon ${id} uploaded as Base64 successfully`);
        setUploadingId(null);
      };
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์');
        setUploadingId(null);
      };
      reader.readAsDataURL(file);

    } catch (error) {
      console.error('Upload failed:', error);
      alert('อัปโหลดล้มเหลว: ' + (error instanceof Error ? error.message : String(error)));
      setUploadingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(`ยืนยันการลบรูปภาพที่ ${id}?`)) return;

    try {
      await updateDoc(doc(db, 'settings', 'app_icons'), {
        [id]: deleteField()
      });
      console.log(`Icon ${id} deleted from Firestore`);
    } catch (error) {
      console.error('Delete failed:', error);
      alert('ลบล้มเหลว กรุณาลองใหม่อีกครั้ง');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3 drop-shadow-md">
          <ImageIcon className="w-7 h-7 md:w-8 md:h-8 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" /> จัดการรูปภาพแอพ (App Icon Manager)
        </h1>
        <p className="text-slate-300 text-sm md:text-base">อัปโหลดรูปภาพสำหรับแสดงในหน้าเลือกเซิร์ฟเวอร์</p>
      </header>

      <div className="space-y-8">
        {/* Supported Apps Category */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-500 rounded-full" />
            <h2 className="text-lg font-bold text-white">แอพที่รองรับ (ID 1-2)</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 md:gap-6">
            {icons.slice(0, 2).map((icon) => (
              <IconCard key={icon.id} icon={icon} uploadingId={uploadingId} handleUpload={handleUpload} handleDelete={handleDelete} />
            ))}
          </div>
        </section>

        {/* General Usage Category */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-emerald-500 rounded-full" />
            <h2 className="text-lg font-bold text-white">การใช้งานทั่วไป (ID 3-6)</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 md:gap-6">
            {icons.slice(2, 6).map((icon) => (
              <IconCard key={icon.id} icon={icon} uploadingId={uploadingId} handleUpload={handleUpload} handleDelete={handleDelete} />
            ))}
          </div>
        </section>
      </div>

      <div className="glass-panel p-6 border-blue-500/20 bg-blue-500/5">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
          <div className="space-y-1">
            <h4 className="text-white font-bold">คำแนะนำการใช้งาน</h4>
            <ul className="text-sm text-slate-400 list-disc list-inside space-y-1">
              <li>แนะนำให้ใช้รูปภาพสี่เหลี่ยมจัตุรัส (1:1)</li>
              <li>ขนาดไฟล์ไม่ควรเกิน 1MB</li>
              <li>รูปภาพเหล่านี้จะถูกนำไปใช้ในหน้าจัดการเซิร์ฟเวอร์เพื่อระบุแอพที่รองรับ</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
