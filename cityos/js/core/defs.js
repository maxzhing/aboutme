// Shared enums, tunables and lookup tables for the whole simulation.
// Keep this file free of THREE imports: the simulation model must stay plain data
// so it can be structured-cloned for what-if scenarios and JSON-serialised for saves.

export const GRID = 128;          // cells per side
export const CELL = 20;           // world units (metres) per cell
export const WORLD = GRID * CELL; // 2560 m across
export const CHUNK = 16;          // cells per render chunk (8x8 = 64 chunks)
export const CHUNKS = GRID / CHUNK;

// --- tile kinds
export const K = { EMPTY: 0, ROAD: 1, WATER: 2, PARK: 3, BUILDING: 4, PLAZA: 5, RAIL: 6, PLAZA_WATER: 7 };

// --- road classes
export const RC = { NONE: 0, STREET: 1, AVENUE: 2, HIGHWAY: 3 };
export const ROAD_SPEC = {
  [RC.STREET]:  { name: 'Street',   lanes: 2, capacity: 800,  speed: 40, width: 11.0, maint: 240 },
  [RC.AVENUE]:  { name: 'Avenue',   lanes: 4, capacity: 2200, speed: 55, width: 15.5, maint: 720 },
  [RC.HIGHWAY]: { name: 'Expressway', lanes: 6, capacity: 5400, speed: 100, width: 19.6, maint: 1900 },
};

// Monthly operating cost of civic assets, in dollars.
export const UPKEEP = {
  school: 165000, university: 2400000, hospital: 1350000, police: 420000, fire: 380000,
  museum: 120000, theater: 85000, stadium: 240000, station: 90000, bus_depot: 60000,
  power: 780000, water_plant: 340000, waste: 290000, marina: 45000,
  park_small: 2200, plaza: 1200,
};
// Build cost multiplier applied to BUILDING_SPEC.cost when the player places one.
export const TAX_BASE = 0.42;   // share of income captured by municipal taxation

// --- zones
export const Z = { NONE: 0, RES_LOW: 1, RES_HIGH: 2, COMM: 3, OFFICE: 4, IND: 5, MIXED: 6, CIVIC: 7, PARK: 8 };
export const ZONE_SPEC = {
  [Z.NONE]:     { name: 'Unzoned',       short: '—',   color: '#2a3240' },
  [Z.RES_LOW]:  { name: 'Residential (Low)',  short: 'R-L', color: '#4ade80' },
  [Z.RES_HIGH]: { name: 'Residential (High)', short: 'R-H', color: '#16a34a' },
  [Z.COMM]:     { name: 'Commercial',    short: 'C',   color: '#38bdf8' },
  [Z.OFFICE]:   { name: 'Office',        short: 'O',   color: '#a78bfa' },
  [Z.IND]:      { name: 'Industrial',    short: 'I',   color: '#fbbf24' },
  [Z.MIXED]:    { name: 'Mixed Use',     short: 'MX',  color: '#f472b6' },
  [Z.CIVIC]:    { name: 'Institutional', short: 'IN',  color: '#f87171' },
  [Z.PARK]:     { name: 'Recreation',    short: 'P',   color: '#84cc16' },
};

// --- building archetypes. `form` selects the procedural mesh generator.
export const BT = {
  HOUSE: 'house', ROWHOUSE: 'rowhouse', APARTMENT: 'apartment', TOWER_RES: 'tower_res',
  SHOP: 'shop', MALL: 'mall', RESTAURANT: 'restaurant', OFFICE: 'office', TOWER_OFF: 'tower_off',
  FACTORY: 'factory', WAREHOUSE: 'warehouse', POWER: 'power', WATER_PLANT: 'water_plant', WASTE: 'waste',
  SCHOOL: 'school', UNIVERSITY: 'university', HOSPITAL: 'hospital', POLICE: 'police', FIRE: 'fire',
  MUSEUM: 'museum', THEATER: 'theater', STADIUM: 'stadium', STATION: 'station', BUS_DEPOT: 'bus_depot',
  PARK_S: 'park_small', PLAZA: 'plaza', CONSTRUCTION: 'construction', MARINA: 'marina', PARKING: 'parking',
};

