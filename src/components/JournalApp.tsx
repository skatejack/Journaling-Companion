import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { 
  PenTool, 
  TrendingUp, 
  History, 
  LogOut, 
  User,
  Flame,
  Calendar
} from 'lucide-react';
import { JournalEntry } from './JournalEntry';
import { InsightsDashboard } from './InsightsDashboard';
import { EntryHistory } from './EntryHistory';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface User {
  id: string;
  email: string;
  name: string;
  accessToken: string;
}

interface JournalAppProps {
  user: User;
  onSignOut: () => void;
}

export function JournalApp({ user, onSignOut }: JournalAppProps) {
  const [activeTab, setActiveTab] = useState('write');
  const [streak, setStreak] = useState(0);
  const [lastEntryDate, setLastEntryDate] = useState(null);

  // Fetch user preferences and streak data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-6108c338/insights?days=1`,
          {
            headers: {
              'Authorization': `Bearer ${user.accessToken}`
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setStreak(data.stats?.streak || 0);
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };

    fetchUserData();
  }, [user.accessToken]);

  const handleEntryCreated = (newStreak: number) => {
    setStreak(newStreak);
    setLastEntryDate(new Date().toDateString());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-indigo-600 rounded-xl">
                <PenTool className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl text-gray-900">Journal Companion</h1>
                <p className="text-sm text-gray-600">Welcome back, {user.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Streak Counter */}
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg border border-orange-200">
                <Flame className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-orange-700">
                  {streak} day streak
                </span>
              </div>
              
              {/* User Menu */}
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {user.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onSignOut}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="mb-8">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="write" className="flex items-center gap-2">
                <PenTool className="w-4 h-4" />
                Write
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Insights
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                History
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="write" className="space-y-6">
            <JournalEntry 
              user={user} 
              onEntryCreated={handleEntryCreated}
            />
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <InsightsDashboard user={user} />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <EntryHistory user={user} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}