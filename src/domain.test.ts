import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROFILE as USER_PROFILE,
  EXERCISES,
  formatDuration,
  getExerciseRecommendation,
  getRecoveryStatus,
  getWeeklyStats,
  samplePlan,
  validateBackup,
  type AppData,
  type CardioSession,
  type Profile,
  type WorkoutSession,
} from "./domain";

const now = new Date("2026-10-21T12:00:00Z");
const push = EXERCISES.find((exercise) => exercise.id === "push-up")!;
const DEFAULT_PROFILE: Profile = {
  ...USER_PROFILE,
  goal: "fitness",
  level: "beginner",
};

function workout(
  date = "2026-10-19T10:00:00Z",
  overrides: Partial<WorkoutSession> = {},
): WorkoutSession {
  return {
    id: `workout-${date}`,
    date,
    durationMin: 35,
    readiness: 4,
    pain: false,
    note: "",
    rpe: 6,
    exerciseEntries: [
      {
        exerciseId: "push-up",
        sets: [
          { id: "a", reps: 12, loadKg: 0, rir: 2 },
          { id: "b", reps: 12, loadKg: 0, rir: 3 },
        ],
      },
    ],
    ...overrides,
  };
}

function cardio(overrides: Partial<CardioSession> = {}): CardioSession {
  return {
    id: "cardio",
    date: "2026-10-20T10:00:00Z",
    sport: "run",
    durationMin: 30,
    distanceKm: 4,
    rpe: 4,
    note: "",
    ...overrides,
  };
}

function backup(overrides: Partial<AppData> = {}): AppData {
  return {
    version: 1,
    profile: { ...DEFAULT_PROFILE },
    workouts: [workout()],
    cardio: [cardio()],
    ...overrides,
  };
}

