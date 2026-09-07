class DomainError(Exception):
    """Base class for all domain errors."""

class InvalidStatusTransition(DomainError):
    """Raised when a status transition is invalid."""

class SequenceLocked(DomainError):
    """Raised when a sequence is locked."""