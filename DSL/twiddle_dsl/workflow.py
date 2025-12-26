"""
Twiddle DSL Workflow Decorator

Decorator for defining Twiddle workflows with metadata.
"""

from typing import Optional, Type


def workflow(
    name: str,
    description: str = "",
    version: str = "1.0.0",
    task_queue: Optional[str] = None,
) -> Type:
    """
    Decorator to define a Twiddle workflow.

    This decorator marks a class as a Twiddle workflow and captures
    metadata used by the Twiddle UI and code generator.

    Args:
        name: Display name for the workflow
        description: Help text describing what the workflow does
        version: Semantic version for the workflow definition
        task_queue: Temporal task queue name (defaults to snake_case of name)

    Example:
        @workflow(
            name="Customer Onboarding",
            description="Onboards new customers with welcome emails and setup",
            version="1.2.0"
        )
        class CustomerOnboarding:
            async def run(self, input_data: dict) -> dict:
                # Orchestrate activities...
                result = await self.send_welcome_email(input_data)
                result = await self.setup_account(result)
                return result

    Notes:
        - Workflow classes must have a `run` method
        - The `run` method should be async
        - The `run` method should accept input_data and return a dict
    """

    def decorator(cls: Type) -> Type:
        # Generate task queue from name if not provided
        queue = task_queue or name.lower().replace(" ", "_").replace("-", "_")

        # Store metadata on the class for introspection
        cls._twiddle_workflow = {
            "name": name,
            "description": description,
            "version": version,
            "task_queue": queue,
            "class_name": cls.__name__,
        }

        return cls

    return decorator
