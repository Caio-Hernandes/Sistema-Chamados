class DomainError(Exception):
    """Erro de regra de negócio; a conversão para HTTP acontece em app.main."""

    default_message = "Domain error."

    def __init__(self, message: str | None = None) -> None:
        self.message = message or self.default_message
        super().__init__(self.message)


class AuthenticationError(DomainError):
    default_message = "Could not validate credentials."


class PermissionDeniedError(DomainError):
    default_message = "You do not have permission to perform this action."


class NotFoundError(DomainError):
    default_message = "Resource not found."


class ConflictError(DomainError):
    default_message = "Resource conflict."
