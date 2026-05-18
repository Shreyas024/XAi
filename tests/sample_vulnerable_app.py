"""
Sample vulnerable application for testing XAI-SecOps.

⚠️  THIS FILE IS INTENTIONALLY VULNERABLE — DO NOT USE IN PRODUCTION! ⚠️
It contains common security anti-patterns that Semgrep + CodeLlama should detect.
"""

import os
import pickle
import hashlib
import sqlite3
import subprocess


# ─── 1. SQL Injection ───────────────────────────────────
def get_user(username):
    """Vulnerable: SQL injection via string formatting."""
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    query = f"SELECT * FROM users WHERE username = '{username}'"
    cursor.execute(query)
    return cursor.fetchone()


# ─── 2. Hardcoded Credentials ──────────────────────────
password = "super_secret_password_123"
api_key = "sk-1234567890abcdef"
database_token = "mongodb+srv://admin:password123@cluster.mongodb.net"


# ─── 3. Command Injection ──────────────────────────────
def ping_host(hostname):
    """Vulnerable: OS command injection via shell=True."""
    result = subprocess.run(f"ping -c 1 {hostname}", shell=True, capture_output=True)
    return result.stdout


def list_files(directory):
    """Vulnerable: OS command injection via os.system."""
    os.system(f"ls -la {directory}")


# ─── 4. Insecure Deserialization ────────────────────────
def load_user_data(filepath):
    """Vulnerable: Arbitrary code execution via pickle."""
    with open(filepath, "rb") as f:
        data = pickle.load(f)
    return data


# ─── 5. Weak Cryptography ──────────────────────────────
def hash_password(password):
    """Vulnerable: MD5 is cryptographically broken for passwords."""
    return hashlib.md5(password.encode()).hexdigest()


def verify_integrity(data):
    """Vulnerable: SHA1 is deprecated for security purposes."""
    return hashlib.sha1(data.encode()).hexdigest()


# ─── 6. Path Traversal ─────────────────────────────────
def read_file(filename):
    """Vulnerable: No path validation, allows ../../etc/passwd."""
    with open(f"/uploads/{filename}", "r") as f:
        return f.read()


# ─── 7. Eval Injection ─────────────────────────────────
def calculate(expression):
    """Vulnerable: eval() with user input."""
    return eval(expression)
