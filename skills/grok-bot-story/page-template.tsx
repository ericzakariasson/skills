import {
  Page,
  Section,
  Button,
  Fragment,
  useGrokTheme,
  useState,
  useEffect,
  useRef,
} from "grok/canvas";


// Grok Bot story Page template. Every user-specific value lives in DATA, which collect.py writes in the shape of
// the Data type below (see data-contract.md). To build a Page: run collect.py, paste its JSON over the DATA value
// (or run collect.py --tsx), then WriteCanvas the result. Nothing below DATA should need editing.

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
  beyond: { computerUse: number; browserPages: number; shell: number };
  published: PublishedBot[];
  sources?: { [k: string]: unknown };
};

// DATA:BEGIN
const DATA: Data = {
  user: { name: "You" },
  timezone: { id: "UTC", label: "UTC" },
  window: null,
  zone: null,
  totals: { messages: 0, bots: 0, activeDays: 0, streak: 0, skills: 0, pages: null, routines: 0, connectors: 0 },
  crew: [],
  connectors: [],
  beyond: { computerUse: 0, browserPages: 0, shell: 0 },
  published: [],
};
// DATA:END

const T = DATA.totals;
const NAME = (DATA.user.name || "").trim() || "You";
const IS_YOU = NAME === "You";
const TITLE = NAME + " on Grok Bot";
const POSS = IS_YOU ? "Your" : NAME + "'s";
const WINDOW = DATA.window ? DATA.window.label : "";
const ZONE: ZoneData | null = DATA.zone ?? null;
const TOTAL_MSGS = num(T.messages);
const plural = (n: number, one: string, many: string) => fmtInt(n) + " " + (n === 1 ? one : many);

