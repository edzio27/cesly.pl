import React, { useState } from 'react';
import { Car, User, Plus, Heart, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { Logo } from './Logo';

type NavigationProps = {
  currentPage: string;
  onNavigate: (page: string) => void;
};

export function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const { user, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      onNavigate('home');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      <nav className="bg-white/90 backdrop-blur-md shadow-lg sticky top-0 z-40 border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center space-x-3 group"
            >
              <Logo size={40} className="transition-transform group-hover:scale-110 group-hover:rotate-12 duration-300" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-600 bg-clip-text text-transparent">
                  Cesly.pl
                </span>
                <span className="text-xs text-amber-700/70 -mt-1">Marketplace cesji</span>
              </div>
            </button>

            <div className="flex items-center space-x-3">
              {user ? (
                <>
                  <button
                    onClick={() => onNavigate('add-listing')}
                    className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-yellow-500/30 hover:scale-105 transition-all font-medium"
                  >
                    <Plus size={20} />
                    <span className="hidden sm:inline">Dodaj ogłoszenie</span>
                  </button>
                  <button
                    onClick={() => onNavigate('profile')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                      currentPage === 'profile'
                        ? 'bg-yellow-500/20 text-amber-700 border border-yellow-500/30'
                        : 'text-amber-700 hover:bg-amber-50 hover:text-amber-900'
                    }`}
                  >
                    <User size={20} />
                    <span className="hidden sm:inline">Profil</span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center space-x-2 text-amber-700 hover:bg-red-50 hover:text-red-600 px-4 py-2 rounded-lg transition"
                  >
                    <LogOut size={20} />
                    <span className="hidden sm:inline">Wyloguj</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-5 py-2 rounded-lg hover:shadow-lg hover:shadow-yellow-500/30 hover:scale-105 transition-all font-medium"
                >
                  <User size={20} />
                  <span>Zaloguj się</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
