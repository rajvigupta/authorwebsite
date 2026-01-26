import { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, Send, Trash2 } from 'lucide-react';
import { supabase, Comment, Vote, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';

type CommentWithProfile = Comment & {
  profile: Profile;
};

type BookCommentSectionProps = {
  bookId: string;
};

export function BookCommentSection({ bookId }: BookCommentSectionProps) {
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [newComment, setNewComment] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, profile } = useAuth();
  const toast = useToast();

  useEffect(() => {
    fetchComments();
    fetchVotes();
  }, [bookId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*, profile:profiles(*)')
        .eq('book_id', bookId)
        .is('chapter_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchVotes = async () => {
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('*')
        .eq('book_id', bookId)
        .is('chapter_id', null);

      if (error) throw error;
      setVotes(data || []);
      setHasVoted(data?.some((v) => v.user_id === user?.id) || false);
    } catch (error) {
      console.error('Error fetching votes:', error);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    if (!user) {
      alert('Please sign in to comment');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('comments').insert([
        {
          book_id: bookId,
          chapter_id: null,
          user_id: user.id,
          content: newComment,
        },
      ]);

      if (error) throw error;
      setNewComment('');
      toast.success('💬 Comment posted successfully!'); 
      fetchComments();
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (!user) {
      alert('Please sign in to vote');
      return;
    }

    setLoading(true);
    try {
      if (hasVoted) {
        const { error } = await supabase
          .from('votes')
          .delete()
          .eq('book_id', bookId)
          .eq('user_id', user.id)
          .is('chapter_id', null);

        if (error) throw error;
        toast.info('Vote removed');
      } else {
        const { error } = await supabase.from('votes').insert([
          {
            book_id: bookId,
            chapter_id: null,
            user_id: user.id,
          },
        ]);

        if (error) throw error;
      toast.success('👍 Voted!'); 
      }

      fetchVotes();
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to vote'); 
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;

    try {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) throw error;
      toast.success('Comment deleted'); 
      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  return (
    <div className="space-y-6">
      {/* Vote and Comment Count */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleVote}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              hasVoted
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                : ' text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <ThumbsUp 
              size={20} 
              className={`transition-all ${
                hasVoted 
                  ? 'fill-green-600 text-green-600' 
                  : 'fill-none text-gray-600 dark:text-gray-400'
              }`}
            />
            {votes.length} {votes.length === 1 ? 'Like' : 'Likes'}
          </button>
          <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <MessageSquare size={20} />
            {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
          </span>
        </div>

        {/* Comment Input - Only if logged in */}
        {user ? (
          <form onSubmit={handleComment} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts about this book series..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={loading || !newComment.trim()}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </form>
        ) : (
          <div className="text-center py-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-gray-600 dark:text-gray-400">
              Sign in to join the discussion
            </p>
          </div>
        )}
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-gray-600 dark:text-gray-400">
              No comments yet. Be the first to share your thoughts!
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {comment.profile.full_name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </p>
                </div>
                {user && comment.user_id === user.id && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              <p className="text-gray-700 dark:text-gray-300">{comment.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}