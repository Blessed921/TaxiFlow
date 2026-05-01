import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Ride, RideStatus, UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, MapPin, Navigation, ChevronRight, History, Calendar } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface RideHistoryProps {
  userId: string;
  role: UserRole;
  onClose?: () => void;
}

const RideHistory: React.FC<RideHistoryProps> = ({ userId, role, onClose }) => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const field = role === UserRole.RIDER ? 'riderId' : 'driverId';
    const q = query(
      collection(db, 'rides'),
      where(field, '==', userId),
      where('status', 'in', [RideStatus.COMPLETED, RideStatus.CANCELLED]),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setRides(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Ride)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'rides');
      setLoading(false);
    });

    return () => unsub();
  }, [userId, role]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar p-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-black uppercase tracking-widest">Fetching...</span>
          </div>
        ) : rides.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center">
              <Clock size={32} opacity={0.3} />
            </div>
            <p className="font-bold text-sm">No rides found yet</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {rides.map((ride) => (
              <motion.div
                key={ride.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group p-4 bg-white rounded-3xl border border-slate-100 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-50/50 transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Calendar size={10} />
                    {formatDate(ride.createdAt)}
                  </div>
                  <div className={cn(
                    "px-2 py-1 rounded text-[10px] font-black uppercase tracking-tight",
                    ride.status === RideStatus.COMPLETED ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  )}>
                    {ride.status}
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
                    <span className="text-xs font-bold text-slate-600 line-clamp-1">{ride.pickup.address}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-xs font-bold text-slate-600 line-clamp-1">{ride.destination.address}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <ChevronRight size={14} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{ride.type || 'Ride'}</span>
                      <p className="text-[8px] font-bold text-slate-300 uppercase leading-none">{ride.vehicleType}</p>
                    </div>
                  </div>
                  <div className="text-lg font-black text-slate-900 tracking-tight">
                    ${ride.price.toFixed(2)}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default RideHistory;
