#!/usr/bin/env python3
"""Every table in the schema must be mentioned in the schema document.

Documentation drifts because nothing breaks when it does. This makes it break.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "db" / "migrations" / "0001_init.sql"
SCHEMA_DOC = ROOT / "docs" / "DATABASE_SCHEMA.md"
REQUIRED_DOCS = [
    "README.md",
    "docs/PROJECT_ARCHITECTURE.md",
    "docs/PRODUCT_REQUIREMENTS.md",
    "docs/DATABASE_SCHEMA.md",
    "docs/API_DOCUMENTATION.md",
    "docs/AI_AGENT_ARCHITECTURE.md",
    "docs/SECURITY.md",
    "docs/DEPLOYMENT_GUIDE.md",
    "docs/ENVIRONMENT_VARIABLES.md",
    "docs/TESTING_GUIDE.md",
    "docs/IMPLEMENTATION_ROADMAP.md",
]


def main() -> int:
    problems: list[str] = []
    for relative in REQUIRED_DOCS:
        if not (ROOT / relative).exists():
            problems.append(f"missing required document: {relative}")

    sql = MIGRATION.read_text(encoding="utf-8")
    tables = set(re.findall(r"create table (\w+)", sql, re.I))
    doc = SCHEMA_DOC.read_text(encoding="utf-8") if SCHEMA_DOC.exists() else ""
    undocumented = sorted(t for t in tables if t not in doc)
    if undocumented:
        problems.append(f"tables absent from DATABASE_SCHEMA.md: {', '.join(undocumented)}")

    if problems:
        for problem in problems:
            print(f"check_docs: {problem}", file=sys.stderr)
        raise SystemExit(1)
    print(f"check_docs: {len(REQUIRED_DOCS)} documents present, {len(tables)} tables documented")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
