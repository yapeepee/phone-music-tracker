-- SQL script to create TimescaleDB hypertables for practice metrics
-- Run this after the tables are created by SQLAlchemy/Alembic

-- Enable TimescaleDB extension if not already enabled
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert practice_metrics table to a hypertable
-- The chunk_time_interval is set to 1 day (good for practice session data)
SELECT create_hypertable(
    'practice_metrics',
    'time',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Create continuous aggregate for hourly metrics
-- This will pre-compute common aggregations for better query performance
CREATE MATERIALIZED VIEW IF NOT EXISTS practice_metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    session_id,
    metric_type,
    AVG(value) as avg_value,
    MIN(value) as min_value,
    MAX(value) as max_value,
    COUNT(*) as data_points,
    AVG(confidence) as avg_confidence
FROM practice_metrics
GROUP BY bucket, session_id, metric_type;

-- Create continuous aggregate for daily summaries
CREATE MATERIALIZED VIEW IF NOT EXISTS practice_metrics_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', time) AS bucket,
    session_id,
    metric_type,
    AVG(value) as avg_value,
    MIN(value) as min_value,
    MAX(value) as max_value,
    STDDEV(value) as stddev_value,
    COUNT(*) as data_points
FROM practice_metrics
GROUP BY bucket, session_id, metric_type;

-- Add compression policy (compress chunks older than 30 days)
SELECT add_compression_policy('practice_metrics', INTERVAL '30 days');

-- Add retention policy (optional - keep data for 1 year)
-- Uncomment if you want automatic data deletion
-- SELECT add_retention_policy('practice_metrics', INTERVAL '1 year');

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_practice_metrics_session_metric_time 
ON practice_metrics (session_id, metric_type, time DESC);

-- Refresh policies for continuous aggregates
SELECT add_continuous_aggregate_policy('practice_metrics_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

SELECT add_continuous_aggregate_policy('practice_metrics_daily',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day');

-- Grant permissions (adjust based on your user setup)
GRANT SELECT, INSERT ON practice_metrics TO musictracker;
GRANT SELECT ON practice_metrics_hourly TO musictracker;
GRANT SELECT ON practice_metrics_daily TO musictracker;