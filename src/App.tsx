import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bike,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  History,
  LayoutDashboard,
  Leaf,
  Menu,
  Minus,
  MoreHorizontal,
  Mountain,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Timer,
  Trash2,
  TrendingUp,
  Waves,
  X,
} from "lucide-react";
import {
  DEFAULT_PROFILE,
  EXERCISES,
  getExerciseRecommendation,
  getRecoveryStatus,
  getWeeklyStats,
  samplePlan,
  validateBackup,
} from "./domain";
import type {
  AppData,
  CardioSession,
  ExerciseEntry,
  Profile,
  WorkoutSession,
} from "./domain";

const STORAGE_KEY = "lendulet-data-v1";
const DRAFT_KEY = "lendulet-workout-v1";
const GUIDE_URL = `${import.meta.env.BASE_URL}tudomany.html`;
const uid = () => crypto.randomUUID();
const huDate = (date: string | Date, options?: Intl.DateTimeFormatOptions) =>
  new Date(date).toLocaleDateString(
    "hu-HU",
    options ?? { month: "short", day: "numeric" },
  );
const dayKey = (date: string | Date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const localDateTime = () => {
  const d = new Date();
  return `${dayKey(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const blankData = (): AppData => ({
  version: 1,
  profile: { ...DEFAULT_PROFILE },
  workouts: [],
  cardio: [],
});
const sportNames = { run: "Futás", bike: "Kerékpározás", swim: "Úszás" };
const sportIcons = { run: Footprints, bike: Bike, swim: Waves };
const labels = { push: "Nyomás", pull: "Húzás", legs: "Láb", core: "Törzs" };
type Tab = "overview" | "workout" | "progress" | "history";
interface Draft {
  startedAt: string;
  entries: ExerciseEntry[];
  readiness: number;
  pain: boolean;
  note: string;
  rpe: number;
  restEnd: number | null;
}

function initialData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { data: blankData(), error: "" };
    const parsed = validateBackup(JSON.parse(raw));
    if (!parsed.valid) return { data: blankData(), error: parsed.error };
    return { data: parsed.data, error: "" };
  } catch {
    return {
      data: blankData(),
      error:
        "A korábbi adatokat nem sikerült beolvasni. Visszaállíthatod egy mentésből, vagy letöltheted a tárolt adatot.",
    };
  }
}

function initialDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (
      !Array.isArray(d.entries) ||
      d.entries.length > 50 ||
      !Number.isFinite(Date.parse(d.startedAt)) ||
      Date.parse(d.startedAt) > Date.now() + 60000
    )
      return null;
    const entries = d.entries.map((e: ExerciseEntry) => ({
      ...e,
      sets:
        Array.isArray(e.sets) && e.sets.length === 0
          ? [{ id: "check-" + e.exerciseId, reps: 1, loadKg: 0, rir: 2 }]
          : e.sets,
    }));
    const check = validateBackup({
      ...blankData(),
      workouts: entries.length
        ? [
            {
              id: "draft",
              date: d.startedAt,
              exerciseEntries: entries,
              durationMin: 1,
              readiness: d.readiness,
              pain: d.pain,
              rpe: d.rpe,
              note: d.note,
            },
          ]
        : [],
    });
    if (
      !check.valid ||
      ![1, 2, 3, 4, 5].includes(d.readiness) ||
      typeof d.pain !== "boolean" ||
      typeof d.note !== "string" ||
      !Number.isFinite(d.rpe) ||
      d.rpe < 1 ||
      d.rpe > 10 ||
      (d.restEnd !== null &&
        (!Number.isFinite(d.restEnd) || typeof d.restEnd !== "number"))
    )
      return null;
    return d;
  } catch {
    return null;
  }
}

function download(content: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function App() {
  const [initial] = useState(initialData);
  const [data, setData] = useState<AppData>(initial.data);
  const [storageError, setStorageError] = useState(initial.error);
  const [storageLocked, setStorageLocked] = useState(!!initial.error);
  const [tab, setTab] = useState<Tab>("overview");
  const [draft, setDraft] = useState<Draft | null>(initialDraft);
  const [settings, setSettings] = useState(false);
  const [cardioOpen, setCardioOpen] = useState(false);
  const [picker, setPicker] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [tick, setTick] = useState(Date.now());
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const previousRest = useRef<number | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (storageLocked) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      setStorageError(
        "A mentés nem sikerült: a böngésző tárhelye megtelt vagy nem érhető el. Készíts biztonsági mentést az adataidról.",
      );
    }
  }, [data, storageLocked]);
  useEffect(() => {
    try {
      if (draft) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      else localStorage.removeItem(DRAFT_KEY);
    } catch {
      setStorageError(
        "A folyamatban lévő edzést nem sikerült helyben menteni.",
      );
    }
  }, [draft]);
  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const on = () => setOnline(true),
      off = () => setOnline(false);
    const install = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("beforeinstallprompt", install);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("beforeinstallprompt", install);
    };
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const restRemaining = draft?.restEnd
    ? Math.max(0, Math.ceil((draft.restEnd - tick) / 1000))
    : 0;
  useEffect(() => {
    if (
      draft?.restEnd &&
      restRemaining === 0 &&
      previousRest.current !== draft.restEnd
    ) {
      previousRest.current = draft.restEnd;
      navigator.vibrate?.([150, 100, 150]);
      setToast("Letelt a pihenő. Ha készen állsz, jöhet a következő sorozat.");
    }
  }, [restRemaining, draft?.restEnd]);
  useEffect(() => {
    if (!settings && !cardioOpen && !picker && !detail) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, [settings, cardioOpen, picker, detail]);

  const stats = getWeeklyStats(data.workouts, data.cardio);
  const recovery = getRecoveryStatus(
    data.workouts,
    new Date(),
    3,
    false,
    data.cardio,
  );
  const plan = samplePlan(data.profile);
  const completedDays = new Set(
    [...data.workouts, ...data.cardio].map((s) => dayKey(s.date)),
  );
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  const allSessions = [
    ...data.workouts.map((s) => ({ ...s, kind: "strength" as const })),
    ...data.cardio.map((s) => ({ ...s, kind: "cardio" as const })),
  ].sort((a, b) => +new Date(b.date) - +new Date(a.date));

  function navigate(next: Tab) {
    setTab(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function beginWorkout() {
    if (!draft)
      setDraft({
        startedAt: new Date().toISOString(),
        entries: plan.map((e) => ({
          exerciseId: e.id,
          sets: [],
          variation:
            [...data.workouts]
              .sort((a, b) => +new Date(b.date) - +new Date(a.date))
              .find((s) => s.exerciseEntries.some((x) => x.exerciseId === e.id))
              ?.exerciseEntries.find((x) => x.exerciseId === e.id)?.variation ??
            "",
        })),
        readiness: 3,
        pain: false,
        note: "",
        rpe: 6,
        restEnd: null,
      });
    navigate("workout");
  }
  function addSet(index: number, reps: number, loadKg: number, rir: number) {
    if (!draft || draft.pain) return;
    if (draft.entries[index].sets.length >= 50) {
      setToast("Egy gyakorlathoz legfeljebb 50 sorozat rögzíthető.");
      return;
    }
    const rec = getExerciseRecommendation(
      draft.entries[index].exerciseId,
      data.workouts,
      data.profile,
      draft.readiness,
      draft.pain,
      new Date(),
      draft.entries[index].variation ?? "",
      data.cardio,
    );
    setDraft({
      ...draft,
      entries: draft.entries.map((e, i) =>
        i === index
          ? { ...e, sets: [...e.sets, { id: uid(), reps, loadKg, rir }] }
          : e,
      ),
      restEnd: Date.now() + rec.restSeconds * 1000,
    });
    setToast("Sorozat rögzítve. Indul a pihenő.");
  }
  function finishWorkout() {
    if (!draft) return;
    const entries = draft.entries.filter((e) => e.sets.length > 0);
    if (!entries.length) {
      setToast("Előbb rögzíts legalább egy sorozatot.");
      return;
    }
    const session: WorkoutSession = {
      id: uid(),
      date: draft.startedAt,
      exerciseEntries: entries,
      durationMin: Math.max(
        1,
        Math.min(
          600,
          Math.round((Date.now() - Date.parse(draft.startedAt)) / 60000),
        ),
      ),
      readiness: draft.readiness,
      pain: draft.pain,
      note: draft.note,
      rpe: draft.rpe,
    };
    setData({ ...data, workouts: [...data.workouts, session] });
    setDraft(null);
    navigate("history");
    setToast("Szép munka! Az edzésedet elmentettük.");
  }
  async function importBackup(file?: File) {
    if (!file) return;
    if (file.size > 5_000_000) {
      setToast("Legfeljebb 5 MB-os mentést válassz.");
      return;
    }
    try {
      const result = validateBackup(JSON.parse(await file.text()));
      if (!result.valid) {
        setToast(result.error);
        return;
      }
      if (
        !window.confirm(
          "A visszaállítás lecseréli a jelenlegi naplót. Folytatod?",
        )
      )
        return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
      setData(result.data);
      setStorageLocked(false);
      setStorageError("");
      setToast("A biztonsági mentést visszaállítottuk.");
    } catch {
      setToast("Ez a fájl nem olvasható Lendület-mentésként.");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  const nav = [
    { id: "overview" as Tab, name: "Áttekintés", icon: LayoutDashboard },
    { id: "workout" as Tab, name: "Edzés", icon: Dumbbell },
    { id: "progress" as Tab, name: "Fejlődés", icon: TrendingUp },
    { id: "history" as Tab, name: "Napló", icon: History },
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("overview");
          }}
        >
          <span className="brand-icon">
            <Activity size={23} />
          </span>{" "}
          lendület<span className="brand-dot">.</span>
        </a>
        <div className="sidebar-label">A SAJÁT TEMPÓDBAN</div>
        <nav aria-label="Fő navigáció">
          {nav.map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${tab === id ? "active" : ""}`}
              onClick={() => navigate(id)}
            >
              <Icon size={20} />
              <span>{name}</span>
              {id === "workout" && draft && <span className="live-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="tiny-icon">
            <Leaf size={20} />
          </span>
          <h3>A rendszeresség számít.</h3>
          <p>
            Egy kicsivel erősebb.
            <br />
            Egy nappal közelebb.
          </p>
          <a href={GUIDE_URL} target="_blank" rel="noreferrer">
            Az ajánlások háttere <ArrowUpRight size={15} />
          </a>
        </div>
        <button className="profile-button" onClick={() => setSettings(true)}>
          <span className="avatar">
            {data.profile.name?.charAt(0).toLocaleUpperCase("hu-HU") || "T"}
          </span>
          <span>
            <strong>{data.profile.name || "A te profilod"}</strong>
            <small>Beállítások és mentés</small>
          </span>
          <Settings2 size={18} />
        </button>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <span className="breadcrumb">
            A TE EDZÉSNAPLÓD <span>/</span>{" "}
            <b>{nav.find((n) => n.id === tab)?.name}</b>
          </span>
          <div className="topbar-right">
            <span className="connection">
              <i className={online ? "" : "offline"} />
              {online ? "Helyi adattárolás" : "Offline mód"}
            </span>
            <button
              className="icon-button"
              aria-label="Beállítások"
              onClick={() => setSettings(true)}
            >
              <Settings2 size={20} />
            </button>
          </div>
        </header>
        <div className="mobile-header">
          <span className="brand">
            <span className="brand-icon">
              <Activity size={20} />
            </span>
            lendület<span className="brand-dot">.</span>
          </span>
          <button
            className="avatar"
            onClick={() => setSettings(true)}
            aria-label="Profil és beállítások"
          >
            {data.profile.name?.charAt(0).toLocaleUpperCase("hu-HU") || "T"}
          </button>
        </div>
        <main>
          {storageError && (
            <div className="alert error">
              <ShieldCheck size={20} />
              <div>
                {storageError}
                <button
                  className="text-button"
                  onClick={() =>
                    download(
                      localStorage.getItem(STORAGE_KEY) || "{}",
                      "lendulet-helyreallitas.json",
                    )
                  }
                >
                  Tárolt adatok letöltése
                </button>
                <button
                  className="text-button"
                  onClick={() => setSettings(true)}
                >
                  Helyreállítás és beállítások
                </button>
              </div>
            </div>
          )}
          {tab === "overview" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">
                    {huDate(now, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <h1>
                    {data.profile.name
                      ? `Szia, ${data.profile.name}!`
                      : "Minden edzés számít."}
                    <span className="heading-dot">✳</span>
                  </h1>
                  <p>Építs erőt. Találd meg a ritmusod.</p>
                </div>
                <button
                  className="button secondary desktop-only"
                  onClick={() => setCardioOpen(true)}
                >
                  <Plus size={17} />
                  Aktivitás hozzáadása
                </button>
              </div>
              <section className="hero-card">
                <div className="hero-content">
                  <span className="pill">
                    <i /> A TE KÖVETKEZŐ LÉPÉSED
                  </span>
                  <h2>
                    {draft
                      ? "Folytasd, ahol abbahagytad."
                      : recovery.status === "rest"
                        ? "A pihenés is fejlődés."
                        : "Ma magadért mozdulsz."}
                  </h2>
                  <p>
                    {draft
                      ? "Az edzésed és a rögzített sorozataid itt várnak."
                      : recovery.status === "rest"
                        ? recovery.reason
                        : "Teljes testes kondiparkos edzés, a szintedhez igazítva. Lépésről lépésre, tudatosan."}
                  </p>
                  <div className="hero-meta">
                    <span>
                      <Dumbbell size={16} />
                      {plan.length} gyakorlat
                    </span>
                    <span>
                      <Clock3 size={16} />
                      kb. 35–50 perc
                    </span>
                    <span className="hero-level">
                      {data.profile.level === "beginner" ? "Kezdő" : "Haladóbb"}{" "}
                      szint
                    </span>
                  </div>
                  <button className="button lime" onClick={beginWorkout}>
                    {draft ? "Edzés folytatása" : "Nézzük a mai edzést"}
                    <ArrowRight size={18} />
                  </button>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="orbit orbit-three" />
                  <svg viewBox="0 0 280 280">
                    <path
                      d="M64 72h151M80 72v151M201 72v151"
                      fill="none"
                      stroke="#87a98c"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    <path
                      d="m123 108 13 34 27 9 24 37m-51-46-21 35 18 39m3-74 21-23 17-45m-38 68-23-27-16-40"
                      fill="none"
                      stroke="#d3fa8b"
                      strokeWidth="11"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="130" cy="111" r="12" fill="#d3fa8b" />
                    <path
                      d="M61 225h161"
                      stroke="#87a98c"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="art-badge">
                    <TrendingUp size={17} />
                    <span>
                      Kis lépések.
                      <br />
                      <strong>Tartós fejlődés.</strong>
                    </span>
                  </div>
                </div>
              </section>
              <div className="stats-grid">
                <Stat
                  icon={<Dumbbell size={19} />}
                  label="Heti erősítés"
                  value={`${stats.workouts}`}
                  suffix={`/ ${data.profile.daysPerWeek} alkalom`}
                  detail="A hétfőn kezdődő héten"
                />
                <Stat
                  icon={<Clock3 size={19} />}
                  label="Mozgásban töltött idő"
                  value={`${stats.totalMinutes}`}
                  suffix="perc"
                  detail="Erősítés és kardió együtt"
                />
                <Stat
                  icon={<Flame size={19} />}
                  label="Rögzített sorozatok"
                  value={`${stats.strengthSets}`}
                  suffix="szett"
                  detail="Az aktuális héten"
                />
              </div>
              <div className="dashboard-columns">
                <section className="card weekly-card">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">EGY KIS KÖVETKEZETESSÉG</p>
                      <h2>A heted mozgásban</h2>
                    </div>
                    <span className="subtle-tag">
                      {huDate(monday)} – {huDate(weekDays[6])}
                    </span>
                  </div>
                  <div className="week-days">
                    {weekDays.map((date, i) => (
                      <div
                        key={i}
                        className={`week-day ${dayKey(date) === dayKey(now) ? "today" : ""} ${completedDays.has(dayKey(date)) ? "done" : ""}`}
                      >
                        <small>
                          {["H", "K", "Sze", "Cs", "P", "Szo", "V"][i]}
                        </small>
                        <span>
                          {completedDays.has(dayKey(date)) ? (
                            <Check size={19} />
                          ) : (
                            date.getDate()
                          )}
                        </span>
                        <i />
                      </div>
                    ))}
                  </div>
                  <div className="weekly-footer">
                    <span>
                      <i className="legend-dot" />
                      Rögzített mozgás
                    </span>
                    <strong>{stats.activeDays} aktív nap ezen a héten</strong>
                  </div>
                </section>
                <section className="card recovery-card">
                  <span className="round-icon">
                    <Heart size={21} />
                  </span>
                  <p className="eyebrow">FIGYELJ MAGADRA</p>
                  <h2>{recovery.title}</h2>
                  <p>{recovery.reason}</p>
                  <a
                    href={`${GUIDE_URL}#recovery`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Miért számít a regeneráció?
                    <ArrowUpRight size={15} />
                  </a>
                </section>
              </div>
              <div className="section-heading activity-heading">
                <div>
                  <p className="eyebrow">AZ ERŐN TÚL</p>
                  <h2>Adj teret más mozgásnak is.</h2>
                </div>
                <span className="muted desktop-only">
                  A változatosság lendületben tart.
                </span>
              </div>
              <div className="sport-grid">
                {(["run", "bike", "swim"] as const).map((sport) => {
                  const Icon = sportIcons[sport];
                  return (
                    <button
                      className={`sport-card ${sport}`}
                      key={sport}
                      onClick={() => {
                        setCardioOpen(true);
                        sessionStorage.setItem("lendulet-cardio-sport", sport);
                      }}
                    >
                      <div className="sport-icon">
                        <Icon size={28} />
                      </div>
                      <div>
                        <h3>{sportNames[sport]}</h3>
                        <p>
                          {sport === "run"
                            ? "Egy könnyű kör a szabadban."
                            : sport === "bike"
                              ? "Új utak. Egyenletes tempó."
                              : "Kikapcsolás, hosszról hosszra."}
                        </p>
                      </div>
                      <ArrowUpRight size={20} />
                    </button>
                  );
                })}
              </div>
              <div className="quiet-note">
                <ShieldCheck size={16} />
                <span>
                  A naplód a saját eszközödön marad. Nincs fiók, nincs
                  adatküldés.
                </span>
                <button onClick={() => setSettings(true)}>
                  Mentés készítése <ArrowRight size={14} />
                </button>
              </div>
            </>
          )}

          {tab === "workout" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">MINŐSÉG, AZTÁN MENNYISÉG</p>
                  <h1>{draft ? "A mai edzésed" : "Készülj a következőre."}</h1>
                  <p>
                    {draft
                      ? "Rögzíts minden sorozatot. A fejlődés a részletekben van."
                      : "A javaslat a naplózott teljesítményeddel együtt változik."}
                  </p>
                </div>
                {draft && (
                  <span className="session-clock">
                    <i className="live-dot" />
                    <Clock3 size={17} />
                    {Math.max(
                      0,
                      Math.floor((tick - Date.parse(draft.startedAt)) / 60000),
                    )}{" "}
                    perc
                  </span>
                )}
              </div>
              {!draft ? (
                <>
                  <section className="card plan-intro">
                    <div>
                      <span className="round-icon">
                        <Dumbbell />
                      </span>
                      <h2>Teljes test. Stabil alapok.</h2>
                      <p>
                        Heti {data.profile.daysPerWeek} edzésre tervezve. Hagyj
                        pihenőnapot az erősítések között, és válassz a
                        technikádhoz illő nehézséget.
                      </p>
                      <button className="button primary" onClick={beginWorkout}>
                        Edzés indítása
                        <Play size={17} />
                      </button>
                    </div>
                    <div className="plan-list">
                      {plan.map((e, i) => (
                        <div key={e.id}>
                          <span>0{i + 1}</span>
                          <div>
                            <strong>{e.name}</strong>
                            <small>
                              {
                                getExerciseRecommendation(
                                  e,
                                  data.workouts,
                                  data.profile,
                                  3,
                                  false,
                                  new Date(),
                                  undefined,
                                  data.cardio,
                                ).sets
                              }{" "}
                              sorozat ·{" "}
                              {getExerciseRecommendation(
                                e,
                                data.workouts,
                                data.profile,
                                3,
                                false,
                                new Date(),
                                undefined,
                                data.cardio,
                              ).repRange.join("–")}{" "}
                              ismétlés
                            </small>
                          </div>
                          <span className="category-tag">
                            {labels[e.category]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                  <div className="alert">
                    <Sparkles size={19} />
                    <p>
                      <strong>Kezdj 5–10 perc bemelegítéssel.</strong> Könnyű
                      mozgás, ízületi átmozgatás, majd néhány könnyített
                      ismétlés. Az első sorozat ne legyen maximális.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <section className="card readiness">
                    <div>
                      <h2>Hogy érzed magad?</h2>
                      <p>A mai javaslatot ehhez is igazítjuk.</p>
                    </div>
                    <div
                      className="readiness-options"
                      role="group"
                      aria-label="Mai energiaszint"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          aria-pressed={draft.readiness === n}
                          key={n}
                          onClick={() => setDraft({ ...draft, readiness: n })}
                          className={draft.readiness === n ? "selected" : ""}
                        >
                          <span>
                            {
                              [
                                "Lemerült",
                                "Fáradt",
                                "Rendben",
                                "Friss",
                                "Energikus",
                              ][n - 1]
                            }
                          </span>
                          <small>{n}/5</small>
                        </button>
                      ))}
                    </div>
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={draft.pain}
                        onChange={(e) =>
                          setDraft({ ...draft, pain: e.target.checked })
                        }
                      />
                      Fájdalmat érzek mozgás közben
                    </label>
                  </section>
                  {draft.pain && (
                    <div className="alert warning">
                      <Heart size={21} />
                      <p>
                        <strong>Most állj meg a fájdalmas mozgással.</strong> A
                        sorozatrögzítést szüneteltetjük. Visszatérő vagy erős
                        fájdalomnál kérj egészségügyi segítséget; az alkalmazás
                        nem tudja megítélni a sérülést.
                      </p>
                    </div>
                  )}
                  <div className="alert">
                    <Leaf size={19} />
                    <p>
                      Maradjon általában{" "}
                      <strong>2–3 szabályos ismétlés tartalékban (RIR)</strong>.
                      A „saját testsúly” itt 0 kg pluszterhelés. Könnyebb vagy
                      nehezebb változatot külön gyakorlatként rögzíts.
                    </p>
                  </div>
                  <div className="exercise-list">
                    {draft.entries.map((entry, index) => (
                      <ExerciseCard
                        key={entry.exerciseId}
                        entry={entry}
                        index={index}
                        data={data}
                        readiness={draft.readiness}
                        pain={draft.pain}
                        onAdd={(reps, kg, rir) => addSet(index, reps, kg, rir)}
                        onDeleteSet={(id) =>
                          setDraft({
                            ...draft,
                            entries: draft.entries.map((e, i) =>
                              i === index
                                ? {
                                    ...e,
                                    sets: e.sets.filter((s) => s.id !== id),
                                  }
                                : e,
                            ),
                          })
                        }
                        onVariation={(variation) =>
                          setDraft({
                            ...draft,
                            entries: draft.entries.map((e, i) =>
                              i === index ? { ...e, variation } : e,
                            ),
                          })
                        }
                        onRemove={() => {
                          if (
                            !entry.sets.length ||
                            window.confirm(
                              "Törlöd a gyakorlatot a mai edzésből, a rögzített sorozatokkal együtt?",
                            )
                          )
                            setDraft({
                              ...draft,
                              entries: draft.entries.filter(
                                (_, i) => i !== index,
                              ),
                            });
                        }}
                      />
                    ))}
                  </div>
                  <button
                    className="button dashed full"
                    onClick={() => setPicker(true)}
                  >
                    <Plus size={19} />
                    Gyakorlat hozzáadása
                  </button>
                  <section className="card finish-card">
                    <div>
                      <h2>Zárd le a mai munkát.</h2>
                      <p>
                        A teljes edzés nehézsége (RPE):{" "}
                        <strong>{draft.rpe}/10</strong>
                      </p>
                      <input
                        aria-label="Edzés nehézsége"
                        type="range"
                        min="1"
                        max="10"
                        value={draft.rpe}
                        onChange={(e) =>
                          setDraft({ ...draft, rpe: +e.target.value })
                        }
                      />
                      <div className="range-labels">
                        <span>Nagyon könnyű</span>
                        <span>Maximális</span>
                      </div>
                    </div>
                    <label className="field">
                      Megjegyzés
                      <textarea
                        placeholder="Mi ment jól? Milyen változatot végeztél?"
                        value={draft.note}
                        maxLength={2000}
                        onChange={(e) =>
                          setDraft({ ...draft, note: e.target.value })
                        }
                      />
                    </label>
                    <div className="finish-actions">
                      <button
                        className="text-button danger"
                        onClick={() => {
                          if (
                            window.confirm("Eldobod a folyamatban lévő edzést?")
                          ) {
                            setDraft(null);
                            setToast("A folyamatban lévő edzést eldobtuk.");
                          }
                        }}
                      >
                        Edzés eldobása
                      </button>
                      <button
                        className="button primary"
                        onClick={finishWorkout}
                      >
                        <Check size={19} />
                        Edzés befejezése
                      </button>
                    </div>
                  </section>
                </>
              )}
            </>
          )}

          {tab === "progress" && <Progress data={data} />}
          {tab === "history" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">MINDEN LÉPÉSED EGY HELYEN</p>
                  <h1>Az edzésnaplód.</h1>
                  <p>Erősítés, futás, bringa és úszás. A saját történeted.</p>
                </div>
                <button
                  className="button primary"
                  onClick={() => setCardioOpen(true)}
                >
                  <Plus size={18} />
                  Aktivitás
                </button>
              </div>
              {!allSessions.length ? (
                <Empty
                  icon={<BookOpen size={30} />}
                  title="Itt kezdődik a történeted."
                  text="Rögzíts egy edzést vagy egy könnyű mozgást. Az első lépés is számít."
                  action={
                    <button className="button primary" onClick={beginWorkout}>
                      Első edzés indítása
                      <ArrowRight size={17} />
                    </button>
                  }
                />
              ) : (
                <div className="history-list">
                  {allSessions.map((session) => {
                    const Icon =
                      session.kind === "strength"
                        ? Dumbbell
                        : sportIcons[session.sport];
                    return (
                      <button
                        key={session.id}
                        className="history-row card"
                        onClick={() => setDetail(session.id)}
                      >
                        <span
                          className={`round-icon ${session.kind === "cardio" ? session.sport : ""}`}
                        >
                          <Icon size={23} />
                        </span>
                        <span className="history-title">
                          <strong>
                            {session.kind === "strength"
                              ? "Kondipark · teljes test"
                              : sportNames[session.sport]}
                          </strong>
                          <small>
                            {huDate(session.date, {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}{" "}
                            ·{" "}
                            {new Date(session.date).toLocaleTimeString(
                              "hu-HU",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </small>
                        </span>
                        <span className="history-metric">
                          <strong>
                            {session.durationMin} <small>perc</small>
                          </strong>
                          <small>
                            {session.kind === "strength"
                              ? `${session.exerciseEntries.reduce((n, e) => n + e.sets.length, 0)} sorozat`
                              : `${session.distanceKm.toLocaleString("hu-HU")} km`}
                          </small>
                        </span>
                        <ChevronRight size={18} />
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </main>
        <footer className="page-footer">
          <span>
            lendület. <span>A saját tempódban.</span>
          </span>
          <a href={GUIDE_URL} target="_blank" rel="noreferrer">
            <BookOpen size={14} />
            Tudomány és útmutató
            <ArrowUpRight size={13} />
          </a>
        </footer>
      </div>

      <nav className="bottom-nav" aria-label="Mobil navigáció" ref={navRef}>
        {nav.map(({ id, name, icon: Icon }) => (
          <button
            key={id}
            aria-current={tab === id ? "page" : undefined}
            className={tab === id ? "active" : ""}
            onClick={() => navigate(id)}
          >
            <Icon size={21} />
            <span>{name}</span>
            {id === "workout" && draft && <i className="live-dot" />}
          </button>
        ))}
      </nav>
      {draft && draft.restEnd && tab === "workout" && (
        <div
          className={`rest-timer ${restRemaining === 0 ? "finished" : ""}`}
          role="timer"
          aria-label="Pihenőidőzítő"
        >
          <span className="timer-icon">
            <Timer size={23} />
          </span>
          <div>
            <small>{restRemaining > 0 ? "PIHENŐIDŐ" : "KÉSZEN ÁLLSZ?"}</small>
            <strong>
              {Math.floor(restRemaining / 60)}:
              {String(restRemaining % 60).padStart(2, "0")}
            </strong>
          </div>
          <button
            className="timer-add"
            onClick={() =>
              setDraft({
                ...draft,
                restEnd: Math.max(Date.now(), draft.restEnd!) + 30000,
              })
            }
          >
            +30 mp
          </button>
          <button
            className="icon-button"
            aria-label="Pihenő lezárása"
            onClick={() => setDraft({ ...draft, restEnd: null })}
          >
            <X size={19} />
          </button>
        </div>
      )}
      {toast && (
        <div role="status" className="toast">
          <CheckCircle2 size={19} />
          {toast}
          <button aria-label="Értesítés bezárása" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}

      {settings && (
        <Modal title="A te beállításaid" onClose={() => setSettings(false)}>
          <SettingsForm
            profile={data.profile}
            onSave={(profile) => {
              setData({ ...data, profile });
              setSettings(false);
              setToast("A beállításokat elmentettük.");
            }}
          />
          <div className="settings-section">
            <h3>A naplód biztonsága</h3>
            <p>
              Az adatok ebben a böngészőben vannak. Másik telefonhoz vagy a
              böngészőadatok törlése előtt készíts mentést. Nincs automatikus
              szinkronizálás.
            </p>
            <div className="button-row">
              <button
                className="button secondary"
                onClick={() =>
                  download(
                    JSON.stringify(data, null, 2),
                    `lendulet-${dayKey(new Date())}.json`,
                  )
                }
              >
                <ArrowDownToLine size={17} />
                Mentés letöltése
              </button>
              <button
                className="button secondary"
                onClick={() => importRef.current?.click()}
              >
                <RotateCcw size={17} />
                Visszaállítás
              </button>
            </div>
            <input
              ref={importRef}
              className="sr-only"
              type="file"
              accept=".json,application/json"
              onChange={(e) => importBackup(e.target.files?.[0])}
            />
          </div>
          <div className="settings-section">
            <h3>Telepítés a telefonodra</h3>
            <p>
              Telepítéshez az alkalmazásnak HTTPS-címen kell futnia. Androidon a
              böngésző menüjében válaszd az „Alkalmazás telepítése” lehetőséget.
              iPhone-on a Safariban: Megosztás → Főképernyőhöz adás. Az első
              betöltés után internet nélkül is használható.
            </p>
            {installPrompt && (
              <button
                className="button primary"
                onClick={async () => {
                  await installPrompt.prompt();
                  setInstallPrompt(null);
                }}
              >
                <Plus size={17} />
                Telepítés
              </button>
            )}
          </div>
          <div className="settings-section">
            <a
              href={GUIDE_URL}
              target="_blank"
              rel="noreferrer"
              className="text-link"
            >
              Ajánlások, források és használati útmutató
              <ArrowUpRight size={16} />
            </a>
            <button
              className="text-button danger reset-button"
              onClick={() => {
                if (
                  window.confirm(
                    "Végleg törlöd az összes helyi edzést és beállítást? Előbb tölts le egy mentést.",
                  )
                ) {
                  const blank = blankData();
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(blank));
                  setStorageLocked(false);
                  setStorageError("");
                  setData(blank);
                  setDraft(null);
                  setSettings(false);
                  setToast("A helyi adatokat töröltük.");
                }
              }}
            >
              Összes helyi adat törlése
            </button>
          </div>
        </Modal>
      )}
      {cardioOpen && (
        <Modal
          title="Egy újabb jó mozdulat."
          onClose={() => setCardioOpen(false)}
        >
          <CardioForm
            onSave={(session) => {
              setData({ ...data, cardio: [...data.cardio, session] });
              setCardioOpen(false);
              navigate("history");
              setToast("Az aktivitást elmentettük.");
            }}
          />
        </Modal>
      )}
      {picker && draft && (
        <Modal title="Válassz gyakorlatot" onClose={() => setPicker(false)}>
          <p className="muted">
            A könnyített változatokat külön naplózzuk, így összehasonlítható
            marad a fejlődésed.
          </p>
          <div className="picker-list">
            {EXERCISES.filter(
              (e) => !draft.entries.some((x) => x.exerciseId === e.id),
            ).map((e) => (
              <button
                key={e.id}
                onClick={() => {
                  setDraft({
                    ...draft,
                    entries: [...draft.entries, { exerciseId: e.id, sets: [] }],
                  });
                  setPicker(false);
                }}
              >
                <span className="round-icon">
                  <Dumbbell size={19} />
                </span>
                <span>
                  <strong>{e.name}</strong>
                  <small>{e.description}</small>
                </span>
                <Plus size={19} />
              </button>
            ))}
          </div>
        </Modal>
      )}
      {detail && (
        <Modal
          title="Ez is a fejlődésed része."
          onClose={() => setDetail(null)}
        >
          {(() => {
            const s = allSessions.find((x) => x.id === detail);
            if (!s) return null;
            return (
              <>
                <p className="eyebrow">
                  {huDate(s.date, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <h3>
                  {s.kind === "strength" ? "Kondipark" : sportNames[s.sport]} ·{" "}
                  {s.durationMin} perc
                </h3>
                {s.kind === "strength" ? (
                  s.exerciseEntries.map((e) => (
                    <div className="detail-exercise" key={e.exerciseId}>
                      <strong>
                        {EXERCISES.find((x) => x.id === e.exerciseId)?.name ||
                          e.exerciseId}
                      </strong>
                      {e.variation && <p className="muted">{e.variation}</p>}
                      <div>
                        {e.sets.map((set, i) => (
                          <span key={set.id}>
                            {i + 1}. sorozat: {set.reps} ism. ·{" "}
                            {set.loadKg
                              ? `+${set.loadKg} kg`
                              : "saját testsúly"}{" "}
                            · {set.rir} RIR
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p>
                    {s.distanceKm.toLocaleString("hu-HU")} km · Nehézség:{" "}
                    {s.rpe}/10 RPE
                  </p>
                )}
                {s.kind === "strength" && (
                  <p className="muted">
                    Edzés nehézsége: {s.rpe ?? "nincs rögzítve"}/10 ·
                    Energiaszint: {s.readiness}/5
                    {s.pain ? " · Fájdalom jelezve" : ""}
                  </p>
                )}
                {s.note && <div className="note-box">{s.note}</div>}
                <button
                  className="text-button danger"
                  onClick={() => {
                    if (window.confirm("Végleg törlöd ezt a bejegyzést?")) {
                      setData({
                        ...data,
                        workouts: data.workouts.filter((x) => x.id !== s.id),
                        cardio: data.cardio.filter((x) => x.id !== s.id),
                      });
                      setDetail(null);
                      setToast("A bejegyzést töröltük.");
                    }
                  }}
                >
                  <Trash2 size={16} />
                  Bejegyzés törlése
                </button>
              </>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  suffix,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  suffix: string;
  detail: string;
}) {
  return (
    <section className="card stat">
      <div className="stat-title">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <p className="stat-value">
        {value}
        <span>{suffix}</span>
      </p>
      <small>{detail}</small>
    </section>
  );
}
function Empty({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <section className="card empty-state">
      <div className="empty-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </section>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const els = ref.current?.querySelectorAll<HTMLElement>(
          'button,a,input,select,textarea,[tabindex="0"]',
        );
        if (!els?.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Ablak bezárása"
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ExerciseCard({
  entry,
  index,
  data,
  readiness,
  pain,
  onAdd,
  onDeleteSet,
  onRemove,
  onVariation,
}: {
  entry: ExerciseEntry;
  index: number;
  data: AppData;
  readiness: number;
  pain: boolean;
  onAdd: (reps: number, kg: number, rir: number) => void;
  onDeleteSet: (id: string) => void;
  onRemove: () => void;
  onVariation: (variation: string) => void;
}) {
  const exercise = EXERCISES.find((e) => e.id === entry.exerciseId)!;
  const rec = getExerciseRecommendation(
    exercise,
    data.workouts,
    data.profile,
    readiness,
    pain,
    new Date(),
    entry.variation ?? "",
    data.cardio,
  );
  const variationKey = entry.variation ?? "";
  const [reps, setReps] = useState(entry.sets.at(-1)?.reps ?? rec.repRange[0]);
  const [load, setLoad] = useState(entry.sets.at(-1)?.loadKg ?? rec.loadKg);
  const [rir, setRir] = useState(2);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!entry.sets.length) setLoad(rec.loadKg);
  }, [variationKey]);
  if (!exercise) return null;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onAdd(reps, load, rir);
  };
  return (
    <section className="card exercise-card">
      <div className="exercise-heading">
        <span className="exercise-number">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div>
          <h2>{exercise.name}</h2>
          <p>
            {rec.sets} sorozat · {rec.repRange.join("–")} ismétlés ·{" "}
            {Math.round((rec.restSeconds / 60) * 10) / 10} perc pihenő
          </p>
        </div>
        <button
          className="icon-button"
          aria-label={`${exercise.name} eltávolítása`}
          onClick={onRemove}
        >
          <X size={18} />
        </button>
      </div>
      <button
        className={`recommendation ${rec.status}`}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <Sparkles size={16} />
        <strong>{rec.title}</strong>
        <ChevronDown size={16} />
      </button>
      {expanded && (
        <div className="recommendation-detail">
          <p>{rec.reason}</p>
          <p>{rec.progression}</p>
          <p>
            <strong>Technika:</strong> {exercise.description}
          </p>
          <p>
            <strong>Könnyítés:</strong> {exercise.easier}
            <br />
            <strong>Nehezítés:</strong> {exercise.harder}
          </p>
        </div>
      )}
      <label className="variation-field">
        Változat / támaszmagasság
        <input
          aria-label={`${exercise.name} változat`}
          maxLength={120}
          placeholder="Pl. nyújtott láb, 90 cm-es rúd"
          value={entry.variation ?? ""}
          disabled={entry.sets.length > 0}
          onChange={(e) => onVariation(e.target.value)}
        />
      </label>
      {entry.sets.length > 0 && (
        <div className="set-table">
          <div className="set-table-head">
            <span>SOROZAT</span>
            <span>ISMÉTLÉS</span>
            <span>PLUSZ SÚLY</span>
            <span>RIR</span>
            <span />
          </div>
          {entry.sets.map((s, i) => (
            <div className="set-row" key={s.id}>
              <span className="set-badge">
                <Check size={13} />
                {i + 1}.
              </span>
              <strong>{s.reps}</strong>
              <span>{s.loadKg ? `+${s.loadKg} kg` : "0 kg"}</span>
              <span>{s.rir}</span>
              <button
                className="icon-button"
                aria-label={`${i + 1}. sorozat törlése`}
                onClick={() => onDeleteSet(s.id)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
      <form className="set-form" onSubmit={submit}>
        <label>
          Ismétlés
          <input
            type="number"
            aria-label={`${exercise.name} ismétlés`}
            min="1"
            max="100"
            required
            value={Number.isFinite(reps) ? reps : ""}
            onChange={(e) => setReps(e.target.valueAsNumber)}
          />
        </label>
        <label>
          Plusz súly (kg)
          <input
            type="number"
            aria-label={`${exercise.name} plusz súly`}
            min="0"
            max="200"
            step="0.5"
            required
            value={Number.isFinite(load) ? load : ""}
            onChange={(e) => setLoad(e.target.valueAsNumber)}
          />
        </label>
        <label>
          Tartalék (RIR)
          <select
            aria-label={`${exercise.name} ismétléstartalék`}
            value={rir}
            onChange={(e) => setRir(+e.target.value)}
          >
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n === 5 ? "5+" : n}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button primary"
          disabled={pain}
          type="submit"
          aria-label={`${exercise.name} sorozat rögzítése`}
        >
          <Plus size={18} />
          <span>Sorozat</span>
        </button>
      </form>
      {rec.sets > 0 && entry.sets.length >= rec.sets && (
        <p className="exercise-complete">
          <CheckCircle2 size={15} />A javasolt sorozatszámot teljesítetted. A
          több nem mindig jobb.
        </p>
      )}
    </section>
  );
}

function SettingsForm({
  profile,
  onSave,
}: {
  profile: Profile;
  onSave: (profile: Profile) => void;
}) {
  const [p, setP] = useState(profile);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(p);
      }}
      className="form-stack"
    >
      <label className="field">
        Hogy szólíthatunk?
        <input
          maxLength={40}
          placeholder="A keresztneved (nem kötelező)"
          value={p.name}
          onChange={(e) => setP({ ...p, name: e.target.value })}
        />
      </label>
      <label className="field">
        Az elsődleges célod
        <select
          value={p.goal}
          onChange={(e) =>
            setP({ ...p, goal: e.target.value as Profile["goal"] })
          }
        >
          <option value="fitness">Általános erőnlét</option>
          <option value="strength">Erősödés</option>
          <option value="muscle">Izomépítés</option>
        </select>
      </label>
      <div className="form-columns">
        <label className="field">
          Tapasztalat
          <select
            value={p.level}
            onChange={(e) =>
              setP({ ...p, level: e.target.value as Profile["level"] })
            }
          >
            <option value="beginner">Kezdő / újrakezdő</option>
            <option value="intermediate">Rendszeresen edzek</option>
          </select>
        </label>
        <label className="field">
          Erősítések hetente
          <select
            value={p.daysPerWeek}
            onChange={(e) =>
              setP({ ...p, daysPerWeek: +e.target.value as 2 | 3 | 4 })
            }
          >
            <option value="2">2 alkalom</option>
            <option value="3">3 alkalom</option>
            <option value="4">4 alkalom</option>
          </select>
        </label>
      </div>
      <p className="form-hint">
        Heti 4 teljes testes alkalom csak könnyebb és nehezebb napok váltásával
        ajánlott. Kezdésnek 2–3 alkalom is elég.
      </p>
      <button className="button primary full" type="submit">
        <Check size={17} />
        Beállítások mentése
      </button>
    </form>
  );
}

function CardioForm({ onSave }: { onSave: (session: CardioSession) => void }) {
  const [sport, setSport] = useState<CardioSession["sport"]>(() => {
    const s = sessionStorage.getItem("lendulet-cardio-sport");
    sessionStorage.removeItem("lendulet-cardio-sport");
    return s === "bike" || s === "swim" ? s : "run";
  });
  const [date, setDate] = useState(localDateTime);
  const [minutes, setMinutes] = useState(30);
  const [distance, setDistance] = useState(3);
  const [rpe, setRpe] = useState(4);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = new Date(date);
    if (!Number.isFinite(+parsed) || +parsed > Date.now() + 60000) {
      setError("Válassz egy már befejezett aktivitáshoz tartozó időpontot.");
      return;
    }
    onSave({
      id: uid(),
      date: parsed.toISOString(),
      sport,
      durationMin: minutes,
      distanceKm: distance,
      rpe,
      note,
    });
  }
  return (
    <form onSubmit={submit} className="form-stack">
      <div className="sport-select">
        {(["run", "bike", "swim"] as const).map((s) => {
          const Icon = sportIcons[s];
          return (
            <button
              type="button"
              key={s}
              aria-pressed={sport === s}
              className={sport === s ? "selected" : ""}
              onClick={() => setSport(s)}
            >
              <Icon size={25} />
              {sportNames[s]}
            </button>
          );
        })}
      </div>
      <label className="field">
        Mikor mozogtál?
        <input
          type="datetime-local"
          required
          value={date}
          max={localDateTime()}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <div className="form-columns">
        <label className="field">
          Időtartam (perc)
          <input
            type="number"
            min="1"
            max="600"
            required
            value={Number.isFinite(minutes) ? minutes : ""}
            onChange={(e) => setMinutes(e.target.valueAsNumber)}
          />
        </label>
        <label className="field">
          Távolság (km)
          <input
            type="number"
            min="0"
            max="500"
            step="0.01"
            required
            value={Number.isFinite(distance) ? distance : ""}
            onChange={(e) => setDistance(e.target.valueAsNumber)}
          />
        </label>
      </div>
      <label className="field">
        Mennyire volt nehéz? · {rpe}/10 RPE
        <input
          type="range"
          min="1"
          max="10"
          value={rpe}
          onChange={(e) => setRpe(+e.target.value)}
        />
        <span className="range-labels">
          <span>Könnyű</span>
          <span>Maximális</span>
        </span>
      </label>
      <div className="alert">
        <Leaf size={18} />
        <p>
          A könnyű kiegészítő edzésnél beszélgetni is tudsz. Intenzív futás vagy
          bringa után a lábadnak több pihenőre lehet szüksége az erősítéshez.
        </p>
      </div>
      <label className="field">
        Megjegyzés
        <textarea
          maxLength={2000}
          placeholder="Útvonal, közérzet, bármi, ami fontos…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button type="submit" className="button primary full">
        <Check size={18} />
        Aktivitás mentése
      </button>
    </form>
  );
}

function Progress({ data }: { data: AppData }) {
  const [exerciseId, setExerciseId] = useState("push-up");
  const exercise = EXERCISES.find((e) => e.id === exerciseId)!;
  const rows = data.workouts
    .filter((s) => s.exerciseEntries.some((e) => e.exerciseId === exerciseId))
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    .map((s) => {
      const e = s.exerciseEntries.find((e) => e.exerciseId === exerciseId)!;
      return {
        date: s.date,
        sets: e.sets,
        maxReps: Math.max(...e.sets.map((x) => x.reps)),
        maxLoad: Math.max(...e.sets.map((x) => x.loadKg)),
      };
    })
    .filter((s) => s.sets.length > 0);
  const rec = getExerciseRecommendation(
    exercise,
    data.workouts,
    data.profile,
    3,
    false,
    new Date(),
    undefined,
    data.cardio,
  );
  const max = Math.max(10, ...rows.map((x) => x.maxReps));
  const chartRows = rows.slice(-12);
  const weeks = Array.from({ length: 6 }, (_, i) => {
    const end = new Date();
    end.setDate(end.getDate() - ((end.getDay() + 6) % 7) - (5 - i) * 7);
    const from = new Date(end);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return {
      date: from,
      ...getWeeklyStats(data.workouts, data.cardio, i === 5 ? new Date() : end),
    };
  });
  const maxMinutes = Math.max(60, ...weeks.map((w) => w.totalMinutes));
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A KIS LÉPÉSEK ÖSSZEADÓDNAK</p>
          <h1>Lásd, honnan hová jutsz.</h1>
          <p>A saját korábbi önmagad a legjobb viszonyítási alap.</p>
        </div>
      </div>
      <section className="card progress-chart">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ERŐ ÉS TELJESÍTMÉNY</p>
            <h2>Ismétlések alakulása</h2>
          </div>
          <label className="sr-only" htmlFor="exercise-chart-select">
            Fejlődéshez kiválasztott gyakorlat
          </label>
          <select
            id="exercise-chart-select"
            value={exerciseId}
            onChange={(e) => setExerciseId(e.target.value)}
          >
            {EXERCISES.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        {rows.length ? (
          <>
            <div className="chart-summary">
              <strong>
                {rows.at(-1)?.maxReps}
                <small>ismétlés</small>
              </strong>
              <span>
                legutóbbi legjobb sorozat
                <br />
                <b>+{rows.at(-1)?.maxLoad} kg</b> legnagyobb plusz súly
              </span>
            </div>
            <div className="line-chart">
              <div className="chart-axis">
                <span>{max}</span>
                <span>{Math.round(max / 2)}</span>
                <span>0</span>
              </div>
              <svg
                viewBox="0 0 600 180"
                role="img"
                aria-label={`${exercise.name} maximális ismétlései az utolsó ${chartRows.length} edzésen: ${chartRows.map((x) => x.maxReps).join(", ")}`}
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b6d9a8" stopOpacity=".5" />
                    <stop offset="100%" stopColor="#b6d9a8" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[15, 90, 165].map((y) => (
                  <line
                    key={y}
                    x1="15"
                    y1={y}
                    x2="585"
                    y2={y}
                    stroke="#e7ebe4"
                    strokeDasharray="4 5"
                  />
                ))}
                <path
                  d={`M ${chartRows.map((r, i) => `${chartRows.length === 1 ? 300 : 20 + (i * 560) / (chartRows.length - 1)},${165 - (r.maxReps / max) * 150}`).join(" L ")} L ${chartRows.length === 1 ? 300 : 580},180 L ${chartRows.length === 1 ? 300 : 20},180 Z`}
                  fill="url(#chartFill)"
                />
                <polyline
                  points={chartRows
                    .map(
                      (r, i) =>
                        `${chartRows.length === 1 ? 300 : 20 + (i * 560) / (chartRows.length - 1)},${165 - (r.maxReps / max) * 150}`,
                    )
                    .join(" ")}
                  fill="none"
                  stroke="#3f7854"
                  strokeWidth="3"
                  vectorEffect="non-scaling-stroke"
                />
                {chartRows.map((r, i) => (
                  <circle
                    key={i}
                    cx={
                      chartRows.length === 1
                        ? 300
                        : 20 + (i * 560) / (chartRows.length - 1)
                    }
                    cy={165 - (r.maxReps / max) * 150}
                    r="4"
                    fill="#3f7854"
                  />
                ))}
              </svg>
            </div>
            <div className="chart-date-labels">
              <span>{huDate(chartRows[0].date)}</span>
              <span>{huDate(chartRows.at(-1)!.date)}</span>
            </div>
            <p className="form-hint">
              Edzésenként a legtöbb ismétlést mutatjuk. Csak azonos technikát,
              gyakorlatváltozatot, plusz súlyt és hasonló RIR-t hasonlíts össze.
              Több ismétlés kisebb súllyal önmagában nem bizonyít fejlődést.
            </p>
          </>
        ) : (
          <div className="chart-empty">
            <TrendingUp size={32} />
            <h3>Az első sorozattal indul a görbéd.</h3>
            <p>Ehhez a gyakorlathoz még nincs rögzített edzés.</p>
          </div>
        )}
        <div className={`progress-advice recommendation-detail ${rec.status}`}>
          <Sparkles size={20} />
          <div>
            <h3>{rec.title}</h3>
            <p>{rec.reason}</p>
            <p>{rec.progression}</p>
          </div>
        </div>
      </section>
      <section className="card progress-chart">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A TELJES KÉP</p>
            <h2>Heti mozgásidő</h2>
          </div>
          <span className="subtle-tag">Az utolsó 6 hét</span>
        </div>
        <div className="bar-chart">
          {weeks.map((w, i) => (
            <div key={i}>
              <strong>
                {w.totalMinutes} <small>p</small>
              </strong>
              <div className="bar-track">
                <span
                  style={{ height: `${(w.totalMinutes / maxMinutes) * 100}%` }}
                />
              </div>
              <small>{huDate(w.date)}</small>
            </div>
          ))}
        </div>
        <p className="form-hint">
          Erősítés és kardió percei együtt. A percek a mozgás rendszerességét
          mutatják, az intenzitást nem.
        </p>
      </section>
      <section className="card load-note">
        <span className="round-icon">
          <Activity size={22} />
        </span>
        <div>
          <h2>Terhelés, érthetően.</h2>
          <p>
            A heti belső terhelést az időtartam × az edzés egészére adott
            nehézség (RPE) alapján becsüljük. Ez egyéni viszonyítási szám, nem
            kalória és nem emelt súly.
          </p>
          <strong className="load-value">
            {getWeeklyStats(data.workouts, data.cardio).loadAu}{" "}
            <small>önkényes egység ezen a héten</small>
          </strong>
          <p className="form-hint">
            Sportáganként és a közérzeteddel együtt értékeld. Az erősítés és a
            kardió azonos pontszáma nem jelent azonos fizikai hatást.
          </p>
        </div>
      </section>
    </>
  );
}

export default App;
