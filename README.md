# StreamChart

**Every patient has a chart. Now every stream does.**

StreamChart gives every urban stream what medicine gives every patient: a record, regular check-ups, a hypothesis with a stated confidence, a care plan signed by a qualified human, and a follow-up until recovery. Citizens are no longer left wondering what became of their observation: every check-up sooner or later produces a visible reply.

- **Live demo:** https://streamchart-oneaquahealth.netlify.app
- **Hackathon:** OneAquaHealth IEEE Global Hackathon 2026. Primary track: **Track 7, Digital Health Standards**. Also covers Tracks 3 (AI-supported assessment), 2 (data-to-insight) and 5 (community).
- **AI:** Google Gemini vision, bring your own key (Settings). Without a key, the sample photos replay real Gemini answers recorded in advance, and they are labelled as such.

> Demonstration data. The people, past check-ups and the emergency scene are demo data and are labelled as such everywhere. The photos are real urban streams (Wikimedia Commons, CC BY-SA). The AI calls, the weather forecast, the confidence grades, the state engine and the FHIR export are real.

## The idea in one table

| Medicine | StreamChart |
|---|---|
| Patient | A stream reach |
| Medical record | The stream's chart |
| Consultation | The 60-second check-up |
| Level of evidence | Confidence grade A–D |
| Diagnosis | Hypothesis (never a diagnosis) |
| Prescription | Care plan from the OneAquaHealth catalogue of measures |
| Doctor's signature | Co-signature by the referent ecologist |
| Follow-up visit | Follow-up check-up from the same viewpoint |
| Recovery | Remission |

## What works (try it)

1. **Patients dashboard.** 14 streams in the Toulouse metropolitan area, coloured by state (stable, under watch, alert, not followed). *“14 streams, 6 are waiting for someone.”*
2. **The 60-second check-up.** Safety reminder, one photo, seven large-button questions in three language levels (Child / Curious / Expert), then the citizen **seals** their answers.
3. **The sealed AI second look.** Gemini looks at the photo while the citizen answers. Its answer is hashed (SHA-256) when it arrives and revealed only after the citizen seals their own (commit–reveal). Differences are highlighted on the photo. The citizen keeps their answer, adopts the AI's, or asks for a second opinion: the last word is theirs. The AI is allowed to say “unsure”. It always says so for odour, which a photo cannot carry.
4. **Confidence grades A–D**, computed by displayed rules: photo, person–AI agreement, corroboration by neighbours, reliability of the person's eye, validation by an expert, and unresolved contradictions.
5. **Hypotheses with a confidence and their reasons** (*“possible input of wastewater or polluted runoff — confidence medium”*), with what would confirm them.
6. **Seven-day One Health indication.** Stagnant water combined with a **live Open-Meteo forecast** gives a dated, explained indication of conditions favourable to mosquitoes. It is explicitly *not an epidemiological forecast*, and there is a slot for the project's DipteraCAST predictions.
7. **Care plan** of at most five lines, taken from the OneAquaHealth **D2.4 Catalogue of measures** (real section numbers and titles). It stays *proposed* until the referent ecologist **signs** it, and she can remove lines first.
8. **Closing the loop.** Each contributing citizen gets a personal reply: *“Your check-up on Tuesday triggered an inspection…”*. A follow-up check-up after the intervention puts the stream **in remission**, with a recovery curve and a before/after slider.
9. **The stream's voice.** A first-person account in three registers, grounded sentence by sentence: tap a sentence to see the check-up it comes from. It never names a culprit, never gives health advice and never says the water is safe.
10. **Ward room** for city services: every stream sorted by urgency, three lines each, average grade and proposed measures.
11. **Emergency scene:** a 60-second accelerated simulation, labelled as such, running the real engine from the first photo to the signature.
12. **HL7 FHIR R4 export** of any chart as a transaction Bundle, with a button that posts it to the public HAPI FHIR R4 server.
13. **Signs & school kit:** a printable “patient file” sign with a QR code at the foot of each stream, and a one-page kit for schools to adopt a stream.

