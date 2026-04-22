import sqlite3
db_path = "./qsl.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("DELETE FROM qsl_records WHERE callsign = ?", ("BG1ABC",))
conn.commit()
print(f"Deleted {cursor.rowcount} row(s)")
conn.close()
