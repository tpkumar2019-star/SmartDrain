import os
from pathlib import Path

from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, db

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")


class FirebaseConfig:
    def __init__(self):
        self.project_id = os.getenv("FIREBASE_PROJECT_ID")
        self.database_url = os.getenv("FIREBASE_DATABASE_URL")
        self.service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
        self._real_db = None

        if not self.database_url or not self.service_account_path:
            error_msg = "FIREBASE_DATABASE_URL or FIREBASE_SERVICE_ACCOUNT_PATH missing in environment variables."
            print(f"❌ Firebase connection failed: {error_msg}")
            raise Exception(error_msg)

        service_account_file = (BASE_DIR / self.service_account_path).resolve()
        if not service_account_file.exists():
            error_msg = f"Service account file not found at {service_account_file}"
            print(f"❌ Firebase connection failed: {error_msg}")
            raise Exception(error_msg)

        try:
            self.cred = credentials.Certificate(str(service_account_file))
            firebase_admin.initialize_app(
                self.cred,
                {"databaseURL": self.database_url},
            )
            self._real_db = db.reference()
            # Perform a test read to verify communication with the Realtime Database
            self._real_db.get(shallow=True)
            print("✅ Firebase Realtime Database connected")
        except Exception as e:
            print(f"❌ Firebase connection failed: {e}")
            raise

    @property
    def db(self):
        return self._real_db


firebase_config = FirebaseConfig()
firebase_db = firebase_config.db
