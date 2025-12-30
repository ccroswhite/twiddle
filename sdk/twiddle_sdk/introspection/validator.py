"""
Twiddle SDK - Validation

Validates Twiddle activities and workflows using Python's inspect module
and annotations. This is the introspection-based linting approach.
"""

import inspect
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Type


@dataclass
class LintError:
    """A linting error or warning."""

    rule_id: str
    severity: str  # 'error', 'warning', 'info'
    message: str
    location: str  # function/class name

    def __str__(self) -> str:
        icon = {"error": "✗", "warning": "⚠", "info": "ℹ"}.get(self.severity, "•")
        return f"{icon} [{self.rule_id}] {self.location}: {self.message}"


def validate_activity(func: Callable, target: str = "temporal") -> List[LintError]:
    """
    Validate an activity function using introspection.

    Common Checks:
        TWD001: Activity must have @activity decorator
        TWD002: Activity function must be async def
        TWD003: Activity should accept input_data parameter
        TWD004: Activity should have return type annotation
        TWD007: Parameters should use Parameter() class
    
    Airflow-specific Checks:
        TWD010: Airflow tasks should not use async def (use sync functions)
        TWD011: Airflow tasks should accept **kwargs for context

    Args:
        func: A function to validate
        target: Target platform ('temporal' or 'airflow')

    Returns:
        List of LintError objects
    """
    errors = []
    name = getattr(func, "__name__", str(func))

    # TWD001: Check for @activity decorator
    if not hasattr(func, "_twiddle_activity"):
        errors.append(
            LintError(
                rule_id="TWD001",
                severity="error",
                message="Activity must have @activity decorator",
                location=name,
            )
        )
        return errors  # Can't validate further without decorator

    # Target-specific async check
    is_async = inspect.iscoroutinefunction(func)
    
    if target == "temporal":
        # TWD002: Temporal requires async
        if not is_async:
            errors.append(
                LintError(
                    rule_id="TWD002",
                    severity="error",
                    message="Activity function must be async def for Temporal",
                    location=name,
                )
            )
    elif target == "airflow":
        # TWD010: Airflow prefers sync functions
        if is_async:
            errors.append(
                LintError(
                    rule_id="TWD010",
                    severity="warning",
                    message="Airflow tasks typically use sync functions (async is experimental)",
                    location=name,
                )
            )

    # TWD003: Check for input_data parameter
    try:
        sig = inspect.signature(func)
        param_names = list(sig.parameters.keys())
        
        if "input_data" not in param_names:
            errors.append(
                LintError(
                    rule_id="TWD003",
                    severity="warning",
                    message="Activity should accept input_data parameter",
                    location=name,
                )
            )
        
        # TWD011: Airflow should have **kwargs for context
        if target == "airflow":
            has_kwargs = any(
                p.kind == inspect.Parameter.VAR_KEYWORD
                for p in sig.parameters.values()
            )
            if not has_kwargs:
                errors.append(
                    LintError(
                        rule_id="TWD011",
                        severity="info",
                        message="Airflow tasks should accept **kwargs for task context",
                        location=name,
                    )
                )
    except (ValueError, TypeError):
        pass  # Can't get signature, skip this check

    # TWD004: Check return type annotation
    annotations = getattr(func, "__annotations__", {})
    if "return" not in annotations:
        errors.append(
            LintError(
                rule_id="TWD004",
                severity="warning",
                message="Activity should have return type annotation (-> Dict[str, Any])",
                location=name,
            )
        )

    # TWD007: Check Parameter usage
    try:
        # Import here to avoid circular dependency
        from twiddle_dsl import Parameter

        sig = inspect.signature(func)
        for param_name, param in sig.parameters.items():
            if param_name in ("self", "cls", "input_data"):
                continue
            if param.kind == inspect.Parameter.VAR_KEYWORD:
                continue  # Skip **kwargs
            if param.default is not inspect.Parameter.empty:
                if not isinstance(param.default, Parameter):
                    errors.append(
                        LintError(
                            rule_id="TWD007",
                            severity="info",
                            message=f'Parameter "{param_name}" should use Parameter() class for UI metadata',
                            location=name,
                        )
                    )
    except (ImportError, ValueError, TypeError):
        pass  # Skip if can't import or get signature

    return errors


def validate_workflow(cls: Type, target: str = "temporal") -> List[LintError]:
    """
    Validate a workflow class using introspection.

    Common Checks:
        TWD005: Workflow class must have @workflow decorator
        TWD006: Workflow must have run() method

    Args:
        cls: A class to validate
        target: Target platform ('temporal' or 'airflow')

    Returns:
        List of LintError objects
    """
    errors = []
    name = getattr(cls, "__name__", str(cls))

    # TWD005: Check for @workflow decorator
    if not hasattr(cls, "_twiddle_workflow"):
        errors.append(
            LintError(
                rule_id="TWD005",
                severity="error",
                message="Workflow class must have @workflow decorator",
                location=name,
            )
        )
        return errors  # Can't validate further

    # TWD006: Must have run method
    if not hasattr(cls, "run") or not callable(getattr(cls, "run", None)):
        errors.append(
            LintError(
                rule_id="TWD006",
                severity="error",
                message="Workflow must have a run() method",
                location=name,
            )
        )

    return errors


def validate_module(module) -> Dict[str, Any]:
    """
    Validate all activities and workflows in a module.

    Args:
        module: A loaded Python module

    Returns:
        Dict with validation results
    """
    from twiddle_sdk.introspection.discovery import (
        discover_activities,
        discover_workflows,
    )

    activities = discover_activities(module)
    workflows = discover_workflows(module)

    all_errors = []

    for activity in activities:
        errors = validate_activity(activity)
        all_errors.extend(errors)

    for workflow in workflows:
        errors = validate_workflow(workflow)
        all_errors.extend(errors)

    # Count by severity
    error_count = sum(1 for e in all_errors if e.severity == "error")
    warning_count = sum(1 for e in all_errors if e.severity == "warning")
    info_count = sum(1 for e in all_errors if e.severity == "info")

    return {
        "activities_found": len(activities),
        "workflows_found": len(workflows),
        "errors": all_errors,
        "error_count": error_count,
        "warning_count": warning_count,
        "info_count": info_count,
        "passed": error_count == 0,
    }
