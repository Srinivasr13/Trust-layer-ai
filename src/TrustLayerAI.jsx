import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import {
  ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, XCircle, HelpCircle, Play, RotateCcw,
  Keyboard, FileText, BookOpen, Wand2, ExternalLink, Copy, Check, ChevronUp, ChevronDown, Cpu,
  MessageSquare, Activity, Search, ScanLine, X, Info, Layers, Sparkles,
} from 'lucide-react';

/* =====================================================================================
   TrustLayer AI — client-side verification & hallucination-detection engine
   Single self-contained component: heuristic claim parser + curated reference index.
   ===================================================================================== */

const CURRENT_YEAR = new Date().getFullYear();

const STATUS = {
  verified: {
    label: 'Verified', long: 'Verified', color: '#10B981',
    text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', Icon: CheckCircle2,
  },
  unsupported: {
    label: 'Unsupported', long: 'Unsupported / Hallucination', color: '#F43F5E',
    text: 'text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/30', Icon: XCircle,
  },
  uncertain: {
    label: 'Uncertain', long: 'Uncertain / Needs Context', color: '#F59E0B',
    text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30', Icon: HelpCircle,
  },
};

const MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o (OpenAI)' },
  { value: 'claude', label: 'Claude (Anthropic)' },
  { value: 'gemini', label: 'Gemini (Google)' },
  { value: 'llama', label: 'Llama (Meta)' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'unknown', label: 'Unknown / Other' },
];

const VIEWS = [
  { id: 'canvas', label: 'Audit Canvas', short: 'Canvas', Icon: ScanLine },
  { id: 'evidence', label: 'Evidence Log', short: 'Evidence', Icon: BookOpen },
  { id: 'rewrite', label: 'Calibrated Rewrite', short: 'Rewrite', Icon: Wand2 },
];

const STAGES = ['Claim Extraction', 'Cross-Reference Search', 'Hallucination Detection', 'Uncertainty Scoring'];

/* ----------------------------------- Reference index ----------------------------------- */

const src = (title, domain, url, credibility, year, snippet) => ({ title, domain, url, credibility, year, snippet });

const S = {
  nccihTurmeric: src('Turmeric — Usefulness and Safety', 'nccih.nih.gov', 'https://www.nccih.nih.gov/health/turmeric', 96, 2020,
    'NIH fact sheet: curcumin is the main studied component of turmeric; evidence for most health uses is limited, and liver injury has been reported with some supplements.'),
  hewlings: src('Curcumin: A Review of Its Effects on Human Health (Hewlings & Kalman)', 'mdpi.com', 'https://www.mdpi.com/2304-8158/6/10/92', 88, 2017,
    'Peer-reviewed review describing curcumin as a polyphenol with poor bioavailability, typically improved by co-administration with piperine.'),
  shoba: src('Influence of Piperine on the Pharmacokinetics of Curcumin (Shoba et al.)', 'thieme-connect.com', 'https://www.thieme-connect.com/products/ejournals/abstract/10.1055/s-2006-957450', 90, 1998,
    'Human and animal study showing piperine substantially increased curcumin serum concentrations.'),
  adaStandards: src('Standards of Care in Diabetes — Pharmacologic Approaches', 'diabetesjournals.org', 'https://diabetesjournals.org/care', 97, 2024,
    'Clinical guidance positions metformin and other approved agents as evidence-based therapy; supplements are not recommended as replacements.'),
  fdaSupplements: src('Dietary Supplements — FDA Overview', 'fda.gov', 'https://www.fda.gov/food/dietary-supplements', 97, 2024,
    'FDA does not approve dietary supplements for safety or effectiveness before they are marketed, and they may not claim to treat disease.'),
  bitcoin: src('Bitcoin: A Peer-to-Peer Electronic Cash System', 'bitcoin.org', 'https://bitcoin.org/bitcoin.pdf', 95, 2008,
    'Original whitepaper authored under the name Satoshi Nakamoto, released in 2008.'),
  damodaran: src('Historical Returns on Stocks, Bonds and Bills (Damodaran, NYU Stern)', 'pages.stern.nyu.edu', 'https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html', 92, 2024,
    'Long-run arithmetic average annual return of the S&P 500 (incl. dividends) is roughly 10% in nominal terms.'),
  teslaIR: src('Tesla Investor Relations — Annual Report (10-K) 2023', 'ir.tesla.com', 'https://ir.tesla.com', 95, 2024,
    'FY2023 revenue of roughly $97B with net income of roughly $15B (boosted by a one-time tax benefit) — a margin near 15%, not 42.8%.'),
  appleWiki: src('Apple Inc. — Corporate history', 'en.wikipedia.org', 'https://en.wikipedia.org/wiki/Apple_Inc.', 78, 2024,
    'In August 2018 Apple became the first publicly traded U.S. company to be valued at over $1 trillion.'),
  investorIndex: src('Index Funds — Investor.gov Glossary', 'investor.gov', 'https://www.investor.gov/introduction-investing/investing-basics/glossary/index-funds', 96, 2023,
    'SEC investor education: passively managed index funds tend to have lower expenses than actively managed funds.'),
  spiva: src('SPIVA Scorecards', 'spglobal.com', 'https://www.spglobal.com/spdji/en/research-insights/spiva/', 90, 2024,
    'Long-running scorecards showing most active funds underperform their benchmark index after fees.'),
  sec13f: src('EDGAR Full-Text Search — Form 13F Filings', 'sec.gov', 'https://www.sec.gov/edgar/search/', 97, 2024,
    'Institutional holdings are disclosed quarterly in 13F filings; no disclosed position of this size supports the claim.'),
  investorRates: src('Interest Rate Risk — Investor.gov', 'investor.gov', 'https://www.investor.gov/introduction-investing/investing-basics/glossary/interest-rate-risk', 96, 2023,
    'When interest rates rise, the market prices of existing fixed-rate bonds generally fall, and vice versa.'),
  jinek: src('A Programmable Dual-RNA–Guided DNA Endonuclease (Jinek et al.)', 'science.org', 'https://www.science.org/doi/10.1126/science.1225829', 98, 2012,
    'Landmark Science paper demonstrating Cas9 could be programmed with guide RNA to cut specific DNA sequences.'),
  nobel2020: src('The Nobel Prize in Chemistry 2020 — Press Release', 'nobelprize.org', 'https://www.nobelprize.org/prizes/chemistry/2020/press-release/', 99, 2020,
    'Awarded jointly to Emmanuelle Charpentier and Jennifer A. Doudna for the development of a method for genome editing.'),
  komor: src('Programmable Editing of a Target Base Without Double-Stranded DNA Cleavage (Komor et al.)', 'nature.com', 'https://www.nature.com/articles/nature17946', 96, 2016,
    'Introduces base editing, which changes single bases without double-strand breaks and can reduce unwanted editing outcomes.'),
  fdaCasgevy: src('FDA Approves First Gene Therapies to Treat Patients with Sickle Cell Disease', 'fda.gov', 'https://www.fda.gov/news-events/press-announcements/fda-approves-first-gene-therapies-treat-patients-sickle-cell-disease', 99, 2023,
    'December 2023: Casgevy became the first FDA-approved therapy using CRISPR/Cas9 genome editing, for patients 12 years and older.'),
  frangoul: src('CRISPR-Cas9 Gene Editing for Sickle Cell Disease and β-Thalassemia (Frangoul et al.)', 'nejm.org', 'https://www.nejm.org/doi/full/10.1056/NEJMoa2031054', 97, 2021,
    'Early results in a small number of patients; authors note longer follow-up is required to assess durability and safety.'),
  nist: src('CODATA Value: Speed of Light in Vacuum', 'physics.nist.gov', 'https://physics.nist.gov/cgi-bin/cuu/Value?c', 99, 2019,
    'Exact defined value: 299,792,458 metres per second.'),
  greatWall: src('Great Wall of China — visibility from space', 'en.wikipedia.org', 'https://en.wikipedia.org/wiki/Great_Wall_of_China', 78, 2024,
    'Astronaut accounts indicate the wall is not visible to the naked eye from the Moon and is very hard to see from low Earth orbit.'),
  brainMyth: src('Ten percent of the brain myth', 'en.wikipedia.org', 'https://en.wikipedia.org/wiki/Ten_percent_of_the_brain_myth', 78, 2024,
    'Neuroimaging shows virtually all brain regions are active over the course of a day.'),
  apollo: src('Apollo 11 Mission Overview', 'nasa.gov', 'https://www.nasa.gov/mission/apollo-11/', 99, 2023,
    'On July 20, 1969, Neil Armstrong and Buzz Aldrin landed on the Moon.'),
  everest: src('Mount Everest — elevation', 'en.wikipedia.org', 'https://en.wikipedia.org/wiki/Mount_Everest', 78, 2024,
    'A joint China–Nepal survey announced in 2020 measured the summit at 8,848.86 m.'),
  wwii: src('World War II', 'britannica.com', 'https://www.britannica.com/event/World-War-II', 92, 2024,
    'The war ended in 1945 with the surrender of Germany in May and Japan in September.'),
  watsonCrick: src('Molecular Structure of Nucleic Acids (Watson & Crick)', 'nature.com', 'https://www.nature.com/articles/171737a0', 99, 1953,
    'The 1953 Nature letter proposing the double-helix structure of DNA.'),
  penicillin: src('Alexander Fleming Discovery and Development of Penicillin', 'acs.org', 'https://www.acs.org/education/whatischemistry/landmarks/flemingpenicillin.html', 93, 1999,
    'Fleming observed the antibacterial action of Penicillium mould in 1928.'),
  cdcAutism: src('Autism and Vaccines', 'cdc.gov', 'https://www.cdc.gov/vaccine-safety/about/autism.html', 97, 2024,
    'Studies have found no link between receiving vaccines and developing autism.'),
  boiling: src('Boiling point of water', 'en.wikipedia.org', 'https://en.wikipedia.org/wiki/Boiling_point', 78, 2024,
    'Water boils at about 100 °C (212 °F) at standard sea-level atmospheric pressure.'),
  paris: src('Paris', 'britannica.com', 'https://www.britannica.com/place/Paris', 92, 2024, 'Paris is the capital and largest city of France.'),
  einstein: src('Annus mirabilis papers', 'en.wikipedia.org', 'https://en.wikipedia.org/wiki/Annus_mirabilis_papers', 78, 2024,
    'Einstein published the theory of special relativity in 1905.'),
};

