declare module 'dxf' {
  export class Helper {
    constructor(dxfContent: string);
    toSVG(): string;
    toPolylines(): Array<{
      vertices: Array<{ x: number; y: number }>;
      rgb?: [number, number, number];
    }>;
  }
}
