/**
 * Configuration object telling the Validator middleware where to look.
 */
export interface ValidationConfig {
  target: "BODY" | "QUERY" | "PARAM" | "HEADER";
  format?: "JSON" | "FORM" | "MULTIPART";
  key?: string; // If present, we look for this specific key
}

/**
 * The Source selector helper.
 * Usage: 
 * Validator(Class, Source.JSON)
 * Validator(Class, Source.QUERY('page'))
 * Validator(Class, Source.HEADER('x-api-key'))
 */
export const Source = {
  // Body Targets
  JSON: { target: "BODY", format: "JSON" } as ValidationConfig,
  FORM: { target: "BODY", format: "FORM" } as ValidationConfig,
  MULTIPART: { target: "BODY", format: "MULTIPART" } as ValidationConfig,

  // Specific Targets (Functions)
  
  /**
   * Target Query Parameters.
   * @param key Optional. If provided, targets ?key=value. If omitted, targets all queries.
   */
  QUERY: (key?: string): ValidationConfig => ({ target: "QUERY", key }),

  /**
   * Target URL Parameters (e.g. /users/:id).
   * @param key The name of the parameter defined in the route (without the colon).
   */
  PARAM: (key: string): ValidationConfig => ({ target: "PARAM", key }),

  /**
   * Target HTTP Headers.
   * @param key The header name (case-insensitive in retrieval, but preserved for class).
   */
  HEADER: (key: string): ValidationConfig => ({ target: "HEADER", key }),
};