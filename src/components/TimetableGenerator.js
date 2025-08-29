import React, { useState } from 'react';
import Header from './Header';
import FileUpload from './FileUpload';
import TimetableResults from './TimetableResults';
import InstructionsModal from './InstructionsModal';
import { uploadFile, generateTimetable, downloadTimetable } from '../services/api.js';
import './TimetableGenerator.css';

const TimetableGenerator = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [generatedData, setGeneratedData] = useState([]);
  const [showInstructions, setShowInstructions] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setError('');
    setGeneratedData([]);
  };

  const handleFileReset = () => {
    setSelectedFile(null);
    setIsProcessing(false);
    setProgress(0);
    setProgressText('');
    setGeneratedData([]);
    setError('');
  };

  const handleGenerate = async () => {
    if (!selectedFile || isProcessing) return;

    setIsProcessing(true);
    setError('');
    setGeneratedData([]);

    try {
      // Upload file
      setProgress(10);
      setProgressText('Uploading file...');
      const uploadResponse = await uploadFile(selectedFile);

      // Generate timetable with progress updates
      setProgress(30);
      setProgressText('Processing data...');
      
      const progressCallback = (progressData) => {
        setProgress(progressData.percentage);
        setProgressText(progressData.message);
      };

      const timetableData = await generateTimetable(uploadResponse.fileId, progressCallback);
      
      setProgress(100);
      setProgressText('Complete!');
      setGeneratedData(timetableData.timetables || []);
      
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        setProgressText('');
      }, 2000);

    } catch (err) {
      setError(err.message || 'An error occurred while generating the timetable');
      setIsProcessing(false);
      setProgress(0);
      setProgressText('');
    }
  };

  const handleDownload = async (format) => {
    if (generatedData.length === 0) return;

    try {
      await downloadTimetable(generatedData, format);
    } catch (err) {
      setError(err.message || 'An error occurred while downloading');
    }
  };

  return (
    <div className="timetable-generator">
      <Header 
        onShowInstructions={() => setShowInstructions(true)}
        onDownload={handleDownload}
        canDownload={generatedData.length > 0}
      />
      
      <main className="main-container">
        <FileUpload
          selectedFile={selectedFile}
          onFileSelect={handleFileSelect}
          onFileReset={handleFileReset}
          onGenerate={handleGenerate}
          isProcessing={isProcessing}
          progress={progress}
          progressText={progressText}
          error={error}
        />
        
        {generatedData.length > 0 && (
          <TimetableResults timetables={generatedData} />
        )}
      </main>

      <InstructionsModal
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
      />
    </div>
  );
};

export default TimetableGenerator;