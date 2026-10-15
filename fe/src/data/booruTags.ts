export type BooruTagCategory = "general" | "character" | "artist" | "quality" | "meta";

export interface BooruTagItem {
    name: string;
    category: BooruTagCategory;
    count?: string;
    desc?: string;
    layer?: string;
    isNsfw?: boolean;
}

/**
 * Checks whether a given Danbooru tag name or category is adult / 18+ / NSFW.
 * Comprehensive regex & keyword detection covering anatomy, positions, fluids, ratings, and intimate states.
 */
export function isDanbooruAdultTag(tagName: string, category?: string): boolean {
    const t = (tagName || "").toLowerCase();
    const c = (category || "").toLowerCase();

    return (
        c === "nsfw" ||
        t === "nsfw" ||
        t.includes("nsfw") ||
        t.includes("explicit") ||
        t.includes("r-18") ||
        t.includes("r18") ||
        t.includes("suggestive") ||
        t.includes("erotic") ||
        t.includes("ecchi") ||
        t.includes("hentai") ||
        t.includes("nude") ||
        t.includes("nipple") ||
        t.includes("breast") ||
        t.includes("boob") ||
        t.includes("areola") ||
        t.includes("cleavage") ||
        t.includes("pussy") ||
        t.includes("penis") ||
        t.includes("sex") ||
        t.includes("cowgirl") ||
        t.includes("missionary") ||
        t.includes("doggy") ||
        t.includes("doggystyle") ||
        t.includes("ahegao") ||
        t.includes("cum") ||
        t.includes("anal") ||
        t.includes("anus") ||
        t.includes("ass") ||
        t.includes("buttocks") ||
        t.includes("genital") ||
        t.includes("fellatio") ||
        t.includes("cunnilingus") ||
        t.includes("masturbation") ||
        t.includes("naked") ||
        t.includes("erect") ||
        t.includes("topless") ||
        t.includes("bottomless") ||
        t.includes("vagina") ||
        t.includes("vulva") ||
        t.includes("clitoris") ||
        t.includes("labia") ||
        t.includes("undressing") ||
        t.includes("uncensored") ||
        t.includes("censorship") ||
        t.includes("orgasm") ||
        t.includes("tentacle") ||
        t.includes("bondage") ||
        t.includes("shibari") ||
        t.includes("strip") ||
        t.includes("creampie") ||
        t.includes("ejaculation") ||
        t.includes("sperm") ||
        t.includes("paizuri") ||
        t.includes("titfuck") ||
        t.includes("deepthroat") ||
        t.includes("oral") ||
        t.includes("handjob") ||
        t.includes("fingering") ||
        t.includes("precum") ||
        t.includes("cameltoe") ||
        t.includes("pubic") ||
        t.includes("spread_legs") ||
        t.includes("spread_pussy") ||
        t.includes("penetrat") ||
        t.includes("straddl") ||
        t.includes("riding") ||
        t.includes("mating_press") ||
        t.includes("lingerie") ||
        t.includes("clothes_lift") ||
        t.includes("shirt_lift") ||
        t.includes("skirt_lift") ||
        t.includes("pov_crotch") ||
        t.includes("female_on_top") ||
        t.includes("male_on_female") ||
        t.includes("shaved_pussy") ||
        t.includes("pussy_juice") ||
        t.includes("saliva_trail")
    );
}