// verdict: verified | refuted | uncertain. `require` adds a second regex that must also match.
const KB = [
  // --- Medical
  { id: 'curcumin-reverse', re: /(revers|cure[sd]?\b|eliminat)\w*.*diabetes|diabetes.*(revers|cured)/i, verdict: 'refuted', confidence: 94,
    note: 'No large randomized trial shows curcumin reverses type 2 diabetes. The cited institution, sample size and precise success rate could not be matched to any published study — classic fabricated-citation pattern.',
    counter: [S.nccihTurmeric, S.hewlings],
    correction: 'No published large-scale study shows that curcumin reverses type 2 diabetes; claims of a specific "94.7% success rate" could not be traced to any credible source.' },
  { id: 'stop-meds', re: /(stop|discontinue|quit|replace|instead of)\w*.*(metformin|insulin|medication|medicine|prescription)/i, verdict: 'refuted', confidence: 97, danger: true,
    note: 'High-risk medical hallucination. Stopping prescribed diabetes medication without clinician guidance can cause dangerous hyperglycemia. No guideline supports substituting curcumin for metformin.',
    counter: [S.adaStandards, S.nccihTurmeric],
    correction: 'Patients should not stop or change prescribed diabetes medication such as metformin without talking to their clinician; supplements are not a substitute.' },
  { id: 'fda-curcumin', re: /fda.*(approv|clear)\w*.*(curcumin|turmeric|supplement)|(curcumin|turmeric).*fda.*approv/i, verdict: 'refuted', confidence: 96,
    note: 'The FDA does not approve dietary supplements as disease treatments. No FDA approval of curcumin for diabetes exists.',
    counter: [S.fdaSupplements],
    correction: 'Curcumin is sold as a dietary supplement and has not been approved by the FDA as a treatment for diabetes.' },
  { id: 'turmeric-safe', re: /(turmeric|curcumin).*(always safe|any dose|no side effects|completely safe|zero risk)/i, verdict: 'refuted', confidence: 92,
    note: 'Overgeneralized safety claim. NIH reports gastrointestinal effects at high doses and rare cases of liver injury linked to turmeric supplements.',
    counter: [S.nccihTurmeric],
    correction: 'Turmeric is generally considered safe in food amounts, but high-dose supplements can cause side effects and have rarely been linked to liver injury.' },
  { id: 'curcumin-polyphenol', re: /turmeric.*curcumin|curcumin.*(polyphenol|curcuminoid)/i, verdict: 'verified', confidence: 95,
    note: 'Consistent with NIH and peer-reviewed literature: curcumin is the principal curcuminoid polyphenol in turmeric.', sources: [S.nccihTurmeric, S.hewlings] },
  { id: 'piperine', re: /(bioavailab|absor)\w*.*(piperine|black pepper)|(piperine|black pepper).*(bioavailab|absor)/i, verdict: 'verified', confidence: 93,
    note: 'Well documented pharmacokinetic finding; piperine increases curcumin serum levels.', sources: [S.shoba, S.hewlings] },
  { id: 'curcumin-glucose', re: /curcumin.*(glucose|glycemic|blood sugar|hba1c|insulin sensitivity)/i, verdict: 'uncertain', confidence: 66,
    note: 'Small trials report modest effects, but studies are heterogeneous and low quality. The claim is plausible only when hedged — which this sentence does.', sources: [S.hewlings, S.nccihTurmeric] },

  // --- Financial
  { id: 'bitcoin', re: /bitcoin.*(2008|white ?paper)|satoshi nakamoto/i, verdict: 'verified', confidence: 97,
    note: 'Matches the primary source: the Bitcoin whitepaper (2008) by the pseudonymous Satoshi Nakamoto.', sources: [S.bitcoin] },
  { id: 'sp500', re: /s&p\s?500.*\b(10|ten)\s?(%|percent)/i, verdict: 'verified', confidence: 90,
    note: 'Long-run nominal average is approximately 10% — consistent with historical datasets, and appropriately qualified.', sources: [S.damodaran] },
  { id: 'tesla-margin', re: /tesla.*(margin|profit)/i, verdict: 'refuted', confidence: 95,
    note: 'Fabricated statistic. Tesla’s FY2023 filings imply a net margin near 15%. "Highest ever by any automaker" is an unsourced superlative.',
    counter: [S.teslaIR],
    correction: 'Tesla’s 2023 net profit margin was roughly 15% according to its annual report, inflated by a one-time tax benefit — not 42.8%.' },
  { id: 'apple-trillion', re: /apple.*(trillion|\$1\s?t\b)/i, verdict: 'verified', confidence: 94,
    note: 'Widely reported milestone: August 2, 2018.', sources: [S.appleWiki] },
  { id: 'index-fees', re: /index funds?.*(lower|low|cheaper)\s+(fees|costs|expense)/i, verdict: 'verified', confidence: 95,
    note: 'Supported by SEC investor education and long-running SPIVA data.', sources: [S.investorIndex, S.spiva] },
  { id: 'guarantee', re: /guarantee\w*.*(rise|return|gain|grow|profit|double|triple)/i, verdict: 'refuted', confidence: 96,
    note: 'No regulated analyst can "guarantee" future market returns; this is a forward-looking prediction presented as fact with no traceable source.',
    counter: [],
    correction: 'No one can guarantee future market performance; I could not find any credible analyst forecast that the Nasdaq will rise 300% by 2027.' },
  { id: 'buffett-nvidia', re: /(buffett|berkshire).*nvidia|nvidia.*(buffett|berkshire)/i, verdict: 'refuted', confidence: 93,
    note: 'Berkshire Hathaway’s holdings are publicly disclosed in 13F filings; no such position is reported. "According to insiders" is an untraceable attribution.',
    counter: [S.sec13f],
    correction: 'There is no public filing showing Warren Buffett or Berkshire Hathaway invested $85 billion in Nvidia; this claim should be disregarded.' },
  { id: 'bonds-rates', re: /interest rates?.*(rise|increase|go up).*bonds?.*(fall|decline|drop)|bond prices?.*(fall|drop|decline).*interest rates?/i, verdict: 'verified', confidence: 97,
    note: 'Core fixed-income principle (interest rate risk).', sources: [S.investorRates] },

  // --- Scientific
  { id: 'nobel-crispr', re: /(doudna|charpentier).*nobel|nobel.*(doudna|charpentier|crispr)/i, verdict: 'verified', confidence: 99,
    note: 'Confirmed by the Nobel Foundation press release (Chemistry, 2020).', sources: [S.nobel2020] },
  { id: 'crispr-2012', re: /crispr.*(doudna|charpentier|2012)|(doudna|charpentier).*2012/i, verdict: 'verified', confidence: 97,
    note: 'Matches the 2012 Jinek et al. paper in Science.', sources: [S.jinek, S.nobel2020] },
  { id: 'base-edit', re: /off-target.*(base edit|prime edit)|(base|prime) edit\w*.*off-target/i, verdict: 'verified', confidence: 86,
    note: 'Accurate and properly hedged ("appear to reduce some") — matches the literature.', sources: [S.komor] },
  { id: 'casgevy', re: /casgevy|fda.*crispr.*sickle/i, verdict: 'verified', confidence: 98,
    note: 'Confirmed by FDA press announcement, December 8, 2023.', sources: [S.fdaCasgevy] },
  { id: 'durability', re: /durab\w*.*(unclear|unknown|uncertain)|(unclear|unknown|uncertain).*durab/i, verdict: 'uncertain', confidence: 72,
    note: 'Genuinely open question. The model correctly expresses uncertainty rather than guessing — good epistemic calibration.', sources: [S.frangoul] },
  { id: 'long-term', re: /long-term safety.*(limited|unknown|unclear|needed)|longitudinal.*needed/i, verdict: 'uncertain', confidence: 70,
    note: 'Correctly flags limited long-term data. No overclaiming detected.', sources: [S.frangoul, S.fdaCasgevy] },

  // --- General knowledge
  { id: 'light', re: /speed of light/i, require: /(299[, ]?792|300[, ]?000|186[, ]?000)/, verdict: 'verified', confidence: 98, note: 'Matches the CODATA defined constant.', sources: [S.nist] },
  { id: 'great-wall', re: /great wall.*(visible|seen).*(space|moon|orbit)/i, verdict: 'refuted', confidence: 93, note: 'Popular myth contradicted by astronaut accounts.', counter: [S.greatWall],
    correction: 'Contrary to popular belief, the Great Wall of China is not visible to the naked eye from space under normal conditions.' },
  { id: 'brain-10', re: /\b(10|ten)\s?(%|percent) of (their |our |the |your )?brain/i, verdict: 'refuted', confidence: 96, note: 'Well-known neuroscience myth.', counter: [S.brainMyth],
    correction: 'Humans use virtually all of their brain; the "10% of the brain" idea is a myth.' },
  { id: 'apollo', re: /(apollo 11|moon landing|landed on the moon|walked on the moon).*1969|1969.*moon/i, verdict: 'verified', confidence: 99, note: 'Historical record.', sources: [S.apollo] },
  { id: 'everest', re: /everest/i, require: /8,?8(4[4-9]|5\d)/, verdict: 'verified', confidence: 94, note: 'Matches the 2020 survey height (8,848.86 m).', sources: [S.everest] },
  { id: 'wwii', re: /(world war ii|world war 2|wwii|second world war).*1945/i, verdict: 'verified', confidence: 98, note: 'Historical record.', sources: [S.wwii] },
  { id: 'dna', re: /(double helix|structure of dna).*1953|watson.*crick|1953.*double helix/i, verdict: 'verified', confidence: 98, note: 'Primary source: Nature, 1953.', sources: [S.watsonCrick] },
  { id: 'penicillin', re: /penicillin.*(1928|fleming)|fleming.*penicillin/i, verdict: 'verified', confidence: 97, note: 'Historical record.', sources: [S.penicillin] },
  { id: 'vax-autism', re: /vaccin\w*.*(cause|causes|caused|linked to|lead to).*autism/i, verdict: 'refuted', confidence: 98, note: 'Extensively studied; no causal link found.', counter: [S.cdcAutism],
    correction: 'Large studies have found no link between vaccines and autism.' },
  { id: 'boiling', re: /water boils at (about |approximately )?100/i, verdict: 'verified', confidence: 96, note: 'True at standard sea-level pressure.', sources: [S.boiling] },
  { id: 'paris', re: /paris is the capital of france|capital of france is paris/i, verdict: 'verified', confidence: 99, note: 'Geographic fact.', sources: [S.paris] },
  { id: 'einstein', re: /einstein.*relativity.*1905|1905.*einstein.*relativity/i, verdict: 'verified', confidence: 96, note: 'Historical record.', sources: [S.einstein] },
];

/* ------------------------------------- Demo presets ------------------------------------- */

