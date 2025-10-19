import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './TimetableResults.css';

// Time slots configuration
const timeSlots = [
  { start: '09:00', end: '10:00', label: '9:00 AM' },
  { start: '10:00', end: '11:00', label: '10:00 AM' },
  { start: '11:00', end: '12:00', label: '11:00 AM' },
  { start: '12:00', end: '13:00', label: '12:00 PM' },
  { start: '13:00', end: '14:00', label: '1:00 PM (Break)' },
  { start: '14:00', end: '15:00', label: '2:00 PM' },
  { start: '15:00', end: '16:00', label: '3:00 PM' },
  { start: '16:00', end: '17:00', label: '4:00 PM' },
];

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/**
 * Enhanced function to find event data for a specific time slot and day
 * Handles multiple data formats and parsing scenarios with robust location parsing
/**
 * Enhanced function to find event data for a specific time slot and day
 * Handles multiple data formats with priority on backend 3-line format: Course\nRoom\nLecturer
 */



const findEventForSlot = (timetable, day, timeLabel) => {
  if (!timetable || !timetable.timetable) {
    return null;
  }

  const dayIndex = daysOfWeek.indexOf(day);
  if (dayIndex === -1) return null;

  // Find the time slot that matches the label
  const timeSlotIndex = timeSlots.findIndex(slot => slot.label === timeLabel);
  if (timeSlotIndex === -1) return null;

  // Get the timetable grid
  const grid = timetable.timetable;
  if (!Array.isArray(grid) || timeSlotIndex >= grid.length) {
    return null;
  }

  const row = grid[timeSlotIndex];
  if (!Array.isArray(row) || dayIndex + 1 >= row.length) {
    return null;
  }

  // Extract the cell content (column 0 is time, columns 1-5 are days)
  const cellContent = row[dayIndex + 1];
  
  if (!cellContent || 
      cellContent.toString().trim() === '' || 
      cellContent.toString().toUpperCase().includes('BREAK') ||
      cellContent.toString().trim() === '-') {
    return null;
  }

  // Parse the cell content - handle multiple formats
  const content = cellContent.toString().trim();
  const event = {
    course: 'Unknown',
    lecturer: 'TBD', 
    room: 'Unknown'
  };

  try {
    // PRIORITY FORMAT: Backend 3-line format "Course\nRoom\nLecturer"
    // This is the primary format from differential_evolution_api.py
    if (content.includes('\n')) {
      const lines = content.split(/[\n\r]+/).map(l => l.trim()).filter(l => l);
      
      if (lines.length === 3) {
        // Exact 3-line format: Line 0 = Course, Line 1 = Room, Line 2 = Lecturer
        event.course = lines[0];
        event.room = lines[1];
        event.lecturer = lines[2];
        
        // Validate and clean up
        if (event.course.length > 50) {
          event.course = event.course.substring(0, 47) + '...';
        }
        return event;
      }
      else if (lines.length === 2) {
        // 2-line format: Try to determine which is which
        event.course = lines[0];
        
        // Check if line 1 looks like a room or lecturer
        const line1 = lines[1];
        if (line1.match(/^[A-Z]{1,4}[-\s]?\d+[A-Z]?$/i) || // Room patterns like LH-1, A101
            line1.match(/^(room|lab|hall|lecture|theatre|theater|building|block)\s*/i)) {
          event.room = line1;
          event.lecturer = 'TBD';
        } else if (line1.toLowerCase().includes('dr.') || 
                   line1.toLowerCase().includes('prof.') || 
                   line1.toLowerCase().includes('mr.') || 
                   line1.toLowerCase().includes('ms.') ||
                   line1.toLowerCase().includes('mrs.')) {
          event.lecturer = line1;
          event.room = 'Unknown';
        } else {
          // Default: assume it's lecturer
          event.lecturer = line1;
          event.room = 'Unknown';
        }
        
        return event;
      }
      else if (lines.length > 3) {
        // More than 3 lines: Use first 3 intelligently
        event.course = lines[0];
        
        // Find room and lecturer from remaining lines
        let foundRoom = false;
        let foundLecturer = false;
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          
          // Check for room patterns first
          if (!foundRoom && (
              line.match(/^[A-Z]{1,4}[-\s]?\d+[A-Z]?$/i) || 
              line.match(/^(room|lab|hall|lecture|building)\s*\d+/i) ||
              line.toLowerCase().includes('hall') ||
              line.toLowerCase().includes('lab') ||
              line.toLowerCase().includes('room'))) {
            event.room = line;
            foundRoom = true;
          }
          // Check for lecturer patterns
          else if (!foundLecturer && (
              line.toLowerCase().includes('dr.') || 
              line.toLowerCase().includes('prof.') || 
              line.toLowerCase().includes('mr.') || 
              line.toLowerCase().includes('ms.') ||
              line.toLowerCase().includes('mrs.'))) {
            event.lecturer = line;
            foundLecturer = true;
          }
          // If we haven't found room and this doesn't look like lecturer, use as room
          else if (!foundRoom && foundLecturer) {
            event.room = line;
            foundRoom = true;
          }
          // If we haven't found lecturer and this doesn't look like room, use as lecturer
          else if (!foundLecturer && foundRoom) {
            event.lecturer = line;
            foundLecturer = true;
          }
        }
        
        return event;
      }
      else if (lines.length === 1) {
        // Single line after split - fall through to other parsers
        event.course = lines[0];
      }
    }
    
    // Format 1: "Course: ABC123, Lecturer: Dr X, Room: LH-1" 
    if (content.includes(',') && content.includes(':')) {
      const parts = content.split(',').map(p => p.trim());
      parts.forEach(part => {
        const colonIndex = part.indexOf(':');
        if (colonIndex > -1) {
          const key = part.substring(0, colonIndex).toLowerCase().trim();
          const value = part.substring(colonIndex + 1).trim();
          
          if (key.includes('course') || key.includes('subject') || key.includes('class')) {
            event.course = value || 'Unknown';
          } else if (key.includes('lecturer') || key.includes('teacher') || key.includes('instructor') || key.includes('faculty')) {
            event.lecturer = value || 'TBD';
          } else if (key.includes('room') || key.includes('location') || key.includes('venue') || 
                     key.includes('hall') || key.includes('lab') || key.includes('class')) {
            event.room = value || 'Unknown';
          }
        }
      });
      return event;
    }
    
    // Format 2: JSON-like object
    else if (content.startsWith('{') && content.endsWith('}')) {
      const parsed = JSON.parse(content);
      event.course = parsed.course || parsed.subject || parsed.name || parsed.class || 'Unknown';
      event.lecturer = parsed.lecturer || parsed.teacher || parsed.instructor || parsed.faculty || 'TBD';
      event.room = parsed.room || parsed.location || parsed.venue || parsed.hall || parsed.lab || 'Unknown';
      return event;
    }
    
    // Format 3: Pipe-separated "Course|Room|Lecturer" or "Course|Lecturer|Room"
    else if (content.includes('|')) {
      const parts = content.split('|').map(p => p.trim());
      if (parts.length >= 1) event.course = parts[0] || 'Unknown';
      if (parts.length >= 2) {
        // Try to determine if part 1 is room or lecturer
        if (parts[1].match(/^[A-Z]{1,4}[-\s]?\d+[A-Z]?$/i) || 
            parts[1].match(/^(room|lab|hall)\s*/i)) {
          event.room = parts[1] || 'Unknown';
          if (parts.length >= 3) event.lecturer = parts[2] || 'TBD';
        } else {
          event.lecturer = parts[1] || 'TBD';
          if (parts.length >= 3) event.room = parts[2] || 'Unknown';
        }
      }
      return event;
    }
    
    // Format 4: Tab or multiple space separated
    else if (content.match(/\s{2,}/)) {
      const parts = content.split(/\s{2,}/).map(p => p.trim()).filter(p => p);
      if (parts.length >= 1) event.course = parts[0] || 'Unknown';
      
      if (parts.length >= 2) {
        // Intelligently assign remaining parts
        parts.slice(1).forEach(part => {
          // Check for room patterns
          if (part.match(/^[A-Z]{1,4}[-\s]?\d+[A-Z]?$/i) || 
              part.match(/^(room|lab|hall|lecture|theatre|theater)\s*\d+/i) || 
              part.toLowerCase().includes('hall') ||
              part.toLowerCase().includes('lab') ||
              part.toLowerCase().includes('room')) {
            event.room = part;
          }
          // Check for lecturer patterns
          else if (part.toLowerCase().includes('dr.') || 
                   part.toLowerCase().includes('prof.') || 
                   part.toLowerCase().includes('mr.') || 
                   part.toLowerCase().includes('ms.') ||
                   part.toLowerCase().includes('mrs.')) {
            event.lecturer = part;
          }
          // Default assignment
          else if (event.lecturer === 'TBD') {
            event.lecturer = part;
          } else if (event.room === 'Unknown') {
            event.room = part;
          }
        });
      }
      return event;
    }
    
    // Format 5: Simple course name only with embedded patterns
    else if (content.length > 0) {
      // Look for room-like patterns in the content
      const roomPattern = /\b([A-Z]{1,4}[-\s]?\d+[A-Z]?|room\s*\d+|lab\s*\d+|hall\s*\d+|building\s*[A-Z]\s*\d*)\b/gi;
      const roomMatches = content.match(roomPattern);
      
      if (roomMatches && roomMatches.length > 0) {
        event.room = roomMatches[0];
        event.course = content.replace(roomPattern, '').trim();
      } else {
        event.course = content;
      }
      
      // Look for lecturer patterns
      const lecturerPattern = /(dr\.|prof\.|mr\.|ms\.|mrs\.)\s*[a-z\s]+/gi;
      const lecturerMatches = content.match(lecturerPattern);
      
      if (lecturerMatches && lecturerMatches.length > 0) {
        event.lecturer = lecturerMatches[0];
        event.course = event.course.replace(lecturerPattern, '').trim();
      }
      
      // Clean up course name
      if (event.course.length === 0) {
        event.course = content.length > 50 ? content.substring(0, 47) + '...' : content;
      }
    }
    
    // Final cleanup and validation
    if (event.course.length > 50) {
      event.course = event.course.substring(0, 47) + '...';
    }
    
    // Ensure we don't have empty values
    if (!event.course || event.course.trim() === '') event.course = 'Unknown';
    if (!event.lecturer || event.lecturer.trim() === '') event.lecturer = 'TBD';
    if (!event.room || event.room.trim() === '') event.room = 'Unknown';
    
  } catch (parseError) {
    console.warn('Error parsing cell content:', content, parseError);
    // Fallback to simple parsing
    event.course = content.length > 50 ? content.substring(0, 47) + '...' : content;
    event.lecturer = 'TBD';
    event.room = 'Unknown';
  }

  return event;
};

