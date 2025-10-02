import { useEffect, useMemo, useState } from 'react';

/**
 * US Expansion Salary Quote — publishable single-file build
 * - Dark blue theme, white text
 * - Industry filter (text search removed as requested)
 * - More sales roles (AE tiers, BDM, etc.)
 * - Stripe Payment Link handoff + hash-based Thank You page (/#/thank-you)
 * - Safer OTE rendering and role sync with industry filter
 */

// ===== data (inline for now) =====
const LOCATIONS = [
  { name: 'San Francisco, CA', mul: 1.15 },
  { name: 'New York, NY', mul: 1.1 },
  { name: 'Seattle, WA', mul: 1.05 },
  { name: 'Boston, MA', mul: 1.03 },
  { name: 'Los Angeles, CA', mul: 1.03 },
  { name: 'Chicago, IL', mul: 1.0 },
  { name: 'Austin, TX', mul: 0.98 },
  { name: 'Denver, CO', mul: 0.97 },
  { name: 'Atlanta, GA', mul: 0.96 },
  { name: 'Miami, FL', mul: 0.95 },
  { name: 'Dallas, TX', mul: 0.98 },
  { name: 'Phoenix, AZ', mul: 0.95 },
  { name: 'Remote (US)', mul: 1.0 },
] as const;

type Level = 'junior' | 'mid' | 'senior';

type RoleBand = {
  base: {
    junior: [number, number];
    mid: [number, number];
    senior: [number, number];
  };
  otePct: number; // 1 = 100% of base, 0.2 = 20%
  industries: string[]; // tags for industry filter
};

const ROLES: Record<string, RoleBand> = {
  // Engineering / Product
  'AI Engineer': {
    base: {
      junior: [140000, 180000],
      mid: [180000, 230000],
      senior: [230000, 300000],
    },
    otePct: 0,
    industries: ['SaaS', 'AI', 'DeepTech', 'Fintech'],
  },
  'Software Engineer': {
    base: {
      junior: [120000, 160000],
      mid: [160000, 210000],
      senior: [210000, 270000],
    },
    otePct: 0,
    industries: ['SaaS', 'AI', 'Healthtech', 'Fintech', 'Ecommerce'],
  },
  'Product Manager': {
    base: {
      junior: [120000, 150000],
      mid: [150000, 190000],
      senior: [190000, 240000],
    },
    otePct: 0.1,
    industries: ['SaaS', 'AI', 'Fintech', 'Healthtech'],
  },

  // Sales ladder — expanded
  'Head of Sales (SaaS)': {
    base: {
      junior: [110000, 140000],
      mid: [140000, 180000],
      senior: [180000, 230000],
    },
    otePct: 1.0,
    industries: ['SaaS', 'AI', 'Fintech', 'Healthtech'],
  },
  'Account Executive (SMB)': {
    base: {
      junior: [65000, 85000],
      mid: [85000, 100000],
      senior: [100000, 120000],
    },
    otePct: 1.0,
    industries: ['SaaS', 'Fintech', 'Ecommerce'],
  },
  'Account Executive (Mid-Market)': {
    base: {
      junior: [80000, 100000],
      mid: [100000, 125000],
      senior: [125000, 150000],
    },
    otePct: 1.0,
    industries: ['SaaS', 'AI', 'Fintech', 'Healthtech'],
  },
  'Account Executive (Enterprise)': {
    base: {
      junior: [110000, 130000],
      mid: [130000, 160000],
      senior: [160000, 190000],
    },
    otePct: 1.0,
    industries: ['SaaS', 'AI', 'Fintech', 'Healthtech'],
  },
  'Business Development Manager': {
    base: {
      junior: [70000, 90000],
      mid: [90000, 115000],
      senior: [115000, 135000],
    },
    otePct: 0.8,
    industries: ['SaaS', 'Fintech', 'AI', 'Ecommerce'],
  },
  'Sales Engineer': {
    base: {
      junior: [100000, 125000],
      mid: [125000, 155000],
      senior: [155000, 190000],
    },
    otePct: 0.3,
    industries: ['SaaS', 'AI', 'DeepTech', 'Fintech'],
  },
  SDR: {
    base: {
      junior: [50000, 65000],
      mid: [65000, 80000],
      senior: [80000, 95000],
    },
    otePct: 0.8,
    industries: ['SaaS', 'Fintech', 'AI', 'Ecommerce'],
  },
  CSM: {
    base: {
      junior: [80000, 100000],
      mid: [100000, 130000],
      senior: [130000, 160000],
    },
    otePct: 0.2,
    industries: ['SaaS', 'Fintech', 'Healthtech'],
  },

  // G&A / General
  'Head of Marketing': {
    base: {
      junior: [130000, 160000],
      mid: [160000, 200000],
      senior: [200000, 260000],
    },
    otePct: 0.2,
    industries: ['SaaS', 'Fintech', 'Ecommerce', 'AI'],
  },
  'People / HR Lead': {
    base: {
      junior: [90000, 120000],
      mid: [120000, 155000],
      senior: [155000, 200000],
    },
    otePct: 0.1,
    industries: ['SaaS', 'Fintech', 'Healthtech'],
  },
  'Finance Controller': {
    base: {
      junior: [110000, 140000],
      mid: [140000, 175000],
      senior: [175000, 220000],
    },
    otePct: 0.1,
    industries: ['SaaS', 'Fintech', 'Ecommerce'],
  },
  'General Manager / First US Hire': {
    base: {
      junior: [120000, 150000],
      mid: [150000, 190000],
      senior: [190000, 240000],
    },
    otePct: 0.2,
    industries: ['SaaS', 'Fintech', 'Healthtech', 'AI', 'Ecommerce'],
  },
};

