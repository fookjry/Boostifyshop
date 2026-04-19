import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../../firebase';
import { MessageSquare, ArrowLeft, Send, Loader2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CreateTicket() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError('กรุณากรอกหัวข้อและรายละเอียดปัญหา');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("ไม่พบข้อมูลผู้ใช้");
      const token = await user.getIdToken();

      const response = await axios.post('/api/tickets/create', {
        title,
        initialMessage: message
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        navigate(`/tickets/${response.data.ticketId}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/tickets" className="bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-colors border border-white/10">
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight drop-shadow-md">เปิด Ticket ใหม่</h1>
          <p className="text-sm text-slate-400">กรอกข้อมูลปัญหาที่คุณพบ เพื่อให้ทีมงานตรวจสอบ</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel p-6 space-y-5">
        {error && (
          <div className="bg-red-500/20 text-red-300 border border-red-500/30 p-4 rounded-xl text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block">หัวข้อปัญหา <span className="text-red-400">*</span></label>
          <input 
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="เช่น เติมเงินแล้วยอดไม่เข้า, เชื่อมต่อ VPN ไม่ได้"
            className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-blue-500/50 focus:bg-white/5 outline-none transition-all shadow-inner"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block">รายละเอียด <span className="text-red-400">*</span></label>
          <textarea 
            required
            rows={5}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="อธิบายปัญหาที่คุณพบให้ละเอียดที่สุด..."
            className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-blue-500/50 focus:bg-white/5 outline-none transition-all shadow-inner resize-none"
          />
        </div>

        <button 
          type="submit"
          disabled={loading || !title || !message}
          className="w-full glass-button bg-blue-600/80 hover:bg-blue-500 py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          {loading ? 'กำลังส่งข้อมูล...' : 'ส่ง Ticket'}
        </button>
      </form>
    </div>
  );
}
