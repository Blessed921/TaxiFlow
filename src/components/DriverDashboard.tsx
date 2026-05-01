import React, { useState, useEffect, useMemo } from 'react';
import Map from './Map';
import { useApp } from '../appContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { Ride, RideStatus, DriverAvailability, DriverStatus, UserRole, RideType, UserProfile, VehicleInfo } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Power, MapPin, Navigation, DollarSign, Clock, CheckCircle, Smartphone, History, LayoutDashboard, TrendingUp, Package, Car, X, Menu, ChevronLeft, MessageSquare, Phone } from 'lucide-react';
import { cn } from '../lib/utils';
import RideHistory from './RideHistory';
import DriverOnboarding from './DriverOnboarding';
import Chat from './Chat';

const DriverDashboard: React.FC = () => {
  const { user, profile } = useApp();
  const [rides, setRides] = useState<Ride[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [activeRider, setActiveRider] = useState<UserProfile | null>(null);
  const [availability, setAvailability] = useState<DriverAvailability>(DriverAvailability.OFFLINE);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [myLocation, setMyLocation] = useState<[number, number]>([51.505, -0.09]);
  const [earnings, setEarnings] = useState(0);

  // Status and Location listeners
  useEffect(() => {
    if (!user || !profile?.onboarded) return;
    const unsubStatus = onSnapshot(doc(db, 'driverStatus', user.uid), (snap) => {
      if (snap.exists()) setAvailability((snap.data() as DriverStatus).status);
    });

    const watchId = navigator.geolocation.watchPosition(
      (pos) => setMyLocation([pos.coords.latitude, pos.coords.longitude]),
      null, { enableHighAccuracy: true }
    );

    return () => { unsubStatus(); navigator.geolocation.clearWatch(watchId); };
  }, [user]);

  // Sync location to Firestore
  useEffect(() => {
    if (!user || availability === DriverAvailability.OFFLINE) return;
    const interval = setInterval(() => {
      setDoc(doc(db, 'driverStatus', user.uid), {
        driverId: user.uid,
        status: availability,
        location: { lat: myLocation[0], lng: myLocation[1] },
        lastUpdate: serverTimestamp()
      }, { merge: true });
    }, 10000);
    return () => clearInterval(interval);
  }, [user, availability, myLocation]);

  // Ride queue
  useEffect(() => {
    if (availability !== DriverAvailability.ONLINE) { setRides([]); return; }
    const q = query(collection(db, 'rides'), where('status', '==', RideStatus.REQUESTED));
    return onSnapshot(q, (snapshot) => {
      setRides(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Ride)));
    });
  }, [availability]);

  // Active ride
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'rides'), where('driverId', '==', user.uid), where('status', 'in', [RideStatus.ACCEPTED, RideStatus.ARRIVED, RideStatus.STARTED]));
    return onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const ride = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Ride;
        setActiveRide(ride);
        const riderDoc = await getDoc(doc(db, 'users', ride.riderId));
        if (riderDoc.exists()) setActiveRider(riderDoc.data() as UserProfile);
      } else {
        setActiveRide(null);
        setActiveRider(null);
      }
    });
  }, [user]);

  // Total Earnings
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'rides'), where('driverId', '==', user.uid), where('status', '==', RideStatus.COMPLETED));
    return onSnapshot(q, (snap) => {
      setEarnings(snap.docs.reduce((acc, d) => acc + (d.data().price || 0), 0));
    });
  }, [user]);

  const toggleAvailability = async () => {
    if (!user) return;
    const newStatus = availability === DriverAvailability.OFFLINE ? DriverAvailability.ONLINE : DriverAvailability.OFFLINE;
    await setDoc(doc(db, 'driverStatus', user.uid), { status: newStatus, location: { lat: myLocation[0], lng: myLocation[1] }, lastUpdate: serverTimestamp() }, { merge: true });
  };

  const acceptRide = async (id: string) => {
    await updateDoc(doc(db, 'rides', id), { driverId: user?.uid, status: RideStatus.ACCEPTED, updatedAt: serverTimestamp() });
  };

  const updateStatus = async (status: RideStatus) => {
    if (activeRide) await updateDoc(doc(db, 'rides', activeRide.id), { status, updatedAt: serverTimestamp() });
  };

  if (profile && !profile.onboarded) {
    return <DriverOnboarding userProfile={profile} onComplete={() => {}} />;
  }

  return (
    <div className="h-full w-full relative overflow-hidden bg-slate-100">
      <div className="absolute inset-0 z-0">
        <Map center={myLocation} markers={[{ id: 'me', position: myLocation, type: 'driver', label: 'You' }, ...(activeRide ? [{ id: 'p', position: [activeRide.pickup.lat, activeRide.pickup.lng] as [number, number], type: 'pickup' as const, label: 'Pickup' }, { id: 'd', position: [activeRide.destination.lat, activeRide.destination.lng] as [number, number], type: 'destination' as const, label: 'Dropoff' }] : [])]} />
      </div>

      {/* Top Bar */}
      <div className="absolute top-6 left-6 right-6 z-10 flex justify-between items-start pointer-events-none">
        <button onClick={() => setIsSidebarOpen(true)} className="p-4 bg-white rounded-2xl shadow-float pointer-events-auto hover:bg-slate-50 transition-colors"><Menu size={24} /></button>
        
        <div className="flex flex-col items-end gap-3 pointer-events-auto">
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={toggleAvailability}
            className={cn(
              "px-6 py-4 rounded-2xl shadow-float flex items-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all",
              availability === DriverAvailability.ONLINE ? "bg-white text-emerald-600 border border-emerald-100" : "bg-slate-900 text-white shadow-premium"
            )}
          >
            <Power size={16} className={availability === DriverAvailability.ONLINE ? 'animate-pulse' : ''} />
            {availability === DriverAvailability.ONLINE ? 'Online' : 'Offline'}
          </motion.button>
          
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-premium border border-white/20 text-right">
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Today's Earnings</div>
             <div className="text-2xl font-black text-slate-900 tracking-tighter">${earnings.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Main Bottom UI */}
      <AnimatePresence>
        {(availability === DriverAvailability.ONLINE || activeRide) && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute bottom-0 inset-x-0 z-20 bottom-sheet px-6 pb-12 pt-4 flex flex-col items-center max-h-[80vh] overflow-hidden"
          >
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mb-8 shrink-0" />
            
            <div className="w-full max-w-xl overflow-y-auto no-scrollbar">
              {activeRide ? (
                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-2xl font-extrabold tracking-tight italic">Active Hub</h3>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                        {activeRide.type === RideType.RIDE ? 'Passenger Trip' : 'Dispatch Order'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-emerald-600 tracking-tighter">${activeRide.price.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {activeRide.status === RideStatus.ACCEPTED && (
                      <button onClick={() => updateStatus(RideStatus.ARRIVED)} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-float hover:bg-indigo-700 transition-all">I'm at Pick-up</button>
                    )}
                    {activeRide.status === RideStatus.ARRIVED && (
                      <button onClick={() => updateStatus(RideStatus.STARTED)} className="w-full py-5 bg-orange-500 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-float hover:bg-orange-600 transition-all">Start Task</button>
                    )}
                    {activeRide.status === RideStatus.STARTED && (
                      <button onClick={() => updateStatus(RideStatus.COMPLETED)} className="w-full py-5 bg-emerald-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-float hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">Complete & Finalize <CheckCircle size={18} /></button>
                    )}
                  </div>

                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
                     <div className="w-14 h-14 rounded-2xl bg-white shadow-sm overflow-hidden border border-slate-100 ring-4 ring-indigo-50">
                        <img src={activeRider?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeRide.riderId}`} alt="Rider" />
                     </div>
                     <div className="flex-1">
                        <div className="font-extrabold text-slate-900 text-lg">{activeRider?.displayName || 'Approaching Point'}</div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{activeRide.type === RideType.RIDE ? 'Wait at pickup spot' : 'Package verification needed'}</div>
                     </div>
                     <div className="flex gap-2">
                       <button 
                         onClick={() => window.open(`tel:${activeRider?.phone || ''}`)}
                         className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition-colors shadow-sm"
                       >
                         <Phone size={20}/>
                       </button>
                       <button 
                         onClick={() => setIsChatOpen(true)}
                         className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-colors shadow-sm"
                       >
                         <MessageSquare size={20}/>
                       </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isChatOpen && (
                      <Chat 
                        rideId={activeRide.id} 
                        currentUserId={user?.uid || ''} 
                        onClose={() => setIsChatOpen(false)}
                        otherUser={activeRider}
                      />
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-extrabold italic tracking-tight uppercase">Incoming Hubs</h3>
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{rides.length} Pings nearby</span>
                  </div>

                  {rides.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 animate-pulse"><Navigation size={32}/></div>
                      <p className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">Searching for jobs...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {rides.map(ride => (
                        <div key={ride.id} className="p-6 bg-white rounded-3xl border-2 border-slate-900 shadow-float">
                          <div className="flex justify-between items-start mb-6">
                            <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", ride.type === RideType.RIDE ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-emerald-50 text-emerald-600 border-emerald-100")}>
                               {ride.type === RideType.RIDE ? 'Ride' : 'Dispatch'}
                            </div>
                            <span className="text-3xl font-black text-slate-900 tracking-tighter">${ride.price.toFixed(2)}</span>
                          </div>
                          <div className="space-y-3 mb-6">
                             <div className="flex items-center gap-2 text-xs font-bold text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"/> <span className="line-clamp-1">{ride.pickup.address}</span></div>
                             <div className="flex items-center gap-2 text-xs font-bold text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"/> <span className="line-clamp-1">{ride.destination.address}</span></div>
                          </div>
                          <button onClick={() => acceptRide(ride.id)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all">Accept Job</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSidebarOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="absolute top-0 bottom-0 left-0 w-full max-w-sm bg-white z-[101] shadow-2xl p-8 flex flex-col">
               <div className="flex justify-between items-center mb-12">
                  <div className="flex items-center gap-3"><div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-xl italic">S</div><h2 className="text-2xl font-black italic tracking-tighter">Swift</h2></div>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-400"><ChevronLeft size={24}/></button>
               </div>
               <div className="flex-1 overflow-y-auto no-scrollbar"><RideHistory userId={user?.uid || ''} role={UserRole.DRIVER} /></div>
               <div className="mt-auto pt-8 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl overflow-hidden"><img src={user?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=driver'} alt="D" /></div>
                    <div><div className="font-extrabold text-slate-900">{user?.displayName || 'Driver'}</div><div className="text-xs font-bold text-slate-400">Driver Portal</div></div>
                  </div>
                  <button className="p-4 rounded-xl border border-slate-100 hover:bg-slate-50 text-slate-400 transition-colors"><X size={20}/></button>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DriverDashboard;
