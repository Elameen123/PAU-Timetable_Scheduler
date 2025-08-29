import React, { useEffect } from 'react';
import './InstructionsModal.css';

const InstructionsModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal" onClick={handleBackdropClick}>
      <div className="modal-content" role="dialog" aria-labelledby="modal-title" aria-modal="true">
        <div className="modal-header">
          <h3 id="modal-title" className="modal-title">
            How to Use the Timetable Generator
          </h3>
          <button 
            className="close-btn" 
            onClick={onClose}
            aria-label="Close modal"
            type="button"
          >
            &times;
          </button>
        </div>
        
        <div className="modal-body">
          <div className="instruction-step">
            <h4>Step 1: Upload Excel File</h4>
            <p>
              Upload your Excel file containing course data, including subjects, 
              lecturers, rooms, and time preferences. The file should be in .xlsx or .xls format 
              and not exceed 10MB.
            </p>
          </div>
          
          <div className="instruction-step">
            <h4>Step 2: Generate Timetable</h4>
            <p>
              Click the "Generate Timetable" button to process your data and create 
              optimized schedules. The system will validate your data and generate 
              conflict-free timetables.
            </p>
          </div>
          
          <div className="instruction-step">
            <h4>Step 3: Review Results</h4>
            <p>
              Browse through the generated timetables for each department and year 
              using the carousel navigation. Each timetable shows course schedules 
              with assigned time slots and rooms.
            </p>
          </div>
          
          <div className="instruction-step">
            <h4>Step 4: Download</h4>
            <p>
              Export your timetables in Excel, PDF, or Image format using the 
              download buttons in the header. Choose the format that best suits 
              your needs.
            </p>
          </div>
          
          <div className="instruction-step">
            <h4>Excel File Format Requirements:</h4>
            <ul>
              <li><strong>Course Code:</strong> Unique identifier for each course</li>
              <li><strong>Course Title:</strong> Full name of the course</li>
              <li><strong>Lecturer:</strong> Instructor assigned to the course</li>
              <li><strong>Duration:</strong> Length of each class session</li>
              <li><strong>Level:</strong> Academic year (100, 200, 300, 400)</li>
              <li><strong>Department:</strong> Academic department</li>
              <li><strong>Room Preferences:</strong> Preferred classroom types</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructionsModal;