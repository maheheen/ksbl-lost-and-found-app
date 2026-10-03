import { Link, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import BrowsePage from "./pages/BrowsePage";
import ReportPage from "./pages/ReportPage";
import ItemPage from "./pages/ItemPage";
import EditPage from "./pages/EditPage";
import MatchesPage from "./pages/MatchesPage";
import ReturnedPage from "./pages/ReturnedPage";
import { EmptyState, btn } from "./components/ui";
import { usePageTitle } from "./lib";

function NotFound() {
  usePageTitle("Page not found");
  return (
    <div className="mx-auto max-w-3xl px-4 pt-8">
      <EmptyState title="We can't find that page" actions={<Link to="/" className={btn("primary")}>Back to browse</Link>}>
        The link may be old or mistyped.
      </EmptyState>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<BrowsePage />} />
        <Route path="/report/:kind" element={<ReportPage />} />
        <Route path="/items/:id" element={<ItemPage />} />
        <Route path="/items/:id/edit" element={<EditPage />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/returned" element={<ReturnedPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
