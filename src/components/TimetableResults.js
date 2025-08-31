import React, { useState, useEffect, useRef, useCallback } from 'react';
import './TimetableResults.css';
import { getTimeSlots } from '../services/api';

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const TimetableResults = ({ timetables = [] }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [timeSlots, setTimeSlots] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showBackButton, setShowBackButton] = useState(false);
  
  // Touch/Swipe state
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  
  const carouselRef = useRef(null);
  const containerRef = useRef(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Fetch available timeslots from backend (or defaults)
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const slots = await getTimeSlots();
        setTimeSlots(slots);
      } catch (error) {
        console.error('Error fetching time slots:', error);
        // Use default slots if API fails
        setTimeSlots([
          { start: '09:00', end: '10:00', label: '9:00 AM' },
          { start: '10:00', end: '11:00', label: '10:00 AM' },
          { start: '11:00', end: '12:00', label: '11:00 AM' },
          { start: '12:00', end: '13:00', label: '12:00 PM' },
          { start: '14:00', end: '15:00', label: '2:00 PM' },
          { start: '15:00', end: '16:00', label: '3:00 PM' },
          { start: '16:00', end: '17:00', label: '4:00 PM' },
        ]);
      }
    };
    fetchSlots();
  }, []);

  // Debug log to see what timetables data looks like
  useEffect(() => {
    console.log('TimetableResults received:', timetables);
  }, [timetables]);

  // Filter timetables by dept or year (case insensitive)
  const filtered = timetables.filter((t) => {
    const searchText = `${t.department || ''} ${t.level || ''} ${t.title || ''}`;
    return searchText.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalSlides = filtered.length;

  // Keep currentSlide in bounds after filtering
  useEffect(() => {
    if (currentSlide >= totalSlides && totalSlides > 0) {
      setCurrentSlide(0);
    }
  }, [totalSlides, currentSlide]);

  // Show back button when search is active
  useEffect(() => {
    setShowBackButton(searchQuery.length > 0);
  }, [searchQuery]);

  const resetSwipe = useCallback(() => {
    setTouchStart(null);
    setTouchEnd(null);
    setIsDragging(false);
    setDragOffset(0);
    
    if (containerRef.current) {
      containerRef.current.classList.remove('swipe-active');
    }
  }, []);

  // Touch handlers for swipe functionality
  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
    
    // Add visual feedback
    if (containerRef.current) {
      containerRef.current.classList.add('swipe-active');
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !touchStart) return;
    
    const currentTouch = e.targetTouches[0].clientX;
    const diff = touchStart - currentTouch;
    
    // Limit drag to reasonable bounds
    const maxDrag = window.innerWidth * 0.3;
    const limitedDiff = Math.max(-maxDrag, Math.min(maxDrag, diff));
    
    setTouchEnd(currentTouch);
    setDragOffset(limitedDiff);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      resetSwipe();
      return;
    }
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
    } else if (isRightSwipe && currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
    
    resetSwipe();
  };

  // Mouse handlers for desktop drag support - now using useCallback to stabilize references
  const handleMouseDown = (e) => {
    e.preventDefault();
    setTouchStart(e.clientX);
    setIsDragging(true);
    
    if (containerRef.current) {
      containerRef.current.classList.add('swipe-active');
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !touchStart) return;
    
    const diff = touchStart - e.clientX;
    const maxDrag = window.innerWidth * 0.3;
    const limitedDiff = Math.max(-maxDrag, Math.min(maxDrag, diff));
    
    setTouchEnd(e.clientX);
    setDragOffset(limitedDiff);
  }, [isDragging, touchStart]);

  const handleMouseUp = useCallback(() => {
    if (!touchStart || touchEnd === null) {
      resetSwipe();
      return;
    }
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
    } else if (isRightSwipe && currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
    
    resetSwipe();
  }, [touchStart, touchEnd, currentSlide, totalSlides, resetSwipe]);

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (totalSlides <= 1) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (currentSlide > 0) setCurrentSlide(currentSlide - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentSlide < totalSlides - 1) setCurrentSlide(currentSlide + 1);
          break;
        case 'Home':
          e.preventDefault();
          setCurrentSlide(0);
          break;
        case 'End':
          e.preventDefault();
          setCurrentSlide(totalSlides - 1);
          break;
        default:
          // Do nothing for other keys
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, totalSlides]);

  if (totalSlides === 0) {
    return (
      <section className="results-section">
        <div className="results-header">
          <div className="results-header-left">
            <div className="results-icon">!</div>
            <h3 className="results-title">No Timetables Found</h3>
          </div>
        </div>
        
        <div className="search-container">
          <div className="search-input-wrapper">
            <input
              type="text"
              className="search-input"
              placeholder="Search by department, year level, or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="search-icon">🔍</span>
            <button 
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
              type="button"
              aria-label="Clear search"
            >
              ×
            </button>
          </div>
          {showBackButton && (
            <button 
              className="back-to-all-btn"
              onClick={() => setSearchQuery('')}
              type="button"
            >
              ← Show All Timetables
            </button>
          )}
        </div>
        
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          {searchQuery ? (
            <div>
              <p>No timetables match your search for "<strong>{searchQuery}</strong>"</p>
              <p>Try adjusting your search terms or browse all available timetables.</p>
            </div>
          ) : (
            <p>No timetable data available. Please generate timetables first.</p>
          )}
        </div>
      </section>
    );
  }

  const nextSlide = () => {
    if (currentSlide < totalSlides - 1) setCurrentSlide(currentSlide + 1);
  };
  
  const previousSlide = () => {
    if (currentSlide > 0) setCurrentSlide(currentSlide - 1);
  };
  
  const goToSlide = (i) => setCurrentSlide(i);

  // Helper function to find events for a specific day and time
  const findEventForSlot = (timetable, day, timeLabel) => {
    // First try to find in rows array if it exists
    if (timetable.rows && Array.isArray(timetable.rows)) {
      return timetable.rows.find(row => 
        row.Day === day && (
          row.Time === timeLabel || 
          row.Time === timeLabel.replace(' AM', ':00').replace(' PM', ':00') ||
          timeLabel.includes(row.Time)
        )
      );
    }
    
    // Fallback: try to extract from other possible data structures
    if (timetable.schedule && Array.isArray(timetable.schedule)) {
      return timetable.schedule.find(item => 
        item.day === day && item.time === timeLabel
      );
    }
    
    return null;
  };

  // Calculate transform with drag offset
  const getTransform = () => {
    const baseTransform = -currentSlide * 100;
    const dragPercentage = (dragOffset / window.innerWidth) * 100;
    return `translateX(${baseTransform - dragPercentage}%)`;
  };

  return (
    <section className="results-section">
      <div className="results-header">
        <div className="results-header-left">
          <div className="results-icon">✓</div>
          <h3 className="results-title">Generated Timetables</h3>
        </div>
        <div className="results-counter">
          {totalSlides} {totalSlides === 1 ? 'timetable' : 'timetables'}
        </div>
      </div>

      {/* Enhanced Search Section */}
      <div className="search-container">
        <div className="search-input-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="Search by department, year level, or course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="search-icon">🔍</span>
          {searchQuery && (
            <button 
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
              type="button"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        {showBackButton && (
          <button 
            className="back-to-all-btn"
            onClick={() => setSearchQuery('')}
            type="button"
          >
            ← Show All Timetables
          </button>
        )}
      </div>

      <div className="carousel-container">
        <div 
          className="carousel-wrapper"
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <div
            className="carousel-slides"
            ref={carouselRef}
            style={{ 
              transform: getTransform(),
              transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {filtered.map((timetable, idx) => (
              <div key={idx} className="carousel-slide">
                <div className="timetable-card">
                  <div className="timetable-header">
                    <h3 className="timetable-title">
                      {timetable.title || `${timetable.department} - Year ${timetable.level}`}
                    </h3>
                    
                    <div className="timetable-meta">
                      {timetable.department && (
                        <div className="meta-item department">{timetable.department}</div>
                      )}
                      {timetable.level && (
                        <div className="meta-item level">Year {timetable.level}</div>
                      )}
                      {timetable.student_count > 0 && (
                        <div className="meta-item student-count">{timetable.student_count} students</div>
                      )}
                    </div>
                    
                    {timetable.total_courses > 0 && (
                      <div className="course-summary">
                        {timetable.total_courses} courses • {timetable.total_hours_scheduled} hours scheduled
                      </div>
                    )}
                  </div>

                  <div className="calendar-container">
                    <div className="calendar-grid">
                      {/* Header row */}
                      <div className="calendar-header">
                        <div className="time-col-header">Time</div>
                        {daysOfWeek.map((day) => (
                          <div key={day} className="day-col-header">{day}</div>
                        ))}
                      </div>

                      {/* Time slot rows */}
                      {timeSlots.map((slot, rowIdx) => (
                        <div key={rowIdx} className="calendar-row">
                          <div className="time-col">{slot.label}</div>
                          {daysOfWeek.map((day) => {
                            const event = findEventForSlot(timetable, day, slot.label);
                            return (
                              <div key={day} className={`calendar-cell ${event ? 'has-event' : 'empty'}`}>
                                {event ? (
                                  <div className="event-content">
                                    <div className="course">{event.Course || 'N/A'}</div>
                                    <div className="room">{event.Room || 'N/A'}</div>
                                    <div className="lecturer">{event.Lecturer || 'TBD'}</div>
                                  </div>
                                ) : (
                                  <div className="empty-slot">-</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced Navigation Controls */}
        {totalSlides > 1 && (
          <div className="carousel-controls">
            <button
              className="nav-btn prev"
              onClick={previousSlide}
              disabled={currentSlide === 0}
              type="button"
              aria-label="Previous timetable"
            >
              ‹
            </button>
            
            <div className="carousel-indicators">
              {filtered.map((_, i) => (
                <div
                  key={i}
                  className={`indicator ${i === currentSlide ? 'active' : ''}`}
                  onClick={() => goToSlide(i)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      goToSlide(i);
                    }
                  }}
                  aria-label={`Go to timetable ${i + 1}`}
                />
              ))}
            </div>
            
            <button
              className="nav-btn next"
              onClick={nextSlide}
              disabled={currentSlide === totalSlides - 1}
              type="button"
              aria-label="Next timetable"
            >
              ›
            </button>
          </div>
        )}
        
        {totalSlides > 1 && (
          <div className="carousel-counter">
            {currentSlide + 1} of {totalSlides}
          </div>
        )}
        
        {/* Swipe instruction for mobile */}
        {totalSlides > 1 && (
          <div style={{
            textAlign: 'center',
            marginTop: '0.5rem',
            color: '#9ca3af',
            fontSize: '0.8rem'
          }}>
            Swipe or use arrow keys to navigate • Drag to preview
          </div>
        )}
      </div>
    </section>
  );
};

export default TimetableResults;