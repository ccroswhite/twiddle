# Twiddle DSL

Decorators and types for building Temporal workflows with the Twiddle visual workflow editor.

## Installation

```bash
pip install twiddle-dsl
```

For Temporal runtime support:

```bash
pip install twiddle-dsl[temporal]
```

## Quick Start

### Defining Activities

```python
from twiddle_dsl import activity, Parameter

@activity(
    name="Send Email",
    description="Sends an email to a recipient",
    category="Communications",
    icon="email"
)
async def send_email(
    recipient: Parameter[str] = Parameter(
        label="Recipient",
        description="Email address",
        required=True
    ),
    subject: Parameter[str] = Parameter(
        label="Subject",
        template=True  # Allow Jinja templating
    ),
    body: Parameter[str] = Parameter(
        label="Body",
        template=True
    ),
    input_data=None
):
    # Your implementation here
    return {**(input_data or {}), "email_sent": True}
```

### Defining Workflows

```python
from twiddle_dsl import workflow

@workflow(
    name="Customer Onboarding",
    description="Onboards new customers",
    version="1.0.0"
)
class CustomerOnboarding:
    async def run(self, input_data: dict) -> dict:
        # Orchestrate your activities here
        return {"status": "completed"}
```

## Features

- **`@activity`** - Decorator for defining activities with metadata
- **`@workflow`** - Decorator for defining workflows with metadata
- **`Parameter`** - Type hint wrapper for capturing UI metadata
- **`ActivityInput`** - Standard input dataclass for activities
- **`ExecutionLogger`** - Structured logging for waterfall visualization

## Compatibility

The DSL is designed to work with:
- Twiddle visual workflow editor
- Temporal Python SDK
- Twiddle SDK CLI tools (`twiddle lint`, `twiddle convert`)

## License

Apache-2.0
