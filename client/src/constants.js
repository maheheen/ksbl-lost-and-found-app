// Fixed lists + icons. Keep the lists identical to server/constants.js
// (the server re-checks every value, so a mismatch shows up as a clear validation error).
import {
  Laptop, FileText, IdCard, KeyRound, Backpack, Shirt, BookOpen, Wallet, Glasses, Package,
  SearchX, HandHeart, Circle, Link2, CircleCheck,
} from "lucide-react";

export const TYPES = ["Lost", "Found"];
export const STATUSES = ["Open", "Matched", "Returned"];

export const CATEGORIES = [
  "Electronics", "Documents", "ID Cards", "Keys", "Bags", "Clothing",
  "Books & Stationery", "Wallets & Money", "Accessories", "Other",
];

// KSBL campus places, grouped for the dropdowns (headings make 23 places easy to scan).
export const LOCATION_GROUPS = [
  { label: "Entrance & outdoors", items: ["Reception", "Garden", "Parking", "Courtyard"] },
  {
    label: "Study & labs",
    items: [
      "Library", "Computer Lab", "Hardware Lab",
      "Lecture Hall 1", "Lecture Hall 2", "Lecture Hall 3",
      "Seminar Hall 1", "Seminar Hall 2", "Seminar Hall 3",
    ],
  },
  { label: "Campus life", items: ["Cafeteria", "Campus Activity Center (CAC)", "Gym"] },
  {
    label: "Prayer rooms & washrooms",
    items: [
      "Prayer Room (Male)", "Prayer Room (Female)",
      "Washroom 1 (Male)", "Washroom 2 (Male)", "Washroom 1 (Female)", "Washroom 2 (Female)",
    ],
  },
];
// "Other" sits after the groups as a plain option.
export const LOCATION_EXTRAS = ["Other"];
export const LOCATIONS = [...LOCATION_GROUPS.flatMap((g) => g.items), ...LOCATION_EXTRAS];

export const CATEGORY_ICONS = {
  Electronics: Laptop,
  Documents: FileText,
  "ID Cards": IdCard,
  Keys: KeyRound,
  Bags: Backpack,
  Clothing: Shirt,
  "Books & Stationery": BookOpen,
  "Wallets & Money": Wallet,
  Accessories: Glasses,
  Other: Package,
};

// Each Lost/Found tag has its own colour AND icon AND word, so colour is never the only signal.
export const TYPE_STYLES = {
  Lost: { icon: SearchX, text: "text-lost", bg: "bg-lost-tint", flap: "var(--color-lost)" },
  Found: { icon: HandHeart, text: "text-found", bg: "bg-found-tint", flap: "var(--color-found)" },
};

export const STATUS_STYLES = {
  Open: { icon: Circle, text: "text-open", bg: "bg-open-tint" },
  Matched: { icon: Link2, text: "text-matched", bg: "bg-matched-tint" },
  Returned: { icon: CircleCheck, text: "text-returned", bg: "bg-returned-tint" },
};

export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 500;
