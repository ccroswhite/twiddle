"""
Twiddle SDK - Module Discovery

Discovers Twiddle activities and workflows by importing Python modules
and inspecting for decorator metadata.
"""

import importlib.util
import inspect
import sys
from pathlib import Path
from types import ModuleType
from typing import Callable, List, Type


def load_module_from_path(path: Path) -> ModuleType:
    """
    Dynamically import a Python module from a file path.

    Args:
        path: Path to a Python file

    Returns:
        The imported module

    Raises:
        ImportError: If the module cannot be loaded
        FileNotFoundError: If the file does not exist
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Module not found: {path}")

    if not path.suffix == ".py":
        raise ValueError(f"Not a Python file: {path}")

    # Create a unique module name to avoid conflicts
    module_name = f"twiddle_loaded_{path.stem}_{id(path)}"

    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot create module spec for: {path}")

    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module

    try:
        spec.loader.exec_module(module)
    except Exception as e:
        del sys.modules[module_name]
        raise ImportError(f"Error loading module {path}: {e}") from e

    return module


def discover_activities(module: ModuleType) -> List[Callable]:
    """
    Find all functions with @activity decorator in a module.

    Args:
        module: A loaded Python module

    Returns:
        List of functions that have the _twiddle_activity attribute
    """
    activities = []
    for name, obj in inspect.getmembers(module, inspect.isfunction):
        if hasattr(obj, "_twiddle_activity"):
            activities.append(obj)
    return activities


def discover_workflows(module: ModuleType) -> List[Type]:
    """
    Find all classes with @workflow decorator in a module.

    Args:
        module: A loaded Python module

    Returns:
        List of classes that have the _twiddle_workflow attribute
    """
    workflows = []
    for name, obj in inspect.getmembers(module, inspect.isclass):
        if hasattr(obj, "_twiddle_workflow"):
            workflows.append(obj)
    return workflows


def discover_all_in_directory(directory: Path) -> dict:
    """
    Discover all activities and workflows in a directory.

    Args:
        directory: Path to a directory containing Python files

    Returns:
        Dict with 'activities' and 'workflows' lists
    """
    directory = Path(directory)
    if not directory.is_dir():
        raise ValueError(f"Not a directory: {directory}")

    all_activities = []
    all_workflows = []
    errors = []

    for py_file in directory.rglob("*.py"):
        # Skip __pycache__ and hidden files
        if "__pycache__" in str(py_file) or py_file.name.startswith("."):
            continue

        try:
            module = load_module_from_path(py_file)
            all_activities.extend(discover_activities(module))
            all_workflows.extend(discover_workflows(module))
        except Exception as e:
            errors.append({"file": str(py_file), "error": str(e)})

    return {
        "activities": all_activities,
        "workflows": all_workflows,
        "errors": errors,
    }
