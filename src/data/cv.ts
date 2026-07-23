export interface CvPeriod {
  start: string;
  end: string;
}

export interface CvSkill {
  name: string;
  years: number;
  level: 1 | 2 | 3;
  description: string;
}

export interface CvSkillGroup {
  id: string;
  label: string;
  items: CvSkill[];
}

export interface CvOrganization {
  id: string;
  relationship: "freelance-client" | "employer";
  profile: string;
}

export interface CvEngagement {
  id: string;
  organization_id: string;
  period: CvPeriod;
  headline: string;
  roles: string[];
  summary: string;
  responsibilities: string[];
  stack: string[];
}

export interface CvHighlight {
  id: string;
  engagement_id: string;
  title: string;
  summary: string;
  principles: string[];
}

export interface CvActivity {
  organization_id: string;
  period: string;
  items: string[];
}

export interface CvData {
  schema_version: 1;
  source: {
    title: string;
    issued_on: string;
    coverage: CvPeriod;
    note: string;
  };
  anonymization: {
    mode: "organization-and-product";
    policy: string;
    identifiers_published: false;
  };
  profile: {
    name: string;
    title: string;
    summary: string;
  };
  skills: CvSkillGroup[];
  organizations: CvOrganization[];
  engagements: CvEngagement[];
  highlights: CvHighlight[];
  activities: CvActivity[];
  statement: {
    heading: string;
    paragraphs: string[];
  };
}
