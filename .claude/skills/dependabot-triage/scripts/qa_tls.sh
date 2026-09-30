#!/usr/bin/env bash
# Outbound HTTPS check for certifi / requests / urllib3 bumps: from inside a built backend
# image, fetch the external services the app talks to and report TLS verification results.
# Needs the image already built by qa_backend.sh (ws-qa-be:<label>).
# Usage: qa_tls.sh <pr-number|branch-label>
source "$(dirname "$(readlink -f "$0")")/_common.sh"
[[ "$1" =~ ^[0-9]+$ ]] && IMG=ws-qa-be:pr$1 || IMG=ws-qa-be:$1
docker image inspect "$IMG" >/dev/null 2>&1 || { echo "missing image $IMG; run qa_backend.sh first"; exit 1; }
docker run --rm -i --entrypoint python "$IMG" - <<'PY'
import certifi, requests
print(f"requests {requests.__version__}, certifi {certifi.__version__}")
# Google OAuth + Calendar, AWS S3 (resume storage), Groq/OpenAI (resume analysis), PyPI as a control.
urls = [
    "https://accounts.google.com/.well-known/openid-configuration",
    "https://oauth2.googleapis.com/token",
    "https://www.googleapis.com/calendar/v3/colors",
    "https://s3.amazonaws.com/",
    "https://api.groq.com/openai/v1/models",
    "https://api.openai.com/v1/models",
    "https://api.linkedin.com/v2/me",
    "https://pypi.org/simple/",
]
bad = 0
for u in urls:
    try:
        r = requests.get(u, timeout=15)
        print(f"  TLS ok   {r.status_code}  {u}")
    except requests.exceptions.SSLError as e:
        bad += 1; print(f"  TLS FAIL      {u}: {str(e)[:120]}")
    except requests.exceptions.RequestException as e:
        print(f"  no conn       {u}: {type(e).__name__}")
print("TLS OK" if bad == 0 else f"TLS FAILURES: {bad}")
PY