const INDUSTRIES = [
  'SaaS',
  'AI',
  'Fintech',
  'Healthtech',
  'DeepTech',
  'Ecommerce',
] as const;

type Location = (typeof LOCATIONS)[number];

// ===== utils =====
function formatMoney(n: number, currency: 'USD' | 'GBP') {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });
}
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function useQuerySync(state: {
  role: string;
  level: Level;
  loc: Location;
  currency: 'USD' | 'GBP';
  industry: string | '';
}) {
  useEffect(() => {
    const params = new URLSearchParams({
      role: state.role,
      level: state.level,
      loc: state.loc.name,
      cur: state.currency,
    });
    if (state.industry) params.set('ind', state.industry);
    const url = `${location.pathname}?${params.toString()}${location.hash}`;
    history.replaceState(null, '', url);
  }, [state.role, state.level, state.loc.name, state.currency, state.industry]);
}

function initFromQuery() {
  const p = new URLSearchParams(location.search);
  const role = p.get('role') || 'AI Engineer';
  const level = (p.get('level') as Level) || 'senior';
  const cur = (p.get('cur') as 'USD' | 'GBP') || 'USD';
  const ind = p.get('ind') || '';
  const locName = p.get('loc');
  const loc = LOCATIONS.find((x) => x.name === locName) || LOCATIONS[0];
  return { role, level, currency: cur, loc, industry: ind };
}