const W = 700;
const H = 340;
// Bot avatars traced from the Grok Bot app's avatar picker: one body and one pair of white eyes per shape at
// 168 by 168, filled with the picker's swatch colors. Colors appear only inside these data:image SVG strings.
const AV_HEAD = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 168 168'%3E";
const SHAPES: { [k: string]: string } = {
  circle: "M75 149C69 149 64 147 58 145C53 142 48 139 44 136C39 133 35 129 31 124C28 119 25 114 23 109C21 104 19 98 19 92C18 87 18 81 19 75C19 69 21 64 23 58C26 53 29 48 32 44C35 39 39 35 44 31C49 28 54 25 59 23C64 21 70 19 76 19C81 18 87 18 93 19C99 19 104 21 110 23C115 26 120 29 124 32C129 35 133 39 137 44C140 49 143 54 145 59C147 64 149 70 149 76C150 81 150 87 149 93C149 99 147 104 145 110C142 115 139 120 136 124C133 129 129 133 124 137C119 140 114 143 109 145C104 147 98 149 92 149C87 150 81 150 75 149Z",
  blob: "M47 145C42 144 36 142 31 139C26 136 22 131 19 126C17 121 15 115 15 109C14 104 17 98 17 92C18 87 16 81 16 75C16 69 17 63 19 58C21 53 24 47 28 43C31 39 36 35 42 32C47 30 53 28 58 27C64 26 70 28 76 28C81 27 87 25 93 25C98 25 104 26 109 28C114 31 118 36 123 40C127 43 131 48 135 52C139 56 144 59 147 64C150 69 153 75 153 80C154 86 153 92 151 97C149 103 146 108 142 112C138 116 133 119 128 123C124 126 119 129 114 132C109 135 104 139 99 141C93 143 87 144 82 144C76 144 70 142 64 143C59 143 53 145 47 145Z",
  squircle: "M60 148C55 147 51 141 48 136C45 132 43 126 40 120C38 115 35 110 33 104C30 99 28 94 25 88C23 83 19 78 17 72C15 67 12 61 13 56C14 51 19 45 23 42C28 39 34 37 40 36C45 34 51 32 57 31C62 29 68 28 74 26C80 24 85 22 91 21C97 20 103 18 108 20C113 21 117 27 120 32C123 36 125 42 128 48C130 53 133 58 135 64C138 69 140 74 143 80C145 85 149 90 151 96C153 101 156 107 155 112C154 117 149 123 145 126C140 129 134 131 128 132C123 134 117 136 111 137C106 139 100 140 94 142C88 144 83 146 77 147C71 148 65 150 60 148Z",
  star: "M89 163C84 163 77 158 72 154C68 150 65 143 61 138C57 132 55 126 50 122C45 118 37 118 31 116C25 113 18 110 14 106C10 101 5 95 5 89C5 84 10 77 13 72C17 67 23 62 28 58C33 54 39 51 42 46C46 41 46 33 49 28C52 22 56 16 61 12C66 8 73 4 78 5C84 5 91 10 95 14C100 18 103 25 107 30C111 36 113 42 118 46C123 50 131 50 137 52C143 55 149 58 154 62C158 66 163 73 163 79C163 84 158 91 155 96C151 101 145 105 140 110C135 114 129 117 126 122C122 127 122 135 119 140C116 146 112 152 107 156C102 160 95 164 89 163Z",
  cloud: "M72 148C67 147 61 145 56 142C51 139 47 135 44 130C40 125 39 119 37 114C35 109 34 104 31 99C29 94 23 90 21 85C18 80 16 74 16 69C16 63 18 57 21 52C23 47 28 42 32 39C36 35 42 33 47 31C53 30 59 32 64 31C70 29 74 25 79 23C84 21 90 20 96 20C101 21 107 23 112 26C117 29 121 33 124 38C128 43 129 49 131 54C133 59 134 64 137 69C139 74 144 78 147 83C150 88 152 94 152 99C152 105 150 111 147 116C145 121 140 126 136 129C132 133 126 135 121 137C115 138 109 136 104 137C98 139 94 143 89 145C84 147 78 148 72 148Z",
  pebble: "M96 146C91 146 85 143 80 140C75 138 70 135 65 133C60 130 55 128 50 125C45 122 39 120 35 117C30 113 26 109 24 104C21 99 18 94 17 88C16 83 16 77 17 71C18 66 21 60 24 56C27 51 31 47 36 44C40 41 46 38 51 37C57 35 62 35 68 34C73 33 78 32 83 30C89 28 94 24 99 23C105 22 111 23 116 24C121 25 127 27 132 30C137 33 141 37 144 41C148 45 151 51 152 56C153 61 154 67 153 73C152 78 150 84 148 89C146 94 143 100 141 105C139 110 137 116 135 121C133 126 130 131 126 135C123 139 118 143 113 145C108 147 101 147 96 146Z",
  flower: "M96 152C90 151 85 146 79 144C74 142 69 142 64 141C59 140 52 141 47 138C42 135 37 130 35 124C32 119 34 112 32 107C30 102 24 99 21 95C18 90 14 84 14 78C14 72 16 66 19 61C22 56 28 52 32 47C36 43 38 37 42 32C46 28 50 22 55 20C60 17 67 15 72 16C78 17 83 22 89 24C94 26 99 26 104 27C109 28 116 27 121 30C126 33 131 38 133 44C136 49 134 56 136 61C138 66 144 69 147 73C150 78 154 84 154 90C154 96 152 102 149 107C146 112 140 116 136 121C132 125 130 131 126 136C122 140 118 146 113 148C108 151 101 153 96 152Z",
  teardrop: "M79 154C74 153 68 152 63 150C57 148 52 145 48 141C43 138 39 134 36 129C32 125 29 120 27 114C25 109 24 103 23 98C23 92 23 86 24 81C25 75 27 70 28 64C30 58 31 53 33 47C34 42 35 36 38 31C40 26 44 21 48 18C53 16 60 16 65 17C70 18 76 21 81 23C86 25 92 28 97 30C102 32 108 34 113 37C118 40 122 43 127 46C131 50 135 55 138 60C141 64 143 70 144 75C146 81 147 87 147 92C147 98 146 104 144 109C143 115 141 120 138 125C135 130 131 134 127 138C122 142 117 145 112 148C107 150 102 152 96 153C91 154 85 154 79 154Z",
  tablet: "M54 140C48 139 43 137 38 134C33 132 28 128 24 124C21 120 17 115 15 110C13 104 12 99 12 93C11 87 12 82 13 76C15 71 18 66 21 61C24 56 28 52 33 49C37 46 43 44 48 42C53 40 59 39 64 37C70 35 75 34 81 32C86 31 92 29 97 28C103 28 109 27 114 28C120 29 125 31 130 34C135 36 140 40 144 44C147 48 151 53 153 58C155 64 156 69 156 75C157 81 156 86 155 92C153 97 150 102 147 107C144 112 140 116 135 119C131 122 125 124 120 126C115 128 109 129 104 131C98 133 93 134 87 136C82 137 76 139 71 140C65 140 59 141 54 140Z",
  wedge: "M34 156C29 154 22 151 19 146C16 141 15 134 14 128C14 122 15 115 15 109C15 103 16 96 17 90C17 84 18 78 18 71C19 65 20 58 20 52C21 46 22 39 24 33C26 28 28 21 32 17C37 13 44 11 49 11C55 10 62 14 67 16C73 18 78 22 84 25C89 29 95 32 100 36C105 39 110 43 116 46C121 49 127 53 132 56C137 60 143 63 147 68C151 72 155 78 156 84C156 90 154 96 151 102C148 107 143 112 138 116C134 120 128 124 123 127C118 131 112 134 107 137C101 140 95 143 90 145C84 148 78 150 72 152C66 154 59 155 53 156C47 157 40 158 34 156Z",
  house: "M52 152C48 150 44 145 40 140C37 135 35 130 32 124C30 119 27 114 24 109C22 103 19 98 17 93C16 87 15 81 16 75C16 70 20 65 23 59C25 54 28 49 31 44C34 39 37 33 40 29C44 25 49 20 54 19C59 17 65 19 71 20C76 21 82 24 87 26C93 29 98 30 104 33C109 35 114 38 119 41C123 45 126 50 129 55C132 60 135 66 137 71C140 76 142 82 145 87C147 92 151 97 152 103C153 108 152 114 150 119C147 124 142 128 137 130C132 133 126 134 120 136C115 138 109 139 103 141C98 142 92 144 86 145C81 147 75 149 69 150C64 151 57 153 52 152Z",
  splat: "M103 158C97 157 92 149 86 145C81 142 75 136 69 136C63 135 55 144 49 143C43 142 36 137 34 132C32 126 38 117 37 111C35 105 30 100 25 95C20 90 11 86 9 81C6 76 8 67 11 62C14 56 24 54 28 49C32 45 35 41 38 36C41 31 42 21 46 17C51 13 59 9 65 10C71 11 76 19 82 23C87 26 93 32 99 32C105 33 113 24 119 25C125 26 132 31 134 36C136 42 130 51 131 57C133 63 138 68 143 73C148 78 157 82 159 87C162 92 160 101 157 106C154 112 144 114 140 119C136 123 133 127 130 132C127 137 126 147 122 151C117 155 109 159 103 158Z",
  hex: "M97 150C91 150 86 147 80 146C74 145 69 143 63 142C58 140 52 139 47 136C43 133 39 128 36 123C33 119 31 113 28 108C25 103 23 98 21 92C18 87 15 81 15 76C15 71 19 65 21 61C24 56 28 51 32 47C36 42 39 38 43 33C47 29 50 24 55 21C60 19 65 18 71 18C77 18 82 21 88 22C94 23 99 25 105 26C110 28 116 29 121 32C125 35 129 40 132 45C135 49 137 55 140 60C143 65 145 70 147 76C150 81 153 87 153 92C153 97 149 103 147 107C144 112 140 117 136 121C132 126 129 130 125 135C121 139 118 144 113 147C108 149 103 150 97 150Z",
};
const SHAPE_EYES: { [k: string]: string } = {
  circle: "M93.6 77.8C92 77.2 90.4 75.7 89.2 74.4C88 73.1 87.2 71.3 86.2 69.8C85.2 68.3 84.1 66.8 83 65.2C81.9 63.6 80.6 62 79.6 60.4C78.6 58.8 77.3 57.3 77 55.6C76.7 53.9 76.9 51.8 77.8 50.4C78.7 49 80.6 47.7 82.2 47.2C83.8 46.7 85.9 46.7 87.6 47.2C89.3 47.7 90.8 49 92.2 50.2C93.6 51.4 94.6 53.1 95.8 54.6C97 56.1 98.2 57.6 99.2 59.2C100.2 60.8 101.2 62.3 102 64C102.8 65.7 103.8 67.4 104 69.2C104.2 71 103.8 73.1 103 74.6C102.2 76.1 100.6 77.5 99 78C97.4 78.5 95.2 78.4 93.6 77.8ZM127.8 62.6C126.4 62.3 125 61 123.8 59.8C122.6 58.6 121.7 57 120.8 55.6C119.9 54.2 119.3 52.6 118.4 51.2C117.5 49.8 116.4 48.4 115.4 47C114.4 45.6 113.4 44.2 112.4 42.8C111.4 41.4 110 40 109.6 38.6C109.2 37.2 109.3 35.2 110.2 34.4C111.1 33.6 113.3 33.5 114.8 33.8C116.3 34.1 118 35.2 119.4 36.2C120.8 37.2 121.9 38.5 123 39.8C124.1 41.1 125.2 42.4 126.2 43.8C127.2 45.2 128.1 46.5 129 48C129.9 49.5 130.7 51.1 131.4 52.6C132.1 54.1 133.1 55.7 133.2 57.2C133.3 58.7 132.9 60.9 132 61.8C131.1 62.7 129.2 62.9 127.8 62.6Z",
  blob: "M91.4 83.6C89.9 83.4 88.2 82.3 87 81.2C85.8 80.1 84.9 78.5 84 77C83.1 75.5 82.3 74 81.6 72.4C80.9 70.8 80.3 69.2 79.6 67.6C78.9 66 78 64.6 77.4 63C76.8 61.4 76 59.5 76.2 58C76.4 56.5 77.6 54.8 78.8 54C80 53.2 81.9 52.8 83.4 53C84.9 53.2 86.8 54.3 88 55.4C89.2 56.5 89.9 58.1 90.8 59.6C91.7 61.1 92.4 62.7 93.2 64.2C94 65.7 94.7 67.2 95.4 68.8C96.1 70.4 97.1 72 97.6 73.6C98.1 75.2 98.9 76.9 98.6 78.4C98.3 79.9 97.2 81.7 96 82.6C94.8 83.5 92.9 83.8 91.4 83.6ZM120.8 75.2C119.3 75 117.8 74 116.6 73C115.4 72 114.5 70.4 113.6 69C112.7 67.6 112 66.1 111.2 64.6C110.4 63.1 109.7 61.5 109 60C108.3 58.5 107.3 57.2 106.8 55.6C106.3 54 105.7 52.1 105.8 50.6C105.9 49.1 106.5 47.5 107.6 46.6C108.7 45.7 110.7 45.2 112.2 45.4C113.7 45.6 115.2 46.7 116.4 47.8C117.6 48.9 118.4 50.4 119.2 51.8C120 53.2 120.7 54.9 121.4 56.4C122.1 57.9 122.9 59.5 123.6 61C124.3 62.5 125.2 63.9 125.8 65.4C126.4 66.9 127.5 68.5 127.4 70C127.3 71.5 126.5 73.3 125.4 74.2C124.3 75.1 122.3 75.4 120.8 75.2Z",
  squircle: "M86.2 97.8C84.8 97.5 83.5 96.6 82.4 95.6C81.3 94.6 80.6 93 79.8 91.6C79 90.2 78.3 88.8 77.6 87.4C76.9 86 76.3 84.6 75.6 83.2C74.9 81.8 74.1 80.4 73.6 79C73.1 77.6 72.5 75.9 72.8 74.6C73.1 73.3 74.1 71.7 75.2 71C76.3 70.3 78.2 70.3 79.6 70.6C81 70.9 82.3 71.8 83.4 72.8C84.5 73.8 85.4 75.3 86.2 76.6C87 77.9 87.7 79.4 88.4 80.8C89.1 82.2 90 83.6 90.6 85C91.2 86.4 91.8 87.7 92.2 89.2C92.6 90.7 93.3 92.4 93 93.8C92.7 95.2 91.7 96.7 90.6 97.4C89.5 98.1 87.6 98.1 86.2 97.8ZM110 90.4C108.7 89.8 107.6 88.6 106.6 87.4C105.6 86.2 105 84.8 104.2 83.4C103.4 82 102.7 80.6 102 79.2C101.3 77.8 100.6 76.4 100 75C99.4 73.6 98.5 72.1 98.2 70.6C97.9 69.1 97.6 67.4 98.2 66.2C98.8 65 100.3 64 101.6 63.6C102.9 63.2 104.9 63.3 106.2 63.8C107.5 64.3 108.6 65.6 109.6 66.8C110.6 68 111.3 69.6 112 71C112.7 72.4 113.2 73.8 113.8 75.2C114.4 76.6 115.1 78 115.8 79.4C116.5 80.8 117.5 82.3 117.8 83.8C118.1 85.3 118.2 87 117.6 88.2C117 89.4 115.7 90.8 114.4 91.2C113.1 91.6 111.3 91 110 90.4Z",
  star: "M84.6 88.4C83.2 87.8 82 86.4 81 85.2C80 84 79.2 82.4 78.4 81C77.6 79.6 76.9 78.1 76.2 76.6C75.5 75.1 74.7 73.7 74 72.2C73.3 70.7 72.4 69.1 72 67.6C71.6 66.1 71.1 64.3 71.6 63C72.1 61.7 73.5 60.3 74.8 59.8C76.1 59.3 78 59.6 79.4 60.2C80.8 60.8 82.1 62 83.2 63.2C84.3 64.4 85 66 85.8 67.4C86.6 68.8 87.3 70.3 88 71.8C88.7 73.3 89.5 74.7 90.2 76.2C90.9 77.7 91.8 79.3 92.2 80.8C92.6 82.3 92.9 84.1 92.4 85.4C91.9 86.7 90.7 88.1 89.4 88.6C88.1 89.1 86 89 84.6 88.4ZM113 80.4C111.6 79.8 110.3 78.4 109.2 77.2C108.1 76 107.4 74.4 106.6 73C105.8 71.6 104.9 70.1 104.2 68.6C103.5 67.1 102.8 65.7 102.2 64.2C101.6 62.7 100.7 61.2 100.4 59.6C100.1 58 99.8 56.1 100.4 54.8C101 53.5 102.5 52 103.8 51.6C105.1 51.2 107 51.6 108.4 52.2C109.8 52.8 111.1 54 112.2 55.2C113.3 56.4 114 58 114.8 59.4C115.6 60.8 116.3 62.3 117 63.8C117.7 65.3 118.5 66.9 119.2 68.4C119.9 69.9 120.9 71.3 121.2 72.8C121.5 74.3 121.8 76.3 121.2 77.6C120.6 78.9 119.2 80.1 117.8 80.6C116.4 81.1 114.4 81 113 80.4Z",
  cloud: "M81.6 90C80.3 89.7 78.8 88.8 77.8 87.8C76.8 86.8 76.1 85.5 75.4 84.2C74.7 82.9 74.1 81.6 73.4 80.2C72.7 78.8 72 77.4 71.4 76C70.8 74.6 70.2 73.4 69.8 72C69.4 70.6 68.6 68.9 68.8 67.6C69 66.3 69.9 64.8 71 64.2C72.1 63.6 73.9 63.5 75.2 63.8C76.5 64.1 77.9 64.9 79 65.8C80.1 66.7 80.8 68.1 81.6 69.4C82.4 70.7 83 72 83.6 73.4C84.2 74.8 84.8 76.2 85.4 77.6C86 79 86.8 80.2 87.2 81.6C87.6 83 88.2 84.7 88 86C87.8 87.3 86.9 88.9 85.8 89.6C84.7 90.3 82.9 90.3 81.6 90ZM108.6 82C107.3 81.5 106.2 80.5 105.2 79.4C104.2 78.3 103.5 76.9 102.8 75.6C102.1 74.3 101.5 72.9 100.8 71.6C100.1 70.3 99.5 68.9 98.8 67.6C98.1 66.3 97.2 65 96.8 63.6C96.4 62.2 96.2 60.6 96.6 59.4C97 58.2 98.2 56.9 99.4 56.4C100.6 55.9 102.3 56 103.6 56.4C104.9 56.8 106 57.9 107 59C108 60.1 108.7 61.5 109.4 62.8C110.1 64.1 110.7 65.5 111.4 66.8C112.1 68.1 112.8 69.5 113.4 70.8C114 72.1 114.8 73.4 115.2 74.8C115.6 76.2 116 78 115.6 79.2C115.2 80.4 114 81.7 112.8 82.2C111.6 82.7 109.9 82.5 108.6 82Z",
  pebble: "M101 88C99.6 87.6 98.2 86.5 97.2 85.4C96.2 84.3 95.5 82.9 94.8 81.6C94.1 80.3 93.4 78.8 92.8 77.4C92.2 76 91.8 74.4 91.2 73C90.6 71.6 89.8 70.3 89.4 68.8C89 67.3 88.6 65.5 89 64.2C89.4 62.9 90.6 61.4 91.8 60.8C93 60.2 94.8 60.2 96.2 60.6C97.6 61 99 62 100 63C101 64 101.7 65.4 102.4 66.8C103.1 68.2 103.6 69.8 104.2 71.2C104.8 72.6 105.2 74 105.8 75.4C106.4 76.8 107.2 78.3 107.6 79.8C108 81.3 108.4 82.9 108 84.2C107.6 85.5 106.6 87.2 105.4 87.8C104.2 88.4 102.4 88.4 101 88ZM129 80C127.7 79.6 126.4 78.5 125.4 77.4C124.4 76.3 123.5 74.9 122.8 73.6C122.1 72.3 121.9 70.8 121.4 69.4C120.9 68 120.2 66.6 119.6 65.2C119 63.8 118.2 62.4 117.8 61C117.4 59.6 116.9 57.9 117.2 56.6C117.5 55.3 118.5 53.8 119.6 53.2C120.7 52.6 122.5 52.8 123.8 53.2C125.1 53.6 126.4 54.5 127.4 55.6C128.4 56.7 129 58.2 129.6 59.6C130.2 61 130.6 62.4 131.2 63.8C131.8 65.2 132.4 66.6 133 68C133.6 69.4 134.2 70.8 134.6 72.2C135 73.6 135.6 75.3 135.4 76.6C135.2 77.9 134.3 79.4 133.2 80C132.1 80.6 130.3 80.4 129 80Z",
  flower: "M89.4 96.2C88.1 95.6 87 94.4 86 93.2C85 92 84.4 90.6 83.6 89.2C82.8 87.8 82.1 86.4 81.4 85C80.7 83.6 79.9 82 79.2 80.6C78.5 79.2 77.6 77.9 77.2 76.4C76.8 74.9 76.5 73.1 77 71.8C77.5 70.5 78.9 69.2 80.2 68.8C81.5 68.4 83.4 68.6 84.8 69.2C86.2 69.8 87.4 71.1 88.4 72.2C89.4 73.3 90.2 74.7 91 76C91.8 77.3 92.5 78.8 93.2 80.2C93.9 81.6 94.6 83.1 95.2 84.6C95.8 86.1 96.5 87.5 96.8 89C97.1 90.5 97.7 92.3 97.2 93.6C96.7 94.9 95.3 96.2 94 96.6C92.7 97 90.7 96.8 89.4 96.2ZM114.6 89.6C113.2 89.2 111.9 88.2 110.8 87.2C109.7 86.2 108.6 84.7 107.8 83.4C107 82.1 106.5 80.6 105.8 79.2C105.1 77.8 104.4 76.3 103.8 74.8C103.2 73.3 102.4 71.9 102 70.4C101.6 68.9 101.1 67.1 101.4 65.8C101.7 64.5 102.8 63 104 62.4C105.2 61.8 107.2 61.6 108.6 62C110 62.4 111.2 63.7 112.2 64.8C113.2 65.9 114 67.4 114.8 68.8C115.6 70.2 116.3 71.6 117 73C117.7 74.4 118.2 76 118.8 77.4C119.4 78.8 120.3 80.1 120.8 81.6C121.3 83.1 122.1 84.9 121.8 86.2C121.5 87.5 120.4 89 119.2 89.6C118 90.2 116 90 114.6 89.6Z",
  teardrop: "M98.2 86C96.7 85.7 95.3 84.6 94.2 83.4C93.1 82.2 92.5 80.3 91.8 78.8C91.1 77.3 90.7 75.7 90 74.2C89.3 72.7 88.5 71.1 87.8 69.6C87.1 68.1 86.1 66.6 85.6 65C85.1 63.4 84.5 61.5 85 60.2C85.5 58.9 87 57.6 88.4 57C89.8 56.4 91.7 56.1 93.2 56.4C94.7 56.7 96.4 57.7 97.6 58.8C98.8 59.9 99.5 61.4 100.4 62.8C101.3 64.2 102 65.9 102.8 67.4C103.6 68.9 104.4 70.4 105 72C105.6 73.6 106.2 75.2 106.4 76.8C106.6 78.4 106.8 80.2 106.2 81.6C105.6 83 104.3 84.7 103 85.4C101.7 86.1 99.7 86.3 98.2 86ZM126.8 77.6C125.5 77.3 124.2 76.1 123.2 75C122.2 73.9 121.3 72.5 120.6 71.2C119.9 69.9 119.8 68.4 119.2 67C118.6 65.6 117.9 64.2 117.2 62.8C116.5 61.4 115.8 60 115.2 58.6C114.6 57.2 113.6 55.7 113.4 54.4C113.2 53.1 113.2 51.4 114 50.6C114.8 49.8 116.9 49.6 118.2 49.8C119.5 50 120.9 51 122 52C123.1 53 124 54.3 124.8 55.6C125.6 56.9 126.3 58.4 127 59.8C127.7 61.2 128.2 62.6 128.8 64C129.4 65.4 129.9 66.8 130.4 68.2C130.9 69.6 131.7 71.2 131.8 72.6C131.9 74 131.6 76 130.8 76.8C130 77.6 128.1 77.9 126.8 77.6Z",
  tablet: "M88.4 84.2C87 83.7 85.6 82.1 84.6 80.8C83.6 79.5 82.9 77.8 82.2 76.2C81.5 74.6 80.9 73 80.2 71.4C79.5 69.8 78.8 68.2 78 66.6C77.2 65 76 63.6 75.4 62C74.8 60.4 74 58.4 74.4 57C74.8 55.6 76.4 54.3 77.8 53.8C79.2 53.3 81.4 53.4 83 53.8C84.6 54.2 86.2 55.3 87.4 56.4C88.6 57.5 89.5 59.1 90.4 60.6C91.3 62.1 92 63.8 92.8 65.4C93.6 67 94.4 68.6 95 70.2C95.6 71.8 96.3 73.5 96.6 75.2C96.9 76.9 97.2 78.9 96.6 80.4C96 81.9 94.6 83.4 93.2 84C91.8 84.6 89.8 84.7 88.4 84.2ZM126.2 74C124.7 73.7 123.1 72.4 122 71.2C120.9 70 120.5 68.2 119.8 66.6C119.1 65 118.5 63.4 117.8 61.8C117.1 60.2 116.2 58.8 115.4 57.2C114.6 55.6 113.8 54 113.2 52.4C112.6 50.8 111.7 49 112 47.6C112.3 46.2 113.5 44.7 114.8 44C116.1 43.3 118.3 42.9 119.8 43.2C121.3 43.5 122.7 44.7 124 45.8C125.3 46.9 126.4 48.4 127.4 49.8C128.4 51.2 129 52.8 129.8 54.4C130.6 56 131.3 57.6 132 59.2C132.7 60.8 133.5 62.3 133.8 64C134.1 65.7 134.5 67.7 134 69.2C133.5 70.7 132.3 72.4 131 73.2C129.7 74 127.7 74.3 126.2 74Z",
  wedge: "M84.4 69.4C82.9 68.9 81.5 67.9 80.2 67C78.9 66.1 77.7 65.1 76.4 64C75.1 62.9 73.8 61.7 72.6 60.6C71.4 59.5 70.2 58.4 69.2 57.2C68.2 56 66.7 54.5 66.6 53.2C66.5 51.9 67.7 50.1 68.8 49.2C69.9 48.3 71.8 48 73.4 47.8C75 47.6 76.7 47.7 78.2 48.2C79.7 48.7 81.3 49.6 82.6 50.6C83.9 51.6 85 52.9 86.2 54C87.4 55.1 88.6 56.3 89.8 57.4C91 58.5 92.4 59.6 93.4 60.8C94.4 62 95.7 63.5 95.8 64.8C95.9 66.1 95.1 67.9 94 68.8C92.9 69.7 91 69.9 89.4 70C87.8 70.1 85.9 69.9 84.4 69.4ZM118.6 61.4C117.3 61.3 115.9 60.5 114.6 59.8C113.3 59.1 112 58.3 110.8 57.4C109.6 56.5 108.4 55.6 107.2 54.6C106 53.6 104.9 52.6 103.8 51.6C102.7 50.6 101.7 49.7 100.6 48.6C99.5 47.5 97.9 46.4 97.4 45.2C96.9 44 96.8 42.3 97.4 41.6C98 40.9 99.9 40.6 101.2 40.8C102.5 41 104.1 41.9 105.4 42.6C106.7 43.3 107.8 44.3 109 45.2C110.2 46.1 111.2 47.1 112.4 48C113.6 48.9 114.8 49.9 116 50.8C117.2 51.7 118.3 52.6 119.4 53.6C120.5 54.6 122.1 55.7 122.6 56.8C123.1 57.9 123.3 59.6 122.6 60.4C121.9 61.2 119.9 61.5 118.6 61.4Z",
  house: "M80.6 97.6C79.2 97.3 77.6 96.2 76.4 95.2C75.2 94.2 74.4 92.7 73.6 91.4C72.8 90.1 72.1 88.6 71.4 87.2C70.7 85.8 70.1 84.2 69.4 82.8C68.7 81.4 67.7 80.1 67.2 78.6C66.7 77.1 66.1 75.4 66.4 74C66.7 72.6 67.7 70.9 68.8 70.2C69.9 69.5 71.8 69.3 73.2 69.6C74.6 69.9 76.1 70.8 77.2 71.8C78.3 72.8 79 74.4 79.8 75.8C80.6 77.2 81.3 78.6 82 80C82.7 81.4 83.5 83 84.2 84.4C84.9 85.8 85.9 87.1 86.4 88.6C86.9 90.1 87.4 91.8 87.2 93.2C87 94.6 86.1 96.3 85 97C83.9 97.7 82 97.9 80.6 97.6ZM107.4 90C106 89.6 104.7 88.5 103.6 87.4C102.5 86.3 101.6 84.9 100.8 83.6C100 82.3 99.3 80.8 98.6 79.4C97.9 78 97.2 76.6 96.6 75.2C96 73.8 95.2 72.3 94.8 70.8C94.4 69.3 93.7 67.6 94 66.2C94.3 64.8 95.4 63.3 96.6 62.6C97.8 61.9 99.6 61.8 101 62.2C102.4 62.6 103.7 63.7 104.8 64.8C105.9 65.9 106.6 67.4 107.4 68.8C108.2 70.2 108.9 71.6 109.6 73C110.3 74.4 110.9 75.8 111.6 77.2C112.3 78.6 113.3 80.1 113.8 81.6C114.3 83.1 114.9 84.7 114.6 86C114.3 87.3 113.2 88.9 112 89.6C110.8 90.3 108.8 90.4 107.4 90Z",
  splat: "M86.4 99.4C85 98.9 83.8 97.6 82.8 96.4C81.8 95.2 81 93.8 80.2 92.4C79.4 91 78.5 89.5 77.8 88C77.1 86.5 76.4 84.9 75.8 83.4C75.2 81.9 74.3 80.3 74 78.8C73.7 77.3 73.3 75.5 73.8 74.2C74.3 72.9 75.7 71.3 77 70.8C78.3 70.3 80.2 70.8 81.6 71.4C83 72 84.5 73.1 85.6 74.2C86.7 75.3 87.4 76.8 88.2 78.2C89 79.6 89.5 81.3 90.2 82.8C90.9 84.3 91.6 85.7 92.2 87.2C92.8 88.7 93.6 90.2 94 91.8C94.4 93.4 94.9 95.3 94.4 96.6C93.9 97.9 92.5 99.1 91.2 99.6C89.9 100.1 87.8 99.9 86.4 99.4ZM116 91.4C114.6 91 112.9 90.1 111.8 89C110.7 87.9 110.2 86.2 109.4 84.8C108.6 83.4 107.9 81.8 107.2 80.4C106.5 79 105.7 77.7 105 76.2C104.3 74.7 103.4 73.1 103 71.6C102.6 70.1 102 68.4 102.4 67C102.8 65.6 104 64 105.2 63.4C106.4 62.8 108.2 62.8 109.6 63.2C111 63.6 112.3 64.7 113.4 65.8C114.5 66.9 115.2 68.6 116 70C116.8 71.4 117.5 72.8 118.2 74.2C118.9 75.6 119.7 77.1 120.4 78.6C121.1 80.1 121.9 81.5 122.4 83C122.9 84.5 123.5 86.2 123.2 87.6C122.9 89 121.6 90.6 120.4 91.2C119.2 91.8 117.4 91.8 116 91.4Z",
  hex: "M83.8 102C82.1 101.6 80.4 100.3 79 99C77.6 97.7 76.6 95.9 75.6 94.2C74.6 92.5 73.9 90.7 73 89C72.1 87.3 71.2 85.5 70.4 83.8C69.6 82.1 68.6 80.4 68 78.6C67.4 76.8 66.5 74.8 66.8 73.2C67.1 71.6 68.4 69.6 69.8 68.8C71.2 68 73.5 67.8 75.2 68.2C76.9 68.6 78.6 69.8 80 71C81.4 72.2 82.4 74 83.4 75.6C84.4 77.2 85.2 79.1 86 80.8C86.8 82.5 87.6 84.2 88.4 86C89.2 87.8 90.2 89.6 90.8 91.4C91.4 93.2 92.3 95.2 92 96.8C91.7 98.4 90.6 100.3 89.2 101.2C87.8 102.1 85.5 102.4 83.8 102ZM119.8 91.8C118.1 91.5 116.5 90.3 115.2 89C113.9 87.7 113 85.9 112 84.2C111 82.5 110.3 80.7 109.4 79C108.5 77.3 107.6 75.6 106.8 73.8C106 72 105.1 70.2 104.6 68.4C104.1 66.6 103.3 64.5 103.6 62.8C103.9 61.1 105 59.2 106.4 58.4C107.8 57.6 110.1 57.6 111.8 58C113.5 58.4 115.3 59.5 116.6 60.8C117.9 62.1 118.8 63.9 119.8 65.6C120.8 67.3 121.5 69.1 122.4 70.8C123.3 72.5 124.2 74.3 125 76C125.8 77.7 126.8 79.4 127.4 81.2C128 83 128.7 85.2 128.4 86.8C128.1 88.4 126.8 90.2 125.4 91C124 91.8 121.5 92.1 119.8 91.8Z",
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

// Connector tool calls from audit.jsonl, grouped by service, most used first.
const connectors: IconBar[] = (DATA.connectors ?? []).filter((c: IconBar) => num(c.value) > 0);
const CONNECTOR_COUNT = num(T.connectors);

// Bots the user published as templates. There is no API for this yet, so it is often empty and the step is dropped.
const published: (PublishedBot & { av: string })[] = (DATA.published ?? []).map((b: PublishedBot) => ({ ...b, av: avatar(b.shape, b.color) }));

type StepKey = "cover" | "numbers" | "when" | "crew" | "toolkit" | "beyond" | "shipped" | "share";
// A step with no data is left out rather than shown empty.
const STEPS: { key: StepKey; title: string }[] = [
  { key: "cover" as StepKey, title: IS_YOU ? "Meet you" : "Meet " + NAME, on: true },
  { key: "numbers" as StepKey, title: "The numbers", on: TOTAL_MSGS > 0 },
  { key: "when" as StepKey, title: IS_YOU ? "When you work" : "When " + NAME + " works", on: TOTAL_MSGS > 0 && ZONE !== null },
  { key: "crew" as StepKey, title: "The crew", on: crew.length > 0 },
  { key: "toolkit" as StepKey, title: "The toolkit", on: connectors.length > 0 },
  { key: "beyond" as StepKey, title: "Beyond the chat", on: num(DATA.beyond?.computerUse) + num(DATA.beyond?.browserPages) + num(DATA.beyond?.shell) > 0 },
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
  const drawBot = (o: { b: (typeof crew)[number]; i: number; k: number; x: number; y: number }) => {
    const size = ORBIT_AV * (0.85 + 0.15 * (o.y / CH)) * o.k;
    const bob = Math.sin(t * 1.6 + o.i * 1.3) * 3;
    return (
      <g key={o.b.key} opacity={clamp01(o.k * 2)}>
        <title>{o.b.name}</title>
        <image href={o.b.av} x={o.x - size / 2} y={o.y - size / 2 + bob} width={Math.max(0.01, size)} height={Math.max(0.01, size)} />
      </g>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: "12px 0 8px" }}>
      <div style={{ ...rise(0), fontFamily: f, fontSize: 44, lineHeight: 1.1, fontWeight: theme.weight.semibold, letterSpacing: -1, color: theme.text.primary }}>{TITLE}</div>
      <div style={{ ...rise(0.15), fontFamily: f, fontSize: theme.font.body1.fontSize, color: theme.text.secondary }}>{WINDOW ? "Your Grok Bot story, " + WINDOW : "Your Grok Bot story"}</div>
      <svg ref={ref} width="100%" viewBox={"0 0 " + W + " " + CH} role="img" aria-label={"The Grok Bot avatar, which follows the cursor, with " + (IS_YOU ? "your" : NAME + "'s") + " most-messaged bots orbiting it"} style={{ maxWidth: W, overflow: "visible" }}>
        <ellipse cx={W / 2} cy={CH / 2} rx={250} ry={128} fill="none" stroke={theme.border.weak} strokeWidth={1} strokeDasharray="3 6" opacity={ease((t - 0.8) / 0.6)} />
        {orbit.filter((o) => o.back).map(drawBot)}
        <ellipse cx={s.x} cy={CH / 2 + HERO / 2 + 6} rx={Math.max(1, 56 * heroIn * (1 - (s.y - CH / 2) / 300))} ry={7} fill={theme.border.weak} />
        <g transform={"translate(" + s.x + " " + (s.y + Math.sin(t * 2.2) * 3) + ") rotate(" + tilt + ") scale(" + Math.max(0.001, sx).toFixed(3) + " " + Math.max(0.001, sy).toFixed(3) + ")"}>
          <image href={AV.grokBody} x={-HERO / 2} y={-HERO / 2} width={HERO} height={HERO} />
          <g transform={"translate(" + ex.toFixed(2) + " " + ey.toFixed(2) + ") translate(0 " + eyeY + ") scale(1 " + blink + ") translate(0 " + -eyeY + ")"}>
            <image href={AV.grokEyes} x={-HERO / 2} y={-HERO / 2} width={HERO} height={HERO} />
          </g>
        </g>
        {orbit.filter((o) => !o.back).map(drawBot)}
      </svg>
      <div style={{ ...rise(2.2), fontFamily: f, fontSize: 32, lineHeight: 1.15, fontWeight: theme.weight.semibold, letterSpacing: -0.5, color: theme.text.primary }}>
        {plural(TOTAL_MSGS, "message", "messages") + " across " + plural(num(T.bots), "bot", "bots")}
      </div>
      <div style={{ ...rise(2.45), display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 8 }}>
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

function WhenWorks() {
  const theme = useGrokTheme();
  const t = useClock(2);
  const z = ZONE;
  if (!z) return null;
  return (
    <Fragment>
      <HourChart zs={z} name={z.name} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <PeakTile i={0} t={t} label="Busiest day" value={z.bestDay.label} sub={plural(num(z.bestDay.count), "message", "messages")} />
        <PeakTile i={1} t={t} label="Busiest weekday" value={z.bestWeekday.label} sub={plural(num(z.bestWeekday.count), "message", "messages")} />
        <PeakTile i={2} t={t} label="Busiest week" value={z.bestWeek.label} sub={plural(num(z.bestWeek.count), "message", "messages")} />
      </div>
      <div style={{ fontFamily: theme.font.family, fontSize: theme.font.caption.fontSize, color: theme.text.tertiary, textAlign: "center", marginTop: 16 }}>
        {"Hours, days and weeks in " + z.name + ". Weeks start Monday."}
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
  return (
    <Fragment>
      {CLUSTER.map((q: { x: number; y: number; s: number }, i: number) => {
        const av = crew[i]?.av;
        if (!av) return null;
        const e = popIn((t - 0.1 - i * 0.1) / 0.5);
        const bob = Math.sin(t * 2 + i * 1.7) * 2.5;
        const sz = q.s * e;
        return <image key={i} href={av} x={q.x - sz / 2} y={q.y - sz / 2 + bob} width={sz} height={sz} />;
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

function CardsViz(props: { t: number }) {
  const theme = useGrokTheme();
  const c = theme.dataviz.categorical;
  const spread = ease(clamp01((props.t - 0.2) / 0.9));
  const sway = Math.sin(props.t * 1.6) * 3;
  return (
    <Fragment>
      {Array.from({ length: 5 }).map((_: unknown, i: number) => {
        const a = (i - 2) * 16 * spread + sway * (i - 2) * 0.3;
        const top = i === 4;
        return (
          <g key={i} transform={"translate(100 108) rotate(" + a + ") translate(0 -" + (16 + 10 * spread) + ")"}>
            <rect x={-20} y={-64} width={40} height={58} rx={6} fill={top ? c[0] ?? theme.text.primary : theme.bg.base} stroke={theme.border.strong} />
            <rect x={-12} y={-54} width={24} height={4} rx={2} fill={top ? theme.bg.base : c[i % 4 + 1] ?? theme.border.default} />
            <rect x={-12} y={-46} width={16} height={4} rx={2} fill={top ? theme.bg.base : theme.border.default} opacity={0.8} />
          </g>
        );
      })}
    </Fragment>
  );
}

function SheetsViz(props: { t: number }) {
  const theme = useGrokTheme();
  const c0 = theme.dataviz.categorical[0] ?? theme.text.primary;
  const ph = (props.t * 0.5) % 1;
  return (
    <Fragment>
      {Array.from({ length: 4 }).map((_: unknown, i: number) => {
        const e = ease(clamp01((props.t - 0.1 - i * 0.15) / 0.5));
        const x = 68 + i * 8;
        const y = 22 - i * 5 + (1 - e) * 40;
        const top = i === 3;
        return (
          <g key={i} opacity={e} transform={"translate(" + x + " " + y + ")"}>
            <path d="M0 6 Q0 0 6 0 L38 0 L50 12 L50 66 Q50 72 44 72 L6 72 Q0 72 0 66 Z" fill={theme.bg.base} stroke={theme.border.strong} />
            <path d="M38 0 L38 12 L50 12" fill="none" stroke={theme.border.strong} />
            {top ? (
              <Fragment>
                <rect x={8} y={22} width={34 * ease(clamp01(ph / 0.3))} height={5} rx={2.5} fill={c0} />
                <rect x={8} y={34} width={28 * ease(clamp01((ph - 0.2) / 0.3))} height={5} rx={2.5} fill={theme.border.default} />
                <rect x={8} y={46} width={22 * ease(clamp01((ph - 0.4) / 0.3))} height={5} rx={2.5} fill={theme.border.default} />
              </Fragment>
            ) : null}
          </g>
        );
      })}
    </Fragment>
  );
}

function StatGrid(props: { stats: Stat[] }) {
  const theme = useGrokTheme();
  const t = useClock();
  const stats = props.stats ?? [];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gridAutoRows: "1fr", gap: 12 }}>
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
              {st.kind === "skills" ? <CardsViz t={lt} /> : null}
              {st.kind === "pages" ? <SheetsViz t={lt} /> : null}
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

function IconBars(props: { items: IconBar[] }) {
  const theme = useGrokTheme();
  const t = useClock();
  const c = theme.dataviz.categorical;
  const lead0 = c[0] ?? theme.text.primary;
  const items = props.items ?? [];
  if (items.length === 0) return null;
  const max = Math.max(1, ...items.map((it: IconBar) => num(it.value)));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((it: IconBar, i: number) => {
        const k = ease((t - 0.1 - i * 0.07) / 0.8);
        const lead = i === 0;
        const hasIcon = typeof it.icon === "string" && it.icon.indexOf("data:image/") === 0;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, opacity: clamp01(k * 1.6) }}>
            <div
              style={{
                width: 36,
                height: 36,
                flexShrink: 0,
                boxSizing: "border-box",
                borderRadius: theme.radius.md,
                background: theme.fill.secondary,
                border: "1px solid " + theme.border.subtle,
                color: theme.text.primary,
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
                fontFamily: theme.font.family,
                fontSize: theme.font.label.fontSize,
                fontWeight: theme.weight.semibold,
                lineHeight: 1,
              }}
            >
              {hasIcon ? <img src={it.icon} alt={it.name + " logo"} width={20} height={20} style={{ display: "block", width: 20, height: 20, objectFit: "contain" }} /> : it.mono}
            </div>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontFamily: theme.font.family, fontSize: theme.font.label.fontSize, color: lead ? theme.text.primary : theme.text.secondary }}>{it.name}</div>
              <div
                style={{
                  height: 10,
                  borderRadius: theme.radius.full,
                  width: Math.max(2, (num(it.value) / max) * 100 * k) + "%",
                  background: lead ? lead0 : theme.dataviz.singleSeriesRest,
                }}
              />
            </div>
            <div
              style={{
                width: 56,
                textAlign: "right",
                fontFamily: theme.font.family,
                fontSize: theme.font.body1.fontSize,
                fontWeight: theme.weight.semibold,
                color: theme.text.primary,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fmtInt(num(it.value) * k)}
            </div>
          </div>
        );
      })}
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
  return (
    <Fragment>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontFamily: f, fontSize: theme.font.body1.fontSize, fontWeight: theme.weight.semibold, color: theme.text.primary }}>{"#" + (pick + 1) + " " + sel.name}</div>
        <div style={{ fontFamily: f, fontSize: theme.font.label.fontSize, color: theme.text.secondary }}>
          {(sel.does ? sel.does + ". " : "") + plural(sel.msgs, "message", "messages") + ", " + Math.round((sel.msgs / Math.max(1, TOTAL_MSGS)) * 100) + "% of all"}
        </div>
      </div>
      <svg width="100%" viewBox={"0 0 " + W + " " + vh} role="img" aria-label={POSS + " most-messaged bots, each drawn as its avatar and sized by messages"}>
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
                  <image href={b.av} x={-sz / 2} y={-sz / 2} width={sz} height={sz} />
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

const VW = 300;
const VH = 150;

function seg(ph: number, a: number, b: number): number {
  return ease(clamp01((ph - a) / Math.max(0.001, b - a)));
}

const DESK_ICONS = [
  { x: 26, y: 40 },
  { x: 26, y: 72 },
  { x: 26, y: 104 },
];

function ComputerViz(props: { t: number }) {
  const theme = useGrokTheme();
  const c = theme.dataviz.categorical;
  const c0 = c[0] ?? theme.text.primary;
  const cycle = 3.6;
  const n = Math.floor(props.t / cycle);
  const ph = (props.t % cycle) / cycle;
  const icon = DESK_ICONS[n % 3] ?? DESK_ICONS[0];
  const rest = { x: 250, y: 120 };
  const btn = { x: 226, y: 110 };
  const m1 = seg(ph, 0, 0.18);
  const m2 = seg(ph, 0.42, 0.58);
  const m3 = seg(ph, 0.8, 0.95);
  const cx = ph < 0.42 ? rest.x + (icon.x - rest.x) * m1 : ph < 0.8 ? icon.x + (btn.x - icon.x) * m2 : btn.x + (rest.x - btn.x) * m3;
  const cy = ph < 0.42 ? rest.y + (icon.y - rest.y) * m1 : ph < 0.8 ? icon.y + (btn.y - icon.y) * m2 : btn.y + (rest.y - btn.y) * m3;
  const click1 = clamp01((ph - 0.2) / 0.16);
  const click2 = clamp01((ph - 0.6) / 0.16);
  const open = seg(ph, 0.22, 0.34) * (1 - seg(ph, 0.86, 0.98));
  const typed = seg(ph, 0.34, 0.5);
  const done = ph > 0.62 && ph < 0.92;
  const press = (ph > 0.19 && ph < 0.24) || (ph > 0.59 && ph < 0.64) ? 0.8 : 1;
  const wx = 70;
  const wy = 26;
  const ww = 200;
  const wh = 104;
  const ox = icon.x + (wx + ww / 2 - icon.x) * open;
  const oy = icon.y + (wy + wh / 2 - icon.y) * open;
  const accent = c[n % 4] ?? c0;
  return (
    <svg width="100%" height="100%" viewBox={"0 0 " + VW + " " + VH} preserveAspectRatio="xMidYMid meet" role="img" aria-label="A cursor driving a desktop: opening an app, filling a field, pressing a button">
      <rect x={4} y={4} width={VW - 8} height={VH - 8} rx={12} fill={theme.fill.secondary} stroke={theme.border.default} />
      <rect x={4} y={4} width={VW - 8} height={16} rx={8} fill={theme.border.subtle} />
      {Array.from({ length: 3 }).map((_: unknown, i: number) => (
        <circle key={i} cx={16 + i * 9} cy={12} r={2.5} fill={theme.border.strong} />
      ))}
      {DESK_ICONS.map((q: { x: number; y: number }, i: number) => {
        const on = i === n % 3 && ph > 0.2 && ph < 0.4;
        return (
          <g key={i}>
            <rect x={q.x - 11} y={q.y - 11} width={22} height={22} rx={6} fill={on ? accent : theme.bg.base} stroke={theme.border.default} />
            <rect x={q.x - 9} y={q.y + 14} width={18} height={3} rx={1.5} fill={theme.border.default} />
          </g>
        );
      })}
      {open > 0.01 ? (
        <g transform={"translate(" + ox + " " + oy + ") scale(" + open + ")"}>
          <g transform={"translate(" + -ww / 2 + " " + -wh / 2 + ")"}>
            <rect x={0} y={0} width={ww} height={wh} rx={10} fill={theme.bg.base} stroke={theme.border.strong} />
            <rect x={0} y={0} width={ww} height={18} rx={9} fill={accent} opacity={0.9} />
            <rect x={14} y={30} width={110 * typed} height={6} rx={3} fill={theme.text.tertiary} />
            <rect x={14} y={44} width={150} height={20} rx={6} fill={theme.fill.secondary} stroke={theme.border.default} />
            <rect x={20} y={51} width={100 * seg(ph, 0.4, 0.56)} height={6} rx={3} fill={theme.text.secondary} />
            <rect x={ww - 74 + 6} y={wh - 28} width={60} height={20} rx={10} fill={done ? accent : theme.border.default} />
            {done ? <path d={"M" + (ww - 44) + " " + (wh - 18) + " l4 4 l8 -8"} fill="none" stroke={theme.bg.base} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /> : null}
          </g>
        </g>
      ) : null}
      <circle cx={icon.x} cy={icon.y} r={6 + click1 * 22} fill="none" stroke={c0} strokeWidth={2} opacity={ph > 0.2 && ph < 0.36 ? 1 - click1 : 0} />
      <circle cx={btn.x} cy={btn.y} r={6 + click2 * 22} fill="none" stroke={c0} strokeWidth={2} opacity={ph > 0.6 && ph < 0.76 ? 1 - click2 : 0} />
      <g transform={"translate(" + (cx - 2) + " " + (cy - 2) + ") scale(" + press + ")"}>
        <path d="M0 0 L0 20 L5.5 14.5 L9.5 23.5 L13 22 L9 13 L16 13 Z" fill={theme.text.primary} stroke={theme.bg.base} strokeWidth={1.5} />
      </g>
    </svg>
  );
}

function BrowserViz(props: { t: number }) {
  const theme = useGrokTheme();
  const c = theme.dataviz.categorical;
  const c0 = c[0] ?? theme.text.primary;
  const cycle = 2.4;
  const n = Math.floor(props.t / cycle);
  const ph = (props.t % cycle) / cycle;
  const load = seg(ph, 0, 0.4);
  const tab = n % 3;
  const blocks = [
    { x: 16, y: 52, w: 268, h: 34 },
    { x: 16, y: 94, w: 84, h: 42 },
    { x: 108, y: 94, w: 84, h: 42 },
    { x: 200, y: 94, w: 84, h: 42 },
  ];
  return (
    <svg width="100%" height="100%" viewBox={"0 0 " + VW + " " + VH} preserveAspectRatio="xMidYMid meet" role="img" aria-label="A browser loading page after page">
      <rect x={4} y={4} width={VW - 8} height={VH - 8} rx={12} fill={theme.bg.base} stroke={theme.border.default} />
      {Array.from({ length: 3 }).map((_: unknown, i: number) => (
        <rect key={i} x={12 + i * 70} y={10} width={64} height={14} rx={5} fill={i === tab ? theme.fill.secondary : theme.bg.base} stroke={theme.border.subtle} />
      ))}
      <rect x={12} y={28} width={VW - 24} height={16} rx={8} fill={theme.fill.secondary} />
      <rect x={22} y={34} width={60 + ((n * 41) % 90)} height={4} rx={2} fill={theme.text.tertiary} opacity={0.6} />
      <rect x={12} y={44} width={(VW - 24) * load} height={2} rx={1} fill={c0} opacity={ph < 0.5 ? 1 : 1 - seg(ph, 0.5, 0.6)} />
      {blocks.map((b: { x: number; y: number; w: number; h: number }, i: number) => {
        const e = seg(ph, 0.3 + i * 0.08, 0.45 + i * 0.08) * (1 - seg(ph, 0.9, 1));
        return (
          <rect
            key={i}
            x={b.x}
            y={b.y + (1 - e) * 8}
            width={b.w}
            height={b.h}
            rx={8}
            fill={i === 0 ? c[n % 4] ?? c0 : theme.fill.secondary}
            opacity={(i === 0 ? 0.85 : 1) * e}
          />
        );
      })}
      {ph < 0.35 ? (
        <g transform={"translate(150 96) rotate(" + props.t * 360 + ")"}>
          <circle r={10} fill="none" stroke={theme.border.default} strokeWidth={3} />
          <path d="M0 -10 A10 10 0 0 1 10 0" fill="none" stroke={c0} strokeWidth={3} strokeLinecap="round" />
        </g>
      ) : null}
    </svg>
  );
}

const SHELL_LINES = [38, 120, 92, 52, 150, 70, 104, 46, 132, 84];

function ShellViz(props: { t: number }) {
  const theme = useGrokTheme();
  const c = theme.dataviz.categorical;
  const c0 = c[0] ?? theme.text.primary;
  const rate = 2.2;
  const prog = props.t * rate;
  const cur = Math.floor(prog);
  const ph = prog - cur;
  const rows = 6;
  const lh = 17;
  const scroll = ease(clamp01(ph / 0.25));
  const term = theme.fill.primary;
  const ink = theme.text.onPrimary;
  return (
    <svg width="100%" height="100%" viewBox={"0 0 " + VW + " " + VH} preserveAspectRatio="xMidYMid meet" role="img" aria-label="A terminal running command after command">
      <rect x={4} y={4} width={VW - 8} height={VH - 8} rx={12} fill={term} />
      {Array.from({ length: 3 }).map((_: unknown, i: number) => (
        <circle key={i} cx={18 + i * 10} cy={16} r={3} fill={c[i] ?? ink} />
      ))}
      {Array.from({ length: rows + 1 }).map((_: unknown, j: number) => {
        const k = cur - rows + 1 + j;
        if (k < 0) return null;
        const y = 34 + (j - scroll + 1) * lh - lh;
        const isCmd = k % 2 === 0;
        const w = SHELL_LINES[k % SHELL_LINES.length] ?? 60;
        const grow = k === cur ? ease(clamp01(ph / 0.7)) : 1;
        if (y < 26 || y > VH - 14) return null;
        return (
          <g key={k}>
            {isCmd ? <path d={"M16 " + (y - 4) + " l5 4 l-5 4"} fill="none" stroke={c0} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /> : null}
            <rect x={isCmd ? 28 : 16} y={y - 3} width={w * grow} height={6} rx={3} fill={ink} opacity={isCmd ? 0.9 : 0.4} />
            {k === cur && Math.floor(props.t * 4) % 2 === 0 ? <rect x={(isCmd ? 30 : 18) + w * grow} y={y - 5} width={6} height={10} fill={c0} /> : null}
          </g>
        );
      })}
    </svg>
  );
}

type BeyondTile = { n: number; label: string; sub: string; kind: string };
// From audit.jsonl: computer_use_session, browser_navigation and shell_command events. Zero counts are left out.
const BEYOND: BeyondTile[] = [
  { n: num(DATA.beyond?.computerUse), label: "Computer-use sessions", sub: "Clicking, typing, driving apps", kind: "computer" },
  { n: num(DATA.beyond?.browserPages), label: "Browser page loads", sub: "Pages opened and read", kind: "browser" },
  { n: num(DATA.beyond?.shell), label: "Shell commands", sub: "Run on the box", kind: "shell" },
].filter((b: BeyondTile) => b.n > 0);

function BeyondTiles() {
  const theme = useGrokTheme();
  const t = useClock();
  const f = theme.font.family;
  return (
    <div style={{ width: "100%", aspectRatio: BEYOND.length >= 3 ? "1 / 1" : BEYOND.length === 2 ? "3 / 2" : "3 / 1", display: "grid", gridTemplateRows: "repeat(" + Math.max(1, BEYOND.length) + ", minmax(0, 1fr))", gap: 12 }}>
      {BEYOND.map((tl: BeyondTile, i: number) => {
        const lt = Math.max(0, t - i * 0.15);
        const e = ease(lt / 0.6);
        const cnt = ease(lt / 1.6);
        return (
          <div
            key={i}
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
              transform: "translateX(" + (1 - e) * (i % 2 === 0 ? -24 : 24) + "px)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, paddingLeft: 8 }}>
              <div style={{ fontFamily: f, fontSize: theme.font.metric.fontSize, lineHeight: theme.font.metric.lineHeight, color: theme.text.primary, fontWeight: theme.weight.semibold, fontVariantNumeric: "tabular-nums" }}>
                {fmtInt(tl.n * cnt)}
              </div>
              <div style={{ fontFamily: f, fontSize: theme.font.body1.fontSize, fontWeight: theme.weight.semibold, color: theme.text.primary }}>{tl.label}</div>
              <div style={{ fontFamily: f, fontSize: theme.font.label.fontSize, color: theme.text.tertiary }}>{tl.sub}</div>
            </div>
            <div style={{ height: "100%", minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {tl.kind === "computer" ? <ComputerViz t={lt} /> : tl.kind === "browser" ? <BrowserViz t={lt} /> : <ShellViz t={lt} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Timeline() {
  const theme = useGrokTheme();
  const t = useClock();
  const f = theme.font.family;
  const lineK = ease(clamp01(t / 1.4));
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 24, paddingTop: 4 }}>
      <div
        style={{
          position: "absolute",
          left: 27,
          top: 28,
          width: 2,
          height: "calc((100% - 64px) * " + lineK.toFixed(3) + ")",
          background: theme.border.default,
        }}
      />
      {published.map((b: PublishedBot & { av: string }, i: number) => {
        const e = ease(clamp01((t - 0.2 - i * 0.35) / 0.6));
        const bob = Math.sin(t * 2 + i * 1.4) * 2;
        const url = b.url;
        const shown = url.replace(/^https?:\/\//, "");
        return (
          <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", opacity: e, transform: "translateX(" + (1 - e) * 18 + "px)", position: "relative" }}>
            <svg width={56} height={56} viewBox="-60 -60 120 120" style={{ flexShrink: 0 }} role="img" aria-label={b.name + " marker"}>
              <circle cx={0} cy={0} r={58} fill={theme.bg.base} />
              <g transform={"translate(0 " + bob + ") scale(" + (0.9 + 0.1 * e) + ")"}>
                <image href={b.av} x={-54} y={-54} width={108} height={108} />
              </g>
            </svg>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, paddingTop: 4 }}>
              <div style={{ fontFamily: f, fontSize: theme.font.caption.fontSize, color: theme.text.tertiary }}>{b.date}</div>
              <div style={{ fontFamily: f, fontSize: theme.font.body1.fontSize, fontWeight: theme.weight.semibold, color: theme.text.primary }}>{b.name}</div>
              {b.tag ? <div style={{ fontFamily: f, fontSize: theme.font.body2.fontSize, color: theme.text.secondary }}>{b.tag}</div> : null}
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 2 }}>
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
                    padding: "4px 12px",
                  }}
                >
                  Install
                </a>
                <span style={{ fontFamily: theme.font.mono, fontSize: theme.font.caption.fontSize, color: theme.text.tertiary, wordBreak: "break-all" }}>{shown}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Messages sent per day in the user's timezone, first to last active day. Same store.db entries as the hourly counts.
const daily: number[] = ZONE?.daily ?? [];
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

// Organic brand shapes: the avatar silhouettes, washed out behind the card.
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
  { v: num(T.skills), l: "Skills" },
  { v: num(T.pages), l: "Pages" },
].filter((q: { v: number; l: string }) => q.v > 0).slice(0, 4);
const STAT_SPOTS: { x: number; y: number }[][] = [
  [],
  [{ x: 540, y: 620 }],
  [{ x: 290, y: 620 }, { x: 790, y: 620 }],
  [{ x: 290, y: 470 }, { x: 790, y: 470 }, { x: 540, y: 770 }],
  [{ x: 290, y: 470 }, { x: 790, y: 470 }, { x: 290, y: 770 }, { x: 790, y: 770 }],
];
const POSTER_STATS = STAT_PICKS.map((q: { v: number; l: string }, i: number) => ({ ...q, ...STAT_SPOTS[STAT_PICKS.length][i] }));
const POSTER_LABEL =
  POSS + " Grok Bot card: " + [plural(TOTAL_MSGS, "message", "messages")].concat(POSTER_STATS.map((q: { v: number; l: string }) => fmtInt(q.v) + " " + q.l.toLowerCase())).join(", ");

// Every grow-in on the card has settled by this time (seconds).
const POSTER_DONE = 3.4;

function Poster(props: { svgRef: { current: SVGSVGElement | null }; png: string; onPng: (url: string) => void }) {
  const theme = useGrokTheme();
  const t = useClock(POSTER_DONE);
  const done = t >= POSTER_DONE;
  const { svgRef, png, onPng } = props;

  // Once the art has finished growing in, render the PNG and lay it over the card, so right-click or long-press saves it.
  useEffect(() => {
    const svg = svgRef.current;
    if (!done || png || !svg) return;
    let live = true;
    posterToPng(svg)
      .then((b: Blob) => (live ? onPng(URL.createObjectURL(b)) : undefined))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [done, png, svgRef, onPng]);
  const f = theme.font.family;
  // Always a light card: the light page surface with ink text. In dark mode the solid ink fill is the light surface.
  const dark = theme.kind === "dark";
  const paper = dark ? theme.fill.primary : theme.bg.base;
  const ink = dark ? theme.text.onPrimary : theme.text.primary;
  const cat = theme.dataviz.categorical;
  const hero = popIn((t - 0.1) / 0.6);
  const mk = popIn((t - 1.6) / 0.6);
  const mkX = 446;
  const mkTf = "translate(" + mkX + " 1000)";

  // Hover: lift, grow a touch, tilt and deepen the shadow. With reduced motion only the shadow changes.
  const [hover, setHover] = useState<boolean>(false);
  const [still, setStill] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const tint = (pct: number) => "color-mix(in srgb, " + ink + " " + pct + "%, transparent)";
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
        border: "1px solid " + theme.border.default,
        background: paper,
        position: "relative",
        boxShadow: shadow,
        transform: lift,
        transition: still ? "box-shadow 200ms ease" : "transform 360ms " + ease + ", box-shadow 360ms " + ease,
        willChange: "transform",
      }}
    >
      <svg ref={props.svgRef} xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox={"0 0 " + CARD + " " + CARD} preserveAspectRatio="xMidYMid meet" role="img" aria-label={POSTER_LABEL}>
        <rect x={0} y={0} width={CARD} height={CARD} fill={paper} />

        {POSTER_BLOBS.map((b: { d: string; x: number; y: number; s: number; r: number; c: number; o: number }, i: number) => (
          <path key={"b" + i} d={b.d} transform={"translate(" + b.x + " " + b.y + ") rotate(" + b.r + " 84 84) scale(" + b.s + ")"} fill={cat[b.c] ?? ink} opacity={b.o} />
        ))}

        <g opacity={hero} data-o={1}>
          <text x={CARD / 2} y={168} textAnchor="middle" fill={ink} style={{ fontFamily: f, fontSize: TITLE.length > 22 ? Math.max(48, Math.round(80 * 22 / TITLE.length)) : 80, fontWeight: 800, letterSpacing: -2 }}>{TITLE}</text>
          <text x={CARD / 2} y={234} textAnchor="middle" fill={ink} opacity={0.6} style={{ fontFamily: f, fontSize: 36, fontWeight: theme.weight.medium }}>
            {plural(TOTAL_MSGS, "message", "messages") + (WINDOW ? ", " + WINDOW : "")}
          </text>
        </g>

        {POSTER_STATS.map((s: { v: number; l: string; x: number; y: number }, i: number) => {
          const start = 0.5 + i * 0.22;
          const e = popIn((t - start) / 0.7);
          const n = done ? s.v : Math.round(s.v * clamp01((t - start) / 1.1));
          const fin = "translate(" + s.x + " " + s.y + ")";
          return (
            <g key={s.l} data-tf={fin} transform={fin + " scale(" + e + ")"}>
              <text x={0} y={0} textAnchor="middle" fill={ink} style={{ fontFamily: f, fontSize: 190, fontWeight: 800, letterSpacing: -6 }}>{String(n)}</text>
              <text x={0} y={70} textAnchor="middle" fill={ink} opacity={0.62} style={{ fontFamily: f, fontSize: 46, fontWeight: theme.weight.semibold }}>{s.l}</text>
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
              <image href={href} x={-a.s / 2} y={-a.s / 2} width={a.s} height={a.s} />
            </g>
          );
        })}

        <g data-tf={mkTf} transform={mkTf + " scale(" + mk + ")"}>
          <image href={AV.grok} x={-44} y={-44} width={88} height={88} />
        </g>
        <text x={mkX + 54} y={1016} fill={ink} opacity={mk > 0 ? 1 : 0} data-o={1} style={{ fontFamily: f, fontSize: 46, fontWeight: theme.weight.semibold, letterSpacing: -0.5 }}>Grok Bot</text>
      </svg>
      {png ? (
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

function PosterHint() {
  const theme = useGrokTheme();
  return (
    <div style={{ textAlign: "center", color: theme.text.secondary, fontFamily: theme.font.family, fontSize: theme.font.body2.fontSize, marginTop: 12 }}>
      Right click on the card to download &amp; copy
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
  const [cardPng, setCardPng] = useState<string>("");
  useEffect(() => () => (cardPng ? URL.revokeObjectURL(cardPng) : undefined), [cardPng]);
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

        {key === "numbers" && (
          <StatGrid
            stats={[
              { n: TOTAL_MSGS, label: "Messages sent", kind: "msgs" },
              { n: num(T.bots), label: "Bots messaged", kind: "bots" },
              { n: num(T.activeDays), label: "Active days", kind: "days" },
              { n: num(T.streak), label: "Day streak", kind: "streak" },
              { n: num(T.skills), label: "Skills", kind: "skills" },
              { n: num(T.pages), label: "Pages", kind: "pages" },
            ].filter((st: Stat) => st.n > 0)}
          />
        )}

        {key === "when" && <WhenWorks />}

        {key === "crew" && <CrewShapes />}

        {key === "toolkit" && <IconBars items={connectors} />}

        {key === "beyond" && <BeyondTiles />}

        {key === "shipped" && <Timeline />}

        {key === "share" && (
          <Fragment>
            <Poster svgRef={posterRef} png={cardPng} onPng={setCardPng} />
            <PosterHint />
          </Fragment>
        )}
      </Section>
    </Page>
  );
}
