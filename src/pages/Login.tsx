import React, { useState, useRef } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { Shield, Mail, Lock, Chrome, Loader2 } from 'lucide-react';
import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile';

export function Login({ settings }: { settings: any }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const siteName = settings?.siteName || 'VPNSaaS';
  const logoUrl = settings?.logoUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!turnstileToken) {
      setError('กรุณายืนยันตัวตนผ่าน CAPTCHA');
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
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      setError('');
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      setError('ไม่สามารถเข้าสู่ระบบด้วย Google ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl">
        <div className="text-center mb-8">
          <div className="bg-blue-600/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="w-full h-full object-contain" />
            ) : (
              <Shield className="w-8 h-8 text-blue-500" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-white">{isRegister ? 'สร้างบัญชี' : 'ยินดีต้อนรับกลับมา'}</h2>
          <p className="text-slate-400">เข้าสู่แดชบอร์ด {siteName} ความเร็วสูงของคุณ</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">ที่อยู่อีเมล</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                placeholder="name@example.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">รหัสผ่าน</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</p>}

          <div className="py-2">
            {import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY ? (
              <Turnstile 
                ref={turnstileRef}
                siteKey={import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY}
                onSuccess={(token) => setTurnstileToken(token)}
                onError={() => {
                  setError('CAPTCHA error');
                  setTurnstileToken(null);
                }}
                onExpire={() => setTurnstileToken(null)}
              />
            ) : (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center">
                CAPTCHA configuration error
              </div>
            )}
          </div>

          <button 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isRegister ? 'ลงทะเบียน' : 'เข้าสู่ระบบ')}
          </button>
        </form>

        <div className="mt-6 space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900 px-2 text-slate-500">หรือดำเนินการต่อด้วย</span></div>
          </div>

          <button 
            onClick={handleGoogle}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border border-slate-700"
          >
            <Chrome className="w-5 h-5" /> Google
          </button>

          <p className="text-center text-slate-400 text-sm">
            {isRegister ? 'มีบัญชีอยู่แล้วใช่ไหม?' : "ยังไม่มีบัญชีใช่ไหม?"}{' '}
            <button onClick={() => setIsRegister(!isRegister)} className="text-blue-500 hover:underline font-medium">
              {isRegister ? 'เข้าสู่ระบบ' : 'ลงทะเบียนตอนนี้'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
