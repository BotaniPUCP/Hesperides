import type { ModeId } from '../modes';
import type { LayerId, Target } from '../target';
import type { CameraPose } from './cameraRig';
import type { ViewCone } from './viewCones';

/** Lo que el visor avisa a la interfaz React. */
export interface ViewerCallbacks {
  onSelect: (target: Target | null) => void;
  onGroundPick: (lat: number, lon: number) => void;
  /** Cualquier clic con punto (suelo, área verde, edificio): para marcar una ubicación. */
  onPointPick?: (lat: number, lon: number) => void;
  onHover: (target: Target | null, clientX: number, clientY: number) => void;
  onCompass: (degrees: number) => void;
  /** Un clic sobre el cono de una perspectiva. */
  onViewConePick?: (id: number) => void;
}

/** Las operaciones que la interfaz React ordena al visor. */
export interface Viewer {
  setPaint: (mode: ModeId, hidden: Set<string>) => void;
  setLayerVisible: (id: LayerId, visible: boolean) => void;
  select: (target: Target | null, focus: boolean) => void;
  setNight: (night: boolean) => void;
  setHour: (hour: number) => void;
  setShadows: (on: boolean) => void;
  setLabels: (on: boolean) => void;
  setGrayBuildings: (gray: boolean) => void;
  fit: () => void;
  top: () => void;
  north: () => void;
  toggleSpin: () => boolean;
  pose: () => CameraPose;
  /** Los conos de las perspectivas de un lugar; una lista vacía los quita. */
  setViewCones: (cones: ViewCone[]) => void;
  /** Resalta un cono (o ninguno) y lleva la cámara a él. */
  focusViewCone: (id: number | null) => void;
  /** Lleva la cámara a un punto del campus. */
  focusLatLon: (lat: number, lon: number) => void;
  dispose: () => void;
}
