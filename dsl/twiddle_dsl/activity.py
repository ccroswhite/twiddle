"""
Twiddle DSL Activity Decorator

Decorator for defining Twiddle activities with metadata.
"""

import inspect
from functools import wraps
from typing import Callable, List, Optional, Any, Dict


def activity(
    name: str,
    description: str = "",
    category: str = "Custom",
    icon: str = "code",
    tags: Optional[List[str]] = None,
) -> Callable:
    """
    Decorator to define a Twiddle activity.

    This decorator marks a function as a Twiddle activity and captures
    metadata used by the Twiddle UI and code generator.

    Args:
        name: Display name for the activity in the UI
        description: Help text describing what the activity does
        category: Category for grouping in the activity palette
        icon: Icon name to display (e.g., 'slack', 'database', 'code')
        tags: Optional tags for filtering/searching activities

    Example:
        @activity(
            name="Send Slack Message",
            description="Posts a message to a Slack channel",
            category="Integrations",
            icon="slack"
        )
        async def send_slack_message(
            channel: str,
            message: str,
            input_data=None
        ) -> Dict[str, Any]:
            # Implementation...
            return {**input_data, "slack_sent": True}

    Notes:
        - For Temporal: Activities should be async functions (async def)
        - For Airflow: Activities can be sync functions with **kwargs
        - Activities should accept input_data as a parameter
        - Activities should return Dict[str, Any]
    """

    def decorator(func: Callable) -> Callable:
        # Check if the original function is async for metadata
        is_async = inspect.iscoroutinefunction(func)
        
        # Store metadata on the function for introspection
        func._twiddle_activity = {
            "name": name,
            "description": description,
            "category": category,
            "icon": icon,
            "tags": tags or [],
            "function_name": func.__name__,
            "is_async": is_async,
        }

        # Return the function as-is (don't wrap it)
        # This preserves the original function's signature and async status
        # for proper introspection by the linter
        return func

    return decorator

