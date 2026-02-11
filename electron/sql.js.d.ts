declare module 'sql.js' {
  export default function initSqlJs(config?: unknown): Promise<{
    Database: new (data?: BufferSource) => {
      run(sql: string, params?: object): void
      exec(sql: string, params?: object): { columns: string[]; values: (string | number | null)[][] }[]
      export(): Uint8Array
      close(): void
    }
  }>
}
