declare module "bwip-js" {
  export interface BWIPJSOptions {
    bcid: string;
    text: string;
    scale?: number;
    height?: number;
    includetext?: boolean;
    textxalign?: string;
  }

  const bwipjs: {
    toBuffer(
      options: BWIPJSOptions
    ): Promise<Buffer>;
  };

  export default bwipjs;
}