"""
Twiddle SDK - CLI Entry Point

Click-based command line interface for the Twiddle SDK.
"""

import click

from twiddle_sdk import __version__ as SDK_VERSION

# Import DSL version
try:
    from twiddle_dsl import __version__ as DSL_VERSION
except ImportError:
    DSL_VERSION = "not installed"


@click.group()
@click.version_option(version=SDK_VERSION, prog_name="twiddle")
def cli():
    """Twiddle Python SDK - Build Temporal and Airflow workflows with ease."""
    pass


@cli.command()
def version():
    """Display SDK and DSL versions."""
    click.echo(f"Twiddle SDK: {SDK_VERSION}")
    click.echo(f"Twiddle DSL: {DSL_VERSION}")


@cli.command()
@click.argument("name")
@click.option(
    "--template",
    "-t",
    default="basic",
    type=click.Choice(["basic", "full"]),
    help="Project template to use",
)
@click.option(
    "--output",
    "-o",
    default=".",
    type=click.Path(),
    help="Output directory",
)
def init(name: str, template: str, output: str):
    """Initialize a new Twiddle project.

    NAME is the name of the project to create.
    """
    from twiddle_sdk.cli.init import create_project

    create_project(name, template, output)


@cli.command()
@click.argument("path", type=click.Path(exists=True))
@click.option(
    "--format",
    "-f",
    "output_format",
    default="text",
    type=click.Choice(["text", "json"]),
    help="Output format",
)
@click.option(
    "--target",
    "-T",
    default="temporal",
    type=click.Choice(["temporal", "airflow"]),
    help="Target platform for linting rules (default: temporal)",
)
def lint(path: str, output_format: str, target: str):
    """Lint Twiddle Python code for DSL conformity.

    PATH is the file or directory to lint.
    """
    from twiddle_sdk.cli.lint import run_linter

    run_linter(path, output_format, target)


@cli.command()
@click.argument("path", type=click.Path(exists=True))
@click.option(
    "--output",
    "-o",
    default=None,
    type=click.Path(),
    help="Output directory for generated files",
)
@click.option(
    "--name",
    "-n",
    default=None,
    help="Workflow name (defaults to first workflow found)",
)
@click.option(
    "--target",
    "-T",
    default="temporal",
    type=click.Choice(["temporal", "airflow"]),
    help="Target platform to generate code for (default: temporal)",
)
def convert(path: str, output: str, name: str, target: str):
    """Convert Twiddle Python code to a Temporal or Airflow application.

    PATH is the file or directory containing Twiddle code.
    """
    # Set default output based on target
    if output is None:
        output = f"./{target}_output"
    
    from twiddle_sdk.cli.convert import run_conversion

    run_conversion(path, output, name, target)


def main():
    """Main entry point."""
    cli()


if __name__ == "__main__":
    main()

