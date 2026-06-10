import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "aframe";
declare module "aframe-extras";

type AFrameElementProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "a-scene": AFrameElementProps;
      "a-assets": AFrameElementProps;
      "a-entity": AFrameElementProps;
      "a-camera": AFrameElementProps;
      "a-box": AFrameElementProps;
      "a-plane": AFrameElementProps;
      "a-sky": AFrameElementProps;
      "a-sphere": AFrameElementProps;
      "a-cylinder": AFrameElementProps;
      "a-cone": AFrameElementProps;
      "a-torus": AFrameElementProps;
      "a-video": AFrameElementProps;
    }
  }
}

export {};
