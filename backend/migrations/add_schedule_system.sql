-- Create schedule system tables for lesson scheduling and calendar functionality

-- Create enum types for schedule system
DO $$ BEGIN
    CREATE TYPE eventtype AS ENUM ('lesson', 'practice', 'masterclass', 'recital', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE recurrencetype AS ENUM ('none', 'daily', 'weekly', 'biweekly', 'monthly');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE eventstatus AS ENUM ('scheduled', 'confirmed', 'cancelled', 'completed', 'rescheduled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create schedule events table
CREATE TABLE IF NOT EXISTS schedule_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES users(id),
    
    -- Event details
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_type eventtype NOT NULL DEFAULT 'lesson',
    status eventstatus NOT NULL DEFAULT 'scheduled',
    
    -- Time information
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    
    -- Parent event for recurring instances
    parent_event_id UUID REFERENCES schedule_events(id) ON DELETE CASCADE,
    
    -- Location
    location VARCHAR(200),
    is_online BOOLEAN DEFAULT FALSE,
    meeting_url VARCHAR(500),
    
    -- Metadata
    color VARCHAR(7) DEFAULT '#6366F1',
    reminder_minutes INTEGER DEFAULT 15,
    max_participants INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_event_times CHECK (end_datetime > start_datetime),
    CONSTRAINT valid_hex_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Create recurrence rules table
CREATE TABLE IF NOT EXISTS recurrence_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID UNIQUE NOT NULL REFERENCES schedule_events(id) ON DELETE CASCADE,
    
    -- Recurrence pattern
    recurrence_type recurrencetype NOT NULL,
    interval INTEGER DEFAULT 1 CHECK (interval > 0),
    
    -- For weekly recurrence (array of day numbers: 0=Mon, 1=Tue, ..., 6=Sun)
    days_of_week INTEGER[],
    
    -- For monthly recurrence
    day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
    week_of_month INTEGER CHECK (week_of_month >= 1 AND week_of_month <= 5),
    
    -- End condition
    end_date DATE,
    occurrences INTEGER CHECK (occurrences > 0),
    
    -- Exception dates (dates to skip)
    exception_dates DATE[],
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_weekly_days CHECK (
        recurrence_type != 'weekly' OR days_of_week IS NOT NULL
    ),
    CONSTRAINT valid_end_condition CHECK (
        (end_date IS NULL AND occurrences IS NULL) OR
        (end_date IS NOT NULL AND occurrences IS NULL) OR
        (end_date IS NULL AND occurrences IS NOT NULL)
    )
);

-- Create event participants table (many-to-many)
CREATE TABLE IF NOT EXISTS event_participants (
    event_id UUID NOT NULL REFERENCES schedule_events(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (event_id, student_id)
);

-- Create schedule conflicts table
CREATE TABLE IF NOT EXISTS schedule_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES schedule_events(id) ON DELETE CASCADE,
    conflicting_event_id UUID NOT NULL REFERENCES schedule_events(id) ON DELETE CASCADE,
    
    -- Conflict details
    conflict_type VARCHAR(50) NOT NULL CHECK (conflict_type IN ('time_overlap', 'location_conflict', 'participant_conflict')),
    severity VARCHAR(20) DEFAULT 'warning' CHECK (severity IN ('warning', 'error')),
    resolution_status VARCHAR(20) DEFAULT 'unresolved' CHECK (resolution_status IN ('unresolved', 'resolved', 'ignored')),
    
    -- Timestamps
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT different_events CHECK (event_id != conflicting_event_id),
    CONSTRAINT unique_conflict UNIQUE (event_id, conflicting_event_id)
);

-- Create indexes for performance
CREATE INDEX idx_schedule_events_teacher_id ON schedule_events(teacher_id);
CREATE INDEX idx_schedule_events_start_datetime ON schedule_events(start_datetime);
CREATE INDEX idx_schedule_events_end_datetime ON schedule_events(end_datetime);
CREATE INDEX idx_schedule_events_parent_event_id ON schedule_events(parent_event_id);
CREATE INDEX idx_schedule_events_status ON schedule_events(status);

CREATE INDEX idx_event_participants_student_id ON event_participants(student_id);
CREATE INDEX idx_event_participants_event_id ON event_participants(event_id);

CREATE INDEX idx_schedule_conflicts_event_id ON schedule_conflicts(event_id);
CREATE INDEX idx_schedule_conflicts_conflicting_event_id ON schedule_conflicts(conflicting_event_id);
CREATE INDEX idx_schedule_conflicts_resolution_status ON schedule_conflicts(resolution_status);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_schedule_events_updated_at BEFORE UPDATE ON schedule_events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurrence_rules_updated_at BEFORE UPDATE ON recurrence_rules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to check for event conflicts
CREATE OR REPLACE FUNCTION check_event_conflicts(
    p_event_id UUID,
    p_teacher_id UUID,
    p_start_datetime TIMESTAMP WITH TIME ZONE,
    p_end_datetime TIMESTAMP WITH TIME ZONE
) RETURNS TABLE (
    conflicting_event_id UUID,
    conflict_type VARCHAR,
    severity VARCHAR
) AS $$
BEGIN
    -- Check for time overlaps with teacher's other events
    RETURN QUERY
    SELECT 
        se.id AS conflicting_event_id,
        'time_overlap'::VARCHAR AS conflict_type,
        'error'::VARCHAR AS severity
    FROM schedule_events se
    WHERE se.teacher_id = p_teacher_id
        AND se.id != p_event_id
        AND se.status NOT IN ('cancelled', 'completed')
        AND (
            (se.start_datetime < p_end_datetime AND se.end_datetime > p_start_datetime)
        );
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE schedule_events IS 'Stores all scheduled events like lessons, practices, masterclasses';
COMMENT ON TABLE recurrence_rules IS 'Defines recurrence patterns for repeating events';
COMMENT ON TABLE event_participants IS 'Links students to events they are participating in';
COMMENT ON TABLE schedule_conflicts IS 'Tracks scheduling conflicts between events';