"""
Twiddle SDK - Metadata Extractor

Extracts metadata from Twiddle activities and workflows for code generation.
"""

import inspect
from typing import Any, Callable, Dict, List, Type

from twiddle_dsl import Parameter


def extract_activity_metadata(func: Callable) -> Dict[str, Any]:
    """
    Extract all metadata from an @activity decorated function.

    Args:
        func: A function with @activity decorator

    Returns:
        Dict containing all activity metadata including parameters
    """
    if not hasattr(func, "_twiddle_activity"):
        raise ValueError(f"Function {func.__name__} is not decorated with @activity")

    meta = func._twiddle_activity.copy()
    sig = inspect.signature(func)

    # Extract parameters with their metadata
    parameters = []
    for name, param in sig.parameters.items():
        if name in ("self", "cls", "input_data"):
            continue

        param_info: Dict[str, Any] = {
            "name": name,
            "python_name": name,
        }

        # Get type annotation
        if param.annotation != inspect.Parameter.empty:
            # Handle Parameter[T] annotations
            annotation = param.annotation
            if hasattr(annotation, "__origin__"):
                # Generic type like Parameter[str]
                param_info["annotation"] = str(annotation)
                if hasattr(annotation, "__args__"):
                    param_info["type"] = str(annotation.__args__[0].__name__)
            else:
                param_info["annotation"] = str(annotation)
                param_info["type"] = getattr(annotation, "__name__", str(annotation))

        # Get Parameter metadata if used
        if isinstance(param.default, Parameter):
            param_info.update(
                {
                    "label": param.default.label,
                    "description": param.default.description,
                    "required": param.default.required,
                    "default": param.default.default,
                    "template": param.default.template,
                    "secret": param.default.secret,
                    "options": param.default.options,
                    "validation": param.default.validation,
                }
            )
        elif param.default != inspect.Parameter.empty:
            param_info["default"] = param.default

        parameters.append(param_info)

    meta["parameters"] = parameters
    meta["is_async"] = inspect.iscoroutinefunction(func)
    meta["docstring"] = inspect.getdoc(func)

    # Get return type annotation
    annotations = getattr(func, "__annotations__", {})
    if "return" in annotations:
        meta["return_type"] = str(annotations["return"])

    return meta


def extract_workflow_metadata(cls: Type) -> Dict[str, Any]:
    """
    Extract all metadata from a @workflow decorated class.

    Args:
        cls: A class with @workflow decorator

    Returns:
        Dict containing all workflow metadata
    """
    if not hasattr(cls, "_twiddle_workflow"):
        raise ValueError(f"Class {cls.__name__} is not decorated with @workflow")

    meta = cls._twiddle_workflow.copy()
    meta["class_name"] = cls.__name__
    meta["docstring"] = inspect.getdoc(cls)

    # Check for run method
    if hasattr(cls, "run"):
        run_method = getattr(cls, "run")
        meta["run_signature"] = str(inspect.signature(run_method))
        meta["run_docstring"] = inspect.getdoc(run_method)
        meta["run_is_async"] = inspect.iscoroutinefunction(run_method)

    return meta


def extract_all_metadata(
    activities: List[Callable], workflows: List[Type]
) -> Dict[str, Any]:
    """
    Extract metadata from all activities and workflows.

    Args:
        activities: List of activity functions
        workflows: List of workflow classes

    Returns:
        Dict with all extracted metadata
    """
    return {
        "activities": [extract_activity_metadata(a) for a in activities],
        "workflows": [extract_workflow_metadata(w) for w in workflows],
    }
