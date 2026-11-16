"use strict";

// Spawn one enemy at a time. The order repeats for as long as the battle lasts.
// G is Goblin, M is Minotaur, and A is Archer Goblin.
const Campaign = [
  {
    name: "Ladang Perbatasan",
    subtitle: "Garis Depan Kerajaan",
    lore: "Asap membubung di ufuk timur. Kawanan Goblin mulai menjarah ladang gandum perbatasan—petani dan ksatria harus berdiri menjaga lumbung kerajaan.",
    featuredUnits: ["goblin", "minotaur"],
    cameraCropX: 120,
    stages: [
      {
        id: 1,
        victoryCoins: 60,
        name: "Panen Pertama",
        briefing: "Panggil petani dan gunakan hasil panen untuk menahan Goblin yang datang satu per satu.",
        enemies: { first: 12, interval: 18, order: "G" }
      },
      {
        id: 2,
        victoryCoins: 70,
        name: "Penyerbuan Ladang",
        briefing: "Goblin tiba lebih rapat. Jaga petani agar pasokan roti terus mengalir.",
        enemies: { first: 11, interval: 11, order: "G" }
      },
      {
        id: 3,
        victoryCoins: 80,
        name: "Penjaga Gerbang",
        briefing: "Minotaur sesekali menyusul Goblin. Siapkan pasukan jarak jauh untuk menghadapinya.",
        enemies: { first: 10, interval: 10, order: "GGGM" }
      }
    ]
  },
  {
    name: "Benteng Goblin",
    subtitle: "Barisan Pemanah & Penyihir",
    lore: "Di balik pagar kayu runcing, Goblin Pemanah dan Witcher mulai merapal mantra gelap untuk memanggil Minotaur raksasa.",
    featuredUnits: ["archer_goblin", "witcher"],
    cameraCropX: 260,
    stages: [
      {
        id: 4,
        victoryCoins: 80,
        name: "Serbuan Bergilir",
        briefing: "Pemanah muncul di sela pasukan Goblin. Jaga barisan depan agar pasukan pendukungmu aman.",
        enemies: { first: 9, interval: 6.4, order: "GGGGA" }
      },
      {
        id: 5,
        victoryCoins: 90,
        name: "Barisan Berat",
        briefing: "Minotaur tiba lebih dulu. Pertahankan Ksatria di depan Wizard untuk menghadapi pemanah yang menyusul.",
        enemies: { first: 9, interval: 5.7, order: "MGGAGGAG" }
      },
      {
        id: 6,
        victoryCoins: 100,
        name: "Pengepungan",
        boss: "goblinQueen",
        briefing: "Ratu Goblin muncul saat HP markas turun ke 65%. Lingkaran sihirnya memperkuat damage dan kecepatan serang monster selama 6 detik. Kalahkan Ratu dan hancurkan markas.",
        enemies: { first: 8, interval: 4.8, order: "MGAMGAG" }
      }
    ]
  },
  {
    name: "Jalur Pegunungan",
    subtitle: "Tebing Sempit Berbahaya",
    lore: "Jalur menanjak menuju jantung wilayah musuh dijaga barisan Minotaur lapis baja dan hujan baut tanpa henti dari atas tebing.",
    featuredUnits: ["minotaur", "archer_goblin"],
    cameraCropX: 210,
    stages: [
      {
        id: 7,
        victoryCoins: 100,
        name: "Pos Tebing",
        briefing: "Pemanah lebih sering muncul. Lindungi pasukan jarak jauh dengan barisan depan.",
        enemies: { first: 8, interval: 4.5, order: "MGAGAGG" }
      },
      {
        id: 8,
        victoryCoins: 110,
        name: "Dua Barisan",
        briefing: "Minotaur dan Pemanah bergantian menekan. Simpan roti untuk mengisi lagi barisan depan.",
        enemies: { first: 8, interval: 4.2, order: "MGAGMGA" }
      },
      {
        id: 9,
        victoryCoins: 120,
        name: "Gerbang Batu",
        briefing: "Minotaur kerap muncul berurutan, lalu disusul Pemanah.",
        enemies: { first: 8, interval: 3.9, order: "MMGAGAMGA" }
      }
    ]
  },
  {
    name: "Benteng Raja Goblin",
    subtitle: "Tahta Panglima Mahkota Retak",
    lore: "Gerbang terakhir markas besar Goblin. Panglima Mahkota Retak turun langsung ke medan tempur dengan perisai raksasa dan ayunan maut.",
    featuredUnits: ["commander", "witcher"],
    cameraCropX: 330,
    stages: [
      {
        id: 10,
        victoryCoins: 120,
        name: "Hujan Baut",
        briefing: "Pemanah datang dengan jeda pendek dan Witcher muncul di belakang pasukan. Gunakan tombol Witcher untuk menemukannya.",
        enemies: { first: 8, interval: 3.6, order: "MGAGAAMG" }
      },
      {
        id: 11,
        victoryCoins: 130,
        name: "Garda Istana",
        briefing: "Barisan Minotaur lebih rapat dan terus didukung Pemanah. Jaga pasokan roti untuk bertahan.",
        enemies: { first: 8, interval: 3.3, order: "MMAGAMG" }
      },
      {
        id: 12,
        victoryCoins: 150,
        name: "Benteng Terakhir",
        boss: "commander",
        briefing: "Panglima Mahkota Retak muncul saat HP markas turun ke 60%. Kalahkan Panglima dan hancurkan markas untuk menang.",
        enemies: { first: 8, interval: 3, order: "MMAGAMMAAG" }
      }
    ]
  },
  {
    name: "Rawa Senja",
    subtitle: "Hutan Akar Terkutuk",
    lore: "Kabut beracun menyelimuti Rawa Senja. Dari balik lumpur purba, Raksasa Akar bangkit dan menarik pasukan yang lengah ke garis depan.",
    featuredUnits: ["rootGiant", "witcher"],
    cameraCropX: 290,
    arena: "swamp",
    stages: [
      {
        id: 13,
        victoryCoins: 135,
        name: "Jalur Rawa",
        briefing: "Goblin Pemanah berlindung di balik Minotaur. Jaga barisan depan agar Wizard bisa menyerang dari jauh.",
        enemies: { first: 9, interval: 4.3, order: "GMAGA" }
      },
      {
        id: 14,
        victoryCoins: 145,
        name: "Kepung Akar",
        briefing: "Witcher datang lebih awal. Jika portal Topeng Hampa muncul, lindungi hero jarak jauh dari sergapan belakang.",
        enemies: { first: 8, interval: 3.9, order: "MGAMAGA", witcherFirst: 18, hollowMaskFirst: 48 }
      },
      {
        id: 15,
        victoryCoins: 165,
        name: "Jantung Rawa",
        briefing: "Raksasa Akar muncul saat HP markas mencapai 65%. Pindahkan pasukan melewati batas penanda jingga dengan bendera sebelum akar menarik mereka. Bos memiliki resistensi sihir 16%. Kalahkan bos dan hancurkan markas.",
        boss: "rootGiant",
        enemies: { first: 8, interval: 3.7, order: "MGAAMG" }
      }
    ]
  },
  {
    name: "Puncak Beku",
    subtitle: "Benteng Salju Abadi",
    lore: "Badai salju membekukan langkah pasukan di puncak tertinggi. Golem Es menjaga takhta beku dengan gelombang es yang melambatkan setiap serangan.",
    featuredUnits: ["frostGolem", "minotaur"],
    cameraCropX: 300,
    arena: "frost",
    stages: [
      {
        id: 16,
        victoryCoins: 150,
        name: "Jalur Salju",
        briefing: "Pemanah datang beruntun dan Topeng Hampa memburu hero jarak jauh. Jaga bagian belakang pasukan.",
        enemies: { first: 8, interval: 4.1, order: "MAAGAM", hollowMaskFirst: 42 }
      },
      {
        id: 17,
        victoryCoins: 165,
        name: "Gerbang Es",
        briefing: "Minotaur dan Witcher menekan barisan depan lebih cepat. Simpan roti untuk mengganti pasukan yang gugur.",
        enemies: { first: 7, interval: 3.6, order: "MMAGAAG", witcherFirst: 16, hollowMaskFirst: 38 }
      },
      {
        id: 18,
        victoryCoins: 185,
        name: "Takhta Es",
        briefing: "Golem Es muncul saat HP markas mencapai 70%. Tarik pasukan keluar dari penanda biru sebelum Frost Nova. Pukulan memberi 1 Frost dan Nova memberi 2. Pada 3 Frost, hero menerima 200 damage dan membeku 1,5 detik. Bos memiliki resistensi fisik 10%. Kalahkan bos dan hancurkan markas.",
        boss: "frostGolem",
        enemies: { first: 7, interval: 3.4, order: "MAMAGA", witcherFirst: 20, hollowMaskFirst: 52 }
      }
    ]
  }
];

const campaignStages = Campaign.flatMap(chapter => chapter.stages);
