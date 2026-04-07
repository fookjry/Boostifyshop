import React, { useState, useRef } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithRedirect, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { Shield, Mail, Lock, Chrome, Loader2 } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';

export function Login({ settings }: { settings: any }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<React.ReactNode>('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const siteName = settings?.siteName || 'VPNSaaS';
  const logoUrl = settings?.logoUrl;
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isRegister && password !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }

    if (!isRegister && turnstileSiteKey && !turnstileToken) {
      setError('กรุณายืนยันว่าคุณไม่ใช่โปรแกรมอัตโนมัติ');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      // ... (error handling remains the same)
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('อีเมลนี้ถูกใช้งานไปแล้ว กรุณาใช้เมลอื่นหรือเข้าสู่ระบบ');
          break;
        case 'auth/invalid-email':
          setError('รูปแบบอีเมลไม่ถูกต้อง');
          break;
        case 'auth/weak-password':
          setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
          break;
        case 'auth/too-many-requests':
          setError('คุณส่งคำขอมากเกินไป กรุณาลองใหม่ในภายหลัง');
          break;
        case 'auth/popup-closed-by-user':
          setError('หน้าต่างเข้าสู่ระบบถูกปิด');
          break;
        default:
          setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (useRedirect = false) => {
    const provider = new GoogleAuthProvider();
    try {
      setError('');
      if (useRedirect) {
        await signInWithRedirect(auth, provider);
        return;
      }
      const result = await signInWithPopup(auth, provider);
      console.log("Login Success:", result.user.email);
    } catch (err: any) {
      console.error("Google Login Error:", err);
      if (err.code === 'auth/popup-blocked') {
        setError(
          <div className="flex flex-col gap-2">
            <span>เบราว์เซอร์บล็อกหน้าต่างป๊อปอัพ กรุณาอนุญาตป๊อปอัพ หรือ</span>
            <button 
              onClick={() => handleGoogle(true)}
              className="text-blue-400 underline font-bold text-left"
            >
              คลิกที่นี่เพื่อเข้าสู่ระบบด้วยวิธีเปลี่ยนหน้า (Redirect)
            </button>
          </div>
        );
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError(
          <div className="flex flex-col gap-2">
            <span>หน้าต่างเข้าสู่ระบบถูกปิดก่อนทำรายการเสร็จสิ้น</span>
            <button 
              onClick={() => handleGoogle(true)}
              className="text-blue-400 underline font-bold text-left"
            >
              หากหน้าต่างปิดเองอัตโนมัติ คลิกที่นี่เพื่อใช้การ Redirect แทน
            </button>
          </div>
        );
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(
          <div className="flex flex-col gap-2">
            <span>โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase Console</span>
            <p className="text-xs text-slate-400">กรุณาเพิ่ม {window.location.hostname} ใน Authorized Domains ของ Firebase Authentication</p>
          </div>
        );
      } else {
        const errorMessage = err.code ? `Error: ${err.code} - ${err.message}` : 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง';
        setError(errorMessage);
      }
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="glass-card p-8">
        <div className="text-center mb-8">
          <div className="bg-blue-600/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 overflow-hidden border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="w-full h-full object-contain" />
            ) : (
              <Shield className="w-8 h-8 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-white drop-shadow-md">{isRegister ? 'สร้างบัญชี' : 'ยินดีต้อนรับกลับมา'}</h2>
          <p className="text-slate-300">เข้าสู่แดชบอร์ด {siteName} ความเร็วสูงของคุณ</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">ที่อยู่อีเมล</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input w-full pl-11 pr-4"
                placeholder="name@example.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">รหัสผ่าน</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input w-full pl-11 pr-4"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {isRegister && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">ยืนยันรหัสผ่าน</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="glass-input w-full pl-11 pr-4"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          )}

          {!isRegister && turnstileSiteKey && (
            <div className="flex justify-center my-4">
              <Turnstile
                siteKey={turnstileSiteKey}
                onSuccess={(token) => setTurnstileToken(token)}
                onError={() => setError('เกิดข้อผิดพลาดในการยืนยันตัวตน')}
                onExpire={() => setTurnstileToken(null)}
                options={{
                  theme: 'dark'
                }}
              />
            </div>
          )}

          {error && <p className="text-red-400 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20 backdrop-blur-sm">{error}</p>}

          <button 
            disabled={loading}
            className="w-full glass-button py-3 flex items-center justify-center gap-2 mt-6"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isRegister ? 'ลงทะเบียน' : 'เข้าสู่ระบบ')}
          </button>
        </form>

        <div className="mt-6 space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0f172a] px-2 text-slate-400">หรือดำเนินการต่อด้วย</span></div>
          </div>

          <button 
            onClick={() => handleGoogle()}
            className="w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border border-white/10 backdrop-blur-sm"
          >
            <Chrome className="w-5 h-5" /> Google
          </button>

          <p className="text-center text-slate-300 text-sm">
            {isRegister ? 'มีบัญชีอยู่แล้วใช่ไหม?' : "ยังไม่มีบัญชีใช่ไหม?"}{' '}
            <button onClick={() => setIsRegister(!isRegister)} className="text-blue-400 hover:text-blue-300 hover:underline font-medium transition-colors">
              {isRegister ? 'เข้าสู่ระบบ' : 'ลงทะเบียนตอนนี้'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
