import { Page, Section, Button, Image, Fragment, useGrokTheme, useState, useEffect, useRef, useCallback, type CSSProperties } from "grok/canvas";

// Grok Bot story Page template. collect.py fills the DATA block in the shape of Data (see data-contract.md);
// nothing outside DATA needs editing. A connector icon of "asset:<name>" draws that Page image; no icon draws the letter tile.

type Count = { label: string; count: number };
type ZoneData = { name: string; hourly: number[]; daily: number[]; peakHour: number; bestDay: Count; bestWeekday: Count; bestWeek: Count };
type CrewBot = { key: string; name: string; does: string; msgs: number; shape: string; color: string };
type IconBar = { name: string; icon: string; mono: string; value: number };
type PublishedBot = { name: string; tag: string; url: string; date: string; shape: string; color: string };
type Data = {
  version?: number;
  generatedAt?: string;
  user: { name: string };
  timezone: { id: string; label: string };
  window: { start: string; end: string; days: number; label: string } | null;
  zone: ZoneData | null;
  totals: { messages: number; bots: number; activeDays: number; streak: number; skills: number; pages: number | null; routines: number; routinesSetUp?: number; connectors: number; appConnectedCount?: number | null };
  crew: CrewBot[];
  connectors: IconBar[];
  beyond: { computerUse: number; browserPages: number; tasks: number };
  published: PublishedBot[];
  funDay?: { label: string; count: number; bots: { name: string; count: number }[] } | null;
  sources?: { [k: string]: unknown };
};

// DATA:BEGIN
const DATA: Data = {
  version: 2,
  user: { name: "" },
  timezone: { id: "UTC", label: "UTC" },
  window: null,
  zone: null,
  totals: { messages: 0, bots: 0, activeDays: 0, streak: 0, skills: 0, pages: null, routines: 0, routinesSetUp: 0, connectors: 0, appConnectedCount: null },
  crew: [],
  connectors: [],
  beyond: { computerUse: 0, browserPages: 0, tasks: 0 },
  published: [],
  funDay: null,
};
// DATA:END

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
function clamp01(x: number): number {
  return Math.max(0, Math.min(1, num(x)));
}
function ease(p: number): number {
  return 1 - Math.pow(1 - clamp01(p), 3);
}
function smooth(ph: number, a: number, b: number): number {
  const x = clamp01((ph - a) / Math.max(0.001, b - a));
  return x * x * (3 - 2 * x);
}
function popIn(p: number): number {
  const x = clamp01(p) - 1;
  return p >= 1 ? 1 : Math.max(0, 1 + (1.7 + 1) * Math.pow(x, 3) + 1.7 * Math.pow(x, 2));
}
function fmtInt(v: number): string {
  return Math.round(num(v)).toLocaleString("en-US");
}
function hourLabel(h: number): string {
  const x = ((Math.round(num(h)) % 24) + 24) % 24;
  return x === 0 ? "12a" : x === 12 ? "12p" : x < 12 ? x + "a" : x - 12 + "p";
}
const plural = (n: number, one: string, many: string) => fmtInt(n) + " " + (n === 1 ? one : many);
const msgs = (n: number) => plural(num(n), "message", "messages");

const T = DATA.totals;
const NAME = (DATA.user.name || "").trim() || "You";
const IS_YOU = NAME === "You";
const TITLE = NAME + " on Grok Bot";
const POSS = IS_YOU ? "Your" : NAME + "'s";
const WINDOW = DATA.window ? DATA.window.label : "";
const ZONE = DATA.zone;
const TOTAL_MSGS = num(T.messages);
const W = 700;

// Bot avatars from the app's avatar picker: a body and white eyes per shape on a 168 grid. The path data is packed
// (two characters for a start point, one per delta after it) and unpacked into the exact original paths.
const ci = (c: string) => c.charCodeAt(0) - (c.charCodeAt(0) > 92 ? 36 : 35);
const two = (a: string) => ci(a[0]) * 90 + ci(a[1]);
const unpack = (s: string, k: number) =>
  s.split(" ").map((p: string) => {
    const a = [two(p.slice(0, 2)), two(p.slice(2, 4))];
    const c = a.slice();
    const v = a.concat((p.slice(4).match(/~..|[^~]/g) ?? []).map((q: string, i: number) => (c[i % 2] += q.length > 1 ? two(q.slice(1)) - 4050 : ci(q) - 44)));
    return "M" + v[0] / k + " " + v[1] / k + v.slice(2).map((n: number, i: number) => (i % 6 ? " " : "C") + n / k).join("") + "Z";
  }).join("");
const SHAPE_NAMES = ["circle", "blob", "squircle", "pebble", "cloud", "flower", "star", "tablet", "house", "hex", "teardrop"];
const shapeMap = (packed: string[], k: number) => SHAPE_NAMES.reduce((o: { [k: string]: string }, n: string, i: number) => ({ ...o, [n]: unpack(packed[i], k) }), {});
const SHAPES = shapeMap(["#o$_IOJMIMJLJLKLJLKKKJLJLJMJMJMIOINJOIPIOIQJQIRJRJRKRJSKTKTLTLTMTMUMUOTNUOUPUOTQUQTRTRSRTRSSSTRTRTQTQTQUOUPTOUNUOUMTMULTLTLSLTKSJSJRJRJQJQIQIOJPIOIN", "#R$ZJNIMJLJLKJLJMJMIOINJRIOIPJMIOIOIPIQJQJRISKRKTKULTMUMTNUNUQUOTNUMUOTOUPTQTRSTTSSRSTSSSSTRRTRTRUOTPUNUMTMULTKSKSJRJSKRJRJRJRJSJQIQIPJOIOIMIPJOIQIO", "#`$^JNKILJLKMILIMJLJMILJMJLIMJKJMIMJLIPJPJTISLTLUMUNTMUMUNTMUNUMUMTMUNUNUMTQTPSURTRSQURUQTRTQURTQTRUQTSTQUQTRUNTNTJUKRJRIQIPJQIQIPJQIPIQIQJQIPIPIQJM", "$)$[JOILJLJMJLJMJLJMJLJLIMKLJKKKMJLJLJNINJOIPIPJRIRKRJSKTLSLULTNUMTOUNTNTNTMUMTKTNUNUPTPTPUQTRTRSSRSSSRUPTPTPUNUNTMUMTMTLUMTMTMUMTMTLTKSLSJSJQJQHOJN", "#l$^JNIMJLJLKKLJKJNIMJMJNJLJMJIKMJLJMIOJOIQIRJQJTJSLSKUMTMUNUQTNUMSKTMTMUNUOTPUQTRTRSSRTSTPUQTQTPTRTQTTSRTRTQUOTOUMULTMTJTKRKSIQJQIPIMJPIQKSJQJQIPIO", "$)$bINJJIMJMJOJNJNHPJLJLJJMILJQHMJMJILLKLJKIOIOIQIRJRJUKSJSKQISJSKSITMTLVMTPUPTTUQTQTOTPTPVNTRTRTTQURTMVQTQTURRSRTSUOUOUMULTLTISKTKSMUKTKSKUJQJRHQJN", "#}$mJOHJJKKKLHKJKIMIJKJKGOIMILHLKKKJJIOIOJTHRJSJUJTKTKULRJSJOGRJRISITKTKVKTPUOVTSSTSRVSTSUQUTSTSWOUQURURTSSSTVOUOTJVLTKTISJTJSIRLTKTOWLTLUKUJSJSHSIN", "#Y$UINJMJLJMJKKKLKKJMJMINJOINIPJPIQJRJRJRJSKTLSLUMTMTMUNTMUMTNUMTNUMTNUOUNTPUPTQTRTQTSSSRSSTQTQUPTOUPUNTNUMTLTLTLTKSJRKRIQJQJQIPJQIQJPIQJPIQJPIOIPJN", "#W$bKMKJKJLJMJLIMJLJLJMILJMJNINIPIOJSJRIQJRJRJRJRIRKSKTJTNTMUQUPTPURTQURTPURTQTRTRSSRTRTRTRUQTRTQURTQTSTPUPTNUMTLTJSJQJRIPIQJQIPIQJPIQIPJQIQIPJPHQJN", "$*$`IOJLININJMINJMINJLKLKJLJLKMILJLJMJMILJLIOJOJSIQKRJSJSKSJRKSJSKRJTLTMTNUOUOTRUPUPTQUPTQUPTRSRSTRTRSQURTRTQTQURTRUOTOTKUMSLTKTKSKTLSKTKSLTJRJQJPIO", "#s$dJNINJMIMJLKKJLKKLJKKLJMIMJNINJOIOIPJPIQJPIQIPJQIPJPIRJQJSJSLTMVOTPTPURTQTQURTQTQUQTRTRSRTRSSSTRTRSQUPTQUPUOTOUNUMTNUMTLTLTKSKSJSJRJRJQJQIPJPIOIO"], 1);
const SHAPE_EYES = shapeMap(["-G+^?I?@CBCBG=E@E@D@D?D?B?E?E?B@L>L>Q:XAXAcB`J`JeOaTaT_]^[^[Ya[_[_[_Y`Y`Y_WaWaYaQbQbKeG_G_?^?T?T9N?I 15)zALABCCCCF?FAFAI?FAFADAEAEAEAEAEAAAKAKAP;XGXGfN_R_RaZ^Y^YZ]Z]Z]Z]Y^Y^X]X_X_W`V_V_Y`P_P_KfFXFX<QAL", "-1,=@M>DCDCDF?F@F@G@H?H?I?H?H?FAI?I?G<Q@Q@[>[G[GcK_Q_QcZ[Z[ZV`X_X_V`W_W_V_V`V`Y`T`T`WaL_L_DbCXCX<R@M 0I+C@M@ECECEF?FAFAH@G@G@H?H@H@EBJ?J?I<P@P@U?ZFZFdJ_Q_Q_Z[Z[ZW_W^W^VaV_V_W`V_V_X^U_U_Z`N_N_GbDXDX;R@M", ",W-rALBFDEDEH?GAGAHAHAHAIAHAHAGAJAJAI>RBRBY?ZHZHcO^R^R]XZYZYX_W]W]V_V^V^X^U^U^U]S_S_VaL^L^E_DVDV<OAL /7-'BIDCECECIAGAGAHAHAHAHAIAIAF@L@L@L>UCUC_E]K]KdP]T]TZ]Y[Y[V`V^V^T^U^U^V^V^V^Y_R_R_PaI[I[B^BSBS=IBI", ".7,jAKADEDEDHAHBHBH@IAIAK?IAIAGBK@K@K=SBSB[@[I[IbO^S^S^YYYYYV^V^V^T`U^U^S^U^U^W_S_S_S`K]K]EaCUCU=OAK 1A+tBKBDEDEDFAHBHBM@JAJAHAIAIAGAKAKAJ>RBRBY@ZIZIbQ]S]S]XYZYZU_U^U^S^U^U^U^U^U^U^S^S^UaM]M]F_DUDU=MBK", ",)-#BL@FEEEEHBHBHBIBHAHAHAIAIAICKAKAG>QBQBX@ZIZIbN]R]R^WZXZXV^W]W]U]U^U^U^U^U^W[S^S^UaM]M]F`DVDV=OBL /),-BJDEEDEDHAHBHBIAHBHBIAHBHBFBKAKAM?SCSC[B[J[JaP]S]SZZYZYZV^V]V]U^V]V]V^U]U]W]S^S^SbK[K[C]CTCT>MBJ", ",x-bBIDCECECIAGAGAHAHAHAG?HAHAFBK@K@L=TBTB^B]K]KcQ^U^U[]YZYZW^W]W]V_V^V^V_U_U_V^R_R_UbJ]J]A]BSBS;MBI /f,zAKBEDEDED@GBGBJ@HAHAH@I@I@GAK@K@J=RBRBZ@[I[IdM^S^S[]YZYZW_W^W^V^V^V^T`U^U^X]T_T_WbL]L]D_CUCU;MAK", ",G,nAICAECECG?GAGAH@H@H@GAH@H@F?K@K@J=TBTB^A]J]JcR^U^U][Z[Z[V`W^W^V_V_V_W^V_V_X`S_S_RbJ]J]C^BTBT:NAI /U+xAIBADCDCH?GAGAF@H@H@HAI@I@F@L?L?L<UBUB_@]K]KcS^U^U][Z[Z[V`W^W^V_V_V_W`V_V_Y^R_R_RdI]I]A[ATAT;NAI", ",n,CAJA?EBEBH>H?H?I?H?H?H?G?G?CAI?I?G;SASA`B^J^JfP`S`S`Z[Z[ZX`X_X_VaW`W`W`U`U`VaRaRaRdI_I_A_AUAU;PAJ 1%+7@L?BDCDCK=H?H?I?H?H?FAG?G?G?I?I?F=RARA[@]H]HfK_R_R^[]Z]ZZ_Y^Y^U`W`W`V`V`V`W_RaRaSdJ_J_CaBWBW;R@L", "+z-pAL?DCECEG@GBGBH@HAHAI?HAHAEBJ@J@I>RARAY>ZHZHcM^R^R_XZYZYV`W^W^V^V^V^W`V^V^Y]T_T_TaM^M^FaDVDV<QAL .x-#AKBDDDDDFAGBGBH@HAHAHAIAIAG@K@K@H>RARAZ@[H[HbN^S^S]ZZZZZV_W^W^V^V^V^U^V^V^Y_T_T_U`L]L]D`CVCV;PAK", ",?.A>K>BABABE=E>E>H=F>F>F=G>G>E>I=I=F;R?R?];^G^GgMaSaSa[^[^[YbY`Y`WcWaWaWaWbWbYbUbUbXdL`L`DcAXAX8R>K 0?-5>L?CBBBBF=E>E>H=F>F>F>G=G=F=J=J=G:R>R>Z<^G^GgOaSaSbZ]]]]XbYaYaVbXaXaXbWaWaYaUbUbVfL`L`BbAWAW6R>L", "-v,U@LADDCDCI<H@H@K?H@H@G?H@H@E@J?J?I<TBTB_B^I^IcL_R_RaY[Z[ZV_X^X^VaW_W_W_U`U`U`Q`Q`QbI^I^BaBVBV;Q@L 1++[BLBCEDEDFAHBHBN@IAIAHAHAHAHAIAIAE@MBMBO>WGWGeM]Q]Q^YZYZYX]W]W]V_V^V^T^U^U^T^T^T^W`P^P^LdGWGW<RBL"], 10);
const SWATCH: { [k: string]: string } = { black: "%23000000", brown: "%23956F40", red: "%23DE4B46", orange: "%23E3762E", yellow: "%23E19A35", green: "%2365BD75", cyan: "%2362B3A2", blue: "%235383F6", violet: "%23895DF3", magenta: "%23DE4F97", gray: "%23959595" };
const WHITE = "%23FFFFFF";
const svgOf = (head: string, parts: string[]) => "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='" + head + "'%3E" + parts.join("") + "%3C/svg%3E";
const avPath = (d: string, fill: string) => "%3Cpath d='" + d + "' fill='" + fill + "'/%3E";
const body = (shape: string, color: string) => avPath(SHAPES[shape] ?? SHAPES.blob, SWATCH[color] ?? SWATCH.gray);
const eyes = (shape: string) => avPath(SHAPE_EYES[shape] ?? SHAPE_EYES.blob, WHITE);
const avatar = (shape: string, color: string) => svgOf("0 0 168 168", [body(shape, color), eyes(shape)]);
const AV = { grok: avatar("blob", "black"), grokBody: svgOf("0 0 168 168", [body("blob", "black")]), grokEyes: svgOf("0 0 168 168", [eyes("blob")]) };

