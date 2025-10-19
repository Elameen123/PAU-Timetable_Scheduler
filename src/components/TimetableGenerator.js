import React, { useState } from 'react';
import Header from './Header';
import FileUpload from './FileUpload';
import TimetableResults from './TimetableResults';
import InstructionsModal from './InstructionsModal';
import { uploadFile, generateTimetable, downloadTimetable } from '../services/api.js';
import './TimetableGenerator.css';
import Footer from './Footer.js';

const TimetableGenerator = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadId, setUploadId] = useState(null); // Track upload ID for downloads
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [generatedData, setGeneratedData] = useState([]);
  const [showInstructions, setShowInstructions] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (file) => {
    console.log('File selected:', file);
    setSelectedFile(file);
    setError('');
    setGeneratedData([]);
    setUploadId(null); // Reset upload ID
  };

  const handleFileReset = () => {
    console.log('Resetting file selection');
    setSelectedFile(null);
    setUploadId(null);
    setIsProcessing(false);
    setProgress(0);
    setProgressText('');
    setGeneratedData([]);
    setError('');
  };

  const handleGenerate = async () => {
    if (!selectedFile || isProcessing) {
      console.log('Cannot generate: no file selected or already processing');
      return;
    }

    console.log('Starting timetable generation...');
    setIsProcessing(true);
    setError('');
    setGeneratedData([]);
    setProgress(5);
    setProgressText('Preparing upload...');

    try {
      // Upload file
      setProgress(10);
      setProgressText('Uploading file...');
      console.log('Uploading file:', selectedFile.name);
      
      const uploadResponse = await uploadFile(selectedFile);
      console.log('Upload response:', uploadResponse);

      // Extract uploadId from response - be very defensive
      const currentUploadId =
        uploadResponse?.uploadId ||
        uploadResponse?.upload_id ||
        uploadResponse?.fileId ||
        uploadResponse?.id ||
        (uploadResponse?.meta && (
          uploadResponse.meta.upload_id || 
          uploadResponse.meta.uploadId || 
          uploadResponse.meta.id
        ));

      console.log('Extracted upload ID:', currentUploadId);

      if (!currentUploadId) {
        throw new Error('Upload ID not returned by server. Response: ' + JSON.stringify(uploadResponse));
      }

      // Store the upload ID for later use
      setUploadId(currentUploadId);

      // Start generation with progress updates
      setProgress(30);
      setProgressText('Starting timetable generation...');

      const progressCallback = (progressData) => {
        console.log('Progress update:', progressData);
        if (!progressData) return;
        
        const pct = typeof progressData.percentage === 'number' ? progressData.percentage : null;
        if (pct !== null) {
          const clampedProgress = Math.min(Math.max(pct, 30), 95); // Keep between 30-95%
          setProgress(clampedProgress);
        }
        
        if (progressData.message) {
          setProgressText(progressData.message);
        }
      };

      // Generate timetable using the upload ID
      console.log('Generating timetable with ID:', currentUploadId);
      const timetableData = await generateTimetable(currentUploadId, progressCallback);
      console.log('Timetable generation completed:', timetableData);

      // Extract timetables from response - handle different response formats
      let timetables = [];

      console.log('=== TIMETABLE DATA EXTRACTION ===');
      console.log('Full response:', timetableData);

      if (timetableData) {
        console.log('Response keys:', Object.keys(timetableData));
        
        // Try different sources in order of preference
        if (Array.isArray(timetableData.timetables) && timetableData.timetables.length > 0) {
          timetables = timetableData.timetables;
          console.log('Using timetables array:', timetables.length, 'items');
        } else if (Array.isArray(timetableData.timetables_raw) && timetableData.timetables_raw.length > 0) {
          timetables = timetableData.timetables_raw;
          console.log('Using timetables_raw array:', timetables.length, 'items');
        } else if (timetableData.data?.timetables) {
          timetables = timetableData.data.timetables;
          console.log('Using data.timetables');
        } else if (Array.isArray(timetableData)) {
          timetables = timetableData;
          console.log('Using root array');
        } else {
          console.log('No valid timetable array found');
          timetables = [];
        }
        
        // Validate structure
        if (timetables.length > 0) {
          console.log('First timetable structure:', {
            type: typeof timetables[0],
            keys: Object.keys(timetables[0] || {}),
            hasStudentGroup: !!timetables[0]?.studentGroup || !!timetables[0]?.student_group,
            hasRows: !!timetables[0]?.rows || !!timetables[0]?.timetable
          });
        }
      }

      console.log('Final timetables count:', timetables.length);
      console.log('===========================');

      console.log('Extracted timetables:', timetables);

      // Validate the timetables data
      if (!Array.isArray(timetables)) {
        console.warn('Timetables is not an array, converting:', timetables);
        timetables = timetables ? [timetables] : [];
      }

      // Set final progress and results
      setProgress(100);
      setProgressText('Complete!');
      setGeneratedData(timetables);

      // Show completion message briefly
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        setProgressText('');
        
        if (timetables.length === 0) {
          setError('Timetable generation completed but no timetable data was returned. Please check your input file and try again.');
        }
      }, 1500);

    } catch (err) {
      console.error('Timetable generation error:', err);
      
      // Handle different error formats
      let errorMessage = 'An error occurred while generating the timetable';
      
      if (err?.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setIsProcessing(false);
      setProgress(0);
      setProgressText('');
    }
  };

  const handleDownload = async (format) => {
    if (!uploadId) {
      setError('No timetable data available for download - missing upload ID');
      return;
    }
    
    if (generatedData.length === 0) {
      setError('No timetable data available for download - no generated data');
      return;
    }

    console.log(`Starting download: ${format} format for upload ID: ${uploadId}`);

    try {
      await downloadTimetable(uploadId, format);
      console.log('Download completed successfully');
    } catch (err) {
      console.error('Download error:', err);
      
      let errorMessage = 'An error occurred while downloading';
      
      if (err?.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  };

  // Debug log for component state
  console.log('TimetableGenerator state:', {
    selectedFile: selectedFile?.name,
    uploadId,
    isProcessing,
    progress,
    generatedDataLength: generatedData.length,
    error
  });

  return (
    <div className="timetable-generator">
      <Header
        onShowInstructions={() => setShowInstructions(true)}
        onDownload={handleDownload}
        canDownload={generatedData.length > 0 && uploadId && !isProcessing}
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


        {generatedData.length > 0 && !isProcessing && (
          <TimetableResults 
            timetables={generatedData} 
            uploadId={uploadId}                    // Required for Dash
            enableDashIntegration={true}           // Enable Dash features
            loading={isProcessing}
          />
        )}

        {error && (
          <div className="error-message" style={{ 
            color: '#dc3545', 
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            padding: '12px',
            marginTop: '16px',
            fontSize: '14px'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </main>

      <InstructionsModal
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
      />

      <Footer/>
    </div>
  );
};

export default TimetableGenerator;