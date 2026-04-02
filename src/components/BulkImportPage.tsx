import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Upload, Loader2, CheckCircle, XCircle, Clock, CreditCard as Edit } from 'lucide-react';

interface ScrapingJob {
  id: string;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  listing_id: string | null;
  extracted_data: any;
  created_at: string;
  processed_at: string | null;
}

export default function BulkImportPage() {
  const { user } = useAuth();
  const [urls, setUrls] = useState('');
  const [jobs, setJobs] = useState<ScrapingJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingCount, setProcessingCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadJobs();
      const interval = setInterval(loadJobs, 3000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadJobs = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('scraping_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setJobs(data);
      const processing = data.filter(j => j.status === 'processing' || j.status === 'pending').length;
      setProcessingCount(processing);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !urls.trim()) return;

    setLoading(true);

    const urlList = urls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url && (url.includes('facebook.com') || url.includes('fb.com')));

    if (urlList.length === 0) {
      alert('Nie znaleziono prawidłowych linków Facebook');
      setLoading(false);
      return;
    }

    const jobsToInsert = urlList.map(url => ({
      url,
      user_id: user.id,
      status: 'pending'
    }));

    const { data: insertedJobs, error } = await supabase
      .from('scraping_jobs')
      .insert(jobsToInsert)
      .select();

    if (error) {
      console.error('Error creating jobs:', error);
      alert('Błąd podczas tworzenia zadań');
      setLoading(false);
      return;
    }

    setUrls('');
    await loadJobs();

    if (insertedJobs) {
      for (const job of insertedJobs) {
        processJob(job.id, job.url);
      }
    }

    setLoading(false);
  };

  const processJob = async (jobId: string, url: string) => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-scraping-job`;
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: jobId,
          url: url,
          user_id: user?.id
        })
      });
    } catch (error) {
      console.error('Error processing job:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Ukończono';
      case 'failed': return 'Błąd';
      case 'processing': return 'Przetwarzanie';
      default: return 'W kolejce';
    }
  };

  const navigateToEdit = (listingId: string) => {
    window.location.href = `/listing/${listingId}/edit`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <Upload className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Masowy Import Ogłoszeń</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wklej linki Facebook (jeden na linię)
            </label>
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="https://www.facebook.com/groups/123/posts/456&#x0a;https://www.facebook.com/groups/123/posts/789"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[200px] font-mono text-sm"
              disabled={loading}
            />
            <p className="mt-2 text-sm text-gray-500">
              Wklej do 30 linków jednocześnie. System automatycznie wyciągnie dane z postów.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !urls.trim()}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Tworzenie zadań...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Rozpocznij Import ({urls.split('\n').filter(u => u.trim()).length} linków)
              </>
            )}
          </button>
        </form>
      </div>

      {processingCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <p className="text-blue-900 font-medium">
              Przetwarzanie {processingCount} {processingCount === 1 ? 'zadania' : 'zadań'}...
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Historia Importów</h2>
        </div>

        {jobs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>Brak importów. Rozpocznij od wklejenia linków powyżej.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {jobs.map((job) => (
              <div key={job.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {getStatusIcon(job.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {getStatusText(job.status)}
                        </span>
                        {job.extracted_data?.brand && job.extracted_data?.model && (
                          <span className="text-sm text-gray-600">
                            - {job.extracted_data.brand} {job.extracted_data.model}
                          </span>
                        )}
                      </div>
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline truncate block"
                      >
                        {job.url}
                      </a>
                      {job.error_message && (
                        <p className="text-sm text-red-600 mt-1">{job.error_message}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(job.created_at).toLocaleString('pl-PL')}
                      </p>
                    </div>
                  </div>

                  {job.listing_id && job.status === 'completed' && (
                    <button
                      onClick={() => navigateToEdit(job.listing_id!)}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      <Edit className="w-4 h-4" />
                      Edytuj Draft
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
