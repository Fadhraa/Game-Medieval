# Roti & Benteng

**Roti & Benteng** adalah game strategi *2D pixel-art side-scrolling (tug-of-war)* berbasis web (*vanilla HTML5, Canvas, CSS, dan JavaScript OOP*). Pemain mengelola ekonomi pertanian gandum untuk memproduksi roti, lalu merekrut dan meng-upgrade pasukan hero demi mempertahankan **Benteng Kerajaan** serta menghancurkan **Markas Goblin** di 6 Chapter (18 Stage).

---

## Fitur Utama

- **Sistem Ekonomi Pertanian Aktif**: Panggil **Petani** untuk menanam, menumbuhkan, memanen gandum, dan menyetor roti ke benteng. Pemain dapat membuka **Petak Kedua** setelah mencapai Chapter 2.
- **4 Hero dengan Peran Taktis Berbeda**: Tanker (*James*), Infanteri (*Ksatria Pedang*), AoE Mage (*Wizard Api*), dan Healer/Support (*Kira*).
- **Kampanye 6 Chapter (18 Stage) & 3 Bioma Arena**: Mulai dari *Ladang Perbatasan*, *Benteng Goblin*, *Jalur Pegunungan*, *Benteng Raja Goblin*, hingga bioma baru *Rawa Senja* dan *Puncak Beku*.
- **AI Enemy Director & Variasi Musuh + Boss**: Musuh beradaptasi terhadap komposisi pasukan pemain, lengkap dengan unit pemanah (*Archer Goblin*), penyihir penyembuh & pemanggil (*Witcher*), serta 3 Boss unik (*Panglima Mahkota Retak*, *Raksasa Akar*, dan *Golem Es*).
- **Sistem Progres, Upgrade & Save File**: Kumpulkan koin dari kemenangan dan eliminasi musuh untuk meningkatkan level pasukan di **Barak** (hingga Level 8) dan efisiensi petani di **Lumbung** (hingga Level 4). Progres tersimpan otomatis di `localStorage` dan dapat di-**Export / Import** dalam format JSON.
- **Visual & Audio Lengkap**: Latar belakang paralaks multi-lapisan, *floating combat numbers* (damage & heal), indikator status (*stun* & *slow*), serta efek suara (`.wav`) dan musik latar (`.mp3`).

---

## Alur Permainan & Struktur Layar

Game memiliki alur antarmuka penuh di `index.html` dan `src/main.js`:
1. **Lobi Utama**: Menampilkan saldo koin, progres stage, tombol **Export / Import / Reset Progres**, serta akses ke **Kampanye**, **Barak**, dan **Lumbung**.
2. **Peta Kampanye**: Memilih Chapter dan Stage yang sudah terbuka, lengkap dengan *briefing* taktis sebelum pertempuran dimulai.
3. **Barak Pasukan**: Meng-upgrade stat HP, ATK, splash damage, atau persentase heal untuk *Ksatria Pedang*, *Wizard Api*, *Kira*, dan *James* (maksimal Level 8).
4. **Lumbung**: Meng-upgrade kapasitas setoran roti, kecepatan jalan, dan durasi panen *Petani Gandum* (maksimal Level 4), serta membeli **Petak Kedua** seharga 80 (8,0) koin.
5. **Arena Pertempuran**: Kanvas selebar `1040px` (`WORLD_WIDTH`) dengan kamera yang dapat digeser (*drag* / tombol kamera).

---

## Daftar Unit & Ekonomi

### 1. Ekonomi (Pertanian)
- **Petani Gandum** (`src/entities/Farm.js`): Biaya **1 roti** (40 HP). Berjalan dari benteng ke petak ladang, menanam 3 rumpun gandum, menunggu matang, memanen, dan menyetor **+4 roti** (dasar, dapat ditingkatkan).
- Sistem cadangan otomatis menyisakan 1 roti agar pemain tidak kehabisan roti saat belum ada petani aktif.

