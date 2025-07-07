
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
    
    // Main App
    'datalogger_dashboard': 'Datalogger Dashboard',
    'upload_analyze_csv': 'Upload and analyze CSV files from your dataloggers',
    'account': 'Account',
    'date_range_filter': 'Date Range Filter',
    'filter_data_by_date': 'Filter data by date range to improve performance. Default shows last 7 days.',
    'file_upload': 'File Upload',
    'dashboard_analytics': 'Dashboard & Analytics',
    'leak_detection': 'Leak Detection',
    'leak_settings': 'Leak Settings',
    'csv_file_upload': 'CSV File Upload',
    'upload_csv_files': 'Upload CSV files from your dataloggers. Files should be named as "location_datetime.csv"',
    'loading_data_from_database': 'Loading data from database...',
    
    // Leak Detection
    'nightly_consumption_analysis': 'Nightly Consumption Analysis',
    'leak_detection_analysis': 'Leak detection analysis based on nighttime water consumption patterns',
    'consumption_trends': 'Consumption Trends',
    'daily_status': 'Daily Status',
    'summary': 'Summary',
    'no_data_available': 'No data available for the selected date range',
    'good': 'Good',
    'warning': 'Warning',
    'high': 'High',
    'critical': 'Critical',
    
    // Chart and Data
    'data_visualization': 'Data Visualization',
    'select_parameters': 'Select parameters to display',
    'clear_all_data': 'Clear All Data',
    'are_you_sure': 'Are you sure?',
    'this_will_clear_all_data': 'This will clear all uploaded data. This action cannot be undone.',
    'cancel': 'Cancel',
    'continue': 'Continue',
    'no_data_to_display': 'No data to display',
    'upload_some_csv_files': 'Upload some CSV files to see charts and analysis here.',
    
    // File Upload
    'drag_drop_files': 'Drag and drop CSV files here, or click to select',
    'supported_formats': 'Supported formats: CSV files',
    'uploading': 'Uploading...',
    'upload_successful': 'Upload successful',
    'upload_failed': 'Upload failed',
    'processing_file': 'Processing file',
    
    // Settings
    'leak_detection_settings': 'Leak Detection Settings',
    'configure_thresholds': 'Configure leak detection thresholds for each location',
    'save_settings': 'Save Settings',
    'settings_saved': 'Settings saved successfully',
    'failed_to_save': 'Failed to save settings',
    'good_threshold': 'Good Threshold',
    'warning_threshold': 'Warning Threshold',
    'high_threshold': 'High Threshold',
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
    
    // Main App
    'datalogger_dashboard': 'Dashboard Datalogger',
    'upload_analyze_csv': 'Carica e analizza file CSV dai tuoi datalogger',
    'account': 'Account',
    'date_range_filter': 'Filtro Intervallo Date',
    'filter_data_by_date': 'Filtra i dati per intervallo di date per migliorare le prestazioni. Il valore predefinito mostra gli ultimi 7 giorni.',
    'file_upload': 'Caricamento File',
    'dashboard_analytics': 'Dashboard e Analisi',
    'leak_detection': 'Rilevamento Perdite',
    'leak_settings': 'Impostazioni Perdite',
    'csv_file_upload': 'Caricamento File CSV',
    'upload_csv_files': 'Carica file CSV dai tuoi datalogger. I file dovrebbero essere denominati "posizione_dataora.csv"',
    'loading_data_from_database': 'Caricamento dati dal database...',
    
    // Leak Detection
    'nightly_consumption_analysis': 'Analisi Consumo Notturno',
    'leak_detection_analysis': 'Analisi di rilevamento perdite basata sui modelli di consumo idrico notturno',
    'consumption_trends': 'Tendenze di Consumo',
    'daily_status': 'Stato Giornaliero',
    'summary': 'Riepilogo',
    'no_data_available': 'Nessun dato disponibile per l\'intervallo di date selezionato',
    'good': 'Buono',
    'warning': 'Attenzione',
    'high': 'Alto',
    'critical': 'Critico',
    
    // Chart and Data
    'data_visualization': 'Visualizzazione Dati',
    'select_parameters': 'Seleziona parametri da visualizzare',
    'clear_all_data': 'Cancella Tutti i Dati',
    'are_you_sure': 'Sei sicuro?',
    'this_will_clear_all_data': 'Questo canceller\u00e0 tutti i dati caricati. Questa azione non pu\u00f2 essere annullata.',
    'cancel': 'Annulla',
    'continue': 'Continua',
    'no_data_to_display': 'Nessun dato da visualizzare',
    'upload_some_csv_files': 'Carica alcuni file CSV per vedere grafici e analisi qui.',
    
    // File Upload
    'drag_drop_files': 'Trascina e rilascia file CSV qui, o clicca per selezionare',
    'supported_formats': 'Formati supportati: file CSV',
    'uploading': 'Caricamento...',
    'upload_successful': 'Caricamento riuscito',
    'upload_failed': 'Caricamento fallito',
    'processing_file': 'Elaborazione file',
    
    // Settings
    'leak_detection_settings': 'Impostazioni Rilevamento Perdite',
    'configure_thresholds': 'Configura le soglie di rilevamento perdite per ogni posizione',
    'save_settings': 'Salva Impostazioni',
    'settings_saved': 'Impostazioni salvate con successo',
    'failed_to_save': 'Impossibile salvare le impostazioni',
    'good_threshold': 'Soglia Buona',
    'warning_threshold': 'Soglia Attenzione',
    'high_threshold': 'Soglia Alta',
  }
};