const crew = (DATA.crew ?? []).map((b: CrewBot, i: number) => ({ ...b, key: b.key || "b" + i, av: avatar(b.shape, b.color) }));
const connectors = (DATA.connectors ?? []).filter((c: IconBar) => num(c.value) > 0);
const CONNECTOR_COUNT = num(T.connectors);
const published = (DATA.published ?? []).map((b: PublishedBot) => ({ ...b, av: avatar(b.shape, b.color) }));

// Archetypes: each rule scores the user's numbers; 1 or more matches, the top score is primary, the next match secondary,
// ties go to the earlier rule, and no match is Bot Explorer. collect.py mirrors these rules.
type Arch = { name: string; reason: string; score: number };
function archetype(d: Data): { primary: Arch; secondary: Arch | null } {
  const m = num(d.totals.messages);
  const bots = num(d.totals.bots);
  const rt = num(d.totals.routines);
  const cn = num(d.totals.connectors);
  const share = (hs: number[]) => (m > 0 ? hs.reduce((a: number, h: number) => a + num(d.zone?.hourly[h]), 0) / m : 0);
  const night = share([22, 23, 0, 1, 2, 3]);
  const morning = share([5, 6, 7, 8]);
  const per = bots > 0 ? m / bots : 0;
  const rules: Arch[] = [
    { name: "Bot Factory", reason: fmtInt(bots) + " bots and counting", score: bots / 8 },
    { name: "Bot Artisan", reason: fmtInt(bots) + " bots, about " + fmtInt(per) + " messages each", score: bots >= 1 && bots <= 4 ? per / 50 : 0 },
    { name: "Night Owl", reason: Math.round(night * 100) + "% of messages land between 10pm and 4am", score: night / 0.3 },
    { name: "Early Bird", reason: Math.round(morning * 100) + "% of messages land before 9am", score: morning / 0.3 },
    { name: "Autopilot", reason: fmtInt(rt) + " routines run without being asked", score: bots > 0 ? Math.min(rt / 5, rt / bots / 0.5) : 0 },
    { name: "Connector Collector", reason: fmtInt(cn) + " apps plugged in and put to work", score: cn / 12 },
  ];
  const hits = rules.filter((r: Arch) => r.score >= 1).sort((a: Arch, b: Arch) => b.score - a.score || rules.indexOf(a) - rules.indexOf(b));
  return { primary: hits[0] ?? { name: "Bot Explorer", reason: fmtInt(m) + " messages and just getting started", score: 0 }, secondary: hits[1] ?? null };
}
const ARCH = archetype(DATA);

// Archetype bots: an avatar plus a small prop, on a wider canvas so the prop can sit above the body.
const P = (n: number) => String(Math.round(n * 10) / 10);
const pt = (x: number, y: number) => P(x) + " " + P(y);
const avCircle = (cx: number, cy: number, r: number, fill: string) => "%3Ccircle cx='" + P(cx) + "' cy='" + P(cy) + "' r='" + P(r) + "' fill='" + fill + "'/%3E";
const avLine = (d: string, stroke: string, w: number) => "%3Cpath d='" + d + "' fill='none' stroke='" + stroke + "' stroke-width='" + w + "' stroke-linecap='round' stroke-linejoin='round'/%3E";
const avGroup = (tf: string, parts: string[]) => "%3Cg transform='" + tf + "'%3E" + parts.join("") + "%3C/g%3E";
const ring = (n: number, f: (a: number, i: number) => string) => Array.from({ length: n }).map((_: unknown, i: number) => f((i / n) * Math.PI * 2, i));
const gearPath = (cx: number, cy: number, R: number, teeth: number) =>
  ring(teeth * 4, (a: number, i: number) => (i === 0 ? "M" : "L") + pt(cx + Math.cos(a) * (i % 4 < 2 ? R : R * 0.74), cy + Math.sin(a) * (i % 4 < 2 ? R : R * 0.74))).join(" ") + "Z";
