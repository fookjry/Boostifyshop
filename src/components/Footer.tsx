import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Server, BookOpen, FileText, Lock } from 'lucide-react';

export function Footer({ settings }: { settings: any }) {
  const siteName = settings?.siteName || 'BoostifyShop';

  return (
    <footer className="mt-20 border-t border-white/5 bg-slate-950/20 backdrop-blur-md relative overflow-hidden">
      {/* Decorative Blob */}
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-6">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold text-white">
              <Shield className="w-8 h-8 text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">{siteName}</span>
            </Link>
            <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
              ผู้ให้บริการไฟล์ Config และเซิร์ฟเวอร์ VPN ความเร็วสูง 
              รวดเร็ว ปลอดภัย และเป็นส่วนตัวมากที่สุด 
              รองรับการใช้งานผ่านมือถือทุกเครือข่าย
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="text-sm font-black uppercase tracking-widest text-white/90">เมนูหลัก</h4>
            <div className="flex flex-col gap-3">
              <Link to="/buy" className="text-slate-400 hover:text-blue-400 text-sm transition-colors flex items-center gap-2 group">
                <Server className="w-4 h-4 transition-transform group-hover:scale-110" />
                ซื้อ VPN
              </Link>
              <Link to="/tutorial" className="text-slate-400 hover:text-blue-400 text-sm transition-colors flex items-center gap-2 group">
                <BookOpen className="w-4 h-4 transition-transform group-hover:scale-110" />
                คู่มือการใช้งาน
              </Link>
              <Link to="/dashboard" className="text-slate-400 hover:text-blue-400 text-sm transition-colors flex items-center gap-2 group">
                <Lock className="w-4 h-4 transition-transform group-hover:scale-110" />
                CONFIG ของฉัน
              </Link>
            </div>
          </div>

          {/* Legal / Policy */}
          <div className="space-y-6">
            <h4 className="text-sm font-black uppercase tracking-widest text-white/90">ฝ่ายกฎหมาย</h4>
            <div className="flex flex-col gap-3">
              <Link to="/terms" className="text-slate-400 hover:text-emerald-400 text-sm transition-colors flex items-center gap-2 group">
                <FileText className="w-4 h-4 transition-transform group-hover:scale-110" />
                ข้อกำหนดและเงื่อนไข
              </Link>
              <Link to="/terms#privacy" className="text-slate-400 hover:text-emerald-400 text-sm transition-colors flex items-center gap-2 group">
                <Shield className="w-4 h-4 transition-transform group-hover:scale-110" />
                นโยบายความเป็นส่วนตัว
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">
            © 2026 BoostifyShop. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-slate-500 text-[10px] uppercase font-black tracking-widest">
            <span className="hover:text-slate-300 cursor-pointer transition-colors">SECURITY AUDITED</span>
            <span className="hover:text-slate-300 cursor-pointer transition-colors">ENCRYPTED CONNECTION</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
