import type { GraphCapability } from '../BaseCapability';
import {
  AnimationLoopCapability,
  AnimationPauseCapability,
  AnimationPlayCapability,
  AnimationProgressCapability,
  AnimationResumeCapability,
  AnimationReverseCapability,
  AnimationStopCapability,
  AnimationYoyoCapability
} from './animation';
import { AnnotationCapability, AuxiliaryLineCapability, ProjectionCapability } from './annotation';
import { DeleteCapability } from './delete';
import { InspectCapability } from './inspect';
import { ResizeCapability, ResizeValueCapability } from './resize';
import { SplitCapability, SplitCancelCapability, SplitConfirmCapability } from './split';
import { FillStyleCapability, StrokeStyleCapability, StylePanelCapability } from './style';

export {
  AnimationPlayCapability,
  AnimationPauseCapability,
  AnimationProgressCapability,
  AnimationResumeCapability,
  AnimationReverseCapability,
  AnimationStopCapability,
  AnimationLoopCapability,
  AnimationYoyoCapability,
  AnnotationCapability,
  AuxiliaryLineCapability,
  DeleteCapability,
  FillStyleCapability,
  InspectCapability,
  ProjectionCapability,
  ResizeCapability,
  ResizeValueCapability,
  SplitCapability,
  SplitCancelCapability,
  SplitConfirmCapability,
  StrokeStyleCapability,
  StylePanelCapability
};

export const builtinCapabilities: GraphCapability[] = [
  new InspectCapability(),
  new ResizeCapability(),
  new ResizeValueCapability(),
  new AuxiliaryLineCapability(),
  new ProjectionCapability(),
  new AnnotationCapability(),
  new SplitCapability(),
  new SplitCancelCapability(),
  new SplitConfirmCapability(),
  new StylePanelCapability(),
  new StrokeStyleCapability(),
  new FillStyleCapability(),
  new AnimationPlayCapability(),
  new AnimationPauseCapability(),
  new AnimationResumeCapability(),
  new AnimationReverseCapability(),
  new AnimationStopCapability(),
  new AnimationLoopCapability(),
  new AnimationYoyoCapability(),
  new AnimationProgressCapability(),
  new DeleteCapability()
];
