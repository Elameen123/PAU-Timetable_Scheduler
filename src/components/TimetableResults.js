import React, { useState } from 'react';
import './TimetableResults.css';

const TimetableResults = ({ timetables = [] }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = timetables.length;

  const nextSlide = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const previousSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  if (timetables.length === 0) {
    return null;
  }

  return (
    <section className="results-section">
      <div className="results-header">
        <div className="results-icon">✓</div>
        <h3 className="results-title">Generated Timetables</h3>
      </div>
      
      <div className="carousel-container">
        <div className="carousel-wrapper">
          <div 
            className="carousel-slides"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {timetables.map((timetable, index) => (
              <div key={index} className="carousel-slide">
                <div className="timetable-card">
                  <h3 className="timetable-title">{timetable.title}</h3>
                  <div className="timetable-info">
                    <span className="info-label">Department:</span>
                    <span className="info-value">{timetable.department}</span>
                    <span className="info-label">Level:</span>
                    <span className="info-value">{timetable.level}</span>
                    {timetable.semester && (
                      <>
                        <span className="info-label">Semester:</span>
                        <span className="info-value">{timetable.semester}</span>
                      </>
                    )}
                  </div>
                  <div className="timetable-preview">
                    <div className="preview-title">Course Schedule Preview:</div>
                    <ul className="course-list">
                      {timetable.courses?.map((course, courseIndex) => (
                        <li key={courseIndex} className="course-item">
                          {course}
                        </li>
                      ))}
                    </ul>
                    <div className="preview-note">
                      Complete timetable with time slots available for download
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {totalSlides > 1 && (
          <>
            <div className="carousel-nav">
              <button 
                className="nav-btn" 
                onClick={previousSlide}
                disabled={currentSlide === 0}
                type="button"
                aria-label="Previous timetable"
              >
                ‹
              </button>
              <button 
                className="nav-btn" 
                onClick={nextSlide}
                disabled={currentSlide === totalSlides - 1}
                type="button"
                aria-label="Next timetable"
              >
                ›
              </button>
            </div>
            
            <div className="carousel-indicators">
              {timetables.map((_, index) => (
                <div
                  key={index}
                  className={`indicator ${index === currentSlide ? 'active' : ''}`}
                  onClick={() => goToSlide(index)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      goToSlide(index);
                    }
                  }}
                  aria-label={`Go to timetable ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default TimetableResults;