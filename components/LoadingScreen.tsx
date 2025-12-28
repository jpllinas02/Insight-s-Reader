
import React from 'react';
import { Language } from '../types';

const QUOTES: Record<Language, string[]> = {
  'Español': [
    "La tinta se está secando en la página...",
    "Traduciendo el alma de las palabras...",
    "Imaginando el escenario...",
    "Pintando con prosa..."
  ],
  'English': [
    "Ink is drying on the page...",
    "Translating the soul of the words...",
    "Imagining the scenery...",
    "Painting with prose..."
  ],
  'Français': [
    "L'encre sèche sur la page...",
    "Traduire l'âme des mots...",
    "Imaginer le décor...",
    "Peindre avec la prose..."
  ],
  'Deutsch': [
    "Tinte trocknet auf der Seite...",
    "Die Seele der Worte übersetzen...",
    "Die Szenerie vorstellen...",
    "Mit Prosa malen..."
  ],
  'Italiano': [
    "L'inchiostro si asciuga sulla pagina...",
    "Tradurre l'anima delle parole...",
    "Immaginare lo scenario...",
    "Dipingere con la prosa..."
  ]
};

const LABELS: Record<Language, { analyzing: string, painting: string }> = {
  'Español': { analyzing: 'Descifrando Texto', painting: 'Renderizando Visión' },
  'English': { analyzing: 'Deciphering Text', painting: 'Rendering Vision' },
  'Français': { analyzing: 'Déchiffrer le Texte', painting: 'Rendu de la Vision' },
  'Deutsch': { analyzing: 'Text entziffern', painting: 'Vision rendern' },
  'Italiano': { analyzing: 'Decifrare il Testo', painting: 'Rendering della Visione' }
};

export const LoadingScreen: React.FC<{ state: string, lang: Language }> = ({ state, lang }) => {
  const [quoteIdx, setQuoteIdx] = React.useState(0);
  const quotes = QUOTES[lang] || QUOTES['Español'];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIdx(q => (q + 1) % quotes.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [quotes]);

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-500">
      <div className="w-16 h-16 border-4 border-[#704214]/20 border-t-[#704214] rounded-full animate-spin mb-6"></div>
      <h3 className="text-xl font-serif italic text-[#704214] mb-2">{quotes[quoteIdx]}</h3>
      <p className="text-xs uppercase tracking-widest text-[#2c2c2c]/50 font-semibold">
        {state === 'ANALYZING' ? LABELS[lang].analyzing : LABELS[lang].painting}
      </p>
    </div>
  );
};
