import os
import psycopg2
from psycopg2 import pool

DB_HOST = os.getenv("DB_HOST", "aws-0-ap-northeast-2.pooler.supabase.com")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_USER = os.getenv("DB_USER", "postgres.ickfhpxyrqjfasfwfhdb")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

connection_pool: pool.SimpleConnectionPool | None = None

def init_pool():
    global connection_pool
    if connection_pool is None:
        connection_pool = psycopg2.pool.SimpleConnectionPool(
            minconn=1,
            maxconn=5,
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
        )

def get_conn():
    if connection_pool is None:
        init_pool()
    assert connection_pool is not None
    return connection_pool.getconn()

def put_conn(conn):
    assert connection_pool is not None
    connection_pool.putconn(conn)

def close_pool():
    if connection_pool is not None:
        connection_pool.closeall()
