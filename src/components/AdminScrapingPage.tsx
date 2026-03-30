import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Settings, Play, Trash2, Check, X, ExternalLink } from 'lucide-react';

interface ScrapingSource {
  id: string;
  name: string;
  type: string;
  url: string;
  is_active: boolean;
  last_scraped_at: string | null;
  created_at: string;
}

interface ScrapedListing {
  id: string;
  source_id: string;
  external_id: string;
  raw_data: {
    title?: string;
    description?: string;
    price?: number;
    external_url?: string;
    brand?: string;
    model?: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'published';
  created_at: string;
}

export default function AdminScrapingPage() {
  const [sources, setSources] = useState<ScrapingSource[]>([]);
  const [scrapedListings, setScrapedListings] = useState<ScrapedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSource, setNewSource] = useState({
    name: '',
    type: 'rss',
    url: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const { data: sourcesData } = await supabase
      .from('scraping_sources')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: listingsData } = await supabase
      .from('scraped_listings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (sourcesData) setSources(sourcesData);
    if (listingsData) setScrapedListings(listingsData);

    setLoading(false);
  }

  async function runScraper() {
    setScraping(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-listings`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();
      alert(`Scraping completed! Processed: ${result.processed} listings`);
      loadData();
    } catch (error) {
      console.error('Error running scraper:', error);
      alert('Error running scraper');
    } finally {
      setScraping(false);
    }
  }

  async function addSource() {
    if (!newSource.name || !newSource.url) {
      alert('Please fill in all fields');
      return;
    }

    const { error } = await supabase
      .from('scraping_sources')
      .insert([newSource]);

    if (error) {
      console.error('Error adding source:', error);
      alert('Error adding source');
    } else {
      setNewSource({ name: '', type: 'rss', url: '' });
      setShowAddSource(false);
      loadData();
    }
  }

  async function toggleSource(id: string, isActive: boolean) {
    await supabase
      .from('scraping_sources')
      .update({ is_active: !isActive })
      .eq('id', id);

    loadData();
  }

  async function deleteSource(id: string) {
    if (!confirm('Are you sure you want to delete this source?')) return;

    await supabase
      .from('scraping_sources')
      .delete()
      .eq('id', id);

    loadData();
  }

  async function updateListingStatus(id: string, status: 'approved' | 'rejected') {
    await supabase
      .from('scraped_listings')
      .update({ status, processed_at: new Date().toISOString() })
      .eq('id', id);

    loadData();
  }

  async function publishListing(listing: ScrapedListing) {
    const rawData = listing.raw_data;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: newListing, error } = await supabase
      .from('listings')
      .insert([{
        user_id: user.id,
        title: rawData.title || 'Imported Listing',
        description: rawData.description || '',
        price: rawData.price || 0,
        price_type: 'monthly',
        brand: rawData.brand || '',
        model: rawData.model || '',
        year: 2024,
        mileage: 0,
        fuel_type: 'petrol',
        transmission: 'automatic',
        body_type: 'sedan',
        color: 'black',
        location: 'Warszawa',
        contact_name: user.email?.split('@')[0] || 'Admin',
        contact_phone: '000000000',
        contact_email: user.email || '',
      }])
      .select()
      .single();

    if (!error && newListing) {
      await supabase
        .from('scraped_listings')
        .update({
          status: 'published',
          listing_id: newListing.id,
          processed_at: new Date().toISOString()
        })
        .eq('id', listing.id);

      alert('Listing published successfully!');
      loadData();
    } else {
      alert('Error publishing listing');
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Scraping Management</h1>
        <p className="text-gray-600">Manage automatic listing collection from external sources</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Scraping Sources
          </h2>
          <div className="flex gap-3">
            <button
              onClick={runScraper}
              disabled={scraping}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              {scraping ? 'Running...' : 'Run Scraper'}
            </button>
            <button
              onClick={() => setShowAddSource(!showAddSource)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Add Source
            </button>
          </div>
        </div>

        {showAddSource && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-3">Add New Source</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Source Name"
                value={newSource.name}
                onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              />
              <select
                value={newSource.type}
                onChange={(e) => setNewSource({ ...newSource, type: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="rss">RSS Feed</option>
                <option value="web">Web Page</option>
                <option value="facebook">Facebook Group</option>
              </select>
              <input
                type="url"
                placeholder="URL"
                value={newSource.url}
                onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={addSource}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddSource(false)}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {sources.map((source) => (
            <div key={source.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">{source.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded ${source.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {source.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">{source.type}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{source.url}</p>
                {source.last_scraped_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    Last scraped: {new Date(source.last_scraped_at).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleSource(source.id, source.is_active)}
                  className={`px-3 py-1 rounded ${source.is_active ? 'bg-gray-300' : 'bg-green-500 text-white'}`}
                >
                  {source.is_active ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => deleteSource(source.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-6">Scraped Listings ({scrapedListings.length})</h2>

        <div className="space-y-4">
          {scrapedListings.map((listing) => (
            <div key={listing.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{listing.raw_data.title}</h3>
                    <span className={`px-2 py-1 text-xs rounded ${
                      listing.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      listing.status === 'approved' ? 'bg-green-100 text-green-700' :
                      listing.status === 'published' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {listing.status}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{listing.raw_data.description}</p>

                  {listing.raw_data.external_url && (
                    <a
                      href={listing.raw_data.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      View Original <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  <p className="text-xs text-gray-500 mt-2">
                    Scraped: {new Date(listing.created_at).toLocaleString()}
                  </p>
                </div>

                {listing.status === 'pending' && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => updateListingStatus(listing.id, 'approved')}
                      className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"
                      title="Approve"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => updateListingStatus(listing.id, 'rejected')}
                      className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                      title="Reject"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {listing.status === 'approved' && (
                  <button
                    onClick={() => publishListing(listing)}
                    className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Publish
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
