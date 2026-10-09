import os
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres.faaohvkfusexrfeoltwy:Evidentia%4012345*@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require"
)

# Global Threaded Connection Pool for lightning-fast queries (reusing SSL handshake)
_pool = None

def get_pool():
    global _pool
    if _pool is None or _pool.closed:
        _pool = pool.ThreadedConnectionPool(
            minconn=2,
            maxconn=20,
            dsn=DATABASE_URL,
            cursor_factory=RealDictCursor
        )
    return _pool

def get_db():
    p = get_pool()
    conn = p.getconn()
    try:
        yield conn
    finally:
        p.putconn(conn)

def query_one(sql: str, params: tuple = ()):
    p = get_pool()
    conn = p.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchone()
    finally:
        p.putconn(conn)

def query_all(sql: str, params: tuple = ()):
    p = get_pool()
    conn = p.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()
    finally:
        p.putconn(conn)

def execute(sql: str, params: tuple = ()):
    p = get_pool()
    conn = p.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            conn.commit()
            return cur.rowcount
    finally:
        p.putconn(conn)

def execute_batch_values(sql: str, args_list: list[tuple]):
    if not args_list:
        return 0
    from psycopg2.extras import execute_values
    p = get_pool()
    conn = p.getconn()
    try:
        with conn.cursor() as cur:
            execute_values(cur, sql, args_list)
            conn.commit()
            return len(args_list)
    finally:
        p.putconn(conn)
