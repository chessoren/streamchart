import { ArrowLeft, Camera, Check, Lock, ShieldAlert, Sparkles, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { askGemini, fileToDataUrl, offlineAnalyse, recordedFor, urlToDataUrl } from '../domain/ai';
import { STATE_LABEL, checkupGrade, daysSinceVisit, nowOf, stateOf } from '../domain/engine';
import { FIELDS, FIELD_BY_ID, FIELD_SHORT, SURROUNDINGS, isAbnormal, labelOf } from '../domain/fields';
import { seal } from '../domain/sha256';
import { makeCheckup, submitCheckup, PHOTO_CREDITS } from '../domain/world';
import type { AiAssessment, Answers, Decision, FieldId, StreamState } from '../domain/types';
import { GradeChip, OptIcon, PhotoBoxes, StateBadge, Stamp } from '../ui/kit';
import { PERSONA_PERSON, go, useStore } from '../ui/store';

const SAMPLES = ['foam-stone.jpg', 'cloudy-film.jpg', 'stagnant-arm.jpg', 'litter-bank.jpg', 'eroded-bank.jpg', 'clear-riffles.jpg', 'three-bridges.jpg', 'sausse-banks.jpg'];

type Step = 'safety' | 'photo' | FieldId | 'context' | 'seal' | 'reveal' | 'effect';
const ORDER: Step[] = ['safety', 'photo', ...FIELDS.map((f) => f.id), 'context', 'seal', 'reveal', 'effect'];

export function CheckupFlow({ streamId }: { streamId: string }) {
  const { world, setWorld, settings } = useStore();
  const s = world.streams.find((x) => x.id === streamId)!;
  const reg = settings.register;
  const author = PERSONA_PERSON[settings.persona];
  const [step, setStep] = useState<Step>('safety');
  const [photo, setPhoto] = useState<string>();
  const [photoName, setPhotoName] = useState<string>();
  const [answers, setAnswers] = useState<Answers>({});
  const [surr, setSurr] = useState<string[]>(s.surroundings);
  const [note, setNote] = useState('');
  const [ai, setAi] = useState<AiAssessment | null>(null);
  const [aiErr, setAiErr] = useState<string>('');
  const [sealed, setSealed] = useState<{ at: string; hash: string } | null>(null);
  const [decisions, setDecisions] = useState<Partial<Record<FieldId, Decision>>>({});
  const [result, setResult] = useState<{ before: StreamState; after: StreamState; grade: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const followUp = world.plans.some((p) => p.streamId === streamId && p.status === 'validated');
  const idx = ORDER.indexOf(step);
  const next = () => setStep(ORDER[Math.min(idx + 1, ORDER.length - 1)]);
  const back = () => setStep(ORDER[Math.max(idx - 1, 0)]);
  const d = daysSinceVisit(world, streamId);

  // The AI looks at the photo as soon as it is taken. Its answer is hashed and kept hidden.
  const startAi = async (dataUrl: string, sample?: string) => {
    setAi(null);
    setAiErr('');
    try {
      if (settings.apiKey) setAi(await askGemini(dataUrl, settings.apiKey, settings.model));
      else if (sample && recordedFor(`photos/${sample}`)) setAi(recordedFor(`photos/${sample}`));
      else setAi(await offlineAnalyse(dataUrl));
    } catch (e) {
      setAiErr((e as Error).message);
      if (sample && recordedFor(`photos/${sample}`)) setAi(recordedFor(`photos/${sample}`));
      else setAi(await offlineAnalyse(dataUrl));
    }
  };

  const pickSample = async (name: string) => {
    setPhoto(`photos/${name}`);
    setPhotoName(name);
    startAi(await urlToDataUrl(`photos/${name}`), name);
  };
  const pickFile = async (f: File) => {
    const url = await fileToDataUrl(f);
    setPhoto(url);
    setPhotoName(undefined);
    startAi(url);
  };

  const doSeal = () => {
    const at = nowOf(world).toISOString();
    setSealed({ at, hash: seal({ answers, authorId: author, at }) });
    window.setTimeout(() => setStep('reveal'), 1500);
  };

  const finish = () => {
    const before = stateOf(world, streamId);
    const c = makeCheckup({ streamId, authorId: author, at: sealed!.at, photo, answers, surroundings: surr, note: note || undefined, decisions, ai: ai ?? undefined, followUp, demo: false });
    c.sealHash = sealed!.hash;
    const w2 = submitCheckup(world, c);
    setWorld(() => w2);
    setResult({ before, after: stateOf(w2, streamId), grade: checkupGrade(w2, w2.checkups.find((x) => x.id === c.id)!) });
    setStep('effect');
  };

  const progress = Math.round((idx / (ORDER.length - 1)) * 100);

  return (
    <div className="flow">
      <div className="flow-head">
        <button className="btn ghost" onClick={() => (idx === 0 ? go(`/stream/${streamId}`) : back())} aria-label="Back" disabled={step === 'effect' || step === 'reveal'}>
          <ArrowLeft size={18} />
        </button>
        <div className="progress">
          <span style={{ width: `${progress}%` }} />
        </div>
        <span className="small muted">{s.name}</span>
      </div>

      {step === 'safety' && (
        <div className="col" style={{ gap: 18 }}>
          <div className="kicker">{followUp ? 'Follow-up visit' : '60-second check-up'}</div>
          <h1>Take the pulse of {s.name}.</h1>
          <p className="serif" style={{ fontSize: 20, color: 'var(--ink-2)' }}>
            {d === null ? '“Nobody has ever looked at me.”' : d > 7 ? `“Nobody has looked at me for ${d} days.”` : `“${d === 0 ? 'Someone came today' : `Someone came ${d} days ago`}. A second look always helps.”`}
          </p>
          <div className="safety row" style={{ alignItems: 'flex-start' }}>
            <ShieldAlert size={22} style={{ flex: 'none', marginTop: 2 }} />
            <div>
              <b>Safety first.</b> Observe from the bank. Never step into fast or deep water. Children come with an adult.
            </div>
          </div>
          <p className="muted">You answer first. An AI looks at your photo too, but its answer stays sealed until you confirm yours. The last word is always yours.</p>
          <button className="btn primary big" onClick={next}>
            I'm on the bank — let's start
          </button>
        </div>
      )}

      {step === 'photo' && (
        <div className="col" style={{ gap: 16 }}>
          <h1>{reg === 'child' ? 'Take a picture of the stream' : 'One photo of the water'}</h1>
          <p className="muted">A wide view with the surface and a bank. If there is a sign, stand where it shows you: same viewpoint every time.</p>
          {photo ? (
            <img className="bigphoto" src={photo} alt="Your photo" />
          ) : (
            <div className="photo-drop">
              <Camera size={34} color="#12355B" />
              <p style={{ margin: '8px 0 12px' }}>Use your camera or upload a photo.</p>
              <button className="btn primary" onClick={() => fileRef.current?.click()}>
                <Upload size={16} /> Take or upload a photo
              </button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])} />
          <div>
            <div className="small muted" style={{ marginBottom: 6 }}>
              Not at a stream? Use a sample — real photos of urban streams (Wikimedia Commons, CC BY-SA).
            </div>
            <div className="samples">
              {SAMPLES.map((n) => (
                <button key={n} className={photoName === n ? 'on' : ''} onClick={() => pickSample(n)} title={PHOTO_CREDITS[n]?.title}>
                  <img src={`photos/${n}`} alt={PHOTO_CREDITS[n]?.title} />
                </button>
              ))}
            </div>
          </div>
          {photo && (
            <div className="row small" style={{ color: 'var(--ink-2)' }}>
              <Lock size={15} /> {ai ? 'The AI has looked. Its answer is sealed until you confirm yours.' : 'The AI is looking at the photo too. Its answer will stay sealed.'}
            </div>
          )}
          <button className="btn primary big" disabled={!photo} onClick={next}>
            Continue
          </button>
        </div>
      )}

      {FIELDS.some((f) => f.id === step) && <Question key={step} field={step as FieldId} value={answers[step as FieldId]} reg={reg} onPick={(v) => { setAnswers((a) => ({ ...a, [step]: v })); window.setTimeout(next, 220); }} n={FIELDS.findIndex((f) => f.id === step) + 1} />}

      {step === 'context' && (
        <div className="col" style={{ gap: 16 }}>
          <h1>What is around it?</h1>
          <div className="row wrap" style={{ gap: 8 }}>
            {SURROUNDINGS.map((x) => (
              <button key={x} className={`choice ${surr.includes(x) ? 'on' : ''}`} style={{ padding: '10px 16px', fontSize: 16 }} onClick={() => setSurr((l) => (l.includes(x) ? l.filter((y) => y !== x) : [...l, x]))}>
                {x}
              </button>
            ))}
          </div>
          <label className="col" style={{ gap: 6 }}>
            <b>Anything unusual? (optional)</b>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="A pipe, a colour, an animal…" style={{ font: 'inherit', padding: 12, borderRadius: 12, border: '1px solid var(--line)' }} />
          </label>
          <button className="btn primary big" onClick={next}>
            Review my check-up
          </button>
        </div>
      )}

      {step === 'seal' && (
        <div className="col" style={{ gap: 16 }}>
          <h1>Your check-up</h1>
          <div className="card flat" style={{ padding: 14 }}>
            {FIELDS.map((f) => (
              <div key={f.id} className="row between small" style={{ padding: '6px 0', borderBottom: '1px solid var(--line-2)' }}>
                <span className="muted">{FIELD_SHORT[f.id]}</span>
                <b style={{ color: isAbnormal(f.id, answers[f.id]) ? '#9a6812' : 'var(--ink)' }}>{labelOf(f.id, answers[f.id], reg)}</b>
              </div>
            ))}
          </div>
          {sealed ? (
            <div className="col" style={{ alignItems: 'center', gap: 10, padding: 20 }}>
              <Stamp title="Check-up sealed" sub={`${s.name} · ${new Date(sealed.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`} animate />
              <div className="hash">sha256 {sealed.hash.slice(0, 32)}…</div>
            </div>
          ) : (
            <button className="seal-btn" onClick={doSeal} disabled={!ai}>
              {ai ? 'I confirm my check-up' : 'The AI is still looking…'}
            </button>
          )}
          <p className="small muted" style={{ textAlign: 'center' }}>Once sealed, your answers cannot change before the AI's answer is revealed. That is what keeps the comparison honest.</p>
        </div>
      )}

      {step === 'reveal' && ai && photo && <Reveal photo={photo} answers={answers} ai={ai} sealHash={sealed!.hash} decisions={decisions} setDecisions={setDecisions} reg={reg} onDone={finish} aiErr={aiErr} />}

      {step === 'effect' && result && (
        <div className="col" style={{ gap: 18, alignItems: 'center', textAlign: 'center', paddingTop: 10 }}>
          <div className="kicker">What your check-up changed</div>
          <div className="row" style={{ gap: 14, fontSize: 18 }}>
            <StateBadge state={result.before} lg />
            <span className="faint">→</span>
            <span className="stamp-in" style={{ display: 'inline-block' }}>
              <StateBadge state={result.after} lg />
            </span>
          </div>
          <h1 style={{ maxWidth: 480 }}>
            {result.before !== result.after
              ? `${s.name} is now ${STATE_LABEL[result.after].toLowerCase()}. Your check-up made the difference.`
              : result.after === 'stable'
                ? `Your check-up confirms that ${s.name} is doing fine.`
                : 'Your check-up strengthens the record.'}
          </h1>
          <div className="row" style={{ gap: 8 }}>
            <span className="muted">Your check-up is grade</span> <GradeChip g={result.grade as never} />
          </div>
          <p className="muted" style={{ maxWidth: 440 }}>The grade rises when a neighbour confirms what you saw, and reaches A when the referent ecologist validates it. You will be told what happens next.</p>
          <div className="row wrap" style={{ gap: 10, justifyContent: 'center' }}>
            <button className="btn primary big" onClick={() => go(`/stream/${streamId}`)}>
              See the chart
            </button>
            <button className="btn big" onClick={() => go(`/stream/${streamId}/voice`)}>
              Listen to the stream
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Question({ field, value, reg, onPick, n }: { field: FieldId; value?: string; reg: 'child' | 'curious' | 'expert'; onPick: (v: string) => void; n: number }) {
  const f = FIELD_BY_ID[field];
  const [gloss, setGloss] = useState(false);
  return (
    <div className="col" style={{ gap: 6 }}>
      <div className="kicker">
        Question {n} of {FIELDS.length}
      </div>
      <h1>{f.question[reg]}</h1>
      <p className="muted">{f.hint}</p>
      {reg === 'expert' && f.glossary && (
        <button className="small" style={{ textAlign: 'left', color: 'var(--water)', textDecoration: 'underline dotted' }} onClick={() => setGloss(!gloss)}>
          {f.glossary.term}?
        </button>
      )}
      {gloss && f.glossary && <div className="note">{f.glossary.meaning}</div>}
      <div className="choices">
        {f.options.map((o) => (
          <button key={o.id} className={`choice ${value === o.id ? 'on' : ''}`} onClick={() => onPick(o.id)}>
            <span className="ci">
              <OptIcon name={o.icon} />
            </span>
            {o.label[reg]}
          </button>
        ))}
      </div>
    </div>
  );
}

function Reveal({ photo, answers, ai, sealHash, decisions, setDecisions, reg, onDone, aiErr }: {
  photo: string; answers: Answers; ai: AiAssessment; sealHash: string; decisions: Partial<Record<FieldId, Decision>>; setDecisions: (f: (d: Partial<Record<FieldId, Decision>>) => Partial<Record<FieldId, Decision>>) => void; reg: 'child' | 'curious' | 'expert'; onDone: () => void; aiErr: string;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), 500);
    return () => window.clearTimeout(t);
  }, []);
  const rows = useMemo(
    () =>
      FIELDS.map((f) => {
        const mine = answers[f.id];
        const a = ai.fields[f.id];
        const status = !a || a.value === 'unsure' ? 'unsure' : a.value === mine ? 'agree' : 'disagree';
        return { f, mine, a, status };
      }),
    [answers, ai],
  );
  const disagreements = rows.filter((r) => r.status === 'disagree');
  const missed = ai.observations.filter((o) => o.field && answers[o.field] !== ai.fields[o.field]?.value);
  const allDecided = disagreements.every((r) => decisions[r.f.id]);
  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="kicker row" style={{ gap: 6 }}>
        <Sparkles size={14} /> The AI's answer is revealed
      </div>
      <h1>{disagreements.length ? `You agree on ${rows.filter((r) => r.status === 'agree').length} points and differ on ${disagreements.length}. Let's see which.` : 'You and the AI agree on everything it could see.'}</h1>
      <PhotoBoxes src={photo} observations={ai.observations} show={shown} />
      <div className="small muted">
        {ai.source === 'gemini' && <>Live answer from {ai.model}. </>}
        {ai.source === 'recorded' && <>No API key set: this is a real {ai.model} answer recorded on this sample photo. Add your key in Settings to run it live. </>}
        {ai.source === 'offline' && <>Offline colour analysis only (no API key) — add a Gemini key in Settings for a real second look. </>}
        {aiErr && <>Live call failed ({aiErr.slice(0, 80)}), so a fallback was used. </>}
        {ai.summary}
      </div>
      <div className="compare">
        <div className="h">Field</div>
        <div className="h">You</div>
        <div className="h">AI</div>
        {rows.map(({ f, mine, a, status }) => (
          <Row3 key={f.id} label={FIELD_SHORT[f.id]} mine={labelOf(f.id, mine, reg)} ai={a ? labelOf(f.id, a.value, reg) : '—'} note={a?.note} status={status} />
        ))}
      </div>
      {missed.length > 0 && (
        <div className="note">
          {missed.slice(0, 2).map((o) => (
            <div key={o.text}>Here: {o.text}</div>
          ))}
        </div>
      )}
      {disagreements.map(({ f, mine, a }) => (
        <div key={f.id} className="card flat" style={{ padding: 14 }}>
          <div className="small">
            <b>{FIELD_SHORT[f.id]}</b>: you said “{labelOf(f.id, mine, reg)}”, the AI says “{labelOf(f.id, a!.value, reg)}”{a?.note ? ` — ${a.note}` : ''}
          </div>
          <div className="row wrap" style={{ gap: 8, marginTop: 10 }}>
            {(['kept', 'adopted', 'second_opinion'] as Decision[]).map((dcs) => (
              <button key={dcs} className={`btn ${decisions[f.id] === dcs ? 'primary' : ''}`} onClick={() => setDecisions((x) => ({ ...x, [f.id]: dcs }))}>
                {decisions[f.id] === dcs && <Check size={15} />}
                {dcs === 'kept' ? 'I keep my answer' : dcs === 'adopted' ? "I adopt the AI's" : 'Ask for a second opinion'}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="hash">
        Your seal sha256 {sealHash.slice(0, 20)}… · AI seal sha256 {ai.hash.slice(0, 20)}… (computed when the AI answered, before the reveal)
      </div>
      <button className="btn primary big" disabled={!allDecided} onClick={onDone}>
        {allDecided ? 'Add my check-up to the chart' : 'Decide on each difference — the last word is yours'}
      </button>
    </div>
  );
}

function Row3({ label, mine, ai, note, status }: { label: string; mine: string; ai: string; note?: string; status: string }) {
  return (
    <>
      <div className={status}>{label}</div>
      <div className={status}>{mine}</div>
      <div className={status} title={note}>
        {status === 'agree' && <Check size={14} color="#3F8F6B" style={{ verticalAlign: -2, marginRight: 4 }} />}
        {ai}
      </div>
    </>
  );
}
