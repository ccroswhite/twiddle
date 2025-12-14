# Twiddle Utilities

This directory contains utility scripts for checking and maintaining the Twiddle system.

## Password Reset

`reset_password.py`: Resets a user's password in the PostgreSQL database.

### Setup

1. Create a virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

### Usage

```bash
# Interactive (Prompt for password)
python3 reset_password.py user@example.com

# Non-interactive
python3 reset_password.py user@example.com "NewPassword123!"
```

**Note**: Ensure your database is running and accessible (default localhost:5432).
