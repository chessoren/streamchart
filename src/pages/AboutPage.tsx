import { PHOTO_CREDITS } from '../domain/world';
import { CATALOGUE_SOURCE } from '../domain/catalogue';
import { Logo } from '../ui/kit';

const REAL = [
  'The 60-second check-up, with your own photo or a real sample photo',
  'The sealed comparison with the AI (live Gemini vision with your key; real recorded Gemini answers without one) and its SHA-256 seals',
  'Confidence grades A–D, computed by displayed rules',
  'States, hypotheses and the care-plan proposal, computed by the engine from the record',
  'The seven-day indication, reading a live Open-Meteo forecast for Toulouse',
  'The co-signature and the change from “proposed” to “validated”',
  'Replies to citizens, the stream’s voice (grounded sentence by sentence), the HL7 FHIR R4 export — accepted by the public HAPI FHIR server',
];
const DEMO = [
  'People (Mathis, Léa, Inès, Camille…) and their past check-ups; the five-city Stream Cup numbers',
  'Dr Ferreira, referent ecologist, is a role-play: no real ecologist has signed anything',
  'The emergency scene: scripted citizens and a scripted heatwave in accelerated time (the engine is real)',
  'Photos are real urban streams from Wikimedia Commons, used as stand-ins; stream states are not claims about those places',
  'Background measures (temperature, conductivity) shown in timelines',
];

export function AboutPage() {
  return (
    <div className="col" style={{ gap: 18, maxWidth: 900 }}>
      <div className="row" style={{ gap: 14 }}>
        <Logo size={70} />
        <div>
          <h1>Honesty & sources</h1>
          <p className="muted">When in doubt between an impressive sentence and an exact one, we chose the exact one.</p>
        </div>
      </div>
      <div className="grid2" style={{ alignItems: 'start' }}>
        <section className="card">
          <span className="pill real">Real and reproducible</span>
          <ul className="small" style={{ paddingLeft: 18, lineHeight: 1.6 }}>{REAL.map((x) => <li key={x}>{x}</li>)}</ul>
        </section>
        <section className="card">
          <span className="pill demo">Demonstration data</span>
          <ul className="small" style={{ paddingLeft: 18, lineHeight: 1.6 }}>{DEMO.map((x) => <li key={x}>{x}</li>)}</ul>
        </section>
      </div>
      <section className="card">
        <h2>What we do not claim</h2>
        <ul className="small" style={{ paddingLeft: 18, lineHeight: 1.6 }}>
          <li>No integration with OneAquaHealth systems: StreamChart is <b>designed to plug into</b> the Citizen Science App, the Decision Support System and DipteraCAST, and compatible with public guidelines.</li>
          <li>No diagnosis and no epidemiological forecast: hypotheses carry a confidence; the health indication is indicative, explained and dated.</li>
          <li>Grades are a proposed method, not a validated one. The AI can be wrong on a stream photo — and says “unsure” when it is.</li>
          <li>No official relationship with any city or school.</li>
        </ul>
      </section>
      <section className="card">
        <h2>Sources</h2>
        <ul className="small" style={{ paddingLeft: 18, lineHeight: 1.6 }}>
          <li>Care-plan measures: {CATALOGUE_SOURCE}.</li>
          <li>Indicators: OneAquaHealth citizen-science indicators judgeable without equipment (foam, colour, odour, flow, banks, riparian vegetation, litter).</li>
          <li>Weather: Open-Meteo forecast API (CC BY 4.0). AI: Google Gemini API, bring-your-own key.</li>
          <li>Standards: HL7 FHIR R4 (Patient, Location, QuestionnaireResponse, Observation, Media, Device, DiagnosticReport, RiskAssessment, CarePlan, Provenance, Communication).</li>
        </ul>
        <h3 style={{ marginTop: 12 }}>Photo credits (Wikimedia Commons)</h3>
        <ul className="tiny" style={{ paddingLeft: 18, lineHeight: 1.6 }}>
          {Object.entries(PHOTO_CREDITS).map(([k, c]) => (
            <li key={k}>
              <a href={c.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>“{c.title}”</a> — {c.author}, {c.license}{c.place !== '—' ? `, ${c.place}` : ''}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
