/** Local, explainable training guidance. These are starting points, not a medical assessment. */
export type Goal = "strength" | "muscle" | "fitness";
export type Sport = "run" | "bike" | "swim";
export type ExerciseCategory = "push" | "pull" | "legs" | "core";

export interface Profile {
  name: string;
  goal: Goal;
  level: "beginner" | "intermediate";
  daysPerWeek: 2 | 3 | 4;
}

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  description: string;
  easier: string;
  harder: string;
  repRange: [number, number];
}

export interface WorkoutSet {
  id: string;
  reps: number;
  /** Added external weight only; bodyweight is recorded as 0 kg. */
  loadKg: number;
  /** Estimated repetitions in reserve; 0 means no further good repetition. */
  rir: number;
}

export interface ExerciseEntry {
  exerciseId: string;
  /** Keep assistance, equipment and leverage consistent when comparing sessions. */
  variation?: string;
  sets: WorkoutSet[];
}

export interface WorkoutSession {
  id: string;
  date: string;
  exerciseEntries: ExerciseEntry[];
  durationMin: number;
  readiness: number;
  pain: boolean;
  note: string;
  /** Whole-session perceived exertion, 1–10. Optional for older exports. */
  rpe?: number;
}

export interface CardioSession {
  id: string;
  date: string;
  sport: Sport;
  durationMin: number;
  distanceKm: number;
  rpe: number;
  note: string;
}

export interface AppData {
  version: 1;
  profile: Profile;
  workouts: WorkoutSession[];
  cardio: CardioSession[];
}

export const DEFAULT_PROFILE: Profile = {
  name: "",
  goal: "strength",
  level: "intermediate",
  daysPerWeek: 3,
};

