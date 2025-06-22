import { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, File, X } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { ParsedDataPoint } from "@/types/dataTypes";

interface FileUploadProps {
  onDataParsed: (data: ParsedDataPoint[]) => void;
}

const FileUpload = ({ onDataParsed }: FileUploadProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const parseCSV = (content: string): Record<string, any>[] => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(';').map(h => h.trim().replace(/"/g, ''));
    const data = [];

    console.log('Headers found:', headers);

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';').map(v => v.trim().replace(/"/g, ''));
      if (values.length === headers.length) {
        const row: Record<string, any> = {};
        
        headers.forEach((header, index) => {
          const value = values[index];
          const headerUpper = header.toUpperCase();

          if (headerUpper === 'INDEX') {
            row[header] = parseInt(value) || 0;
          } else if (headerUpper === 'TYPE' || headerUpper === 'TRIGGER') {
            row[header] = value;
          } else if (headerUpper === 'TIME' || headerUpper === 'TIMESTAMP') {
            // Parse "DD/MM/YYYY HH:mm:ss" format
            const match = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(value);
            if (match) {
              const [_, day, month, year, hour, minute, second] = match;
              row[header] = new Date(
                Number(year),
                Number(month) - 1,
                Number(day),
                Number(hour),
                Number(minute),
                Number(second)
              );
            } else {
              const dateValue = new Date(value);
              row[header] = isNaN(dateValue.getTime()) ? value : dateValue;
            }
          } else if (headerUpper.startsWith('DIN') || headerUpper.startsWith('DOUT')) {
            const lowerValue = value.toLowerCase();
            row[header] =
              lowerValue === '1' ||
              lowerValue === 'true' ||
              lowerValue === 'on' ||
              lowerValue === 'yes';
          } else if (
            headerUpper.startsWith('TOT') ||
            headerUpper.startsWith('CNT') ||
            headerUpper.startsWith('DELTA')
          ) {
            row[header] = parseInt(value) || 0;
          } else {
            const numValue = parseFloat(value);
            row[header] = isNaN(numValue) ? value : numValue;
          }
        });
        
        data.push(row);
      }
    }
    
    console.log('Parsed data sample:', data.slice(0, 3));
    return data;
  };

  const extractLocationAndDatetime = (filename: string) => {
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
    
    // Handle filenames like "ennioRio_log20250620150010.csv"
    // Extract location before first underscore, then remove "log" prefix from datetime part
    const underscoreIndex = nameWithoutExt.indexOf('_');
    
    if (underscoreIndex === -1) {
      return {
        location: nameWithoutExt,
        datetime: new Date()
      };
    }

    const location = nameWithoutExt.substring(0, underscoreIndex);
    let datetimeStr = nameWithoutExt.substring(underscoreIndex + 1);
    
    // Remove "log" prefix if present
    if (datetimeStr.toLowerCase().startsWith('log')) {
      datetimeStr = datetimeStr.substring(3);
    }
    
    // Try to parse datetime string
    let datetime = new Date(datetimeStr);
    if (isNaN(datetime.getTime())) {
      // If direct parsing fails, try common formats
      const formats = [
        datetimeStr.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6'),
        datetimeStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
        datetimeStr.replace(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})/, '$1-$2-$3T$4:$5'),
        datetimeStr.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1-$2-$3'),
        datetimeStr
      ];
      
      for (const format of formats) {
        datetime = new Date(format);
        if (!isNaN(datetime.getTime())) break;
      }
      
      if (isNaN(datetime.getTime())) {
        datetime = new Date();
      }
    }

    return { location, datetime };
  };

  const processFiles = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    const allParsedData: ParsedDataPoint[] = [];

    try {
      for (const file of selectedFiles) {
        console.log('Processing file:', file.name);
        const content = await file.text();
        const csvData = parseCSV(content);
        const { location, datetime } = extractLocationAndDatetime(file.name);

        console.log(`File ${file.name}: location=${location}, datetime=${datetime.toISOString()}, rows=${csvData.length}`);

        csvData.forEach((row, index) => {
          const timestampKey = Object.keys(row).find(
            k => k.toLowerCase() === 'timestamp' || k.toLowerCase() === 'time'
          );
          let rowDatetime = datetime;
          if (timestampKey && row[timestampKey] instanceof Date && !isNaN(row[timestampKey].getTime())) {
            rowDatetime = row[timestampKey];
          }

          allParsedData.push({
            id: `${file.name}-${index}`,
            location,
            datetime: rowDatetime,
            filename: file.name,
            values: row
          });
        });
      }

      // Sort by datetime ASC before passing to onDataParsed
      allParsedData.sort((a, b) => {
        const aTime = a.datetime instanceof Date ? a.datetime.getTime() : new Date(a.datetime).getTime();
        const bTime = b.datetime instanceof Date ? b.datetime.getTime() : new Date(b.datetime).getTime();
        return aTime - bTime;
      });

      console.log('Total parsed data points:', allParsedData.length);
      onDataParsed(allParsedData);
      setSelectedFiles([]);
      
      toast({
        title: "Success",
        description: `Processed ${selectedFiles.length} files with ${allParsedData.length} data points`,
      });
    } catch (error) {
      console.error('Error processing files:', error);
      toast({
        title: "Error",
        description: "Failed to process some files. Please check the format.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFiles, onDataParsed, toast]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const csvFiles = files.filter(file => file.name.toLowerCase().endsWith('.csv'));
    
    if (csvFiles.length !== files.length) {
      toast({
        title: "Warning",
        description: "Only CSV files are supported. Some files were ignored.",
        variant: "destructive",
      });
    }
    
    setSelectedFiles(prev => [...prev, ...csvFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          type="file"
          multiple
          accept=".csv"
          onChange={handleFileSelect}
          className="flex-1"
        />
        <Button 
          onClick={processFiles} 
          disabled={selectedFiles.length === 0 || isProcessing}
          className="min-w-[120px]"
        >
          {isProcessing ? (
            <>Processing...</>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Process Files
            </>
          )}
        </Button>
      </div>

      {selectedFiles.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h3 className="font-semibold mb-3">Selected Files ({selectedFiles.length})</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <File className="w-4 h-4" />
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FileUpload;
