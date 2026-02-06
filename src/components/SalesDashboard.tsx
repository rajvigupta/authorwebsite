import { useState, useEffect } from 'react';
import { IndianRupee, TrendingUp, Users, FileText, Download, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type PurchaseWithDetails = {
  id: string;
  user_id: string;
  chapter_id: string;
  amount_paid: number;
  payment_status: string;
  purchased_at: string;
  razorpay_payment_id: string | null;
  user_email: string;
  user_name: string;
  chapter_title: string;
  chapter_number: number;
  book_title: string | null;
};

type ChapterStats = {
  chapter_id: string;
  chapter_title: string;
  chapter_number: number;
  book_title: string | null;
  total_sales: number;
  total_revenue: number;
  purchase_count: number;
};

export function SalesDashboard() {
  const [purchases, setPurchases] = useState<PurchaseWithDetails[]>([]);
  const [chapterStats, setChapterStats] = useState<ChapterStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'week'>('all');
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.role === 'author') {
      fetchSalesData();
    }
  }, [profile, timeFilter]);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select(`
          *,
          profiles!purchases_user_id_fkey (
            email,
            full_name
          ),
          chapters!purchases_chapter_id_fkey (
            title,
            chapter_number,
            book_id,
            books (
              title
            )
          )
        `)
        .eq('payment_status', 'completed')
        .order('purchased_at', { ascending: false });

      if (purchasesError) throw purchasesError;

      const transformedPurchases: PurchaseWithDetails[] = (purchasesData || []).map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        chapter_id: p.chapter_id,
        amount_paid: p.amount_paid,
        payment_status: p.payment_status,
        purchased_at: p.purchased_at,
        razorpay_payment_id: p.razorpay_payment_id,
        user_email: p.profiles?.email || 'Unknown',
        user_name: p.profiles?.full_name || 'Unknown User',
        chapter_title: p.chapters?.title || 'Unknown Chapter',
        chapter_number: p.chapters?.chapter_number || 0,
        book_title: p.chapters?.books?.title || null,
      }));

      const filteredPurchases = filterByTime(transformedPurchases);
      setPurchases(filteredPurchases);

      const statsMap = new Map<string, ChapterStats>();

      filteredPurchases.forEach((purchase) => {
        const existing = statsMap.get(purchase.chapter_id);
        
        if (existing) {
          existing.purchase_count += 1;
          existing.total_revenue += purchase.amount_paid;
        } else {
          statsMap.set(purchase.chapter_id, {
            chapter_id: purchase.chapter_id,
            chapter_title: purchase.chapter_title,
            chapter_number: purchase.chapter_number,
            book_title: purchase.book_title,
            total_sales: 1,
            total_revenue: purchase.amount_paid,
            purchase_count: 1,
          });
        }
      });

      const stats = Array.from(statsMap.values()).sort((a, b) => b.total_revenue - a.total_revenue);
      setChapterStats(stats);
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterByTime = (data: PurchaseWithDetails[]) => {
    if (timeFilter === 'all') return data;

    const now = new Date();
    const cutoffDate = new Date();

    if (timeFilter === 'week') {
      cutoffDate.setDate(now.getDate() - 7);
    } else if (timeFilter === 'month') {
      cutoffDate.setMonth(now.getMonth() - 1);
    }

    return data.filter((p) => new Date(p.purchased_at) >= cutoffDate);
  };

  const totalRevenue = purchases.reduce((sum, p) => sum + p.amount_paid, 0);
  const uniqueBuyers = new Set(purchases.map((p) => p.user_id)).size;
  const totalSales = purchases.length;

  const exportToCSV = () => {
    const headers = ['Date', 'Customer Name', 'Email', 'Chapter', 'Book', 'Amount', 'Payment ID', 'Status'];
    const rows = purchases.map((p) => [
      new Date(p.purchased_at).toLocaleDateString('en-GB'),
      p.user_name,
      p.user_email,
      `Ch ${p.chapter_number}: ${p.chapter_title}`,
      p.book_title || 'Standalone',
      `₹${p.amount_paid}`,
      p.razorpay_payment_id || 'N/A',
      p.payment_status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header - Mobile Responsive */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white font-cinzel">
          Sales Dashboard
        </h2>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          {/* Time Filter */}
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
            className="px-3 md:px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-lora text-sm md:text-base"
          >
            <option value="all">All Time</option>
            <option value="month">Last 30 Days</option>
            <option value="week">Last 7 Days</option>
          </select>

          {/* Export Button */}
          <button
            onClick={exportToCSV}
            disabled={purchases.length === 0}
            className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-lora text-sm md:text-base"
          >
            <Download size={16} className="md:w-[18px] md:h-[18px]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Stats Cards - Fully Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {/* Total Revenue */}
        <div className="gothic-card rounded-lg p-4 md:p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-lora">Total Revenue</p>
            <div className="p-1.5 md:p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <IndianRupee size={16} className="md:w-5 md:h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white font-cinzel">
            ₹{totalRevenue.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 font-lora">
            From {totalSales} transaction{totalSales !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Total Sales */}
        <div className="gothic-card rounded-lg p-4 md:p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-lora">Total Sales</p>
            <div className="p-1.5 md:p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <TrendingUp size={16} className="md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white font-cinzel">
            {totalSales}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 font-lora">
            Chapters purchased
          </p>
        </div>

        {/* Unique Buyers */}
        <div className="gothic-card rounded-lg p-4 md:p-6 sm:col-span-2 md:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-lora">Unique Buyers</p>
            <div className="p-1.5 md:p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Users size={16} className="md:w-5 md:h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white font-cinzel">
            {uniqueBuyers}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 font-lora">
            Individual customers
          </p>
        </div>
      </div>

      {/* Chapter Performance - Mobile Card View + Desktop Table */}
      <div className="gothic-card rounded-lg p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4 font-cinzel flex items-center gap-2">
          <FileText size={20} className="md:w-6 md:h-6" />
          Chapter Performance
        </h3>

        {chapterStats.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400 font-lora text-sm md:text-base">No sales data yet</p>
          </div>
        ) : (
          <>
            {/* Mobile: Card View */}
            <div className="md:hidden space-y-3">
              {chapterStats.map((stat) => (
                <div
                  key={stat.chapter_id}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2"
                >
                  <div className="font-lora">
                    <p className="text-gray-900 dark:text-white font-semibold text-sm break-words">
                      Ch {stat.chapter_number}: {stat.chapter_title}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {stat.book_title || 'Standalone'}
                    </p>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Sales</p>
                      <span className="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-semibold mt-1">
                        {stat.purchase_count}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
                      <p className="text-green-600 dark:text-green-400 font-bold font-cinzel text-base mt-1">
                        ₹{stat.total_revenue.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 font-cinzel">
                      Chapter
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 font-cinzel">
                      Book
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 font-cinzel">
                      Sales
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 font-cinzel">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {chapterStats.map((stat) => (
                    <tr
                      key={stat.chapter_id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="py-3 px-4 font-lora">
                        <p className="text-gray-900 dark:text-white font-medium">
                          Chapter {stat.chapter_number}: {stat.chapter_title}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400 font-lora">
                        {stat.book_title || 'Standalone'}
                      </td>
                      <td className="py-3 px-4 text-right font-lora">
                        <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                          {stat.purchase_count}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-green-600 dark:text-green-400 font-bold font-cinzel">
                        ₹{stat.total_revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Recent Transactions - Mobile Cards */}
      <div className="gothic-card rounded-lg p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4 font-cinzel flex items-center gap-2">
          <Calendar size={20} className="md:w-6 md:h-6" />
          Recent Transactions
        </h3>

        {purchases.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400 font-lora text-sm md:text-base">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {purchases.slice(0, 10).map((purchase) => (
              <div
                key={purchase.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 md:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white font-lora text-sm md:text-base truncate">
                    {purchase.user_name}
                  </p>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-lora truncate">
                    {purchase.user_email}
                  </p>
                </div>
                <div className="flex-1 min-w-0 md:px-4">
                  <p className="text-xs md:text-sm font-medium text-gray-900 dark:text-white font-lora break-words">
                    Ch {purchase.chapter_number}: {purchase.chapter_title}
                  </p>
                  {purchase.book_title && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 font-lora truncate">
                      From: {purchase.book_title}
                    </p>
                  )}
                </div>
                <div className="text-left md:text-right flex md:flex-col justify-between md:justify-start items-center md:items-end">
                  <p className="text-base md:text-lg font-bold text-green-600 dark:text-green-400 font-cinzel">
                    ₹{purchase.amount_paid}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 font-lora">
                    {new Date(purchase.purchased_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {purchases.length > 10 && (
          <div className="text-center mt-4">
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-lora">
              Showing 10 of {purchases.length} transactions
            </p>
          </div>
        )}
      </div>
    </div>
  );
}