import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Link } from 'react-router-dom';
import { MessageSquare, Plus, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export function TicketsList({ user }: { user: any }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'tickets'), 
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );
    
    const unsub = onSnapshot(q, (snap) => {
      setTickets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><AlertCircle className="w-3 h-3" /> เปิดใช้งาน</span>;
      case 'waiting': return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> รอการตอบกลับ</span>;
      case 'answered': return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> แอดมินตอบแล้ว</span>;
      case 'closed': return <span className="bg-slate-500/20 text-slate-400 border border-slate-500/30 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> ปิดปัญหาแล้ว</span>;
      default: return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-blue-500" />
            Support Tickets
          </h1>
          <p className="text-sm text-slate-400 mt-1">แจ้งปัญหาการใช้งานและติดต่อแอดมิน</p>
        </div>
        <Link to="/tickets/create" className="glass-button bg-blue-600/80 hover:bg-blue-500 px-4 py-2 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">เปิด Ticket ใหม่</span>
        </Link>
      </div>

      <div className="glass-panel p-6 space-y-4">
        {loading ? (
          <div className="text-center py-8 text-slate-400">กำลังโหลดข้อมูล...</div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-white mb-2">ยังไม่มีประวัติการแจ้งปัญหา</h3>
            <p className="text-sm text-slate-400 mb-6">หากพบปัญหาการใช้งาน สามารถเปิด Ticket เพื่อติดต่อแอดมินได้ทันที</p>
            <Link to="/tickets/create" className="text-blue-400 hover:text-blue-300 font-bold text-sm bg-blue-500/10 px-4 py-2 rounded-lg transition-colors border border-blue-500/20">
              แจ้งปัญหาเลย
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {tickets.map(ticket => (
              <Link key={ticket.id} to={`/tickets/${ticket.id}`}>
                <motion.div 
                  whileHover={{ scale: 1.01 }}
                  className="bg-black/20 hover:bg-white/5 border border-white/10 hover:border-blue-500/30 p-4 rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="space-y-1">
                    <h3 className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors drop-shadow-sm">{ticket.title}</h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Ticket #{ticket.id.slice(0, 8).toUpperCase()} • อัปเดตล่าสุด {new Date(ticket.updatedAt).toLocaleString('th-TH')}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusBadge(ticket.status)}
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