const sparkPath = (x: number, y: number, r: number) => {
  const q = " Q" + pt(x, y) + " ";
  return "M" + pt(x, y - r) + q + pt(x + r, y) + q + pt(x, y + r) + q + pt(x - r, y) + q + pt(x, y - r) + "Z";
};
const miniBot = (x: number, y: number, s: number, color: string) => avGroup("translate(" + x + " " + y + ") scale(" + s + ")", [body("blob", color), eyes("blob")]);
const sunRays = ring(8, (a: number) => "M" + pt(160 + Math.cos(a) * 23, 6 + Math.sin(a) * 23) + " L" + pt(160 + Math.cos(a) * 31, 6 + Math.sin(a) * 31)).join(" ");
const S = SWATCH;
const ARCH_LOOKS: { [k: string]: { shape: string; color: string; eyes?: string; prop: string[]; about: string } } = {
  "Bot Factory": { shape: "hex", color: "blue", prop: [avPath(gearPath(158, 8, 24, 8), S.black), avCircle(158, 8, 8, WHITE), avPath(gearPath(178, 40, 13, 6), S.gray), avCircle(178, 40, 4, WHITE), miniBot(112, 146, 0.25, "orange"), miniBot(148, 140, 0.22, "magenta")], about: "a blue hex with turning gears, and two fresh mini bots rolling off the line" },
  "Bot Artisan": { shape: "flower", color: "magenta", prop: [avLine("M184 -14 L156 26", S.brown, 9), avLine("M156 26 L148 38", S.gray, 12), avPath("M152 33 C150 46 140 56 124 62 C128 48 134 38 142 30 Z", S.yellow), avPath(sparkPath(6, 2, 16), S.yellow), avPath(sparkPath(30, -14, 8), S.yellow)], about: "a magenta flower holding a paintbrush, with a couple of sparks" },
  "Night Owl": { shape: "cloud", color: "violet", eyes: "translate(0 73) scale(1 0.42) translate(0 -73)", prop: [avPath("M162 -16 A26 26 0 1 0 186 22 A20 20 0 1 1 162 -16 Z", S.yellow), avPath(sparkPath(124, -10, 9), S.yellow), avPath(sparkPath(186, 54, 7), S.yellow)], about: "a violet cloud with sleepy half-closed eyes, a crescent moon and stars" },
  "Early Bird": { shape: "star", color: "orange", prop: [avLine(sunRays, S.yellow, 5), avCircle(160, 6, 17, S.yellow)], about: "an orange star with a bright sun rising over its shoulder" },
  Autopilot: { shape: "tablet", color: "cyan", prop: [avLine("M178 12 A22 22 0 1 1 168 -10", S.black, 7), avPath("M162 -22 L180 -8 L160 2 Z", S.black)], about: "a cyan tablet under a looping arrow that keeps going on its own" },
  "Connector Collector": { shape: "house", color: "green", prop: [avLine("M150 -16 L150 -2 M164 -16 L164 -2", S.gray, 5), avPath("M140 -4 H174 V14 Q174 26 162 26 H152 Q140 26 140 14 Z", S.black), avLine("M157 26 C157 40 172 40 172 54", S.black, 5), avLine("M-6 8 L10 -8 M2 -12 Q12 -22 20 -14 Q28 -6 18 4 M-10 12 Q-20 22 -12 30 Q-4 38 6 28", S.gray, 6)], about: "a green house with a plug and a chain link, always connecting something" },
  "Bot Explorer": { shape: "teardrop", color: "brown", prop: [avCircle(158, 12, 29, S.black), avCircle(158, 12, 23, WHITE), avPath("M154 9 L174 -8 L162 15 Z", S.red), avPath("M162 15 L142 32 L154 9 Z", S.gray), avCircle(158, 12, 4, S.black)], about: "a brown teardrop carrying a compass, just setting out" },
};
const lookOf = (name: string) => ARCH_LOOKS[name] ?? ARCH_LOOKS["Bot Explorer"];
const archBot = (name: string) => {
  const k = lookOf(name);
  return svgOf("-24 -24 216 216", [body(k.shape, k.color), k.eyes ? avGroup(k.eyes, [eyes(k.shape)]) : eyes(k.shape)].concat(k.prop));
};
const ARCH_AV = archBot(ARCH.primary.name);
const ARCH2_AV = ARCH.secondary ? archBot(ARCH.secondary.name) : "";

type StepKey = "cover" | "when" | "crew" | "toolkit" | "beyond" | "arch" | "shipped" | "share";
const BEYOND_ON = num(DATA.beyond?.computerUse) + num(DATA.beyond?.browserPages) + num(DATA.beyond?.tasks) > 0;
// A step with no data is left out rather than shown empty.
const STEPS = ([
  ["cover", IS_YOU ? "Meet you" : "Meet " + NAME, true],
  ["when", IS_YOU ? "When you work" : "When " + NAME + " works", TOTAL_MSGS > 0 && !!ZONE],
  ["crew", "The crew", crew.length > 0],
  ["toolkit", "The toolkit", connectors.length > 0],
  ["beyond", "Beyond the chat", BEYOND_ON],
  ["arch", "Your archetype", true],
  ["shipped", IS_YOU ? "Bots you shipped" : "Bots " + NAME + " shipped", published.length > 0],
  ["share", "Share your story", true],
] as [StepKey, string, boolean][]).filter((x: [StepKey, string, boolean]) => x[2]);

type Th = ReturnType<typeof useGrokTheme>;
const tx = (th: Th, fontSize: string | number, color: string, fontWeight?: number, x?: CSSProperties): CSSProperties => ({ fontFamily: th.font.family, fontSize, color, fontWeight, ...x });
const h3 = (th: Th): CSSProperties => tx(th, th.font.heading3.fontSize, th.text.primary, th.weight.semibold, { lineHeight: th.font.heading3.lineHeight });
const metric = (th: Th): CSSProperties => tx(th, th.font.metric.fontSize, th.text.primary, th.weight.semibold, { lineHeight: th.font.metric.lineHeight, fontVariantNumeric: "tabular-nums" });
const col = (gap: number, x?: CSSProperties): CSSProperties => ({ display: "flex", flexDirection: "column", gap, ...x });
const center: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center" };
const box = (th: Th, x?: CSSProperties): CSSProperties => ({ border: "1px solid " + th.border.default, borderRadius: th.radius.lg, padding: 16, background: th.bg.base, ...x });
const acc = (th: Th) => th.dataviz.categorical[0] ?? th.text.primary;
const up = (k: number, d: number) => "translateY(" + (1 - k) * d + "px)";
const rise = (t: number, delay: number, d: number): CSSProperties => {
  const k = ease((t - delay) / 0.6);
  return { opacity: k, transform: "translateY(" + ((1 - k) * d).toFixed(1) + "px)" };
};
const view = (w: number, h: number) => "0 0 " + w + " " + h;
const grid = (min: number, gap: number): CSSProperties => ({ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(" + min + "px, 1fr))", gap });

function useClock(stop?: number): number {
  const [t, setT] = useState<number>(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const s = Math.max(0, (now - start) / 1000);
      setT(s);
      if (stop === undefined || s < stop) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stop]);
  return t;
}

// Reduced motion: the animated pieces show a settled frame instead.
function useStill(): boolean {
  const [still, setStill] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return still;
}

