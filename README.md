# Lendület – edzésnapló a telefonodra

Magyar nyelvű, mobilra tervezett webalkalmazás kondiparki edzésekhez, a fokozatos terhelésnövelés követéséhez, valamint futás, kerékpározás és úszás naplózásához. Az alkalmazás az adataid alapján egyszerű támpontokat ad; a tudományos hátteret és a korlátokat a [tudományos útmutató](public/tudomany.html) foglalja össze.

## Használat

- Válassz egy kondiparki edzést, és rögzítsd az egyes sorozatok ismétléseit, terhelését és a tartalékban maradt ismétléseket (RIR).
- A pihenőidőzítő segít a sorozatok között. A javasolt pihenőt szükség szerint hosszabbítsd meg.
- A progresszióhoz hasonlíts azonos gyakorlatváltozatokat, szabályos végrehajtással. Az iránymutatás nem személyes edzői felmérés.
- A kiegészítő sportoknál az időtartamot, a megtett távolságot és az edzés általános nehézségét rögzítsd.
- Az előzmények és az összesített terhelés a saját korábbi edzéseidhez adnak viszonyítási alapot. A terhelési pont nem kalória és nem sérülési előrejelzés.

## Adatok és telefonos használat

Az edzésadatok a használt eszköz böngészőjében maradnak. Nincs fiók és automatikus, eszközök közötti szinkronizálás. A böngészőadatok törlése vagy másik böngésző használata miatt az előzmények elveszhetnek vagy nem látszanak; készíts rendszeresen JSON-exportot, és őrizd meg biztonságos helyen. A mentés importálásával visszaállíthatod az edzésnaplót.

Az alkalmazás telepíthető webalkalmazásként (PWA) használható. A telepítés és a kapcsolat nélküli működés támogatása böngészőnként eltér, és **HTTPS-t vagy az adott eszközön megnyitott localhost címet** igényel. Az első betöltés és az offline gyorsítótár elkészítése internetkapcsolatot igényel.

- **Android, Chrome:** a megnyitott HTTPS-oldal böngészőmenüjében válaszd az „Alkalmazás telepítése” vagy „Hozzáadás a kezdőképernyőhöz” lehetőséget.
- **iPhone, Safari:** a megnyitott HTTPS-oldalon a megosztás menüben válaszd a „Főképernyőhöz adás” lehetőséget.

A felhős fejlesztőkörnyezet elindítása önmagában nem jelent nyilvánosan elérhető telefonos alkalmazást. A projektnek még nincs közzétett nyilvános HTTPS-címe. Telefonos telepítéshez a kész buildet HTTPS-t biztosító statikus tárhelyen kell közzétenni. A telefonon megnyitott, sima HTTP-s hálózati IP-cím nem helyettesíti a HTTPS-t a PWA működéséhez.

## Fejlesztői indítás

Node.js 24.19.0 és npm szükséges (a kipróbált verziót a `.nvmrc` rögzíti). A projekt könyvtárában:

```sh
npm ci --cache /tmp/lendulet-npm
npm run dev -- --host 0.0.0.0
```

A fejlesztőszerver a parancs kimenetében jelzett címen érhető el. A helyi cím csak ugyanazon a gépen érhető el; telefonos használathoz közzétett HTTPS-cím szükséges. A `0.0.0.0` figyelési cím, nem a böngészőbe írandó nyilvános cím.

Az első függőségtelepítéshez a csomagregiszter hálózati elérése szükséges. A normál alkalmazáshasználat nem igényel API-kulcsot, adatbázist vagy fizetős külső szolgáltatást.

## Ellenőrzés és kiadási build

```sh
npm test
npm run build
npm run test:e2e
```

A böngészős tesztek asztali (1280 px) és telefonos (390 px) nézetben ellenőrzik a naplózást, a mentések helyreállítását és a kiadási build kapcsolat nélküli működését. Chromium szükséges hozzájuk: a konfiguráció a `/usr/bin/chromium` böngészőt használja, ha elérhető. Másik telepített böngésző helye a `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` változóval adható meg. Ha nincs rendszerböngésző, a projekt függőségeinek telepítése után telepítsd a Playwright saját Chromium-változatát:

```sh
npx playwright install chromium
```

A `dist/` mappa a kiadható statikus weboldal. A build helyi ellenőrzése:

```sh
npm run preview -- --host 0.0.0.0
```

Az alkalmazás jelenleg egyetlen eszközön vezetett naplónak készült. Nem mér automatikusan pulzust, nem kapcsolódik sportórához, és nem állít össze orvosi vagy rehabilitációs tervet.

## GitHub Pages közzététel

A `npm run build:pages` parancs az `/Edz-s-app/` útvonalhoz készít buildet. A normál `npm run build` továbbra is a tárhely gyökeréhez készül. A kiadási könyvtár tartalmát (nem a könyvtárat magát) a `gh-pages` ág gyökerében kell tárolni, `.nojekyll` fájllal.

A GitHub felületén a tároló Settings → Pages oldalán a Source legyen **Deploy from a branch**, a Branch pedig **gh-pages / (root)**. Ez külön jogosultság a Git-műveletekhez és a kód olvasásához képest. Ha a GitHub a csomagod miatt nem engedélyez Pages-oldalt privát tárolóból, ne változtasd meg a tároló láthatóságát a tulajdonos külön engedélye nélkül; használj más, engedélyezett HTTPS-tárhelyet.

A forráskód és a kiadási csomag nem tartalmaz telefonon naplózott edzésadatot. A tároló privát láthatósága és az alkalmazásoldal internetes elérhetősége két külön beállítás. A sikeres Git push önmagában nem bizonyít működő weboldalt; az első betöltést, az `/Edz-s-app/` alatti ikonokat/útmutatót és az offline működést a tényleges HTTPS-oldalon is ellenőrizni kell.
