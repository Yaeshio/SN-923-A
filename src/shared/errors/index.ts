export class PipelineError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PipelineError';
    }
}

export class ValidationError extends PipelineError {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class NotFoundError extends PipelineError {
    constructor(message: string) {
        super(message);
        this.name = 'NotFoundError';
    }
}

export class ConflictError extends PipelineError {
    constructor(message: string) {
        super(message);
        this.name = 'ConflictError';
    }
}

export class UnauthorizedError extends PipelineError {
    constructor(message: string) {
        super(message);
        this.name = 'UnauthorizedError';
    }
}

export class InSufficientStorageError extends PipelineError {
    constructor(message: string) {
        super(message);
        this.name = 'InSufficientStorageError';
    }
}

export class InvalidTransitionError extends PipelineError {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidTransitionError';
    }
}
