
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileUpload from "@/components/FileUpload";
import DataDashboard from "@/components/DataDashboard";
import { ParsedDataPoint } from "@/types/dataTypes";

const Index = () => {
  const [parsedData, setParsedData] = useState<ParsedDataPoint[]>([]);

  const handleDataParsed = (newData: ParsedDataPoint[]) => {
    setParsedData(prevData => [...prevData, ...newData]);
  };

  const handleClearData = () => {
    setParsedData([]);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Datalogger Dashboard</h1>
          <p className="text-xl text-muted-foreground">
            Upload and analyze CSV files from your dataloggers
          </p>
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
