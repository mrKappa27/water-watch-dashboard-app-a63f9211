
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FileUploadProps {
  onUploadSuccess?: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { user } = useAuth();

  const checkFileUniqueness = async (filename: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('water_consumption_metrics')
        .select('filename')
        .eq('filename', filename)
        .limit(1);

      if (error) {
        console.error('Error checking file uniqueness:', error);
        return false;
      }

      return data.length === 0; // Return true if no existing file found
    } catch (error) {
      console.error('Error in uniqueness check:', error);
      return false;
    }
  };

  const parseCSVContent = (csvText: string): any[] => {
    const lines = csvText.split('\n').filter(line => line.trim().length > 0);
    if (lines.length <= 1) return []; // Check if there's more than just the header

    const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
    const data = [];

    console.log('CSV Headers found:', headers);

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(value => value.trim());
      if (values.length !== headers.length || values.every(val => val === '')) continue; // Skip empty or malformed lines

      const row: { [key: string]: string } = {};
      for (let j = 0; j < headers.length; j++) {
        // Normalize header names to match database schema
        let normalizedHeader = headers[j].toLowerCase();
        
        // Map common variations to standard names
        if (normalizedHeader === 'timestamp' || normalizedHeader === 'datetime') {
          normalizedHeader = 'time';
        }
        
        row[normalizedHeader] = values[j];
      }
      data.push(row);
    }

    console.log('Parsed CSV data sample:', data.slice(0, 3));
    return data;
  };

  const processFile = async (file: File) => {
    if (!user) {
      toast.error('You must be logged in to upload files');
      return false;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error(`${file.name} is not a CSV file`);
      return false;
    }

    try {
      // Check if file already exists globally
      const isUnique = await checkFileUniqueness(file.name);
      
      if (!isUnique) {
        toast.error(`File "${file.name}" has already been imported. Each file can only be imported once globally.`);
        return false;
      }

      const text = await file.text();
      const data = parseCSVContent(text);
      
      if (data.length === 0) {
        toast.error(`No valid data found in ${file.name}`);
        return false;
      }

      // Extract location from filename (assuming format: location_datetime.csv)
      const fileNameParts = file.name.replace('.csv', '').split('_');
      const location = fileNameParts[0] || 'unknown';

      // Helper function to convert to number or null
      const toNumber = (value: any): number | null => {
        if (value === null || value === undefined || value === '' || value === 'null') return null;
        const num = Number(value);
        return isNaN(num) ? null : num;
      };

      // Helper function to convert to string or null
      const toString = (value: any): string | null => {
        if (value === null || value === undefined || value === '' || value === 'null') return null;
        return String(value);
      };

      // Transform data to match database schema
      const transformedData = data.map(row => ({
        location: location,
        filename: file.name,
        user_id: user.id,
        time: row.time ? new Date(row.time).toISOString() : new Date().toISOString(),
        type: toString(row.type),
        din1: toNumber(row.din1),
        din2: toNumber(row.din2),
        din3: toNumber(row.din3),
        din4: toNumber(row.din4),
        dout1: toNumber(row.dout1),
        dout2: toNumber(row.dout2),
        vbat: toNumber(row.vbat),
        pow: toNumber(row.pow),
        tot1: toNumber(row.tot1),
        cnt1: toNumber(row.cnt1),
        delta1: toNumber(row.delta1),
        tot2: toNumber(row.tot2),
        cnt2: toNumber(row.cnt2),
        delta2: toNumber(row.delta2),
        tot3: toNumber(row.tot3),
        cnt3: toNumber(row.cnt3),
        delta3: toNumber(row.delta3),
        tot4: toNumber(row.tot4),
        cnt4: toNumber(row.cnt4),
        delta4: toNumber(row.delta4),
        gsm: toNumber(row.gsm),
        temp: toNumber(row.temp),
        tavg: toNumber(row.tavg),
        tmin: toNumber(row.tmin),
        tmax: toNumber(row.tmax)
      }));

      console.log('Transformed data sample for', file.name, ':', transformedData.slice(0, 2));

      // Insert data in batches to avoid potential issues with large datasets
      const batchSize = 100;
      let totalInserted = 0;
      
      for (let i = 0; i < transformedData.length; i += batchSize) {
        const batch = transformedData.slice(i, i + batchSize);
        const { error } = await supabase
          .from('water_consumption_metrics')
          .insert(batch);

        if (error) {
          console.error('Upload error for', file.name, ':', error);
          toast.error(`Failed to upload data from ${file.name}: ${error.message}`);
          return false;
        }
        
        totalInserted += batch.length;
      }

      toast.success(`Successfully uploaded ${totalInserted} records from ${file.name}`);
      return true;
    } catch (error) {
      console.error('File processing error for', file.name, ':', error);
      toast.error(`Failed to process ${file.name}`);
      return false;
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    if (fileArray.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    let totalFiles = fileArray.length;

    console.log(`Starting upload of ${totalFiles} files...`);

    for (const file of fileArray) {
      const success = await processFile(file);
      if (success) {
        successCount++;
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      toast.success(`Successfully processed ${successCount} of ${totalFiles} files`);
      onUploadSuccess?.();
    } else if (totalFiles > 1) {
      toast.error('Failed to process any files');
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload CSV Files</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-md p-6 relative ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <Upload className="mx-auto h-8 w-8 text-gray-500 mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Drag and drop your CSV files here
            </p>
            <p className="text-sm text-gray-500 mb-4">
              or click to select multiple files at once
            </p>
            <Button variant="outline" disabled={isUploading}>
              {isUploading ? 'Processing...' : 'Choose Files'}
            </Button>
          </div>
          <input
            type="file"
            accept=".csv"
            multiple
            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileInputChange}
            disabled={isUploading}
          />
          {isUploading && (
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-white bg-opacity-90 rounded-md">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Processing files...</p>
              </div>
            </div>
          )}
        </div>
        
        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Each file can only be imported once globally. Multiple files can be selected and uploaded simultaneously.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default FileUpload;
