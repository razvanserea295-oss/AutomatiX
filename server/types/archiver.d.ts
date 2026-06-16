









declare module 'archiver' {
  import { Writable } from 'stream';

  interface ArchiverOptions {
    zlib?: { level?: number };
  }

  class Archiver extends Writable {
    constructor(options?: ArchiverOptions);
    pipe(dest: NodeJS.WritableStream): NodeJS.WritableStream;
    file(filepath: string, opts: { name: string }): this;
    directory(dirpath: string, destpath: string | false): this;
    append(source: Buffer | string | NodeJS.ReadableStream, opts: { name: string }): this;
    finalize(): Promise<void>;
    on(event: 'error' | 'warning', listener: (err: Error & { code?: string }) => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
    pointer(): number;
  }

  export { Archiver };
  export class ZipArchive extends Archiver {}
  export class TarArchive extends Archiver {}
  export class JsonArchive extends Archiver {}
}
