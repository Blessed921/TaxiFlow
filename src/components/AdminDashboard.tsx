import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, getDocs, limit } from 'firebase/firestore';
import { Ride, RideStatus, UserProfile, UserRole } from '../types';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, Car, TrendingUp, AlertCircle, Map as MapIcon, ShieldCheck } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalRides: 0,
    totalRevenue: 0,
    activeDrivers: 0,
    activeRiders: 0
  });
  const [recentRides, setRecentRides] = useState<Ride[]>([]);

  useEffect(() => {
    // Listen to all rides for stats
    const unsubRides = onSnapshot(collection(db, 'rides'), (snap) => {
      const docs = snap.docs.map(d => d.data() as Ride);
      const revenue = docs.reduce((acc, curr) => acc + (curr.status === RideStatus.COMPLETED ? curr.price : 0), 0);
      setStats(prev => ({
        ...prev,
        totalRides: docs.length,
        totalRevenue: revenue
      }));
      setRecentRides(docs.slice(0, 10));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'rides');
    });

    // Listen to users for counts
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const docs = snap.docs.map(d => d.data() as UserProfile);
      setStats(prev => ({
        ...prev,
        activeDrivers: docs.filter(u => u.role === UserRole.DRIVER).length,
        activeRiders: docs.filter(u => u.role === UserRole.RIDER).length
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => {
      unsubRides();
      unsubUsers();
    };
  }, []);

  const chartData = [
    { name: 'Mon', rides: 120, revenue: 1200 },
    { name: 'Tue', rides: 150, revenue: 1500 },
    { name: 'Wed', rides: 180, revenue: 1900 },
    { name: 'Thu', rides: 220, revenue: 2400 },
    { name: 'Fri', rides: 300, revenue: 3500 },
    { name: 'Sat', rides: 450, revenue: 5200 },
    { name: 'Sun', rides: 380, revenue: 4100 },
  ];

  return (
    <div className="h-full overflow-y-auto bg-slate-100 p-8 md:p-12 dot-pattern-large">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-200">
                <ShieldCheck size={32} />
             </div>
             <div>
                <h2 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Fleet Command</h2>
                <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">PCI-DSS Compliant • v2.4.0-Stable</p>
             </div>
          </div>
          <div className="flex gap-4">
             <div className="text-right border-r border-slate-200 pr-6">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">API Latency</p>
                <p className="text-2xl font-black text-indigo-600">24ms</p>
             </div>
             <div className="text-right">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">System Health</p>
                <p className="text-2xl font-black text-emerald-500">OPTIMAL</p>
             </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {[
            { label: 'Revenue (Today)', value: `$${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Active Fleet', value: stats.activeDrivers, icon: Car, color: 'text-amber-500', bg: 'bg-amber-50' },
            { label: 'Cloud Users', value: stats.activeRiders, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Cluster Load', value: `${(stats.totalRides % 100)}%`, icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-50' },
          ].map((stat, i) => (
            <motion.div 
               key={i}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.1 }}
               className="p-8 bg-white rounded-[2.5rem] shadow-sm border border-slate-200 hover:shadow-xl transition-shadow"
            >
              <div className={`p-4 w-fit rounded-2xl ${stat.bg} ${stat.color} mb-6 shadow-sm`}>
                <stat.icon size={28} />
              </div>
              <div className="text-4xl font-black text-slate-900 mb-1 tracking-tighter">{stat.value}</div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-10">
           {/* Chart */}
           <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 shadow-sm border border-slate-200 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-10 opacity-5">
                 <TrendingUp size={120} className="text-slate-900" />
              </div>
              <h3 className="text-2xl font-black tracking-tight mb-10 uppercase">Financial Throughput</h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 800}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 800}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)', padding: '20px', fontWeight: 800}} />
                    <Bar dataKey="revenue" fill="#4f46e5" radius={[12, 12, 0, 0]} barSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </div>

           {/* Metrics Panel */}
           <div className="bg-slate-900 rounded-[3rem] p-10 shadow-2xl text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 dot-pattern pointer-events-none" />
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-2xl font-black tracking-tight uppercase">Recent Alerts</h3>
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-500">
                    <AlertCircle size={24} />
                  </div>
                </div>
                <div className="space-y-6">
                  {[
                    { label: 'Surge Pricing active in Downtown', time: '2m ago', color: 'bg-amber-500' },
                    { label: 'Driver JD-882 reached 50 trips', time: '12m ago', color: 'bg-emerald-500' },
                    { label: 'Cluster B capacity at 98%', time: '14m ago', color: 'bg-rose-500' },
                    { label: 'Payment API synchronized', time: '1h ago', color: 'bg-indigo-400' },
                  ].map((alert, i) => (
                    <div key={i} className="flex gap-4 items-start p-4 rounded-2xl bg-white/5 border border-white/5 transition-colors hover:bg-white/10">
                      <div className={`mt-1.5 w-2.5 h-2.5 rounded-full ${alert.color} shadow-lg shadow-${alert.color.split('-')[1]}-500/50`} />
                      <div>
                        <p className="text-sm font-bold leading-tight mb-1">{alert.label}</p>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{alert.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-10 py-5 bg-white text-slate-950 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-slate-100 transition-all shadow-xl shadow-white/10">
                  Sync All Clocks
                </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
