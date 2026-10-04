import { FIELDS, FIELD_BY_ID, labelOf } from './fields';
import { MEASURE_BY_ID, CATALOGUE_SOURCE } from './catalogue';
import { checkupGrade, findingsOf, hypothesesOf, nowOf, riskOf, stateOf, STATE_LABEL } from './engine';
import { sha256 } from './sha256';
import type { World } from './types';

// HL7 FHIR R4 export of a stream's chart.
// Modelling choice: the stream reach is a FHIR Patient (the metaphor made literal) AND a Location.
// R4 workflow resources — CarePlan, DiagnosticReport, RiskAssessment — require a Patient or Group subject;
// representing the reach as a Patient lets any FHIR server, viewer or analytics pipeline treat it with no
// custom resource, while the Location carries its geography. An extension flags it as a non-human subject.

const BASE = 'https://streamchart.app/fhir';
const CS_INDICATOR = `${BASE}/CodeSystem/oah-citizen-indicator`;
const CS_ANSWER = `${BASE}/CodeSystem/checkup-answer`;
const EXT_GRADE = `${BASE}/StructureDefinition/confidence-grade`;
const EXT_SUBJECT = `${BASE}/StructureDefinition/environmental-subject`;
const EXT_STATE = `${BASE}/StructureDefinition/stream-state`;
const EXT_SEAL = `${BASE}/StructureDefinition/sealed-answer-hash`;
export const QUESTIONNAIRE_URL = `${BASE}/Questionnaire/stream-checkup-60s`;

type R = Record<string, unknown> & { resourceType: string };
export interface Bundle {
  resourceType: 'Bundle';
  type: 'transaction';
  timestamp: string;
  meta: { tag: { system: string; code: string; display: string }[] };
  entry: { fullUrl: string; resource: R; request: { method: 'POST'; url: string; ifNoneExist?: string } }[];
}

