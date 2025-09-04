import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  TrendingUp, 
  Heart, 
  Brain, 
  Calendar,
  BarChart3,
  Lightbulb,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { projectId } from '../utils/supabase/info';

interface User {
  id: string;
  email: string;
  name: string;
  accessToken: string;
}

interface InsightsDashboardProps {
  user: User;
}

interface InsightsData {
  stats: {
    totalEntries: number;
    streak: number;
    totalWords: number;
  };
  recentEntriesCount: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topEmotions: [string, number][];
  topThemes: [string, number][];
  dailyWordCounts: Record<string, number>;
  weeklyInsight: string | null;
  averageWordsPerEntry: number;
}

const SENTIMENT_COLORS = {
  positive: '#10B981',
  neutral: '#F59E0B', 
  negative: '#EF4444'
};

const EMOTION_COLORS = ['#8B5CF6', '#06B6D4', '#F59E0B', '#EF4444', '#10B981'];

export function InsightsDashboard({ user }: InsightsDashboardProps) {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    loadInsights();
  }, [timeRange]);

  const loadInsights = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6108c338/insights?days=${timeRange}`,
        {
          headers: {
            'Authorization': `Bearer ${user.accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setInsights(data);
      } else {
        throw new Error('Failed to load insights');
      }
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Analyzing your journal patterns...</p>
        </div>
      </div>
    );
  }

  if (!insights || insights.recentEntriesCount === 0) {
    return (
      <div className="text-center py-12">
        <Brain className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-xl text-gray-900 mb-2">Start Writing to See Insights</h3>
        <p className="text-gray-600 mb-6">
          Once you've written a few entries, I'll help you discover patterns in your thoughts and emotions.
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

  // Prepare chart data
  const sentimentData = [
    { name: 'Positive', value: insights.sentimentDistribution.positive, color: SENTIMENT_COLORS.positive },
    { name: 'Neutral', value: insights.sentimentDistribution.neutral, color: SENTIMENT_COLORS.neutral },
    { name: 'Negative', value: insights.sentimentDistribution.negative, color: SENTIMENT_COLORS.negative }
  ].filter(item => item.value > 0);

  const emotionData = insights.topEmotions.map(([emotion, count], index) => ({
    emotion: emotion.charAt(0).toUpperCase() + emotion.slice(1),
    count,
    fill: EMOTION_COLORS[index % EMOTION_COLORS.length]
  }));

  const wordCountData = Object.entries(insights.dailyWordCounts)
    .map(([date, words]) => ({
      date: new Date(date).getMonth() + 1 + '/' + new Date(date).getDate(),
      words
    }))
    .slice(-14); // Last 14 days

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header with time range selector */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl text-gray-900">Your Insights</h2>
          <p className="text-gray-600">Discover patterns in your journaling journey</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 3 months</option>
          </select>
          <Button variant="ghost" size="sm" onClick={loadInsights}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Calendar className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Writing Streak</p>
                <p className="text-2xl text-gray-900">{insights.stats.streak} days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Entries</p>
                <p className="text-2xl text-gray-900">{insights.stats.totalEntries}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Words</p>
                <p className="text-2xl text-gray-900">{insights.stats.totalWords.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Heart className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Words/Entry</p>
                <p className="text-2xl text-gray-900">{insights.averageWordsPerEntry}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insight */}
      {insights.weeklyInsight && (
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-600" />
              AI Insight for You
            </CardTitle>
            <CardDescription>
              Based on your recent journaling patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-800 leading-relaxed">
              {insights.weeklyInsight}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Charts and Analysis */}
      <Tabs defaultValue="sentiment" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          <TabsTrigger value="emotions">Emotions</TabsTrigger>
          <TabsTrigger value="themes">Themes</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="sentiment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Emotional Sentiment Distribution</CardTitle>
              <CardDescription>
                Overall emotional tone of your entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sentimentData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sentimentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {sentimentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Not enough data yet. Keep writing to see patterns!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emotions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Frequent Emotions</CardTitle>
              <CardDescription>
                Emotions that appear most often in your entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emotionData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={emotionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="emotion" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8B5CF6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Not enough data yet. Keep writing to see emotional patterns!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="themes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Common Themes</CardTitle>
              <CardDescription>
                Topics and areas of life you write about most
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights.topThemes.length > 0 ? (
                <div className="space-y-3">
                  {insights.topThemes.map(([theme, count], index) => (
                    <div key={theme} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: EMOTION_COLORS[index % EMOTION_COLORS.length] }} />
                        <span className="capitalize text-gray-900">{theme}</span>
                      </div>
                      <Badge variant="secondary">{count} mentions</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Not enough data yet. Keep writing to see thematic patterns!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Writing Activity</CardTitle>
              <CardDescription>
                Your word count over the past two weeks
              </CardDescription>
            </CardHeader>
            <CardContent>
              {wordCountData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={wordCountData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="words" fill="#06B6D4" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Not enough data yet. Keep writing to see your activity patterns!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}