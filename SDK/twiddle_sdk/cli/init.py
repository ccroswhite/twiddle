"""
Twiddle SDK - Init Command

Scaffolds a new Twiddle project with example code.
"""

import os
from pathlib import Path

import click


def create_project(name: str, template: str = "basic", output_dir: str = "."):
    """
    Create a new Twiddle project.

    Args:
        name: Name of the project
        template: Template to use ('basic' or 'full')
        output_dir: Output directory
    """
    project_dir = Path(output_dir) / name
    
    if project_dir.exists():
        click.echo(f"Error: Directory '{project_dir}' already exists", err=True)
        raise SystemExit(1)

    click.echo(f"Creating Twiddle project: {name}")
    click.echo(f"Template: {template}")
    click.echo()

    # Create directory structure
    directories = [
        project_dir / "src",
        project_dir / "src" / "workflows",
        project_dir / "src" / "activities",
        project_dir / "tests",
    ]

    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)
        click.echo(f"  Created: {directory}")

    # Create __init__.py files
    init_files = [
        project_dir / "src" / "__init__.py",
        project_dir / "src" / "workflows" / "__init__.py",
        project_dir / "src" / "activities" / "__init__.py",
    ]
    for init_file in init_files:
        init_file.write_text(f"# {init_file.parent.name} module\n")

    # Create example activity
    activity_content = '''"""
Example Twiddle Activity

This demonstrates how to define a Twiddle activity with metadata.
"""

from typing import Any, Dict
from twiddle_dsl import activity, Parameter


@activity(
    name="Greet User",
    description="Greets a user by name",
    category="Demo",
    icon="wave"
)
async def greet_user(
    name: Parameter[str] = Parameter(
        label="Name",
        description="Name of the user to greet",
        required=True
    ),
    greeting: Parameter[str] = Parameter(
        label="Greeting",
        description="The greeting to use",
        default="Hello"
    ),
    input_data: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Greets a user with a personalized message.
    
    Args:
        name: The user's name
        greeting: The greeting to use (default: "Hello")
        input_data: Data from previous activity
        
    Returns:
        Dict with the greeting message added
    """
    message = f"{greeting}, {name}!"
    
    result = {**(input_data or {}), "greeting": message}
    return result
'''
    (project_dir / "src" / "activities" / "greet.py").write_text(activity_content)
    click.echo(f"  Created: src/activities/greet.py")

    # Create example workflow
    workflow_content = '''"""
Example Twiddle Workflow

This demonstrates how to define a Twiddle workflow.
"""

from typing import Any, Dict
from twiddle_dsl import workflow


@workflow(
    name="Hello World",
    description="A simple hello world workflow",
    version="1.0.0"
)
class HelloWorldWorkflow:
    """
    A simple workflow that greets a user.
    
    This workflow demonstrates the basic structure expected by Twiddle.
    """

    async def run(self, input_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Execute the workflow.
        
        Args:
            input_data: Initial input data
            
        Returns:
            Final result data
        """
        # In a real workflow, you would orchestrate activities here
        # using Temporal's workflow.execute_activity()
        
        result = input_data or {}
        result["workflow"] = "completed"
        return result
'''
    (project_dir / "src" / "workflows" / "hello_world.py").write_text(workflow_content)
    click.echo(f"  Created: src/workflows/hello_world.py")

    # Create pyproject.toml
    pyproject_content = f'''[build-system]
requires = ["setuptools>=68", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "{name}"
version = "0.1.0"
description = "A Twiddle workflow project"
requires-python = ">=3.9"
dependencies = [
    "twiddle-dsl>=1.0.0",
    "temporalio>=1.4.0",
]

[project.optional-dependencies]
dev = [
    "twiddle-sdk>=0.1.0",
    "pytest>=7.0.0",
    "pytest-asyncio>=0.21.0",
]

[tool.setuptools.packages.find]
where = ["."]
include = ["src*"]
'''
    (project_dir / "pyproject.toml").write_text(pyproject_content)
    click.echo(f"  Created: pyproject.toml")

    # Create .env.example
    env_content = '''# Twiddle Project Configuration

# Temporal Configuration
TEMPORAL_HOST=localhost:7233
TEMPORAL_NAMESPACE=default

# Add your environment variables here
'''
    (project_dir / ".env.example").write_text(env_content)
    click.echo(f"  Created: .env.example")

    # Create .gitignore
    gitignore_content = '''# Python
__pycache__/
*.py[cod]
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual environments
.venv/
venv/
ENV/

# IDE
.idea/
.vscode/
*.swp
*.swo

# Environment
.env
.env.local

# Testing
.pytest_cache/
.coverage
htmlcov/

# Temporal
temporal_output/
'''
    (project_dir / ".gitignore").write_text(gitignore_content)
    click.echo(f"  Created: .gitignore")

    # Create README
    readme_content = f'''# {name}

A Twiddle workflow project.

## Setup

1. Create a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\\Scripts\\activate
   ```

2. Install dependencies:
   ```bash
   pip install -e ".[dev]"
   ```

## Development

### Lint your code
```bash
twiddle lint src/
```

### Convert to Temporal application
```bash
twiddle convert src/ -o temporal_output/
```

### Run tests
```bash
pytest tests/
```

## Project Structure

```
{name}/
├── src/
│   ├── activities/      # Twiddle activities
│   │   └── greet.py     # Example activity
│   └── workflows/       # Twiddle workflows  
│       └── hello_world.py  # Example workflow
├── tests/               # Unit tests
├── pyproject.toml       # Project configuration
└── .env.example         # Environment template
```

## Next Steps

1. Add more activities in `src/activities/`
2. Define your workflow logic in `src/workflows/`
3. Run `twiddle lint` to check for issues
4. Run `twiddle convert` to generate a Temporal application
'''
    (project_dir / "README.md").write_text(readme_content)
    click.echo(f"  Created: README.md")

    # Create example test
    test_content = '''"""
Tests for hello world workflow.
"""

import pytest


def test_placeholder():
    """Placeholder test - replace with real tests."""
    assert True
'''
    (project_dir / "tests" / "test_hello_world.py").write_text(test_content)
    click.echo(f"  Created: tests/test_hello_world.py")

    click.echo()
    click.secho("✓ Project created successfully!", fg="green")
    click.echo()
    click.echo("Next steps:")
    click.echo(f"  cd {name}")
    click.echo("  python -m venv .venv")
    click.echo("  source .venv/bin/activate")
    click.echo('  pip install -e ".[dev]"')
    click.echo("  twiddle lint src/")
