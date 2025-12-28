
import React, { useState, useRef, useEffect } from 'react';
import { GeminiService } from './services/geminiService';
import { AppState, AnalysisResult, Language } from './types';
import { LoadingScreen } from './components/LoadingScreen';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const LANG_CODES: Record<Language, string> = {
  'Español': 'ESP',
  'English': 'ENG',
  'Français': 'FRA',
  'Deutsch': 'DEU',
  'Italiano': 'ITA'
};

const UI_TEXT: Record<Language, any> = {
  'Español': {
    main_title: "Insight's Reader",
    subtitle: 'Dándole forma a las palabras',
    pasting_placeholder: 'Escribe o pega aquí el fragmento de la obra que deseas visualizar...',
    btn_visualize: 'Visualizar',
    result_original: 'Pasaje Original',
    result_translation: 'Traducción',
    result_atmosphere: 'Atmósfera',
    result_setting: 'Escenario',
    result_details: 'Detalles Visuales',
    btn_new: 'Nueva Interpretación',
    error_title: 'Un borrón de tinta...',
    btn_try_again: 'Volver al Estudio',
  },
  'English': {
    main_title: "Insight's Reader",
    subtitle: 'Giving shape to words',
    pasting_placeholder: 'Write or paste the literary fragment you wish to visualize here...',
    btn_visualize: 'Visualize',
    result_original: 'Original Passage',
    result_translation: 'Translation',
    result_atmosphere: 'Atmosphere',
    result_setting: 'Setting',
    result_details: 'Visual Details',
    btn_new: 'New Interpretation',
    error_title: 'A blot of ink...',
    btn_try_again: 'Back to Study',
  },
  'Français': {
    main_title: "Insight's Reader",
    subtitle: 'Donner forme aux mots',
    pasting_placeholder: 'Écrivez ou collez ici le fragment que vous souhaitez visualiser...',
    btn_visualize: 'Visualiser',
    result_original: 'Passage Original',
    result_translation: 'Traduction',
    result_atmosphere: 'Atmosphère',
    result_setting: 'Cadre',
    result_details: 'Détails Visuels',
    btn_new: 'Nouvelle Interprétation',
    error_title: 'Une tache d’encre...',
    btn_try_again: 'Retour à l’Étude',
  },
  'Deutsch': {
    main_title: "Insight's Reader",
    subtitle: 'Worten Form geben',
    pasting_placeholder: 'Schreiben oder fügen Sie hier das Fragment ein, das Sie visualisieren möchten...',
    btn_visualize: 'Visualisieren',
    result_original: 'Originalpassage',
    result_translation: 'Übersetzung',
    result_atmosphere: 'Atmosphäre',
    result_setting: 'Schauplatz',
    result_details: 'Visuelle Details',
    btn_new: 'Neue Interpretation',
    error_title: 'Ein Tintenfleck...',
    btn_try_again: 'Zurück zum Studium',
  },
  'Italiano': {
    main_title: "Insight's Reader",
    subtitle: 'Dare forma alle parole',
    pasting_placeholder: 'Scrivi o incolla qui il frammento che desideri visualizzare...',
    btn_visualize: 'Visualizza',
    result_original: 'Passaggio Originale',
    result_translation: 'Traduzione',
    result_atmosphere: 'Atmosfera',
    result_setting: 'Scenario',
    result_details: 'Dettagli Visivi',
    btn_new: 'Nuova Interpretazione',
    error_title: 'Una macchia d’inchiostro...',
    btn_try_again: 'Torna allo Studio',
  }
};

