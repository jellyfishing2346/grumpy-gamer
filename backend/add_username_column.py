import sqlite3

# Path to your SQLite database file
DB_PATH = "users.db"

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE users ADD COLUMN username TEXT;")
    print("username column added successfully.")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("username column already exists.")
    else:
        print(f"Error: {e}")

conn.commit()
conn.close()
