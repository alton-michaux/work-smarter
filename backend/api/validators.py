import zipfile
from io import BytesIO

from django.core.exceptions import ValidationError

MAX_RESUME_UPLOAD_BYTES = 10 * 1024 * 1024  # 10MB

_PDF_MAGIC = b"%PDF-"
_OLE2_MAGIC = b"\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1"  # legacy .doc
_ZIP_MAGIC = b"PK\x03\x04"  # .docx (OOXML/ZIP)


def validate_resume_file(file):
    """Raise ValidationError unless `file` is a PDF, DOC, or DOCX under the size cap.

    The client-supplied Content-Type header is trivially spoofable, so this
    checks the actual file bytes (magic numbers / archive structure) instead.
    """
    if file.size > MAX_RESUME_UPLOAD_BYTES:
        raise ValidationError("File is too large. Maximum size is 10MB.")

    header = file.read(8)
    file.seek(0)

    if header.startswith(_PDF_MAGIC):
        return

    if header.startswith(_OLE2_MAGIC):
        return

    if header.startswith(_ZIP_MAGIC):
        try:
            with zipfile.ZipFile(BytesIO(file.read())) as archive:
                if "[Content_Types].xml" in archive.namelist():
                    return
        except zipfile.BadZipFile:
            pass
        finally:
            file.seek(0)
        raise ValidationError("File does not appear to be a valid Word document.")

    raise ValidationError("Unrecognized file type. Only PDF and Word documents are accepted.")