export const BOORU_TAGS_DATABASE: BooruTagItem[] = [
    // --- 1. Quality & Format ---
    { name: "masterpiece", category: "quality", count: "4.8M", desc: "Top quality visual token" },
    { name: "best quality", category: "quality", count: "4.5M", desc: "Highest fidelity tag" },
    { name: "highres", category: "quality", count: "4.2M", desc: "High resolution render" },
    { name: "absurdres", category: "quality", count: "2.3M", desc: "Ultra high definition detail" },
    { name: "newest", category: "quality", count: "950k", desc: "Recent anime dataset aesthetics" },
    { name: "very aesthetic", category: "quality", count: "820k", desc: "Pleasing visual harmony" },
    { name: "amazing quality", category: "quality", count: "720k", desc: "Enhanced quality anchor" },
    { name: "official art", category: "quality", count: "510k", desc: "Style like official anime franchise art" },
    { name: "illustration", category: "quality", count: "1.4M", desc: "Digital artwork aesthetic" },
    { name: "key visual", category: "quality", count: "380k", desc: "Promotional anime poster composition" },
    { name: "anime coloring", category: "quality", count: "310k", desc: "Vibrant flat anime cel shading" },
    { name: "cel shading", category: "quality", count: "620k", desc: "Classic anime 2D shading technique" },
    { name: "sharp focus", category: "quality", count: "890k", desc: "Crisp non-blurry lineart" },
    { name: "lineart", category: "quality", count: "450k", desc: "Detailed visible stroke lineart" },
    { name: "score_9", category: "quality", count: "990k", desc: "Pony Diffusion V6 top rating token" },
    { name: "score_8_up", category: "quality", count: "980k", desc: "Pony Diffusion high quality token" },
    { name: "score_7_up", category: "quality", count: "980k", desc: "Pony Diffusion standard quality token" },
    { name: "source_anime", category: "meta", count: "890k", desc: "Pony Diffusion anime dataset anchor" },
    { name: "rating_safe", category: "meta", count: "1.1M", desc: "Safe for work rating tag" },

    // --- 2. Subjects & Entities ---
    { name: "1girl", category: "general", count: "5.6M", desc: "Single female character" },
    { name: "solo", category: "general", count: "5.1M", desc: "Only one character in scene" },
    { name: "2girls", category: "general", count: "890k", desc: "Two female characters" },
    { name: "1boy", category: "general", count: "1.2M", desc: "Single male character" },
    { name: "multiple girls", category: "general", count: "420k", desc: "Group of girls" },
    { name: "couple", category: "general", count: "410k", desc: "Male and female duo" },
    { name: "chibi", category: "general", count: "280k", desc: "Super-deformed miniature style" },

    // --- 3. Hair Styles & Colors ---
    { name: "black hair", category: "general", count: "1.8M", desc: "Hitam pekat" },
    { name: "white hair", category: "general", count: "1.4M", desc: "Putih / perak" },
    { name: "silver hair", category: "general", count: "920k", desc: "Perak berkilau" },
    { name: "blonde hair", category: "general", count: "1.7M", desc: "Kuning pirang" },
    { name: "brown hair", category: "general", count: "1.6M", desc: "Cokelat natural" },
    { name: "blue hair", category: "general", count: "1.2M", desc: "Biru" },
    { name: "red hair", category: "general", count: "890k", desc: "Merah" },
    { name: "pink hair", category: "general", count: "980k", desc: "Merah muda" },
    { name: "purple hair", category: "general", count: "950k", desc: "Ungu" },
    { name: "green hair", category: "general", count: "510k", desc: "Hijau" },
    { name: "gradient hair", category: "general", count: "340k", desc: "Gradasi dua warna rambut" },
    { name: "multicolored hair", category: "general", count: "390k", desc: "Rambut multi warna" },
    { name: "two-tone hair", category: "general", count: "290k", desc: "Dua blok warna berbeda" },
    { name: "long hair", category: "general", count: "3.2M", desc: "Rambut panjang" },
    { name: "short hair", category: "general", count: "2.1M", desc: "Rambut pendek" },
    { name: "medium hair", category: "general", count: "1.5M", desc: "Rambut sebahu" },
    { name: "very long hair", category: "general", count: "1.1M", desc: "Rambut sangat panjang melewati pinggang" },
    { name: "ponytail", category: "general", count: "1.4M", desc: "Kuncir satu belakang" },
    { name: "high ponytail", category: "general", count: "310k", desc: "Kuncir kuda posisi tinggi" },
    { name: "side ponytail", category: "general", count: "480k", desc: "Kuncir samping" },
    { name: "twintails", category: "general", count: "1.3M", desc: "Kuncir dua (twin tails)" },
    { name: "low twintails", category: "general", count: "250k", desc: "Kuncir dua rendah sebahu" },
    { name: "short twintails", category: "general", count: "190k", desc: "Kuncir dua pendek" },
    { name: "braid", category: "general", count: "650k", desc: "Kepang rambut" },
    { name: "twin braids", category: "general", count: "320k", desc: "Dua kepang rambut" },
    { name: "single braid", category: "general", count: "280k", desc: "Satu kepang panjang" },
    { name: "french braid", category: "general", count: "120k", desc: "Kepangan gaya perancis rapi" },
    { name: "crown braid", category: "general", count: "90k", desc: "Kepangan melingkar seperti mahkota" },
    { name: "hair bun", category: "general", count: "420k", desc: "Sanggul rambut" },
    { name: "double bun", category: "general", count: "210k", desc: "Dua sanggul (odango)" },
    { name: "bob cut", category: "general", count: "380k", desc: "Potongan rambut bob" },
    { name: "pixie cut", category: "general", count: "95k", desc: "Potongan sangat pendek tomboy" },
    { name: "hime cut", category: "general", count: "410k", desc: "Potongan bangs & sidelocks lurus bangsawan Jepang" },
    { name: "bangs", category: "general", count: "2.4M", desc: "Poni depan" },
    { name: "blunt bangs", category: "general", count: "520k", desc: "Poni depan lurus rata" },
    { name: "swept bangs", category: "general", count: "380k", desc: "Poni menyamping" },
    { name: "parted bangs", category: "general", count: "420k", desc: "Poni belah tengah/samping" },
    { name: "hair between eyes", category: "general", count: "1.1M", desc: "Helaian rambut jatuh di antara kedua mata" },
    { name: "sidelocks", category: "general", count: "890k", desc: "Helaian rambut membingkai pipi" },
    { name: "hair over one eye", category: "general", count: "410k", desc: "Satu mata tertutup rambut" },
    { name: "ahoge", category: "general", count: "620k", desc: "Satu helai rambut unik berdiri di puncak kepala" },
    { name: "drill hair", category: "general", count: "180k", desc: "Rambut pilin berbentuk spiral (ojousama)" },
    { name: "wavy hair", category: "general", count: "720k", desc: "Rambut bergelombang" },
    { name: "curly hair", category: "general", count: "310k", desc: "Rambut keriting" },
    { name: "straight hair", category: "general", count: "1.2M", desc: "Rambut lurus halus" },
    { name: "messy hair", category: "general", count: "580k", desc: "Rambut acak-acakan natural" },
    { name: "floating hair", category: "general", count: "490k", desc: "Rambut melayang karena angin/sihir" },
    { name: "windblown hair", category: "general", count: "360k", desc: "Rambut tertiup angin" },

    // --- 4. Eyes & Head Features ---
    { name: "red eyes", category: "general", count: "1.5M", desc: "Mata merah crimson" },
    { name: "blue eyes", category: "general", count: "1.9M", desc: "Mata biru cerah" },
    { name: "green eyes", category: "general", count: "1.1M", desc: "Mata hijau zamrud" },
    { name: "yellow eyes", category: "general", count: "1.2M", desc: "Mata kuning emas" },
    { name: "amber eyes", category: "general", count: "450k", desc: "Mata jingga amber" },
    { name: "purple eyes", category: "general", count: "1.1M", desc: "Mata ungu violet" },
    { name: "brown eyes", category: "general", count: "1.4M", desc: "Mata cokelat hangat" },
    { name: "heterochromia", category: "general", count: "260k", desc: "Dua bola mata berbeda warna" },
    { name: "glowing eyes", category: "general", count: "380k", desc: "Mata berpendar cahaya mistis" },
    { name: "slit pupils", category: "general", count: "160k", desc: "Pupil mata vertikal seperti kucing/reptil" },
    { name: "heart-shaped pupils", category: "general", count: "95k", desc: "Pupil mata berbentuk hati" },
    { name: "star-shaped pupils", category: "general", count: "80k", desc: "Pupil mata berbentuk bintang" },
    { name: "dull eyes", category: "general", count: "110k", desc: "Mata tanpa pantulan cahaya (yandere/mati)" },
    { name: "fang", category: "general", count: "720k", desc: "Taring kecil lucu mengintip" },
    { name: "pointy ears", category: "general", count: "610k", desc: "Telinga runcing" },
    { name: "elf ears", category: "general", count: "580k", desc: "Telinga peri panjang runcing" },
    { name: "animal ears", category: "general", count: "1.2M", desc: "Telinga binatang (kemonomimi)" },
    { name: "cat ears", category: "general", count: "980k", desc: "Telinga kucing (nekomimi)" },
    { name: "fox ears", category: "general", count: "480k", desc: "Telinga rubah (kitsunemimi)" },
    { name: "rabbit ears", category: "general", count: "320k", desc: "Telinga kelinci (usamimi)" },
    { name: "wolf ears", category: "general", count: "220k", desc: "Telinga serigala" },
    { name: "halo", category: "general", count: "410k", desc: "Lingkaran halo di atas kepala (Blue Archive/Malaikat)" },
    { name: "horns", category: "general", count: "490k", desc: "Tanduk iblis/naga" },
    { name: "demon horns", category: "general", count: "210k", desc: "Sepasang tanduk iblis melengkung" },
    { name: "mole under eye", category: "general", count: "190k", desc: "Tahi lalat manis di bawah mata" },
    { name: "freckles", category: "general", count: "120k", desc: "Bintik-bintik manis di pipi" },

    // --- 5. Expressions & Reactions ---
    { name: "smile", category: "general", count: "2.8M", desc: "Senyum manis" },
    { name: "gentle smile", category: "general", count: "680k", desc: "Senyum lembut dan hangat" },
    { name: "grin", category: "general", count: "620k", desc: "Tersenyum lebar ceria" },
    { name: "smirk", category: "general", count: "490k", desc: "Senyum seringai percaya diri/licik" },
    { name: "evil smile", category: "general", count: "140k", desc: "Senyuman jahat / sinister" },
    { name: "parted lips", category: "general", count: "920k", desc: "Bibir sedikit terbuka" },
    { name: "open mouth", category: "general", count: "1.6M", desc: "Mulut terbuka berbicara/kaget" },
    { name: "closed eyes", category: "general", count: "890k", desc: "Mata terpejam menikmati suasana" },
    { name: "winking", category: "general", count: "510k", desc: "Mengedipkan satu mata" },
    { name: "half-closed eyes", category: "general", count: "430k", desc: "Mata setengah sayu menggoda" },
    { name: "glaring", category: "general", count: "280k", desc: "Tatapan tajam menusuk" },
    { name: "intense gaze", category: "general", count: "210k", desc: "Tatapan mata sangat fokus dan tajam" },
    { name: "looking at viewer", category: "general", count: "4.2M", desc: "Menatap langsung ke arah kamera/penonton" },
    { name: "looking away", category: "general", count: "1.2M", desc: "Memalingkan pandangan" },
    { name: "looking back", category: "general", count: "480k", desc: "Menoleh ke belakang menatap viewer" },
    { name: "looking down", category: "general", count: "390k", desc: "Menatap ke bawah" },
    { name: "looking up", category: "general", count: "420k", desc: "Menatap ke atas langit" },
    { name: "blush", category: "general", count: "2.4M", desc: "Pipi merona merah" },
    { name: "heavy blush", category: "general", count: "620k", desc: "Wajah sangat memerah malu" },
    { name: "shy", category: "general", count: "310k", desc: "Ekspresi pemalu" },
    { name: "embarrassed", category: "general", count: "490k", desc: "Malu-malu tersipu" },
    { name: "pout", category: "general", count: "240k", desc: "Mengerucutkan bibir merajuk manis" },
    { name: "crying", category: "general", count: "380k", desc: "Menangis haru/sedih" },
    { name: "tears", category: "general", count: "450k", desc: "Air mata menetes" },
    { name: "expressionless", category: "general", count: "390k", desc: "Muka datar tanpa ekspresi (kuudere)" },
    { name: "melancholic intense expression", category: "general", count: "95k", desc: "Ekspresi mendalam penuh drama" },
    { name: "focused fierce expression", category: "general", count: "110k", desc: "Ekspresi tempur penuh determinasi" },

    // --- 6. Body & Proportions ---
    { name: "tall female", category: "general", count: "210k", desc: "Postur tinggi dewasa" },
    { name: "petite", category: "general", count: "380k", desc: "Mungil dan ramping" },
    { name: "mature", category: "general", count: "290k", desc: "Sosok wanita matang onee-san" },
    { name: "slender", category: "general", count: "520k", desc: "Tubuh langsing semampai" },
    { name: "athletic build", category: "general", count: "180k", desc: "Bodi atletis bugar" },
    { name: "hourglass figure", category: "general", count: "160k", desc: "Lekuk tubuh jam pasir proporsional" },
    { name: "slender waist", category: "general", count: "390k", desc: "Pinggang ramping" },
    { name: "toned stomach", category: "general", count: "240k", desc: "Perut kencang bergaris halus" },
    { name: "wide hips", category: "general", count: "320k", desc: "Pinggul lebar seksi" },
    { name: "thick thighs", category: "general", count: "620k", desc: "Paha padat berisi" },
    { name: "thigh gap", category: "general", count: "140k", desc: "Celah ramping di antara kedua paha" },
    { name: "long legs", category: "general", count: "490k", desc: "Kaki jenjang panjang" },
    { name: "delicate hands", category: "general", count: "190k", desc: "Jari tangan anggun lentik" },
    { name: "slender fingers", category: "general", count: "210k", desc: "Jari jemari panjang dan lentik" },
    { name: "manicured nails", category: "general", count: "110k", desc: "Kuku terawat rapi" },
    { name: "sweat", category: "general", count: "890k", desc: "Keringat akibat aktivitas / hawa panas" },
    { name: "glistening skin", category: "general", count: "320k", desc: "Kulit berkilau pantulan cahaya/keringat" },
    { name: "sweatdrops on neck and collarbone", category: "general", count: "90k", desc: "Tetesan keringat di leher dan selangka" },
    { name: "wet skin", category: "general", count: "410k", desc: "Kulit basah sehabis hujan/mandi" },
    { name: "shiny skin texture", category: "general", count: "210k", desc: "Tekstur kulit halus mengkilap" },
    { name: "pale skin", category: "general", count: "480k", desc: "Kulit putih mulus bak pualam" },
    { name: "sun-kissed tan", category: "general", count: "120k", desc: "Kulit kecokelatan eksotis terpapar matahari" },
    { name: "heavy breathing", category: "general", count: "150k", desc: "Napas memburu dengan dada naik turun" },
    { name: "battle damage", category: "general", count: "140k", desc: "Luka gores ringan efek pertempuran" },

    // --- 7. Clothing, Outfits & Accessories ---
    { name: "school uniform", category: "general", count: "2.1M", desc: "Seragam sekolah Jepang" },
    { name: "sailor suit", category: "general", count: "980k", desc: "Seragam pelaut (serafuku)" },
    { name: "blazer", category: "general", count: "620k", desc: "Jas blazer elegan" },
    { name: "black jacket", category: "general", count: "450k", desc: "Jaket hitam ramping" },
    { name: "pleated skirt", category: "general", count: "1.4M", desc: "Rok rempel lipit khas sekolah" },
    { name: "miniskirt", category: "general", count: "1.8M", desc: "Rok mini di atas lutut" },
    { name: "maid", category: "general", count: "890k", desc: "Kostum pelayan maid klasik" },
    { name: "maid apron", category: "general", count: "610k", desc: "Celemek putih maid dengan renda" },
    { name: "maid headdress", category: "general", count: "520k", desc: "Bando renda putih pelayan" },
    { name: "ornate Victorian gothic black dress", category: "general", count: "110k", desc: "Gaun hitam gothic bergaya Victoria dengan korset" },
    { name: "gothic lolita", category: "general", count: "420k", desc: "Gaun boneka gothic dengan renda hitam/putih" },
    { name: "sheer lace sleeves", category: "general", count: "140k", desc: "Lengan gaun berbahan renda transparan" },
    { name: "tight corset bodice", category: "general", count: "180k", desc: "Korset ketat membentuk lekuk pinggang" },
    { name: "high-slit velvet skirt showing legs", category: "general", count: "95k", desc: "Rok belahan paha tinggi memperlihatkan kaki" },
    { name: "kimono", category: "general", count: "950k", desc: "Pakaian tradisional Jepang kimono" },
    { name: "yukata", category: "general", count: "480k", desc: "Kimono katun ringan festival musim panas" },
    { name: "white fantasy ranger tunic", category: "general", count: "85k", desc: "Tunik putih petualang fantasi dengan aksen kulit" },
    { name: "leather corset", category: "general", count: "160k", desc: "Korset kulit pelindung dada petualang" },
    { name: "detached sleeves", category: "general", count: "680k", desc: "Lengan baju terpisah tidak menempel ke bahu" },
    { name: "fingerless gloves", category: "general", count: "520k", desc: "Sarung tangan tanpa jari gaya tempur" },
    { name: "thighhighs", category: "general", count: "2.2M", desc: "Kaos kaki panjang sepaha" },
    { name: "sheer black thigh-high stockings", category: "general", count: "410k", desc: "Stoking hitam tipis semi-transparan sepaha" },
    { name: "zettai ryouiki", category: "general", count: "720k", desc: "Kulit paha terbuka di antara rok mini dan stoking" },
    { name: "stiletto heels", category: "general", count: "240k", desc: "Sepatu hak tinggi lancip elegan" },
    { name: "thigh-high boots", category: "general", count: "390k", desc: "Sepatu bot tinggi melewati lutut" },
    { name: "capelet", category: "general", count: "210k", desc: "Jubah pendek menutup bahu" },
    { name: "hoodie", category: "general", count: "620k", desc: "Jaket tudung kasual" },
    { name: "choker", category: "general", count: "780k", desc: "Kalung leher ketat" },
    { name: "black choker", category: "general", count: "310k", desc: "Kalung choker hitam pita/kulit" },
    { name: "black necktie", category: "general", count: "280k", desc: "Dasi hitam formal" },
    { name: "garter straps", category: "general", count: "340k", desc: "Tali garter penahan stoking" },

    // --- 8. Poses & Actions ---
    { name: "standing", category: "general", count: "3.4M", desc: "Pose berdiri tegak" },
    { name: "theatrical standing pose", category: "general", count: "95k", desc: "Pose berdiri dramatis teatrikal" },
    { name: "dynamic combat stance", category: "general", count: "120k", desc: "Kuda-kuda siap bertarung dinamis" },
    { name: "sitting", category: "general", count: "2.1M", desc: "Pose duduk" },
    { name: "sitting on throne", category: "general", count: "110k", desc: "Duduk agung di atas singgasana" },
    { name: "w-sitting", category: "general", count: "140k", desc: "Duduk di lantai posisi kaki membentuk huruf W (wariza)" },
    { name: "kneeling", category: "general", count: "480k", desc: "Berlutut di lantai/tanah" },
    { name: "squatting", category: "general", count: "310k", desc: "Pose jongkok gaya jalanan" },
    { name: "crossed legs", category: "general", count: "490k", desc: "Menyilangkan kaki saat duduk" },
    { name: "hands on hips", category: "general", count: "890k", desc: "Berkacak pinggang percaya diri" },
    { name: "holding a glowing crimson violin", category: "general", count: "45k", desc: "Memegang biola merah berpendar cahaya" },
    { name: "drawing a glowing magic bow", category: "general", count: "65k", desc: "Menarik busur panah sihir bercahaya" },
    { name: "holding crystal arrows", category: "general", count: "55k", desc: "Memegang anak panah kristal bening" },
    { name: "one arm raised conducting invisible music", category: "general", count: "40k", desc: "Satu tangan terangkat mengaba musik tak terlihat" },
    { name: "arms behind back", category: "general", count: "510k", desc: "Kedua tangan di belakang punggung manis" },
    { name: "reaching out", category: "general", count: "420k", desc: "Mengulurkan tangan ke arah penonton" },
    { name: "holding weapon", category: "general", count: "680k", desc: "Menggenggam senjata" },
    { name: "holding sword", category: "general", count: "490k", desc: "Menggenggam pedang" },
    { name: "holding katana", category: "general", count: "390k", desc: "Memegang katana Jepang tajam" },

    // --- 9. Camera & View Angles ---
    { name: "full body", category: "general", count: "2.4M", desc: "Tampak seluruh tubuh dari kepala hingga kaki" },
    { name: "full length view", category: "general", count: "620k", desc: "Komposisi vertikal penuh seluruh badan" },
    { name: "cowboy shot", category: "general", count: "780k", desc: "Bidik kamera setinggi paha ke atas (thigh-up)" },
    { name: "upper body", category: "general", count: "2.1M", desc: "Bidikan pinggang ke atas" },
    { name: "close-up", category: "general", count: "1.6M", desc: "Sorotan dekat wajah dan ekspresi" },
    { name: "portrait", category: "general", count: "1.4M", desc: "Foto potret fokus pada karakter" },
    { name: "environmental portrait", category: "general", count: "310k", desc: "Potret karakter menyatu dengan kemegahan latar belakang" },
    { name: "wide shot", category: "general", count: "890k", desc: "Sudut pandang lensa lebar pemandangan luas" },
    { name: "distant shot", category: "general", count: "420k", desc: "Karakter terlihat dari jarak jauh" },
    { name: "low angle view", category: "general", count: "950k", desc: "Sudut bidik dari bawah ke atas membuat karakter megah" },
    { name: "from below", category: "general", count: "890k", desc: "Kamera berada di bawah karakter" },
    { name: "high angle", category: "general", count: "680k", desc: "Sudut bidik dari atas ke bawah" },
    { name: "from above", category: "general", count: "720k", desc: "Kamera berada di atas memandang ke bawah" },
    { name: "dynamic dutch angle", category: "general", count: "290k", desc: "Kamera dimiringkan dinamis memberikan tensi dramatis" },
    { name: "tilted camera frame", category: "general", count: "180k", desc: "Bingkai miring artistik" },
    { name: "leading lines composition", category: "general", count: "110k", desc: "Garis arsitektur mengarahkan pandangan ke subjek" },
    { name: "depth of field", category: "general", count: "1.2M", desc: "Efek blur artistik latar belakang (bokeh kamera)" },

    // --- 10. Background & Environment ---
    { name: "indoor", category: "general", count: "2.2M", desc: "Di dalam ruangan" },
    { name: "outdoor", category: "general", count: "2.6M", desc: "Di luar ruangan alam terbuka" },
    { name: "abandoned gothic cathedral", category: "general", count: "110k", desc: "Katedral gothic terbengkalai dengan pilar batu megah" },
    { name: "giant shattered stained-glass window behind her", category: "general", count: "75k", desc: "Kaca patri mosaik raksasa yang retak di belakangnya" },
    { name: "overgrown ruins", category: "general", count: "190k", desc: "Reruntuhan kuno ditumbuhi tanaman merambat" },
    { name: "ancient mystical forest", category: "general", count: "240k", desc: "Hutan lebat purba yang magis" },
    { name: "dense jungle", category: "general", count: "140k", desc: "Hutan rimba rapat dan liar" },
    { name: "giant bioluminescent trees", category: "general", count: "90k", desc: "Pohon raksasa dengan dahan berpendar cahaya biru-hijau" },
    { name: "mossy rocks", category: "general", count: "160k", desc: "Bebatuan berlumut alami" },
    { name: "glowing mushrooms", category: "general", count: "120k", desc: "Jamur-jamur hutan yang memancarkan cahaya neon" },
    { name: "waterfall", category: "general", count: "190k", desc: "Air terjun alami dengan kabut air jernih" },
    { name: "seminar office", category: "general", count: "65k", desc: "Ruangan kantor futuristik Seminar Millennium" },
    { name: "cyberpunk city", category: "general", count: "420k", desc: "Kota masa depan dengan gedung tinggi dan papan neon" },
    { name: "tokyo street at midnight", category: "general", count: "180k", desc: "Jalanan kota Tokyo tengah malam basah oleh hujan" },
    { name: "cherry blossom field", category: "general", count: "310k", desc: "Padang bunga sakura mekar di musim semi" },
    { name: "cloudy sky", category: "general", count: "890k", desc: "Langit berawan dramatis" },
    { name: "cumulus clouds", category: "general", count: "450k", desc: "Awan putih bergumpal megah ala Makoto Shinkai" },

    // --- 11. Lighting, Effects & Atmosphere ---
    { name: "cinematic lighting", category: "general", count: "1.4M", desc: "Pencahayaan dramatis berkualitas film bioskop" },
    { name: "volumetric lighting", category: "general", count: "890k", desc: "Berkas cahaya nyata yang menembus partikel udara" },
    { name: "volumetric moonlight beams", category: "general", count: "110k", desc: "Sorot sinar rembulan keperakan menembus jendela" },
    { name: "tyndall effect", category: "general", count: "340k", desc: "Efek garis-garis berkas cahaya matahari (crepuscular rays)" },
    { name: "shafts of sunlight breaking through canopy", category: "general", count: "150k", desc: "Sinar matahari menembus rimbunnya kanopi pepohonan" },
    { name: "dramatic chiaroscuro lighting", category: "general", count: "120k", desc: "Kontras kuat antara bayangan gelap pekat dan cahaya tajam" },
    { name: "floating dust motes", category: "general", count: "210k", desc: "Partikel debu melayang berpendar cahaya di udara" },
    { name: "scattered sheet music flying in the air", category: "general", count: "60k", desc: "Kertas partitur musik beterbangan tertiup angin" },
    { name: "floating glowing spores", category: "general", count: "85k", desc: "Spora tanaman magis melayang bercahaya lembut" },
    { name: "fireflies", category: "general", count: "180k", desc: "Kunang-kunang malam berkelap-kelip" },
    { name: "volumetric fog", category: "general", count: "320k", desc: "Kabut tebal atmosferik menyelimuti lantai" },
    { name: "neon rim lighting", category: "general", count: "280k", desc: "Garis cahaya neon cyan / magenta di tepi tubuh subjek" },
    { name: "golden hour", category: "general", count: "650k", desc: "Cahaya hangat keemasan matahari terbenam" },
    { name: "lens flare", category: "general", count: "480k", desc: "Pendaran kilau cahaya pada lensa kamera" },
    { name: "film grain", category: "general", count: "320k", desc: "Tekstur butiran film analog 35mm klasik" },

    // --- 12. Characters & Popular Triggers ---
    { name: "rio tsukatsuki", category: "character", count: "85k", desc: "Blue Archive - Millennium Seminar President" },
    { name: "frieren", category: "character", count: "140k", desc: "Sousou no Frieren - Elven Mage" },
    { name: "asuka langley soryu", category: "character", count: "220k", desc: "Evangelion - Unit 02 Pilot" },
    { name: "raiden shogun", category: "character", count: "290k", desc: "Genshin Impact - Electro Archon" },
    { name: "hatsune miku", category: "character", count: "890k", desc: "Vocaloid iconic cyan twintail idol" },
    { name: "2b", category: "character", count: "310k", desc: "NieR:Automata - YoRHa No.2 Type B" },
    { name: "tifa lockhart", category: "character", count: "280k", desc: "Final Fantasy VII" },
    { name: "makima", category: "character", count: "190k", desc: "Chainsaw Man - Public Safety Devil Hunter" },

    // --- 13. Styles & Aesthetics ---
    { name: "makoto shinkai style", category: "artist", count: "190k", desc: "Awan megah, langit biru cerah, dan cahaya hangat nostalgia" },
    { name: "dark fantasy", category: "artist", count: "380k", desc: "Suasana suram gothic ala Dark Souls / Elden Ring" },
    { name: "cyberpunk", category: "artist", count: "620k", desc: "Estetika teknologi tinggi futuristik dengan lampu neon" },
    { name: "steampunk", category: "artist", count: "140k", desc: "Mesin uap kuno era Victoria dengan roda gerigi tembaga" },
    { name: "retro anime 90s", category: "artist", count: "210k", desc: "Gaya animasi anime klasik tahun 1990-an dengan grain halus" },

    // --- 14. Full NSFW & Adult / Hentai Danbooru Tags ---
    // Rating & Meta
    { name: "nsfw", category: "meta", count: "3.2M", desc: "Konten dewasa tidak aman dilihat di tempat umum" },
    { name: "explicit", category: "meta", count: "2.8M", desc: "Tingkat rating dewasa eksplisit / uncensored" },
    { name: "uncensored", category: "meta", count: "1.9M", desc: "Tanpa sensor mosaik pada area intim" },
    { name: "mosaic censorship", category: "meta", count: "1.2M", desc: "Sensor mosaik piksel khas karya anime Jepang" },
    { name: "bar censorship", category: "meta", count: "480k", desc: "Sensor balok hitam pada area intim" },

    // Nudity & Breasts Anatomy
    { name: "nude", category: "general", count: "2.4M", desc: "Tanpa busana secara menyeluruh (full telanjang)" },
    { name: "completely nude", category: "general", count: "950k", desc: "Telanjang bulat 100% tanpa sehelai benang pun" },
    { name: "topless", category: "general", count: "1.8M", desc: "Telanjang dada tanpa pakaian atas atau bra" },
    { name: "bottomless", category: "general", count: "1.1M", desc: "Telanjang bagian bawah tanpa bawahan atau underwear" },
    { name: "breasts", category: "general", count: "4.1M", desc: "Payudara wanita anime" },
    { name: "large breasts", category: "general", count: "2.9M", desc: "Payudara ukuran besar montok" },
    { name: "huge breasts", category: "general", count: "1.4M", desc: "Payudara ukuran sangat besar dan padat" },
    { name: "medium breasts", category: "general", count: "1.7M", desc: "Payudara ukuran proporsional sedang" },
    { name: "small breasts", category: "general", count: "1.1M", desc: "Payudara ukuran kecil imut" },
    { name: "bare breasts", category: "general", count: "1.6M", desc: "Payudara terbuka bebas tanpa busana" },
    { name: "nipples", category: "general", count: "2.2M", desc: "Puting payudara tampak jelas" },
    { name: "prominent nipples", category: "general", count: "620k", desc: "Puting payudara menonjol terangsang" },
    { name: "erect nipples", category: "general", count: "890k", desc: "Puting payudara mengeras tegak" },
    { name: "pink nipples", category: "general", count: "510k", desc: "Puting payudara merah muda natural" },
    { name: "areola", category: "general", count: "1.3M", desc: "Area areola melingkar di sekeliling puting" },
    { name: "large areola", category: "general", count: "380k", desc: "Areola lebar dan tampak jelas" },
    { name: "cleavage", category: "general", count: "2.1M", desc: "Belahan dada sensual" },
    { name: "underboob", category: "general", count: "620k", desc: "Lekukan bagian bawah payudara menyembul" },
    { name: "sideboob", category: "general", count: "490k", desc: "Belahan samping payudara terbuka" },
    { name: "breast grab", category: "general", count: "890k", desc: "Meremas atau mencengkeram payudara" },
    { name: "grabbing own breasts", category: "general", count: "420k", desc: "Karakter meremas kedua payudaranya sendiri" },
    { name: "grabbing breasts", category: "general", count: "680k", desc: "Tangan pasangan meremas payudara" },
    { name: "groping", category: "general", count: "540k", desc: "Meraba dan memegang area intim karakter" },
    { name: "breast squeeze", category: "general", count: "490k", desc: "Menekan atau merapatkan payudara" },
    { name: "hands on breasts", category: "general", count: "380k", desc: "Kedua tangan bertengger di atas payudara" },

    // Genitals & Lower Anatomy
    { name: "pussy", category: "general", count: "1.7M", desc: "Area kewanitaan / vulva" },
    { name: "vaginal", category: "general", count: "1.4M", desc: "Anatomi atau penetrasi kewanitaan" },
    { name: "clitoris", category: "general", count: "340k", desc: "Klitoris sensitif tampak jelas" },
    { name: "labia", category: "general", count: "290k", desc: "Bibir area kewanitaan" },
    { name: "cameltoe", category: "general", count: "420k", desc: "Garis celah intim mencetak pada pakaian ketat" },
    { name: "pubic hair", category: "general", count: "280k", desc: "Rambut halus di area intim" },
    { name: "shaved pussy", category: "general", count: "410k", desc: "Area kewanitaan dicukur mulus tanpa rambut" },
    { name: "ass", category: "general", count: "1.9M", desc: "Bokong seksi montok" },
    { name: "buttocks", category: "general", count: "890k", desc: "Pangkal pinggul dan pantat karakter" },
    { name: "spread legs", category: "general", count: "1.2M", desc: "Kedua kaki terbuka lebar menampakkan selangkangan" },
    { name: "thick thighs", category: "general", count: "1.4M", desc: "Paha padat montok dan seksi" },
    { name: "navel", category: "general", count: "1.6M", desc: "Pusar perut terbuka seksi" },
    { name: "penis", category: "general", count: "1.5M", desc: "Alat kelamin pria" },
    { name: "erect penis", category: "general", count: "890k", desc: "Alat vital pria sedang ereksi tegak" },
    { name: "erection", category: "general", count: "1.1M", desc: "Kondisi ereksi mengeras" },
    { name: "large penis", category: "general", count: "480k", desc: "Alat vital pria ukuran besar perkasa" },
    { name: "testicles", category: "general", count: "390k", desc: "Buah zakar pria" },

    // Sex Poses & Positions
    { name: "sex", category: "general", count: "2.1M", desc: "Adegan hubungan intim / bercinta" },
    { name: "heterosexual", category: "general", count: "1.8M", desc: "Bercinta antara karakter pria dan wanita" },
    { name: "vaginal penetration", category: "general", count: "1.3M", desc: "Penetrasi alat vital ke dalam kewanitaan" },
    { name: "cowgirl position", category: "general", count: "720k", desc: "Posisi wanita di atas menunggangi pria (riding)" },
    { name: "straddling", category: "general", count: "950k", desc: "Duduk mengangkang di atas tubuh pasangan" },
    { name: "riding", category: "general", count: "650k", desc: "Wanita bergerak naik-turun menunggangi pasangan" },
    { name: "on top", category: "general", count: "780k", desc: "Wanita berada di posisi atas pasangan" },
    { name: "reverse cowgirl", category: "general", count: "310k", desc: "Menunggangi membelakangi wajah pria" },
    { name: "missionary", category: "general", count: "620k", desc: "Posisi bercinta klasik wanita telentang di bawah pria" },
    { name: "doggystyle", category: "general", count: "850k", desc: "Posisi bercinta dari arah belakang" },
    { name: "mating press", category: "general", count: "410k", desc: "Kedua kaki wanita diangkat ke atas dada dipres rapat" },
    { name: "standing sex", category: "general", count: "280k", desc: "Bercinta dalam posisi berdiri" },
    { name: "breast rest", category: "general", count: "310k", desc: "Menempelkan payudara ke tubuh pasangan" },
    { name: "fellatio", category: "general", count: "890k", desc: "Aktivitas oral seks pada pria" },
    { name: "oral", category: "general", count: "1.1M", desc: "Aktivitas oral seks" },
    { name: "deepthroat", category: "general", count: "390k", desc: "Oral seks mendalam ke tenggorokan" },
    { name: "paizuri", category: "general", count: "520k", desc: "Titfuck masturbasi jepitan kedua payudara" },
    { name: "titfuck", category: "general", count: "480k", desc: "Berhubungan di antara belahan kedua payudara" },
    { name: "handjob", category: "general", count: "580k", desc: "Masturbasi menggunakan tangan" },
    { name: "fingering", category: "general", count: "490k", desc: "Memasukkan jari ke area kewanitaan" },
    { name: "cunnilingus", category: "general", count: "290k", desc: "Oral seks pada area kewanitaan" },
    { name: "pov", category: "general", count: "1.4M", desc: "Sudut pandang orang pertama (first person perspective)" },
    { name: "pov hands", category: "general", count: "490k", desc: "Tangan penonton/pasangan tampak di dalam layar" },
    { name: "pov crotch", category: "general", count: "380k", desc: "Sudut pandang menghadap selangkangan pasangan" },
    { name: "partner lying down", category: "general", count: "420k", desc: "Pasangan berbaring telentang di bawah" },
    { name: "female on top", category: "general", count: "610k", desc: "Karakter wanita dominan di atas tubuh pria" },
    { name: "male on female", category: "general", count: "890k", desc: "Hubungan intim pria dan wanita" },

    // Fluids & Reactions
    { name: "sweat", category: "general", count: "2.1M", desc: "Keringat membasahi kulit karakter" },
    { name: "heavy sweat", category: "general", count: "480k", desc: "Keringat bercucuran deras setelah aktivitas panas" },
    { name: "sweat drops", category: "general", count: "650k", desc: "Tetesan bulir keringat di wajah dan tubuh" },
    { name: "saliva", category: "general", count: "1.1M", desc: "Air liur di bibir dan mulut karakter" },
    { name: "drool", category: "general", count: "520k", desc: "Air liur menetes saat terangsang" },
    { name: "saliva trail", category: "general", count: "420k", desc: "Benang saliva terentang di mulut atau kelamin" },
    { name: "open mouth", category: "general", count: "2.8M", desc: "Mulut terbuka mendesah kenikmatan" },
    { name: "heavy breathing", category: "general", count: "490k", desc: "Napas terengah-engah dan memburu" },
    { name: "panting", category: "general", count: "380k", desc: "Napas tersengal kenikmatan" },
    { name: "blush", category: "general", count: "3.9M", desc: "Pipi merona merah malu dan terangsang" },
    { name: "deep blush", category: "general", count: "890k", desc: "Wajah memerah padam penuh gairah" },
    { name: "flushed face", category: "general", count: "620k", desc: "Rona wajah panas tersipu gairah" },
    { name: "ahegao", category: "general", count: "580k", desc: "Ekspresi kenikmatan ekstrem mata juling lidah menjulur" },
    { name: "heart eyes", category: "general", count: "490k", desc: "Mata berbentuk simbol hati penuh birahi" },
    { name: "pleasure face", category: "general", count: "680k", desc: "Ekspresi wajah menikmati kenikmatan puncak" },
    { name: "orgasmic expression", category: "general", count: "450k", desc: "Wajah mencapai orgasme kenikmatan puncak" },
    { name: "eyes half closed", category: "general", count: "780k", desc: "Mata setengah terpejam sayu terbuai sensasi" },
    { name: "cum", category: "general", count: "1.9M", desc: "Cairan mani sperma" },
    { name: "cum inside", category: "general", count: "920k", desc: "Klimaks sperma di dalam tubuh" },
    { name: "cum in pussy", category: "general", count: "780k", desc: "Cairan mani memenuhi area intim wanita" },
    { name: "cum on breasts", category: "general", count: "650k", desc: "Cairan mani membasahi payudara" },
    { name: "cum on body", category: "general", count: "890k", desc: "Cairan mani mengotori kulit tubuh" },
    { name: "cum drip", category: "general", count: "490k", desc: "Tetesan cairan kenikmatan menetes keluar" },
    { name: "precum", category: "general", count: "310k", desc: "Cairan pelumas awal sebelum klimaks" },
    { name: "pussy juice", category: "general", count: "420k", desc: "Cairan alami kenikmatan kewanitaan" },

    // Attire State & Fetishes
    { name: "torn clothes", category: "general", count: "480k", desc: "Pakaian robek terkoyak akibat pergulatan gairah" },
    { name: "clothes lift", category: "general", count: "420k", desc: "Menyingkap pakaian memperlihatkan tubuh" },
    { name: "shirt lift", category: "general", count: "620k", desc: "Mengangkat baju ke atas dada menampakkan payudara" },
    { name: "skirt lift", category: "general", count: "780k", desc: "Mengangkat rok memperlihatkan celana dalam atau area intim" },
    { name: "lingerie", category: "general", count: "890k", desc: "Pakaian dalam seksi berenda" },
];

