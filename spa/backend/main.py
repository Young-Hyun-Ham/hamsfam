
import os
import psycopg2.extras

from urllib.parse import urlparse
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ---- 모델 ----
class TodoIn(BaseModel):
  title: str

class Todo(BaseModel):
  id: int
  title: str
  done: bool
  created_at: str

# ---- 디비연결 ----
from dotenv import load_dotenv
load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
# 로컬
# DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:1234@localhost:5432/postgres?schema=chat")

# 환경변수 불러오기
DB_HOST = os.getenv("DB_HOST", "aws-0-ap-northeast-2.pooler.supabase.com")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_USER = os.getenv("DB_USER", "postgres.ickfhpxyrqjfasfwfhdb")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

# 비동기 PostgreSQL URL 구성
DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

app = FastAPI()
ALLOW_ORIGINS = os.getenv("ALLOW_ORIGINS", "")
origins = [origin.strip() for origin in ALLOW_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
  CORSMiddleware,
  allow_origins=origins or ["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

def db():
  result = urlparse(DATABASE_URL)
  conn = psycopg2.connect(
      dbname=result.path[1:],
      user=result.username,
      password=result.password,
      host=result.hostname,
      port=result.port,
      options='-c search_path=chat -c client_encoding=UTF8'
  )
  try:
    yield conn
  finally:
    conn.close()

# ---- 라우트 ----
@app.get("/health")
def health():
  return {"ok": True}

@app.get("/todos", response_model=List[Todo])
def list_todos(conn=Depends(db)):
  try:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
      cur.execute("SELECT id, title, done, to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at FROM spa_todos ORDER BY id DESC")
      rows = cur.fetchall()
      return rows
  except Exception as e:
    raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

@app.post("/todos", response_model=Todo)
def create_todo(payload: TodoIn, conn=Depends(db)):
  try:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
      cur.execute(
        "INSERT INTO spa_todos (title) VALUES (%s) RETURNING id, title, done, to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at",
        (payload.title,)
      )
      row = cur.fetchone()
      conn.commit()
      return row
  except Exception as e:
    raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

@app.patch("/todos/{todo_id}", response_model=Todo)
def toggle_done(
  todo_id: int, 
  done: Optional[bool] = None, 
  title: Optional[str] = None, 
  conn=Depends(db)
):
  if done is None and title is None:
    raise HTTPException(status_code=400, detail="No fields to update")
  sets = []
  params = []
  if done is not None:
    sets.append("done = %s")
    params.append(done)
  if title is not None:
    sets.append("title = %s")
    params.append(title)
  params.append(todo_id)

  try:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
      cur.execute(f"UPDATE spa_todos SET {', '.join(sets)} WHERE id = %s RETURNING id, title, done, to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at", params)
      row = cur.fetchone()
      if not row:
        raise HTTPException(status_code=404, detail="Not found")
      conn.commit()
      return row
  except Exception as e:
    raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

@app.delete("/todos/{todo_id}")
def delete_todo(todo_id: int, conn=Depends(db)):
  try:
    with conn.cursor() as cur:
      cur.execute("DELETE FROM spa_todos WHERE id = %s", (todo_id,))
      deleted = cur.rowcount
      conn.commit()
      if deleted == 0:
        raise HTTPException(status_code=404, detail="Not found")
      return {"ok": True}
  except Exception as e:
    raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
