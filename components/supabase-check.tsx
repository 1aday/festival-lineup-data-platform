"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SupabaseCheck() {
  const [config, setConfig] = useState<{
    url: string;
    key: string;
    isValid: boolean;
    errors: string[];
  } | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    const errors: string[] = [];
    
    // Check URL
    if (!url) {
      errors.push("NEXT_PUBLIC_SUPABASE_URL is not set in .env.local");
    } else if (!url.includes('supabase.co')) {
      errors.push("URL doesn't look like a valid Supabase URL");
    }
    
    // Check key
    if (!key) {
      errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in .env.local");
    } else if (!key.startsWith('eyJ')) {
      errors.push(`❌ INVALID KEY FORMAT: Your key starts with '${key.substring(0, 10)}...' but Supabase anon keys MUST start with 'eyJ'`);
      errors.push("This is NOT a valid Supabase anon key. You need to get the correct JWT token from your Supabase dashboard.");
    } else if (key.length < 100) {
      errors.push(`Key is too short (${key.length} chars). Supabase anon keys are typically 200+ characters`);
    }
    
    setConfig({
      url,
      key: key ? `${key.substring(0, 30)}...` : '',
      isValid: errors.length === 0,
      errors
    });
  }, []);

  if (!config) return null;
  
  if (config.isValid) {
    return (
      <Alert className="border-green-500/50 bg-green-500/10">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <AlertTitle>Supabase Connected</AlertTitle>
        <AlertDescription>
          Your Supabase configuration is valid and ready to use.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-yellow-500/50 bg-yellow-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
          Supabase Configuration Issue
        </CardTitle>
        <CardDescription>
          Your Supabase credentials need to be corrected
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {config.errors.map((error, i) => (
            <div key={i} className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <p className="text-sm font-medium">How to get the correct credentials:</p>
          <ol className="text-sm space-y-2 text-muted-foreground">
            <li>1. Go to your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Supabase Dashboard <ExternalLink className="inline w-3 h-3" /></a></li>
            <li>2. Select your project</li>
            <li>3. Go to <strong>Settings → API</strong></li>
            <li>4. Copy these values:</li>
          </ol>
          
          <div className="space-y-2 bg-muted/50 rounded p-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Project URL:</p>
              <code className="text-xs bg-background px-2 py-1 rounded">
                NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
              </code>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Anon/Public Key (starts with 'eyJ...'):</p>
              <code className="text-xs bg-background px-2 py-1 rounded">
                NEXT_PUBLIC_SUPABASE_ANON_KEY=...
              </code>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Important:</strong> The anon key is a long JWT token (200+ characters) that starts with 'eyJ'. 
              Don't use the service role key or any other key.
            </AlertDescription>
          </Alert>
        </div>

        <div className="text-xs text-muted-foreground">
          Current values detected:
          <div className="mt-1 space-y-1">
            <div>URL: {config.url ? <Badge variant="outline" className="text-xs">{config.url}</Badge> : 'Not set'}</div>
            <div>Key: {config.key ? <Badge variant="outline" className="text-xs">{config.key}</Badge> : 'Not set'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