### 2. Pasukan Hero (Milik Pemain)
| Unit | Peran | Biaya | Cooldown | Stat Dasar | Kemampuan Khusus |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **Ksatria Pedang** (`Knight.js`) | Infanteri Jarak Dekat | 2 roti | 1,5 dtk | 75 HP · 10 ATK | Serangan cepat, maksimal 2 ksatria per slot target. |
| **James** (`James.js`) | Tanker & Crowd Control | 4 roti | 4 dtk | 120 HP · 7,5 ATK | Setiap serangan ke-4 melakukan *Shield Bash* yang memberikan **Stun 1 detik** pada musuh. |
| **Kira** (`Kira.js`) | Healer & Ranged Magic | 6 roti | 5 dtk | 55 HP · 20 ATK | Prioritas menyembuhkan 1 kawan di depannya (HP terendah, 5% HP maks. tiap 2,25 dtk). Jika tidak ada yang perlu di-heal, menembakkan petir (*Lightning Bolt*). |
| **Wizard Api** (`Wizard.js`) | Ranged AoE Mage | 8 roti | 5 dtk | 45 HP · 35 ATK | Menembakkan *Fireball* (75 hit utama + 5 damage sebaran/splash radius `34px`). |

### 3. Pasukan Musuh & Boss
| Musuh / Boss | Tipe | Stat & Mekanik | Hadiah Koin |
| :--- | :--- | :--- | :---: |
| **Goblin** (`Goblin.js`) | Infanteri | 50 HP · 15 ATK · Cepat dan agresif. | 0,1 koin |
| **Archer Goblin** (`ArcherGoblin.js`) | Pemanah Jarak Jauh | 35 HP · 20 ATK · Menembakkan panah (*Goblin Bolt*) dari jarak `140px`. | 0,1 koin |
| **Minotaur** (`Minotaur.js`) | Heavy Bruiser | 124 HP · 20 ATK · Pasif: saat HP ≤ 25%, kebal 1 detik lalu memulihkan HP ke 50%. | 0,5 koin |
| **Witcher** (`Witcher.js`) | Support & Summoner | 40 HP · 50 ATK · Bersembunyi di belakang, menyembuhkan monster di depannya (12% HP), dan memanggil Minotaur pelindung. | 1,0 koin |
| **Panglima Mahkota Retak** (`Commander.js`) | **Boss Stage 12** | 6.000 HP · 100 ATK · Muncul saat HP markas musuh ≤ 60%. Tahan 20% magic damage, punya mode *Guard* (-30% damage) diikuti tebasan area 300 damage. | 5,0 koin |
| **Raksasa Akar** (`ArenaBoss.js`) | **Boss Stage 15** | 4.600 HP · 85 ATK · Muncul saat HP markas musuh ≤ 65%. Skill hantaman fisik area (`72px`) sebesar 180 damage tiap 12 detik. | 7,0 koin |
| **Golem Es** (`ArenaBoss.js`) | **Boss Stage 18** | 5.900 HP · 100 ATK · Muncul saat HP markas musuh ≤ 70%. Skill gelombang es area (`108px`) sebesar 140 damage + efek **Slow 3 detik**. | 9,0 koin |

*(Catatan: Hadiah kemenangan setiap stage adalah **5,0 koin**).*

---

## Daftar Chapter & Stage Kampanye

1. **Chapter 1 — Ladang Perbatasan** (Stage 1–3): Pengenalan petani, goblin, dan minotaur awal.
2. **Chapter 2 — Benteng Goblin** (Stage 4–6): Kehadiran pemanah goblin dan Witcher.
3. **Chapter 3 — Jalur Pegunungan** (Stage 7–9): Tekanan campuran minotaur dan pemanah beruntun.
4. **Chapter 4 — Benteng Raja Goblin** (Stage 10–12): Pertempuran puncak melawan **Panglima Mahkota Retak**.
5. **Chapter 5 — Rawa Senja** (Stage 13–15, Arena *Swamp*): Pertempuran di jalur rawa melawan **Raksasa Akar**.
6. **Chapter 6 — Puncak Beku** (Stage 16–18, Arena *Frost*): Pertempuran bersalju melawan **Golem Es**.

