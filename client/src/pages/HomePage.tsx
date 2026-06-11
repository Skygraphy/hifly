import { Link } from 'react-router-dom';
import { useQuery, useQueries } from '@tanstack/react-query';
import { UserMenu } from '../components/layout/UserMenu';
import { fetchSettings } from '../api/settings';
import { fetchRegionTree, type RegionNode } from '../api/regions';
import { fetchImages, fetchImage } from '../api/images';

const PILLS = [
  { sym: '◎', label: 'Regionen durchsuchen' },
  { sym: '◈', label: 'Hohe Bildqualität' },
  { sym: '▣', label: 'Kostenlos stöbern' },
  { sym: '⟡', label: 'Download nach Anmeldung' },
  { sym: '⬡', label: 'Österreichweit' },
];

const FEATURES = [
  {
    sym: '◎',
    title: 'Regionale Suche',
    body: 'Filtere nach Bundesland, Bezirk oder Ort. Von Niederösterreich bis Klosterneuburg — finde Aufnahmen genau dort, wo du sie brauchst.',
  },
  {
    sym: '◈',
    title: 'Vier Qualitätsstufen',
    body: 'Jedes Bild steht als Thumbnail, Klein, Mittel und Großformat bereit. Für jeden Verwendungszweck die richtige Auflösung.',
  },
  {
    sym: '⬡',
    title: 'Einfach registrieren',
    body: 'Das Stöbern ist kostenlos und ohne Login möglich. Für den Download genügt eine kurze Registrierung — schnell und unkompliziert.',
  },
];

function findRegionById(nodes: RegionNode[], id: string): RegionNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findRegionById(n.children, id);
    if (found) return found;
  }
  return null;
}

