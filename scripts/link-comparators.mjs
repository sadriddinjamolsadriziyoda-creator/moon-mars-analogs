/**
 * Attaches the remaining orphan comparators to real sites. Every entry is
 * inserted as a full Analog object so validate-data.ts can check it like any
 * hand-written record.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const ANALOG = {
  shackleton: {
    slug: 'shackleton-crater',
    body: 'moon',
    region: {
      ru: 'Кратер Шеклтон у южного полюса',
      en: 'Shackleton Crater at the lunar south pole',
      uz: 'Oy janubiy qutbasidagi Shaklton krateri',
    },
    center: [179.5, -89.9],
    radiusKm: 21,
    whySimilar: {
      summary: {
        ru: 'Шеклтон почти целиком в тени, и в его стенках нашли водяной лёд. Полярная пустыня с вечной темнотой — ближайший земной аналог такой среды.',
        en: 'Shackleton lies almost entirely in shadow, and water ice was found in its walls. A polar desert in permanent darkness is the closest terrestrial match.',
        uz: "Shaklton deyarli butunlay soyada, devorlarida suv muzi topilgan. Doimiy qorong'ilikdagi qutb cho'li — eng yaqin yer analogi.",
      },
      detail: {
        ru: 'Лунный полюс интересен именно как инженерная задача: днём вершины освещены, но Солнце там низко, а ночь длится месяцами. Земных мест с такой же радиационной и световой геометрией нет, и это надо признать. Ближайшее, что есть, — полярные пустыни: Хаутон и сухие долины Мак-Мёрдо, где ключевая особенность сохраняется: отрицательные температуры ночью при круглосуточном солнечном свете летом.',
        en: 'The lunar pole matters as an engineering problem: the summits are sunlit but the Sun is low, and night lasts months. No terrestrial place shares that radiation and lighting geometry, and that should be stated plainly. The nearest analogues are polar deserts — Haughton and the McMurdo Dry Valleys — where the essential property survives: subzero nights under round-the-clock summer sun.',
        uz: "Oy qutbi aynan muhandislik vazifasi: cho'qqilar yoritilgan, lekin Quyosh past, kecha oylab davom etadi. Yerda bunday geometriya yo'q. Yaqin analoglar — qutb cho'llari: Xauton va Mak-Merdo, u yerda kechasi manfiy harorat va quyosh ostida tun bo'ladi.",
      },
    },
  },
  gale: {
    slug: 'gale-crater',
    body: 'mars',
    region: {
      ru: 'Кратер Гейла с озерными осадочными толщами',
      en: 'Gale Crater with its lake sediment layers',
      uz: "Ko' cho'klari bilan Geyl krateri",
    },
    center: [-138.25, -5.48],
    radiusKm: 100,
    whySimilar: {
      summary: {
        ru: 'Гейл вскрыл слоистые осадочные породы возрастом 4 млрд лет и нашёл в них органические молекулы. Самое близкое земное место для такой задачи — Уюни.',
        en: 'Gale exposed 4-billion-year-old layered sediments and found organic molecules in them. The closest terrestrial place for that task is Uyuni.',
        uz: "Geyl 4 mlrd yillik qatlamli cho'klarni ochdi va ularda organik molekulalar topdi. Bu vazifa uchun Yerdagi eng yaqin joy — Uyuni.",
      },
      detail: {
        ru: 'Задача Curiosity в Гейле — прочитать климат по слоям: каждый пласт отложился за тысячи лет при своей температуре и составе воды. Уюни даёт то же самое в ускоренном виде: соляная толща до 10 метpower толщиной, в которой слои видны прямо на поверхности. Разница в том, что у Юни слои солевые, а в Гейле — глинистые и карбонатные, то есть марсианская палео среда была пресной.',
        en: 'The job Curiosity did at Gale was to read climate off the layers: each stratum accumulated over thousands of years at its own temperature and water chemistry. Uyuni offers the same thing sped up: a salt sequence up to 10 m thick whose layering is visible at the surface. The difference is that Uyuni layers are saline while Gale layers are clay and carbonate, meaning the Martian palaeoenvironment was fresh.',
        uz: "Curiosity Geylda qatlamlar orqali iqlimni o'qidi. Uyuni xuddi shuni tezlashgan holda beradi: 10 m qalinlikdagi tuz qatlami, qatlamlari yuzada ko'rinadi. Farq: Uyuni qatlamlari sho'r, Geylniki gilli — Marsning qadimiy muhiti chuchit suvli bo'lgan.",
      },
    },
  },
  amundsen: {
    slug: 'amundsen-crater',
    body: 'moon',
    region: {
      ru: 'Кратер Амундсена с освещённым пиком',
      en: 'Amundsen Crater with its sunlit peak',
      uz: 'Yoritilgan cho\'qqi bilan Amundsen krateri',
    },
    center: [-101.5, -79],
    radiusKm: 30,
    whySimilar: {
      summary: {
        ru: 'Редчайшая конфигурация: вершина центрального пика освещена Солнцем, а плоское дно вокруг — в вечной тени. Так же работает Мауна-Кеа с её снегом и кратером на вершине.',
        en: 'A rare configuration: the central peak is sunlit while the flat floor around it stays in permanent shadow. Mauna Kea behaves the same way, with summit snow and its own summit crater.',
        uz: "Kam uchraydigan konfiguratsiya: markaziy cho'qqi Quyoshda yoritilgan, atrofi doimiy soyada. Xuddi shu Mauna-Keada: cho'qqida qor va krater.",
      },
      detail: {
        ru: 'Такая геометрия нужна, чтобы измерять полярные ресурсы: освещённый пик даёт температуру, холодная ловушка на дне хранит лёд. На Земле точного аналога нет — ни одна гора не имеет вечно теневого плоского дна, — но Мауна-Кеа даёт проверяемый кусок: вершина выше границы снега, в кратере лежит снег и лёд, и по ночам он не тает. Разница в том, что маунтакейский лёд сезонный, а лунный лежит миллиарды лет.',
        en: 'That geometry is what you need to measure polar resources: the sunlit peak gives temperature, the cold trap on the floor stores ice. No Earth mountain has a permanently shadowed flat floor, so there is no exact analogue, but Mauna Kea gives a verifiable piece: the summit sits above the snow line, snow and ice sit in the crater, and they survive the night. The difference is that Mauna Kea ice is seasonal while the lunar ice has been there for billions of years.',
        uz: "Bu geometriya qutba resurslarini o'lchash uchun kerak: yoritilgan cho'qqi harorat beradi, soyadagi sovuq tuzon muzni saqlaydi. Yerda aniq analog yo'q, lekin Mauna-Kea tekshiriladigan bo'lak beradi: cho'qqi qor chegarasidan yuqorida, kraterda qor va muz, kechasi ham yo'qolmaydi.",
      },
    },
  },
};

const TASKS = [
  { file: 'data/sites-moon.json', site: 'lava-beds-national-monument', add: ANALOG.shackleton },
  { file: 'data/sites-mars.json', site: 'salar-de-uyuni', add: ANALOG.gale },
  { file: 'data/sites-moon.json', site: 'mauna-kea', add: ANALOG.amundsen },
];

for (const { file, site, add } of TASKS) {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const target = data.find((entry) => entry.slug === site);
  if (!target) {
    console.log(`MISS ${site} in ${file}`);
    continue;
  }
  if (target.analogs.some((a) => a.slug === add.slug)) {
    console.log(`skip ${site}: already has ${add.slug}`);
    continue;
  }
  target.analogs.push(add);
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`added ${add.slug} -> ${site}`);
}