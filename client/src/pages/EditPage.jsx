import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { usePageTitle, SECTION_FOR_STATUS } from "../lib";
import ItemForm from "../components/ItemForm";
import { useToast } from "../components/Toast";
import { useNavSection } from "../components/Layout";
import { ErrorState } from "../components/ui";

export default function EditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  usePageTitle("Edit report");
  useNavSection(item ? SECTION_FOR_STATUS[item.status] : null);

  useEffect(() => {
    api.getItem(id).then(setItem).catch((e) => setError(e.message));
  }, [id]);

  async function save(values) {
    await api.updateItem(id, values);
    toast("Changes saved.");
    navigate(`/items/${id}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-8">
      <h1 className="text-3xl font-extrabold">Edit your report</h1>
      <div className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-8">
        {error ? (
          <ErrorState message={error} />
        ) : !item ? (
          <p className="text-muted" aria-busy="true">Loading...</p>
        ) : (
          <ItemForm mode="edit" initial={item} onSubmit={save} cancelTo={`/items/${id}`} />
        )}
      </div>
    </div>
  );
}
