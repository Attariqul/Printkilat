# PrintKilat — Python Flask 3.0.3 (VS Code & Cloud Hosting Ready)

Sistem antrean cetak dan kirim berkas fotokopi kampus berbasis web (**Mobile-First**, tema **Oranye Energetik** `#F97316`).

## Teknologi yang Digunakan

1. **Bahasa & Runtime**: Python 3.10+ / 3.12+
2. **Backend & Web Framework**: Flask 3.0.3, Werkzeug 3.1.9 (`pbkdf2:sha256`, `secure_filename`), Jinja2 (`|rupiah`, `|filesize`)
3. **Database & ORM**: Flask-SQLAlchemy 3.1.1 / SQLAlchemy 2.0+, PyMySQL 1.1.1 (MySQL 8.0 InnoDB `utf8mb4`), SQLite 3 (dev & in-memory test), Flask-Migrate 4.0.7 / Alembic
4. **Keamanan**: Flask-Login 0.6.3, Flask-WTF 1.2.1 (CSRFProtect), `cryptography` 43.0.1, `secrets` & `uuid`
5. **Frontend**: HTML5 Semantic, CSS3 Custom Variables (`app/static/css/style.css`), Bootstrap 5.3.3 (CDN), Bootstrap Icons 1.11.3 (CDN), Google Fonts (`Plus Jakarta Sans`), Vanilla JS ES6 (`app/static/js/app.js`)
6. **Pengujian & Konfigurasi**: `pytest` 8.3.3, `python-dotenv` 1.0.1
7. **Pola Arsitektur**: Application Factory (`create_app` di `app/__init__.py`) + Modular Blueprints (`auth`, `customer`, `operator`)

## Struktur Proyek

```text
printkilat/
├── .vscode/                  # Konfigurasi debug F5, pytest & Jinja2 di VS Code
├── api/
│   └── index.py              # Entry point WSGI untuk Vercel Serverless
├── app/
│   ├── __init__.py           # Application Factory (create_app)
│   ├── extensions.py         # SQLAlchemy, Migrate, LoginManager, CSRFProtect
│   ├── models.py             # 7 model relasional + CHECK constraints
│   ├── seed.py               # Seed operator demo, tarif & pesanan contoh
│   ├── utils.py              # secrets, uuid, pricing, Fernet, pypdf, retensi 7 hari
│   ├── blueprints/
│   │   ├── auth.py           # Login/logout operator (Flask-Login)
│   │   ├── customer.py       # Guest-first order, katalog tarif, pelacakan
│   │   └── operator.py       # Antrean, verifikasi bayar, status, kelola tarif
│   ├── static/
│   │   ├── css/style.css     # CSS3 Custom Variables Oranye Energetik
│   │   └── js/app.js         # Kalkulator tarif & stepper Vanilla JS ES6
│   └── templates/            # Jinja2 HTML5 + Bootstrap 5.3.3 templates
├── tests/
│   └── test_printkilat.py    # Unit & integration test (pytest)
├── config.py                 # Konfigurasi Dev, Production (MySQL 8.0) & Testing
├── run.py                    # Entry point lokal Flask
├── requirements.txt          # Dependensi Python terpin
├── vercel.json               # Konfigurasi deploy Vercel Python WSGI
└── netlify.toml              # Konfigurasi build Netlify
```

## Menjalankan di VS Code (Lokal)

1. Buka folder proyek di **VS Code**.
2. Buat virtual environment & pasang dependensi:

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

3. Salin `.env.example` menjadi `.env`, lalu jalankan Flask (atau tekan `F5`):

```bash
python run.py
```

4. Jalankan unit test `pytest`:

```bash
pytest -v
```

Akun demo operator: `operator@printkilat.id` / sandi `printkilat123`.

## Panduan Hosting (Vercel / Netlify / Cloudflare Workers)

- **Vercel (Direkomendasikan untuk Python Flask)**:
  Proyek ini sudah menyertakan `api/index.py` dan `vercel.json` yang memetakan seluruh rute ke Flask WSGI secara langsung. Hubungkan repositori ke Vercel, lalu isi Environment Variables `FLASK_SECRET_KEY` dan `DATABASE_URL` (MySQL 8.0 terkelola seperti Aiven, TiDB Cloud, atau PlanetScale agar data dan berkas antar-invocation persisten; bila `DATABASE_URL` kosong, aplikasi otomatis memakai `/tmp/printkilat.db` sementara).
- **Netlify / Cloudflare Workers**:
  - **Cloudflare Workers Python** saat ini berjalan di runtime Pyodide/WebAssembly yang belum mendukung pustaka C-extension seperti `cryptography` atau koneksi TCP langsung ke MySQL `PyMySQL` tanpa Hyperdrive/Worker proxy.
  - **Netlify** cocok untuk aset statis / Functions berbasis Node.js; untuk menjalankan Flask + `cryptography` + `PyMySQL` secara penuh tanpa perubahan arsitektur, **Vercel (`@vercel/python`)** atau PaaS Python (Render/Railway/Cloud Run) adalah pilihan paling kompatibel.