describe("explainable progression", () => {
  it("starts with manageable volume, rest and repetitions in reserve", () => {
    const recommendation = getExerciseRecommendation(
      push,
      [],
      DEFAULT_PROFILE,
      3,
      false,
      now,
    );
    expect(recommendation).toMatchObject({
      status: "start",
      sets: 2,
      restSeconds: 120,
      targetRir: 2,
      loadKg: 0,
      repRange: [6, 12],
    });
    expect(samplePlan(DEFAULT_PROFILE)).toHaveLength(4);
    expect(
      new Set(samplePlan(DEFAULT_PROFILE).map((exercise) => exercise.category)),
    ).toEqual(new Set(["legs", "push", "pull", "core"]));
    expect(USER_PROFILE).toMatchObject({
      goal: "strength",
      level: "intermediate",
      daysPerWeek: 3,
    });
  });

  it("requires two matching recent successes before progressing bodyweight difficulty", () => {
    const first = workout("2026-10-16T10:00:00Z");
    const second = workout();
    expect(
      getExerciseRecommendation(push, [first], DEFAULT_PROFILE, 4, false, now)
        .status,
    ).toBe("maintain");
    const result = getExerciseRecommendation(
      push,
      [first, second],
      DEFAULT_PROFILE,
      4,
      false,
      now,
    );
    expect(result.status).toBe("progress");
    expect(result.loadKg).toBe(0);
    expect(result.progression).toContain("nehezebb változatot");
  });

  it("uses a small added-weight increase once both sessions qualify", () => {
    const sessions = [workout("2026-10-16T10:00:00Z"), workout()].map(
      (session) => ({
        ...session,
        exerciseEntries: session.exerciseEntries.map((entry) => ({
          ...entry,
          sets: entry.sets.map((set) => ({ ...set, loadKg: 10 })),
        })),
      }),
    );
    expect(
      getExerciseRecommendation(
        "push-up",
        sessions,
        DEFAULT_PROFILE,
        4,
        false,
        now,
      ),
    ).toMatchObject({ status: "progress", loadKg: 10.5 });
  });

  it("does not skip over a recent failed attempt to find older successes", () => {
    const failure = workout("2026-10-20T10:00:00Z", {
      exerciseEntries: [
        {
          exerciseId: "push-up",
          sets: [{ id: "c", reps: 7, loadKg: 0, rir: 1 }],
        },
      ],
    });
    const sessions = [
      workout("2026-10-13T10:00:00Z"),
      workout("2026-10-16T10:00:00Z"),
      failure,
    ];
    expect(
      getExerciseRecommendation(push, sessions, DEFAULT_PROFILE, 4, false, now)
        .status,
    ).not.toBe("progress");
  });

  it.each(["pain", "fatigue", "recent-hard"] as const)(
    "blocks progression with %s",
    (condition) => {
      const sessions = [workout("2026-10-16T10:00:00Z"), workout()];
      if (condition === "recent-hard")
        sessions.push(workout("2026-10-21T09:00:00Z", { rpe: 9 }));
      const recommendation = getExerciseRecommendation(
        push,
        sessions,
        DEFAULT_PROFILE,
        condition === "fatigue" ? 1 : 4,
        condition === "pain",
        now,
      );
      expect(recommendation.status).toBe("recover");
      if (condition === "pain") expect(recommendation.sets).toBe(0);
    },
  );

  it("does not treat changed load, changed set count or same-day logs as comparable", () => {
    const base = workout("2026-10-16T10:00:00Z");
    const otherLoad = workout("2026-10-19T10:00:00Z", {
      exerciseEntries: [
        {
          exerciseId: "push-up",
          sets: base.exerciseEntries[0].sets.map((set) => ({
            ...set,
            loadKg: 5,
          })),
        },
      ],
    });
    expect(
      getExerciseRecommendation(
        push,
        [base, otherLoad],
        DEFAULT_PROFILE,
        4,
        false,
        now,
      ).status,
    ).toBe("maintain");
    const otherCount = workout("2026-10-19T10:00:00Z", {
      exerciseEntries: [
        {
          exerciseId: "push-up",
          sets: [
            ...base.exerciseEntries[0].sets,
            { id: "c", reps: 12, loadKg: 0, rir: 3 },
          ],
        },
      ],
    });
    expect(
      getExerciseRecommendation(
        push,
        [base, otherCount],
        DEFAULT_PROFILE,
        4,
        false,
        now,
      ).status,
    ).toBe("maintain");
    const sameDay = workout("2026-10-16T11:00:00Z");
    expect(
      getExerciseRecommendation(
        push,
        [base, sameDay],
        DEFAULT_PROFILE,
        4,
        false,
        now,
      ).status,
    ).toBe("maintain");
  });

  it("does not prefill the heaviest set as the next training load", () => {
    const session = workout();
    session.exerciseEntries[0].sets[0].loadKg = 20;
    session.exerciseEntries[0].sets[1].loadKg = 5;
    expect(
      getExerciseRecommendation(
        push,
        [session],
        DEFAULT_PROFILE,
        4,
        false,
        now,
      ),
    ).toMatchObject({ status: "maintain", loadKg: 5 });
  });

  it("ignores future data and does not progress from stale successes", () => {
    const sessions = [
      workout("2026-09-01T10:00:00Z"),
      workout("2026-09-04T10:00:00Z"),
      workout("2026-12-01T10:00:00Z"),
    ];
    expect(
      getExerciseRecommendation(push, sessions, DEFAULT_PROFILE, 4, false, now),
    ).toMatchObject({ status: "maintain", title: "Térj vissza fokozatosan" });
  });

  it("does not progress when the top reps were only reached at failure", () => {
    const sessions = [workout("2026-10-16T10:00:00Z"), workout()].map(
      (session) => ({
        ...session,
        exerciseEntries: session.exerciseEntries.map((entry) => ({
          ...entry,
          sets: entry.sets.map((set) => ({ ...set, rir: 0 })),
        })),
      }),
    );
    expect(
      getExerciseRecommendation(push, sessions, DEFAULT_PROFILE, 4, false, now)
        .status,
    ).toBe("maintain");
  });

  it("keeps different assistance and leverage variations separate", () => {
    const first = workout("2026-10-16T10:00:00Z");
    first.exerciseEntries[0].variation = "alacsony korlát";
    const second = workout();
    second.exerciseEntries[0].variation = "magas korlát";
    expect(
      getExerciseRecommendation(
        push,
        [first, second],
        DEFAULT_PROFILE,
        4,
        false,
        now,
      ).status,
    ).toBe("maintain");
    expect(
      getExerciseRecommendation(
        push,
        [first, second],
        DEFAULT_PROFILE,
        4,
        false,
        now,
        "talaj",
      ).status,
    ).toBe("start");
    const third = workout("2026-10-13T10:00:00Z");
    third.exerciseEntries[0].variation = "alacsony korlát";
    expect(
      getExerciseRecommendation(
        push,
        [third, first, second],
        DEFAULT_PROFILE,
        4,
        false,
        now,
        "alacsony korlát",
      ).status,
    ).toBe("progress");
  });

  it("does not bypass recovery by selecting a new variation", () => {
    const last = workout("2026-10-21T10:00:00Z", { rpe: 9 });
    last.exerciseEntries[0].variation = "magas korlát";
    expect(
      getExerciseRecommendation(
        push,
        [last],
        DEFAULT_PROFILE,
        4,
        false,
        now,
        "talaj",
      ).status,
    ).toBe("recover");
  });
});

