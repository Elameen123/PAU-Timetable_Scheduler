import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes timeout for large file processing
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// Add request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method.toUpperCase()} request to ${config.url}`);
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
      const message = data?.message || data?.error || `Server error (${status})`;
      throw new Error(message);
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    } else {
      // Something else happened
      throw new Error(error.message || 'An unexpected error occurred');
    }
  }
);

/**
 * Upload file to the server
 * @param {File} file - The Excel file to upload
 * @returns {Promise<Object>} Response containing file ID and metadata
 */
export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('filename', file.name);
  formData.append('filesize', file.size);

  try {
    const response = await apiClient.post(
      process.env.REACT_APP_UPLOAD_ENDPOINT || '/timetable/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(`File upload failed: ${error.message}`);
  }
};

/**
 * Generate timetable from uploaded file
 * @param {string} fileId - ID of the uploaded file
 * @param {Function} progressCallback - Callback for progress updates
 * @returns {Promise<Object>} Generated timetable data
 */
export const generateTimetable = async (fileId, progressCallback) => {
  try {
    const response = await apiClient.post(
      process.env.REACT_APP_GENERATE_ENDPOINT || '/timetable/generate',
      {
        fileId,
        options: {
          conflictResolution: 'auto',
          timeSlots: {
            start: '08:00',
            end: '17:00',
            duration: 60,
          },
          breaks: {
            lunch: { start: '12:00', duration: 60 },
            short: { duration: 15, frequency: 2 }
          }
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        onUploadProgress: (progressEvent) => {
          if (progressCallback) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            progressCallback({
              percentage: percentCompleted,
              message: 'Generating timetable...'
            });
          }
        }
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(`Timetable generation failed: ${error.message}`);
  }
};

/**
 * Download generated timetable in specified format
 * @param {Array} timetableData - The generated timetable data
 * @param {string} format - Download format ('excel', 'pdf', 'image')
 * @returns {Promise<void>}
 */
export const downloadTimetable = async (timetableData, format) => {
  try {
    const response = await apiClient.post(
      process.env.REACT_APP_DOWNLOAD_ENDPOINT || '/timetable/download',
      {
        timetables: timetableData,
        format: format.toLowerCase(),
        options: {
          includeHeaders: true,
          orientation: format === 'pdf' ? 'landscape' : 'portrait',
          quality: format === 'image' ? 'high' : undefined
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        responseType: 'blob', // Important for file downloads
      }
    );

    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Set filename based on format
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `timetable_${timestamp}.${format === 'image' ? 'png' : format === 'pdf' ? 'pdf' : 'xlsx'}`;
    link.setAttribute('download', filename);
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
  } catch (error) {
    throw new Error(`Download failed: ${error.message}`);
  }
};

/**
 * Get available time slots from server
 * @returns {Promise<Array>} Available time slots
 */
export const getTimeSlots = async () => {
  try {
    const response = await apiClient.get('/timetable/timeslots');
    return response.data;
  } catch (error) {
    // Return default time slots if API fails
    console.warn('Failed to fetch time slots from API, using defaults');
    return [
      { start: '08:00', end: '09:00', label: '8:00 AM - 9:00 AM' },
      { start: '09:00', end: '10:00', label: '9:00 AM - 10:00 AM' },
      { start: '10:00', end: '11:00', label: '10:00 AM - 11:00 AM' },
      { start: '11:00', end: '12:00', label: '11:00 AM - 12:00 PM' },
      { start: '13:00', end: '14:00', label: '1:00 PM - 2:00 PM' },
      { start: '14:00', end: '15:00', label: '2:00 PM - 3:00 PM' },
      { start: '15:00', end: '16:00', label: '3:00 PM - 4:00 PM' },
      { start: '16:00', end: '17:00', label: '4:00 PM - 5:00 PM' },
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
    const response = await apiClient.post('/timetable/validate', { fileId });
    return response.data;
  } catch (error) {
    throw new Error(`File validation failed: ${error.message}`);
  }
};

export default apiClient;