export const EXERCISES: Exercise[] = [
  {
    id: "push-up",
    name: "Fekvőtámasz",
    category: "push",
    repRange: [6, 12],
    description:
      "Tartsd egy vonalban a törzsed, és csak kényelmes, kontrollált mozgástartományban dolgozz.",
    easier: "Magas korláton végzett fekvőtámasz",
    harder: "Alacsonyabb támasz, majd lábemelt fekvőtámasz",
  },
  {
    id: "inverted-row",
    name: "Fordított evezés",
    category: "pull",
    repRange: [6, 12],
    description:
      "Stabil, alacsony rúdon húzd a mellkasod a rúd felé, a törzsed végig maradjon feszes.",
    easier: "Hajlított térd, magasabb rúd",
    harder: "Nyújtott láb, vízszintesebb testhelyzet",
  },
  {
    id: "squat",
    name: "Guggolás",
    category: "legs",
    repRange: [8, 15],
    description:
      "Stabil talppal, kontrolláltan ereszkedj a számodra kényelmes mélységig.",
    easier: "Kapaszkodással végzett guggolás",
    harder: "Szünet az alsó helyzetben, később hozzáadott súly",
  },
  {
    id: "pull-up",
    name: "Húzódzkodás",
    category: "pull",
    repRange: [4, 8],
    description:
      "Lendület nélkül húzd magad felfelé. Csak stabil rúdon és fájdalommentes tartományban dolgozz.",
    easier: "Gumiszalagos vagy lábbal segített húzódzkodás",
    harder: "Kevesebb segítség, majd kis hozzáadott súly",
  },
  {
    id: "dip",
    name: "Tolódzkodás",
    category: "push",
    repRange: [6, 10],
    description:
      "Stabil párhuzamos korláton, kényelmes vállhelyzettel és kontrollált mélységgel dolgozz.",
    easier: "Lábbal segített tolódzkodás vagy magas támaszos fekvőtámasz",
    harder: "Kevesebb segítség, majd kis hozzáadott súly",
  },
  {
    id: "split-squat",
    name: "Osztott guggolás",
    category: "legs",
    repRange: [8, 12],
    description:
      "Mindkét oldalon végezd el a rögzített ismétlésszámot; a gyengébb oldalhoz igazítsd a terhelést.",
    easier: "Kapaszkodás és kisebb mozgástartomány",
    harder: "Hozzáadott súly, később hátsó láb megemelése",
  },
  {
    id: "knee-raise",
    name: "Térdemelés függésben",
    category: "core",
    repRange: [8, 15],
    description:
      "Lendület nélkül emeld a térded. Ha a fogásod elfárad, válassz fekvő változatot.",
    easier: "Hanyatt fekvő térdhúzás",
    harder: "Kontrollált lábemelés nyújtottabb térddel",
  },
  {
    id: "pike-push-up",
    name: "Csípőemelt fekvőtámasz",
    category: "push",
    repRange: [6, 10],
    description:
      "Megemelt csípővel, lassan engedd a fejed a talaj felé, kényelmes vállhelyzetben.",
    easier: "Kéztámasz stabil, magasabb felületen",
    harder: "Lábak kis mértékű megemelése stabil felületre",
  },
  {
    id: "calf-raise",
    name: "Vádliemelés",
    category: "legs",
    repRange: [12, 20],
    description:
      "Kapaszkodva, lassan emelkedj lábujjhegyre, majd kontrolláltan engedd le a sarkad.",
    easier: "Két lábon, kapaszkodva",
    harder: "Egy lábon, majd kis hozzáadott súllyal",
  },
  {
    id: "incline-push-up",
    name: "Magas támaszos fekvőtámasz",
    category: "push",
    repRange: [6, 12],
    description:
      "Stabil magas korláton vagy padon dolgozz. Az összehasonlításhoz jegyezd fel a támasz magasságát.",
    easier: "Magasabb támasz vagy fal",
    harder:
      "Alacsonyabb támasz; külön gyakorlatként később talajos fekvőtámasz",
  },
  {
    id: "assisted-pull-up",
    name: "Segített húzódzkodás",
    category: "pull",
    repRange: [4, 8],
    description:
      "Gumiszalaggal vagy lábbal segítve dolgozz. Mindig jegyezd fel a segítség módját és mértékét.",
    easier: "Erősebb gumiszalag vagy több lábsegítség",
    harder:
      "Kicsivel kevesebb segítség; később külön gyakorlatként húzódzkodás",
  },
  {
    id: "step-up",
    name: "Fellépés padra",
    category: "legs",
    repRange: [8, 12],
    description:
      "Csak stabil, csúszásmentes, megfelelő magasságú felületre lépj fel. Az ismétlést oldalanként rögzítsd.",
    easier: "Alacsonyabb fellépő és könnyű kapaszkodás",
    harder: "Azonos magasságon kis hozzáadott súly",
  },
];

