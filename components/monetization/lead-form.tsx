'use client';

import { FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OfferType } from '@/lib/monetization-types';

interface LeadFormProps {
  offerType: OfferType;
  title?: string;
  submitLabel?: string;
  compact?: boolean;
}

export function LeadForm({ offerType, title = 'Talk to sales', submitLabel = 'Submit', compact = false }: LeadFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [org, setOrg] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/monetize/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerType,
          name,
          email,
          org,
          notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || 'Failed to submit lead');
        return;
      }

      setMessage('Submitted. We will follow up manually for invoicing and activation.');
      setName('');
      setEmail('');
      setOrg('');
      setNotes('');
    } catch {
      setMessage('Failed to submit lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-border/60 bg-card/60 p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className={compact ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-1 gap-3 md:grid-cols-2'}>
        <div className="space-y-1">
          <Label htmlFor={`${offerType}-name`}>Name</Label>
          <Input
            id={`${offerType}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${offerType}-email`}>Email</Label>
          <Input
            id={`${offerType}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </div>

      <div className={compact ? 'space-y-2' : 'grid grid-cols-1 gap-3 md:grid-cols-2'}>
        <div className="space-y-1">
          <Label htmlFor={`${offerType}-org`}>Organization</Label>
          <Input
            id={`${offerType}-org`}
            value={org}
            onChange={(e) => setOrg(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${offerType}-notes`}>Notes</Label>
          <textarea
            id={`${offerType}-notes`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={compact ? 2 : 3}
            placeholder="Goals, budget, timeline"
            className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : submitLabel}
        </Button>
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
      </div>
    </form>
  );
}
