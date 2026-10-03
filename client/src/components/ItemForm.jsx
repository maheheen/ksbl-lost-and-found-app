// One form for reporting Lost or Found items, and for editing them.
// Validation runs here for instant, plain-language feedback; the server checks everything again.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SearchX, HandHeart } from "lucide-react";
import { CATEGORIES, LOCATION_GROUPS, LOCATION_EXTRAS, STATUSES, TITLE_MAX, DESCRIPTION_MAX } from "../constants";
import { todayISO } from "../lib";
import { ApiError } from "../api";
import { btn, Field, Select, inputClass, describedBy } from "./ui";

const FIELD_ORDER = ["title", "category", "location", "date", "description"];

/** Returns { field: message } - messages are written for people, not programmers. */
function validate(v) {
  const e = {};
  const verb = v.type === "Found" ? "find" : "lose";
  const title = v.title.trim();
  if (!title) e.title = "Tell us what the item is, for example “Blue water bottle”.";
  else if (title.length < 3) e.title = "Please use at least 3 characters.";
  else if (title.length > TITLE_MAX) e.title = `Please keep the name under ${TITLE_MAX} characters.`;
  if (!v.category) e.category = "Choose the kind of item from the list.";
  if (!v.location) e.location = `Choose where you ${verb === "find" ? "found" : "lost"} it.`;
  if (!v.date) e.date = "Pick the day it happened.";
  else if (v.date > todayISO()) e.date = "That day is in the future. Pick today or an earlier day.";
  const desc = v.description.trim();
  if (!desc) e.description = "Add a few details so people can recognise it, like colour, brand or marks.";
  else if (desc.length > DESCRIPTION_MAX) e.description = `Please shorten this to ${DESCRIPTION_MAX} characters or fewer.`;
  return e;
}

const TYPE_OPTIONS = [
  { value: "Lost", label: "I lost something", icon: SearchX, checked: "peer-checked:border-lost peer-checked:bg-lost" },
  { value: "Found", label: "I found something", icon: HandHeart, checked: "peer-checked:border-found peer-checked:bg-found" },
];

/**
 * Props:
 *  mode        - "create" or "edit" (edit also shows the status field)
 *  initial     - starting values (edit) - defaults are used for create
 *  type        - optional: keeps the Lost/Found toggle in sync with the page address
 *  onTypeChange- optional: called when the toggle changes
 *  onSubmit    - async (values) => void ; may throw ApiError
 *  cancelTo    - where "Cancel" goes
 */
