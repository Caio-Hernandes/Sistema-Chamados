
const API_URL = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  public status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Preserva Authorization e quaisquer outros headers.
  const headers = new Headers(options.headers);

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    let message = "Erro ao comunicar com o servidor.";

    try {
      const error = await response.json();

      if (typeof error.detail === "string") {
        message = error.detail;
      } else if (Array.isArray(error.detail)) {
        message = error.detail
          .map((item: { msg?: string }) =>
            item.msg ?? "Campo inválido"
          )
          .join("; ");
      }
    } catch {
      // Mantém a mensagem padrão.
    }

    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
