import React, { useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile, VehicleInfo } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Car, Smartphone, ChevronRight, CheckCircle, ShieldCheck, User } from 'lucide-react';
import { cn } from '../lib/utils';

interface DriverOnboardingProps {
  userProfile: UserProfile;
  onComplete: () => void;
}

const DriverOnboarding: React.FC<DriverOnboardingProps> = ({ userProfile, onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState<VehicleInfo>({
    make: '',
    model: '',
    color: '',
    plate: '',
    type: 'Comfort'
  });

  const nextStep = () => setStep(s => s + 1);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        phone,
        vehicle,
        onboarded: true,
        updatedAt: serverTimestamp()
      });
      onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-50 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
      <div className="w-full max-w-xl">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div>
                <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center text-white mb-6 rotate-3">
                   <User size={32} />
                </div>
                <h1 className="text-4xl font-black italic tracking-tighter text-slate-900 leading-[1.1]">Let's set up your profile</h1>
                <p className="text-slate-500 font-bold mt-4">Welcome to Swift! We need a few more details to get you on the road.</p>
              </div>

              <div className="space-y-4">
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Your Mobile Number</label>
                  <div className="flex items-center bg-white rounded-2xl border-2 border-slate-100 p-2 group-focus-within:border-slate-900 transition-all">
                    <div className="p-3 text-slate-400"><Smartphone size={20} /></div>
                    <input 
                      type="tel"
                      className="flex-1 bg-transparent px-2 outline-none font-bold text-slate-900" 
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={nextStep}
                disabled={!phone.trim()}
                className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-float hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
              >
                Continue Setup
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div>
                <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white mb-6 -rotate-3">
                   <Car size={32} />
                </div>
                <h1 className="text-4xl font-black italic tracking-tighter text-slate-900 leading-[1.1]">Tell us about your vehicle</h1>
                <p className="text-slate-500 font-bold mt-4">Your vehicle information helps riders identify you easily.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Make</label>
                  <input 
                    className="w-full bg-white rounded-2xl border-2 border-slate-100 p-4 outline-none font-bold text-slate-900 focus:border-slate-900 transition-all"
                    placeholder="Toyota"
                    value={vehicle.make}
                    onChange={(e) => setVehicle({...vehicle, make: e.target.value})}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Model</label>
                  <input 
                    className="w-full bg-white rounded-2xl border-2 border-slate-100 p-4 outline-none font-bold text-slate-900 focus:border-slate-900 transition-all"
                    placeholder="Camry"
                    value={vehicle.model}
                    onChange={(e) => setVehicle({...vehicle, model: e.target.value})}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Color</label>
                  <input 
                    className="w-full bg-white rounded-2xl border-2 border-slate-100 p-4 outline-none font-bold text-slate-900 focus:border-slate-900 transition-all"
                    placeholder="Midnight Black"
                    value={vehicle.color}
                    onChange={(e) => setVehicle({...vehicle, color: e.target.value})}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">License Plate</label>
                  <input 
                    className="w-full bg-white rounded-2xl border-2 border-slate-100 p-4 outline-none font-bold text-slate-900 focus:border-slate-900 transition-all"
                    placeholder="ABC-1234"
                    value={vehicle.plate}
                    onChange={(e) => setVehicle({...vehicle, plate: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1 text-center">Service Type</label>
                <div className="flex gap-4">
                  {['Comfort', 'Premium', 'Electric'].map((type) => (
                    <button 
                      key={type}
                      onClick={() => setVehicle({...vehicle, type})}
                      className={cn(
                        "flex-1 p-4 rounded-3xl border-2 font-black text-xs uppercase tracking-widest transition-all text-center",
                        vehicle.type === type ? "bg-slate-900 text-white border-slate-900 shadow-premium" : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="flex-1 py-5 border-2 border-slate-100 text-slate-400 rounded-3xl font-black hover:bg-slate-50 transition-all">Back</button>
                <button 
                  onClick={handleSubmit} 
                  disabled={loading || !vehicle.make || !vehicle.model || !vehicle.plate}
                  className="flex-[2] py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-float"
                >
                  {loading ? 'Completing...' : 'Done & Start'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DriverOnboarding;
