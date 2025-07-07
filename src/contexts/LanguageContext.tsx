
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => Promise<void>;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState('en');

  useEffect(() => {
    const fetchUserLanguage = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('user_language_preferences')
        .select('language')
        .eq('user_id', user.id)
        .single();

      if (data && !error) {
        setLanguageState(data.language);
      }
    };

    fetchUserLanguage();
  }, [user]);

  const setLanguage = async (lang: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('user_language_preferences')
      .upsert({
        user_id: user.id,
        language: lang,
        updated_at: new Date().toISOString()
      });

    if (!error) {
      setLanguageState(lang);
    }
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

const translations: Record<string, Record<string, string>> = {
  en: {
    // Navigation
    'water_dashboard': 'Water Dashboard',
    'sign_out': 'Sign Out',
    'profile': 'Profile',
    'settings': 'Settings',
    'log_out': 'Log out',
    
    // Date Range
    'from': 'From:',
    'to': 'To:',
    'pick_date': 'Pick a date',
    
    // Stats
    'total_data_points': 'Total Data Points',
    'locations': 'Locations',
    'date_range': 'Date Range',
    'parameters': 'Parameters',
    'in_selected_date_range': 'In selected date range',
    'monitoring_sites_with_data': 'Monitoring sites with data',
    'days_selected': 'Days selected',
    'measured_variables': 'Measured variables',
    'location_details': 'Location Details',
    'detailed_statistics': 'Detailed statistics for each monitoring location in the selected date range',
    'records': 'records',
    'first_record': 'First Record:',
    'last_record': 'Last Record:',
    'loading': 'Loading...',
    
    // Language
    'language': 'Language',
    'english': 'English',
    'italian': 'Italian',
  },
  it: {
    // Navigation
    'water_dashboard': 'Dashboard Acqua',
    'sign_out': 'Disconnetti',
    'profile': 'Profilo',
    'settings': 'Impostazioni',
    'log_out': 'Disconnetti',
    
    // Date Range
    'from': 'Da:',
    'to': 'A:',
    'pick_date': 'Seleziona data',
    
    // Stats
    'total_data_points': 'Punti Dati Totali',
    'locations': 'Posizioni',
    'date_range': 'Intervallo Date',
    'parameters': 'Parametri',
    'in_selected_date_range': 'Nell\'intervallo selezionato',
    'monitoring_sites_with_data': 'Siti di monitoraggio con dati',
    'days_selected': 'Giorni selezionati',
    'measured_variables': 'Variabili misurate',
    'location_details': 'Dettagli Posizione',
    'detailed_statistics': 'Statistiche dettagliate per ogni posizione di monitoraggio nell\'intervallo selezionato',
    'records': 'record',
    'first_record': 'Primo Record:',
    'last_record': 'Ultimo Record:',
    'loading': 'Caricamento...',
    
    // Language
    'language': 'Lingua',
    'english': 'Inglese',
    'italian': 'Italiano',
  }
};
