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
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white">
            บริการจำหน่าย Config VPN <span className="text-blue-500">อัตโนมัติ</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            {siteName} - รวดเร็ว ทำรายการได้ 24ชม.รองรับเครือข่าย AIS และ TRUE
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap justify-center gap-4"
        >
          <Link to="/login" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg shadow-blue-500/20">
            เริ่มต้นใช้งานตอนนี้
          </Link>
          <Link to="/dashboard" className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all border border-slate-700">
            ดูการ CONFIG ของฉัน
          </Link>
        </motion.div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-8">
        {[
          { icon: Zap, title: "ส่งมอบทันที", desc: "การตั้งค่า VPN ของคุณจะถูกสร้างขึ้นทันทีหลังจากการซื้อ" },
          { icon: Globe, title: "มีหลาย Server", desc: "เลือก Server ที่เหมาะกับคุณ" },
          { icon: Lock, title: "ปลอดภัยและเป็นส่วนตัว", desc: "โปรโตคอล VLESS พร้อมการเข้ารหัส TLS เพื่อความเป็นส่วนตัวสูงสุด" }
        ].map((f, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 hover:border-blue-500/50 transition-colors group"
          >
            <f.icon className="w-12 h-12 text-blue-500 mb-6 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold text-white mb-2">{f.title}</h3>
            <p className="text-slate-400">{f.desc}</p>
          </motion.div>
        ))}
      </section>

      {/* Pricing Preview */}
      <section className="bg-slate-900 rounded-3xl p-12 border border-slate-800">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white">เลือกแผนที่เหมาะกับความต้องการของ</h2>
          <p className="text-slate-400">มีให้ทดสอบก่อนใช้งานจริง!!</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { name: "รายวัน", price: "1 ฿", days: 1 },
            { name: "รายสัปดาห์", price: "7 ฿", days: 7 },
            { name: "รายเดือน", price: "30 ฿", days: 30 }
          ].map((p, i) => (
            <div key={i} className="bg-slate-950 p-8 rounded-2xl border border-slate-800 flex flex-col items-center">
              <span className="text-blue-500 font-bold uppercase tracking-wider text-sm mb-2">{p.name}</span>
              <div className="text-4xl font-black text-white mb-6">{p.price}</div>
              <ul className="space-y-3 mb-8 w-full text-slate-400">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> ความเร็วสูง</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> ใช้งานได้ {p.days} วัน</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> รองรับ AIS/TRUE</li>
              </ul>
              <Link to="/buy" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-center transition-colors">
                ซื้อเลย
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
