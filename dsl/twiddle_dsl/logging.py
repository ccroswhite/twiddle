"""
Twiddle DSL Execution Logging

Structured execution logging for Twiddle activities.
Emits JSON-formatted events that can be parsed for waterfall visualization.

This module is extracted from the generated code in python-export.ts
to ensure SDK-authored activities produce the same event format.
"""

import json
import time
import traceback
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from functools import wraps
from typing import Any, Callable, Dict, Literal, Optional

# Try to import Temporal activity module, but make it optional
# so the DSL can be used for linting without Temporal installed
try:
    from temporalio import activity

    TEMPORAL_AVAILABLE = True
except ImportError:
    activity = None  # type: ignore
    TEMPORAL_AVAILABLE = False


EventType = Literal[
    "ACTIVITY_STARTED",
    "ACTIVITY_COMPLETED",
    "ACTIVITY_FAILED",
    "ACTIVITY_RETRY",
    "ACTIVITY_HEARTBEAT",
]


@dataclass
class ExecutionEvent:
    """Structured execution event for workflow visualization."""

    event: EventType
    timestamp: str
    node_id: str
    node_name: str
    node_type: str
    attempt_number: int
    duration_ms: Optional[float] = None
    input_summary: Optional[Dict[str, Any]] = None
    output_summary: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    error_type: Optional[str] = None
    error_stack: Optional[str] = None


