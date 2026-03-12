from __future__ import annotations

import os
import re
import tempfile
from typing import Dict, List, Tuple

import openai
import pdfplumber


ALLOWED_CV_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt", ".md", ".csv", ".json", ".log", ".rtf"}
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
client = openai.OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


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


def _extract_text_doc(file_path: str) -> str:
    with open(file_path, "rb") as handle:
        raw = handle.read()
    decoded = raw.decode("utf-8", errors="ignore") or raw.decode("latin-1", errors="ignore")
    return re.sub(r"[\x00-\x08\x0b-\x1f]+", " ", decoded)


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
        elif extension == ".doc":
            text = _extract_text_doc(temp_path)
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


def _infer_name_and_role_with_llm(text: str, fallback_name: str, fallback_role: str) -> Tuple[str, str]:
    if client is None or not text.strip():
        return fallback_name, fallback_role
    try:
        system_prompt = (
            "You extract profile details from CV text. "
            "Return strict JSON with keys: name (string), role (string). "
            "Use concise role titles like 'Product Manager', 'Frontend Engineer', 'Operations Lead'. "
            "If uncertain, return empty string for that field."
        )
        user_prompt = f"CV text:\n{text[:12000]}"
        response = client.chat.completions.create(
            model=os.getenv("SIMULATION_MODEL", "gpt-4o-mini"),
            temperature=0.1,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        raw = (response.choices[0].message.content or "").strip()
        parsed = {}
        if raw:
            import json

            parsed = json.loads(raw)
        llm_name = str(parsed.get("name") or "").strip() if isinstance(parsed, dict) else ""
        llm_role = str(parsed.get("role") or "").strip() if isinstance(parsed, dict) else ""
        return llm_name or fallback_name, llm_role or fallback_role
    except Exception:
        return fallback_name, fallback_role


def parse_cv_profile(file_name: str, text: str) -> Dict[str, object]:
    normalized_text = str(text or "").strip()
    fallback_name = _extract_name(normalized_text, file_name)
    fallback_role = _extract_role(normalized_text)
    inferred_name, inferred_role = _infer_name_and_role_with_llm(
        text=normalized_text,
        fallback_name=fallback_name,
        fallback_role=fallback_role,
    )
    qualifications = _extract_qualifications(normalized_text)
    return {
        "source_file_name": file_name,
        "name": inferred_name,
        "role": inferred_role,
        "qualifications": qualifications,
        "qualification_notes": normalized_text[:20000],
    }
