import React, { useState } from 'react';
import { Check, AlertCircle, XCircle, Moon, Sun } from 'lucide-react';

/**
 * CORPORATE DESIGN SYSTEM - OPTIMIZED FOR EMBED
 * Page de test compacte pour design corporatif
 */

export default function StyleShowcase() {
  const [activeTab, setActiveTab] = useState<'overview' | 'colors' | 'components' | 'forms'>('overview');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  const bgClass = themeMode === 'light' 
    ? 'bg-white text-gray-800' 
    : 'bg-gray-900 text-gray-50';
  
  const secondaryBgClass = themeMode === 'light' 
    ? 'bg-gray-50 border-gray-200' 
    : 'bg-gray-800 border-gray-700';

  return (
    <div className={`${bgClass} h-full flex flex-col`}>
      {/* ========== HEADER COMPACT ========== */}
      <header className={`${secondaryBgClass} border-b flex-shrink-0`}>
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold">VETAA Corporate</h2>
            <p className="text-sm text-gray-500">Professional • Minimal • Relaxing</p>
          </div>
          
          <button 
            onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0"
          >
            {themeMode === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden gap-0">
        {/* ========== SIDEBAR COMPACT ========== */}
        <aside className={`w-48 ${secondaryBgClass} border-r flex-shrink-0 overflow-y-auto`}>
          <nav className="p-4 space-y-2">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'colors', label: 'Colors' },
              { id: 'components', label: 'Components' },
              { id: 'forms', label: 'Forms' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full text-left px-4 py-2 rounded text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ========== MAIN CONTENT ========== */}
        <main className="flex-1 overflow-y-auto px-6 py-5">
          
          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-semibold mb-2">Welcome</h2>
                <p className="text-base text-gray-600">Design system minimaliste et professionnel pour votre panel d'entreprise</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`${themeMode === 'light' ? 'bg-gray-50' : 'bg-gray-800'} p-6 rounded border border-gray-200 dark:border-gray-700`}>
                  <h3 className="font-semibold text-lg mb-2">Minimal</h3>
                  <p className="text-sm text-gray-600">Focus sur le contenu</p>
                </div>
                <div className={`${themeMode === 'light' ? 'bg-gray-50' : 'bg-gray-800'} p-6 rounded border border-gray-200 dark:border-gray-700`}>
                  <h3 className="font-semibold text-lg mb-2">Professional</h3>
                  <p className="text-sm text-gray-600">Sérieux entreprise</p>
                </div>
                <div className={`${themeMode === 'light' ? 'bg-gray-50' : 'bg-gray-800'} p-6 rounded border border-gray-200 dark:border-gray-700`}>
                  <h3 className="font-semibold text-lg mb-2">Relaxing</h3>
                  <p className="text-sm text-gray-600">Agréable à regarder</p>
                </div>
              </div>
            </div>
          )}

          {/* COLORS */}
          {activeTab === 'colors' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-semibold">Color Palette</h2>
              <p className="text-base text-gray-600">Gris professionnel + 1 accent bleu</p>

              <div className="space-y-6">
                {/* Primary */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Primary</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 bg-gray-900 rounded shadow-sm flex-shrink-0" />
                    <div>
                      <p className="font-mono text-base">#2C3E50</p>
                      <p className="text-sm text-gray-600 mt-2">Gris-bleu professionnel</p>
                    </div>
                  </div>
                </div>

                {/* Accent */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Accent (Seul)</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 bg-blue-500 rounded shadow-sm flex-shrink-0" />
                    <div>
                      <p className="font-mono text-base">#3498DB</p>
                      <p className="text-sm text-gray-600 mt-2">Bleu doux, une seule couleur</p>
                    </div>
                  </div>
                </div>

                {/* Functional */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Functional Colors</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <div className="w-full h-20 bg-green-700 rounded shadow-sm" />
                      <p className="text-sm text-gray-600 mt-2 font-mono">#27AE60</p>
                    </div>
                    <div>
                      <div className="w-full h-20 bg-orange-700 rounded shadow-sm" />
                      <p className="text-sm text-gray-600 mt-2 font-mono">#D68910</p>
                    </div>
                    <div>
                      <div className="w-full h-20 bg-red-800 rounded shadow-sm" />
                      <p className="text-sm text-gray-600 mt-2 font-mono">#C0392B</p>
                    </div>
                    <div>
                      <div className="w-full h-20 bg-blue-500 rounded shadow-sm" />
                      <p className="text-sm text-gray-600 mt-2 font-mono">#3498DB</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COMPONENTS */}
          {activeTab === 'components' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-semibold">Components</h2>

              {/* Buttons */}
              <div>
                <h3 className="font-semibold text-xl mb-3">Buttons</h3>
                <div className="space-y-3">
                  <div className="flex gap-3 flex-wrap">
                    <button className="btn btn-primary text-base px-4 py-2">Primary</button>
                    <button className="btn btn-secondary text-base px-4 py-2">Secondary</button>
                    <button className="btn btn-outline text-base px-4 py-2">Outline</button>
                    <button className="btn btn-danger text-base px-4 py-2">Danger</button>
                  </div>
                </div>
              </div>

              {/* Badges */}
              <div>
                <h3 className="font-semibold text-xl mb-3">Badges</h3>
                <div className="flex gap-3 flex-wrap">
                  <span className="badge badge-primary text-sm">Default</span>
                  <span className="badge badge-success text-sm">Success</span>
                  <span className="badge badge-warning text-sm">Warning</span>
                  <span className="badge badge-danger text-sm">Error</span>
                </div>
              </div>

              {/* Alerts */}
              <div>
                <h3 className="font-semibold text-xl mb-3">Alerts</h3>
                <div className="space-y-3">
                  <div className="alert alert-success gap-3 p-3">
                    <Check size={20} className="flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Success</p>
                      <p className="text-sm">Complétée avec succès</p>
                    </div>
                  </div>
                  <div className="alert alert-warning gap-3 p-3">
                    <AlertCircle size={20} className="flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Warning</p>
                      <p className="text-sm">Attention requise</p>
                    </div>
                  </div>
                  <div className="alert alert-danger gap-3 p-3">
                    <XCircle size={20} className="flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Error</p>
                      <p className="text-sm">Une erreur s'est produite</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cards */}
              <div>
                <h3 className="font-semibold text-xl mb-3">Cards</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="card p-5">
                    <h4 className="font-semibold text-base mb-2">Card Title</h4>
                    <p className="text-sm text-gray-600">Contenu avec bordure subtile et ombre légère</p>
                  </div>
                  <div className="card p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-base">Statistic</h4>
                      <span className="badge badge-primary text-sm">Up 12%</span>
                    </div>
                    <p className="text-2xl font-semibold">2,453</p>
                    <p className="text-sm text-gray-600 mt-2">Vs mois dernier</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FORMS */}
          {activeTab === 'forms' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-semibold">Forms</h2>
              
              <div className="card p-6 max-w-2xl">
                <form className="space-y-5">
                  {/* Text Input */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Email</label>
                    <input 
                      type="email" 
                      className="input text-base py-2" 
                      placeholder="your@email.com"
                    />
                  </div>

                  {/* Select */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Sélectionner</label>
                    <select className="input text-base py-2">
                      <option>Option 1</option>
                      <option>Option 2</option>
                      <option>Option 3</option>
                    </select>
                  </div>

                  {/* Textarea */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Message</label>
                    <textarea 
                      className="input text-base py-2" 
                      rows={5}
                      placeholder="Votre message..."
                    ></textarea>
                  </div>

                  {/* Checkbox */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5" />
                    <span className="text-base">J'accepte les conditions</span>
                  </label>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button type="submit" className="btn btn-primary flex-1 text-base px-4 py-2">Submit</button>
                    <button type="reset" className="btn btn-secondary flex-1 text-base px-4 py-2">Reset</button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
