import type { TextInputProps } from 'react-native';

/**
 * How a record field is edited and displayed. Values are always stored as
 * strings on the entry:
 * - `date`: YYYY-MM-DD, optional unless required
 * - `datetime`: full ISO timestamp, defaults to the current PHT time
 * - `amount`: a plain decimal string, shown as pesos
 * - `choice`: one of `options`
 * - `select`: a dropdown of `options` that also takes any typed-in value ("Other…")
 */
export type RecordFieldType =
  | 'text'
  | 'multiline'
  | 'number'
  | 'amount'
  | 'date'
  | 'datetime'
  | 'choice'
  | 'select';

/**
 * What a `text` field holds, for its keyboard and capitalization:
 * `digits` (account and card numbers), `email`, `phone`, or `username`.
 */
export type RecordTextFormat = 'digits' | 'email' | 'phone' | 'username';

/**
 * Masked by default, with an eye toggle to reveal: `all` hides the whole
 * value (passwords); `last4` shows only the last 4 characters when viewing
 * (account and card numbers).
 */
export type RecordFieldSensitivity = 'all' | 'last4';

export type RecordField = {
  key: string;
  label: string;
  type: RecordFieldType;
  required?: boolean;
  options?: readonly string[];
  format?: RecordTextFormat;
  sensitive?: RecordFieldSensitivity;
  keyboardType?: TextInputProps['keyboardType'];
  /** Smallest allowed value for `number` fields (defaults to 0). */
  min?: number;
  /** Text shown in an empty `number` field when adding (e.g. quantity 1). */
  defaultValue?: string;
  /** For date fields: also show "how long ago" under this label in the details view. */
  relativeLabel?: string;
};

export type RecordCategory = {
  id: string;
  label: string;
  emoji: string;
  description: string;
  /** Field whose value names the entry in the list; always required. */
  titleField: string;
  /**
   * Date fields that give the entry's timeline (the date shown
   * beside its name), in order of preference; the first one filled in wins,
   * falling back to the date the entry was added.
   */
  timelineFields: readonly string[];
  fields: readonly RecordField[];
};

const notes: RecordField = { key: 'notes', label: 'Notes', type: 'multiline' };

/** Common Philippine IDs and documents, for the IDs & Documents type dropdown. */
export const PH_ID_DOCUMENT_TYPES = [
  'PhilSys National ID (PhilID)',
  'ePhilID',
  'Passport',
  "Driver's License",
  'UMID',
  'SSS ID',
  'GSIS eCard',
  'PhilHealth ID',
  'TIN ID',
  'Pag-IBIG Loyalty Card',
  'Postal ID',
  "Voter's ID / Certification",
  'PRC ID',
  'Senior Citizen ID',
  'PWD ID',
  'Solo Parent ID',
  'OFW ID / OWWA ID',
  "Seafarer's Record Book",
  'NBI Clearance',
  'Police Clearance',
  'Barangay ID / Clearance',
  'Student ID',
  'Company / Employee ID',
  'PSA Birth Certificate',
  'PSA Marriage Certificate',
] as const;

