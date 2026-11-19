export class BusinessError extends Error {
  constructor(message: string, public status = 422, public candidates?: unknown) {
    super(message);
  }
}
