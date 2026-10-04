import { useEffect } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import type { Lang } from '@shared/types';
import { UI, LANG_LABEL, interpolate } from './i18n/strings';
import { useCatalog } from './state/catalog';
import { AtlasPage } from './pages/AtlasPage';
import { SearchPage } from './pages/SearchPage';
import { ComparePage } from './pages/ComparePage';
import { MethodPage } from './pages/MethodPage';
import { LicensesPage } from './pages/LicensesPage';

const LANGS: Lang[] = ['ru', 'en', 'uz'];

function TopBar() {
  const { lang, setLang, origin, status } = useCatalog();
  const s = UI[lang];

  return (
    <>
      {status === 'ready' && origin === 'bundled' ? (
        <div className="banner">
          <span>⚠</span>
          {s.offline_banner}
        </div>
      ) : null}
      <header className="topbar">
        <div className="topbar__brand">
          🌗 <span>{interpolate('Луна и Марс на Земле', {})} </span>
        </div>
        <nav className="topbar__nav">
          <NavLink className={({ isActive }) => `topbar__link ${isActive ? 'topbar__link--active' : ''}`} to="/">
            {s.nav_atlas}
          </NavLink>
          <NavLink className={({ isActive }) => `topbar__link ${isActive ? 'topbar__link--active' : ''}`} to="/search">
            {s.nav_search}
          </NavLink>
          <NavLink className={({ isActive }) => `topbar__link ${isActive ? 'topbar__link--active' : ''}`} to="/compare">
            {s.nav_compare}
          </NavLink>
          <NavLink className={({ isActive }) => `topbar__link ${isActive ? 'topbar__link--active' : ''}`} to="/method">
            {s.nav_method}
          </NavLink>
          <NavLink className={({ isActive }) => `topbar__link ${isActive ? 'topbar__link--active' : ''}`} to="/licenses">
            {s.nav_licenses}
          </NavLink>
        </nav>
        <div className="topbar__spacer" />
        <div className="langswitch" role="group" aria-label="Language">
          {LANGS.map((code) => (
            <button key={code} type="button" aria-pressed={lang === code} onClick={() => setLang(code)}>
              {LANG_LABEL[code]}
            </button>
          ))}
        </div>
      </header>
    </>
  );
}

export function App() {
  const { init, status } = useCatalog();

  useEffect(() => {
    void init();
  }, [init]);

  if (status === 'loading') {
    return (
      <div className="loading">
        <span>◐</span> Загрузка каталога…
      </div>
    );
  }

  return (
    <div className="app">
      <TopBar />
      <div className="app__body">
        <Routes>
          <Route path="/" element={<AtlasPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/method" element={<MethodPage />} />
          <Route path="/licenses" element={<LicensesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}