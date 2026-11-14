"use strict";

// Each wave gives the delay from the previous wave and one or more groups. G is Goblin, M is Minotaur, A is Archer Goblin.
const Campaign = [
  {
    name: "Ladang Perbatasan",
    stages: [
      {
        id: 1,
        name: "Panen Pertama",
        briefing: "Panggil petani dan gunakan hasil panen untuk menahan Goblin yang datang satu per satu.",
        waves: [[12, "G"], [21, "G"], [20, "G"], [19, "G"], [18, "G"], [17, "G"], [16, "G"]]
      },
      {
        id: 2,
        name: "Penyerbuan Ladang",
        briefing: "Goblin datang berpasangan. Manfaatkan jeda antarserbuan untuk menambah pasukan.",
        waves: [[11, "G", "G"], [23, "G", "G"], [22, "G", "G"], [21, "G", "G"], [20, "G", "G"], [19, "G", "G"]]
      },
      {
        id: 3,
        name: "Penjaga Gerbang",
        briefing: "Goblin membuka jalan bagi Minotaur. Siapkan pasukan jarak jauh untuk menghadapi Minotaur.",
        waves: [[10, "G", "G"], [23, "G", "M"], [23, "G", "G"], [22, "G", "M"], [21, "G", "G"], [20, "G", "M"]]
      }
    ]
  },
  {
    name: "Benteng Goblin",
    stages: [
      {
        id: 4,
        name: "Serbuan Bergilir",
        briefing: "Waspadai Pemanah di belakang rombongan kedua. Menjelang akhir, Pemanah juga muncul bersama rombongan pertama.",
        waves: [[9, "GG", "GG"], [24, "GG", "GGA"], [23, "GG", "GG"],
                [22, "GG", "GGA"], [21, "GGA", "GG"], [20, "GG", "GGA"]]
      },
      {
        id: 5,
        name: "Barisan Berat",
        briefing: "Minotaur maju lebih dulu. Pemanah menyusul bersama Goblin, jadi pertahankan Ksatria di depan Wizard.",
        groupGap: 10,
        waves: [[9, "M", "GGGA"], [23, "GG", "GGA"], [22, "MG", "GGA"],
                [21, "M", "GGGA"], [20, "GG", "GG"], [19, "MG", "GGA"]]
      },
      {
        id: 6,
        name: "Pengepungan",
        briefing: "Pemanah datang sejak awal di belakang Minotaur. Gunakan jeda sebelum serbuan terakhir untuk menghadapi dua Pemanah yang datang bergantian.",
        waves: [[8, "MG", "GGA"], [15, "MG", "GGA"], [14, "MM", "GGA"],
                [14, "MGGA", "GGA"], [14, "MG", "GGA"], [29, "MGG", "GGA", "GGA"]]
      }
    ]
  }
];

const campaignStages = Campaign.flatMap(chapter => chapter.stages);
