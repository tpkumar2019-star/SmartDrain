import os
from pathlib import Path

from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, db

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")


class LocalMemoryStore:
    def __init__(self):
        self._data = {}

    def child(self, *path_parts):
        return LocalMemoryNode(self, list(path_parts))


class LocalMemoryNode:
    def __init__(self, root, path):
        self.root = root
        self.path = list(path)

    def child(self, *path_parts):
        return LocalMemoryNode(self.root, self.path + list(path_parts))

    def get(self):
        cursor = self.root._data
        for segment in self.path:
            if not isinstance(cursor, dict):
                return None
            if segment not in cursor:
                return None
            cursor = cursor[segment]
        return cursor

    def set(self, value):
        cursor = self.root._data
        for segment in self.path[:-1]:
            if segment not in cursor or not isinstance(cursor[segment], dict):
                cursor[segment] = {}
            cursor = cursor[segment]
        cursor[self.path[-1]] = value
        return value


class FirebaseConfig:
    def __init__(self):
        self.project_id = os.getenv("FIREBASE_PROJECT_ID")
        self.database_url = os.getenv("FIREBASE_DATABASE_URL")
        self.service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
        self._local_db = LocalMemoryStore()
        self._real_db = None

        if not self.database_url or not self.service_account_path:
            self._real_db = self._local_db
            return

        service_account_file = (BASE_DIR / self.service_account_path).resolve()
        if not service_account_file.exists():
            self._real_db = self._local_db
            return

        try:
            self.cred = credentials.Certificate(str(service_account_file))
            firebase_admin.initialize_app(
                self.cred,
                {"databaseURL": self.database_url},
            )
            self._real_db = db.reference()
            self._real_db.get()
        except Exception:
            self._real_db = self._local_db

    @property
    def db(self):
        return self._real_db


firebase_config = FirebaseConfig()
firebase_db = firebase_config.db
