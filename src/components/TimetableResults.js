import React, { useState, useEffect } from 'react';
import './TimetableResults.css';
import { getTimeSlots } from '../services/api';

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const TimetableResults = ({ timetables = [] }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [timeSlots, setTimeSlots] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showBackButton, setShowBackButton] = useState(false);

  // fetch available timeslots from backend (or defaults)
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

  // Show back button when search is active
  useEffect(() => {
    setShowBackButton(searchQuery.length > 0);
  }, [searchQuery]);

  // filter timetables by dept or year (case insensitive)
  const filtered = timetables.filter((t) => {
    const searchText = `${t.department || ''} ${t.level || ''} ${t.title || ''}`;
    return searchText.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalSlides = filtered.length;

  // keep currentSlide in bounds after filtering
  useEffect(() => {
    if (currentSlide >= totalSlides && totalSlides > 0) {
      setCurrentSlide(0);
    }
  }, [totalSlides, currentSlide]);

  // Function to clear search and return to all timetables
  const clearSearch = () => {
    setSearchQuery('');
    setCurrentSlide(0);
  };

  if (totalSlides === 0) {
    return (
      <section className="results-section">
        <div className="results-header">
          <div className="results-header-left">
            <div className="results-icon">!</div>
            <h3 className="results-title">No Timetables Found</h3>
          </div>
        </div>

        {/* Search section - also show in no results case */}
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
                onClick={clearSearch}
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
              onClick={clearSearch}
              type="button"
            >
              ← Show All Timetables
            </button>
          )}
        </div>

        {/* No results message */}
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          {searchQuery ? (
            <div>
              <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
                No timetables match your search for <strong>"{searchQuery}"</strong>
              </p>
              {/* Additional back button in the message area for better UX */}
              <button 
                className="back-to-all-btn"
                onClick={clearSearch}
                type="button"
                style={{ margin: '0 auto' }}
              >
                ← View All {timetables.length} Timetables
              </button>
            </div>
          ) : (
            <p style={{ color: '#6b7280' }}>No timetable data available</p>
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

  return (
    <section className="results-section">
      <div className="results-header">
        <div className="results-header-left">
          <div className="results-icon">✓</div>
          <h3 className="results-title">Generated Timetables</h3>
        </div>
        <div className="results-counter">
          {searchQuery ? (
            <>
              {totalSlides} of {timetables.length} {totalSlides === 1 ? 'timetable' : 'timetables'}
            </>
          ) : (
            <>
              {totalSlides} {totalSlides === 1 ? 'timetable' : 'timetables'}
            </>
          )}
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
              onClick={clearSearch}
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
            onClick={clearSearch}
            type="button"
          >
            ← Show All Timetables
          </button>
        )}
      </div>

      <div className="carousel-container">
        <div className="carousel-wrapper">
          <div
            className="carousel-slides"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
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

                  <div className="calendar-grid">
                    {/* Header row */}
                    <div className="calendar-header">
                      <div className="time-col-header">Time</div>
                      {daysOfWeek.map((day) => (
                        <div key={day} className="day-col-header">{day}</div>
                      ))}
                    </div>

                    {/* Rows */}
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
            ))}
          </div>
        </div>

        {/* Navigation buttons */}
        {totalSlides > 1 && (
          <>
            <div className="carousel-nav">
              <button
                className="nav-btn prev"
                onClick={previousSlide}
                disabled={currentSlide === 0}
                type="button"
                aria-label="Previous timetable"
              >
                ‹
              </button>
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

            <div className="carousel-indicators">
              {filtered.map((_, i) => (
                <div
                  key={i}
                  className={`indicator ${i === currentSlide ? 'active' : ''}`}
                  onClick={() => goToSlide(i)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') goToSlide(i);
                  }}
                  aria-label={`Go to timetable ${i + 1}`}
                />
              ))}
            </div>
            
            <div className="carousel-counter">
              {currentSlide + 1} of {totalSlides}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default TimetableResults;