const PRESETS = [
  {
    id: 'medical', name: 'Medical Hallucination', tag: 'High risk', Icon: ShieldAlert, model: 'gpt-4o',
    prompt: 'Is turmeric an effective treatment for type 2 diabetes? Can I use it instead of my medication?',
    text: 'Turmeric contains curcumin, a bright yellow polyphenol compound responsible for most of its studied biological activity. A 2021 Johns Hopkins study of 12,400 patients proved that taking 500 mg of curcumin daily reverses type 2 diabetes in 94.7% of cases. Curcumin has poor bioavailability on its own, so it is often combined with piperine from black pepper to improve absorption. Some small clinical trials suggest curcumin may modestly improve fasting blood glucose, although results are inconsistent. The FDA officially approved curcumin as a first-line diabetes treatment in 2019. Because of this, patients can safely stop taking metformin once they begin daily curcumin supplementation. Turmeric is always safe at any dose and has no side effects.',
  },
  {
    id: 'financial', name: 'Financial Stats Fabrication', tag: 'Fabricated numbers', Icon: Activity, model: 'gemini',
    prompt: 'Give me some key facts about investing and the stock market for a beginner.',
    text: 'Bitcoin was introduced in a 2008 whitepaper published under the pseudonym Satoshi Nakamoto. The S&P 500 has historically returned roughly 10% per year on average before inflation, although individual years vary widely. Tesla’s 2023 net profit margin was exactly 42.8%, the highest ever recorded by any automaker. Apple became the first U.S. public company to reach a $1 trillion market capitalization in August 2018. Index funds generally charge lower fees than actively managed mutual funds. Analysts at Goldman Sachs guarantee that the Nasdaq will rise 300% by 2027. Warren Buffett personally invested $85 billion into Nvidia stock last quarter, according to insiders. When interest rates rise, the prices of existing fixed-rate bonds typically fall.',
  },
  {
    id: 'scientific', name: 'Well-Calibrated Scientific Answer', tag: 'Gold standard', Icon: ShieldCheck, model: 'claude',
    prompt: 'What is CRISPR and how far along is it as a medical therapy?',
    text: 'CRISPR-Cas9 was adapted into a programmable genome-editing tool in work published by Jennifer Doudna and Emmanuelle Charpentier in 2012. Doudna and Charpentier were awarded the 2020 Nobel Prize in Chemistry for developing this method. Off-target edits remain a recognized risk, although newer approaches such as base editing appear to reduce some of these errors. In December 2023, the FDA approved Casgevy, the first CRISPR-based therapy, for sickle cell disease in patients 12 and older. However, it is still unclear how durable these effects will be over several decades. Long-term safety data are limited, and most experts suggest that more longitudinal follow-up is needed before drawing firm conclusions.',
  },
];

/* ------------------------------------- NLP heuristics ------------------------------------ */

const ABBR = new Set(['mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'vs', 'etc', 'e.g', 'i.e', 'inc', 'ltd', 'co', 'corp',
  'u.s', 'u.k', 'u.n', 'e.u', 'approx', 'no', 'fig', 'al', 'dept', 'est', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug',
  'sep', 'sept', 'oct', 'nov', 'dec', 'mt', 'ph.d', 'a.m', 'p.m']);

