#!/usr/bin/env python3
"""
Password Reset Script for Twiddle
Usage: python3 reset_password.py <email> <new_password>
"""

import sys
import os
import hashlib
import binascii
import argparse

# Try to import psycopg2
try:
    import psycopg2
except ImportError:
    print("Error: psycopg2 module not found.")
    print("Please install it using: pip install psycopg2-binary")
    sys.exit(1)

# Database Configuration
# Default to values from docker-compose.yml
DB_HOST = os.environ.get('POSTGRES_HOST', 'localhost')
DB_PORT = os.environ.get('POSTGRES_PORT', '5432')
DB_NAME = os.environ.get('POSTGRES_DB', 'twiddle')
DB_USER = os.environ.get('POSTGRES_USER', 'twiddle')
DB_PASS = os.environ.get('POSTGRES_PASSWORD', 'twiddle')

# Scrypt Configuration (Must match packages/api/src/lib/password.ts)
KEY_LENGTH = 64
SALT_LENGTH = 32  # Bytes
SCRYPT_N = 16384
SCRYPT_R = 8
SCRYPT_P = 1

def hash_password(password: str) -> str:
    """
    Hash a password using scrypt to match Node.js crypto.scrypt default behavior.
    Node structure: salt_hex:hash_hex
    """
    # 1. Generate random salt (32 bytes)
    # in Node: randomBytes(32).toString('hex') results in a 64-char string
    # Node's scrypt takes this string as the salt buffer.
    salt_bytes = os.urandom(SALT_LENGTH)
    salt_hex = binascii.hexlify(salt_bytes).decode('ascii')
    
    # 2. Hash using scrypt
    # Important: In the Node code, the salt passed to scrypt is the HEX STRING.
    # So we must convert the hex string to bytes to pass as salt to Python's scrypt.
    password_bytes = password.encode('utf-8')
    salt_input_bytes = salt_hex.encode('utf-8')
    
    derived_key = hashlib.scrypt(
        password_bytes,
        salt=salt_input_bytes,
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
        dklen=KEY_LENGTH
    )
    
    derived_key_hex = binascii.hexlify(derived_key).decode('ascii')
    
    return f"{salt_hex}:{derived_key_hex}"

def reset_password(email: str, new_password: str):
    conn = None
    try:
        print(f"Connecting to database {DB_NAME} at {DB_HOST}:{DB_PORT}...")
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS
        )
        cur = conn.cursor()
        
        # Check if user exists
        cur.execute("SELECT id FROM \"User\" WHERE email = %s", (email,))
        user = cur.fetchone()
        
        if not user:
            print(f"Error: User with email '{email}' not found.")
            sys.exit(1)
            
        user_id = user[0]
        print(f"User found (ID: {user_id}). Generating hash...")
        
        password_hash = hash_password(new_password.rstrip())
        
        print("Updating password...")
        cur.execute(
            "UPDATE \"User\" SET password = %s WHERE id = %s",
            (password_hash, user_id)
        )
        
        conn.commit()
        print(f"Successfully updated password for {email}")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    import getpass
    
    parser = argparse.ArgumentParser(description='Reset user password')
    parser.add_argument('email', help='User email address')
    parser.add_argument('password', nargs='?', help='New password (optional, will prompt if omitted)')
    
    args = parser.parse_args()
    
    password = args.password
    if not password:
        password = getpass.getpass(f"Enter new password for {args.email}: ")
        
    if not password:
        print("Error: Password cannot be empty.")
        sys.exit(1)
    
    reset_password(args.email, password)
