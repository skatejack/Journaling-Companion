import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { 
  Search, 
  Calendar,
  Clock,
  Heart,
  ChevronDown,
  ChevronUp,
  Loader2,
  BookOpen
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface User {
  id: string;
  email: string;
  name: string;
  accessToken: string;
}

interface JournalEntry {
  id: string;
  content: string;
  mood: string;
  prompt: string;
  sentiment: string;
  emotions: string[];
  themes: string[];
  createdAt: string;
  wordCount: number;
}

interface EntryHistoryProps {
  user: User;
}

const moodEmojis = {
  amazing: '😊',
  good: '🙂',
  okay: '😐',
  difficult: '😔',
  struggling: '😢'
};

const sentimentColors = {
  positive: 'bg-green-100 text-green-800',
  neutral: 'bg-yellow-100 text-yellow-800',
  negative: 'bg-red-100 text-red-800'
};

export function EntryHistory({ user }: EntryHistoryProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async (offset = 0) => {
    if (offset === 0) setIsLoading(true);
    else setLoadingMore(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6108c338/entries?limit=20&offset=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${user.accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (offset === 0) {
          setEntries(data.entries);
        } else {
          setEntries(prev => [...prev, ...data.entries]);
        }
        setHasMore(data.entries.length === 20);
      } else {
        throw new Error('Failed to load entries');
      }
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadEntries(entries.length);
    }
  };

  const toggleExpanded = (entryId: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  const filteredEntries = entries.filter(entry =>
    searchTerm === '' ||
    entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.themes.some(theme => theme.toLowerCase().includes(searchTerm.toLowerCase())) ||
    entry.emotions.some(emotion => emotion.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const truncateContent = (content: string, maxLength = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading your journal history...</p>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-xl text-gray-900 mb-2">No Entries Yet</h3>
        <p className="text-gray-600 mb-6">
          Your journal entries will appear here once you start writing.
        </p>
        <Button 
          onClick={() => window.location.hash = '#write'}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          Write Your First Entry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search your entries, emotions, or themes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Entries List */}
      <div className="space-y-4">
        {filteredEntries.map((entry) => {
          const isExpanded = expandedEntries.has(entry.id);
          const contentToShow = isExpanded ? entry.content : truncateContent(entry.content);
          
          return (
            <Card key={entry.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {formatDate(entry.createdAt)}
                    </div>
                    {entry.mood && (
                      <div className="flex items-center gap-1">
                        <span>{moodEmojis[entry.mood as keyof typeof moodEmojis]}</span>
                        <span className="text-sm text-gray-600 capitalize">{entry.mood}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    {entry.wordCount} words
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Entry Content */}
                <div>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {contentToShow}
                  </p>
                  {entry.content.length > 200 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(entry.id)}
                      className="mt-2 p-0 h-auto text-indigo-600 hover:text-indigo-700"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-1" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-1" />
                          Read more
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                  {entry.sentiment && (
                    <Badge className={sentimentColors[entry.sentiment as keyof typeof sentimentColors]}>
                      {entry.sentiment} sentiment
                    </Badge>
                  )}
                  
                  {entry.emotions && entry.emotions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {entry.emotions.slice(0, 3).map((emotion) => (
                        <Badge key={emotion} variant="outline" className="text-xs">
                          <Heart className="w-3 h-3 mr-1" />
                          {emotion}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {entry.themes && entry.themes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {entry.themes.slice(0, 3).map((theme) => (
                        <Badge key={theme} variant="secondary" className="text-xs">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Original Prompt */}
                {isExpanded && entry.prompt && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Original prompt:</span> {entry.prompt}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Load More Button */}
      {hasMore && filteredEntries.length === entries.length && (
        <div className="text-center">
          <Button
            onClick={loadMore}
            disabled={loadingMore}
            variant="outline"
            className="w-full"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading more entries...
              </>
            ) : (
              'Load More Entries'
            )}
          </Button>
        </div>
      )}

      {/* Search Results Info */}
      {searchTerm && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-600">
            {filteredEntries.length === 0 
              ? `No entries found for "${searchTerm}"`
              : `Found ${filteredEntries.length} ${filteredEntries.length === 1 ? 'entry' : 'entries'} for "${searchTerm}"`
            }
          </p>
        </div>
      )}
    </div>
  );
}