import type { ModeId } from '../modes';
import type { LayerId, Target } from '../target';
import type { CameraPose } from './cameraRig';
import type { LivePerspective } from '../recording/perspectiveRecording';
import type { ViewCone } from './viewCones';
import type { DeadlineStatus } from '@shared/types';

/** Una incidencia activa en lat/lon, como llega de la API (SPEC-201 §3.10). */
export interface IncidentMarker { id: number; lat: number; lon: number; deadlineStatus: DeadlineStatus | null }
import type { SelectionSweepCallbacks } from './selectionSweep';
import type { Polygon } from '../sceneData';
import type { Balloon } from '@shared/types';

/** Lo que el visor avisa a la interfaz React. */
export interface ViewerCallbacks {
  /** Mantener pulsado y arrastrar elige jardines o ejemplares, según dónde empezó; solo si la pantalla lo pide. */
  selectionSweep?: SelectionSweepCallbacks;
  onSelect: (target: Target | null) => void;
  onGroundPick: (lat: number, lon: number) => void;
  /** Cualquier clic con punto (suelo, área verde, edificio): para marcar una ubicación. */
  onPointPick?: (lat: number, lon: number) => void;
  onHover: (target: Target | null, clientX: number, clientY: number) => void;
  onCompass: (degrees: number) => void;
  /** Un clic sobre el cono de una perspectiva. */
  onViewConePick?: (id: number) => void;
  /** Un clic sobre un globo (SPEC-113): la pantalla abre su ficha corta. */
  onBalloonPick?: (balloon: Balloon) => void;
  /** Un clic sobre el marcador de una incidencia. */
  onIncidentPick?: (id: number) => void;
}

/** Cómo nace el visor; lo que no se dice nace como siempre. */
export interface ViewerStart {
  /** Los edificios con ficha nacen en sus colores reales (SPEC-112 D-13). */
  realColors?: boolean;
  /** Donde se dibujan los globos (SPEC-113); sin ella, el visor no muestra globos. */
  balloonRoot?: HTMLElement;
}

/** Las operaciones que la interfaz React ordena al visor. */
export interface Viewer {
  /** Optional editor marks; absent on maps that do not display execution progress. */
  setTargetMarks?: (marks:import('./targetBadges').TargetMarks) => void;
  /** Optional restrictions and reference outline; unused by the general map. */
  setEligibleSections?: (codes:readonly string[]|null) => void;
  setReferenceOutline?: (polygons:Polygon[],focus:boolean) => void;
  setPaint: (mode: ModeId, hidden: Set<string>) => void;
  /** M7: áreas registradas temporalmente, sin cambiar el modo normal del mapa. */
  setMarkedSections: (codes: readonly string[]) => void;
  /** Ejemplares marcados a la vez (los de un conjunto), con el mismo color que las áreas. */
  setMarkedSpecimens: (codes: readonly string[]) => void;
  /**
   * Vuela hasta ver juntas esas áreas y, si se pasan, esos ejemplares; sin nada
   * reconocido, la cámara no se mueve.
   */
  focusSections: (codes: readonly string[], specimenCodes?: readonly string[]) => void;
  /** Los edificios de un lugar hecho de varios bloques; una lista vacía quita las marcas. */
  setMarkedBuildings: (ids: readonly number[]) => void;
  /** Areas del sector cuyo poligono cruza el rectangulo de pantalla (pixeles cliente). */
  sectionCodesInScreenRect: (x1: number, y1: number, x2: number, y2: number, eligible: readonly string[]) => string[];
  /** Ejemplares elegibles cuyo punto cae dentro del rectángulo de pantalla (píxeles cliente). */
  specimenCodesInScreenRect: (x1: number, y1: number, x2: number, y2: number, eligible: readonly string[]) => string[];
  setLayerVisible: (id: LayerId, visible: boolean) => void;
  select: (target: Target | null, focus: boolean) => void;
  setNight: (night: boolean) => void;
  /** Modo Atardecer: hora dorada con cielo, bruma y posprocesado. De noche no se aplica. */
  setSunset: (on: boolean) => void;
  /** La hora del Atardecer, de la hora dorada al crepúsculo (SUNSET_HOURS). */
  setSunsetHour: (hour: number) => void;
  /** Una captura de lo que se ve, a `scale` veces la resolución de la pantalla, en PNG. */
  snapshot: (scale?: number) => Promise<Blob | null>;
  /** Modo captura: sin marcadores 3D (pin, incidencias, conos de perspectiva). */
  setCaptureMode: (on: boolean) => void;
  setHour: (hour: number) => void;
  setShadows: (on: boolean) => void;
  setLabels: (on: boolean) => void;
  setGrayBuildings: (gray: boolean) => void;
  /** Los edificios con ficha, con los colores de sus fotos (SPEC-109). */
  setRealColors: (on: boolean) => void;
  fit: () => void;
  top: () => void;
  north: () => void;
  toggleSpin: () => boolean;
  pose: () => CameraPose;
  /** TEMPORAL: la cámara en este instante, para «Grabar vista». */
  livePerspective: () => LivePerspective;
  /** Vuela hasta una pose guardada, con la misma animación que al buscar. */
  flyToPose: (pose: CameraPose) => void;
  /** Los conos de las perspectivas de un lugar; una lista vacía los quita. */
  setViewCones: (cones: ViewCone[]) => void;
  setIncidentMarkers: (incidents: IncidentMarker[]) => void;
  /** Resalta un cono (o ninguno) y lleva la cámara a él. */
  focusViewCone: (id: number | null) => void;
  /** Lleva la cámara a un punto del campus. */
  focusLatLon: (lat: number, lon: number) => void;
  /** Muestra o reposiciona el marcador/pin en las coordenadas indicadas. */
  setPinLatLon?: (lat: number, lon: number) => void;
  /** Oculta el marcador/pin de la escena. */
  clearPin?: () => void;
  /**
   * Ctrl+Shift+U: W/S, A/D, Espacio y Shift mueven la cámara y el clic derecho mira
   * alrededor sin moverla. Al salir se vuelve a la vista 3D inicial.
   */
  setAdminMode: (on: boolean) => void;
  /** Los globos vigentes (SPEC-113); una lista vacía los quita. */
  setBalloons: (balloons: readonly Balloon[]) => void;
  dispose: () => void;
}
