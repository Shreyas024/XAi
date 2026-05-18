"""
Demo-only vulnerable sample file for security scanner showcase.
Do not use this code in production.
"""

import hashlib
import os
import sqlite3
import subprocess
from flask import Flask, request

app = Flask(__name__)


def weak_hash_password(password: str) -> str:
    # Intentionally weak hashing for demo findings.
    return hashlib.md5(password.encode()).hexdigest()


@app.route("/run")
def run_command():
    # Intentionally unsafe command execution.
    user_cmd = request.args.get("cmd", "echo demo")
    return subprocess.check_output(user_cmd, shell=True, text=True)


@app.route("/user")
def get_user():
    # Intentionally unsafe SQL concatenation.
    user_id = request.args.get("id", "1")
    conn = sqlite3.connect("demo.db")
    cur = conn.cursor()
    query = "SELECT * FROM users WHERE id = " + user_id
    cur.execute(query)
    row = cur.fetchone()
    conn.close()
    return str(row)


@app.route("/debug-secret")
def debug_secret():
    # Intentionally unsafe hardcoded fallback secret.
    return os.getenv("JWT_SECRET", "super-secret-demo-key")


if __name__ == "__main__":
    app.run(debug=True)
