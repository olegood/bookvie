"""What every intent shares: the intent model base and the ``intent`` part parser.

Each intent carries its fields in a JSON part named ``intent``.
:func:`parse_form_intent` turns that part into the intent's model or refuses
it with 422 ``invalid_fields`` on ``intent``. Every intent, form or not,
answers a malformed part with the same :data:`MALFORMED_INTENT_MESSAGE`; it
is on the wire, so keep it shared. :func:`refuse_fields` is the 422 for
field failures, named by their form labels.
"""

import json
from collections.abc import Iterable
from typing import ClassVar

from pydantic import (
    BaseModel,
    ConfigDict,
    ValidationError,
    ValidationInfo,
    field_validator,
)
from pydantic.alias_generators import to_camel

from bookvie.domain.labels import LABELS, FieldFailure

from .contract import FieldError, IntentError, invalid_fields

INTENT_FIELD = "intent"
MALFORMED_INTENT_MESSAGE = "The intent must be a JSON object of the form's fields."


class IntentModel(BaseModel):
    """An intent as sent: camelCase keys, no unknown keys, strict types.

    An explicit ``null`` is malformed unless the field is named in
    ``nullable``. An omitted key keeps its default, because defaults skip
    validation.
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        extra="forbid",
        strict=True,
    )

    nullable: ClassVar[frozenset[str]] = frozenset()
    """Fields (Python names) where an explicit ``null`` is a value."""

    @field_validator("*", mode="before")
    @classmethod
    def _no_null(cls, value: object, info: ValidationInfo) -> object:
        if value is None and info.field_name not in cls.nullable:
            raise ValueError("null is not allowed here")
        return value


def malformed() -> IntentError:
    return invalid_fields([FieldError(field=INTENT_FIELD, message=MALFORMED_INTENT_MESSAGE)])


def parse_form_intent[T: IntentModel](model: type[T], raw: str | None) -> T:
    """The ``intent`` form part as ``model``, or 422 on ``intent``."""
    if raw is None:
        raise malformed()
    try:
        doc = json.loads(raw)
    except ValueError, RecursionError:
        raise malformed() from None
    if not isinstance(doc, dict):
        raise malformed()
    try:
        return model.model_validate(doc)
    except ValidationError:
        raise malformed() from None


def refuse_fields(failures: Iterable[FieldFailure]) -> IntentError:
    """422 ``invalid_fields`` for ``(key, message)`` failures, named by label."""
    return invalid_fields(
        [FieldError(field=key, message=message) for key, message in failures], LABELS
    )