// jobsPer / resPer are per floor per cell of footprint.
export const BUILDING_SPEC = {
  house:      { form: 'house',    zone: Z.RES_LOW,  res: 3.2, jobs: 0,    floors: [1, 2],   power: 0.7, water: 0.9, waste: 0.5, pol: 0.02, cost: 0, label: 'House' },
  rowhouse:   { form: 'row',      zone: Z.RES_LOW,  res: 5.5, jobs: 0,    floors: [2, 4],   power: 0.9, water: 1.1, waste: 0.7, pol: 0.02, cost: 0, label: 'Rowhouses' },
  apartment:  { form: 'block',    zone: Z.RES_HIGH, res: 8.5, jobs: 0.4,  floors: [4, 14],  power: 1.1, water: 1.3, waste: 0.9, pol: 0.03, cost: 0, label: 'Apartments' },
  tower_res:  { form: 'tower',    zone: Z.RES_HIGH, res: 9.5, jobs: 0.6,  floors: [16, 44], power: 1.4, water: 1.5, waste: 1.1, pol: 0.04, cost: 0, label: 'Residential Tower' },
  shop:       { form: 'block',    zone: Z.COMM,     res: 0.6, jobs: 3.0,  floors: [1, 3],   power: 1.6, water: 0.6, waste: 1.2, pol: 0.06, cost: 0, label: 'Shops' },
  restaurant: { form: 'block',    zone: Z.COMM,     res: 0.4, jobs: 3.6,  floors: [1, 2],   power: 2.0, water: 1.4, waste: 1.8, pol: 0.08, cost: 0, label: 'Restaurant Row' },
  mall:       { form: 'mall',     zone: Z.COMM,     res: 0,   jobs: 4.2,  floors: [2, 4],   power: 3.2, water: 1.2, waste: 2.4, pol: 0.10, cost: 0, label: 'Shopping Centre' },
  office:     { form: 'block',    zone: Z.OFFICE,   res: 0.2, jobs: 5.5,  floors: [4, 16],  power: 1.8, water: 0.5, waste: 0.6, pol: 0.03, cost: 0, label: 'Offices' },
  tower_off:  { form: 'tower',    zone: Z.OFFICE,   res: 0,   jobs: 6.5,  floors: [18, 62], power: 2.4, water: 0.6, waste: 0.7, pol: 0.04, cost: 0, label: 'Corporate Tower' },
  factory:    { form: 'factory',  zone: Z.IND,      res: 0,   jobs: 2.6,  floors: [1, 3],   power: 5.0, water: 3.0, waste: 4.0, pol: 1.00, cost: 0, label: 'Factory' },
  warehouse:  { form: 'shed',     zone: Z.IND,      res: 0,   jobs: 1.1,  floors: [1, 2],   power: 1.4, water: 0.4, waste: 1.0, pol: 0.30, cost: 0, label: 'Warehouse / Logistics' },
  power:      { form: 'power',    zone: Z.CIVIC,    res: 0,   jobs: 1.2,  floors: [1, 2],   power: 0,   water: 2.0, waste: 1.0, pol: 2.20, cost: 12000, label: 'Power Plant' },
  water_plant:{ form: 'plant',    zone: Z.CIVIC,    res: 0,   jobs: 0.9,  floors: [1, 2],   power: 4.0, water: 0,   waste: 0.6, pol: 0.30, cost: 7000, label: 'Water Works' },
  waste:      { form: 'plant',    zone: Z.CIVIC,    res: 0,   jobs: 1.0,  floors: [1, 2],   power: 2.4, water: 1.0, waste: 0,   pol: 0.90, cost: 6500, label: 'Waste Facility' },
  school:     { form: 'civic',    zone: Z.CIVIC,    res: 0,   jobs: 1.6,  floors: [2, 3],   power: 1.2, water: 1.4, waste: 0.9, pol: 0.02, cost: 4200, label: 'School' },
  university: { form: 'campus',   zone: Z.CIVIC,    res: 1.2, jobs: 3.0,  floors: [3, 7],   power: 2.4, water: 2.2, waste: 1.6, pol: 0.03, cost: 16000, label: 'University' },
  hospital:   { form: 'civic',    zone: Z.CIVIC,    res: 0,   jobs: 4.0,  floors: [4, 8],   power: 3.4, water: 3.0, waste: 2.2, pol: 0.05, cost: 11000, label: 'Hospital' },
  police:     { form: 'civic',    zone: Z.CIVIC,    res: 0,   jobs: 2.2,  floors: [2, 3],   power: 1.0, water: 0.8, waste: 0.6, pol: 0.02, cost: 5200, label: 'Police Station' },
  fire:       { form: 'civic',    zone: Z.CIVIC,    res: 0,   jobs: 2.0,  floors: [1, 2],   power: 1.0, water: 1.2, waste: 0.6, pol: 0.02, cost: 4800, label: 'Fire Station' },
  museum:     { form: 'culture',  zone: Z.CIVIC,    res: 0,   jobs: 1.6,  floors: [2, 4],   power: 1.6, water: 0.8, waste: 0.7, pol: 0.02, cost: 8000, label: 'Museum' },
  theater:    { form: 'culture',  zone: Z.CIVIC,    res: 0,   jobs: 1.4,  floors: [2, 4],   power: 1.8, water: 0.7, waste: 0.8, pol: 0.02, cost: 7000, label: 'Theatre' },
  stadium:    { form: 'stadium',  zone: Z.CIVIC,    res: 0,   jobs: 1.0,  floors: [1, 1],   power: 4.0, water: 2.6, waste: 3.0, pol: 0.10, cost: 26000, label: 'Stadium' },
  station:    { form: 'station',  zone: Z.CIVIC,    res: 0,   jobs: 1.0,  floors: [1, 2],   power: 1.4, water: 0.5, waste: 0.6, pol: 0.02, cost: 3800, label: 'Transit Station' },
  bus_depot:  { form: 'shed',     zone: Z.CIVIC,    res: 0,   jobs: 1.2,  floors: [1, 1],   power: 1.0, water: 0.5, waste: 0.6, pol: 0.20, cost: 3000, label: 'Bus Depot' },
  park_small: { form: 'park',     zone: Z.PARK,     res: 0,   jobs: 0.15, floors: [1, 1],   power: 0.1, water: 0.6, waste: 0.2, pol: -0.5, cost: 900,  label: 'Park' },
  plaza:      { form: 'plazaB',   zone: Z.PARK,     res: 0,   jobs: 0.2,  floors: [1, 1],   power: 0.2, water: 0.3, waste: 0.2, pol: -0.2, cost: 700,  label: 'Plaza' },
  marina:     { form: 'marina',   zone: Z.PARK,     res: 0,   jobs: 0.6,  floors: [1, 1],   power: 0.4, water: 0.4, waste: 0.4, pol: 0.05, cost: 3200, label: 'Marina' },
  parking:    { form: 'parking',  zone: Z.COMM,     res: 0,   jobs: 0.2,  floors: [1, 4],   power: 0.3, water: 0.1, waste: 0.2, pol: 0.05, cost: 800,  label: 'Parking Structure' },
  construction:{form: 'construction', zone: Z.NONE, res: 0,   jobs: 0.8,  floors: [1, 1],   power: 0.4, water: 0.3, waste: 0.6, pol: 0.20, cost: 0, label: 'Construction Site' },
};

