import React, { useState, useEffect } from 'react';
import Map from './Map';
import { useApp } from '../appContext';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { Ride, RideStatus, Location, DriverStatus, DriverAvailability } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Navigation, Clock, CreditCard, Star, X, Crosshair } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const RiderDashboard: React.FC = () => {
  const { user } = useApp();
  const [pickup, setPickup] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [drivers, setDrivers] = useState<DriverStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'selecting' | 'confirming' | 'searching' | 'onRide'>('selecting');

  // Auto-detect rider location
  useEffect(() => {
    if (step === 'selecting' && !pickup && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPickup({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Your current location'
          });
        }
      );
    }
  }, [step, pickup]);

  // Listen for nearby drivers (mocking real-time presence)
  useEffect(() => {
    const q = query(collection(db, 'driverStatus'), where('status', '==', DriverAvailability.ONLINE));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data() as DriverStatus);
      setDrivers(docs);
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
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const ride = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Ride;
        setActiveRide(ride);
        setStep(ride.status === RideStatus.REQUESTED ? 'searching' : 'onRide');
      } else {
        setActiveRide(null);
        if (step !== 'confirming') setStep('selecting');
      }
    });
  }, [user, step]);

  const requestRide = async () => {
    if (!user || !pickup || !destination) return;
    setLoading(true);
    try {
      const price = Math.floor(Math.random() * 20) + 15;
      const rideData = {
        riderId: user.uid,
        status: RideStatus.REQUESTED,
        pickup,
        destination,
        price,
        surgeMultiplier: 1.2, // Simulated surge
        vehicleType: 'Economy',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'rides'), rideData);
      setStep('searching');
    } catch (error) {
      console.error('Error requesting ride', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelRide = async () => {
    if (!activeRide) return;
    try {
      const rideRef = doc(db, 'rides', activeRide.id);
      await updateDoc(rideRef, { 
        status: RideStatus.CANCELLED,
        updatedAt: serverTimestamp() 
      });
      setStep('selecting');
    } catch (error) {
      console.error('Error cancelling ride', error);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (step !== 'selecting') return;
    const loc = { lat, lng, address: `Point (${lat.toFixed(4)}, ${lng.toFixed(4)})` };
    if (!pickup) {
      setPickup(loc);
    } else if (!destination) {
      setDestination(loc);
      setStep('confirming');
    }
  };

  const resetSelection = () => {
    setPickup(null);
    setDestination(null);
    setStep('selecting');
  };

  return (
    <div className="h-full w-full relative">
      <Map 
        onMapClick={handleMapClick}
        markers={[
          ...(pickup ? [{ id: 'pickup', position: [pickup.lat, pickup.lng] as [number, number], type: 'pickup' as const, label: 'Pickup' }] : []),
          ...(destination ? [{ id: 'dest', position: [destination.lat, destination.lng] as [number, number], type: 'destination' as const, label: 'Destination' }] : []),
          ...drivers.map(d => ({ id: d.driverId, position: [d.location.lat, d.location.lng] as [number, number], type: 'driver' as const, label: 'Driver Available' }))
        ]}
      />

      {/* Floating UI */}
      <div className="absolute inset-x-0 bottom-0 z-[1000] p-4 md:p-8 flex flex-col items-center pointer-events-none">
        
        {/* Selection UI */}
        <AnimatePresence>
          {step === 'selecting' && (
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-[40px] border-[8px] border-slate-900 shadow-2xl p-8 pointer-events-auto flex flex-col gap-6"
            >
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">User App</p>
                <h3 className="text-2xl font-black tracking-tight text-slate-800">Where to?</h3>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className={cn("flex-1 p-4 rounded-2xl border-2 flex items-center gap-3 transition-colors", pickup ? "border-indigo-600 bg-indigo-50" : "border-slate-100 bg-slate-50")}>
                    <div className={cn("w-2 h-2 rounded-full", pickup ? "bg-indigo-600" : "bg-slate-300")} />
                    <span className={cn("flex-1 text-sm font-bold", !pickup ? "text-slate-400" : "text-indigo-900")}>
                      {pickup?.address || 'Set Pickup...'}
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((pos) => {
                          setPickup({
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                            address: 'Your current location'
                          });
                        });
                      }
                    }}
                    className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-black transition-colors shadow-lg pointer-events-auto"
                    title="Use current location"
                  >
                    <Crosshair size={20} />
                  </button>
                </div>
                <div className={cn("p-4 rounded-2xl border-2 flex items-center gap-3 transition-colors", destination ? "border-indigo-600 bg-indigo-50 shadow-lg shadow-indigo-100" : "border-slate-100 bg-slate-50")}>
                  <div className={cn("w-2 h-2 rounded-full", destination ? "bg-indigo-600 animate-pulse" : "bg-slate-300")} />
                  <span className={cn("flex-1 text-sm font-bold", !destination ? "text-slate-400" : "text-indigo-900")}>
                    {destination?.address || 'Set Destination...'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 items-center justify-center pt-2">
                <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                <div className="w-2 h-2 bg-slate-200 rounded-full"></div>
                <div className="w-2 h-2 bg-slate-200 rounded-full"></div>
              </div>
            </motion.div>
          )}

          {step === 'confirming' && (
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-[40px] border-[8px] border-slate-900 shadow-2xl p-8 pointer-events-auto"
            >
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Confirm Trip</p>
                    <h3 className="text-2xl font-black tracking-tight">SwiftEconomy</h3>
                 </div>
                 <button onClick={resetSelection} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 transition-colors">
                    <X size={20} />
                 </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                 <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">ETA</div>
                    <div className="font-black text-xl text-slate-900">12m</div>
                 </div>
                 <div className="p-5 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-200">
                    <div className="text-[10px] font-black opacity-80 mb-1 uppercase tracking-widest">Est. Fare</div>
                    <div className="font-black text-xl">$18.50</div>
                 </div>
              </div>

              <div className="mb-6 flex gap-2 items-center bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
                <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">PROMO: FAST20</div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase">Applied 20% Off</span>
              </div>

              <button 
                onClick={requestRide}
                disabled={loading}
                className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 disabled:opacity-50 uppercase tracking-tight"
              >
                {loading ? 'Routing...' : 'Book Ride Now'}
              </button>
            </motion.div>
          )}

          {step === 'searching' && (
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-[40px] border-[8px] border-slate-900 shadow-2xl p-10 pointer-events-auto text-center"
            >
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 border-[6px] border-indigo-100 rounded-full animate-ping" />
                <div className="absolute inset-0 border-[6px] border-indigo-600 rounded-full flex items-center justify-center bg-indigo-50">
                  <Navigation className="text-indigo-600 animate-bounce" size={40} />
                </div>
              </div>
              <h3 className="text-2xl font-black tracking-tight mb-2 uppercase">Finding Fleet</h3>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-8">Cluster-Optimized Real-Time Sync</p>
              <button 
                onClick={cancelRide}
                className="text-rose-500 font-black uppercase tracking-widest text-xs hover:underline decoration-2 underline-offset-4"
              >
                Abort Request
              </button>
            </motion.div>
          )}

          {step === 'onRide' && activeRide && (
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 pointer-events-auto"
            >
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden">
                       <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activeRide.driverId}`} alt="Driver" />
                    </div>
                    <div>
                       <div className="font-bold">Marco Ross</div>
                       <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Star size={12} className="text-yellow-400 fill-yellow-400" /> 4.9 (120 rides)
                       </div>
                    </div>
                 </div>
                 <div className="text-right">
                    <div className="text-xs text-gray-500 uppercase tracking-wider font-bold">Status</div>
                    <div className="text-blue-600 font-bold capitalize">{activeRide.status}</div>
                 </div>
              </div>
              
              <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between">
                 <div className="text-sm font-medium">Toyota Prius • White • TXI 440</div>
                 <div className="text-xs px-2 py-1 bg-white border border-gray-100 rounded-md font-bold">ETA 4 MINS</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RiderDashboard;
