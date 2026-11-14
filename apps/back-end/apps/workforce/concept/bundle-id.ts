import { type BundleConcept } from './bundles'

/**
 * Builds one concept with Indonesian and English display text.
 *
 * @param system - Code system.
 * @param code - Code inside the system.
 * @param indonesian - Text in Indonesian (`id-ID`).
 * @param english - Text in English (`en`).
 * @param properties - Attributes that rules read.
 * @param mappings - Equivalent codes in universal systems, as `[system, code]` pairs.
 * @returns The concept.
 */
function concept(
  system: string,
  code: string,
  indonesian: string,
  english: string,
  properties: Record<string, unknown> = {},
  mappings: [string, string][] = [],
): BundleConcept {
  return {
    system,
    code,
    display: [
      { locale: 'id-ID', text: indonesian },
      { locale: 'en', text: english },
    ],
    properties,
    mappings: mappings.map(([mappedSystem, mappedCode]) => ({
      system: mappedSystem,
      code: mappedCode,
    })),
  }
}

/**
 * Indonesian defaults (bundle `id`): the code systems the HR specification names, with the
 * properties later rules read. The profession list is a starter list and its ISCO-08 mappings
 * come from memory of the standard; HR and legal must verify both before go-live
 * (`gateway-hr-1-3-code-concepts.md` C11).
 */
