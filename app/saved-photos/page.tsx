"use client";

import { useEffect, useState } from "react";

type SavedPhoto = {
  id: string;
  url: string | null;
  created_at: string;
};

export default function SavedPhotosPage() {
  const [photos, setPhotos] = useState<SavedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/cloud/photos")
      .then(async (response) => {
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error || "Saved photos could not be loaded.");
        }

        return payload;
      })
      .then((payload) => {
        setPhotos(payload.photos || []);
        setMessage(payload.mode === "guest" ? "Guest mode is active. Cloud photos are not saved." : "");
      })
      .catch((loadError) =>
        setMessage(
          loadError instanceof Error
            ? loadError.message
            : "Saved photos could not be loaded.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#e6f4f1] via-[#edf3ff] to-[#f3e9ff] px-6 py-16 text-gray-800">
      <section className="mx-auto max-w-5xl rounded-[2rem] border border-white/60 bg-white/90 p-8 shadow-2xl backdrop-blur-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-indigo-600">
          Saved Photos
        </p>
        <h1 className="mt-4 text-4xl font-black text-gray-900">Profile Photo Gallery</h1>

        {message ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {message}
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? <p className="text-slate-600">Loading saved photos...</p> : null}
          {!loading && photos.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-600 sm:col-span-2 lg:col-span-3">
              No saved photos yet. Create one in{" "}
              <a href="/photo-studio" className="font-semibold text-indigo-700 underline-offset-4 hover:underline">
                AI Photo Studio
              </a>{" "}
              while logged in.
            </div>
          ) : null}
          {photos.map((photo) => (
            <div key={photo.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {photo.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.url} alt="Saved profile" className="aspect-square w-full rounded-xl object-cover" />
              ) : (
                <div className="aspect-square rounded-xl bg-slate-100" />
              )}
              <p className="mt-3 text-xs text-slate-500">
                Saved {new Date(photo.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
