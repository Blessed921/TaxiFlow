import React, { useState, useEffect } from 'react';
import Map from './Map';
import { useApp } from '../appContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Ride, RideStatus, DriverAvailability, DriverStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Power, MapPin, Navigation, DollarSign, Clock, CheckCircle, Smartphone } from 'lucide-react';

const DriverDashboard: React.FC = () => {
  const { user } = useApp();
  const [rides, setRides] = useState<Ride[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [availability, setAvailability] = useState<DriverAvailability>(DriverAvailability.OFFLINE);
  const [myLocation, setMyLocation] = useState<[number, number]>([51.505, -0.09]);

  // Online status listener
  useEffect(() => {
    if (!user) return;
    const statusRef = doc(db, 'driverStatus', user.uid);
    const unsub = onSnapshot(statusRef, (snap) => {
      if (snap.exists()) {
        setAvailability((snap.data() as DriverStatus).status);
      }
    });
    return () => unsub();
  }, [user]);

  // Ride queue listener
  useEffect(() => {
    if (availability !== DriverAvailability.ONLINE) {
      setRides([]);
      return;
    }
    const q = query(collection(db, 'rides'), where('status', '==', RideStatus.REQUESTED));
    return onSnapshot(q, (snapshot) => {
      setRides(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Ride)));
    });
  }, [availability]);

  // Active ride listener
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'rides'), 
      where('driverId', '==', user.uid),
      where('status', 'in', [RideStatus.ACCEPTED, RideStatus.ARRIVED, RideStatus.STARTED])
    );
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setActiveRide({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Ride);
      } else {
        setActiveRide(null);
      }
    });
  }, [user]);

  // Geolocation tracking
  useEffect(() => {
    if (availability === DriverAvailability.OFFLINE || !user) return;

    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by this browser.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setMyLocation([position.coords.latitude, position.coords.longitude]);
      },
      (error) => {
        console.error("Error watching position:", error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [user, availability]);

  // Location sync to Firestore
  useEffect(() => {
    if (availability === DriverAvailability.OFFLINE || !user) return;
    
    const interval = setInterval(async () => {
      const statusRef = doc(db, 'driverStatus', user.uid);
      await setDoc(statusRef, {
        driverId: user.uid,
        status: availability,
        location: { lat: myLocation[0], lng: myLocation[1] },
        lastUpdate: serverTimestamp()
      }, { merge: true });
    }, 5000);

    return () => clearInterval(interval);
  }, [user, availability, myLocation]);

  const toggleAvailability = async () => {
    if (!user) return;
    const newStatus = availability === DriverAvailability.OFFLINE ? DriverAvailability.ONLINE : DriverAvailability.OFFLINE;
    const statusRef = doc(db, 'driverStatus', user.uid);
    await setDoc(statusRef, {
      driverId: user.uid,
      status: newStatus,
      location: { lat: myLocation[0], lng: myLocation[1] },
      lastUpdate: serverTimestamp()
    });
  };

  const acceptRide = async (rideId: string) => {
    if (!user) return;
    const rideRef = doc(db, 'rides', rideId);
    await updateDoc(rideRef, {
      driverId: user.uid,
      status: RideStatus.ACCEPTED,
      updatedAt: serverTimestamp()
    });
  };

  const updateRideStatus = async (status: RideStatus) => {
    if (!activeRide) return;
    const rideRef = doc(db, 'rides', activeRide.id);
    await updateDoc(rideRef, {
       status,
       updatedAt: serverTimestamp()
    });
  };

  return (
    <div className="h-full w-full relative">
      <Map 
        center={myLocation}
        markers={[
          { id: 'me', position: myLocation, type: 'driver', label: 'You are here' },
          ...(activeRide ? [
            { id: 'pickup', position: [activeRide.pickup.lat, activeRide.pickup.lng] as [number, number], type: 'pickup' as const, label: 'Pickup' },
            { id: 'dest', position: [activeRide.destination.lat, activeRide.destination.lng] as [number, number], type: 'destination' as const, label: 'Destination' }
          ] : [])
        ]}
      />

      {/* Driver Controls */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-3 pointer-events-none">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={toggleAvailability}
          className={`p-4 rounded-2xl shadow-xl flex items-center gap-3 font-bold pointer-events-auto transition-colors ${
            availability === DriverAvailability.ONLINE ? 'bg-white text-green-600' : 'bg-slate-900 text-white'
          }`}
        >
          <Power size={20} className={availability === DriverAvailability.ONLINE ? 'animate-pulse' : ''} />
          {availability === DriverAvailability.ONLINE ? 'System Online' : 'Go Online'}
        </motion.button>
      </div>

      {/* Floating Queues/Rides */}
      <div className="absolute inset-x-0 bottom-0 z-[1000] p-4 md:p-8 flex flex-col items-center pointer-events-none">
        <AnimatePresence>
          {availability === DriverAvailability.ONLINE && !activeRide && (
            <motion.div 
               initial={{ y: 100, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               exit={{ y: 100, opacity: 0 }}
               className="w-full max-w-md pointer-events-auto"
            >
              <div className="bg-white/80 backdrop-blur-md border border-white/20 p-4 rounded-t-3xl text-center text-sm font-bold text-gray-500">
                Searching for requests... ({rides.length} available)
              </div>
              <div className="max-h-[60vh] overflow-y-auto space-y-3 bg-gray-100 p-4 rounded-b-3xl">
                {rides.length === 0 && (
                  <div className="py-12 text-center text-gray-400">
                    <Smartphone className="mx-auto mb-2 opacity-50" />
                    Waiting for nearby orders...
                  </div>
                )}
                {rides.map(ride => (
                  <motion.div 
                    key={ride.id}
                    layoutId={ride.id}
                    className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100"
                  >
                    <div className="flex justify-between items-start mb-3">
                       <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold uppercase tracking-tight">Express</span>
                       <span className="font-bold text-lg text-green-600">${ride.price.toFixed(2)}</span>
                    </div>
                    <div className="space-y-2 mb-4">
                       <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin size={14} className="text-blue-500" />
                          <span className="truncate">{ride.pickup.address}</span>
                       </div>
                       <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Navigation size={14} className="text-green-500" />
                          <span className="truncate">{ride.destination.address}</span>
                       </div>
                    </div>
                    <button 
                       onClick={() => acceptRide(ride.id)}
                       className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
                    >
                      Accept Ride
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeRide && (
            <motion.div 
               initial={{ y: 100, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               exit={{ y: 100, opacity: 0 }}
               className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 pointer-events-auto"
            >
               <div className="flex justify-between items-center mb-6">
                  <div>
                     <div className="text-xs font-bold text-gray-400 uppercase">Active Order</div>
                     <h3 className="text-xl font-bold">In-Progress</h3>
                  </div>
                  <div className="text-right">
                     <div className="text-2xl font-black text-green-600">${activeRide.price.toFixed(2)}</div>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-3 mb-6">
                  {activeRide.status === RideStatus.ACCEPTED && (
                    <button 
                      onClick={() => updateRideStatus(RideStatus.ARRIVED)}
                      className="col-span-2 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
                    >
                      I Have Arrived
                    </button>
                  )}
                  {activeRide.status === RideStatus.ARRIVED && (
                    <button 
                      onClick={() => updateRideStatus(RideStatus.STARTED)}
                      className="col-span-2 py-4 bg-orange-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
                    >
                      Start Trip
                    </button>
                  )}
                  {activeRide.status === RideStatus.STARTED && (
                    <button 
                      onClick={() => updateRideStatus(RideStatus.COMPLETED)}
                      className="col-span-2 py-4 bg-green-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
                    >
                      Complete Trip <CheckCircle size={20} />
                    </button>
                  )}
               </div>

               <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                     <Smartphone size={20} />
                  </div>
                  <div className="flex-1">
                     <div className="text-sm font-bold">Rider: Alex Johnson</div>
                     <div className="text-xs text-gray-500">Pick up at Front Entrance</div>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DriverDashboard;
