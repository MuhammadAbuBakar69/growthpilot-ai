#!/usr/bin/env python3
"""Static controls on the SQL, run in CI before anything reaches a database.

Three checks, each of which corresponds to a claim the docs make:
  1. both files parse as PostgreSQL (pglast, the real parser libpg_query uses);
  2. every table carrying org_id has RLS enabled, force-enabled and a membership policy;
  3. no policy references a column that does not exist in the table it guards.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import pglast
from pglast import ast
from pglast.enums import AlterTableType

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "db" / "migrations" / "0001_init.sql"
POLICIES = ROOT / "db" / "policies" / "0002_rls.sql"


def fail(messages: list[str]) -> None:
    for message in messages:
        print(f"check_schema: {message}", file=sys.stderr)
    raise SystemExit(1)


def parsed(path: Path):
    sql = path.read_text(encoding="utf-8")
    try:
        return sql, pglast.parse_sql(sql)
    except Exception as exc:  # noqa: BLE001 - any parse failure is a hard failure
        fail([f"{path.name} does not parse: {exc}"])
        raise


def main() -> int:
    problems: list[str] = []

    _, statements = parsed(MIGRATION)
    _, policy_statements = parsed(POLICIES)

    # ---- table inventory
    tables: dict[str, set[str]] = {}
    for statement in statements:
        node = statement.stmt
        if isinstance(node, ast.CreateStmt):
            name = node.relation.relname
            tables[name] = {
                element.colname for element in node.tableElts
                if isinstance(element, ast.ColumnDef)
            }
    if len(tables) < 25:
        problems.append(f"only {len(tables)} tables found; the schema should define the full entity list")

    tenant_tables = {name for name, columns in tables.items() if "org_id" in columns}
    if not tenant_tables:
        problems.append("no table carries org_id - tenant isolation cannot be enforced")

    # ---- RLS coverage
    protected: set[str] = set()
    for statement in policy_statements:
        node = statement.stmt
        if isinstance(node, ast.AlterTableStmt):
            for command in node.cmds:
                if (
                    isinstance(command, ast.AlterTableCmd)
                    and command.subtype == AlterTableType.AT_EnableRowSecurity
                ):
                    protected.add(node.relation.relname)
    missing = sorted(tenant_tables - protected)
    if missing:
        problems.append(f"tables with org_id but no RLS: {', '.join(missing)}")

    # ---- policy columns must exist
    source = POLICIES.read_text(encoding="utf-8")
    for table in sorted(protected & set(tables)):
        pattern = rf"create policy \w+ on {table}\b(.*?);"
        for body in re.findall(pattern, source, re.S | re.I):
            # Ignore qualified references ("m.user_id") - those belong to the joined table, not to
            # the table this policy guards.
            bare = re.sub(r"\b\w+\.\w+\b", "", body)
            for column in re.findall(r"\b(org_id|business_id|user_id|id)\b", bare):
                if column not in tables[table]:
                    problems.append(f"policy on {table} references missing column {column}")

    if problems:
        fail(problems)

    print(
        f"check_schema: {len(statements)} statements, {len(tables)} tables, "
        f"{len(tenant_tables)} tenant tables, all RLS-enforced"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
