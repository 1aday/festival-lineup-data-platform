import assert from 'node:assert/strict';

import {
  getDemoArtists,
  getDemoEvents,
  getDemoHomepageData,
} from '../lib/demo-data.ts';

const artists = getDemoArtists();
const events = getDemoEvents();
const summary = getDemoHomepageData();
const artistIds = new Set(artists.map((artist) => artist.id));

assert.equal(artists.length, 3, 'The public demo should contain three fictional artists.');
assert.equal(events.length, 3, 'The public demo should contain three fictional events.');
assert.equal(artistIds.size, artists.length, 'Artist fixture IDs must be unique.');
assert.equal(new Set(events.map((event) => event.id)).size, events.length, 'Event fixture IDs must be unique.');

for (const artist of artists) {
  assert.ok(artist.title.trim(), `Artist ${artist.id} needs a name.`);
  assert.ok(artist.country_label.trim(), `Artist ${artist.id} needs a country.`);
  assert.ok(artist.primary_genres.trim(), `Artist ${artist.id} needs a genre.`);
  assert.ok(artist.energy_mean >= 0 && artist.energy_mean <= 1, `Artist ${artist.id} energy must be normalized.`);
  assert.ok(artist.tempo_bpm_mean >= 40 && artist.tempo_bpm_mean <= 250, `Artist ${artist.id} BPM is outside the accepted range.`);
}

for (const event of events) {
  assert.ok(event.title.trim(), `Event ${event.id} needs a title.`);
  assert.ok(event.venue_name.trim(), `Event ${event.id} needs a venue.`);
  assert.ok(Number.isFinite(Date.parse(event.start_date)), `Event ${event.id} needs a valid start date.`);
  assert.ok(Number.isFinite(Date.parse(event.end_date)), `Event ${event.id} needs a valid end date.`);
  assert.ok(event.artists.length > 0, `Event ${event.id} needs at least one artist link.`);
  assert.ok(
    event.artists.every((artist) => artistIds.has(artist.id)),
    `Event ${event.id} references an artist outside the canonical fixture set.`,
  );
}

assert.deepEqual(
  summary.counts,
  { artists: 3, events: 3, venues: 3, countries: 3, genres: 6 },
  'Homepage counts must be derived from the fixtures.',
);

console.log('Validated 3 fictional artists, 3 events, and every artist-event relationship.');
