import { supabase } from '../lib/supabase';

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Failed to get IP:', error);
    return 'unknown';
  }
}

export async function trackPageView(
  pageType: string,
  listingId?: string
): Promise<void> {
  try {
    const ip = await getClientIP();
    const ipHash = await hashIP(ip);
    const userAgent = navigator.userAgent;

    await supabase.from('page_views').insert({
      listing_id: listingId || null,
      page_type: pageType,
      ip_hash: ipHash,
      user_agent: userAgent,
    });
  } catch (error) {
    console.error('Failed to track page view:', error);
  }
}

export async function trackListingClick(
  listingId: string,
  clickType: 'card' | 'detail_view' | 'contact' = 'card'
): Promise<void> {
  try {
    const ip = await getClientIP();
    const ipHash = await hashIP(ip);

    await supabase.from('listing_clicks').insert({
      listing_id: listingId,
      ip_hash: ipHash,
      click_type: clickType,
    });
  } catch (error) {
    console.error('Failed to track listing click:', error);
  }
}

export interface ListingAnalytics {
  listingId: string;
  totalViews: number;
  totalClicks: number;
  uniqueViews: number;
  uniqueClicks: number;
  viewsByDay: Array<{ date: string; count: number }>;
  clicksByDay: Array<{ date: string; count: number }>;
}

export async function getListingAnalytics(
  listingId: string,
  days: number = 30
): Promise<ListingAnalytics | null> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: views } = await supabase
      .from('page_views')
      .select('ip_hash, view_date, created_at')
      .eq('listing_id', listingId)
      .gte('created_at', startDate.toISOString());

    const { data: clicks } = await supabase
      .from('listing_clicks')
      .select('ip_hash, click_date, created_at')
      .eq('listing_id', listingId)
      .gte('created_at', startDate.toISOString());

    const uniqueViewIPs = new Set(views?.map(v => v.ip_hash) || []);
    const uniqueClickIPs = new Set(clicks?.map(c => c.ip_hash) || []);

    const viewsByDay = views?.reduce((acc: Record<string, number>, view) => {
      const date = view.view_date;
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {}) || {};

    const clicksByDay = clicks?.reduce((acc: Record<string, number>, click) => {
      const date = click.click_date;
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {}) || {};

    return {
      listingId,
      totalViews: views?.length || 0,
      totalClicks: clicks?.length || 0,
      uniqueViews: uniqueViewIPs.size,
      uniqueClicks: uniqueClickIPs.size,
      viewsByDay: Object.entries(viewsByDay).map(([date, count]) => ({
        date,
        count,
      })),
      clicksByDay: Object.entries(clicksByDay).map(([date, count]) => ({
        date,
        count,
      })),
    };
  } catch (error) {
    console.error('Failed to get listing analytics:', error);
    return null;
  }
}

export async function getUserListingsAnalytics(): Promise<Array<{
  listingId: string;
  title: string;
  views: number;
  clicks: number;
}>> {
  try {
    const { data: listings } = await supabase
      .from('listings')
      .select('id, title, views_count, clicks_count')
      .eq('status', 'active')
      .order('views_count', { ascending: false });

    return listings?.map(listing => ({
      listingId: listing.id,
      title: listing.title,
      views: listing.views_count || 0,
      clicks: listing.clicks_count || 0,
    })) || [];
  } catch (error) {
    console.error('Failed to get user listings analytics:', error);
    return [];
  }
}
