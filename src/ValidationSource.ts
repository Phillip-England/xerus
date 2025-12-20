export interface ValidationConfig {
  target: "BODY" | "QUERY" | "PARAM" | "HEADER" | "WS_MESSAGE" | "WS_CLOSE";
  format?: "JSON" | "FORM" | "MULTIPART";
  key?: string;
}

export const Source = {
  JSON: { target: "BODY", format: "JSON" } as ValidationConfig,
  FORM: { target: "BODY", format: "FORM" } as ValidationConfig,
  MULTIPART: { target: "BODY", format: "MULTIPART" } as ValidationConfig,

  QUERY: (key?: string): ValidationConfig => ({ target: "QUERY", key }),
  PARAM: (key: string): ValidationConfig => ({ target: "PARAM", key }),

  HEADER: (key: string): ValidationConfig => ({ target: "HEADER", key }),

  WS_MESSAGE: { target: "WS_MESSAGE" } as ValidationConfig,
  WS_CLOSE: { target: "WS_CLOSE" } as ValidationConfig,
};
