// Typed error hierarchy. Every public operation throws one of these.
// Catchers can use instanceof or the .code field.

export type OperationErrorCode =
  | "INVALID_PDF"
  | "EMPTY_FILE"
  | "PASSWORD_REQUIRED"
  | "INVALID_PASSWORD"
  | "CORRUPT_PDF"
  | "FILE_TOO_LARGE"
  | "OUT_OF_MEMORY"
  | "INVALID_INPUT"
  | "OPERATION_FAILED"
  | "UNSUPPORTED_FEATURE"
  | "BUSY";

export class OperationError extends Error {
  readonly code: OperationErrorCode;
  readonly details?: unknown;

  constructor(code: OperationErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "OperationError";
    this.code = code;
    this.details = details;
  }
}

export class InvalidPdfError extends OperationError {
  constructor(message = "The input is not a valid PDF.", details?: unknown) {
    super("INVALID_PDF", message, details);
    this.name = "InvalidPdfError";
  }
}

export class PasswordRequiredError extends OperationError {
  constructor(message = "This PDF is password-protected.") {
    super("PASSWORD_REQUIRED", message);
    this.name = "PasswordRequiredError";
  }
}

export class InvalidPasswordError extends OperationError {
  constructor(message = "The password is incorrect.") {
    super("INVALID_PASSWORD", message);
    this.name = "InvalidPasswordError";
  }
}

export class CorruptPdfError extends OperationError {
  constructor(message = "The PDF is corrupt or truncated.", details?: unknown) {
    super("CORRUPT_PDF", message, details);
    this.name = "CorruptPdfError";
  }
}

export class InvalidInputError extends OperationError {
  constructor(message: string, details?: unknown) {
    super("INVALID_INPUT", message, details);
    this.name = "InvalidInputError";
  }
}

export class UnsupportedFeatureError extends OperationError {
  constructor(message: string) {
    super("UNSUPPORTED_FEATURE", message);
    this.name = "UnsupportedFeatureError";
  }
}
