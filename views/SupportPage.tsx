import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MessageSquare, Send, Plus, Clock, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SupportTicket, SupportMessage } from '../types';

interface SupportPageProps {
    onBack: () => void;
    driverId: string;
    driverName?: string;
    driverPhone?: string;
}

export default function SupportPage({ onBack, driverId, driverName, driverPhone }: SupportPageProps) {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [showNewTicketForm, setShowNewTicketForm] = useState(false);
    const [newTicket, setNewTicket] = useState({ subject: '', description: '', priority: 'medium' as 'low' | 'medium' | 'high' });
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
    const [replyText, setReplyText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [supportMessages]);

    useEffect(() => {
        if (selectedTicket) {
            fetchMessages(selectedTicket.id);

            const channel = supabase
                .channel(`ticket_messages_${selectedTicket.id}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'support_messages',
                    filter: `ticket_id=eq.${selectedTicket.id}`
                }, (payload) => {
                    setSupportMessages(prev => [...prev, payload.new as SupportMessage]);
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        } else {
            setSupportMessages([]);
        }
    }, [selectedTicket]);

    useEffect(() => {
        fetchTickets();

        // Subscribe to changes in tickets list
        const subscription = supabase
            .channel('support_tickets_driver')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets', filter: `driver_id=eq.${driverId}` }, () => {
                fetchTickets();
            })
            .subscribe();

        return () => { subscription.unsubscribe(); };
    }, [driverId]);

    const fetchTickets = async () => {
        const { data } = await supabase.from('support_tickets').select('*').eq('driver_id', driverId).order('created_at', { ascending: false });
        if (data) setTickets(data);
    };

    const fetchMessages = async (ticketId: string) => {
        const { data, error } = await supabase
            .from('support_messages')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Erreur fetchMessages:", error);
        } else if (data) {
            setSupportMessages(data);
        }
    };

    const handleSendMessage = async () => {
        if (!selectedTicket || !replyText.trim()) return;

        const { error } = await supabase
            .from('support_messages')
            .insert({
                ticket_id: selectedTicket.id,
                sender_type: 'driver',
                message: replyText.trim()
            });

        if (error) {
            alert("Erreur lors de l'envoi: " + error.message);
        } else {
            setReplyText('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const { error } = await supabase.from('support_tickets').insert({
            driver_id: driverId,
            driver_name: driverName,
            driver_phone: driverPhone,
            description: newTicket.description,
            status: 'open'
        });

        setIsLoading(false);

        if (error) {
            alert("Erreur: " + error.message);
        } else {
            setShowNewTicketForm(false);
            setNewTicket({ subject: '', description: '', priority: 'medium' });
            fetchTickets();
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* HEADER */}
            <div className="bg-slate-900 text-white p-6 sticky top-0 z-10 shadow-xl">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-wider">Support</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Aide & Assistance</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                {selectedTicket ? (
                    <div className="flex flex-col h-full bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
                        {/* CHAT HEADER */}
                        <div className="p-4 bg-slate-50 border-b flex justify-between items-center shrink-0">
                            <button onClick={() => setSelectedTicket(null)} className="p-2 bg-white rounded-full hover:bg-slate-200 transition-all"><ArrowLeft size={18} /></button>
                            <div className="text-center">
                                <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">{selectedTicket.subject || 'Support Ticket'}</h3>
                                <p className="text-[9px] font-bold text-slate-400">{selectedTicket.id.split('-')[0]}</p>
                            </div>
                            <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${selectedTicket.status === 'resolved' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'
                                }`}>
                                {selectedTicket.status === 'resolved' ? 'Résolu' : 'Ouvert'}
                            </div>
                        </div>

                        {/* MESSAGES AREA */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white custom-scrollbar">
                            {/* Initial message */}
                            <div className="flex justify-start">
                                <div className="max-w-[85%] space-y-1">
                                    <div className="bg-slate-100 text-slate-700 p-4 rounded-2xl rounded-tl-none text-xs font-medium border border-slate-200/50">
                                        <p className="font-black text-[8px] uppercase tracking-widest text-slate-400 mb-1">Votre message initial</p>
                                        {selectedTicket.description}
                                    </div>
                                    <p className="text-[8px] text-slate-400 font-bold ml-1">{new Date(selectedTicket.created_at).toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Chat history */}
                            {supportMessages.map((m) => (
                                <div key={m.id} className={`flex ${m.sender_type === 'driver' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] space-y-1 ${m.sender_type === 'driver' ? 'text-right' : 'text-left'}`}>
                                        <div className={`p-4 rounded-2xl text-xs font-medium shadow-sm border ${m.sender_type === 'driver'
                                            ? 'bg-orange-500 text-white rounded-tr-none border-orange-400'
                                            : 'bg-white text-slate-800 rounded-tl-none border-slate-200'
                                            }`}>
                                            {m.message}
                                        </div>
                                        <p className={`text-[8px] text-slate-400 font-bold ${m.sender_type === 'driver' ? 'mr-1' : 'ml-1'}`}>
                                            {new Date(m.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* INPUT AREA */}
                        <div className="p-4 bg-slate-50 border-t shrink-0">
                            <div className="relative flex items-center gap-2">
                                <input
                                    className="flex-1 bg-white border border-slate-200 focus:border-orange-500 rounded-2xl px-5 py-3 text-sm font-bold outline-none transition-all pr-12 shadow-sm"
                                    placeholder="Répondre..."
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!replyText.trim()}
                                    className="absolute right-1.5 p-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-all shadow-md"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* NEW TICKET BUTTON */}
                        {!showNewTicketForm && (
                            <button
                                onClick={() => setShowNewTicketForm(true)}
                                className="w-full bg-orange-500 text-white p-5 rounded-[2rem] shadow-lg shadow-orange-200 flex items-center justify-center gap-3 active:scale-95 transition-all"
                            >
                                <div className="bg-white/20 p-2 rounded-full"><Plus size={24} /></div>
                                <span className="font-black uppercase text-sm tracking-widest">Nouveau Ticket</span>
                            </button>
                        )}

                        {/* NEW TICKET FORM */}
                        {showNewTicketForm && (
                            <div className="bg-white p-6 rounded-[2.5rem] shadow-xl animate-in fade-in slide-in-from-bottom-4 space-y-4 border border-slate-100">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-black text-slate-800 uppercase text-sm">Nouveau Message</h3>
                                    <button onClick={() => setShowNewTicketForm(false)} className="text-xs font-bold text-slate-400 uppercase">Annuler</button>
                                </div>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Sujet de votre demande"
                                            className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 rounded-xl p-4 font-bold text-sm outline-none"
                                            value={newTicket.subject}
                                            onChange={e => setNewTicket({ ...newTicket, subject: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <select
                                            className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 rounded-xl p-4 font-bold text-sm outline-none appearance-none"
                                            value={newTicket.priority}
                                            onChange={e => setNewTicket({ ...newTicket, priority: e.target.value as any })}
                                        >
                                            <option value="low">Priorité Basse</option>
                                            <option value="medium">Priorité Moyenne</option>
                                            <option value="high">Priorité Haute</option>
                                        </select>
                                    </div>
                                    <div>
                                        <textarea
                                            placeholder="Décrivez votre problème en détail..."
                                            rows={4}
                                            className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 rounded-xl p-4 font-bold text-sm outline-none resize-none"
                                            value={newTicket.description}
                                            onChange={e => setNewTicket({ ...newTicket, description: e.target.value })}
                                            required
                                        ></textarea>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-slate-900 text-white p-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? <Clock size={16} className="animate-spin" /> : <Send size={16} />}
                                        Envoyer le message
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* TICKET LIST */}
                        <div className="space-y-4">
                            <h3 className="font-black text-slate-400 uppercase text-xs tracking-widest ml-2">Vos Tickets</h3>

                            {tickets.length === 0 ? (
                                <div className="text-center py-10 opacity-50">
                                    <MessageSquare size={48} className="mx-auto text-slate-300 mb-2" />
                                    <p className="text-xs font-bold text-slate-400">Aucun ticket pour le moment</p>
                                </div>
                            ) : (
                                tickets.map(ticket => (
                                    <div
                                        key={ticket.id}
                                        onClick={() => setSelectedTicket(ticket)}
                                        className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-3 active:scale-[0.98] transition-all cursor-pointer hover:border-orange-200"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    {ticket.priority === 'high' && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-md text-[9px] font-black uppercase">Urgent</span>}
                                                    <span className="text-xs text-slate-400 font-bold">{new Date(ticket.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <h4 className="font-black text-slate-800 leading-tight">{ticket.subject || 'Ticket Support'}</h4>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${ticket.status === 'resolved' ? 'bg-emerald-100 text-emerald-600' :
                                                ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                                                }`}>
                                                {ticket.status === 'resolved' ? 'Résolu' : ticket.status === 'in_progress' ? 'En Cours' : 'En Attente'}
                                            </span>
                                        </div>

                                        <p className="text-xs text-slate-600 font-medium truncate">
                                            {ticket.description}
                                        </p>

                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Ouvrir la discussion</span>
                                            <ChevronRight size={16} className="text-slate-300" />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
