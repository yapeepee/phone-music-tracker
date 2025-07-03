#!/usr/bin/env python3
"""Initialize TimescaleDB hypertables for practice metrics."""
import asyncio
import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def init_timescaledb():
    """Initialize TimescaleDB hypertables and continuous aggregates."""
    async with async_session() as session:
        try:
            # Enable TimescaleDB extension
            await session.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"))
            await session.commit()
            logger.info("TimescaleDB extension enabled")
            
            # Convert practice_metrics to hypertable
            result = await session.execute(
                text("""
                    SELECT create_hypertable(
                        'practice_metrics',
                        'time',
                        chunk_time_interval => INTERVAL '1 day',
                        if_not_exists => TRUE
                    );
                """)
            )
            await session.commit()
            logger.info("practice_metrics hypertable created")
            
            # Create continuous aggregates
            await session.execute(
                text("""
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
                """)
            )
            await session.commit()
            logger.info("Hourly continuous aggregate created")
            
            await session.execute(
                text("""
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
                """)
            )
            await session.commit()
            logger.info("Daily continuous aggregate created")
            
            # Add compression policy
            await session.execute(
                text("SELECT add_compression_policy('practice_metrics', INTERVAL '30 days');")
            )
            await session.commit()
            logger.info("Compression policy added")
            
            # Add refresh policies for continuous aggregates
            await session.execute(
                text("""
                    SELECT add_continuous_aggregate_policy('practice_metrics_hourly',
                        start_offset => INTERVAL '3 hours',
                        end_offset => INTERVAL '1 hour',
                        schedule_interval => INTERVAL '1 hour');
                """)
            )
            
            await session.execute(
                text("""
                    SELECT add_continuous_aggregate_policy('practice_metrics_daily',
                        start_offset => INTERVAL '3 days',
                        end_offset => INTERVAL '1 day',
                        schedule_interval => INTERVAL '1 day');
                """)
            )
            await session.commit()
            logger.info("Refresh policies added")
            
            logger.info("TimescaleDB initialization completed successfully!")
            
        except Exception as e:
            logger.error(f"Error initializing TimescaleDB: {e}")
            await session.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(init_timescaledb())