/**
 * Search the Booru tag database + custom DB presets for matching tags.
 */
export function searchBooruTags(
    query: string,
    customDbTags: { name: string; category?: string }[] = [],
    limit: number = 8
): BooruTagItem[] {
    const rawQ = query.trim().toLowerCase();
    if (!rawQ) return [];

    // Allow search with space or underscore interchangeably
    const normalizedQ = rawQ.replace(/[\s_-]+/g, " ");
    const underscoreQ = rawQ.replace(/[\s_-]+/g, "_");

    // Combine custom DB tags into items
    const combinedCustom: BooruTagItem[] = customDbTags.map((t) => ({
        name: t.name,
        category: (t.category as BooruTagCategory) || "general",
        count: "DB",
        desc: "Tag kustom tersimpan di database",
    }));

    // Deduplicate against system database
    const existingNames = new Set(BOORU_TAGS_DATABASE.map((t) => t.name.toLowerCase()));
    const filteredCustom = combinedCustom.filter(
        (c) => !existingNames.has(c.name.toLowerCase())
    );

    const allPool = [...filteredCustom, ...BOORU_TAGS_DATABASE];

    const exactMatches: BooruTagItem[] = [];
    const prefixMatches: BooruTagItem[] = [];
    const containsMatches: BooruTagItem[] = [];

    for (const item of allPool) {
        const itemNorm = item.name.toLowerCase().replace(/[\s_-]+/g, " ");
        const itemUnder = item.name.toLowerCase().replace(/[\s_-]+/g, "_");

        if (itemNorm === normalizedQ || itemUnder === underscoreQ) {
            exactMatches.push(item);
        } else if (
            itemNorm.startsWith(normalizedQ) ||
            itemUnder.startsWith(underscoreQ) ||
            item.name.toLowerCase().startsWith(rawQ)
        ) {
            prefixMatches.push(item);
        } else if (
            itemNorm.includes(normalizedQ) ||
            itemUnder.includes(underscoreQ) ||
            item.name.toLowerCase().includes(rawQ) ||
            (item.desc && item.desc.toLowerCase().includes(rawQ))
        ) {
            containsMatches.push(item);
        }
    }

    const merged = [...exactMatches, ...prefixMatches, ...containsMatches];
    // Return top unique results
    const seen = new Set<string>();
    const result: BooruTagItem[] = [];
    for (const m of merged) {
        if (!seen.has(m.name.toLowerCase())) {
            seen.add(m.name.toLowerCase());
            result.push(m);
            if (result.length >= limit) break;
        }
    }

    return result;
}

