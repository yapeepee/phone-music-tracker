-- Convert practice_metrics to TimescaleDB hypertable
-- Only run if not already a hypertable

-- Check if TimescaleDB extension is installed
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert to hypertable if not already
SELECT create_hypertable(
    'practice_metrics', 
    'time',
    if_not_exists => true,
    migrate_data => true
);