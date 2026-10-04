// Measures quoted from the OneAquaHealth Catalogue of Measures
// (Deliverable D2.4, "Catalogue of measures for urban aquatic ecosystems rehabilitation", 2026).
// StreamChart does not invent measures: it formats the catalogue's own entries as care-plan lines.
// Section numbers and titles are the catalogue's; the short plain-language glosses are ours.

export type MeasureLine = 'First line (essential)' | 'Second line (structural)' | 'Third line (social)' | 'Fourth line (complementary)' | 'Compensatory';

export interface Measure {
  id: string;
  section: string;
  title: string;
  line: MeasureLine;
  plain: string;
}

export const CATALOGUE_SOURCE =
  'OneAquaHealth D2.4 — Catalogue of measures for urban aquatic ecosystems rehabilitation (University of Coimbra et al., 2026)';

export const MEASURES: Measure[] = [
  { id: 'm421', section: '4.2.1', title: 'In-stream self-purification enhancement', line: 'First line (essential)', plain: 'Help the stream clean itself: shade, riffles, natural bed.' },
  { id: 'm422', section: '4.2.2', title: 'Sewer system and point-source improvements', line: 'First line (essential)', plain: 'Inspect outfalls and misconnected drains upstream, then fix them.' },
  { id: 'm423', section: '4.2.3', title: 'Litter, plastic, and hydrocarbon control', line: 'First line (essential)', plain: 'Remove litter and stop it from reaching the water.' },
  { id: 'm411', section: '4.1.1', title: 'Passive riparian vegetation: allowing natural regeneration', line: 'First line (essential)', plain: 'Stop mowing a strip of bank and let plants come back.' },
  { id: 'm412', section: '4.1.2', title: 'Active riparian vegetation restoration: re-establishment riparian forest', line: 'First line (essential)', plain: 'Plant native trees and shrubs along the banks.' },
  { id: 'm413', section: '4.1.3', title: 'Constrained riparian vegetation corridors (“buffers”)', line: 'First line (essential)', plain: 'Keep a vegetated buffer between the water and roads or lawns.' },
  { id: 'm4312', section: '4.3.12', title: 'Live stakes planting', line: 'Second line (structural)', plain: 'Push living willow cuttings into the eroding bank.' },
  { id: 'm4313', section: '4.3.13', title: 'Live fascines', line: 'Second line (structural)', plain: 'Bundles of living branches that hold the toe of the bank.' },
  { id: 'm435', section: '4.3.5', title: 'Constructed riffles', line: 'Second line (structural)', plain: 'Small gravel steps that oxygenate and keep water moving.' },
  { id: 'm442', section: '4.4.2', title: 'Citizen Science and educational partnerships', line: 'Third line (social)', plain: 'Keep regular check-ups with residents and schools.' },
  { id: 'm444', section: '4.4.4', title: 'Regulatory and behavioural measures for pollution reduction', line: 'Third line (social)', plain: 'Remind neighbours not to pour or dump anything near the water.' },
  { id: 'm451', section: '4.5.1', title: 'Control / Removal of invasive species', line: 'Fourth line (complementary)', plain: 'Remove invasive plants once the main pressures are handled.' },
];

export const MEASURE_BY_ID = Object.fromEntries(MEASURES.map((m) => [m.id, m])) as Record<string, Measure>;
