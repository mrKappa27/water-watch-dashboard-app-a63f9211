
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import FileUpload from "@/components/FileUpload";
import DataDashboard from "@/components/DataDashboard";
import NightlyConsumptionAnalysis from "@/components/NightlyConsumptionAnalysis";
import LeakDetectionSettings from "@/components/LeakDetectionSettings";
import UserMenu from "@/components/auth/UserMenu";
import DateRangeFilter from "@/components/DateRangeFilter";
import { ParsedDataPoint } from "@/types/dataTypes";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchDataFromDatabase } from "@/utils/supabaseSync";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [parsedData, setParsedData] = useState<ParsedDataPoint[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const { toast } = useToast();

  // Date range state with default of 1 week
  const [dateFrom, setDateFrom] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // 1 week ago
    return date;
  });
  const [dateTo, setDateTo] = useState<Date>(new Date());

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Fetch data from database when user is available or date range changes
  useEffect(() => {
    const loadDataFromDatabase = async () => {
      if (!user) return;
      
      console.log('Starting to load data from database with date range...', dateFrom, 'to', dateTo);
      setIsLoadingData(true);
      try {
        const data = await fetchDataFromDatabase(user.id, dateFrom, dateTo);
        setParsedData(data);
        console.log('Successfully loaded data from database:', data.length, 'records');
        
        if (data.length === 0) {
          console.log('No data found in database for user:', user.id, 'in date range:', dateFrom, 'to', dateTo);
        }
      } catch (error) {
        console.error('Error loading data from database:', error);
        toast({
          title: "Error",
          description: "Failed to load data from database",
          variant: "destructive",
        });
      } finally {
        setIsLoadingData(false);
      }
    };

    loadDataFromDatabase();
  }, [user, dateFrom, dateTo, toast]);

  const handleUploadSuccess = async () => {
    // Refresh data from database after new upload
    if (user) {
      console.log('Data uploaded, refreshing from database...');
      setIsLoadingData(true);
      try {
        const data = await fetchDataFromDatabase(user.id, dateFrom, dateTo);
        setParsedData(data);
        console.log('Refreshed data after upload:', data.length, 'records');
      } catch (error) {
        console.error('Error refreshing data from database:', error);
      } finally {
        setIsLoadingData(false);
      }
    }
  };

  const handleClearData = async () => {
    // For now, just refresh from database
    // In the future, you might want to add a function to delete all user data
    if (user) {
      setIsLoadingData(true);
      try {
        const data = await fetchDataFromDatabase(user.id, dateFrom, dateTo);
        setParsedData(data);
      } catch (error) {
        console.error('Error refreshing data from database:', error);
      } finally {
        setIsLoadingData(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">{t('loading')}</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">{t('datalogger_dashboard')}</h1>
            <p className="text-xl text-muted-foreground">
              {t('upload_analyze_csv')}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/auth')}
              className="lg:hidden"
            >
              {t('account')}
            </Button>
            <div className="hidden lg:block">
              <UserMenu />
            </div>
          </div>
        </div>

        {/* Date Range Filter */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('date_range_filter')}</CardTitle>
            <CardDescription>
              {t('filter_data_by_date')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DateRangeFilter
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
          </CardContent>
        </Card>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">{t('file_upload')}</TabsTrigger>
            <TabsTrigger value="dashboard">{t('dashboard_analytics')}</TabsTrigger>
            <TabsTrigger value="leak-detection">{t('leak_detection')}</TabsTrigger>
            <TabsTrigger value="leak-settings">{t('leak_settings')}</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('csv_file_upload')}</CardTitle>
                <CardDescription>
                  {t('upload_csv_files')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload onUploadSuccess={handleUploadSuccess} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard" className="mt-6">
            {isLoadingData ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <div className="text-lg">{t('loading_data_from_database')}</div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <DataDashboard 
                data={parsedData} 
                onClearData={handleClearData}
                dateFrom={dateFrom}
                dateTo={dateTo}
              />
            )}
          </TabsContent>

          <TabsContent value="leak-detection" className="mt-6">
            {isLoadingData ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <div className="text-lg">{t('loading_data_from_database')}</div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <NightlyConsumptionAnalysis dateFrom={dateFrom} dateTo={dateTo} />
            )}
          </TabsContent>

          <TabsContent value="leak-settings" className="mt-6">
            <LeakDetectionSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