export const RECORD_CATEGORIES = [
  {
    id: 'purchases',
    label: 'Purchases',
    emoji: '🛒',
    description: 'Things you bought and when',
    titleField: 'name',
    timelineFields: ['purchaseDate'],
    fields: [
      { key: 'name', label: 'Item / product name', type: 'text', required: true },
      {
        key: 'purchaseDate',
        label: 'Purchase date',
        type: 'datetime',
        relativeLabel: 'Bought',
      },
      { key: 'amount', label: 'Amount', type: 'amount' },
      { key: 'store', label: 'Store / provider', type: 'text' },
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'model', label: 'Model', type: 'text' },
      { key: 'quantity', label: 'Quantity', type: 'number', min: 1, defaultValue: '1' },
      notes,
    ],
  },
  {
    id: 'bank',
    label: 'Bank & Finance',
    emoji: '🏦',
    description: 'Accounts, loans and investments',
    titleField: 'institution',
    timelineFields: ['date'],
    fields: [
      {
        key: 'institution',
        label: 'Bank / financial institution',
        type: 'text',
        required: true,
      },
      {
        key: 'accountType',
        label: 'Account type',
        type: 'choice',
        options: ['Savings', 'Checking', 'Time deposit', 'Loan', 'Investment', 'E-wallet', 'Other'],
      },
      { key: 'accountName', label: 'Account name', type: 'text' },
      {
        key: 'accountNumber',
        label: 'Bank account number',
        type: 'text',
        format: 'digits',
        sensitive: 'last4',
      },
      { key: 'username', label: 'Username', type: 'text', format: 'username' },
      { key: 'email', label: 'Email address', type: 'text', format: 'email' },
      { key: 'phone', label: 'Phone number', type: 'text', format: 'phone' },
      { key: 'password', label: 'Password', type: 'text', sensitive: 'all' },
      { key: 'date', label: 'Date opened', type: 'date' },
      { key: 'notes', label: 'Reference / notes', type: 'multiline' },
    ],
  },
  {
    id: 'cards',
    label: 'Cards',
    emoji: '💳',
    description: 'Credit, debit and membership cards',
    titleField: 'cardName',
    timelineFields: ['receivedDate'],
    fields: [
      { key: 'cardName', label: 'Card name', type: 'text', required: true },
      {
        key: 'cardType',
        label: 'Card type',
        type: 'choice',
        options: ['Credit', 'Debit', 'Prepaid', 'Loyalty', 'Membership', 'Other'],
      },
      { key: 'issuer', label: 'Issuer', type: 'text' },
      {
        key: 'cardNumber',
        label: 'Card number',
        type: 'text',
        format: 'digits',
        sensitive: 'last4',
      },
      { key: 'receivedDate', label: 'Date received / activated', type: 'date' },
      { key: 'expirationDate', label: 'Expiration date', type: 'date' },
      notes,
    ],
  },
  {
    id: 'ids',
    label: 'IDs & Documents',
    emoji: '🪪',
    description: 'Government IDs, certificates and papers',
    titleField: 'documentName',
    timelineFields: ['receivedDate', 'dateIssued'],
    fields: [
      { key: 'documentName', label: 'Document / ID name', type: 'text', required: true },
      // Replaced the free-text "Issuing authority" (its old values are moved here on load).
      {
        key: 'documentType',
        label: 'ID/Document type',
        type: 'select',
        options: PH_ID_DOCUMENT_TYPES,
      },
      { key: 'documentNumber', label: 'ID/Document number', type: 'text' },
      { key: 'dateIssued', label: 'Date issued', type: 'date' },
      { key: 'receivedDate', label: 'Received date', type: 'date' },
      { key: 'expirationDate', label: 'Expiration date', type: 'date' },
      notes,
    ],
  },
  {
    id: 'events',
    label: 'Events',
    emoji: '📅',
    description: 'Occasions, appointments and milestones',
    titleField: 'eventName',
    timelineFields: ['date'],
    fields: [
      { key: 'eventName', label: 'Event name', type: 'text', required: true },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'organizer', label: 'Host / organizer', type: 'text' },
      notes,
    ],
  },
  {
    id: 'home',
    label: 'Home & Property',
    emoji: '🏠',
    description: 'Property, rentals and household items',
    titleField: 'propertyName',
    timelineFields: ['acquiredDate'],
    fields: [
      { key: 'propertyName', label: 'Property / item', type: 'text', required: true },
      {
        key: 'propertyType',
        label: 'Type',
        type: 'choice',
        options: ['House', 'Condo', 'Lot', 'Rental', 'Appliance', 'Furniture', 'Other'],
      },
      { key: 'address', label: 'Address / location', type: 'text' },
      { key: 'acquiredDate', label: 'Date acquired / moved in', type: 'date' },
      { key: 'amount', label: 'Value / rent', type: 'amount' },
      notes,
    ],
  },
  {
    id: 'vehicles',
    label: 'Vehicles',
    emoji: '🚗',
    description: 'Cars, motorcycles and registration',
    titleField: 'vehicleName',
    timelineFields: ['acquiredDate'],
    fields: [
      { key: 'vehicleName', label: 'Vehicle (make & model)', type: 'text', required: true },
      { key: 'plateNumber', label: 'Plate number', type: 'text' },
      { key: 'year', label: 'Year', type: 'number' },
      { key: 'acquiredDate', label: 'Date acquired', type: 'date' },
      { key: 'registrationExpiry', label: 'Registration expiry', type: 'date' },
      notes,
    ],
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    emoji: '🔧',
    description: 'Repairs, servicing and upkeep',
    titleField: 'task',
    timelineFields: ['serviceDate'],
    fields: [
      { key: 'task', label: 'Task / service', type: 'text', required: true },
      { key: 'item', label: 'Item / vehicle serviced', type: 'text' },
      { key: 'serviceDate', label: 'Service date', type: 'date', relativeLabel: 'Last done' },
      { key: 'provider', label: 'Service provider', type: 'text' },
      { key: 'amount', label: 'Cost', type: 'amount' },
      { key: 'nextDue', label: 'Next due', type: 'date' },
      notes,
    ],
  },
  {
    id: 'insurance',
    label: 'Insurance',
    emoji: '🛡️',
    description: 'Policies, coverage and renewals',
    titleField: 'policyName',
    timelineFields: ['startDate'],
    fields: [
      { key: 'policyName', label: 'Policy name', type: 'text', required: true },
      {
        key: 'coverageType',
        label: 'Coverage type',
        type: 'choice',
        options: ['Life', 'Health', 'Car', 'Home', 'Travel', 'Other'],
      },
      { key: 'provider', label: 'Insurance provider', type: 'text' },
      { key: 'policyNumber', label: 'Policy number', type: 'text' },
      { key: 'amount', label: 'Premium', type: 'amount' },
      { key: 'startDate', label: 'Start date', type: 'date' },
      { key: 'endDate', label: 'Renewal / end date', type: 'date' },
      notes,
    ],
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    emoji: '📱',
    description: 'Streaming, apps and memberships',
    titleField: 'serviceName',
    timelineFields: ['startDate'],
    fields: [
      { key: 'serviceName', label: 'Service name', type: 'text', required: true },
      { key: 'plan', label: 'Plan', type: 'text' },
      { key: 'amount', label: 'Cost', type: 'amount' },
      {
        key: 'billingCycle',
        label: 'Billing cycle',
        type: 'choice',
        options: ['Monthly', 'Quarterly', 'Yearly', 'One-time'],
      },
      { key: 'startDate', label: 'Start date', type: 'date' },
      { key: 'renewalDate', label: 'Next renewal', type: 'date' },
      notes,
    ],
  },
  {
    id: 'work',
    label: 'Work & Career',
    emoji: '💼',
    description: 'Employment, contracts and trainings',
    titleField: 'title',
    timelineFields: ['startDate'],
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      {
        key: 'recordType',
        label: 'Type',
        type: 'choice',
        options: ['Employment', 'Contract', 'Certificate', 'Training', 'Award', 'Other'],
      },
      { key: 'organization', label: 'Company / organization', type: 'text' },
      { key: 'startDate', label: 'Start date', type: 'date' },
      { key: 'endDate', label: 'End date', type: 'date' },
      notes,
    ],
  },
  {
    id: 'education',
    label: 'Education',
    emoji: '🎓',
    description: 'Schools, diplomas and transcripts',
    titleField: 'title',
    timelineFields: ['date'],
    fields: [
      { key: 'title', label: 'Title / program', type: 'text', required: true },
      {
        key: 'recordType',
        label: 'Type',
        type: 'choice',
        options: ['Diploma', 'Transcript', 'Certificate', 'Enrollment', 'Other'],
      },
      { key: 'school', label: 'School / institution', type: 'text' },
      { key: 'date', label: 'Date', type: 'date' },
      notes,
    ],
  },
  {
    id: 'health',
    label: 'Health & Wellness',
    emoji: '🏥',
    description: 'Checkups, prescriptions and results',
    titleField: 'title',
    timelineFields: ['date'],
    fields: [
      { key: 'title', label: 'Record / visit', type: 'text', required: true },
      {
        key: 'recordType',
        label: 'Type',
        type: 'choice',
        options: ['Checkup', 'Prescription', 'Lab result', 'Vaccination', 'Procedure', 'Other'],
      },
      { key: 'provider', label: 'Doctor / clinic', type: 'text' },
      { key: 'date', label: 'Date', type: 'date' },
      notes,
    ],
  },
  {
    id: 'travel',
    label: 'Travel',
    emoji: '✈️',
    description: 'Trips, bookings and itineraries',
    titleField: 'title',
    timelineFields: ['departureDate'],
    fields: [
      { key: 'title', label: 'Trip / booking', type: 'text', required: true },
      { key: 'destination', label: 'Destination', type: 'text' },
      { key: 'departureDate', label: 'Departure', type: 'date' },
      { key: 'returnDate', label: 'Return', type: 'date' },
      { key: 'bookingReference', label: 'Booking reference', type: 'text' },
      notes,
    ],
  },
  {
    id: 'warranties',
    label: 'Warranties',
    emoji: '📦',
    description: 'Product warranties and coverage dates',
    titleField: 'productName',
    timelineFields: ['purchaseDate'],
    fields: [
      { key: 'productName', label: 'Product', type: 'text', required: true },
      { key: 'store', label: 'Store / seller', type: 'text' },
      { key: 'purchaseDate', label: 'Purchase date', type: 'date' },
      { key: 'expirationDate', label: 'Warranty expires', type: 'date' },
      { key: 'serialNumber', label: 'Serial number', type: 'text' },
      notes,
    ],
  },
  {
    id: 'others',
    label: 'Others',
    emoji: '🔑',
    description: "Anything that doesn't fit elsewhere",
    titleField: 'title',
    timelineFields: ['date'],
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'date', label: 'Date', type: 'date' },
      notes,
    ],
  },
] as const satisfies readonly RecordCategory[];

export type RecordCategoryId = (typeof RECORD_CATEGORIES)[number]['id'];

export function getRecordCategory(id: string): RecordCategory | undefined {
  return RECORD_CATEGORIES.find((category) => category.id === id);
}
