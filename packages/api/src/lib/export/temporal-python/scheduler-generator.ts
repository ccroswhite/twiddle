/**
 * Scheduler file generator for Temporal Python export.
 * 
 * Generates a scheduler.py that manages Temporal Schedules
 * with create, update, pause, resume, and delete operations.
 */

import type { WorkflowData } from './types.js';
import { toPythonIdentifier } from './utils.js';

/**
 * Generate the default schedule configuration as Python dict.
 */
function generateScheduleConfig(workflow: WorkflowData): string {
    const schedule = workflow.schedule;

    if (!schedule || !schedule.enabled) {
        return `{
    "enabled": False,
    "mode": "simple",
    "simple": {
        "frequency": "daily",
        "interval": 1,
        "time": "09:00",
        "timezone": "UTC"
    }
}`;
    }

    if (schedule.mode === 'cron' && schedule.cron) {
        return `{
    "enabled": True,
    "mode": "cron",
    "cron": "${schedule.cron}"
}`;
    }

    // Use the NonNullable simple object with defaults for each property
    const simple = schedule.simple;
    const frequency = simple?.frequency || 'daily';
    const interval = simple?.interval ?? 1;
    const time = simple?.time || '09:00';
    const daysOfWeek = simple?.daysOfWeek || [];
    const dayOfMonth = simple?.dayOfMonth ?? 1;
    const timezone = simple?.timezone || 'UTC';

    return `{
    "enabled": True,
    "mode": "simple",
    "simple": {
        "frequency": "${frequency}",
        "interval": ${interval},
        "time": "${time}",
        "daysOfWeek": ${JSON.stringify(daysOfWeek)},
        "dayOfMonth": ${dayOfMonth},
        "timezone": "${timezone}"
    }
}`;
}

/**
 * Generate the scheduler file with Temporal Schedule API support.
 */
