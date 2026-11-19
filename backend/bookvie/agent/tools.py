"""The agent tools and the one helper that declares them (AD-21).

A tool is an :class:`AgentTool`: a name, the description the agent reads, the
Pydantic model its input schema comes from, and ``run(state, arguments)``.
``run`` gets the app's ``app.state`` and the arguments exactly as sent: the
SDK neither validates nor coerces them, so the model's parser is the only
validator, as it is for the intent routes. ``run`` returns an ``OkResponse``
or a view, or raises.
"""

import copy
import json
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel

from bookvie import views
from bookvie.intents.intent_model import IntentModel, parse_form_intent


@dataclass(frozen=True)
class AgentTool:
    """One tool: see the module docstring."""

    name: str
    description: str
    model: type[BaseModel]
    run: Callable[[Any, dict[str, Any]], BaseModel]


def input_schema(model: type[BaseModel]) -> dict[str, Any]:
    """The tool's advertised input schema: ``model``'s by alias, closed.

    ``null`` is left out of every property whose field isn't in the model's
    ``nullable``, because the parser refuses an explicit ``null`` there.
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


class NoArguments(IntentModel):
    """The arguments of a tool that takes none: a closed, empty object."""


def _get_app_info(state: Any, arguments: dict[str, Any]) -> views.AppInfoView:
    parse_arguments(NoArguments, arguments)
    return state.app_info


GET_APP_INFO = AgentTool(
    name="get_app_info",
    description=(
        "Which bookvie this is: its version, whether it is the real app (production) or a "
        "development server (dev), and the library folder it uses. Call it first to check you "
        "are talking to the bookvie you mean."
    ),
    model=NoArguments,
    run=_get_app_info,
)

TOOLS: tuple[AgentTool, ...] = (GET_APP_INFO,)
"""The tools every ``create_app`` registers unless a test passes its own."""