// ===== tiny router (hash-based) =====
function useRoute(): 'home' | 'thankyou' {
  const [route, setRoute] = useState(
    location.hash === '#/thank-you' ? 'thankyou' : 'home'
  );
  useEffect(() => {
    const onHash = () =>
      setRoute(location.hash === '#/thank-you' ? 'thankyou' : 'home');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return route;
}

// ===== app =====
export default function App() {
  const boot = initFromQuery();
  const [industry, setIndustry] = useState<string | ''>(boot.industry);
  const [role, setRole] = useState<string>(boot.role);
  const [level, setLevel] = useState<Level>(boot.level);
  const [loc, setLoc] = useState<Location>(boot.loc);
  const [equity, setEquity] = useState(0.25);
  const [currency, setCurrency] = useState<'USD' | 'GBP'>(boot.currency);
  const [showSample, setShowSample] = useState(false);

  const route = useRoute();
  const FX = 0.78; // rough USD -> GBP display only

  // Build role options based on industry, ensure current role is valid
  const roleOptions = useMemo(() => {
    const keys = Object.keys(ROLES);
    if (!industry) return keys;
    return keys.filter((k) => ROLES[k].industries.includes(industry as any));
  }, [industry]);

  useEffect(() => {
    if (!roleOptions.includes(role)) {
      setRole(roleOptions[0] || Object.keys(ROLES)[0]);
    }
  }, [industry, roleOptions]);

  useEffect(() => {
    const params = new URLSearchParams({
      role,
      level,
      loc: loc.name,
      cur: currency,
    });
    if (industry) params.set('ind', industry);
    const url = `${location.pathname}?${params.toString()}${location.hash}`;
    history.replaceState(null, '', url);
  }, [role, level, loc.name, currency, industry]);

  const quote = useMemo(() => {
    const band = ROLES[role];
    const [lo, hi] = band.base[level];
    const baseLoUSD = Math.round(lo * loc.mul);
    const baseHiUSD = Math.round(hi * loc.mul);
    const oteLoUSD = Math.round(baseLoUSD * (band.otePct || 0));
    const oteHiUSD = Math.round(baseHiUSD * (band.otePct || 0));
    const tcLoUSD = baseLoUSD + oteLoUSD;
    const tcHiUSD = baseHiUSD + oteHiUSD;
    const conv = (n: number) => (currency === 'USD' ? n : Math.round(n * FX));
    return {
      baseLo: conv(baseLoUSD),
      baseHi: conv(baseHiUSD),
      oteLo: conv(oteLoUSD),
      oteHi: conv(oteHiUSD),
      tcLo: conv(tcLoUSD),
      tcHi: conv(tcHiUSD),
      otePct: band.otePct,
    };
  }, [role, level, loc, currency]);

  // Replace with your real Stripe Payment Link. In Stripe set Success URL → https://YOUR-DOMAIN/#/thank-you
  const STRIPE_CHECKOUT = 'https://buy.stripe.com/test_XXXXXXplaceholder';

  if (route === 'thankyou') return <ThankYou />;

  return (
    <div className="min-h-screen bg-[#0a1440] text-white">
      {/* Hero */}
      <header className="bg-gradient-to-r from-[#0a1440] to-[#0c1a52] border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-10">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            US Expansion Salary Quote
          </h1>
          <p className="mt-2 max-w-2xl text-white/80">
            Price key US hires with confidence. Choose role, seniority, and city
            to get a directional compensation range.
          </p>
        </div>
      </header>

      {/* Controls + Results */}
      <main className="max-w-6xl mx-auto px-6 md:px-10 py-10 grid lg:grid-cols-3 gap-8">
        {/* Controls */}
        <section className="lg:col-span-1 space-y-6 bg-white/5 rounded-2xl p-6 md:p-8 shadow">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Currency">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="bg-white/10 rounded px-2 py-2 text-sm"
              >
                <option>USD</option>
                <option>GBP</option>
              </select>
            </Field>
            <Field label="Industry">
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="bg-white/10 rounded px-2 py-2 text-sm"
              >
                <option value="">All</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Role">
            <select
              className="w-full bg-white/10 rounded p-3"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {roleOptions.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>

          <Field label="Seniority">
            <div className="grid grid-cols-3 gap-3">
              {(['junior', 'mid', 'senior'] as Level[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`px-3 py-2 rounded border border-white/10 ${
                    level === l
                      ? 'bg-white text-[#0a1440]'
                      : 'bg-white/10 hover:bg-white/15'
                  }`}
                >
                  {cap(l)}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Location">
            <select
              className="w-full bg-white/10 rounded p-3"
              value={loc.name}
              onChange={(e) =>
                setLoc(
                  LOCATIONS.find((x) => x.name === e.target.value) ||
                    LOCATIONS[0]
                )
              }
            >
              {LOCATIONS.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Target Equity (optional)">
            <div className="flex items-center gap-3">
              <input
                type="number"
                step={0.05}
                min={0}
                className="w-28 bg-white/10 rounded p-2"
                value={equity}
                onChange={(e) => setEquity(parseFloat(e.target.value || '0'))}
              />
              <span className="text-white/80">% ownership</span>
            </div>
          </Field>
        </section>

        {/* Quote + CTAs */}
        <section className="lg:col-span-2 space-y-8">
          <div className="bg-white/5 rounded-2xl p-6 md:p-8 shadow">
            <h2 className="text-xl font-semibold mb-4">
              Compensation estimate
            </h2>
            <div className="grid md:grid-cols-4 gap-4 text-sm">
              <Stat
                label="Base low"
                value={formatMoney(quote.baseLo, currency)}
              />
              <Stat
                label="Base high"
                value={formatMoney(quote.baseHi, currency)}
              />
              <Stat
                label="OTE range"
                value={
                  quote.otePct > 0
                    ? `${formatMoney(quote.oteLo, currency)} to ${formatMoney(
                        quote.oteHi,
                        currency
                      )}`
                    : 'N/A'
                }
              />
              <Stat
                label="Total comp"
                value={`${formatMoney(quote.tcLo, currency)} to ${formatMoney(
                  quote.tcHi,
                  currency
                )}`}
              />
            </div>
            <p className="text-xs text-white/70 mt-4">
              Directional only. Not legal, tax, or financial advice.
            </p>
          </div>

          <div className="bg-white/5 rounded-2xl p-6 md:p-8 shadow flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold">Get the full report</h3>
              <p className="text-sm text-white/85 mt-1">
                Bonus plans, equity bands, quotas, and offer language. Includes
                a 10-minute consult add-on.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSample(true)}
                className="px-4 py-2 rounded border border-white/20"
              >
                See sample
              </button>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  window.location.href = STRIPE_CHECKOUT;
                }}
              >
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-white text-[#0a1440] font-semibold"
                >
                  Buy full report
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      {/* Sample modal */}
      {showSample && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setShowSample(false)}
        >
          <div
            className="bg-white/5 rounded-2xl p-6 md:p-8 max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-lg font-semibold">Sample report</h4>
            <p className="text-sm text-white/85 mt-2">
              Preview only. Your paid report includes city deltas, quotas,
              commission mechanics, equity bands, and an offer checklist.
            </p>
            <ul className="list-disc list-inside mt-3 text-sm space-y-1">
              <li>
                Role: {role} ({cap(level)})
              </li>
              <li>Industry: {industry || 'All'}</li>
              <li>Location: {loc.name}</li>
              <li>
                Range preview: {formatMoney(quote.tcLo, currency)} to{' '}
                {formatMoney(quote.tcHi, currency)}
              </li>
            </ul>
            <div className="mt-5 flex justify-end gap-3">
              <button
                className="px-3 py-2 rounded border border-white/20"
                onClick={() => setShowSample(false)}
              >
                Close
              </button>
              <button
                className="px-3 py-2 rounded bg-white text-[#0a1440] font-semibold"
                onClick={() => setShowSample(false)}
              >
                Looks good
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="text-center text-xs text-white/70 py-8">
        © {new Date().getFullYear()} Salary Quote by Guy
      </footer>
    </div>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return (
    <label className="block">
      <div className="mb-1 text-sm text-white/80">{label}</div>
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded bg-white/10">
      <div className="text-xs text-white/70">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function ThankYou() {
  return (
    <div className="min-h-screen bg-[#0a1440] text-white grid place-items-center px-6">
      <div className="max-w-xl w-full bg-white/5 rounded-2xl p-8 text-center shadow">
        <h1 className="text-2xl font-semibold">Thanks for your purchase</h1>
        <p className="mt-2 text-white/85">
          Check your email for the receipt and report link. If it doesn’t
          arrive, reply to the email receipt and we’ll resend.
        </p>
        <a
          href="#/"
          className="inline-block mt-6 px-4 py-2 rounded bg-white text-[#0a1440] font-semibold"
        >
          Back to calculator
        </a>
      </div>
    </div>
  );
}
