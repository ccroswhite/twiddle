"""
Twiddle SDK - Lint Command

Lints Twiddle Python code for DSL conformity using introspection.
"""

import json
import sys
from pathlib import Path

import click

from twiddle_sdk.introspection.discovery import (
    discover_activities,
    discover_workflows,
    load_module_from_path,
)
from twiddle_sdk.introspection.reporter import format_lint_results
from twiddle_sdk.introspection.validator import (
    validate_activity,
    validate_workflow,
    LintError,
)


def lint_file(file_path: Path, target: str = "temporal") -> dict:
    """
    Lint a single Python file.

    Args:
        file_path: Path to the Python file
        target: Target platform ('temporal' or 'airflow')

    Returns:
        Dict with lint results
    """
    errors = []
    activities_found = 0
    workflows_found = 0

    try:
        module = load_module_from_path(file_path)

        # Discover and validate activities
        activities = discover_activities(module)
        activities_found = len(activities)
        for activity in activities:
            activity_errors = validate_activity(activity, target)
            errors.extend(activity_errors)

        # Discover and validate workflows
        workflows = discover_workflows(module)
        workflows_found = len(workflows)
        for workflow in workflows:
            workflow_errors = validate_workflow(workflow, target)
            errors.extend(workflow_errors)

    except Exception as e:
        errors.append(
            LintError(
                rule_id="TWD000",
                severity="error",
                message=f"Failed to load module: {e}",
                location=str(file_path),
            )
        )

    return {
        "file": str(file_path),
        "activities_found": activities_found,
        "workflows_found": workflows_found,
        "errors": errors,
    }


def lint_directory(dir_path: Path, target: str = "temporal") -> list:
    """
    Lint all Python files in a directory.

    Args:
        dir_path: Path to the directory
        target: Target platform ('temporal' or 'airflow')

    Returns:
        List of lint results for each file
    """
    results = []

    for py_file in sorted(dir_path.rglob("*.py")):
        # Skip __pycache__, hidden files, and test files
        if "__pycache__" in str(py_file):
            continue
        if py_file.name.startswith("."):
            continue

        result = lint_file(py_file, target)
        # Only include files with Twiddle components or errors
        if (
            result["activities_found"] > 0
            or result["workflows_found"] > 0
            or result["errors"]
        ):
            results.append(result)

    return results


def run_linter(path: str, output_format: str = "text", target: str = "temporal"):
    """
    Run the linter on a file or directory.

    Args:
        path: Path to file or directory
        output_format: 'text' or 'json'
        target: Target platform ('temporal' or 'airflow')
    """
    path_obj = Path(path)
    
    target_display = "Temporal" if target == "temporal" else "Airflow"

    if path_obj.is_file():
        results = [lint_file(path_obj, target)]
    elif path_obj.is_dir():
        results = lint_directory(path_obj, target)
    else:
        click.echo(f"Error: {path} is not a valid file or directory", err=True)
        sys.exit(1)

    # Calculate totals
    total_errors = 0
    total_warnings = 0
    total_info = 0
    total_activities = 0
    total_workflows = 0

    for result in results:
        total_activities += result["activities_found"]
        total_workflows += result["workflows_found"]
        for error in result["errors"]:
            if error.severity == "error":
                total_errors += 1
            elif error.severity == "warning":
                total_warnings += 1
            else:
                total_info += 1

    if output_format == "json":
        # Convert errors to dicts for JSON
        json_results = []
        for result in results:
            json_results.append(
                {
                    "file": result["file"],
                    "activities_found": result["activities_found"],
                    "workflows_found": result["workflows_found"],
                    "errors": [
                        {
                            "rule_id": e.rule_id,
                            "severity": e.severity,
                            "message": e.message,
                            "location": e.location,
                        }
                        for e in result["errors"]
                    ],
                }
            )
        output = {
            "results": json_results,
            "summary": {
                "total_activities": total_activities,
                "total_workflows": total_workflows,
                "total_errors": total_errors,
                "total_warnings": total_warnings,
                "total_info": total_info,
                "passed": total_errors == 0,
            },
        }
        click.echo(json.dumps(output, indent=2))
    else:
        # Text format
        click.echo(f"\nTwiddle Lint Results")
        click.echo("=" * 40)
        click.echo(f"Found {total_activities} activity(ies), {total_workflows} workflow(s)")
        click.echo()

        if not results:
            click.echo("No Twiddle components found.")
            return

        for result in results:
            if result["errors"]:
                output = format_lint_results(
                    result["errors"],
                    file_path=result["file"],
                    show_summary=False,
                )
                click.echo(output)

        click.echo()
        click.echo("-" * 40)
        if total_errors == 0:
            click.secho("✓ All checks passed!", fg="green")
        else:
            click.secho(
                f"✗ {total_errors} error(s), {total_warnings} warning(s), {total_info} info",
                fg="red" if total_errors else "yellow",
            )

    # Exit with error code if there are errors
    if total_errors > 0:
        sys.exit(1)