/**
 * Helper to extract current token being typed at cursor position.
 */
export function extractActiveToken(
    text: string,
    cursorPos: number
): {
    token: string;
    startIndex: number;
    endIndex: number;
    prefix: string;
} {
    const textBefore = text.slice(0, cursorPos);
    const lastComma = textBefore.lastIndexOf(",");
    const lastParen = textBefore.lastIndexOf("(", cursorPos);

    let boundary = lastComma;
    let prefix = "";
    if (lastParen > lastComma) {
        boundary = lastParen;
        prefix = "(";
    }

    const start = boundary === -1 ? 0 : boundary + 1;
    const rawToken = textBefore.slice(start);
    const trimmedLeft = rawToken.trimStart();
    const leadingSpaces = rawToken.length - trimmedLeft.length;
    const actualStart = start + leadingSpaces;

    // Boundary after cursor (up to next comma, paren, colon, newline)
    const textAfter = text.slice(cursorPos);
    let endOffset = textAfter.length;
    [textAfter.indexOf(","), textAfter.indexOf(")"), textAfter.indexOf(":"), textAfter.indexOf("\n")].forEach(
        (idx) => {
            if (idx !== -1 && idx < endOffset) {
                endOffset = idx;
            }
        }
    );

    const actualEnd = cursorPos + endOffset;

    return {
        token: trimmedLeft.trimEnd(),
        startIndex: actualStart,
        endIndex: actualEnd,
        prefix,
    };
}
