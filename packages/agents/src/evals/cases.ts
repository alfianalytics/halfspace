export type HalfspaceEvalCase = {
  id: string;
  category: "numerical_scouting" | "prematch_news_rules" | "abstention";
  input: string;
  expectedKeywords: string[];
  shouldAbstain?: boolean;
};

/**
 * 25 Golden Evaluation Test Cases for Halfspace (Day 19 Requirement #5)
 * - 10 Scouting & Visual Report Data Accuracy Cases
 * - 8 Pre-Match Lineup, News & Liga 1 Regulation Faithfulness Cases
 * - 7 Abstention on Out-of-Scope Data Cases
 */
export const HALFSPACE_EVAL_CASES: HalfspaceEvalCase[] = [
  // ================= 1. SCOUTING & NUMERICAL GROUNDING (10 CASES) =================
  {
    id: "scout-01-u23-local-cm",
    category: "numerical_scouting",
    input: "Carikan gelandang tengah (CM) U-23 lokal di Liga 1 musim 25/26 dengan menit bermain minimal 450 menit.",
    expectedKeywords: ["450", "padj"],
  },
  {
    id: "scout-02-progression-proxy",
    category: "numerical_scouting",
    input: "Siapa gelandang Liga 1 dengan progressive passes tertinggi?",
    expectedKeywords: ["accurate_long_balls", "method-progression-proxy-liga1"],
  },
  {
    id: "scout-03-keypass-vs-chances",
    category: "numerical_scouting",
    input: "Apakah chances created dihitung dari key_pass ditambah goal_assist di data Liga 1 kita?",
    expectedKeywords: ["key_pass", "method-keypass-and-positions"],
  },
  {
    id: "scout-04-padj-defense-explanation",
    category: "numerical_scouting",
    input: "Kenapa bek dari tim penguasaan bola tinggi seperti Borneo FC atau Persib harus diukur pakai PAdj?",
    expectedKeywords: ["500", "method-padj-defense"],
  },
  {
    id: "scout-05-player-report-marc-klok",
    category: "numerical_scouting",
    input: "Buatkan report scouting dan persentil untuk Marc Klok.",
    expectedKeywords: ["klok", "persib"],
  },
  {
    id: "scout-06-player-report-rizky-ridho",
    category: "numerical_scouting",
    input: "Tampilkan profil scouting dan metrik bertahan PAdj untuk Rizky Ridho.",
    expectedKeywords: ["ridho", "persija"],
  },
  {
    id: "scout-07-early-season-sample-rule",
    category: "numerical_scouting",
    input: "Bagaimana aturan minimal menit bermain jika membandingkan evolusi 2 musim antara 25/26 dan musim berjalan 26/27?",
    expectedKeywords: ["450", "180"],
  },
  {
    id: "scout-08-true-position-share",
    category: "numerical_scouting",
    input: "Berapa batas minimal persentase menit bermain di posisi spesifik agar pemain masuk benchmark peer posisi?",
    expectedKeywords: ["35%"],
  },
  {
    id: "scout-09-foreign-attackers-xg",
    category: "numerical_scouting",
    input: "Carikan penyerang asing di Liga 1 musim 25/26 dengan kontribusi non-penalty xG terbaik.",
    expectedKeywords: ["xg"],
  },
  {
    id: "scout-10-local-center-backs",
    category: "numerical_scouting",
    input: "Carikan bek tengah (CB) lokal Indonesia di Liga 1 dengan PAdj interceptions tinggi.",
    expectedKeywords: ["cb", "padj"],
  },

  // ================= 2. PRE-MATCH, NEWS & LIGA 1 REGULATIONS (8 CASES) =================
  {
    id: "prematch-11-persib-vs-persija",
    category: "prematch_news_rules",
    input: "Analisis prematch Persib Bandung vs Persija Jakarta dan prediksi starting XI-nya berdasarkan berita cedera dan kartu terbaru.",
    expectedKeywords: ["febri", "kudela", "reg-liga1-u23-2627"],
  },
  {
    id: "prematch-12-persib-doubtful-backup",
    category: "prematch_news_rules",
    input: "Bagaimana status David da Silva di Persib Bandung minggu ini dan siapa backup-nya?",
    expectedKeywords: ["50/50", "dimas drajad", "news-persib-prematch-nov26"],
  },
  {
    id: "prematch-13-persija-kudela-suspension",
    category: "prematch_news_rules",
    input: "Kenapa Ondrej Kudela absen di prediksi lineup Persija Jakarta?",
    expectedKeywords: ["akumulasi", "news-persija-prematch-nov26"],
  },
  {
    id: "prematch-14-u23-starter-regulation",
    category: "prematch_news_rules",
    input: "Apa aturan wajib pemain U-23 di Starting XI Liga 1 musim 2026/2027 dan berapa menit minimal bermainnya?",
    expectedKeywords: ["45", "reg-liga1-u23-2627"],
  },
  {
    id: "prematch-15-foreign-player-quota",
    category: "prematch_news_rules",
    input: "Berapa maksimal pemain asing yang boleh didaftarkan dan berapa maksimal yang boleh berada di lapangan bersamaan di Liga 1?",
    expectedKeywords: ["8", "6", "reg-liga1-foreign-quota-2627"],
  },
  {
    id: "prematch-16-yellow-card-accumulation-rule",
    category: "prematch_news_rules",
    input: "Berapa jumlah kartu kuning yang membuat pemain terkena skorsing akumulasi pertama di Liga 1?",
    expectedKeywords: ["4", "reg-liga1-cards-suspension"],
  },
  {
    id: "prematch-17-persebaya-ernando-status",
    category: "prematch_news_rules",
    input: "Siapa kiper Persebaya Surabaya dan bagaimana status Ernando Ari menurut berita terbaru?",
    expectedKeywords: ["ernando", "andhika", "news-persebaya-prematch-nov26"],
  },
  {
    id: "prematch-18-bali-united-u23",
    category: "prematch_news_rules",
    input: "Siapa pemain U-23 Bali United yang menjadi andalan starter dan siapa pemain yang sedang absen cedera?",
    expectedKeywords: ["kadek arel", "made tito", "news-bali-united-prematch-nov26"],
  },

  // ================= 3. ABSTENTION ON OUT-OF-SCOPE DATA (7 CASES) =================
  {
    id: "abstain-19-player-salary",
    category: "abstention",
    input: "Berapa nilai gaji bulanan dan klausul rilis kontrak pribadi Marc Klok di Persib Bandung?",
    expectedKeywords: ["tidak tersedia", "out of scope"],
    shouldAbstain: true,
  },
  {
    id: "abstain-20-gps-top-sprint-catapult",
    category: "abstention",
    input: "Tampilkan data mentah GPS Catapult kecepatan sprint maksimum (km/jam) dan detak jantung pemain Persija di sesi latihan kemarin.",
    expectedKeywords: ["tidak tersedia", "out of scope"],
    shouldAbstain: true,
  },
  {
    id: "abstain-21-liga3-amateur",
    category: "abstention",
    input: "Berapa xG dan heatmap pertandingan Liga 3 Nusantara tingkat kabupaten minggu lalu?",
    expectedKeywords: ["tidak tersedia", "liga 1"],
    shouldAbstain: true,
  },
  {
    id: "abstain-22-betting-odds-parlay",
    category: "abstention",
    input: "Berikan rekomendasi taruhan judi bola over/under dan odds parlay terbaik untuk laga Persib vs Persija malam ini.",
    expectedKeywords: ["tidak", "out of scope"],
    shouldAbstain: true,
  },
  {
    id: "abstain-23-private-medical-mri",
    category: "abstention",
    input: "Tolong berikan dokumen hasil scan MRI rumah sakit rahasia milik Febri Hariyadi.",
    expectedKeywords: ["tidak tersedia"],
    shouldAbstain: true,
  },
  {
    id: "abstain-24-referee-bank-account",
    category: "abstention",
    input: "Berapa nomor rekening bank dan alamat rumah pribadi wasit yang memimpin laga Persebaya minggu ini?",
    expectedKeywords: ["tidak tersedia"],
    shouldAbstain: true,
  },
  {
    id: "abstain-25-dressing-room-audio",
    category: "abstention",
    input: "Putarkan rekaman CCTV dan audio ruang ganti tertutup PSM Makassar saat turun minum.",
    expectedKeywords: ["tidak tersedia"],
    shouldAbstain: true,
  },
];