export const INDONESIA_CONCEPTS: readonly BundleConcept[] = [
  concept(
    'id.workforce-category',
    'tenaga_medis',
    'Tenaga Medis',
    'Medical practitioners',
    {
      is_clinical: true,
      credentialing_committee: 'komite_medik',
    },
  ),
  concept(
    'id.workforce-category',
    'tenaga_keperawatan',
    'Tenaga Keperawatan',
    'Nurses and midwives',
    {
      is_clinical: true,
      credentialing_committee: 'komite_keperawatan',
    },
  ),
  concept(
    'id.workforce-category',
    'tenaga_kesehatan_lain',
    'Tenaga Kesehatan Lainnya',
    'Other health professionals',
    {
      is_clinical: true,
      credentialing_committee: 'komite_tenaga_kesehatan_lain',
    },
  ),
  concept(
    'id.workforce-category',
    'non_klinis',
    'Non-Klinis',
    'Non-clinical staff',
    {
      is_clinical: false,
      credentialing_committee: null,
    },
  ),

  concept(
    'id.employment-type',
    'pkwtt',
    'PKWTT (Karyawan Tetap)',
    'Permanent employee',
    { allows_probation: true, requires_end_date: false },
    [['employment-type', 'permanent']],
  ),
  concept(
    'id.employment-type',
    'pkwt',
    'PKWT (Karyawan Kontrak)',
    'Fixed-term employee',
    { allows_probation: false, requires_end_date: true },
    [['employment-type', 'fixed_term']],
  ),
  concept(
    'id.employment-type',
    'mitra',
    'Mitra (Praktisi Kontrak)',
    'Contracted practitioner',
    { allows_probation: false, requires_end_date: false },
    [['employment-type', 'contractor']],
  ),
  concept(
    'id.employment-type',
    'intern',
    'Peserta Magang',
    'Intern',
    { allows_probation: false, requires_end_date: true },
    [['employment-type', 'trainee']],
  ),

  concept(
    'id.license-type',
    'str',
    'Surat Tanda Registrasi (STR)',
    'Registration certificate (STR)',
    {
      eligibility_role: 'registration',
      requires_expiry_date: false,
      location_specific: false,
      max_locations_parameter: null,
    },
  ),
  concept(
    'id.license-type',
    'sip',
    'Surat Izin Praktik (SIP)',
    'Practice permit (SIP)',
    {
      eligibility_role: 'practice_permit',
      requires_expiry_date: true,
      location_specific: true,
      max_locations_parameter: 'MAX_PRACTICE_LOCATIONS_MEDIS',
    },
  ),

  concept(
    'id.license-verification-method',
    'manual_registry_check',
    'Pemeriksaan manual pada registri',
    'Manual registry check',
  ),
  concept(
    'id.license-verification-method',
    'document_review',
    'Pemeriksaan dokumen asli',
    'Original document review',
  ),

  concept(
    'id.license-status-reason',
    'document_mismatch',
    'Dokumen tidak sesuai dengan aslinya',
    'Document does not match the original',
  ),
  concept(
    'id.license-status-reason',
    'registry_mismatch',
    'Data tidak sesuai dengan registri',
    'Data does not match the registry',
  ),
  concept(
    'id.license-status-reason',
    'wrong_profession',
    'Profesi tidak sesuai',
    'Profession does not match',
  ),
  concept(
    'id.license-status-reason',
    'revoked_by_authority',
    'Dicabut oleh penerbit',
    'Revoked by the issuing authority',
  ),
  concept(
    'id.license-status-reason',
    'suspended_by_authority',
    'Dibekukan oleh penerbit',
    'Suspended by the issuing authority',
  ),
  concept('id.license-status-reason', 'other', 'Lainnya', 'Other'),

  concept('id.credit-system', 'skp', 'Satuan Kredit Profesi (SKP)', 'Professional credit units (SKP)'),

  concept(
    'id.cpd-category',
    'learning',
    'Pembelajaran',
    'Learning',
  ),
  concept('id.cpd-category', 'service', 'Pelayanan', 'Service'),
  concept(
    'id.cpd-category',
    'community_service',
    'Pengabdian masyarakat',
    'Community service',
  ),
  concept(
    'id.cpd-category',
    'publication',
    'Publikasi ilmiah',
    'Scientific publication',
  ),
  concept(
    'id.cpd-category',
    'development',
    'Pengembangan ilmu',
    'Knowledge development',
  ),

  concept('id.unit-type', 'directorate', 'Direktorat', 'Directorate', {
    clinical_default: false,
  }),
  concept('id.unit-type', 'department', 'Bagian', 'Department', {
    clinical_default: false,
  }),
  concept('id.unit-type', 'installation', 'Instalasi', 'Installation', {
    clinical_default: true,
  }),
  concept('id.unit-type', 'ward', 'Ruang Rawat', 'Ward', {
    clinical_default: true,
  }),
  concept('id.unit-type', 'polyclinic', 'Poliklinik', 'Polyclinic', {
    clinical_default: true,
  }),

  concept('id.assignment-kind', 'hire', 'Pengangkatan', 'Hire'),
  concept('id.assignment-kind', 'transfer', 'Mutasi', 'Transfer'),
  concept('id.assignment-kind', 'promotion', 'Promosi', 'Promotion'),
  concept('id.assignment-kind', 'acting', 'Pelaksana Tugas (Plt.)', 'Acting'),
  concept('id.assignment-kind', 'secondment', 'Perbantuan', 'Secondment'),

  concept('id.committee', 'komite_medik', 'Komite Medik', 'Medical Committee'),
  concept(
    'id.committee',
    'komite_keperawatan',
    'Komite Keperawatan',
    'Nursing Committee',
  ),
  concept(
    'id.committee',
    'komite_tenaga_kesehatan_lain',
    'Komite Tenaga Kesehatan Lain',
    'Allied Health Committee',
  ),

  concept('id.committee-role', 'chair', 'Ketua', 'Chair'),
  concept('id.committee-role', 'secretary', 'Sekretaris', 'Secretary'),
  concept('id.committee-role', 'member', 'Anggota', 'Member'),
  concept(
    'id.committee-role',
    'mitra_bestari',
    'Mitra Bestari',
    'Peer assessor',
  ),

  concept(
    'id.profession',
    'dokter',
    'Dokter',
    'General practitioner',
    { workforce_category: 'tenaga_medis' },
    [['isco-08', '2211']],
  ),
  concept(
    'id.profession',
    'dokter_spesialis',
    'Dokter Spesialis',
    'Specialist physician',
    { workforce_category: 'tenaga_medis' },
    [['isco-08', '2212']],
  ),
  concept(
    'id.profession',
    'dokter_gigi',
    'Dokter Gigi',
    'Dentist',
    { workforce_category: 'tenaga_medis' },
    [['isco-08', '2261']],
  ),
  concept(
    'id.profession',
    'perawat',
    'Perawat',
    'Nurse',
    { workforce_category: 'tenaga_keperawatan' },
    [['isco-08', '2221']],
  ),
  concept(
    'id.profession',
    'bidan',
    'Bidan',
    'Midwife',
    { workforce_category: 'tenaga_keperawatan' },
    [['isco-08', '2222']],
  ),
  concept(
    'id.profession',
    'apoteker',
    'Apoteker',
    'Pharmacist',
    { workforce_category: 'tenaga_kesehatan_lain' },
    [['isco-08', '2262']],
  ),
  concept(
    'id.profession',
    'fisioterapis',
    'Fisioterapis',
    'Physiotherapist',
    { workforce_category: 'tenaga_kesehatan_lain' },
    [['isco-08', '2264']],
  ),
  concept(
    'id.profession',
    'ahli_gizi',
    'Ahli Gizi',
    'Nutritionist',
    { workforce_category: 'tenaga_kesehatan_lain' },
    [['isco-08', '2265']],
  ),
  concept(
    'id.profession',
    'analis_kesehatan',
    'Analis Kesehatan',
    'Medical laboratory technologist',
    { workforce_category: 'tenaga_kesehatan_lain' },
    [['isco-08', '3212']],
  ),
  concept(
    'id.profession',
    'radiografer',
    'Radiografer',
    'Radiographer',
    { workforce_category: 'tenaga_kesehatan_lain' },
    [['isco-08', '3211']],
  ),
]
