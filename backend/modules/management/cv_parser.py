from __future__ import annotations

import os
import re
import tempfile
from typing import Dict, List, Tuple

import pdfplumber


ALLOWED_CV_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".csv", ".json", ".log", ".rtf"}


def get_extension(file_name: str) -> str:
    return os.path.splitext(str(file_name or "").lower())[1]


def _extract_text_pdf(file_path: str) -> str:
    parts: List[str] = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            value = page.extract_text() or ""
            if value.strip():
                parts.append(value)
    return "\n".join(parts)


def _extract_text_docx(file_path: str) -> str:
    import docx2txt

    return docx2txt.process(file_path) or ""


def _extract_text_plain(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8", errors="ignore") as handle:
        return handle.read()


def extract_cv_text(file_name: str, raw_bytes: bytes) -> Tuple[str, str]:
    extension = get_extension(file_name)
    if extension not in ALLOWED_CV_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_CV_EXTENSIONS))
        raise ValueError(f"Unsupported CV format. Allowed: {allowed}")

    with tempfile.NamedTemporaryFile(delete=False, suffix=extension) as tmp_file:
        tmp_file.write(raw_bytes)
        temp_path = tmp_file.name

    try:
        if extension == ".pdf":
            text = _extract_text_pdf(temp_path)
        elif extension == ".docx":
            text = _extract_text_docx(temp_path)
        else:
            text = _extract_text_plain(temp_path)
        return text, extension
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)


def _clean_values(items: List[str]) -> List[str]:
    values: List[str] = []
    for item in items:
        value = re.sub(r"\s+", " ", str(item or "").strip())
        if value and len(value) <= 120:
            values.append(value)
    deduped = list(dict.fromkeys(values))
    return deduped[:30]


def _extract_name(text: str, file_name: str) -> str:
    first_line = next((line.strip() for line in text.splitlines() if line.strip()), "")
    if 2 <= len(first_line) <= 80 and not any(char.isdigit() for char in first_line):
        return first_line
    base = os.path.splitext(file_name)[0]
    return re.sub(r"[_\-]+", " ", base).strip()[:80]


def _extract_role(text: str) -> str:
    lowered = text.lower()
    role_map = [
        ("product manager", "Product Manager"),
        ("project manager", "Project Manager"),
        ("operations manager", "Operations Manager"),
        ("marketing manager", "Marketing Manager"),
        ("sales manager", "Sales Manager"),
        ("software engineer", "Software Engineer"),
        ("developer", "Software Engineer"),
        ("designer", "Product Designer"),
        ("data analyst", "Data Analyst"),
        ("accountant", "Finance"),
        ("finance", "Finance"),
        ("customer success", "Customer Success"),
    ]
    for needle, role in role_map:
        if needle in lowered:
            return role
    return ""


def _extract_qualifications(text: str) -> List[str]:
    lines = [line.strip(" -*\t") for line in text.splitlines() if line.strip()]
    candidates: List[str] = []
    for line in lines:
        lower = line.lower()
        if "skills" in lower and ":" in line:
            _, raw = line.split(":", 1)
            candidates.extend([part.strip() for part in re.split(r"[;,|]", raw)])
            continue
        if any(sep in line for sep in [",", ";", "|"]) and len(line) <= 120:
            candidates.extend([part.strip() for part in re.split(r"[;,|]", line)])
    return _clean_values(candidates)


def parse_cv_profile(file_name: str, text: str) -> Dict[str, object]:
    normalized_text = str(text or "").strip()
    qualifications = _extract_qualifications(normalized_text)
    return {
        "source_file_name": file_name,
        "name": _extract_name(normalized_text, file_name),
        "role": _extract_role(normalized_text),
        "qualifications": qualifications,
        "qualification_notes": normalized_text[:20000],
    }
