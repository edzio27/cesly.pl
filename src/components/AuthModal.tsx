import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isForgotPassword) {
        await resetPassword(email);
        setResetSent(true);
      } else if (isLogin) {
        await signIn(email, password);
        onClose();
        setEmail('');
        setPassword('');
        setPhone('');
      } else {
        await signUp(email, password, phone);
        onClose();
        setEmail('');
        setPassword('');
        setPhone('');
      }
    } catch (err: any) {
      setError(err.message || 'Wystąpił błąd');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold mb-6">
          {isForgotPassword ? 'Resetuj hasło' : isLogin ? 'Zaloguj się' : 'Zarejestruj się'}
        </h2>

        {resetSent ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">
              Link do resetowania hasła został wysłany na adres <strong>{email}</strong>. Sprawdź swoją skrzynkę pocztową.
            </div>
            <button
              onClick={() => {
                setResetSent(false);
                setIsForgotPassword(false);
                setEmail('');
                onClose();
              }}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
            >
              Zamknij
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {!isForgotPassword && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Hasło
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {!isLogin && !isForgotPassword && (
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon (opcjonalnie)
                </label>
                <input
                  id="phone"
                  name="tel"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+48 123 456 789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Numer telefonu ułatwi kontakt z potencjalnymi kupującymi
                </p>
              </div>
            )}

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Ładowanie...' : isForgotPassword ? 'Wyślij link resetujący' : isLogin ? 'Zaloguj' : 'Zarejestruj'}
            </button>
          </form>
        )}

        {!resetSent && (
          <div className="mt-4 text-center space-y-2">
            {isForgotPassword ? (
              <button
                onClick={() => {
                  setIsForgotPassword(false);
                  setError('');
                }}
                className="text-blue-600 hover:underline text-sm"
              >
                Powrót do logowania
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                  }}
                  className="text-blue-600 hover:underline text-sm block w-full"
                >
                  {isLogin ? 'Nie masz konta? Zarejestruj się' : 'Masz już konto? Zaloguj się'}
                </button>
                {isLogin && (
                  <button
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError('');
                    }}
                    className="text-gray-600 hover:underline text-sm"
                  >
                    Zapomniałeś hasła?
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
