import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && OBJECT_ID_PATTERN.test(value);
}

export async function createActivity(input: unknown) {
  const body = (input ?? {}) as Record<string, unknown>;
  if (!isObjectId(body.userId)) throw httpError(400, 'userId must be a valid id');
  if (!isObjectId(body.teamId)) throw httpError(400, 'teamId must be a valid id');
  if (typeof body.type !== 'string' || !body.type.trim()) throw httpError(400, 'type is required');
  if (typeof body.minutes !== 'number' || !Number.isFinite(body.minutes) || body.minutes <= 0) {
    throw httpError(400, 'minutes must be a positive number');
  }

  const [user, team] = await Promise.all([User.exists({ _id: body.userId }), Team.exists({ _id: body.teamId })]);
  if (!user) throw httpError(404, 'User not found');
  if (!team) throw httpError(404, 'Team not found');

  const activity = await Activity.create({
    user: body.userId,
    team: body.teamId,
    type: body.type.trim(),
    minutes: body.minutes,
    points: body.minutes,
    occurredAt: new Date(),
  });
  return activity.toObject();
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  const body = (input ?? {}) as Record<string, unknown>;
  if (typeof body.name !== 'string' || !body.name.trim()) throw httpError(400, 'name is required');
  if (typeof body.mascot !== 'string' || !body.mascot.trim()) throw httpError(400, 'mascot is required');
  const memberIds = body.members ?? [];
  if (!Array.isArray(memberIds) || !memberIds.every(isObjectId)) throw httpError(400, 'members must be a list of valid ids');
  if (memberIds.length > 0) {
    const found = await User.countDocuments({ _id: { $in: memberIds } });
    if (found !== new Set(memberIds).size) throw httpError(404, 'One or more members not found');
  }

  const team = await Team.create({ name: body.name.trim(), mascot: body.mascot.trim(), members: memberIds });
  return team.toObject();
}

export async function getLeaderboard() {
  const rows = await Team.aggregate<{ teamName: string; totalPoints: number }>([
    { $lookup: { from: Activity.collection.name, localField: '_id', foreignField: 'team', as: 'activities' } },
    { $project: { _id: 0, teamName: '$name', totalPoints: { $sum: '$activities.points' } } },
    { $sort: { totalPoints: -1, teamName: 1 } },
  ]);
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

const ACTIVITY_FOCUS: Record<string, string> = {
  run: 'endurance',
  cycle: 'endurance',
  swim: 'endurance',
  walk: 'endurance',
  strength: 'strength',
  yoga: 'mobility',
  stretch: 'mobility',
};

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) throw httpError(404, 'User not found');

  const [topActivity] = await Activity.aggregate<{ _id: string; minutes: number }>([
    { $match: { user: user._id } },
    { $group: { _id: '$type', minutes: { $sum: '$minutes' } } },
    { $sort: { minutes: -1, _id: 1 } },
    { $limit: 1 },
  ]);
  const activityType = topActivity?._id;
  const activityFocus = activityType ? ACTIVITY_FOCUS[activityType] : undefined;
  const goalFocus = user.fitnessGoal;

  const workouts = await Workout.find().lean();
  const scored = workouts.map((workout) => {
    if (workout.focus === goalFocus) return { workout, rank: 0, reason: `Matches your ${goalFocus} goal` };
    if (workout.focus === activityFocus) return { workout, rank: 1, reason: `Matches your recent ${activityType} activity` };
    return { workout, rank: 2, reason: 'Adds variety to your routine' };
  });
  scored.sort((a, b) => a.rank - b.rank || a.workout.title.localeCompare(b.workout.title));
  return scored.map(({ workout, reason }) => ({ ...workout, reason }));
}

export { User };
