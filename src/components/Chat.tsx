import React, { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy } from 'firebase/firestore';
import { ChatMessage, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, User, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';

interface ChatProps {
  rideId: string;
  currentUserId: string;
  onClose: () => void;
  otherUser?: UserProfile | null;
}

const Chat: React.FC<ChatProps> = ({ rideId, currentUserId, onClose, otherUser }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'chats'),
      where('rideId', '==', rideId),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });
  }, [rideId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      await addDoc(collection(db, 'chats'), {
        rideId,
        senderId: currentUserId,
        text: inputText.trim(),
        createdAt: serverTimestamp(),
      });
      setInputText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chats');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 1, y: '100%' }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-x-0 bottom-0 top-0 z-[100] bg-white flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 pt-12 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-400 -ml-2"
          >
            <X size={24} />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white overflow-hidden shadow-premium">
            {otherUser?.photoURL ? (
              <img src={otherUser.photoURL} alt={otherUser.displayName} className="w-full h-full object-cover" />
            ) : (
              <User size={24} />
            )}
          </div>
          <div>
            <h3 className="font-black text-xl text-slate-900 leading-none tracking-tight">{otherUser?.displayName || 'Chat'}</h3>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Now
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-slate-50/30">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-20 pointer-events-none">
            <MessageSquare size={48} className="mb-4" />
            <p className="font-black uppercase tracking-[0.2em] text-[10px]">No messages yet</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          return (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              key={msg.id} 
              className={cn("flex", isMe ? "justify-end" : "justify-start")}
            >
              <div className={cn(
                "max-w-[85%] px-6 py-4 rounded-[2rem] text-sm font-bold shadow-sm border",
                isMe 
                  ? "bg-slate-900 text-white border-slate-900 rounded-tr-none shadow-premium" 
                  : "bg-white text-slate-900 border-slate-100 rounded-tl-none"
              )}>
                {msg.text}
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      <div className="px-6 py-3 bg-white border-t border-slate-50 flex gap-2 overflow-x-auto no-scrollbar">
        {['On my way!', 'OK', 'Where are you?', 'I have arrived', 'Wait 2 mins'].map((text) => (
          <button 
            key={text}
            onClick={() => {
              addDoc(collection(db, 'chats'), {
                rideId,
                senderId: currentUserId,
                text,
                createdAt: serverTimestamp(),
              });
            }}
            className="whitespace-nowrap px-4 py-2 bg-slate-50 border border-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 transition-colors"
          >
            {text}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-6 pb-12 bg-white sticky bottom-0">
        <div className="relative flex items-center gap-3">
          <input 
            type="text"
            className="flex-1 bg-slate-50 px-6 py-5 rounded-3xl outline-none text-sm font-bold border-2 border-transparent focus:border-slate-900 focus:bg-white transition-all"
            placeholder="Write a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button 
            type="submit"
            className="p-5 bg-slate-900 text-white rounded-3xl shadow-float hover:bg-black transition-all active:scale-90"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default Chat;
