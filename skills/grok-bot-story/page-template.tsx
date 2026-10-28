import {
  Page,
  Section,
  Button,
  Fragment,
  useGrokTheme,
  useState,
  useEffect,
  useRef,
  useCallback,
  type CSSProperties,
} from "grok/canvas";


// Grok Bot story Page template (v2). Every user-specific value lives in DATA, which collect.py writes in the shape
// of the Data type below (see data-contract.md). To build a Page: run collect.py --tsx page-template.tsx, which
// replaces the DATA block between the markers, then WriteCanvas the result. Nothing below DATA should need editing.
// The shipped template carries an empty DATA block, so it renders a placeholder story until it is filled.

type ZoneData = {
  name: string;
  hourly: number[];
  daily: number[];
  peakHour: number;
  bestDay: { label: string; count: number };
  bestWeekday: { label: string; count: number };
  bestWeek: { label: string; count: number };
};
type CrewBot = { key: string; name: string; does: string; msgs: number; shape: string; color: string };
type IconBar = { name: string; icon: string; mono: string; value: number };
type PublishedBot = { name: string; tag: string; url: string; date: string; shape: string; color: string };
type Data = {
  version?: number;
  generatedAt?: string;
  user: { name: string };
  timezone: { id: string; label: string };
  window: { start: string; end: string; days: number; label: string } | null;
  // Hour, day and week stats in the user's current timezone. null when there are no messages yet.
  zone: ZoneData | null;
  totals: {
    messages: number;
    bots: number;
    activeDays: number;
    streak: number;
    skills: number;
    pages: number | null;
    routines: number;
    routinesSetUp?: number;
    connectors: number;
    appConnectedCount?: number | null;
  };
  crew: CrewBot[];
  connectors: IconBar[];
  beyond: { computerUse: number; browserPages: number; tasks: number };
  published: PublishedBot[];
  // Busiest day in the user's timezone and the bots that got most of its messages (store.db, counts only).
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

const T = DATA.totals;
const NAME = (DATA.user.name || "").trim() || "You";
const IS_YOU = NAME === "You";
const TITLE = NAME + " on Grok Bot";
const POSS = IS_YOU ? "Your" : NAME + "'s";
const WINDOW = DATA.window ? DATA.window.label : "";
const ZONES: ZoneData[] = DATA.zone ? [DATA.zone] : [];
const TOTAL_MSGS = num(T.messages);
const plural = (n: number, one: string, many: string) => fmtInt(n) + " " + (n === 1 ? one : many);

const W = 700;
const H = 340;
// Bot avatars traced from the Grok Bot app's avatar picker (only the shapes this Page uses, including the archetype bots): one body and one pair
// of white eyes per shape at 168 by 168, filled with the picker's swatch colors. Colors appear only inside these data:image SVG strings.
const AV_HEAD = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 168 168'%3E";
const SHAPES: { [k: string]: string } = {
  circle: "M75 149C69 149 64 147 58 145C53 142 48 139 44 136C39 133 35 129 31 124C28 119 25 114 23 109C21 104 19 98 19 92C18 87 18 81 19 75C19 69 21 64 23 58C26 53 29 48 32 44C35 39 39 35 44 31C49 28 54 25 59 23C64 21 70 19 76 19C81 18 87 18 93 19C99 19 104 21 110 23C115 26 120 29 124 32C129 35 133 39 137 44C140 49 143 54 145 59C147 64 149 70 149 76C150 81 150 87 149 93C149 99 147 104 145 110C142 115 139 120 136 124C133 129 129 133 124 137C119 140 114 143 109 145C104 147 98 149 92 149C87 150 81 150 75 149Z",
  blob: "M47 145C42 144 36 142 31 139C26 136 22 131 19 126C17 121 15 115 15 109C14 104 17 98 17 92C18 87 16 81 16 75C16 69 17 63 19 58C21 53 24 47 28 43C31 39 36 35 42 32C47 30 53 28 58 27C64 26 70 28 76 28C81 27 87 25 93 25C98 25 104 26 109 28C114 31 118 36 123 40C127 43 131 48 135 52C139 56 144 59 147 64C150 69 153 75 153 80C154 86 153 92 151 97C149 103 146 108 142 112C138 116 133 119 128 123C124 126 119 129 114 132C109 135 104 139 99 141C93 143 87 144 82 144C76 144 70 142 64 143C59 143 53 145 47 145Z",
  squircle: "M60 148C55 147 51 141 48 136C45 132 43 126 40 120C38 115 35 110 33 104C30 99 28 94 25 88C23 83 19 78 17 72C15 67 12 61 13 56C14 51 19 45 23 42C28 39 34 37 40 36C45 34 51 32 57 31C62 29 68 28 74 26C80 24 85 22 91 21C97 20 103 18 108 20C113 21 117 27 120 32C123 36 125 42 128 48C130 53 133 58 135 64C138 69 140 74 143 80C145 85 149 90 151 96C153 101 156 107 155 112C154 117 149 123 145 126C140 129 134 131 128 132C123 134 117 136 111 137C106 139 100 140 94 142C88 144 83 146 77 147C71 148 65 150 60 148Z",
  pebble: "M96 146C91 146 85 143 80 140C75 138 70 135 65 133C60 130 55 128 50 125C45 122 39 120 35 117C30 113 26 109 24 104C21 99 18 94 17 88C16 83 16 77 17 71C18 66 21 60 24 56C27 51 31 47 36 44C40 41 46 38 51 37C57 35 62 35 68 34C73 33 78 32 83 30C89 28 94 24 99 23C105 22 111 23 116 24C121 25 127 27 132 30C137 33 141 37 144 41C148 45 151 51 152 56C153 61 154 67 153 73C152 78 150 84 148 89C146 94 143 100 141 105C139 110 137 116 135 121C133 126 130 131 126 135C123 139 118 143 113 145C108 147 101 147 96 146Z",
  cloud: "M72 148C67 147 61 145 56 142C51 139 47 135 44 130C40 125 39 119 37 114C35 109 34 104 31 99C29 94 23 90 21 85C18 80 16 74 16 69C16 63 18 57 21 52C23 47 28 42 32 39C36 35 42 33 47 31C53 30 59 32 64 31C70 29 74 25 79 23C84 21 90 20 96 20C101 21 107 23 112 26C117 29 121 33 124 38C128 43 129 49 131 54C133 59 134 64 137 69C139 74 144 78 147 83C150 88 152 94 152 99C152 105 150 111 147 116C145 121 140 126 136 129C132 133 126 135 121 137C115 138 109 136 104 137C98 139 94 143 89 145C84 147 78 148 72 148Z",
  flower: "M96 152C90 151 85 146 79 144C74 142 69 142 64 141C59 140 52 141 47 138C42 135 37 130 35 124C32 119 34 112 32 107C30 102 24 99 21 95C18 90 14 84 14 78C14 72 16 66 19 61C22 56 28 52 32 47C36 43 38 37 42 32C46 28 50 22 55 20C60 17 67 15 72 16C78 17 83 22 89 24C94 26 99 26 104 27C109 28 116 27 121 30C126 33 131 38 133 44C136 49 134 56 136 61C138 66 144 69 147 73C150 78 154 84 154 90C154 96 152 102 149 107C146 112 140 116 136 121C132 125 130 131 126 136C122 140 118 146 113 148C108 151 101 153 96 152Z",
  star: "M89 163C84 163 77 158 72 154C68 150 65 143 61 138C57 132 55 126 50 122C45 118 37 118 31 116C25 113 18 110 14 106C10 101 5 95 5 89C5 84 10 77 13 72C17 67 23 62 28 58C33 54 39 51 42 46C46 41 46 33 49 28C52 22 56 16 61 12C66 8 73 4 78 5C84 5 91 10 95 14C100 18 103 25 107 30C111 36 113 42 118 46C123 50 131 50 137 52C143 55 149 58 154 62C158 66 163 73 163 79C163 84 158 91 155 96C151 101 145 105 140 110C135 114 129 117 126 122C122 127 122 135 119 140C116 146 112 152 107 156C102 160 95 164 89 163Z",
  tablet: "M54 140C48 139 43 137 38 134C33 132 28 128 24 124C21 120 17 115 15 110C13 104 12 99 12 93C11 87 12 82 13 76C15 71 18 66 21 61C24 56 28 52 33 49C37 46 43 44 48 42C53 40 59 39 64 37C70 35 75 34 81 32C86 31 92 29 97 28C103 28 109 27 114 28C120 29 125 31 130 34C135 36 140 40 144 44C147 48 151 53 153 58C155 64 156 69 156 75C157 81 156 86 155 92C153 97 150 102 147 107C144 112 140 116 135 119C131 122 125 124 120 126C115 128 109 129 104 131C98 133 93 134 87 136C82 137 76 139 71 140C65 140 59 141 54 140Z",
  house: "M52 152C48 150 44 145 40 140C37 135 35 130 32 124C30 119 27 114 24 109C22 103 19 98 17 93C16 87 15 81 16 75C16 70 20 65 23 59C25 54 28 49 31 44C34 39 37 33 40 29C44 25 49 20 54 19C59 17 65 19 71 20C76 21 82 24 87 26C93 29 98 30 104 33C109 35 114 38 119 41C123 45 126 50 129 55C132 60 135 66 137 71C140 76 142 82 145 87C147 92 151 97 152 103C153 108 152 114 150 119C147 124 142 128 137 130C132 133 126 134 120 136C115 138 109 139 103 141C98 142 92 144 86 145C81 147 75 149 69 150C64 151 57 153 52 152Z",
  hex: "M97 150C91 150 86 147 80 146C74 145 69 143 63 142C58 140 52 139 47 136C43 133 39 128 36 123C33 119 31 113 28 108C25 103 23 98 21 92C18 87 15 81 15 76C15 71 19 65 21 61C24 56 28 51 32 47C36 42 39 38 43 33C47 29 50 24 55 21C60 19 65 18 71 18C77 18 82 21 88 22C94 23 99 25 105 26C110 28 116 29 121 32C125 35 129 40 132 45C135 49 137 55 140 60C143 65 145 70 147 76C150 81 153 87 153 92C153 97 149 103 147 107C144 112 140 117 136 121C132 126 129 130 125 135C121 139 118 144 113 147C108 149 103 150 97 150Z",
  teardrop: "M79 154C74 153 68 152 63 150C57 148 52 145 48 141C43 138 39 134 36 129C32 125 29 120 27 114C25 109 24 103 23 98C23 92 23 86 24 81C25 75 27 70 28 64C30 58 31 53 33 47C34 42 35 36 38 31C40 26 44 21 48 18C53 16 60 16 65 17C70 18 76 21 81 23C86 25 92 28 97 30C102 32 108 34 113 37C118 40 122 43 127 46C131 50 135 55 138 60C141 64 143 70 144 75C146 81 147 87 147 92C147 98 146 104 144 109C143 115 141 120 138 125C135 130 131 134 127 138C122 142 117 145 112 148C107 150 102 152 96 153C91 154 85 154 79 154Z",
};
const SHAPE_EYES: { [k: string]: string } = {
  circle: "M93.6 77.8C92 77.2 90.4 75.7 89.2 74.4C88 73.1 87.2 71.3 86.2 69.8C85.2 68.3 84.1 66.8 83 65.2C81.9 63.6 80.6 62 79.6 60.4C78.6 58.8 77.3 57.3 77 55.6C76.7 53.9 76.9 51.8 77.8 50.4C78.7 49 80.6 47.7 82.2 47.2C83.8 46.7 85.9 46.7 87.6 47.2C89.3 47.7 90.8 49 92.2 50.2C93.6 51.4 94.6 53.1 95.8 54.6C97 56.1 98.2 57.6 99.2 59.2C100.2 60.8 101.2 62.3 102 64C102.8 65.7 103.8 67.4 104 69.2C104.2 71 103.8 73.1 103 74.6C102.2 76.1 100.6 77.5 99 78C97.4 78.5 95.2 78.4 93.6 77.8ZM127.8 62.6C126.4 62.3 125 61 123.8 59.8C122.6 58.6 121.7 57 120.8 55.6C119.9 54.2 119.3 52.6 118.4 51.2C117.5 49.8 116.4 48.4 115.4 47C114.4 45.6 113.4 44.2 112.4 42.8C111.4 41.4 110 40 109.6 38.6C109.2 37.2 109.3 35.2 110.2 34.4C111.1 33.6 113.3 33.5 114.8 33.8C116.3 34.1 118 35.2 119.4 36.2C120.8 37.2 121.9 38.5 123 39.8C124.1 41.1 125.2 42.4 126.2 43.8C127.2 45.2 128.1 46.5 129 48C129.9 49.5 130.7 51.1 131.4 52.6C132.1 54.1 133.1 55.7 133.2 57.2C133.3 58.7 132.9 60.9 132 61.8C131.1 62.7 129.2 62.9 127.8 62.6Z",
  blob: "M91.4 83.6C89.9 83.4 88.2 82.3 87 81.2C85.8 80.1 84.9 78.5 84 77C83.1 75.5 82.3 74 81.6 72.4C80.9 70.8 80.3 69.2 79.6 67.6C78.9 66 78 64.6 77.4 63C76.8 61.4 76 59.5 76.2 58C76.4 56.5 77.6 54.8 78.8 54C80 53.2 81.9 52.8 83.4 53C84.9 53.2 86.8 54.3 88 55.4C89.2 56.5 89.9 58.1 90.8 59.6C91.7 61.1 92.4 62.7 93.2 64.2C94 65.7 94.7 67.2 95.4 68.8C96.1 70.4 97.1 72 97.6 73.6C98.1 75.2 98.9 76.9 98.6 78.4C98.3 79.9 97.2 81.7 96 82.6C94.8 83.5 92.9 83.8 91.4 83.6ZM120.8 75.2C119.3 75 117.8 74 116.6 73C115.4 72 114.5 70.4 113.6 69C112.7 67.6 112 66.1 111.2 64.6C110.4 63.1 109.7 61.5 109 60C108.3 58.5 107.3 57.2 106.8 55.6C106.3 54 105.7 52.1 105.8 50.6C105.9 49.1 106.5 47.5 107.6 46.6C108.7 45.7 110.7 45.2 112.2 45.4C113.7 45.6 115.2 46.7 116.4 47.8C117.6 48.9 118.4 50.4 119.2 51.8C120 53.2 120.7 54.9 121.4 56.4C122.1 57.9 122.9 59.5 123.6 61C124.3 62.5 125.2 63.9 125.8 65.4C126.4 66.9 127.5 68.5 127.4 70C127.3 71.5 126.5 73.3 125.4 74.2C124.3 75.1 122.3 75.4 120.8 75.2Z",
  squircle: "M86.2 97.8C84.8 97.5 83.5 96.6 82.4 95.6C81.3 94.6 80.6 93 79.8 91.6C79 90.2 78.3 88.8 77.6 87.4C76.9 86 76.3 84.6 75.6 83.2C74.9 81.8 74.1 80.4 73.6 79C73.1 77.6 72.5 75.9 72.8 74.6C73.1 73.3 74.1 71.7 75.2 71C76.3 70.3 78.2 70.3 79.6 70.6C81 70.9 82.3 71.8 83.4 72.8C84.5 73.8 85.4 75.3 86.2 76.6C87 77.9 87.7 79.4 88.4 80.8C89.1 82.2 90 83.6 90.6 85C91.2 86.4 91.8 87.7 92.2 89.2C92.6 90.7 93.3 92.4 93 93.8C92.7 95.2 91.7 96.7 90.6 97.4C89.5 98.1 87.6 98.1 86.2 97.8ZM110 90.4C108.7 89.8 107.6 88.6 106.6 87.4C105.6 86.2 105 84.8 104.2 83.4C103.4 82 102.7 80.6 102 79.2C101.3 77.8 100.6 76.4 100 75C99.4 73.6 98.5 72.1 98.2 70.6C97.9 69.1 97.6 67.4 98.2 66.2C98.8 65 100.3 64 101.6 63.6C102.9 63.2 104.9 63.3 106.2 63.8C107.5 64.3 108.6 65.6 109.6 66.8C110.6 68 111.3 69.6 112 71C112.7 72.4 113.2 73.8 113.8 75.2C114.4 76.6 115.1 78 115.8 79.4C116.5 80.8 117.5 82.3 117.8 83.8C118.1 85.3 118.2 87 117.6 88.2C117 89.4 115.7 90.8 114.4 91.2C113.1 91.6 111.3 91 110 90.4Z",
  pebble: "M101 88C99.6 87.6 98.2 86.5 97.2 85.4C96.2 84.3 95.5 82.9 94.8 81.6C94.1 80.3 93.4 78.8 92.8 77.4C92.2 76 91.8 74.4 91.2 73C90.6 71.6 89.8 70.3 89.4 68.8C89 67.3 88.6 65.5 89 64.2C89.4 62.9 90.6 61.4 91.8 60.8C93 60.2 94.8 60.2 96.2 60.6C97.6 61 99 62 100 63C101 64 101.7 65.4 102.4 66.8C103.1 68.2 103.6 69.8 104.2 71.2C104.8 72.6 105.2 74 105.8 75.4C106.4 76.8 107.2 78.3 107.6 79.8C108 81.3 108.4 82.9 108 84.2C107.6 85.5 106.6 87.2 105.4 87.8C104.2 88.4 102.4 88.4 101 88ZM129 80C127.7 79.6 126.4 78.5 125.4 77.4C124.4 76.3 123.5 74.9 122.8 73.6C122.1 72.3 121.9 70.8 121.4 69.4C120.9 68 120.2 66.6 119.6 65.2C119 63.8 118.2 62.4 117.8 61C117.4 59.6 116.9 57.9 117.2 56.6C117.5 55.3 118.5 53.8 119.6 53.2C120.7 52.6 122.5 52.8 123.8 53.2C125.1 53.6 126.4 54.5 127.4 55.6C128.4 56.7 129 58.2 129.6 59.6C130.2 61 130.6 62.4 131.2 63.8C131.8 65.2 132.4 66.6 133 68C133.6 69.4 134.2 70.8 134.6 72.2C135 73.6 135.6 75.3 135.4 76.6C135.2 77.9 134.3 79.4 133.2 80C132.1 80.6 130.3 80.4 129 80Z",
  cloud: "M81.6 90C80.3 89.7 78.8 88.8 77.8 87.8C76.8 86.8 76.1 85.5 75.4 84.2C74.7 82.9 74.1 81.6 73.4 80.2C72.7 78.8 72 77.4 71.4 76C70.8 74.6 70.2 73.4 69.8 72C69.4 70.6 68.6 68.9 68.8 67.6C69 66.3 69.9 64.8 71 64.2C72.1 63.6 73.9 63.5 75.2 63.8C76.5 64.1 77.9 64.9 79 65.8C80.1 66.7 80.8 68.1 81.6 69.4C82.4 70.7 83 72 83.6 73.4C84.2 74.8 84.8 76.2 85.4 77.6C86 79 86.8 80.2 87.2 81.6C87.6 83 88.2 84.7 88 86C87.8 87.3 86.9 88.9 85.8 89.6C84.7 90.3 82.9 90.3 81.6 90ZM108.6 82C107.3 81.5 106.2 80.5 105.2 79.4C104.2 78.3 103.5 76.9 102.8 75.6C102.1 74.3 101.5 72.9 100.8 71.6C100.1 70.3 99.5 68.9 98.8 67.6C98.1 66.3 97.2 65 96.8 63.6C96.4 62.2 96.2 60.6 96.6 59.4C97 58.2 98.2 56.9 99.4 56.4C100.6 55.9 102.3 56 103.6 56.4C104.9 56.8 106 57.9 107 59C108 60.1 108.7 61.5 109.4 62.8C110.1 64.1 110.7 65.5 111.4 66.8C112.1 68.1 112.8 69.5 113.4 70.8C114 72.1 114.8 73.4 115.2 74.8C115.6 76.2 116 78 115.6 79.2C115.2 80.4 114 81.7 112.8 82.2C111.6 82.7 109.9 82.5 108.6 82Z",
  flower: "M89.4 96.2C88.1 95.6 87 94.4 86 93.2C85 92 84.4 90.6 83.6 89.2C82.8 87.8 82.1 86.4 81.4 85C80.7 83.6 79.9 82 79.2 80.6C78.5 79.2 77.6 77.9 77.2 76.4C76.8 74.9 76.5 73.1 77 71.8C77.5 70.5 78.9 69.2 80.2 68.8C81.5 68.4 83.4 68.6 84.8 69.2C86.2 69.8 87.4 71.1 88.4 72.2C89.4 73.3 90.2 74.7 91 76C91.8 77.3 92.5 78.8 93.2 80.2C93.9 81.6 94.6 83.1 95.2 84.6C95.8 86.1 96.5 87.5 96.8 89C97.1 90.5 97.7 92.3 97.2 93.6C96.7 94.9 95.3 96.2 94 96.6C92.7 97 90.7 96.8 89.4 96.2ZM114.6 89.6C113.2 89.2 111.9 88.2 110.8 87.2C109.7 86.2 108.6 84.7 107.8 83.4C107 82.1 106.5 80.6 105.8 79.2C105.1 77.8 104.4 76.3 103.8 74.8C103.2 73.3 102.4 71.9 102 70.4C101.6 68.9 101.1 67.1 101.4 65.8C101.7 64.5 102.8 63 104 62.4C105.2 61.8 107.2 61.6 108.6 62C110 62.4 111.2 63.7 112.2 64.8C113.2 65.9 114 67.4 114.8 68.8C115.6 70.2 116.3 71.6 117 73C117.7 74.4 118.2 76 118.8 77.4C119.4 78.8 120.3 80.1 120.8 81.6C121.3 83.1 122.1 84.9 121.8 86.2C121.5 87.5 120.4 89 119.2 89.6C118 90.2 116 90 114.6 89.6Z",
  star: "M84.6 88.4C83.2 87.8 82 86.4 81 85.2C80 84 79.2 82.4 78.4 81C77.6 79.6 76.9 78.1 76.2 76.6C75.5 75.1 74.7 73.7 74 72.2C73.3 70.7 72.4 69.1 72 67.6C71.6 66.1 71.1 64.3 71.6 63C72.1 61.7 73.5 60.3 74.8 59.8C76.1 59.3 78 59.6 79.4 60.2C80.8 60.8 82.1 62 83.2 63.2C84.3 64.4 85 66 85.8 67.4C86.6 68.8 87.3 70.3 88 71.8C88.7 73.3 89.5 74.7 90.2 76.2C90.9 77.7 91.8 79.3 92.2 80.8C92.6 82.3 92.9 84.1 92.4 85.4C91.9 86.7 90.7 88.1 89.4 88.6C88.1 89.1 86 89 84.6 88.4ZM113 80.4C111.6 79.8 110.3 78.4 109.2 77.2C108.1 76 107.4 74.4 106.6 73C105.8 71.6 104.9 70.1 104.2 68.6C103.5 67.1 102.8 65.7 102.2 64.2C101.6 62.7 100.7 61.2 100.4 59.6C100.1 58 99.8 56.1 100.4 54.8C101 53.5 102.5 52 103.8 51.6C105.1 51.2 107 51.6 108.4 52.2C109.8 52.8 111.1 54 112.2 55.2C113.3 56.4 114 58 114.8 59.4C115.6 60.8 116.3 62.3 117 63.8C117.7 65.3 118.5 66.9 119.2 68.4C119.9 69.9 120.9 71.3 121.2 72.8C121.5 74.3 121.8 76.3 121.2 77.6C120.6 78.9 119.2 80.1 117.8 80.6C116.4 81.1 114.4 81 113 80.4Z",
  tablet: "M88.4 84.2C87 83.7 85.6 82.1 84.6 80.8C83.6 79.5 82.9 77.8 82.2 76.2C81.5 74.6 80.9 73 80.2 71.4C79.5 69.8 78.8 68.2 78 66.6C77.2 65 76 63.6 75.4 62C74.8 60.4 74 58.4 74.4 57C74.8 55.6 76.4 54.3 77.8 53.8C79.2 53.3 81.4 53.4 83 53.8C84.6 54.2 86.2 55.3 87.4 56.4C88.6 57.5 89.5 59.1 90.4 60.6C91.3 62.1 92 63.8 92.8 65.4C93.6 67 94.4 68.6 95 70.2C95.6 71.8 96.3 73.5 96.6 75.2C96.9 76.9 97.2 78.9 96.6 80.4C96 81.9 94.6 83.4 93.2 84C91.8 84.6 89.8 84.7 88.4 84.2ZM126.2 74C124.7 73.7 123.1 72.4 122 71.2C120.9 70 120.5 68.2 119.8 66.6C119.1 65 118.5 63.4 117.8 61.8C117.1 60.2 116.2 58.8 115.4 57.2C114.6 55.6 113.8 54 113.2 52.4C112.6 50.8 111.7 49 112 47.6C112.3 46.2 113.5 44.7 114.8 44C116.1 43.3 118.3 42.9 119.8 43.2C121.3 43.5 122.7 44.7 124 45.8C125.3 46.9 126.4 48.4 127.4 49.8C128.4 51.2 129 52.8 129.8 54.4C130.6 56 131.3 57.6 132 59.2C132.7 60.8 133.5 62.3 133.8 64C134.1 65.7 134.5 67.7 134 69.2C133.5 70.7 132.3 72.4 131 73.2C129.7 74 127.7 74.3 126.2 74Z",
  house: "M80.6 97.6C79.2 97.3 77.6 96.2 76.4 95.2C75.2 94.2 74.4 92.7 73.6 91.4C72.8 90.1 72.1 88.6 71.4 87.2C70.7 85.8 70.1 84.2 69.4 82.8C68.7 81.4 67.7 80.1 67.2 78.6C66.7 77.1 66.1 75.4 66.4 74C66.7 72.6 67.7 70.9 68.8 70.2C69.9 69.5 71.8 69.3 73.2 69.6C74.6 69.9 76.1 70.8 77.2 71.8C78.3 72.8 79 74.4 79.8 75.8C80.6 77.2 81.3 78.6 82 80C82.7 81.4 83.5 83 84.2 84.4C84.9 85.8 85.9 87.1 86.4 88.6C86.9 90.1 87.4 91.8 87.2 93.2C87 94.6 86.1 96.3 85 97C83.9 97.7 82 97.9 80.6 97.6ZM107.4 90C106 89.6 104.7 88.5 103.6 87.4C102.5 86.3 101.6 84.9 100.8 83.6C100 82.3 99.3 80.8 98.6 79.4C97.9 78 97.2 76.6 96.6 75.2C96 73.8 95.2 72.3 94.8 70.8C94.4 69.3 93.7 67.6 94 66.2C94.3 64.8 95.4 63.3 96.6 62.6C97.8 61.9 99.6 61.8 101 62.2C102.4 62.6 103.7 63.7 104.8 64.8C105.9 65.9 106.6 67.4 107.4 68.8C108.2 70.2 108.9 71.6 109.6 73C110.3 74.4 110.9 75.8 111.6 77.2C112.3 78.6 113.3 80.1 113.8 81.6C114.3 83.1 114.9 84.7 114.6 86C114.3 87.3 113.2 88.9 112 89.6C110.8 90.3 108.8 90.4 107.4 90Z",
  hex: "M83.8 102C82.1 101.6 80.4 100.3 79 99C77.6 97.7 76.6 95.9 75.6 94.2C74.6 92.5 73.9 90.7 73 89C72.1 87.3 71.2 85.5 70.4 83.8C69.6 82.1 68.6 80.4 68 78.6C67.4 76.8 66.5 74.8 66.8 73.2C67.1 71.6 68.4 69.6 69.8 68.8C71.2 68 73.5 67.8 75.2 68.2C76.9 68.6 78.6 69.8 80 71C81.4 72.2 82.4 74 83.4 75.6C84.4 77.2 85.2 79.1 86 80.8C86.8 82.5 87.6 84.2 88.4 86C89.2 87.8 90.2 89.6 90.8 91.4C91.4 93.2 92.3 95.2 92 96.8C91.7 98.4 90.6 100.3 89.2 101.2C87.8 102.1 85.5 102.4 83.8 102ZM119.8 91.8C118.1 91.5 116.5 90.3 115.2 89C113.9 87.7 113 85.9 112 84.2C111 82.5 110.3 80.7 109.4 79C108.5 77.3 107.6 75.6 106.8 73.8C106 72 105.1 70.2 104.6 68.4C104.1 66.6 103.3 64.5 103.6 62.8C103.9 61.1 105 59.2 106.4 58.4C107.8 57.6 110.1 57.6 111.8 58C113.5 58.4 115.3 59.5 116.6 60.8C117.9 62.1 118.8 63.9 119.8 65.6C120.8 67.3 121.5 69.1 122.4 70.8C123.3 72.5 124.2 74.3 125 76C125.8 77.7 126.8 79.4 127.4 81.2C128 83 128.7 85.2 128.4 86.8C128.1 88.4 126.8 90.2 125.4 91C124 91.8 121.5 92.1 119.8 91.8Z",
  teardrop: "M98.2 86C96.7 85.7 95.3 84.6 94.2 83.4C93.1 82.2 92.5 80.3 91.8 78.8C91.1 77.3 90.7 75.7 90 74.2C89.3 72.7 88.5 71.1 87.8 69.6C87.1 68.1 86.1 66.6 85.6 65C85.1 63.4 84.5 61.5 85 60.2C85.5 58.9 87 57.6 88.4 57C89.8 56.4 91.7 56.1 93.2 56.4C94.7 56.7 96.4 57.7 97.6 58.8C98.8 59.9 99.5 61.4 100.4 62.8C101.3 64.2 102 65.9 102.8 67.4C103.6 68.9 104.4 70.4 105 72C105.6 73.6 106.2 75.2 106.4 76.8C106.6 78.4 106.8 80.2 106.2 81.6C105.6 83 104.3 84.7 103 85.4C101.7 86.1 99.7 86.3 98.2 86ZM126.8 77.6C125.5 77.3 124.2 76.1 123.2 75C122.2 73.9 121.3 72.5 120.6 71.2C119.9 69.9 119.8 68.4 119.2 67C118.6 65.6 117.9 64.2 117.2 62.8C116.5 61.4 115.8 60 115.2 58.6C114.6 57.2 113.6 55.7 113.4 54.4C113.2 53.1 113.2 51.4 114 50.6C114.8 49.8 116.9 49.6 118.2 49.8C119.5 50 120.9 51 122 52C123.1 53 124 54.3 124.8 55.6C125.6 56.9 126.3 58.4 127 59.8C127.7 61.2 128.2 62.6 128.8 64C129.4 65.4 129.9 66.8 130.4 68.2C130.9 69.6 131.7 71.2 131.8 72.6C131.9 74 131.6 76 130.8 76.8C130 77.6 128.1 77.9 126.8 77.6Z",
};
const SWATCH: { [k: string]: string } = {
  black: "%23000000",
  brown: "%23956F40",
  red: "%23DE4B46",
  orange: "%23E3762E",
  yellow: "%23E19A35",
  green: "%2365BD75",
  cyan: "%2362B3A2",
  blue: "%235383F6",
  violet: "%23895DF3",
  magenta: "%23DE4F97",
  gray: "%23959595",
};
const WHITE = "%23FFFFFF";
const avPath = (d: string, fill: string) => "%3Cpath d='" + d + "' fill='" + fill + "'/%3E";
const avSvg = (parts: string[]) => AV_HEAD + parts.join("") + "%3C/svg%3E";
const bodyOf = (shape: string) => SHAPES[shape] ?? SHAPES.blob;
const swatchOf = (color: string) => SWATCH[color] ?? SWATCH.gray;
const eyesOf = (shape: string) => SHAPE_EYES[shape] ?? SHAPE_EYES.blob;
const avatar = (shape: string, color: string) => avSvg([avPath(bodyOf(shape), swatchOf(color)), avPath(eyesOf(shape), WHITE)]);
// The Grok Bot mark: a black blob. The cover splits it so the eyes can follow the cursor.
const AV = {
  grok: avatar("blob", "black"),
  grokBody: avSvg([avPath(SHAPES.blob, SWATCH.black)]),
  grokEyes: avSvg([avPath(SHAPE_EYES.blob, WHITE)]),
};

// Most-messaged bots, most first. av is the bot's avatar, drawn as in the app.
const crew: (CrewBot & { av: string })[] = (DATA.crew ?? []).map((b: CrewBot, i: number) => ({ ...b, key: b.key || "b" + i, av: avatar(b.shape, b.color) }));

// Connector use from audit.jsonl, grouped by service, most used first.
const connectors: IconBar[] = (DATA.connectors ?? []).filter((c: IconBar) => num(c.value) > 0);
const CONNECTOR_COUNT = num(T.connectors);

// Bots the user published as templates. They get their own step before the share card; left out when empty.
const published: (PublishedBot & { av: string })[] = (DATA.published ?? []).map((b: PublishedBot) => ({ ...b, av: avatar(b.shape, b.color) }));

// Archetypes. Each rule turns the user's numbers into a score: 1 or more means the rule matches, and a higher
// score means a stronger match. The primary archetype is the top score; the secondary is the next one that also
// matches. Ties go to the earlier rule. If nothing matches, the user is a Bot Explorer.
//   Bot Factory          bots messaged >= 8                                     score = bots / 8
//   Bot Artisan          1 to 4 bots and >= 50 messages per bot                 score = (messages / bots) / 50
//   Night Owl            >= 30% of messages from 10pm to 4am (user's zone)       score = share / 0.30
//   Early Bird           >= 30% of messages from 5am to 9am (user's zone)        score = share / 0.30
//   Autopilot            >= 5 enabled routines and >= 1 routine per 2 bots       score = min(routines / 5, (routines / bots) / 0.5)
//   Connector Collector  >= 12 connectors used                                  score = connectors / 12
type Arch = { name: string; reason: string; score: number };
function archetype(d: Data): { primary: Arch; secondary: Arch | null } {
  const msgs = num(d.totals.messages);
  const bots = num(d.totals.bots);
  const routines = num(d.totals.routines);
  const conns = num(d.totals.connectors);
  const hourly: number[] = d.zone?.hourly ?? [];
  const sumHours = (hs: number[]) => hs.reduce((a: number, h: number) => a + num(hourly[h]), 0);
  const night = msgs > 0 ? sumHours([22, 23, 0, 1, 2, 3]) / msgs : 0;
  const morning = msgs > 0 ? sumHours([5, 6, 7, 8]) / msgs : 0;
  const perBot = bots > 0 ? msgs / bots : 0;
  const rules: Arch[] = [
    { name: "Bot Factory", reason: fmtInt(bots) + " bots and counting", score: bots / 8 },
    { name: "Bot Artisan", reason: fmtInt(bots) + " bots, about " + fmtInt(perBot) + " messages each", score: bots >= 1 && bots <= 4 ? perBot / 50 : 0 },
    { name: "Night Owl", reason: Math.round(night * 100) + "% of messages land between 10pm and 4am", score: night / 0.3 },
    { name: "Early Bird", reason: Math.round(morning * 100) + "% of messages land before 9am", score: morning / 0.3 },
    { name: "Autopilot", reason: fmtInt(routines) + " routines run without being asked", score: bots > 0 ? Math.min(routines / 5, routines / bots / 0.5) : 0 },
    { name: "Connector Collector", reason: fmtInt(conns) + " apps plugged in and put to work", score: conns / 12 },
  ];
  const hits = rules
    .map((r: Arch, i: number) => ({ r, i }))
    .filter((x: { r: Arch; i: number }) => x.r.score >= 1)
    .sort((a: { r: Arch; i: number }, b: { r: Arch; i: number }) => b.r.score - a.r.score || a.i - b.i)
    .map((x: { r: Arch; i: number }) => x.r);
  const fallback: Arch = { name: "Bot Explorer", reason: fmtInt(msgs) + " messages and just getting started", score: 0 };
  return { primary: hits[0] ?? fallback, secondary: hits[1] ?? null };
}
const ARCH = archetype(DATA);

// Archetype bots: Grok Bot avatars (real shapes and swatches) with a small prop each, drawn on a wider canvas so the
// prop can sit above the body. Colors appear only inside these data:image SVG strings.
const ARCH_HEAD = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-24 -24 216 216'%3E";
const P = (n: number) => String(Math.round(n * 10) / 10);
const avCircle = (cx: number, cy: number, r: number, fill: string) => "%3Ccircle cx='" + P(cx) + "' cy='" + P(cy) + "' r='" + P(r) + "' fill='" + fill + "'/%3E";
const avLine = (d: string, stroke: string, w: number) => "%3Cpath d='" + d + "' fill='none' stroke='" + stroke + "' stroke-width='" + w + "' stroke-linecap='round' stroke-linejoin='round'/%3E";
const avGroup = (tf: string, parts: string[]) => "%3Cg transform='" + tf + "'%3E" + parts.join("") + "%3C/g%3E";
// A gear with square teeth, as one path.
const gearPath = (cx: number, cy: number, R: number, teeth: number) =>
  Array.from({ length: teeth * 4 }).map((_: unknown, i: number) => {
    const a = (i / (teeth * 4)) * Math.PI * 2;
    const r = i % 4 < 2 ? R : R * 0.74;
    return (i === 0 ? "M" : "L") + P(cx + Math.cos(a) * r) + " " + P(cy + Math.sin(a) * r);
  }).join(" ") + "Z";
// A four-point sparkle.
const sparkPath = (cx: number, cy: number, r: number) =>
  "M" + P(cx) + " " + P(cy - r) + " Q" + P(cx) + " " + P(cy) + " " + P(cx + r) + " " + P(cy) + " Q" + P(cx) + " " + P(cy) + " " + P(cx) + " " + P(cy + r) + " Q" + P(cx) + " " + P(cy) + " " + P(cx - r) + " " + P(cy) + " Q" + P(cx) + " " + P(cy) + " " + P(cx) + " " + P(cy - r) + "Z";
const miniBot = (x: number, y: number, s: number, color: string) => avGroup("translate(" + x + " " + y + ") scale(" + s + ")", [avPath(SHAPES.blob, SWATCH[color]), avPath(SHAPE_EYES.blob, WHITE)]);
const sunRays = Array.from({ length: 8 }).map((_: unknown, i: number) => {
  const a = (i / 8) * Math.PI * 2;
  return "M" + P(160 + Math.cos(a) * 23) + " " + P(6 + Math.sin(a) * 23) + " L" + P(160 + Math.cos(a) * 31) + " " + P(6 + Math.sin(a) * 31);
}).join(" ");

type ArchLook = { shape: string; color: string; eyes: string; prop: string[]; about: string };
const ARCH_LOOKS: { [k: string]: ArchLook } = {
  "Bot Factory": {
    shape: "hex",
    color: "blue",
    eyes: "",
    prop: [avPath(gearPath(158, 8, 24, 8), SWATCH.black), avCircle(158, 8, 8, WHITE), avPath(gearPath(178, 40, 13, 6), SWATCH.gray), avCircle(178, 40, 4, WHITE), miniBot(112, 146, 0.25, "orange"), miniBot(148, 140, 0.22, "magenta")],
    about: "a blue hex with turning gears, and two fresh mini bots rolling off the line",
  },
  "Bot Artisan": {
    shape: "flower",
    color: "magenta",
    eyes: "",
    prop: [avLine("M184 -14 L156 26", SWATCH.brown, 9), avLine("M156 26 L148 38", SWATCH.gray, 12), avPath("M152 33 C150 46 140 56 124 62 C128 48 134 38 142 30 Z", SWATCH.yellow), avPath(sparkPath(6, 2, 16), SWATCH.yellow), avPath(sparkPath(30, -14, 8), SWATCH.yellow)],
    about: "a magenta flower holding a paintbrush, with a couple of sparks",
  },
  "Night Owl": {
    shape: "cloud",
    color: "violet",
    eyes: "translate(0 73) scale(1 0.42) translate(0 -73)",
    prop: [avPath("M162 -16 A26 26 0 1 0 186 22 A20 20 0 1 1 162 -16 Z", SWATCH.yellow), avPath(sparkPath(124, -10, 9), SWATCH.yellow), avPath(sparkPath(186, 54, 7), SWATCH.yellow)],
    about: "a violet cloud with sleepy half-closed eyes, a crescent moon and stars",
  },
  "Early Bird": {
    shape: "star",
    color: "orange",
    eyes: "",
    prop: [avLine(sunRays, SWATCH.yellow, 5), avCircle(160, 6, 17, SWATCH.yellow)],
    about: "an orange star with a bright sun rising over its shoulder",
  },
  Autopilot: {
    shape: "tablet",
    color: "cyan",
    eyes: "",
    prop: [avLine("M178 12 A22 22 0 1 1 168 -10", SWATCH.black, 7), avPath("M162 -22 L180 -8 L160 2 Z", SWATCH.black)],
    about: "a cyan tablet under a looping arrow that keeps going on its own",
  },
  "Connector Collector": {
    shape: "house",
    color: "green",
    eyes: "",
    prop: [avLine("M150 -16 L150 -2 M164 -16 L164 -2", SWATCH.gray, 5), avPath("M140 -4 H174 V14 Q174 26 162 26 H152 Q140 26 140 14 Z", SWATCH.black), avLine("M157 26 C157 40 172 40 172 54", SWATCH.black, 5), avLine("M-6 8 L10 -8 M2 -12 Q12 -22 20 -14 Q28 -6 18 4 M-10 12 Q-20 22 -12 30 Q-4 38 6 28", SWATCH.gray, 6)],
    about: "a green house with a plug and a chain link, always connecting something",
  },
  "Bot Explorer": {
    shape: "teardrop",
    color: "brown",
    eyes: "",
    prop: [avCircle(158, 12, 29, SWATCH.black), avCircle(158, 12, 23, WHITE), avPath("M154 9 L174 -8 L162 15 Z", SWATCH.red), avPath("M162 15 L142 32 L154 9 Z", SWATCH.gray), avCircle(158, 12, 4, SWATCH.black)],
    about: "a brown teardrop carrying a compass, just setting out",
  },
};
function archBot(name: string): string {
  const k = ARCH_LOOKS[name] ?? ARCH_LOOKS["Bot Explorer"];
  const eyes = avPath(eyesOf(k.shape), WHITE);
  return ARCH_HEAD + [avPath(bodyOf(k.shape), swatchOf(k.color)), k.eyes ? avGroup(k.eyes, [eyes]) : eyes].concat(k.prop).join("") + "%3C/svg%3E";
}
const ARCH_AV = archBot(ARCH.primary.name);
const ARCH2_AV = ARCH.secondary ? archBot(ARCH.secondary.name) : "";

type StepKey = "cover" | "when" | "crew" | "toolkit" | "beyond" | "arch" | "shipped" | "share";
// A step with no data is left out rather than shown empty.
const STEPS: { key: StepKey; title: string }[] = [
  { key: "cover" as StepKey, title: IS_YOU ? "Meet you" : "Meet " + NAME, on: true },
  { key: "when" as StepKey, title: IS_YOU ? "When you work" : "When " + NAME + " works", on: TOTAL_MSGS > 0 && ZONES.length > 0 },
  { key: "crew" as StepKey, title: "The crew", on: crew.length > 0 },
  { key: "toolkit" as StepKey, title: "The toolkit", on: connectors.length > 0 },
  { key: "beyond" as StepKey, title: "Beyond the chat", on: num(DATA.beyond?.computerUse) + num(DATA.beyond?.browserPages) + num(DATA.beyond?.tasks) > 0 },
  { key: "arch" as StepKey, title: "Your archetype", on: true },
  { key: "shipped" as StepKey, title: IS_YOU ? "Bots you shipped" : "Bots " + NAME + " shipped", on: published.length > 0 },
  { key: "share" as StepKey, title: "Share your story", on: true },
]
  .filter((x: { on: boolean }) => x.on)
  .map((x: { key: StepKey; title: string }) => ({ key: x.key, title: x.title }));

function hourLabel(h: number): string {
  const x = ((Math.round(num(h)) % 24) + 24) % 24;
  if (x === 0) return "12a";
  if (x === 12) return "12p";
  return x < 12 ? x + "a" : x - 12 + "p";
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function ease(p: number): number {
  return 1 - Math.pow(1 - clamp01(p), 3);
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, num(x)));
}