function segmentText(text) {
  const segs = [];
  const n = text.length;
  let start = 0;
  const push = (s, e) => {
    let a = s; let b = e;
    while (a < b && /\s/.test(text[a])) a++;
    while (b > a && /\s/.test(text[b - 1])) b--;
    if (b > a) segs.push({ start: a, end: b, text: text.slice(a, b) });
  };
  for (let i = 0; i < n; i++) {
    const c = text[i];
    if (c === '\n') { push(start, i); start = i + 1; continue; }
    if (c !== '.' && c !== '!' && c !== '?') continue;
    let j = i + 1;
    while (j < n && /[.!?"'”’)\]]/.test(text[j])) j++;
    if (j < n && !/\s/.test(text[j])) continue; // decimals, URLs, "e.g." mid-token
    if (c === '.') {
      const m = text.slice(start, i).match(/(\S+)$/);
      const tok = m ? m[1].replace(/^[("'“‘]+/, '').toLowerCase() : '';
      if (ABBR.has(tok) || /^[a-z]$/.test(tok)) continue;
    }
    let k = j;
    while (k < n && text[k] === ' ') k++;
    if (k < n && /[a-z]/.test(text[k])) continue;
    push(start, j);
    start = j;
    i = j - 1;
  }
  push(start, n);
  return segs;
}

const wordCount = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const FILLER_RE = /^(i hope|hope this|let me know|feel free|great question|good question|sure[,!]|certainly[,!]|of course[,!]|here('s| is| are)\b|in summary[,:]?$)/i;
const isClaim = (seg) => wordCount(seg.text) >= 4 && !/[:?]$/.test(seg.text) && !/^#+\s/.test(seg.text) && !FILLER_RE.test(seg.text);

const ABSOLUTE_RE = /\b(always|never|guarantee[sd]?|100\s?%|completely|definitely|undeniably|proven|proves|proved|cures?|cured|all (experts|doctors|scientists|studies)|everyone knows|without (a )?doubt|no side effects|zero risk|certainly|exactly|officially|safely|the highest ever|the best ever|impossible|absolutely)\b/gi;
const HEDGE_RE = /\b(may|might|could|suggests?|appears?|appear to|likely|unlikely|approximately|roughly|around|estimated|some (small )?(studies|trials|evidence|research|clinical trials)|preliminary|unclear|uncertain|it is possible|tends? to|generally|often|typically|in some cases|more research|limited|historically|on average|although|however|inconsistent|recognized risk|is needed)\b/gi;
const PRECISE_RE = /\b\d+\.\d+\s?%|\b\d{1,3}(,\d{3})+\s+(patients|participants|people|subjects|users|respondents)\b/i;
const VAGUE_RE = /\b(a (recent|new|landmark|\d{4}) (study|report|survey|paper)|studies (show|prove)|research (shows|proves)|experts (say|agree|claim)|scientists (say|agree)|according to (insiders|sources|reports)|it is (widely )?known)\b/i;
const NAMED_INST_RE = /\b(harvard|stanford|johns hopkins|mit|oxford|cambridge|mayo clinic|goldman sachs|mckinsey|jp ?morgan|world health organization|who)\b/i;
const STUDY_RE = /\b(study|trial|analysts?|report|survey|research)\b/i;
const YEAR_RE = /\b(19\d{2}|20\d{2})\b/g;

const STOP = new Set(('the a an and or but if then so of to in on at for from by with about into over after before is are was were be been being ' +
  'it its this that these those there their they them i me my you your we our can could should would will just what which who how why when where ' +
  'some any more most much many very also than give tell me please does did do has have had not use using instead').split(' '));
const stem = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);
const keywords = (s) => [...new Set(s.toLowerCase().split(/[^a-z0-9&]+/).filter((w) => w.length >= 4 && !STOP.has(w)).map(stem))];

const SOFTEN = [
  [/\balways\b/gi, 'often'], [/\bnever\b/gi, 'rarely'], [/\bguarantees?\b/gi, 'suggests'], [/\bguaranteed\b/gi, 'expected'],
  [/\bproven\b/gi, 'reported'], [/\bproved\b/gi, 'suggested'], [/\bproves\b/gi, 'suggests'], [/\bcures\b/gi, 'may help with'],
  [/\bdefinitely\b/gi, 'likely'], [/\bcompletely\b/gi, 'largely'], [/\bcertainly\b/gi, 'likely'], [/\bexactly\b/gi, 'approximately'],
  [/\babsolutely\b/gi, ''],
];
const soften = (s) => SOFTEN.reduce((acc, [re, rep]) => acc.replace(re, rep), s).replace(/\s{2,}/g, ' ');
const stripEnd = (s) => s.replace(/[.!?]+["'”’]?$/, '');

function analyzeClaim(seg, index) {
  const s = seg.text;
  const absolutes = [...new Set((s.match(ABSOLUTE_RE) || []).map((w) => w.toLowerCase()))];
  const hedges = [...new Set((s.match(HEDGE_RE) || []).map((w) => w.toLowerCase()))];
  const years = (s.match(YEAR_RE) || []).map(Number);
  const signals = {
    absolutes, hedges,
    hedged: hedges.length > 0,
    preciseStat: PRECISE_RE.test(s),
    vagueAuthority: VAGUE_RE.test(s),
    namedAuthority: NAMED_INST_RE.test(s) && STUDY_RE.test(s),
    futureFact: years.some((y) => y > CURRENT_YEAR) && /\bwill\b/i.test(s) && hedges.length === 0,
  };

  const kb = KB.find((k) => k.re.test(s) && (!k.require || k.require.test(s)));
  let status; let confidence; const reasons = []; let sources = []; let counter = []; let kbNote = null; let correction = null;

  if (kb) {
    kbNote = kb.note;
    correction = kb.correction || null;
    if (kb.verdict === 'verified') {
      status = 'verified'; sources = kb.sources || [];
      confidence = kb.confidence - (absolutes.length ? 6 : 0);
      reasons.push('Matched against curated reference index with corroborating primary sources.');
      if (absolutes.length) reasons.push(`Factually supported, but uses absolute phrasing ("${absolutes.join('", "')}") that overstates certainty.`);
    } else if (kb.verdict === 'refuted') {
      status = 'unsupported'; counter = kb.counter || [];
      confidence = kb.confidence;
      reasons.push('Contradicted by, or absent from, credible reference sources.');
    } else {
      status = 'uncertain'; sources = kb.sources || [];
      confidence = kb.confidence;
      reasons.push(signals.hedged ? 'Evidence is limited or mixed — and the model hedged appropriately.' : 'Evidence is limited or mixed, yet the model states it without qualification.');
    }
  } else {
    let risk = 0;
    if (absolutes.length) { risk += 18 + 7 * Math.min(absolutes.length, 3); reasons.push(`Absolute / overconfident language: "${absolutes.join('", "')}".`); }
    if (signals.preciseStat) { risk += 22; reasons.push('Suspiciously precise statistic with no traceable dataset.'); }
    if (signals.vagueAuthority) { risk += 20; reasons.push('Vague appeal to authority ("a study", "experts", "insiders") with no citable source.'); }
    if (signals.namedAuthority) { risk += 18; reasons.push('Named institution attached to a study or forecast that could not be located.'); }
    if (signals.futureFact) { risk += 20; reasons.push('Future outcome stated as certain fact.'); }
    if (signals.hedged) risk -= 12;

    if (risk >= 35) {
      status = 'unsupported';
      confidence = Math.min(93, 52 + Math.round(risk / 2));
      reasons.unshift('No matching record in the reference index; multiple hallucination signals detected.');
    } else {
      status = 'uncertain';
      confidence = signals.hedged ? 62 : 54;
      reasons.unshift(signals.hedged
        ? 'No direct source found, but the claim is appropriately hedged.'
        : 'No matching source in the reference index — needs external verification or added context.');
    }
  }

  // Calibrated rewrite for this claim
  let rewrite; let rewriteKind;
  if (status === 'verified') {
    rewrite = soften(s); rewriteKind = 'cited';
  } else if (status === 'uncertain') {
    if (signals.hedged) { rewrite = soften(s); rewriteKind = 'kept'; }
    else { rewrite = `${stripEnd(soften(s))} — though this could not be independently verified.`; rewriteKind = 'hedged'; }
  } else {
    rewrite = correction || `I could not find credible evidence for the claim that “${stripEnd(s)}”, so it should not be relied upon.`;
    rewriteKind = 'corrected';
  }

  return {
    id: index, start: seg.start, end: seg.end, text: s, status, confidence: Math.max(5, Math.min(99, confidence)),
    reasons, kbNote, sources, counter, signals, danger: !!(kb && kb.danger), kbId: kb ? kb.id : null, rewrite, rewriteKind,
  };
}

function runEngine({ text, prompt, model }) {
  const segments = segmentText(text);
  const claims = [];
  const segOut = segments.map((seg) => {
    if (!isClaim(seg)) return { ...seg, claimIndex: -1 };
    const c = analyzeClaim(seg, claims.length);
    claims.push(c);
    return { ...seg, claimIndex: c.id };
  });

  const counts = { verified: 0, unsupported: 0, uncertain: 0 };
  claims.forEach((c) => { counts[c.status] += 1; });
  const n = claims.length || 1;

  // Topic drift
  let drift = null;
  if (prompt && prompt.trim()) {
    const pk = keywords(prompt);
    const rk = new Set(keywords(text));
    const hit = pk.filter((k) => rk.has(k));
    const relevance = pk.length ? hit.length / pk.length : 1;
    drift = { relevance: Math.round(relevance * 100), matched: hit.length, total: pk.length,
      level: relevance >= 0.5 ? 'on-topic' : relevance >= 0.25 ? 'partial' : 'drifted' };
  }

  const weight = (c) => c.status === 'verified' ? (c.signals.absolutes.length ? 0.9 : 1)
    : c.status === 'uncertain' ? (c.signals.hedged ? 0.7 : 0.45) : 0;
  const dangerPenalty = claims.some((c) => c.danger) ? 6 : 0;
  const driftPenalty = drift ? (drift.level === 'drifted' ? 12 : drift.level === 'partial' ? 5 : 0) : 0;
  const trust = claims.length
    ? Math.max(0, Math.min(100, Math.round((100 * claims.reduce((a, c) => a + weight(c), 0)) / n - dangerPenalty - driftPenalty)))
    : 0;

  const humScore = (c) => {
    let v;
    if (c.status === 'verified') v = 1;
    else if (c.status === 'uncertain') v = c.signals.hedged ? 1 : 0.4;
    else v = c.signals.hedged ? 0.45 : 0;
    v -= 0.15 * Math.min(c.signals.absolutes.length, 2);
    return Math.max(0, v);
  };
  const humility = claims.length ? Math.round((100 * claims.reduce((a, c) => a + humScore(c), 0)) / n) : 0;
  const overconfident = claims.filter((c) => c.status !== 'verified' && !c.signals.hedged).length + claims.filter((c) => c.signals.absolutes.length).length;
  const hedgedCount = claims.filter((c) => c.signals.hedged).length;

  // References for the rewrite
  const refs = [];
  const refIndex = new Map();
  const rewrite = claims.map((c) => {
    const cites = [];
    if (c.status !== 'unsupported') {
      c.sources.forEach((s) => {
        if (!refIndex.has(s.url)) { refs.push(s); refIndex.set(s.url, refs.length); }
        cites.push(refIndex.get(s.url));
      });
    }
    return { id: c.id, kind: c.rewriteKind, text: c.rewrite, cites };
  });

  return {
    claims, segments: segOut, counts, total: claims.length, trust, humility, overconfident, hedgedCount, drift,
    rewrite, refs, model, inputText: text, inputPrompt: prompt, at: new Date(),
  };
}

/* --------------------------------------- Hooks --------------------------------------- */

function useCountUp(target, duration = 1100) {
  const [val, setVal] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    let raf;
    const from = fromRef.current;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      const cur = from + (target - from) * e;
      fromRef.current = cur;
      setVal(cur);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return Math.round(val);
}

const scoreColor = (v) => (v >= 70 ? '#10B981' : v >= 40 ? '#F59E0B' : '#F43F5E');

/* ------------------------------------ Graphics ------------------------------------ */

function LogoMark({ size = 38 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="tl-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22D3EE" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
        <clipPath id="tl-logo-clip">
          <path d="M24 3 L41 9.5 V22 C41 33 33.5 41.5 24 45 C14.5 41.5 7 33 7 22 V9.5 Z" />
        </clipPath>
        <filter id="tl-logo-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d="M24 3 L41 9.5 V22 C41 33 33.5 41.5 24 45 C14.5 41.5 7 33 7 22 V9.5 Z" fill="rgba(34,211,238,0.08)" stroke="url(#tl-logo-g)" strokeWidth="2" />
      <g clipPath="url(#tl-logo-clip)">
        <rect x="0" y="0" width="48" height="3" fill="url(#tl-logo-g)" opacity="0.55" className="tl-logo-scan" />
      </g>
      <g stroke="url(#tl-logo-g)" strokeWidth="1.1" opacity="0.75">
        <line x1="24" y1="23" x2="16" y2="15" /><line x1="24" y1="23" x2="32" y2="15" />
        <line x1="24" y1="23" x2="15.5" y2="30" /><line x1="24" y1="23" x2="32.5" y2="30" />
        <line x1="24" y1="23" x2="24" y2="37" /><line x1="16" y1="15" x2="32" y2="15" />
        <line x1="15.5" y1="30" x2="24" y2="37" /><line x1="32.5" y1="30" x2="24" y2="37" />
      </g>
      <g filter="url(#tl-logo-glow)">
        {[[16, 15, 0], [32, 15, 0.4], [15.5, 30, 0.8], [32.5, 30, 1.2], [24, 37, 1.6]].map(([x, y, d]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2.1" fill="#22D3EE" className="tl-node" style={{ animationDelay: `${d}s` }} />
        ))}
        <circle cx="24" cy="23" r="3.4" fill="#10B981" className="tl-node" style={{ animationDelay: '0.2s' }} />
      </g>
    </svg>
  );
}

function RadialGauge({ value, size = 156, stroke = 12, running }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value || 0));
  const shown = useCountUp(v);
  const color = scoreColor(v);
  const ticks = Array.from({ length: 40 });
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={running ? 'tl-spin-slow' : ''}>
        <defs>
          <filter id="tl-gauge-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {ticks.map((_, i) => {
          const a = (i / ticks.length) * 2 * Math.PI;
          const r1 = r - stroke / 2 - 5; const r2 = r1 - (i % 5 === 0 ? 6 : 3);
          return (
            <line key={i} x1={size / 2 + r1 * Math.cos(a)} y1={size / 2 + r1 * Math.sin(a)} x2={size / 2 + r2 * Math.cos(a)} y2={size / 2 + r2 * Math.sin(a)}
              stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          );
        })}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={running ? '#22D3EE' : color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={running ? c * 0.78 : c * (1 - v / 100)} filter="url(#tl-gauge-glow)"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1), stroke .6s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {running ? (
          <span className="font-mono text-xs tracking-widest text-cyan-300 tl-blink">SCANNING</span>
        ) : (
          <>
            <span className="text-4xl font-bold tabular-nums" style={{ color }}>{shown}<span className="text-xl">%</span></span>
            <span className="mt-0.5 font-mono text-[10px] tracking-[0.2em] text-slate-400">TRUST SCORE</span>
          </>
        )}
      </div>
    </div>
  );
}

function SemiGauge({ value, running }) {
  const v = Math.max(0, Math.min(100, value || 0));
  const len = Math.PI * 65;
  const angle = running ? 0 : -90 + (v / 100) * 180;
  return (
    <svg viewBox="0 0 160 100" className="w-full max-w-[200px]" role="img" aria-label={`Epistemic humility ${v} out of 100`}>
      <defs>
        <linearGradient id="tl-hum-g" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#F43F5E" /><stop offset="50%" stopColor="#F59E0B" /><stop offset="100%" stopColor="#10B981" />
        </linearGradient>
      </defs>
      <path d="M 15 82 A 65 65 0 0 1 145 82" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" strokeLinecap="round" />
      <path d="M 15 82 A 65 65 0 0 1 145 82" fill="none" stroke="url(#tl-hum-g)" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={len} strokeDashoffset={running ? len : len * (1 - v / 100)}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)' }} />
      <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '80px 82px', transition: 'transform 1.2s cubic-bezier(.34,1.56,.64,1)' }}>
        <line x1="80" y1="82" x2="80" y2="30" stroke="#E5E7EB" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <circle cx="80" cy="82" r="5.5" fill="#0B1220" stroke="#E5E7EB" strokeWidth="2" />
      <text x="12" y="97" fill="#94A3B8" fontSize="8" fontFamily="ui-monospace, monospace">OVERCONFIDENT</text>
      <text x="148" y="97" fill="#94A3B8" fontSize="8" fontFamily="ui-monospace, monospace" textAnchor="end">CALIBRATED</text>
    </svg>
  );
}

function DistributionChart({ counts, total, running }) {
  const W = 260; const H = 150; const base = 118; const maxH = 92;
  const items = [
    { key: 'verified', label: 'VERIFIED' },
    { key: 'unsupported', label: 'UNSUPPORTED' },
    { key: 'uncertain', label: 'UNCERTAIN' },
  ];
  const t = total || 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label={`Verified ${counts.verified}, unsupported ${counts.unsupported}, uncertain ${counts.uncertain}`}>
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (
        <line key={g} x1="8" x2={W - 8} y1={base - g * maxH} y2={base - g * maxH} stroke="rgba(255,255,255,0.06)" strokeDasharray={g === 0 ? '' : '3 4'} />
      ))}
      {items.map((it, i) => {
        const pct = running ? 0.08 : counts[it.key] / t;
        const x = 22 + i * 80; const w = 56;
        const col = STATUS[it.key].color;
        return (
          <g key={it.key}>
            <rect x={x} y={base - maxH} width={w} height={maxH} rx="6" fill="rgba(255,255,255,0.025)" />
            <rect x={x} y={base - maxH} width={w} height={maxH} rx="6" fill={col} opacity="0.85"
              style={{ transformBox: 'fill-box', transformOrigin: 'bottom', transform: `scaleY(${Math.max(0.02, pct)})`, transition: `transform 1s cubic-bezier(.2,.8,.2,1) ${i * 0.12}s` }} />
            <text x={x + w / 2} y={base - Math.max(0.02, pct) * maxH - 6} textAnchor="middle" fill="#E5E7EB" fontSize="12" fontWeight="700"
              style={{ transition: 'all 1s cubic-bezier(.2,.8,.2,1)' }}>
              {running ? '' : `${Math.round((counts[it.key] / t) * 100)}%`}
            </text>
            <text x={x + w / 2} y={base + 16} textAnchor="middle" fill={col} fontSize="8.5" fontFamily="ui-monospace, monospace" letterSpacing="1">{it.label}</text>
            <text x={x + w / 2} y={base + 29} textAnchor="middle" fill="#94A3B8" fontSize="9">{running ? '…' : `${counts[it.key]} claim${counts[it.key] === 1 ? '' : 's'}`}</text>
          </g>
        );
      })}
    </svg>
  );
}

