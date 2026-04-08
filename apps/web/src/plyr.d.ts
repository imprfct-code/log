declare module "plyr" {
  interface PlyrOptions {
    controls?: string[];
    settings?: string[];
    speed?: { selected: number; options: number[] };
    tooltips?: { controls: boolean; seek: boolean };
    ratio?: string;
  }

  class Plyr {
    constructor(target: HTMLElement | string, options?: PlyrOptions);
    destroy(): void;
  }

  export default Plyr;
}