function fmtInt(v: number): string {
  return Math.round(num(v)).toLocaleString("en-US");
}

function useGrow(ms: number): number {
  const [p, setP] = useState<number>(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - start) / Math.max(1, ms)));
      setP(ease(k));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ms]);
  return p;
}

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

function popIn(p: number): number {
  return p >= 1 ? 1 : Math.max(0, pop(p));
}

const CH = 380;
const HERO = 150;
const ORBIT_AV = 54;

function Cover(props: { onStart: () => void }) {
  const theme = useGrokTheme();
  const f = theme.font.family;
  const ref = useRef<SVGSVGElement | null>(null);
  const target = useRef<{ x: number; y: number }>({ x: W / 2, y: CH / 2 });
  const [s, setS] = useState({ x: W / 2, y: CH / 2, vx: 0, vy: 0, t: 0 });

  useEffect(() => {
    const onMove = (e: globalThis.PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0) return;
      target.current = {
        x: ((e.clientX - r.left) / r.width) * W,
        y: ((e.clientY - r.top) / r.height) * CH,
      };
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
      const tx = Math.max(W / 2 - 80, Math.min(W / 2 + 80, target.current.x));
      const ty = Math.max(CH / 2 - 30, Math.min(CH / 2 + 30, target.current.y));
      const vx = (cur.vx + (tx - cur.x) * 0.02) * 0.86;
      const vy = (cur.vy + (ty - cur.y) * 0.02) * 0.86;
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
  const rise = (delay: number) => {
    const k = ease((t - delay) / 0.6);
    return { opacity: k, transform: "translateY(" + ((1 - k) * 14).toFixed(1) + "px)" };
  };
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
  const ex = (dx / d) * look;
  const ey = (dy / d) * look;
  const blink = t % 4.2 < 0.12 ? 0.15 : 1;
  const eyeY = -HERO / 2 + (32 / 84) * HERO;

  const orbit = crew.map((b, i: number) => {
    const a = (i / Math.max(1, crew.length)) * Math.PI * 2 - Math.PI / 2 + t * 0.22;
    const k = popIn((t - 1.0 - i * 0.2) / 0.5);
    return { b, i, k, x: W / 2 + Math.cos(a) * 250, y: CH / 2 + Math.sin(a) * 128, back: Math.sin(a) < 0 };
  });
  const rimUrl = useRimUrl("rim-cover");
  const drawBot = (o: { b: (typeof crew)[number]; i: number; k: number; x: number; y: number }) => {
    const size = ORBIT_AV * (0.85 + 0.15 * (o.y / CH)) * o.k;
    const bob = Math.sin(t * 1.6 + o.i * 1.3) * 3;
    return (
      <g key={o.b.key} opacity={clamp01(o.k * 2)}>
        <title>{o.b.name}</title>
        <image href={o.b.av} x={o.x - size / 2} y={o.y - size / 2 + bob} width={Math.max(0.01, size)} height={Math.max(0.01, size)} filter={rimUrl} />
      </g>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: "12px 0 8px" }}>
      <div style={{ ...rise(0), fontFamily: f, fontSize: 44, lineHeight: 1.1, fontWeight: theme.weight.semibold, letterSpacing: -1, color: theme.text.primary }}>{TITLE}</div>
      <div style={{ ...rise(0.15), fontFamily: f, fontSize: theme.font.body1.fontSize, color: theme.text.secondary }}>{WINDOW ? "Your Grok Bot story, " + WINDOW : "Your Grok Bot story"}</div>
      <svg ref={ref} width="100%" viewBox={"0 0 " + W + " " + CH} role="img" aria-label={"The Grok Bot avatar, which follows the cursor, with " + (IS_YOU ? "your" : NAME + "'s") + " most-messaged bots orbiting it"} style={{ maxWidth: W, overflow: "visible" }}>
        <RimDef id="rim-cover" r={1.5} />
        <ellipse cx={W / 2} cy={CH / 2} rx={250} ry={128} fill="none" stroke={theme.border.weak} strokeWidth={1} strokeDasharray="3 6" opacity={ease((t - 0.8) / 0.6)} />
        {orbit.filter((o) => o.back).map(drawBot)}
        <ellipse cx={s.x} cy={CH / 2 + HERO / 2 + 6} rx={Math.max(1, 56 * heroIn * (1 - (s.y - CH / 2) / 300))} ry={7} fill={theme.border.weak} />
        <g transform={"translate(" + s.x + " " + (s.y + Math.sin(t * 2.2) * 3) + ") rotate(" + tilt + ") scale(" + Math.max(0.001, sx).toFixed(3) + " " + Math.max(0.001, sy).toFixed(3) + ")"}>
          <image href={AV.grokBody} x={-HERO / 2} y={-HERO / 2} width={HERO} height={HERO} filter={rimUrl} />
          <g transform={"translate(" + ex.toFixed(2) + " " + ey.toFixed(2) + ") translate(0 " + eyeY + ") scale(1 " + blink + ") translate(0 " + -eyeY + ")"}>
            <image href={AV.grokEyes} x={-HERO / 2} y={-HERO / 2} width={HERO} height={HERO} />
          </g>
        </g>
        {orbit.filter((o) => !o.back).map(drawBot)}
      </svg>
      <div style={{ ...rise(1.6), width: "100%", marginTop: 12 }}>
        <StatGrid
          delay={1.6}
          min={150}
          stats={[
            { n: TOTAL_MSGS, label: "Messages sent", kind: "msgs" },
            { n: num(T.bots), label: "Bots messaged", kind: "bots" },
            { n: num(T.activeDays), label: "Active days", kind: "days" },
            { n: num(T.streak), label: "Day streak", kind: "streak" },
          ].filter((st: Stat) => st.n > 0)}
        />
      </div>
      <div style={{ ...rise(2.1), display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 8 }}>
        <Button label="Start" variant="primary" onClick={props.onStart} />
        <div style={{ fontFamily: f, fontSize: theme.font.caption.fontSize, color: theme.text.tertiary }}>Or press the right arrow key</div>
      </div>
    </div>
  );
}

function Progress(props: { step: number; total: number }) {
  const theme = useGrokTheme();
  const gap = 6;
  const total = Math.max(1, props.total);
  const seg = (W - gap * (total - 1)) / total;
  return (
    <svg width="100%" viewBox={"0 0 " + W + " 6"} preserveAspectRatio="none" role="img" aria-label={"Step " + (props.step + 1) + " of " + total}>
      {Array.from({ length: total }).map((_: unknown, i: number) => (
        <rect key={i} x={i * (seg + gap)} y={0} width={seg} height={6} rx={3} fill={i <= props.step ? theme.dataviz.categorical[0] ?? theme.text.primary : theme.border.default} />
      ))}
    </svg>
  );
}

function HourChart(props: { zs: ZoneData; name: string }) {
  const theme = useGrokTheme();
  const p = useGrow(1100);
  const zs = props.zs;
  const peak = zs.peakHour;
  const max = Math.max(1, ...zs.hourly.map((v: number) => num(v)));
  const [hover, setHover] = useState<number>(peak);
  const top = 40;
  const base = 230;
  const bw = (W - 20) / 24;
  return (
    <svg width="100%" viewBox={"0 0 " + W + " 260"} role="img" aria-label={"Messages sent by hour of day, " + props.name}>
      <line x1={10} x2={W - 10} y1={base} y2={base} stroke={theme.border.subtle} />
      {zs.hourly.map((v: number, h: number) => {
        const delay = (h / 24) * 0.5;
        const k = ease(clamp01((p - delay) / 0.5));
        const bh = (((base - top) * num(v)) / max) * k;
        const on = h === hover;
        return (
          <g key={h} onPointerEnter={() => setHover(h)}>
            <rect x={10 + h * bw} y={top - 30} width={bw} height={base - top + 30} fill={theme.bg.base} fillOpacity={0} />
            <rect x={10 + h * bw + 3} y={base - bh} width={bw - 6} height={bh} rx={4} fill={on ? theme.dataviz.categorical[0] ?? theme.text.primary : theme.dataviz.singleSeriesRest} />
            {h % 4 === 0 ? (
              <text x={10 + h * bw + bw / 2} y={252} textAnchor="middle" fill={theme.text.tertiary} style={{ fontFamily: theme.font.family, fontSize: theme.font.label.fontSize }}>
                {hourLabel(h)}
              </text>
            ) : null}
          </g>
        );
      })}
      <text x={10} y={20} fill={theme.text.primary} style={{ fontFamily: theme.font.family, fontSize: theme.font.body1.fontSize, fontWeight: theme.weight.semibold }}>
        {hourLabel(hover) + "m " + props.name + ", " + num(zs.hourly[hover]) + " messages" + (hover === peak ? ", peak hour" : "")}
      </text>
    </svg>
  );
}

function PeakTile(props: { label: string; value: string; sub: string; i: number; t: number }) {
  const theme = useGrokTheme();
  const f = theme.font.family;
  const e = ease((props.t - 0.3 - props.i * 0.12) / 0.6);
  return (
    <div
      style={{
        border: "1px solid " + theme.border.default,
        borderRadius: theme.radius.lg,
        padding: 16,
        background: theme.bg.base,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 4,
        opacity: e,
        transform: "translateY(" + (1 - e) * 12 + "px)",
      }}
    >
      <div style={{ fontFamily: f, fontSize: theme.font.label.fontSize, color: theme.text.tertiary }}>{props.label}</div>
      <div style={{ fontFamily: f, fontSize: theme.font.heading3.fontSize, lineHeight: theme.font.heading3.lineHeight, fontWeight: theme.weight.semibold, color: theme.text.primary }}>{props.value}</div>
      <div style={{ fontFamily: f, fontSize: theme.font.body2.fontSize, color: theme.text.secondary }}>{props.sub}</div>
    </div>
  );
}

// Fun fact: the busiest day and the bots that got most of its messages.
const FUN = DATA.funDay ?? null;

function FunFact(props: { t: number }) {
  const theme = useGrokTheme();
  const f = theme.font.family;
  const rim = useRim();
  if (!FUN || num(FUN.count) <= 0) return null;
  const e = ease((props.t - 0.6) / 0.6);
  const top = FUN.bots.filter((b: { name: string; count: number }) => num(b.count) > 0);
  const share = top.reduce((s: number, b: { name: string; count: number }) => s + num(b.count), 0);
  const names = top.map((b: { name: string; count: number }) => b.name);
  const who = names.length > 1 ? names.slice(0, -1).join(", ") + " and " + names[names.length - 1] : names[0] ?? "";
  const avs = top.map((b: { name: string; count: number }) => crew.find((c) => c.name === b.name)?.av ?? "").filter((s: string) => s !== "");
  return (
    <div
      style={{
        border: "1px solid " + theme.border.default,
        borderRadius: theme.radius.lg,
        padding: 16,
        background: theme.fill.secondary,
        display: "flex",
        alignItems: "center",
        gap: 16,
        marginTop: 12,
        opacity: e,
        transform: "translateY(" + (1 - e) * 12 + "px)",
      }}
    >
      <div style={{ display: "flex", flexShrink: 0 }}>
        {avs.map((src: string, i: number) => (
          <img key={i} src={src} alt="" width={52} height={52} style={{ display: "block", width: 52, height: 52, marginLeft: i === 0 ? 0 : -14, transform: "rotate(" + (i % 2 === 0 ? -8 : 8) + "deg)", ...rim }} />
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <div style={{ fontFamily: f, fontSize: theme.font.label.fontSize, fontWeight: theme.weight.semibold, color: theme.text.tertiary }}>Fun fact</div>
        <div style={{ fontFamily: f, fontSize: theme.font.heading3.fontSize, lineHeight: theme.font.heading3.lineHeight, fontWeight: theme.weight.semibold, color: theme.text.primary }}>
          {"Biggest day: " + FUN.label}
        </div>
        <div style={{ fontFamily: f, fontSize: theme.font.body2.fontSize, color: theme.text.secondary }}>
          {plural(num(FUN.count), "message", "messages") + (who ? ", and " + fmtInt(share) + " of them went to " + who : "")}
        </div>
      </div>
    </div>
  );
}

function WhenWorks() {
  const theme = useGrokTheme();
  const t = useClock(2);
  const z = ZONES[0];
  if (!z) return null;
  return (
    <Fragment>
      <HourChart zs={z} name={z.name} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <PeakTile i={0} t={t} label="Peak hour" value={hourLabel(z.peakHour) + "m"} sub={plural(num(z.hourly[z.peakHour]), "message", "messages")} />
        <PeakTile i={1} t={t} label="Busiest weekday" value={z.bestWeekday.label} sub={plural(num(z.bestWeekday.count), "message", "messages")} />
        <PeakTile i={2} t={t} label="Busiest week" value={z.bestWeek.label} sub={plural(num(z.bestWeek.count), "message", "messages")} />
      </div>
      <FunFact t={t} />
      <div style={{ fontFamily: theme.font.family, fontSize: theme.font.caption.fontSize, color: theme.text.tertiary, textAlign: "center", marginTop: 16 }}>
        {"All times in " + z.name + ". Weeks start Monday."}
      </div>
    </Fragment>
  );
}

type Stat = { n: number; label: string; kind: string };

const TILE_W = 200;
const TILE_H = 100;

function BubbleViz(props: { t: number }) {
  const theme = useGrokTheme();
  const c0 = theme.dataviz.categorical[0] ?? theme.text.primary;
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
        const x = left ? 18 : TILE_W - 18 - w;
        const op = i === 0 ? e : clamp01(1 - (slot - 2.2) / 0.8);
        return (
          <g key={k} opacity={op}>
            <rect x={x} y={y} width={w} height={18} rx={9} fill={left ? theme.fill.secondary : c0} stroke={left ? theme.border.default : "none"} />
            <circle cx={left ? x + 3 : x + w - 3} cy={y + 16} r={3} fill={left ? theme.fill.secondary : c0} />
          </g>
        );
      })}
    </Fragment>
  );
}

