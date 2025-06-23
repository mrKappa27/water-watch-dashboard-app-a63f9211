
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import FileUpload from "@/components/FileUpload";
import DataDashboard from "@/components/DataDashboard";
import UserMenu from "@/components/auth/UserMenu";
import { ParsedDataPoint } from "@/types/dataTypes";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [parsedData, setParsedData] = useState<ParsedDataPoint[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleDataParsed = (newData: ParsedDataPoint[]) => {
    setParsedData(prevData => [...prevData, ...newData]);
  };

  const handleClearData = () => {
    setParsedData([]);
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">File Upload</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard & Analytics</TabsTrigger>
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
            <DataDashboard data={parsedData} onClearData={handleClearData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
