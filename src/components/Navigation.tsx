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
      <nav className="bg-gradient-to-b from-gray-50/95 to-white/95 backdrop-blur-md shadow-md sticky top-0 z-40 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => handleNavigate('home')}
              className="flex items-center space-x-3 group"
            >
              <img
                src="/transparent.png"
                alt="Cesly.pl"
                className="h-10 transition-transform group-hover:scale-105 duration-300"
              />
            </button>

            <div className="hidden md:flex items-center space-x-3">
              <button
                onClick={() => user ? handleNavigate('add-listing') : setShowAuthModal(true)}
                className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-orange-500/30 hover:scale-105 transition-all font-medium"
              >
                <Plus size={20} />
                <span>Dodaj ogłoszenie za darmo</span>
              </button>
              {user && (
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                >
                  <Menu size={24} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
            >
              {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {showMobileMenu && user && (
          <div className="border-t border-gray-200 bg-white/95 backdrop-blur-md">
            <div className="px-4 py-3 space-y-2">
              <button
                onClick={() => handleNavigate('admin-scraping')}
                className={`w-full flex items-center space-x-2 px-4 py-3 rounded-lg transition ${
                  currentPage === 'admin-scraping'
                    ? 'bg-amber-500/20 text-amber-700 border border-amber-500/30'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Settings size={20} />
                <span>Admin</span>
              </button>
              <button
                onClick={() => handleNavigate('profile')}
                className={`w-full flex items-center space-x-2 px-4 py-3 rounded-lg transition ${
                  currentPage === 'profile'
                    ? 'bg-amber-500/20 text-amber-700 border border-amber-500/30'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <User size={20} />
                <span>Profil</span>
              </button>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center space-x-2 text-gray-700 hover:bg-red-500/20 hover:text-red-400 px-4 py-3 rounded-lg transition"
              >
                <LogOut size={20} />
                <span>Wyloguj</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