function uuid(key: string): string {
  const h = sha256(key);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const b64 = (s: string) => (typeof btoa === 'function' ? btoa(s) : Buffer.from(s).toString('base64'));

export function questionnaire(): R {
  return {
    resourceType: 'Questionnaire',
    url: QUESTIONNAIRE_URL,
    version: '1.0.0',
    name: 'StreamCheckup60s',
    title: 'StreamChart 60-second stream check-up',
    status: 'active',
    subjectType: ['Patient'],
    item: FIELDS.map((f) => ({
      linkId: f.id,
      text: f.question.curious,
      type: 'choice',
      code: [{ system: CS_INDICATOR, code: f.id, display: f.oahIndicator }],
      answerOption: f.options.map((o) => ({ valueCoding: { system: CS_ANSWER, code: `${f.id}-${o.id}`, display: o.label.expert } })),
    })),
  };
}

export function toFhirBundle(w: World, streamId: string): Bundle {
  const stream = w.streams.find((s) => s.id === streamId)!;
  const entries: Bundle['entry'] = [];
  const ref = new Map<string, string>();
  const put = (key: string, resource: R, ifNoneExist?: string) => {
    const fullUrl = `urn:uuid:${uuid(`${streamId}:${key}`)}`;
    ref.set(key, fullUrl);
    entries.push({ fullUrl, resource, request: { method: 'POST', url: resource.resourceType, ...(ifNoneExist ? { ifNoneExist } : {}) } });
    return fullUrl;
  };
  const demoTag = { meta: { tag: [{ system: `${BASE}/CodeSystem/data-origin`, code: 'demonstration', display: 'Demonstration data' }] } };

  const org = put('org', { resourceType: 'Organization', ...demoTag, identifier: [{ system: `${BASE}/id/organization`, value: 'toulouse-metropole' }], name: stream.city }, `identifier=${BASE}/id/organization|toulouse-metropole`);
  const loc = put('loc', {
    resourceType: 'Location',
    ...demoTag,
    identifier: [{ system: `${BASE}/id/reach`, value: stream.id }],
    status: 'active',
    name: `${stream.name} — ${stream.district}`,
    description: `Urban stream reach, ${stream.lengthM} m. Surroundings: ${stream.surroundings.join(', ')}.`,
    physicalType: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/location-physical-type', code: 'area', display: 'Area' }] },
    position: { latitude: stream.lat, longitude: stream.lon },
    managingOrganization: { reference: org },
  });
  const st = stateOf(w, streamId);
  const patient = put('patient', {
    resourceType: 'Patient',
    ...demoTag,
    extension: [
      { url: EXT_SUBJECT, valueCode: 'urban-stream-reach' },
      { url: EXT_STATE, valueCoding: { system: `${BASE}/CodeSystem/stream-state`, code: st, display: STATE_LABEL[st] } },
      { url: 'http://hl7.org/fhir/StructureDefinition/patient-birthPlace', valueAddress: { city: stream.city, district: stream.district, country: 'FR' } },
    ],
    identifier: [{ system: `${BASE}/id/reach`, value: stream.id }],
    active: true,
    name: [{ use: 'official', text: stream.name }],
    managingOrganization: { reference: org },
    link: [],
  });
  const device = put('device', {
    resourceType: 'Device',
    deviceName: [{ name: 'StreamChart sealed second look (Gemini vision)', type: 'model-name' }],
    type: { text: 'AI image assessment model' },
    version: [{ value: 'gemini-3.5-flash-lite' }],
    note: [{ text: 'Sees the photo only; its answer is hashed on arrival and revealed after the citizen seals their own.' }],
  });
  const q = put('questionnaire', questionnaire(), `url=${QUESTIONNAIRE_URL}`);

  const practitioner = (id: string) => {
    const key = `person:${id}`;
    if (ref.has(key)) return ref.get(key)!;
    const p = w.people.find((x) => x.id === id);
    return put(key, {
      resourceType: 'Practitioner',
      ...demoTag,
      identifier: [{ system: `${BASE}/id/pseudonym`, value: id }],
      name: [{ text: p?.name ?? id }],
      qualification: [{ code: { text: p?.kind === 'ecologist' ? 'Referent ecologist' : p?.kind === 'technician' ? 'City water technician' : p?.kind === 'school' ? 'School class (citizen science)' : 'Citizen observer' } }],
    });
  };

  const checkups = w.checkups.filter((c) => c.streamId === streamId).sort((a, b) => a.at.localeCompare(b.at));
  const findings = findingsOf(w, streamId);
  const fieldObsByCheckup = new Map<string, Record<string, string>>();

  for (const c of checkups) {
    const author = practitioner(c.authorId);
    const qr = put(`qr:${c.id}`, {
      resourceType: 'QuestionnaireResponse',
      extension: [{ url: EXT_SEAL, valueString: c.sealHash }],
      questionnaire: QUESTIONNAIRE_URL,
      status: 'completed',
      subject: { reference: patient },
      authored: c.sealedAt,
      author: { reference: author },
      item: FIELDS.filter((f) => c.answers[f.id]).map((f) => ({
        linkId: f.id,
        text: f.question.curious,
        answer: [{ valueCoding: { system: CS_ANSWER, code: `${f.id}-${c.answers[f.id]}`, display: labelOf(f.id, c.answers[f.id], 'expert') } }],
      })),
    });
    let media: string | undefined;
    if (c.photo) {
      media = put(`media:${c.id}`, {
        resourceType: 'Media',
        status: 'completed',
        type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/media-type', code: 'image', display: 'Image' }] },
        subject: { reference: patient },
        createdDateTime: c.at,
        operator: { reference: author },
        content: c.photo.startsWith('data:') ? { contentType: 'image/jpeg', title: 'Check-up photo (inline data omitted from export)' } : { contentType: 'image/jpeg', url: c.photo, title: c.photoCredit ?? 'Check-up photo' },
      });
    }
    const grade = checkupGrade(w, c);
    const members: Record<string, string> = {};
    for (const f of FIELDS) {
      const v = c.final[f.id];
      if (!v) continue;
      const finding = findings.find((x) => x.field === f.id && x.supporters.some((s) => s.id === c.id));
      const ai = c.ai?.fields[f.id];
      const decision = c.decisions[f.id];
      members[f.id] = put(`obs:${c.id}:${f.id}`, {
        resourceType: 'Observation',
        extension: [{ url: EXT_GRADE, valueCode: finding?.grade ?? grade }],
        status: c.expertValidated ? 'final' : 'preliminary',
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'survey', display: 'Survey' }] }],
        code: { coding: [{ system: CS_INDICATOR, code: f.id, display: FIELD_BY_ID[f.id].oahIndicator }] },
        subject: { reference: patient },
        focus: [{ reference: loc }],
        effectiveDateTime: c.at,
        performer: [{ reference: author }],
        valueCodeableConcept: { coding: [{ system: CS_ANSWER, code: `${f.id}-${v}`, display: labelOf(f.id, v, 'expert') }] },
        method: { text: decision === 'adopted' ? 'Citizen visual check, AI answer adopted by the citizen' : 'Citizen visual check (answered before AI reveal)' },
        note: ai ? [{ text: `Sealed AI second look: ${ai.value} (confidence ${ai.confidence.toFixed(2)})${ai.note ? ` — ${ai.note}` : ''}${decision ? `. Citizen decision: ${decision}.` : ''}` }] : undefined,
        derivedFrom: [{ reference: qr }, ...(media ? [{ reference: media }] : [])],
      });
    }
    fieldObsByCheckup.set(c.id, members);
    const panel = put(`panel:${c.id}`, {
      resourceType: 'Observation',
      extension: [{ url: EXT_GRADE, valueCode: grade }],
      status: c.expertValidated ? 'final' : 'preliminary',
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'survey' }] }],
      code: { coding: [{ system: CS_INDICATOR, code: 'stream-checkup', display: c.followUp ? 'Follow-up stream check-up' : '60-second stream check-up' }] },
      subject: { reference: patient },
      effectiveDateTime: c.at,
      performer: [{ reference: author }],
      hasMember: Object.values(members).map((r) => ({ reference: r })),
      derivedFrom: [{ reference: qr }],
    });
    if (c.ai) {
      const aiObs = put(`ai:${c.id}`, {
        resourceType: 'Observation',
        extension: [{ url: EXT_SEAL, valueString: c.ai.hash }],
        status: 'preliminary',
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'imaging', display: 'Imaging' }] }],
        code: { coding: [{ system: CS_INDICATOR, code: 'ai-second-look', display: 'Sealed AI second look on the check-up photo' }] },
        subject: { reference: patient },
        effectiveDateTime: c.ai.at,
        device: { reference: device },
        valueString: c.ai.summary,
        component: FIELDS.map((f) => ({
          code: { coding: [{ system: CS_INDICATOR, code: f.id }] },
          valueCodeableConcept: { coding: [{ system: CS_ANSWER, code: `${f.id}-${c.ai!.fields[f.id]?.value ?? 'unsure'}` }], text: c.ai!.fields[f.id]?.note },
        })),
        derivedFrom: media ? [{ reference: media }] : undefined,
        note: [{ text: `Source: ${c.ai.source === 'gemini' ? 'live Gemini call' : c.ai.source === 'recorded' ? 'recorded Gemini answer (demo without key)' : 'offline colour analysis'}` }],
      });
      put(`prov:${c.id}`, {
        resourceType: 'Provenance',
        target: [{ reference: panel }, { reference: aiObs }, ...Object.values(members).map((r) => ({ reference: r }))],
        recorded: c.sealedAt,
        activity: { text: 'Sealed citizen–AI comparison (commit–reveal)' },
        agent: [
          { type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/provenance-participant-type', code: 'author' }] }, who: { reference: author } },
          { type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/provenance-participant-type', code: 'informant' }] }, who: { reference: device } },
        ],
        entity: [{ role: 'source', what: { reference: qr } }],
        signature: [
          { type: [{ system: 'urn:iso-astm:E1762-95:2013', code: '1.2.840.10065.1.12.1.1', display: "Author's Signature" }], when: c.sealedAt, who: { reference: author }, sigFormat: 'text/plain', data: b64(`sha256:${c.sealHash}`) },
        ],
      });
    }
  }

  // Hypotheses → DiagnosticReport (never a diagnosis: status preliminary until an ecologist signs a plan)
  const signedPlan = w.plans.find((p) => p.streamId === streamId && p.status !== 'proposed');
  const reports: string[] = [];
  for (const h of hypothesesOf(w, streamId)) {
    const results = findings.filter((f) => h.fields.includes(f.field)).flatMap((f) => f.supporters.map((s) => fieldObsByCheckup.get(s.id)?.[f.field]).filter(Boolean) as string[]);
    reports.push(
      put(`dr:${h.id}`, {
        resourceType: 'DiagnosticReport',
        status: signedPlan ? 'final' : 'preliminary',
        code: { text: 'Stream health hypothesis' },
        subject: { reference: patient },
        effectiveDateTime: nowOf(w).toISOString(),
        issued: nowOf(w).toISOString(),
        result: results.map((r) => ({ reference: r })),
        conclusion: `${h.title} — confidence ${h.confidence}. Why: ${h.reasons.join('; ')}. What would confirm it: ${h.confirm}`,
        conclusionCode: [{ text: h.title }],
      }),
    );
  }

  const risk = riskOf(w, streamId);
  if (risk) {
    put('risk', {
      resourceType: 'RiskAssessment',
      status: 'preliminary',
      subject: { reference: patient },
      occurrenceDateTime: nowOf(w).toISOString(),
      method: { text: `Transparent rule v1: stagnant water reported × days ≥ 25 °C in the 7-day forecast (${risk.source}). Designed to be replaced by DipteraCAST predictions.` },
      basis: findings.filter((f) => f.field === 'flow').flatMap((f) => f.supporters.map((s) => ({ reference: fieldObsByCheckup.get(s.id)?.flow })).filter((x) => x.reference)),
      prediction: [
        {
          outcome: { text: risk.title },
          qualitativeRisk: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/risk-probability', code: risk.level === 'elevated' ? 'high' : 'moderate' }] },
          whenPeriod: { start: nowOf(w).toISOString(), end: risk.reassessOn },
          rationale: risk.reasons.join('; '),
        },
      ],
      note: [{ text: 'Indicative only — not an epidemiological forecast. Reassess on the date above.' }],
    });
  }

  for (const p of w.plans.filter((x) => x.streamId === streamId)) {
    const author = p.signedBy ? practitioner(p.signedBy) : undefined;
    const cp = put(`cp:${p.id}`, {
      resourceType: 'CarePlan',
      status: p.status === 'proposed' ? 'draft' : p.status === 'validated' ? 'active' : 'completed',
      intent: p.status === 'proposed' ? 'proposal' : 'plan',
      title: `Care plan — ${stream.name}`,
      description: p.status === 'proposed' ? 'Proposed by the system. Becomes official only when a referent ecologist signs it.' : `Validated by the referent ecologist. Measures from ${CATALOGUE_SOURCE}.`,
      subject: { reference: patient },
      created: p.createdAt,
      author: author ? { reference: author } : undefined,
      supportingInfo: reports.map((r) => ({ reference: r })),
      activity: p.lines.map((l) => {
        const m = MEASURE_BY_ID[l.measureId];
        return {
          detail: {
            code: { coding: [{ system: `${BASE}/CodeSystem/oah-d24-measure`, code: m.section, display: m.title }] },
            status: l.removed ? 'cancelled' : l.status === 'done' ? 'completed' : l.status === 'in_progress' ? 'in-progress' : 'not-started',
            statusReason: l.removed ? { text: `Removed by the referent ecologist: ${l.removed.reason}` } : undefined,
            description: `${m.plain} (${m.line}; who: ${l.who}; urgency: ${l.urgency}; effort: ${l.effort})`,
          },
        };
      }),
    });
    if (p.signedAt && author) {
      put(`cpprov:${p.id}`, {
        resourceType: 'Provenance',
        target: [{ reference: cp }],
        recorded: p.signedAt,
        activity: { text: 'Co-signature of the care plan by a qualified human' },
        agent: [{ type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/provenance-participant-type', code: 'verifier' }] }, who: { reference: author } }],
        signature: [
          { type: [{ system: 'urn:iso-astm:E1762-95:2013', code: '1.2.840.10065.1.12.1.5', display: 'Verification Signature' }], when: p.signedAt, who: { reference: author }, sigFormat: 'text/plain', data: b64(`sha256:${p.signatureHash}`) },
        ],
      });
    }
  }

  for (const n of w.notices.filter((x) => x.streamId === streamId)) {
    put(`com:${n.id}`, {
      resourceType: 'Communication',
      status: 'completed',
      category: [{ text: 'Citizen feedback (closing the loop)' }],
      subject: { reference: patient },
      sent: n.at,
      recipient: [{ reference: practitioner(n.toId) }],
      payload: [{ contentString: n.text }],
    });
  }

  void q;
  return {
    resourceType: 'Bundle',
    type: 'transaction',
    timestamp: nowOf(w).toISOString(),
    meta: { tag: [{ system: `${BASE}/CodeSystem/data-origin`, code: 'demonstration', display: 'Contains demonstration data' }] },
    entry: entries,
  };
}

export function fhirSummary(b: Bundle): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of b.entry) out[e.resource.resourceType] = (out[e.resource.resourceType] ?? 0) + 1;
  return out;
}
