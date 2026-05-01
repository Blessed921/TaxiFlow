import React, { useState, useEffect, useMemo } from 'react';
import Map from './Map';
import { useApp } from '../appContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Ride, RideStatus, Location, DriverStatus, DriverAvailability, UserRole, RideType, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Navigation, Clock, Star, X, Crosshair, History, Car, Package, ShieldCheck, Menu, ChevronLeft, Send, Phone, MessageSquare } from 'lucide-react';
import { cn, calculateDistance, calculateFare } from '../lib/utils';
import RideHistory from './RideHistory';
import Chat from './Chat';

const RiderDashboard: React.FC = () => {
  const { user } = useApp();
  const [pickup, setPickup] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [assignedDriver, setAssignedDriver] = useState<UserProfile | null>(null);
  const [drivers, setDrivers] = useState<DriverStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'selecting' | 'confirming' | 'searching' | 'onRide'>('selecting');
  const [rideType, setRideType] = useState<RideType>(RideType.RIDE);
  const [mapCenter, setMapCenter] = useState<[number, number]>([51.505, -0.09]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeSearching, setActiveSearching] = useState<'pickup' | 'destination' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Auto-detect rider location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = { 
            lat: position.coords.latitude, 
            lng: position.coords.longitude, 
            address: 'Your Location' 
          };
          setMapCenter([loc.lat, loc.lng]);
          if (step === 'selecting' && !pickup) setPickup(loc);
        },
        null,
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Location search
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
        const data = await res.json();
        setSuggestions(data.map((item: any) => ({
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          address: item.display_name
        })));
      } catch (err) { console.error(err); }
      finally { setSearchLoading(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Listen for drivers
  useEffect(() => {
    const q = query(collection(db, 'driverStatus'), where('status', '==', DriverAvailability.ONLINE));
    return onSnapshot(q, (snapshot) => {
      setDrivers(snapshot.docs.map(d => d.data() as DriverStatus));
    });
  }, []);

  // Listen for active ride
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'rides'), 
      where('riderId', '==', user.uid),
      where('status', 'in', [RideStatus.REQUESTED, RideStatus.ACCEPTED, RideStatus.ARRIVED, RideStatus.STARTED])
    );
    return onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const ride = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Ride;
        setActiveRide(ride);
        setStep(ride.status === RideStatus.REQUESTED ? 'searching' : 'onRide');
        if (ride.driverId) {
          const driverDoc = await getDoc(doc(db, 'users', ride.driverId));
          if (driverDoc.exists()) setAssignedDriver(driverDoc.data() as UserProfile);
        }
      } else {
        setActiveRide(null);
        setAssignedDriver(null);
        if (step !== 'confirming') setStep('selecting');
      }
    });
  }, [user]);

  const estimatedFare = useMemo(() => {
    if (!pickup || !destination) return 0;
    const dist = calculateDistance(pickup.lat, pickup.lng, destination.lat, destination.lng);
    return calculateFare(dist);
  }, [pickup, destination]);

  const requestRide = async () => {
    if (!user || !pickup || !destination) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'rides'), {
        riderId: user.uid,
        type: rideType,
        status: RideStatus.REQUESTED,
        pickup,
        destination,
        price: estimatedFare,
        vehicleType: rideType === RideType.RIDE ? 'Comfort' : 'Express Delivery',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const cancelRide = async () => {
    if (!activeRide) return;
    await updateDoc(doc(db, 'rides', activeRide.id), { status: RideStatus.CANCELLED, updatedAt: serverTimestamp() });
    setStep('selecting');
  };

  const resetSelection = () => {
    setPickup(null);
    setDestination(null);
    setStep('selecting');
  };

  const selectLocation = (loc: Location) => {
    if (activeSearching === 'pickup') setPickup(loc);
    else {
      setDestination(loc);
      setStep('confirming');
    }
    setMapCenter([loc.lat, loc.lng]);
    setActiveSearching(null);
    setSearchQuery('');
  };

  return (
    <div className="h-full w-full relative overflow-hidden bg-slate-100">
      <div className="absolute inset-0 z-0">
        <Map 
          center={mapCenter}
          onMapClick={(lat, lng) => {
            if (step !== 'selecting') return;
            const loc = { lat, lng, address: `Dropped Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})` };
            if (!pickup) setPickup(loc);
            else if (!destination) { setDestination(loc); setStep('confirming'); }
          }}
          markers={[
            ...(pickup ? [{ id: 'pickup', position: [pickup.lat, pickup.lng] as [number, number], type: 'pickup' as const, label: 'Pickup' }] : []),
            ...(destination ? [{ id: 'destination', position: [destination.lat, destination.lng] as [number, number], type: 'destination' as const, label: 'Destination' }] : []),
            ...drivers.map(d => ({ id: d.driverId, position: [d.location.lat, d.location.lng] as [number, number], type: 'driver' as const, label: 'Available' }))
          ]}
        />
      </div>

      {/* Top Bar / Search */}
      <div className="absolute top-6 left-6 right-6 z-10 flex flex-col gap-3 pointer-events-none">
        <div className="flex justify-between items-center pointer-events-auto">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-4 bg-white rounded-2xl shadow-float hover:bg-slate-50 transition-colors"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex gap-2 p-1 bg-white/80 backdrop-blur-md rounded-2xl shadow-float border border-white/20">
            <button 
              onClick={() => setRideType(RideType.RIDE)}
              className={cn("px-5 py-2 rounded-xl text-xs font-bold transition-all", rideType === RideType.RIDE ? "bg-slate-900 text-white shadow-premium" : "text-slate-400")}
            >
              Ride
            </button>
            <button 
              onClick={() => setRideType(RideType.DISPATCH)}
              className={cn("px-5 py-2 rounded-xl text-xs font-bold transition-all", rideType === RideType.DISPATCH ? "bg-slate-900 text-white shadow-premium" : "text-slate-400")}
            >
              Dispatch
            </button>
          </div>
        </div>

        <AnimatePresence>
          {step === 'selecting' && (
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="w-full max-w-xl mx-auto pointer-events-auto mt-4 px-4 lg:px-0"
            >
              <div className="bg-white rounded-3xl shadow-float p-2 border border-slate-100 flex flex-col gap-1">
                <div className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-2xl transition-colors group">
                  <div className="w-2 h-2 rounded-full bg-indigo-600 ring-4 ring-indigo-50" />
                  <input 
                    className="flex-1 text-sm font-semibold outline-none bg-transparent"
                    placeholder="Pickup from..."
                    value={activeSearching === 'pickup' ? searchQuery : (pickup?.address || 'Your Location')}
                    onFocus={() => { setActiveSearching('pickup'); setSearchQuery(''); }}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="h-[1px] bg-slate-100 mx-4" />
                <div className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-2xl transition-colors group">
                  <div className="w-2 h-2 rounded-full bg-rose-500 ring-4 ring-rose-50" />
                  <input 
                    className="flex-1 text-sm font-semibold outline-none bg-transparent"
                    placeholder="Where's the destination?"
                    value={activeSearching === 'destination' ? searchQuery : (destination?.address || '')}
                    onFocus={() => { setActiveSearching('destination'); setSearchQuery(''); }}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Search Suggestions */}
              {activeSearching && (
                <div className="mt-2 bg-white rounded-3xl shadow-float max-h-60 overflow-y-auto no-scrollbar border border-slate-100">
                  {searchLoading ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-bold animate-pulse">Finding locations...</div>
                  ) : suggestions.length > 0 ? (
                    suggestions.map((loc, i) => (
                      <button 
                        key={i} 
                        onClick={() => selectLocation(loc)}
                        className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 text-left transition-colors border-b border-slate-50 last:border-0"
                      >
                        <div className="p-2 bg-slate-100 rounded-lg"><MapPin size={16} className="text-slate-400" /></div>
                        <span className="text-xs font-bold text-slate-600 line-clamp-1">{loc.address}</span>
                      </button>
                    ))
                  ) : searchQuery.length >= 3 && (
                    <div className="p-8 text-center text-slate-400 text-xs font-bold">No results found</div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Sheet */}
      <AnimatePresence>
        {(step === 'confirming' || step === 'searching' || step === 'onRide') && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-0 inset-x-0 z-20 bottom-sheet px-6 pb-12 pt-4 flex flex-col items-center"
          >
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mb-8" />
            
            <div className="w-full max-w-xl">
              {step === 'confirming' && (
                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-2xl font-extrabold tracking-tight">Choose your ride</h3>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Found {drivers.length} available near you</p>
                    </div>
                    <button onClick={resetSelection} className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"><X size={20}/></button>
                  </div>

                  <div className="space-y-2">
                    <button className={cn(
                      "w-full p-5 rounded-3xl border-2 flex items-center gap-4 transition-all text-left",
                      rideType === RideType.RIDE ? "border-slate-900 bg-slate-50" : "border-slate-100 hover:border-slate-300"
                    )}>
                      <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                        {rideType === RideType.RIDE ? <Car size={32} /> : <Package size={32} />}
                      </div>
                      <div className="flex-1">
                        <div className="font-extrabold text-slate-900">{rideType === RideType.RIDE ? 'Swift Comfort' : 'Swift Drop'}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Clock size={10}/> 4 min away</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-slate-900">${estimatedFare.toFixed(2)}</div>
                        <div className="text-[10px] font-bold text-emerald-500 uppercase">Promo active</div>
                      </div>
                    </button>
                    
                    <button className="w-full p-5 rounded-3xl border-2 border-slate-50 bg-slate-50/50 flex items-center gap-4 opacity-50 cursor-not-allowed">
                       <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400"><Star size={32} /></div>
                       <div className="flex-1">
                          <div className="font-extrabold text-slate-400">Swift Premium</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unavailable</div>
                       </div>
                    </button>
                  </div>

                  <button 
                    onClick={requestRide}
                    disabled={loading}
                    className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg transition-all hover:bg-black active:scale-[0.98] shadow-float disabled:opacity-50"
                  >
                    {loading ? 'Confirming...' : `Request ${rideType === RideType.RIDE ? 'Ride' : 'Dispatch'}`}
                  </button>
                </div>
              )}

              {step === 'searching' && (
                <div className="flex flex-col items-center py-6">
                  <div className="relative w-24 h-24 mb-6">
                    <div className="absolute inset-0 border-4 border-slate-900 rounded-full animate-ping opacity-20" />
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900 rounded-full text-white">
                      <Send className="animate-bounce" size={32} />
                    </div>
                  </div>
                  <h3 className="text-xl font-extrabold mb-1">Searching for nearby hubs</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">Matching with the best driver for you</p>
                  <button 
                    onClick={cancelRide}
                    className="px-8 py-3 bg-rose-50 text-rose-500 font-black text-[10px] uppercase tracking-widest rounded-full hover:bg-rose-100 transition-colors"
                  >
                    Cancel Request
                  </button>
                </div>
              )}

              {step === 'onRide' && activeRide && (
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden ring-4 ring-slate-50 border border-slate-200">
                        <img 
                          src={assignedDriver?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeRide.driverId}`} 
                          alt="Driver" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div>
                        <div className="font-extrabold text-xl text-slate-900">
                          {assignedDriver?.displayName || 'Approaching'}
                        </div>
                        <div className="text-xs font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest mt-0.5">
                          <Star size={12} className="text-yellow-400 fill-yellow-400" /> {assignedDriver?.rating || '4.9'}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button 
                         onClick={() => window.open(`tel:${assignedDriver?.phone || ''}`)}
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
                        otherUser={assignedDriver}
                      />
                    )}
                  </AnimatePresence>

                  <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vehicle Match</div>
                      <div className="font-extrabold text-slate-900">
                        {assignedDriver?.vehicle?.make} {assignedDriver?.vehicle?.model} • {assignedDriver?.vehicle?.color}
                      </div>
                      <div className="text-xs font-bold text-indigo-600 mt-1">Plate: {assignedDriver?.vehicle?.plate}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">ETA</div>
                      <div className="font-black text-2xl text-slate-900">4 min</div>
                    </div>
                  </div>

                  <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-colors flex items-center justify-center gap-2">
                    <ShieldCheck size={16} /> Safety Options
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute top-0 bottom-0 left-0 w-full max-w-sm bg-white z-[101] shadow-2xl p-8 flex flex-col"
            >
              <div className="flex justify-between items-center mb-12">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-xl italic">S</div>
                  <h2 className="text-2xl font-black italic tracking-tighter">Swift</h2>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
                  <ChevronLeft size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar -mx-4 px-4 space-y-1">
                <button className="w-full p-4 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center gap-4 transition-all">
                  <History size={20}/>
                  <span className="font-extrabold text-sm uppercase tracking-widest">Ride History</span>
                </button>
                <div className="pt-8 px-4 flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto no-scrollbar">
                    {user && <RideHistory userId={user.uid} role={UserRole.RIDER} />}
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-8 border-t border-slate-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden">
                    <img src={user?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'} alt="Me" />
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900">{user?.displayName || 'User'}</div>
                    <div className="text-xs font-bold text-slate-400">{user?.email}</div>
                  </div>
                </div>
                <button className="w-full py-4 border-2 border-slate-100 rounded-2xl text-xs font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 hover:border-rose-100 transition-all">
                   Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RiderDashboard;
