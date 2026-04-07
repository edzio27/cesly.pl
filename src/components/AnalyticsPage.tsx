import React, { useEffect, useState } from 'react';
import { TrendingUp, Eye, MousePointerClick, BarChart3, Calendar } from 'lucide-react';
import { getUserListingsAnalytics, getListingAnalytics, ListingAnalytics } from '../utils/analytics';
import { useAuth } from '../contexts/AuthContext';

export function AnalyticsPage() {
  const [listingsStats, setListingsStats] = useState<Array<{
    listingId: string;
    title: string;
    views: number;
    clicks: number;
  }>>([]);
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const [detailedAnalytics, setDetailedAnalytics] = useState<ListingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState(30);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user]);

  useEffect(() => {
    if (selectedListing) {
      loadDetailedAnalytics(selectedListing);
    }
  }, [selectedListing, daysFilter]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const stats = await getUserListingsAnalytics();
      setListingsStats(stats);
      if (stats.length > 0 && !selectedListing) {
        setSelectedListing(stats[0].listingId);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDetailedAnalytics = async (listingId: string) => {
    try {
      const analytics = await getListingAnalytics(listingId, daysFilter);
      setDetailedAnalytics(analytics);
    } catch (error) {
      console.error('Failed to load detailed analytics:', error);
    }
  };

  const totalViews = listingsStats.reduce((sum, listing) => sum + listing.views, 0);
  const totalClicks = listingsStats.reduce((sum, listing) => sum + listing.clicks, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
          <p className="mt-4 text-gray-700">Ładowanie statystyk...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/30 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Zaloguj się</h2>
          <p className="text-gray-600">Musisz być zalogowany aby zobaczyć statystyki</p>
        </div>
      </div>
    );
  }

  if (listingsStats.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/30 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Brak ogłoszeń</h2>
          <p className="text-gray-600">Dodaj swoje pierwsze ogłoszenie, aby zobaczyć statystyki</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Statystyki ogłoszeń</h1>
          <p className="text-gray-600">Sprawdź jak radzą sobie Twoje ogłoszenia</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-gray-200 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Łączne wyświetlenia</p>
                <p className="text-3xl font-bold text-gray-900">{totalViews}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <Eye className="w-8 h-8 text-amber-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500">Wszystkie unikalne wyświetlenia Twoich ogłoszeń</p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-gray-200 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Łączne kliknięcia</p>
                <p className="text-3xl font-bold text-gray-900">{totalClicks}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <MousePointerClick className="w-8 h-8 text-amber-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500">Wszystkie unikalne kliknięcia w Twoje ogłoszenia</p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-gray-200 shadow-md mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Twoje ogłoszenia</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Ogłoszenie</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                    <div className="flex items-center justify-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>Wyświetlenia</span>
                    </div>
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                    <div className="flex items-center justify-center gap-1">
                      <MousePointerClick className="w-4 h-4" />
                      <span>Kliknięcia</span>
                    </div>
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">CTR</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {listingsStats.map((listing) => {
                  const ctr = listing.views > 0
                    ? ((listing.clicks / listing.views) * 100).toFixed(1)
                    : '0.0';

                  return (
                    <tr
                      key={listing.listingId}
                      className={`border-b border-gray-100 hover:bg-amber-50/50 transition-colors ${
                        selectedListing === listing.listingId ? 'bg-amber-50' : ''
                      }`}
                    >
                      <td className="py-4 px-4">
                        <p className="font-medium text-gray-900 line-clamp-2">{listing.title}</p>
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                          {listing.views}
                        </span>
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold text-sm">
                          {listing.clicks}
                        </span>
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="text-gray-900 font-medium">{ctr}%</span>
                      </td>
                      <td className="text-right py-4 px-4">
                        <button
                          onClick={() => setSelectedListing(listing.listingId)}
                          className="text-amber-600 hover:text-amber-700 font-medium text-sm transition-colors"
                        >
                          Zobacz szczegóły
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {selectedListing && detailedAnalytics && (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-gray-200 shadow-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Szczegółowe statystyki</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setDaysFilter(7)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    daysFilter === 7
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  7 dni
                </button>
                <button
                  onClick={() => setDaysFilter(30)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    daysFilter === 30
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  30 dni
                </button>
                <button
                  onClick={() => setDaysFilter(90)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    daysFilter === 90
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  90 dni
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                <p className="text-sm text-blue-700 mb-1">Wyświetlenia</p>
                <p className="text-2xl font-bold text-blue-900">{detailedAnalytics.totalViews}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                <p className="text-sm text-green-700 mb-1">Kliknięcia</p>
                <p className="text-2xl font-bold text-green-900">{detailedAnalytics.totalClicks}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4">
                <p className="text-sm text-amber-700 mb-1">Unikalne wyświetlenia</p>
                <p className="text-2xl font-bold text-amber-900">{detailedAnalytics.uniqueViews}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                <p className="text-sm text-purple-700 mb-1">Unikalne kliknięcia</p>
                <p className="text-2xl font-bold text-purple-900">{detailedAnalytics.uniqueClicks}</p>
              </div>
            </div>

            {detailedAnalytics.viewsByDay.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-600" />
                  Wyświetlenia według dni
                </h3>
                <div className="space-y-2">
                  {detailedAnalytics.viewsByDay
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 10)
                    .map((day) => (
                      <div key={day.date} className="flex items-center gap-4">
                        <span className="text-sm text-gray-600 w-32">
                          {new Date(day.date).toLocaleDateString('pl-PL')}
                        </span>
                        <div className="flex-1">
                          <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-amber-400 to-amber-600 h-full flex items-center justify-end pr-2"
                              style={{
                                width: `${Math.max(5, (day.count / Math.max(...detailedAnalytics.viewsByDay.map(d => d.count))) * 100)}%`
                              }}
                            >
                              <span className="text-xs font-semibold text-white">{day.count}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
