import React from 'react';
import { motion } from 'motion/react';
import { signInWithGoogle } from '../lib/firebase';
import { Navigation, ShieldCheck, Zap, Globe } from 'lucide-react';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500 overflow-x-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-600 rounded-full blur-[120px]" />
      </div>

      <nav className="relative z-10 px-6 h-20 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-500/50 text-white">
            <Navigation size={24} />
          </div>
          <span className="font-black text-2xl tracking-tighter">TaxiFlow<span className="text-indigo-400">.ai</span></span>
        </div>
        <button 
          onClick={signInWithGoogle}
          className="px-6 py-2.5 bg-white text-slate-950 rounded-full font-bold hover:bg-indigo-50 transition-all shadow-lg hover:shadow-indigo-500/20"
        >
          Sign In
        </button>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-6xl md:text-8xl font-black leading-[0.85] tracking-tighter mb-8 bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent uppercase">
              RIDE <br />
              SMARTER <br />
              EARN MORE
            </h1>
            <p className="text-lg text-slate-400 max-w-md mb-10 leading-relaxed font-medium">
              The cluster-optimized real-time mobility platform. Powered by AI, 
              built for the next generation of logistics.
            </p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={signInWithGoogle}
                className="px-8 py-4 bg-indigo-600 rounded-2xl font-black text-lg hover:bg-indigo-500 transition-all flex items-center gap-2 group shadow-xl shadow-indigo-500/20"
                id="get-started-btn"
              >
                Join the Fleet
                <Zap size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotateY: -15 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="hidden lg:block relative"
          >
            <div className="aspect-[4/5] rounded-[3rem] bg-gradient-to-br from-indigo-600/20 to-amber-600/20 border border-white/10 p-8 flex flex-col justify-between overflow-hidden backdrop-blur-xl">
              <div className="space-y-4">
                {[
                  { icon: Zap, label: 'Cluster Tracking', desc: 'Precise GPS clustering and surge analytics', color: 'text-amber-400' },
                  { icon: ShieldCheck, label: 'PCI Compliant', desc: 'Secure gateway with instant settlements', color: 'text-indigo-400' },
                  { icon: Globe, label: 'Global Network', desc: 'Native support for 20+ currencies', color: 'text-emerald-400' }
                ].map((feature, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="flex gap-4 p-5 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center ${feature.color}`}>
                      <feature.icon size={24} />
                    </div>
                    <div>
                      <div className="font-black tracking-tight">{feature.label}</div>
                      <div className="text-sm text-slate-500 font-medium">{feature.desc}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <footer className="relative z-10 py-10 border-t border-white/5 text-center text-slate-500 text-sm">
        &copy; 2026 TaxiFlow Global. All rights reserved.
      </footer>
    </div>
  );
};

export default Landing;
