import * as THREE from 'three';

/**
 * LabelRenderParams describes the set of points that should have labels
 * rendered next to them.
 */
export class LabelRenderParams {
  constructor(
    public pointIndices: Float32Array,
    public labelStrings: string[],
    public scaleFactors: Float32Array,
    public useSceneOpacityFlags: Int8Array,
    public defaultFontSize: number,
    public fillColors: Uint8Array,
    public strokeColors: Uint8Array
  ) {}
}

/** Details about the camera projection being used to render the scene. */
export enum CameraType {
  Perspective,
  Orthographic,
}

/**
 * RenderContext contains all of the state required to color and render the data
 * set. ScatterPlot passes this to every attached visualizer as part of the
 * render callback.
 * TODO(@charlesnicholson): This should only contain the data that's changed between
 * each frame. Data like colors / scale factors / labels should be reapplied
 * only when they change.
 */
export class RenderContext {
  constructor(
    public camera: THREE.Camera,
    public cameraType: CameraType,
    public cameraTarget: THREE.Vector3,
    public screenWidth: number,
    public screenHeight: number,
    public nearestCameraSpacePointZ: number,
    public farthestCameraSpacePointZ: number,
    public backgroundColor: number,
    public pointColors: Float32Array,
    public pointScaleFactors: Float32Array,
    public labels: LabelRenderParams,
    public polylineColors: { [polylineIndex: number]: Float32Array },
    public polylineOpacities: Float32Array,
    public polylineWidths: Float32Array
  ) {}
}
