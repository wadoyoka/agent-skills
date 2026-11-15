import React from "react";
import { Composition } from "remotion";
import timing from "../timing.json";
import { Video } from "./Video";

export const RemotionRoot: React.FC = () => (
  <Composition id="Main" component={Video} durationInFrames={timing.total} fps={timing.fps} width={1920} height={1080} />
);
