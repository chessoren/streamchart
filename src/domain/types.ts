// Core vocabulary. Every medical idea has a stream equivalent:
// patient = stream reach, chart = stream record, consultation = check-up,
// diagnosis = hypothesis, level of evidence = confidence grade,
// prescription = care plan, follow-up visit = follow-up check-up, recovery = remission.

export type StreamState = 'unfollowed' | 'stable' | 'watch' | 'alert';
export type Grade = 'A' | 'B' | 'C' | 'D';
export type Register = 'child' | 'curious' | 'expert';
export type Persona = 'citizen' | 'technician' | 'ecologist';

export type FieldId = 'clarity' | 'foam' | 'odour' | 'flow' | 'banks' | 'vegetation' | 'litter';

export type Answers = Partial<Record<FieldId, string>>;

export interface Person {
  id: string;
  name: string; // first name or pseudonym only
  kind: 'citizen' | 'school' | 'technician' | 'ecologist';
  title?: string;
  demo: boolean;
}

export interface Stream {
  id: string;
  name: string;
  district: string;
  city: string;
  lengthM: number;
  surroundings: string[];
  photo: string;
  path: string; // SVG path on the city map
  label: [number, number];
  lat: number;
  lon: number;
  referentId?: string;
  adoptedBy?: string;
  demo: boolean;
}

export interface AiObservation {
  text: string;
  field?: FieldId;
  box?: [number, number, number, number]; // ymin, xmin, ymax, xmax in 0..1000
}

export interface AiFieldAnswer {
  value: string; // an option id or 'unsure'
  confidence: number; // 0..1
  note?: string;
}

export interface AiAssessment {
  source: 'gemini' | 'recorded' | 'offline';
  model: string;
  at: string;
  fields: Partial<Record<FieldId, AiFieldAnswer>>;
  observations: AiObservation[];
  summary: string;
  hash: string; // SHA-256 of the canonical JSON, computed when received (before reveal)
}

export type Decision = 'kept' | 'adopted' | 'second_opinion';

export interface CheckUp {
  id: string;
  streamId: string;
  authorId: string;
  at: string;
  photo?: string; // URL or data URL
  photoCredit?: string;
  answers: Answers;
  surroundings: string[];
  note?: string;
  sealedAt: string;
  sealHash: string; // SHA-256 of the citizen answers at seal time
  ai?: AiAssessment;
  decisions: Partial<Record<FieldId, Decision>>;
  final: Answers; // what the record keeps after the citizen decides
  expertValidated?: boolean;
  validatedFields?: FieldId[]; // fields confirmed by the referent ecologist
  followUp?: boolean;
  demo: boolean;
}

export type CareStatus = 'proposed' | 'validated' | 'in_progress' | 'done';

export interface CareLine {
  id: string;
  measureId: string;
  hypothesisId: string;
  who: 'city' | 'association' | 'residents' | 'ecologist';
  urgency: 'low' | 'medium' | 'high';
  effort: 'light' | 'medium' | 'heavy';
  status: CareStatus;
  removed?: { by: string; reason: string };
}

export interface CarePlan {
  id: string;
  streamId: string;
  createdAt: string;
  lines: CareLine[];
  status: 'proposed' | 'validated' | 'closed';
  signedBy?: string;
  signedAt?: string;
  signatureHash?: string;
  followUpDue?: string;
}

export type EventKind =
  | 'checkup'
  | 'measure'
  | 'lab'
  | 'hypothesis'
  | 'risk'
  | 'plan_proposed'
  | 'plan_signed'
  | 'intervention'
  | 'followup'
  | 'remission'
  | 'state';

export interface StreamEvent {
  id: string;
  streamId: string;
  at: string;
  kind: EventKind;
  title: string;
  detail?: string;
  authorId?: string;
  grade?: Grade;
  refId?: string;
  state?: StreamState;
  demo: boolean;
}

export interface Notice {
  id: string;
  toId: string;
  at: string;
  streamId: string;
  text: string;
  photo?: string;
  read: boolean;
  demo: boolean;
}

export interface WeatherDay {
  date: string;
  tmax: number;
  precip: number;
}

export interface Forecast {
  source: 'open-meteo' | 'simulated';
  fetchedAt: string;
  days: WeatherDay[];
}

export interface World {
  version: number;
  streams: Stream[];
  people: Person[];
  checkups: CheckUp[];
  plans: CarePlan[];
  events: StreamEvent[];
  notices: Notice[];
  forecast?: Forecast;
  now?: string; // set only during the accelerated simulation
}
