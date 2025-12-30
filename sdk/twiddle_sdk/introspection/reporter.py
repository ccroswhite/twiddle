"""
Twiddle SDK - Lint Output Reporter

Formats lint results for terminal output.
"""

from typing import List

from twiddle_sdk.introspection.validator import LintError


def format_lint_results(
    errors: List[LintError],
    file_path: str = "",
    show_summary: bool = True,
) -> str:
    """
    Format lint errors for terminal output.

    Args:
        errors: List of LintError objects
        file_path: Optional file path to display
        show_summary: Whether to show summary counts

    Returns:
        Formatted string for terminal output
    """
    if not errors:
        return "✓ No issues found"

    lines = []

    if file_path:
        lines.append(f"\n{file_path}")
        lines.append("-" * len(file_path))

    # Group by severity
    errors_list = [e for e in errors if e.severity == "error"]
    warnings_list = [e for e in errors if e.severity == "warning"]
    info_list = [e for e in errors if e.severity == "info"]

    for error in errors_list:
        lines.append(f"  ✗ {error.rule_id} [{error.location}]: {error.message}")

    for warning in warnings_list:
        lines.append(f"  ⚠ {warning.rule_id} [{warning.location}]: {warning.message}")

    for info in info_list:
        lines.append(f"  ℹ {info.rule_id} [{info.location}]: {info.message}")

    if show_summary:
        lines.append("")
        parts = []
        if errors_list:
            parts.append(f"{len(errors_list)} error(s)")
        if warnings_list:
            parts.append(f"{len(warnings_list)} warning(s)")
        if info_list:
            parts.append(f"{len(info_list)} info")
        lines.append("Summary: " + ", ".join(parts))

    return "\n".join(lines)


def format_discovery_results(
    activities_count: int,
    workflows_count: int,
    errors_count: int = 0,
) -> str:
    """
    Format discovery results for terminal output.

    Args:
        activities_count: Number of activities found
        workflows_count: Number of workflows found
        errors_count: Number of import errors

    Returns:
        Formatted string
    """
    lines = [
        f"Found {activities_count} activit{'y' if activities_count == 1 else 'ies'}",
        f"Found {workflows_count} workflow{'s' if workflows_count != 1 else ''}",
    ]
    if errors_count:
        lines.append(f"Encountered {errors_count} import error(s)")
    return "\n".join(lines)
