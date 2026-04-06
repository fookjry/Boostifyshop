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
          className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-500 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider"
        >
          <BookOpen className="w-4 h-4" />
          คู่มือการใช้งาน
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-black text-white">คู่มือการใช้งาน</h1>
        <p className="text-slate-400 text-lg">Config Net VPN Tutorial - ทำตามขั้นตอนง่ายๆ เพื่อเริ่มใช้งาน</p>
      </header>

      {/* Section 1: Promotions */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
            <Wifi className="w-6 h-6 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">1. สมัครโปรเสริม (ตามซิมที่ใช้)</h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* AIS */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-lime-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-lime-500/10 transition-colors" />
            <div className="flex justify-between items-start mb-4">
              <div className="bg-lime-500 text-black px-3 py-1 rounded-lg text-xs font-black uppercase">AIS</div>
              <p className="text-slate-500 text-xs font-bold">30 วัน / 33 บาท</p>
            </div>
            <p className="text-3xl font-black text-white mb-2 tracking-tighter">*777*7068#</p>
            <p className="text-slate-300 text-sm font-medium">กดโทรออกเพื่อสมัครโปรเสริมเน็ต</p>
          </div>

          {/* TRUE */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-red-500/10 transition-colors" />
            <div className="flex justify-between items-start mb-4">
              <div className="bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-black uppercase">TRUE</div>
              <p className="text-slate-500 text-xs font-bold">30 วัน / 81 บาท</p>
            </div>
            <p className="text-3xl font-black text-white mb-2 tracking-tighter">*900*8234#</p>
            <p className="text-slate-300 text-sm font-medium">กดโทรออกเพื่อสมัครโปรเสริมเน็ต</p>
          </div>
        </div>
      </section>

      {/* Section 2: Downloads */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
            <Download className="w-6 h-6 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">2. ดาวน์โหลดแอปพลิเคชัน</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Mobile */}
          <div className="bg-slate-900 p-8 rounded-[40px] border border-slate-800 flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-800">
              <Smartphone className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">iOS & Android</h3>
              <p className="text-slate-300 text-sm font-medium">ติดตั้งแอป: <span className="text-blue-400 font-bold">v2Box</span></p>
            </div>
            <a 
              href={getMobileAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <Download className="w-5 h-5" />
              ดาวน์โหลดสำหรับมือถือ
            </a>
          </div>

          {/* Windows */}
          <div className="bg-slate-900 p-8 rounded-[40px] border border-slate-800 flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-800">
              <Monitor className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Windows PC</h3>
              <p className="text-slate-300 text-sm font-medium">ดาวน์โหลด: <span className="text-emerald-400 font-bold">v2rayN</span></p>
            </div>
            <a 
              href="https://v2rayn-g.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
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
          <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
            <PlayCircle className="w-6 h-6 text-purple-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">3. วิธีนำ Config ไปใช้งาน</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, i) => (
            <div key={i} className="bg-slate-900 p-6 rounded-3xl border border-slate-800 relative group">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-black shadow-lg">
                {step.id}
              </div>
              <div className="w-12 h-12 bg-slate-950 rounded-xl flex items-center justify-center mb-4 border border-slate-800 group-hover:border-blue-500/50 transition-colors">
                <step.icon className="w-6 h-6 text-blue-500" />
              </div>
              <h4 className="text-white text-lg font-bold mb-2">{step.title}</h4>
              <p className="text-slate-100 text-sm leading-relaxed font-medium">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
