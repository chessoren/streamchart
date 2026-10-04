import type { FieldId, Register } from './types';

// The 60-second check-up asks only what a photo and a person on the bank can judge.
// Fields follow the OneAquaHealth citizen indicators that need no equipment:
// water colour/clarity, foam, odour, flow, banks and bed, bank vegetation, litter.

export interface Option {
  id: string;
  abnormal: boolean;
  icon: string;
  label: Record<Register, string>;
}

export interface Field {
  id: FieldId;
  oahIndicator: string;
  question: Record<Register, string>;
  hint: string; // what to look at, never what to think
  photoJudgeable: boolean;
  options: Option[];
  glossary?: { term: string; meaning: string };
}

export const FIELDS: Field[] = [
  {
    id: 'clarity',
    oahIndicator: 'Water colour and transparency',
    question: {
      child: 'What does the water look like?',
      curious: 'How clear is the water?',
      expert: 'Water transparency and colour',
    },
    hint: 'Look at the surface and, if you can, the bottom near the bank.',
    photoJudgeable: true,
    options: [
      { id: 'clear', abnormal: false, icon: 'droplet', label: { child: 'Clear, like a glass of water', curious: 'Clear, I can see the bottom', expert: 'Transparent, low turbidity' } },
      { id: 'cloudy', abnormal: true, icon: 'cloud', label: { child: 'Milky, like dirty milk', curious: 'Cloudy, with whitish deposits', expert: 'Elevated turbidity' } },
      { id: 'coloured', abnormal: true, icon: 'palette', label: { child: 'A strange colour (green, brown, grey)', curious: 'Unusual colour (green, brown, grey)', expert: 'Abnormal coloration' } },
    ],
    glossary: { term: 'Turbidity', meaning: 'How cloudy water is, because of particles floating in it.' },
  },
  {
    id: 'foam',
    oahIndicator: 'Foam on the water surface',
    question: { child: 'Do you see bubbles that stay, like soap?', curious: 'Is there foam on the water?', expert: 'Surface foam' },
    hint: 'Foam often gathers against stones, branches and walls.',
    photoJudgeable: true,
    options: [
      { id: 'none', abnormal: false, icon: 'circle', label: { child: 'No bubbles', curious: 'No foam', expert: 'Absent' } },
      { id: 'some', abnormal: true, icon: 'circle-dot', label: { child: 'A few bubbles', curious: 'A little foam here and there', expert: 'Localised, transient foam' } },
      { id: 'persistent', abnormal: true, icon: 'waves', label: { child: 'Lots of bubbles that stay', curious: 'Thick foam that stays', expert: 'Persistent foam accumulation' } },
    ],
  },
  {
    id: 'odour',
    oahIndicator: 'Water odour',
    question: { child: 'Does it smell?', curious: 'Does the water smell?', expert: 'Odour' },
    hint: 'Stay on the bank. Do not lean over the water.',
    photoJudgeable: false,
    options: [
      { id: 'none', abnormal: false, icon: 'wind', label: { child: 'No smell', curious: 'No particular smell', expert: 'None' } },
      { id: 'faint', abnormal: true, icon: 'sparkle', label: { child: 'A little smell', curious: 'A faint unusual smell', expert: 'Faint (musty, earthy)' } },
      { id: 'strong', abnormal: true, icon: 'alert', label: { child: 'A strong bad smell', curious: 'A strong smell (sewage, rotten egg, chemical)', expert: 'Strong (sewage, sulphide, chemical)' } },
    ],
  },
  {
    id: 'flow',
    oahIndicator: 'Water flow',
    question: { child: 'Is the water moving?', curious: 'How is the water flowing?', expert: 'Flow conditions' },
    hint: 'Watch a leaf or a bubble for a few seconds.',
    photoJudgeable: true,
    options: [
      { id: 'flowing', abnormal: false, icon: 'move-right', label: { child: 'It moves well', curious: 'Flowing normally', expert: 'Lotic, continuous flow' } },
      { id: 'slow', abnormal: false, icon: 'turtle', label: { child: 'It moves slowly', curious: 'Very slow', expert: 'Low flow velocity' } },
      { id: 'stagnant', abnormal: true, icon: 'pause', label: { child: 'It does not move', curious: 'Still water, pools or side arms', expert: 'Stagnant pools / lentic patches' } },
    ],
  },
  {
    id: 'banks',
    oahIndicator: 'Banks and bed condition',
    question: { child: 'What do the edges look like?', curious: 'How are the banks?', expert: 'Bank and bed morphology' },
    hint: 'Look at both sides of the stream.',
    photoJudgeable: true,
    options: [
      { id: 'natural', abnormal: false, icon: 'mountain', label: { child: 'Earth and plants, solid', curious: 'Natural and stable', expert: 'Natural, stable banks' } },
      { id: 'eroding', abnormal: true, icon: 'trending-down', label: { child: 'The earth is falling in', curious: 'Collapsing or eroding', expert: 'Active erosion / bank collapse' } },
      { id: 'artificial', abnormal: false, icon: 'brick', label: { child: 'Concrete or stone walls', curious: 'Concrete or walls', expert: 'Artificialised (concrete, riprap)' } },
    ],
  },
  {
    id: 'vegetation',
    oahIndicator: 'Riparian vegetation',
    question: { child: 'Are there plants along the water?', curious: 'Is there vegetation on the banks?', expert: 'Riparian vegetation cover' },
    hint: 'Trees, bushes and grass on the edges count.',
    photoJudgeable: true,
    options: [
      { id: 'dense', abnormal: false, icon: 'trees', label: { child: 'Lots of plants and trees', curious: 'Dense, with trees and bushes', expert: 'Continuous riparian cover' } },
      { id: 'sparse', abnormal: false, icon: 'sprout', label: { child: 'A few plants', curious: 'Sparse', expert: 'Discontinuous cover' } },
      { id: 'absent', abnormal: true, icon: 'square', label: { child: 'Almost no plants', curious: 'Almost none', expert: 'Absent riparian cover' } },
    ],
    glossary: { term: 'Riparian', meaning: 'Everything that grows on the banks of a river.' },
  },
  {
    id: 'litter',
    oahIndicator: 'Litter and waste',
    question: { child: 'Is there rubbish?', curious: 'Is there litter in or near the water?', expert: 'Anthropogenic litter' },
    hint: 'Bottles, bags, green waste dumped on the bank.',
    photoJudgeable: true,
    options: [
      { id: 'none', abnormal: false, icon: 'check', label: { child: 'No rubbish', curious: 'None', expert: 'None observed' } },
      { id: 'some', abnormal: true, icon: 'trash', label: { child: 'A few bits of rubbish', curious: 'A few items', expert: 'Scattered items' } },
      { id: 'lots', abnormal: true, icon: 'trash-2', label: { child: 'Lots of rubbish', curious: 'A lot', expert: 'Accumulation' } },
    ],
  },
];

export const SURROUNDINGS = ['Park', 'Housing', 'Road', 'Parking', 'Shops', 'Industry', 'Farmland', 'School'];

export const FIELD_BY_ID = Object.fromEntries(FIELDS.map((f) => [f.id, f])) as Record<FieldId, Field>;

export function optionOf(field: FieldId, value: string | undefined): Option | undefined {
  return FIELD_BY_ID[field].options.find((o) => o.id === value);
}

export function isAbnormal(field: FieldId, value: string | undefined): boolean {
  return !!optionOf(field, value)?.abnormal;
}

export function labelOf(field: FieldId, value: string | undefined, reg: Register): string {
  if (value === 'unsure') return reg === 'child' ? 'I cannot tell' : reg === 'expert' ? 'Indeterminate' : 'Not sure';
  return optionOf(field, value)?.label[reg] ?? '—';
}

export const FIELD_SHORT: Record<FieldId, string> = {
  clarity: 'Water',
  foam: 'Foam',
  odour: 'Odour',
  flow: 'Flow',
  banks: 'Banks',
  vegetation: 'Vegetation',
  litter: 'Litter',
};
