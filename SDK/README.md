# Twiddle SDK

CLI tools for building Temporal and Airflow workflows with the Twiddle visual workflow editor.

## Installation

```bash
pip install twiddle-sdk
```

This will also install `twiddle-dsl` as a dependency.

## Commands

### Version

Display SDK and DSL versions:

```bash
twiddle version
```

### Init

Create a new Twiddle project:

```bash
twiddle init myproject
```

Options:
- `--template, -t`: Project template (`basic` or `full`)
- `--output, -o`: Output directory

### Lint

Lint Twiddle Python code for DSL conformity:

```bash
twiddle lint src/
twiddle lint src/ --target temporal   # Default
twiddle lint src/ --target airflow    # Airflow-specific rules
```

Options:
- `--format, -f`: Output format (`text` or `json`)
- `--target, -T`: Target platform (`temporal` or `airflow`)

### Convert

Convert Twiddle Python code to a target application:

```bash
# Convert to Temporal (default)
twiddle convert src/ -o temporal_output/

# Convert to Airflow DAG
twiddle convert src/ -o airflow_output/ --target airflow
```

Options:
- `--output, -o`: Output directory for generated files
- `--name, -n`: Workflow name to use
- `--target, -T`: Target platform (`temporal` or `airflow`)

## Workflow Example

1. Create a new project:
   ```bash
   twiddle init myworkflow
   cd myworkflow
   ```

2. Install dependencies:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -e ".[dev]"
   ```

3. Edit activities in `src/activities/`

4. Lint your code:
   ```bash
   twiddle lint src/
   ```

5. Convert to Temporal:
   ```bash
   twiddle convert src/ -o temporal_output/
   ```

6. Convert to Airflow:
   ```bash
   twiddle convert src/ -o airflow_output/ --target airflow
   ```

## Linting Rules

### Common Rules

| Rule | Severity | Description |
|------|----------|-------------|
| TWD001 | Error | Activity must have @activity decorator |
| TWD003 | Warning | Activity should accept input_data parameter |
| TWD004 | Warning | Activity should have return type annotation |
| TWD005 | Error | Workflow class must have @workflow decorator |
| TWD006 | Error | Workflow must have run() method |
| TWD007 | Info | Parameter should use Parameter() class |

### Temporal-specific Rules

| Rule | Severity | Description |
|------|----------|-------------|
| TWD002 | Error | Activity function must be async def |

### Airflow-specific Rules

| Rule | Severity | Description |
|------|----------|-------------|
| TWD010 | Warning | Airflow tasks typically use sync functions |
| TWD011 | Info | Airflow tasks should accept **kwargs for context |

## License

Apache-2.0

