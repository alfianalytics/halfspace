import type { RagDocument } from "./schemas.js";

export const CURATED_RAG_DOCUMENTS: RagDocument[] = [
  // ================= REGULATIONS =================
  {
    docId: "reg-liga1-u23-2627",
    title: "Regulasi PSSI & LIB Liga 1 2026/2027: Aturan Pemain U-23 Wajib Starter",
    category: "regulation",
    publishedDate: "2026-08-01",
    sourceUrl: "https://ligaindonesiabaru.com/regulations/liga1-2026-2027-u23",
    content:
      "Dalam regulasi resmi Indonesia Super League (Liga 1) musim 2026/2027 dan 2025/2026, setiap klub wajib menurunkan minimal 1 (satu) pemain lokal U-23 (kelahiran 1 Januari 2004 atau setelahnya untuk musim 26/27, usia <= 23 tahun) di dalam Starting XI (11 pemain pertama) pada setiap pertandingan. Pemain U-23 tersebut wajib bermain minimal 45 menit (satu babak penuh). Jika pemain U-23 starter tersebut cedera sebelum menit ke-45, ia boleh diganti dengan pemain U-23 lainnya agar kuota menit wajib tetap terpenuhi. Pengecualian diberikan apabila pemain U-23 klub tersebut sedang dipanggil memperkuat Timnas Indonesia.",
  },
  {
    docId: "reg-liga1-foreign-quota-2627",
    title: "Regulasi PSSI & LIB Liga 1 2026/2027: Kuota Pemain Asing (8 Terdaftar, 6 di Lapangan)",
    category: "regulation",
    publishedDate: "2026-08-01",
    sourceUrl: "https://ligaindonesiabaru.com/regulations/liga1-2026-2027-foreign-quota",
    content:
      "Regulasi kuota pemain asing Indonesia Super League (Liga 1) mengizinkan setiap klub mendaftarkan maksimal 8 pemain asing (bebas konfederasi/ASEAN). Namun, dalam satu waktu di atas lapangan (Starting XI maupun setelah pergantian pemain), maksimal hanya 6 pemain asing yang boleh bermain secara bersamaan di lapangan, sementara 2 pemain asing lainnya berada di bangku cadangan dan hanya boleh masuk menggantikan sesama pemain asing. Oleh karena itu, prediksi Starting XI tidak boleh menempatkan lebih dari 6 pemain non-IDN di lapangan sekaligus.",
  },
  {
    docId: "reg-liga1-cards-suspension",
    title: "Regulasi Disiplin Liga 1: Akumulasi Kartu Kuning & Kartu Merah",
    category: "regulation",
    publishedDate: "2026-08-01",
    sourceUrl: "https://ligaindonesiabaru.com/regulations/liga1-disciplinary-cards",
    content:
      "Aturan akumulasi kartu Liga 1: Pemain yang mengoleksi 4 kartu kuning pertama dalam pertandingan berbeda di musim yang sama otomatis terkena sanksi larangan bermain (skorsing) 1 pertandingan pada pekan berikutnya. Setelah itu, kelipatan 3 kartu kuning berikutnya (kartu kuning ke-7, ke-10, ke-13) juga menghasilkan skorsing 1 pertandingan. Pemain yang menerima kartu merah tidak langsung (2 kartu kuning dalam 1 laga / yellow_red_card) absen 1 pertandingan berikutnya, sedangkan kartu merah langsung (red_card) absen minimal 1-2 pertandingan tergantung keputusan Komdis PSSI.",
  },

  // ================= METHODOLOGY & METRIC DICTIONARY =================
  {
    docId: "method-padj-defense",
    title: "Metodologi Halfspace: Possession-Adjusted (PAdj) Defensive Metrics per 500 Opponent Touches",
    category: "methodology",
    publishedDate: "2026-09-01",
    sourceUrl: "https://halfspace.id/docs/methodology/padj-defense",
    content:
      "Angka bertahan mentah (raw tackles, interceptions, dan ball recoveries per 90 menit) sangat dipengaruhi oleh seberapa sering tim lawan menguasai bola. Bek atau gelandang dari tim dominan penguasaan bola seperti Persib Bandung, Borneo FC, atau Persija Jakarta terlihat memiliki tekel mentah yang rendah karena lawan jarang memegang bola. Oleh karena itu, standar analisis wajib melaporkan Raw Per 90 sekaligus Possession-Adjusted (PAdj per 500 sentuhan lawan): PAdj = (metrik_bertahan / opponent_touches) * 500, di mana opponent_touches adalah total sentuhan lawan di pertandingan tersebut.",
  },
  {
    docId: "method-progression-proxy-liga1",
    title: "Metodologi Halfspace: Progresi Bola di Liga 1 (Accurate Long Balls & Attacking Third Touches)",
    category: "methodology",
    publishedDate: "2026-09-01",
    sourceUrl: "https://halfspace.id/docs/methodology/ball-progression-liga1",
    content:
      "PENTING: Data feed Indonesia Super League (Liga 1) tidak menyediakan metrik event 'Progressive Passes' (umpan progresif). Jangan pernah mengarang angka progressive passes untuk pemain Liga 1. Ketika pengguna menanyakan kemampuan progresi bola atau umpan progresif, jelaskan secara eksplisit bahwa data progressive passes tidak tersedia di feed Liga 1, dan gunakan alternatif standar yang tervalidasi di database: (1) Umpan Jauh Akurat per 90 (accurate_long_balls / total_long_balls), (2) Umpan Akurat di Area Lawan per 90 (accurate_opposition_half_passes), dan (3) Sentuhan di Sepertiga Akhir (att_3rd_touches).",
  },
  {
    docId: "method-keypass-and-positions",
    title: "Metodologi Halfspace: Key Passes vs Chances Created & True Positional Filtering (>= 35%)",
    category: "methodology",
    publishedDate: "2026-09-01",
    sourceUrl: "https://halfspace.id/docs/methodology/keypasses-and-positions",
    content:
      "1. Key Passes vs Chances Created: Di dalam skema data pertandingan Liga 1 kami, kolom key_pass sudah mencakup umpan yang berbuah gol (goal_assist). Oleh karena itu, Chancen Created sama persis dengan Key Passes; jangan pernah menjumlahkan key_pass + goal_assist karena akan menghitung assist dua kali. 2. True Positional Filtering: Label posisi biodata pemain (D, M, F) sering tidak mencerminkan peran asli di lapangan. Gunakan resolusi posisi spesifik (starter formation + estimasi ML LightGBM pada titik koordinat rata-rata pemain: GK, CB, FB, WB, DM, CM, AM, W, F) dengan syarat minimal >= 35% menit bermain di posisi tersebut dan minimal >= 450 menit bermain untuk sampel satu musim penuh (atau >= 180 menit dengan badge Early Season Sample untuk musim yang sedang berjalan 26/27).",
  },

  // ================= MATCHWEEK NEWS (INJURIES, DOUBTFUL, SUSPENSIONS, TIMNAS) =================
  {
    docId: "news-persib-prematch-nov26",
    title: "Update Kondisi Skuad Persib Bandung Jelang Big Match: Marc Klok Fit, Febri Hariyadi Absen Cedera, David da Silva Diragukan (50/50)",
    category: "news",
    club: "Persib Bandung",
    publishedDate: "2026-11-24",
    sourceUrl: "https://bola.com/indonesia/read/persib-bandung-update-skuad-november-2026",
    content:
      "Pelatih Persib Bandung Bojan Hodak memberikan update kondisi pemain jelang laga pekan ini. Winger Febri Hariyadi dipastikan absen (Confirmed Out) karena masih menjalani pemulihan cedera ligamen lutut. Sementara itu, striker andalan David da Silva kondisinya masih 50/50 (Doubtful / Diragukan tampil) setelah mengalami sedikit ketegangan otot paha pada sesi latihan terakhir; jika David da Silva tidak fit penuh, Dimas Drajad disiapkan sebagai pelapis utama di posisi ujung tombak. Di lini tengah, Marc Klok, Tyronne del Pino, dan Beckham Putra (atau Kakang Rudianto untuk kuota U-23) dalam kondisi siap tempur.",
  },
  {
    docId: "news-persija-prematch-nov26",
    title: "Update Skuad Persija Jakarta: Ondrej Kudela Absen Akumulasi Kartu, Rizky Ridho & Maciej Gajos Siap Starter",
    category: "news",
    club: "Persija Jakarta",
    publishedDate: "2026-11-24",
    sourceUrl: "https://detik.com/sepakbola/liga-indonesia/persija-jakarta-kudela-akumulasi-nov2026",
    content:
      "Persija Jakarta dipastikan tampil tanpa bek tengah asing Ondrej Kudela yang harus menjalani hukuman skorsing akumulasi kartu (Confirmed Out - Suspended). Posisi Kudela di jantung pertahanan tiga bek Persija akan diisi oleh Hansamu Yama atau Akbar Arjunsyah untuk mendampingi kapten Rizky Ridho dan Muhammad Ferarri. Sementara itu, winger Ryo Matsumura berstatus 50/50 (Doubtful / Diragukan tampil) karena flu ringan dengan Witan Sulaeman siap menjadi backup langsung. Untuk slot wajib U-23, Persija menyiapkan Rayhan Hannan atau Dony Tri Pamungkas sejak menit awal.",
  },
  {
    docId: "news-persebaya-prematch-nov26",
    title: "Kabar Persebaya Surabaya: Ernando Ari Pulih, Bruno Moreira & Francisco Rivera Pimpin Lini Serang",
    category: "news",
    club: "Persebaya Surabaya",
    publishedDate: "2026-11-23",
    sourceUrl: "https://kompas.com/bola/read/persebaya-surabaya-ernando-ari-rivera-nov2026",
    content:
      "Persebaya Surabaya mendapat tambahan tenaga jelang laga pekan ini. Kiper utama Ernando Ari sudah kembali berlatih penuh namun statusnya masih dipantau 50/50 (Doubtful / Diragukan) oleh tim medis, dengan Andhika Ramadhani siap sebagai kiper backup. Gelandang bertahan Muhammad Hidayat masih absen (Confirmed Out) karena pemulihan cedera meniskus. Pelatih Paul Munster memastikan kreativitas serangan tetap bertumpu pada Francisco Rivera dan Bruno Moreira, sementara Toni Firmansyah disiapkan mengisi slot starter wajib U-23 di lini tengah.",
  },
  {
    docId: "news-borneo-prematch-nov26",
    title: "Update Borneo FC Samarinda: Stefano Lilipaly & Mariano Peralta On Fire, Rivaldo Pakpahan Starter U-23",
    category: "news",
    club: "Borneo FC",
    publishedDate: "2026-11-23",
    sourceUrl: "https://bola.net/indonesia/borneo-fc-update-starting-xi-nov2026.html",
    content:
      "Borneo FC Samarinda siap menurunkan kekuatan terbaik dengan skema 4-3-3 penguasaan bola tinggi. Gelandang muda Rivaldo Enero Pakpahan kembali diplot sebagai starter untuk memenuhi regulasi wajib pemain U-23 sekaligus menjadi penyeimbang bersama Kei Hirose. Bek tengah Christophe Nduwarugira berstatus 50/50 (Doubtful) akibat benturan engkel ringan dengan Diego Michiels sebagai opsi pelapis.",
  },
  {
    docId: "news-bali-united-prematch-nov26",
    title: "Update Bali United: Kadek Arel & Rahmat Arjuna Penuhi Kuota U-23, Eber Bessa Absen",
    category: "news",
    club: "Bali United",
    publishedDate: "2026-11-22",
    sourceUrl: "https://tribunnews.com/superball/bali-united-kadek-arel-update-nov2026",
    content:
      "Bali United mengandalkan bek tengah muda potensial Kadek Arel Priyatna dan winger Rahmat Arjuna yang tampil konsisten memenuhi kuota starter U-23. Di sisi lain, gelandang I Made Tito masih harus menepi (Confirmed Out) akibat cedera lutut, sementara Privat Mbarga dalam kondisi bugar 100% untuk memimpin transisi cepat Serdadu Tridatu.",
  },
  {
    docId: "news-psm-prematch-nov26",
    title: "Kabar PSM Makassar: Yuran Fernandes Kokoh di Belakang, Ananda Raehan Kunci Lini Tengah U-23",
    category: "news",
    club: "PSM Makassar",
    publishedDate: "2026-11-22",
    sourceUrl: "https://bola.com/indonesia/psm-makassar-yuran-fernandes-ananda-raehan",
    content:
      "PSM Makassar asuhan Bernardo Tavares tetap setia dengan gaya direct play dan duel fisik tinggi serta efektivitas bola mati (set-piece xG tinggi) yang bertumpu pada bek jangkung Yuran Fernandes. Gelandang muda Ananda Raehan Alief dan Victor Dethan menjadi tumpuan slot U-23, sementara M. Arfan masih absen panjang (Confirmed Out) karena cedera ACL.",
  },

  // ================= TACTICAL PROFILES =================
  {
    docId: "tactical-liga1-club-styles",
    title: "Profil Taktik Klub Liga 1: High Possession vs Direct Transition",
    category: "tactical_profile",
    publishedDate: "2026-10-15",
    sourceUrl: "https://halfspace.id/docs/tactical/liga1-club-profiles",
    content:
      "Karakter taktik klub-klub utama Liga 1: (1) Borneo FC & Persija Jakarta: Dominan penguasaan bola dan sirkulasi umpan pendek dari belakang, sehingga bek dan gelandang mereka wajib dievaluasi menggunakan metrik PAdj (Possession-Adjusted). (2) Persib Bandung: Sangat efisien dalam transisi menyerang cepat (fast break) dan memiliki kombinasi Open-Play xG serta Set-Piece xG tertinggi di liga. (3) PSM Makassar: Mengandalkan blok pertahanan rapat, penguasaan bola rendah, namun sangat mematikan lewat umpan jauh langsung (long balls) dan situasi bola mati (corner & lemparan jauh). (4) Persebaya Surabaya & Dewa United: Mengandalkan kreator nomor 10 (seperti Francisco Rivera dan Alexis Messidoro) dengan volume sentuhan sepertiga akhir (att_3rd_touches) dan key passes yang tinggi.",
  },
];
