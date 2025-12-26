"""
Twiddle SDK - Convert Command

Converts Twiddle Python code to a full Temporal application.
"""

import sys
from pathlib import Path
from typing import Optional

import click

from twiddle_sdk.introspection.discovery import (
    discover_activities,
    discover_workflows,
    load_module_from_path,
    discover_all_in_directory,
)
from twiddle_sdk.converter.extractor import (
    extract_activity_metadata,
    extract_workflow_metadata,
)
from twiddle_sdk.converter.generator import generate_all_files


def run_conversion(path: str, output: str, workflow_name: Optional[str] = None):
    """
    Convert Twiddle Python code to a Temporal application.

    Args:
        path: Path to file or directory containing Twiddle code
        output: Output directory for generated files
        workflow_name: Optional workflow name to use (defaults to first found)
    """
    path_obj = Path(path)
    output_dir = Path(output)

    click.echo(f"\nTwiddle Convert")
    click.echo("=" * 40)
    click.echo(f"Source: {path_obj}")
    click.echo(f"Output: {output_dir}")
    click.echo()

    # Discover activities and workflows
    all_activities = []
    all_workflows = []

    if path_obj.is_file():
        try:
            module = load_module_from_path(path_obj)
            all_activities = discover_activities(module)
            all_workflows = discover_workflows(module)
        except Exception as e:
            click.echo(f"Error loading {path_obj}: {e}", err=True)
            sys.exit(1)
    elif path_obj.is_dir():
        result = discover_all_in_directory(path_obj)
        all_activities = result["activities"]
        all_workflows = result["workflows"]
        
        if result["errors"]:
            click.echo("Warnings during discovery:", err=True)
            for err in result["errors"]:
                click.echo(f"  - {err['file']}: {err['error']}", err=True)
            click.echo()
    else:
        click.echo(f"Error: {path} is not a valid file or directory", err=True)
        sys.exit(1)

    click.echo(f"Found {len(all_activities)} activity(ies)")
    click.echo(f"Found {len(all_workflows)} workflow(s)")

    if not all_workflows:
        click.echo("\nError: No workflows found. At least one @workflow decorated class is required.", err=True)
        sys.exit(1)

    if not all_activities:
        click.echo("\nWarning: No activities found. Generated code will have empty activity implementations.", err=True)

    # Use first workflow or specified one
    workflow_cls = all_workflows[0]
    if workflow_name:
        for w in all_workflows:
            if hasattr(w, "_twiddle_workflow"):
                if w._twiddle_workflow.get("name") == workflow_name:
                    workflow_cls = w
                    break

    # Extract metadata
    click.echo("\nExtracting metadata...")
    workflow_meta = extract_workflow_metadata(workflow_cls)
    activities_meta = [extract_activity_metadata(a) for a in all_activities]

    click.echo(f"  Workflow: {workflow_meta.get('name', 'Unknown')}")
    for activity_meta in activities_meta:
        click.echo(f"  Activity: {activity_meta.get('name', 'Unknown')}")

    # Generate files
    click.echo("\nGenerating Temporal application...")
    files = generate_all_files(workflow_meta, activities_meta)

    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)

    # Write files
    for filename, content in files.items():
        file_path = output_dir / filename
        file_path.write_text(content)
        click.echo(f"  Created: {file_path}")

    click.echo()
    click.secho("✓ Conversion complete!", fg="green")
    click.echo()
    click.echo("Next steps:")
    click.echo(f"  cd {output_dir}")
    click.echo("  pip install -r requirements.txt")
    click.echo("  # Start Temporal: temporal server start-dev")
    click.echo("  python worker.py  # Terminal 1")
    click.echo("  python starter.py  # Terminal 2")
