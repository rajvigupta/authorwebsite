import { useState, useEffect } from 'react';
import { Users, Search, Download, Eye, BookOpen, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type ReaderWithStats = {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  total_chapters_purchased: number;
  total_spent: number;
  last_purchase_date: string | null;
  purchased_chapters: {
    chapter_id: string;
    chapter_title: string;
    chapter_number: number;
    book_title: string | null;
    amount_paid: number;
    purchased_at: string;
  }[];
};

export function ReaderManagement() {
  const [readers, setReaders] = useState<ReaderWithStats[]>([]);
  const [filteredReaders, setFilteredReaders] = useState<ReaderWithStats[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedReaderId, setExpandedReaderId] = useState<string | null>(null);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.role === 'author') {
      fetchReaders();
    }
  }, [profile]);

  useEffect(() => {
    // Filter readers based on search query
    if (searchQuery.trim() === '') {
      setFilteredReaders(readers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = readers.filter(
        (reader) =>
          reader.full_name.toLowerCase().includes(query) ||
          reader.email.toLowerCase().includes(query)
      );
      setFilteredReaders(filtered);
    }
  }, [searchQuery, readers]);

  const fetchReaders = async () => {
    setLoading(true);
    try {
      // Get all readers (non-author users)
      const { data: readersData, error: readersError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .eq('role', 'reader')
        .order('created_at', { ascending: false });

      if (readersError) throw readersError;

      // For each reader, get their purchase stats
      const readersWithStats: ReaderWithStats[] = await Promise.all(
        (readersData || []).map(async (reader) => {
          // Get all completed purchases for this reader
          const { data: purchasesData, error: purchasesError } = await supabase
            .from('purchases')
            .select(`
              id,
              chapter_id,
              amount_paid,
              purchased_at,
              chapters!purchases_chapter_id_fkey (
                title,
                chapter_number,
                book_id,
                books (
                  title
                )
              )
            `)
            .eq('user_id', reader.id)
            .eq('payment_status', 'completed')
            .order('purchased_at', { ascending: false });

          if (purchasesError) {
            console.error('Error fetching purchases:', purchasesError);
            return {
              ...reader,
              total_chapters_purchased: 0,
              total_spent: 0,
              last_purchase_date: null,
              purchased_chapters: [],
            };
          }

          const purchases = purchasesData || [];
          const totalSpent = purchases.reduce((sum, p) => sum + p.amount_paid, 0);
          const lastPurchase = purchases.length > 0 ? purchases[0].purchased_at : null;

          const purchasedChapters = purchases.map((p: any) => ({
            chapter_id: p.chapter_id,
            chapter_title: p.chapters?.title || 'Unknown',
            chapter_number: p.chapters?.chapter_number || 0,
            book_title: p.chapters?.books?.title || null,
            amount_paid: p.amount_paid,
            purchased_at: p.purchased_at,
          }));

          return {
            ...reader,
            total_chapters_purchased: purchases.length,
            total_spent: totalSpent,
            last_purchase_date: lastPurchase,
            purchased_chapters: purchasedChapters,
          };
        })
      );

      setReaders(readersWithStats);
      setFilteredReaders(readersWithStats);
    } catch (error) {
      console.error('Error fetching readers:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Name',
      'Email',
      'Joined Date',
      'Chapters Purchased',
      'Total Spent (₹)',
      'Last Purchase',
    ];

    const rows = filteredReaders.map((reader) => [
      reader.full_name,
      reader.email,
      new Date(reader.created_at).toLocaleDateString('en-GB'),
      reader.total_chapters_purchased,
      reader.total_spent.toFixed(2),
      reader.last_purchase_date
        ? new Date(reader.last_purchase_date).toLocaleDateString('en-GB')
        : 'Never',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `readers-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const toggleExpandReader = (readerId: string) => {
    setExpandedReaderId(expandedReaderId === readerId ? null : readerId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-cinzel">
            Reader Management
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-lora">
            {filteredReaders.length} reader{filteredReaders.length !== 1 ? 's' : ''} found
          </p>
        </div>

        <button
          onClick={exportToCSV}
          disabled={filteredReaders.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-lora text-sm"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={20} className="text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-lora"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="gothic-card rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-lora">Total Readers</p>
            <Users size={24} className="text-primary-600 dark:text-primary-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white font-cinzel">
            {readers.length}
          </p>
        </div>

        <div className="gothic-card rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-lora">Active Buyers</p>
            <BookOpen size={24} className="text-green-600 dark:text-green-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white font-cinzel">
            {readers.filter((r) => r.total_chapters_purchased > 0).length}
          </p>
        </div>

        <div className="gothic-card rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-lora">Total Revenue</p>
            <span className="text-2xl">₹</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white font-cinzel">
            ₹{readers.reduce((sum, r) => sum + r.total_spent, 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Readers List */}
      <div className="gothic-card rounded-lg overflow-hidden">
        {filteredReaders.length === 0 ? (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 font-lora">
              {searchQuery ? 'No readers found matching your search' : 'No readers yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 font-cinzel">
                    Reader
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 font-cinzel hidden md:table-cell">
                    Email
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 font-cinzel">
                    Purchases
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 font-cinzel hidden sm:table-cell">
                    Total Spent
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 font-cinzel">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredReaders.map((reader) => (
                  <>
                    <tr
                      key={reader.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white font-lora">
                            {reader.full_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-lora md:hidden">
                            {reader.email}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-lora">
                            Joined {new Date(reader.created_at).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400 font-lora text-sm hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-gray-400" />
                          {reader.email}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-semibold">
                          {reader.total_chapters_purchased}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-green-600 dark:text-green-400 font-bold font-cinzel hidden sm:table-cell">
                        ₹{reader.total_spent.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleExpandReader(reader.id)}
                          className="p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Row - Purchase Details */}
                    {expandedReaderId === reader.id && (
                      <tr className="bg-gray-50 dark:bg-gray-700">
                        <td colSpan={5} className="py-4 px-4">
                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-900 dark:text-white font-cinzel flex items-center gap-2">
                              <BookOpen size={18} />
                              Purchase History ({reader.purchased_chapters.length})
                            </h4>

                            {reader.purchased_chapters.length === 0 ? (
                              <p className="text-sm text-gray-600 dark:text-gray-400 italic font-lora">
                                No purchases yet
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {reader.purchased_chapters.map((purchase, index) => (
                                  <div
                                    key={index}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600"
                                  >
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white font-lora">
                                        Chapter {purchase.chapter_number}: {purchase.chapter_title}
                                      </p>
                                      {purchase.book_title && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-lora">
                                          From: {purchase.book_title}
                                        </p>
                                      )}
                                      <p className="text-xs text-gray-500 dark:text-gray-400 font-lora">
                                        {new Date(purchase.purchased_at).toLocaleDateString('en-GB')} at{' '}
                                        {new Date(purchase.purchased_at).toLocaleTimeString('en-GB', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-bold text-green-600 dark:text-green-400 font-cinzel">
                                        ₹{purchase.amount_paid.toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}