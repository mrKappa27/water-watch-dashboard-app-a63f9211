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
    const lines = csvText.split('\n');
    if (lines.length <= 1) return []; // Check if there's more than just the header

    const headers = lines[0].split(',').map(header => header.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(value => value.trim());
      if (values.length !== headers.length) continue; // Skip lines with incorrect number of values

      const row: { [key: string]: string } = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j];
      }
      data.push(row);
    }

    return data;
  };

  const handleFile = async (file: File) => {
    if (!user) {
      toast.error('You must be logged in to upload files');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setIsUploading(true);

    try {
      // Check if file already exists globally
      const isUnique = await checkFileUniqueness(file.name);
      
      if (!isUnique) {
        toast.error(`File "${file.name}" has already been imported. Each file can only be imported once globally.`);
        setIsUploading(false);
        return;
      }

      const text = await file.text();
      const data = parseCSVContent(text);
      
      if (data.length === 0) {
        toast.error('No valid data found in the CSV file');
        setIsUploading(false);
        return;
      }

      // Insert data with filename for tracking
      const dataWithMetadata = data.map(row => ({
        ...row,
        user_id: user.id,
        filename: file.name,
      }));

      const { error } = await supabase
        .from('water_consumption_metrics')
        .insert(dataWithMetadata);

      if (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload data');
      } else {
        toast.success(`Successfully uploaded ${data.length} records from ${file.name}`);
        onUploadSuccess?.();
      }
    } catch (error) {
      console.error('File processing error:', error);
      toast.error('Failed to process file');
    } finally {
      setIsUploading(false);
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
      handleFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload CSV File</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-md p-4 relative ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <Upload className="mx-auto h-6 w-6 text-gray-500" />
            <p className="mt-2 text-sm text-gray-500">
              Drag and drop your CSV file here or click to select a file.
            </p>
          </div>
          <input
            type="file"
            accept=".csv"
            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileInputChange}
            disabled={isUploading}
          />
          {isUploading && (
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-white bg-opacity-75">
              <p>Uploading...</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUpload;
