#!/usr/bin/env python3
"""
ZKTeco Platform - Database Backup & Google Drive Cloud Manager
Provides automated database dump using pg_dump, gzip compression,
Google Drive v3 API upload supporting BOTH Service Accounts (Shared Drives)
and Google OAuth2 (Personal @gmail.com accounts), and retention management.
"""

import sys
import os
import json
import gzip
import shutil
import argparse
import subprocess
import requests
from datetime import datetime, timedelta

# Google Drive API libraries
try:
    from google.oauth2 import service_account
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    GDRIVE_AVAILABLE = True
except ImportError:
    GDRIVE_AVAILABLE = False


PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIN_DIR = os.path.join(PROJECT_ROOT, "bin")
BACKUP_DIR = os.path.join(PROJECT_ROOT, "backups")


def get_pg_dump_bin():
    local_bin = os.path.join(BIN_DIR, "pg_dump")
    if os.path.exists(local_bin) and os.access(local_bin, os.X_OK):
        return local_bin
    system_bin = shutil.which("pg_dump")
    if system_bin:
        return system_bin
    raise FileNotFoundError("pg_dump utility not found in bin/ or system PATH")


def create_db_dump(host="localhost", port=5433, user="postgres", password="postgres", dbname="zkteco_attendance", custom_filename=None):
    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = custom_filename or f"zkteco_attendance_backup_{timestamp}.sql.gz"
    filepath = os.path.join(BACKUP_DIR, filename)

    pg_dump_bin = get_pg_dump_bin()
    env = os.environ.copy()
    env["PGPASSWORD"] = str(password)
    env["LD_LIBRARY_PATH"] = f"{BIN_DIR}:{env.get('LD_LIBRARY_PATH', '')}"

    cmd = [
        pg_dump_bin,
        "-h", str(host),
        "-p", str(port),
        "-U", str(user),
        "-d", str(dbname),
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges"
    ]

    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env)
        with gzip.open(filepath, "wb") as gz_out:
            shutil.copyfileobj(proc.stdout, gz_out)
        
        proc.wait()
        stderr_output = proc.stderr.read().decode("utf-8", errors="replace")

        if proc.returncode != 0:
            if os.path.exists(filepath):
                os.remove(filepath)
            raise RuntimeError(f"pg_dump exited with code {proc.returncode}: {stderr_output}")

        file_size = os.path.getsize(filepath)
        return {
            "success": True,
            "filename": filename,
            "filepath": filepath,
            "size": file_size,
            "timestamp": timestamp
        }
    except Exception as e:
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception:
                pass
        raise e


def get_drive_service(credentials_data, auth_type="SERVICE_ACCOUNT"):
    if not GDRIVE_AVAILABLE:
        raise RuntimeError("Google API client libraries are not installed")

    if isinstance(credentials_data, str):
        data = json.loads(credentials_data)
    else:
        data = credentials_data

    scopes = ["https://www.googleapis.com/auth/drive"]

    # Check if OAuth2
    if auth_type == "OAUTH2" or data.get("type") == "oauth2" or "refresh_token" in data:
        creds = Credentials(
            token=None,
            refresh_token=data["refresh_token"],
            client_id=data["client_id"],
            client_secret=data["client_secret"],
            token_uri="https://oauth2.googleapis.com/token",
            scopes=scopes
        )
        service = build("drive", "v3", credentials=creds, cache_discovery=False)
        user_email = data.get("user_email")
        if not user_email:
            try:
                about = service.about().get(fields="user(emailAddress)").execute()
                user_email = about.get("user", {}).get("emailAddress", "Personal Google Account")
            except Exception:
                user_email = "Personal Google Account"
        return service, user_email

    else:
        client_email = data.get("client_email")
        if not client_email:
            raise ValueError("Invalid service account JSON: missing client_email")
        creds = service_account.Credentials.from_service_account_info(data, scopes=scopes)
        service = build("drive", "v3", credentials=creds, cache_discovery=False)
        return service, client_email


def exchange_oauth_code(client_id, client_secret, code, redirect_uri):
    token_url = "https://oauth2.googleapis.com/token"
    payload = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code"
    }
    resp = requests.post(token_url, data=payload)
    data = resp.json()
    if "error" in data:
        return {
            "success": False,
            "error": f"{data.get('error')}: {data.get('error_description', '')}"
        }

    refresh_token = data.get("refresh_token")
    if not refresh_token:
        return {
            "success": False,
            "error": "Google did not return a refresh_token. Make sure you set access_type=offline and prompt=consent."
        }

    access_token = data.get("access_token")
    user_email = "Personal Google Account"
    try:
        uinfo = requests.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        ).json()
        if "email" in uinfo:
            user_email = uinfo["email"]
    except Exception:
        pass

    return {
        "success": True,
        "refresh_token": refresh_token,
        "user_email": user_email,
        "client_id": client_id
    }


