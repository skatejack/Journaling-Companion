import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Initialize Supabase client for server operations
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Health check endpoint
app.get("/make-server-6108c338/health", (c) => {
  return c.json({ status: "ok" });
});

// User signup endpoint
app.post("/make-server-6108c338/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    if (!email || !password || !name) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.error('Signup error:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.error('Server error during signup:', error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get user authentication helper
async function getUserFromToken(token: string) {
  if (!token) return null;
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  
  return user;
}

// Create journal entry
app.post("/make-server-6108c338/entries", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { content, mood, prompt } = await c.req.json();
    
    if (!content) {
      return c.json({ error: "Content is required" }, 400);
    }

    // Analyze sentiment using OpenAI
    let sentiment = null;
    let emotions = [];
    let themes = [];
    
    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{
            role: 'system',
            content: `You are an empathetic AI that analyzes journal entries for emotional patterns. Respond with a JSON object containing:
            {
              "sentiment": "positive|neutral|negative",
              "sentiment_score": number between -1 and 1,
              "emotions": ["emotion1", "emotion2", ...] (max 3 main emotions),
              "themes": ["theme1", "theme2", ...] (max 3 main themes like "work", "relationships", "health", etc.),
              "key_insights": "brief insight about emotional patterns or growth"
            }`
          }, {
            role: 'user',
            content: content
          }]
        })
      });

      if (openaiResponse.ok) {
        const aiData = await openaiResponse.json();
        const analysis = JSON.parse(aiData.choices[0].message.content);
        sentiment = analysis.sentiment;
        emotions = analysis.emotions || [];
        themes = analysis.themes || [];
      }
    } catch (aiError) {
      console.log('AI analysis failed, continuing without it:', aiError);
    }

    const entry = {
      id: crypto.randomUUID(),
      userId: user.id,
      content,
      mood,
      prompt,
      sentiment,
      emotions,
      themes,
      createdAt: new Date().toISOString(),
      wordCount: content.split(/\s+/).length
    };

    // Store entry
    await kv.set(`entry:${user.id}:${entry.id}`, entry);
    
    // Update user stats
    const todayKey = new Date().toDateString();
    const userStatsKey = `user_stats:${user.id}`;
    const userStats = await kv.get(userStatsKey) || { 
      totalEntries: 0, 
      streak: 0, 
      lastEntryDate: null,
      totalWords: 0
    };
    
    // Calculate streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    if (userStats.lastEntryDate === yesterdayStr) {
      userStats.streak += 1;
    } else if (userStats.lastEntryDate !== todayKey) {
      userStats.streak = 1;
    }
    
    userStats.totalEntries += 1;
    userStats.totalWords += entry.wordCount;
    userStats.lastEntryDate = todayKey;
    
    await kv.set(userStatsKey, userStats);

    return c.json({ 
      success: true, 
      entry,
      streak: userStats.streak
    });
  } catch (error) {
    console.error('Error creating journal entry:', error);
    return c.json({ error: "Failed to create entry" }, 500);
  }
});

// Get journal entries for a user
app.get("/make-server-6108c338/entries", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');

    // Get entries for this user
    const entriesData = await kv.getByPrefix(`entry:${user.id}:`);
    
    // Sort by creation date (newest first) and paginate
    const entries = entriesData
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit);

    return c.json({ entries });
  } catch (error) {
    console.error('Error fetching entries:', error);
    return c.json({ error: "Failed to fetch entries" }, 500);
  }
});

