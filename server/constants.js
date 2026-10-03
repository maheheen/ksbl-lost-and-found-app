// Fixed lists shared by validation, the database CHECK constraints and the seed script.
// The React client keeps a copy in client/src/constants.js - update both if you change these.

const TYPES = ["Lost", "Found"];

const CATEGORIES = [
  "Electronics",
  "Documents",
  "ID Cards",
  "Keys",
  "Bags",
  "Clothing",
  "Books & Stationery",
  "Wallets & Money",
  "Accessories",
  "Other",
];

// KSBL campus places, grouped so the dropdown is easy to scan (the UI shows each group as a heading).
// "Other" is a plain option at the end. The flat LOCATIONS list is what validation and the
// database use, so matching still compares exact, fixed values (no typos possible).
const LOCATION_GROUPS = [
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
const LOCATIONS = [...LOCATION_GROUPS.flatMap((g) => g.items), "Other"];

// Places that existed before the campus list was introduced -> nearest new place.
// Used once by the database migration so older reports are not lost.
const LEGACY_LOCATIONS = {
  "Main Hall": "Reception",
  "Classroom Block A": "Lecture Hall 1",
  "Classroom Block B": "Lecture Hall 2",
  "Parking Area": "Parking",
  "Sports Area": "Gym",
  "Admin Office": "Reception",
};

const STATUSES = ["Open", "Matched", "Returned"];

module.exports = { TYPES, CATEGORIES, LOCATIONS, LOCATION_GROUPS, LEGACY_LOCATIONS, STATUSES };
