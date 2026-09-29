import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ProjectList } from "@/components/projects/project-list";
import { NotebookPage } from "@/components/projects/notebook-page";
import { Stash } from "@/components/inventory/stash";
import { GrowingTextarea } from "@/components/projects/growing-textarea";
import "../../../app/globals.css";
const mode = new URLSearchParams(location.search).get("status");
const status = mode === "active" ? "active" : mode === "completed" ? "completed" : "planned";
const title =
  mode === "stash"
    ? "Stash"
    : status === "active"
      ? "On The Hook"
      : status === "completed"
        ? "Made"
        : "Someday";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NotebookPage title={title}>
      {mode === "editor" ? (
        <div className="project-form">
          <label htmlFor="long-note">Latest update</label>
          <GrowingTextarea
            id="long-note"
            defaultValue={"A long crochet note with details. ".repeat(100)}
          />
        </div>
      ) : mode === "stash" ? (
        <Stash userId="browser-test" />
      ) : (
        <ProjectList userId="browser-test" status={status} />
      )}
    </NotebookPage>
  </StrictMode>,
);
