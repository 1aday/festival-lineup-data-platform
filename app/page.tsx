import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowUpRight,
  CheckCircle2,
  CircleDot,
  Database,
  GitBranch,
  Music2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { getDemoArtists, getDemoEvents, getDemoHomepageData } from '@/lib/demo-data';
import styles from './home.module.css';

export const metadata: Metadata = {
  title: 'Festival Lineup Data Platform',
  description:
    'A fixture-backed showcase of the pipeline that turns festival programs into normalized, linked, quality-scored artist and event data.',
  alternates: { canonical: '/' },
};

const stages = [
  { label: 'Ingest', detail: 'Festival program pages', status: 'complete' },
  { label: 'Normalize', detail: 'Names, dates, venues', status: 'complete' },
  { label: 'Entity link', detail: 'Artists ↔ events', status: 'complete' },
  { label: 'Enrich', detail: 'Genre + audio signals', status: 'complete' },
  { label: 'Validate', detail: 'Evidence + coverage', status: 'complete' },
];

const architecture = [
  ['01', 'Source adapters', 'Collect public festival program records through bounded, retry-aware adapters.'],
  ['02', 'Canonical models', 'Normalize inconsistent source fields into typed artist, event, venue, and lineup records.'],
  ['03', 'Relationship graph', 'Resolve artist appearances across events and expose the links as queryable data.'],
  ['04', 'Delivery surfaces', 'Serve search, directory pages, exports, embeds, and planning workflows from one dataset.'],
];

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function HomePage() {
  const artists = getDemoArtists();
  const events = getDemoEvents();
  const summary = getDemoHomepageData();

  return (
    <main className={styles.page}>
      <header className={styles.nav}>
        <Link href="/" className={styles.brand} aria-label="Festival Lineup Data Platform home">
          <span className={styles.brandMark}><Music2 aria-hidden="true" /></span>
          <span>
            <strong>Festival Lineup</strong>
            <small>Data Platform</small>
          </span>
        </Link>
        <nav className={styles.navLinks} aria-label="Primary navigation">
          <a href="#pipeline">Pipeline</a>
          <a href="#data-model">Data model</a>
          <Link href="/artists">Explore data</Link>
          <a
            className={styles.repoLink}
            href="https://github.com/1aday/festival-lineup-data-platform"
            target="_blank"
            rel="noreferrer"
          >
            Repository <ArrowUpRight aria-hidden="true" />
          </a>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><CircleDot aria-hidden="true" /> Fixture demo · no API keys</p>
          <h1>Turn a messy festival program into <em>decision-ready data.</em></h1>
          <p className={styles.lede}>
            A production-shaped pipeline for collecting, normalizing, linking, enriching, and validating festival lineup data—shown here with a deterministic fictional dataset.
          </p>
          <div className={styles.heroActions}>
            <Link href="/artists" className={styles.primaryAction}>
              Explore the directory <ArrowUpRight aria-hidden="true" />
            </Link>
            <a href="#pipeline" className={styles.secondaryAction}>Inspect the pipeline</a>
          </div>
          <dl className={styles.heroFacts}>
            <div><dt>Demo mode</dt><dd>Always safe</dd></div>
            <div><dt>External writes</dt><dd>None</dd></div>
            <div><dt>Source context</dt><dd>Preserved</dd></div>
          </dl>
        </div>

        <div className={styles.console} aria-label="Fixture pipeline run summary">
          <div className={styles.consoleHeader}>
            <div>
              <span className={styles.windowDots} aria-hidden="true"><i /><i /><i /></span>
              <p>fixture_run_2025_10</p>
            </div>
            <span className={styles.successBadge}><CheckCircle2 aria-hidden="true" /> Validated</span>
          </div>
          <div className={styles.consoleBody}>
            <p className={styles.consoleLabel}>Pipeline progress</p>
            <div className={styles.progressTrack}><span /></div>
            <div className={styles.pipelineRows}>
              {stages.map((stage, index) => (
                <div className={styles.pipelineRow} key={stage.label}>
                  <span className={styles.stageIndex}>{String(index + 1).padStart(2, '0')}</span>
                  <span><strong>{stage.label}</strong><small>{stage.detail}</small></span>
                  <CheckCircle2 aria-label={stage.status} />
                </div>
              ))}
            </div>
          </div>
          <div className={styles.consoleFooter}>
            <span>Completed deterministically</span>
            <strong>5 / 5 stages</strong>
          </div>
        </div>
      </section>

      <section className={styles.metrics} aria-label="Fictional demo dataset summary">
        {[
          ['Artists', summary.counts.artists, 'canonical records'],
          ['Events', summary.counts.events, 'linked programs'],
          ['Venues', summary.counts.venues, 'normalized places'],
          ['Genres', summary.counts.genres, 'controlled labels'],
          ['Countries', summary.counts.countries, 'source coverage'],
        ].map(([label, value, note]) => (
          <div key={label}>
            <p>{label}</p>
            <strong>{value}</strong>
            <small>{note}</small>
          </div>
        ))}
      </section>

      <section className={styles.section} id="pipeline">
        <div className={styles.sectionHeading}>
          <p className={styles.kicker}>Pipeline evidence</p>
          <h2>Each stage leaves a record you can inspect.</h2>
          <p>The demo mirrors the real data path without calling a live source, mutating a database, or requiring credentials.</p>
        </div>
        <div className={styles.evidenceGrid}>
          <div className={styles.eventPanel}>
            <div className={styles.panelHeading}>
              <div><span>Normalized events</span><strong>Latest fixture batch</strong></div>
              <span className={styles.livePill}>Local data</span>
            </div>
            <div className={styles.tableHeader}><span>Event</span><span>Venue</span><span>Artists</span><span>Status</span></div>
            {events.map((event) => (
              <div className={styles.eventRow} key={event.id}>
                <span><strong>{event.title}</strong><small>{event.categories}</small></span>
                <span>{event.venue_name}</span>
                <span>{event.artists.length}</span>
                <span className={styles.linked}>Linked</span>
              </div>
            ))}
          </div>

          <aside className={styles.qualityPanel}>
            <div className={styles.panelHeading}>
              <div><span>Quality gates</span><strong>Coverage report</strong></div>
              <ShieldCheck aria-hidden="true" />
            </div>
            {[
              ['Required fields', 1],
              ['Artist-event links', 1],
              ['Venue normalization', 1],
              ['Enrichment coverage', 1],
            ].map(([label, score]) => (
              <div className={styles.qualityRow} key={label}>
                <div><span>{label}</span><strong>{percent(Number(score))}</strong></div>
                <div className={styles.qualityTrack}><span style={{ width: percent(Number(score)) }} /></div>
              </div>
            ))}
            <p className={styles.qualityNote}><Sparkles aria-hidden="true" /> All metrics describe the bundled fictional fixtures—not a claim about live source coverage.</p>
          </aside>
        </div>
      </section>

      <section className={styles.section} id="data-model">
        <div className={styles.sectionHeading}>
          <p className={styles.kicker}>Relationship intelligence</p>
          <h2>Not another flat lineup spreadsheet.</h2>
          <p>Artists, appearances, events, venues, genres, and evidence stay connected so every output can be traced back to its context.</p>
        </div>

        <div className={styles.modelGrid}>
          <div className={styles.graphPanel}>
            <div className={styles.nodeArtist}><Music2 aria-hidden="true" /><span>Artist</span><strong>Amora K</strong></div>
            <span className={`${styles.connector} ${styles.connectorOne}`} aria-hidden="true" />
            <div className={styles.nodeEvent}><GitBranch aria-hidden="true" /><span>Appearance</span><strong>Warehouse Pulse</strong></div>
            <span className={`${styles.connector} ${styles.connectorTwo}`} aria-hidden="true" />
            <div className={styles.nodeVenue}><Database aria-hidden="true" /><span>Venue</span><strong>NDSM Warehouse</strong></div>
            <div className={styles.graphLegend}><span><i /> Entity</span><span><i /> Relationship</span></div>
          </div>

          <div className={styles.artistStack}>
            {artists.map((artist) => (
              <article className={styles.artistCard} key={artist.id}>
                <div className={styles.artistMonogram}>{artist.title.split(' ').map((part) => part[0]).join('')}</div>
                <div className={styles.artistIdentity}>
                  <span>{artist.country_label}</span>
                  <strong>{artist.title}</strong>
                  <small>{artist.primary_genres.replaceAll('|', ' · ')}</small>
                </div>
                <dl>
                  <div><dt>Energy</dt><dd>{percent(artist.energy_mean)}</dd></div>
                  <div><dt>BPM</dt><dd>{artist.tempo_bpm_mean}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <p className={styles.kicker}>System design</p>
          <h2>One pipeline, multiple useful surfaces.</h2>
        </div>
        <div className={styles.architectureGrid}>
          {architecture.map(([index, title, description]) => (
            <article key={index}>
              <span>{index}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.boundary}>
        <div>
          <p className={styles.kicker}>Built for credible demos</p>
          <h2>Safe by default. Honest about what is live.</h2>
        </div>
        <ul>
          <li><CheckCircle2 aria-hidden="true" /> The homepage uses deterministic fictional records.</li>
          <li><CheckCircle2 aria-hidden="true" /> No credentials are embedded or required.</li>
          <li><CheckCircle2 aria-hidden="true" /> Optional provider integrations stay server-side.</li>
          <li><CheckCircle2 aria-hidden="true" /> The original ADE workflow remains documented as the featured source adapter.</li>
        </ul>
      </section>

      <footer className={styles.footer}>
        <div className={styles.brand}>
          <span className={styles.brandMark}><Music2 aria-hidden="true" /></span>
          <span><strong>Festival Lineup</strong><small>Data Platform</small></span>
        </div>
        <p>Independent portfolio project. Not affiliated with Amsterdam Dance Event or Spotify.</p>
        <a href="https://github.com/1aday/festival-lineup-data-platform" target="_blank" rel="noreferrer">View source <ArrowUpRight aria-hidden="true" /></a>
      </footer>
    </main>
  );
}
