export const projectStatuses = ['planned', 'active', 'completed'] as const;
export const quantityUnits = ['skeins', 'grams', 'yards', 'metres', 'custom'] as const;

export type ProjectStatus = (typeof projectStatuses)[number];
export type QuantityUnit = (typeof quantityUnits)[number];

export type Quantity = {
  value: number;
  unit: QuantityUnit;
  customUnit?: string;
};

export type ProjectYarn = {
  material?: string;
  category?: string;
  colour?: string;
  quantity?: Quantity;
};

export type Project = {
  id: string;
  name: string;
  status: ProjectStatus;
  description?: string;
  patternUrl?: string;
  materialsRequired?: string;
  latestUpdate?: string;
  hookSize?: string;
  yarn?: ProjectYarn;
  amountUsed?: Quantity;
  coverPhotoId?: string;
  completedAt?: Date;
  sourceCompletedProjectId?: string;
  createdAt: Date;
  updatedAt: Date;
  schemaVersion: 1;
};

export type EditableProject = Omit<
  Project,
  'id' | 'createdAt' | 'updatedAt' | 'schemaVersion' | 'coverPhotoId'
>;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalText(record: UnknownRecord, key: string) {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error(`Project field "${key}" must be text.`);
  return value;
}

function requiredDate(record: UnknownRecord, key: string) {
  const value = record[key];
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`Project field "${key}" must be a valid date.`);
  }
  return value;
}

function parseQuantity(value: unknown, key: string): Quantity | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value) || typeof value.value !== 'number' || !Number.isFinite(value.value)) {
    throw new Error(`Project field "${key}" must be a valid quantity.`);
  }
  if (value.value < 0 || !quantityUnits.includes(value.unit as QuantityUnit)) {
    throw new Error(`Project field "${key}" contains an invalid value or unit.`);
  }
  const customUnit = optionalText(value, 'customUnit');
  if (value.unit === 'custom' && !customUnit?.trim()) {
    throw new Error(`Project field "${key}" needs a custom unit.`);
  }
  return {
    value: value.value,
    unit: value.unit as QuantityUnit,
    ...(customUnit && { customUnit }),
  };
}

function parseYarn(value: unknown): ProjectYarn | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new Error('Project field "yarn" must be an object.');
  return compactObject({
    material: optionalText(value, 'material'),
    category: optionalText(value, 'category'),
    colour: optionalText(value, 'colour'),
    quantity: parseQuantity(value.quantity, 'yarn.quantity'),
  });
}

export function compactObject<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== ''),
  ) as T;
}

export function validateProjectName(name: string) {
  const trimmed = name.trim();
  return trimmed
    ? { valid: true as const, value: trimmed }
    : { valid: false as const, message: 'Enter a project name.' };
}

export function parseProject(id: string, value: unknown): Project {
  if (!isRecord(value)) throw new Error(`Project ${id} is not a document object.`);
  const name = optionalText(value, 'name')?.trim();
  if (!name) throw new Error(`Project ${id} has no valid name.`);
  if (!projectStatuses.includes(value.status as ProjectStatus)) {
    throw new Error(`Project ${id} has an invalid status.`);
  }
  if (value.schemaVersion !== 1)
    throw new Error(`Project ${id} has an unsupported schema version.`);

  return compactObject({
    id,
    name,
    status: value.status as ProjectStatus,
    description: optionalText(value, 'description'),
    patternUrl: optionalText(value, 'patternUrl'),
    materialsRequired: optionalText(value, 'materialsRequired'),
    latestUpdate: optionalText(value, 'latestUpdate'),
    hookSize: optionalText(value, 'hookSize'),
    yarn: parseYarn(value.yarn),
    amountUsed: parseQuantity(value.amountUsed, 'amountUsed'),
    coverPhotoId: optionalText(value, 'coverPhotoId'),
    completedAt: value.completedAt === undefined ? undefined : requiredDate(value, 'completedAt'),
    sourceCompletedProjectId: optionalText(value, 'sourceCompletedProjectId'),
    createdAt: requiredDate(value, 'createdAt'),
    updatedAt: requiredDate(value, 'updatedAt'),
    schemaVersion: 1 as const,
  });
}

export function getSafePatternUrl(value?: string) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function compareProjects(left: Project, right: Project) {
  return left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id);
}