const CLUSTER = [
  { x: 100, y: 54, s: 54 },
  { x: 54, y: 44, s: 40 },
  { x: 146, y: 46, s: 40 },
  { x: 24, y: 74, s: 30 },
  { x: 176, y: 76, s: 30 },
  { x: 100, y: 16, s: 26 },
];

function BotsViz(props: { t: number }) {
  const theme = useGrokTheme();
  const t = props.t;
  const chip = popIn((t - 0.9) / 0.5);
  const shown = Math.min(CLUSTER.length, crew.length);
  const more = num(T.bots) - shown;
  const rimUrl = useRimUrl("rim-bots");
  return (
    <Fragment>
      <RimDef id="rim-bots" r={1} />
      {CLUSTER.map((q: { x: number; y: number; s: number }, i: number) => {
        const av = crew[i]?.av;
        if (!av) return null;
        const e = popIn((t - 0.1 - i * 0.1) / 0.5);
        const bob = Math.sin(t * 2 + i * 1.7) * 2.5;
        const sz = q.s * e;
        return <image key={i} href={av} x={q.x - sz / 2} y={q.y - sz / 2 + bob} width={sz} height={sz} filter={rimUrl} />;
      })}
      {more > 0 ? (
        <g transform={"translate(176 22) scale(" + chip + ")"}>
          <rect x={-17} y={-11} width={34} height={22} rx={11} fill={theme.fill.secondary} stroke={theme.border.default} />
          <text x={0} y={4} textAnchor="middle" fill={theme.text.secondary} style={{ fontFamily: theme.font.family, fontSize: 11, fontWeight: theme.weight.semibold }}>
            {"+" + more}
          </text>
        </g>
      ) : null}
    </Fragment>
  );
}

