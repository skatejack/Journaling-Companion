import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Book, Heart, Shield, Sparkles } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { supabase } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';

interface AuthScreenProps {
  onAuthSuccess: (user: any) => void;
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get('signup-email') as string;
    const password = formData.get('signup-password') as string;
    const name = formData.get('signup-name') as string;

    try {
      // Call our server endpoint for signup
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6108c338/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ email, password, name })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // Now sign in the user
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) throw signInError;

      onAuthSuccess({
        id: authData.user.id,
        email: authData.user.email,
        name,
        accessToken: authData.session.access_token
      });

      toast.success('Welcome to your journaling companion!');

    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get('signin-email') as string;
    const password = formData.get('signin-password') as string;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      onAuthSuccess({
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name,
        accessToken: data.session.access_token
      });

      toast.success('Welcome back!');

    } catch (err: any) {
      console.error('Signin error:', err);
      setError(err.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8 items-center">
        
        {/* Left side - App description */}
        <div className="text-center md:text-left space-y-6">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-8">
            <div className="p-3 bg-indigo-600 rounded-2xl">
              <Book className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl text-gray-900">Journal Companion</h1>
          </div>
          
          <h2 className="text-4xl text-gray-900 leading-tight">
            Your AI-powered
            <br />
            <span className="text-indigo-600">journaling companion</span>
          </h2>
          
          <p className="text-xl text-gray-600">
            Turn daily reflection into meaningful insights with personalized prompts, 
            sentiment analysis, and private pattern recognition.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5 text-indigo-600" />
              <span className="text-gray-700">Empathetic, AI-generated prompts</span>
            </div>
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span className="text-gray-700">Discover emotional patterns over time</span>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-indigo-600" />
              <span className="text-gray-700">Completely private and secure</span>
            </div>
          </div>
        </div>

        {/* Right side - Auth forms */}
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Create your account or sign in to continue your journaling journey
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              {error && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertDescription className="text-red-700">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <Label htmlFor="signin-email">Email</Label>
                    <Input 
                      id="signin-email" 
                      name="signin-email"
                      type="email" 
                      required 
                      placeholder="your@email.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="signin-password">Password</Label>
                    <Input 
                      id="signin-password" 
                      name="signin-password"
                      type="password" 
                      required 
                      placeholder="Your password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <Label htmlFor="signup-name">Name</Label>
                    <Input 
                      id="signup-name" 
                      name="signup-name"
                      type="text" 
                      required 
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-email">Email</Label>
                    <Input 
                      id="signup-email" 
                      name="signup-email"
                      type="email" 
                      required 
                      placeholder="your@email.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-password">Password</Label>
                    <Input 
                      id="signup-password" 
                      name="signup-password"
                      type="password" 
                      required 
                      placeholder="Choose a secure password"
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}