export default function ItemForm({ mode, initial, type, onTypeChange, onSubmit, cancelTo }) {
  const [values, setValues] = useState({
    type: "Lost",
    title: "",
    category: "",
    location: "",
    date: todayISO(), // the date picker starts on today
    description: "",
    status: "Open",
    ...initial,
    ...(type ? { type } : {}),
  });
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // If the page address changes (e.g. user taps "Report Found" in the nav) keep the toggle in step.
  useEffect(() => {
    if (type) setValues((v) => (v.type === type ? v : { ...v, type }));
  }, [type]);

  const clientErrors = validate(values);
  // Show a field's message after the person has left it, or after they tried to submit.
  const errorFor = (f) => ((touched[f] || submitted) && (clientErrors[f] || serverErrors[f])) || "";

  const set = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setServerErrors((s) => ({ ...s, [field]: undefined }));
  };
  const blur = (field) => () => setTouched((t) => ({ ...t, [field]: true }));

  const setType = (t) => {
    setValues((v) => ({ ...v, type: t }));
    if (onTypeChange) onTypeChange(t);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    setFormError("");
    const firstBad = FIELD_ORDER.find((f) => clientErrors[f]);
    if (firstBad) {
      document.getElementById(firstBad)?.focus();
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ ...values, title: values.title.trim(), description: values.description.trim() });
    } catch (err) {
      if (err instanceof ApiError && err.fields && Object.keys(err.fields).length) {
        setServerErrors(err.fields);
        document.getElementById(FIELD_ORDER.find((f) => err.fields[f]))?.focus();
      }
      setFormError(err.message);
      setSaving(false);
    }
  }

  const isFound = values.type === "Found";
  const verbPast = isFound ? "found" : "lost";
  const props = (id, hint) => ({ id, ...describedBy(id, { hint, error: errorFor(id) }) });

  const titleHint = "A short name is best.";
  const descHint = "Colour, brand, marks, what is inside. We match reports by the words you use here. Please do not add phone numbers or ID numbers.";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Two-option toggle: a radio group, so it works with keyboard (arrow keys) and screen readers */}
      <fieldset>
        <legend className="mb-2 font-semibold">What would you like to report?</legend>
        <div className="grid grid-cols-1 gap-1.5 rounded-2xl bg-navy-soft p-1.5 sm:grid-cols-2">
          {TYPE_OPTIONS.map(({ value, label, icon: Icon, checked }) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                name="type"
                value={value}
                checked={values.type === value}
                onChange={() => setType(value)}
                className="peer sr-only"
              />
              <span
                className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-transparent px-4 text-lg font-semibold text-navy transition duration-150 hover:bg-white/70 peer-checked:text-white peer-checked:shadow-sm peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-navy ${checked}`}
              >
                <Icon size={22} aria-hidden="true" />
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field id="title" label="What is it?" hint={titleHint} error={errorFor("title")}>
        <input
          type="text"
          value={values.title}
          onChange={set("title")}
          onBlur={blur("title")}
          maxLength={TITLE_MAX + 20}
          placeholder="For example: Blue water bottle"
          autoComplete="off"
          className={inputClass(errorFor("title"))}
          {...props("title", titleHint)}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="category" label="What kind of item is it?" error={errorFor("category")}>
          <Select
            value={values.category}
            onChange={set("category")}
            onBlur={blur("category")}
            placeholder="Choose a category"
            options={CATEGORIES}
            invalid={errorFor("category")}
            {...props("category")}
          />
        </Field>

        <Field id="location" label={`Where did you ${isFound ? "find" : "lose"} it?`} error={errorFor("location")}>
          <Select
            value={values.location}
            onChange={set("location")}
            onBlur={blur("location")}
            placeholder="Choose a place"
            groups={LOCATION_GROUPS}
            options={LOCATION_EXTRAS}
            invalid={errorFor("location")}
            {...props("location")}
          />
        </Field>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="date" label={`When did you ${isFound ? "find" : "lose"} it?`} error={errorFor("date")}>
          <input
            type="date"
            value={values.date}
            onChange={set("date")}
            onBlur={blur("date")}
            max={todayISO()}
            className={inputClass(errorFor("date"))}
            {...props("date")}
          />
        </Field>

        {mode === "edit" && (
          <Field
            id="status"
            label="Status"
            hint="Open = still looking. Matched = a pair has been found. Returned = back with its owner."
            error={errorFor("status")}
          >
            <Select value={values.status} onChange={set("status")} options={STATUSES} {...props("status", true)} />
          </Field>
        )}
      </div>

      <Field id="description" label="Describe it" hint={descHint} error={errorFor("description")}>
        <textarea
          rows={5}
          value={values.description}
          onChange={set("description")}
          onBlur={blur("description")}
          placeholder={`What does it look like? Where exactly was it ${verbPast}?`}
          className={`${inputClass(errorFor("description"))} resize-y`}
          {...props("description", descHint)}
        />
        <p
          className={`mt-1 text-right text-sm ${values.description.length > DESCRIPTION_MAX ? "font-semibold text-danger" : "text-muted"}`}
          aria-live="polite"
        >
          {values.description.length} / {DESCRIPTION_MAX}
        </p>
      </Field>

      {formError && (
        <p role="alert" className="rounded-lg border border-danger bg-lost-tint p-3 font-medium text-ink">
          {formError}
        </p>
      )}

      {/* Save comes first in the DOM (and on phones); on wider screens it is flipped to the right */}
      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-start">
        <button type="submit" disabled={saving} className={btn("accent", "lg")}>
          {saving ? "Saving..." : mode === "edit" ? "Save changes" : isFound ? "Report found item" : "Report lost item"}
        </button>
        <Link to={cancelTo} className={btn("outline", "lg")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