def test_google_drive(credentials_data, folder_id=None, auth_type="SERVICE_ACCOUNT"):
    try:
        service, email = get_drive_service(credentials_data, auth_type)

        folder_name = "Root / My Drive"
        if folder_id:
            try:
                folder = service.files().get(
                    fileId=folder_id,
                    fields="id, name, mimeType, capabilities",
                    supportsAllDrives=True
                ).execute()
                folder_name = folder.get("name", folder_id)
                can_add = folder.get("capabilities", {}).get("canAddChildren", True)
                if not can_add:
                    return {
                        "success": False,
                        "client_email": email,
                        "error": f"Account lacks write/editor permission to folder '{folder_name}'"
                    }
            except Exception as fe:
                return {
                    "success": False,
                    "client_email": email,
                    "error": f"Cannot access folder '{folder_id}': {str(fe)}"
                }

        return {
            "success": True,
            "client_email": email,
            "folder_name": folder_name,
            "message": f"Successfully connected to Google Drive ({email}). Target folder: {folder_name}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def upload_to_google_drive(filepath, credentials_data, folder_id=None, auth_type="SERVICE_ACCOUNT"):
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"File not found: {filepath}")

    service, _ = get_drive_service(credentials_data, auth_type)

    filename = os.path.basename(filepath)
    file_metadata = {
        "name": filename,
    }
    if folder_id:
        file_metadata["parents"] = [folder_id]

    media = MediaFileUpload(filepath, mimetype="application/gzip", resumable=True)

    file_obj = service.files().create(
        body=file_metadata,
        media_body=media,
        fields="id, name, webViewLink, webContentLink",
        supportsAllDrives=True
    ).execute()

    return {
        "success": True,
        "file_id": file_obj.get("id"),
        "name": file_obj.get("name"),
        "web_view_link": file_obj.get("webViewLink", f"https://drive.google.com/file/d/{file_obj.get('id')}/view"),
        "web_content_link": file_obj.get("webContentLink")
    }


def prune_local_backups(retention_days=30):
    if not os.path.exists(BACKUP_DIR):
        return []

    cutoff = datetime.now() - timedelta(days=retention_days)
    deleted = []

    for item in os.listdir(BACKUP_DIR):
        if item.startswith("zkteco_attendance_") and (item.endswith(".sql.gz") or item.endswith(".sql")):
            item_path = os.path.join(BACKUP_DIR, item)
            mtime = datetime.fromtimestamp(os.path.getmtime(item_path))
            if mtime < cutoff:
                try:
                    os.remove(item_path)
                    deleted.append(item)
                except Exception as e:
                    print(f"Error removing {item_path}: {e}", file=sys.stderr)
    return deleted


def main():
    parser = argparse.ArgumentParser(description="ZKTeco Database Backup & Google Drive Cloud Manager")
    subparsers = parser.add_subparsers(dest="action", help="Action to execute")

    # Action: dump
    dump_p = subparsers.add_parser("dump", help="Dump PostgreSQL database")
    dump_p.add_argument("--host", default=os.getenv("DB_HOST", "localhost"))
    dump_p.add_argument("--port", type=int, default=int(os.getenv("DB_PORT", "5433")))
    dump_p.add_argument("--user", default=os.getenv("DB_USER", "postgres"))
    dump_p.add_argument("--password", default=os.getenv("DB_PASSWORD", "postgres"))
    dump_p.add_argument("--dbname", default=os.getenv("DB_NAME", "zkteco_attendance"))
    dump_p.add_argument("--filename", default=None)

    # Action: oauth-exchange
    oauth_p = subparsers.add_parser("oauth-exchange", help="Exchange Google OAuth authorization code")
    oauth_p.add_argument("--client-id", required=True)
    oauth_p.add_argument("--client-secret", required=True)
    oauth_p.add_argument("--code", required=True)
    oauth_p.add_argument("--redirect-uri", required=True)

    # Action: test-gdrive
    test_p = subparsers.add_parser("test-gdrive", help="Test Google Drive credentials")
    test_p.add_argument("--credentials-json", required=True, help="Path or raw JSON string")
    test_p.add_argument("--folder-id", default=None)
    test_p.add_argument("--auth-type", default="SERVICE_ACCOUNT")

    # Action: upload
    upload_p = subparsers.add_parser("upload", help="Upload a file to Google Drive")
    upload_p.add_argument("--filepath", required=True)
    upload_p.add_argument("--credentials-json", required=True)
    upload_p.add_argument("--folder-id", default=None)
    upload_p.add_argument("--auth-type", default="SERVICE_ACCOUNT")

    # Action: prune
    prune_p = subparsers.add_parser("prune", help="Prune old backups")
    prune_p.add_argument("--days", type=int, default=30)

    args = parser.parse_args()

    if args.action == "dump":
        try:
            res = create_db_dump(args.host, args.port, args.user, args.password, args.dbname, args.filename)
            print(json.dumps(res))
            sys.exit(0)
        except Exception as e:
            print(json.dumps({"success": False, "error": str(e)}))
            sys.exit(1)

    elif args.action == "oauth-exchange":
        res = exchange_oauth_code(args.client_id, args.client_secret, args.code, args.redirect_uri)
        print(json.dumps(res))
        sys.exit(0 if res.get("success") else 1)

    elif args.action == "test-gdrive":
        cred_str = args.credentials_json
        if os.path.exists(cred_str):
            with open(cred_str, "r") as f:
                cred_str = f.read()
        res = test_google_drive(cred_str, args.folder_id, args.auth_type)
        print(json.dumps(res))
        sys.exit(0 if res.get("success") else 1)

    elif args.action == "upload":
        cred_str = args.credentials_json
        if os.path.exists(cred_str):
            with open(cred_str, "r") as f:
                cred_str = f.read()
        try:
            res = upload_to_google_drive(args.filepath, cred_str, args.folder_id, args.auth_type)
            print(json.dumps(res))
            sys.exit(0)
        except Exception as e:
            print(json.dumps({"success": False, "error": str(e)}))
            sys.exit(1)

    elif args.action == "prune":
        del_list = prune_local_backups(args.days)
        print(json.dumps({"success": True, "deleted_files": del_list}))
        sys.exit(0)

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
