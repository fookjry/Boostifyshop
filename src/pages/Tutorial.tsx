import React from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  Smartphone, 
  Monitor, 
  Download, 
  Copy, 
  CheckCircle2, 
  Wifi, 
  PlayCircle
} from 'lucide-react';

export function Tutorial() {
  const getMobileAppLink = () => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    
    // iOS detection
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      return "https://apps.apple.com/th/app/v2box-v2ray-client/id6446814690?l=th";
    }
    
    // Android detection
    if (/android/i.test(userAgent)) {
      return "https://play.google.com/store/apps/details?id=dev.hexasoftware.v2box&hl=th";
    }

    // Default to iOS store link if desktop or unknown
    return "https://apps.apple.com/th/app/v2box-v2ray-client/id6446814690?l=th";
  };

  const steps = [
    {
      id: 1,
      title: "คัดลอก Config",
      desc: "เข้าสู่เมนู VPN ของฉัน และกดคัดลอก Config",
      icon: Copy
    },
    {
      id: 2,
      title: "เปิดแอปพลิเคชัน",
      desc: "เปิดแอป (v2Box หรือ v2rayN) ขึ้นมา",
      icon: PlayCircle
    },
    {
      id: 3,
      title: "เพิ่มเซิร์ฟเวอร์",
      desc: "เลือกเมนู \"Import from Clipboard\" เพื่อเพิ่มเซิร์ฟเวอร์",
      icon: Download
    },
    {
      id: 4,
      title: "เริ่มใช้งาน",
      desc: "กด Connect เพื่อเริ่มใช้งานเน็ต VPN",
      icon: CheckCircle2
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <header className="text-center space-y-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-400 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider border border-blue-500/30 backdrop-blur-sm shadow-[0_0_15px_rgba(59,130,246,0.2)]"
        >
          <BookOpen className="w-4 h-4 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          คู่มือการใช้งาน
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-md">คู่มือการใช้งาน</h1>
        <p className="text-slate-300 text-lg">Config Net VPN Tutorial - ทำตามขั้นตอนง่ายๆ เพื่อเริ่มใช้งาน</p>
      </header>

      {/* Section 1: Promotions */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center border border-amber-500/30 shadow-[0_0_15px_rgba(251,191,36,0.2)]">
            <Wifi className="w-6 h-6 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
          </div>
          <h2 className="text-2xl font-bold text-white drop-shadow-sm">1. สมัครโปรเสริม (ตามซิมที่ใช้)</h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* AIS */}
          <div className="glass-panel p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-lime-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-lime-500/20 transition-colors" />
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="bg-lime-500 text-black px-3 py-1 rounded-lg text-xs font-black uppercase shadow-[0_0_10px_rgba(132,204,22,0.5)]">AIS</div>
              <p className="text-slate-400 text-xs font-bold">30 วัน / 33 บาท</p>
            </div>
            <p className="text-3xl font-black text-white mb-2 tracking-tighter drop-shadow-sm relative z-10">*777*7068#</p>
            <p className="text-slate-300 text-sm font-medium relative z-10">กดโทรออกเพื่อสมัครโปรเสริมเน็ต</p>
          </div>

          {/* TRUE */}
          <div className="glass-panel p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-red-500/20 transition-colors" />
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-black uppercase shadow-[0_0_10px_rgba(220,38,38,0.5)]">TRUE</div>
              <p className="text-slate-400 text-xs font-bold">30 วัน / 81 บาท</p>
            </div>
            <p className="text-3xl font-black text-white mb-2 tracking-tighter drop-shadow-sm relative z-10">*900*8234#</p>
            <p className="text-slate-300 text-sm font-medium relative z-10">กดโทรออกเพื่อสมัครโปรเสริมเน็ต</p>
          </div>
        </div>
      </section>

      {/* Section 2: Downloads */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <Download className="w-6 h-6 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          </div>
          <h2 className="text-2xl font-bold text-white drop-shadow-sm">2. ดาวน์โหลดแอปพลิเคชัน</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Mobile */}
          <div className="glass-panel p-8 flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 bg-black/20 rounded-2xl flex items-center justify-center border border-white/10 backdrop-blur-sm shadow-inner">
              <Smartphone className="w-8 h-8 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1 drop-shadow-sm">iOS & Android</h3>
              <p className="text-slate-300 text-sm font-medium">ติดตั้งแอป: <span className="text-blue-400 font-bold drop-shadow-sm">v2Box</span></p>
            </div>
            <a 
              href={getMobileAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full glass-button py-4 text-lg flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              ดาวน์โหลดสำหรับมือถือ
            </a>
          </div>

          {/* Windows */}
          <div className="glass-panel p-8 flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 bg-black/20 rounded-2xl flex items-center justify-center border border-white/10 backdrop-blur-sm shadow-inner">
              <Monitor className="w-8 h-8 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1 drop-shadow-sm">Windows PC</h3>
              <p className="text-slate-300 text-sm font-medium">ดาวน์โหลด: <span className="text-emerald-400 font-bold drop-shadow-sm">v2rayN</span></p>
            </div>
            <a 
              href="https://v2rayn-g.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-600/80 hover:bg-emerald-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(52,211,153,0.4)] active:scale-95 border border-emerald-500/50 backdrop-blur-md"
            >
              <Download className="w-5 h-5" />
              ดาวน์โหลดสำหรับ PC
            </a>
          </div>
        </div>
      </section>

      {/* Section 3: Usage Steps */}
      <section className="space-y-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <PlayCircle className="w-6 h-6 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
          </div>
          <h2 className="text-2xl font-bold text-white drop-shadow-sm">3. วิธีนำ Config ไปใช้งาน</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, i) => (
            <div key={i} className="glass-panel p-6 relative group hover:bg-white/5 transition-colors">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-black shadow-[0_0_10px_rgba(59,130,246,0.5)] border border-blue-400/50">
                {step.id}
              </div>
              <div className="w-12 h-12 bg-black/20 rounded-xl flex items-center justify-center mb-4 border border-white/10 group-hover:border-blue-500/50 transition-colors backdrop-blur-sm">
                <step.icon className="w-6 h-6 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              </div>
              <h4 className="text-white text-lg font-bold mb-2 drop-shadow-sm">{step.title}</h4>
              <p className="text-slate-300 text-sm leading-relaxed font-medium">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