function CalendarViz(props: { t: number }) {
  const theme = useGrokTheme();
  const c0 = theme.dataviz.categorical[0] ?? theme.text.primary;
  // One dot per day of the window. Short windows use 4 rows; long ones use 7 and shrink the dots to fit.
  const nd = Math.max(1, daily.length);
  const rows = nd <= 44 ? 4 : 7;
  const cols = Math.max(1, Math.ceil(nd / rows));
  const pitch = Math.min(16, (TILE_W - 24) / Math.max(1, cols - 1), (TILE_H - 24) / Math.max(1, rows - 1));
  const dot = Math.min(5.5, pitch * 0.36);
  const step = Math.min(0.025, 1 / nd);
  const x0 = (TILE_W - (cols - 1) * pitch) / 2;
  const y0 = (TILE_H - (Math.ceil(nd / cols) - 1) * pitch) / 2;
  return (
    <Fragment>
      {daily.map((v: number, i: number) => {
        const lv = dayLevel(v);
        const e = popIn((props.t - 0.1 - i * step) / 0.4);
        return (
          <circle
            key={i}
            cx={x0 + (i % cols) * pitch}
            cy={y0 + Math.floor(i / cols) * pitch}
            r={dot * e}
            fill={lv === 0 ? theme.border.default : c0}
            opacity={lv === 0 ? 1 : 0.3 + lv * 0.175}
          />
        );
      })}
    </Fragment>
  );
}

function StreakViz(props: { t: number; val: number; total: number }) {
  const theme = useGrokTheme();
  const c0 = theme.dataviz.categorical[0] ?? theme.text.primary;
  // Up to 13 dots. Longer streaks fill the same 13 dots in proportion.
  const n = Math.max(1, Math.min(13, props.total));
  const lit = Math.round((props.val / Math.max(1, props.total)) * n);
  const pts = Array.from({ length: n }, (_: unknown, i: number) => ({ x: 16 + i * 14, y: 56 + Math.sin(i * 0.7) * 16 }));
  const head = pts[Math.max(0, Math.min(n - 1, lit - 1))] ?? pts[0];
  const glow = (props.t * 4) % (n + 6);
  return (
    <Fragment>
      {pts.slice(1).map((q: { x: number; y: number }, i: number) => (
        <line key={"l" + i} x1={pts[i].x} y1={pts[i].y} x2={q.x} y2={q.y} stroke={i + 1 < lit ? c0 : theme.border.default} strokeWidth={3} strokeLinecap="round" />
      ))}
      {pts.map((q: { x: number; y: number }, i: number) => {
        const on = i < lit;
        const g = Math.max(0, 1 - Math.abs(glow - i) / 2);
        return <circle key={i} cx={q.x} cy={q.y} r={on ? 5 + g * 2 : 4} fill={on ? c0 : theme.bg.base} stroke={on ? "none" : theme.border.default} strokeWidth={2} />;
      })}
      {lit > 0 ? (
        <g transform={"translate(" + head.x + " " + (head.y - 16) + ") scale(" + (1 + Math.sin(props.t * 8) * 0.08) + ")"}>
          <path d="M0 -10 C6 -4 7 2 4 6 C2 9 -2 9 -4 6 C-7 2 -5 -3 -2 -5 C-2 -2 -1 0 1 0 C2 -3 1 -7 0 -10 Z" fill={theme.dataviz.categorical[1] ?? c0} />
        </g>
      ) : null}
    </Fragment>
  );
}

function StatGrid(props: { stats: Stat[]; delay?: number; min?: number }) {
  const theme = useGrokTheme();
  const t = Math.max(0, useClock() - num(props.delay));
  const stats = props.stats ?? [];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(" + (props.min ?? 190) + "px, 1fr))", gridAutoRows: "1fr", gap: 12 }}>
      {stats.map((st: Stat, i: number) => {
        const lt = Math.max(0, t - i * 0.12);
        const e = ease(lt / 0.5);
        const c = ease(lt / 1.4);
        const val = st.kind === "streak" ? Math.min(st.n, Math.floor(lt / 0.09)) : Math.round(num(st.n) * c);
        return (
          <div
            key={i}
            style={{
              border: "1px solid " + theme.border.default,
              borderRadius: theme.radius.lg,
              padding: 16,
              boxSizing: "border-box",
              background: theme.bg.base,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: 4,
              opacity: e,
              transform: "translateY(" + (1 - e) * 16 + "px) scale(" + (0.96 + 0.04 * e) + ")",
            }}
          >
            <svg width="100%" viewBox={"0 0 " + TILE_W + " " + TILE_H} style={{ maxWidth: 220 }} role="img" aria-label={st.label}>
              {st.kind === "msgs" ? <BubbleViz t={lt} /> : null}
              {st.kind === "bots" ? <BotsViz t={lt} /> : null}
              {st.kind === "days" ? <CalendarViz t={lt} /> : null}
              {st.kind === "streak" ? <StreakViz t={lt} val={val} total={st.n} /> : null}
            </svg>
            <div style={{ fontFamily: theme.font.family, fontSize: theme.font.metric.fontSize, lineHeight: theme.font.metric.lineHeight, color: theme.text.primary, fontWeight: theme.weight.semibold, fontVariantNumeric: "tabular-nums" }}>
              {fmtInt(val)}
            </div>
            <div style={{ fontFamily: theme.font.family, fontSize: theme.font.body2.fontSize, color: theme.text.secondary, whiteSpace: "nowrap" }}>{st.label}</div>
          </div>
        );
      })}
    </div>
  );
}

const TOOLKIT_TOP = 10;

