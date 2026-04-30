import React from 'react';
import { UserRole } from '../types';
import { motion } from 'motion/react';
import { Navigation, Car, Shield } from 'lucide-react';

interface RoleSelectionProps {
  onSelect: (role: UserRole) => Promise<void>;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelect }) => {
  const roles = [
    {
      id: UserRole.RIDER,
      title: 'I want a ride',
      desc: 'Get to your destination safely and fast.',
      icon: Navigation,
      color: 'bg-indigo-600',
    },
    {
      id: UserRole.DRIVER,
      title: 'I want to drive',
      desc: 'Earn money on your own schedule.',
      icon: Car,
      color: 'bg-amber-500',
    },
    {
      id: UserRole.ADMIN,
      title: 'Admin Panel',
      desc: 'Monitor platform performance and safety.',
      icon: Shield,
      color: 'bg-slate-900',
    },
  ];

  return (
    <div className="h-screen w-screen bg-slate-100 flex items-center justify-center p-6 dot-pattern">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-black tracking-tight mb-4 text-slate-900">Welcome to TaxiFlow</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">A new era of real-time logistics</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {roles.map((role, i) => (
            <motion.button
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => onSelect(role.id)}
              className="group p-10 rounded-[3rem] bg-white border border-slate-200 shadow-2xl shadow-slate-200/50 hover:shadow-indigo-200 transition-all text-left flex flex-col items-start gap-8"
            >
              <div className={`p-5 rounded-[1.5rem] ${role.color} text-white shadow-xl group-hover:scale-110 transition-transform`}>
                <role.icon size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black mb-3 tracking-tight">{role.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">{role.desc}</p>
              </div>
              <div className="mt-auto pt-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                Select Journey <Navigation size={14} />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
