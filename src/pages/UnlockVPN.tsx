import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../firebase';
import { Zap, Loader2, Check, AlertCircle, Copy, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export function UnlockVPN({ user, profile }: { user: any, profile: any }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vpnConfig, setVpnConfig] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const claimAdVpn = async () => {
      const token = localStorage.getItem('pending_lv_token');
      if (!token) {
        setError('ไม่พบ session ตรวจสอบการรับสิทธิ์ หรือ session หมดอายุไปแล้ว');
        setLoading(false);
        return;
      }

      try {
        const idToken = await user.getIdToken();
        const response = await axios.post('/api/linkvertise/claim', { token }, {
          headers: { Authorization: `Bearer ${idToken}` }
        });

        if (response.data.success) {
          setVpnConfig(response.data.vpn);
          // Remove token after success
          localStorage.removeItem('pending_lv_token');
        }
      } catch (err: any) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };

    claimAdVpn();
  }, [user]);

  const copyConfig = () => {
     if (vpnConfig) {
        navigator.clipboard.writeText(vpnConfig.config);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
     }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <h2 className="text-xl font-bold text-white tracking-widest animate-pulse">กำลังตรวจสอบสิทธิ์ชั่วคราว...</h2>
        <p className="text-slate-400">กรุณารอสักครู่ ระบบกำลังสร้าง Config สำหรับโฆษณา</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 pt-10">
      <div className="text-center space-y-2">
         {error ? (
           <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30">
              <AlertCircle className="w-10 h-10" />
           </div>
         ) : (
           <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30 shadow-[0_0_20px_rgba(52,211,153,0.3)] animate-bounce">
             <Check className="w-10 h-10 drop-shadow-md" />
           </div>
         )}
         <h1 className="text-3xl font-black text-white drop-shadow-md tracking-tight">
           {error ? 'รับสิทธิ์ไม่สำเร็จ' : 'รับ Config ชั่วคราวสำเร็จ!'}
         </h1>
         <p className="text-slate-400">
           {error ? 'เกิดข้อผิดพลาดในการรับสิทธิ์ชั่วคราว' : 'ขอบคุณที่สนับสนุนเซิร์ฟเวอร์ของเรา Config ชั่วคราวใช้ได้ 6 ชั่วโมง'}
         </p>
      </div>

      {error ? (
        <div className="glass-panel p-6 border-red-500/30 bg-red-500/10">
          <p className="text-red-400 font-bold">{error}</p>
          <div className="mt-6 flex justify-center">
            <Link to="/buy" className="glass-button w-full text-center py-3">กลับไปหน้าเริ่มต้น</Link>
          </div>
        </div>
      ) : vpnConfig && (
        <div className="glass-panel p-6 space-y-6 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl z-0" />
          
          <div className="relative z-10 space-y-4">
             <div className="flex justify-between items-center pb-4 border-b border-white/10">
               <div>
                  <h3 className="text-sm text-slate-400 font-bold uppercase tracking-wider">เซิร์ฟเวอร์</h3>
                  <p className="text-white font-black text-lg">{vpnConfig.serverName}</p>
               </div>
               <div className="text-right">
                  <h3 className="text-sm text-slate-400 font-bold uppercase tracking-wider">เครือข่าย</h3>
                  <div className="inline-block bg-blue-500/20 text-blue-400 px-3 py-1 rounded-md text-xs font-black border border-blue-500/30">
                    {vpnConfig.network}
                  </div>
               </div>
             </div>
             
             <div className="space-y-2">
               <label className="text-xs uppercase font-black text-slate-400">Config ชั่วคราว 6 ชั่วโมง</label>
               <div className="relative group">
                 <textarea 
                   readOnly 
                   value={vpnConfig.config} 
                   className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-xs font-mono text-slate-300 h-24 resize-none focus:outline-none"
                 />
                 <button 
                    onClick={copyConfig}
                    className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-md transition-colors"
                 >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-200" />}
                 </button>
               </div>
             </div>

             <div className="pt-2 flex flex-col gap-3">
               <button 
                  onClick={copyConfig}
                  className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${copied ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(52,211,153,0.5)]' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'}`}
               >
                 {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                 {copied ? 'คัดลอกสำเร็จ' : 'คัดลอก Config ไปใช้งาน'}
               </button>
               <Link 
                  to="/dashboard"
                  className="w-full glass-button py-4 text-center font-bold flex justify-center items-center gap-2"
               >
                  <Home className="w-5 h-5" /> ไปยังแดชบอร์ด
               </Link>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
