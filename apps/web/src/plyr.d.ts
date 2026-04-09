declare module "plyr" {
  export interface PlyrOptions {
    controls?: string[];
    settings?: string[];
    speed?: { selected: number; options: number[] };
    tooltips?: { controls: boolean; seek: boolean };
    ratio?: string;
    invertTime?: boolean;
    displayDuration?: boolean;
    duration?: number;
  }

  class Plyr {
    constructor(target: HTMLElement | string, options?: PlyrOptions);
    destroy(): void;
  }

  export default Plyr;
}