describe("recovery hints", () => {
  it("considers effort as well as elapsed time", () => {
    const date = "2026-10-20T06:00:00Z";
    expect(getRecoveryStatus([workout(date, { rpe: 5 })], now).status).toBe(
      "ready",
    );
    expect(getRecoveryStatus([workout(date, { rpe: 9 })], now).status).toBe(
      "caution",
    );
    expect(
      getRecoveryStatus([workout("2026-10-18T06:00:00Z", { rpe: 9 })], now)
        .status,
    ).toBe("ready");
    const nearFailure = workout(date, { rpe: undefined });
    nearFailure.exerciseEntries[0].sets[0].rir = 0;
    expect(getRecoveryStatus([nearFailure], now).status).toBe("caution");
  });

  it("does not infer readiness merely from time since a session", () => {
    expect(getRecoveryStatus([], now, 1).status).toBe("rest");
    expect(getRecoveryStatus([], now, 5, true).status).toBe("rest");
    expect(getRecoveryStatus([], now, 3)).toMatchObject({
      status: "ready",
      hoursSinceLast: null,
    });
  });
});

describe("concurrent strength and cardio", () => {
  const qualifyingSessions = (exerciseId: string, reps: number) =>
    [workout("2026-10-16T10:00:00Z"), workout()].map((session) => ({
      ...session,
      exerciseEntries: [
        {
          exerciseId,
          sets: session.exerciseEntries[0].sets.map((set) => ({
            ...set,
            reps,
          })),
        },
      ],
    }));

  it.each(["run", "bike"] as const)(
    "does not increase leg training after hard %s",
    (sport) => {
      const sessions = qualifyingSessions("squat", 15);
      expect(
        getExerciseRecommendation(
          "squat",
          sessions,
          DEFAULT_PROFILE,
          4,
          false,
          now,
        ).status,
      ).toBe("progress");
      const recent = cardio({
        sport,
        date: "2026-10-21T06:00:00Z",
        durationMin: 40,
        rpe: 8,
      });
      const result = getExerciseRecommendation(
        "squat",
        sessions,
        DEFAULT_PROFILE,
        4,
        false,
        now,
        undefined,
        [recent],
      );
      expect(result).toMatchObject({
        status: "recover",
        sets: 1,
        targetRir: 3,
      });
      expect(result.reason).toContain("24 órában");
    },
  );

  it("keeps a recent easy run from blocking an otherwise qualified progression", () => {
    const recent = cardio({ date: "2026-10-21T06:00:00Z", rpe: 3 });
    expect(
      getExerciseRecommendation(
        "squat",
        qualifyingSessions("squat", 15),
        DEFAULT_PROFILE,
        4,
        false,
        now,
        undefined,
        [recent],
      ).status,
    ).toBe("progress");
  });

  it.each(["inverted-row", "push-up", "knee-raise"])(
    "reduces %s after hard swimming",
    (exerciseId) => {
      const recent = cardio({
        sport: "swim",
        date: "2026-10-21T06:00:00Z",
        rpe: 8,
      });
      const result = getExerciseRecommendation(
        exerciseId,
        qualifyingSessions(exerciseId, 15),
        DEFAULT_PROFILE,
        4,
        false,
        now,
        undefined,
        [recent],
      );
      expect(result.status).toBe("recover");
      expect(result.reason).toContain("úszás");
    },
  );

  it("does not equate a run with upper-body training", () => {
    const recent = cardio({ date: "2026-10-21T06:00:00Z", rpe: 8 });
    expect(
      getExerciseRecommendation(
        "push-up",
        qualifyingSessions("push-up", 12),
        DEFAULT_PROFILE,
        4,
        false,
        now,
        undefined,
        [recent],
      ).status,
    ).toBe("progress");
  });

  it("ignores old, future and short hard cardio for the simple caution flag", () => {
    const sessions = qualifyingSessions("squat", 15);
    const irrelevant = [
      cardio({ id: "old", date: "2026-10-19T06:00:00Z", rpe: 8 }),
      cardio({ id: "future", date: "2026-10-22T06:00:00Z", rpe: 8 }),
      cardio({
        id: "short",
        date: "2026-10-21T06:00:00Z",
        rpe: 8,
        durationMin: 10,
      }),
    ];
    expect(
      getExerciseRecommendation(
        "squat",
        sessions,
        DEFAULT_PROFILE,
        4,
        false,
        now,
        undefined,
        irrelevant,
      ).status,
    ).toBe("progress");
  });

  it("shows a global caution but prioritizes current pain and fatigue", () => {
    const recent = [cardio({ date: "2026-10-21T06:00:00Z", rpe: 8 })];
    expect(getRecoveryStatus([], now, 4, false, recent).status).toBe("caution");
    expect(getRecoveryStatus([], now, 4, true, recent).status).toBe("rest");
    expect(getRecoveryStatus([], now, 1, false, recent).status).toBe("rest");
    expect(
      getExerciseRecommendation(
        "squat",
        [],
        DEFAULT_PROFILE,
        4,
        true,
        now,
        undefined,
        recent,
      ).sets,
    ).toBe(0);
  });

  it("keeps the stricter same-exercise recovery when both strength and cardio were hard", () => {
    const recentStrength = workout("2026-10-21T08:00:00Z", { rpe: 9 });
    recentStrength.exerciseEntries[0].exerciseId = "squat";
    const recentCardio = [cardio({ date: "2026-10-21T06:00:00Z", rpe: 8 })];
    expect(
      getExerciseRecommendation(
        "squat",
        [recentStrength],
        USER_PROFILE,
        4,
        false,
        now,
        undefined,
        recentCardio,
      ),
    ).toMatchObject({ status: "recover", sets: 1, targetRir: 4 });
  });
});

