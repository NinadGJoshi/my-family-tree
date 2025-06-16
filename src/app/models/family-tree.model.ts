export enum Gender {
    Male = 'Male',
    Female = 'Female',
    Other = 'Other'
}

export enum Relation {
    Parent = 'parent',
    Sibling = 'sibling',
    Child = 'child'
}

export interface FamilyMemberForm {
  name: string;
  gender: Gender | null;
  dob: Date | string | null;
  isAlive: boolean;
  diedOn: Date | string | null;
  married: 'Y' | 'N';
  partnerName: string;
  partnerDob: Date | string | null;
  partnerIsAlive: boolean;
  partnerDiedOn: Date | string | null;
  relation: Relation | null;
}


export interface OrganizationChartNode {
    label?: string;
    type?: string;
    styleClass?: string;
    expanded?: boolean;
    data?: FamilyMemberForm;
    children?: OrganizationChartNode[];
}