/**
 * Helper function to calculate timetable statistics
 */
const calculateTimetableStats = (timetable) => {
  if (!timetable || !timetable.timetable) {
    return { totalCourses: 0, totalHours: 0, filledSlots: 0 };
  }

  const grid = timetable.timetable;
  let filledSlots = 0;
  const courses = new Set();

  grid.forEach((row, timeIndex) => {
    if (!Array.isArray(row)) return;
    
    // Skip break time
    if (timeSlots[timeIndex]?.label?.includes('Break')) return;
    
    daysOfWeek.forEach((day, dayIndex) => {
      const event = findEventForSlot(timetable, day, timeSlots[timeIndex]?.label);
      if (event) {
        filledSlots++;
        courses.add(event.course);
      }
    });
  });

  return {
    totalCourses: courses.size,
    totalHours: filledSlots,
    filledSlots: filledSlots
  };
};

/**
 * Main TimetableResults component with integrated Dash functionality
 */
const TimetableResults = ({ 
  timetables = [], 
  uploadId = null,
  onInteractiveEdit = null,
  loading = false,
  className = '',
  showSearch = true,
  showNavigation = true,
  enableDashIntegration = true
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showBackButton, setShowBackButton] = useState(false);
  
  // Dash Integration States
  const [dashLoading, setDashLoading] = useState(false);
  const [dashError, setDashError] = useState('');
  const [dashUrl, setDashUrl] = useState('');
  const [showDashModal, setShowDashModal] = useState(false);
  const [dashSessionId, setDashSessionId] = useState('');

  // Filter timetables based on search query
  const filteredTimetables = useMemo(() => {
    if (!searchQuery.trim()) {
      setShowBackButton(false);
      return timetables;
    }
    
    setShowBackButton(true);
    const query = searchQuery.toLowerCase().trim();
    
    return timetables.filter(timetable => {
      const groupName = (timetable.student_group?.name || timetable.title || '').toLowerCase();
      const department = (timetable.student_group?.department || '').toLowerCase();
      const level = (timetable.student_group?.level || '').toLowerCase();
      
      return groupName.includes(query) || 
             department.includes(query) || 
             level.includes(query) ||
             `${department} ${level}`.includes(query);
    });
  }, [timetables, searchQuery]);

  // Reset current slide when filtered results change
  useEffect(() => {
    if (currentSlide >= filteredTimetables.length && filteredTimetables.length > 0) {
      setCurrentSlide(0);
    }
  }, [filteredTimetables.length, currentSlide]);

  // Navigation functions with transition handling
  const nextSlide = useCallback(() => {
    if (isTransitioning || filteredTimetables.length <= 1) return;
    
    setIsTransitioning(true);
    setCurrentSlide(prev => (prev + 1) % filteredTimetables.length);
    
    setTimeout(() => setIsTransitioning(false), 300);
  }, [filteredTimetables.length, isTransitioning]);

  const prevSlide = useCallback(() => {
    if (isTransitioning || filteredTimetables.length <= 1) return;
    
    setIsTransitioning(true);
    setCurrentSlide(prev => prev === 0 ? filteredTimetables.length - 1 : prev - 1);
    
    setTimeout(() => setIsTransitioning(false), 300);
  }, [filteredTimetables.length, isTransitioning]);

  // Direct slide navigation
  const goToSlide = useCallback((index) => {
    if (isTransitioning || index === currentSlide || index >= filteredTimetables.length) return;
    
    setIsTransitioning(true);
    setCurrentSlide(index);
    
    setTimeout(() => setIsTransitioning(false), 300);
  }, [currentSlide, filteredTimetables.length, isTransitioning]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return; // Don't navigate when typing in search
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide]);

  // Clear search function
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setCurrentSlide(0);
  }, []);

  // Get API base URL
  const getApiBaseUrl = useCallback(() => {
    // Check if we're in Hugging Face Spaces
    if (window.location.hostname.includes('hf.space') || 
        window.location.hostname.includes('huggingface.co')) {
      return window.location.origin;
    }
    // Use environment variable or default to Flask backend
    return process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:7860';
  }, []);

  // Dash session creation
  const createDashSession = useCallback(async () => {
    if (!uploadId) {
      throw new Error('No upload ID available for interactive editing');
    }

    const apiBaseUrl = getApiBaseUrl();
    const endpoint = `${apiBaseUrl}/create-dash-session`;
    
    console.log('Creating Dash session for upload:', uploadId);
    console.log('API Endpoint:', endpoint);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          uploadId: uploadId,
          upload_id: uploadId
        })
      });

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
        } catch (e) {
          // If response is not JSON (like HTML error page)
          const textError = await response.text();
          console.error('Non-JSON error response:', textError.substring(0, 200));
          errorMessage = `Server error (${response.status}): Backend not responding correctly`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Dash session response:', data);

      if (!data.success) {
        throw new Error(data.error || data.message || 'Failed to create session');
      }

      return {
        success: data.success || false,
        dash_url: data.dash_url,
        port: data.port,
        session_id: data.session_id,
        message: data.message
      };
    } catch (error) {
      // Handle network errors
      if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
        throw new Error(`Cannot connect to backend at ${apiBaseUrl}. Please ensure the Flask server is running.`);
      }
      throw error;
    }
  }, [uploadId, getApiBaseUrl]);

  // Launch interactive view - unified function that handles both Dash and external handlers
  const launchInteractiveView = useCallback(async (displayMode = 'newWindow') => {
    // Try external handler first if provided
    if (onInteractiveEdit && typeof onInteractiveEdit === 'function') {
      try {
        const result = await onInteractiveEdit(filteredTimetables[currentSlide], currentSlide);
        if (result !== false) return; // If external handler succeeds, don't use Dash
      } catch (error) {
        console.warn('External interactive handler failed, falling back to Dash:', error);
      }
    }

    // Use Dash integration if enabled
    if (!enableDashIntegration) {
      setDashError('Interactive editing is not available');
      return;
    }

    setDashLoading(true);
    setDashError('');

    try {
      const sessionResponse = await createDashSession();
      
      if (sessionResponse.success && sessionResponse.dash_url) {
        setDashUrl(sessionResponse.dash_url);
        setDashSessionId(sessionResponse.session_id || uploadId);
        
        if (displayMode === 'newWindow') {
          // Open in new window/tab
          const dashWindow = window.open(
            sessionResponse.dash_url, 
            'dash_interactive_editor',
            'width=1400,height=900,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,status=no'
          );
          
          if (!dashWindow) {
            setDashError('Popup blocked. Please allow popups for this site and try again.');
            return;
          }
          
          console.log('Dash session opened in new window:', sessionResponse.dash_url);
        } else if (displayMode === 'modal') {
          // Show in modal iframe
          setShowDashModal(true);
        }
      } else {
        throw new Error(sessionResponse.message || 'Failed to create interactive session');
      }
    } catch (error) {
      console.error('Dash session creation error:', error);
      setDashError(`Failed to create interactive session: ${error.message}`);
    } finally {
      setDashLoading(false);
    }
  }, [onInteractiveEdit, filteredTimetables, currentSlide, enableDashIntegration, createDashSession, uploadId]);

  // Close Dash modal
  const closeDashModal = useCallback(() => {
    setShowDashModal(false);
    setDashUrl('');
    setDashError('');
  }, []);

  // Clear Dash error
  const clearDashError = useCallback(() => {
    setDashError('');
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className={`timetable-results loading ${className}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading timetables...</p>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!timetables.length) {
    return (
      <div className={`timetable-results empty ${className}`}>
        <div className="empty-state">
          <h3>No Timetables Available</h3>
          <p>Generate timetables first to view them here.</p>
        </div>
      </div>
    );
  }

  // Show no search results
  if (!filteredTimetables.length) {
    return (
      <div className={`timetable-results no-results ${className}`}>
        <div className="no-results-container">
          <h3>No Results Found</h3>
          <p>No timetables match your search criteria.</p>
          <button onClick={clearSearch} className="clear-search-btn">
            Clear Search
          </button>
        </div>
      </div>
    );
  }

  const currentTimetable = filteredTimetables[currentSlide];
  const stats = calculateTimetableStats(currentTimetable);

  return (
    <div className={`timetable-results ${className}`}>
      {/* Header Section */}
      <div className="results-header">
        <div className="header-left">
          <h2>Generated Timetables</h2>
          <span className="results-count">
            {searchQuery ? `${filteredTimetables.length} of ${timetables.length}` : filteredTimetables.length} 
            {filteredTimetables.length === 1 ? ' timetable' : ' timetables'}
          </span>
        </div>

        <div className="header-right">
          {/* Navigation Controls */}
          {showNavigation && filteredTimetables.length > 1 && (
            <div className="carousel-nav">
              <button 
                onClick={prevSlide} 
                disabled={isTransitioning}
                className="nav-btn prev-btn"
                aria-label="Previous timetable"
                title="Previous timetable (Left Arrow)"
              >
                ‹
              </button>
              
              <div className="slide-indicator">
                <span className="current-slide">{currentSlide + 1}</span>
                <span className="slide-separator">/</span>
                <span className="total-slides">{filteredTimetables.length}</span>
              </div>
              
              <button 
                onClick={nextSlide} 
                disabled={isTransitioning}
                className="nav-btn next-btn"
                aria-label="Next timetable"
                title="Next timetable (Right Arrow)"
              >
                ›
              </button>
            </div>
          )}

          {/* Interactive Edit Controls */}
          {(onInteractiveEdit || enableDashIntegration) && (
            <div className="interactive-controls">
              <button
                onClick={() => launchInteractiveView('newWindow')}
                disabled={loading || dashLoading || !currentTimetable || (!uploadId && enableDashIntegration)}
                className="interactive-btn"
                title="Open interactive editor in new window"
              >
                {dashLoading ? (
                  <>
                    <span className="loading-spinner-small"></span>
                    Creating Session...
                  </>
                ) : (
                  <>🎯 Interactive Edit</>
                )}
              </button>
              
              {enableDashIntegration && (
                <button
                  onClick={() => launchInteractiveView('modal')}
                  disabled={loading || dashLoading || !currentTimetable || !uploadId}
                  className="interactive-btn interactive-btn-secondary"
                  title="Open interactive editor in modal"
                >
                  📋 Edit in Modal
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Search Controls */}
      {showSearch && (
        <div className="search-controls">
          <div className="search-input-group">
            <input
              type="text"
              placeholder="Search by department, level, or group name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {showBackButton && (
              <button 
                onClick={clearSearch}
                className="clear-search-btn"
                type="button"
                aria-label="Clear search"
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {/* Slide Navigation Dots (for many timetables) */}
      {filteredTimetables.length > 1 && filteredTimetables.length <= 10 && (
        <div className="slide-dots">
          {filteredTimetables.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`dot ${index === currentSlide ? 'active' : ''}`}
              aria-label={`Go to timetable ${index + 1}`}
              disabled={isTransitioning}
            />
          ))}
        </div>
      )}

      {/* Main Timetable Display */}
      <div className="timetable-container">
        <div className={`timetable-slide ${isTransitioning ? 'transitioning' : 'active'}`}>
          {currentTimetable && (
            <div className="timetable-card">
              {/* Timetable Header */}
              <div className="timetable-header">
                <div className="timetable-title">
                  <h4 className="group-name">
                    {currentTimetable.student_group?.name || 
                     currentTimetable.title || 
                     `Group ${currentSlide + 1}`}
                  </h4>
                  {currentTimetable.student_group?.department && (
                    <span className="group-department">
                      {currentTimetable.student_group.department}
                      {currentTimetable.student_group.level && ` - Level ${currentTimetable.student_group.level}`}
                    </span>
                  )}
                </div>
                
                {stats.totalCourses > 0 && (
                  <div className="course-summary">
                    <span className="stat-item">
                      <strong>{stats.totalCourses}</strong> courses
                    </span>
                    <span className="stat-item">
                      <strong>{stats.totalHours}</strong> hours scheduled
                    </span>
                    <span className="stat-item">
                      <strong>{Math.round((stats.filledSlots / (5 * 7)) * 100)}%</strong> utilization
                    </span>
                  </div>
                )}
              </div>

              {/* Calendar Grid */}
              <div className="calendar-grid">
                {/* Grid Header */}
                <div className="calendar-header">
                  <div className="time-col-header">Time</div>
                  {daysOfWeek.map((day) => (
                    <div key={day} className="day-col-header">{day}</div>
                  ))}
                </div>

                {/* Grid Body */}
                <div className="calendar-body">
                  {timeSlots.map((slot, rowIdx) => (
                    <div key={rowIdx} className="calendar-row">
                      <div className="time-col">{slot.label}</div>
                      {daysOfWeek.map((day) => {
                        const event = findEventForSlot(currentTimetable, day, slot.label);
                        const isBreakTime = slot.label.includes('Break');
                        
                        return (
                          <div 
                            key={day} 
                            className={`calendar-cell ${
                              event ? 'has-event' : 
                              isBreakTime ? 'break-time' : 'empty'
                            }`}
                          >
                            {isBreakTime ? (
                              <div className="break-indicator">BREAK</div>
                            ) : event ? (
                              <div className="event-content">
                                <div className="event-course" title={event.course}>
                                  {event.course}
                                </div>
                                <div className="event-details">
                                  {event.lecturer !== 'TBD' && (
                                    <span className="event-lecturer" title={`Lecturer: ${event.lecturer}`}>
                                      👨‍🏫 {event.lecturer}
                                    </span>
                                  )}
                                  {event.room !== 'Unknown' && (
                                    <span className="event-room" title={`Location: ${event.room}`}>
                                      📍 {event.room}
                                    </span>
                                  )}
                                  {event.lecturer === 'TBD' && event.room === 'Unknown' && (
                                    <span className="event-incomplete">
                                      ⚠️ Details pending
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="empty-slot">Free</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Timetable Footer */}
              <div className="timetable-footer">
                <div className="footer-info">
                  <span>Generated on {new Date().toLocaleDateString()}</span>
                  {currentTimetable.generation_time && (
                    <span>Generation time: {currentTimetable.generation_time}ms</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard Navigation Hint */}
      {filteredTimetables.length > 1 && (
        <div className="keyboard-hint">
          Use ← → arrow keys to navigate between timetables
        </div>
      )}

      {/* Dash Error Display */}
      {dashError && (
        <div className="dash-error-container">
          <div className="dash-error">
            <span className="error-icon">⚠️</span>
            <div className="error-content">
              <span className="error-message">{dashError}</span>
              {dashError.includes('Cannot connect to backend') && (
                <div className="error-help">
                  <p><strong>Troubleshooting Steps:</strong></p>
                  <ol>
                    <li>Ensure Flask backend is running on port 7860</li>
                    <li>Check Flask server logs for errors</li>
                    <li>Verify CORS is enabled in Flask app</li>
                    <li>Try refreshing the page and generating again</li>
                  </ol>
                  <p>Backend URL: <code>{getApiBaseUrl()}</code></p>
                </div>
              )}
            </div>
            <button 
              onClick={clearDashError}
              className="error-close-btn"
              aria-label="Close error"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Dash Integration Status */}
      {dashLoading && (
        <div className="dash-status-container">
          <div className="dash-status loading">
            <span className="loading-spinner"></span>
            <span>Creating interactive session...</span>
          </div>
        </div>
      )}

      {/* Dash Modal for iframe integration */}
      {showDashModal && dashUrl && (
        <div className="dash-modal-overlay" onClick={closeDashModal}>
          <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>Interactive Timetable Editor</h3>
              <div className="dash-modal-controls">
                <button
                  onClick={() => window.open(dashUrl, '_blank')}
                  className="btn-open-new"
                  title="Open in new window"
                >
                  🔗 Open in New Window
                </button>
                <button
                  onClick={closeDashModal}
                  className="btn-close"
                  aria-label="Close modal"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="dash-modal-content">
              <iframe
                src={dashUrl}
                title="Interactive Timetable Editor"
                className="dash-iframe"
                frameBorder="0"
                allow="fullscreen"
                onLoad={() => console.log('Dash iframe loaded')}
                onError={(e) => {
                  console.error('Dash iframe error:', e);
                  setDashError('Failed to load interactive editor');
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetableResults;