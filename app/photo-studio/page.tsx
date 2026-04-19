"use client";

import { Download, ImagePlus, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function PhotoStudioPage() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectFile = (selected: File | null) => {
    setFile(selected);
    setResultUrl("");
    setProgress("");
    setMessage("");
    setError("");
    setPreviewUrl((currentPreviewUrl) => {
      if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
      }

      return selected ? URL.createObjectURL(selected) : "";
    });
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const createLocalResumeCrop = async () => {
    if (!previewUrl) {
      throw new Error("Upload a casual photo first.");
    }

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new window.Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Photo preview could not be prepared."));
      nextImage.src = previewUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Photo crop could not be prepared in this browser.");
    }

    context.fillStyle = "#f8fafc";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    const x = (canvas.width - width) / 2;
    const y = (canvas.height - height) / 2;

    context.drawImage(image, x, y, width, height);

    return canvas.toDataURL("image/png", 0.95);
  };

  const generatePhoto = async () => {
    if (!file) {
      setError("Upload a casual photo first.");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please upload a JPG, PNG, or WEBP image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Please upload an image smaller than 10 MB.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    setProgress("Uploading original photo...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      setProgress("Removing background and creating formal attire...");
      const response = await fetch("/api/photo-studio", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        if (
          payload.code === "OPENAI_NOT_CONFIGURED" ||
          payload.code === "PHOTO_GENERATION_FAILED"
        ) {
          const localCrop = await createLocalResumeCrop();
          setResultUrl(localCrop);
          setMessage(
            payload.code === "OPENAI_NOT_CONFIGURED"
              ? "AI Photo Studio is not connected here, so a clean local resume-photo crop was prepared."
              : "AI generation failed, so a clean local resume-photo crop was prepared.",
          );
          return;
        }

        throw new Error(payload.error || "Photo Studio failed.");
      }

      setProgress("Saving final image...");
      setResultUrl(payload.finalUrl || payload.imageDataUrl);
      setMessage(
        payload.warning ||
          (payload.saved
            ? "Formal photo created and saved to Real Path Cloud."
            : "Formal photo created. Log in to save it to your cloud gallery."),
      );
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : "Photo Studio failed.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(37,99,235,0.14),_transparent_30%),linear-gradient(180deg,_#f8fffc,_#eff7ff_52%,_#f8fafc)] px-4 py-10 md:px-8">
      <section className="mx-auto max-w-6xl rounded-[2rem] border border-white/60 bg-white/88 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-600">
              AI Photo Studio
            </p>
            <h1 className="mt-4 text-5xl font-black tracking-tight text-slate-950">
              Resume-ready profile photo.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Upload a casual photo and create a clean passport-size business
              profile photo with a professional background and formal attire.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
              >
                Upload Photo
              </button>
              <button
                type="button"
                onClick={generatePhoto}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition enabled:hover:scale-[1.02] disabled:opacity-60"
              >
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                {loading ? "Creating..." : "Create formal photo"}
              </button>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => selectFile(event.target.files?.[0] || null)}
              className="hidden"
            />

            {loading && progress ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                {progress}
              </div>
            ) : null}

            {message ? (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message}
              </div>
            ) : null}

            {error ? (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Original
              </p>
              <div className="mt-5 flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-white">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Uploaded profile" className="h-full w-full object-cover" />
                ) : (
                  <p className="px-6 text-center text-sm text-slate-500">
                    Upload a clear front-facing photo.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Resume Photo
              </p>
              <div className="mt-5 flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-white">
                {resultUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resultUrl} alt="Generated formal profile" className="h-full w-full object-cover" />
                ) : (
                  <p className="px-6 text-center text-sm text-slate-500">
                    Your formal passport-size photo will appear here.
                  </p>
                )}
              </div>

              {resultUrl ? (
                <a
                  href={resultUrl}
                  download="real-path-formal-photo.png"
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <Download className="h-4 w-4" />
                  Download final photo
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
