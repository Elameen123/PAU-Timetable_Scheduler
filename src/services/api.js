import axios from 'axios';

// Determine API base URL based on environment
const getApiBaseUrl = () => {
  // For Hugging Face Spaces, use the current domain
  if (window.location.hostname.includes('hf.space') || window.location.hostname.includes('huggingface.co')) {
    return window.location.origin;
  }
  // For local development
  return process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:7860';
};

const API_BASE_URL = getApiBaseUrl();

// Create axios instance with CORS-friendly config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes timeout for large file processing
  withCredentials: false, // Important for CORS
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging and CORS handling
apiClient.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method.toUpperCase()} request to ${config.url}`);
    
    // Set appropriate headers for different request types
    if (config.data instanceof FormData) {
      // For file uploads, let browser set Content-Type with boundary
      delete config.headers['Content-Type'];
    } else if (typeof config.data === 'object' && config.data !== null) {
      // For JSON data
      config.headers['Content-Type'] = 'application/json';
    }
    
    // Add CORS headers
    config.headers['Access-Control-Allow-Origin'] = '*';
    config.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    config.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
    
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      // Handle CORS-specific errors
      if (status === 0 || error.message.includes('CORS') || error.message.includes('Network Error')) {
        throw new Error('CORS error: Please ensure the backend is properly configured for cross-origin requests.');
      }
      
      const message = data?.message || data?.error || `Server error (${status})`;
      throw new Error(message);
    } else if (error.request) {
      // Request was made but no response received
      if (error.message.includes('CORS') || error.code === 'ERR_NETWORK') {
        throw new Error('CORS policy blocked the request. Please check backend CORS configuration.');
      }
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    } else {
      // Something else happened
      throw new Error(error.message || 'An unexpected error occurred');
    }
  }
);

/**
 * Make a CORS-safe request with retry logic
 * @param {Function} requestFn - The axios request function
 * @param {number} retries - Number of retries
 */
const makeRequestWithRetry = async (requestFn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      if (i === retries - 1) throw error;
      
      // If CORS error, wait and retry
      if (error.message.includes('CORS') || error.message.includes('Network Error')) {
        console.log(`CORS error, retrying... (${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      } else {
        throw error;
      }
    }
  }
};

/**
 * Upload file to the server with CORS handling
 * @param {File} file - The Excel file to upload
 * @returns {Promise<Object>} Response containing file ID and metadata
 */
export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('filename', file.name);

  const uploadEndpoint = process.env.REACT_APP_UPLOAD_ENDPOINT || '/upload-excel';

  try {
    const response = await makeRequestWithRetry(() => 
      apiClient.post(uploadEndpoint, formData, {
        headers: {
          // Let browser set Content-Type for FormData
        }
      })
    );

    // Server should return JSON like: { upload_id: "uuid-1234", filename: "...", status: "uploaded" }
    const data = response.data;
    const uploadId = data.upload_id || data.uploadId || data.id; // defensive read
    if (!uploadId) throw new Error('upload_id not returned by server');

    console.log('Upload successful:', data);
    // return full server response if you want metadata, but the uploadId is essential
    return { uploadId, meta: data };
  } catch (err) {
    console.error('Upload error details:', err);
    const message = err?.response?.data?.error || err.message || 'Upload failed';
    throw new Error(`File upload failed: ${message}`);
  }
};

/**
 * Generate timetable from uploaded file
 * @param {string} uploadId - ID of the uploaded file
 * @param {Function} progressCallback - Callback for progress updates
 * @returns {Promise<Object>} Generated timetable data
 */
export const generateTimetable = async (uploadId, progressCallback) => {
  try {
    // Start the generation process
    const body = {
      upload_id: uploadId,
      config: {
        population_size: 50,
        max_generations: 40,
        F: 0.4,
        CR: 0.9
      }
    };

    console.log('Starting timetable generation with:', body);
    const startResponse = await makeRequestWithRetry(() =>
      apiClient.post('/generate-timetable', body)
    );

    if (startResponse.status !== 202) {
      throw new Error('Failed to start timetable generation');
    }

    console.log('Generation started, polling for status...');
    // Poll for status updates
    return await pollForCompletion(uploadId, progressCallback);

  } catch (error) {
    console.error('Generation error:', error);
    const msg = error?.response?.data?.error || error?.message || 'Unknown error';
    throw new Error(`Timetable generation failed: ${msg}`);
  }
};

/**
 * Poll the server for generation completion status with CORS handling
 * @param {string} uploadId - Upload ID to check status for
 * @param {Function} progressCallback - Progress update callback
 * @returns {Promise<Object>} Final timetable data
 */