// --- districts
export const DISTRICT_TYPES = {
  downtown:    { label: 'Downtown',           color: '#5b8dff', zones: [[Z.OFFICE, 4], [Z.MIXED, 3], [Z.COMM, 3], [Z.RES_HIGH, 2]], densityBias: 1.0 },
  financial:   { label: 'Financial District', color: '#7c5cff', zones: [[Z.OFFICE, 7], [Z.COMM, 2], [Z.MIXED, 1]], densityBias: 1.15 },
  residential: { label: 'Residential',        color: '#3fbf7f', zones: [[Z.RES_HIGH, 5], [Z.RES_LOW, 3], [Z.COMM, 1.4], [Z.PARK, 0.8]], densityBias: 0.5 },
  suburbs:     { label: 'Suburbs',            color: '#8fd15a', zones: [[Z.RES_LOW, 9], [Z.COMM, 0.8], [Z.PARK, 1.2]], densityBias: 0.16 },
  university:  { label: 'University District',color: '#f0a04b', zones: [[Z.CIVIC, 3], [Z.RES_HIGH, 3], [Z.COMM, 2], [Z.PARK, 1]], densityBias: 0.6 },
  industrial:  { label: 'Industrial District',color: '#c9a227', zones: [[Z.IND, 8], [Z.OFFICE, 0.6]], densityBias: 0.34 },
  arts:        { label: 'Arts District',      color: '#e05fa0', zones: [[Z.MIXED, 4], [Z.COMM, 3], [Z.CIVIC, 2], [Z.RES_HIGH, 2]], densityBias: 0.62 },
  waterfront:  { label: 'Waterfront',         color: '#31c4c4', zones: [[Z.RES_HIGH, 3], [Z.COMM, 3], [Z.PARK, 2.5], [Z.MIXED, 2]], densityBias: 0.6 },
  port:        { label: 'Port & Logistics',   color: '#a08b5e', zones: [[Z.IND, 8], [Z.COMM, 0.5]], densityBias: 0.3 },
};