## FHIR R4 model (Track 7)

| Concept | Resource |
|---|---|
| The stream | `Patient`, carrying an `environmental-subject` extension (the metaphor made literal; R4 `CarePlan`, `DiagnosticReport` and `RiskAssessment` need a Patient or Group subject), plus `Location` for its geography |
| The 60-second form | `Questionnaire` / `QuestionnaireResponse` (sealed hash in an extension) |
| Each answer | `Observation`, with a `confidence-grade` extension and `derivedFrom` the QuestionnaireResponse and `Media` |
| The AI's look | `Observation` produced by a `Device` (the model), with its own seal hash |
| Who did what | `Provenance` (citizen = author, AI = informant) with a signature carrying the seal |
| Hypothesis | `DiagnosticReport` (`preliminary` until signed) |
| Seven-day indication | `RiskAssessment` (qualitative risk, `whenPeriod`, rationale) |
| Care plan | `CarePlan` (`draft`/`proposal` → `active`/`plan` → `completed`), activities coded with D2.4 section numbers |
| Co-signature | `Provenance` with a *Verification Signature* by the ecologist (`Practitioner`) |
| Reply to the citizen | `Communication` |

## Architecture

```
src/domain/   pure TypeScript, no UI: the medical logic of a stream
  fields.ts      the 60-second check-up (OAH citizen indicators, 3 language levels)
  engine.ts      findings, grades A–D, states, hypotheses, 7-day risk, voice, pulse
  world.ts       seed data + actions (submit check-up, sign plan, intervention, remission)
  ai.ts          Gemini vision call (structured output), recorded answers, offline fallback
  fhir.ts        HL7 FHIR R4 transaction Bundle
  sha256.ts      synchronous SHA-256 + canonical JSON for the seals
  catalogue.ts   measures quoted from OneAquaHealth D2.4
src/pages/    the screens (React)
scripts/      record-ai.ts (records real Gemini answers), shots/walkthrough (Playwright QA)
```

- A static single-page app (React 18, TypeScript, Vite). The browser calls Gemini and Open-Meteo directly, so it needs no server and no secrets.
- The domain layer is pure and covered by tests, including the whole story of the brief: forgotten → watch → alert → signed → remission.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # engine, FHIR and SHA-256 tests
npm run build
```

To re-record the sample AI answers: `GEMINI_API_KEY=... npx vite-node scripts/record-ai.ts`.

## Honesty

- **Real:** the check-up, the sealed comparison with the AI, the grades, states, hypotheses, care-plan proposal, the live weather reading, the co-signature, the replies to citizens, the voice and the FHIR export.
- **Demonstration:** the people and their past check-ups, Dr Ferreira (a role-play; no real ecologist has signed anything), the scripted heatwave of the emergency scene, the Stream Cup numbers for the four other cities, and the background measures. The photos stand in for the demo streams; the stream states make no claim about the places shown.
- **Not claimed:** no integration with OneAquaHealth systems (StreamChart is *designed to plug into* the Citizen Science App, the DSS and DipteraCAST). No diagnosis or epidemiological forecast. The grades are a proposed method that has not been validated.

## Credits

- Measures: OneAquaHealth D2.4, *Catalogue of measures for urban aquatic ecosystems rehabilitation* (University of Coimbra et al.).
- Weather: Open-Meteo (CC BY 4.0). AI: Google Gemini API.
- Photos (Wikimedia Commons): “Passage du ruisseau de Maltemps sous le canal latéral” (CC BY-SA 4.0); “Marcaissonne” and “Marcaissonne à Toulouse” by Adrianstork (CC BY-SA 4.0); “Toulouse – Bords de la Sausse” by Olybrius (CC BY-SA 3.0); “Toulouse – Sausse” by Anicius Olybrius (CC BY-SA 2.0); “Accumulation de mousse, pollution, Deûle” by Lamiot (CC BY-SA 4.0); “Stream of stagnant water” (CC BY-SA 4.0); “Nature's Silent Struggle” by Jemir Shamir (CC BY-SA 4.0).

MIT licence for the code.
