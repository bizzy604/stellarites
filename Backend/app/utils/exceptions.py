from typing import Any, Dict, Optional


class ValidationError(Exception):
    def __init__(self, message: str = "validation error", details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}

    def to_dict(self) -> Dict[str, Any]:
        return {"message": self.message, "details": self.details}


class StellarError(Exception):
    def __init__(self, message: str = "stellar error", operation: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.operation = operation
        self.details = details or {}

    def to_dict(self) -> Dict[str, Any]:
        return {"message": self.message, "operation": self.operation, "details": self.details}
