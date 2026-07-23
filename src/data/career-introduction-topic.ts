import type {
  CvActivity,
  CvData,
  CvEngagement,
  CvHighlight,
  CvOrganization,
  CvSkill,
  CvSkillGroup,
} from "./cv.js";

export type CareerIntroductionTopic =
  | { key: "profile"; kind: "profile"; profile: CvData["profile"] }
  | { group: CvSkillGroup; key: string; kind: "skill"; skill: CvSkill }
  | {
      engagement: CvEngagement;
      key: string;
      kind: "engagement";
      organization: CvOrganization;
    }
  | {
      engagement: CvEngagement;
      highlight: CvHighlight;
      key: string;
      kind: "highlight";
      organization: CvOrganization;
    }
  | { activity: CvActivity; key: string; kind: "activity"; organization: CvOrganization }
  | { key: "statement"; kind: "statement"; statement: CvData["statement"] };

export type CareerIntroductionTopicKind = CareerIntroductionTopic["kind"];

const findOrganization = (cv: CvData, organizationId: string): CvOrganization => {
  const organization = cv.organizations.find(({ id }) => id === organizationId);

  if (organization === undefined) {
    throw new TypeError(`Organization not found: ${organizationId}`);
  }

  return organization;
};

const findEngagement = (cv: CvData, engagementId: string): CvEngagement => {
  const engagement = cv.engagements.find(({ id }) => id === engagementId);

  if (engagement === undefined) {
    throw new TypeError(`Engagement not found: ${engagementId}`);
  }

  return engagement;
};

export const createCareerIntroductionTopicGroups = (
  cv: CvData,
): readonly (readonly CareerIntroductionTopic[])[] => {
  const profile: CareerIntroductionTopic[] = [
    { key: "profile", kind: "profile", profile: cv.profile },
  ];
  const skills: CareerIntroductionTopic[] = cv.skills.flatMap((group) =>
    group.items.map((skill) => ({
      group,
      key: `skill:${group.id}:${skill.name}`,
      kind: "skill" as const,
      skill,
    })),
  );
  const engagements: CareerIntroductionTopic[] = cv.engagements.map((engagement) => ({
    engagement,
    key: `engagement:${engagement.id}`,
    kind: "engagement",
    organization: findOrganization(cv, engagement.organization_id),
  }));
  const highlights: CareerIntroductionTopic[] = cv.highlights.map((highlight) => {
    const engagement = findEngagement(cv, highlight.engagement_id);

    return {
      engagement,
      highlight,
      key: `highlight:${highlight.id}`,
      kind: "highlight",
      organization: findOrganization(cv, engagement.organization_id),
    };
  });
  const activities: CareerIntroductionTopic[] = cv.activities.map((activity) => ({
    activity,
    key: `activity:${activity.organization_id}:${activity.period}`,
    kind: "activity",
    organization: findOrganization(cv, activity.organization_id),
  }));
  const statement: CareerIntroductionTopic[] = [
    { key: "statement", kind: "statement", statement: cv.statement },
  ];

  return [profile, skills, engagements, highlights, activities, statement].filter(
    (group) => group.length > 0,
  );
};

const selectRandomItem = <Item>(items: readonly Item[], random: () => number): Item => {
  const sample = random();

  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
    throw new RangeError("Random source must return a finite number from 0 (inclusive) to 1");
  }

  const item = items[Math.floor(sample * items.length)];

  if (item === undefined) {
    throw new TypeError("Cannot select a random item from an empty collection");
  }

  return item;
};

export const selectRandomCareerIntroductionTopic = (
  cv: CvData,
  random: () => number = Math.random,
  excludedKey?: string,
): CareerIntroductionTopic => {
  const allGroups = createCareerIntroductionTopicGroups(cv);
  const groupsWithoutPreviousTopic = allGroups
    .map((group) => group.filter(({ key }) => key !== excludedKey))
    .filter((group) => group.length > 0);
  const eligibleGroups =
    groupsWithoutPreviousTopic.length > 0 ? groupsWithoutPreviousTopic : allGroups;
  const group = selectRandomItem(eligibleGroups, random);

  return selectRandomItem(group, random);
};