export function samplePlan(profile: Profile = DEFAULT_PROFILE): Exercise[] {
  const ids =
    profile.level === "intermediate"
      ? ["squat", "push-up", "inverted-row", "split-squat", "knee-raise"]
      : ["squat", "push-up", "inverted-row", "knee-raise"];
  return ids.map((id) => EXERCISES.find((exercise) => exercise.id === id)!);
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const sessionTime = (session: { date: string }) =>
  new Date(session.date).getTime();

function pastSessions(sessions: WorkoutSession[], now: Date) {
  return sessions
    .filter(
      (session) =>
        Number.isFinite(sessionTime(session)) &&
        sessionTime(session) <= now.getTime(),
    )
    .sort((a, b) => sessionTime(b) - sessionTime(a));
}

/** A deliberately simple caution flag, not an estimate of equivalent muscular load. */
function recentDemandingCardio(
  sessions: CardioSession[],
  now: Date,
): CardioSession[] {
  return sessions
    .filter((session) => {
      const age = now.getTime() - sessionTime(session);
      return (
        Number.isFinite(age) &&
        age >= 0 &&
        age < DAY_MS &&
        session.rpe >= 7 &&
        session.durationMin >= 20
      );
    })
    .sort((a, b) => sessionTime(b) - sessionTime(a));
}

const sportNames: Record<Sport, string> = {
  run: "futás",
  bike: "kerékpározás",
  swim: "úszás",
};

export interface RecoveryStatus {
  status: "ready" | "caution" | "rest";
  title: string;
  reason: string;
  hoursSinceLast: number | null;
  targetHours: number;
}

export function getRecoveryStatus(
  sessions: WorkoutSession[],
  now = new Date(),
  readiness = 3,
  pain = false,
  cardio: CardioSession[] = [],
): RecoveryStatus {
  const last = pastSessions(sessions, now)[0];
  const hours = last ? (now.getTime() - sessionTime(last)) / HOUR_MS : null;
  const hard =
    last &&
    ((last.rpe ?? 0) >= 8 ||
      last.exerciseEntries.some((entry) =>
        entry.sets.some((set) => set.rir <= 1),
      ));
  const targetHours = hard ? 48 : 24;
  if (pain)
    return {
      status: "rest",
      title: "A fájdalom az első jelzés",
      hoursSinceLast: hours,
      targetHours,
      reason:
        "Állítsd le a fájdalmat kiváltó mozgást. Éles, romló vagy tartós panasszal kérj szakmai segítséget.",
    };
  if (readiness <= 2)
    return {
      status: "rest",
      title: "Ma könnyíts a terven",
      hoursSinceLast: hours,
      targetHours,
      reason:
        "Alacsony készenlétnél ne növeld a terhelést. Pihenő vagy könnyű, beszélgetős mozgás is jó választás.",
    };
  const hardCardio = recentDemandingCardio(cardio, now)[0];
  if (hardCardio)
    return {
      status: "caution",
      title: "A kardió is része a terhelésnek",
      hoursSinceLast: hours,
      targetHours,
      reason: `Az elmúlt 24 órában ${hardCardio.durationMin} perc nehéz ${sportNames[hardCardio.sport]} szerepel a naplóban (RPE ${hardCardio.rpe}). A mai erősítést igazítsd a közérzetedhez. A 24 óra óvatossági jelzés, nem mért regeneráció vagy azonos izomterhelés.`,
    };
  if (hours !== null && hours < targetHours)
    return {
      status: "caution",
      title: "Adj időt a regenerációnak",
      hoursSinceLast: hours,
      targetHours,
      reason: hard
        ? "A legutóbbi erősítő edzés nehéz volt. Ugyanazokat az izmokat ma kíméld; könnyű séta vagy más izomcsoport választható."
        : "A legutóbbi erősítés friss. A közérzet, izomláz és bemelegítés alapján dönts a mai terhelésről.",
    };
  return {
    status: "ready",
    title: "Jöhet a következő lépés",
    hoursSinceLast: hours,
    targetHours,
    reason:
      "Ha jól aludtál, nincs fájdalom, és a bemelegítés jól esik, végezheted a tervezett edzést. Az eltelt idő önmagában nem mér regenerációt.",
  };
}

export interface ExerciseRecommendation {
  status: "start" | "progress" | "maintain" | "recover";
  title: string;
  reason: string;
  sets: number;
  repRange: [number, number];
  restSeconds: number;
  targetRir: number;
  /** Suggested added weight; 0 kg does not include bodyweight. */
  loadKg: number;
  progression: string;
}

export function getExerciseRecommendation(
  exerciseOrId: Exercise | string,
  sessions: WorkoutSession[],
  profile: Profile = DEFAULT_PROFILE,
  readiness = 3,
  pain = false,
  now = new Date(),
  variation?: string,
  cardio: CardioSession[] = [],
): ExerciseRecommendation {
  const exercise =
    typeof exerciseOrId === "string"
      ? EXERCISES.find((item) => item.id === exerciseOrId)
      : exerciseOrId;
  if (!exercise) throw new Error("Ismeretlen gyakorlat.");
  const normalizeVariation = (value?: string) =>
    (value ?? "").trim().toLocaleLowerCase("hu-HU");
  const exerciseHistory = pastSessions(sessions, now).filter((session) =>
    session.exerciseEntries.some(
      (entry) => entry.exerciseId === exercise.id && entry.sets.length > 0,
    ),
  );
  const history =
    variation === undefined
      ? exerciseHistory
      : exerciseHistory.filter((session) => {
          const current = session.exerciseEntries.find(
            (item) => item.exerciseId === exercise.id,
          )!;
          return (
            normalizeVariation(current.variation) ===
            normalizeVariation(variation)
          );
        });
  const last = history[0];
  const entry = last?.exerciseEntries.find(
    (item) => item.exerciseId === exercise.id,
  );
  // With warm-up/back-off sets, do not prefill the heaviest recorded load.
  const previousLoad = entry?.sets.length
    ? Math.min(...entry.sets.map((set) => set.loadKg))
    : 0;
  const repRange: [number, number] =
    profile.goal === "strength" && exercise.category !== "core"
      ? [4, 8]
      : [...exercise.repRange];
  const base: ExerciseRecommendation = {
    status: "start",
    title: "Építs stabil alapot",
    reason:
      "Válassz olyan változatot, amellyel a céltartományban marad 2–3 szabályos ismétlés tartalékban.",
    sets: profile.level === "beginner" ? 2 : 3,
    repRange,
    restSeconds:
      profile.goal === "strength"
        ? 180
        : exercise.category === "core"
          ? 90
          : 120,
    targetRir: 2,
    loadKg: previousLoad,
    progression:
      "Először az ismétlések számát növeld a tartományon belül. Egyszerre csak egy dolgon változtass.",
  };
  if (pain)
    return {
      ...base,
      status: "recover",
      title: "Most ne növeld a terhelést",
      sets: 0,
      reason:
        "Ne folytasd a fájdalmas gyakorlatot. Tartós, erős vagy romló fájdalom esetén kérj szakmai segítséget.",
      progression:
        "Csak fájdalommentes mozgást válassz; a napló nem tudja megállapítani a fájdalom okát.",
    };
  if (readiness <= 2)
    return {
      ...base,
      status: "recover",
      title: "Könnyebb napot tervezz",
      sets: 1,
      targetRir: 4,
      reason:
        "Az alacsony készenlét miatt ma ne emelj terhelést. Csökkentsd a sorozatokat, vagy tarts pihenőt.",
      progression:
        "A következő kipihent edzésen térj vissza a megszokott terheléshez.",
    };
  const latestExercise = exerciseHistory[0];
  const latestEntry = latestExercise?.exerciseEntries.find(
    (item) => item.exerciseId === exercise.id,
  );
  const latestAgeHours = latestExercise
    ? (now.getTime() - sessionTime(latestExercise)) / HOUR_MS
    : Infinity;
  const recentHard =
    latestExercise &&
    ((latestExercise.rpe ?? 0) >= 8 ||
      latestEntry?.sets.some((set) => set.rir <= 1));
  const recoveryHours = recentHard ? 48 : 24;
  if (latestAgeHours < recoveryHours)
    return {
      ...base,
      status: "recover",
      title: "Ezt a mozgást ma kíméld",
      sets: 1,
      targetRir: 4,
      reason: `A legutóbbi ilyen edzés ${Math.max(0, Math.floor(latestAgeHours))} órája volt${recentHard ? ", magas erőkifejtéssel" : ""}. Ez óvatossági jelzés, nem pontos regenerációmérés.`,
      progression:
        "Ma könnyű technikázás, más izomcsoport vagy pihenő jöhet szóba. Ne növeld a terhelést.",
    };
  const overlappingCardio = recentDemandingCardio(cardio, now).find(
    (session) =>
      exercise.category === "legs"
        ? session.sport === "run" || session.sport === "bike"
        : session.sport === "swim",
  );
  if (overlappingCardio)
    return {
      ...base,
      status: "recover",
      title: "Könnyíts a nehéz kardió után",
      sets: Math.max(1, base.sets - 1),
      targetRir: 3,
      reason: `Az elmúlt 24 órában ${overlappingCardio.durationMin} perc nehéz ${sportNames[overlappingCardio.sport]} szerepel a naplóban (RPE ${overlappingCardio.rpe}). Ennél a mozgáscsoportnál ez óvatossági jelzés; ma ne emelj terhelést. A sportágak izomterhelése nem tekinthető azonosnak.`,
      progression:
        "Csökkents a sorozatokon, hagyj legalább 3 ismétlést tartalékban. Ha a bemelegítés is szokatlanul nehéz, válassz pihenőt. A 24 órás ablak egyszerű szabály, nem személyre szabott regenerációmérés.",
    };
  if (!last || !entry) return base;
  const ageHours = (now.getTime() - sessionTime(last)) / HOUR_MS;
  if (ageHours > 28 * 24)
    return {
      ...base,
      status: "maintain",
      title: "Térj vissza fokozatosan",
      sets: 2,
      loadKg: 0,
      reason:
        "Több mint négy hete nem rögzítettél ilyen gyakorlatot. Az előző eredmény helyett a mai könnyű bemelegítésből indulj ki.",
      progression:
        "Válassz könnyebb változatot vagy kisebb súlyt; hagyj 3–4 ismétlést tartalékban.",
      targetRir: 3,
    };
  const recent = history.slice(0, 2);
  const comparable =
    recent.length === 2 &&
    sessionTime(recent[0]) - sessionTime(recent[1]) >= 24 * HOUR_MS &&
    recent.every((session) => {
      const current = session.exerciseEntries.find(
        (item) => item.exerciseId === exercise.id,
      )!;
      return (
        !session.pain &&
        session.readiness >= 3 &&
        now.getTime() - sessionTime(session) <= 28 * DAY_MS &&
        current.sets.length === entry.sets.length &&
        current.sets.length >= base.sets &&
        normalizeVariation(current.variation) ===
          normalizeVariation(entry.variation) &&
        current.sets.every(
          (set) =>
            set.loadKg === previousLoad &&
            set.reps >= repRange[1] &&
            set.rir >= 2,
        )
      );
    });
  if (comparable) {
    const increment = Math.min(
      2.5,
      Math.max(0.5, Math.round(previousLoad * 0.025 * 2) / 2),
    );
    return {
      ...base,
      status: "progress",
      title: "Készen állsz a kis emelésre",
      reason:
        "Két egymást követő, azonos változattal, súllyal és sorozatszámmal naplózott edzésen minden sorozat elérte a felső ismétléshatárt, legalább 2 RIR mellett.",
      loadKg: previousLoad > 0 ? previousLoad + increment : 0,
      progression:
        previousLoad > 0
          ? `Próbálj +${increment.toLocaleString("hu-HU")} kg hozzáadott súlyt, és indulj a céltartomány aljáról. Ha nem marad 2 RIR, lépj vissza.`
          : `Próbálj egy kicsivel nehezebb változatot: ${exercise.harder.toLocaleLowerCase("hu-HU")}. Indulj a céltartomány aljáról, 2–3 RIR-rel.`,
    };
  }
  return {
    ...base,
    status: "maintain",
    title: "Maradj ennél, építs ismétlést",
    reason:
      "A súly vagy nehézség emeléséhez még nincs két megfelelő, összehasonlítható edzés. A jó technika és a tartalék fontosabb a gyors emelésnél.",
  };
}

export interface WeeklyStats {
  workouts: number;
  cardioSessions: number;
  totalMinutes: number;
  strengthSets: number;
  cardioMinutes: number;
  /** Sum of duration × recorded session RPE; arbitrary units, not mechanical load. */
  loadAu: number;
  includedLoadSessions: number;
  totalSessions: number;
  activeDays: number;
}

/** The current calendar week, starting Monday, in the device's local time zone. */
export function getWeeklyStats(
  workouts: WorkoutSession[],
  cardio: CardioSession[],
  now = new Date(),
): WeeklyStats {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const inWeek = (session: { date: string }) =>
    sessionTime(session) >= start.getTime() &&
    sessionTime(session) <= now.getTime();
  const strength = workouts.filter(inWeek);
  const endurance = cardio.filter(inWeek);
  const all = [...strength, ...endurance];
  const localDay = (date: string) => {
    const value = new Date(date);
    return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
  };
  return {
    workouts: strength.length,
    cardioSessions: endurance.length,
    totalMinutes: all.reduce((sum, session) => sum + session.durationMin, 0),
    strengthSets: strength.reduce(
      (sum, session) =>
        sum +
        session.exerciseEntries.reduce(
          (count, entry) => count + entry.sets.length,
          0,
        ),
      0,
    ),
    cardioMinutes: endurance.reduce(
      (sum, session) => sum + session.durationMin,
      0,
    ),
    loadAu: all.reduce(
      (sum, session) =>
        sum +
        (session.rpe === undefined ? 0 : session.durationMin * session.rpe),
      0,
    ),
    includedLoadSessions: all.filter((session) => session.rpe !== undefined)
      .length,
    totalSessions: all.length,
    activeDays: new Set(all.map((session) => localDay(session.date))).size,
  };
}

export function formatDuration(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export type BackupValidation =
  | { valid: true; data: AppData }
  | { valid: false; error: string };
type RecordValue = Record<string, unknown>;
const isRecord = (input: unknown): input is RecordValue =>
  typeof input === "object" && input !== null && !Array.isArray(input);
const isNumber = (input: unknown, min: number, max: number): input is number =>
  typeof input === "number" &&
  Number.isFinite(input) &&
  input >= min &&
  input <= max;
const isInteger = (input: unknown, min: number, max: number): input is number =>
  isNumber(input, min, max) && Number.isInteger(input);
const isText = (input: unknown, max = 4000): input is string =>
  typeof input === "string" && input.length <= max;
const isId = (input: unknown): input is string =>
  isText(input, 150) && input.trim().length > 0;
const hasUniqueIds = (items: { id: string }[]) =>
  new Set(items.map((item) => item.id)).size === items.length;

function isDate(input: unknown): input is string {
  if (
    typeof input !== "string" ||
    !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(
      input,
    )
  )
    return false;
  const value = new Date(input);
  if (!Number.isFinite(value.getTime())) return false;
  // Check the calendar date independently so normalized dates such as February 31 are rejected.
  const [year, month, day] = input.slice(0, 10).split("-").map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  return (
    calendar.getUTCFullYear() === year &&
    calendar.getUTCMonth() === month - 1 &&
    calendar.getUTCDate() === day
  );
}

/** Validate imports and stored data before allowing them to replace the current journal. */
export function validateBackup(input: unknown): BackupValidation {
  const invalid = (error: string): BackupValidation => ({
    valid: false,
    error,
  });
  if (!isRecord(input) || input.version !== 1)
    return invalid(
      "Nem támogatott mentési formátum. Válassz ebből az alkalmazásból exportált, 1-es verziójú mentést.",
    );
  const profile = input.profile;
  if (
    !isRecord(profile) ||
    !isText(profile.name, 80) ||
    !["strength", "muscle", "fitness"].includes(profile.goal as string) ||
    !["beginner", "intermediate"].includes(profile.level as string) ||
    ![2, 3, 4].includes(profile.daysPerWeek as number)
  )
    return invalid("A mentés profiladatai hiányosak vagy hibásak.");
  if (
    !Array.isArray(input.workouts) ||
    !Array.isArray(input.cardio) ||
    input.workouts.length > 10000 ||
    input.cardio.length > 10000
  )
    return invalid("Az edzéslista hiányzik vagy túl nagy.");
  const workouts: WorkoutSession[] = [];
  const cardio: CardioSession[] = [];
  for (const item of input.workouts) {
    if (
      !isRecord(item) ||
      !isId(item.id) ||
      !isDate(item.date) ||
      !isNumber(item.durationMin, 1, 600) ||
      !isInteger(item.readiness, 1, 5) ||
      typeof item.pain !== "boolean" ||
      !isText(item.note) ||
      (item.rpe !== undefined && !isNumber(item.rpe, 1, 10)) ||
      !Array.isArray(item.exerciseEntries) ||
      item.exerciseEntries.length < 1 ||
      item.exerciseEntries.length > 50
    )
      return invalid(
        "Egy erősítő edzés adatai hibásak: ellenőrizd a dátumot, időtartamot és sorozatokat.",
      );
    const exerciseEntries: ExerciseEntry[] = [];
    const setIds = new Set<string>();
    for (const entry of item.exerciseEntries) {
      if (
        !isRecord(entry) ||
        !EXERCISES.some((exercise) => exercise.id === entry.exerciseId) ||
        (entry.variation !== undefined && !isText(entry.variation, 120)) ||
        !Array.isArray(entry.sets) ||
        entry.sets.length < 1 ||
        entry.sets.length > 50 ||
        exerciseEntries.some(
          (existing) => existing.exerciseId === entry.exerciseId,
        )
      )
        return invalid(
          "A mentésben ismeretlen vagy ismétlődő gyakorlat, illetve hibás sorozatlista található.",
        );
      const sets: WorkoutSet[] = [];
      for (const set of entry.sets) {
        if (
          !isRecord(set) ||
          !isId(set.id) ||
          setIds.has(set.id) ||
          !isInteger(set.reps, 1, 300) ||
          !isNumber(set.loadKg, 0, 1000) ||
          !isNumber(set.rir, 0, 10)
        )
          return invalid(
            "Érvénytelen sorozat: az ismétlés legyen 1–300, a hozzáadott súly legalább 0 kg, a RIR pedig 0–10.",
          );
        setIds.add(set.id);
        sets.push({
          id: set.id,
          reps: set.reps,
          loadKg: set.loadKg,
          rir: set.rir,
        });
      }
      exerciseEntries.push({
        exerciseId: entry.exerciseId as string,
        sets,
        ...(entry.variation !== undefined
          ? { variation: (entry.variation as string).trim() }
          : {}),
      });
    }
    workouts.push({
      id: item.id,
      date: item.date,
      durationMin: item.durationMin,
      readiness: item.readiness,
      pain: item.pain,
      note: item.note,
      exerciseEntries,
      ...(item.rpe !== undefined ? { rpe: item.rpe as number } : {}),
    });
  }
  for (const item of input.cardio) {
    if (
      !isRecord(item) ||
      !isId(item.id) ||
      !isDate(item.date) ||
      !["run", "bike", "swim"].includes(item.sport as string) ||
      !isNumber(item.durationMin, 1, 1440) ||
      !isNumber(item.distanceKm, 0, 1000) ||
      !isNumber(item.rpe, 1, 10) ||
      !isText(item.note)
    )
      return invalid(
        "Egy kardióedzés adatai hibásak: ellenőrizd a sportot, dátumot, időtartamot és RPE-t.",
      );
    cardio.push({
      id: item.id,
      date: item.date,
      sport: item.sport as Sport,
      durationMin: item.durationMin,
      distanceKm: item.distanceKm,
      rpe: item.rpe,
      note: item.note,
    });
  }
  if (!hasUniqueIds([...workouts, ...cardio]))
    return invalid("A mentés ismétlődő edzésazonosítókat tartalmaz.");
  return {
    valid: true,
    data: {
      version: 1,
      profile: {
        name: profile.name,
        goal: profile.goal as Goal,
        level: profile.level as Profile["level"],
        daysPerWeek: profile.daysPerWeek as Profile["daysPerWeek"],
      },
      workouts,
      cardio,
    },
  };
}
