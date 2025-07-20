import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import NightlyConsumptionAnalysis from './NightlyConsumptionAnalysis';
import LeakDetectionSettings from './LeakDetectionSettings';
import { useState } from 'react';

interface LeakDetectionPanelProps {
  dateFrom: Date;
  dateTo: Date;
}

const LeakDetectionPanel = ({ dateFrom, dateTo }: LeakDetectionPanelProps) => {
  const { t } = useLanguage();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{t('leak_detection')}</h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="w-4 h-4 mr-2" />
          {t('settings')}
        </Button>
      </div>

      {showSettings ? (
        <LeakDetectionSettings />
      ) : (
        <NightlyConsumptionAnalysis dateFrom={dateFrom} dateTo={dateTo} />
      )}
    </div>
  );
};

export default LeakDetectionPanel;