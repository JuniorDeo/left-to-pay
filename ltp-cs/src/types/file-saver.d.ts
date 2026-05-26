// Type declarations for file-saver (minimal, local fallback)
// Prefer installing @types/file-saver for full typings:
// npm install -D @types/file-saver

declare module 'file-saver' {
  export function saveAs(data: Blob | any, filename?: string, options?: any): void;
  const _default: typeof saveAs;
  export default _default;
}
