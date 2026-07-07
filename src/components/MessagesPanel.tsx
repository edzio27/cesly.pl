import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { supabase, Message } from '../lib/supabase';

type MessagesPanelProps = {
  userId: string;
  onViewListing: (id: string) => void;
};

type ConversationMessage = Message & {
  listing?: { id: string; title: string } | null;
};

type Conversation = {
  key: string;
  listingId: string;
  listingTitle: string;
  otherUserId: string;
  messages: ConversationMessage[];
  hasUnread: boolean;
};

export function MessagesPanel({ userId, onViewListing }: MessagesPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, [userId]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, listing:listings(id, title)')
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const grouped = new Map<string, Conversation>();
      for (const msg of (data || []) as ConversationMessage[]) {
        const otherUserId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
        const key = `${msg.listing_id}_${otherUserId}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            key,
            listingId: msg.listing_id,
            listingTitle: msg.listing?.title || 'Ogłoszenie',
            otherUserId,
            messages: [],
            hasUnread: false,
          });
        }
        const conv = grouped.get(key)!;
        conv.messages.push(msg);
        if (msg.recipient_id === userId && !msg.read_at) {
          conv.hasUnread = true;
        }
      }

      const list = Array.from(grouped.values()).sort((a, b) => {
        const aLast = a.messages[a.messages.length - 1]?.created_at || '';
        const bLast = b.messages[b.messages.length - 1]?.created_at || '';
        return bLast.localeCompare(aLast);
      });

      setConversations(list);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const openConversation = async (conv: Conversation) => {
    setOpenKey(openKey === conv.key ? null : conv.key);

    const unreadIds = conv.messages
      .filter((m) => m.recipient_id === userId && !m.read_at)
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      await supabase.from('messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
      setConversations((prev) =>
        prev.map((c) => (c.key === conv.key ? { ...c, hasUnread: false } : c))
      );
    }
  };

  const handleReply = async (conv: Conversation) => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        listing_id: conv.listingId,
        sender_id: userId,
        recipient_id: conv.otherUserId,
        body: replyText.trim(),
      });
      if (error) throw error;
      setReplyText('');
      fetchMessages();
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setSending(false);
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

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg">Nie masz jeszcze żadnych wiadomości</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {conversations.map((conv) => (
        <div key={conv.key} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => openConversation(conv)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 text-left"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {conv.hasUnread && <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />}
                <span className="font-medium text-gray-900 truncate">{conv.listingTitle}</span>
              </div>
              <p className="text-sm text-gray-500 truncate mt-0.5">
                {conv.messages[conv.messages.length - 1]?.body}
              </p>
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0 ml-3">
              {new Date(conv.messages[conv.messages.length - 1]?.created_at).toLocaleDateString('pl-PL')}
            </span>
          </button>

          {openKey === conv.key && (
            <div className="border-t border-gray-200 bg-gray-50 p-4">
              <button
                onClick={() => onViewListing(conv.listingId)}
                className="text-xs text-blue-600 hover:underline mb-3"
              >
                Zobacz ogłoszenie →
              </button>
              <div className="space-y-2 max-h-72 overflow-y-auto mb-3">
                {conv.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                      msg.sender_id === userId
                        ? 'bg-blue-600 text-white ml-auto'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.body}</p>
                    <p className={`text-[10px] mt-1 ${msg.sender_id === userId ? 'text-blue-100' : 'text-gray-400'}`}>
                      {new Date(msg.created_at).toLocaleString('pl-PL')}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleReply(conv)}
                  placeholder="Odpowiedz..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleReply(conv)}
                  disabled={sending || !replyText.trim()}
                  className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
