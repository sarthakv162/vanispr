"""
AadyaLang SPR Database Module
Implements SQLite with WAL mode, foreign keys, and full relational schema
for Self-Paced Reading experiments according to Gibson & Warren (2004) standards.
"""
import sqlite3
import os
import json
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "aadyalang_spr.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    conn.row_factory = sqlite3.Row
    return conn

@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS hosts (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS experiments (
            id TEXT PRIMARY KEY,
            host_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            language TEXT NOT NULL DEFAULT 'hi', -- 'hi' (Hindi) or 'en' (English)
            status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'live', 'closed'
            template_type TEXT DEFAULT 'custom',
            version INTEGER NOT NULL DEFAULT 1,
            design_json TEXT, -- factors, levels, balancing rules
            instructions_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (host_id) REFERENCES hosts(id) ON DELETE CASCADE
        );
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS factors (
            id TEXT PRIMARY KEY,
            experiment_id TEXT NOT NULL,
            name TEXT NOT NULL,
            levels_json TEXT NOT NULL, -- JSON array of level strings e.g. ["+extract", "-extract"]
            FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
        );
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS items (
            id TEXT PRIMARY KEY,
            experiment_id TEXT NOT NULL,
            item_number INTEGER NOT NULL,
            type TEXT NOT NULL, -- 'experimental', 'filler', 'practice'
            question TEXT,
            correct_answer TEXT, -- 'yes'/'no' or 'haan'/'nahin'
            explanation TEXT,
            FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
        );
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS item_versions (
            id TEXT PRIMARY KEY,
            item_id TEXT NOT NULL,
            condition_label TEXT NOT NULL, -- e.g. '+extract_VP'
            sentence_text TEXT NOT NULL,
            regions_json TEXT NOT NULL, -- JSON array of region objects: [{index, text, words: [...]}]
            word_count INTEGER NOT NULL,
            grapheme_count INTEGER NOT NULL,
            FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
        );
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS lists (
            id TEXT PRIMARY KEY,
            experiment_id TEXT NOT NULL,
            list_number INTEGER NOT NULL,
            FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
        );
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS list_items (
            id TEXT PRIMARY KEY,
            list_id TEXT NOT NULL,
            item_version_id TEXT NOT NULL,
            order_hint INTEGER,
            FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
            FOREIGN KEY (item_version_id) REFERENCES item_versions(id) ON DELETE CASCADE
        );
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS participants (
            id TEXT PRIMARY KEY,
            experiment_id TEXT NOT NULL,
            list_id TEXT NOT NULL,
            external_id TEXT, -- e.g. Prolific PID
            consent_at TIMESTAMP,
            user_agent TEXT,
            screen_w INTEGER,
            screen_h INTEGER,
            refresh_rate_est REAL,
            jitter_ms REAL,
            background_json TEXT, -- demographics, native language, Hindi proficiency
            status TEXT NOT NULL DEFAULT 'started', -- 'started', 'completed', 'abandoned'
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE,
            FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
        );
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS trials (
            id TEXT PRIMARY KEY,
            participant_id TEXT NOT NULL,
            item_version_id TEXT NOT NULL,
            presentation_order INTEGER NOT NULL,
            started_at REAL,
            completed_at REAL,
            question_response TEXT,
            correct INTEGER, -- 1 for correct, 0 for wrong, NULL if no question
            question_rt_ms REAL,
            focus_lost_count INTEGER DEFAULT 0,
            FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
            FOREIGN KEY (item_version_id) REFERENCES item_versions(id) ON DELETE CASCADE
        );
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS word_events (
            id TEXT PRIMARY KEY,
            trial_id TEXT NOT NULL,
            word_index INTEGER NOT NULL,
            region_index INTEGER NOT NULL,
            word_text TEXT NOT NULL,
            rt_ms REAL NOT NULL,
            t_shown REAL NOT NULL,
            t_pressed REAL NOT NULL,
            grapheme_count INTEGER NOT NULL,
            is_repeat INTEGER DEFAULT 0,
            is_outlier INTEGER DEFAULT 0,
            FOREIGN KEY (trial_id) REFERENCES trials(id) ON DELETE CASCADE
        );
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS quality_flags (
            id TEXT PRIMARY KEY,
            participant_id TEXT NOT NULL,
            trial_id TEXT,
            flag TEXT NOT NULL,
            detail TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
        );
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS norming_ratings (
            id TEXT PRIMARY KEY,
            experiment_id TEXT NOT NULL,
            item_version_id TEXT NOT NULL,
            rater_id TEXT NOT NULL,
            rating INTEGER NOT NULL, -- 1 to 7 plausibility scale
            feedback TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE,
            FOREIGN KEY (item_version_id) REFERENCES item_versions(id) ON DELETE CASCADE
        );
        """)