export function generateSchedulerFile(workflow: WorkflowData): string {
    const workflowName = toPythonIdentifier(workflow.name);
    const workflowClassName = workflowName.charAt(0).toUpperCase() + workflowName.slice(1) + 'Workflow';
    const scheduleId = `${workflowName}-schedule`;
    const scheduleConfig = generateScheduleConfig(workflow);

    return `"""
Temporal Schedule Manager for ${workflow.name}

Manages scheduled execution of the workflow using Temporal's Schedule API.
Supports create, update, pause, resume, and delete operations.

Schedule ID: ${scheduleId}
"""
import argparse
import asyncio
import json
import logging
import os
import sys
from datetime import timedelta
from typing import Optional

from dotenv import load_dotenv
from temporalio.client import (
    Client,
    Schedule,
    ScheduleActionStartWorkflow,
    ScheduleIntervalSpec,
    ScheduleSpec,
    ScheduleState,
    ScheduleUpdate,
    ScheduleUpdateInput,
)

from workflow import ${workflowClassName}

# Load environment variables
load_dotenv()

# Configuration
WORKFLOW_NAME = "${workflowName}"
TASK_QUEUE = WORKFLOW_NAME
SCHEDULE_ID = "${scheduleId}"

# Default schedule configuration (from Twiddle)
DEFAULT_SCHEDULE_CONFIG = ${scheduleConfig}

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(f"{WORKFLOW_NAME}-scheduler")


def get_temporal_client_config() -> tuple[str, str]:
    """Get Temporal connection configuration."""
    host = os.environ.get('TEMPORAL_HOST', 'localhost:7233')
    namespace = os.environ.get('TEMPORAL_NAMESPACE', 'default')
    return host, namespace


def parse_interval(interval_str: str) -> timedelta:
    """
    Parse interval string like '30m', '2h', '1d' into timedelta.
    
    Supported formats:
        - Nm: N minutes (e.g., '30m')
        - Nh: N hours (e.g., '2h')
        - Nd: N days (e.g., '1d')
    """
    if not interval_str:
        raise ValueError("Interval string cannot be empty")
    
    unit = interval_str[-1].lower()
    try:
        value = int(interval_str[:-1])
    except ValueError:
        raise ValueError(f"Invalid interval format: {interval_str}")
    
    if unit == 'm':
        return timedelta(minutes=value)
    elif unit == 'h':
        return timedelta(hours=value)
    elif unit == 'd':
        return timedelta(days=value)
    else:
        raise ValueError(f"Unknown interval unit: {unit}. Use 'm' (minutes), 'h' (hours), or 'd' (days)")


def build_schedule_spec(
    config: dict = None,
    cron_override: str = None,
    interval_override: str = None
) -> ScheduleSpec:
    """
    Build a Temporal ScheduleSpec from configuration.
    
    Args:
        config: Schedule configuration dict
        cron_override: Override with cron expression
        interval_override: Override with interval string (e.g., '30m')
    
    Returns:
        Temporal ScheduleSpec
    """
    config = config or DEFAULT_SCHEDULE_CONFIG
    timezone = config.get('simple', {}).get('timezone', 'UTC')
    
    # CLI overrides take precedence
    if cron_override:
        return ScheduleSpec(
            cron_expressions=[cron_override],
            jitter=timedelta(seconds=30),
        )
    
    if interval_override:
        interval = parse_interval(interval_override)
        return ScheduleSpec(
            intervals=[ScheduleIntervalSpec(every=interval)],
            jitter=timedelta(seconds=30),
        )
    
    # Use configuration
    mode = config.get('mode', 'simple')
    
    if mode == 'cron':
        cron_expr = config.get('cron', '0 9 * * *')
        return ScheduleSpec(
            cron_expressions=[cron_expr],
            jitter=timedelta(seconds=30),
        )
    
    # Simple mode
    simple = config.get('simple', {})
    frequency = simple.get('frequency', 'daily')
    interval_value = simple.get('interval', 1)
    time_str = simple.get('time', '09:00')
    
    if frequency == 'minutes':
        return ScheduleSpec(
            intervals=[ScheduleIntervalSpec(every=timedelta(minutes=interval_value))],
            jitter=timedelta(seconds=10),
        )
    elif frequency == 'hours':
        return ScheduleSpec(
            intervals=[ScheduleIntervalSpec(every=timedelta(hours=interval_value))],
            jitter=timedelta(seconds=30),
        )
    elif frequency == 'daily':
        # Convert to cron: run at specific time daily
        hour, minute = time_str.split(':')
        cron_expr = f"{minute} {hour} * * *"
        return ScheduleSpec(
            cron_expressions=[cron_expr],
            jitter=timedelta(seconds=30),
        )
    elif frequency == 'weekly':
        hour, minute = time_str.split(':')
        days_of_week = simple.get('daysOfWeek', [1])  # Default Monday
        day_names = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
        days_str = ','.join(day_names[d] for d in days_of_week)
        cron_expr = f"{minute} {hour} * * {days_str}"
        return ScheduleSpec(
            cron_expressions=[cron_expr],
            jitter=timedelta(seconds=30),
        )
    elif frequency == 'monthly':
        hour, minute = time_str.split(':')
        day_of_month = simple.get('dayOfMonth', 1)
        cron_expr = f"{minute} {hour} {day_of_month} * *"
        return ScheduleSpec(
            cron_expressions=[cron_expr],
            jitter=timedelta(seconds=30),
        )
    else:
        # Fallback to daily
        return ScheduleSpec(
            intervals=[ScheduleIntervalSpec(every=timedelta(days=1))],
            jitter=timedelta(seconds=30),
        )


async def create_or_update_schedule(
    cron: str = None,
    interval: str = None,
    paused: bool = False,
    input_data: dict = None
) -> None:
    """
    Create a new schedule or update an existing one.
    
    Uses Temporal's create_or_update which handles both cases.
    """
    host, namespace = get_temporal_client_config()
    
    logger.info(f"Connecting to Temporal at {host}")
    client = await Client.connect(host, namespace=namespace)
    
    schedule_spec = build_schedule_spec(
        cron_override=cron,
        interval_override=interval
    )
    
    schedule = Schedule(
        action=ScheduleActionStartWorkflow(
            ${workflowClassName}.run,
            id=f"{WORKFLOW_NAME}-scheduled",
            task_queue=TASK_QUEUE,
            arg=input_data or {},
        ),
        spec=schedule_spec,
        state=ScheduleState(
            paused=paused,
        ),
    )
    
    logger.info(f"Creating/updating schedule: {SCHEDULE_ID}")
    
    try:
        # Try to get existing schedule handle
        handle = client.get_schedule_handle(SCHEDULE_ID)
        
        # Update existing schedule
        async def updater(input: ScheduleUpdateInput) -> ScheduleUpdate:
            return ScheduleUpdate(schedule=schedule)
        
        await handle.update(updater)
        logger.info(f"✓ Schedule updated: {SCHEDULE_ID}")
        
    except Exception as e:
        if "not found" in str(e).lower():
            # Create new schedule
            await client.create_schedule(
                SCHEDULE_ID,
                schedule,
            )
            logger.info(f"✓ Schedule created: {SCHEDULE_ID}")
        else:
            raise
    
    # Show schedule info
    await describe_schedule()


async def describe_schedule() -> None:
    """Show the current schedule status and configuration."""
    host, namespace = get_temporal_client_config()
    client = await Client.connect(host, namespace=namespace)
    
    try:
        handle = client.get_schedule_handle(SCHEDULE_ID)
        desc = await handle.describe()
        
        print(f"\\n{'='*60}")
        print(f"Schedule: {SCHEDULE_ID}")
        print(f"{'='*60}")
        print(f"Status: {'PAUSED' if desc.schedule.state.paused else 'ACTIVE'}")
        
        if desc.schedule.spec.cron_expressions:
            print(f"Cron: {desc.schedule.spec.cron_expressions}")
        if desc.schedule.spec.intervals:
            for interval in desc.schedule.spec.intervals:
                print(f"Interval: every {interval.every}")
        
        if desc.info.num_actions:
            print(f"Total runs: {desc.info.num_actions}")
        if desc.info.recent_actions:
            print(f"Last run: {desc.info.recent_actions[-1].actual_time}")
        if desc.info.next_action_times:
            print(f"Next run: {desc.info.next_action_times[0]}")
        
        print(f"{'='*60}\\n")
        
    except Exception as e:
        if "not found" in str(e).lower():
            logger.warning(f"Schedule '{SCHEDULE_ID}' does not exist")
        else:
            raise


async def pause_schedule() -> None:
    """Pause the schedule (stops future executions)."""
    host, namespace = get_temporal_client_config()
    client = await Client.connect(host, namespace=namespace)
    
    handle = client.get_schedule_handle(SCHEDULE_ID)
    await handle.pause(note="Paused via scheduler.py")
    logger.info(f"✓ Schedule paused: {SCHEDULE_ID}")


async def unpause_schedule() -> None:
    """Resume/unpause the schedule."""
    host, namespace = get_temporal_client_config()
    client = await Client.connect(host, namespace=namespace)
    
    handle = client.get_schedule_handle(SCHEDULE_ID)
    await handle.unpause(note="Resumed via scheduler.py")
    logger.info(f"✓ Schedule resumed: {SCHEDULE_ID}")


async def delete_schedule() -> None:
    """Delete the schedule entirely."""
    host, namespace = get_temporal_client_config()
    client = await Client.connect(host, namespace=namespace)
    
    handle = client.get_schedule_handle(SCHEDULE_ID)
    await handle.delete()
    logger.info(f"✓ Schedule deleted: {SCHEDULE_ID}")


async def trigger_schedule() -> None:
    """Trigger immediate execution of the schedule."""
    host, namespace = get_temporal_client_config()
    client = await Client.connect(host, namespace=namespace)
    
    handle = client.get_schedule_handle(SCHEDULE_ID)
    await handle.trigger()
    logger.info(f"✓ Schedule triggered: {SCHEDULE_ID}")


def main():
    parser = argparse.ArgumentParser(
        description=f'Manage Temporal schedule for {WORKFLOW_NAME}',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Commands:
    create    Create or update the schedule
    status    Show schedule status and info
    pause     Pause the schedule
    resume    Resume a paused schedule
    delete    Delete the schedule
    trigger   Trigger immediate execution

Examples:
    python scheduler.py create
    python scheduler.py create --cron "0 9 * * MON-FRI"
    python scheduler.py create --interval 30m
    python scheduler.py create --paused
    python scheduler.py status
    python scheduler.py pause
    python scheduler.py resume
    python scheduler.py trigger
    python scheduler.py delete
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # Create command
    create_parser = subparsers.add_parser('create', help='Create or update schedule')
    create_parser.add_argument('--cron', type=str, help='Cron expression (e.g., "0 9 * * *")')
    create_parser.add_argument('--interval', type=str, help='Interval (e.g., "30m", "2h", "1d")')
    create_parser.add_argument('--paused', action='store_true', help='Create in paused state')
    create_parser.add_argument('--input', type=str, default='{}', help='JSON input for workflow')
    
    # Other commands
    subparsers.add_parser('status', help='Show schedule status')
    subparsers.add_parser('pause', help='Pause the schedule')
    subparsers.add_parser('resume', help='Resume the schedule')
    subparsers.add_parser('delete', help='Delete the schedule')
    subparsers.add_parser('trigger', help='Trigger immediate execution')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    if args.command == 'create':
        input_data = json.loads(args.input) if args.input else {}
        asyncio.run(create_or_update_schedule(
            cron=args.cron,
            interval=args.interval,
            paused=args.paused,
            input_data=input_data
        ))
    elif args.command == 'status':
        asyncio.run(describe_schedule())
    elif args.command == 'pause':
        asyncio.run(pause_schedule())
    elif args.command == 'resume':
        asyncio.run(unpause_schedule())
    elif args.command == 'delete':
        asyncio.run(delete_schedule())
    elif args.command == 'trigger':
        asyncio.run(trigger_schedule())


if __name__ == "__main__":
    main()
`;
}
