"""
Twiddle DSL Parameter

Type hint wrapper for capturing UI metadata in activity parameters.
"""

from typing import Generic, TypeVar, Optional, List, Any

T = TypeVar("T")


class Parameter(Generic[T]):
    """
    Parameter definition with UI metadata for Twiddle.

    Used as default values in activity function signatures to capture
    metadata that the Twiddle UI uses for rendering parameter editors.

    Example:
        @activity(name="Send Email")
        async def send_email(
            recipient: Parameter[str] = Parameter(
                label="Recipient",
                description="Email address to send to",
                required=True,
                validation=r"^[\\w\\.-]+@[\\w\\.-]+\\.\\w+$"
            ),
            subject: Parameter[str] = Parameter(
                label="Subject",
                template=True  # Allow Jinja-style templating
            ),
            input_data=None
        ):
            ...

    Attributes:
        label: Display label in the UI
        description: Help text shown in the UI
        required: Whether this parameter must be provided
        default: Default value if not specified
        template: Allow Jinja-style templating in the value
        secret: Mask the value in the UI (for passwords, API keys)
        options: List of allowed values for dropdown selection
        validation: Regex pattern for value validation
    """

    def __init__(
        self,
        label: str,
        description: str = "",
        required: bool = False,
        default: Optional[T] = None,
        template: bool = False,
        secret: bool = False,
        options: Optional[List[Any]] = None,
        validation: Optional[str] = None,
    ):
        self.label = label
        self.description = description
        self.required = required
        self.default = default
        self.template = template
        self.secret = secret
        self.options = options
        self.validation = validation

    def __repr__(self) -> str:
        return (
            f"Parameter(label={self.label!r}, required={self.required}, "
            f"default={self.default!r})"
        )
