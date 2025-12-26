# Twiddle SDK

CLI tools for building Temporal workflows with the Twiddle visual workflow editor.

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
```

Options:
- `--format, -f`: Output format (`text` or `json`)

### Convert

Convert Twiddle Python code to a Temporal application:

```bash
twiddle convert src/ -o temporal_output/
```

Options:
- `--output, -o`: Output directory for generated files
- `--name, -n`: Workflow name to use

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

6. Run the workflow:
   ```bash
   cd temporal_output
   pip install -r requirements.txt
   temporal server start-dev  # In another terminal
   python worker.py  # Terminal 1
   python starter.py  # Terminal 2
   ```

## Linting Rules

| Rule | Severity | Description |
|------|----------|-------------|
| TWD001 | Error | Activity must have @activity decorator |
| TWD002 | Error | Activity function must be async def |
| TWD003 | Warning | Activity should accept input_data parameter |
| TWD004 | Warning | Activity should have return type annotation |
| TWD005 | Error | Workflow class must have @workflow decorator |
| TWD006 | Error | Workflow must have run() method |
| TWD007 | Info | Parameter should use Parameter() class |

## License

Apache-2.0
