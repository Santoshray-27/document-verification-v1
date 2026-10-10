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
            minconn=1,
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

def _get_healthy_conn(max_retries=3):
    p = get_pool()
    for attempt in range(max_retries):
        try:
            conn = p.getconn()
            if conn.closed:
                p.putconn(conn, close=True)
                conn = p.getconn()
            # Fast ping probe
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
            return conn
        except (psycopg2.OperationalError, psycopg2.InterfaceError):
            try:
                p.putconn(conn, close=True)
            except Exception:
                pass
            if attempt == max_retries - 1:
                global _pool
                try:
                    if _pool and not _pool.closed:
                        _pool.closeall()
                except Exception:
                    pass
                _pool = None
                p = get_pool()
                return p.getconn()

def query_one(sql: str, params: tuple = ()):
    p = get_pool()
    conn = _get_healthy_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchone()
    finally:
        p.putconn(conn)

def query_all(sql: str, params: tuple = ()):
    p = get_pool()
    conn = _get_healthy_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()
    finally:
        p.putconn(conn)

def execute(sql: str, params: tuple = ()):
    p = get_pool()
    conn = _get_healthy_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            conn.commit()
            return cur.rowcount
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass
        raise
    finally:
        p.putconn(conn)

def execute_batch_values(sql: str, args_list: list[tuple]):
    if not args_list:
        return 0
    from psycopg2.extras import execute_values
    p = get_pool()
    conn = _get_healthy_conn()
    try:
        with conn.cursor() as cur:
            execute_values(cur, sql, args_list)
            conn.commit()
            return len(args_list)
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass
        raise
    finally:
        p.putconn(conn)

