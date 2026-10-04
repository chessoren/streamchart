import { Bell, ChevronRight, ClipboardList, HeartPulse, LayoutDashboard, LifeBuoy, Moon, Printer, Search, Settings as SettingsIcon, Siren, Sun, Trophy } from 'lucide-react';
import { useState } from 'react';
import { STATE_RANK, stateOf } from './domain/engine';
import { unreadFor } from './domain/world';
import type { Persona, Register } from './domain/types';
import { BrandMark } from './ui/kit';
import { PERSONA_PERSON, go, useRoute, useStore } from './ui/store';
import { MapPage } from './pages/MapPage';
import { StreamPage } from './pages/StreamPage';
import { CheckupFlow } from './pages/CheckupFlow';
import { WardRoom } from './pages/WardRoom';
import { InboxPage } from './pages/InboxPage';
import { VoicePage } from './pages/VoicePage';
import { SimulationPage } from './pages/SimulationPage';
import { CupPage } from './pages/CupPage';
import { KitPage } from './pages/KitPage';
import { SettingsPage } from './pages/SettingsPage';
import { AboutPage } from './pages/AboutPage';

const PERSONAS: { id: Persona; label: string }[] = [
  { id: 'citizen', label: 'Mathis · citizen' },
  { id: 'technician', label: 'Camille · city technician' },
  { id: 'ecologist', label: 'Dr Ferreira · referent ecologist (role-play)' },
];

export default function App() {
  const route = useRoute();
  const { world, settings, setSettings, toast } = useStore();
  const [q, setQ] = useState('');
  const me = PERSONA_PERSON[settings.persona];
  const unread = unreadFor(world, me).length;
  const urgent = world.streams.filter((s) => STATE_RANK[stateOf(world, s.id)] === 0).length;
  const [r0, r1, r2] = route;

  let page;
  if (!r0) page = <MapPage />;
  else if (r0 === 'stream' && r1 && r2 === 'checkup') page = <CheckupFlow streamId={r1} />;
  else if (r0 === 'stream' && r1 && r2 === 'voice') page = <VoicePage streamId={r1} />;
  else if (r0 === 'stream' && r1) page = <StreamPage streamId={r1} />;
  else if (r0 === 'ward') page = <WardRoom />;
  else if (r0 === 'inbox') page = <InboxPage />;
  else if (r0 === 'simulation') page = <SimulationPage />;
  else if (r0 === 'cup') page = <CupPage />;
  else if (r0 === 'kit') page = <KitPage />;
  else if (r0 === 'settings') page = <SettingsPage />;
  else if (r0 === 'about') page = <AboutPage />;
  else page = <MapPage />;

  const link = (path: string, label: string, icon: JSX.Element, extra?: JSX.Element) => {
    const on = `/${route.join('/')}` === path || (path !== '/' && `/${r0}` === path);
    return (
      <a href={`#${path}`} className={on ? 'on' : ''}>
        {icon}
        <span>{label}</span>
        {extra}
      </a>
    );
  };

  const doSearch = (v: string) => {
    setQ(v);
    const hit = world.streams.find((s) => v.length > 2 && s.name.toLowerCase().includes(v.toLowerCase()));
    if (hit) {
      go(`/stream/${hit.id}`);
      setQ('');
    }
  };

  return (
    <div className="shell">
      <aside className="side">
        <a href="#/" className="brand">
          <BrandMark />
          <span>
            <b>StreamChart</b>
            <small>
              AI stream records <span className="pro">
                <i /> Pro
              </span>
            </small>
          </span>
        </a>
        <nav className="nav col" style={{ gap: 2 }}>
          {link('/', 'Patients', <LayoutDashboard />, <span className="count">{world.streams.length}</span>)}
          {link('/ward', 'Ward room', <ClipboardList />, urgent ? <span className="count hot">{urgent}</span> : undefined)}
          {link('/inbox', 'Inbox', <Bell />, unread ? <span className="count">{unread}</span> : undefined)}
          {link('/simulation', 'Emergency scene', <Siren />)}
          {link('/cup', 'Stream Cup', <Trophy />, <ChevronRight className="chev" />)}
          {link('/kit', 'Signs & school kit', <Printer />, <ChevronRight className="chev" />)}
          <div className="navsep" />
          {link('/settings', 'Administration', <SettingsIcon />, <ChevronRight className="chev" />)}
          {link('/about', 'Support & honesty', <LifeBuoy />)}
        </nav>
        <div className="spacer" />
        <div className="label">Language level</div>
        <div className="seg" role="group" aria-label="Language level">
          {(['child', 'curious', 'expert'] as Register[]).map((r) => (
            <button key={r} className={settings.register === r ? 'on' : ''} onClick={() => setSettings({ register: r })}>
              {r === 'child' ? 'Child' : r === 'curious' ? 'Curious' : 'Expert'}
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Theme" style={{ marginTop: 8 }}>
          <button className={settings.theme === 'light' ? 'on' : ''} onClick={() => setSettings({ theme: 'light' })}>
            <Sun size={13} /> Light
          </button>
          <button className={settings.theme === 'dark' ? 'on' : ''} onClick={() => setSettings({ theme: 'dark' })}>
            <Moon size={13} /> Dark
          </button>
        </div>
      </aside>
      <div className="main">
        <header className="top">
          <label className="search">
            <Search size={16} />
            <input placeholder="Find a stream…" value={q} onChange={(e) => doSearch(e.target.value)} aria-label="Find a stream" />
          </label>
          <span className="grow" />
          <span className="pill demo">Demonstration data</span>
          <span className="pill city">
            <i /> Toulouse Métropole <ChevronRight size={12} style={{ transform: 'rotate(90deg)' }} />
          </span>
          <label className="persona">
            <span className="dotp" />
            <select value={settings.persona} onChange={(e) => setSettings({ persona: e.target.value as Persona })} aria-label="Viewing as">
              {PERSONAS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <a className="iconbtn" href="#/inbox" aria-label="Inbox">
            <Bell size={15} />
            {unread > 0 && <span className="dotn" />}
          </a>
          <a className="iconbtn" href="#/settings" aria-label="Settings">
            <SettingsIcon size={15} />
          </a>
          <a className="newbtn" href="#/stream/trois-ponts/checkup">
            <span className="nb-ico">
              <HeartPulse size={13} />
            </span>
            New check-up
          </a>
        </header>
        <main className="page">{page}</main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Bell size={18} style={{ flex: 'none', marginTop: 2 }} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
