import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, Globe, Lock, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export function Home({ settings }: { settings: any }) {
  const siteName = settings?.siteName || 'VPNSaaS';

  return (
    <div className="space-y-24 py-12">
      {/* Hero Section */}
      <section className="text-center space-y-8 max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white drop-shadow-lg">
            บริการจำหน่าย Config VPN <span className="text-gradient">อัตโนมัติ</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto drop-shadow-md">
            {siteName} - รวดเร็ว ทำรายการได้ 24ชม.รองรับเครือข่าย AIS และ TRUE
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap justify-center gap-4"
        >
          <Link to="/login" className="glass-button px-8 py-4 text-lg">
            เริ่มต้นใช้งานตอนนี้
          </Link>
          <Link to="/dashboard" className="glass-panel hover:bg-white/10 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all">
            ดูการ CONFIG ของฉัน
          </Link>
        </motion.div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-8">
        {[
          { icon: Zap, title: "ส่งมอบทันที", desc: "การตั้งค่า VPN ของคุณจะถูกสร้างขึ้นทันทีหลังจากการซื้อ" },
          { icon: Globe, title: "มีหลาย Server", desc: "เลือก Server ได้เอง จำกัด User เพื่อความลื่นไหล ไม่แลคแน่นอน" },
          { icon: Lock, title: "ปลอดภัยและเป็นส่วนตัว", desc: "โปรโตคอล VLESS พร้อมการเข้ารหัส TLS เพื่อความเป็นส่วนตัวสูงสุด" }
        ].map((f, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-8 group"
          >
            <f.icon className="w-12 h-12 text-blue-400 mb-6 group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <h3 className="text-xl font-bold text-white mb-2">{f.title}</h3>
            <p className="text-slate-300">{f.desc}</p>
          </motion.div>
        ))}
      </section>

      {/* Pricing Preview */}
      <section className="glass-panel rounded-3xl p-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white drop-shadow-md">เลือกแผนที่เหมาะกับความต้องการของคุณ</h2>
          <p className="text-slate-300">มีให้ทดสอบก่อนใช้งานจริง!!</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { name: "รายวัน", price: "1 ฿", days: 1 },
            { name: "รายสัปดาห์", price: "7 ฿", days: 7 },
            { name: "รายเดือน", price: "30 ฿", days: 30 }
          ].map((p, i) => (
            <div key={i} className="glass-card p-8 flex flex-col items-center">
              <span className="text-blue-400 font-bold uppercase tracking-wider text-sm mb-2 drop-shadow-[0_0_4px_rgba(59,130,246,0.5)]">{p.name}</span>
              <div className="text-4xl font-black text-white mb-6 drop-shadow-md">{p.price}</div>
              <ul className="space-y-3 mb-8 w-full text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.5)]" /> ความเร็วสูง</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.5)]" /> ใช้งานได้ {p.days} วัน</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.5)]" /> รองรับ AIS/TRUE</li>
              </ul>
              <Link to="/buy" className="w-full glass-button py-3 text-center">
                ซื้อเลย
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
