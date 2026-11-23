"""What every agent tool shares, and the one helper that declares them (AD-21).

A tool is an :class:`AgentTool`: a name, the description the agent reads, the
Pydantic model its input schema comes from, the keys it requires though the
model leaves them optional, and ``run(state, arguments)``.
``run`` gets the app's ``app.state`` and the arguments exactly as sent: the
SDK neither validates nor coerces them, so the model's parser is the only
validator, as it is for the intent routes. ``run`` returns an ``OkResponse``
or a view, or raises.
"""

import copy
import dataclasses
import json
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from typing import Any

import mcp_types
from pydantic import BaseModel, ValidationError

from bookvie.intents import (
    FieldError,
    FinishReadingIntent,
    StartReadingIntent,
    UpdatePageIntent,
    invalid_fields,
)
from bookvie.intents.finish_reading import _ANSWERS as PURPOSE_FULFILLED_ANSWERS
from bookvie.intents.intent_model import IntentModel, parse_form_intent


@dataclass(frozen=True)
class ToolCall:
    """What an interactive tool sees of its ``tools/call`` besides the arguments.

    ``protocol_version`` and ``capabilities`` are the client's, from the
    request's envelope; ``input_responses`` (each answer as its JSON object,
    by key) and ``request_state`` are a 2026-07-28 retry's, ``None`` on a
    first call.
    """

    protocol_version: str | None = None
    capabilities: Mapping[str, Any] | None = None
    input_responses: Mapping[str, Mapping[str, Any]] | None = None
    request_state: str | None = None


@dataclass(frozen=True)
class AgentTool:
    """One tool: see the module docstring."""

    name: str
    description: str
    model: type[BaseModel]
    run: Callable[..., BaseModel | mcp_types.InputRequiredResult]
    """``run(state, arguments)``, or ``run(state, arguments, call)`` when ``interactive``."""
    required: tuple[str, ...] = ()
    """Keys (by alias) the tool requires though its model leaves them optional."""
    extra_properties: Mapping[str, Mapping[str, Any]] = dataclasses.field(default_factory=dict)
    """Tool-only optional properties (by key) the model doesn't have, such as ``coverUrl``."""
    interactive: bool = False
    """Whether ``run`` takes the call's :class:`ToolCall` and may answer an
    ``InputRequiredResult`` (``restore_backup``)."""


_INTEGER: Mapping[str, Any] = {"type": "integer"}
_STRING: Mapping[str, Any] = {"type": "string"}


def _or_null(prop: Mapping[str, Any]) -> dict[str, Any]:
    return {"anyOf": [dict(prop), {"type": "null"}]}


JSON_VALUE_TYPES: Mapping[type[BaseModel], Mapping[str, Mapping[str, Any]]] = {
    UpdatePageIntent: {"page": _INTEGER},
    StartReadingIntent: {"page": _or_null(_INTEGER)},
    FinishReadingIntent: {
        "finishedOn": _STRING,
        "purposeFulfilled": _or_null({"type": "string", "enum": list(PURPOSE_FULFILLED_ANSWERS)}),
        "rating": _or_null(_INTEGER),
    },
}
"""The JSON type each ``JsonValue`` property (by alias) is advertised with, by model.

The model takes any JSON value there, so a wrong type is a field error from
its parser, not a malformed intent; the bare ``JsonValue`` schema names no
type, though, and a client then guesses one (Epic 12 retro item 83: Claude
Code sent ``update_page``'s page as ``"120"``). ``null`` is listed only
where the parser accepts it: never for ``update_page``'s ``page`` (its
``nullable`` only makes ``null`` a field error) or ``finishedOn`` (a finish
always needs a date). Nothing is coerced: the parser still refuses
``"120"``.
"""

_JSON_VALUE_REF = "#/$defs/JsonValue"