const CollapsibleSection: React.FC<{ title: string, isOpen: boolean, onToggle: () => void, children: React.ReactNode, variant?: 'light' | 'dark' }> = ({ title, isOpen, onToggle, children, variant = 'light' }) => {
  const isDark = variant === 'dark';
  return (
    <div className={`rounded-2xl border ${isDark ? 'bg-[#2c2c2c] border-white/10 text-[#f4f1ea]' : 'bg-white/70 border-[#704214]/10 text-[#2c2c2c]'} charcoal-shadow overflow-hidden transition-all duration-300`}>
      <button 
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between text-left focus:outline-none"
      >
        <h3 className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-[#704214]/40'}`}>
          {title}
        </h3>
        <svg 
          className={`w-4 h-4 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${isDark ? 'text-white/30' : 'text-[#704214]/30'}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
        <div className="px-5 pb-5">
          {children}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('Español');
  const [showDropdown, setShowDropdown] = useState(false);
  const [state, setState] = useState<AppState>('IDLE');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  
  // Section toggle states
  const [showOriginal, setShowOriginal] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const T = UI_TEXT[lang];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const processAnalysis = async (result: AnalysisResult) => {
    setAnalysis(result);
    setState('PAINTING');
    
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
      }
    }

    try {
      const img = await GeminiService.generateImage(result.imagePrompt);
      setImageUrl(img);
      setState('RESULT');
    } catch (imgErr: any) {
      setError("Error renderizando la visión artística. Inténtalo de nuevo.");
      setState('ERROR');
    }
  };

  const handleTextSubmit = async () => {
    if (!pastedText.trim()) return;
    setState('ANALYZING');
    setError(null);
    try {
      const result = await GeminiService.analyzeRawText(pastedText, lang);
      await processAnalysis(result);
    } catch (err: any) {
      setError(err.message || "Error al procesar el texto.");
      setState('ERROR');
    }
  };

  const reset = () => {
    setState('IDLE');
    setAnalysis(null);
    setImageUrl(null);
    setError(null);
    setPastedText('');
    setIsImageExpanded(false);
    setShowOriginal(true);
    setShowTranslation(true);
    setShowDetails(false);
  };

  return (
    <div className="flex flex-col max-w-lg mx-auto bg-transparent relative overflow-x-hidden min-h-screen">
      {/* Image Expansion Overlay */}
      {isImageExpanded && imageUrl && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setIsImageExpanded(false)}
        >
          <img 
            src={imageUrl} 
            alt="Expanded Vision" 
            className="max-w-full max-h-full object-contain rounded shadow-2xl animate-in zoom-in-95 duration-300"
          />
          <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Language Selector */}
      <div className="absolute right-4 top-4 z-50" ref={dropdownRef}>
        <button 
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-10 h-10 flex items-center justify-center bg-[#2c2c2c] text-[#f4f1ea] rounded-full text-[10px] font-bold tracking-tighter hover:bg-[#404040] transition-all shadow-md active:scale-95 border border-[#704214]/10"
        >
          {LANG_CODES[lang]}
        </button>
        
        {showDropdown && (
          <div className="absolute right-0 mt-2 w-36 bg-[#f4f1ea] paper-texture rounded-lg shadow-2xl border border-[#704214]/10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-1 space-y-0.5">
              {(['Español', 'English', 'Français', 'Deutsch', 'Italiano'] as Language[]).map(l => (
                <button
                  key={l}
                  onClick={() => { setLang(l); setShowDropdown(false); }}
                  className={`w-full text-left py-2 px-3 rounded text-xs font-serif transition-colors ${lang === l ? 'bg-[#2c2c2c] text-white' : 'hover:bg-[#704214]/5 text-[#2c2c2c]'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <header className="pt-10 pb-4 px-6 relative flex flex-col items-center">
        <h1 className="text-3xl font-serif font-bold text-[#2c2c2c] tracking-tight">{T.main_title}</h1>
        <p className="text-sm font-serif italic text-[#704214]/70 mt-1">{T.subtitle}</p>
        <div className="h-px bg-[#704214]/20 w-10 mt-4"></div>
      </header>

      <main className="px-4 pb-6 flex-initial">
        {state === 'IDLE' && (
          <div className="flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="relative p-5 bg-white/60 border border-[#704214]/10 rounded-2xl charcoal-shadow">
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={T.pasting_placeholder}
                className="w-full h-64 bg-transparent border-none focus:ring-0 text-[#2c2c2c] font-serif text-lg leading-relaxed placeholder-[#2c2c2c]/30 resize-none"
              />
            </div>
            <button 
              onClick={handleTextSubmit} 
              disabled={!pastedText.trim()} 
              className="w-full py-4 bg-[#2c2c2c] text-[#f4f1ea] rounded-xl font-bold shadow-lg disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              {T.btn_visualize}
            </button>
          </div>
        )}

        {(state === 'ANALYZING' || state === 'PAINTING') && (
          <div className="bg-white/50 border border-[#704214]/10 rounded-2xl py-16 charcoal-shadow animate-in zoom-in-95 duration-500">
            <LoadingScreen state={state} lang={lang} />
          </div>
        )}

        {state === 'RESULT' && analysis && imageUrl && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <div 
              className="rounded-2xl overflow-hidden border-2 border-white charcoal-shadow relative cursor-pointer group active:scale-[0.98] transition-transform"
              onClick={() => setIsImageExpanded(true)}
            >
              <img src={imageUrl} alt="Visual Interpretation" className="w-full aspect-video object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                 <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                 </svg>
              </div>
            </div>

            <CollapsibleSection 
              title={T.result_original} 
              isOpen={showOriginal} 
              onToggle={() => setShowOriginal(!showOriginal)}
            >
              <p className="font-serif text-base leading-relaxed text-[#2c2c2c] italic whitespace-pre-wrap">{analysis.originalText}</p>
            </CollapsibleSection>

            <CollapsibleSection 
              title={T.result_translation} 
              isOpen={showTranslation} 
              onToggle={() => setShowTranslation(!showTranslation)}
              variant="dark"
            >
              <p className="font-serif text-base leading-relaxed whitespace-pre-wrap">{analysis.translatedText}</p>
            </CollapsibleSection>

            <CollapsibleSection 
              title={T.result_details} 
              isOpen={showDetails} 
              onToggle={() => setShowDetails(!showDetails)}
            >
              <div className="grid grid-cols-2 gap-4 text-[10px]">
                <div>
                  <span className="text-[#704214]/40 block mb-1 uppercase tracking-widest">{T.result_atmosphere}</span>
                  <p className="font-bold text-[#2c2c2c]">{analysis.visualDetails.mood}</p>
                </div>
                <div>
                  <span className="text-[#704214]/40 block mb-1 uppercase tracking-widest">{T.result_setting}</span>
                  <p className="font-bold text-[#2c2c2c]">{analysis.visualDetails.environment}</p>
                </div>
              </div>
            </CollapsibleSection>

            {/* Added extra vertical spacing between last section and button */}
            <div className="pt-6">
              <button onClick={reset} className="w-full py-4 bg-[#704214] text-white rounded-xl font-bold shadow-md hover:bg-[#5a3510] transition-colors active:scale-95">
                {T.btn_new}
              </button>
            </div>
          </div>
        )}

        {state === 'ERROR' && (
          <div className="p-8 bg-red-50/50 border border-red-100 rounded-2xl text-center charcoal-shadow animate-in shake-in duration-500">
            <h3 className="text-red-900 font-serif text-xl mb-2 font-bold">{T.error_title}</h3>
            <p className="text-red-800/60 text-xs mb-6 italic">{error}</p>
            <button onClick={reset} className="px-10 py-3 bg-[#2c2c2c] text-white rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all">
              {T.btn_try_again}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
