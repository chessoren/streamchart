import { KeyRound, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { askGemini, urlToDataUrl } from '../domain/ai';
import { useStore } from '../ui/store';

export function SettingsPage() {
  const { settings, setSettings, reset, showToast } = useStore();
  const [key, setKey] = useState(settings.apiKey);
  const [test, setTest] = useState('');
  const run = async () => {
    setTest('Asking Gemini to look at a sample photo…');
    try {
      const a = await askGemini(await urlToDataUrl('photos/foam-stone.jpg'), key, settings.model);
      setTest(`It works. ${a.model} says: “${a.summary}”`);
    } catch (e) {
      setTest(`It did not work: ${(e as Error).message}`);
    }
  };
  return (
    <div className="col" style={{ gap: 18, maxWidth: 760 }}>
      <h1>Settings</h1>
      <section className="card col" style={{ gap: 12 }}>
        <div className="row"><KeyRound size={18} color="#12355B" /><h2>Your Google AI Studio key</h2></div>
        <p className="small muted">
          StreamChart's second look uses Gemini vision. Bring your own key (free at aistudio.google.com). It is stored only in this browser and sent only to Google's API, directly from your browser. Without a key, sample photos use real Gemini answers recorded in advance, and your own photos get a simple offline colour analysis — always labelled as such.
        </p>
        <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Paste your Gemini API key" style={{ font: 'inherit', padding: 12, borderRadius: 12, border: '1px solid var(--line)' }} aria-label="Gemini API key" />
        <label className="row small" style={{ gap: 8 }}>
          Model
          <select value={settings.model} onChange={(e) => setSettings({ model: e.target.value })} className="btn small">
            <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (default, fast)</option>
            <option value="gemini-3.5-flash">gemini-3.5-flash</option>
            <option value="gemini-2.5-flash">gemini-2.5-flash</option>
          </select>
        </label>
        <div className="row wrap" style={{ gap: 8 }}>
          <button className="btn primary" onClick={() => { setSettings({ apiKey: key.trim() }); showToast(key ? 'Key saved in this browser.' : 'Key removed.'); }}>Save key</button>
          <button className="btn" disabled={!key} onClick={run}>Test with a sample photo</button>
          {settings.apiKey && <button className="btn danger" onClick={() => { setKey(''); setSettings({ apiKey: '' }); }}>Remove key</button>}
        </div>
        {test && <div className="note">{test}</div>}
      </section>
      <section className="card col" style={{ gap: 10 }}>
        <h2>Demo record</h2>
        <p className="small muted">Your check-ups and signatures are saved in this browser. Reset to start the story again from Monday, with Trois Ponts brook forgotten for 19 days.</p>
        <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => { reset(); showToast('Demo record reset.'); }}><RotateCcw size={16} /> Reset the demo</button>
      </section>
    </div>
  );
}
