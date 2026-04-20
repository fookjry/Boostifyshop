import React from 'react';
import { motion } from 'motion/react';
import { FileText, Shield, AlertTriangle, Coins, Zap, Eye, Share2, ArrowLeft, Lock, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Terms() {
  const sections = [
    {
      id: 'tos',
      title: 'ข้อกำหนดและเงื่อนไขการใช้งาน (Terms of Service)',
      icon: FileText,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      shadow: 'shadow-blue-500/10',
      content: [
        {
          heading: 'ขอบเขตการบริการ',
          icon: Zap,
          text: 'BoostifyShop เป็นเพียงผู้ให้บริการไฟล์ Config และเซิร์ฟเวอร์ VPN เพื่อเพิ่มประสิทธิภาพการเชื่อมต่อเท่านั้น'
        },
        {
          heading: 'การปฏิเสธความรับผิดชอบ (เงื่อนไขสำคัญ)',
          icon: AlertTriangle,
          text: 'บริการนี้เป็นการใช้งานผ่านช่องโหว่หรือโปรโมชั่นเฉพาะของเครือข่ายมือถือ หากช่องโหว่ดังกล่าวถูกปิดใช้งานโดยผู้ให้บริการเครือข่าย หรือมีการเปลี่ยนแปลงระบบจนไม่สามารถใช้งานได้ ทางเราขอสงวนสิทธิ์ในการไม่รับผิดชอบทุกกรณี'
        },
        {
          heading: 'ไม่มีนโยบายคืนเงิน',
          icon: Coins,
          text: 'เนื่องจากเรามีระบบทดลองใช้ฟรีให้ทดสอบก่อนซื้อ เมื่อชำระเงินแล้วถือว่าผู้ซื้อยอมรับความเสี่ยงในกรณีที่เน็ตหลุดหรือช่องโหว่ถูกปิดในอนาคต'
        },
        {
          heading: 'การใช้งาน',
          icon: Scale,
          text: 'ห้ามนำไฟล์ Config ไปใช้ในทางที่ผิดกฎหมาย, โจมตีระบบ (Hacking), หรือส่งสแปม หากตรวจพบจะทำการระงับสิทธิ์การใช้งานทันทีโดยไม่แจ้งให้ทราบล่วงหน้า'
        },
        {
          heading: 'ความเร็วเน็ต',
          icon: Zap,
          text: 'ความเร็วและเสถียรภาพขึ้นอยู่กับพื้นที่ใช้งาน อุปกรณ์ และสถานะของเครือข่าย ณ ขณะนั้น'
        }
      ]
    },
    {
      id: 'privacy',
      title: 'นโยบายความเป็นส่วนตัว (Privacy Policy)',
      icon: Shield,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      shadow: 'shadow-emerald-500/10',
      content: [
        {
          heading: 'การเก็บข้อมูล',
          icon: Lock,
          text: 'เราเก็บข้อมูลเฉพาะที่จำเป็นเพื่อการใช้งานบริการ เช่น ไอดีผู้ใช้ หรือข้อมูลการสมัครสมาชิก เพื่อตรวจสอบอายุการใช้งานเท่านั้น'
        },
        {
          heading: 'ความปลอดภัย',
          icon: Eye,
          text: 'ข้อมูลการเข้าชมเว็บไซต์หรือประวัติการใช้งานผ่าน VPN ของคุณจะไม่ถูกบันทึกในรูปแบบ Log สู่สาธารณะ เพื่อความเป็นส่วนตัวสูงสุดของผู้ใช้'
        },
        {
          heading: 'บุคคลภายนอก',
          icon: Share2,
          text: 'เราไม่มีนโยบายนำข้อมูลของคุณไปขายหรือส่งต่อให้บุคคลที่สาม'
        }
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-12 pb-24">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="inline-flex items-center justify-center p-3 bg-blue-500/20 rounded-2xl border border-blue-500/30 mb-4">
          <Shield className="w-8 h-8 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
          นโยบายและข้อกำหนด
        </h1>
        <p className="text-slate-400 max-w-xl mx-auto">
          กรุณาอ่านและทำความเข้าใจข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัวของเรา เพื่อสิทธิประโยชน์สูงสุดในการใช้บริการ
        </p>
      </motion.div>

      {/* Content Sections */}
      <div className="space-y-16">
        {sections.map((section, idx) => (
          <motion.section 
            key={section.id}
            initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className={`glass-panel p-8 md:p-10 rounded-[2.5rem] relative overflow-hidden boarder ${section.borderColor}`}
          >
            {/* Background Glow */}
            <div className={`absolute -top-24 -right-24 w-64 h-64 ${section.bgColor} blur-[100px] rounded-full pointer-events-none`} />
            
            <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${section.bgColor} border ${section.borderColor}`}>
                  <section.icon className={`w-6 h-6 ${section.color}`} />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight drop-shadow-md">
                  {section.title}
                </h2>
              </div>

              <div className="grid gap-6">
                {section.content.map((item, i) => (
                  <div key={i} className="flex gap-5 group">
                    <div className="mt-1">
                      <div className={`p-2 rounded-lg bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors`}>
                        <item.icon className={`w-4 h-4 text-slate-400 group-hover:${section.color} transition-colors`} />
                      </div>
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <h4 className="text-sm font-bold text-white/90 uppercase tracking-widest text-[10px]">
                        {item.heading}
                      </h4>
                      <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-line group-hover:text-slate-300 transition-colors">
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>
        ))}
      </div>

      {/* Footer Meta */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center space-y-8"
      >
        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 inline-block text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">
          อัปเดตล่าสุด: 20 เมษายน 2569
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-8">
          <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-all group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            ย้อนกลับหน้าหลัก
          </Link>
          
          <Link to="/buy" className="glass-button px-8 py-4 text-sm font-bold shadow-lg">
            ไปหน้าสั่งซื้อ VPN
          </Link>
        </div>

        <p className="text-slate-500 text-xs">
          © 2026 BoostifyShop. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
