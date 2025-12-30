"""
Twiddle DSL Types

Core dataclasses for workflow and activity inputs.
These match the patterns used in python-export.ts for compatibility.
"""

from dataclasses import dataclass
from typing import Any, Dict


@dataclass
class ActivityInput:
    """
    Standard input for all Twiddle activities.

    Attributes:
        node_id: Unique identifier for this node in the workflow
        node_name: Human-readable name for the activity
        node_type: Type of the node (e.g., 'twiddle.httpRequest')
        parameters: Node-specific configuration parameters
        input_data: Data passed from the previous activity
    """

    node_id: str
    node_name: str
    node_type: str
    parameters: Dict[str, Any]
    input_data: Dict[str, Any]


@dataclass
class WorkflowInput:
    """
    Standard input for Twiddle workflows.

    Attributes:
        workflow_id: Unique identifier for this workflow execution
        workflow_name: Human-readable name for the workflow
        input_data: Initial data passed to the workflow
    """

    workflow_id: str
    workflow_name: str
    input_data: Dict[str, Any]
