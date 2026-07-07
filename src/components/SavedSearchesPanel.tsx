import { useEffect, useState } from 'react';
import { Trash2, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Filters } from './HomePage';

type SavedSearch = {
  id: string;
  name: string;
  filters: Filters;
  created_at: string;
};

type SavedSearchesPanelProps = {
  userId: string;
  onApplySearch?: (filters: Record<string, string>) => void;
};

function describeFilters(filters: Filters): string {
  const parts: string[] = [];
  if (filters.vehicleType) parts.push(filters.vehicleType);
  if (filters.brand) parts.push(filters.brand);
  if (filters.model) parts.push(filters.model);
  if (filters.minMonthlyPayment || filters.maxMonthlyPayment) {
    parts.push(`rata ${filters.minMonthlyPayment || '0'}-${filters.maxMonthlyPayment || '∞'} zł`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'Wszystkie ogłoszenia';
}

export function SavedSearchesPanel({ userId, onApplySearch }: SavedSearchesPanelProps) {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSearches();
  }, [userId]);

  const fetchSearches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSearches((data || []) as SavedSearch[]);
    } catch (error) {
      console.error('Error fetching saved searches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('saved_searches').delete().eq('id', id);
      if (error) throw error;
      setSearches((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Error deleting saved search:', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Ładowanie...</p>
      </div>
    );
  }

  if (searches.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg">Nie masz jeszcze zapisanych wyszukiwań</p>
        <p className="text-sm text-gray-400 mt-1">
          Ustaw filtry na stronie głównej i kliknij "Zapisz to wyszukiwanie", żeby szybko do nich wrócić.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {searches.map((search) => (
        <div
          key={search.id}
          className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3"
        >
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{search.name}</p>
            <p className="text-sm text-gray-500 truncate">{describeFilters(search.filters)}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            {onApplySearch && (
              <button
                onClick={() => onApplySearch(search.filters as unknown as Record<string, string>)}
                className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 px-2 py-1"
              >
                <Search size={16} />
                <span>Zastosuj</span>
              </button>
            )}
            <button
              onClick={() => handleDelete(search.id)}
              className="text-gray-400 hover:text-red-600 p-1"
              title="Usuń"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
