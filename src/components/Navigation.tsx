import React, { useState } from 'react';
import { Car, User, Plus, Heart, LogOut, Settings, Menu, X } from 'lucide-react';
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      onNavigate('home');
      setShowMobileMenu(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleNavigate = (page: string) => {
    onNavigate(page);
    setShowMobileMenu(false);
  };

  return (
    <>
      <nav className="bg-slate-900/95 backdrop-blur-md shadow-lg sticky top-0 z-40 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => handleNavigate('home')}
              className="flex items-center space-x-3 group"
            >
              <img
                src="/cesly_logo_cropped_big.png"
                alt="Cesly.pl"
                className="h-10 transition-transform group-hover:scale-105 duration-300"
              />
            </button>

            <div className="hidden md:flex items-center space-x-3">
              {user ? (
                <>
                  <button
                    onClick={() => handleNavigate('add-listing')}
                    className="flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-orange-500/30 hover:scale-105 transition-all font-medium"
                  >
                    <Plus size={20} />
                    <span>Dodaj ogłoszenie</span>
                  </button>
                  <button
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="p-2 rounded-lg text-gray-300 hover:bg-slate-800 transition"
                  >
                    <Menu size={24} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-5 py-2 rounded-lg hover:shadow-lg hover:shadow-orange-500/30 hover:scale-105 transition-all font-medium"
                  >
                    <User size={20} />
                    <span>Zaloguj się</span>
                  </button>
                  <button
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="p-2 rounded-lg text-gray-300 hover:bg-slate-800 transition"
                  >
                    <Menu size={24} />
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 rounded-lg text-gray-300 hover:bg-slate-800 transition"
            >
              {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {showMobileMenu && (
          <div className="border-t border-slate-700 bg-slate-900/95 backdrop-blur-md">
            <div className="px-4 py-3 space-y-2">
              {user ? (
                <>
                  <button
                    onClick={() => handleNavigate('admin-scraping')}
                    className={`w-full flex items-center space-x-2 px-4 py-3 rounded-lg transition ${
                      currentPage === 'admin-scraping'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-gray-300 hover:bg-slate-800'
                    }`}
                  >
                    <Settings size={20} />
                    <span>Admin</span>
                  </button>
                  <button
                    onClick={() => handleNavigate('profile')}
                    className={`w-full flex items-center space-x-2 px-4 py-3 rounded-lg transition ${
                      currentPage === 'profile'
                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                        : 'text-gray-300 hover:bg-slate-800'
                    }`}
                  >
                    <User size={20} />
                    <span>Profil</span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center space-x-2 text-gray-300 hover:bg-red-500/20 hover:text-red-400 px-4 py-3 rounded-lg transition"
                  >
                    <LogOut size={20} />
                    <span>Wyloguj</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setShowAuthModal(true);
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-5 py-3 rounded-lg hover:shadow-lg transition font-medium"
                >
                  <User size={20} />
                  <span>Zaloguj się</span>
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
