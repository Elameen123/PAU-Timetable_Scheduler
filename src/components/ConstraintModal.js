import React, { useMemo, useState } from 'react';
import './ConstraintModal.css';

const ConstraintModal = ({ isOpen, onClose, constraintDetails, timetables, onNavigate }) => {
  // Dash allows multiple dropdowns expanded at once.
  const [expandedConstraints, setExpandedConstraints] = useState(() => new Set());

  // Mapping from user-friendly names to internal names (SEPT 13 format)
  const constraintMapping = {
    'Same Student Group Overlaps': 'Same Student Group Overlaps',
    'Different Student Group Overlaps': 'Different Student Group Overlaps',
    'Lecturer Clashes': 'Lecturer Clashes',
    'Lecturer Schedule Conflicts (Day/Time)': 'Lecturer Schedule Conflicts (Day/Time)',
    'Lecturer Workload Violations': 'Lecturer Workload Violations',
    'Consecutive Slot Violations': 'Consecutive Slot Violations',
    'Missing or Extra Classes': 'Missing or Extra Classes',
    'Same Course in Multiple Rooms on Same Day': 'Same Course in Multiple Rooms on Same Day',
    'Room Capacity/Type Conflicts': 'Room Capacity/Type Conflicts',
    'Classes During Break Time': 'Classes During Break Time',
    'Late Classes': 'Late Classes'
  };

  const groupMap = useMemo(() => {
    const map = new Map();
    (timetables || []).forEach((t, idx) => {
      const g = t?.student_group;
      const name = (g && typeof g === 'object') ? g.name : g;
      if (name) map.set(String(name), idx);
    });
    return map;
  }, [timetables]);

  if (!isOpen) return null;

  const toggleConstraint = (constraintName) => {
    setExpandedConstraints(prev => {
      const next = new Set(prev);
      if (next.has(constraintName)) next.delete(constraintName);
      else next.add(constraintName);
      return next;
    });
  };

  const findTargetGroupIdx = (internalName, violation) => {
    if (!violation || typeof violation !== 'object') return null;

    if (internalName === 'Same Student Group Overlaps') {
      return groupMap.has(violation.group) ? groupMap.get(violation.group) : null;
    }

    if (internalName === 'Different Student Group Overlaps') {
      if (Array.isArray(violation.events) && violation.events.length > 0) {
        const match = /Group:\s*'([^']+)'/i.exec(String(violation.events[0]));
        if (match && groupMap.has(match[1])) return groupMap.get(match[1]);
      }
      if (Array.isArray(violation.groups) && violation.groups.length > 0) {
        return groupMap.has(violation.groups[0]) ? groupMap.get(violation.groups[0]) : null;
      }
      return null;
    }

    if (internalName === 'Lecturer Clashes') {
      if (Array.isArray(violation.groups) && violation.groups.length > 0) {
        return groupMap.has(violation.groups[0]) ? groupMap.get(violation.groups[0]) : null;
      }
      return null;
    }

    if (
      internalName === 'Lecturer Schedule Conflicts (Day/Time)' ||
      internalName === 'Consecutive Slot Violations' ||
      internalName === 'Missing or Extra Classes' ||
      internalName === 'Same Course in Multiple Rooms on Same Day' ||
      internalName === 'Room Capacity/Type Conflicts' ||
      internalName === 'Classes During Break Time' ||
      internalName === 'Late Classes'
    ) {
      return groupMap.has(violation.group) ? groupMap.get(violation.group) : null;
    }

    return null;
  };

  const buildItemText = (internalName, violation) => {
    if (!violation) return '';
    if (typeof violation === 'string') return violation;
    if (typeof violation !== 'object') return String(violation);

    if (internalName === 'Same Student Group Overlaps') {
      const courses = Array.isArray(violation.courses) ? violation.courses.join(', ') : String(violation.courses || '');
      return `Group '${violation.group}' has clashing courses ${courses} on ${violation.location}`;
    }

    if (internalName === 'Different Student Group Overlaps') {
      if (Array.isArray(violation.events)) {
        const events = violation.events.join(', ');
        return `Room conflict at ${violation.location}: ${events}`;
      }
      if (Array.isArray(violation.groups)) {
        return `Room conflict in ${violation.room} at ${violation.location}: Groups ${violation.groups.join(', ')} both scheduled`;
      }
      return `Room conflict at ${violation.location || 'Unknown location'}`;
    }

    if (internalName === 'Lecturer Clashes') {
      if (Array.isArray(violation.groups) && violation.groups.length >= 2) {
        return `Lecturer '${violation.lecturer}' has clashing courses ${violation.courses?.[0]} for group ${violation.groups?.[0]}, and ${violation.courses?.[1]} for group ${violation.groups?.[1]} on ${violation.location}`;
      }
      const courses = Array.isArray(violation.courses) ? violation.courses.join(', ') : String(violation.courses || '');
      return `Lecturer '${violation.lecturer}' has clashing courses ${courses} on ${violation.location}`;
    }

    if (internalName === 'Lecturer Schedule Conflicts (Day/Time)') {
      let locDisplay = violation.location || '';
      if (violation.day && violation.time) {
        locDisplay = `${violation.day} at ${violation.time}`;
      }
      return `Lecturer '${violation.lecturer}' scheduled for ${violation.course} for group ${violation.group} on ${locDisplay} but available: ${violation.available_days} at ${violation.available_times}`;
    }

    if (internalName === 'Lecturer Workload Violations') {
      if (violation.type === 'Excessive Daily Hours') {
        const coursesText = violation.courses || 'Unknown courses';
        return `Lecturer '${violation.lecturer}' has ${violation.hours_scheduled} hours on ${violation.day} from courses ${coursesText}, exceeding maximum of ${violation.max_allowed} hours per day`;
      }
      if (violation.type === 'Excessive Consecutive Hours') {
        const coursesText = violation.courses || 'Unknown courses';
        const hoursTimes = Array.isArray(violation.hours_times) ? violation.hours_times.join(', ') : String(violation.hours_times || '');
        return `Lecturer '${violation.lecturer}' has ${violation.consecutive_hours} consecutive hours on ${violation.day} from courses ${coursesText} (${hoursTimes}), exceeding maximum of ${violation.max_allowed} consecutive hours`;
      }
      return `Lecturer workload violation for ${violation.lecturer} on ${violation.day}: ${violation.violation || 'Unknown violation'}`;
    }

    if (internalName === 'Consecutive Slot Violations') {
      const reason = violation.reason || violation.issue || 'Consecutive slot violation';
      const timesVal = violation.times || [];
      const timesStr = (!timesVal || (Array.isArray(timesVal) && timesVal.length === 0))
        ? (violation.location || '')
        : (Array.isArray(timesVal) ? timesVal.join(', ') : String(timesVal));
      
      const courseNameDisplay = violation.course_name ? ` (${violation.course_name})` : '';
      return `${reason}: Course '${violation.course || ''}'${courseNameDisplay} for group '${violation.group || ''}' at ${timesStr}`;
    }

    if (internalName === 'Missing or Extra Classes') {
      return `${violation.issue} classes for ${violation.location}: Expected ${violation.expected}, Got ${violation.actual}`;
    }

    if (internalName === 'Same Course in Multiple Rooms on Same Day') {
      const rooms = Array.isArray(violation.rooms) ? violation.rooms.join(', ') : String(violation.rooms || '');
      return `${violation.location} in multiple rooms: ${rooms}`;
    }

    if (internalName === 'Room Capacity/Type Conflicts') {
      if (violation.type === 'Room Type Mismatch') {
        return `Room type mismatch at ${violation.location}: ${violation.course} for group ${violation.group} requires ${violation.required_type} but scheduled in ${violation.room} (${violation.room_type})`;
      }
      if (violation.type === 'Wrong Building (TYD in SST)') {
        return `Wrong Building Constraint: Group '${violation.group}' (Non-SST) is scheduled in SST room '${violation.room}' on ${violation.day} at ${violation.time}`;
      }
      if (violation.students !== undefined && violation.capacity !== undefined) {
        return `Room capacity exceeded at ${violation.room} by group ${violation.group} on ${violation.day} at ${violation.time}: ${violation.students} students in ${violation.room} (capacity: ${violation.capacity})`;
      }
      return `${violation.type} at ${violation.location || 'Unknown'}`;
    }

    if (internalName === 'Classes During Break Time') {
      return `Class during break time at ${violation.location}: ${violation.course} for ${violation.group}`;
    }

    if (internalName === 'Late Classes') {
      const typ = violation.type ? `${violation.type}: ` : '';
      return `${typ}${violation.location || `${violation.course || ''} for ${violation.group || ''}`}`;
    }

    return JSON.stringify(violation);
  };

  return (
    <>
      <div className="modal-overlay" id="errors-modal-overlay" onClick={onClose}></div>
      <div className="room-selection-modal" id="errors-modal">
        <div className="modal-header">
          <h3 className="modal-title">
            Constraint Violations
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div id="errors-content" className="errors-content">
          {!constraintDetails ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              No constraint violation data available.
            </div>
          ) : (
            Object.entries(constraintMapping).map(([displayName, internalName]) => {
              let violations = (constraintDetails && constraintDetails[internalName]) ? constraintDetails[internalName] : [];

              const count = Array.isArray(violations) ? violations.length : 0;
              const isExpanded = expandedConstraints.has(displayName);

              return (
                <div key={displayName} className="constraint-dropdown">
                  <div
                    className={`constraint-header ${isExpanded ? 'active' : ''}`}
                    onClick={() => toggleConstraint(displayName)}
                  >
                    <span>{displayName}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className={`constraint-count ${count === 0 ? 'zero' : 'non-zero'}`}>
                        {count} Occurrence{count !== 1 ? 's' : ''}
                      </span>
                      <span className={`constraint-arrow ${isExpanded ? 'rotated' : ''}`}>
                        ^
                      </span>
                    </div>
                  </div>

                  <div className={`constraint-details ${isExpanded ? 'expanded' : ''}`}>
                    {count === 0 ? (
                      <div className="constraint-item" style={{ color: '#28a745', fontStyle: 'italic' }}>
                        No violations found.
                      </div>
                    ) : (
                      violations.map((violation, idx) => {
                        const targetGroupIdx = findTargetGroupIdx(internalName, violation);
                        const itemText = buildItemText(internalName, violation);
                        const isClickable = targetGroupIdx !== null && targetGroupIdx !== undefined;

                        return (
                          <div
                            key={idx}
                            className={`constraint-item ${isClickable ? 'clickable' : ''}`}
                            title={isClickable ? "Click to view this student group's timetable" : undefined}
                            onClick={() => {
                              if (!isClickable) return;
                              
                              // Attempt to parse day/time for flashing
                              let targetRow = null;
                              let targetCol = null;
                              
                              // Helper to map day/time
                              const dayMap = { 'MONDAY': 0, 'TUESDAY': 1, 'WEDNESDAY': 2, 'THURSDAY': 3, 'FRIDAY': 4 };
                              // Assuming default time slots (adjust if different in frontend)
                              // 0: 9-9:50, 1: 10-10:50, ...
                              const extractTimeIdx = (tStr) => {
                                if (!tStr) return null;
                                const hourRaw = parseInt(String(tStr).split(':')[0], 10);
                                if (Number.isNaN(hourRaw)) return null;

                                // Timetable grid is 9 slots: 09:00 .. 17:00 (inclusive)
                                // Map 09 -> 0, 10 -> 1, ... 17 -> 8
                                if (hourRaw >= 9 && hourRaw <= 17) return hourRaw - 9;

                                // If the data uses 12-hour times like "1:00" for 13:00, treat as PM.
                                if (hourRaw >= 1 && hourRaw <= 8) return hourRaw + 3;

                                return null;
                              };
                              
                              if (violation.day && (violation.time || violation.time_slot !== undefined)) {
                                  const dUpper = violation.day.toUpperCase();
                                  if (dayMap[dUpper] !== undefined) {
                                      targetCol = dayMap[dUpper] + 1; // +1 because col 0 is Time header
                                      
                                      if (violation.time_slot !== undefined) {
                                         targetRow = violation.time_slot;
                                      } else if (violation.time) {
                                         targetRow = extractTimeIdx(violation.time);
                                      }
                                  }
                              } else if (violation.location) {
                                  // Best-effort location parse: e.g. "MONDAY 9:00-9:50" or "Monday at 9:00"
                                  const loc = String(violation.location);

                                  const dayMatch = /(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY)/i.exec(loc);
                                  const timeMatch = /(\d{1,2}:\d{2})/i.exec(loc);

                                  if (dayMatch) {
                                    const dUpper = String(dayMatch[1]).toUpperCase();
                                    if (dayMap[dUpper] !== undefined) {
                                      targetCol = dayMap[dUpper] + 1;
                                    }
                                  }

                                  if (timeMatch) {
                                    targetRow = extractTimeIdx(timeMatch[1]);
                                  }
                              }

                              onNavigate(targetGroupIdx, targetRow, targetCol);
                            //   onClose(); // Keep closed or open? User said "redirects me", usually implies closing and showing logic.
                            }}
                          >
                            {itemText}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ textAlign: 'right', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #f0f0f0' }}>
          <button
            onClick={onClose}
            style={{ backgroundColor: '#11214D', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
};

export default ConstraintModal;