export function HomePage() {
  // Load settings (public after migration 010)
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
    staleTime: 60000,
  });

  const defaultRegionId = (settings?.find((s) => s.key === 'default_region_id')?.value as string) || null;
  const hasDefaultRegion = !!defaultRegionId && defaultRegionId !== 'null';

  const heroImageIds = (settings?.find((s) => s.key === 'hero_image_ids')?.value as string[]) ?? [];
  const hasHeroImages = Array.isArray(heroImageIds) && heroImageIds.length > 0;

  // Load region tree to look up region name
  const { data: regionTree = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: fetchRegionTree,
    staleTime: 300000,
  });

  const defaultRegionName = hasDefaultRegion
    ? findRegionById(regionTree, defaultRegionId!)?.name ?? null
    : null;

  // Load 3 sample images from the default region (fallback when no hero images configured)
  const { data: sampleGallery } = useQuery({
    queryKey: ['hero-samples', defaultRegionId],
    queryFn: () => fetchImages({ regionId: defaultRegionId!, status: 'ready', page: 1, limit: 3 }),
    enabled: hasDefaultRegion && !hasHeroImages,
    staleTime: 120000,
  });
  const sampleImages = sampleGallery?.data ?? [];

  // Load specific hero images from settings
  const heroImageQueries = useQueries({
    queries: heroImageIds.map((id) => ({
      queryKey: ['hero-image', id],
      queryFn: () => fetchImage(id),
      staleTime: 120000,
      enabled: hasHeroImages,
    })),
  });
  const heroImagesLoaded = heroImageQueries.map((q) => q.data ?? null);

  // Images shown in hero: either specific pinned images or fallback from default region
  const displayImages: Array<{ id: string; thumbUrl: string | null; main_location: string } | null> = hasHeroImages
    ? heroImagesLoaded
    : Array.from({ length: 3 }, (_, i) => sampleImages[i] ?? null);

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ background: '#0d0d18', color: '#e2e8f0', fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Static background ─────────────────────── */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,142,83,.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,142,83,.03) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }}
        />
        <div
          className="absolute -top-48 -right-24 w-[800px] h-[800px] rounded-full"
          style={{
            background: 'radial-gradient(circle at 55% 45%, rgba(255,107,107,.13) 0%, transparent 60%)',
            animation: 'drift1 18s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, rgba(255,142,83,.05) 0%, transparent 55%)',
            animation: 'drift2 22s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,173,59,.1) 0%, transparent 60%)',
            animation: 'drift3 16s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '180px',
          }}
        />
      </div>

      <style>{`
        @keyframes drift1 { from { transform: translate(0, 0) scale(1); } to { transform: translate(-40px, 30px) scale(1.05); } }
        @keyframes drift2 { from { transform: translate(-50%, -50%) scale(1); } to { transform: translate(-50%, -52%) scale(1.03); } }
        @keyframes drift3 { from { transform: translate(0, 0); } to { transform: translate(30px, -20px); } }
        @keyframes shimmer { from { transform: translateX(-100%); } to { transform: translateX(200%); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse-ring { 0%, 100% { box-shadow: 0 0 0 0 rgba(255,142,83,0.3); } 50% { box-shadow: 0 0 0 8px rgba(255,142,83,0); } }
        .fade-up-1 { animation: fadeUp 0.7s ease forwards; animation-delay: 0.1s; opacity: 0; }
        .fade-up-2 { animation: fadeUp 0.7s ease forwards; animation-delay: 0.25s; opacity: 0; }
        .fade-up-3 { animation: fadeUp 0.7s ease forwards; animation-delay: 0.4s; opacity: 0; }
        .fade-up-4 { animation: fadeUp 0.7s ease forwards; animation-delay: 0.55s; opacity: 0; }
        .fade-up-5 { animation: fadeUp 0.7s ease forwards; animation-delay: 0.7s; opacity: 0; }
        .fade-up-6 { animation: fadeUp 0.7s ease forwards; animation-delay: 0.85s; opacity: 0; }
        .shimmer-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%);
          transform: translateX(-100%);
        }
        .shimmer-btn:hover::after { animation: shimmer 0.8s ease-in-out; }
      `}</style>

      {/* ── Navbar ───────────────────────────────── */}
      <header className="relative z-20 flex items-center justify-between px-8 py-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #FF6B6B, #FF8E53, #FFAD3B)', color: '#0d0d18' }}
          >
            H
          </div>
          <span className="text-lg font-bold tracking-tight" style={{ color: '#e2e8f0' }}>HiFly</span>
        </div>
        <UserMenu />
      </header>

      {/* ── Hero ─────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-16 pb-28">

        {/* Eyebrow pill */}
        <div
          className="fade-up-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-medium tracking-widest uppercase"
          style={{
            border: '1px solid rgba(255,142,83,0.2)',
            background: 'rgba(255,142,83,0.05)',
            color: 'rgba(255,173,59,0.7)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#FF8E53', animation: 'pulse-ring 2s ease infinite' }}
          />
          Entdecken · Stöbern · Herunterladen
        </div>

        {/* Headline — dynamic with default region */}
        <h1
          className="fade-up-2 font-black leading-none tracking-tight mb-6"
          style={{ fontSize: 'clamp(3rem, 9vw, 7rem)' }}
        >
          <span style={{ color: 'rgba(226,232,240,0.85)' }}>Luftbilder.</span>
          <br />
          <span className="signal-text">
            {defaultRegionName ? `${defaultRegionName}.` : 'Entdecke deine Region.'}
          </span>
        </h1>

        {/* Subtext — dynamic with default region */}
        <p
          className="fade-up-3 leading-relaxed mb-10 max-w-lg"
          style={{ color: 'rgba(226,232,240,0.35)', fontSize: '1.1rem' }}
        >
          {defaultRegionName ? (
            <>
              Entdecke Luftaufnahmen aus <strong style={{ color: 'rgba(226,232,240,0.55)' }}>{defaultRegionName}</strong> und der Region.
              <br />
              Finde dein Motiv — und lade es in bester Qualität herunter.
            </>
          ) : (
            <>
              Stöbere in tausenden Luftaufnahmen österreichischer Regionen.
              <br />
              Finde dein Motiv — und lade es in bester Qualität herunter.
            </>
          )}
        </p>

        {/* CTA */}
        <div className="fade-up-4">
          <Link
            to="/gallery"
            className="shimmer-btn relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-base overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 55%, #FFAD3B 100%)',
              color: '#0d0d18',
              boxShadow: '0 0 40px rgba(255,142,83,0.25)',
            }}
          >
            <span>Bildarchiv entdecken</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

        {/* Sample images — either pinned hero images or fallback from default region */}
        <div className="fade-up-5 flex gap-3 mt-10 justify-center flex-wrap">
          {displayImages.map((img, i) => {
            if (img?.thumbUrl) {
              return (
                <Link
                  key={img.id}
                  to="/gallery"
                  className="group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-105"
                  style={{ width: '128px', height: '128px' }}
                >
                  <img
                    src={img.thumbUrl}
                    alt={img.main_location}
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-opacity duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2">
                    <p className="text-white text-[9px] font-medium leading-tight truncate w-full">{img.main_location}</p>
                  </div>
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{ border: '1px solid rgba(255,142,83,0.15)' }}
                  />
                </Link>
              );
            }
            return (
              <div
                key={i}
                className="rounded-2xl"
                style={{
                  width: '128px',
                  height: '128px',
                  background: 'linear-gradient(135deg, rgba(255,107,107,0.06), rgba(255,173,59,0.06))',
                  border: '1px solid rgba(255,142,83,0.08)',
                }}
              />
            );
          })}
        </div>

        {/* Pills */}
        <div className="fade-up-6 flex flex-wrap justify-center gap-2.5 mt-8">
          {PILLS.map((p, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: 'rgba(255,142,83,0.04)',
                border: '1px solid rgba(255,142,83,0.12)',
                color: 'rgba(255,210,170,0.5)',
              }}
            >
              <span style={{ color: 'rgba(255,142,83,0.5)' }}>{p.sym}</span>
              {p.label}
            </span>
          ))}
        </div>

        {/* Scroll indicator */}
        <div className="mt-16 flex flex-col items-center gap-2 opacity-20">
          <div
            className="w-px h-12"
            style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,142,83,0.6), transparent)' }}
          />
        </div>
      </section>

      {/* ── Divider ──────────────────────────────── */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 mb-20">
        <div
          className="h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,142,83,0.15), transparent)' }}
        />
      </div>

      {/* ── Features ─────────────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-32">
        <p
          className="text-center text-xs font-semibold tracking-widest uppercase mb-10"
          style={{ color: 'rgba(255,142,83,0.4)' }}
        >
          Was dich erwartet
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="group relative rounded-2xl p-7 overflow-hidden transition-all duration-400"
              style={{
                background: 'rgba(255,255,255,0.018)',
                border: '1px solid rgba(255,255,255,0.04)',
                backdropFilter: 'blur(12px)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,142,83,0.15)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.04)';
              }}
            >
              <div
                className="absolute top-0 left-4 right-4 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,142,83,0.6), transparent)' }}
              />
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 30% 0%, rgba(255,142,83,0.06), transparent 65%)' }}
              />
              <div className="relative">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-5 transition-all duration-300 group-hover:scale-110"
                  style={{
                    background: 'rgba(255,142,83,0.07)',
                    color: '#FF8E53',
                    border: '1px solid rgba(255,142,83,0.12)',
                  }}
                >
                  {f.sym}
                </div>
                <h3 className="font-semibold mb-2.5" style={{ color: 'rgba(226,232,240,0.85)', fontSize: '0.95rem' }}>
                  {f.title}
                </h3>
                <p className="leading-relaxed" style={{ color: 'rgba(226,232,240,0.32)', fontSize: '0.85rem' }}>
                  {f.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────── */}
      <footer className="relative z-10 text-center pb-12">
        <div className="inline-flex items-center gap-3 text-xs" style={{ color: 'rgba(226,232,240,0.15)' }}>
          <span>© {new Date().getFullYear()} HiFly</span>
          <span>·</span>
          <span className="font-mono" style={{ color: 'rgba(255,142,83,0.2)' }}>v1.0</span>
        </div>
      </footer>
    </div>
  );
}