function PipelineBar({ phase, stage, durationMs }) {
  const running = phase === 'running';
  const done = phase === 'done';
  return (
    <div className="tl-card relative overflow-hidden rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.16em] text-slate-300">
          <Cpu className="h-3.5 w-3.5 text-cyan-300" /> NEURAL VERIFICATION PIPELINE
        </div>
        <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wider ${running ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300' : done ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : 'border-white/10 bg-white/5 text-slate-400'}`}
          aria-live="polite">
          {running ? `STAGE ${stage + 1}/4 · RUNNING` : done ? `COMPLETE · ${(durationMs / 1000).toFixed(1)}s` : 'IDLE'}
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-white/5">
        <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
          style={{ width: running ? `${((stage + 0.6) / 4) * 100}%` : done ? '100%' : '0%' }} />
        {running && <div className="tl-laser absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/80 to-transparent" />}
      </div>
      <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STAGES.map((s, i) => {
          const st = done || (running && i < stage) ? 'done' : running && i === stage ? 'active' : 'pending';
          return (
            <li key={s} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-[11px] transition-colors ${st === 'done' ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-200' : st === 'active' ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200' : 'border-white/5 bg-white/[0.02] text-slate-500'}`}>
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full font-mono text-[9px] ${st === 'done' ? 'bg-emerald-500 text-slate-950' : st === 'active' ? 'bg-cyan-400 text-slate-950 tl-blink' : 'bg-white/10 text-slate-400'}`}>
                {st === 'done' ? <Check className="h-2.5 w-2.5" strokeWidth={4} /> : i + 1}
              </span>
              <span className="truncate font-medium">{s}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ------------------------------------ UI atoms ------------------------------------ */

function Kbd({ children, active, small }) {
  return <kbd className={`tl-kbd ${active ? 'tl-kbd-active' : ''} ${small ? 'tl-kbd-sm' : ''}`}>{children}</kbd>;
}

function KeyCombo({ keys, active, small }) {
  return (
    <span className="inline-flex items-center gap-1">
      {keys.map((k, i) => (
        <React.Fragment key={k + i}>
          {i > 0 && <span className="text-[10px] text-slate-500">+</span>}
          <Kbd active={active} small={small}>{k}</Kbd>
        </React.Fragment>
      ))}
    </span>
  );
}

function FieldLabel({ htmlFor, children, badge, tone = 'slate' }) {
  const tones = {
    slate: 'border-white/10 bg-white/5 text-slate-300',
    cyan: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200',
    emerald: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
    amber: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
    rose: 'border-rose-400/40 bg-rose-400/10 text-rose-200',
  };
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <label htmlFor={htmlFor} className="font-mono text-[11px] font-bold tracking-[0.14em] text-slate-100">[LABEL: {children}]</label>
      {badge && <span className={`rounded-md border px-1.5 py-0.5 font-mono text-[9.5px] font-semibold tracking-wider ${tones[tone]}`}>{badge}</span>}
    </div>
  );
}

function StatusChip({ status, size = 'sm' }) {
  const m = STATUS[status];
  const Icon = m.Icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border ${m.border} ${m.bg} ${m.text} ${size === 'sm' ? 'px-2 py-0.5 text-[10.5px]' : 'px-2.5 py-1 text-xs'} font-semibold`}>
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} /> {size === 'sm' ? m.label : m.long}
    </span>
  );
}

function SourceCard({ s, tone = 'support' }) {
  const col = s.credibility >= 90 ? '#10B981' : s.credibility >= 75 ? '#F59E0B' : '#F43F5E';
  return (
    <a href={s.url} target="_blank" rel="noopener noreferrer"
      className={`group block rounded-xl border p-3 transition-all hover:-translate-y-0.5 ${tone === 'counter' ? 'border-sky-400/20 bg-sky-400/[0.04] hover:border-sky-400/50' : 'border-white/[0.08] bg-white/[0.03] hover:border-emerald-400/40'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold leading-snug text-slate-100 group-hover:text-white">{s.title}</div>
          <div className="mt-0.5 flex items-center gap-2 font-mono text-[10.5px] text-slate-400">
            <span className="truncate text-cyan-300/90">{s.domain}</span><span>·</span><span>{s.year}</span>
          </div>
        </div>
        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500 group-hover:text-cyan-300" />
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-slate-400">{s.snippet}</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="font-mono text-[9.5px] tracking-wider text-slate-500">CREDIBILITY</span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full" style={{ width: `${s.credibility}%`, background: col }} />
        </div>
        <span className="font-mono text-[10.5px] font-bold" style={{ color: col }}>{s.credibility}</span>
      </div>
    </a>
  );
}

function NoSourceBanner() {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/[0.07] p-3">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
      <div>
        <div className="font-mono text-[12px] font-bold text-rose-200">&quot;No credible primary source found&quot;</div>
        <div className="mt-0.5 text-[11.5px] text-rose-200/70">Searched the reference index for a supporting primary source. Nothing matched the specifics of this claim.</div>
      </div>
    </div>
  );
}

/* ====================================== MAIN ====================================== */

export default function TrustLayerAI() {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  const modKey = isMac ? '⌘' : 'Ctrl';

  const [model, setModel] = useState('gpt-4o');
  const [prompt, setPrompt] = useState('');
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle | running | done
  const [stage, setStage] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [selected, setSelected] = useState(0);
  const [view, setView] = useState('canvas');
  const [showHelp, setShowHelp] = useState(false);
  const [pressed, setPressed] = useState({});
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activePreset, setActivePreset] = useState(null);

  const timers = useRef([]);
  const pressTimers = useRef({});
  const textareaRef = useRef(null);
  const sentenceRefs = useRef({});
  const toastTimer = useRef(null);

  const liveClaims = useMemo(() => segmentText(text).filter(isClaim).length, [text]);
  const chars = text.length;
  const words = wordCount(text);
  const stale = !!result && phase === 'done' && (result.inputText !== text || result.inputPrompt !== prompt || result.model !== model);
  const running = phase === 'running';

  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(Math.max(ta.scrollHeight, 180), 460)}px`;
  }, [text]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const flash = useCallback((id) => {
    setPressed((p) => ({ ...p, [id]: true }));
    clearTimeout(pressTimers.current[id]);
    pressTimers.current[id] = setTimeout(() => setPressed((p) => ({ ...p, [id]: false })), 220);
  }, []);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const runAudit = useCallback((override) => {
    const input = override || { text, prompt, model };
    if (!input.text.trim()) { showToast('Paste an AI response to audit first.'); textareaRef.current?.focus(); return; }
    clearTimers();
    setPhase('running');
    setStage(0);
    const t0 = performance.now();
    const step = 520;
    [1, 2, 3].forEach((s) => timers.current.push(setTimeout(() => setStage(s), step * s)));
    timers.current.push(setTimeout(() => {
      const r = runEngine(input);
      setResult(r);
      const firstFlag = r.claims.findIndex((c) => c.status === 'unsupported');
      setSelected(firstFlag >= 0 ? firstFlag : 0);
      setDurationMs(performance.now() - t0);
      setPhase('done');
    }, step * 4 + 120));
  }, [text, prompt, model, showToast]);

  const loadPreset = useCallback((i) => {
    const p = PRESETS[i];
    setModel(p.model); setPrompt(p.prompt); setText(p.text); setActivePreset(p.id); setView('canvas');
    runAudit({ text: p.text, prompt: p.prompt, model: p.model });
  }, [runAudit]);

  const reset = useCallback(() => {
    clearTimers();
    setText(''); setPrompt(''); setModel('gpt-4o'); setResult(null); setPhase('idle'); setStage(0);
    setSelected(0); setView('canvas'); setActivePreset(null);
    showToast('Workspace cleared.');
  }, [showToast]);

  const moveClaim = useCallback((d) => {
    if (!result || !result.claims.length) return;
    setSelected((s) => (s + d + result.claims.length) % result.claims.length);
  }, [result]);

  const cycleView = useCallback((d = 1) => {
    setView((v) => VIEWS[(VIEWS.findIndex((x) => x.id === v) + d + VIEWS.length) % VIEWS.length].id);
  }, []);

  const copyRewrite = useCallback(() => {
    if (!result) return;
    const body = result.rewrite.map((r) => r.text + (r.cites.length ? ' ' + r.cites.map((c) => `[${c}]`).join('') : '')).join(' ');
    const refs = result.refs.map((s, i) => `[${i + 1}] ${s.title} — ${s.domain} (${s.year}) ${s.url}`).join('\n');
    const full = `${body}\n\nReferences\n${refs}`;
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1600); showToast('Calibrated rewrite copied.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(full).then(done, () => showToast('Clipboard unavailable.'));
    else showToast('Clipboard unavailable.');
  }, [result, showToast]);

  // Latest actions for the global key listener
  const actions = useRef({});
  actions.current = { runAudit, loadPreset, reset, moveClaim, cycleView, setView, setShowHelp, flash, showHelp };

  useEffect(() => {
    const isTyping = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
    const onKey = (e) => {
      const a = actions.current;
      const typing = isTyping(e.target);
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); a.flash('run'); a.runAudit(); return; }
      if (e.altKey && !e.ctrlKey && !e.metaKey && /^Digit[123]$/.test(e.code)) {
        e.preventDefault(); const i = Number(e.code.slice(5)) - 1; a.flash(`preset${i + 1}`); a.loadPreset(i); return;
      }
      if (e.key === 'Escape') {
        e.preventDefault(); a.flash('reset');
        if (a.showHelp) { a.setShowHelp(false); return; }
        if (typing) { e.target.blur(); return; }
        a.reset(); return;
      }
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) { e.preventDefault(); a.flash('help'); a.setShowHelp((s) => !s); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); a.flash('next'); a.moveClaim(1); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); a.flash('prev'); a.moveClaim(-1); return; }
      if (['1', '2', '3'].includes(e.key)) { a.flash(`view${e.key}`); a.setView(VIEWS[Number(e.key) - 1].id); return; }
      if (e.key === 'Tab' && (document.activeElement === document.body || document.activeElement == null)) {
        e.preventDefault(); a.flash('view'); a.cycleView(e.shiftKey ? -1 : 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Preload Demo Preset #1 on mount
  useEffect(() => {
    actions.current.loadPreset(0);
    return () => { clearTimers(); Object.values(pressTimers.current).forEach(clearTimeout); clearTimeout(toastTimer.current); };
  }, []);

  useEffect(() => {
    if (view !== 'canvas') return;
    const el = sentenceRefs.current[selected];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selected, view, result]);

  const claim = result && result.claims[selected];
  const trustLabel = !result ? '—' : result.trust >= 75 ? 'High Trust' : result.trust >= 45 ? 'Caution · Mixed Reliability' : 'Low Trust · Likely Hallucinated';
  const humLabel = !result ? '—' : result.humility >= 70 ? 'Well-calibrated' : result.humility >= 40 ? 'Partially calibrated' : 'Overconfident';
  const noFocus = (e) => e.preventDefault();

  const dockGroups = [
    { title: 'RUN AUDIT', items: [{ id: 'run', keys: [modKey, 'Enter'], label: 'RUN AUDIT', primary: true, act: () => runAudit() }] },
    { title: 'LOAD DEMO PRESETS', items: PRESETS.map((p, i) => ({ id: `preset${i + 1}`, keys: ['Alt', String(i + 1)], label: p.id.toUpperCase(), act: () => loadPreset(i) })) },
    { title: 'PREV / NEXT CLAIM', items: [
      { id: 'prev', keys: ['↑'], label: 'PREV', act: () => moveClaim(-1) },
      { id: 'next', keys: ['↓'], label: 'NEXT', act: () => moveClaim(1) },
    ] },
    { title: 'SWITCH VIEW', items: [
      { id: 'view', keys: ['Tab'], label: 'CYCLE', act: () => cycleView(1) },
      ...VIEWS.map((v, i) => ({ id: `view${i + 1}`, keys: [String(i + 1)], label: v.id === 'canvas' ? 'CANVAS' : v.id === 'evidence' ? 'EVIDENCE' : 'REWRITE', act: () => setView(v.id), on: view === v.id })),
    ] },
    { title: 'WORKSPACE', items: [
      { id: 'reset', keys: ['Esc'], label: 'CLEAR / RESET', act: () => reset() },
      { id: 'help', keys: ['?'], label: 'SHORTCUTS', act: () => setShowHelp((s) => !s) },
    ] },
  ];

  return (
    <div className="relative min-h-screen bg-[#090D16] font-sans text-slate-200 antialiased selection:bg-cyan-400/30">
      <style>{`
        .tl-card{background:rgba(17,24,39,0.72);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,0.08);box-shadow:0 1px 0 rgba(255,255,255,0.04) inset,0 20px 40px -24px rgba(0,0,0,0.6)}
        .tl-mesh{background:radial-gradient(900px 520px at 12% -10%,rgba(34,211,238,0.13),transparent 60%),radial-gradient(800px 600px at 95% 10%,rgba(16,185,129,0.10),transparent 60%),radial-gradient(700px 500px at 50% 110%,rgba(99,102,241,0.08),transparent 60%)}
        .tl-grid{background-image:linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px);background-size:44px 44px;mask-image:radial-gradient(ellipse at 50% 0%,black 30%,transparent 75%)}
        .tl-kbd{display:inline-flex;align-items:center;justify-content:center;min-width:1.65rem;height:1.5rem;padding:0 .4rem;border-radius:.4rem;font:600 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:#E2E8F0;background:linear-gradient(180deg,#1F2937,#111827);border:1px solid rgba(255,255,255,0.14);border-bottom-width:3px;border-bottom-color:rgba(0,0,0,0.55);box-shadow:0 2px 0 rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.08);transition:transform .08s ease,box-shadow .12s ease,border-color .12s ease,color .12s ease,background .12s ease}
        .tl-kbd-sm{min-width:1.35rem;height:1.25rem;font-size:10px;padding:0 .3rem}
        .tl-kbd-active{transform:translateY(2px);border-bottom-width:1px;color:#0B1220;background:linear-gradient(180deg,#67E8F9,#22D3EE);border-color:#67E8F9;box-shadow:0 0 0 3px rgba(34,211,238,0.25),0 0 18px rgba(34,211,238,0.55)}
        @keyframes tl-laser{0%{transform:translateX(-120%)}100%{transform:translateX(520%)}}
        .tl-laser{animation:tl-laser 1.1s linear infinite}
        @keyframes tl-scanline{0%{top:-4%}100%{top:104%}}
        .tl-scanline{animation:tl-scanline 1.6s cubic-bezier(.5,0,.5,1) infinite}
        @keyframes tl-blink{0%,100%{opacity:1}50%{opacity:.35}}
        .tl-blink{animation:tl-blink 1s ease-in-out infinite}
        @keyframes tl-node{0%,100%{opacity:.45}50%{opacity:1}}
        .tl-node{animation:tl-node 2.4s ease-in-out infinite}
        @keyframes tl-logo-scan{0%{transform:translateY(2px)}100%{transform:translateY(44px)}}
        .tl-logo-scan{animation:tl-logo-scan 2.8s ease-in-out infinite alternate}
        @keyframes tl-spin{to{transform:rotate(360deg)}}
        .tl-spin-slow{animation:tl-spin 2.2s linear infinite}
        @keyframes tl-fade-up{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .tl-fade-up{animation:tl-fade-up .45s cubic-bezier(.2,.8,.2,1) both}
        @keyframes tl-glow{0%,100%{box-shadow:0 0 0 1px rgba(34,211,238,.45),0 0 22px rgba(34,211,238,.35)}50%{box-shadow:0 0 0 1px rgba(16,185,129,.6),0 0 34px rgba(16,185,129,.45)}}
        .tl-glow{animation:tl-glow 2.6s ease-in-out infinite}
        .tl-scroll::-webkit-scrollbar{height:6px;width:6px}.tl-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:9px}
        @media (prefers-reduced-motion: reduce){.tl-laser,.tl-scanline,.tl-blink,.tl-node,.tl-logo-scan,.tl-spin-slow,.tl-glow,.tl-fade-up{animation:none!important}}
      `}</style>

      <div className="tl-mesh pointer-events-none fixed inset-0" />
      <div className="tl-grid pointer-events-none fixed inset-0" />

      {/* ------------------------------- NAVBAR ------------------------------- */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#090D16]/80 backdrop-blur-xl" style={{ top: "env(safe-area-inset-top, 0px)" }}>
        <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold tracking-tight text-white">TrustLayer<span className="bg-gradient-to-r from-cyan-300 to-emerald-300 bg-clip-text text-transparent"> AI</span></span>
                <span className="hidden rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9.5px] tracking-widest text-slate-400 sm:inline">FORENSIC AI LAB</span>
              </div>
              <div className="text-[11.5px] text-slate-400">Verification &amp; hallucination-detection engine for AI outputs</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/[0.06] px-2.5 py-1 font-mono text-[10.5px] text-emerald-300 md:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 tl-blink" /> ENGINE ONLINE · {KB.length} INDEXED CLAIMS
            </span>
            <button type="button" onMouseDown={noFocus} onClick={() => { flash('help'); setShowHelp(true); }}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 hover:border-cyan-400/40 hover:bg-cyan-400/10">
              <Keyboard className="h-4 w-4" /> Shortcuts <Kbd small active={pressed.help}>?</Kbd>
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto grid max-w-[1560px] grid-cols-1 gap-5 px-4 pb-44 pt-5 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* ============================ LEFT: INPUT ============================ */}
        <section aria-label="Audit input" className="flex flex-col gap-4 lg:sticky lg:top-[76px] lg:max-h-[calc(100vh-200px)] lg:self-start lg:overflow-y-auto tl-scroll lg:pr-1">
          <div className="tl-card rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><FileText className="h-4 w-4 text-cyan-300" /> Audit Input</h2>
              <span className="font-mono text-[10px] tracking-widest text-slate-500">STEP 1 OF 2</span>
            </div>

            {/* Target model */}
            <div className="mb-4">
              <FieldLabel htmlFor="tl-model" badge="REQUIRED" tone="cyan">TARGET AI MODEL</FieldLabel>
              <div className="relative">
                <Cpu className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select id="tl-model" value={model} onChange={(e) => setModel(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-[#0B1220] py-2.5 pl-9 pr-9 text-sm text-slate-100 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20">
                  {MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              <p className="mt-1.5 text-[11.5px] text-slate-400">The model that produced the response. Recorded in the audit report.</p>
            </div>

            {/* Prompt */}
            <div className="mb-4">
              <FieldLabel htmlFor="tl-prompt" badge={prompt.trim() ? 'DRIFT CHECK ON' : 'OPTIONAL'} tone={prompt.trim() ? 'emerald' : 'slate'}>OPTIONAL USER PROMPT / CONTEXT</FieldLabel>
              <div className="relative">
                <MessageSquare className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input id="tl-prompt" type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. Is turmeric effective for type 2 diabetes?"
                  className="w-full rounded-xl border border-white/10 bg-[#0B1220] py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20" />
              </div>
              <p className="mt-1.5 text-[11.5px] text-slate-400">Lets TrustLayer detect whether the AI drifted off-topic from what was actually asked.</p>
            </div>

            {/* Response */}
            <div>
              <FieldLabel htmlFor="tl-response" badge={!text.trim() ? 'EMPTY' : stale ? 'EDITED · RE-RUN' : 'READY'} tone={!text.trim() ? 'rose' : stale ? 'amber' : 'emerald'}>AI RESPONSE TO AUDIT</FieldLabel>
              <textarea id="tl-response" ref={textareaRef} value={text} onChange={(e) => { setText(e.target.value); setActivePreset(null); }}
                placeholder="Paste the AI-generated answer you want to verify…" spellCheck={false}
                className="tl-scroll w-full resize-none rounded-xl border border-white/10 bg-[#0B1220] p-3.5 text-[13.5px] leading-relaxed text-slate-100 placeholder-slate-500 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                style={{ minHeight: 180 }} aria-describedby="tl-response-help tl-counters" />
              <div id="tl-counters" className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10.5px]">
                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-slate-300">CHARS <b className="text-white">{chars.toLocaleString()}</b></span>
                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-slate-300">WORDS <b className="text-white">{words.toLocaleString()}</b></span>
                <span className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-cyan-200">DETECTED CLAIMS <b className="text-white">{liveClaims}</b></span>
              </div>
              <p id="tl-response-help" className="mt-1.5 text-[11.5px] text-slate-400">Each sentence becomes an individually verified claim. Press <Kbd small>{modKey}</Kbd> + <Kbd small>Enter</Kbd> from anywhere to run.</p>
            </div>

            <button type="button" onClick={() => { flash('run'); runAudit(); }} disabled={running}
              className={`mt-5 flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-3 text-sm font-bold tracking-wide text-slate-950 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-80 ${!running ? 'tl-glow' : ''}`}>
              {running ? <ScanLine className="h-4 w-4 tl-blink" /> : <Play className="h-4 w-4" fill="currentColor" />}
              {running ? `AUDITING · ${STAGES[stage].toUpperCase()}` : '[RUN AUDIT]'}
              <span className="ml-1 inline-flex items-center gap-1 rounded-md bg-slate-950/20 px-1.5 py-0.5">
                <KeyCombo keys={[modKey, 'Enter']} active={pressed.run} small />
              </span>
            </button>
          </div>

          {/* Presets */}
          <div className="tl-card rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Layers className="h-4 w-4 text-cyan-300" /> [LOAD DEMO PRESETS]</h2>
              <span className="font-mono text-[10px] tracking-widest text-slate-500">ALT + 1 / 2 / 3</span>
            </div>
            <div className="grid gap-2">
              {PRESETS.map((p, i) => {
                const Icon = p.Icon;
                const on = activePreset === p.id;
                return (
                  <button key={p.id} type="button" onClick={() => { flash(`preset${i + 1}`); loadPreset(i); }}
                    className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${on ? 'border-cyan-400/50 bg-cyan-400/[0.08]' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'}`}>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${i === 0 ? 'bg-rose-500/15 text-rose-300' : i === 1 ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-slate-100">{i + 1}. {p.name}</span>
                      <span className="block truncate text-[11px] text-slate-400">{p.tag} · {MODELS.find((m) => m.value === p.model).label}</span>
                    </span>
                    <KeyCombo keys={['Alt', String(i + 1)]} active={pressed[`preset${i + 1}`]} small />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-[11px] leading-relaxed text-slate-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
            <span>Runs fully in your browser: a sentence-level claim parser, hallucination-signal heuristics (absolutes, fabricated precision, vague authority, future-as-fact) and a curated reference index. Treat results as triage, not a substitute for expert review.</span>
          </div>
        </section>

        {/* ============================ RIGHT: RESULTS ============================ */}
        <section aria-label="Audit results" className="flex min-w-0 flex-col gap-4">
          <PipelineBar phase={phase} stage={stage} durationMs={durationMs} />

          {/* Metrics */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="tl-card flex flex-col items-center rounded-2xl p-4">
              <div className="mb-2 flex w-full items-center justify-between font-mono text-[10.5px] font-bold tracking-[0.14em] text-slate-300">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-cyan-300" /> OVERALL TRUST</span>
                {result && !running && <span className="text-slate-500">{MODELS.find((m) => m.value === result.model)?.label.split(' ')[0]}</span>}
              </div>
              <RadialGauge value={result ? result.trust : 0} running={running} />
              <div className="mt-2 text-center text-[12.5px] font-semibold" style={{ color: result && !running ? scoreColor(result.trust) : '#94A3B8' }}>
                {running ? 'Computing…' : trustLabel}
              </div>
            </div>

            <div className="tl-card flex flex-col items-center rounded-2xl p-4">
              <div className="mb-1 flex w-full items-center justify-between font-mono text-[10.5px] font-bold tracking-[0.14em] text-slate-300">
                <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-cyan-300" /> EPISTEMIC HUMILITY</span>
                <span className="text-slate-100">{result && !running ? result.humility : '—'}</span>
              </div>
              <SemiGauge value={result ? result.humility : 0} running={running} />
              <div className="mt-1 text-center text-[12.5px] font-semibold" style={{ color: result && !running ? scoreColor(result.humility) : '#94A3B8' }}>
                {running ? 'Measuring hedging…' : humLabel}
              </div>
              {result && !running && (
                <div className="mt-2 grid w-full grid-cols-2 gap-1.5 text-center font-mono text-[10px]">
                  <span className="rounded-md bg-white/[0.04] py-1 text-slate-400">HEDGED <b className="text-emerald-300">{result.hedgedCount}</b></span>
                  <span className="rounded-md bg-white/[0.04] py-1 text-slate-400">OVERCONFIDENT <b className="text-rose-300">{result.overconfident}</b></span>
                  <span className={`col-span-2 rounded-md py-1 ${!result.drift ? 'bg-white/[0.04] text-slate-500' : result.drift.level === 'on-topic' ? 'bg-emerald-500/10 text-emerald-300' : result.drift.level === 'partial' ? 'bg-amber-500/10 text-amber-300' : 'bg-rose-500/10 text-rose-300'}`}>
                    {!result.drift ? 'TOPIC DRIFT · NO PROMPT GIVEN' : `TOPIC RELEVANCE ${result.drift.relevance}% · ${result.drift.level.toUpperCase()}`}
                  </span>
                </div>
              )}
            </div>

            <div className="tl-card rounded-2xl p-4">
              <div className="mb-1 flex items-center justify-between font-mono text-[10.5px] font-bold tracking-[0.14em] text-slate-300">
                <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-cyan-300" /> CONFIDENCE DISTRIBUTION</span>
                <span className="text-slate-100">{result && !running ? `${result.total} claims` : '—'}</span>
              </div>
              <DistributionChart counts={result ? result.counts : { verified: 0, unsupported: 0, uncertain: 0 }} total={result ? result.total : 0} running={running || !result} />
            </div>
          </div>

          {/* Views + Inspector */}
          <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="tl-card min-w-0 rounded-2xl">
              <div role="tablist" aria-label="Result views" className="flex items-center gap-1 border-b border-white/[0.06] p-2">
                {VIEWS.map((v, i) => {
                  const Icon = v.Icon; const on = view === v.id;
                  return (
                    <button key={v.id} role="tab" aria-selected={on} type="button" onMouseDown={noFocus} onClick={() => { flash(`view${i + 1}`); setView(v.id); }}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-[12.5px] font-semibold transition ${on ? 'bg-white/[0.07] text-white shadow-inner' : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'}`}>
                      <Icon className={`h-4 w-4 ${on ? 'text-cyan-300' : ''}`} />
                      <span className="hidden whitespace-nowrap sm:inline 2xl:hidden">{v.short}</span><span className="hidden whitespace-nowrap 2xl:inline">{v.label}</span>
                      <Kbd small active={pressed[`view${i + 1}`] || (on && pressed.view)}>{i + 1}</Kbd>
                    </button>
                  );
                })}
              </div>

              <div className="relative p-5">
                {stale && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/[0.07] px-3 py-2 text-[12px] text-amber-200">
                    <AlertTriangle className="h-4 w-4" /> Input changed since this audit. Press <KeyCombo keys={[modKey, 'Enter']} small /> to re-run.
                  </div>
                )}

                {!result && !running && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"><Search className="h-8 w-8 text-slate-500" /></div>
                    <div className="text-sm font-semibold text-slate-200">No audit yet</div>
                    <p className="mt-1 max-w-sm text-[12.5px] text-slate-400">Paste an AI response and press <Kbd small>{modKey}</Kbd> + <Kbd small>Enter</Kbd>, or load a demo preset with <Kbd small>Alt</Kbd> + <Kbd small>1</Kbd>.</p>
                  </div>
                )}

                {running && (
                  <div className="relative min-h-[240px] overflow-hidden rounded-xl border border-cyan-400/20 bg-cyan-400/[0.02] p-4">
                    <div className="tl-scanline absolute left-0 right-0 h-10 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent">
                      <div className="absolute left-0 right-0 top-1/2 h-px bg-cyan-300 shadow-[0_0_12px_2px_rgba(34,211,238,0.7)]" />
                    </div>
                    <p className="whitespace-pre-wrap text-[14px] leading-8 text-slate-500">{text}</p>
                  </div>
                )}

                {result && !running && view === 'canvas' && (
                  <div className="tl-fade-up">
                    <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      {Object.keys(STATUS).map((k) => (
                        <span key={k} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: STATUS[k].color }} />{STATUS[k].long}</span>
                      ))}
                      <span className="ml-auto inline-flex items-center gap-1">Navigate <Kbd small active={pressed.prev}>↑</Kbd><Kbd small active={pressed.next}>↓</Kbd></span>
                    </div>
                    <div className="whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-[#0B1220]/70 p-4 text-[14.5px] leading-[2.1] text-slate-200">
                      {(() => {
                        const out = []; let pos = 0; const src0 = result.inputText;
                        result.segments.forEach((seg, si) => {
                          if (seg.start > pos) out.push(<span key={`g${si}`}>{src0.slice(pos, seg.start)}</span>);
                          if (seg.claimIndex < 0) out.push(<span key={`s${si}`} className="text-slate-400">{seg.text}</span>);
                          else {
                            const c = result.claims[seg.claimIndex]; const m = STATUS[c.status]; const sel = selected === c.id;
                            out.push(
                              <span key={`s${si}`} ref={(el) => { sentenceRefs.current[c.id] = el; }} role="button" tabIndex={0}
                                aria-label={`Claim ${c.id + 1}: ${m.long}`} aria-pressed={sel}
                                onMouseDown={noFocus} onClick={() => setSelected(c.id)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(c.id); } }}
                                className="cursor-pointer rounded-md px-0.5 transition-all duration-200 hover:brightness-125"
                                style={{
                                  textDecorationLine: 'underline', textDecorationColor: m.color, textDecorationThickness: sel ? '3px' : '2px',
                                  textUnderlineOffset: '6px', backgroundColor: sel ? `${m.color}2E` : `${m.color}12`,
                                  boxShadow: sel ? `0 0 0 1px ${m.color}99, 0 0 18px ${m.color}40` : 'none',
                                  WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone',
                                }}>
                                <sup className="mr-0.5 select-none rounded px-1 font-mono text-[9px] font-bold" style={{ background: m.color, color: '#0B1220' }}>{c.id + 1}</sup>
                                {seg.text}
                              </span>,
                            );
                          }
                          pos = seg.end;
                        });
                        if (pos < src0.length) out.push(<span key="tail">{src0.slice(pos)}</span>);
                        return out;
                      })()}
                    </div>
                    {result.claims.length === 0 && <p className="mt-3 text-[12.5px] text-slate-400">No verifiable claims detected (sentences need at least 4 words).</p>}
                  </div>
                )}

                {result && !running && view === 'evidence' && (
                  <div className="tl-fade-up space-y-2">
                    {result.claims.map((c) => {
                      const m = STATUS[c.status]; const sel = selected === c.id; const list = c.status === 'unsupported' ? c.counter : c.sources;
                      return (
                        <button key={c.id} type="button" onMouseDown={noFocus} onClick={() => setSelected(c.id)}
                          className={`w-full rounded-xl border p-3 text-left transition ${sel ? 'border-cyan-400/50 bg-cyan-400/[0.05]' : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15'}`}>
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[10px] font-bold" style={{ background: m.color, color: '#0B1220' }}>{c.id + 1}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] leading-snug text-slate-200">{c.text}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <StatusChip status={c.status} />
                                <span className="font-mono text-[10.5px] text-slate-400">CONF {c.confidence}%</span>
                                {c.danger && <span className="rounded-full border border-rose-400/40 bg-rose-500/15 px-2 py-0.5 font-mono text-[10px] text-rose-200">SAFETY RISK</span>}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {c.status === 'unsupported' && <span className="rounded-md border border-rose-500/30 bg-rose-500/[0.08] px-2 py-0.5 font-mono text-[10.5px] text-rose-200">&quot;No credible primary source found&quot;</span>}
                                {list.map((s) => (
                                  <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10.5px] hover:text-white ${c.status === 'unsupported' ? 'border-sky-400/25 bg-sky-400/[0.06] text-sky-200' : 'border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-200'}`}>
                                    {c.status === 'unsupported' ? 'counter: ' : ''}{s.domain} · {s.year} · {s.credibility}<ExternalLink className="h-3 w-3" />
                                  </a>
                                ))}
                                {c.status !== 'unsupported' && list.length === 0 && <span className="rounded-md border border-amber-400/25 bg-amber-400/[0.06] px-2 py-0.5 font-mono text-[10.5px] text-amber-200">No indexed source · needs context</span>}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {result && !running && view === 'rewrite' && (
                  <div className="tl-fade-up">
                    <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" />Kept + cited</span>
                      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />Hedged / qualified</span>
                      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400" />Corrected / retracted</span>
                      <button type="button" onClick={copyRewrite}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11.5px] text-slate-200 hover:border-cyan-400/40 hover:bg-cyan-400/10">
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copied' : 'Copy rewrite'}
                      </button>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-[#0B1220]/70 p-4 text-[14.5px] leading-[2] text-slate-200">
                      {result.rewrite.map((r) => {
                        const col = r.kind === 'corrected' ? '#FB7185' : r.kind === 'hedged' ? '#FBBF24' : r.kind === 'kept' ? '#FBBF24' : '#34D399';
                        return (
                          <span key={r.id} onClick={() => setSelected(r.id)}
                            className={`cursor-pointer rounded px-0.5 transition ${selected === r.id ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'}`}
                            style={{ borderBottom: `1.5px dashed ${col}80` }}>
                            {r.text}
                            {r.cites.map((n) => (
                              <a key={n} href={result.refs[n - 1].url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                                className="ml-0.5 align-super font-mono text-[10px] font-bold text-cyan-300 hover:text-white">[{n}]</a>
                            ))}{' '}
                          </span>
                        );
                      })}
                    </div>
                    <div className="mt-4">
                      <div className="mb-2 font-mono text-[10.5px] font-bold tracking-[0.14em] text-slate-300">REFERENCES</div>
                      <ol className="space-y-1.5">
                        {result.refs.map((s, i) => (
                          <li key={s.url} className="flex gap-2 text-[12px]">
                            <span className="font-mono text-cyan-300">[{i + 1}]</span>
                            <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white hover:underline">
                              {s.title} <span className="text-slate-500">— {s.domain}, {s.year}</span>
                            </a>
                          </li>
                        ))}
                        {result.refs.length === 0 && <li className="text-[12px] text-slate-500">No verifiable sources to cite.</li>}
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Inspector */}
            <aside aria-label="Claim inspector" className="tl-card h-fit rounded-2xl p-4 xl:sticky xl:top-[76px]">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-[10.5px] font-bold tracking-[0.14em] text-slate-300">
                  <Search className="h-3.5 w-3.5 text-cyan-300" /> EVIDENCE INSPECTOR
                </div>
                {claim && !running && (
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label="Previous claim" onMouseDown={noFocus} onClick={() => { flash('prev'); moveClaim(-1); }} className="rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-white"><ChevronUp className="h-4 w-4" /></button>
                    <span className="font-mono text-[10.5px] text-slate-400">{selected + 1}/{result.claims.length}</span>
                    <button type="button" aria-label="Next claim" onMouseDown={noFocus} onClick={() => { flash('next'); moveClaim(1); }} className="rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-white"><ChevronDown className="h-4 w-4" /></button>
                  </div>
                )}
              </div>

              {(!claim || running) ? (
                <div className="py-10 text-center text-[12.5px] text-slate-500">{running ? 'Awaiting pipeline results…' : 'Select a highlighted claim to inspect its evidence.'}</div>
              ) : (
                <div key={`${claim.id}-${result.at.getTime()}`} className="tl-fade-up space-y-4">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <StatusChip status={claim.status} size="md" />
                      {claim.danger && <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/40 bg-rose-500/15 px-2 py-0.5 text-[10.5px] font-semibold text-rose-200"><AlertTriangle className="h-3 w-3" />Safety risk</span>}
                    </div>
                    <blockquote className="rounded-xl border-l-2 bg-white/[0.03] p-3 text-[13px] leading-relaxed text-slate-200" style={{ borderColor: STATUS[claim.status].color }}>
                      &ldquo;{claim.text}&rdquo;
                    </blockquote>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between font-mono text-[10px] tracking-wider text-slate-400">
                      <span>VERDICT CONFIDENCE</span><span className="font-bold" style={{ color: STATUS[claim.status].color }}>{claim.confidence}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${claim.confidence}%`, background: STATUS[claim.status].color }} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {claim.kbId && <span className="rounded-md border border-cyan-400/25 bg-cyan-400/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-cyan-200">INDEX MATCH</span>}
                    {claim.signals.hedged && <span className="rounded-md border border-emerald-400/25 bg-emerald-400/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-emerald-200">HEDGED: {claim.signals.hedges.slice(0, 3).join(', ')}</span>}
                    {claim.signals.absolutes.length > 0 && <span className="rounded-md border border-rose-400/25 bg-rose-400/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-rose-200">ABSOLUTES: {claim.signals.absolutes.slice(0, 3).join(', ')}</span>}
                    {claim.signals.preciseStat && <span className="rounded-md border border-amber-400/25 bg-amber-400/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-amber-200">PRECISE STAT</span>}
                    {(claim.signals.vagueAuthority || claim.signals.namedAuthority) && <span className="rounded-md border border-amber-400/25 bg-amber-400/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-amber-200">UNTRACEABLE AUTHORITY</span>}
                    {claim.signals.futureFact && <span className="rounded-md border border-amber-400/25 bg-amber-400/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-amber-200">FUTURE AS FACT</span>}
                  </div>

                  <div>
                    <div className="mb-1.5 font-mono text-[10px] font-bold tracking-[0.14em] text-slate-400">ANALYSIS</div>
                    <ul className="space-y-1.5 text-[12.5px] leading-relaxed text-slate-300">
                      {claim.kbNote && <li className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan-300" />{claim.kbNote}</li>}
                      {claim.reasons.map((r) => <li key={r} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-500" />{r}</li>)}
                    </ul>
                  </div>

                  <div>
                    <div className="mb-1.5 font-mono text-[10px] font-bold tracking-[0.14em] text-slate-400">EVIDENCE &amp; SOURCES</div>
                    <div className="space-y-2">
                      {claim.status === 'unsupported' && <NoSourceBanner />}
                      {claim.status !== 'unsupported' && claim.sources.map((s) => <SourceCard key={s.url} s={s} />)}
                      {claim.status !== 'unsupported' && claim.sources.length === 0 && (
                        <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.05] p-3 text-[12px] text-amber-200/90">No indexed source matched. Verify externally or add context before relying on this statement.</div>
                      )}
                      {claim.status === 'unsupported' && claim.counter.length > 0 && (
                        <>
                          <div className="pt-1 font-mono text-[9.5px] tracking-wider text-sky-300/80">COUNTER-EVIDENCE</div>
                          {claim.counter.map((s) => <SourceCard key={s.url} s={s} tone="counter" />)}
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-[0.14em] text-slate-400"><Wand2 className="h-3 w-3" /> CALIBRATED PHRASING</div>
                    <p className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-[12.5px] italic leading-relaxed text-slate-200">{claim.rewrite}</p>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </section>
      </main>

      {/* ------------------------- LABELED KEYBOARD COMMAND DOCK ------------------------- */}
      <nav aria-label="Keyboard command dock" className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.08] bg-[#0A0F1A]/90 backdrop-blur-xl" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="tl-scroll mx-auto flex max-w-[1560px] items-stretch gap-3 overflow-x-auto px-4 py-2.5 sm:px-6">
          <div className="hidden shrink-0 flex-col justify-center pr-1 lg:flex">
            <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-[0.16em] text-slate-300"><Keyboard className="h-3.5 w-3.5 text-cyan-300" /> COMMAND DOCK</span>
            <span className="text-[10px] text-slate-500">Press keys or click</span>
          </div>
          {dockGroups.map((g) => (
            <div key={g.title} className="flex shrink-0 flex-col gap-1 border-l border-white/[0.06] pl-3">
              <span className="font-mono text-[9px] font-semibold tracking-[0.16em] text-slate-500">[{g.title}]</span>
              <div className="flex gap-1.5">
                {g.items.map((it) => (
                  <button key={it.id} type="button" onMouseDown={noFocus} onClick={() => { flash(it.id); it.act(); }} title={`${it.keys.join(' + ')} — ${it.label}`}
                    className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10.5px] font-semibold tracking-wide transition ${it.primary ? 'border-cyan-400/50 bg-gradient-to-r from-cyan-400/20 to-emerald-400/20 text-cyan-100 hover:from-cyan-400/30 hover:to-emerald-400/30' : it.on ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-100' : 'border-white/[0.08] bg-white/[0.03] text-slate-300 hover:border-white/20 hover:text-white'}`}>
                    <KeyCombo keys={it.keys} active={pressed[it.id]} small />
                    <span className="whitespace-nowrap">{it.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* ------------------------------ SHORTCUT OVERLAY ------------------------------ */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowHelp(false)} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
          <div className="tl-card tl-fade-up w-full max-w-lg rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-semibold text-white"><Keyboard className="h-5 w-5 text-cyan-300" /> Keyboard Shortcuts</h3>
              <button type="button" onClick={() => setShowHelp(false)} aria-label="Close" className="rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <ul className="divide-y divide-white/[0.06]">
              {[
                { keys: [modKey, 'Enter'], label: 'RUN AUDIT', id: 'run' },
                { keys: ['Alt', '1'], label: 'LOAD PRESET · Medical Hallucination', id: 'preset1' },
                { keys: ['Alt', '2'], label: 'LOAD PRESET · Financial Stats Fabrication', id: 'preset2' },
                { keys: ['Alt', '3'], label: 'LOAD PRESET · Well-Calibrated Scientific', id: 'preset3' },
                { keys: ['↑'], label: 'PREVIOUS CLAIM', id: 'prev' },
                { keys: ['↓'], label: 'NEXT CLAIM', id: 'next' },
                { keys: ['Tab'], label: 'CYCLE VIEW (Shift+Tab reverses)', id: 'view' },
                { keys: ['1'], label: 'VIEW · Audit Canvas', id: 'view1' },
                { keys: ['2'], label: 'VIEW · Evidence Log', id: 'view2' },
                { keys: ['3'], label: 'VIEW · Calibrated Rewrite', id: 'view3' },
                { keys: ['Esc'], label: 'CLEAR / RESET WORKSPACE (closes this first)', id: 'reset' },
                { keys: ['?'], label: 'TOGGLE THIS OVERLAY', id: 'help' },
              ].map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4 py-2">
                  <span className="text-[12.5px] text-slate-300">{r.label}</span>
                  <KeyCombo keys={r.keys} active={pressed[r.id]} />
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] leading-relaxed text-slate-500">Arrow, number, Tab and ? shortcuts are paused while you type in a field — press Esc to leave the field first. {modKey}+Enter and Alt+1/2/3 work everywhere.</p>
          </div>
        </div>
      )}

      {toast && (
        <div className="tl-fade-up fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full border border-white/10 bg-[#111827] px-4 py-2 text-[12.5px] text-slate-100 shadow-xl" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
