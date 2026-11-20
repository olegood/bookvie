"""ATDD red phase: the agent tools advertise the type of every value they take.

Spec: ``_bmad-output/implementation-artifacts/spec-agent-tools-advertise-value-types.md``.
Epic 12 retro item 83's real session found ``update_page`` unusable from Claude
Code: ``page`` was listed as a bare ``JsonValue`` with no ``type``, so the
client sent ``"120"`` and the server refused it. The fix types the listed
schema only; the intents' wrong-type refusals stay (``test_agent_write.py``'s
``page-as-a-string`` and ``every-field-wrong`` cases pin them).

AC-2 (a real Claude Code session saves a page on the first call) is manual and
has no leaf.
"""

from typing import Any

import pytest

from tests.agent_client import McpClient

RED = "ATDD red phase: spec-agent-tools-advertise-value-types (the tools don't advertise value types yet)"

# The JSON type of an enum or const value, as JSON Schema names it.
_TYPE_OF_VALUE = (
    (bool, "boolean"),
    (int, "integer"),
    (float, "number"),
    (str, "string"),
    (type(None), "null"),
)


def _value_type(value: Any) -> str:
    for kind, name in _TYPE_OF_VALUE:
        if isinstance(value, kind):
            return name
    raise AssertionError(f"not a JSON scalar: {value!r}")


def _resolve(schema: dict[str, Any], prop: dict[str, Any]) -> dict[str, Any]:
    """``prop`` with a local ``$ref`` replaced by its definition, merged under ``prop``'s own keys."""
    ref = prop.get("$ref")
    if not isinstance(ref, str) or not ref.startswith("#/$defs/"):
        return prop
    target = schema.get("$defs", {}).get(ref.removeprefix("#/$defs/"), {})
    return {**_resolve(schema, target), **{k: v for k, v in prop.items() if k != "$ref"}}


def json_types(schema: dict[str, Any], prop: dict[str, Any]) -> set[str]:
    """The JSON types ``prop`` admits, or the empty set when any part of it names none.

    Reads ``type`` (a name or a list), ``enum`` and ``const`` (by their values'
    types), and ``anyOf``/``oneOf`` (the union, empty if any member is untyped),
    after resolving a local ``$ref`` against ``schema``'s ``$defs``.
    """
    prop = _resolve(schema, prop)
    if "type" in prop:
        kind = prop["type"]
        return set(kind) if isinstance(kind, list) else {kind}
    if "enum" in prop:
        return {_value_type(value) for value in prop["enum"]}
    if "const" in prop:
        return {_value_type(prop["const"])}
    members = prop.get("anyOf") or prop.get("oneOf")
    if members:
        found = [json_types(schema, member) for member in members]
        return set().union(*found) if all(found) else set()
    return set()


def enum_values(schema: dict[str, Any], prop: dict[str, Any]) -> set[Any] | None:
    """The non-null values ``prop`` is limited to, or ``None`` when it isn't an enum."""
    prop = _resolve(schema, prop)
    if "enum" in prop:
        return {value for value in prop["enum"] if value is not None}
    if "const" in prop:
        return {prop["const"]} - {None}
    members = prop.get("anyOf") or prop.get("oneOf") or []
    found = [enum_values(schema, member) for member in members]
    limited = [values for values in found if values is not None]
    return set().union(*limited) if limited else None


@pytest.mark.skip(reason=RED)
def test_every_tool_property_advertises_its_json_type(mcp_client: McpClient) -> None:
    # [P0] AC-1. The listed schemas Claude Code reads, over /mcp.
    from bookvie.intents.finish_reading import _ANSWERS

    listed = {tool["name"]: tool["inputSchema"] for tool in mcp_client.list_tools()}

    def types(tool: str, key: str) -> set[str]:
        return json_types(listed[tool], listed[tool]["properties"][key])

    # The criterion: update_page's page is a JSON integer, and never null.
    assert types("update_page", "page") == {"integer"}

    assert types("start_reading", "page") == {"integer", "null"}
    assert types("finish_reading", "rating") == {"integer", "null"}
    assert types("finish_reading", "finishedOn") == {"string", "null"}
    assert types("finish_reading", "purposeFulfilled") == {"string", "null"}
    fulfilled = listed["finish_reading"]["properties"]["purposeFulfilled"]
    assert enum_values(listed["finish_reading"], fulfilled) == set(_ANSWERS)

    # No tool lists a property without a type, so a future JsonValue field can't ship untyped.
    untyped = [
        (tool, key)
        for tool, schema in listed.items()
        for key, prop in schema.get("properties", {}).items()
        if not json_types(schema, prop)
    ]
    assert untyped == []
