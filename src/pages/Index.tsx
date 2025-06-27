
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import FileUpload from "@/components/FileUpload";
import DataDashboard from "@/components/DataDashboard";
import NightlyConsumptionAnalysis from "@/components/NightlyConsumptionAnalysis";
import UserMenu from "@/components/auth/UserMenu";
import { ParsedDataPoint } from "@/types/dataTypes";
import { useAuth } from "@/hooks/useAuth";
import { fetchDataFromDatabase } from "@/utils/supabaseSync";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [parsedData, setParsedData] = useState<ParsedDataPoint[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Fetch data from database when user is available
  useEffect(() => {
    const loadDataFromDatabase = async () => {
      if (!user) return;
      
      console.log('Starting to load data from database...');
      setIsLoadingData(true);
      try {
        const data = await fetchDataFromDatabase(user.id);
        setParsedData(data);
        console.log('Successfully loaded data from database:', data.length, 'records');
        
        if (data.length === 0) {
          console.log('No data found in database for user:', user.id);
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
  }, [user, toast]);

  const handleDataParsed = async (newData: ParsedDataPoint[]) => {
    // Refresh data from database after new upload
    if (user) {
      console.log('Data uploaded, refreshing from database...');
      setIsLoadingData(true);
      try {
        const data = await fetchDataFromDatabase(user.id);
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
        const data = await fetchDataFromDatabase(user.id);
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
        <div className="text-lg">Loading...</div>
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
            <h1 className="text-4xl font-bold mb-2">Datalogger Dashboard</h1>
            <p className="text-xl text-muted-foreground">
              Upload and analyze CSV files from your dataloggers
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/auth')}
              className="lg:hidden"
            >
              Account
            </Button>
            <div className="hidden lg:block">
              <UserMenu />
            </div>
          </div>
        </div>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">File Upload</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard & Analytics</TabsTrigger>
            <TabsTrigger value="leak-detection">Leak Detection</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>CSV File Upload</CardTitle>
                <CardDescription>
                  Upload CSV files from your dataloggers. Files should be named as "location_datetime.csv"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload onDataParsed={handleDataParsed} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard" className="mt-6">
            {isLoadingData ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <div className="text-lg">Loading data from database...</div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <DataDashboard data={parsedData} onClearData={handleClearData} />
            )}
          </TabsContent>

          <TabsContent value="leak-detection" className="mt-6">
            {isLoadingData ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <div className="text-lg">Loading data from database...</div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <NightlyConsumptionAnalysis />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
