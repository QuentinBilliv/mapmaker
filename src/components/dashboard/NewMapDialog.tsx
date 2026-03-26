"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { PlusIcon } from "lucide-react";

const TEMPLATES = [
  {
    id: "jx77494rrqvc0012k7c0sznrbd83nj0c" as Id<"maps">,
    title: "Iceland — Nature & National Parks",
    description: "Volcanoes, glaciers, waterfalls, and the Ring Road",
    image: "/showcase_1.png",
  },
  {
    id: "jx78nmwn7a4w8rfhr4dgtznb8h83h3pn" as Id<"maps">,
    title: "Sake Regions of Japan",
    description: "Major sake-producing prefectures and their brewing styles",
    image: "/showcase_2.png",
  },
  {
    id: "jx7e1kxsvx5fdcde4refmhejxd8393bp" as Id<"maps">,
    title: "The Silk Road",
    description: "Overland and maritime trade routes from China to the Mediterranean",
    image: "/showcase_3.png",
  },
  {
    id: "jx723w16yzc4w2fyd73xwz37s583h0kn" as Id<"maps">,
    title: "Ancient Egypt",
    description: "Archaeological sites, oases, and trade routes along the Nile",
    image: "/showcase_4.png",
  },
];

export default function NewMapDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"choose" | "templates" | "creating">("choose");
  const [loadingLabel, setLoadingLabel] = useState("");
  const createMap = useMutation(api.maps.createMap);
  const createFromTemplate = useMutation(api.maps.createMapFromTemplate);
  const router = useRouter();

  function handleOpen() {
    setStep("choose");
    setOpen(true);
  }

  function handleClose() {
    if (step === "creating") return;
    setOpen(false);
  }

  async function handleBlankMap() {
    setLoadingLabel("Creating your map...");
    setStep("creating");
    try {
      const id = await createMap();
      setLoadingLabel("Opening editor...");
      router.push(`/maps/${id}/edit`);
    } catch (err) {
      console.error(err);
      setStep("choose");
      setLoadingLabel("");
    }
  }

  async function handleTemplate(templateId: Id<"maps">) {
    const t = TEMPLATES.find((x) => x.id === templateId);
    setLoadingLabel(`Creating from "${t?.title ?? "template"}"...`);
    setStep("creating");
    try {
      const id = await createFromTemplate({ templateMapId: templateId });
      setLoadingLabel("Opening editor...");
      router.push(`/maps/${id}/edit`);
    } catch (err) {
      console.error(err);
      setStep("templates");
      setLoadingLabel("");
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="border border-dashed rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors min-h-[200px]"
      >
        <PlusIcon className="size-8" />
        <span className="text-sm font-medium">New map</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={handleClose} />
          <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-popover border rounded-lg shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h2 className="text-base font-semibold">
                  {step === "choose" ? "Create a new map" : "Choose a template"}
                </h2>
                {step === "templates" && (
                  <button
                    onClick={() => setStep("choose")}
                    className="text-xs text-muted-foreground hover:text-foreground mt-0.5"
                  >
                    &larr; Back
                  </button>
                )}
              </div>
              <button onClick={handleClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">&times;</button>
            </div>
            {step === "creating" ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">{loadingLabel}</p>
              </div>
            ) : step === "choose" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5">
                <button
                  onClick={handleBlankMap}

                  className="border border-dashed rounded-lg flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50"
                >
                  <PlusIcon className="size-10" />
                  <span className="text-sm font-medium">Blank map</span>
                  <span className="text-xs text-muted-foreground">Start from scratch</span>
                </button>
                <button
                  onClick={() => setStep("templates")}

                  className="border rounded-lg flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50"
                >
                  <span className="text-3xl">🗺️</span>
                  <span className="text-sm font-medium">From template</span>
                  <span className="text-xs text-muted-foreground">Start with an example map</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleTemplate(t.id)}
  
                    className="group border rounded-lg overflow-hidden text-left hover:border-foreground/30 transition-colors disabled:opacity-50"
                  >
                    <div className="aspect-[16/9] bg-muted overflow-hidden">
                      <img
                        src={t.image}
                        alt={t.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="px-3 py-2.5">
                      <h3 className="text-sm font-medium truncate">{t.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