class ExecutionLogger:
    """
    Structured execution logger for Twiddle activities.

    Emits JSON-formatted events that can be parsed for waterfall visualization.
    Events are prefixed with [TWIDDLE_EVENT] for easy filtering from regular logs.

    Example:
        logger = ExecutionLogger(
            node_id="node-123",
            node_name="Send Email",
            node_type="twiddle.email"
        )
        logger.started(input_data)
        try:
            result = await do_work()
            logger.completed(result)
        except Exception as e:
            logger.failed(e)
            raise
    """

    def __init__(self, node_id: str, node_name: str, node_type: str):
        self.node_id = node_id
        self.node_name = node_name
        self.node_type = node_type
        self.start_time: Optional[float] = None
        self.attempt_number = 1

        # Try to get attempt number from Temporal activity info
        if TEMPORAL_AVAILABLE and activity is not None:
            try:
                info = activity.info()
                self.attempt_number = info.attempt
            except Exception:
                pass

    def _log(self, message: str, level: str = "info") -> None:
        """Log a message using Temporal activity logger or print."""
        if TEMPORAL_AVAILABLE and activity is not None:
            try:
                logger = activity.logger
                if level == "error":
                    logger.error(message)
                elif level == "warning":
                    logger.warning(message)
                else:
                    logger.info(message)
                return
            except Exception:
                pass
        # Fallback to print
        print(f"[{level.upper()}] {message}")

    def _emit_event(self, event: ExecutionEvent) -> None:
        """Emit a structured event as JSON log."""
        event_json = json.dumps(asdict(event), default=str)
        # Use a special prefix so events can be filtered from regular logs
        self._log(f"[TWIDDLE_EVENT] {event_json}")

        # Also log human-readable version
        if event.event == "ACTIVITY_STARTED":
            self._log(f"▶ Starting [{self.node_name}] (attempt {self.attempt_number})")
        elif event.event == "ACTIVITY_COMPLETED":
            self._log(f"✓ Completed [{self.node_name}] in {event.duration_ms:.0f}ms")
        elif event.event == "ACTIVITY_FAILED":
            self._log(f"✗ Failed [{self.node_name}]: {event.error_message}", "error")
        elif event.event == "ACTIVITY_RETRY":
            self._log(
                f"↻ Retrying [{self.node_name}] (attempt {self.attempt_number})",
                "warning",
            )

    def _get_timestamp(self) -> str:
        """Get current UTC timestamp in ISO format."""
        return datetime.now(timezone.utc).isoformat()

    def _summarize_data(
        self, data: Any, max_length: int = 200
    ) -> Optional[Dict[str, Any]]:
        """Create a summary of data for logging (truncate large values)."""
        if data is None:
            return None
        if not isinstance(data, dict):
            return {"value": str(data)[:max_length]}

        summary = {}
        for key, value in list(data.items())[:10]:  # Max 10 keys
            if isinstance(value, str) and len(value) > max_length:
                summary[key] = value[:max_length] + "..."
            elif isinstance(value, (list, dict)):
                summary[key] = f"<{type(value).__name__} with {len(value)} items>"
            else:
                summary[key] = value
        return summary

    def started(self, input_data: Optional[Dict[str, Any]] = None) -> None:
        """Log activity started event."""
        self.start_time = time.time()

        # Check if this is a retry
        if self.attempt_number > 1:
            self._emit_event(
                ExecutionEvent(
                    event="ACTIVITY_RETRY",
                    timestamp=self._get_timestamp(),
                    node_id=self.node_id,
                    node_name=self.node_name,
                    node_type=self.node_type,
                    attempt_number=self.attempt_number,
                    input_summary=self._summarize_data(input_data),
                )
            )

        self._emit_event(
            ExecutionEvent(
                event="ACTIVITY_STARTED",
                timestamp=self._get_timestamp(),
                node_id=self.node_id,
                node_name=self.node_name,
                node_type=self.node_type,
                attempt_number=self.attempt_number,
                input_summary=self._summarize_data(input_data),
            )
        )

    def completed(self, output_data: Optional[Dict[str, Any]] = None) -> None:
        """Log activity completed event."""
        duration_ms = (
            (time.time() - self.start_time) * 1000 if self.start_time else None
        )

        self._emit_event(
            ExecutionEvent(
                event="ACTIVITY_COMPLETED",
                timestamp=self._get_timestamp(),
                node_id=self.node_id,
                node_name=self.node_name,
                node_type=self.node_type,
                attempt_number=self.attempt_number,
                duration_ms=duration_ms,
                output_summary=self._summarize_data(output_data),
            )
        )

    def failed(self, error: Exception) -> None:
        """Log activity failed event."""
        duration_ms = (
            (time.time() - self.start_time) * 1000 if self.start_time else None
        )

        self._emit_event(
            ExecutionEvent(
                event="ACTIVITY_FAILED",
                timestamp=self._get_timestamp(),
                node_id=self.node_id,
                node_name=self.node_name,
                node_type=self.node_type,
                attempt_number=self.attempt_number,
                duration_ms=duration_ms,
                error_message=str(error),
                error_type=type(error).__name__,
                error_stack=traceback.format_exc(),
            )
        )

    def heartbeat(self, message: str = "") -> None:
        """Log a heartbeat for long-running activities."""
        self._emit_event(
            ExecutionEvent(
                event="ACTIVITY_HEARTBEAT",
                timestamp=self._get_timestamp(),
                node_id=self.node_id,
                node_name=self.node_name,
                node_type=self.node_type,
                attempt_number=self.attempt_number,
                output_summary={"message": message} if message else None,
            )
        )


def with_execution_logging(func: Callable) -> Callable:
    """
    Decorator that wraps activity functions with execution logging.

    Automatically logs STARTED, COMPLETED, and FAILED events.
    The wrapped function must accept an ActivityInput as its first argument.

    Example:
        @activity.defn(name="my_activity")
        @with_execution_logging
        async def my_activity(input: ActivityInput) -> Dict[str, Any]:
            # Your activity logic here
            return result
    """
    from twiddle_dsl.types import ActivityInput

    @wraps(func)
    async def wrapper(input: ActivityInput, *args: Any, **kwargs: Any) -> Dict[str, Any]:
        exec_logger = ExecutionLogger(
            node_id=input.node_id,
            node_name=input.node_name,
            node_type=input.node_type,
        )

        try:
            exec_logger.started(input.input_data)
            result = await func(input, *args, **kwargs)
            exec_logger.completed(result)
            return result
        except Exception as e:
            exec_logger.failed(e)
            raise

    return wrapper
