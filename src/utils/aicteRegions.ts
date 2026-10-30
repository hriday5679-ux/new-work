export type AicteRegion =
  | 'Northern'
  | 'North-West'
  | 'Western'
  | 'Central'
  | 'Eastern'
  | 'Southern'
  | 'South-West';

export const AICTE_REGIONS: AicteRegion[] = [
  'Northern',
  'North-West',
  'Western',
  'Central',
  'Eastern',
  'Southern',
  'South-West',
];

/**
 * Standard AICTE State/UT to Region Mapping
 */
export const STATE_TO_REGION_MAP: Record<string, AicteRegion> = {
  // Northern Region (RO: Kanpur)
  'uttar pradesh': 'Northern',
  'uttarakhand': 'Northern',
  'bihar': 'Northern',
  'jharkhand': 'Northern',

  // North-West Region (RO: Chandigarh / Delhi Camp)
  'delhi': 'North-West',
  'national capital territory of delhi': 'North-West',
  'nct of delhi': 'North-West',
  'haryana': 'North-West',
  'punjab': 'North-West',
  'rajasthan': 'North-West',
  'himachal pradesh': 'North-West',
  'jammu and kashmir': 'North-West',
  'jammu & kashmir': 'North-West',
  'chandigarh': 'North-West',
  'ladakh': 'North-West',

  // Western Region (RO: Mumbai)
  'maharashtra': 'Western',
  'goa': 'Western',
  'daman and diu': 'Western',
  'dadra and nagar haveli': 'Western',
  'dadra and nagar haveli and daman and diu': 'Western',

  // Central Region (RO: Bhopal)
  'madhya pradesh': 'Central',
  'chhattisgarh': 'Central',
  'gujarat': 'Central',

  // Eastern Region (RO: Kolkata)
  'west bengal': 'Eastern',
  'odisha': 'Eastern',
  'orissa': 'Eastern',
  'assam': 'Eastern',
  'arunachal pradesh': 'Eastern',
  'manipur': 'Eastern',
  'meghalaya': 'Eastern',
  'mizoram': 'Eastern',
  'nagaland': 'Eastern',
  'sikkim': 'Eastern',
  'tripura': 'Eastern',
  'andaman and nicobar islands': 'Eastern',
  'andaman & nicobar': 'Eastern',

  // Southern Region (RO: Chennai)
  'tamil nadu': 'Southern',
  'puducherry': 'Southern',
  'pondicherry': 'Southern',
  'andhra pradesh': 'Southern',
  'telangana': 'Southern',

  // South-West Region (RO: Bengaluru)
  'karnataka': 'South-West',
  'kerala': 'South-West',
  'lakshadweep': 'South-West',
};

/**
 * Normalize state name and map to canonical AICTE Region
 */
export function mapStateToAicteRegion(state: string | undefined | null): AicteRegion {
  if (!state) return 'Northern';
  const clean = state.trim().toLowerCase();
  return STATE_TO_REGION_MAP[clean] || 'Northern';
}

/**
 * All Indian States and UTs for filters
 */
export const ALL_INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Chandigarh',
  'Puducherry',
];

export const INSTITUTION_TYPES = [
  'Engineering & Tech',
  'Polytechnic',
  'Pharmacy',
  'Management',
  'Architecture',
  'University Department',
] as const;

export type StandardInstitutionType = typeof INSTITUTION_TYPES[number];