---

## Struktur Proyek & Arsitektur Kode

Proyek dibangun menggunakan arsitektur **OOP murni tanpa bundler** (`<script defer>` di `index.html`):

```text
roti-dan-benteng/
├── index.html                  # Struktur multi-screen & urutan pemuatan script
├── style.css                   # Desain responsif, kartu HUD, dan dialog menu
├── assets/
│   ├── Back_sound/             # Musik latar (1.mp3)
│   ├── sfx/                    # Efek suara (.wav) untuk pedang, fireball, petir, & heal
│   └── sprites/
│       ├── background/         # Aset paralaks langit, gunung, pohon, rawa, & salju
│       ├── farm/               # Petak ladang, tunas gandum, & gandum matang
│       ├── projectiles/        # Fireball, Goblin Bolt, Lightning, Healing Aura, efek boss/witcher
│       └── units/              # Sprite sheet seluruh hero, petani, monster, & boss
└── src/
    ├── main.js                 # Orkestrasi layar (Lobi, Kampanye, Barak, Lumbung, Battle) & input
    ├── core/
    │   ├── AudioManager.js     # Pengelola BGM & Web Audio API SFX (+ synthesizer cadangan)
    │   ├── Battle.js           # Mesin simulasi pertempuran, rekrutmen, ekonomi, & GC entitas
    │   ├── Campaign.js         # Konfigurasi 6 chapter (18 stage)
    │   ├── Constants.js        # Konstanta global, ukuran dunia, biaya unit, & path aset
    │   ├── EnemyDirector.js    # AI pengatur spawn gelombang musuh adaptif
    │   ├── Progress.js         # Penyimpanan localStorage, upgrade stat, & export/import JSON
    │   └── Renderer.js         # Kanvas rendering, paralaks kamera, HUD sync, & efek status
    └── entities/
        ├── Entity.js           # Base class semua entitas arena
        ├── Unit.js             # Base class unit (gerak, deteksi lawan, stun/slow, health bar)
        ├── Healer.js           # Base class role penyembuh (digunakan Kira & Witcher)
        ├── Farm.js             # Logika siklus petani & petak gandum
        ├── Knight.js           # Hero Ksatria Pedang
        ├── James.js            # Hero James (Tanker + Shield Bash stun)
        ├── Wizard.js           # Hero Wizard Api
        ├── Kira.js             # Hero Kira (Healer + Lightning)
        ├── Goblin.js           # Musuh Goblin
        ├── ArcherGoblin.js     # Musuh Goblin Pemanah
        ├── Minotaur.js         # Musuh Minotaur (pasif heal < 25% HP)
        ├── Witcher.js          # Musuh Witcher (heal & summon Minotaur)
        ├── Commander.js        # Boss Chapter 4: Panglima Mahkota Retak
        ├── ArenaBoss.js        # Boss Chapter 5 & 6: Raksasa Akar & Golem Es
        ├── Projectile.js       # Base Projectile & Fireball
        ├── GoblinBolt.js       # Proyektil panah Goblin Pemanah
        ├── KiraProjectiles.js  # LightningBolt, LightningBurst, & HealingAura
        ├── WitcherEffects.js   # Efek sihir & lingkaran pemanggil Witcher
        ├── Particle.js         # Partikel percikan & ledakan
        └── CombatNumber.js     # Angka damage & heal melayang
```

---

## Cara Menjalankan

Karena proyek ini tidak memerlukan *build step* atau server khusus, cukup buka `index.html` langsung di browser modern (atau jalankan lewat *local static server* seperti Live Server / `python -m http.server`).

### Pintasan Keyboard di Pertempuran
- **`Spasi`**: Panggil Ksatria Pedang
- **`W`**: Panggil Wizard Api
- **`P`**: Jeda / Lanjutkan pertempuran