// --- overlays
export const LAYERS = [
  { id: 'none',       label: 'None',          icon: '⬦' },
  { id: 'traffic',    label: 'Traffic',       icon: '🚗' },
  { id: 'population', label: 'Population',    icon: '👥' },
  { id: 'density',    label: 'Density',       icon: '▦' },
  { id: 'income',     label: 'Income',        icon: '💵' },
  { id: 'housing',    label: 'Housing',       icon: '🏠' },
  { id: 'employment', label: 'Employment',    icon: '💼' },
  { id: 'pollution',  label: 'Pollution',     icon: '🌫' },
  { id: 'crime',      label: 'Crime',         icon: '🚓' },
  { id: 'transit',    label: 'Transit',       icon: '🚇' },
  { id: 'utilities',  label: 'Utilities',     icon: '⚡' },
  { id: 'landvalue',  label: 'Land Value',    icon: '📈' },
  { id: 'zoning',     label: 'Zoning',        icon: '🗺' },
  { id: 'noise',      label: 'Noise',         icon: '🔊' },
  { id: 'services',   label: 'Service Cover', icon: '🏥' },
];

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const SPEEDS = [0, 1, 5, 25, 100, 1000];

// `reserve` is opening treasury expressed in months of the city's own revenue,
// so a small city and a large one both start with a meaningful war chest.
export const MODES = {
  mayor:     { label: 'Mayor', desc: 'Limited budget, real consequences. The default way to play.', reserve: 4, unlimited: false },
  creative:  { label: 'Creative', desc: 'Unlimited funds — build without financial constraints.', reserve: 0, budget: 1e12, unlimited: true },
  sandbox:   { label: 'Sandbox', desc: 'Unlimited funds and no failure states. Full control.', reserve: 0, budget: 1e12, unlimited: true },
  transport: { label: 'Transport Challenge', desc: 'Inherit a gridlocked city. Get average commute under 20 minutes.', reserve: 6, unlimited: false },
  green:     { label: 'Green City', desc: 'Heavy industry, dirty air. Cut pollution by 30% without wrecking the economy.', reserve: 5, unlimited: false },
  economic:  { label: 'Economic Challenge', desc: 'Thin treasury. Grow the economy and create 100,000 jobs.', reserve: 1.2, unlimited: false },
};
