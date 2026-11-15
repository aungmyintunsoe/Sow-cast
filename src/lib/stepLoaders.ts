// Code for each page, loaded on demand so Leaflet (map) and Recharts (charts) only download when needed.
// App uses these for React.lazy; the header calls preloadStep on hover/focus so the code is ready before the click.
/** The four steps in the header nav. */
export type StepId = 'map' | 'brief' | 'rotations' | 'crops';
/** Every page: the steps plus pages reached from inside them (rotation builder, methods and sources). */
export type PageId = StepId | 'build' | 'methods' | 'home' | 'skill';
export const PAGE_IDS: PageId[] = ['home', 'skill', 'map', 'brief', 'rotations', 'crops', 'build', 'methods'];

export const stepLoaders = {
  map: () => import('../components/map/FieldMap'),
  brief: () => import('../components/brief/FieldBrief'),
  rotations: () => import('../components/rotations/RotationCompare'),
  crops: () => import('../components/crops/CropFitList'),
  build: () => import('../components/rotations/RotationBuilder'),
  methods: () => import('../components/methods/MethodsPage'),
  home: () => import('../components/landing/LandingPage'),
  skill: () => import('../components/landing/SkillPage'),
} satisfies Record<PageId, () => Promise<unknown>>;

export const preloadStep = (step: PageId) => void stepLoaders[step]().catch(() => undefined);