// Dark mode only: a thin rim in a theme token around avatars so black bodies still read. RimDef is the SVG filter
// (it survives the PNG export); useRim is the same for <img>.
function RimDef(props: { id: string; r: number }) {
  const th = useGrokTheme();
  if (th.kind !== "dark") return null;
  return (
    <defs>
      <filter id={props.id} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
        <feMorphology in="SourceAlpha" operator="dilate" radius={props.r} result="grow" />
        <feFlood floodColor={th.border.strong} result="ink" />
        <feComposite in="ink" in2="grow" operator="in" result="rim" />
        <feMerge>
          <feMergeNode in="rim" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}
function useRimUrl(id: string): string | undefined {
  return useGrokTheme().kind === "dark" ? "url(#" + id + ")" : undefined;
}
function useRim(): CSSProperties {
  const th = useGrokTheme();
  const d = "drop-shadow(0 0 0.8px " + th.border.strong + ")";
  return th.kind === "dark" ? { filter: d + " " + d + " " + d } : {};
}

const CH = 380;
const HERO = 150;

function Cover(props: { onStart: () => void }) {
  const th = useGrokTheme();
  const ref = useRef<SVGSVGElement | null>(null);
  const target = useRef({ x: W / 2, y: CH / 2 });
  const [s, setS] = useState({ x: W / 2, y: CH / 2, vx: 0, vy: 0, t: 0 });
  useEffect(() => {
    const onMove = (e: globalThis.PointerEvent) => {
      const r = ref.current?.getBoundingClientRect();
      if (r && r.width !== 0) target.current = { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * CH };
    };
    const onLeave = () => {
      target.current = { x: W / 2, y: CH / 2 };
    };
    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);
    let raf = 0;
    const start = performance.now();
    let cur = { x: W / 2, y: CH / 2, vx: 0, vy: 0 };
    const tick = (now: number) => {
      const vx = (cur.vx + (Math.max(W / 2 - 80, Math.min(W / 2 + 80, target.current.x)) - cur.x) * 0.02) * 0.86;
      const vy = (cur.vy + (Math.max(CH / 2 - 30, Math.min(CH / 2 + 30, target.current.y)) - cur.y) * 0.02) * 0.86;
      cur = { x: cur.x + vx, y: cur.y + vy, vx, vy };
      setS({ ...cur, t: (now - start) / 1000 });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);
  const t = s.t;
  const heroIn = popIn((t - 0.35) / 0.7);
  const speed = Math.min(1, Math.hypot(s.vx, s.vy) / 12);
  const breathe = 1 + Math.sin(t * 2.2) * 0.025;
  const sx = heroIn * breathe * (1 + speed * 0.12);
  const sy = heroIn * (2 - breathe) * (1 - speed * 0.1);
  const tilt = Math.max(-14, Math.min(14, s.vx * 2.2));
  const dx = target.current.x - s.x;
  const dy = target.current.y - s.y;
  const d = Math.max(1, Math.hypot(dx, dy));
  const look = Math.min(6, d / 14);
  const blink = t % 4.2 < 0.12 ? 0.15 : 1;
  const eyeY = -HERO / 2 + (32 / 84) * HERO;
  const rimUrl = useRimUrl("rim-cover");
  const orbit = crew.map((b, i: number) => {
    const a = (i / Math.max(1, crew.length)) * Math.PI * 2 - Math.PI / 2 + t * 0.22;
    return { b, i, k: popIn((t - 1.0 - i * 0.2) / 0.5), x: W / 2 + Math.cos(a) * 250, y: CH / 2 + Math.sin(a) * 128, back: Math.sin(a) < 0 };
  });
  const drawBot = (o: (typeof orbit)[number]) => {
    const size = 54 * (0.85 + 0.15 * (o.y / CH)) * o.k;
    const bob = Math.sin(t * 1.6 + o.i * 1.3) * 3;
    return (
      <g key={o.b.key} opacity={clamp01(o.k * 2)}>
        <title>{o.b.name}</title>
        <image href={o.b.av} x={o.x - size / 2} y={o.y - size / 2 + bob} width={Math.max(0.01, size)} height={Math.max(0.01, size)} filter={rimUrl} />
      </g>
    );
  };
  return (
    <div style={col(10, { alignItems: "center", textAlign: "center", padding: "12px 0 8px" })}>
      <div style={{ ...rise(t, 0, 14), ...tx(th, 44, th.text.primary, th.weight.semibold, { lineHeight: 1.1, letterSpacing: -1 }) }}>{TITLE}</div>
      <div style={{ ...rise(t, 0.15, 14), ...tx(th, th.font.body1.fontSize, th.text.secondary) }}>{WINDOW ? "Your Grok Bot story, " + WINDOW : "Your Grok Bot story"}</div>
      <svg ref={ref} width="100%" viewBox={view(W, CH)} role="img" aria-label={"The Grok Bot avatar, which follows the cursor, with " + (IS_YOU ? "your" : NAME + "'s") + " most-messaged bots orbiting it"} style={{ maxWidth: W, overflow: "visible" }}>
        <RimDef id="rim-cover" r={1.5} />
        <ellipse cx={W / 2} cy={CH / 2} rx={250} ry={128} fill="none" stroke={th.border.weak} strokeWidth={1} strokeDasharray="3 6" opacity={ease((t - 0.8) / 0.6)} />
        {orbit.filter((o) => o.back).map(drawBot)}
        <ellipse cx={s.x} cy={CH / 2 + HERO / 2 + 6} rx={Math.max(1, 56 * heroIn * (1 - (s.y - CH / 2) / 300))} ry={7} fill={th.border.weak} />
        <g transform={"translate(" + s.x + " " + (s.y + Math.sin(t * 2.2) * 3) + ") rotate(" + tilt + ") scale(" + Math.max(0.001, sx).toFixed(3) + " " + Math.max(0.001, sy).toFixed(3) + ")"}>
          <image href={AV.grokBody} x={-HERO / 2} y={-HERO / 2} width={HERO} height={HERO} filter={rimUrl} />
          <g transform={"translate(" + ((dx / d) * look).toFixed(2) + " " + ((dy / d) * look).toFixed(2) + ") translate(0 " + eyeY + ") scale(1 " + blink + ") translate(0 " + -eyeY + ")"}>
            <image href={AV.grokEyes} x={-HERO / 2} y={-HERO / 2} width={HERO} height={HERO} />
          </g>
        </g>
        {orbit.filter((o) => !o.back).map(drawBot)}
      </svg>
      <div style={{ ...rise(t, 1.6, 14), width: "100%", marginTop: 12 }}>
        <StatGrid
          delay={1.6}
          min={150}
          stats={([[TOTAL_MSGS, "Messages sent", "msgs"], [num(T.bots), "Bots messaged", "bots"], [num(T.activeDays), "Active days", "days"], [num(T.streak), "Day streak", "streak"]] as [number, string, string][]).filter((st: [number, string, string]) => st[0] > 0)}
        />
      </div>
      <div style={{ ...rise(t, 2.1, 14), ...col(8, { alignItems: "center", marginTop: 8 }) }}>
        <Button label="Start" variant="primary" onClick={props.onStart} />
        <div style={tx(th, th.font.caption.fontSize, th.text.tertiary)}>Or press the right arrow key</div>
      </div>
    </div>
  );
}

function Progress(props: { step: number; total: number }) {
  const th = useGrokTheme();
  const n = Math.max(1, props.total);
  const w = (W - 6 * (n - 1)) / n;
  return (
    <svg width="100%" viewBox={view(W, 6)} preserveAspectRatio="none" role="img" aria-label={"Step " + (props.step + 1) + " of " + n}>
      {Array.from({ length: n }).map((_: unknown, i: number) => (
        <rect key={i} x={i * (w + 6)} y={0} width={w} height={6} rx={3} fill={i <= props.step ? acc(th) : th.border.default} />
      ))}
    </svg>
  );
}

function HourChart(props: { zs: ZoneData }) {
  const th = useGrokTheme();
  const p = ease(useClock(1.1) / 1.1);
  const { zs } = props;
  const max = Math.max(1, ...zs.hourly.map((v: number) => num(v)));
  const [hover, setHover] = useState<number>(zs.peakHour);
  const bw = (W - 20) / 24;
  return (
    <svg width="100%" viewBox={view(W, 260)} role="img" aria-label={"Messages sent by hour of day, " + zs.name}>
      <line x1={10} x2={W - 10} y1={230} y2={230} stroke={th.border.subtle} />
      {zs.hourly.map((v: number, h: number) => {
        const bh = ((190 * num(v)) / max) * ease(clamp01((p - (h / 24) * 0.5) / 0.5));
        return (
          <g key={h} onPointerEnter={() => setHover(h)}>
            <rect x={10 + h * bw} y={10} width={bw} height={220} fill={th.bg.base} fillOpacity={0} />
            <rect x={10 + h * bw + 3} y={230 - bh} width={bw - 6} height={bh} rx={4} fill={h === hover ? acc(th) : th.dataviz.singleSeriesRest} />
            {h % 4 === 0 ? (
              <text x={10 + h * bw + bw / 2} y={252} textAnchor="middle" fill={th.text.tertiary} style={tx(th, th.font.label.fontSize, th.text.tertiary)}>
                {hourLabel(h)}
              </text>
            ) : null}
          </g>
        );
      })}
      <text x={10} y={20} fill={th.text.primary} style={tx(th, th.font.body1.fontSize, th.text.primary, th.weight.semibold)}>
        {hourLabel(hover) + "m " + zs.name + ", " + num(zs.hourly[hover]) + " messages" + (hover === zs.peakHour ? ", peak hour" : "")}
      </text>
    </svg>
  );
}

function PeakTile(props: { label: string; value: string; sub: string; i: number; t: number }) {
  const th = useGrokTheme();
  const e = ease((props.t - 0.3 - props.i * 0.12) / 0.6);
  return (
    <div style={box(th, { ...col(4), alignItems: "center", textAlign: "center", opacity: e, transform: up(e, 12) })}>
      <div style={tx(th, th.font.label.fontSize, th.text.tertiary)}>{props.label}</div>
      <div style={h3(th)}>{props.value}</div>
      <div style={tx(th, th.font.body2.fontSize, th.text.secondary)}>{props.sub}</div>
    </div>
  );
}

const FUN = DATA.funDay ?? null;
function FunFact(props: { t: number }) {
  const th = useGrokTheme();
  const rim = useRim();
  if (!FUN || num(FUN.count) <= 0) return null;
  const e = ease((props.t - 0.6) / 0.6);
  const top = FUN.bots.filter((b: { count: number }) => num(b.count) > 0);
  const names = top.map((b: { name: string }) => b.name);
  const who = names.length > 1 ? names.slice(0, -1).join(", ") + " and " + names[names.length - 1] : names[0] ?? "";
  const avs = top.map((b: { name: string }) => crew.find((c) => c.name === b.name)?.av ?? "").filter((x: string) => x !== "");
  return (
    <div style={box(th, { background: th.fill.secondary, display: "flex", alignItems: "center", gap: 16, marginTop: 12, opacity: e, transform: up(e, 12) })}>
      <div style={{ display: "flex", flexShrink: 0 }}>
        {avs.map((src: string, i: number) => (
          <img key={i} src={src} alt="" width={52} height={52} style={{ display: "block", width: 52, height: 52, marginLeft: i === 0 ? 0 : -14, transform: "rotate(" + (i % 2 === 0 ? -8 : 8) + "deg)", ...rim }} />
        ))}
      </div>
      <div style={col(2, { minWidth: 0 })}>
        <div style={tx(th, th.font.label.fontSize, th.text.tertiary, th.weight.semibold)}>Fun fact</div>
        <div style={h3(th)}>{"Biggest day: " + FUN.label}</div>
        <div style={tx(th, th.font.body2.fontSize, th.text.secondary)}>
          {msgs(FUN.count) + (who ? ", and " + fmtInt(top.reduce((a: number, b: { count: number }) => a + num(b.count), 0)) + " of them went to " + who : "")}
        </div>
      </div>
    </div>
  );
}

function WhenWorks() {
  const th = useGrokTheme();
  const t = useClock(2);
  const z = ZONE;
  if (!z) return null;
  return (
    <Fragment>
      <HourChart zs={z} />
      <div style={grid(180, 12)}>
        <PeakTile i={0} t={t} label="Peak hour" value={hourLabel(z.peakHour) + "m"} sub={msgs(z.hourly[z.peakHour])} />
        <PeakTile i={1} t={t} label="Busiest weekday" value={z.bestWeekday.label} sub={msgs(z.bestWeekday.count)} />
        <PeakTile i={2} t={t} label="Busiest week" value={z.bestWeek.label} sub={msgs(z.bestWeek.count)} />
      </div>
      <FunFact t={t} />
      <div style={tx(th, th.font.caption.fontSize, th.text.tertiary, undefined, { textAlign: "center", marginTop: 16 })}>{"All times in " + z.name + ". Weeks start Monday."}</div>
    </Fragment>
  );
}

const TW = 200;
const TH = 100;
function BubbleViz(props: { t: number }) {
  const th = useGrokTheme();
  const c0 = acc(th);
  const cyc = props.t * 0.8;
  const base = Math.floor(cyc);
  const e = ease(clamp01((cyc - base) / 0.45));
  return (
    <Fragment>
      {Array.from({ length: 5 }).map((_: unknown, i: number) => {
        const k = base - i;
        if (k < 0) return null;
        const slot = i - 1 + e;
        const y = 70 - slot * 24;
        const w = 64 + ((k * 37) % 54);
        const left = k % 3 === 1;
        const x = left ? 18 : TW - 18 - w;
        return (
          <g key={k} opacity={i === 0 ? e : clamp01(1 - (slot - 2.2) / 0.8)}>
            <rect x={x} y={y} width={w} height={18} rx={9} fill={left ? th.fill.secondary : c0} stroke={left ? th.border.default : "none"} />
            <circle cx={left ? x + 3 : x + w - 3} cy={y + 16} r={3} fill={left ? th.fill.secondary : c0} />
          </g>
        );
      })}
    </Fragment>
  );
}

const CLUSTER = [[100, 54, 54], [54, 44, 40], [146, 46, 40], [24, 74, 30], [176, 76, 30], [100, 16, 26]];
function BotsViz(props: { t: number }) {
  const th = useGrokTheme();
  const t = props.t;
  const more = num(T.bots) - Math.min(CLUSTER.length, crew.length);
  const rimUrl = useRimUrl("rim-bots");
  return (
    <Fragment>
      <RimDef id="rim-bots" r={1} />
      {CLUSTER.map((q: number[], i: number) => {
        const av = crew[i]?.av;
        if (!av) return null;
        const sz = q[2] * popIn((t - 0.1 - i * 0.1) / 0.5);
        return <image key={i} href={av} x={q[0] - sz / 2} y={q[1] - sz / 2 + Math.sin(t * 2 + i * 1.7) * 2.5} width={sz} height={sz} filter={rimUrl} />;
      })}
      {more > 0 ? (
        <g transform={"translate(176 22) scale(" + popIn((t - 0.9) / 0.5) + ")"}>
          <rect x={-17} y={-11} width={34} height={22} rx={11} fill={th.fill.secondary} stroke={th.border.default} />
          <text x={0} y={4} textAnchor="middle" fill={th.text.secondary} style={tx(th, 11, th.text.secondary, th.weight.semibold)}>
            {"+" + more}
          </text>
        </g>
      ) : null}
    </Fragment>
  );
}

// One dot per day of the window: 4 rows for short windows, 7 for long ones with smaller dots.
const daily: number[] = ZONE?.daily ?? [];
const dayLevel = (v: number) => (num(v) <= 0 ? 0 : num(v) < 10 ? 1 : num(v) < 30 ? 2 : num(v) < 50 ? 3 : 4);
function CalendarViz(props: { t: number }) {
  const th = useGrokTheme();
  const nd = Math.max(1, daily.length);
  const rows = nd <= 44 ? 4 : 7;
  const cols = Math.max(1, Math.ceil(nd / rows));
  const pitch = Math.min(16, (TW - 24) / Math.max(1, cols - 1), (TH - 24) / Math.max(1, rows - 1));
  const step = Math.min(0.025, 1 / nd);
  const x0 = (TW - (cols - 1) * pitch) / 2;
  const y0 = (TH - (Math.ceil(nd / cols) - 1) * pitch) / 2;
  return (
    <Fragment>
      {daily.map((v: number, i: number) => {
        const lv = dayLevel(v);
        return <circle key={i} cx={x0 + (i % cols) * pitch} cy={y0 + Math.floor(i / cols) * pitch} r={Math.min(5.5, pitch * 0.36) * popIn((props.t - 0.1 - i * step) / 0.4)} fill={lv === 0 ? th.border.default : acc(th)} opacity={lv === 0 ? 1 : 0.3 + lv * 0.175} />;
      })}
    </Fragment>
  );
}

// Up to 13 dots; longer streaks fill the same 13 in proportion.
function StreakViz(props: { t: number; val: number; total: number }) {
  const th = useGrokTheme();
  const c0 = acc(th);
  const n = Math.max(1, Math.min(13, props.total));
  const lit = Math.round((props.val / Math.max(1, props.total)) * n);
  const pts = Array.from({ length: n }, (_: unknown, i: number) => ({ x: 16 + i * 14, y: 56 + Math.sin(i * 0.7) * 16 }));
  const head = pts[Math.max(0, Math.min(n - 1, lit - 1))] ?? pts[0];
  const glow = (props.t * 4) % (n + 6);
  return (
    <Fragment>
      {pts.slice(1).map((q: { x: number; y: number }, i: number) => (
        <line key={"l" + i} x1={pts[i].x} y1={pts[i].y} x2={q.x} y2={q.y} stroke={i + 1 < lit ? c0 : th.border.default} strokeWidth={3} strokeLinecap="round" />
      ))}
      {pts.map((q: { x: number; y: number }, i: number) => (
        <circle key={i} cx={q.x} cy={q.y} r={i < lit ? 5 + Math.max(0, 1 - Math.abs(glow - i) / 2) * 2 : 4} fill={i < lit ? c0 : th.bg.base} stroke={i < lit ? "none" : th.border.default} strokeWidth={2} />
      ))}
      {lit > 0 ? (
        <g transform={"translate(" + head.x + " " + (head.y - 16) + ") scale(" + (1 + Math.sin(props.t * 8) * 0.08) + ")"}>
          <path d="M0 -10 C6 -4 7 2 4 6 C2 9 -2 9 -4 6 C-7 2 -5 -3 -2 -5 C-2 -2 -1 0 1 0 C2 -3 1 -7 0 -10 Z" fill={th.dataviz.categorical[1] ?? c0} />
        </g>
      ) : null}
    </Fragment>
  );
}

function StatGrid(props: { stats: [number, string, string][]; delay: number; min: number }) {
  const th = useGrokTheme();
  const t = Math.max(0, useClock() - props.delay);
  return (
    <div style={{ ...grid(props.min, 12), gridAutoRows: "1fr" }}>
      {props.stats.map(([n, label, kind]: [number, string, string], i: number) => {
        const lt = Math.max(0, t - i * 0.12);
        const e = ease(lt / 0.5);
        const val = kind === "streak" ? Math.min(n, Math.floor(lt / 0.09)) : Math.round(num(n) * ease(lt / 1.4));
        return (
          <div key={i} style={box(th, { boxSizing: "border-box", ...col(4), alignItems: "center", justifyContent: "center", textAlign: "center", opacity: e, transform: up(e, 16) + " scale(" + (0.96 + 0.04 * e) + ")" })}>
            <svg width="100%" viewBox={view(TW, TH)} style={{ maxWidth: 220 }} role="img" aria-label={label}>
              {kind === "msgs" ? <BubbleViz t={lt} /> : kind === "bots" ? <BotsViz t={lt} /> : kind === "days" ? <CalendarViz t={lt} /> : <StreakViz t={lt} val={val} total={n} />}
            </svg>
            <div style={metric(th)}>{fmtInt(val)}</div>
            <div style={tx(th, th.font.body2.fontSize, th.text.secondary, undefined, { whiteSpace: "nowrap" })}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}

// Connectors ranked by use, top 10. A bar grows in once; with reduced motion it starts full.
function Toolkit() {
  const th = useGrokTheme();
  const still = useStill();
  const t = useClock(2.4);
  if (connectors.length === 0) return null;
  const ranked = connectors.slice().sort((a: IconBar, b: IconBar) => num(b.value) - num(a.value));
  const shown = ranked.slice(0, 10);
  const more = Math.max(0, CONNECTOR_COUNT - shown.length, ranked.length - shown.length);
  const top = Math.max(1, num(shown[0]?.value));
  const dark = th.kind === "dark";
  const lab = th.font.label.fontSize;
  return (
    <div style={col(20)}>
      <div style={col(2)}>
        <div style={h3(th)}>{"Plugged into " + plural(CONNECTOR_COUNT, "app", "apps")}</div>
        <div style={tx(th, lab, th.text.secondary)}>Most used first</div>
      </div>
      <div style={col(14)}>
        {shown.map((it: IconBar, i: number) => (
          <div key={it.name + i} style={{ display: "grid", gridTemplateColumns: "24px 36px minmax(0, 1fr)", columnGap: 12, alignItems: "center" }}>
            <div style={tx(th, lab, th.text.tertiary, th.weight.semibold, { textAlign: "right", fontVariantNumeric: "tabular-nums" })}>{String(i + 1)}</div>
            <div style={{ ...center, ...tx(th, th.font.caption.fontSize, dark ? th.text.onPrimary : th.text.primary, th.weight.semibold), width: 36, height: 36, boxSizing: "border-box", borderRadius: th.radius.lg, background: dark ? th.fill.primary : th.bg.base, border: "1px solid " + th.border.subtle, overflow: "hidden" }}>
              {/^(asset:|data:image\/)/.test(it.icon || "") ? (
                <div style={{ ...center, width: 24, height: 24, overflow: "hidden" }}>
                  <Image src={it.icon} alt={it.name + " logo"} width={24} height={24} fit="contain" />
                </div>
              ) : (
                it.mono
              )}
            </div>
            <div style={col(6, { minWidth: 0 })}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <div style={tx(th, th.font.body2.fontSize, th.text.primary, th.weight.semibold, { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>{it.name}</div>
                <div style={tx(th, lab, th.text.secondary, undefined, { whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" })}>{plural(num(it.value), "use", "uses")}</div>
              </div>
              <div style={{ height: 8, borderRadius: th.radius.full, background: th.fill.secondary, overflow: "hidden" }}>
                <div style={{ width: Math.max(0.015, num(it.value) / top) * 100 + "%", height: "100%", borderRadius: th.radius.full, background: acc(th), transformOrigin: "left center", transform: "scaleX(" + (still ? 1 : ease((t - 0.15 - i * 0.06) / 0.9)) + ")" }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      {more > 0 ? <div style={tx(th, lab, th.text.secondary, undefined, { paddingLeft: 84 })}>{"+" + fmtInt(more) + " more"}</div> : null}
    </div>
  );
}

const CREW_POS = [[120, 140], [350, 130], [580, 145], [120, 380], [350, 390], [580, 375]];
function CrewShapes() {
  const th = useGrokTheme();
  const t = useClock();
  const p = ease(t / 1.2);
  const [pick, setPick] = useState<number>(0);
  const rimUrl = useRimUrl("rim-crew");
  if (crew.length === 0) return null;
  const sel = crew[Math.min(pick, crew.length - 1)];
  const maxT = Math.max(1, crew[0].msgs);
  const cap = tx(th, th.font.caption.fontSize, th.text.tertiary);
  return (
    <Fragment>
      <div style={col(2)}>
        <div style={tx(th, th.font.body1.fontSize, th.text.primary, th.weight.semibold)}>{"#" + (pick + 1) + " " + sel.name}</div>
        <div style={tx(th, th.font.label.fontSize, th.text.secondary)}>{(sel.does ? sel.does + ". " : "") + msgs(sel.msgs) + ", " + Math.round((sel.msgs / Math.max(1, TOTAL_MSGS)) * 100) + "% of all"}</div>
      </div>
      <svg width="100%" viewBox={view(W, crew.length > 3 ? 540 : 300)} role="img" aria-label={POSS + " most-messaged bots, each drawn as its avatar and sized by messages"}>
        <RimDef id="rim-crew" r={2} />
        {crew.slice(0, 6).map((b, i: number) => {
          const grow = ease(p * 1.6 - i * 0.12);
          const r = Math.max(0.01, (26 + 50 * Math.sqrt(b.msgs / maxT)) * grow);
          const on = i === pick;
          const [x, y] = CREW_POS[i];
          const sz = r * 2.4 * (on ? 1.06 : 1);
          return (
            <g key={b.key} onPointerEnter={() => setPick(i)} onClick={() => setPick(i)} style={{ cursor: "pointer" }}>
              <ellipse cx={x} cy={y + r + 6} rx={r * (on ? 0.55 : 0.7)} ry={5} fill={th.border.weak} />
              <g style={{ transform: "translateY(" + (on ? -14 : 0) + "px)", transition: "transform 260ms " + th.motion.easing }}>
                <g transform={"translate(" + x + " " + (y + Math.sin(t * 1.6 + i * 1.3) * 5) + ")"}>
                  <image href={b.av} x={-sz / 2} y={-sz / 2} width={sz} height={sz} filter={rimUrl} />
                </g>
              </g>
              <text x={x} y={y + r + 28} textAnchor="middle" fill={on ? th.text.primary : th.text.secondary} style={tx(th, th.font.label.fontSize, on ? th.text.primary : th.text.secondary, on ? th.weight.semibold : th.weight.regular)}>
                {b.name}
              </text>
              <text x={x} y={y + r + 45} textAnchor="middle" fill={th.text.tertiary} style={cap}>
                {b.does}
              </text>
              <text x={x} y={y + r + 62} textAnchor="middle" fill={th.text.tertiary} style={cap}>
                {fmtInt(b.msgs * grow) + " messages"}
              </text>
            </g>
          );
        })}
      </svg>
    </Fragment>
  );
}

// Beyond the chat: three looping scenes. Every element is always drawn; only opacity, size or position changes.

const VW = 300;
const VH = 150;
const scene = (label: string) => ({ width: "100%", height: "100%", viewBox: view(VW, VH), preserveAspectRatio: "xMidYMid meet", role: "img", "aria-label": label });
const three = [0, 1, 2];
const DESK_ICONS = [[26, 40], [26, 72], [26, 104]];
const PC_CYCLE = 5.2;
function ComputerViz(props: { t: number }) {
  const th = useGrokTheme();
  const c = th.dataviz.categorical;
  const n = Math.floor(props.t / PC_CYCLE);
  const ph = (props.t % PC_CYCLE) / PC_CYCLE;
  const [ix, iy] = DESK_ICONS[n % 3] ?? DESK_ICONS[0];
  const m1 = smooth(ph, 0.04, 0.2);
  const m2 = smooth(ph, 0.44, 0.58);
  const m3 = smooth(ph, 0.8, 0.96);
  const cx = 250 + (ix - 250) * m1 + (226 - ix) * m2 + (250 - 226) * m3;
  const cy = 120 + (iy - 120) * m1 + (110 - iy) * m2 + (120 - 110) * m3;
  const hl = smooth(ph, 0.2, 0.24) * (1 - smooth(ph, 0.34, 0.42));
  const open = smooth(ph, 0.24, 0.36) * (1 - smooth(ph, 0.84, 0.94));
  const done = smooth(ph, 0.6, 0.66);
  const a = c[n % 3] ?? acc(th);
  return (
    <svg {...scene("A cursor driving a desktop: opening an app, filling a field, pressing a button")}>
      <rect x={4} y={4} width={VW - 8} height={VH - 8} rx={12} fill={th.fill.secondary} stroke={th.border.default} />
      <rect x={4} y={4} width={VW - 8} height={16} rx={8} fill={th.border.subtle} />
      {three.map((i: number) => <circle key={i} cx={16 + i * 9} cy={12} r={2.5} fill={th.border.strong} />)}
      {DESK_ICONS.map(([x, y]: number[], i: number) => (
        <g key={i}>
          <rect x={x - 11} y={y - 11} width={22} height={22} rx={6} fill={th.bg.base} stroke={th.border.default} />
          <rect x={x - 11} y={y - 11} width={22} height={22} rx={6} fill={a} opacity={i === n % 3 ? hl : 0} />
          <rect x={x - 9} y={y + 14} width={18} height={3} rx={1.5} fill={th.border.default} />
        </g>
      ))}
      <g opacity={open} transform={"translate(170 78) scale(" + (0.92 + 0.08 * open).toFixed(4) + ") translate(-100 -52)"}>
        <rect x={0} y={0} width={200} height={104} rx={10} fill={th.bg.base} stroke={th.border.strong} />
        <rect x={0} y={0} width={200} height={18} rx={9} fill={a} opacity={0.9} />
        <rect x={14} y={30} width={Math.max(0.01, 110 * smooth(ph, 0.34, 0.46))} height={6} rx={3} fill={th.text.tertiary} />
        <rect x={14} y={44} width={150} height={20} rx={6} fill={th.fill.secondary} stroke={th.border.default} />
        <rect x={20} y={51} width={Math.max(0.01, 100 * smooth(ph, 0.38, 0.54))} height={6} rx={3} fill={th.text.secondary} />
        <rect x={132} y={76} width={60} height={20} rx={10} fill={th.border.default} />
        <rect x={132} y={76} width={60} height={20} rx={10} fill={a} opacity={done} />
        <path d="M156 86 l4 4 l8 -8" fill="none" stroke={th.bg.base} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" opacity={done} />
      </g>
      <g transform={"translate(" + (cx - 2).toFixed(2) + " " + (cy - 2).toFixed(2) + ")"}>
        <path d="M0 0 L0 20 L5.5 14.5 L9.5 23.5 L13 22 L9 13 L16 13 Z" fill={th.text.primary} stroke={th.bg.base} strokeWidth={1.5} />
      </g>
    </svg>
  );
}

const WEB_CYCLE = 4.2;
const URL_W = [96, 132, 74];
const WEB_BLOCKS = [[16, 54, 268, 34], [16, 96, 84, 40], [108, 96, 84, 40], [200, 96, 84, 40]];
function BrowserViz(props: { t: number }) {
  const th = useGrokTheme();
  const c = th.dataviz.categorical;
  const c0 = acc(th);
  const n = Math.floor(props.t / WEB_CYCLE);
  const ph = (props.t % WEB_CYCLE) / WEB_CYCLE;
  const tab = n % 3;
  const prev = (n + 2) % 3;
  const swap = smooth(ph, 0, 0.08);
  const show = smooth(ph, 0.3, 0.5) * (1 - smooth(ph, 0.86, 0.98));
  const pw = URL_W[prev] ?? 96;
  return (
    <svg {...scene("A browser loading page after page")}>
      <rect x={4} y={4} width={VW - 8} height={VH - 8} rx={12} fill={th.bg.base} stroke={th.border.default} />
      {three.map((i: number) => (
        <g key={i}>
          <rect x={12 + i * 70} y={10} width={64} height={14} rx={5} fill={th.bg.base} stroke={th.border.subtle} />
          <rect x={12 + i * 70} y={10} width={64} height={14} rx={5} fill={th.fill.secondary} opacity={i === tab ? swap : i === prev ? 1 - swap : 0} />
        </g>
      ))}
      <rect x={12} y={28} width={VW - 24} height={16} rx={8} fill={th.fill.secondary} />
      <rect x={22} y={34} width={pw + ((URL_W[tab] ?? 96) - pw) * swap} height={4} rx={2} fill={th.text.tertiary} opacity={0.6} />
      <rect x={12} y={44} width={Math.max(0.01, (VW - 24) * smooth(ph, 0.04, 0.34))} height={2} rx={1} fill={c0} opacity={smooth(ph, 0.02, 0.06) * (1 - smooth(ph, 0.36, 0.44))} />
      {WEB_BLOCKS.map(([x, y, w, h]: number[], i: number) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx={8} fill={i === 0 ? c[tab] ?? c0 : th.fill.secondary} opacity={(i === 0 ? 0.8 : 1) * show * smooth(ph, 0.3 + i * 0.04, 0.46 + i * 0.04)} />
      ))}
    </svg>
  );
}

const TASK_LINES = [150, 108, 132, 86];
const TASK_CYCLE = 7.2;
function TasksViz(props: { t: number }) {
  const th = useGrokTheme();
  const c0 = acc(th);
  const ph = (props.t % TASK_CYCLE) / TASK_CYCLE;
  const clear = 1 - smooth(ph, 0.86, 0.97);
  const ticks = TASK_LINES.map((_: number, i: number) => smooth(ph, 0.06 + i * 0.17, 0.16 + i * 0.17) * clear);
  const doneCount = ticks.reduce((a: number, k: number) => a + k, 0);
  return (
    <svg {...scene("A checklist ticking off one task after another")}>
      <rect x={4} y={4} width={VW - 8} height={VH - 8} rx={12} fill={th.bg.base} stroke={th.border.default} />
      <rect x={16} y={16} width={VW - 32} height={6} rx={3} fill={th.fill.secondary} />
      <rect x={16} y={16} width={Math.max(0.01, ((VW - 32) * doneCount) / TASK_LINES.length)} height={6} rx={3} fill={c0} opacity={0.7} />
      {TASK_LINES.map((w: number, i: number) => {
        const y = 46 + i * 26;
        const k = ticks[i] ?? 0;
        return (
          <g key={i}>
            <circle cx={26} cy={y} r={8} fill={th.bg.base} stroke={th.border.strong} strokeWidth={1.5} />
            <circle cx={26} cy={y} r={8.75} fill={c0} opacity={k} />
            <path d={"M22 " + y + " l3 3 l6 -6"} fill="none" stroke={th.bg.base} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={14} strokeDashoffset={(14 * (1 - k)).toFixed(2)} opacity={Math.min(1, k * 3)} />
            <rect x={44} y={y - 3} width={w} height={6} rx={3} fill={th.text.secondary} opacity={0.9 - 0.5 * k} />
          </g>
        );
      })}
    </svg>
  );
}

const STILL_T: { [k: string]: number } = { computer: PC_CYCLE * 0.72, browser: WEB_CYCLE * 0.7, tasks: TASK_CYCLE * 0.8 };
type BeyondTile = { n: number; label: string; sub: string; kind: string };
const BEYOND: BeyondTile[] = [
  { n: num(DATA.beyond?.computerUse), label: "Times a bot used its own computer", sub: "Clicking and typing in apps for you", kind: "computer" },
  { n: num(DATA.beyond?.browserPages), label: "Web pages your bots read for you", sub: "Opened and read so you didn't have to", kind: "browser" },
  { n: num(DATA.beyond?.tasks), label: "Tasks your bots ran on their own computer", sub: "Quiet work behind the scenes", kind: "tasks" },
].filter((b: BeyondTile) => b.n > 0);

function BeyondTiles() {
  const th = useGrokTheme();
  const still = useStill();
  const t = useClock();
  const L = BEYOND.length;
  return (
    <div style={{ width: "100%", aspectRatio: L >= 3 ? "1 / 1" : L === 2 ? "3 / 2" : "3 / 1", display: "grid", gridTemplateRows: "repeat(" + Math.max(1, L) + ", minmax(0, 1fr))", gap: 12 }}>
      {BEYOND.map((tl: BeyondTile, i: number) => {
        const lt = Math.max(0, t - i * 0.15);
        const vt = still ? STILL_T[tl.kind] ?? 0 : lt;
        return (
          <div key={tl.kind} style={box(th, { borderRadius: th.radius.xl, display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 3fr)", alignItems: "center", gap: 16, minHeight: 0, overflow: "hidden", opacity: still ? 1 : ease(lt / 0.6) })}>
            <div style={col(4, { minWidth: 0, paddingLeft: 8 })}>
              <div style={metric(th)}>{fmtInt(tl.n * (still ? 1 : ease(lt / 1.6)))}</div>
              <div style={tx(th, th.font.body1.fontSize, th.text.primary, th.weight.semibold)}>{tl.label}</div>
              <div style={tx(th, th.font.label.fontSize, th.text.tertiary)}>{tl.sub}</div>
            </div>
            <div style={{ position: "relative", height: "100%", minHeight: 0 }}>
              <div style={{ position: "absolute", inset: 0 }}>{tl.kind === "computer" ? <ComputerViz t={vt} /> : tl.kind === "browser" ? <BrowserViz t={vt} /> : <TasksViz t={vt} />}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const BUILD_UP: string[] = ([[num(T.bots), "bot", "bots"], [CONNECTOR_COUNT, "app", "apps"], [num(T.routines), "routine", "routines"]] as [number, string, string][])
  .filter((q: [number, string, string]) => q[0] > 0)
  .map((q: [number, string, string]) => plural(q[0], q[1], q[2]) + ".");
const BUILD = BUILD_UP.length > 0 ? BUILD_UP : [msgs(TOTAL_MSGS) + "."];
const REVEAL_AT = 0.5 + BUILD.length * 0.55 + 0.9;
const REVEAL_DONE = REVEAL_AT + 3.2;

function Reveal() {
  const th = useGrokTheme();
  const still = useStill();
  const rim = useRim();
  const clock = useClock(REVEAL_DONE);
  const t = still ? REVEAL_DONE : clock;
  const botIn = popIn((t - REVEAL_AT) / 0.8);
  const settle = clamp01((t - REVEAL_AT - 0.8) / 1.6);
  const sway = still ? 0 : Math.sin((t - REVEAL_AT) * 3) * 4 * (1 - settle) * (botIn > 0 ? 1 : 0);
  const P1 = ARCH.primary;
  const P2 = ARCH.secondary;
  const sec = tx(th, th.font.body1.fontSize, th.text.secondary);
  return (
    <div style={col(8, { alignItems: "center", textAlign: "center", padding: "28px 0 12px" })}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: 14, rowGap: 4, minHeight: 34 }}>
        {BUILD.map((b: string, i: number) => (
          <span key={b} style={tx(th, 26, th.text.primary, th.weight.semibold, { ...rise(t, 0.5 + i * 0.55, 10), lineHeight: "34px", display: "inline-block" })}>{b}</span>
        ))}
      </div>
      <div style={{ ...rise(t, 0.5 + BUILD.length * 0.55, 8), ...sec }}>That makes you...</div>
      <div style={{ ...center, width: 240, height: 240, marginTop: 8 }}>
        <img src={ARCH_AV} alt={"The " + P1.name + " bot: " + lookOf(P1.name).about} width={240} height={240} style={{ display: "block", width: 240, height: 240, opacity: clamp01(botIn * 2), transform: "scale(" + Math.max(0.001, botIn).toFixed(3) + ") rotate(" + sway.toFixed(2) + "deg)", ...rim }} />
      </div>
      <div style={tx(th, 64, th.text.primary, 800, { ...rise(t, REVEAL_AT + 0.35, 12), lineHeight: 1.05, letterSpacing: -2 })}>{P1.name}</div>
      <div style={{ ...rise(t, REVEAL_AT + 0.7, 8), ...sec }}>{P1.reason}</div>
      {P2 ? (
        <div style={{ ...rise(t, REVEAL_AT + 1.4, 6), display: "flex", alignItems: "center", gap: 8, marginTop: 20, padding: "6px 14px 6px 8px", border: "1px solid " + th.border.default, borderRadius: th.radius.full }}>
          <img src={ARCH2_AV} alt={"The " + P2.name + " bot"} width={32} height={32} style={{ display: "block", width: 32, height: 32, ...rim }} />
          <span style={tx(th, th.font.label.fontSize, th.text.secondary)}>
            {"With a side of "}
            <span style={{ fontWeight: th.weight.semibold, color: th.text.primary }}>{P2.name}</span>
            {": " + P2.reason}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function Showcase() {
  const th = useGrokTheme();
  const t = useClock(3);
  const still = useStill();
  const rim = useRim();
  return (
    <div style={{ ...grid(190, 16), alignItems: "stretch" }}>
      {published.map((b: PublishedBot & { av: string }, i: number) => {
        const e = still ? 1 : ease((t - 0.15 - i * 0.18) / 0.7);
        const pop = still ? 1 : ease((t - 0.3 - i * 0.18) / 0.8);
        return (
          <div key={b.name + i} style={box(th, { ...col(10), alignItems: "center", textAlign: "center", padding: "28px 20px 22px", boxSizing: "border-box", borderRadius: th.radius.xl, opacity: e, transform: up(e, 16) })}>
            <div style={{ ...center, width: 120, height: 120, borderRadius: th.radius.full, background: th.fill.secondary, marginBottom: 6 }}>
              <img src={b.av} alt={b.name + " avatar"} width={104} height={104} style={{ display: "block", width: 104, height: 104, transform: "scale(" + (0.8 + 0.2 * pop) + ")", ...rim }} />
            </div>
            <div style={h3(th)}>{b.name}</div>
            {b.tag ? <div style={tx(th, th.font.body2.fontSize, th.text.secondary, undefined, { lineHeight: 1.35 })}>{b.tag}</div> : null}
            <div style={{ flex: 1 }} />
            <div style={tx(th, th.font.caption.fontSize, th.text.tertiary)}>{"Shipped " + b.date}</div>
            <a href={b.url} target="_blank" rel="noopener noreferrer" style={tx(th, th.font.label.fontSize, th.text.primary, th.weight.semibold, { textDecoration: "none", border: "1px solid " + th.border.strong, borderRadius: th.radius.full, padding: "6px 16px" })}>Install</a>
          </div>
        );
      })}
    </div>
  );
}

const CARD = 1080;
const POSTER_AVS = [[132, 128, 116, -12], [952, 132, 104, 14], [118, 954, 104, 10], [964, 950, 116, -8]].slice(0, crew.length).map(([x, y, s, r]: number[], i: number) => ({ x, y, s, r, k: crew[i].key, href: crew[i].av }));
const POSTER_BLOBS: [string, number, number, number, number, number, number][] = [
  [SHAPES.blob, 600, -190, 4.4, 18, 0, 0.09],
  [SHAPES.pebble, -300, 560, 3.6, -24, 1, 0.08],
  [SHAPES.squircle, 250, 260, 3.4, 34, 2, 0.05],
];
const STAT_PICKS = ([[num(T.bots), "Bots"], [CONNECTOR_COUNT, "Connectors"], [num(T.routines), "Routines"], [num(T.streak), "Day streak"]] as [number, string][]).filter((q: [number, string]) => q[0] > 0).slice(0, 4);
const STAT_X = [[], [540], [360, 720], [220, 540, 860], [150, 410, 670, 930]][STAT_PICKS.length];
const POSTER_STATS = STAT_PICKS.map(([v, l]: [number, string], i: number) => ({ v, l, x: STAT_X[i], y: 810 }));
const POSTER_LABEL = POSS + " Grok Bot card: " + [ARCH.primary.name, ARCH.primary.reason].concat(POSTER_STATS.map((q: { v: number; l: string }) => fmtInt(q.v) + " " + q.l.toLowerCase())).join(", ");
const ARCH_FS = Math.min(108, Math.round(1300 / Math.max(1, ARCH.primary.name.length)));
const ARCH_S = 330;
const ARCH_TF = "translate(540 480)";
const POSTER_DONE = 3.4;

function Poster(props: { svgRef: { current: SVGSVGElement | null }; png: string; pngLook: string; onPng: (url: string, look: string) => void }) {
  const th = useGrokTheme();
  const t = useClock(POSTER_DONE);
  const done = t >= POSTER_DONE;
  const { svgRef, png, pngLook, onPng } = props;
  const f = th.font.family;
  const dark = th.kind === "dark";
  const paper = th.bg.base;
  const ink = th.text.primary;
  const soft = th.text.secondary;
  const shade = dark ? th.text.onPrimary : th.text.primary;
  const cat = th.dataviz.categorical;
  const rimUrl = useRimUrl("rim-card");
  const look = [th.kind, paper, ink, soft, th.border.strong].concat(cat).join("|");
  const fresh = png !== "" && pngLook === look;
  useEffect(() => {
    const svg = svgRef.current;
    if (!done || fresh || !svg) return;
    let live = true;
    posterToPng(svg)
      .then((b: Blob) => (live ? onPng(URL.createObjectURL(b), look) : undefined))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [done, fresh, look, svgRef, onPng]);
  const hero = popIn((t - 0.1) / 0.6);
  const mk = popIn((t - 1.6) / 0.6);
  const mkTf = "translate(446 1000)";
  const [hover, setHover] = useState<boolean>(false);
  const still = useStill();
  const tint = (pct: number) => "color-mix(in srgb, " + shade + " " + Math.min(100, pct * (dark ? 2.4 : 1)) + "%, transparent)";
  const shadow = hover ? "0 28px 56px -18px " + tint(32) + ", 0 10px 22px -10px " + tint(18) : "0 14px 34px -16px " + tint(24) + ", 0 4px 10px -6px " + tint(12);
  const cb = "cubic-bezier(0.2, 0.8, 0.2, 1)";
  const ft = (size: number, weight: number, x?: CSSProperties): CSSProperties => ({ fontFamily: f, fontSize: size, fontWeight: weight, ...x });
  return (
    <div
      data-card="wrap"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%",
        aspectRatio: "1 / 1",
        margin: "12px auto 0",
        borderRadius: th.radius.xl,
        overflow: "hidden",
        border: "1px solid " + (hover && dark ? th.border.strong : th.border.default),
        background: paper,
        position: "relative",
        boxShadow: shadow,
        transform: hover && !still ? "translateY(-8px) scale(1.02) rotate(-0.8deg)" : "none",
        transition: still ? "box-shadow 200ms ease, border-color 200ms ease" : "transform 360ms " + cb + ", box-shadow 360ms " + cb + ", border-color 360ms " + cb,
        willChange: "transform",
      }}
    >
      <svg ref={props.svgRef} xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox={view(CARD, CARD)} preserveAspectRatio="xMidYMid meet" role="img" aria-label={POSTER_LABEL}>
        <RimDef id="rim-card" r={3} />
        <rect x={0} y={0} width={CARD} height={CARD} fill={paper} />
        {POSTER_BLOBS.map(([d, x, y, s, r, c, o]: [string, number, number, number, number, number, number], i: number) => (
          <path key={"b" + i} d={d} transform={"translate(" + x + " " + y + ") rotate(" + r + " 84 84) scale(" + s + ")"} fill={cat[c] ?? ink} opacity={o * (dark ? 1.6 : 1)} />
        ))}
        <g opacity={hero} data-o={1}>
          <text x={540} y={122} textAnchor="middle" fill={soft} style={ft(40, th.weight.semibold)}>{TITLE}</text>
          <text x={540} y={226} textAnchor="middle" fill={ink} style={ft(ARCH_FS, 800, { letterSpacing: -3 })}>{ARCH.primary.name}</text>
          <text x={540} y={288} textAnchor="middle" fill={soft} style={ft(36, th.weight.medium)}>{ARCH.primary.reason}</text>
        </g>
        {POSTER_STATS.map((s: { v: number; l: string; x: number; y: number }, i: number) => {
          const start = 0.5 + i * 0.22;
          const n = done ? s.v : Math.round(s.v * clamp01((t - start) / 1.1));
          const fin = "translate(" + s.x + " " + s.y + ")";
          return (
            <g key={s.l} data-tf={fin} transform={fin + " scale(" + popIn((t - start) / 0.7) + ")"}>
              <text x={0} y={0} textAnchor="middle" fill={ink} style={ft(130, 800, { letterSpacing: -4 })}>{String(n)}</text>
              <text x={0} y={54} textAnchor="middle" fill={soft} style={ft(36, th.weight.semibold)}>{s.l}</text>
            </g>
          );
        })}
        {POSTER_AVS.map((a: { k: string; href: string; x: number; y: number; s: number; r: number }, i: number) => {
          if (!a.href) return null;
          const wob = (1 - clamp01((t - 1.2 - i * 0.12) / 1.6)) * Math.sin(t * 6 + i) * 8;
          return (
            <g key={a.k} data-tf={"translate(" + a.x + " " + a.y + ") rotate(" + a.r + ")"} transform={"translate(" + a.x + " " + a.y + ") rotate(" + (a.r + wob) + ") scale(" + popIn((t - 0.8 - i * 0.12) / 0.6) + ")"}>
              <image href={a.href} x={-a.s / 2} y={-a.s / 2} width={a.s} height={a.s} filter={rimUrl} />
            </g>
          );
        })}
        <g data-tf={ARCH_TF} transform={ARCH_TF + " scale(" + popIn((t - 1.2) / 0.7) + ")"}>
          <image href={ARCH_AV} x={-ARCH_S / 2} y={-ARCH_S / 2} width={ARCH_S} height={ARCH_S} filter={rimUrl} />
        </g>
        <g data-tf={mkTf} transform={mkTf + " scale(" + mk + ")"}>
          <image href={AV.grok} x={-44} y={-44} width={88} height={88} filter={rimUrl} />
        </g>
        <text x={500} y={1016} fill={ink} opacity={mk > 0 ? 1 : 0} data-o={1} style={ft(46, th.weight.semibold, { letterSpacing: -0.5 })}>Grok Bot</text>
      </svg>
      {fresh ? <img src={png} alt={TITLE + " card, 1080 by 1080 PNG"} data-overlay="card-png" style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", display: "block", margin: 0, padding: 0, border: "none", opacity: 0 }} /> : null}
    </div>
  );
}

function PosterHint() {
  const th = useGrokTheme();
  const t = useClock(1.6);
  const still = useStill();
  const k = still ? 0 : Math.sin(Math.PI * clamp01((t - 0.7) / 0.6));
  const ink = th.text.primary;
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
      <div style={tx(th, th.font.body1.fontSize, ink, th.weight.semibold, { display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 18px", borderRadius: th.radius.full, background: th.fill.secondary, border: "1px solid " + th.border.subtle, transform: "translateY(" + (-6 * k).toFixed(2) + "px)" })}>
        <svg width={20} height={22} viewBox="0 0 20 22" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
          <rect x={3.5} y={1.5} width={13} height={19} rx={6.5} fill="none" stroke={ink} strokeWidth={1.6} />
          <path d="M10 2.3 A5.7 5.7 0 0 1 15.7 8 V9 H10 Z" fill={ink} />
          <line x1={10} y1={1.5} x2={10} y2={9} stroke={ink} strokeWidth={1.6} />
          <line x1={3.5} y1={9} x2={16.5} y2={9} stroke={ink} strokeWidth={1.6} />
        </svg>
        <span>Right click on the card to download &amp; copy</span>
      </div>
    </div>
  );
}

const EXPORT_PX = 1080;
function posterToPng(svg: SVGSVGElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    try {
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("width", String(EXPORT_PX));
      clone.setAttribute("height", String(EXPORT_PX));
      const dst = Array.from(clone.querySelectorAll("*"));
      Array.from(svg.querySelectorAll("*")).map((el: Element, i: number) => {
        const out = dst[i];
        if (!out) return el;
        const cs = window.getComputedStyle(el);
        ["fill", "stroke", "flood-color"].map((p: string) => {
          const v = cs.getPropertyValue(p);
          if (el.hasAttribute(p) && v) (out as SVGElement).style.setProperty(p, v);
          return p;
        });
        return el;
      });
      const xml = new XMLSerializer().serializeToString(clone);
      const img = document.createElement("img");
      img.onload = () => {
        try {
          const cv = document.createElement("canvas");
          cv.width = EXPORT_PX;
          cv.height = EXPORT_PX;
          const ctx = cv.getContext("2d");
          if (!ctx) {
            reject(new Error("no canvas"));
            return;
          }
          ctx.drawImage(img, 0, 0, EXPORT_PX, EXPORT_PX);
          cv.toBlob((b: Blob | null) => (b ? resolve(b) : reject(new Error("no blob"))), "image/png");
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error("svg did not load"));
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
    } catch (err) {
      reject(err);
    }
  });
}

export default function App() {
  const [step, setStep] = useState<number>(0);
  const posterRef = useRef<SVGSVGElement | null>(null);
  const [card, setCard] = useState<{ url: string; look: string }>({ url: "", look: "" });
  const cardPng = card.url;
  useEffect(() => () => (cardPng ? URL.revokeObjectURL(cardPng) : undefined), [cardPng]);
  const onCardPng = useCallback((url: string, look: string) => setCard({ url, look }), []);
  const last = STEPS.length - 1;
  const cur = Math.max(0, Math.min(last, step));
  const key = STEPS[cur][0];
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A") return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setStep((s: number) => Math.min(last, s + 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setStep((s: number) => Math.max(0, s - 1));
      } else if (e.key === "Home") setStep(0);
      else if (e.key === "End") setStep(last);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last]);
  return (
    <Page title={TITLE} width="column">
      <Section
        id="profile"
        heading={STEPS[cur][1]}
        actions={
          <Fragment>
            <Button label="Back" onClick={() => setStep(Math.max(0, cur - 1))} disabled={cur === 0} />
            {cur < last ? <Button label="Next" variant="primary" onClick={() => setStep(cur + 1)} /> : <Button label="Start over" onClick={() => setStep(0)} />}
          </Fragment>
        }
      >
        <Progress step={cur} total={STEPS.length} />
        {key === "cover" && <Cover onStart={() => setStep(1)} />}
        {key === "when" && <WhenWorks />}
        {key === "crew" && <CrewShapes />}
        {key === "toolkit" && <Toolkit />}
        {key === "beyond" && <BeyondTiles />}
        {key === "arch" && <Reveal />}
        {key === "shipped" && <Showcase />}
        {key === "share" && (
          <Fragment>
            <Poster svgRef={posterRef} png={cardPng} pngLook={card.look} onPng={onCardPng} />
            <PosterHint />
          </Fragment>
        )}
      </Section>
    </Page>
  );
}