describe("weekly training totals", () => {
  it("counts only this calendar week and does not invent RPE for incomplete data", () => {
    const sessions = [
      workout("2026-10-18T12:00:00Z"), // Sunday, previous week.
      workout("2026-10-19T12:00:00Z", { rpe: undefined }),
      workout("2026-10-20T12:00:00Z", { rpe: 7, durationMin: 40 }),
      workout("2026-10-22T12:00:00Z"), // Future.
    ];
    const stats = getWeeklyStats(sessions, [cardio()], now);
    expect(stats).toEqual({
      workouts: 2,
      cardioSessions: 1,
      totalMinutes: 105,
      strengthSets: 4,
      cardioMinutes: 30,
      loadAu: 400,
      includedLoadSessions: 2,
      totalSessions: 3,
      activeDays: 2,
    });
  });

  it("preserves useful zero values for a new journal", () => {
    expect(getWeeklyStats([], [], now)).toMatchObject({
      workouts: 0,
      loadAu: 0,
      activeDays: 0,
    });
    expect(formatDuration(125)).toBe("2:05");
    expect(formatDuration(-3)).toBe("0:00");
  });
});

describe("safe journal imports", () => {
  it("accepts a round-tripped export and an empty journal", () => {
    const data = backup();
    expect(validateBackup(JSON.parse(JSON.stringify(data)))).toEqual({
      valid: true,
      data,
    });
    expect(validateBackup(backup({ workouts: [], cardio: [] })).valid).toBe(
      true,
    );
  });

  it("allows old strength records without an invented session RPE", () => {
    const result = validateBackup(
      backup({ workouts: [workout(undefined, { rpe: undefined })] }),
    );
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.workouts[0].rpe).toBeUndefined();
  });

  it("preserves recorded variations in backup round trips", () => {
    const data = backup();
    data.workouts[0].exerciseEntries[0].variation = "alacsony korlát";
    expect(validateBackup(JSON.parse(JSON.stringify(data)))).toEqual({
      valid: true,
      data,
    });
  });

  it.each([null, [], { version: 2 }, { version: 1, profile: {} }])(
    "rejects malformed or unknown backup formats",
    (input) => {
      expect(validateBackup(input).valid).toBe(false);
    },
  );

  it.each([
    { date: "2026-02-31T10:00:00Z" },
    { durationMin: 0 },
    { readiness: 8 },
    { rpe: Number.NaN },
    { exerciseEntries: [{ exerciseId: "unknown", sets: [] }] },
    {
      exerciseEntries: [
        {
          exerciseId: "push-up",
          sets: [{ id: "x", reps: -2, loadKg: 0, rir: 2 }],
        },
      ],
    },
    {
      exerciseEntries: [
        {
          exerciseId: "push-up",
          sets: [{ id: "x", reps: 10, loadKg: -1, rir: 2 }],
        },
      ],
    },
    {
      exerciseEntries: [
        {
          exerciseId: "push-up",
          sets: [{ id: "x", reps: 10, loadKg: 0, rir: 20 }],
        },
      ],
    },
  ])(
    "rejects invalid strength record %j without overwriting a journal",
    (change) => {
      expect(
        validateBackup(backup({ workouts: [workout(undefined, change)] }))
          .valid,
      ).toBe(false);
    },
  );

  it("rejects duplicate session IDs and duplicate sets", () => {
    const session = workout();
    expect(validateBackup(backup({ workouts: [session, session] })).valid).toBe(
      false,
    );
    expect(
      validateBackup(
        backup({ workouts: [session], cardio: [cardio({ id: session.id })] }),
      ).valid,
    ).toBe(false);
    const set = session.exerciseEntries[0].sets[0];
    session.exerciseEntries[0].sets = [set, set];
    expect(validateBackup(backup({ workouts: [session] })).valid).toBe(false);
  });

  it.each([
    { sport: "rowing" },
    { distanceKm: -5 },
    { rpe: 11 },
    { durationMin: 0 },
  ])("rejects invalid cardio data %j", (change) => {
    expect(
      validateBackup(
        backup({ cardio: [cardio(change as Partial<CardioSession>)] }),
      ).valid,
    ).toBe(false);
  });
});
