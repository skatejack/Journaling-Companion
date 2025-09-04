import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Sparkles, 
  Save, 
  RefreshCw, 
  Heart, 
  Smile, 
  Meh, 
  Frown,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info';

interface User {
  id: string;
  email: string;
  name: string;
  accessToken: string;
}

interface JournalEntryProps {
  user: User;
  onEntryCreated: (streak: number) => void;
}

const moodOptions = [
  { value: 'amazing', label: 'Amazing', icon: '😊', color: 'bg-green-100 text-green-800' },
  { value: 'good', label: 'Good', icon: '🙂', color: 'bg-blue-100 text-blue-800' },
  { value: 'okay', label: 'Okay', icon: '😐', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'difficult', label: 'Difficult', icon: '😔', color: 'bg-orange-100 text-orange-800' },
  { value: 'struggling', label: 'Struggling', icon: '😢', color: 'bg-red-100 text-red-800' }
];

export function JournalEntry({ user, onEntryCreated }: JournalEntryProps) {
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  // Load initial prompt on component mount
  useEffect(() => {
    loadPrompt();
  }, []);

  // Update word count when content changes
  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [content]);

  const loadPrompt = async () => {
    setIsLoadingPrompt(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6108c338/prompt`,
        {
          headers: {
            'Authorization': `Bearer ${user.accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPrompt(data.prompt);
      } else {
        throw new Error('Failed to load prompt');
      }
    } catch (error) {
      console.error('Error loading prompt:', error);
      toast.error('Failed to load writing prompt');
    } finally {
      setIsLoadingPrompt(false);
    }
  };

  const saveEntry = async () => {
    if (!content.trim()) {
      toast.error('Please write something before saving');
      return;
    }

    if (!mood) {
      toast.error('Please select how you\'re feeling today');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6108c338/entries`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.accessToken}`
          },
          body: JSON.stringify({
            content: content.trim(),
            mood,
            prompt
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success('Your thoughts have been saved! 💭');
        
        // Reset form
        setContent('');
        setMood('');
        loadPrompt(); // Load a new prompt for next time
        
        // Update streak
        onEntryCreated(data.streak);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save entry');
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      toast.error('Failed to save your entry. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedMood = moodOptions.find(m => m.value === mood);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Writing Prompt Card */}
      <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Today's Reflection Prompt
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadPrompt}
              disabled={isLoadingPrompt}
              className="text-indigo-600 hover:text-indigo-700"
            >
              {isLoadingPrompt ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              New prompt
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingPrompt ? (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating a personalized prompt for you...
            </div>
          ) : (
            <p className="text-gray-800 leading-relaxed">
              {prompt || "What's on your mind today? Take a moment to reflect on your thoughts and feelings."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Mood Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500" />
            How are you feeling today?
          </CardTitle>
          <CardDescription>
            Your emotional check-in helps create better insights over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {moodOptions.map((moodOption) => (
              <button
                key={moodOption.value}
                onClick={() => setMood(moodOption.value)}
                className={`
                  p-3 rounded-lg border-2 transition-all text-center
                  ${mood === moodOption.value 
                    ? 'border-indigo-300 bg-indigo-50' 
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                  }
                `}
              >
                <div className="text-2xl mb-1">{moodOption.icon}</div>
                <div className="text-sm text-gray-700">{moodOption.label}</div>
              </button>
            ))}
          </div>
          {selectedMood && (
            <div className="mt-3">
              <Badge className={selectedMood.color}>
                {selectedMood.icon} Feeling {selectedMood.label}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Writing Area */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Your Journal Entry</CardTitle>
          <CardDescription>
            Let your thoughts flow freely. There's no right or wrong way to journal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing... What happened today? How did it make you feel? What are you thinking about?"
              className="min-h-[300px] resize-none border-gray-200 focus:border-indigo-300 focus:ring-indigo-200"
            />
            <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
              <span>{wordCount} words</span>
              <span>Take your time, this is your safe space</span>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              onClick={saveEntry}
              disabled={isSaving || !content.trim() || !mood}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Entry
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Encouraging message */}
      <div className="text-center py-4">
        <p className="text-gray-600 text-sm">
          ✨ Remember: Every word you write is a step toward better self-understanding
        </p>
      </div>
    </div>
  );
}