// Generate AI writing prompt
app.get("/make-server-6108c338/prompt", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get recent entries to provide context
    const recentEntries = await kv.getByPrefix(`entry:${user.id}:`);
    const lastThreeEntries = recentEntries
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);

    let contextPrompt = "Generate a thoughtful, empathetic journaling prompt for someone starting their day.";
    
    if (lastThreeEntries.length > 0) {
      const recentThemes = lastThreeEntries.flatMap(e => e.themes || []);
      const recentEmotions = lastThreeEntries.flatMap(e => e.emotions || []);
      const recentSentiments = lastThreeEntries.map(e => e.sentiment).filter(Boolean);
      
      contextPrompt = `Based on this person's recent journal entries showing themes like: ${recentThemes.join(', ')} and emotions like: ${recentEmotions.join(', ')}, generate a thoughtful, empathetic follow-up journaling prompt that helps them reflect and grow. Make it personal and contextual, not generic.`;
    }

    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{
            role: 'system',
            content: 'You are an empathetic journaling companion. Create personalized, thoughtful prompts that encourage self-reflection and emotional growth. Keep prompts under 100 words and make them feel like a caring friend is asking.'
          }, {
            role: 'user',
            content: contextPrompt
          }]
        })
      });

      if (openaiResponse.ok) {
        const aiData = await openaiResponse.json();
        const prompt = aiData.choices[0].message.content.trim();
        return c.json({ prompt });
      }
    } catch (aiError) {
      console.log('AI prompt generation failed:', aiError);
    }

    // Fallback prompts if AI fails
    const fallbackPrompts = [
      "What's one small thing that brought you joy today, and why did it resonate with you?",
      "If you could give your past self one piece of advice, what would it be and why?",
      "What emotions are you carrying right now? Take a moment to acknowledge them without judgment.",
      "Describe a moment today when you felt most like yourself. What were you doing?",
      "What's something you're grateful for that you might have overlooked recently?"
    ];
    
    const randomPrompt = fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)];
    return c.json({ prompt: randomPrompt });
  } catch (error) {
    console.error('Error generating prompt:', error);
    return c.json({ error: "Failed to generate prompt" }, 500);
  }
});

// Get insights and analytics
app.get("/make-server-6108c338/insights", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const days = parseInt(c.req.query('days') || '30');
    
    // Get user stats
    const userStats = await kv.get(`user_stats:${user.id}`) || {
      totalEntries: 0,
      streak: 0,
      totalWords: 0
    };

    // Get recent entries for analysis
    const allEntries = await kv.getByPrefix(`entry:${user.id}:`);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentEntries = allEntries.filter(entry => 
      new Date(entry.createdAt) >= cutoffDate
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Analyze patterns
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    const emotionFreq = {};
    const themeFreq = {};
    const dailyWordCounts = {};

    recentEntries.forEach(entry => {
      // Sentiment analysis
      if (entry.sentiment) {
        sentimentCounts[entry.sentiment]++;
      }

      // Emotion frequency
      (entry.emotions || []).forEach(emotion => {
        emotionFreq[emotion] = (emotionFreq[emotion] || 0) + 1;
      });

      // Theme frequency
      (entry.themes || []).forEach(theme => {
        themeFreq[theme] = (themeFreq[theme] || 0) + 1;
      });

      // Daily word counts
      const date = new Date(entry.createdAt).toDateString();
      dailyWordCounts[date] = (dailyWordCounts[date] || 0) + entry.wordCount;
    });

    // Generate insights with AI
    let weeklyInsight = null;
    if (recentEntries.length >= 3) {
      try {
        const entryTexts = recentEntries.slice(0, 5).map(e => e.content).join('\n\n---\n\n');
        
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{
              role: 'system',
              content: 'You are an empathetic AI journaling companion. Analyze these recent journal entries and provide a gentle, encouraging insight about patterns, growth, or positive observations. Keep it under 150 words and focus on strengths and progress.'
            }, {
              role: 'user',
              content: `Please analyze these recent journal entries and provide a supportive insight:\n\n${entryTexts}`
            }]
          })
        });

        if (openaiResponse.ok) {
          const aiData = await openaiResponse.json();
          weeklyInsight = aiData.choices[0].message.content.trim();
        }
      } catch (aiError) {
        console.log('AI insight generation failed:', aiError);
      }
    }

    return c.json({
      stats: userStats,
      recentEntriesCount: recentEntries.length,
      sentimentDistribution: sentimentCounts,
      topEmotions: Object.entries(emotionFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
      topThemes: Object.entries(themeFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
      dailyWordCounts,
      weeklyInsight,
      averageWordsPerEntry: recentEntries.length > 0 
        ? Math.round(recentEntries.reduce((sum, e) => sum + e.wordCount, 0) / recentEntries.length)
        : 0
    });
  } catch (error) {
    console.error('Error generating insights:', error);
    return c.json({ error: "Failed to generate insights" }, 500);
  }
});

Deno.serve(app.fetch);