def input_schema(model: type[BaseModel]) -> dict[str, Any]:
    """The tool's advertised input schema: ``model``'s by alias, closed.

    ``null`` is left out of every property whose field isn't in the model's
    ``nullable``, because the parser refuses an explicit ``null`` there.
    Then each property in :data:`JSON_VALUE_TYPES` for ``model`` gets its
    declared type in place of the untyped ``JsonValue`` reference, keeping
    its other keys (such as ``default``).
    """
    schema = copy.deepcopy(model.model_json_schema(by_alias=True))
    schema["additionalProperties"] = False
    nullable: frozenset[str] = getattr(model, "nullable", frozenset())
    properties = schema.get("properties", {})
    for name, field in model.model_fields.items():
        key = field.alias or name
        if name in nullable or key not in properties:
            continue
        properties[key] = _without_null(properties[key])
    for key, declared in JSON_VALUE_TYPES.get(model, {}).items():
        rest = {k: v for k, v in properties[key].items() if k != "$ref"}
        properties[key] = {**copy.deepcopy(dict(declared)), **rest}
    _drop_unused_json_value(schema)
    return schema


def _drop_unused_json_value(schema: dict[str, Any]) -> None:
    """Remove ``$defs.JsonValue`` (and an emptied ``$defs``) once no property refers to it."""
    defs = schema.get("$defs")
    if not isinstance(defs, dict) or "JsonValue" not in defs:
        return
    if _JSON_VALUE_REF in json.dumps(schema):
        return
    del defs["JsonValue"]
    if not defs:
        del schema["$defs"]


def advertised_schema(tool: AgentTool) -> dict[str, Any]:
    """The schema ``tool`` is listed with.

    :func:`input_schema` plus its ``required`` keys, then its
    ``extra_properties`` after the model's, never required.
    """
    schema = _required_schema(tool.model, tool.required)
    if tool.extra_properties:
        properties = schema.setdefault("properties", {})
        for key, prop in tool.extra_properties.items():
            properties[key] = copy.deepcopy(dict(prop))
    return schema


def _required_schema(model: type[BaseModel], required: Sequence[str]) -> dict[str, Any]:
    schema = input_schema(model)
    if not required:
        return schema
    properties = schema.get("properties", {})
    unknown = [key for key in required if key not in properties]
    if unknown:
        raise ValueError(f"required keys {unknown} aren't properties of {model.__name__}")
    wanted = {*schema.get("required", []), *required}
    # In property order, so the schema reads as the form does.
    schema["required"] = [key for key in properties if key in wanted]
    return schema


def _without_null(prop: dict[str, Any]) -> dict[str, Any]:
    branches = prop.get("anyOf")
    if not isinstance(branches, list):
        return prop
    kept = [branch for branch in branches if branch != {"type": "null"}]
    if len(kept) == len(branches):
        return prop
    # A `null` default would contradict the type left once null is gone.
    rest = {
        key: value
        for key, value in prop.items()
        if key != "anyOf" and not (key == "default" and value is None)
    }
    if len(kept) == 1:
        return {**kept[0], **rest}
    return {**rest, "anyOf": kept}


def parse_arguments[T: IntentModel](model: type[T], arguments: Mapping[str, Any]) -> T:
    """``arguments`` as ``model``, refused as the intent routes refuse a malformed part."""
    return parse_form_intent(model, json.dumps(arguments))


def parse_view_arguments[T: BaseModel](model: type[T], arguments: Mapping[str, Any]) -> T:
    """``arguments`` as ``model``, or 422 ``invalid_fields`` naming each failing argument.

    One field error per validation error, by alias path, with Pydantic's
    message: what ``http/api.py`` answers for a view route's bad query.
    """
    try:
        return model.model_validate(arguments)
    except ValidationError as err:
        raise invalid_fields(
            [
                FieldError(field=".".join(map(str, error["loc"])), message=error["msg"])
                for error in err.errors()
            ]
        ) from None


class NoArguments(IntentModel):
    """The arguments of a tool that takes none: a closed, empty object."""


MISSING_MESSAGE = "Field required"
"""A missing required key's message: Pydantic's, as :func:`parse_view_arguments` names one."""


def _expected_keys(model: type[BaseModel], required: Sequence[str]) -> list[str]:
    return _required_schema(model, required).get("required", []) if required else []


def _refuse_missing(expected: Sequence[str], arguments: Mapping[str, Any]) -> None:
    missing = [key for key in expected if key not in arguments]
    if missing:
        raise invalid_fields([FieldError(field=key, message=MISSING_MESSAGE) for key in missing])
