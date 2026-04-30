import React, { useState } from 'react';
import { AppProvider, useApp } from './appContext';
import { UserRole } from './types';
import Landing from './components/Landing';
import RoleSelection from './components/RoleSelection';
import RiderDashboard from './components/RiderDashboard';
import DriverDashboard from './components/DriverDashboard';
import AdminDashboard from './components/AdminDashboard';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, User as UserIcon } from 'lucide-react';
import { auth } from './lib/firebase';

const Main: React.FC = () => {
  const { user, profile, loading, setRole } = useApp();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 text-gray-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  if (!profile || !profile.role) {
    return <RoleSelection onSelect={setRole} />;
  }

  const renderDashboard = () => {
    switch (profile.role) {
      case UserRole.RIDER:
        return <RiderDashboard />;
      case UserRole.DRIVER:
        return <DriverDashboard />;
      case UserRole.ADMIN:
        return <AdminDashboard />;
      default:
        return <RoleSelection onSelect={setRole} />;
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-100 font-sans text-slate-900">
      <header className="h-20 px-8 flex items-center justify-between z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">TaxiFlow<span className="text-indigo-600">.ai</span></h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 bg-amber-100 px-4 py-2 rounded-full border border-amber-200">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
            <span className="text-sm font-bold text-amber-700 uppercase tracking-wide">Surge Pricing Active</span>
          </div>
          <div className="flex items-center gap-4 border-l border-slate-200 pl-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-bold">{profile.displayName}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">{profile.role}</span>
            </div>
            <button 
              onClick={() => auth.signOut()}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-rose-600 border border-transparent hover:border-slate-200 shadow-sm"
              title="Logout"
              id="logout-btn"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>
      
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={profile.role}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="h-full w-full"
          >
            {renderDashboard()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <Main />
    </AppProvider>
  );
}