const pollForCompletion = async (uploadId, progressCallback) => {
  const maxAttempts = 120; // 10 minutes with 5-second intervals
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const checkStatus = async () => {
      try {
        attempts++;
        
        const statusResponse = await makeRequestWithRetry(() =>
          apiClient.get(`/get-timetable-status/${uploadId}`)
        );
        const statusData = statusResponse.data;
        
        console.log(`Status check ${attempts}:`, statusData.status, statusData.progress);
        
        // Update progress if callback provided
        if (progressCallback) {
          progressCallback({
            percentage: statusData.progress || 0,
            message: statusData.message || 'Processing...'
          });
        }

        if (statusData.status === 'completed') {
          // Generation completed successfully
          console.log('Generation completed successfully');
          const result = statusData.result;
          
          // Transform the data to ensure it's in the expected format
          if (result) {
            // Ensure timetables array exists and has proper format
            if (!result.timetables && result.timetables_raw) {
              result.timetables = result.timetables_raw;
            }
            
            // If we have parsed_timetables, use those to enhance timetables data
            if (result.parsed_timetables && result.timetables) {
              result.timetables = result.timetables.map((timetable, index) => {
                const parsed = result.parsed_timetables[index];
                return {
                  ...timetable,
                  rows: parsed ? parsed.rows : []
                };
              });
            }
          }
          
          resolve(result);
          return;
        }
        
        if (statusData.status === 'error') {
          // Generation failed
          console.error('Generation failed:', statusData.error);
          reject(new Error(statusData.error || 'Generation failed'));
          return;
        }
        
        if (statusData.status === 'processing') {
          // Still processing, continue polling
          if (attempts >= maxAttempts) {
            reject(new Error('Generation timeout - please try again'));
            return;
          }
          
          // Poll again in 5 seconds
          setTimeout(checkStatus, 5000);
          return;
        }
        
        // Unknown status
        reject(new Error(`Unknown status: ${statusData.status}`));
        
      } catch (error) {
        console.error('Status check error:', error);
        
        // If it's a CORS error, provide helpful message
        if (error.message.includes('CORS')) {
          reject(new Error('CORS policy is blocking requests to the backend. Please check the server configuration.'));
        } else {
          reject(error);
        }
      }
    };

    // Start polling
    checkStatus();
  });
};

/**
 * Download generated timetable in specified format with CORS handling
 * @param {string} uploadId - The upload ID from the generation process
 * @param {string} format - Download format ('excel', 'pdf')
 * @returns {Promise<void>}
 */
export const downloadTimetable = async (uploadId, format) => {
  try {
    console.log(`Downloading timetable: ${uploadId} in ${format} format`);
    const response = await makeRequestWithRetry(() =>
      apiClient.post(
        '/export-timetable',
        {
          upload_id: uploadId,
          format: format.toLowerCase()
        },
        {
          responseType: 'blob', // Important for file downloads
        }
      )
    );

    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Set filename based on format
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `timetable_${timestamp}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
    link.setAttribute('download', filename);
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Download error:', error);
    throw new Error(`Download failed: ${error.message}`);
  }
};

/**
 * Get available time slots from server
 * @returns {Promise<Array>} Available time slots
 */
export const getTimeSlots = async () => {
  try {
    // Try to get time slots from API first
    const response = await makeRequestWithRetry(() =>
      apiClient.get('/timetable/timeslots')
    );
    return response.data;
  } catch (error) {
    // If API endpoint doesn't exist or fails, return default time slots
    console.warn('Failed to fetch time slots from API, using defaults:', error.message);
    return [
      { start: '09:00', end: '10:00', label: '9:00 AM' },
      { start: '10:00', end: '11:00', label: '10:00 AM' },
      { start: '11:00', end: '12:00', label: '11:00 AM' },
      { start: '12:00', end: '13:00', label: '12:00 PM' },
      { start: '14:00', end: '15:00', label: '2:00 PM' },
      { start: '15:00', end: '16:00', label: '3:00 PM' },
      { start: '16:00', end: '17:00', label: '4:00 PM' },
    ];
  }
};

/**
 * Validate uploaded file on server
 * @param {string} fileId - ID of uploaded file
 * @returns {Promise<Object>} Validation results
 */
export const validateFile = async (fileId) => {
  try {
    const response = await makeRequestWithRetry(() =>
      apiClient.post('/timetable/validate', { fileId })
    );
    return response.data;
  } catch (error) {
    throw new Error(`File validation failed: ${error.message}`);
  }
};

export default apiClient;