// Connectors ranked by use, most used first. Each bar grows in once; with reduced motion it starts full.
function Toolkit() {
  const theme = useGrokTheme();
  const still = useStill();
  const t = useClock(2.4);
  const f = theme.font.family;
  if (connectors.length === 0) return null;
  const ranked = connectors.slice().sort((a: IconBar, b: IconBar) => num(b.value) - num(a.value));
  const shown = ranked.slice(0, TOOLKIT_TOP);
  const more = Math.max(0, CONNECTOR_COUNT - shown.length, ranked.length - shown.length);
  const top = Math.max(1, num(shown[0]?.value));
  const c0 = theme.dataviz.categorical[0] ?? theme.text.primary;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontFamily: f, fontSize: theme.font.heading3.fontSize, lineHeight: theme.font.heading3.lineHeight, fontWeight: theme.weight.semibold, color: theme.text.primary }}>{"Plugged into " + plural(CONNECTOR_COUNT, "app", "apps")}</div>
        <div style={{ fontFamily: f, fontSize: theme.font.label.fontSize, color: theme.text.secondary }}>Most used first</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {shown.map((it: IconBar, i: number) => {
          const g = still ? 1 : ease((t - 0.15 - i * 0.06) / 0.9);
          const w = Math.max(0.015, num(it.value) / top);
          const hasIcon = typeof it.icon === "string" && it.icon.indexOf("data:image/") === 0;
          return (
            <div key={it.name + i} style={{ display: "grid", gridTemplateColumns: "24px 36px minmax(0, 1fr)", columnGap: 12, alignItems: "center" }}>
              <div style={{ fontFamily: f, fontSize: theme.font.label.fontSize, fontWeight: theme.weight.semibold, color: theme.text.tertiary, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{String(i + 1)}</div>
              <div
                style={{
                  width: 36,
                  height: 36,
                  boxSizing: "border-box",
                  borderRadius: theme.radius.lg,
                  background: theme.kind === "dark" ? theme.fill.primary : theme.bg.base,
                  border: "1px solid " + theme.border.subtle,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  color: theme.kind === "dark" ? theme.text.onPrimary : theme.text.primary,
                  fontFamily: f,
                  fontSize: theme.font.caption.fontSize,
                  fontWeight: theme.weight.semibold,
                }}
              >
                {hasIcon ? <img src={it.icon} alt={it.name + " logo"} width={24} height={24} style={{ display: "block", width: 24, height: 24, objectFit: "contain" }} /> : it.mono}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <div style={{ fontFamily: f, fontSize: theme.font.body2.fontSize, fontWeight: theme.weight.semibold, color: theme.text.primary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.name}</div>
                  <div style={{ fontFamily: f, fontSize: theme.font.label.fontSize, color: theme.text.secondary, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{plural(num(it.value), "use", "uses")}</div>
                </div>
                <div style={{ height: 8, borderRadius: theme.radius.full, background: theme.fill.secondary, overflow: "hidden" }}>
                  <div style={{ width: w * 100 + "%", height: "100%", borderRadius: theme.radius.full, background: c0, transformOrigin: "left center", transform: "scaleX(" + g + ")" }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {more > 0 ? <div style={{ paddingLeft: 84, fontFamily: f, fontSize: theme.font.label.fontSize, color: theme.text.secondary }}>{"+" + fmtInt(more) + " more"}</div> : null}
    </div>
  );
}

function CrewShapes() {
  const theme = useGrokTheme();
  const t = useClock();
  const p = ease(t / 1.2);
  const [pick, setPick] = useState<number>(0);
  if (crew.length === 0) return null;
  const sel = crew[Math.min(pick, crew.length - 1)];
  const maxT = Math.max(1, crew[0].msgs);
  const two = crew.length > 3;
  const pos = [
    { x: 120, y: 140 },
    { x: 350, y: 130 },
    { x: 580, y: 145 },
    { x: 120, y: 380 },
    { x: 350, y: 390 },
    { x: 580, y: 375 },
  ];
  const vh = two ? 540 : 300;
  const f = theme.font.family;
  const rimUrl = useRimUrl("rim-crew");
  return (
    <Fragment>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontFamily: f, fontSize: theme.font.body1.fontSize, fontWeight: theme.weight.semibold, color: theme.text.primary }}>{"#" + (pick + 1) + " " + sel.name}</div>
        <div style={{ fontFamily: f, fontSize: theme.font.label.fontSize, color: theme.text.secondary }}>
          {(sel.does ? sel.does + ". " : "") + plural(sel.msgs, "message", "messages") + ", " + Math.round((sel.msgs / Math.max(1, TOTAL_MSGS)) * 100) + "% of all"}
        </div>
      </div>
      <svg width="100%" viewBox={"0 0 " + W + " " + vh} role="img" aria-label={POSS + " most-messaged bots, each drawn as its avatar and sized by messages"}>
        <RimDef id="rim-crew" r={2} />
        {crew.slice(0, pos.length).map((b, i: number) => {
          const grow = ease(p * 1.6 - i * 0.12);
          const r = Math.max(0.01, (26 + 50 * Math.sqrt(b.msgs / maxT)) * grow);
          const bob = Math.sin(t * 1.6 + i * 1.3) * 5;
          const on = i === pick;
          const x = pos[i].x;
          const y = pos[i].y;
          const sz = r * 2.4 * (on ? 1.06 : 1);
          return (
            <g key={b.key} onPointerEnter={() => setPick(i)} onClick={() => setPick(i)} style={{ cursor: "pointer" }}>
              <ellipse cx={x} cy={y + r + 6} rx={r * (on ? 0.55 : 0.7)} ry={5} fill={theme.border.weak} />
              <g style={{ transform: "translateY(" + (on ? -14 : 0) + "px)", transition: "transform 260ms " + theme.motion.easing }}>
                <g transform={"translate(" + x + " " + (y + bob) + ")"}>
                  <image href={b.av} x={-sz / 2} y={-sz / 2} width={sz} height={sz} filter={rimUrl} />
                </g>
              </g>
              <text x={x} y={y + r + 28} textAnchor="middle" fill={on ? theme.text.primary : theme.text.secondary} style={{ fontFamily: f, fontSize: theme.font.label.fontSize, fontWeight: on ? theme.weight.semibold : theme.weight.regular }}>
                {b.name}
              </text>
              <text x={x} y={y + r + 45} textAnchor="middle" fill={theme.text.tertiary} style={{ fontFamily: f, fontSize: theme.font.caption.fontSize }}>
                {b.does}
              </text>
              <text x={x} y={y + r + 62} textAnchor="middle" fill={theme.text.tertiary} style={{ fontFamily: f, fontSize: theme.font.caption.fontSize }}>
                {fmtInt(b.msgs * grow) + " messages"}
              </text>
            </g>
          );
        })}
      </svg>
    </Fragment>
  );
}

// Reduced motion: when the OS asks for less motion, the animated pieces show a settled frame instead.
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

// Dark mode only: a thin rim in a theme token around the avatars, so black bodies and props still read on a dark page.
// Their own palette colors stay as they are. RimDef is the SVG version (it also survives the PNG export); useRim is for <img>.
function RimDef(props: { id: string; r: number }) {
  const theme = useGrokTheme();
  if (theme.kind !== "dark") return null;
  return (
    <defs>
      <filter id={props.id} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
        <feMorphology in="SourceAlpha" operator="dilate" radius={props.r} result="grow" />
        <feFlood floodColor={theme.border.strong} result="ink" />
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
  const theme = useGrokTheme();
  return theme.kind === "dark" ? "url(#" + id + ")" : undefined;
}

function useRim(): CSSProperties {
  const theme = useGrokTheme();
  if (theme.kind !== "dark") return {};
  const c = theme.border.strong;
  return { filter: "drop-shadow(0 0 0.8px " + c + ") drop-shadow(0 0 0.8px " + c + ") drop-shadow(0 0 0.8px " + c + ")" };
}

const VW = 300;
const VH = 150;

function seg(ph: number, a: number, b: number): number {
  return ease(clamp01((ph - a) / Math.max(0.001, b - a)));
}

// Smooth in-out, used for the tiles so nothing snaps.
function smooth(ph: number, a: number, b: number): number {
  const x = clamp01((ph - a) / Math.max(0.001, b - a));
  return x * x * (3 - 2 * x);
}

const DESK_ICONS = [
  { x: 26, y: 40 },
  { x: 26, y: 72 },
  { x: 26, y: 104 },
];

// Every element is always drawn and only its opacity, size or position changes, so nothing pops in or out.
// One loop: the cursor opens an app, fills a field, presses the button, and the window fades away.
const PC_CYCLE = 5.2;
function ComputerViz(props: { t: number }) {
  const theme = useGrokTheme();
  const c = theme.dataviz.categorical;
  const c0 = c[0] ?? theme.text.primary;
  const n = Math.floor(props.t / PC_CYCLE);
  const ph = (props.t % PC_CYCLE) / PC_CYCLE;
  const icon = DESK_ICONS[n % 3] ?? DESK_ICONS[0];
  const rest = { x: 250, y: 120 };
  const btn = { x: 226, y: 110 };
  const m1 = smooth(ph, 0.04, 0.2);
  const m2 = smooth(ph, 0.44, 0.58);
  const m3 = smooth(ph, 0.8, 0.96);
  const cx = rest.x + (icon.x - rest.x) * m1 + (btn.x - icon.x) * m2 + (rest.x - btn.x) * m3;
  const cy = rest.y + (icon.y - rest.y) * m1 + (btn.y - icon.y) * m2 + (rest.y - btn.y) * m3;
  const hl = smooth(ph, 0.2, 0.24) * (1 - smooth(ph, 0.34, 0.42));
  const open = smooth(ph, 0.24, 0.36) * (1 - smooth(ph, 0.84, 0.94));
  const typed = smooth(ph, 0.34, 0.46);
  const field = smooth(ph, 0.38, 0.54);
  const done = smooth(ph, 0.6, 0.66);
  const wx = 70;
  const wy = 26;
  const ww = 200;
  const wh = 104;
  const accent = c[n % 3] ?? c0;
  const sc = 0.92 + 0.08 * open;
  return (
    <svg width="100%" height="100%" viewBox={"0 0 " + VW + " " + VH} preserveAspectRatio="xMidYMid meet" role="img" aria-label="A cursor driving a desktop: opening an app, filling a field, pressing a button">
      <rect x={4} y={4} width={VW - 8} height={VH - 8} rx={12} fill={theme.fill.secondary} stroke={theme.border.default} />
      <rect x={4} y={4} width={VW - 8} height={16} rx={8} fill={theme.border.subtle} />
      {Array.from({ length: 3 }).map((_: unknown, i: number) => (
        <circle key={i} cx={16 + i * 9} cy={12} r={2.5} fill={theme.border.strong} />
      ))}
      {DESK_ICONS.map((q: { x: number; y: number }, i: number) => (
        <g key={i}>
          <rect x={q.x - 11} y={q.y - 11} width={22} height={22} rx={6} fill={theme.bg.base} stroke={theme.border.default} />
          <rect x={q.x - 11} y={q.y - 11} width={22} height={22} rx={6} fill={accent} opacity={i === n % 3 ? hl : 0} />
          <rect x={q.x - 9} y={q.y + 14} width={18} height={3} rx={1.5} fill={theme.border.default} />
        </g>
      ))}
      <g opacity={open} transform={"translate(" + (wx + ww / 2) + " " + (wy + wh / 2) + ") scale(" + sc.toFixed(4) + ") translate(" + -ww / 2 + " " + -wh / 2 + ")"}>
        <rect x={0} y={0} width={ww} height={wh} rx={10} fill={theme.bg.base} stroke={theme.border.strong} />
        <rect x={0} y={0} width={ww} height={18} rx={9} fill={accent} opacity={0.9} />
        <rect x={14} y={30} width={Math.max(0.01, 110 * typed)} height={6} rx={3} fill={theme.text.tertiary} />
        <rect x={14} y={44} width={150} height={20} rx={6} fill={theme.fill.secondary} stroke={theme.border.default} />
        <rect x={20} y={51} width={Math.max(0.01, 100 * field)} height={6} rx={3} fill={theme.text.secondary} />
        <rect x={ww - 68} y={wh - 28} width={60} height={20} rx={10} fill={theme.border.default} />
        <rect x={ww - 68} y={wh - 28} width={60} height={20} rx={10} fill={accent} opacity={done} />
        <path d={"M" + (ww - 44) + " " + (wh - 18) + " l4 4 l8 -8"} fill="none" stroke={theme.bg.base} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" opacity={done} />
      </g>
      <g transform={"translate(" + (cx - 2).toFixed(2) + " " + (cy - 2).toFixed(2) + ")"}>
        <path d="M0 0 L0 20 L5.5 14.5 L9.5 23.5 L13 22 L9 13 L16 13 Z" fill={theme.text.primary} stroke={theme.bg.base} strokeWidth={1.5} />
      </g>
    </svg>
  );
}

// One loop: a page loads (thin bar along the address field), its blocks fade in, hold, then fade out for the next page.
const WEB_CYCLE = 4.2;
const URL_W = [96, 132, 74];
function BrowserViz(props: { t: number }) {
  const theme = useGrokTheme();
  const c = theme.dataviz.categorical;
  const c0 = c[0] ?? theme.text.primary;
  const n = Math.floor(props.t / WEB_CYCLE);
  const ph = (props.t % WEB_CYCLE) / WEB_CYCLE;
  const tab = n % 3;
  const prev = (n + 2) % 3;
  const swap = smooth(ph, 0, 0.08);
  const load = smooth(ph, 0.04, 0.34);
  const bar = smooth(ph, 0.02, 0.06) * (1 - smooth(ph, 0.36, 0.44));
  const show = smooth(ph, 0.3, 0.5) * (1 - smooth(ph, 0.86, 0.98));
  const blocks = [
    { x: 16, y: 54, w: 268, h: 34 },
    { x: 16, y: 96, w: 84, h: 40 },
    { x: 108, y: 96, w: 84, h: 40 },
    { x: 200, y: 96, w: 84, h: 40 },
  ];
  return (
    <svg width="100%" height="100%" viewBox={"0 0 " + VW + " " + VH} preserveAspectRatio="xMidYMid meet" role="img" aria-label="A browser loading page after page">
      <rect x={4} y={4} width={VW - 8} height={VH - 8} rx={12} fill={theme.bg.base} stroke={theme.border.default} />
      {Array.from({ length: 3 }).map((_: unknown, i: number) => (
        <g key={i}>
          <rect x={12 + i * 70} y={10} width={64} height={14} rx={5} fill={theme.bg.base} stroke={theme.border.subtle} />
          <rect x={12 + i * 70} y={10} width={64} height={14} rx={5} fill={theme.fill.secondary} opacity={i === tab ? swap : i === prev ? 1 - swap : 0} />
        </g>
      ))}
      <rect x={12} y={28} width={VW - 24} height={16} rx={8} fill={theme.fill.secondary} />
      <rect x={22} y={34} width={(URL_W[prev] ?? 96) + ((URL_W[tab] ?? 96) - (URL_W[prev] ?? 96)) * swap} height={4} rx={2} fill={theme.text.tertiary} opacity={0.6} />
      <rect x={12} y={44} width={Math.max(0.01, (VW - 24) * load)} height={2} rx={1} fill={c0} opacity={bar} />
      {blocks.map((b: { x: number; y: number; w: number; h: number }, i: number) => (
        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={8} fill={i === 0 ? c[tab] ?? c0 : theme.fill.secondary} opacity={(i === 0 ? 0.8 : 1) * show * smooth(ph, 0.3 + i * 0.04, 0.46 + i * 0.04)} />
      ))}
    </svg>
  );
}

// One loop: four tasks tick off one by one at a steady pace, hold, then all clear together and start again.
// Rows never move, mount or unmount; only the check fill, tick and line shade change.
const TASK_LINES = [150, 108, 132, 86];
const TASK_CYCLE = 7.2;
function TasksViz(props: { t: number }) {
  const theme = useGrokTheme();
  const c0 = theme.dataviz.categorical[0] ?? theme.text.primary;
  const ph = (props.t % TASK_CYCLE) / TASK_CYCLE;
  const clear = 1 - smooth(ph, 0.86, 0.97);
  const ticks = TASK_LINES.map((_: number, i: number) => smooth(ph, 0.06 + i * 0.17, 0.16 + i * 0.17) * clear);
  const doneCount = ticks.reduce((a: number, k: number) => a + k, 0);
  return (
    <svg width="100%" height="100%" viewBox={"0 0 " + VW + " " + VH} preserveAspectRatio="xMidYMid meet" role="img" aria-label="A checklist ticking off one task after another">
      <rect x={4} y={4} width={VW - 8} height={VH - 8} rx={12} fill={theme.bg.base} stroke={theme.border.default} />
      <rect x={16} y={16} width={VW - 32} height={6} rx={3} fill={theme.fill.secondary} />
      <rect x={16} y={16} width={Math.max(0.01, ((VW - 32) * doneCount) / TASK_LINES.length)} height={6} rx={3} fill={c0} opacity={0.7} />
      {TASK_LINES.map((w: number, i: number) => {
        const y = 46 + i * 26;
        const k = ticks[i] ?? 0;
        return (
          <g key={i}>
            <circle cx={26} cy={y} r={8} fill={theme.bg.base} stroke={theme.border.strong} strokeWidth={1.5} />
            <circle cx={26} cy={y} r={8.75} fill={c0} opacity={k} />
            <path d={"M22 " + y + " l3 3 l6 -6"} fill="none" stroke={theme.bg.base} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={14} strokeDashoffset={(14 * (1 - k)).toFixed(2)} opacity={Math.min(1, k * 3)} />
            <rect x={44} y={y - 3} width={w} height={6} rx={3} fill={theme.text.secondary} opacity={0.9 - 0.5 * k} />
          </g>
        );
      })}
    </svg>
  );
}

// Settled frames for reduced motion: the window open with its button pressed, a loaded page, every task done.
const STILL_T: { [k: string]: number } = { computer: PC_CYCLE * 0.72, browser: WEB_CYCLE * 0.7, tasks: TASK_CYCLE * 0.8 };

type BeyondTile = { n: number; label: string; sub: string; kind: string };
// From audit.jsonl: sessions where a bot drove its own desktop, pages its browser loaded, and commands it ran on
// its own computer. Zero counts are left out.
const BEYOND: BeyondTile[] = [
  { n: num(DATA.beyond?.computerUse), label: "Times a bot used its own computer", sub: "Clicking and typing in apps for you", kind: "computer" },
  { n: num(DATA.beyond?.browserPages), label: "Web pages your bots read for you", sub: "Opened and read so you didn't have to", kind: "browser" },
  { n: num(DATA.beyond?.tasks), label: "Tasks your bots ran on their own computer", sub: "Quiet work behind the scenes", kind: "tasks" },
].filter((b: BeyondTile) => b.n > 0);

function BeyondTiles() {
  const theme = useGrokTheme();
  const still = useStill();
  const t = useClock();
  const f = theme.font.family;
  return (
    <div style={{ width: "100%", aspectRatio: BEYOND.length >= 3 ? "1 / 1" : BEYOND.length === 2 ? "3 / 2" : "3 / 1", display: "grid", gridTemplateRows: "repeat(" + Math.max(1, BEYOND.length) + ", minmax(0, 1fr))", gap: 12 }}>
      {BEYOND.map((tl: BeyondTile, i: number) => {
        const lt = Math.max(0, t - i * 0.15);
        const e = still ? 1 : ease(lt / 0.6);
        const cnt = still ? 1 : ease(lt / 1.6);
        const vt = still ? STILL_T[tl.kind] ?? 0 : lt;
        return (
          <div
            key={tl.kind}
            style={{
              border: "1px solid " + theme.border.default,
              borderRadius: theme.radius.xl,
              padding: 16,
              background: theme.bg.base,
              display: "grid",
              gridTemplateColumns: "minmax(0, 2fr) minmax(0, 3fr)",
              alignItems: "center",
              gap: 16,
              minHeight: 0,
              overflow: "hidden",
              opacity: e,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, paddingLeft: 8 }}>
              <div style={{ fontFamily: f, fontSize: theme.font.metric.fontSize, lineHeight: theme.font.metric.lineHeight, color: theme.text.primary, fontWeight: theme.weight.semibold, fontVariantNumeric: "tabular-nums" }}>
                {fmtInt(tl.n * cnt)}
              </div>
              <div style={{ fontFamily: f, fontSize: theme.font.body1.fontSize, fontWeight: theme.weight.semibold, color: theme.text.primary }}>{tl.label}</div>
              <div style={{ fontFamily: f, fontSize: theme.font.label.fontSize, color: theme.text.tertiary }}>{tl.sub}</div>
            </div>
            <div style={{ position: "relative", height: "100%", minHeight: 0 }}>
              <div style={{ position: "absolute", inset: 0 }}>
                {tl.kind === "computer" ? <ComputerViz t={vt} /> : tl.kind === "browser" ? <BrowserViz t={vt} /> : <TasksViz t={vt} />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// The build-up: the user's biggest counts, one beat at a time, then the archetype and its bot.
const BUILD_UP: string[] = [
  { n: num(T.bots), one: "bot", many: "bots" },
  { n: CONNECTOR_COUNT, one: "app", many: "apps" },
  { n: num(T.routines), one: "routine", many: "routines" },
]
  .filter((q: { n: number }) => q.n > 0)
  .map((q: { n: number; one: string; many: string }) => plural(q.n, q.one, q.many) + ".");
const BUILD = BUILD_UP.length > 0 ? BUILD_UP : [plural(TOTAL_MSGS, "message", "messages") + "."];
const REVEAL_AT = 0.5 + BUILD.length * 0.55 + 0.9;
const REVEAL_DONE = REVEAL_AT + 3.2;

function Reveal() {
  const theme = useGrokTheme();
  const still = useStill();
  const rim = useRim();
  const clock = useClock(REVEAL_DONE);
  const t = still ? REVEAL_DONE : clock;
  const f = theme.font.family;
  // Fade and rise; with reduced motion everything is simply shown.
  const rise = (delay: number, dist: number) => {
    const k = ease((t - delay) / 0.6);
    return { opacity: k, transform: "translateY(" + ((1 - k) * dist).toFixed(1) + "px)" };
  };
  const botIn = popIn((t - REVEAL_AT) / 0.8);
  const settle = clamp01((t - REVEAL_AT - 0.8) / 1.6);
  const sway = still ? 0 : Math.sin((t - REVEAL_AT) * 3) * 4 * (1 - settle) * (botIn > 0 ? 1 : 0);
  const look = ARCH_LOOKS[ARCH.primary.name] ?? ARCH_LOOKS["Bot Explorer"];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8, padding: "28px 0 12px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: 14, rowGap: 4, minHeight: 34 }}>
        {BUILD.map((b: string, i: number) => (
          <span key={b} style={{ ...rise(0.5 + i * 0.55, 10), fontFamily: f, fontSize: 26, lineHeight: "34px", fontWeight: theme.weight.semibold, color: theme.text.primary, display: "inline-block" }}>
            {b}
          </span>
        ))}
      </div>
      <div style={{ ...rise(0.5 + BUILD.length * 0.55, 8), fontFamily: f, fontSize: theme.font.body1.fontSize, color: theme.text.secondary }}>That makes you...</div>
      <div style={{ width: 240, height: 240, marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img
          src={ARCH_AV}
          alt={"The " + ARCH.primary.name + " bot: " + look.about}
          width={240}
          height={240}
          style={{ display: "block", width: 240, height: 240, opacity: clamp01(botIn * 2), transform: "scale(" + Math.max(0.001, botIn).toFixed(3) + ") rotate(" + sway.toFixed(2) + "deg)", ...rim }}
        />
      </div>
      <div style={{ ...rise(REVEAL_AT + 0.35, 12), fontFamily: f, fontSize: 64, lineHeight: 1.05, fontWeight: 800, letterSpacing: -2, color: theme.text.primary }}>{ARCH.primary.name}</div>
      <div style={{ ...rise(REVEAL_AT + 0.7, 8), fontFamily: f, fontSize: theme.font.body1.fontSize, color: theme.text.secondary }}>{ARCH.primary.reason}</div>
      {ARCH.secondary ? (
        <div style={{ ...rise(REVEAL_AT + 1.4, 6), display: "flex", alignItems: "center", gap: 8, marginTop: 20, padding: "6px 14px 6px 8px", border: "1px solid " + theme.border.default, borderRadius: theme.radius.full }}>
          <img src={ARCH2_AV} alt={"The " + ARCH.secondary.name + " bot"} width={32} height={32} style={{ display: "block", width: 32, height: 32, ...rim }} />
          <span style={{ fontFamily: f, fontSize: theme.font.label.fontSize, color: theme.text.secondary }}>
            {"With a side of "}
            <span style={{ fontWeight: theme.weight.semibold, color: theme.text.primary }}>{ARCH.secondary.name}</span>
            {": " + ARCH.secondary.reason}
          </span>
        </div>
      ) : null}
    </div>
  );
}

// Published bots as a showcase: each card rises in once; with reduced motion they are simply shown.
function Showcase() {
  const theme = useGrokTheme();
  const t = useClock(3);
  const still = useStill();
  const rim = useRim();
  const f = theme.font.family;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16, alignItems: "stretch" }}>
      {published.map((b: PublishedBot & { av: string }, i: number) => {
        const e = still ? 1 : ease((t - 0.15 - i * 0.18) / 0.7);
        const pop = still ? 1 : ease((t - 0.3 - i * 0.18) / 0.8);
        const url = b.url;
        return (
          <div
            key={b.name + i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 10,
              padding: "28px 20px 22px",
              boxSizing: "border-box",
              borderRadius: theme.radius.xl,
              background: theme.bg.base,
              border: "1px solid " + theme.border.default,
              opacity: e,
              transform: "translateY(" + (1 - e) * 16 + "px)",
            }}
          >
            <div style={{ width: 120, height: 120, borderRadius: theme.radius.full, background: theme.fill.secondary, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
              <img src={b.av} alt={b.name + " avatar"} width={104} height={104} style={{ display: "block", width: 104, height: 104, transform: "scale(" + (0.8 + 0.2 * pop) + ")", ...rim }} />
            </div>
            <div style={{ fontFamily: f, fontSize: theme.font.heading3.fontSize, lineHeight: theme.font.heading3.lineHeight, fontWeight: theme.weight.semibold, color: theme.text.primary }}>{b.name}</div>
            {b.tag ? <div style={{ fontFamily: f, fontSize: theme.font.body2.fontSize, color: theme.text.secondary, lineHeight: 1.35 }}>{b.tag}</div> : null}
            <div style={{ flex: 1 }} />
            <div style={{ fontFamily: f, fontSize: theme.font.caption.fontSize, color: theme.text.tertiary }}>{"Shipped " + b.date}</div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: f,
                fontSize: theme.font.label.fontSize,
                fontWeight: theme.weight.semibold,
                color: theme.text.primary,
                textDecoration: "none",
                border: "1px solid " + theme.border.strong,
                borderRadius: theme.radius.full,
                padding: "6px 16px",
              }}
            >
              Install
            </a>
          </div>
        );
      })}
    </div>
  );
}

// Messages sent per day in the user's timezone, first to last active day. Same store.db entries as the hourly counts.
const daily: number[] = ZONES[0]?.daily ?? [];
const CARD = 1080;

// 0 = no messages, 1 = 1 to 9, 2 = 10 to 29, 3 = 30 to 49, 4 = 50 or more.
function dayLevel(v: number): number {
  const n = num(v);
  if (n <= 0) return 0;
  if (n < 10) return 1;
  if (n < 30) return 2;
  if (n < 50) return 3;
  return 4;
}

function pop(p: number): number {
  const x = clamp01(p);
  const s = 1.7;
  return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
}

// Avatars in the corners of the card: the user's four most-messaged bots, settled transform in data-tf for export.
const POSTER_SLOTS = [
  { x: 132, y: 128, s: 116, r: -12 },
  { x: 952, y: 132, s: 104, r: 14 },
  { x: 118, y: 954, s: 104, r: 10 },
  { x: 964, y: 950, s: 116, r: -8 },
];
const POSTER_AVS = POSTER_SLOTS.slice(0, crew.length).map((q: { x: number; y: number; s: number; r: number }, i: number) => ({ ...q, k: crew[i].key, href: crew[i].av }));

// Organic brand shapes: avatar silhouettes, washed out behind the card.
const POSTER_BLOBS = [
  { d: SHAPES.blob, x: 600, y: -190, s: 4.4, r: 18, c: 0, o: 0.09 },
  { d: SHAPES.pebble, x: -300, y: 560, s: 3.6, r: -24, c: 1, o: 0.08 },
  { d: SHAPES.squircle, x: 250, y: 260, s: 3.4, r: 34, c: 2, o: 0.05 },
];

// Routines: enabled routines across the user's bots, from each bot's automations/*/automation.json.
const ROUTINE_COUNT = num(T.routines);

// Up to four big stats, the first nonzero ones in this order, in reading order: left to right, top to bottom.
const STAT_PICKS = [
  { v: num(T.bots), l: "Bots" },
  { v: CONNECTOR_COUNT, l: "Connectors" },
  { v: ROUTINE_COUNT, l: "Routines" },
  { v: num(T.streak), l: "Day streak" },
].filter((q: { v: number; l: string }) => q.v > 0).slice(0, 4);
// Exactly these four on the card: Bots, Connectors, Routines, Day streak (zeros dropped).
// One row along the bottom, under the archetype's bot.
const STAT_SPOTS: { x: number; y: number }[][] = [
  [],
  [{ x: 540, y: 810 }],
  [{ x: 360, y: 810 }, { x: 720, y: 810 }],
  [{ x: 220, y: 810 }, { x: 540, y: 810 }, { x: 860, y: 810 }],
  [{ x: 150, y: 810 }, { x: 410, y: 810 }, { x: 670, y: 810 }, { x: 930, y: 810 }],
];
const POSTER_STATS = STAT_PICKS.map((q: { v: number; l: string }, i: number) => ({ ...q, ...STAT_SPOTS[STAT_PICKS.length][i] }));
const POSTER_LABEL =
  POSS + " Grok Bot card: " + [ARCH.primary.name, ARCH.primary.reason].concat(POSTER_STATS.map((q: { v: number; l: string }) => fmtInt(q.v) + " " + q.l.toLowerCase())).join(", ");

// Headline size: as big as fits between the corner avatars.
const ARCH_FS = Math.min(108, Math.round(1300 / Math.max(1, ARCH.primary.name.length)));

// The archetype's bot sits in the middle of the card, between the headline and the row of stats.
const ARCH_S = 330;
const ARCH_TF = "translate(540 480)";

// Every grow-in on the card has settled by this time (seconds).
const POSTER_DONE = 3.4;

function Poster(props: { svgRef: { current: SVGSVGElement | null }; png: string; pngLook: string; onPng: (url: string, look: string) => void }) {
  const theme = useGrokTheme();
  const t = useClock(POSTER_DONE);
  const done = t >= POSTER_DONE;
  const { svgRef, png, pngLook, onPng } = props;
  const f = theme.font.family;
  // The card follows the viewer's theme: page surface, primary ink, secondary labels.
  const dark = theme.kind === "dark";
  const paper = theme.bg.base;
  const ink = theme.text.primary;
  const soft = theme.text.secondary;
  // Shadow ink is the dark token in both modes: primary text in light, the ink on the solid fill in dark.
  const shade = dark ? theme.text.onPrimary : theme.text.primary;
  const cat = theme.dataviz.categorical;
  const rimUrl = useRimUrl("rim-card");
  // Which look the PNG was made for. A theme switch changes it, so the overlay is redrawn to match.
  const look = [theme.kind, paper, ink, soft, theme.border.strong].concat(cat).join("|");
  const fresh = png !== "" && pngLook === look;

  // Once the art has finished growing in, render the PNG from the card as drawn now and lay it over the card,
  // so right-click or long-press saves what the viewer sees. Runs again whenever the theme changes.
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
  const mkX = 446;
  const mkTf = "translate(" + mkX + " 1000)";

  // Hover: lift, grow a touch, tilt and deepen the shadow. With reduced motion only the shadow changes.
  const [hover, setHover] = useState<boolean>(false);
  const still = useStill();
  // A dark page needs a deeper shadow to show at all.
  const tint = (pct: number) => "color-mix(in srgb, " + shade + " " + Math.min(100, pct * (dark ? 2.4 : 1)) + "%, transparent)";
  const shadow = hover
    ? "0 28px 56px -18px " + tint(32) + ", 0 10px 22px -10px " + tint(18)
    : "0 14px 34px -16px " + tint(24) + ", 0 4px 10px -6px " + tint(12);
  const lift = hover && !still ? "translateY(-8px) scale(1.02) rotate(-0.8deg)" : "none";
  const ease = "cubic-bezier(0.2, 0.8, 0.2, 1)";

  return (
    <div
      data-card="wrap"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%",
        aspectRatio: "1 / 1",
        margin: "12px auto 0",
        borderRadius: theme.radius.xl,
        overflow: "hidden",
        border: "1px solid " + (hover && dark ? theme.border.strong : theme.border.default),
        background: paper,
        position: "relative",
        boxShadow: shadow,
        transform: lift,
        transition: still ? "box-shadow 200ms ease, border-color 200ms ease" : "transform 360ms " + ease + ", box-shadow 360ms " + ease + ", border-color 360ms " + ease,
        willChange: "transform",
      }}
    >
      <svg ref={props.svgRef} xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox={"0 0 " + CARD + " " + CARD} preserveAspectRatio="xMidYMid meet" role="img" aria-label={POSTER_LABEL}>
        <RimDef id="rim-card" r={3} />
        <rect x={0} y={0} width={CARD} height={CARD} fill={paper} />

        {POSTER_BLOBS.map((b: { d: string; x: number; y: number; s: number; r: number; c: number; o: number }, i: number) => (
          <path key={"b" + i} d={b.d} transform={"translate(" + b.x + " " + b.y + ") rotate(" + b.r + " 84 84) scale(" + b.s + ")"} fill={cat[b.c] ?? ink} opacity={b.o * (dark ? 1.6 : 1)} />
        ))}

        <g opacity={hero} data-o={1}>
          <text x={CARD / 2} y={122} textAnchor="middle" fill={soft} style={{ fontFamily: f, fontSize: 40, fontWeight: theme.weight.semibold }}>{TITLE}</text>
          <text x={CARD / 2} y={226} textAnchor="middle" fill={ink} style={{ fontFamily: f, fontSize: ARCH_FS, fontWeight: 800, letterSpacing: -3 }}>{ARCH.primary.name}</text>
          <text x={CARD / 2} y={288} textAnchor="middle" fill={soft} style={{ fontFamily: f, fontSize: 36, fontWeight: theme.weight.medium }}>{ARCH.primary.reason}</text>
        </g>

        {POSTER_STATS.map((s: { v: number; l: string; x: number; y: number }, i: number) => {
          const start = 0.5 + i * 0.22;
          const e = popIn((t - start) / 0.7);
          const n = done ? s.v : Math.round(s.v * clamp01((t - start) / 1.1));
          const fin = "translate(" + s.x + " " + s.y + ")";
          return (
            <g key={s.l} data-tf={fin} transform={fin + " scale(" + e + ")"}>
              <text x={0} y={0} textAnchor="middle" fill={ink} style={{ fontFamily: f, fontSize: 130, fontWeight: 800, letterSpacing: -4 }}>{String(n)}</text>
              <text x={0} y={54} textAnchor="middle" fill={soft} style={{ fontFamily: f, fontSize: 36, fontWeight: theme.weight.semibold }}>{s.l}</text>
            </g>
          );
        })}

        {POSTER_AVS.map((a: { k: string; href: string; x: number; y: number; s: number; r: number }, i: number) => {
          const href = a.href;
          if (!href) return null;
          const e = popIn((t - 0.8 - i * 0.12) / 0.6);
          const wob = (1 - clamp01((t - 1.2 - i * 0.12) / 1.6)) * Math.sin(t * 6 + i) * 8;
          const fin = "translate(" + a.x + " " + a.y + ") rotate(" + a.r + ")";
          return (
            <g key={a.k} data-tf={fin} transform={"translate(" + a.x + " " + a.y + ") rotate(" + (a.r + wob) + ") scale(" + e + ")"}>
              <image href={href} x={-a.s / 2} y={-a.s / 2} width={a.s} height={a.s} filter={rimUrl} />
            </g>
          );
        })}

        <g data-tf={ARCH_TF} transform={ARCH_TF + " scale(" + popIn((t - 1.2) / 0.7) + ")"}>
          <image href={ARCH_AV} x={-ARCH_S / 2} y={-ARCH_S / 2} width={ARCH_S} height={ARCH_S} filter={rimUrl} />
        </g>

        <g data-tf={mkTf} transform={mkTf + " scale(" + mk + ")"}>
          <image href={AV.grok} x={-44} y={-44} width={88} height={88} filter={rimUrl} />
        </g>
        <text x={mkX + 54} y={1016} fill={ink} opacity={mk > 0 ? 1 : 0} data-o={1} style={{ fontFamily: f, fontSize: 46, fontWeight: theme.weight.semibold, letterSpacing: -0.5 }}>Grok Bot</text>
      </svg>
      {fresh ? (
        // Same box as the SVG and the same finished card, so it is invisible to the eye but is what the browser saves or copies.
        <img
          src={png}
          alt={TITLE + " card, 1080 by 1080 PNG"}
          data-overlay="card-png"
          style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", display: "block", margin: 0, padding: 0, border: "none", opacity: 0 }}
        />
      ) : null}
    </div>
  );
}

// A clear chip under the card. It nudges up once when the step opens; with reduced motion it stays put.
function PosterHint() {
  const theme = useGrokTheme();
  const t = useClock(1.6);
  const still = useStill();
  const k = still ? 0 : Math.sin(Math.PI * clamp01((t - 0.7) / 0.6));
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 18px",
          borderRadius: theme.radius.full,
          background: theme.fill.secondary,
          border: "1px solid " + theme.border.subtle,
          color: theme.text.primary,
          fontFamily: theme.font.family,
          fontSize: theme.font.body1.fontSize,
          fontWeight: theme.weight.semibold,
          transform: "translateY(" + (-6 * k).toFixed(2) + "px)",
        }}
      >
        <svg width={20} height={22} viewBox="0 0 20 22" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
          <rect x={3.5} y={1.5} width={13} height={19} rx={6.5} fill="none" stroke={theme.text.primary} strokeWidth={1.6} />
          <path d="M10 2.3 A5.7 5.7 0 0 1 15.7 8 V9 H10 Z" fill={theme.text.primary} />
          <line x1={10} y1={1.5} x2={10} y2={9} stroke={theme.text.primary} strokeWidth={1.6} />
          <line x1={3.5} y1={9} x2={16.5} y2={9} stroke={theme.text.primary} strokeWidth={1.6} />
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
      // Bake in the theme as resolved right now, so the PNG matches what the viewer sees in light or dark mode.
      const src = Array.from(svg.querySelectorAll("*"));
      const dst = Array.from(clone.querySelectorAll("*"));
      src.map((el: Element, i: number) => {
        const out = dst[i];
        if (!out) return el;
        const cs = window.getComputedStyle(el);
        const fill = cs.getPropertyValue("fill");
        const stroke = cs.getPropertyValue("stroke");
        const flood = cs.getPropertyValue("flood-color");
        if (el.hasAttribute("fill") && fill) out.setAttribute("fill", fill);
        if (el.hasAttribute("stroke") && stroke) out.setAttribute("stroke", stroke);
        if (el.hasAttribute("flood-color") && flood) out.setAttribute("flood-color", flood);
        return el;
      });
      // Export the finished card even while it is still animating in.
      Array.from(clone.querySelectorAll("[data-r]")).map((el: Element) => {
        el.setAttribute("r", el.getAttribute("data-r") ?? "0");
        return el;
      });
      Array.from(clone.querySelectorAll("[data-o]")).map((el: Element) => {
        el.setAttribute("opacity", el.getAttribute("data-o") ?? "1");
        return el;
      });
      Array.from(clone.querySelectorAll("[data-tf]")).map((el: Element) => {
        el.setAttribute("transform", el.getAttribute("data-tf") ?? "");
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
  const key = STEPS[cur].key;

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
      } else if (e.key === "Home") {
        setStep(0);
      } else if (e.key === "End") {
        setStep(last);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last]);

  return (
    <Page
      title={TITLE}
      width="column"
    >
      <Section
        id="profile"
        heading={STEPS[cur].title}
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
